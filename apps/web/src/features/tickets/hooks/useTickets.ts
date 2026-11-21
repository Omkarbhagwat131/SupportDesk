import { useQuery } from "@tanstack/react-query";
import { listTickets, type Ticket, type TicketListMeta, type TicketListQuery } from "../api/tickets";
import { ticketKeys } from "./keys";

const emptyMeta: TicketListMeta = {
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 0,
};

export function useTickets(query: TicketListQuery) {
  const { data, isFetching, isPending, error } = useQuery({
    queryKey: ticketKeys.list(query),
    queryFn: () => listTickets(query),
  });

  const message = error instanceof Error ? error.message : error ? "Unable to load tickets." : "";

  return {
    tickets: data?.tickets ?? [] satisfies Ticket[],
    meta: data?.meta ?? emptyMeta,
    loading: isPending || isFetching,
    error: message,
  };
}
