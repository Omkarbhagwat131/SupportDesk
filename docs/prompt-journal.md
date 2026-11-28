Date 26/10/2026
Task : access the github repo without origin remote
Exact prompt used:
                [1.CONTEXT]&#x20;
            access the github repo without origin remote

            [ 2. GOAL ]
            get access of repo without using (git remote add origin [https://github.com/username/repository.git](https://github.com/username/repository.git))
            use another syntax
            [3. CONSTRAINTS / GUARDRAILS]
            Access by  only terminal 
            [4. EXAMPLES]
            git clone.....
            [5. OUTPUT ]
            syntax with explanation
            [6. CHECKS]
            syntax explanation is in simple language&#x20;


Summary of the AI response:  1)Explanation in simple words
2) workflow digram also given with explanation
3) command with explanation
4) comparison table  in simple words

 What you changed or corrected and why:
   It give a expectet output so didnt change anything

How you verified the answer or result:
    i read the output and understand that it is correct or not;


Date: 7 November 2026
Task: Week 2 Day 2 — database design with AI

Prompt/context: Follow the supplied SupportDesk database-design checklist. Inspect the repository, use the roadmap entities and enum values, preserve the current local database and its 50 tickets, and document assumptions where the PRD is unavailable.

Summary of the AI response: The repository had no PRD, only a ticket-only schema and CSV importer. After the lead approved proceeding from the roadmap with assumptions documented, I expanded the schema to users, tickets, comments, tags, attachments, and audit logs; added design notes and an ERD; and prepared CSV-generated JSON for the idempotent seed.

What changed and why:
- Added model relationships, ticket lifecycle/priority enums, constraints, delete behavior, and query-backed indexes in `prisma/schema.prisma`.
- Added a follow-up migration that maps old priorities without deleting the 50 current tickets.
- Added `apps/api/fixtures/sample-tickets.csv` and generated its JSON with the existing CSV importer.
- Updated the seed to create sample requester users and upsert exactly 50 stable sample ticket IDs.
- Added `docs/database-design-notes.md` and `docs/supportdesk-erd.md`; open business decisions are called out because no PRD was present.

Test and verification outcomes are recorded separately in [test-results.md](./test-results.md).



    [1. CONTEXT]
I am working in the existing SupportDesk repository, which is a Node.js and TypeScript project. I need to build a beginner-friendly command-line interface (CLI) utility to process incoming customer support tickets from CSV files into JSON.

[2. GOAL]
Inspect the requirements and create a complete, step-by-step implementation plan for a TypeScript CLI that generates unique ticket IDs and converts CSV ticket records into JSON.
Summarize the requirements, list your assumptions, propose an implementation plan, identify likely files to change or create, and describe potential risks.

[3. CONSTRAINTS]
- DO NOT write any implementation code yet.
- Keep the plan beginner-friendly and easy to follow.
- Stay consistent with standard conventions in an existing Node.js/TypeScript repository.
- Avoid unnecessary complexity or heavy third-party libraries where standard Node/TypeScript utilities suffice.

[4. EXAMPLES]
- Input CSV row example: `Login button broken,alice@example.com,high,open`
- Expected generated Ticket ID format example: `SD-0001` (sequential) or `SD-2026-0001`
- Expected JSON output structure example:
  `{ "id": "SD-0001", "title": "Login button broken", "requester": "alice@example.com", "priority": "high", "status": "open" }`

[5. OUTPUT]
Organize your response into five clear sections using Markdown headings:
1. Requirements Summary
2. Assumptions (CSV headers, ID format, file input/output handling)
3. Step-by-Step Implementation Plan (broken into small phases so we can code one step at a time)
4. Likely Files to Change or Create
5. Risks & Edge Cases

[6. CHECKS]
Before finalizing your response, verify that:
- Zero lines of actual TypeScript implementation code are included.
- Every assumption about missing requirements (like malformed CSV rows or duplicate IDs) is explicitly stated.
- You pause at the end and wait for me to review and adjust the plan before implementing Step 1.










Prompt to try: “I need a TypeScript CLI in the SupportDesk repository that generates ticket IDs and converts CSV ticket records to JSON. Do not write code yet. Summarize the requirements, list assumptions, propose an implementation plan, identify likely files to change, and describe risks. Keep the plan beginner-friendly and consistent with the existing repository.”

Step 1: Inspect the Existing Repository
Step 2: Define the Ticket Structure
Step 3: Read and Parse the CSV
Step 4: Validate the Records
Step 5: Generate Ticket IDs
Step 6: Convert Records to JSON
Step 7: Save the JSON File
Step 8: Connect Everything to the CLI
Step 9: Test the Complete Workflow
Step 10: Document Usage

the plan is good thtswhy i didnt change anything


