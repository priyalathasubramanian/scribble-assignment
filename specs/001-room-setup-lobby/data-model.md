# Data Model: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-02

---

## Entities

### Room (backend, in-memory)

Stored in `Map<string, Room>` in `backend/src/services/roomStore.ts`.

| Field | Type | Rules |
|---|---|---|
| `code` | `string` | 4-char uppercase alphanumeric; unique across all rooms; excludes I, O, 0, 1 |
| `status` | `"lobby"` | Only value for Scenario 1; extended in later scenarios |
| `participants` | `Participant[]` | Ordered by join time; minimum 1 (creator) |
| `hostId` | `string` | UUID of the first participant; set at creation; never changes |
| `createdAt` | `string` | ISO 8601 timestamp |
| `updatedAt` | `string` | ISO 8601 timestamp; updated on any mutation |

**Changes from scaffold**: Added `hostId` field.

---

### Participant (backend, embedded in Room)

| Field | Type | Rules |
|---|---|---|
| `id` | `string` | UUID (randomUUID); unique per room lifetime |
| `name` | `string` | Non-empty after trim; max length unconstrained |
| `joinedAt` | `string` | ISO 8601 timestamp |

**Changes from scaffold**: Name MUST be non-empty after trim (previously silently defaulted to `"Player"`).

---

### RoomSnapshot (backend → frontend, read-only projection)

Returned by all three room endpoints. Scoped to a requesting participant via `viewerParticipantId`.

| Field | Type | Source |
|---|---|---|
| `code` | `string` | `room.code` |
| `status` | `"lobby"` | `room.status` |
| `participants` | `Participant[]` | `room.participants` (shallow copy) |
| `availableWords` | `string[]` | `STARTER_WORDS` constant |
| `roles` | `ParticipantRole[]` | `STARTER_ROLES` constant |
| `isHost` | `boolean` | `viewerParticipantId === room.hostId` |

**Changes from scaffold**: Added `isHost` field.

---

### RoomSessionResponse (backend → frontend)

Returned only by `POST /rooms` and `POST /rooms/:code/join`.

| Field | Type | Notes |
|---|---|---|
| `participantId` | `string` | The joining participant's UUID; client must persist this |
| `room` | `RoomSnapshot` | Snapshot scoped to this participant |

**No changes from scaffold.**

---

## State Transitions

```
[not exists] --createRoom--> lobby
lobby        --joinRoom--->  lobby   (participant count increases)
lobby        --getRoom---->  lobby   (read-only; no state change)
```

No state exits `lobby` in Scenario 1. The `startGame` transition is specified in Scenario 2.

---

## Validation Rules

| Field | Rule | Error |
|---|---|---|
| `playerName` (create/join body) | Required; trim; min length 1 | HTTP 400 "Player name is required" |
| `code` (join params) | Required; non-empty string | HTTP 400 (Zod parse error) |
| Room lookup by code | Uppercase-normalised before lookup | HTTP 404 "Room not found" if no match |

---

## Identity & Uniqueness

- Room codes are unique across the in-memory `Map`; `generateUniqueCode()` retries on collision.
- Participant IDs are `randomUUID()` — collision probability negligible.
- Player names are NOT required to be unique within a room.
- `hostId` is the participant `id` of the creator; it is immutable.
