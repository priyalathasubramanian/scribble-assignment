---
description: "Task list for Game Start & Drawer Flow (002)"
---

# Tasks: Game Start & Drawer Flow

**Input**: Design documents from `specs/002-game-start-drawer-flow/`

**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/api.md ✅, research.md ✅

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in every task description

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Apply model and type changes that all user stories depend on.

- [x] T001 Add `currentDrawerId: string | null` and `secretWord: string | null` to `Room` interface in `backend/src/models/game.ts`
- [x] T002 Broaden `RoomStatus` type from `"lobby"` to `"lobby" | "playing"` in `backend/src/models/game.ts`
- [x] T003 Remove `roles: ParticipantRole[]` from `RoomSnapshot` interface and add `currentDrawerId: string | null` and `secretWord: string | null` to `RoomSnapshot` in `backend/src/models/game.ts`
- [x] T004 [P] Update `RoomSnapshot` interface in `frontend/src/services/api.ts`: remove `roles`, add `currentDrawerId: string | null` and `secretWord: string | null`, broaden `status` to `"lobby" | "playing"`

**Checkpoint**: Type changes applied; TypeScript compilation will surface all usages of removed/changed fields (expected — fixed in Foundational phase).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend service and schema changes — must be complete before any user story can be tested end-to-end.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Add `startGameSchema` to `backend/src/api/schemas.ts`: `z.object({ participantId: z.string().min(1, "participantId is required") })`
- [x] T006 Add `startGame(code: string, participantId: string)` function to `backend/src/services/roomStore.ts`: look up room by `code.toUpperCase()`; throw `HttpError(404)` if not found; throw `HttpError(403, "Only the host can start the game")` if `participantId !== room.hostId`; throw `HttpError(409, "Game already in progress")` if `room.status === "playing"`; set `room.status = "playing"`, `room.currentDrawerId = room.hostId`, `room.secretWord = STARTER_WORDS[0]`; save and return `cloneRoom(room)`
- [x] T007 Update `joinRoom` in `backend/src/services/roomStore.ts`: add guard before `createParticipant` — if `room.status === "playing"`, throw `HttpError(409, "Game already in progress")`; ensure `HttpError` is imported from `"../api/schemas.js"` at the top of `roomStore.ts` (the same import already used by `startGame` in T006)
- [x] T008 Update `toRoomSnapshot` in `backend/src/services/roomStore.ts`: remove `roles: [...STARTER_ROLES]`; add `currentDrawerId: room.currentDrawerId ?? null`; add `secretWord: (room.status === "playing" && viewerParticipantId === room.currentDrawerId) ? room.secretWord : null`
- [x] T009 Add `POST /:code/start` route handler to `backend/src/api/rooms.ts`: parse params with `roomCodeParamsSchema`, parse body with `startGameSchema`; call `startGame(code, participantId)`; on success respond `200` with `{ room: toRoomSnapshot(result, participantId) }`; pass errors to `next`
- [x] T010 No code change required in `backend/src/api/rooms.ts` for the join-409 path — confirm by reading the handler that: (a) `joinRoom` in the store throws `HttpError(409)` before returning, so `result` is never `null` for the playing-room case; (b) the existing `if (!result) throw new HttpError(404, …)` null-check remains correct and safe; (c) errors thrown in the store reach `next(error)` via the existing `try/catch`. No edits needed if these three conditions hold.
- [x] T011 Run `cd backend && npm test` to confirm existing backend tests still pass after model and store changes; fix any TypeScript compilation errors surfaced by T001–T004

**Checkpoint**: Backend fully updated — `POST /rooms/:code/start` exists; `GET /rooms/:code` returns `currentDrawerId` and `secretWord`; `POST /rooms/:code/join` returns 409 for playing rooms; `roles` removed from all responses.

---

## Phase 3: User Story 1 — Host Starts the Game (Priority: P1) 🎯 MVP

**Goal**: Host clicks Start Game → room transitions to `playing` → host navigates to `/game` → secret word visible to host on game page.

