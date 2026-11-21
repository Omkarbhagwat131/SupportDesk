import { afterEach, describe, expect, it, vi } from "vitest";
import { createComment } from "./comments";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("comment API functions", () => {
  it("creates an internal comment for an agent using the ticket comment endpoint", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("localStorage", { getItem: vi.fn().mockReturnValue("agent-token") });
    const comment = {
      id: "comment-1",
      ticketId: "ticket-1",
      body: "Investigating the reported issue.",
      isInternal: true,
      createdAt: "2026-01-01T00:00:00.000Z",
      author: { id: "agent-1", name: "Support Agent" },
    };
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ data: comment, error: null, meta: {} }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const input = { body: comment.body, isInternal: true };

    await expect(createComment("ticket-1", input)).resolves.toEqual(comment);
    const [url, request] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/api/tickets/ticket-1/comments");
    expect(request?.method).toBe("POST");
    expect(JSON.parse(String(request?.body))).toEqual(input);
  });
});
