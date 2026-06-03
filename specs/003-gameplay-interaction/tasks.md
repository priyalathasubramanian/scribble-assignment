# Tasks: Gameplay Interaction

**Input**: Design documents from `specs/003-gameplay-interaction/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/api.md ✅ quickstart.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US5)
- Exact file paths included in every task description

---

## Phase 1: Setup (Data Model Extensions)

**Purpose**: Extend shared types that every subsequent phase depends on. All three tasks touch different files and can run in parallel.

- [x] T001 [P] Extend `backend/src/models/game.ts`: add `Stroke`, `Guess`, `GameState` interfaces; extend `Room` with `strokes`, `guesses`, `scores`, `correctGuessers`, `roundStartedAt`, `roundDurationSeconds`; broaden `RoomStatus` to `"lobby" | "playing" | "ended"`; add `gameState: GameState | null` to `RoomSnapshot`
- [x] T002 [P] Export `ROUND_DURATION_SECONDS = 60` constant from `backend/src/seed/starterData.ts`
- [x] T003 [P] Extend `frontend/src/services/api.ts`: add `Stroke`, `Guess`, `GameState` interfaces; add `gameState: GameState | null` to `RoomSnapshot`; broaden `status` to include `"ended"`

**Checkpoint**: All type definitions in place — TypeScript will flag any downstream usage gaps

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Server-side logic that every story's endpoint depends on — must be complete before any route handler is added.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Implement `checkRoundExpiry(room: Room): void` in `backend/src/services/roomStore.ts` — sets `room.status = "ended"` when `Date.now() >= new Date(room.roundStartedAt).getTime() + room.roundDurationSeconds * 1000`
- [x] T005 Extend `startGame()` in `backend/src/services/roomStore.ts` to initialise `strokes: []`, `guesses: []`, `correctGuessers: []`, `scores: Object.fromEntries(participants.map(p => [p.id, 0]))`, `roundStartedAt: now()`, `roundDurationSeconds: ROUND_DURATION_SECONDS`; also update the existing guard from `room.status === "playing"` to `room.status !== "lobby"` so that `"ended"` rooms are also rejected (409)
- [x] T006 Extend `toRoomSnapshot()` in `backend/src/services/roomStore.ts` to call `checkRoundExpiry(room)` then build and return `gameState: { roundEndsAt, strokes, guesses, scores, correctGuessers }` when `status` is `"playing"` or `"ended"`, or `null` in lobby
- [x] T007 [P] Add `submitGuessSchema`, `addStrokeSchema`, and `clearCanvasSchema` to `backend/src/api/schemas.ts`
- [x] T008 [P] Add backend unit tests for foundational logic in `backend/src/services/roomStore.test.ts`: `startGame` initialises all game fields with correct defaults; `toRoomSnapshot` returns `gameState` when playing and `null` in lobby; `checkRoundExpiry` transitions `"playing"` → `"ended"` when time elapsed and is a no-op otherwise

**Checkpoint**: Foundation ready — route handlers and frontend can now be added per story

---

## Phase 3: US1 + US5 (P1) — Canvas Drawing & Viewing

**Goal**: Drawer can draw strokes and clear the canvas; guessers see the current canvas state via the existing 2s polling loop.

**Independent Test**: Open two tabs — draw in the drawer tab, confirm strokes appear in the guesser tab within 2s; click Clear, confirm blank canvas appears in guesser tab.

### Implementation

- [x] T009 [US1] Implement `addStroke(code, participantId, stroke)` and `clearCanvas(code, participantId)` store functions in `backend/src/services/roomStore.ts` — each calls `checkRoundExpiry`, guards non-drawer (403), non-playing (409), then mutates `room.strokes`
- [x] T010 [P] [US1] Add `POST /:code/draw` and `POST /:code/clear` route handlers in `backend/src/api/rooms.ts` using `addStrokeSchema` / `clearCanvasSchema`
- [x] T011 [P] [US1] Add `addStroke(code, participantId, stroke)` and `clearCanvas(code, participantId)` methods to `api` object in `frontend/src/services/api.ts`
- [x] T012 [US1] Add `addStroke(stroke: Stroke)` and `clearCanvas()` methods to `RoomStore` class in `frontend/src/state/roomStore.ts` using stored `room.code` and `participantId`
- [x] T013 [US1] Implement interactive drawer `<canvas>` in `frontend/src/pages/GamePage.tsx`: `mouseDown`/`mouseMove`/`mouseUp` event handlers that accumulate points and call `roomStore.addStroke()` on `mouseUp`; "Clear" button calling `roomStore.clearCanvas()`; shown only when `isDrawer`
- [x] T014 [P] [US5] Implement read-only guesser canvas in `frontend/src/pages/GamePage.tsx`: render each stroke in `room.gameState.strokes` onto a `<canvas>` element using `lineTo`; re-render whenever `room.gameState.strokes` changes; shown only when `!isDrawer`
- [x] T015 [P] [US1] Add backend unit tests for `addStroke` (happy path, non-drawer 403, round-not-active 409) and `clearCanvas` (happy path, non-drawer 403) in `backend/src/services/roomStore.test.ts`

**Checkpoint**: US1 + US5 complete — drawer draws, guessers see it via polling

---

## Phase 4: US2 (P1) — Guesser Submits a Guess

**Goal**: Guessers can type and submit a word; empty/whitespace guesses are rejected; guesses are case-insensitively compared to the secret word; a guesser is locked out after a correct guess.

**Independent Test**: As a guesser, submit an empty guess (rejected), submit a wrong guess (recorded, score stays 0), submit the correct word in any casing (recorded as correct); attempt a second guess — rejected with "Already guessed correctly".

### Implementation

- [x] T016 [US2] Implement `submitGuess(code, participantId, text)` in `backend/src/services/roomStore.ts`: call `checkRoundExpiry`; guard room-not-found (404), drawer-is-guesser (403), round-not-active (409), already-correct (409); trim `text`, reject empty (400); compare case-insensitively; record `Guess`; if correct: increment `scores[participantId]` by 100 and push to `correctGuessers`; return the `Guess`
- [x] T017 [P] [US2] Add `POST /:code/guess` route handler in `backend/src/api/rooms.ts` using `submitGuessSchema`; responds `200 { guess }` or passes `HttpError` to `next`
- [x] T018 [P] [US2] Add `submitGuess(code, participantId, text)` method to `api` object in `frontend/src/services/api.ts`
- [x] T019 [US2] Add `submitGuess(text: string)` method to `RoomStore` class in `frontend/src/state/roomStore.ts`
- [x] T020 [US2] Update `frontend/src/components/GuessForm.tsx`: accept `onSubmit: (text: string) => void` prop and call it on form submit with input value; clear input after submit
- [x] T021 [US2] Wire `<GuessForm>` in `frontend/src/pages/GamePage.tsx`: pass `onSubmit` calling `roomStore.submitGuess(text)`; set `disabled` when `!isGuesser`, `room.gameState?.correctGuessers.includes(participantId)`, or `room.status === "ended"`
- [x] T022 [P] [US2] Add backend unit tests for `submitGuess` in `backend/src/services/roomStore.test.ts`: trim applied; empty/whitespace → 400; drawer-cannot-guess → 403; round-not-active → 409; expired round → 409; correct guess recorded and scored; incorrect guess recorded with score unchanged; second correct guess → 409 lockout
- [x] T023 [P] [US2] Add Zod schema unit tests for `submitGuessSchema`, `addStrokeSchema`, `clearCanvasSchema` in `backend/src/api/schemas.test.ts`

**Checkpoint**: US2 complete — guessers can submit and invalid submissions are rejected

---

## Phase 5: US3 (P2) — Correct Guess Scores 100 Points

**Goal**: The scoreboard reflects current scores for all players; correct guesses show +100; all players see the live scoreboard.

**Independent Test**: As a guesser with score 0, submit the correct word — scoreboard updates to 100 within the next poll. Submit an incorrect guess — scoreboard stays at 0.

### Implementation

- [x] T024 [US3] Implement `<Scoreboard>` component in `frontend/src/components/Scoreboard.tsx`: accept `scores: Array<{ participantId: string; score: number }>` and `participants: Participant[]` props; render each participant's name alongside their score in descending score order
- [x] T025 [US3] Wire `<Scoreboard>` into `frontend/src/pages/GamePage.tsx`: pass `room.gameState.scores` and `room.participants`; display placeholder when `gameState` is null

**Checkpoint**: US3 complete — scores visible to all players, updating via polling

---

## Phase 6: US4 (P2) — All Players See Updated Guess History

**Goal**: A running list of all guesses (correct and incorrect) is visible to all players, updated via the existing polling loop.

**Independent Test**: Submit two guesses from one client — both appear in order on all clients within 2s; correct guesses show a visual indicator distinguishing them from incorrect ones.

### Implementation

- [x] T026 [US4] Implement `<ResultPanel>` component in `frontend/src/components/ResultPanel.tsx`: accept `guesses: Guess[]` and `participants: Participant[]` props; render each guess in submission order with the guesser's name, their text, and a correct/incorrect indicator
- [x] T027 [US4] Wire `<ResultPanel>` into `frontend/src/pages/GamePage.tsx`: pass `room.gameState.guesses` and `room.participants`; display placeholder when `gameState` is null

**Checkpoint**: US4 complete — all players see the full shared guess feed

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Timer display, round-end state, locked-out UX, silent polling resilience, and end-to-end validation.

- [x] T028 Add round timer countdown to `frontend/src/pages/GamePage.tsx`: derive remaining seconds from `gameState.roundEndsAt - Date.now()`; update via `setInterval(1000)` effect; display as "Time: 42s" next to the room badge
- [x] T029 Add "Round ended" state to `frontend/src/pages/GamePage.tsx`: when `room.status === "ended"`, disable `<GuessForm>` and canvas interactions; display final scores and the revealed secret word for all players (FR-016, FR-017, SC-008)
- [x] T030 Run the "Manual smoke test" section in `specs/003-gameplay-interaction/quickstart.md` end-to-end: create room, join as guesser, start game, draw strokes, verify guesser sees them, submit correct guess, verify score updates to 100, wait for timer expiry, verify round ends; also verify locked-out message ("You already guessed correctly!") and no-winner path per steps 7–11 (FR-009, SC-009, US6)
- [x] T031 [P] Verify `fetchRoomSilent` in `frontend/src/state/roomStore.ts` satisfies FR-018: confirm the `catch {}` block silently swallows errors and retains the last `room` state without setting an error or clearing the room; create `frontend/src/state/roomStore.test.ts` with a Vitest unit test that mocks `api.fetchRoom` to reject and asserts the store state is unchanged after `fetchRoomSilent()` returns

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately; T001, T002, T003 are parallel
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user story phases
- **Phase 3 (US1+US5)**: Depends on Phase 2
- **Phase 4 (US2)**: Depends on Phase 2; can start in parallel with Phase 3
- **Phase 5 (US3)**: Depends on Phase 4 (scoring logic lives in `submitGuess`)
- **Phase 6 (US4)**: Depends on Phase 4 (guess list populated by `submitGuess`)
- **Phase 7 (Polish)**: Depends on Phases 3–6

### User Story Dependencies

- **US1 + US5 (Phase 3)**: Can start immediately after Phase 2 — independent of guess submission
- **US2 (Phase 4)**: Can start immediately after Phase 2 — independent of canvas work
- **US3 (Phase 5)**: Depends on Phase 4 (backend scoring is inside `submitGuess`)
- **US4 (Phase 6)**: Depends on Phase 4 (guess history is populated by `submitGuess`)

### Within Each Phase

- Backend store function → route handler → frontend API method → store method → component wiring
- Tests are written alongside implementation (same phase, marked [P] where different files)

### Parallel Opportunities

- T001, T002, T003 (Phase 1) — different files
- T007, T008 within Phase 2 — different files from T004/T005/T006
- T010, T011, T015 within Phase 3 — different files from T009, T012, T013, T014
- T017, T018, T022, T023 within Phase 4 — different files from T016, T019, T020, T021
- T028, T029 within Phase 7 — same file but additive edits

---

## Parallel Example: Phase 3 (Canvas)

```
# Start these together after T009 completes:
T010: Add POST /draw and /clear route handlers in backend/src/api/rooms.ts
T011: Add addStroke/clearCanvas to api object in frontend/src/services/api.ts
T015: Add roomStore.test.ts tests for addStroke and clearCanvas

