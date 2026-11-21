import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createComment } from "../api/comments";
import { createTicket, updateTicket, type CreateTicketInput, type UpdateTicketInput } from "../api/tickets";
import type { CreateCommentInput } from "../schemas";
import { ticketKeys } from "./keys";

export function useCreateTicket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTicketInput) => createTicket(input),
    onSuccess: async (ticket) => {
      queryClient.setQueryData(ticketKeys.detail(ticket.id), ticket);
      await queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useUpdateTicket(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateTicketInput) => updateTicket(ticketId, input),
    onSuccess: async (ticket) => {
      queryClient.setQueryData(ticketKeys.detail(ticketId), ticket);
      await queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useCreateComment(ticketId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCommentInput) => createComment(ticketId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ticketKeys.comments(ticketId) }),
        queryClient.invalidateQueries({ queryKey: ticketKeys.detail(ticketId) }),
      ]);
    },
  });
}
