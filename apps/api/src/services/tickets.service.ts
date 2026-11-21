import * as ticketsRepository from "../repositories/tickets.repository";
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
  return ticketsRepository.insertTicket(input, user);
}

export function updateTicket(id: string, input: UpdateTicketInput, user: AuthenticatedUser) {
  return ticketsRepository.saveTicketChanges(id, input, user);
}

export function deleteTicket(id: string, user: AuthenticatedUser) {
  return ticketsRepository.removeTicket(id, user);
}