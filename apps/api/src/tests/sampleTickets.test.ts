import assert from "node:assert/strict";
import test from "node:test";
import { loadSampleTickets } from "../sampleTickets";

test("loads 50 distinct sample tickets converted from the CSV fixture", () => {
  const tickets = loadSampleTickets();

  assert.equal(tickets.length, 50);
  assert.equal(new Set(tickets.map(({ id }) => id)).size, 50);
  assert.equal(new Set(tickets.map(({ subject }) => subject)).size, 50);
  assert.ok(tickets.every(({ requesterEmail }) => requesterEmail.endsWith("@example.test")));
  assert.deepEqual(
    new Set(tickets.map(({ status }) => status)),
    new Set(["OPEN", "IN_PROGRESS", "WAITING_ON_CUSTOMER", "RESOLVED", "CLOSED"]),
  );
  assert.deepEqual(
    new Set(tickets.map(({ priority }) => priority)),
    new Set(["P1", "P2", "P3", "P4"]),
  );
});
