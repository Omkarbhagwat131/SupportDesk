# SupportDesk Tickets API — Method Reference

A comprehensive reference for all HTTP methods available on the SupportDesk Tickets API.

**Base URL:** `http://localhost:3000`

---

## Quick Reference

| Method | Endpoint | Description | Status Code |
|--------|----------|-------------|-------------|
| `GET` | `/api/tickets` | List visible tickets with filters and pagination | 200 OK |
| `GET` | `/api/tickets/:id` | Get a single ticket by ID | 200 OK |
| `GET` | `/api/tickets/:id/comments` | List comments visible to the caller | 200 OK |
| `POST` | `/api/tickets/:id/comments` | Create a public or internal comment | 201 Created |
| `POST` | `/api/tickets` | Create a new ticket | 201 Created |
| `PUT` | `/api/tickets/:id` | Update an existing ticket | 200 OK |
| `DELETE` | `/api/tickets/:id` | Delete a ticket | 200 OK |

---

## 1. ![GET](https://img.shields.io/badge/GET-61affe?style=flat-square) `/api/tickets` — List Tickets

**Description:** Returns a paginated list of tickets visible to the authenticated user. Customers see their own tickets; agents and admins see all tickets.

### Request Details

| Property | Value |
|----------|-------|
| **URL** | `http://localhost:3000/api/tickets` |
| **Method** | `GET` |
| **Headers** | `Authorization: Bearer <token>` |
| **Body** | *(none)* |

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

Example: `GET http://localhost:3000/api/tickets?page=1&limit=10&status=open&priority=P1&search=payment`

---

### 📸 Response Body (Live Capture)

> **Status:** `200 OK` — 10 tickets returned (first 3 shown below)

```json
{
  "data": [
    {
      "id": "SAMPLE-TKT-0002",
      "subject": "Invoice total looks incorrect - Northstar Labs",
      "requesterEmail": "alex.morgan@example.test",
      "priority": "P3",
      "status": "IN_PROGRESS",
      "createdAt": "2026-11-07T08:23:57.920Z",
      "updatedAt": "2026-11-13T15:57:06.365Z"
    },
    {
      "id": "SAMPLE-TKT-0004",
      "subject": "Update account contact - Northstar Labs",
      "requesterEmail": "alex.morgan@example.test",
      "priority": "P4",
      "status": "RESOLVED",
      "createdAt": "2026-11-07T08:23:57.920Z",
      "updatedAt": "2026-11-13T15:57:06.383Z"
    },
    {
      "id": "SAMPLE-TKT-0005",
      "subject": "Team cannot access service - Northstar Labs",
      "requesterEmail": "alex.morgan@example.test",
      "priority": "P1",
      "status": "CLOSED",
      "createdAt": "2026-11-07T08:23:57.920Z",
      "updatedAt": "2026-11-13T15:57:06.391Z"
    }
  ],
  "error": null,
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

> ℹ️ *Only the first 3 tickets on this page are shown above for readability.*

---

## 2. ![GET](https://img.shields.io/badge/GET-61affe?style=flat-square) `/api/tickets/:id` — Get Single Ticket

**Description:** Retrieves the full details of a single ticket by its unique ID. Returns all ticket fields including description, assignee, SLA due date, and category.

### Request Details

| Property | Value |
|----------|-------|
| **URL** | `http://localhost:3000/api/tickets/SAMPLE-TKT-0003` |
| **Method** | `GET` |
| **Headers** | `Content-Type: application/json` |
| **Path Variable** | `id` = `SAMPLE-TKT-0003` |
| **Body** | *(none)* |

---

### 📸 Response Body (Live Capture)

> **Status:** `200 OK`

```json
{
  "data": {
    "id": "SAMPLE-TKT-0003",
    "subject": "Dashboard loads slowly - Northstar Labs",
    "requesterEmail": "alex.morgan@example.test",
    "requesterId": "cmw65lfcc0000g8c6g8ra0av7",
    "assigneeId": null,
    "description": "The dashboard takes over thirty seconds to load.",
    "category": null,
    "priority": "P2",
    "status": "WAITING_ON_CUSTOMER",
    "slaDueAt": null,
    "createdAt": "2026-11-07T08:23:57.920Z",
    "updatedAt": "2026-11-13T15:57:06.373Z"
  },
  "error": null,
  "meta": {}
}
```

---

## 3. ![POST](https://img.shields.io/badge/POST-49cc90?style=flat-square) `/api/tickets` — Create a Ticket

**Description:** Creates a new support ticket. Requires a subject and requester email at minimum. Returns the full ticket object with a system-generated ID and timestamps.

### Request Details

| Property | Value |
|----------|-------|
| **URL** | `http://localhost:3000/api/tickets` |
| **Method** | `POST` |
| **Headers** | `Content-Type: application/json` |

### Request Body

```json
{
  "subject": "Cannot export report",
  "requesterEmail": "alice@example.com",
  "description": "The export button does nothing on the reports page.",
  "priority": "P2",
  "status": "OPEN"
}
```

---

### 📸 Response Body (Live Capture)

> **Status:** `201 Created`

