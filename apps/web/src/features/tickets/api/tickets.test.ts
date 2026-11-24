import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "../../../lib/api";
import { categorizeTicket, createTicket, suggestReply, updateTicket } from "./tickets";

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

  it("streams a suggested reply draft and sends the agent token", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue("agent-token") });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode('event: delta\ndata: {"data":"Draft reply"}\n\n'));
        controller.enqueue(encoder.encode('event: done\ndata: {"data":null}\n\n'));
        controller.close();
      },
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(stream, { status: 200, headers: { "Content-Type": "text/event-stream" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const chunks: string[] = [];

    await suggestReply("ticket/1", (chunk) => chunks.push(chunk));

    expect(chunks).toEqual(["Draft reply"]);
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/api/tickets/ticket%2F1/suggest-reply");
    expect(request?.method).toBe("POST");
    expect(new Headers(request?.headers).get("Authorization")).toBe("Bearer agent-token");
    expect(new Headers(request?.headers).get("Accept")).toBe("text/event-stream");
  });

  it("reports an interrupted reply stream after retaining partial text", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue("agent-token") });
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('event: delta\ndata: {"data":"Partial"}\n\n'));
        controller.close();
      },
    });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response(stream, { status: 200 })));
    const chunks: string[] = [];

    await expect(suggestReply("ticket-1", (chunk) => chunks.push(chunk)))
      .rejects.toMatchObject({
        name: "ApiRequestError",
        message: "The reply stream ended before generation completed.",
      });
    expect(chunks).toEqual(["Partial"]);
  });

  it("requests a validated categorization suggestion with the agent token", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue("agent-token") });
    const suggestion = { category: "billing", priority: "P2" };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: suggestion, error: null, meta: {} }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(categorizeTicket("ticket/1")).resolves.toEqual(suggestion);
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/api/tickets/ticket%2F1/categorize");
    expect(request?.method).toBe("POST");
    expect(new Headers(request?.headers).get("Authorization")).toBe("Bearer agent-token");
  });
});
