# SupportDesk Entity Relationship Diagram

This diagram matches the current Prisma schema. The nullable ticket requester/assignee links preserve legacy imported tickets; see [database design notes](./database-design-notes.md) for assumptions and deletion behavior.

```mermaid
erDiagram
    USER o|--o{ TICKET : requests
    USER o|--o{ TICKET : assigned_to
    USER ||--o{ COMMENT : authors
    TICKET ||--o{ COMMENT : has
    TICKET ||--o{ TICKET_TAG : categorized_by
    TAG ||--o{ TICKET_TAG : labels
    TICKET ||--o{ ATTACHMENT : includes
    USER o|--o{ AUDIT_LOG : performs

    USER {
        string id PK
        string name
        string email UK
        string passwordHash "nullable"
        enum role
        datetime createdAt
        datetime updatedAt
    }

    TICKET {
        string id PK
        string subject
        string requesterEmail
        string requesterId FK "nullable"
        string assigneeId FK "nullable"
        string description
        string category "nullable"
        enum priority
        enum status
        datetime slaDueAt "nullable"
        datetime createdAt
        datetime updatedAt
    }

    COMMENT {
        string id PK
        string ticketId FK
        string authorId FK
        string body
        boolean isInternal
        datetime createdAt
        datetime updatedAt
    }

    TAG {
        string id PK
        string name UK
        datetime createdAt
    }

    TICKET_TAG {
        string ticketId PK, FK
        string tagId PK, FK
        datetime addedAt
    }

    ATTACHMENT {
        string id PK
        string ticketId FK
        string fileName
        string storageKey UK
        datetime createdAt
    }

    AUDIT_LOG {
        string id PK
        string actorId FK "nullable"
        string action
        enum targetType
        string targetId
        json details "nullable"
        datetime createdAt
    }
```

`AUDIT_LOG.targetId` is intentionally not a foreign key because the target may be a ticket, user, comment, tag, or attachment; audit records should also remain after a target is removed.
