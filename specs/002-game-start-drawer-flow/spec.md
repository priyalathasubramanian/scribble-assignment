# Feature Specification: Game Start & Drawer Flow

**Feature Branch**: `scribble`

**Created**: 2026-06-02

**Status**: Draft

**Input**: Game Start & Drawer Flow — Given a game is starting and player names are trimmed
(empty/whitespace-only rejected with a message), When the first round begins, Then the host
(or first player) becomes the clearly-identified drawer, and the secret word (deterministically
selected from the starter list) is visible only to the drawer.

---

## Discovery Notes

### Incomplete Behaviors in the Scaffold

1. **Start Game button is a no-op** — `LobbyPage.tsx` renders the Start Game button with
   `onClick={() => {}}` from Scenario 1; clicking it does nothing. No API call, no route
   change, no game state created.

2. **No `POST /rooms/:code/start` endpoint** — The backend has no route to transition a room
   from `lobby` → `playing` status, assign the drawer role, or select the secret word.

3. **Drawer not tracked** — No field on `Room` or `RoomSnapshot` records which participant
   is drawing. The `roles: ParticipantRole[]` array in `RoomSnapshot` is always empty and
   will be removed; drawer identity is captured via `currentDrawerId` instead.

4. **Secret word selection is unimplemented** — `availableWords: string[]` is present in
   `RoomSnapshot` but always returns the full word list to everyone. No word is selected,
   and there is no per-participant word visibility.

5. **No game page or drawing page exists** — The frontend has no route or component to
   render the active game state after starting. Navigation from the lobby leads nowhere.

### Assumptions

1. The drawer for the first (and only) round is always the host — the participant whose
   `participantId` matches `room.hostId`.

2. The secret word is selected deterministically: the word at index 0 of the
   `availableWords` list (i.e., the first word in the fixed starter list: "rocket").
   This makes the selection predictable and testable without randomness.

3. A room can only be started by the host. If a non-host calls `POST /rooms/:code/start`,
   the backend returns a 403 error.

4. Once started, a room transitions from `lobby` → `playing`. This transition is
   one-way in this scenario; no restart mechanic is in scope here.

5. After starting, both the host (drawer) and joiners (guessers) navigate to a game
   page (`/game`). The game page layout is minimal — it shows participants, whether
   each is the drawer (derived from `currentDrawerId`), and (for the drawer only) the
   secret word.

6. The drawer sees the secret word clearly labelled. All other participants see a
   placeholder ("Waiting for drawer to start…" or similar) where the word would be.

### Relevant Files

- `backend/src/models/game.ts` — `Room`, `RoomSnapshot`, `Participant`, `RoomStatus`,
  `ParticipantRole` interfaces
- `backend/src/services/roomStore.ts` — `startGame`, `toRoomSnapshot` (to be extended)
- `backend/src/api/rooms.ts` — new `POST /rooms/:code/start` route handler
- `backend/src/api/schemas.ts` — `startGameSchema` (optional, body may be empty)
- `backend/src/api/router.ts` — registers the new endpoint
- `frontend/src/services/api.ts` — `startGame` HTTP client call + updated `RoomSnapshot`
- `frontend/src/state/roomStore.ts` — `startGame()` method
- `frontend/src/pages/LobbyPage.tsx` — wire Start Game button to `roomStore.startGame()`
- `frontend/src/pages/GamePage.tsx` — new page component for the active game
- `frontend/src/App.tsx` — register `/game` route

---

## Clarifications

### Session 2026-06-02

- Q: Should `roles: ParticipantRole[]` be retained and populated, or removed in favour of deriving all role information from `currentDrawerId`? → A: Remove `roles` field entirely; game page derives all role info from `currentDrawerId` alone.
- Q: If the Start Game API call fails, should the UI show an inline error message or silently ignore the failure? → A: Display an inline error message in the lobby (same pattern as refreshError).

---

## User Scenarios & Testing

### User Story 1 — Host Starts the Game (Priority: P1)

The host clicks "Start Game" in the lobby. The backend transitions the room to
`playing` status, assigns the host as the drawer, and selects the first word as
the secret. All clients navigate to the game page.

**Why this priority**: This is the entry point for all gameplay; nothing in Group 2
(or Groups 3–4) can be demonstrated without a started game.

