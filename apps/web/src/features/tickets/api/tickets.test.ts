import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../../../lib/api";
import { createTicket, updateTicket } from "./tickets";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("ticket API functions", () => {
  it("creates a ticket using the backend contract", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue("agent-token") });
    const ticket = {
      id: "ticket-1",
      subject: "Cannot sign in",
      requesterEmail: "customer@example.test",
      requesterId: null,
      description: "Login is unavailable.",
      status: "OPEN",
      priority: "P3",
      category: null,
      assigneeId: null,
      slaDueAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: ticket, error: null, meta: {} }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const input = {
      subject: ticket.subject,
      requesterEmail: ticket.requesterEmail,
      description: ticket.description,
    };

    await expect(createTicket(input)).resolves.toEqual(ticket);
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/api/tickets");
    expect(request?.method).toBe("POST");
    expect(JSON.parse(String(request?.body))).toEqual(input);
  });

  it("surfaces backend authorization errors when updating a ticket", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue("customer-token") });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        data: null,
        error: { code: "FORBIDDEN", message: "Only agents can update tickets." },
        meta: {},
      }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateTicket("ticket/1", { status: "RESOLVED" }))
      .rejects.toMatchObject<ApiRequestError>({
        name: "ApiRequestError",
        status: 403,
        code: "FORBIDDEN",
        message: "Only agents can update tickets.",
      });
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://api.example.test/api/tickets/ticket%2F1");
  });
});
