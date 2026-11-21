import { AppError } from "../errors/app-error";
import { UserRole } from "../generated/prisma/client";
import * as commentsRepository from "../repositories/comments.repository";
import type { AuthenticatedUser } from "../types/auth";
import type { CreateCommentInput } from "../validators/tickets.schema";

type CommentsRepository = Pick<
  typeof commentsRepository,
  "findCommentsByTicketId" | "insertComment"
>;

export function createCommentsService(repository: CommentsRepository = commentsRepository) {
  return {
    listComments(ticketId: string, user: AuthenticatedUser) {
      return repository.findCommentsByTicketId(ticketId, user);
    },
    async createComment(ticketId: string, input: CreateCommentInput, user: AuthenticatedUser) {
      if (user.role === UserRole.CUSTOMER && input.isInternal) {
        throw new AppError(403, "FORBIDDEN", "Customers cannot create internal comments.");
      }
      return repository.insertComment(ticketId, input, user);
    },
  };
}

export const commentsService = createCommentsService();
