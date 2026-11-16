import cors from "cors";
import type { RequestHandler } from "express";
import { env } from "../config/env";

export function createCorsMiddleware(allowedOrigins: readonly string[] = env.corsOrigins): RequestHandler {
  return cors({
    origin(origin, callback) {
      callback(null, origin === undefined || allowedOrigins.includes(origin));
    },
  });
}
