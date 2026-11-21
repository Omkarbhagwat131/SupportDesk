import { apiRequest } from "../../../lib/api";
import type { CreateCommentInput } from "../schemas";

export type TicketComment = {
  id: string;
  ticketId: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
  };
};

export async function listComments(ticketId: string): Promise<TicketComment[]> {
  const response = await apiRequest<TicketComment[]>(
    `/api/tickets/${encodeURIComponent(ticketId)}/comments`,
  );
  return response.data;
}

export async function createComment(
  ticketId: string,
  input: CreateCommentInput,
): Promise<TicketComment> {
  const response = await apiRequest<TicketComment>(
    `/api/tickets/${encodeURIComponent(ticketId)}/comments`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return response.data;
}