**Independent Test**: With 2 players in the lobby, the host clicks Start Game.
Verify the room status changes to `playing`, the host's snapshot includes
`currentDrawerId` matching the host's participantId, and both clients navigate
to `/game`.

**Acceptance Scenarios**:

1. **Given** a lobby with 2+ players and the viewer is the host, **When** the host
   clicks "Start Game", **Then** `POST /rooms/:code/start` is called, the room
   transitions to `playing`, and the host is navigated to `/game`.

2. **Given** a lobby with fewer than 2 players, **When** the host clicks "Start Game"
   (button enabled only with 2+), **Then** the request is not sent (button is
   disabled); this is enforced on the client from Scenario 1.

3. **Given** a `playing` room, **When** `GET /rooms/:code` is called by any participant,
   **Then** the snapshot includes `status: "playing"` and a non-null `currentDrawerId`.

4. **Given** a non-host participant, **When** they call `POST /rooms/:code/start`,
   **Then** the backend returns a 403 error and the room remains in `lobby` status.

5. **Given** the host clicks "Start Game" and the request fails (network error, 409,
   or 403), **Then** an inline error message is shown in the lobby and the Start Game
   button remains visible and clickable for retry.

---

### User Story 2 — Drawer Sees the Secret Word (Priority: P1)

After the game starts, the drawer (host) sees the secret word prominently displayed
on the game page. Non-drawing participants see a masked placeholder.

**Why this priority**: Word visibility is the core information-asymmetry mechanic of
the game; without it, the game cannot proceed.

**Independent Test**: In a started game, the host's game page shows the secret word.
A second player's game page shows a placeholder instead of the word.

**Acceptance Scenarios**:

1. **Given** a started game and the viewer is the drawer, **When** the game page
   renders, **Then** the secret word (e.g., "rocket") is displayed clearly.

2. **Given** a started game and the viewer is NOT the drawer, **When** the game page
   renders, **Then** the secret word is NOT displayed; a placeholder message is shown
   instead (e.g., "Draw the secret word!" is not visible to guessers).

3. **Given** `GET /rooms/:code?participantId=<drawerId>`, **When** the room is
   `playing`, **Then** the response includes `secretWord: "rocket"` (or the selected
   word) in the snapshot for the drawer only.

4. **Given** `GET /rooms/:code?participantId=<guesserId>`, **When** the room is
   `playing`, **Then** the response does NOT include `secretWord` (or returns it as
   `null`) in the snapshot for a guesser.

---

### User Story 3 — Non-Host Participants Navigate to Game (Priority: P2)

When the host starts the game, the polling mechanism detects the status change.
Non-host participants are automatically navigated to `/game` within 2 seconds
without manual intervention.

**Why this priority**: Polling-based navigation is derived from infrastructure
already present (Scenario 1 lobby polling); correct behavior depends on US1 and US2
working first.

**Independent Test**: Two browser tabs — Tab 1 (host) starts the game. Within 2
seconds, Tab 2 (joiner) navigates from the lobby to `/game` automatically.

**Acceptance Scenarios**:

1. **Given** a joiner is on the lobby page and polling is active, **When** the host
   starts the game, **Then** within approximately 2 seconds the joiner's lobby
   detects `status: "playing"` and navigates to `/game`.

2. **Given** the game is in `playing` status, **When** the game page polls the room,
   **Then** the polling continues at the same interval to keep participant data fresh.

---

### Edge Cases

- What if the host starts the game and then a new player tries to join?
  → The backend MUST reject join requests for rooms in `playing` status with a
  clear error message ("Game already in progress").

- What if the game page is loaded directly (e.g., browser refresh) when no room
  state exists in the frontend store?
  → The game page MUST redirect to `/` (same pattern as LobbyPage with no room).

- What happens if a participant's `participantId` matches no participant in the room?
  → `GET /rooms/:code` with an unknown `participantId` MUST still return the room
  snapshot with `isHost: false` and `secretWord: null` — treating the caller as a
  non-privileged observer.

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST expose a `POST /rooms/:code/start` endpoint that
  transitions the room from `lobby` to `playing` status.
- **FR-002**: `POST /rooms/:code/start` MUST only succeed for the participant
  identified by the `participantId` in the request body who is also the room's host;
  non-host requests MUST be rejected with a 403 status and a descriptive error message.
