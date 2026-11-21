# SupportDesk Database Design Notes

## Scope and source requirements

The Week 2 Day 2 roadmap supplied for this task is the available requirements source. No SupportDesk PRD was present in the repository when this design was prepared. The project lead approved proceeding from the roadmap and recording unresolved decisions as assumptions or open questions.

The schema keeps the existing `subject` and `requesterEmail` ticket fields to remain compatible with the CSV importer. `subject` serves as the ticket title. Existing sample tickets are preserved by the follow-up migration; no database reset is required.

## Entities and fields

| Entity | Important fields | Primary key | Notes |
|---|---|---|---|
| User | `name`, unique `email`, optional `passwordHash`, `role`, timestamps | `id` (CUID) | Role is `CUSTOMER`, `AGENT`, or `ADMIN`. `passwordHash` is nullable until authentication requirements are confirmed. |
| Ticket | `subject`, `description`, `requesterEmail`, optional `requesterId`, optional `assigneeId`, optional `category`, `status`, `priority`, optional `slaDueAt`, timestamps | `id` (importer-generated string) | Status and priority use the roadmap's values. `requesterEmail` remains for CSV compatibility; `requesterId` is optional for legacy imported records. |
| Comment | `ticketId`, `authorId`, `body`, `isInternal`, timestamps | `id` (CUID) | Each comment belongs to one ticket and has one author. |
| Tag | unique `name`, `createdAt` | `id` (CUID) | Tickets and tags use the explicit `TicketTag` join entity. |
| TicketTag | `ticketId`, `tagId`, `addedAt` | Composite (`ticketId`, `tagId`) | Prevents attaching the same tag to the same ticket twice. |
| Attachment | `ticketId`, `fileName`, unique `storageKey`, `createdAt` | `id` (CUID) | Stores a storage reference, not file contents. |
| AuditLog | optional `actorId`, `action`, `targetType`, `targetId`, optional `details`, `createdAt` | `id` (CUID) | `details` can record change data. The target is polymorphic, so `targetId` is not a foreign key. |

## Relationships and cardinality

- One user can request zero or many tickets; each ticket has zero or one linked requester in this migration. The requester relation is nullable to preserve existing tickets whose CSV records only contain an email. New seed records link their requester users.
- One user can be assigned zero or many tickets; each ticket has zero or one assignee.
- One ticket has zero or many comments; one user can author zero or many comments.
- Tickets and tags are many-to-many through `TicketTag`.
- One ticket has zero or many attachments.
- One user can act on zero or many audit records. An audit actor can be absent, for example after account removal.
- Audit targets are represented by `targetType` and `targetId` instead of a foreign key because one audit log can refer to several model types.

## Business rules from the roadmap

- User roles: `CUSTOMER`, `AGENT`, `ADMIN`.
- Ticket statuses: `OPEN`, `IN_PROGRESS`, `WAITING_ON_CUSTOMER`, `RESOLVED`, `CLOSED`.
- Ticket priorities: `P1`, `P2`, `P3`, `P4`, with `P1` treated as highest urgency for the CSV examples.
- Comments belong to a ticket and an author and record whether they are internal.
- Attachments store a file name and a storage reference.
- Audit logs record an actor when available, an action, a target, a timestamp, and optional details.

The application still needs to enforce role-specific behavior, such as ensuring an assignee is an agent or admin, and validating legal status transitions. Those rules are not enforced by the current relational schema.

### Day 11 comment access policy

The project lead approved these API rules: customers can create and list public comments only on tickets in their ownership scope; agents and admins can create and list both public and internal comments on tickets available to staff. Internal comments are never returned to customers. The API does not expose comment edit or delete operations.

## Design decisions and assumptions

- **Ticket subject:** Kept as `subject` rather than renamed to `title` because the existing CSV tool and stored data use that field. It represents the roadmap's ticket title.
- **Legacy requester data:** Keep `requesterEmail` and add a nullable `requesterId`; the migration does not fabricate user accounts for pre-existing ticket emails. The seed links its sample tickets to customer users. A later importer/API change can require and populate `requesterId` for all new records.
- **User passwords:** `passwordHash` is optional because the roadmap does not say whether all users authenticate with a local password. Never store plaintext passwords.
- **Category and SLA:** Category is nullable free text, and SLA due time is nullable. No category list or SLA calculation rules were supplied.
- **Delete behavior:** Deleting a ticket cascades to its comments, tag links, and attachments. Deleting a tag cascades only to its join rows. User deletion is restricted when the user authored comments; requester and assignee references become null. Audit actor references become null so audit records survive user deletion.
- **Audit target:** The target is a typed model name plus string ID, not a foreign key. This keeps audit entries when their target is deleted, but target existence must be checked by application code.
- **Seed safety:** The CSV importer generates dated IDs for JSON output. The seed maps row order to stable `SAMPLE-TKT-0001`–`SAMPLE-TKT-0050` IDs and upserts records, so reruns update the same sample tickets instead of adding duplicates.
- **Priority mapping for existing rows:** The data-preserving migration maps `URGENT`→`P1`, `HIGH`→`P2`, `MEDIUM`→`P3`, and `LOW`→`P4`.

