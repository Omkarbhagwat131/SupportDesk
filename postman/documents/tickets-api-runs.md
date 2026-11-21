# SupportDesk — Tickets API: Successful Request Runs

> **Base URL:** `http://localhost:3000`  
> **Run date:** 2026-11-10  
> All five CRUD operations completed successfully against the live local server.

---

## GET /api/tickets — List All Tickets

**Request**
```
GET http://localhost:3000/api/tickets
```

**Response — `200 OK`**
```json
[
  {
    "id": "SAMPLE-TKT-0001",
    "subject": "Cannot reset password - Northstar Labs",
    "requesterEmail": "alex.morgan@example.test",
    "requesterId": "cmw65lfcc0000g8c6g8ra0av7",
    "assigneeId": null,
    "description": "Password reset email did not arrive after two attempts.",
    "category": null,
    "priority": "P2",
    "status": "OPEN",
    "slaDueAt": null,
    "createdAt": "2026-11-07T08:23:57.920Z",
    "updatedAt": "2026-11-07T08:40:39.818Z"
  },
  {
    "id": "SAMPLE-TKT-0002",
    "subject": "Invoice total looks incorrect - Northstar Labs",
    "requesterEmail": "alex.morgan@example.test",
    "requesterId": "cmw65lfcc0000g8c6g8ra0av7",
    "assigneeId": null,
    "description": "The latest invoice total differs from the expected plan charge.",
    "category": null,
    "priority": "P3",
    "status": "IN_PROGRESS",
    "slaDueAt": null,
    "createdAt": "2026-11-07T08:23:57.920Z",
    "updatedAt": "2026-11-07T08:40:39.837Z"
  }
  // ... 48 more tickets returned (100-ticket limit)
]
```

---

## GET /api/tickets/:id — Get Single Ticket

**Request**
```
GET http://localhost:3000/api/tickets/SAMPLE-TKT-0001
```

**Response — `200 OK`**
```json
{
  "id": "SAMPLE-TKT-0001",
  "subject": "Cannot reset password - Northstar Labs",
  "requesterEmail": "alex.morgan@example.test",
  "requesterId": "cmw65lfcc0000g8c6g8ra0av7",
  "assigneeId": null,
  "description": "Password reset email did not arrive after two attempts.",
  "category": null,
  "priority": "P2",
  "status": "OPEN",
  "slaDueAt": null,
  "createdAt": "2026-11-07T08:23:57.920Z",
  "updatedAt": "2026-11-07T08:40:39.818Z"
}
```

---

## POST /api/tickets — Create Ticket

**Request**
```
POST http://localhost:3000/api/tickets
Content-Type: application/json
```
```json
{
  "subject": "Test ticket from Postman",
  "requesterEmail": "test@example.com",
  "requesterId": "cmw65lfcc0000g8c6g8ra0av7",
  "description": "This is a test ticket created via Postman to document the API.",
  "priority": "P2",
  "status": "OPEN"
}
```

**Response — `201 Created`**
```json
{
  "id": "a0950a86-698b-49f0-9a2f-d4bdeff913de",
  "subject": "Test ticket from Postman",
  "requesterEmail": "test@example.com",
  "requesterId": null,
  "assigneeId": null,
  "description": "This is a test ticket created via Postman to document the API.",
  "category": null,
  "priority": "P2",
  "status": "OPEN",
  "slaDueAt": null,
  "createdAt": "2026-11-10T20:08:00.145Z",
  "updatedAt": "2026-11-10T20:08:00.145Z"
}
```

---

## PUT /api/tickets/:id — Update Ticket

**Request**
```
PUT http://localhost:3000/api/tickets/a0950a86-698b-49f0-9a2f-d4bdeff913de
Content-Type: application/json
```
```json
{
  "subject": "Test ticket from Postman (updated)",
  "status": "IN_PROGRESS",
  "priority": "P1"
}
```

**Response — `200 OK`**
```json
{
  "id": "a0950a86-698b-49f0-9a2f-d4bdeff913de",
  "subject": "Test ticket from Postman (updated)",
  "requesterEmail": "test@example.com",
  "requesterId": null,
  "assigneeId": null,
  "description": "This is a test ticket created via Postman to document the API.",
  "category": null,
  "priority": "P1",
  "status": "IN_PROGRESS",
  "slaDueAt": null,
  "createdAt": "2026-11-10T20:08:00.145Z",
  "updatedAt": "2026-11-10T20:08:08.824Z"
}
```

---

## DELETE /api/tickets/:id — Delete Ticket

**Request**
```
DELETE http://localhost:3000/api/tickets/a0950a86-698b-49f0-9a2f-d4bdeff913de
```

**Response — `204 No Content`**

> No response body. The ticket was successfully deleted.

---

## Summary

| Method | Endpoint               | Status | Description              |
|--------|------------------------|--------|--------------------------|
| GET    | `/api/tickets`         | `200`  | Listed all tickets        |
| GET    | `/api/tickets/:id`     | `200`  | Fetched single ticket     |
| POST   | `/api/tickets`         | `201`  | Created new ticket        |
| PUT    | `/api/tickets/:id`     | `200`  | Updated ticket fields     |
| DELETE | `/api/tickets/:id`     | `204`  | Deleted ticket            |
