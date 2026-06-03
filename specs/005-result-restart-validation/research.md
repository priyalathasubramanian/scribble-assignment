# Research: Result, Restart & Final Validation

**Branch**: `005-result-restart-validation` | **Date**: 2026-06-03

## Findings

### 1. What Already Exists from Gameplay Interaction (Feature 004)

| Capability | Location | Notes |
|---|---|---|
| `RoomStatus = "lobby" \| "playing" \| "ended"` | `backend/src/models/game.ts:2` | `"ended"` already exists |
| `GameState` (scores, guesses, strokes, roundEndsAt) | `backend/src/models/game.ts:21-27` | Full snapshot already returned |
| `checkRoundExpiry` auto-transitions to `"ended"` on timer | `backend/src/services/roomStore.ts:53-62` | Lazy check-on-access pattern |
| `toRoomSnapshot` exposes `secretWord` when `status === "ended"` | `backend/src/services/roomStore.ts:200` | Word revealed to all on round end |
| `GamePage` round-over banner with secret word | `frontend/src/pages/GamePage.tsx:151-163` | Yellow banner already renders |
| `Scoreboard` renders cumulative scores | `frontend/src/components/Scoreboard.tsx` | Sorted by score descending |
| `ResultPanel` renders guess history | `frontend/src/components/ResultPanel.tsx` | Shows "No guesses yet." when empty |
| `fetchRoomSilent` 2s polling loop | `frontend/src/state/roomStore.ts:143-154` | Silent, retries on failure |

**Conclusion**: The entire result *display* is already functional. This feature adds only the restart action and its downstream navigation.

---

### 2. `restartGame` State Transition Design

**Decision**: `restartGame` clears round-specific state and transitions back to `"lobby"`. It does NOT reset `scores`.

**State fields after restart**:

| Field | After Restart | Rationale |
|---|---|---|
| `status` | `"lobby"` | Returns room to pre-game state |
| `participants` | unchanged | FR-008: players preserved |
| `scores` | unchanged | FR-009: cumulative scores preserved |
| `hostId` | unchanged | Host identity persists |
| `currentDrawerId` | `null` | FR-010: round state cleared |
| `secretWord` | `null` | FR-010: round state cleared |
| `strokes` | `[]` | FR-010: round state cleared |
| `guesses` | `[]` | FR-010: round state cleared |
| `correctGuessers` | `[]` | FR-010: round state cleared |
| `roundStartedAt` | `null` | FR-010: round state cleared |
| `roundDurationSeconds` | 60 (unchanged) | No reason to change |

**Guard**: `status` MUST be `"ended"` before restart is permitted (409 otherwise). Prevents accidental restart during an active round.

**Rationale**: Mirror the `startGame` pattern but inverse — instead of initialising all round fields to fresh values, clear them back to null/empty. Keep `scores` and `participants` exactly as `startGame` does.

**Alternatives considered**:
- Allow restart from any status → rejected: premature restarts from `"playing"` would lose ongoing round data with no user intent
- Reset scores on restart → rejected: spec FR-009 explicitly says scores persist; cumulative scoring across rounds is the feature

---

### 3. Frontend Navigation After Restart

**Decision**: Two-path navigation model:
- **Host**: after calling `restartGame()` successfully, imperatively `navigate('/lobby')`
- **Non-hosts**: next `fetchRoomSilent` poll returns `status === "lobby"` → `GamePage` effect navigates to `/lobby`

**Rationale**: The host gets instant navigation (no extra poll delay). Non-hosts are already polling every 2 seconds — they'll detect the lobby transition within one cycle (≤2s), meeting SC-003.

**Prior art in codebase**: `LobbyPage` already uses this same pattern: `useEffect` on `room?.status === "playing"` → `navigate('/game')`. We add the inverse on `GamePage`: `room?.status === "lobby"` → `navigate('/lobby')`.

**Alternatives considered**:
- Both host and non-host use poll-based navigation → adds unnecessary 0–2s delay for the host who initiated the restart
- Broadcast via polling only and remove imperative navigate → identical UX for non-hosts but simpler code; rejected because host deserves immediate feedback

---

### 4. `ResultPanel` Empty-State Message

**Decision**: Pass `isRoundEnded: boolean` prop to `ResultPanel`. When `isRoundEnded && guesses.length === 0`, show "No guesses were made." instead of "No guesses yet."

**Rationale**: Spec clarification Q3 — when a round ends with zero guesses, the message must be "No guesses were made." The current "No guesses yet." is appropriate only during an active round. Differentiating via a boolean prop is the minimal change (no new component, no data model change).

**Alternatives considered**:
- Always use "No guesses were made." → incorrect during gameplay when guesses haven't been submitted yet but the round is still ongoing
- Two separate components → over-engineering; a single prop is sufficient

---

### 5. `restartGameSchema` and API Shape

**Decision**: Minimal schema — `{ participantId: string }`, same pattern as `startGameSchema`. Response: `{ room: RoomSnapshot }`.

**Rationale**: The only caller input needed is `participantId` for host-identity verification. The response mirrors `POST /rooms/:code/start` so frontend can update the snapshot in one step.

---

### 6. Word Selection on Next `startGame`

**Decision**: No change needed. After restart, the room is in `"lobby"` state. The next `startGame` call uses the existing implementation (`STARTER_WORDS[0]` = "rocket"). Constitution Principle I (fixed seed word list) is already satisfied.

**Note**: This means repeated play in the same session always uses the same word. Acceptable per project scope.
