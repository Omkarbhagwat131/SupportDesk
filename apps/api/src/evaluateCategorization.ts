import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { geminiClient } from "./ai/gemini-client";
import { AppError } from "./errors/app-error";
import {
  evaluateCategorization,
  formatEvaluationReport,
  parseEvaluationCsv,
} from "./ai/categorization-evaluation";

const MIN_REQUEST_INTERVAL_MS = 5_000;
const MAX_RATE_LIMIT_RETRIES = 3;

function isProviderRateLimit(error: unknown): boolean {
  return error instanceof AppError
    && error.code === "AI_PROVIDER_ERROR"
    && error.message.includes("(provider HTTP 429)");
}

async function categorizeWithRateLimitRetry(
  subject: string,
  description: string,
): Promise<string> {
  for (let retry = 0; ; retry += 1) {
    try {
      return await geminiClient.categorizeTicket({ subject, description });
    } catch (error) {
      if (!isProviderRateLimit(error) || retry >= MAX_RATE_LIMIT_RETRIES) throw error;
      const backoffMs = 15_000 * (retry + 1);
      console.warn(`Gemini rate limited the evaluation request; retrying in ${backoffMs / 1_000}s.`);
      await new Promise((resolveWait) => setTimeout(resolveWait, backoffMs));
    }
  }
}

async function main(): Promise<void> {
  const [inputPath, reportPath] = process.argv.slice(2);
  if (!inputPath) {
    throw new Error(
      "Usage: npm run evaluate:categorization -- <20-ticket.csv> [report.json]",
    );
  }

  const csvText = await readFile(resolve(inputPath), "utf8");
  const tickets = parseEvaluationCsv(csvText);
  let lastRequestAt: number | undefined;
  const report = await evaluateCategorization(
    tickets,
    async ({ subject, description }) => {
      if (lastRequestAt !== undefined) {
        const waitMs = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
        if (waitMs > 0) await new Promise((resolveWait) => setTimeout(resolveWait, waitMs));
      }
      lastRequestAt = Date.now();
      return categorizeWithRateLimitRetry(subject, description);
    },
  );
  const jsonReport = `${JSON.stringify(report, null, 2)}\n`;

  if (reportPath) {
    await writeFile(resolve(reportPath), jsonReport, { flag: "wx" });
  }

  console.log(formatEvaluationReport(report));
  if (reportPath) console.log(`JSON report saved to ${resolve(reportPath)}`);
}

void main().catch((reason: unknown) => {
  console.error(reason instanceof Error ? reason.message : "Categorization evaluation failed.");
  process.exitCode = 1;
});
