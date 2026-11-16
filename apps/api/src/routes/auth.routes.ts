import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { createLoginRateLimiter } from "../middlewares/login-rate-limit";

const router = Router();

router.post("/register", authController.register);
router.post("/login", createLoginRateLimiter(), authController.login);

export default router;
