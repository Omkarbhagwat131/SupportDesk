import { z } from "zod";

const ticketFields = {
  subject: z.string().trim().min(1),
  requesterEmail: z.string().trim().email(),
  description: z.string().trim().min(1),
  priority: z.enum(["P1", "P2", "P3", "P4"]),
  status: z.enum(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]),
};

export const createTicketSchema = z.object({
  subject: ticketFields.subject,
  requesterEmail: ticketFields.requesterEmail,
  description: ticketFields.description,
  priority: ticketFields.priority.optional(),
  status: ticketFields.status.optional(),
});

export const updateTicketSchema = z.object({
  subject: ticketFields.subject.optional(),
  requesterEmail: ticketFields.requesterEmail.optional(),
  description: ticketFields.description.optional(),
  category: z.string().trim().min(1).max(100).nullable().optional(),
  assigneeId: z.string().trim().min(1).max(100).nullable().optional(),
  priority: ticketFields.priority.optional(),
  status: ticketFields.status.optional(),
}).refine((ticket) => Object.keys(ticket).length > 0, {
  message: "Provide at least one ticket field to update.",
});

export const listTicketsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(2_147_483_647).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  status: z.preprocess(
    (status) => typeof status === "string" ? status.toUpperCase() : status,
    ticketFields.status.optional(),
  ),
  priority: ticketFields.priority.optional(),
  assigneeId: z.string().trim().min(1).max(100).optional(),
  search: z.string().trim().min(1).max(200).optional(),
  sortBy: z.enum(["createdAt", "updatedAt", "status", "priority", "subject"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
}).strict();

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  isInternal: z.boolean().default(false),
}).strict();

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;