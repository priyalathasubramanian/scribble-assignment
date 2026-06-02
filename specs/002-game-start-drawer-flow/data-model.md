# Data Model: Game Start & Drawer Flow

## Entities

### Room (extended from Scenario 1)

```
Room {
  code:              string           // 4-char uppercase, unique key
  status:            RoomStatus       // "lobby" | "playing"  ← "playing" added
  participants:      Participant[]
  hostId:            string           // participantId of creator (unchanged)
  currentDrawerId:   string | null    // null in lobby; set to hostId on startGame
  secretWord:        string | null    // null in lobby; set to STARTER_WORDS[0] on startGame
  createdAt:         string           // ISO 8601
  updatedAt:         string           // ISO 8601
}
```

**New fields**: `currentDrawerId`, `secretWord`
**Changed fields**: `status` type broadened from `"lobby"` to `"lobby" | "playing"`

---

### RoomSnapshot (extended from Scenario 1)

```
RoomSnapshot {
  code:              string
  status:            "lobby" | "playing"   ← broadened
  participants:      Participant[]
  availableWords:    string[]              // full list; unchanged
  isHost:            boolean
  currentDrawerId:   string | null         // new — null in lobby
  secretWord:        string | null         // new — non-null only for the drawer
  // roles: ParticipantRole[]             // REMOVED (Clarification 1)
}
```

**New fields**: `currentDrawerId`, `secretWord`
**Removed fields**: `roles` (derived from `currentDrawerId` on the client)

---

### Participant (unchanged)

```
Participant {
  id:       string   // UUID
  name:     string
  joinedAt: string   // ISO 8601
}
```

---

### RoomStatus (extended)

```
type RoomStatus = "lobby" | "playing"
```

Previously `"lobby"` only.

---

## Validation Rules

| Field | Rule |
|---|---|
| `startGame.participantId` | Required, non-empty string; must match `room.hostId` (else 403) |
| `startGame` on `playing` room | Rejected with 409 ("Game already in progress") |
| `joinRoom` on `playing` room | Rejected with 409 ("Game already in progress") |
| `secretWord` in snapshot | Non-null only when `viewerParticipantId === room.currentDrawerId` |
| `currentDrawerId` | Set to `room.hostId` on `startGame`; never changes within a round |

---

## State Transitions

```
[created]
    │
    ▼
 "lobby"  ──── POST /rooms/:code/start (by host) ────▶  "playing"
    │                                                        │
    │  (joinRoom allowed)                    (joinRoom → 409)│
    │                                                        │
    ▼                                                        ▼
participants grow                                 currentDrawerId = hostId
                                                 secretWord = STARTER_WORDS[0]
```

- `lobby → playing` transition is **one-way** in this scenario
- No `playing → lobby` or `playing → ended` in Scenario 2 (deferred to Scenario 4)

---

## `toRoomSnapshot` Visibility Rules

| Viewer | `isHost` | `currentDrawerId` | `secretWord` |
|---|---|---|---|
| host (in lobby) | `true` | `null` | `null` |
| joiner (in lobby) | `false` | `null` | `null` |
| drawer (in playing) | `true` | `hostId` | `"rocket"` |
| guesser (in playing) | `false` | `hostId` | `null` |
| unknown participantId | `false` | `hostId` (if playing) | `null` |

---

## Frontend Store State (no new fields)

The existing `RoomState` in `frontend/src/state/roomStore.ts` stores `room: RoomSnapshot | null`. The richer `RoomSnapshot` shape (with `currentDrawerId`, `secretWord`) flows through without store changes — `setRoomSnapshot` is unchanged.
