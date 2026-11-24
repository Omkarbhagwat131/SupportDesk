import { UserRole } from "../generated/prisma/client";
import type { AuthenticatedUser } from "../types/auth";
import { createSuggestReplyService } from "../services/suggest-reply.service";

const agent: AuthenticatedUser = {
  id: "agent-1",
  email: "agent@example.test",
  role: UserRole.AGENT,
};

const admin: AuthenticatedUser = {
  id: "admin-1",
  email: "admin@example.test",
  role: UserRole.ADMIN,
};

const ticket = {
  id: "ticket-1",
  subject: "Cannot access my account",
  description: "The sign-in page rejects my password.",
  status: "OPEN" as const,
  priority: "P2" as const,
  category: "account",
  requesterId: "customer-1",
  requesterEmail: "customer@example.test",
  assigneeId: "agent-1",
  slaDueAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
};

function createDependencies() {
  return {
    tickets: { findTicketById: jest.fn().mockResolvedValue(ticket) },
    comments: {
      findCommentsByTicketId: jest.fn().mockResolvedValue([
        {
          id: "comment-1",
          ticketId: "ticket-1",
          body: "I already reset my password.",
          isInternal: false,
          createdAt: new Date("2026-01-02T00:00:00.000Z"),
          author: { name: "Customer" },
        },
      ]),
    },
    client: {
      streamReply: jest.fn().mockResolvedValue((async function* () {
        yield "Thanks for letting us know.";
        yield " Please try signing in again.";
      })()),
    },
  };
}

async function collect(stream: AsyncIterable<string>) {
  const chunks: string[] = [];
  for await (const chunk of stream) chunks.push(chunk);
  return chunks;
}

describe("suggest reply service", () => {
  test("streams a draft using the authorized ticket and its latest comments", async () => {
    const dependencies = createDependencies();
    const service = createSuggestReplyService(dependencies);
    const stream = await service.suggestReply("ticket-1", agent, new AbortController().signal);

    await expect(collect(stream)).resolves.toEqual([
      "Thanks for letting us know.",
      " Please try signing in again.",
    ]);
    expect(dependencies.tickets.findTicketById).toHaveBeenCalledWith("ticket-1", agent);
    expect(dependencies.comments.findCommentsByTicketId).toHaveBeenCalledWith("ticket-1", agent);
    expect(dependencies.client.streamReply).toHaveBeenCalledWith(expect.objectContaining({
      ticket: expect.objectContaining({ subject: ticket.subject }),
      comments: [expect.objectContaining({ body: "I already reset my password." })],
    }), expect.any(AbortSignal));
  });

  test("rejects reply suggestions for admins", async () => {
    const dependencies = createDependencies();
    const service = createSuggestReplyService(dependencies);

    await expect(service.suggestReply("ticket-1", admin, new AbortController().signal))
      .rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    expect(dependencies.client.streamReply).not.toHaveBeenCalled();
  });

  test("rejects empty ticket context without calling the model", async () => {
    const dependencies = createDependencies();
    dependencies.tickets.findTicketById.mockResolvedValue({
      ...ticket,
      subject: " ",
      description: "\n",
    });
    dependencies.comments.findCommentsByTicketId.mockResolvedValue([]);
    const service = createSuggestReplyService(dependencies);

    await expect(service.suggestReply("ticket-1", agent, new AbortController().signal))
      .rejects.toMatchObject({ statusCode: 422, code: "EMPTY_TICKET_CONTEXT" });
    expect(dependencies.client.streamReply).not.toHaveBeenCalled();
  });

  test("propagates provider failures so the API can report a stream error", async () => {
    const dependencies = createDependencies();
    dependencies.client.streamReply.mockRejectedValue(new Error("provider unavailable"));
    const service = createSuggestReplyService(dependencies);

    await expect(service.suggestReply("ticket-1", agent, new AbortController().signal))
      .rejects.toThrow("provider unavailable");
  });

  test("propagates interruption after yielding partial output", async () => {
    const dependencies = createDependencies();
    dependencies.client.streamReply.mockResolvedValue((async function* () {
      yield "Partial";
      throw new Error("stream interrupted");
    })());
    const service = createSuggestReplyService(dependencies);
    const stream = await service.suggestReply("ticket-1", agent, new AbortController().signal);
    const iterator = stream[Symbol.asyncIterator]();

    await expect(iterator.next()).resolves.toEqual({ done: false, value: "Partial" });
    await expect(iterator.next()).rejects.toThrow("stream interrupted");
  });
});
