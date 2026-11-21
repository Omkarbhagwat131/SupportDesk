import type { Request, Response } from "express";
import * as ticketsService from "../services/tickets.service";
import { sendFailure, sendSuccess } from "../utils/api-response";
import {
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
} from "../validators/tickets.schema";
import type { AuthenticatedUser } from "../types/auth";

function getAuthenticatedUser(req: Request, res: Response): AuthenticatedUser | undefined {
  if (!req.authUser) {
    sendFailure(res, 401, { code: "UNAUTHORIZED", message: "Authentication is required." });
    return undefined;
  }
  return req.authUser;
}

function getTicketId(req: Request, res: Response): string | undefined {
  const id = req.params.id;
  if (typeof id !== "string" || id.length === 0) {
    sendFailure(res, 400, { code: "VALIDATION_ERROR", message: "A valid ticket ID is required." });
    return undefined;
  }
  return id;
}

export async function listTickets(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req, res);
  if (!user) return;
  const result = listTicketsQuerySchema.safeParse(req.query);
  if (!result.success) {
    sendFailure(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Invalid ticket query.",
      details: result.error.issues.map(({ path, message }) => ({ path, message })),
    });
    return;
  }
  const { tickets, total } = await ticketsService.listTickets(user, result.data);
  sendSuccess(res, 200, tickets, {
    page: result.data.page,
    limit: result.data.limit,
    total,
    totalPages: Math.ceil(total / result.data.limit),
  });
}

export async function getTicket(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req, res);
  if (!user) return;
  const id = getTicketId(req, res);
  if (!id) return;
  const ticket = await ticketsService.getTicket(id, user);
  if (!ticket) {
    sendFailure(res, 404, { code: "NOT_FOUND", message: "Ticket not found." });
    return;
  }
  sendSuccess(res, 200, ticket);
}

export async function createTicket(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req, res);
  if (!user) return;
  const result = createTicketSchema.safeParse(req.body);
  if (!result.success) {
    sendFailure(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Invalid ticket data.",
      details: result.error.issues.map(({ path, message }) => ({ path, message })),
    });
    return;
  }
  sendSuccess(res, 201, await ticketsService.createTicket(result.data, user));
}

export async function updateTicket(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req, res);
  if (!user) return;
  const id = getTicketId(req, res);
  if (!id) return;
  const result = updateTicketSchema.safeParse(req.body);
  if (!result.success) {
    sendFailure(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Invalid ticket data.",
      details: result.error.issues.map(({ path, message }) => ({ path, message })),
    });
    return;
  }
  const ticket = await ticketsService.updateTicket(id, result.data, user);
  if (!ticket) {
    sendFailure(res, 404, { code: "NOT_FOUND", message: "Ticket not found." });
    return;
  }
  sendSuccess(res, 200, ticket);
}

export async function deleteTicket(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req, res);
  if (!user) return;
  const id = getTicketId(req, res);
  if (!id) return;
  const deleted = await ticketsService.deleteTicket(id, user);
  if (!deleted) {
    sendFailure(res, 404, { code: "NOT_FOUND", message: "Ticket not found." });
    return;
  }
  sendSuccess(res, 200, null);
}