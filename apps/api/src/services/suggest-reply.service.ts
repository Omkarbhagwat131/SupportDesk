import { UserRole } from "../generated/prisma/client";
import { AppError } from "../errors/app-error";
import * as commentsRepository from "../repositories/comments.repository";
import * as ticketsRepository from "../repositories/tickets.repository";
import { geminiClient } from "../ai/gemini-client";
import type { TicketReplyContext } from "../ai/gemini-client";
import type { AuthenticatedUser } from "../types/auth";

const MAX_CONTEXT_COMMENTS = 20;

type SuggestReplyDependencies = {
  tickets: Pick<typeof ticketsRepository, "findTicketById">;
  comments: Pick<typeof commentsRepository, "findCommentsByTicketId">;
  client: Pick<typeof geminiClient, "streamReply">;
};

export function createSuggestReplyService(
  dependencies: SuggestReplyDependencies = {
    tickets: ticketsRepository,
    comments: commentsRepository,
    client: geminiClient,
  },
) {
  return {
    async suggestReply(
      ticketId: string,
      user: AuthenticatedUser,
      signal: AbortSignal,
    ): Promise<AsyncIterable<string>> {
      if (user.role !== UserRole.AGENT) {
        throw new AppError(403, "FORBIDDEN", "Only agents can request reply suggestions.");
      }

      const ticket = await dependencies.tickets.findTicketById(ticketId, user);
      if (!ticket) {
        throw new AppError(404, "NOT_FOUND", "Ticket not found.");
      }
      const comments = await dependencies.comments.findCommentsByTicketId(ticketId, user);
      if (!comments) {
        throw new AppError(404, "NOT_FOUND", "Ticket not found.");
      }

      const latestComments = comments.slice(-MAX_CONTEXT_COMMENTS);
      if (
        !ticket.subject.trim()
        && !ticket.description.trim()
        && !latestComments.some((comment) => comment.body.trim())
      ) {
        throw new AppError(422, "EMPTY_TICKET_CONTEXT", "Ticket context is empty.");
      }

      const context: TicketReplyContext = {
        ticket: {
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
        },
        comments: latestComments.map((comment) => ({
          body: comment.body,
          isInternal: comment.isInternal,
          authorName: comment.author.name,
          createdAt: comment.createdAt.toISOString(),
        })),
      };

      return dependencies.client.streamReply(context, signal);
    },
  };
}

export const suggestReplyService = createSuggestReplyService();
