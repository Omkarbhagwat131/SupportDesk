# Test Results and Manual Verification

Test commands, outcomes, and manual verification evidence are kept here separately from prompt history in [prompt-journal.md](./prompt-journal.md).

## Ticket ID / CSV CLI test attempt

Date not recorded in the journal.

- Command: `npx jest apps/api/src/tests/ticketId.test.ts apps/api/src/tests/csvToJson.test.ts`
- Recorded result: 2 suites executed, 0 passed, 2 failed; 0 tests passed and 0 tests completed successfully.
- This historical result has not been rerun as part of the Day 14 ticket-screen work.

## Week 2 Day 2 — database design

Recorded on 7 November 2026.

- Verification was pending: local migration application, an empty-database migration check, seed-count verification, tests, and build.
- No later result for these checks is recorded in this file.

## Week 2 Day 5 / Overall Day 11 — API comments

Recorded on 16 November 2026.

- `npm test`: passed; 33 existing Node tests and 18 Jest tests.
- `npm run test:coverage`: passed; service coverage 97.61% statements/lines, 91.66% functions, and 100% branches.
- `npm run build`: passed.
- `docker compose --profile test config --quiet`: passed.
- Browser check of `http://localhost:3107/docs/`: Swagger UI rendered with Health, Authentication, Tickets, Comments, and schemas.
- The comment service Jest tests were first run before implementation and failed with TypeScript `TS2307` because `comments.service.ts` did not exist. After implementation, they passed, including customer internal-comment denial, scoped list delegation, authenticated agent author identity, and missing-ticket propagation.
- At that time, `npm run test:integration` was not run because `TEST_DATABASE_URL` was not configured and Docker Desktop's PostgreSQL daemon was unavailable. A later integration result is recorded below.

## Week 2 Day 14 — ticket screens

### Automated checks

- Earlier web run: `npm --prefix apps/web test` passed with 7 test files and 15 tests.
- Latest web run after the UI-state feedback changes:
  - `npm --prefix apps/web test`: passed, 8 test files and 19 tests.
  - `npm --prefix apps/web run build`: passed (`tsc -b` and Vite production build).
  - `npm --prefix apps/web run lint`: passed.
- `npm run test:integration --prefix apps/api`: passed, 11 tests against the isolated `supportdesk_test` database, including customer ticket creation, agent visibility, public/internal comments, status update, and customer access restrictions.

### Manual browser checks

- Customer registration, login, ticket creation, and ticket detail navigation succeeded with temporary fictional accounts.
- Agent login and ticket visibility succeeded. The agent changed status from `OPEN` to `IN_PROGRESS` and added public and internal comments.
- After logging in as the customer, the ticket showed `IN_PROGRESS` and the public comment; the internal comment and staff-only status controls were not shown.
- The temporary ticket and accounts were removed after the workflow.
- A screenshot with status `Open` and priority `P2` selected showed “No tickets match your filters.”
- A later screenshot with status `Open` and priority `All priorities` showed one `Open` / `P3` ticket. The screenshots partially verify the status/priority filter UI and matching/no-match display.
- Screenshots did not show the URL or network details, so the API request was not independently confirmed. Sorting could not be evaluated with one returned ticket.

### Still unverified

- Pagination, sorting order with multiple results, and search/assignee filters.
- Initial loading and API-failure states manually forced in the browser.
- Browser console behavior.
- Project-lead approval of ticket status-transition rules.

The initial Day 14 smoke check was unable to connect to the local page; the later browser workflow above succeeded. Earlier results are retained as historical records and are not substitutes for the later checks.

## 23 November 2026 — Week 3 Day 3 (Day 15): UI quality

### Automated checks

- `npm test --prefix apps/web`: passed, 13 test files and 28 tests.
- `npm run build --prefix apps/web`: passed; `tsc -b` and Vite production build completed.
- `npm run lint --prefix apps/web`: passed.

### Implementation evidence

- Added typed reusable `Button`, `Input`, `Badge`, `Modal`, and `Table` components under `apps/web/src/components/ui/`.
- Migrated ticket filters, ticket table, ticket status/priority badges, ticket creation, comments, pagination, and layout logout to shared primitives.
- Preserved customer, agent, and admin controls; no backend authorization or API contract changed.
- Added narrow-screen table scrolling and modal, form, and table CSS; 360 px has intentional horizontal table scrolling inside the table region instead of page overflow.

### Manual and audit blockers

- The frontend development server rendered the ticket list and create-ticket form.
- The API was not running, so detail data, real ticket mutations, and API-backed manual workflows could not be verified.
- Lighthouse was not installed or configured in the existing project. No score is claimed. Two representative routes need a running API and a valid Lighthouse browser run before ≥90 acceptance evidence can be recorded.
- A screenshot/wireframe-assisted component exercise is documented in [prompt-journal.md](./prompt-journal.md); it used synthetic data and a text wireframe only.
