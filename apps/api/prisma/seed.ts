import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "dotenv";
import { resolve } from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { loadSampleTickets } from "../src/sampleTickets";

config({ path: resolve(__dirname, "../../../.env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env before seeding.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main(): Promise<void> {
  const sampleTickets = loadSampleTickets();
  const requesterIds = new Map<string, string>();

  for (const requesterEmail of new Set(sampleTickets.map(({ requesterEmail }) => requesterEmail))) {
    const name = requesterEmail
      .split("@")[0]
      .split(/[._-]/)
      .filter(Boolean)
      .map((part) => part[0].toUpperCase() + part.slice(1))
      .join(" ");
    const requester = await prisma.user.upsert({
      where: { email: requesterEmail },
      create: { name, email: requesterEmail },
      update: {},
      select: { id: true },
    });
    requesterIds.set(requesterEmail, requester.id);
  }

  for (const [index, ticket] of sampleTickets.entries()) {
    const id = `SAMPLE-TKT-${String(index + 1).padStart(4, "0")}`;
    const requesterId = requesterIds.get(ticket.requesterEmail);
    if (!requesterId) {
      throw new Error(`Could not create or find sample requester ${ticket.requesterEmail}.`);
    }

    const data = {
      subject: ticket.subject,
      requesterEmail: ticket.requesterEmail,
      requesterId,
      description: ticket.description,
      priority: ticket.priority,
      status: ticket.status,
      createdAt: new Date(ticket.createdAt),
    };

    await prisma.ticket.upsert({
      where: { id },
      create: { id, ...data },
      update: data,
    });
  }

  const total = await prisma.ticket.count({
    where: { id: { startsWith: "SAMPLE-TKT-" } },
  });
  console.log(`Upserted ${sampleTickets.length} sample tickets; ${total} of 50 sample tickets are present.`);
}

main()
  .catch((error: unknown) => {
    console.error("Could not seed sample tickets:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