2.Before suggesting code, identify ambiguities in the ticket CLI task. Ask questions about ticket ID format, required CSV columns, empty files, malformed rows, validation, and expected output. Do not implement anything until I answer. Then summarize confirmed requirements and remaining assumptions.

Empty File
What should happen if the input CSV is empty?
- A. Show an error and stop.
- B. Treat it as an empty ticket list.
my answer:
A. Show an error and stop.

. Invalid Rows
If some rows are invalid, should the CLI skip those rows and continue processing valid rows?
My answer
Yes, skip invalid rows.


Final requirement :
#	Requirement	Confirmed Behavior
1	Ticket ID format	Use SD-0001, SD-0002, etc.
2	CSV columns	Support all columns in the input CSV.
3	Empty file	Display an error and stop processing.
4	Invalid values	Skip invalid values and continue processing valid data.
5	Validation	Validate all rules, including missing values, invalid ticket IDs, duplicate IDs, and invalid status or priority.
6	Output files	Export valid and invalid rows into separate CSV files.

3.Do not implement the feature yet. Propose Jest tests for ticket ID generation and CSV-to-JSON conversion. Include valid input, empty input, missing columns, malformed rows, invalid values, and repeated ID generation. For each test, state the input, expected result, and requirement being checked. Do not claim any test has run


Test Scenario:
1.Generate the first ticket ID
2.Generate sequential IDs
3.Generate repeated IDs
4Validate the ID format

Why It Matters:
1.Ensures the ID follows the required format.
2.Ensures IDs increase correctly.
3.Checks that generated IDs are unique.
4.Ensures IDs follow the SD-0001 pattern.

The command and its recorded result are kept separately in [test-results.md](./test-results.md).

## 16 November 2026 — Week 2 Day 5 (Overall Day 11)

**Prompt/context:** Continue the SupportDesk Day 11 roadmap. The ticket query design was confirmed with the project lead: keep `data` as an array, expose flat pagination metadata, and cap `limit` at 100. The lead also approved the comment policy: customers may create/list public comments only on their own tickets; agents/admins may create/list public and internal comments; no edit/delete endpoints.

**Summary of the AI response:** Added the remaining ticket-query route validation and metadata earlier in this session, then implemented comment create/list routes, scoped comment persistence, OpenAPI documentation at `/docs`, Jest service tests, and a separate Supertest integration suite configured for a dedicated local test database.

**What changed and why:**
- Added Zod comment validation with strict input fields so clients cannot supply an author ID.
- Added repository queries that first enforce ticket access, hide internal comments from customers, and select only safe author fields.
- Added service/controller/routes for customer-visible and staff-internal comments.
- Exported the Express app separately from the listener; added `/health`, Swagger UI at `/docs`, and `apps/api/openapi.json`.
- Added Jest service tests with repository doubles/mocks and coverage configuration.
- Added a Supertest integration suite, a preflight that only permits `localhost:5433/supportdesk_test`, and a separate Compose `test` profile/volume.
- Updated the API reference, README, and this journal.

Test-first history and verification outcomes are recorded separately in [test-results.md](./test-results.md).

## Week 2 Day 14 — Ticket screens

**Prompt/context:** Build the ticket list, detail, create, status-update, and comment experience in the existing React application. Follow the actual API schemas and permissions, use the existing TanStack Query setup, keep API calls out of presentational components, and support URL-backed list filters.

**Summary of the implementation:** Added a ticket creation page and detail page, linked tickets from the list, added staff-only status controls and internal-comment creation, and added public/internal comment rendering. List search, status, priority, assignee, sorting, and pagination are reflected in supported URL query parameters. The web form uses the API's canonical Zod schemas rather than maintaining copies.

**What changed and why:**
- Added ticket detail/create/comment API functions and TanStack Query hooks with query keys and mutation invalidation.
- Added React Hook Form validation, field-level server validation messages, loading/error states, and a creation confirmation on the new ticket's detail page.
- Kept customer internal comments hidden in the UI as well as relying on the API's role-scoped response; only agents/admins see status controls or the internal-note checkbox.
- Cleared the query cache on login and logout so ticket data from a previous user is not retained across account changes.
- Added responsive layout styles and focused ticket API/query-parameter tests.

Verification notes, test outputs, and manual browser evidence are kept separately in [test-results.md](./test-results.md).

## Week 3 — Day 2 (Day 14): Ticket Screens End to End

**Prompt:

## 23 November 2026 — Week 3 Day 3 (Day 15): UI Quality and Clean Code

**Prompt/context:** Improve the existing SupportDesk frontend by extracting reusable typed UI components, refactoring ticket screens, preserving role behavior and workflows, improving narrow-screen usability, and documenting verification evidence. The lead did not approve adding Tailwind or a component library.

