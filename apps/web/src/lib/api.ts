export type ApiEnvelope<T> = {
  data: T;
  error: null;
  meta: Record<string, unknown>;
};

type ApiErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
};

export class ApiRequestError extends Error {
  readonly status: number | null;
  readonly code: string | null;
  readonly details?: unknown;

  constructor(
    message: string,
    status: number | null,
    code: string | null = null,
    details?: unknown,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function getAiManualFallbackMessage(
  error: unknown,
  feature: "reply" | "categorization",
): string {
  const featureName = feature === "reply" ? "reply draft" : "categorization";
  if (error instanceof ApiRequestError) {
    if (
      error.code === "AI_TIMEOUT"
      || error.code === "AI_PROVIDER_ERROR"
      || error.code === "AI_NOT_CONFIGURED"
      || error.code === "INVALID_AI_OUTPUT"
      || error.status === 502
      || error.status === 503
      || error.status === 504
    ) {
      return `AI ${featureName} is unavailable. Continue manually; the ticket workflow is unchanged.`;
    }
  }
  return `Unable to generate the AI ${featureName}. Continue manually; the ticket workflow is unchanged.`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiErrorPayload(value: unknown): value is ApiErrorPayload {
  return (
    isRecord(value) &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error("VITE_API_BASE_URL must be set to the API origin.");
  }
  return baseUrl.replace(/\/+$/, "");
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const token = localStorage.getItem("supportdesk_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const requestPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${getApiBaseUrl()}${requestPath}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (reason) {
    if (reason instanceof Error && reason.name === "AbortError") throw reason;
    throw new ApiRequestError("Unable to reach the API. Check your connection and try again.", null);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ApiRequestError(
      response.ok
        ? "The API returned an invalid response."
        : `The request failed with status ${response.status}.`,
      response.status,
    );
  }

  if (!isRecord(body)) {
    throw new ApiRequestError("The API returned an invalid response.", response.status);
  }

  if (!response.ok) {
    const apiError = isApiErrorPayload(body.error) ? body.error : null;
    throw new ApiRequestError(
      apiError?.message ?? `The request failed with status ${response.status}.`,
      response.status,
      apiError?.code ?? null,
      apiError?.details,
    );
  }

  if (body.error !== null) {
    if (isApiErrorPayload(body.error)) {
      throw new ApiRequestError(
        body.error.message,
        response.status,
        body.error.code,
        body.error.details,
      );
    }
    throw new ApiRequestError("The API returned an invalid response.", response.status);
  }

  if (!("data" in body) || !isRecord(body.meta)) {
    throw new ApiRequestError("The API returned an invalid response.", response.status);
  }

  return {
    data: body.data as T,
    error: null,
    meta: body.meta,
  };
}
