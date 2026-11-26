import { z } from "zod";

export const ticketCategorySchema = z.enum([
  "account",
  "billing",
  "technical",
  "product",
  "other",
]);

export const categorizeTicketResultSchema = z.object({
  category: ticketCategorySchema,
  priority: z.enum(["P1", "P2", "P3", "P4"]),
}).strict();

export const MAX_SUGGEST_REPLY_CHARS = 5_000;

export const suggestReplyResultSchema = z.string().trim().min(1).max(MAX_SUGGEST_REPLY_CHARS);

export type CategorizeTicketResult = z.infer<typeof categorizeTicketResultSchema>;
