import { Router } from "express";
import * as usersController from "../controllers/users.controller";
import { requireAuth } from "../middlewares/require-auth";
import { requireRole } from "../middlewares/require-role";
import { UserRole } from "../generated/prisma/client";

const router = Router();

router.use(requireAuth);
router.get("/agents", requireRole(UserRole.ADMIN), usersController.listAgents);

export default router;
