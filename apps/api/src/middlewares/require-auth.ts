import jwt from "jsonwebtoken";
import type { RequestHandler } from "express";
import { env } from "../config/env";
import { JWT_AUDIENCE, JWT_ISSUER } from "../config/jwt";
import * as usersRepository from "../repositories/users.repository";
import { sendFailure } from "../utils/api-response";
import type { AuthenticatedUser } from "../types/auth";

export { JWT_AUDIENCE, JWT_ISSUER } from "../config/jwt";

type AuthUserLookup = (id: string) => Promise<AuthenticatedUser | null>;

function unauthorized(res: Parameters<RequestHandler>[1], message: string): void {
  sendFailure(res, 401, { code: "UNAUTHORIZED", message });
}

export function createRequireAuth(
  findAuthUserById: AuthUserLookup = usersRepository.findAuthUserById,
  secret: string = env.jwtSecret,
): RequestHandler {
  return async (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/i.exec(req.get("authorization") ?? "");
    if (!match) {
      unauthorized(res, "A valid bearer token is required.");
      return;
    }

    let subject: string;
    try {
      const payload = jwt.verify(match[1], secret, {
        algorithms: ["HS256"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      });
      if (typeof payload === "string" || typeof payload.sub !== "string" || payload.sub.length === 0) {
        unauthorized(res, "The bearer token is invalid or expired.");
        return;
      }
      subject = payload.sub;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        unauthorized(res, "The bearer token is invalid or expired.");
        return;
      }
      next(error);
      return;
    }

    try {
      const user = await findAuthUserById(subject);
      if (!user) {
        unauthorized(res, "The bearer token is invalid or expired.");
        return;
      }
      req.authUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}

export const requireAuth = createRequireAuth();