```json
{
  "data": {
    "id": "cecb9cab-73fe-47f5-8bbb-47abf3e0f93c",
    "subject": "Cannot export report",
    "requesterEmail": "alice@example.com",
    "requesterId": null,
    "assigneeId": null,
    "description": "The export button does nothing on the reports page.",
    "category": null,
    "priority": "P2",
    "status": "OPEN",
    "slaDueAt": null,
    "createdAt": "2026-11-13T17:30:19.601Z",
    "updatedAt": "2026-11-13T17:30:19.601Z"
  },
  "error": null,
  "meta": {}
}
```

---

## 4. ![PUT](https://img.shields.io/badge/PUT-fca130?style=flat-square) `/api/tickets/:id` — Update a Ticket

**Description:** Updates one or more fields on an existing ticket. Only the fields provided in the request body are modified. Returns the full updated ticket object.

### Request Details

| Property | Value |
|----------|-------|
| **URL** | `http://localhost:3000/api/tickets/SAMPLE-TKT-0003` |
| **Method** | `PUT` |
| **Headers** | `Content-Type: application/json` |
| **Path Variable** | `id` = `SAMPLE-TKT-0003` |

### Request Body

```json
{
  "status": "IN_PROGRESS",
  "priority": "P1"
}
```

---

### 📸 Response Body (Live Capture)

> **Status:** `200 OK`

```json
{
  "data": {
    "id": "SAMPLE-TKT-0003",
    "subject": "Dashboard loads slowly - Northstar Labs",
    "requesterEmail": "alex.morgan@example.test",
    "requesterId": "cmw65lfcc0000g8c6g8ra0av7",
    "assigneeId": null,
    "description": "The dashboard takes over thirty seconds to load.",
    "category": null,
    "priority": "P1",
    "status": "IN_PROGRESS",
    "slaDueAt": null,
    "createdAt": "2026-11-07T08:23:57.920Z",
    "updatedAt": "2026-11-13T17:30:26.491Z"
  },
  "error": null,
  "meta": {}
}
```

---

## 5. ![DELETE](https://img.shields.io/badge/DELETE-f93e3e?style=flat-square) `/api/tickets/:id` — Delete a Ticket

**Description:** Permanently deletes a ticket by its ID. This action is irreversible. On success, the API returns a `200 OK` with a null data payload confirming the deletion.

### Request Details

| Property | Value |
|----------|-------|
| **URL** | `http://localhost:3000/api/tickets/cecb9cab-73fe-47f5-8bbb-47abf3e0f93c` |
| **Method** | `DELETE` |
| **Headers** | `Content-Type: application/json` |
| **Path Variable** | `id` = `cecb9cab-73fe-47f5-8bbb-47abf3e0f93c` |
| **Body** | *(none)* |

---

### 📸 Response Body (Live Capture)

> **Status:** `200 OK`

```json
{
  "data": null,
  "error": null,
  "meta": {}
}
```

---

## Ticket Comments

Both comment operations require a bearer token. Customers can list and create public comments only on their own tickets. Agents and admins can list and create public and internal comments on tickets available to staff. Comment authors are taken from the verified token; request bodies cannot specify `authorId`.

### List comments

```http
GET http://localhost:3000/api/tickets/SAMPLE-TKT-0001/comments
Authorization: Bearer <token>
```

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

`body` is required and must contain 1–10,000 characters after trimming. `isInternal` defaults to `false`; customers receive `403` if they request an internal comment. An absent or inaccessible ticket returns `404`.

---

## Error Responses

The API uses standard HTTP status codes to indicate errors. All error responses follow the same envelope structure with a non-null `error` field.

### 400 Bad Request

Returned when the request body is missing required fields or contains invalid values.

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Missing required field: subject"
  },
  "meta": {}
}
```

**Common causes:**
- Missing `subject` or `requesterEmail` on `POST /api/tickets`
- Invalid `priority` value (must be `P1`–`P4`)
- Invalid `status` value (see Ticket Statuses table below)

---

### 404 Not Found

Returned when the requested ticket ID does not exist in the system.

```json
{
  "data": null,
  "error": {
    "code": "NOT_FOUND",
    "message": "Ticket with id 'SAMPLE-TKT-9999' was not found"
  },
  "meta": {}
}
```

**Common causes:**
- Ticket ID was deleted or never existed
- Typo in the `:id` path variable

---

## Reference Tables

### Priority Levels

| Priority | Label | Description |
|----------|-------|-------------|
| `P1` | Critical | Service is completely down; immediate response required |
| `P2` | High | Major functionality impaired; significant business impact |
| `P3` | Medium | Partial degradation; workaround available |
| `P4` | Low | Minor issue or cosmetic bug; no business impact |

---

### Ticket Statuses

| Status | Description |
|--------|-------------|
| `OPEN` | Ticket has been submitted and is awaiting triage |
| `IN_PROGRESS` | An agent is actively working on the ticket |
| `WAITING_ON_CUSTOMER` | Ticket is blocked pending a response from the requester |
| `RESOLVED` | The issue has been resolved; awaiting requester confirmation |
| `CLOSED` | Ticket is fully closed and no further action is expected |
