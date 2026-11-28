import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TicketPriority, TicketStatus } from "./generated/prisma/client";
import { loadSampleTickets, SampleTicket } from "./sampleTickets";

const validTicket: SampleTicket = {
  id: "TKT-20261107-000001",
  subject: "Cannot reset password",
  requesterEmail: "alex@example.test",
  description: "The reset email did not arrive.",
  priority: TicketPriority.P2,
  status: TicketStatus.OPEN,
  createdAt: "2026-11-07T08:23:57.920Z",
};

function writeSampleFile(value: unknown): { directory: string; path: string } {
  const directory = mkdtempSync(join(tmpdir(), "supportdesk-sample-tickets-"));
  const path = join(directory, "tickets.json");
  writeFileSync(path, JSON.stringify(value), "utf8");
  return { directory, path };
}

function withSampleFile(value: unknown, run: (path: string) => void): void {
  const { directory, path } = writeSampleFile(value);
  try {
    run(path);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function sampleSet(overrides: Partial<SampleTicket> = {}): { tickets: SampleTicket[] } {
  return {
    tickets: Array.from({ length: 50 }, (_, index) => ({
      ...validTicket,
      id: `TKT-20261107-${String(index + 1).padStart(6, "0")}`,
      subject: `Sample ticket ${index + 1}`,
      ...overrides,
    })),
  };
}

describe("loadSampleTickets", () => {
  it("loads the checked-in sample fixture with exactly 50 tickets", () => {
    const tickets = loadSampleTickets();

    expect(tickets).toHaveLength(50);
    expect(tickets[0]).toMatchObject({
      id: expect.stringMatching(/^TKT-\d{8}-\d{6,}$/),
      subject: expect.any(String),
      requesterEmail: expect.stringContaining("@"),
    });
  });

  it("loads a valid sample file from an explicit path", () => {
    withSampleFile(sampleSet(), (path) => {
      expect(loadSampleTickets(path)).toHaveLength(50);
    });
  });

  it("rejects malformed JSON", () => {
    const directory = mkdtempSync(join(tmpdir(), "supportdesk-sample-tickets-"));
    const path = join(directory, "tickets.json");
    writeFileSync(path, "{not json", "utf8");

    try {
      expect(() => loadSampleTickets(path)).toThrow(SyntaxError);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("rejects JSON without a tickets array", () => {
    withSampleFile({ tickets: "not-an-array" }, (path) => {
      expect(() => loadSampleTickets(path)).toThrow(
        "Sample ticket JSON must contain exactly 50 tickets.",
      );
    });
  });

  it("rejects a ticket list that does not contain exactly 50 entries", () => {
    withSampleFile({ tickets: [validTicket] }, (path) => {
      expect(() => loadSampleTickets(path)).toThrow(
        "Sample ticket JSON must contain exactly 50 tickets.",
      );
    });
  });

  it("rejects tickets with invalid IDs, fields, enum values, or timestamps", () => {
    const invalidTickets: Partial<SampleTicket>[] = [
      { id: "not-a-ticket-id" },
      { subject: "" },
      { requesterEmail: "not-an-email" },
      { description: "" },
      { priority: "URGENT" as TicketPriority },
      { status: "WAITING" as TicketStatus },
      { createdAt: "not-a-date" },
    ];

    for (const invalidTicket of invalidTickets) {
      withSampleFile(sampleSet(invalidTicket), (path) => {
        expect(() => loadSampleTickets(path)).toThrow(
          "Sample ticket JSON contains a ticket with invalid or missing fields.",
        );
      });
    }
  });

  it("rejects duplicate ticket IDs", () => {
    const duplicateTickets = sampleSet();
    duplicateTickets.tickets[1].id = duplicateTickets.tickets[0].id;

    withSampleFile(duplicateTickets, (path) => {
      expect(() => loadSampleTickets(path)).toThrow(
        "Sample ticket JSON contains duplicate ticket IDs.",
      );
    });
  });

  it("returns parsed tickets with typed priority, status, and timestamp fields", () => {
    withSampleFile(sampleSet(), (path) => {
      const [ticket] = loadSampleTickets(path);

      expect(ticket.priority).toBe(TicketPriority.P2);
      expect(ticket.status).toBe(TicketStatus.OPEN);
      expect(Date.parse(ticket.createdAt)).not.toBeNaN();
    });
  });
});
