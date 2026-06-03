# Tasks: Result, Restart & Final Validation

**Input**: Design documents from `specs/005-result-restart-validation/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/api.md ✅

**Key finding from research**: The result *display* (word reveal, scoreboard, round-over banner, guess history) is already fully implemented by the gameplay interaction feature. This task list covers only the new work: the restart action and its downstream navigation changes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

No new project structure, dependencies, or infrastructure required. All existing patterns (schemas, store, routes, polling) are reused. Skip to Phase 2.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend store function and schema that the route handler (US2) and test suite (US3) both depend on. US1 is independent and can proceed in parallel.

**⚠️ CRITICAL**: Phase 3/US2 route work cannot begin until T002 is complete.

- [x] T001 [P] Add `restartGameSchema` (`{ participantId: string (min 1) }`) to `backend/src/api/schemas.ts` following the pattern of `startGameSchema`
- [x] T002 [P] Add `restartGame(code, participantId)` function to `backend/src/services/roomStore.ts`: guards 404/403 (non-host)/409 (status !== "ended"); clear `currentDrawerId`, `secretWord`, `strokes`, `guesses`, `correctGuessers`, `roundStartedAt`; set `status = "lobby"`, `updatedAt = now()`; persist and return `cloneRoom`
- [x] T003 Patch `startGame` score initialisation in `backend/src/services/roomStore.ts` to only set `room.scores[p.id] = 0` for participants **not already** in `room.scores` (preserves cumulative scores across restarts); replaces `Object.fromEntries(room.participants.map(p => [p.id, 0]))` with a `for` loop guard
- [x] T004 Add unit tests for `restartGame` in `backend/src/services/roomStore.test.ts`: happy path (round fields cleared, scores preserved, status → "lobby"), 404 room-not-found, 403 non-host, 409 status-not-ended; also assert `toRoomSnapshot` exposes `secretWord` when `status === "ended"` (validates FR-003 stays satisfied), and returns `gameState: null` with `status: "lobby"` after restart (validates FR-011/FR-012)
- [x] T005 Add unit test for patched `startGame` in `backend/src/services/roomStore.test.ts`: verify existing participant scores are preserved when `startGame` is called after a restart; also verify FR-001/FR-002 round-end transitions still fire correctly (timer expiry and all-correct) after the score-init patch

**Checkpoint**: Foundation ready — US2 route work and US3 schema tests can now begin.

---

## Phase 3: User Story 1 — View Round Results (Priority: P1) 🎯 MVP

**Goal**: Ensure the results screen is complete, including the "No guesses were made." empty state for zero-guess rounds. All other result display (word reveal, scoreboard, guess history) is already implemented.

**Independent Test**: Start a game with no guesses submitted, let the timer expire, and confirm the "Guesses" panel shows "No guesses were made." instead of "No guesses yet."

- [x] T006 [P] [US1] Update `ResultPanel` in `frontend/src/components/ResultPanel.tsx` to accept an `isRoundEnded?: boolean` prop; when `isRoundEnded && guesses.length === 0`, render "No guesses were made." instead of "No guesses yet."
- [x] T007 [US1] Pass `isRoundEnded={isRoundEnded}` to `<ResultPanel>` in `frontend/src/pages/GamePage.tsx` (use the existing `const isRoundEnded = room.status === "ended"` already declared on line 71)

**Checkpoint**: User Story 1 complete and independently testable.

---

## Phase 4: User Story 2 — Host Restarts the Game (Priority: P2)

**Goal**: Host sees a "Play Again" button after a round ends and can return all players to the lobby. Non-hosts return to the lobby automatically via the next poll.

**Independent Test**: Complete a round, have the host click "Play Again", confirm both windows return to the lobby with player list intact, no round data visible, and cumulative scores preserved.

**Depends on**: T001 (`restartGameSchema`), T002 (`restartGame` store function)

- [x] T008 [P] [US2] Add `POST /:code/restart` route handler to `backend/src/api/rooms.ts`: parse body with `restartGameSchema`, call `restartGame(code, participantId)`, respond `{ room: toRoomSnapshot(result, participantId) }`; import `restartGame` from roomStore
- [x] T009 [P] [US2] Add `api.restartGame(code: string, participantId: string)` method to `frontend/src/services/api.ts`: `POST /rooms/:code/restart` with `{ participantId }` body, returns `{ room: RoomSnapshot }`
- [x] T010 [US2] Add `RoomStore.restartGame()` method to `frontend/src/state/roomStore.ts`: calls `api.restartGame(this.state.room.code, this.state.participantId)`, then `setRoomSnapshot(response.room)`; guard on `!this.state.room || !this.state.participantId`
- [x] T011 [US2] Add `useEffect` to `frontend/src/pages/GamePage.tsx` that navigates to `/lobby` when `room?.status === "lobby"` (mirrors the existing `LobbyPage` pattern for `"playing"` → `/game`)
- [x] T012 [US2] Add "Play Again" button to `frontend/src/pages/GamePage.tsx`: render only when `isRoundEnded && room.isHost`; on click, call `await roomStore.restartGame()` then `navigate('/lobby')`; place in the `button-row` section alongside the existing "Exit Game" button
- [x] T017 [US2] Add `scores: Array<{ participantId: string; score: number }>` field to `RoomSnapshot` in `backend/src/models/game.ts` and `frontend/src/services/api.ts`; extend `toRoomSnapshot` in `backend/src/services/roomStore.ts` to always populate `scores` from `room.participants` for all phases (not gated on `gameState`); then update `frontend/src/pages/LobbyPage.tsx` Participants card to render `room.scores` alongside player names as "(N pts)" in the existing `player-list` `<ul>` (FR-014)

**Checkpoint**: User Stories 1 and 2 complete. Full game loop is playable with restart.

---

## Phase 5: User Story 3 — Polling Reflects Round-End State (Priority: P3)

**Goal**: Verify polling contract is satisfied for result and lobby phase transitions. No new code is needed; the existing `toRoomSnapshot` + `fetchRoomSilent` loop already handles this correctly.

**Independent Test**: Issue a `GET /rooms/:code?participantId=...` after a round ends and confirm the response includes `status: "ended"`, `gameState` with all fields, and `secretWord` populated. Then after restart, confirm `status: "lobby"` and `gameState: null`.

- [x] T013 [P] [US3] Add `restartGameSchema` validation tests to `backend/src/api/schemas.test.ts`: valid input passes, missing `participantId` fails, empty string `participantId` fails
- [ ] T014 [US3] Manual end-to-end verification per `quickstart.md`. Pass criteria (all must hold): (1) both browser windows display the results screen with the correct word, all scores, and full guess history within ≤2s of round end — with no manual action; (2) when a round ends with zero guesses, the Guesses panel shows "No guesses were made." (not blank, not "No guesses yet."); (3) the "Play Again" button is visible in window 1 (host) and absent in window 2 (non-host); (4) host clicks "Play Again" and immediately lands on the lobby; (5) non-host window transitions to the lobby within ≤2s without any manual action; (6) the lobby player list contains all players who were in the game; (7) scores shown in the lobby equal the cumulative total from all completed rounds (not reset to zero)

**Checkpoint**: All user stories complete and end-to-end verified.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [x] T015 [P] Run `cd backend && npm test` and confirm all tests pass (including new T004, T005, T013 tests)
- [x] T016 [P] Run `cd frontend && npm test` and confirm all existing tests continue to pass

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
  - T001 and T002 are **parallel** (different files)
  - T003 must follow T002 (same file — `roomStore.ts`)
  - T004 and T005 follow T002/T003 (test file)
- **US1 (Phase 3)**: Independent — can start in parallel with Phase 2
  - T006 and T007 are sequential (T007 depends on T006 prop change)
- **US2 (Phase 4)**: Depends on T001 and T002 (needs schema + store function)
  - T008 and T009 are **parallel** (different files: `rooms.ts` vs `api.ts`)
  - T010 depends on T009 (needs `api.restartGame`)
  - T011 and T012 depend on T010 (both touch `GamePage.tsx`, sequential)
- **US3 (Phase 5)**: T013 is independent; T014 depends on all prior phases
- **Polish (Phase 6)**: Depends on all phases complete

### User Story Dependencies

- **US1 (P1)**: Independent — no dependencies on other stories
- **US2 (P2)**: Depends on Foundational (T001, T002); independent of US1
- **US3 (P3)**: Depends on US2 being complete for end-to-end verification

---

## Parallel Execution Example: Foundational + US1

```bash
# Can start simultaneously:

