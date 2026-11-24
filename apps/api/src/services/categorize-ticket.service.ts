import { UserRole } from "../generated/prisma/client";
import { AppError } from "../errors/app-error";
import { geminiClient } from "../ai/gemini-client";
import * as ticketsRepository from "../repositories/tickets.repository";
import type { AuthenticatedUser } from "../types/auth";
import { categorizeTicketResultSchema } from "../validators/ai.schema";

type CategorizeTicketDependencies = {
  tickets: Pick<typeof ticketsRepository, "findTicketById">;
  client: Pick<typeof geminiClient, "categorizeTicket">;
};

function rejectOutput(reason: "invalid_json" | "schema_mismatch"): never {
  console.warn("AI categorization output rejected", JSON.stringify({ reason }));
  throw new AppError(502, "INVALID_AI_OUTPUT", "The AI provider returned invalid categorization output.");
}

export function createCategorizeTicketService(
  dependencies: CategorizeTicketDependencies = {
    tickets: ticketsRepository,
    client: geminiClient,
  },
) {
  return {
    async categorizeTicket(ticketId: string, user: AuthenticatedUser) {
      if (user.role !== UserRole.AGENT && user.role !== UserRole.ADMIN) {
        throw new AppError(403, "FORBIDDEN", "Only agents can categorize tickets.");
      }

      const ticket = await dependencies.tickets.findTicketById(ticketId, user);
      if (!ticket) throw new AppError(404, "NOT_FOUND", "Ticket not found.");
      if (!ticket.subject.trim() && !ticket.description.trim()) {
        throw new AppError(422, "EMPTY_TICKET_CONTEXT", "Ticket subject and description are empty.");
      }

      const response = await dependencies.client.categorizeTicket({
        subject: ticket.subject,
        description: ticket.description,
      });

      let output: unknown;
      try {
        output = JSON.parse(response);
      } catch {
        rejectOutput("invalid_json");
      }

      const result = categorizeTicketResultSchema.safeParse(output);
      if (!result.success) {
        rejectOutput("schema_mismatch");
      }
      return result.data;
    },
  };
}

export const categorizeTicketService = createCategorizeTicketService();