**Project-safe exercise input:** A text wireframe for a ticket status badge was used rather than a customer-data screenshot: a compact pill with status text, status variant, and sufficient text contrast. The supplied prompt requested inspection of the existing React/TypeScript patterns and no new API fields or business behavior.

**Summary of the AI output:** Proposed one `Badge` component with status and priority variants, plus separate shared `Button`, `Input`, `Modal`, and `Table` primitives and focused tests.

**What the AI got wrong initially:** It proposed generic class names and a status mapping that would not match the existing CSS contract. It also suggested browser-DOM testing despite the project's node-based Vitest setup.

**What changed and why:** Implemented project-local primitives in `apps/web/src/components/ui/` and reused existing ticket status/priority values and CSS conventions. Static server rendering tests match the current Vitest environment. `Modal` uses the native `<dialog>` API for focus containment and Escape handling. It was not inserted into a nonexistent destructive-action workflow, because that would invent UI/business behavior.

**Verification:** The frontend test suite passed 28 tests across 13 files, lint passed, and the production build passed. The API was unavailable during browser verification, and Lighthouse CLI evidence could not be obtained because no Lighthouse configuration or audit run was available in the existing project; this remains a blocker rather than a claimed score.

**Final verification update:** The API and development database were started, migrations/seed completed, and a synthetic customer created and tested a ticket/comment workflow. Lighthouse accessibility audits of login and register passed with scores of 95 and 100. The API integration suite passed 11 of 11 tests. Final verification was not blocked by missing infrastructure.

## 27 November 2026 — Day 17: AI Guardrails and Evaluation

**Prompt/context:** Review the Day 17 AI safety checklist, complete the manual fallback behavior, and produce reproducible categorization-evaluation evidence without using customer data.

**Summary:** AI failures in reply drafting and categorization now instruct staff to continue manually; incomplete reply drafts are discarded. The categorization evaluator spaces provider calls and retries transient HTTP 429 responses. A synthetic, balanced 20-ticket dataset was prepared and evaluated against Gemini.

**Evaluation result:** `gemini-3.5-flash-lite` categorized 19 of 20 synthetic cases correctly (95%). The only mismatch was a procurement request for an accessibility statement, expected `other`, predicted `product`. The CSV and machine-readable report are in `apps/api/fixtures/`.

**Limitations:** The synthetic dataset is not the lead's labelled ticket set. The lead's original ten malicious samples were not available; live testing was performed on the repository's ten illustrative cases instead. The user separately reported a 20/20 manual agent-UI check; that observation has not been independently reproduced or attached as evidence.

**Live prompt check:** All ten repository-authored illustrative injection probes passed live categorization/reply checks on `gemini-3.5-flash-lite`. The report records metadata and heuristic flags but not raw reply text. It is not a substitute for the lead's original cases or a formal guarantee.

**Verification:** Full API tests passed (38 Node tests and 69 Jest tests), API build passed, frontend tests passed (34 tests), frontend build passed, and frontend lint passed. The targeted categorization-evaluator tests also passed (4 tests).

## 28 November 2026 — Week 1: Debugging and Code-Generation Prompts

These prompts are templates. Replace bracketed text with the relevant code, behavior, or test output, and do not include credentials or real customer data.

1. **Debug a failing test:** “In this TypeScript/Jest project, inspect the failing test and the relevant implementation. Explain the most likely root cause using evidence from the code. Suggest the smallest fix, add a regression test for the failure, and run the focused test command. Do not change unrelated behavior. Failure output: [paste sanitized output].”
2. **Trace an unexpected result:** “Expected [expected behavior], but observed [actual behavior]. Trace the relevant code path and identify where the values or control flow diverge. Show the evidence, propose a minimal fix, and list the command I should run to verify it. Ask me before making a change if the evidence is inconclusive.”
3. **Generate a focused feature:** “Implement [specific feature] in this existing TypeScript project. First inspect nearby code and follow its established patterns. Requirements: [acceptance criteria]. Constraints: [compatibility, dependencies, and scope]. Add focused Jest tests for expected behavior and important edge cases, then run them.”
4. **Generate edge-case tests:** “Write Jest tests for [function/module] based on its current implementation and these requirements: [requirements]. Cover normal, boundary, and invalid inputs. Do not modify production code. For each test, use a clear behavior-based name and assert observable results rather than implementation details.”
5. **Generate a safe refactor:** “Refactor [specific code] to improve [one clearly stated concern] while preserving its existing public behavior. Inspect callers and tests first. Avoid new dependencies and unrelated edits. Add or update focused Jest tests, run the relevant tests and TypeScript build, and summarize any behavior that could not be verified.”

**Verification:** The five templates were reviewed for clear context, specific goals, guardrails, and testable outcomes. Replace placeholders with sanitized project-specific details before use.
