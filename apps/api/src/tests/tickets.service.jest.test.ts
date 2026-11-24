import { UserRole } from "../generated/prisma/client";
import type { AuthenticatedUser } from "../types/auth";
import type { ListTicketsQuery } from "../validators/tickets.schema";
import * as ticketsRepository from "../repositories/tickets.repository";
import * as usersRepository from "../repositories/users.repository";
import * as ticketsService from "../services/tickets.service";

jest.mock("../repositories/tickets.repository", () => ({
  findTickets: jest.fn(),
  findTicketById: jest.fn(),
  insertTicket: jest.fn(),
  saveTicketChanges: jest.fn(),
  removeTicket: jest.fn(),
  ticketAccessWhere: jest.fn(),
  ticketListWhere: jest.fn(),
}));

jest.mock("../repositories/users.repository", () => ({
  findAgentById: jest.fn(),
}));

const user: AuthenticatedUser = {
  id: "agent-1",
  email: "agent@example.test",
  role: UserRole.AGENT,
};

const customer: AuthenticatedUser = {
  id: "customer-1",
  email: "customer@example.test",
  role: UserRole.CUSTOMER,
};

const admin: AuthenticatedUser = {
  id: "admin-1",
  email: "admin@example.test",
  role: UserRole.ADMIN,
};

const query: ListTicketsQuery = {
  page: 2,
  limit: 10,
  status: "OPEN",
  priority: "P1",
  sortBy: "createdAt",
  sortOrder: "desc",
};

const ticket = {
  id: "ticket-1",
  subject: "Example",
  requesterEmail: "customer@example.test",
  requesterId: null,
  assigneeId: null,
  description: "A ticket",
  category: null,
  priority: "P1" as const,
  status: "OPEN" as const,
  slaDueAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("tickets service", () => {
  beforeEach(() => jest.clearAllMocks());

  test("passes the authenticated user and parsed query to the repository", async () => {
    jest.mocked(ticketsRepository.findTickets).mockResolvedValue({ tickets: [ticket], total: 1 });

    await expect(ticketsService.listTickets(user, query)).resolves.toEqual({ tickets: [ticket], total: 1 });
    expect(ticketsRepository.findTickets).toHaveBeenCalledWith(user, query);
  });

  test("passes ticket detail access checks through the repository", async () => {
    jest.mocked(ticketsRepository.findTicketById).mockResolvedValue(ticket);

    await expect(ticketsService.getTicket(ticket.id, user)).resolves.toEqual(ticket);
    expect(ticketsRepository.findTicketById).toHaveBeenCalledWith(ticket.id, user);
  });

  test("passes ticket creation to the repository", async () => {
    const input = {
      subject: "New ticket",
      requesterEmail: "customer@example.test",
      description: "Help needed",
    };
    jest.mocked(ticketsRepository.insertTicket).mockResolvedValue(ticket);

    await expect(ticketsService.createTicket(input, customer)).resolves.toEqual(ticket);
    expect(ticketsRepository.insertTicket).toHaveBeenCalledWith(input, customer);
  });

  test("rejects ticket creation by staff", () => {
    expect(() => ticketsService.createTicket({
      subject: "New ticket",
      requesterEmail: "customer@example.test",
      description: "Help needed",
    }, user)).toThrow("Only customers can create tickets.");
    expect(ticketsRepository.insertTicket).not.toHaveBeenCalled();
  });

  test("passes updates to the repository", async () => {
    const input = { status: "RESOLVED" as const };
    jest.mocked(ticketsRepository.saveTicketChanges).mockResolvedValue(ticket);

    await expect(ticketsService.updateTicket(ticket.id, input, user)).resolves.toEqual(ticket);
    expect(ticketsRepository.saveTicketChanges).toHaveBeenCalledWith(ticket.id, input, user);
  });

  test("allows admins to assign tickets only to existing agents", async () => {
    const input = { assigneeId: "agent-2" };
    jest.mocked(usersRepository.findAgentById).mockResolvedValue({ id: "agent-2" });
    jest.mocked(ticketsRepository.saveTicketChanges).mockResolvedValue(ticket);

    await expect(ticketsService.updateTicket(ticket.id, input, admin)).resolves.toEqual(ticket);
    expect(usersRepository.findAgentById).toHaveBeenCalledWith("agent-2");
    expect(ticketsRepository.saveTicketChanges).toHaveBeenCalledWith(ticket.id, input, admin);
  });

  test("prevents agents from assigning tickets", async () => {
    await expect(ticketsService.updateTicket(ticket.id, { assigneeId: "agent-2" }, user))
      .rejects.toMatchObject({ statusCode: 403, code: "FORBIDDEN" });
    expect(usersRepository.findAgentById).not.toHaveBeenCalled();
    expect(ticketsRepository.saveTicketChanges).not.toHaveBeenCalled();
  });

  test("rejects assigning a ticket to a non-agent user", async () => {
    jest.mocked(usersRepository.findAgentById).mockResolvedValue(null);

    await expect(ticketsService.updateTicket(ticket.id, { assigneeId: "customer-1" }, admin))
      .rejects.toMatchObject({ statusCode: 400, code: "INVALID_ASSIGNEE" });
    expect(ticketsRepository.saveTicketChanges).not.toHaveBeenCalled();
  });

  test("passes deletions to the repository", async () => {
    jest.mocked(ticketsRepository.removeTicket).mockResolvedValue(true);

    await expect(ticketsService.deleteTicket(ticket.id, user)).resolves.toBe(true);
    expect(ticketsRepository.removeTicket).toHaveBeenCalledWith(ticket.id, user);
  });
});
