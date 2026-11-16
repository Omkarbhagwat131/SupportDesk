# SupportDesk Monorepo

SupportDesk is a customer support platform under development. The repository includes a TypeScript ticket CSV-to-JSON importer and a local PostgreSQL database managed with Prisma.

---

## Repository Structure

```text
supportdesk/
├── apps/
│   ├── api/          # Ticket CSV importer and Prisma database tools
│   ├── web/          # Placeholder for the planned web dashboard
│   └── mobile/       # Placeholder for the planned mobile application
├── agents/           # Placeholder for agent configurations and prompts
├── automation/
│   └── n8n/          # Placeholder for n8n workflows
├── postman/          # Placeholder for API collections and environments
├── infra/            # Placeholder for infrastructure and deployment files
├── prisma/           # PostgreSQL schema and migrations
├── compose.yaml       # Local PostgreSQL service
├── docs/             # Project documentation and prompt journal
├── .github/
│   └── workflows/    # Placeholder for GitHub Actions workflows
├── .gitignore        # Excluded files, folders, and local secrets
├── .env.example      # Template for environment variables (safe placeholders)
└── README.md         # Project overview and documentation
```

## Local PostgreSQL database

The API's Prisma schema describes the ticket fields emitted by the CSV importer. To start the local PostgreSQL database, first create a root `.env` from the safe development template, then start Docker Compose:

```powershell
Copy-Item .env.example .env
docker compose up -d
```

Install the API dependencies, apply the initial migration, and generate the Prisma Client:

```powershell
npm install --prefix apps/api
npm run db:migrate --prefix apps/api
npm run prisma:generate --prefix apps/api
npm run db:seed --prefix apps/api
```

The local database listens on `localhost:5432` and persists data in the `supportdesk_postgres_data` Docker volume. The credentials in `.env.example` are for local development only; change them before using any non-local environment. Stop the database with `docker compose down` (the named volume is retained). To remove the database and its data, use `docker compose down -v`.

The initial ticket-table migration is committed in `prisma/migrations`. For later schema changes, update `prisma/schema.prisma` and create/apply a migration with `npm run db:migrate --prefix apps/api -- --name describe_your_change`.

The schema models users, tickets, comments, tags, attachments, and audit logs. The design assumptions, relationships, and index choices are recorded in [`docs/database-design-notes.md`](docs/database-design-notes.md), and the matching ER diagram is in [`docs/supportdesk-erd.md`](docs/supportdesk-erd.md).

To prepare the 50 sample records, convert the checked-in CSV using the ticket importer, then apply the seed:

```powershell
npm run import --prefix apps/api -- fixtures/sample-tickets.csv fixtures/sample-tickets.json
npm run db:seed --prefix apps/api
```

The seed reads the generated JSON, creates missing sample requester accounts, and upserts stable sample ticket IDs. It is safe to rerun and keeps exactly 50 records with IDs beginning `SAMPLE-TKT-`.

Useful Prisma commands:

```powershell
npm run db:migrate --prefix apps/api -- --name describe_your_change
npm run db:deploy --prefix apps/api
npm run db:studio --prefix apps/api
```

## API authentication and ticket access

The API provides `POST /api/auth/register` and `POST /api/auth/login`. Registration stores a bcrypt password hash; login returns a bearer token. Set `JWT_SECRET` in the local `.env` to a unique, random value of at least 32 bytes before starting the API. `JWT_EXPIRES_IN` accepts a duration such as `1d` and cannot exceed 30 days.

Ticket routes require `Authorization: Bearer <token>`. Customers can list and retrieve only tickets linked to their user account and create tickets for their own account. Agents and admins can access all tickets; only agents and admins can update or delete tickets. Existing imported tickets with no verified requester link are not visible to customers.

`GET /api/tickets` supports pagination (`page`, `limit`, maximum 100), status, priority, assignee, text search, and allowlisted sorting. The `meta` envelope returns `page`, `limit`, `total`, and `totalPages`. Customers can create/list public comments only on their own tickets; agents and admins can create/list public and internal comments. Internal comments are never returned to customers.

The interactive OpenAPI documentation is served at `http://localhost:3000/docs`.

Helmet security headers are enabled. Browser requests are allowed only from origins listed in `CORS_ORIGINS`, a comma-separated list of exact origins; local development defaults to `http://localhost:5173`. Postman and other non-browser clients do not need a CORS origin. Login is limited to 10 attempts per client IP in a 15-minute window.

For example, in Postman register with `POST http://localhost:3000/api/auth/register`, then log in with `POST http://localhost:3000/api/auth/login`. Use the returned token via **Authorization → Bearer Token** when calling `http://localhost:3000/api/tickets`.

The [Day 10 authentication results](./postman/documents/day-10-auth-results.md) record expected and observed local API responses.

### Isolated integration tests

The integration test command only accepts a loopback PostgreSQL URL for the dedicated `supportdesk_test` database on port `5433`. Copy the example `TEST_DATABASE_URL`, start the separate compose profile, then run:

```powershell
docker compose --profile test up -d postgres-test
npm run test:integration --prefix apps/api
```

The integration test runner applies migrations to that database and cleans up only its own fixtures. It refuses to run against the development database.

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

The CSV must have these unique column names: `subject`, `requester_email`, and `description`. `priority` and `status` are optional. Priority can be `P1`, `P2`, `P3`, or `P4` (from highest to lowest urgency) and defaults to `P3`. Status can be `OPEN`, `IN_PROGRESS`, `WAITING_ON_CUSTOMER`, `RESOLVED`, or `CLOSED` and defaults to `OPEN`. Email, subject, and description values are required. Standard CSV quoted values may contain commas.

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