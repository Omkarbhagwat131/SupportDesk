import type { TicketListQuery } from "./api/tickets";
import { listTicketsQuerySchema } from "./schemas";

const defaultQuery: TicketListQuery = {
  page: 1,
  limit: 10,
  sortBy: "createdAt",
  sortOrder: "desc",
};

const supportedQueryKeys = [
  "page",
  "limit",
  "status",
  "priority",
  "assigneeId",
  "search",
  "sortBy",
  "sortOrder",
] as const;

export function parseTicketListQuery(search: string): TicketListQuery {
  const params = new URLSearchParams(search);
  const queryObject = Object.fromEntries(
    supportedQueryKeys.flatMap((key) => params.has(key) ? [[key, params.get(key)]] : []),
  );
  const parsed = listTicketsQuerySchema.safeParse(queryObject);
  return parsed.success ? parsed.data : defaultQuery;
}

export function serializeTicketListQuery(query: TicketListQuery): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  return params;
}
