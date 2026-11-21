import { prisma } from "../config/database";
import { UserRole } from "../generated/prisma/client";
import type { AuthenticatedUser } from "../types/auth";
import type { CreateCommentInput } from "../validators/tickets.schema";
import { ticketAccessWhere } from "./tickets.repository";

const commentSelection = {
  id: true,
  ticketId: true,
  body: true,
  isInternal: true,
  createdAt: true,
  author: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

export async function findCommentsByTicketId(ticketId: string, user: AuthenticatedUser) {
  return prisma.$transaction(async (transaction) => {
    const ticket = await transaction.ticket.findFirst({
      where: { id: ticketId, ...ticketAccessWhere(user) },
      select: { id: true },
    });
    if (!ticket) return null;

    return transaction.comment.findMany({
      where: {
        ticketId,
        ...(user.role === UserRole.CUSTOMER ? { isInternal: false } : {}),
      },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: commentSelection,
    });
  });
}

export async function insertComment(
  ticketId: string,
  input: CreateCommentInput,
  user: AuthenticatedUser,
) {
  return prisma.$transaction(async (transaction) => {
    const ticket = await transaction.ticket.findFirst({
      where: { id: ticketId, ...ticketAccessWhere(user) },
      select: { id: true },
    });
    if (!ticket) return null;

    return transaction.comment.create({
      data: {
        ticketId,
        authorId: user.id,
        body: input.body,
        isInternal: input.isInternal,
      },
      select: commentSelection,
    });
  });
}
