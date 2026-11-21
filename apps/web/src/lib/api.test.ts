import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, ApiRequestError } from "./api";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("uses the configured base URL, bearer token, and success envelope", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test/");
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue("test-token"),
    });
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        data: [{ id: "ticket-1" }],
        error: null,
        meta: { page: 1 },
      }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await apiRequest<Array<{ id: string }>>("/api/tickets");

    expect(result.data).toEqual([{ id: "ticket-1" }]);
    expect(result.meta).toEqual({ page: 1 });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, options] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.example.test/api/tickets");
    expect(new Headers(options?.headers).get("Authorization")).toBe("Bearer test-token");
  });

  it("surfaces the backend error envelope and HTTP status", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
    });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({
        data: null,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Email or password is incorrect.",
        },
        meta: {},
      }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    ));

    await expect(apiRequest("/api/auth/login", { method: "POST" }))
      .rejects.toMatchObject<ApiRequestError>({
        name: "ApiRequestError",
        status: 401,
        code: "INVALID_CREDENTIALS",
        message: "Email or password is incorrect.",
      });
  });

  it("fails explicitly when the API base URL is missing", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "");
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
    });
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/api/tickets"))
      .rejects.toThrow("VITE_API_BASE_URL must be set");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("wraps network failures with an actionable error", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.test");
    vi.stubGlobal("localStorage", {
      getItem: vi.fn().mockReturnValue(null),
    });
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed")));

    await expect(apiRequest("/api/tickets")).rejects.toMatchObject({
      name: "ApiRequestError",
      status: null,
      message: "Unable to reach the API. Check your connection and try again.",
    });
  });
});
