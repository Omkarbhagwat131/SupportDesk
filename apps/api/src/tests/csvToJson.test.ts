import assert from "node:assert/strict";
import test from "node:test";
import { convertCsv } from "../importTickets";

test("converts headers into JSON properties and preserves quoted commas", () => {
  const csv = [
    "description,subject,requester_email",
    '"The link, when opened, returns an error.","Sign-in help",alex@example.test',
  ].join("\n");

  const result = convertCsv(csv, new Date("2026-01-15T00:00:00Z"));

  assert.deepEqual(result, {
    tickets: [
      {
        id: result.tickets[0].id,
        subject: "Sign-in help",
        requesterEmail: "alex@example.test",
        description: "The link, when opened, returns an error.",
        priority: "MEDIUM",
        status: "OPEN",
        createdAt: "2026-01-15T00:00:00.000Z",
      },
    ],
  });
});

test("rejects unknown columns and rows with missing required values", () => {
  assert.throws(
    () => convertCsv("subject,requester_email,description,other\nExample,a@example.test,Help,x"),
    /Unknown or empty column name/,
  );
  assert.throws(
    () => convertCsv("subject,requester_email,description\n,a@example.test,Help"),
    /Row 2 is missing a required value/,
  );
});

test("rejects malformed CSV instead of importing partial data", () => {
  assert.throws(
    () => convertCsv('subject,requester_email,description\n"Unclosed,a@example.test,Help'),
    /Invalid CSV/,
  );
});