import type { RequestHandler } from "express";
import { authService } from "../services/auth.service";
import { passwordResetService } from "../services/password-reset.service";
import { sendFailure, sendSuccess } from "../utils/api-response";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "../validators/auth.schema";

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

export const forgotPassword: RequestHandler = async (req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    sendFailure(res, 503, {
      code: "PASSWORD_RESET_UNAVAILABLE",
      message: "Password reset is available only in local development until email delivery is configured.",
    });
    return;
  }

  const result = forgotPasswordSchema.safeParse(req.body);
  if (!result.success) {
    sendValidationFailure(res, "Invalid password reset request.", result.error.issues);
    return;
  }

  try {
    const token = await passwordResetService.requestReset(result.data.email);
    if (token) {
      console.info(`Local password reset link: http://localhost:5173/reset-password?token=${token}`);
    }
    sendSuccess(res, 200, {
      message: "If an account exists for that email, a password reset link is available in the API terminal.",
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword: RequestHandler = async (req, res, next) => {
  if (process.env.NODE_ENV !== "development") {
    sendFailure(res, 503, {
      code: "PASSWORD_RESET_UNAVAILABLE",
      message: "Password reset is available only in local development until email delivery is configured.",
    });
    return;
  }

  const result = resetPasswordSchema.safeParse(req.body);
  if (!result.success) {
    sendValidationFailure(res, "Invalid password reset data.", result.error.issues);
    return;
  }

  try {
    await passwordResetService.resetPassword(result.data.token, result.data.password);
    sendSuccess(res, 200, { message: "Password reset successfully." });
  } catch (error) {
    next(error);
  }
};
