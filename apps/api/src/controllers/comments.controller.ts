import type { Request, Response } from "express";
import { commentsService } from "../services/comments.service";
import { sendFailure, sendSuccess } from "../utils/api-response";
import { createCommentSchema } from "../validators/tickets.schema";
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

export async function listComments(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req, res);
  if (!user) return;
  const ticketId = getTicketId(req, res);
  if (!ticketId) return;

  const comments = await commentsService.listComments(ticketId, user);
  if (!comments) {
    sendFailure(res, 404, { code: "NOT_FOUND", message: "Ticket not found." });
    return;
  }
  sendSuccess(res, 200, comments);
}

export async function createComment(req: Request, res: Response): Promise<void> {
  const user = getAuthenticatedUser(req, res);
  if (!user) return;
  const ticketId = getTicketId(req, res);
  if (!ticketId) return;

  const result = createCommentSchema.safeParse(req.body);
  if (!result.success) {
    sendFailure(res, 400, {
      code: "VALIDATION_ERROR",
      message: "Invalid comment data.",
      details: result.error.issues.map(({ path, message }) => ({ path, message })),
    });
    return;
  }

  const comment = await commentsService.createComment(ticketId, result.data, user);
  if (!comment) {
    sendFailure(res, 404, { code: "NOT_FOUND", message: "Ticket not found." });
    return;
  }
  sendSuccess(res, 201, comment);
}
