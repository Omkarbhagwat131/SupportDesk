import assert from "node:assert/strict";
import test from "node:test";
import { convertCsv, generateTicketId } from "./importTickets";

test("generates IDs in the documented format without duplicates in this run", () => {
  assert.match(generateTicketId(new Date("2026-01-15T00:00:00Z")), /^TKT-20260115-\d{6,}$/);
  const first = generateTicketId(new Date("2026-01-15T00:00:00Z"));
  const second = generateTicketId(new Date("2026-01-15T00:00:00Z"));
  assert.notEqual(first, second);
});

test("converts multiple rows and keeps values under the right headers", () => {
  const csv = [
    "status,description,requester_email,subject,priority",
    'OPEN,"Link, does not work",alex@example.test,"Sign-in help",HIGH',
    "RESOLVED,Update card,sam@example.test,Billing,LOW",
  ].join("\n");

  const result = convertCsv(csv, new Date("2026-01-15T00:00:00Z"));

  assert.equal(result.tickets.length, 2);
  assert.equal(result.tickets[0].subject, "Sign-in help");
  assert.equal(result.tickets[0].description, "Link, does not work");
  assert.equal(result.tickets[0].requesterEmail, "alex@example.test");
  assert.equal(result.tickets[0].priority, "HIGH");
  assert.equal(result.tickets[1].status, "RESOLVED");
});

test("rejects empty CSV and accepts headers without any ticket rows", () => {
  assert.throws(() => convertCsv(""), /CSV is empty/);
  assert.deepEqual(convertCsv("subject,requester_email,description"), { tickets: [] });
});

test("reports missing columns and invalid rows", () => {
  assert.throws(
    () => convertCsv("subject,requester_email\nExample,alex@example.test"),
    /Missing required column: "description"/,
  );
  assert.throws(
    () => convertCsv("subject,requester_email,description\nExample,wrong,Help"),
    /invalid requester_email/,
  );
  assert.throws(
    () => convertCsv("subject,requester_email,description\nExample,alex@example.test"),
    /Invalid CSV/,
  );
});

test("generates sequential ticket IDs in the documented format", () => {
  const date = new Date("2026-01-15T00:00:00Z");

  const first = generateTicketId(date);
  const second = generateTicketId(date);

  assert.match(first, /^TKT-20260115-\d{6,}$/);
  assert.match(second, /^TKT-20260115-\d{6,}$/);

  const firstNumber = Number(first.split("-")[2]);
  const secondNumber = Number(second.split("-")[2]);

  assert.equal(secondNumber, firstNumber + 1);
});