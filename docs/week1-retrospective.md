# Week 1 Retrospective and Evidence

> Draft for review: edit the first-person reflections so they match your own experience.

## Retrospective

1. **What did I learn that I can apply immediately?**  
   I learned how to build a TypeScript command-line importer that parses CSV, validates ticket data, and outputs JSON. I can apply the same parse-validate-transform pattern to other data-import tasks.

2. **Which task took the most time, and why?**  
   The ticket importer required careful handling of CSV quoting, required fields, allowed values, defaults, and invalid input, rather than only converting rows.

3. **Where did the coding agent help me most?**  
   It helped implement the importer, add tests and fixtures, and document the commands for using it.

4. **Where did the agent make a wrong assumption or produce an unhelpful result?**  
   The original README described planned platform components as if they were implemented. It was revised to distinguish the working importer from placeholder areas.

5. **What did I personally verify rather than trust?**  
   I reviewed the README changes and verified that commits `c889b9d` and `3d93f1a` were on `feat/repository-setup` and synchronized with its GitHub remote. I then ran the relevant API commands and confirmed the results: `npm test --prefix apps/api` passed (`9` tests, `0` failed) and `npm run build --prefix apps/api` succeeded.

6. **What is one prompting habit I will continue?**  
   I will state the intended scope clearly and ask for a plan before approving changes when a request is ambiguous.

7. **What is one Git, testing, or code-review habit I need to improve?**  
   I will run the relevant tests and build before committing, review the final diff, and confirm whether a commit also needs to be pushed.

8. **What is my highest-priority unfinished task?**  
   Confirm and implement the next platform feature. The web, mobile, and other listed areas are still placeholders.

9. **What support or clarification do I need from my mentor?**  
   I need confirmation of the Week 1 acceptance criteria and which platform component should be built next.

10. **What is my plan for the next working session?**  
    Confirm the next feature with my mentor, review its requirements, implement it with focused tests, and update the documentation to reflect the working behavior.

## Supporting evidence

- [`apps/api/src/importTickets.ts`](../apps/api/src/importTickets.ts) contains the CSV parser, ticket validation, ID generation, and CLI entry point.
- [`apps/api/src/importTickets.test.ts`](../apps/api/src/importTickets.test.ts), [`apps/api/src/tests/csvToJson.test.ts`](../apps/api/src/tests/csvToJson.test.ts), and [`apps/api/src/tests/ticketId.test.ts`](../apps/api/src/tests/ticketId.test.ts) contain importer and ID tests.
- [`apps/api/fixtures/tickets.csv`](../apps/api/fixtures/tickets.csv) and [`apps/api/fixtures/tickets.json`](../apps/api/fixtures/tickets.json) provide sample input and output.
- [`README.md`](../README.md) documents how to run the importer and labels the other project areas as placeholders or planned areas.
- Commit `c889b9d` added the importer, tests, fixtures, and initial documentation. Commit `3d93f1a` clarified the README. Both were verified on `feat/repository-setup` synchronized with `origin/feat/repository-setup`.
- Verified commands for this report: `npm test --prefix apps/api` passed with `9` passing tests, and `npm run build --prefix apps/api` succeeded.
