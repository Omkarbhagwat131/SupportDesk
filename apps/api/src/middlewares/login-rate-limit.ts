import { rateLimit } from "express-rate-limit";
import type { RequestHandler } from "express";
import { sendFailure } from "../utils/api-response";

export function createLoginRateLimiter(): RequestHandler {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) => {
      sendFailure(res, 429, {
        code: "RATE_LIMITED",
        message: "Too many login attempts. Please try again later.",
      });
    },
  });
}
