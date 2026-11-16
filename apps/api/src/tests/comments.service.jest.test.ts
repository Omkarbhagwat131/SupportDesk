import { AppError } from "../errors/app-error";
import type { AuthenticatedUser } from "../types/auth";
import { UserRole } from "../generated/prisma/client";
import { createCommentsService } from "../services/comments.service";
import { createCommentSchema } from "../validators/tickets.schema";

const customer: AuthenticatedUser = {
  id: "customer-1",
  email: "customer@example.test",
  role: UserRole.CUSTOMER,
};

const agent: AuthenticatedUser = {
  id: "agent-1",
  email: "agent@example.test",
  role: UserRole.AGENT,
};

function createRepository() {
  return {
    findCommentsByTicketId: jest.fn().mockResolvedValue([]),
    insertComment: jest.fn().mockResolvedValue({ id: "comment-1" }),
  };
}

describe("comments service", () => {
  test("validates and normalizes comment input without accepting a forged author", () => {
    expect(createCommentSchema.parse({ body: "  Reply  " })).toEqual({
      body: "Reply",
      isInternal: false,
    });
    expect(createCommentSchema.safeParse({ body: "  " }).success).toBe(false);
    expect(createCommentSchema.safeParse({
      body: "Reply",
      authorId: "customer-2",
    }).success).toBe(false);
  });

  test("passes the authenticated customer to the scoped comment lookup", async () => {
    const repository = createRepository();
    const service = createCommentsService(repository);

    await service.listComments("ticket-1", customer);

    expect(repository.findCommentsByTicketId).toHaveBeenCalledWith("ticket-1", customer);
  });

  test("does not allow customers to create internal comments", async () => {
    const repository = createRepository();
    const service = createCommentsService(repository);

    await expect(service.createComment("ticket-1", {
      body: "Internal note",
      isInternal: true,
    }, customer)).rejects.toMatchObject({
      statusCode: 403,
      code: "FORBIDDEN",
    } satisfies Partial<AppError>);
    expect(repository.insertComment).not.toHaveBeenCalled();
  });

  test("uses the authenticated agent identity for comment creation", async () => {
    const repository = createRepository();
    const service = createCommentsService(repository);

    await service.createComment("ticket-1", {
      body: "Internal note",
      isInternal: true,
    }, agent);

    expect(repository.insertComment).toHaveBeenCalledWith("ticket-1", {
      body: "Internal note",
      isInternal: true,
    }, agent);
  });

  test("preserves not-found results from the repository", async () => {
    const repository = createRepository();
    repository.insertComment.mockResolvedValue(null);
    const service = createCommentsService(repository);

    await expect(service.createComment("missing-ticket", {
      body: "Reply",
      isInternal: false,
    }, customer)).resolves.toBeNull();
  });
});