**Independent Test**: With 2 players in the lobby, host clicks "Start Game". Verify navigation to `/game`, secret word "rocket" displayed, `currentDrawerId` visible in browser network tab.

### Implementation for User Story 1

- [x] T012 [US1] Add `startGame(code: string, participantId: string)` method to `api` object in `frontend/src/services/api.ts`: call `POST /rooms/${encodeURIComponent(code)}/start` with `{ participantId }` body; return `Promise<{ room: RoomSnapshot }>`
- [x] T013 [US1] Add `startGame()` method to `RoomStore` class in `frontend/src/state/roomStore.ts`: inside `withLoading`, call `api.startGame(this.state.room.code, this.state.participantId ?? "")`, then `setRoomSnapshot(response.room)`; return `response`; guard: if `!this.state.room` return early
- [x] T014 [US1] Update `LobbyPage.tsx` in `frontend/src/pages/LobbyPage.tsx`: add `startError` state (`useState<string | null>(null)`); wire Start Game `onClick` to an async handler that calls `await roomStore.startGame()` then `navigate("/game")`; on catch set `startError` to the error message; render `startError` as an inline error message near the Start Game button; clear `startError` on successful navigate
- [x] T015 [US1] Replace the body of `GamePage.tsx` in `frontend/src/pages/GamePage.tsx` with a minimal game-state display: derive `isDrawer = room.currentDrawerId === participantId`; show participant list with "(Drawer)" badge next to the drawer; show `<p>Draw: {room.secretWord}</p>` for drawer and `<p>Guess the word!</p>` for guessers; remove imports of `GuessForm`, `ResultPanel`, `Scoreboard` (these scaffold components are unused in this scenario); retain the redirect-to-`/` guard if no room; add polling `useEffect` using `roomStore.fetchRoomSilent` at 2000ms (same pattern as `LobbyPage`)

**Checkpoint**: User Story 1 independently testable — host starts game, navigates to `/game`, sees "rocket"; Start Game failure shows inline error.

---

## Phase 4: User Story 2 — Drawer Sees the Secret Word (Priority: P1)

**Goal**: Drawer sees secret word; guessers see placeholder. Word visibility derived from `participantId === currentDrawerId` on both backend (via `toRoomSnapshot`) and frontend (`GamePage`).

**Independent Test**: Two browser tabs — Tab 1 (host/drawer) shows "rocket" on game page. Tab 2 (joiner/guesser) shows "Guess the word!" on game page. No API changes needed beyond what Phase 2 already implements; this phase is verification + any missing UI gap.

### Implementation for User Story 2

- [x] T016 [US2] Verify `GamePage.tsx` in `frontend/src/pages/GamePage.tsx` correctly hides `secretWord` for guessers: confirm the conditional `isDrawer ? <word display> : <placeholder>` is in place (from T015); no additional code expected — this is a verification checkpoint
- [x] T017 [US2] Add backend tests for `toRoomSnapshot` visibility in `backend/src/services/roomStore.test.ts`: assert `secretWord` is non-null for drawer and null for guesser when room is `playing`; assert `secretWord` is null for both roles when room is `lobby`; assert `roles` field is absent from snapshot; assert `currentDrawerId` equals `hostId` after `startGame`

**Checkpoint**: Two-tab manual test passes — drawer sees word, guesser does not. Backend tests confirm `toRoomSnapshot` visibility logic.

---

## Phase 5: User Story 3 — Non-Host Participants Navigate to Game (Priority: P2)

**Goal**: When host starts the game, existing lobby polling detects `status: "playing"` and non-host participants automatically navigate to `/game`.

**Independent Test**: Two browser tabs — Tab 1 (host) clicks Start Game and navigates to `/game`. Within 2 seconds, Tab 2 (joiner) automatically navigates from `/lobby` to `/game`.

### Implementation for User Story 3

- [x] T018 [US3] Update `LobbyPage.tsx` in `frontend/src/pages/LobbyPage.tsx`: add a `useEffect` that watches `room?.status` — if `room?.status === "playing"`, call `navigate("/game")`; declare this effect **after** the existing null-room redirect effect and after the polling effect (effects run in declaration order; the null-room guard must fire before the status-change navigate); dependency array: `[room?.status, navigate]`

