import { useQuery } from "@tanstack/react-query";
import { getTicket } from "../api/tickets";
import { ticketKeys } from "./keys";

export function useTicket(ticketId: string) {
  return useQuery({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: () => getTicket(ticketId),
    enabled: ticketId.length > 0,
  });
}
