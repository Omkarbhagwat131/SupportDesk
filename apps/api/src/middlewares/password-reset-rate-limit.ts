import { rateLimit } from "express-rate-limit";
import type { RequestHandler } from "express";
import { sendFailure } from "../utils/api-response";

function createPasswordResetRateLimiter(limit: number, message: string): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => {
      sendFailure(res, 429, { code: "RATE_LIMITED", message });
    },
  });
}

export function createForgotPasswordRateLimiter(): RequestHandler {
  return createPasswordResetRateLimiter(
    5,
    "Too many password reset requests. Please try again later.",
  );
}

export function createResetPasswordRateLimiter(): RequestHandler {
  return createPasswordResetRateLimiter(
    10,
    "Too many password reset attempts. Please try again later.",
  );
}
