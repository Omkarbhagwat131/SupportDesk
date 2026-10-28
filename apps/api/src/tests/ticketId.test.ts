import assert from "node:assert/strict";
import test from "node:test";
import { generateTicketId } from "../importTickets";

test("ticket IDs include the date and a sequential number", () => {
  const date = new Date("2026-01-15T00:00:00Z");
  const first = generateTicketId(date);
  const second = generateTicketId(date);

  assert.match(first, /^TKT-20260115-\d{6,}$/);
  assert.match(second, /^TKT-20260115-\d{6,}$/);
  assert.notEqual(first, second);
  assert.equal(Number(second.split("-")[2]), Number(first.split("-")[2]) + 1);
});