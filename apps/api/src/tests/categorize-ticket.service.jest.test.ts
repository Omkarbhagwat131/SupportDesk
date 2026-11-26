import { UserRole } from "../generated/prisma/client";
import type { AuthenticatedUser } from "../types/auth";
import { createCategorizeTicketService } from "../services/categorize-ticket.service";

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
  subject: "Invoice amount is wrong",
  description: "The latest invoice is higher than expected.",
};

function createDependencies() {
  return {
    tickets: { findTicketById: jest.fn().mockResolvedValue(ticket) },
    client: {
      categorizeTicket: jest.fn().mockResolvedValue('{"category":"billing","priority":"P2"}'),
    },
  };
}

describe("categorize ticket service", () => {
  test("returns a validated suggestion based only on ticket subject and description", async () => {
    const dependencies = createDependencies();
    const service = createCategorizeTicketService(dependencies);

    await expect(service.categorizeTicket("ticket-1", agent)).resolves.toEqual({
      category: "billing",
      priority: "P2",
    });
    expect(dependencies.tickets.findTicketById).toHaveBeenCalledWith("ticket-1", agent);
    expect(dependencies.client.categorizeTicket).toHaveBeenCalledWith({
      subject: ticket.subject,
      description: ticket.description,
    }, undefined);
  });

  test("passes the request cancellation signal to the AI client", async () => {
    const dependencies = createDependencies();
    const service = createCategorizeTicketService(dependencies);
    const signal = new AbortController().signal;

    await service.categorizeTicket("ticket-1", agent, signal);

    expect(dependencies.client.categorizeTicket).toHaveBeenCalledWith({
      subject: ticket.subject,
      description: ticket.description,
    }, signal);
  });

  test("allows admins to request categorization suggestions", async () => {
    const dependencies = createDependencies();
    const service = createCategorizeTicketService(dependencies);

    await expect(service.categorizeTicket("ticket-1", admin)).resolves.toEqual({
      category: "billing",
      priority: "P2",
    });
  });

  test("records a safe diagnostic and rejects a schema mismatch", async () => {
    const dependencies = createDependencies();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    dependencies.client.categorizeTicket.mockResolvedValue('{"invalid":"sensitive ticket text"}');
    const service = createCategorizeTicketService(dependencies);

    try {
      await expect(service.categorizeTicket("ticket-1", agent))
        .rejects.toMatchObject({ statusCode: 502, code: "INVALID_AI_OUTPUT" });
      expect(warn).toHaveBeenCalledWith(
        "AI categorization output rejected",
        JSON.stringify({ reason: "schema_mismatch" }),
      );
      expect(warn.mock.calls.flat().join(" ")).not.toContain("sensitive ticket text");
    } finally {
      warn.mockRestore();
    }
  });

  test("records only a safe diagnostic for malformed JSON", async () => {
    const dependencies = createDependencies();
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    dependencies.client.categorizeTicket.mockResolvedValue("not json: private ticket contents");
    const service = createCategorizeTicketService(dependencies);

    try {
      await expect(service.categorizeTicket("ticket-1", agent))
        .rejects.toMatchObject({ statusCode: 502, code: "INVALID_AI_OUTPUT" });
      expect(warn).toHaveBeenCalledWith(
        "AI categorization output rejected",
        JSON.stringify({ reason: "invalid_json" }),
      );
      expect(warn.mock.calls.flat().join(" ")).not.toContain("private ticket contents");
    } finally {
      warn.mockRestore();
    }
  });

  test("rejects missing properties and extra properties", async () => {
    const dependencies = createDependencies();
    const service = createCategorizeTicketService(dependencies);
    dependencies.client.categorizeTicket.mockResolvedValue('{"category":"billing"}');
    await expect(service.categorizeTicket("ticket-1", agent))
      .rejects.toMatchObject({ code: "INVALID_AI_OUTPUT" });

    dependencies.client.categorizeTicket.mockResolvedValue(
      '{"category":"billing","priority":"P2","explanation":"extra"}',
    );
    await expect(service.categorizeTicket("ticket-1", agent))
      .rejects.toMatchObject({ code: "INVALID_AI_OUTPUT" });
  });

  test.each([
    '{"category":"security","priority":"P2"}',
    '{"category":"billing","priority":"P0"}',
  ])("rejects unsupported category or priority: %s", async (output) => {
    const dependencies = createDependencies();
    dependencies.client.categorizeTicket.mockResolvedValue(output);
    const service = createCategorizeTicketService(dependencies);

    await expect(service.categorizeTicket("ticket-1", agent))
      .rejects.toMatchObject({ statusCode: 502, code: "INVALID_AI_OUTPUT" });
  });

  test("propagates provider errors", async () => {
    const dependencies = createDependencies();
    dependencies.client.categorizeTicket.mockRejectedValue(new Error("provider unavailable"));
    const service = createCategorizeTicketService(dependencies);

    await expect(service.categorizeTicket("ticket-1", agent)).rejects.toThrow("provider unavailable");
  });
});