## AI-proposed schema review

- **Accepted:** Separate User, Ticket, Comment, Tag, Attachment, and AuditLog models; explicit enums; foreign keys; and an explicit many-to-many join model.
- **Accepted with migration accommodations:** Requester/assignee links are nullable so existing imported ticket rows survive without inventing user records. The migration maps existing priority values before replacing the enum.
- **Accepted with assumptions:** `passwordHash`, category, and SLA are nullable because their requirements are not defined. Audit `details` is optional JSON to allow changed-field context without assuming one fixed payload shape.
- **Rejected for now:** Hard-coded category enum, required agent assignment, a complete identity/authentication design, and file storage metadata beyond the requested file name/reference. The roadmap/PRD does not define these rules.
- **Referential actions:** Ticket-owned content cascades on ticket deletion; user-authored comments prevent deleting the author; optional user references become null; audit entries remain.

## Index decisions

| Query/use case | Index | Why it helps | Trade-off / decision |
|---|---|---|---|
| Find tickets by their requester email (including legacy CSV records) | `Ticket.requesterEmail` | Supports existing importer/search behavior. | Kept while both email and requester relation coexist; may be removed after the importer uses requester IDs exclusively. |
| List tickets for a requester | `Ticket.requesterId` | Speeds lookups by the normalized user relation. | Adds write/storage cost; justified by the one-to-many requester relationship. |
| List tickets assigned to an agent | `Ticket.assigneeId` | Supports agent work queues and FK operations. | Adds write/storage cost; justified by assignment lookup. |
| List and order tickets in a priority queue | `(Ticket.status, Ticket.priority, Ticket.createdAt)` | Matches filtering by status/priority followed by chronological ordering. | Composite order should be revisited against actual query plans once API queries exist. |
| List comments on a ticket chronologically | `(Comment.ticketId, Comment.createdAt)` | Supports a ticket's conversation timeline. | Extra index maintenance on comment writes. |
| Find a user's authored comments / enforce author references | `Comment.authorId` | Supports author lookups and FK checks. | Retained for the relation; may be unnecessary if no author-based queries are added. |
| Find tickets using a tag | `TicketTag.tagId` | The composite primary key begins with `ticketId`, so it does not efficiently serve tag-first lookups. | One additional index for reverse traversal of the many-to-many relation. |
| List attachments for a ticket | `Attachment.ticketId` | Supports ticket attachment listing and FK checks. | Small per-row write/storage cost. |
| Inspect audit history for a target | `(AuditLog.targetType, AuditLog.targetId)` | Supports filtering by polymorphic target. | Audit writes maintain the index; target is intentionally not an FK. |
| Inspect an actor's audit history by time | `(AuditLog.actorId, AuditLog.createdAt)` | Supports user audit timelines. | Nullable actors are allowed; index cost is accepted for audit review. |
| Enforce unique user email, tag name, and storage key | Unique indexes on `User.email`, `Tag.name`, and `Attachment.storageKey` | Enforces identity/reference uniqueness and prevents duplicate storage references. | Email/tag comparison remains case-sensitive until normalization rules are confirmed. |
| Find rows by primary key / prevent duplicate ticket-tag pairs | Primary keys on each model and `TicketTag(ticketId, tagId)` | Primary keys provide built-in indexes; the composite key prevents duplicate links. | No extra duplicate indexes are added. |

No separate index was added to `Ticket.category` or `Ticket.slaDueAt`: the repository contains no confirmed category-filter or SLA-scheduler query yet.

## Open questions for the PRD/lead

1. Is a local password required for every user, or can customers/agents authenticate externally?
2. Is the ticket requester required for all newly created tickets? When can the legacy `requesterEmail` field be removed?
3. Which ticket categories are valid, and should they be an enum or managed table?
4. How are SLA deadlines calculated, paused, and changed?
5. Must assignees have the `AGENT` or `ADMIN` role, and may tickets be unassigned?
6. Which status transitions are allowed, and who can perform them?
7. Should comments be soft-deleted or retained?
8. What attachment type/size limits, MIME metadata, and storage lifecycle are required?
9. What audit retention rules and change-detail format are required?
10. Should email and tag uniqueness be case-insensitive?
11. Should users/tickets/tags be physically deleted, archived, or soft-deleted?