Task T001: "Add restartGameSchema to backend/src/api/schemas.ts"
Task T002: "Add restartGame() + patch startGame() in backend/src/services/roomStore.ts"
Task T006: "Update ResultPanel in frontend/src/components/ResultPanel.tsx"

# After T001 + T002 complete:
Task T003: "Patch startGame scores in backend/src/services/roomStore.ts"

# After T006 complete:
Task T007: "Pass isRoundEnded prop in frontend/src/pages/GamePage.tsx"

# After T002 + T003 complete:
Task T008: "Add POST /:code/restart route to backend/src/api/rooms.ts"
Task T009: "Add api.restartGame() to frontend/src/services/api.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete T006–T007 (US1 is independent, minimal change)
2. **VALIDATE**: Let a round end with zero guesses — confirm "No guesses were made."
3. Add Foundational (T001–T005) + US2 (T008–T012) for restart
4. **VALIDATE**: Full restart loop with two browser windows

### Incremental Delivery

1. T006–T007: Correct empty-state message *(US1 done)*
2. T001–T005: Backend restart infrastructure *(Foundation done)*
3. T008–T012: Full restart flow *(US2 done)*
4. T013–T014: Verify polling contract *(US3 done)*
5. T015–T016: Confirm test suite green *(Polish done)*

---

## Notes

- [P] tasks operate on different files and have no blocking dependencies — safe to run concurrently
- US1 (ResultPanel empty state) is a 3-line change and can be done first to get MVP result display correct
- The biggest risk is the `startGame` score-reset patch (T003) — ensure the guard covers only new participants, not all
- T011 (lobby navigation `useEffect` in GamePage) mirrors the exact pattern in `LobbyPage.tsx:29-31` — use it as a reference
- Cumulative score preservation is verified by T005 (unit test) and T014 (manual test)
