import { Router } from "express";
import * as commentsController from "../controllers/comments.controller";
import * as categorizeTicketController from "../controllers/categorize-ticket.controller";
import * as suggestReplyController from "../controllers/suggest-reply.controller";
import * as ticketsController from "../controllers/tickets.controller";
import { requireAuth } from "../middlewares/require-auth";
import { requireRole } from "../middlewares/require-role";
import { UserRole } from "../generated/prisma/client";

const router = Router();

router.use(requireAuth);

router.get("/:id/comments", requireRole(UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN), commentsController.listComments);
router.post("/:id/comments", requireRole(UserRole.CUSTOMER, UserRole.AGENT), commentsController.createComment);
router.post("/:id/suggest-reply", requireRole(UserRole.AGENT), suggestReplyController.suggestReply);
router.post("/:id/categorize", requireRole(UserRole.AGENT, UserRole.ADMIN), categorizeTicketController.categorizeTicket);
router.get("/", requireRole(UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN), ticketsController.listTickets);
router.get("/:id", requireRole(UserRole.CUSTOMER, UserRole.AGENT, UserRole.ADMIN), ticketsController.getTicket);
router.post("/", requireRole(UserRole.CUSTOMER), ticketsController.createTicket);
router.put("/:id", requireRole(UserRole.AGENT, UserRole.ADMIN), ticketsController.updateTicket);
router.delete("/:id", requireRole(UserRole.AGENT, UserRole.ADMIN), ticketsController.deleteTicket);

export default router;