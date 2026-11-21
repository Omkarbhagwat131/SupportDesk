import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import jwt from "jsonwebtoken";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../config/database";
import { UserRole } from "../generated/prisma/client";
import { JWT_AUDIENCE, JWT_ISSUER } from "../middlewares/require-auth";

function getJwtSecret(): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("The integration test runner must provide JWT_SECRET.");
  return jwtSecret;
}

const marker = `day11-${process.pid}-${Date.now()}`;
const customerId = `${marker}-customer`;
const otherCustomerId = `${marker}-other`;
const agentId = `${marker}-agent`;
const firstTicketId = `${marker}-ticket-1`;
const secondTicketId = `${marker}-ticket-2`;
const otherTicketId = `${marker}-ticket-other`;
const userIds = [customerId, otherCustomerId, agentId];
const ticketIds = [firstTicketId, secondTicketId, otherTicketId];

function tokenFor(userId: string): string {
  return jwt.sign({ sub: userId }, getJwtSecret(), {
    algorithm: "HS256",
    expiresIn: "1h",
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

const customerToken = tokenFor(customerId);
const agentToken = tokenFor(agentId);

before(async () => {
  await prisma.user.createMany({
    data: [
      { id: customerId, name: "Test Customer", email: `${customerId}@example.test`, role: UserRole.CUSTOMER },
      { id: otherCustomerId, name: "Other Customer", email: `${otherCustomerId}@example.test`, role: UserRole.CUSTOMER },
      { id: agentId, name: "Test Agent", email: `${agentId}@example.test`, role: UserRole.AGENT },
    ],
  });
  await prisma.ticket.createMany({
    data: [
      {
        id: firstTicketId,
        subject: `${marker} older payment`,
        requesterEmail: `${customerId}@example.test`,
        requesterId: customerId,
        assigneeId: agentId,
        description: "Older matching customer ticket",
        priority: "P1",
        status: "OPEN",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: secondTicketId,
        subject: `${marker} newer payment`,
        requesterEmail: `${customerId}@example.test`,
        requesterId: customerId,
        assigneeId: agentId,
        description: "Newer matching customer ticket",
        priority: "P1",
        status: "OPEN",
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      {
        id: otherTicketId,
        subject: `${marker} other payment`,
        requesterEmail: `${otherCustomerId}@example.test`,
        requesterId: otherCustomerId,
        assigneeId: agentId,
        description: "Other customer's matching ticket",
        priority: "P1",
        status: "OPEN",
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
      },
    ],
  });
  await prisma.comment.createMany({
    data: [
      { ticketId: firstTicketId, authorId: customerId, body: "Public reply", isInternal: false },
      { ticketId: firstTicketId, authorId: agentId, body: "Private note", isInternal: true },
    ],
  });
});

after(async () => {
  try {
    await prisma.comment.deleteMany({ where: { ticketId: { in: ticketIds } } });
    await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  } finally {
    await prisma.$disconnect();
  }
});

test("health and interactive API documentation are served publicly", async () => {
  const health = await request(app).get("/health");
  assert.equal(health.status, 200);
  assert.deepEqual(health.body.data, { status: "ok" });

  const docs = await request(app).get("/docs/");
  assert.equal(docs.status, 200);
  assert.match(docs.text, /Swagger UI/);
});

test("ticket query pagination and customer scope agree with metadata totals", async () => {
  const response = await request(app)
    .get("/api/tickets")
    .query({
      page: 1,
      limit: 1,
      status: "open",
      priority: "P1",
      assigneeId: agentId,
      search: marker,
      sortBy: "createdAt",
      sortOrder: "desc",
    })
    .set("Authorization", `Bearer ${customerToken}`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.map((ticket: { id: string }) => ticket.id), [secondTicketId]);
  assert.deepEqual(response.body.meta, { page: 1, limit: 1, total: 2, totalPages: 2 });
});

test("invalid ticket query values return the standard validation response", async () => {
  const response = await request(app)
    .get("/api/tickets")
    .query({ limit: 101 })
    .set("Authorization", `Bearer ${customerToken}`);

  assert.equal(response.status, 400);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("agents can see all matching tickets while customers cannot read another customer's ticket", async () => {
  const agentResponse = await request(app)
    .get("/api/tickets")
    .query({ search: marker, limit: 10 })
    .set("Authorization", `Bearer ${agentToken}`);
  assert.equal(agentResponse.status, 200);
  assert.equal(agentResponse.body.meta.total, 3);

  const customerResponse = await request(app)
    .get(`/api/tickets/${otherTicketId}`)
    .set("Authorization", `Bearer ${customerToken}`);
  assert.equal(customerResponse.status, 404);
});

test("comment routes require authentication", async () => {
  const response = await request(app).get(`/api/tickets/${firstTicketId}/comments`);
  assert.equal(response.status, 401);
});

test("customers see only public comments and safe author fields on their tickets", async () => {
  const response = await request(app)
    .get(`/api/tickets/${firstTicketId}/comments`)
    .set("Authorization", `Bearer ${customerToken}`);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.map((comment: { body: string }) => comment.body), ["Public reply"]);
  assert.deepEqual(response.body.data[0].author, { id: customerId, name: "Test Customer" });
  assert.equal("authorId" in response.body.data[0], false);
  assert.equal("email" in response.body.data[0].author, false);
});

test("customers can create public comments only on their own tickets", async () => {
  const created = await request(app)
    .post(`/api/tickets/${firstTicketId}/comments`)
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ body: "  Customer reply  " });

  assert.equal(created.status, 201);
  assert.equal(created.body.data.body, "Customer reply");
  assert.equal(created.body.data.author.id, customerId);
  assert.equal(created.body.data.isInternal, false);

  const internal = await request(app)
    .post(`/api/tickets/${firstTicketId}/comments`)
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ body: "Not for customers", isInternal: true });
  assert.equal(internal.status, 403);

  const crossCustomer = await request(app)
    .post(`/api/tickets/${otherTicketId}/comments`)
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ body: "Must not be added" });
  assert.equal(crossCustomer.status, 404);
});

test("agents may create and read internal comments", async () => {
  const created = await request(app)
    .post(`/api/tickets/${otherTicketId}/comments`)
    .set("Authorization", `Bearer ${agentToken}`)
    .send({ body: "Agent-only note", isInternal: true });
  assert.equal(created.status, 201);
  assert.equal(created.body.data.author.id, agentId);
  assert.equal(created.body.data.isInternal, true);

  const listed = await request(app)
    .get(`/api/tickets/${otherTicketId}/comments`)
    .set("Authorization", `Bearer ${agentToken}`);
  assert.equal(listed.status, 200);
  assert.equal(listed.body.data[0].body, "Agent-only note");
});

test("comment endpoints reject invalid data and conceal missing or inaccessible tickets", async () => {
  const empty = await request(app)
    .post(`/api/tickets/${firstTicketId}/comments`)
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ body: "   " });
  assert.equal(empty.status, 400);

  const forgedAuthor = await request(app)
    .post(`/api/tickets/${firstTicketId}/comments`)
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ body: "Reply", authorId: otherCustomerId });
  assert.equal(forgedAuthor.status, 400);

  const missing = await request(app)
    .post(`/api/tickets/${marker}-missing/comments`)
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ body: "Reply" });
  assert.equal(missing.status, 404);

  const inaccessible = await request(app)
    .get(`/api/tickets/${otherTicketId}/comments`)
    .set("Authorization", `Bearer ${customerToken}`);
  assert.equal(inaccessible.status, 404);
});