**Checkpoint**: All 3 user stories independently functional. Non-host navigates automatically within 2s of host starting.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, cleanup, and test validation.

- [x] T019 [P] Run `cd backend && npm test` — confirm all backend tests pass including new `startGame` tests added in T017
- [x] T020 [P] Run `cd frontend && npm run build` — confirm TypeScript compilation clean with updated `RoomSnapshot` type (no `roles`, new `currentDrawerId`/`secretWord` fields, broadened `status`)
- [ ] T021 Follow `specs/002-game-start-drawer-flow/quickstart.md` manual validation steps: happy path (2-tab start + word visibility), host-only enforcement, join-during-play rejection, Start Game error display, page refresh recovery

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (type changes must exist before store/route changes reference new fields)
- **US1 (Phase 3)**: Depends on Foundational — needs `startGame` in store + `POST /:code/start` endpoint
- **US2 (Phase 4)**: Depends on Phase 3 — `GamePage` word visibility is implemented in T015 (US1); this phase verifies and adds backend tests
- **US3 (Phase 5)**: Depends on US1 (polling infrastructure) and US2 (game page exists) — status-change navigate added last to avoid premature navigation
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — `startGame` API + store + LobbyPage wiring + GamePage minimal display
- **US2 (P1)**: Depends on US1 — `GamePage` (T015) already implements the visibility logic; T016/T017 verify it
- **US3 (P2)**: Depends on US1 (LobbyPage exists) — adds the `room.status` watcher to trigger navigate

### Parallel Opportunities

```bash
# Phase 1 — T001/T002/T003 touch same file (sequential); T004 is a different file:
T001: backend/src/models/game.ts  (sequential with T002, T003)
T002: backend/src/models/game.ts  (sequential)
T003: backend/src/models/game.ts  (sequential)
T004: frontend/src/services/api.ts  ← [P] with T001 (different file)

# Phase 2 — T005 (schemas) can run with T006-T008 (roomStore) in parallel:
T005: backend/src/api/schemas.ts     [P with T006-T008]
T006: backend/src/services/roomStore.ts  (sequential T006→T007→T008)
T009: backend/src/api/rooms.ts       (after T005 + T006)
T011: tests (after T009)

# Phase 3+4 — T012 (api.ts) can run parallel with T013 (roomStore.ts):
T012: frontend/src/services/api.ts   [P with T013]
T013: frontend/src/state/roomStore.ts [P with T012]
T014: frontend/src/pages/LobbyPage.tsx (after T013)
T015: frontend/src/pages/GamePage.tsx  [P with T014 — different file]

# Phase 6:
T019: backend tests   [P with T020]
T020: frontend build  [P with T019]
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T011)
3. Complete Phase 3: User Story 1 (T012–T015)
4. **STOP and VALIDATE**: Host starts game; navigates to `/game`; sees "rocket"; Start Game error shown on failure
5. Continue to US2 verification (T016–T017) and US3 navigation (T018)

### Incremental Delivery

1. Setup + Foundational → Backend API complete; frontend types updated
2. US1 → Host flow end-to-end (start + navigate + word display)
3. US2 → Guesser word-hiding verified (backend tests + manual)
4. US3 → Non-host auto-navigate via polling
5. Polish → Tests + build + quickstart walkthrough

---

## Notes

- `[P]` tasks = different files, no unresolved dependencies
- T010 is a verification task (no code to write if the store throws correctly)
- T016 is a verification checkpoint (no new code expected if T015 is correct)
- `GamePage.tsx` existing scaffold imports (`GuessForm`, `ResultPanel`, `Scoreboard`) are removed in T015 — they are unused in Scenario 2; Scenario 3 spec will re-introduce them
- The `/game` route is already registered in `frontend/src/routes/index.tsx` — no routing change needed
- `startGame` in `frontend/src/state/roomStore.ts` uses `withLoading` (unlike `fetchRoomSilent`) because the host needs the loading state to disable the button during the request
