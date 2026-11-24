import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { logAIUsage, type AIUsage } from "./usage";
import categorizeTicketPrompt from "./prompts/categorize-ticket.v1";
import suggestReplyPrompt from "./prompts/suggest-reply.v1";

type GeminiConfiguration = typeof env.gemini;
type FeatureName = "suggest-reply" | "categorize-ticket";

function readUsage(value: unknown): AIUsage | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  if (!("promptTokenCount" in value) || !("candidatesTokenCount" in value)) return undefined;
  if (
    typeof value.promptTokenCount !== "number"
    || !Number.isSafeInteger(value.promptTokenCount)
    || value.promptTokenCount < 0
    || typeof value.candidatesTokenCount !== "number"
    || !Number.isSafeInteger(value.candidatesTokenCount)
    || value.candidatesTokenCount < 0
  ) return undefined;
  return { inputTokens: value.promptTokenCount, outputTokens: value.candidatesTokenCount };
}

function logUsage(configuration: GeminiConfiguration, feature: FeatureName, usage: AIUsage): void {
  const { inputCostPerMillion, outputCostPerMillion } = configuration;
  if (inputCostPerMillion === null || outputCostPerMillion === null) {
    logAIUsage(feature, configuration.model, usage);
    return;
  }
  logAIUsage(feature, configuration.model, usage, { inputCostPerMillion, outputCostPerMillion });
}

function providerError(status?: number, model?: string): AppError {
  if (status === 404 && model !== undefined) {
    return new AppError(
      502,
      "AI_PROVIDER_ERROR",
      `Gemini could not find model "${model}" for this API version. Check GEMINI_MODEL and confirm the model is available to the Google AI project associated with GEMINI_API_KEY.`,
    );
  }
  const statusDetail = status === undefined ? "" : ` (provider HTTP ${status})`;
  return new AppError(502, "AI_PROVIDER_ERROR", `Gemini could not generate a result${statusDetail}.`);
}

export type TicketReplyContext = {
  ticket: {
    subject: string;
    description: string;
    status: string;
    priority: string;
    category: string | null;
  };
  comments: Array<{
    body: string;
    isInternal: boolean;
    authorName: string;
    createdAt: string;
  }>;
};

async function* readCompletionStream(
  body: ReadableStream<Uint8Array>,
  signal: AbortSignal,
  onUsage: (usage: AIUsage) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedFinishReason = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const events = buffer.split(/\r?\n\r?\n/);
      buffer = events.pop() ?? "";

      for (const eventText of events) {
        const data = eventText
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (!data) continue;
        let payload: unknown;
        try {
          payload = JSON.parse(data);
        } catch {
          throw new Error("Gemini returned an invalid stream.");
        }
        if (typeof payload !== "object" || payload === null) continue;
        if ("error" in payload) throw new Error("Gemini stream failed.");
        if ("usageMetadata" in payload) {
          const usage = readUsage(payload.usageMetadata);
          if (usage) onUsage(usage);
        }
        if (!("candidates" in payload) || !Array.isArray(payload.candidates)) continue;
        const candidate = payload.candidates[0];
        if (typeof candidate !== "object" || candidate === null || !("content" in candidate)) continue;
        if ("finishReason" in candidate && typeof candidate.finishReason === "string") {
          receivedFinishReason = true;
        }
        const content = candidate.content;
        if (
          typeof content !== "object"
          || content === null
          || !("parts" in content)
          || !Array.isArray(content.parts)
        ) continue;
        for (const part of content.parts) {
          if (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string") {
            yield part.text;
          }
        }
      }

      if (done) {
        if (!receivedFinishReason) throw new Error("Gemini stream ended unexpectedly.");
        return;
      }
      if (signal.aborted) throw signal.reason ?? new Error("The AI stream was cancelled.");
    }
  } finally {
    reader.releaseLock();
  }
}

export function createGeminiClient(
  configuration: GeminiConfiguration = env.gemini,
  fetcher: typeof fetch = fetch,
) {
  async function createCompletion(
    systemPrompt: string,
    userContent: string,
    stream: boolean,
    signal?: AbortSignal,
  ): Promise<Response> {
    if (!configuration.apiKey) {
      throw new AppError(503, "AI_NOT_CONFIGURED", "Gemini AI suggestions are not configured.");
    }
    try {
      const method = stream ? "streamGenerateContent?alt=sse" : "generateContent";
      const response = await fetcher(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(configuration.model)}:${method}`,
        {
          method: "POST",
          headers: {
            "x-goog-api-key": configuration.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userContent }] }],
            ...(!stream ? { generationConfig: { responseMimeType: "application/json" } } : {}),
          }),
          ...(signal ? { signal } : {}),
        },
      );
      if (!response.ok) {
        console.warn("Gemini request rejected", JSON.stringify({
          feature: stream ? "suggest-reply" : "categorize-ticket",
          model: configuration.model,
          status: response.status,
        }));
        throw providerError(response.status, configuration.model);
      }
      return response;
    } catch (reason) {
      if (reason instanceof AppError) throw reason;
      if (signal?.aborted) throw reason;
      throw providerError();
    }
  }

  return {
    async streamReply(
      context: TicketReplyContext,
      signal: AbortSignal,
    ): Promise<AsyncIterable<string>> {
      const response = await createCompletion(
        suggestReplyPrompt,
        JSON.stringify(context),
        true,
        signal,
      );
      if (!response.body) throw providerError();

      let usage: AIUsage | undefined;
      const chunks = readCompletionStream(response.body, signal, (receivedUsage) => {
        usage = receivedUsage;
      });
      return (async function* () {
        try {
          yield* chunks;
        } finally {
          if (usage) logUsage(configuration, "suggest-reply", usage);
        }
      })();
    },

    async categorizeTicket(context: { subject: string; description: string }): Promise<string> {
      const response = await createCompletion(
        categorizeTicketPrompt,
        JSON.stringify(context),
        false,
      );
      let payload: unknown;
      try {
        payload = await response.json();
      } catch {
        throw providerError();
      }
      if (typeof payload !== "object" || payload === null) throw providerError();
      if ("usageMetadata" in payload) {
        const usage = readUsage(payload.usageMetadata);
        if (usage) logUsage(configuration, "categorize-ticket", usage);
      }
      if (!("candidates" in payload) || !Array.isArray(payload.candidates)) throw providerError();
      const candidate = payload.candidates[0];
      if (typeof candidate !== "object" || candidate === null || !("content" in candidate)) throw providerError();
      const content = candidate.content;
      if (
        typeof content !== "object"
        || content === null
        || !("parts" in content)
        || !Array.isArray(content.parts)
      ) throw providerError();
      const textParts: string[] = [];
      for (const part of content.parts as unknown[]) {
        if (typeof part === "object" && part !== null && "text" in part && typeof part.text === "string") {
          textParts.push(part.text);
        }
      }
      const text = textParts.join("");
      if (!text) throw providerError();
      return text;
    },
  };
}

export const geminiClient = createGeminiClient();
