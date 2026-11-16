import type { ErrorRequestHandler, RequestHandler } from "express";
import { AppError } from "../errors/app-error";
import { sendFailure } from "../utils/api-response";

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(new AppError(404, "NOT_FOUND", "Route not found."));
};

function isMalformedJson(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "type" in error
    && error.type === "entity.parse.failed";
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (isMalformedJson(error)) {
    sendFailure(res, 400, { code: "VALIDATION_ERROR", message: "Request body must contain valid JSON." });
    return;
  }
  if (res.headersSent) {
    _next(error);
    return;
  }
  if (
    error instanceof AppError
    && Number.isInteger(error.statusCode)
    && error.statusCode >= 400
    && error.statusCode <= 599
  ) {
    sendFailure(res, error.statusCode, {
      code: error.code,
      message: error.message,
      ...(error.details === undefined ? {} : { details: error.details }),
    });
    return;
  }
  console.error("Unhandled API error.");
  sendFailure(res, 500, { code: "INTERNAL_SERVER_ERROR", message: "Internal server error." });
};