# Then sequentially (depend on T011):
T012: Add RoomStore methods in frontend/src/state/roomStore.ts
T013: Implement drawer canvas in frontend/src/pages/GamePage.tsx
T014: Implement guesser canvas in frontend/src/pages/GamePage.tsx
```

## Parallel Example: Phase 4 (Guess Submission)

```
# Start these together after T016 completes:
T017: Add POST /guess route handler in backend/src/api/rooms.ts
T018: Add submitGuess to api object in frontend/src/services/api.ts
T022: Add roomStore.test.ts tests for submitGuess
T023: Add schemas.test.ts tests for new schemas

# Then sequentially:
T019: Add RoomStore.submitGuess in frontend/src/state/roomStore.ts
T020: Update GuessForm component in frontend/src/components/GuessForm.tsx
T021: Wire GuessForm in frontend/src/pages/GamePage.tsx
```

---

## Implementation Strategy

### MVP First (Core Gameplay Loop)

1. Complete Phase 1 + Phase 2 (types + server foundation)
2. Complete Phase 3 (canvas — drawer draws, guessers see)
3. Complete Phase 4 (guess submission with scoring)
4. **STOP and VALIDATE**: Two-player smoke test per quickstart.md steps 1–7
5. Add Phase 5 + 6 (scoreboard + guess feed)
6. Add Phase 7 (timer, round-end state)

### Incremental Delivery

1. Setup + Foundational → server accepts all new endpoints
2. Phase 3 → visual drawing loop works
3. Phase 4 → full guess/score loop works (playable game)
4. Phase 5 + 6 → UI shows scores and history
5. Phase 7 → timer countdown and round-end display

---

## Notes

- `[P]` tasks target different files and have no blocking dependencies within the phase
- `[US1]`–`[US5]` labels map directly to user stories in `specs/003-gameplay-interaction/spec.md`
- Timer enforcement is server-side (check-on-access in `checkRoundExpiry`) — no `setTimeout`
- `GamePage.tsx` has many sequential tasks within phases 3–7; keep a single editor session open on that file to avoid merge conflicts
- All scoring logic lives in `submitGuess` — US3's frontend phase is purely the `<Scoreboard>` component
