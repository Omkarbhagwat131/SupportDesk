import type { Request, Response } from "express";
import { categorizeTicketService } from "../services/categorize-ticket.service";
import { sendFailure, sendSuccess } from "../utils/api-response";

export async function categorizeTicket(req: Request, res: Response): Promise<void> {
  const ticketId = req.params.id;
  if (typeof ticketId !== "string" || ticketId.length === 0) {
    sendFailure(res, 400, { code: "VALIDATION_ERROR", message: "A valid ticket ID is required." });
    return;
  }
  if (!req.authUser) {
    sendFailure(res, 401, { code: "UNAUTHORIZED", message: "Authentication is required." });
    return;
  }

  const result = await categorizeTicketService.categorizeTicket(ticketId, req.authUser);
  sendSuccess(res, 200, result);
}
