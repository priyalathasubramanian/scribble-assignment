---
description: "Task list for Room Setup & Lobby (001)"
---

# Tasks: Room Setup & Lobby

**Input**: Design documents from `specs/001-room-setup-lobby/`

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

- [x] T001 Add `hostId: string` to `Room` interface in `backend/src/models/game.ts`
- [x] T002 Add `isHost: boolean` to `RoomSnapshot` interface in `backend/src/models/game.ts`
- [x] T003 Add `isHost: boolean` to `RoomSnapshot` interface in `frontend/src/services/api.ts`

**Checkpoint**: Type changes committed; backend and frontend TypeScript will compile with the new fields.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Backend validation and normalisation — must be complete before any user story can be tested end-to-end.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Update `createRoomSchema` in `backend/src/api/schemas.ts`: change `playerName` from `z.string().optional()` to `z.string().trim().min(1, "Player name is required")`
- [x] T005 Update `joinRoomSchema` in `backend/src/api/schemas.ts`: same `.trim().min(1)` change as T004
- [x] T006 Update `createRoom` in `backend/src/services/roomStore.ts`: set `room.hostId = participant.id` before `rooms.set()` and include `hostId` in the `Room` object literal
- [x] T007 Update `joinRoom` in `backend/src/services/roomStore.ts`: normalise `code` to `code.toUpperCase()` before `rooms.get()` lookup (move from route handler)
- [x] T008 Update `toRoomSnapshot` in `backend/src/services/roomStore.ts`: remove `void viewerParticipantId`; return `isHost: viewerParticipantId === room.hostId`
- [x] T009 Update `POST /rooms/:code/join` handler in `backend/src/api/rooms.ts`: remove `.toUpperCase()` call on `code` (now handled in store); change 404 message from `"Unable to join room"` to `"Room not found"`
- [x] T010 Update `GET /rooms/:code` handler in `backend/src/api/rooms.ts`: remove `.toUpperCase()` call on `code` (now handled in store)

**Checkpoint**: Backend fully updated — `POST /rooms` and `POST /rooms/:code/join` reject empty names with 400; `GET /rooms/:code` returns `isHost` in snapshot; mixed-case join codes resolve correctly.

---

## Phase 3: User Story 1 — Create a Room as Host (Priority: P1) 🎯 MVP

**Goal**: A player creates a room, is marked as host, and sees the correct lobby state (Start Game disabled, 1 player).

**Independent Test**: POST `/rooms` with name "Alice" → response contains `isHost: true`; lobby renders Start Game button in disabled state with ≥1-player message.

### Implementation for User Story 1

- [x] T011 [US1] Fix test files broken by the schema change (playerName now required): in `backend/src/services/roomStore.test.ts` supply `playerName: "Alice"` to `createRoom` calls; in `backend/src/api/schemas.test.ts` update any test that passes an empty/missing `playerName` to expect a 400 error; assert `isHost: true` is present in the snapshot returned by `POST /rooms`; run `cd backend && npm test` to confirm all pass
- [x] T012 [US1] Update `frontend/src/pages/LobbyPage.tsx`: replace the unconditional Start Game `<button>` with a conditional render — if `room.isHost === true` AND `room.participants.length < 2`, render Start Game button with `disabled` attribute and a helper text "Need at least 2 players to start"; if `room.isHost === false`, render nothing for now (non-host waiting message is intentionally deferred to T017)
- [x] T013 [US1] Update `frontend/src/pages/CreateRoomPage.tsx`: add client-side trim + empty check on `playerName` before calling `roomStore.createRoom`; display error message if blank

**Checkpoint**: User Story 1 independently testable — create room, see host lobby, Start Game disabled with 1 player.

---

## Phase 4: User Story 2 — Join an Existing Room (Priority: P1)

**Goal**: A second player joins via room code, lobby updates within 2s, both players visible to each other.

**Independent Test**: Two browser tabs — Tab 1 creates room, Tab 2 joins; within 2s Tab 1's lobby shows both players without manual refresh; mixed-case code accepted.

### Implementation for User Story 2

- [x] T014 [US2] Update `frontend/src/pages/JoinRoomPage.tsx`: add client-side trim + empty check on both `playerName` and `code` fields before calling `roomStore.joinRoom`; display specific error message for each blank field
- [x] T015 [US2] Add `fetchRoomSilent()` method to `RoomStore` class in `frontend/src/state/roomStore.ts`: calls `api.fetchRoom(room.code, participantId)` without `withLoading` wrapper; on success calls `setRoomSnapshot(response.room)`; on error swallows silently (no state mutation, no throw)
- [x] T016 [US2] Update `frontend/src/pages/LobbyPage.tsx`: add `useEffect` that starts `setInterval(() => { roomStore.fetchRoomSilent() }, 2000)` on mount and returns a cleanup function that calls `clearInterval`; remove or keep the manual Refresh Room button (keep — no conflict)

