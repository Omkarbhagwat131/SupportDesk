import { createGeminiClient } from "../ai/gemini-client";
import { calculateAIUsageCost, logAIUsage } from "../ai/usage";

const configuration = {
  apiKey: "test-gemini-key-not-a-real-credential",
  model: "gemini-test-model",
  inputCostPerMillion: 0.15,
  outputCostPerMillion: 0.6,
};

describe("AI usage accounting", () => {
  test("calculates cost from provider-reported tokens and configured rates", () => {
    expect(calculateAIUsageCost(
      { inputTokens: 120, outputTokens: 30 },
      { inputCostPerMillion: 0.15, outputCostPerMillion: 0.6 },
    )).toBeCloseTo(0.000036);
  });

  test("logs usage and cost without prompt content or credentials", () => {
    const log = jest.spyOn(console, "info").mockImplementation(() => undefined);
    try {
      logAIUsage("categorize-ticket", "gemini-test-model", { inputTokens: 120, outputTokens: 30 }, {
        inputCostPerMillion: 0.15,
        outputCostPerMillion: 0.6,
      });
      expect(log).toHaveBeenCalledWith("AI usage", JSON.stringify({
        feature: "categorize-ticket",
        model: "gemini-test-model",
        inputTokens: 120,
        outputTokens: 30,
        costUsd: 0.000036,
      }));
      expect(log.mock.calls.flat().join(" ")).not.toContain(configuration.apiKey);
    } finally {
      log.mockRestore();
    }
  });

  test("logs categorization usage from Gemini's usage metadata", async () => {
    const log = jest.spyOn(console, "info").mockImplementation(() => undefined);
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{
        content: { parts: [{ text: '{"category":"billing","priority":"P2"}' }] },
        finishReason: "STOP",
      }],
      usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30, totalTokenCount: 150 },
    }), { status: 200 }));
    try {
      const client = createGeminiClient(configuration, fetcher);
      await expect(client.categorizeTicket({ subject: "Invoice", description: "Wrong total" }))
        .resolves.toBe('{"category":"billing","priority":"P2"}');
      expect(log).toHaveBeenCalledWith("AI usage", expect.stringContaining('"feature":"categorize-ticket"'));
      expect(fetcher.mock.calls[0]?.[0]).toContain("generativelanguage.googleapis.com");
      expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("x-goog-api-key")).toBe(configuration.apiKey);
    } finally {
      log.mockRestore();
    }
  });

  test("logs reply usage only from Gemini's streaming usage metadata", async () => {
    const log = jest.spyOn(console, "info").mockImplementation(() => undefined);
    const streamBody = [
      'data: {"candidates":[{"content":{"parts":[{"text":"Draft"}]}}]}\n\n',
      'data: {"candidates":[{"content":{"parts":[]},"finishReason":"STOP"}],"usageMetadata":{"promptTokenCount":120,"candidatesTokenCount":30,"totalTokenCount":150}}\n\n',
    ].join("");
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockResolvedValue(
      new Response(streamBody, { status: 200 }),
    );
    try {
      const client = createGeminiClient(configuration, fetcher);
      const chunks = await client.streamReply({
        ticket: { subject: "A", description: "B", status: "OPEN", priority: "P2", category: null },
        comments: [],
      }, new AbortController().signal);
      const received: string[] = [];
      for await (const chunk of chunks) received.push(chunk);
      expect(received).toEqual(["Draft"]);
      expect(log).toHaveBeenCalledWith("AI usage", expect.stringContaining('"feature":"suggest-reply"'));
      expect(fetcher.mock.calls[0]?.[0]).toContain(":streamGenerateContent?alt=sse");
    } finally {
      log.mockRestore();
    }
  });

  test("reports Gemini's HTTP status without logging its response body", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const providerDetail = "sensitive provider response detail";
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: providerDetail } }), { status: 403 }),
    );
    try {
      const client = createGeminiClient(configuration, fetcher);
      await expect(client.streamReply({
        ticket: { subject: "A", description: "B", status: "OPEN", priority: "P2", category: null },
        comments: [],
      }, new AbortController().signal)).rejects.toMatchObject({
        code: "AI_PROVIDER_ERROR",
        message: "Gemini could not generate a result (provider HTTP 403).",
      });
      expect(warning).toHaveBeenCalledWith("Gemini request rejected", JSON.stringify({
        feature: "suggest-reply",
        model: configuration.model,
        status: 403,
      }));
      expect(warning.mock.calls.flat().join(" ")).not.toContain(providerDetail);
      expect(warning.mock.calls.flat().join(" ")).not.toContain(configuration.apiKey);
    } finally {
      warning.mockRestore();
    }
  });

  test("explains how to resolve Gemini model 404 responses", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "model unavailable" } }), { status: 404 }),
    );
    try {
      const client = createGeminiClient(configuration, fetcher);
      await expect(client.categorizeTicket({ subject: "Invoice", description: "Wrong total" }))
        .rejects.toMatchObject({
          code: "AI_PROVIDER_ERROR",
          message: 'Gemini could not find model "gemini-test-model" for this API version. Check GEMINI_MODEL and confirm the model is available to the Google AI project associated with GEMINI_API_KEY.',
        });
      expect(warning).toHaveBeenCalledWith("Gemini request rejected", JSON.stringify({
        feature: "categorize-ticket",
        model: configuration.model,
        status: 404,
      }));
      expect(warning.mock.calls.flat().join(" ")).not.toContain("model unavailable");
    } finally {
      warning.mockRestore();
    }
  });

  test("categorization timeout remains active while reading the response body", async () => {
    const timeoutController = new AbortController();
    const timeoutSpy = jest.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutController.signal);
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockImplementation(
      async (_input, init) => new Response(new ReadableStream({
        start(controller) {
          init?.signal?.addEventListener("abort", () => {
            controller.error(new Error("request aborted"));
          }, { once: true });
          setImmediate(() => timeoutController.abort());
        },
      }), { status: 200 }),
    );

    try {
      const client = createGeminiClient(configuration, fetcher);
      await expect(client.categorizeTicket({ subject: "Invoice", description: "Wrong total" }))
        .rejects.toMatchObject({
          statusCode: 504,
          code: "AI_TIMEOUT",
          message: "The AI request timed out. Please try again or continue manually.",
        });
      expect(fetcher.mock.calls[0]?.[1]?.signal).toBeDefined();
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  test("reply timeout remains active while reading the response stream", async () => {
    const timeoutController = new AbortController();
    const timeoutSpy = jest.spyOn(AbortSignal, "timeout").mockReturnValue(timeoutController.signal);
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockImplementation(
      async (_input, init) => new Response(new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(
            'data: {"candidates":[{"content":{"parts":[{"text":"Draft"}]}}]}\n\n',
          ));
          init?.signal?.addEventListener("abort", () => {
            controller.error(new Error("request aborted"));
          }, { once: true });
          setImmediate(() => timeoutController.abort());
        },
      }), { status: 200 }),
    );

    try {
      const client = createGeminiClient(configuration, fetcher);
      const chunks = await client.streamReply({
        ticket: { subject: "A", description: "B", status: "OPEN", priority: "P2", category: null },
        comments: [],
      }, new AbortController().signal);
      const consume = async () => {
        for await (const _chunk of chunks) {
          // Consume until the deadline aborts the stream.
        }
      };

      await expect(consume()).rejects.toMatchObject({
        statusCode: 504,
        code: "AI_TIMEOUT",
        message: "The AI request timed out. Please try again or continue manually.",
      });
    } finally {
      timeoutSpy.mockRestore();
    }
  });

  test("does not fabricate usage or cost when Gemini omits usage metadata", async () => {
    const log = jest.spyOn(console, "info").mockImplementation(() => undefined);
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{
        content: { parts: [{ text: '{"category":"billing","priority":"P2"}' }] },
        finishReason: "STOP",
      }],
    }), { status: 200 }));
    try {
      const client = createGeminiClient(configuration, fetcher);
      await expect(client.categorizeTicket({ subject: "Invoice", description: "Wrong total" }))
        .resolves.toBe('{"category":"billing","priority":"P2"}');
      expect(log).not.toHaveBeenCalled();
    } finally {
      log.mockRestore();
    }
  });

  test("still returns results and logs reported usage without a fabricated cost when pricing is missing", async () => {
    const log = jest.spyOn(console, "info").mockImplementation(() => undefined);
    const fetcher = jest.fn<Promise<Response>, Parameters<typeof fetch>>().mockResolvedValue(new Response(JSON.stringify({
      candidates: [{
        content: { parts: [{ text: '{"category":"billing","priority":"P2"}' }] },
        finishReason: "STOP",
      }],
      usageMetadata: { promptTokenCount: 120, candidatesTokenCount: 30, totalTokenCount: 150 },
    }), { status: 200 }));
    const client = createGeminiClient({ ...configuration, outputCostPerMillion: null }, fetcher);

    await expect(client.categorizeTicket({ subject: "Invoice", description: "Wrong total" }))
      .resolves.toBe('{"category":"billing","priority":"P2"}');
    expect(log).toHaveBeenCalledWith("AI usage", JSON.stringify({
      feature: "categorize-ticket",
      model: "gemini-test-model",
      inputTokens: 120,
      outputTokens: 30,
      costUsd: null,
    }));
    log.mockRestore();
  });
});
