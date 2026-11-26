import type { Request, Response } from "express";
import { AppError } from "../errors/app-error";
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

  const abortController = new AbortController();
  const handleClose = () => {
    if (!res.writableEnded) abortController.abort();
  };
  req.on("aborted", handleClose);
  res.on("close", handleClose);

  try {
    const result = await categorizeTicketService.categorizeTicket(
      ticketId,
      req.authUser,
      abortController.signal,
    );
    if (abortController.signal.aborted || res.destroyed) return;
    sendSuccess(res, 200, result);
  } catch (reason) {
    if (abortController.signal.aborted || res.destroyed) return;
    if (reason instanceof AppError && reason.code === "AI_TIMEOUT") {
      sendFailure(res, reason.statusCode, { code: reason.code, message: reason.message });
      return;
    }
    throw reason;
  } finally {
    req.off("aborted", handleClose);
    res.off("close", handleClose);
  }
}
