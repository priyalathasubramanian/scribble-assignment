# API Contracts: Gameplay Interaction

## New Endpoints

### POST /rooms/:code/guess

Submit a guess for the active round.

**Path parameters**

| Param | Type | Description |
|---|---|---|
| `code` | string | 4-character room code (normalised to uppercase by store) |

**Request body**

```json
{ "participantId": "uuid-of-guesser", "text": "rocket" }
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `participantId` | string | Yes | Must not be `room.currentDrawerId` |
| `text` | string | Yes | Trimmed before comparison; must be non-empty after trimming |

**Success response — 200 OK**

```json
{
  "guess": {
    "participantId": "uuid-of-guesser",
    "text": "rocket",
    "isCorrect": true,
    "submittedAt": "2026-06-03T12:00:05.000Z"
  }
}
```

**Error responses**

| Status | Condition | Body |
|---|---|---|
| 400 | Missing/invalid body fields, or empty text after trim | `{ "message": "Guess cannot be empty" }` |
| 403 | `participantId` is the drawer | `{ "message": "Drawer cannot submit guesses" }` |
| 404 | Room code not found | `{ "message": "Room not found" }` |
| 409 | Round not active (`status !== "playing"`) | `{ "message": "Round is not active" }` |
| 409 | Guesser already guessed correctly | `{ "message": "Already guessed correctly" }` |

---

### POST /rooms/:code/draw

Append a completed stroke to the canvas. Called by the drawer on mouseUp.

**Request body**

```json
{
  "participantId": "uuid-of-drawer",
  "stroke": {
    "points": [
      { "x": 100, "y": 150 },
      { "x": 105, "y": 160 }
    ]
  }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `participantId` | string | Yes | Must equal `room.currentDrawerId` |
| `stroke.points` | array | Yes | At least 1 point; each point has `x: number` and `y: number` |

**Success response — 200 OK**

```json
{ "ok": true }
```

**Error responses**

| Status | Condition | Body |
|---|---|---|
| 400 | Invalid body | `{ "message": "Invalid request payload" }` |
| 403 | `participantId` is not the drawer | `{ "message": "Only the drawer can draw" }` |
| 404 | Room not found | `{ "message": "Room not found" }` |
| 409 | Round not active | `{ "message": "Round is not active" }` |

---

### POST /rooms/:code/clear

Clear all strokes from the canvas. Drawer only.

**Request body**

```json
{ "participantId": "uuid-of-drawer" }
```

**Success response — 200 OK**

```json
{ "ok": true }
```

**Error responses**

| Status | Condition | Body |
|---|---|---|
| 400 | Invalid body | `{ "message": "Invalid request payload" }` |
| 403 | Not the drawer | `{ "message": "Only the drawer can clear the canvas" }` |
| 404 | Room not found | `{ "message": "Room not found" }` |
| 409 | Round not active | `{ "message": "Round is not active" }` |

---

## Modified Endpoints

### GET /rooms/:code (extended)

`RoomSnapshot` now includes a `gameState` field.

**Response shape change** — `RoomSnapshot` now includes:

| Field | Type | Lobby | Playing | Ended |
|---|---|---|---|---|
| `status` | `"lobby" \| "playing" \| "ended"` | `"lobby"` | `"playing"` | `"ended"` |
| `gameState` | `GameState \| null` | `null` | non-null | non-null |
| `secretWord` | `string \| null` | `null` | non-null for drawer only | non-null for **all** viewers |

**Secret word reveal**: when `status === "ended"`, `secretWord` is returned to every viewer regardless of role. Clients should display the round-over banner with the revealed word.

**`GameState` shape**:

```json
{
  "roundEndsAt": "2026-06-03T12:01:00.000Z",
  "strokes": [
    { "points": [{ "x": 100, "y": 150 }, { "x": 105, "y": 160 }] }
  ],
  "guesses": [
    {
      "participantId": "uuid2",
      "text": "rocket",
      "isCorrect": true,
      "submittedAt": "2026-06-03T12:00:05.000Z"
    }
  ],
  "scores": [
    { "participantId": "uuid2", "score": 100 }
  ],
  "correctGuessers": ["uuid2"]
}
```

Full playing-state response (drawer — note `secretWord` is non-null):

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
    "secretWord": "rocket",
    "gameState": {
      "roundEndsAt": "2026-06-03T12:01:00.000Z",
      "strokes": [],
      "guesses": [],
      "scores": [
        { "participantId": "uuid1", "score": 0 },
        { "participantId": "uuid2", "score": 0 }
      ],
      "correctGuessers": []
    }
  }
}
```

Full playing-state response (guesser — `secretWord` is null):

```json
{
  "room": {
    "code": "ABCD",
    "status": "playing",
    "participants": [ … ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "isHost": false,
    "currentDrawerId": "uuid1",
    "secretWord": null,
    "gameState": {
      "roundEndsAt": "2026-06-03T12:01:00.000Z",
      "strokes": [
        { "points": [{ "x": 100, "y": 150 }] }
      ],
      "guesses": [],
      "scores": [
        { "participantId": "uuid1", "score": 0 },
        { "participantId": "uuid2", "score": 0 }
      ],
      "correctGuessers": []
    }
  }
}
```

Round-ended response (guesser — `secretWord` now non-null, revealed to all):

```json
{
  "room": {
    "code": "ABCD",
    "status": "ended",
    "participants": [ … ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "isHost": false,
    "currentDrawerId": "uuid1",
    "secretWord": "rocket",
    "gameState": {
      "roundEndsAt": "2026-06-03T12:01:00.000Z",
      "strokes": [ … ],
      "guesses": [ … ],
      "scores": [
        { "participantId": "uuid1", "score": 0 },
        { "participantId": "uuid2", "score": 100 }
      ],
      "correctGuessers": ["uuid2"]
    }
  }
}
```

---

## Frontend API Client (`frontend/src/services/api.ts`) — new methods

```typescript
submitGuess(code: string, participantId: string, text: string): Promise<{ guess: Guess }>
addStroke(code: string, participantId: string, stroke: Stroke): Promise<{ ok: boolean }>
clearCanvas(code: string, participantId: string): Promise<{ ok: boolean }>
```

Updated `RoomSnapshot` interface:

```typescript
export interface Stroke {
  points: Array<{ x: number; y: number }>;
}

export interface Guess {
  participantId: string;
  text: string;
  isCorrect: boolean;
  submittedAt: string;
}

export interface GameState {
  roundEndsAt: string;
  strokes: Stroke[];
  guesses: Guess[];
  scores: Array<{ participantId: string; score: number }>;
  correctGuessers: string[];
}

export interface RoomSnapshot {
  code: string;
  status: "lobby" | "playing" | "ended";   // "ended" added
  participants: Participant[];
  availableWords: string[];
  isHost: boolean;
  currentDrawerId: string | null;
  secretWord: string | null;
  gameState: GameState | null;              // new
}
```
