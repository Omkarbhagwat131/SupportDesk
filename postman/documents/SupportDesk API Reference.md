# SupportDesk API Reference

Base URL: `http://localhost:3000`

All ticket endpoints are available under `/api/tickets`.

---

## 1. List Tickets

Retrieve a page of tickets visible to the authenticated user. Customers only see their own tickets; agents and admins can see all tickets.

**Method:** `GET`  
**Endpoint:** `/api/tickets`

### Example Request
```
GET http://localhost:3000/api/tickets?page=1&limit=10&status=open&priority=P1&assigneeId=user-123&search=payment&sortBy=createdAt&sortOrder=desc
Authorization: Bearer <token>
```

### Query Parameters

| Parameter | Default | Description |
|---|---:|---|
| `page` | `1` | 1-based page number |
| `limit` | `10` | Results per page; maximum `100` |
| `status` | — | Ticket status (`OPEN`, `IN_PROGRESS`, `WAITING_ON_CUSTOMER`, `RESOLVED`, `CLOSED`); case-insensitive |
| `priority` | — | Ticket priority (`P1`–`P4`) |
| `assigneeId` | — | Filter by assignee user ID |
| `search` | — | Case-insensitive search in subject, description, and requester email |
| `sortBy` | `createdAt` | One of `createdAt`, `updatedAt`, `status`, `priority`, `subject` |
| `sortOrder` | `desc` | `asc` or `desc` |

### Example Response
```json
{
  "data": [
    {
      "id": "SAMPLE-TKT-0001",
      "subject": "Login page not loading",
      "requesterEmail": "user@example.com",
      "priority": "P1",
      "status": "OPEN"
    }
  ],
  "error": null,
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42,
    "totalPages": 5
  }
}
```

---

## 2. Get a Single Ticket

Retrieve details of a specific ticket by its ID. Customers can retrieve only their own tickets; agents and admins can retrieve any ticket.

**Method:** `GET`  
**Endpoint:** `/api/tickets/:id`

### Example Request
```
GET http://localhost:3000/api/tickets/SAMPLE-TKT-0001
Authorization: Bearer <token>
```

### Example Response
```json
{
  "data": {
    "id": "SAMPLE-TKT-0001",
    "subject": "Login page not loading",
    "requesterEmail": "user@example.com",
    "description": "The login page returns a 500 error on submit.",
    "priority": "P1",
    "status": "OPEN"
  },
  "error": null,
  "meta": {}
}
```

### Error Response (404)
```json
{
  "data": null,
  "error": { "code": "NOT_FOUND", "message": "Ticket not found." },
  "meta": {}
}
```

---

## 3. Ticket Comments

Comments use the ticket access scope and require a bearer token.

### List comments

```http
GET http://localhost:3000/api/tickets/SAMPLE-TKT-0001/comments
Authorization: Bearer <token>
```

Customers receive public comments on their own tickets. Agents and admins receive public and internal comments on any ticket.

### Create a comment

```http
POST http://localhost:3000/api/tickets/SAMPLE-TKT-0001/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "body": "I can reproduce the issue.",
  "isInternal": false
}
```

The author is derived from the bearer token; `authorId` is not accepted from the request. Customers may create public comments on their own tickets only. Agents and admins may also create internal comments.

---

## 4. Create a Ticket

Create a new support ticket.

**Method:** `POST`  
**Endpoint:** `/api/tickets`  
**Content-Type:** `application/json`

### Request Body

| Field            | Type   | Required | Notes                                          |
|------------------|--------|----------|------------------------------------------------|
| `subject`        | string | ✅       | Non-empty string                               |
| `requesterEmail` | string | ✅       | Valid email address                            |
| `description`    | string | ✅       | Non-empty string                               |
| `priority`       | string | ❌       | One of: `P1`, `P2`, `P3`, `P4`                |
| `status`         | string | ❌       | One of: `OPEN`, `IN_PROGRESS`, `WAITING_ON_CUSTOMER`, `RESOLVED`, `CLOSED` |

### Example Request
```
POST http://localhost:3000/api/tickets
Content-Type: application/json

{
  "subject": "Cannot export report",
  "requesterEmail": "alice@example.com",
  "description": "The export button does nothing on the reports page.",
  "priority": "P2",
  "status": "OPEN"
}
```

### Example Response (201 Created)
```json
{
  "id": "TKT-20241110-001",
  "subject": "Cannot export report",
  "requesterEmail": "alice@example.com",
  "description": "The export button does nothing on the reports page.",
  "priority": "P2",
  "status": "OPEN"
}
```

---

## 4. Update a Ticket

Update one or more fields of an existing ticket. At least one field must be provided.

**Method:** `PUT`  
**Endpoint:** `/api/tickets/:id`  
**Content-Type:** `application/json`

### Request Body (all fields optional, but at least one required)

| Field            | Type   | Notes                                          |
|------------------|--------|------------------------------------------------|
| `subject`        | string | Non-empty string                               |
| `requesterEmail` | string | Valid email address                            |
| `description`    | string | Non-empty string                               |
| `priority`       | string | One of: `P1`, `P2`, `P3`, `P4`                |
| `status`         | string | One of: `OPEN`, `IN_PROGRESS`, `WAITING_ON_CUSTOMER`, `RESOLVED`, `CLOSED` |

### Example Request
```
PUT http://localhost:3000/api/tickets/SAMPLE-TKT-0001
Content-Type: application/json

{
  "status": "IN_PROGRESS",
  "priority": "P2"
}
```

### Example Response (200 OK)
```json
{
  "id": "SAMPLE-TKT-0001",
  "subject": "Login page not loading",
  "requesterEmail": "user@example.com",
  "description": "The login page returns a 500 error on submit.",
  "priority": "P2",
  "status": "IN_PROGRESS"
}
```

### Error Responses
- `400` — `{ "error": "Invalid ticket data." }` — no fields provided or validation failed
- `404` — `{ "error": "Ticket not found." }`

---

## 5. Delete a Ticket

Permanently delete a ticket by its ID.

**Method:** `DELETE`  
**Endpoint:** `/api/tickets/:id`

### Example Request
```
DELETE http://localhost:3000/api/tickets/SAMPLE-TKT-0003
```

### Example Response
- **204 No Content** — ticket deleted successfully (no response body)

### Error Response (404)
```json
{ "error": "Ticket not found." }
```

---

## Priority Levels

| Value | Meaning  |
|-------|----------|
| `P1`  | Critical |
| `P2`  | High     |
| `P3`  | Medium   |
| `P4`  | Low      |

## Ticket Statuses

| Value                  | Meaning                        |
|------------------------|--------------------------------|
| `OPEN`                 | Newly created, not yet picked up |
| `IN_PROGRESS`          | Actively being worked on       |
| `WAITING_ON_CUSTOMER`  | Awaiting customer response     |
| `RESOLVED`             | Issue resolved                 |
| `CLOSED`               | Ticket closed                  |
