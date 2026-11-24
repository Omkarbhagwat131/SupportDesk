export {
  createCommentSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  updateTicketSchema,
} from "../../../../api/src/validators/tickets.schema";
export { categorizeTicketResultSchema, ticketCategorySchema } from "../../../../api/src/validators/ai.schema";

export type {
  CreateCommentInput,
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "../../../../api/src/validators/tickets.schema";
export type { CategorizeTicketResult } from "../../../../api/src/validators/ai.schema";
