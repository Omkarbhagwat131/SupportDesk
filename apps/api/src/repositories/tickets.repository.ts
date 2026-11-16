import { randomUUID } from "node:crypto";
import { prisma } from "../config/database";
import { UserRole } from "../generated/prisma/client";
import type { AuthenticatedUser } from "../types/auth";
import type {
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "../validators/tickets.schema";

export function ticketAccessWhere(user: AuthenticatedUser): { requesterId?: string } {
  return user.role === UserRole.CUSTOMER ? { requesterId: user.id } : {};
}

export function ticketListWhere(user: AuthenticatedUser, query: ListTicketsQuery) {
  return {
    ...ticketAccessWhere(user),
    ...(query.status ? { status: query.status } : {}),
    ...(query.priority ? { priority: query.priority } : {}),
    ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
    ...(query.search ? {
      OR: [
        { subject: { contains: query.search, mode: "insensitive" as const } },
        { description: { contains: query.search, mode: "insensitive" as const } },
        { requesterEmail: { contains: query.search, mode: "insensitive" as const } },
      ],
    } : {}),
  };
}

function ticketListOrderBy(query: ListTicketsQuery) {
  switch (query.sortBy) {
    case "createdAt":
      return [{ createdAt: query.sortOrder }, { id: query.sortOrder }];
    case "updatedAt":
      return [{ updatedAt: query.sortOrder }, { id: query.sortOrder }];
    case "status":
      return [{ status: query.sortOrder }, { id: query.sortOrder }];
    case "priority":
      return [{ priority: query.sortOrder }, { id: query.sortOrder }];
    case "subject":
      return [{ subject: query.sortOrder }, { id: query.sortOrder }];
  }
}

export async function findTickets(user: AuthenticatedUser, query: ListTicketsQuery) {
  const where = ticketListWhere(user, query);
  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: ticketListOrderBy(query),
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.ticket.count({ where }),
  ]);
  return { tickets, total };
}

export function findTicketById(id: string, user: AuthenticatedUser) {
  return prisma.ticket.findFirst({
    where: { id, ...ticketAccessWhere(user) },
  });
}

export function insertTicket(input: CreateTicketInput, user: AuthenticatedUser) {
  return prisma.ticket.create({
    data: {
      id: randomUUID(),
      ...input,
      ...(user.role === UserRole.CUSTOMER
        ? { requesterId: user.id, requesterEmail: user.email }
        : {}),
    },
  });
}

export async function saveTicketChanges(id: string, input: UpdateTicketInput, user: AuthenticatedUser) {
  const result = await prisma.ticket.updateMany({
    where: { id, ...ticketAccessWhere(user) },
    data: input,
  });
  if (result.count === 0) {
    return null;
  }
  return findTicketById(id, user);
}

export async function removeTicket(id: string, user: AuthenticatedUser): Promise<boolean> {
  const result = await prisma.ticket.deleteMany({
    where: { id, ...ticketAccessWhere(user) },
  });
  return result.count > 0;
}