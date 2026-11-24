import { once } from "node:events";
import type { Request, Response } from "express";
import { AppError } from "../errors/app-error";
import { suggestReplyService } from "../services/suggest-reply.service";
import { sendFailure } from "../utils/api-response";

function writeEvent(res: Response, event: string, data: unknown, signal: AbortSignal): Promise<void> {
  const accepted = res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  return accepted ? Promise.resolve() : once(res, "drain", { signal }).then(() => undefined);
}

export async function suggestReply(req: Request, res: Response): Promise<void> {
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
  res.on("close", handleClose);

  try {
    const chunks = await suggestReplyService.suggestReply(ticketId, req.authUser, abortController.signal);
    if (abortController.signal.aborted) return;

    res.status(200);
    res.set({
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();

    for await (const chunk of chunks) {
      await writeEvent(res, "delta", { data: chunk }, abortController.signal);
    }
    if (!abortController.signal.aborted) {
      await writeEvent(res, "done", { data: null }, abortController.signal);
      res.end();
    }
  } catch (reason) {
    if (abortController.signal.aborted || res.destroyed) return;
    if (!res.headersSent) {
      if (reason instanceof AppError) {
        sendFailure(res, reason.statusCode, { code: reason.code, message: reason.message });
      } else {
        throw reason;
      }
      return;
    }
    const error = reason instanceof AppError
      ? reason
      : new AppError(502, "AI_PROVIDER_ERROR", "Unable to generate a reply draft.");
    try {
      await writeEvent(res, "error", {
        error: { code: error.code, message: error.message },
      }, abortController.signal);
      res.end();
    } catch {
      if (!res.destroyed) res.end();
    }
  } finally {
    res.off("close", handleClose);
  }
}
