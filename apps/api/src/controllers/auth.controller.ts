import type { RequestHandler } from "express";
import { authService } from "../services/auth.service";
import { sendFailure, sendSuccess } from "../utils/api-response";
import { loginSchema, registerSchema } from "../validators/auth.schema";

function sendValidationFailure(
  res: Parameters<RequestHandler>[1],
  message: string,
  issues: Array<{ path: PropertyKey[]; message: string }>,
): void {
  sendFailure(res, 400, {
    code: "VALIDATION_ERROR",
    message,
    details: issues.map(({ path, message: issueMessage }) => ({ path, message: issueMessage })),
  });
}

export const register: RequestHandler = async (req, res, next) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) {
    sendValidationFailure(res, "Invalid registration data.", result.error.issues);
    return;
  }

  try {
    const user = await authService.register(result.data);
    sendSuccess(res, 201, { user });
  } catch (error) {
    next(error);
  }
};

export const login: RequestHandler = async (req, res, next) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    sendValidationFailure(res, "Invalid login data.", result.error.issues);
    return;
  }

  try {
    sendSuccess(res, 200, await authService.login(result.data));
  } catch (error) {
    next(error);
  }
};
