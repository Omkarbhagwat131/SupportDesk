import { UserRole } from "../generated/prisma/client";
import { AppError } from "../errors/app-error";
import * as ticketsRepository from "../repositories/tickets.repository";
import * as usersRepository from "../repositories/users.repository";
import type { AuthenticatedUser } from "../types/auth";
import type {
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "../validators/tickets.schema";

export function listTickets(user: AuthenticatedUser, query: ListTicketsQuery) {
  return ticketsRepository.findTickets(user, query);
}

export function getTicket(id: string, user: AuthenticatedUser) {
  return ticketsRepository.findTicketById(id, user);
}

export function createTicket(input: CreateTicketInput, user: AuthenticatedUser) {
  if (user.role !== UserRole.CUSTOMER) {
    throw new AppError(403, "FORBIDDEN", "Only customers can create tickets.");
  }
  return ticketsRepository.insertTicket(input, user);
}

export async function updateTicket(id: string, input: UpdateTicketInput, user: AuthenticatedUser) {
  if ("assigneeId" in input) {
    if (user.role !== UserRole.ADMIN) {
      throw new AppError(403, "FORBIDDEN", "Only admins can assign tickets.");
    }
    if (input.assigneeId !== undefined && input.assigneeId !== null) {
      const agent = await usersRepository.findAgentById(input.assigneeId);
      if (!agent) {
        throw new AppError(400, "INVALID_ASSIGNEE", "Tickets can only be assigned to an agent.");
      }
    }
  }
  return ticketsRepository.saveTicketChanges(id, input, user);
}

export function deleteTicket(id: string, user: AuthenticatedUser) {
  return ticketsRepository.removeTicket(id, user);
}