- **FR-003**: On a successful start, the system MUST set `currentDrawerId` to the host's
  participant ID. The `roles: ParticipantRole[]` field MUST be removed from `RoomSnapshot`;
  all role determination is derived from `currentDrawerId` alone.
- **FR-004**: On a successful start, the system MUST deterministically select the
  secret word as the first entry in the fixed word list ("rocket"). The selected word
  MUST be stored on the room record.
- **FR-005**: `GET /rooms/:code` MUST include `secretWord` in the snapshot ONLY when
  the requesting participant is the drawer (determined by `participantId` query
  parameter matching `currentDrawerId`). For all other participants, `secretWord` MUST
  be `null` or absent.
- **FR-006**: `GET /rooms/:code` MUST include a `currentDrawerId` field in the snapshot
  when the room is in `playing` status, reflecting the drawer's participant ID.
- **FR-007**: The `RoomStatus` type MUST support at least `"lobby"` and `"playing"`.
  Any attempt to start an already-`playing` room MUST return a 409 (Conflict) error.
- **FR-008**: The frontend "Start Game" button in `LobbyPage.tsx` MUST be wired to call
  `POST /rooms/:code/start` with the host's `participantId` and navigate to `/game`
  on success.
- **FR-009**: The frontend MUST have a `/game` route rendering a `GamePage` component
  that displays the participant list, whether each participant is the drawer (derived by
  comparing their ID to `currentDrawerId`), and (for the drawer only) the secret word.
- **FR-010**: The lobby polling logic MUST detect a `status: "playing"` response and
  navigate non-host participants from `/lobby` to `/game` automatically.
- **FR-011**: `POST /rooms/:code/join` MUST reject join requests for rooms in `playing`
  status with a 409 status and a descriptive error message ("Game already in progress").
- **FR-012**: If `POST /rooms/:code/start` returns an error (any non-2xx response or
  network failure), the frontend MUST display an inline error message in the lobby. The
  Start Game button MUST remain visible and clickable so the host can retry.

### Key Entities

- **Room** (extended): Adds `currentDrawerId: string | null` (null when in lobby) and
  `secretWord: string | null` (null until game starts).
- **RoomSnapshot** (extended): Adds `currentDrawerId: string | null`,
  `secretWord: string | null` (only non-null for the drawer), and updates
  `status` to allow `"playing"`.
- **ParticipantRole** (type retained for reference): `"drawer"` | `"guesser"` — the
  `roles: ParticipantRole[]` array is removed from `RoomSnapshot`; roles are derived
  on the client by comparing `participantId` to `currentDrawerId`.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: The host can click "Start Game" and reach the game page in under 3
  seconds on a local network.
- **SC-002**: Non-host participants are automatically navigated to the game page
  within 4 seconds (2 poll cycles) of the host starting the game, without any
  manual action.
- **SC-003**: 100% of game page renders show the secret word to the drawer and hide
  it from all other participants, verified by two-tab manual test.
- **SC-004**: A non-host attempting to start the game (direct API call) receives a
  403 error 100% of the time.
- **SC-005**: A player attempting to join an in-progress game receives a clear error
  message 100% of the time.

---

## Assumptions

- The game has exactly one round; there is no round counter, timer, or rotation in
  this scenario.
- Word selection is index-0 of the fixed list ("rocket"), making it deterministic
  and testable without random seeds.
- The host is always the drawer for the first (and only) round; there is no drawer
  rotation.
- The game page is a read-only display of game state for this scenario; the canvas,
  guessing, and scoring are implemented in Scenarios 3 and 4.
- Polling on the game page uses the same `fetchRoomSilent` pattern established in
  Scenario 1, restarted with a `useEffect` in `GamePage`.
- The `participantId` is passed as a query parameter to `GET /rooms/:code` (same as
  Scenario 1) to determine word visibility.
- No server-side validation of room code format is added in this scenario (already
  handled in Scenario 1).

---

## Explicitly Out of Scope

- Round timers, countdowns, or automatic round advancement
- Drawer rotation or multiple rounds
- Canvas / drawing tools (Scenario 3)
- Guess submission, validation, or scoring (Scenario 3)
- Spectator mode, room moderation, room passwords
- WebSockets, SSE, or any push mechanism
- Persistent storage of any kind
