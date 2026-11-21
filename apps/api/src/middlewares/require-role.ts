import type { RequestHandler } from "express";
import type { UserRole } from "../generated/prisma/client";
import { sendFailure } from "../utils/api-response";

export function requireRole(...allowedRoles: UserRole[]): RequestHandler {
  return (req, res, next) => {
    if (!req.authUser) {
      sendFailure(res, 401, { code: "UNAUTHORIZED", message: "Authentication is required." });
      return;
    }
    if (!allowedRoles.includes(req.authUser.role)) {
      sendFailure(res, 403, { code: "FORBIDDEN", message: "You do not have permission to access this resource." });
      return;
    }
    next();
  };
}
