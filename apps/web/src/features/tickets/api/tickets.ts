import { apiRequest, ApiRequestError } from "../../../lib/api";
import type {
  CategorizeTicketResult,
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "../schemas";

export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_ON_CUSTOMER" | "RESOLVED" | "CLOSED";
export type TicketPriority = "P1" | "P2" | "P3" | "P4";

export type Ticket = {
  id: string;
  subject: string;
  requesterEmail: string;
  requesterId: string | null;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: string | null;
  assigneeId: string | null;
  slaDueAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketListQuery = ListTicketsQuery;
export type { CreateTicketInput, UpdateTicketInput };

export type TicketListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!baseUrl) throw new Error("VITE_API_BASE_URL must be set to the API origin.");
  return baseUrl.replace(/\/+$/, "");
}

function getStreamError(body: unknown, status: number): ApiRequestError {
  if (typeof body === "object" && body !== null && "error" in body) {
    const error = body.error;
    if (
      typeof error !== "object"
      || error === null
      || !("message" in error)
      || typeof error.message !== "string"
    ) {
      return new ApiRequestError(`The request failed with status ${status}.`, status);
    }
    return new ApiRequestError(
      error.message,
      status,
      "code" in error && typeof error.code === "string" ? error.code : null,
    );
  }
  return new ApiRequestError(`The request failed with status ${status}.`, status);
}

export async function suggestReply(
  ticketId: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const headers = new Headers({ Accept: "text/event-stream" });
  const token = localStorage.getItem("supportdesk_token");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(
      `${getApiBaseUrl()}/api/tickets/${encodeURIComponent(ticketId)}/suggest-reply`,
      { method: "POST", headers, signal },
    );
  } catch (reason) {
    if (reason instanceof Error && reason.name === "AbortError") throw reason;
    throw new ApiRequestError("Unable to reach the API. Check your connection and try again.", null);
  }
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiRequestError(`The request failed with status ${response.status}.`, response.status);
    }
    throw getStreamError(body, response.status);
  }
  if (!response.body) {
    throw new ApiRequestError("The API returned an empty reply stream.", response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  function consumeEvent(frame: string) {
    const lines = frame.split(/\r?\n/);
    const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
    const data = lines.filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart()).join("\n");
    if (!event || !data) return;

    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      throw new ApiRequestError("The API returned an invalid reply stream.", response.status);
    }
    if (event === "error") throw getStreamError(payload, response.status);
    if (event === "delta") {
      if (
        typeof payload === "object"
        && payload !== null
        && "data" in payload
        && typeof payload.data === "string"
      ) {
        onChunk(payload.data);
      } else {
        throw new ApiRequestError("The API returned an invalid reply stream.", response.status);
      }
    }
    if (event === "done") finished = true;
  }

  try {
    while (!finished) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      frames.forEach(consumeEvent);
      if (done) {
        if (buffer.trim()) consumeEvent(buffer);
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
  if (!finished) {
    throw new ApiRequestError("The reply stream ended before generation completed.", response.status);
  }
}

export async function categorizeTicket(ticketId: string): Promise<CategorizeTicketResult> {
  const response = await apiRequest<CategorizeTicketResult>(
    `/api/tickets/${encodeURIComponent(ticketId)}/categorize`,
    { method: "POST" },
  );
  return response.data;
}

export async function listTickets(query: TicketListQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const response = await apiRequest<Ticket[]>(`/api/tickets?${params.toString()}`);
  return { tickets: response.data, meta: response.meta as TicketListMeta };
}

export async function getTicket(id: string): Promise<Ticket> {
  const response = await apiRequest<Ticket>(`/api/tickets/${encodeURIComponent(id)}`);
  return response.data;
}

export async function createTicket(input: CreateTicketInput): Promise<Ticket> {
  const response = await apiRequest<Ticket>("/api/tickets", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.data;
}

export async function updateTicket(id: string, input: UpdateTicketInput): Promise<Ticket> {
  const response = await apiRequest<Ticket>(`/api/tickets/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
  return response.data;
}
