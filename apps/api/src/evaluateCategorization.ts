import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { geminiClient } from "./ai/gemini-client";
import {
  evaluateCategorization,
  formatEvaluationReport,
  parseEvaluationCsv,
} from "./ai/categorization-evaluation";

async function main(): Promise<void> {
  const [inputPath, reportPath] = process.argv.slice(2);
  if (!inputPath) {
    throw new Error(
      "Usage: npm run evaluate:categorization -- <20-ticket.csv> [report.json]",
    );
  }

  const csvText = await readFile(resolve(inputPath), "utf8");
  const tickets = parseEvaluationCsv(csvText);
  const report = await evaluateCategorization(
    tickets,
    ({ subject, description }) => geminiClient.categorizeTicket({ subject, description }),
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
