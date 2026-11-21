import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { createLoginRateLimiter } from "../middlewares/login-rate-limit";
import {
  createForgotPasswordRateLimiter,
  createResetPasswordRateLimiter,
} from "../middlewares/password-reset-rate-limit";

const router = Router();

router.post("/register", authController.register);
router.post("/login", createLoginRateLimiter(), authController.login);
router.post("/forgot-password", createForgotPasswordRateLimiter(), authController.forgotPassword);
router.post("/reset-password", createResetPasswordRateLimiter(), authController.resetPassword);

export default router;
