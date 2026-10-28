# SupportDesk Monorepo

SupportDesk is a customer support platform under development. The currently implemented feature in this repository is a TypeScript command-line tool that converts ticket records from CSV to JSON.

---

## Repository Structure

```text
supportdesk/
├── apps/
│   ├── api/          # TypeScript CSV-to-JSON ticket importer
│   ├── web/          # Placeholder for the planned web dashboard
│   └── mobile/       # Placeholder for the planned mobile application
├── agents/           # Placeholder for agent configurations and prompts
├── automation/
│   └── n8n/          # Placeholder for n8n workflows
├── postman/          # Placeholder for API collections and environments
├── infra/            # Placeholder for infrastructure and deployment files
├── docs/             # Project documentation and prompt journal
├── .github/
│   └── workflows/    # Placeholder for GitHub Actions workflows
├── .gitignore        # Excluded files, folders, and local secrets
├── .env.example      # Template for environment variables (safe placeholders)
└── README.md         # Project overview and documentation
```

## Import tickets from CSV

This small TypeScript command-line tool converts a CSV file into JSON. It uses the API app's existing folder and npm setup. You need Node.js 20 or newer and npm.

### Run the tool

Open a terminal at the repository root and install the API app's dependencies:

```powershell
npm install --prefix apps/api
```

Convert the example CSV and print the JSON in the terminal:

```powershell
npm run import --prefix apps/api -- fixtures/tickets.csv
```

To save the result to a JSON file instead, provide an output path:

```powershell
npm run import --prefix apps/api -- fixtures/tickets.csv fixtures/tickets-output.json
```

If the output file already exists, it will be overwritten.

You can also run the commands from the API folder:

```powershell
cd apps/api
npm install
npm run import -- fixtures/tickets.csv
```

### CSV and JSON format

The CSV must have these unique column names: `subject`, `requester_email`, and `description`. `priority` and `status` are optional. Priority can be `LOW`, `MEDIUM`, `HIGH`, or `URGENT` and defaults to `MEDIUM`. Status can be `OPEN`, `IN_PROGRESS`, or `RESOLVED` and defaults to `OPEN`. Email, subject, and description values are required. Standard CSV quoted values may contain commas.

The output is a JSON object with one `tickets` array. Each ticket has `id`, `subject`, `requesterEmail`, `description`, `priority`, `status`, and `createdAt` properties. An ID looks like `TKT-20260115-000001`: `TKT`, the UTC date, and a sequential number. The number increases while this process is running. IDs are not guaranteed unique across separate runs or machines.

If an input file is missing or unreadable, arguments are missing, the CSV is malformed, a required header/value is missing, or a value is invalid, the tool prints an error and exits with a failure status instead of producing JSON. A CSV with valid headers and no ticket rows produces an empty `tickets` array. The import stops at the first invalid row and includes its row number in the error where applicable.

Example synthetic input: [`apps/api/fixtures/tickets.csv`](apps/api/fixtures/tickets.csv). Representative JSON: [`apps/api/fixtures/tickets.json`](apps/api/fixtures/tickets.json).

### Beginner walkthrough: what the code does

1. **Start in `src/importTickets.ts`.** This file contains the converter and command-line entry point. A TypeScript type describes the shape of one ticket and restricts priorities and statuses to the allowed choices.
2. **Generate an ID.** `generateTicketId` takes the current date, formats its UTC day as `YYYYMMDD`, and adds a counter. For example, `TKT-20260115-000001` means ticket number 1 for January 15, 2026. A counter is simple, but it does not promise IDs will be unique across separate runs.
3. **Parse the CSV.** `convertCsv` uses the `csv-parse` library, so commas inside quoted text are treated as part of the value rather than as a new column. It reads columns by their header names, not by their order.
4. **Validate before creating output.** The converter checks the header names, required columns, values, email shape, priority, and status. If it finds a problem, it throws an error. The import stops rather than quietly skipping that row.
5. **Build the JSON object.** Each valid row becomes a ticket object, and the objects are collected in `{ "tickets": [...] }`. CSV `requester_email` is written as JSON `requesterEmail`.
6. **Run as a command.** The `main` function reads the input file, calls the converter, and either prints JSON or writes it to the requested output file. Errors go to the terminal, and the command exits unsuccessfully.

### Test and build

From the repository root, run:

```powershell
npm test --prefix apps/api
npm run build --prefix apps/api
```

The tests cover ID format and sequence, column-to-property mapping, quoted commas, defaults, and invalid input.