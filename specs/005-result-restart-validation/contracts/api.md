# API Contracts: Result, Restart & Final Validation

**Branch**: `005-result-restart-validation` | **Date**: 2026-06-03

---

## New Endpoint

### `POST /rooms/:code/restart`

Transitions a room from `"ended"` back to `"lobby"`. Clears all round-specific state while preserving players and cumulative scores. Only the host may call this.

**Request**

```
POST /rooms/:code/restart
Content-Type: application/json

{
  "participantId": "uuid"
}
```

| Field | Type | Required | Validation |
|---|---|---|---|
| `participantId` | string | ✅ | min length 1 |

**Success Response — 200**

```json
{
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [
      { "id": "uuid-1", "name": "Alice", "joinedAt": "2026-06-03T10:00:00.000Z" },
      { "id": "uuid-2", "name": "Bob", "joinedAt": "2026-06-03T10:00:05.000Z" }
    ],
    "availableWords": ["rocket", "pizza", "castle", "guitar", "sunflower"],
    "isHost": true,
    "currentDrawerId": null,
    "secretWord": null,
    "gameState": null
  }
}
```

Note: `gameState` is always `null` when `status === "lobby"`.

**Error Responses**

| Status | Condition |
|---|---|
| 404 | Room code not found |
| 403 | `participantId` is not the host |
| 409 | Room `status` is not `"ended"` (game not yet finished) |

---

## Modified Behaviour: `GET /rooms/:code`

No contract change. After restart, polling clients receive `status: "lobby"` with `gameState: null`. This is how non-host clients detect the restart.

---

## Modified Behaviour: `startGame` score initialisation

`POST /rooms/:code/start` now only initialises scores for participants not already in `room.scores`. This preserves cumulative scores across restarts.

**Before** (existing):
```ts
room.scores = Object.fromEntries(room.participants.map((p) => [p.id, 0]));
```

**After** (this feature):
```ts
for (const p of room.participants) {
  if (!(p.id in room.scores)) {
    room.scores[p.id] = 0;
  }
}
```

Existing client contracts are unaffected — the scores shape (`Record<string, number>`) and the snapshot shape (`Array<{participantId, score}>`) are unchanged.
