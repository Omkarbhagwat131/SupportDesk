import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, test } from "node:test";
import bcrypt from "bcrypt";
import request from "supertest";
import { app } from "../app";
import { prisma } from "../config/database";
import { UserRole } from "../generated/prisma/client";

const marker = `workflow-${process.pid}-${randomUUID()}`;
const customerEmail = `${marker}-customer@example.test`;
const agentEmail = `${marker}-agent@example.test`;
const agentId = `${marker}-agent`;
const adminEmail = `${marker}-admin@example.test`;
const adminId = `${marker}-admin`;
const ticketIds: string[] = [];
let customerId: string | null = null;
let customerToken = "";
let agentToken = "";
let adminToken = "";

before(async () => {
  const agentPassword = "agent-password-123";
  await prisma.user.create({
    data: {
      id: agentId,
      name: "Workflow Test Agent",
      email: agentEmail,
      passwordHash: await bcrypt.hash(agentPassword, 12),
      role: UserRole.AGENT,
    },
  });
  await prisma.user.create({
    data: {
      id: adminId,
      name: "Workflow Test Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash("admin-password-123", 12),
      role: UserRole.ADMIN,
    },
  });

  const registration = await request(app)
    .post("/api/auth/register")
    .send({ name: "Workflow Test Customer", email: customerEmail, password: "customer-password-123" });
  assert.equal(registration.status, 201);
  customerId = registration.body.data.user.id;

  const customerLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: customerEmail, password: "customer-password-123" });
  assert.equal(customerLogin.status, 200);
  customerToken = customerLogin.body.data.token;

  const agentLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: agentEmail, password: agentPassword });
  assert.equal(agentLogin.status, 200);
  agentToken = agentLogin.body.data.token;

  const adminLogin = await request(app)
    .post("/api/auth/login")
    .send({ email: adminEmail, password: "admin-password-123" });
  assert.equal(adminLogin.status, 200);
  adminToken = adminLogin.body.data.token;
});

after(async () => {
  try {
    if (ticketIds.length > 0) {
      await prisma.comment.deleteMany({ where: { ticketId: { in: ticketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: ticketIds } } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: customerId ? [customerId, agentId, adminId] : [agentId, adminId] } },
    });
  } finally {
    await prisma.$disconnect();
  }
});

test("customer creates a ticket and an agent comments and updates its status", async () => {
  const agentCreate = await request(app)
    .post("/api/tickets")
    .set("Authorization", `Bearer ${agentToken}`)
    .send({
      subject: `${marker} agent-created`,
      requesterEmail: agentEmail,
      description: "Staff should not create customer tickets.",
    });
  assert.equal(agentCreate.status, 403);

  const created = await request(app)
    .post("/api/tickets")
    .set("Authorization", `Bearer ${customerToken}`)
    .send({
      subject: `${marker} cannot sign in`,
      requesterEmail: customerEmail,
      description: "The sign-in page does not accept my password.",
    });

  assert.equal(created.status, 201);
  const ticketId = created.body.data.id as string;
  ticketIds.push(ticketId);
  assert.equal(created.body.data.requesterId, customerId);

  const adminAgents = await request(app)
    .get("/api/users/agents")
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(adminAgents.status, 200);
  const listedAgent = adminAgents.body.data.find((entry: { id: string }) => entry.id === agentId);
  assert.ok(listedAgent);
  assert.equal(listedAgent.email, agentEmail);
  assert.equal("passwordHash" in listedAgent, false);

  const assigned = await request(app)
    .put(`/api/tickets/${ticketId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ assigneeId: agentId });
  assert.equal(assigned.status, 200);
  assert.equal(assigned.body.data.assigneeId, agentId);

  const agentReassign = await request(app)
    .put(`/api/tickets/${ticketId}`)
    .set("Authorization", `Bearer ${agentToken}`)
    .send({ assigneeId: null });
  assert.equal(agentReassign.status, 403);

  const adminCategory = await request(app)
    .put(`/api/tickets/${ticketId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ category: "account" });
  assert.equal(adminCategory.status, 200);
  assert.equal(adminCategory.body.data.category, "account");

  const adminComment = await request(app)
    .post(`/api/tickets/${ticketId}/comments`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ body: "Admin comments are disabled." });
  assert.equal(adminComment.status, 403);

  const adminReplySuggestion = await request(app)
    .post(`/api/tickets/${ticketId}/suggest-reply`)
    .set("Authorization", `Bearer ${adminToken}`);
  assert.equal(adminReplySuggestion.status, 403);

  const agentTickets = await request(app)
    .get("/api/tickets")
    .query({ search: marker })
    .set("Authorization", `Bearer ${agentToken}`);
  assert.equal(agentTickets.status, 200);
  assert.equal(agentTickets.body.meta.total, 1);
  assert.equal(agentTickets.body.data[0].id, ticketId);

  const customerStatusUpdate = await request(app)
    .put(`/api/tickets/${ticketId}`)
    .set("Authorization", `Bearer ${customerToken}`)
    .send({ status: "IN_PROGRESS" });
  assert.equal(customerStatusUpdate.status, 403);

  const publicComment = await request(app)
    .post(`/api/tickets/${ticketId}/comments`)
    .set("Authorization", `Bearer ${agentToken}`)
    .send({ body: "We are looking into this." });
  assert.equal(publicComment.status, 201);

  const internalComment = await request(app)
    .post(`/api/tickets/${ticketId}/comments`)
    .set("Authorization", `Bearer ${agentToken}`)
    .send({ body: "Check the account logs.", isInternal: true });
  assert.equal(internalComment.status, 201);

  const statusUpdate = await request(app)
    .put(`/api/tickets/${ticketId}`)
    .set("Authorization", `Bearer ${agentToken}`)
    .send({ status: "IN_PROGRESS" });
  assert.equal(statusUpdate.status, 200);
  assert.equal(statusUpdate.body.data.status, "IN_PROGRESS");

  const customerTicket = await request(app)
    .get(`/api/tickets/${ticketId}`)
    .set("Authorization", `Bearer ${customerToken}`);
  assert.equal(customerTicket.status, 200);
  assert.equal(customerTicket.body.data.status, "IN_PROGRESS");

  const customerComments = await request(app)
    .get(`/api/tickets/${ticketId}/comments`)
    .set("Authorization", `Bearer ${customerToken}`);
  assert.equal(customerComments.status, 200);
  assert.deepEqual(
    customerComments.body.data.map((comment: { body: string }) => comment.body),
    ["We are looking into this."],
  );

  const agentComments = await request(app)
    .get(`/api/tickets/${ticketId}/comments`)
    .set("Authorization", `Bearer ${agentToken}`);
  assert.equal(agentComments.status, 200);
  assert.equal(agentComments.body.data.length, 2);
});
