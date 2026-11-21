import { useQuery } from "@tanstack/react-query";
import { listComments } from "../api/comments";
import { ticketKeys } from "./keys";

export function useTicketComments(ticketId: string, enabled = true) {
  return useQuery({
    queryKey: ticketKeys.comments(ticketId),
    queryFn: () => listComments(ticketId),
    enabled: enabled && ticketId.length > 0,
  });
}
