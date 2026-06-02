# API Contracts: Game Start & Drawer Flow

## New Endpoint

### POST /rooms/:code/start

Starts a game. Transitions room from `lobby` → `playing`, assigns drawer, selects secret word.

**Path parameters**

| Param | Type | Description |
|---|---|---|
| `code` | string | 4-character room code (case-insensitive; normalised to uppercase by store) |

**Request body**

```json
{ "participantId": "uuid-of-the-host" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `participantId` | string | Yes | Must match `room.hostId` |

**Success response — 200 OK**

```json
{
  "room": {
    "code": "ABCD",
    "status": "playing",
    "participants": [
      { "id": "uuid1", "name": "Alice", "joinedAt": "…" },
      { "id": "uuid2", "name": "Bob",   "joinedAt": "…" }
    ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "isHost": true,
    "currentDrawerId": "uuid1",
    "secretWord": "rocket"
  }
}
```

Note: `secretWord` is non-null in the start response because the caller is always the host = drawer.

**Error responses**

| Status | Condition | Body |
|---|---|---|
| 400 | Missing or invalid `participantId` in body | `{ "message": "Invalid request payload" }` |
| 403 | `participantId` does not match `room.hostId` | `{ "message": "Only the host can start the game" }` |
| 404 | Room code not found | `{ "message": "Room not found" }` |
| 409 | Room already in `playing` status | `{ "message": "Game already in progress" }` |

---

## Modified Endpoints

### GET /rooms/:code (extended)

**Query parameters** — unchanged: `participantId` optional.

**Response shape change** — `RoomSnapshot` now includes:

| Field | Type | Lobby value | Playing value (drawer) | Playing value (guesser) |
|---|---|---|---|---|
| `status` | `"lobby" \| "playing"` | `"lobby"` | `"playing"` | `"playing"` |
| `currentDrawerId` | `string \| null` | `null` | `"uuid1"` | `"uuid1"` |
| `secretWord` | `string \| null` | `null` | `"rocket"` | `null` |
| `roles` | **removed** | — | — | — |

Full playing-state response for the **drawer**:

```json
{
  "room": {
    "code": "ABCD",
    "status": "playing",
    "participants": [ … ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "isHost": true,
    "currentDrawerId": "uuid1",
    "secretWord": "rocket"
  }
}
```

Full playing-state response for a **guesser**:

```json
{
  "room": {
    "code": "ABCD",
    "status": "playing",
    "participants": [ … ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "isHost": false,
    "currentDrawerId": "uuid1",
    "secretWord": null
  }
}
```

---

### POST /rooms/:code/join (extended guard)

**New error response**:

| Status | Condition | Body |
|---|---|---|
| 409 | Room is in `playing` status | `{ "message": "Game already in progress" }` |

All other behaviour unchanged from Scenario 1.

---

## Frontend API Client (`frontend/src/services/api.ts`)

New method added to `api` object:

```typescript
startGame(code: string, participantId: string): Promise<{ room: RoomSnapshot }>
```

Calls `POST /rooms/:code/start` with `{ participantId }` body.

`RoomSnapshot` interface updated:

```typescript
export interface RoomSnapshot {
  code: string;
  status: "lobby" | "playing";   // broadened
  participants: Participant[];
  availableWords: string[];
  // roles removed
  isHost: boolean;
  currentDrawerId: string | null; // new
  secretWord: string | null;      // new
}
```
