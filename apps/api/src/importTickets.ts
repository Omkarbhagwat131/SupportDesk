import { readFileSync, writeFileSync } from "node:fs";
import { parse } from "csv-parse/sync";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Status = "OPEN" | "IN_PROGRESS" | "RESOLVED";

type Ticket = {
  id: string;
  subject: string;
  requesterEmail: string;
  description: string;
  priority: Priority;
  status: Status;
  createdAt: string;
};

const requiredHeaders = ["subject", "requester_email", "description"];
const allowedHeaders = [...requiredHeaders, "priority", "status"];
const priorities: Priority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const statuses: Status[] = ["OPEN", "IN_PROGRESS", "RESOLVED"];

let ticketNumber = 0;

export function generateTicketId(date = new Date()): string {
  ticketNumber += 1;
  const day = date.toISOString().slice(0, 10).replaceAll("-", "");
  return `TKT-${day}-${String(ticketNumber).padStart(6, "0")}`;
}

export function convertCsv(csvText: string, date = new Date()): { tickets: Ticket[] } {
  let rows: string[][];

  try {
    rows = parse(csvText, {
      bom: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: false,
    }) as string[][];
  } catch {
    throw new Error("Invalid CSV. Check the quotes and number of columns.");
  }

  const headers = rows.shift();
  if (!headers) {
    throw new Error("CSV is empty. Add a header row.");
  }

  for (const header of headers) {
    if (!header || !allowedHeaders.includes(header)) {
      throw new Error(`Unknown or empty column name: "${header}".`);
    }
  }

  if (new Set(headers).size !== headers.length) {
    throw new Error("CSV has a duplicate column name.");
  }

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new Error(`Missing required column: "${header}".`);
    }
  }

  const tickets = rows.map((row, index): Ticket => {
    const value = (name: string): string => {
      const position = headers.indexOf(name);
      return position === -1 ? "" : (row[position] ?? "").trim();
    };

    const subject = value("subject");
    const requesterEmail = value("requester_email");
    const description = value("description");
    const priority = (value("priority").toUpperCase() || "MEDIUM") as Priority;
    const status = (value("status").toUpperCase() || "OPEN") as Status;

    if (!subject || !requesterEmail || !description) {
      throw new Error(`Row ${index + 2} is missing a required value.`);
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requesterEmail)) {
      throw new Error(`Row ${index + 2} has an invalid requester_email.`);
    }
    if (!priorities.includes(priority)) {
      throw new Error(`Row ${index + 2} has an invalid priority.`);
    }
    if (!statuses.includes(status)) {
      throw new Error(`Row ${index + 2} has an invalid status.`);
    }

    return {
      id: generateTicketId(date),
      subject,
      requesterEmail,
      description,
      priority,
      status,
      createdAt: date.toISOString(),
    };
  });

  return { tickets };
}

function main(): void {
  const [inputFile, outputFile, ...extraArguments] = process.argv.slice(2);
  if (!inputFile || extraArguments.length > 0) {
    console.error("Usage: npm run import -- <input.csv> [output.json]");
    process.exitCode = 1;
    return;
  }

  let csvText: string;
  try {
    csvText = readFileSync(inputFile, "utf8");
  } catch {
    console.error("Could not read the input file. Check its path and permissions.");
    process.exitCode = 1;
    return;
  }

  let json: string;
  try {
    json = `${JSON.stringify(convertCsv(csvText), null, 2)}\n`;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Ticket import failed.");
    process.exitCode = 1;
    return;
  }

  if (!outputFile) {
    process.stdout.write(json);
    return;
  }

  try {
    writeFileSync(outputFile, json, "utf8");
  } catch {
    console.error("Could not write the output file. Check its path and permissions.");
    process.exitCode = 1;
  }
}

if (process.argv[1]?.endsWith("importTickets.ts") || process.argv[1]?.endsWith("importTickets.js")) {
  main();
}