**Checkpoint**: User Story 2 independently testable — two-tab manual test passes; joiner appears in host lobby within 2s; mixed-case code works; empty name/code rejected.

---

## Phase 5: User Story 3 — Host Starts the Game (Priority: P2)

**Goal**: Start Game button enabled for host when 2+ players present; non-host sees waiting message.

**Independent Test**: With 2 players in lobby — host sees enabled Start Game button; joiner sees "Waiting for host to start…"; clicking Start Game is a no-op (no navigation, no error).

### Implementation for User Story 3

- [x] T017 [US3] Update `frontend/src/pages/LobbyPage.tsx`: extend the Start Game conditional — if `room.isHost === true` AND `room.participants.length >= 2`, render Start Game button **enabled** with `onClick={() => {}}` (no-op); if `room.isHost === false`, render `<p>Waiting for host to start…</p>` in place of the button

**Checkpoint**: All 3 user stories independently functional — host gating correct; non-host sees waiting message; button is enabled with 2+ players.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verification, cleanup, and quickstart validation.

- [x] T018 [P] Run `cd backend && npm test` — confirm all backend tests pass with new validation rules
- [x] T019 [P] Run `cd frontend && npm test` — confirm all frontend tests pass; update `api.test.ts` fetch stubs if `RoomSnapshot` shape assertions need `isHost` field
- [ ] T020 Follow `specs/001-room-setup-lobby/quickstart.md` manual validation steps: happy path, name validation, code validation, host gating, multi-room isolation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (type changes must exist before store/route changes reference `hostId`)
- **US1 (Phase 3)**: Depends on Foundational — needs `isHost` in snapshot + name validation
- **US2 (Phase 4)**: Depends on Foundational — needs store normalisation + polling infrastructure
- **US3 (Phase 5)**: Depends on US1 and US2 — button gating requires `isHost` (US1) and polling (US2) both working
- **Polish (Phase 6)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependency on US2
- **US2 (P1)**: Can start after Foundational — no dependency on US1 (different files: JoinRoomPage, roomStore.fetchRoomSilent, LobbyPage polling)
- **US3 (P2)**: Depends on US1 (isHost render logic) and US2 (polling keeps participant count fresh)

### Within Each User Story

- Models/types before services
- Services before pages
- Backend before frontend (API contract must exist)

### Parallel Opportunities

```bash
# Phase 1 — all 3 tasks touch different files:
T001: backend/src/models/game.ts
T002: backend/src/models/game.ts  ← same file, run sequentially with T001
T003: frontend/src/services/api.ts  ← different file, can run with T001

# Phase 2 — T004/T005 can run in parallel (same file but different schema objects):
T004: createRoomSchema in schemas.ts
T005: joinRoomSchema in schemas.ts
T006/T007/T008: roomStore.ts (sequential — same file)
T009/T010: rooms.ts (sequential — same file)

# Phase 3+4 — US1 and US2 can proceed in parallel after Foundational:
US1: CreateRoomPage.tsx + LobbyPage.tsx (Start Game conditional)
US2: JoinRoomPage.tsx + roomStore.ts (fetchRoomSilent) + LobbyPage.tsx (polling)
Note: LobbyPage changes in T012/T016/T017 touch the same file — sequence within that file

# Phase 6:
T018 [P]: backend tests
T019 [P]: frontend tests — run together
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T003)
2. Complete Phase 2: Foundational (T004–T010)
3. Complete Phase 3: User Story 1 (T011–T013)
4. **STOP and VALIDATE**: Host can create room; Start Game disabled with 1 player; empty name rejected
5. Continue to US2 and US3

### Incremental Delivery

1. Setup + Foundational → Backend fully updated
2. US1 → Host creation + disabled Start Game button validated independently
3. US2 → Join + auto-polling validated independently (two-tab test)
4. US3 → Host gating + enabled button + waiting message validated
5. Polish → Tests pass + quickstart walkthrough complete

---

## Notes

- `[P]` tasks = different files, no unresolved dependencies
- `[Story]` label maps each task to its user story for traceability
- LobbyPage (T012, T016, T017) has sequential changes within the same file — implement in order
- No test tasks generated (not requested in spec); run existing tests after each phase as a sanity check
- Clicking Start Game is intentionally a no-op in this scenario — wired in Scenario 2
