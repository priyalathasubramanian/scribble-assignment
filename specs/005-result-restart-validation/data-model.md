# Data Model: Result, Restart & Final Validation

**Branch**: `005-result-restart-validation` | **Date**: 2026-06-03

## Model Changes

This feature adds **no new types**. All entities exist from the gameplay interaction feature. The changes are purely in field mutations during the `restartGame` operation.

---

## Existing Types (unchanged)

### `RoomStatus`
```
"lobby" | "playing" | "ended"
```
All three values already exist. Restart transitions `"ended"` → `"lobby"`.

### `Room` (in-memory, backend)
No new fields. The restart operation mutates existing fields:

| Field | Type | Post-Restart Value | Preserved? |
|---|---|---|---|
| `code` | `string` | unchanged | ✅ |
| `status` | `RoomStatus` | `"lobby"` | mutated |
| `participants` | `Participant[]` | unchanged | ✅ |
| `hostId` | `string` | unchanged | ✅ |
| `scores` | `Record<string, number>` | unchanged | ✅ cumulative |
| `currentDrawerId` | `string \| null` | `null` | cleared |
| `secretWord` | `string \| null` | `null` | cleared |
| `strokes` | `Stroke[]` | `[]` | cleared |
| `guesses` | `Guess[]` | `[]` | cleared |
| `correctGuessers` | `string[]` | `[]` | cleared |
| `roundStartedAt` | `string \| null` | `null` | cleared |
| `roundDurationSeconds` | `number` | 60 (unchanged) | ✅ |
| `updatedAt` | `string` | `now()` | updated |

### `RoomSnapshot` (API response, read by frontend)
No new fields. When `status === "lobby"` after restart:
- `gameState` is `null` (already: only populated for `"playing"` / `"ended"`)
- `secretWord` is `null`
- `currentDrawerId` is `null`
- `participants` list is intact

---

## New Schema (backend validation)

### `restartGameSchema`
```
{ participantId: string (min 1) }
```
Follows the same shape as `startGameSchema`. Lives in `backend/src/api/schemas.ts`.

---

## State Transition Diagram

```
"lobby"  ──[startGame]──▶  "playing"  ──[timer/all-correct]──▶  "ended"
   ▲                                                                │
   └──────────────────[restartGame (host only)]─────────────────────┘
```

Invariant: `restartGame` is only permitted when `status === "ended"`. Any other status → 409.

---

## No Score Reset

Scores accumulate across restarts for the lifetime of the in-memory server session:
- `room.scores` is a `Record<string, number>` keyed by `participantId`
- New participants joining after a restart will be added to `scores` when `startGame` is called (existing `startGame` logic: `Object.fromEntries(room.participants.map(p => [p.id, 0]))` — this would RESET scores)

**Issue identified**: The current `startGame` resets all scores to 0. To preserve cumulative scores across restarts, `startGame` must be modified to only initialise scores for participants **not already in `room.scores`**, leaving existing scores intact.

```ts
// Modified initialisation in startGame:
for (const p of room.participants) {
  if (!(p.id in room.scores)) {
    room.scores[p.id] = 0;
  }
}
```
