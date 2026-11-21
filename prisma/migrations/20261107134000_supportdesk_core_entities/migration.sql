-- Map the existing priority values while preserving all current tickets.
BEGIN;
CREATE TYPE "TicketPriority_new" AS ENUM ('P1', 'P2', 'P3', 'P4');
ALTER TABLE "tickets" ALTER COLUMN "priority" DROP DEFAULT;
ALTER TABLE "tickets"
    ALTER COLUMN "priority" TYPE "TicketPriority_new"
    USING (
        CASE "priority"::text
            WHEN 'URGENT' THEN 'P1'
            WHEN 'HIGH' THEN 'P2'
            WHEN 'MEDIUM' THEN 'P3'
            WHEN 'LOW' THEN 'P4'
        END
    )::"TicketPriority_new";
ALTER TYPE "TicketPriority" RENAME TO "TicketPriority_old";
ALTER TYPE "TicketPriority_new" RENAME TO "TicketPriority";
DROP TYPE "TicketPriority_old";
ALTER TABLE "tickets" ALTER COLUMN "priority" SET DEFAULT 'P3';
COMMIT;

-- Add the roadmap ticket states without rewriting existing status values.
ALTER TYPE "TicketStatus" ADD VALUE 'WAITING_ON_CUSTOMER';
ALTER TYPE "TicketStatus" ADD VALUE 'CLOSED';

-- Replace the former status-only index with the queue index.
DROP INDEX "tickets_status_createdAt_idx";

-- Add optional relationships so existing imported tickets remain intact.
ALTER TABLE "tickets"
    ADD COLUMN "assigneeId" TEXT,
    ADD COLUMN "category" TEXT,
    ADD COLUMN "requesterId" TEXT,
    ADD COLUMN "slaDueAt" TIMESTAMPTZ(3),
    ALTER COLUMN "priority" SET DEFAULT 'P3';

CREATE TYPE "UserRole" AS ENUM ('CUSTOMER', 'AGENT', 'ADMIN');
CREATE TYPE "AuditTargetType" AS ENUM ('USER', 'TICKET', 'COMMENT', 'TAG', 'ATTACHMENT');

CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'CUSTOMER',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ticket_tags" (
    "ticketId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "addedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_tags_pkey" PRIMARY KEY ("ticketId", "tagId")
);

CREATE TABLE "attachments" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "targetType" "AuditTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "comments_ticketId_createdAt_idx" ON "comments"("ticketId", "createdAt");
CREATE INDEX "comments_authorId_idx" ON "comments"("authorId");
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");
CREATE INDEX "ticket_tags_tagId_idx" ON "ticket_tags"("tagId");
CREATE UNIQUE INDEX "attachments_storageKey_key" ON "attachments"("storageKey");
CREATE INDEX "attachments_ticketId_idx" ON "attachments"("ticketId");
CREATE INDEX "audit_logs_targetType_targetId_idx" ON "audit_logs"("targetType", "targetId");
CREATE INDEX "audit_logs_actorId_createdAt_idx" ON "audit_logs"("actorId", "createdAt");
CREATE INDEX "tickets_requesterId_idx" ON "tickets"("requesterId");
CREATE INDEX "tickets_assigneeId_idx" ON "tickets"("assigneeId");
CREATE INDEX "tickets_status_priority_createdAt_idx" ON "tickets"("status", "priority", "createdAt");

ALTER TABLE "tickets"
    ADD CONSTRAINT "tickets_requesterId_fkey"
    FOREIGN KEY ("requesterId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "tickets"
    ADD CONSTRAINT "tickets_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "comments"
    ADD CONSTRAINT "comments_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "comments"
    ADD CONSTRAINT "comments_authorId_fkey"
    FOREIGN KEY ("authorId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ticket_tags"
    ADD CONSTRAINT "ticket_tags_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ticket_tags"
    ADD CONSTRAINT "ticket_tags_tagId_fkey"
    FOREIGN KEY ("tagId") REFERENCES "tags"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attachments"
    ADD CONSTRAINT "attachments_ticketId_fkey"
    FOREIGN KEY ("ticketId") REFERENCES "tickets"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_logs"
    ADD CONSTRAINT "audit_logs_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
