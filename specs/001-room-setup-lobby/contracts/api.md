# API Contracts: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-02
**Base URL**: `http://localhost:3001` (configurable via `VITE_API_URL`)

---

## POST /rooms

Create a new room. The requesting player becomes the host.

### Request

```
POST /rooms
Content-Type: application/json
```

```json
{
  "playerName": "Alice"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `playerName` | string | yes | Non-empty after trim |

### Response 201 Created

```json
{
  "participantId": "uuid-v4",
  "room": {
    "code": "AB2C",
    "status": "lobby",
    "participants": [
      { "id": "uuid-v4", "name": "Alice", "joinedAt": "2026-06-02T10:00:00.000Z" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"],
    "isHost": true
  }
}
```

### Response 400 Bad Request

```json
{ "message": "Player name is required" }
```

**Changes from scaffold**: `playerName` is now required (was optional). `isHost` added to snapshot.

---

## POST /rooms/:code/join

Join an existing room by code.

### Request

```
POST /rooms/AB2C/join
Content-Type: application/json
```

```json
{
  "playerName": "Bob"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `playerName` | string | yes | Non-empty after trim |

| Param | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes | Case-insensitive; normalised to uppercase by backend; whitespace-only values resolve to 404 (not 400) because the code param is not trimmed/validated — any code that does not match an existing room returns "Room not found" |

### Response 200 OK

```json
{
  "participantId": "uuid-v4",
  "room": {
    "code": "AB2C",
    "status": "lobby",
    "participants": [
      { "id": "uuid-v4-alice", "name": "Alice", "joinedAt": "2026-06-02T10:00:00.000Z" },
      { "id": "uuid-v4-bob",   "name": "Bob",   "joinedAt": "2026-06-02T10:00:05.000Z" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"],
    "isHost": false
  }
}
```

### Response 400 Bad Request

```json
{ "message": "Player name is required" }
```

### Response 404 Not Found

```json
{ "message": "Room not found" }
```

**Changes from scaffold**: `playerName` required. `isHost` in snapshot. Error message for unknown room changed from "Unable to join room" to "Room not found" for clarity.

---

## GET /rooms/:code

Poll room state. Called by the lobby on a ~2-second interval.

### Request

```
GET /rooms/AB2C?participantId=uuid-v4
```

| Param | Type | Required | Notes |
|---|---|---|---|
| `code` | string | yes | Case-insensitive; normalised to uppercase |
| `participantId` | string (query) | recommended | Determines `isHost` in response |

### Response 200 OK

```json
{
  "room": {
    "code": "AB2C",
    "status": "lobby",
    "participants": [
      { "id": "uuid-v4-alice", "name": "Alice", "joinedAt": "2026-06-02T10:00:00.000Z" },
      { "id": "uuid-v4-bob",   "name": "Bob",   "joinedAt": "2026-06-02T10:00:05.000Z" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "roles": ["drawer", "guesser"],
    "isHost": true
  }
}
```

### Response 404 Not Found

```json
{ "message": "Room not found" }
```

**Changes from scaffold**: `isHost` added to snapshot. No other changes.

---

## Error Format (all endpoints)

```json
{ "message": "Human-readable error description" }
```

HTTP status codes used:
- `400` — validation failure (bad input)
- `404` — resource not found
- `500` — unexpected server error
