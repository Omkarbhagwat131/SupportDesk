import { parse } from "csv-parse/sync";
import { z } from "zod";
import { categorizeTicketResultSchema, ticketCategorySchema } from "../validators/ai.schema";

const REQUIRED_EVALUATION_ROWS = 20;

const evaluationRowSchema = z.object({
  id: z.string().trim().optional().transform((value) => value || undefined),
  subject: z.string().trim(),
  description: z.string().trim(),
  expected_category: ticketCategorySchema,
}).strict().refine(
  (row) => row.subject.length > 0 || row.description.length > 0,
  { message: "subject and description cannot both be empty." },
);

export type EvaluationTicket = {
  id: string;
  subject: string;
  description: string;
  expectedCategory: z.infer<typeof ticketCategorySchema>;
};

export type EvaluationResult = {
  id: string;
  expectedCategory: z.infer<typeof ticketCategorySchema>;
  predictedCategory: z.infer<typeof ticketCategorySchema> | null;
  correct: boolean;
  failure: "provider_error" | "malformed_json" | "invalid_output" | null;
};

export type EvaluationReport = {
  total: number;
  correct: number;
  incorrect: number;
  accuracyPercent: number;
  targetAccuracyPercent: 80;
  meetsTarget: boolean;
  results: EvaluationResult[];
  incorrectPredictions: EvaluationResult[];
};

export function parseEvaluationCsv(csvText: string): EvaluationTicket[] {
  let rows: unknown;
  try {
    rows = parse(csvText, {
      bom: true,
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false,
    });
  } catch {
    throw new Error("Invalid evaluation CSV. Check the quotes and number of columns.");
  }

  const parsedRows = z.array(evaluationRowSchema).length(REQUIRED_EVALUATION_ROWS).safeParse(rows);
  if (!parsedRows.success) {
    const details = parsedRows.error.issues
      .map((issue) => `${issue.path.join(".") || "rows"}: ${issue.message}`)
      .join("; ");
    throw new Error(
      `Evaluation CSV must contain exactly ${REQUIRED_EVALUATION_ROWS} valid rows with subject, description, and expected_category columns. ${details}`,
    );
  }

  const tickets = parsedRows.data.map((row, index) => ({
    id: row.id ?? `case-${String(index + 1).padStart(2, "0")}`,
    subject: row.subject,
    description: row.description,
    expectedCategory: row.expected_category,
  }));
  if (new Set(tickets.map((ticket) => ticket.id)).size !== tickets.length) {
    throw new Error("Evaluation ticket IDs must be unique.");
  }
  return tickets;
}

export async function evaluateCategorization(
  tickets: EvaluationTicket[],
  categorize: (ticket: Pick<EvaluationTicket, "subject" | "description">) => Promise<string>,
): Promise<EvaluationReport> {
  const results: EvaluationResult[] = [];

  for (const ticket of tickets) {
    let response: string;
    try {
      response = await categorize({ subject: ticket.subject, description: ticket.description });
    } catch {
      results.push({
        id: ticket.id,
        expectedCategory: ticket.expectedCategory,
        predictedCategory: null,
        correct: false,
        failure: "provider_error",
      });
      continue;
    }

    let output: unknown;
    try {
      output = JSON.parse(response);
    } catch {
      results.push({
        id: ticket.id,
        expectedCategory: ticket.expectedCategory,
        predictedCategory: null,
        correct: false,
        failure: "malformed_json",
      });
      continue;
    }

    const validated = categorizeTicketResultSchema.safeParse(output);
    if (!validated.success) {
      results.push({
        id: ticket.id,
        expectedCategory: ticket.expectedCategory,
        predictedCategory: null,
        correct: false,
        failure: "invalid_output",
      });
      continue;
    }

    results.push({
      id: ticket.id,
      expectedCategory: ticket.expectedCategory,
      predictedCategory: validated.data.category,
      correct: validated.data.category === ticket.expectedCategory,
      failure: null,
    });
  }

  const correct = results.filter((result) => result.correct).length;
  const total = results.length;
  const accuracyPercent = total === 0 ? 0 : Number(((correct / total) * 100).toFixed(2));
  const incorrectPredictions = results.filter((result) => !result.correct);

  return {
    total,
    correct,
    incorrect: total - correct,
    accuracyPercent,
    targetAccuracyPercent: 80,
    meetsTarget: accuracyPercent >= 80,
    results,
    incorrectPredictions,
  };
}

export function formatEvaluationReport(report: EvaluationReport): string {
  const lines = [
    `Accuracy: ${report.accuracyPercent.toFixed(2)}% (${report.correct}/${report.total})`,
    `Target (80%): ${report.meetsTarget ? "PASS" : "FAIL"}`,
    `Incorrect predictions: ${report.incorrect}`,
  ];

  if (report.incorrectPredictions.length === 0) {
    lines.push("Failure cases: none");
  } else {
    lines.push("Failure cases:");
    for (const result of report.incorrectPredictions) {
      const prediction = result.predictedCategory ?? result.failure ?? "unknown";
      lines.push(`- ${result.id}: expected ${result.expectedCategory}, got ${prediction}`);
    }
  }

  return lines.join("\n");
}
