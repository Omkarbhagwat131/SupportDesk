import { env } from "../config/env";
import { AppError } from "../errors/app-error";
import { MAX_SUGGEST_REPLY_CHARS, suggestReplyResultSchema } from "../validators/ai.schema";
import { logAIUsage, type AIUsage } from "./usage";
import { maskPii } from "./mask-pii";
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

const AI_TIMEOUT_MS = 30_000;

function createAiDeadline(parentSignal?: AbortSignal) {
  const timeoutSignal = AbortSignal.timeout(AI_TIMEOUT_MS);
  return {
    timeoutSignal,
    signal: parentSignal
      ? AbortSignal.any([parentSignal, timeoutSignal])
      : timeoutSignal,
  };
}

function throwIfAiTimedOut(timeoutSignal: AbortSignal): void {
  if (timeoutSignal.aborted) {
    throw new AppError(
      504,
      "AI_TIMEOUT",
      "The AI request timed out. Please try again or continue manually.",
    );
  }
}

function rejectReplyOutput(reason: "invalid_reply" | "too_long"): never {
  console.warn("AI reply output rejected", JSON.stringify({ reason }));
  throw new AppError(502, "INVALID_AI_OUTPUT", "The AI provider returned an invalid reply draft.");
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

const MAX_SUBJECT_CHARS = 200;
const MAX_DESCRIPTION_CHARS = 8_000;
const MAX_CONTEXT_COMMENTS = 20;
const MAX_COMMENT_CHARS = 2_000;
const MAX_COMMENT_CONTEXT_CHARS = 12_000;

function limitText(text: string, max: number): string {
  return text.slice(0, max);
}

function limitReplyContext(context: TicketReplyContext): TicketReplyContext {
  let remaining = MAX_COMMENT_CONTEXT_CHARS;

  const comments = context.comments
    .slice(-MAX_CONTEXT_COMMENTS)
    .reverse()
    .flatMap((comment) => {
      if (remaining <= 0) return [];

      const body = limitText(maskPii(comment.body), Math.min(MAX_COMMENT_CHARS, remaining));
      remaining -= body.length;

      return [{
        ...comment,
        body,
        authorName: limitText(maskPii(comment.authorName), 100),
      }];
    })
    .reverse();

  return {
    ...context,
    ticket: {
      ...context.ticket,
      subject: limitText(maskPii(context.ticket.subject), MAX_SUBJECT_CHARS),
      description: limitText(maskPii(context.ticket.description), MAX_DESCRIPTION_CHARS),
    },
    comments,
  };
}

function untrustedJsonBlock(value: unknown): string {
  const json = JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e");

  return `<UNTRUSTED_TICKET_DATA_JSON>\n${json}\n</UNTRUSTED_TICKET_DATA_JSON>`;
}

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
            safetySettings: [
  { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
  { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
],
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
      const deadline = createAiDeadline(signal);

      let response: Response;

      try {
        response = await createCompletion(
          suggestReplyPrompt,
          untrustedJsonBlock(limitReplyContext(context)),
          true,
          deadline.signal,
        );
      } catch (error) {
        throwIfAiTimedOut(deadline.timeoutSignal);
        throw error;
      }

      if (!response.body) throw providerError();

      let usage: AIUsage | undefined;

      const chunks = readCompletionStream(
        response.body,
        deadline.signal,
        (receivedUsage) => {
          usage = receivedUsage;
        },
      );

      return (async function* () {
        let reply = "";

        try {
          for await (const chunk of chunks) {
            reply += chunk;

            if (reply.length > MAX_SUGGEST_REPLY_CHARS) {
              rejectReplyOutput("too_long");
            }
          }

          const result = suggestReplyResultSchema.safeParse(reply);

          if (!result.success) {
            rejectReplyOutput("invalid_reply");
          }

          yield result.data;
        } catch (error) {
          throwIfAiTimedOut(deadline.timeoutSignal);
          throw error;
        } finally {
          if (usage) {
            logUsage(configuration, "suggest-reply", usage);
          }
        }
      })();
    },


    async categorizeTicket(
      context: { subject: string; description: string },
      signal?: AbortSignal,
    ): Promise<string> {
      const deadline = createAiDeadline(signal);

      try {
        const response = await createCompletion(
          categorizeTicketPrompt,
          untrustedJsonBlock({
            subject: limitText(maskPii(context.subject), MAX_SUBJECT_CHARS),
            description: limitText(maskPii(context.description), MAX_DESCRIPTION_CHARS),
          }),
          false,
          deadline.signal,
        );
        const payload: unknown = await response.json();
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
      } catch (error) {
        throwIfAiTimedOut(deadline.timeoutSignal);
        throw error;
      }
    },
  };
}

export const geminiClient = createGeminiClient();
