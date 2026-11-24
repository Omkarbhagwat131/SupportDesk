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

export type CategorizeTicketResult = z.infer<typeof categorizeTicketResultSchema>;
