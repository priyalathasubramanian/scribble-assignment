# Feature Specification: Room Setup & Lobby

**Feature Branch**: `scribble`

**Created**: 2026-06-02

**Status**: Implemented

**Input**: Scenario 1 — Room Setup & Lobby: the creator is automatically the host;
invalid/empty codes and names are rejected with clear feedback; rooms are fully
isolated; the lobby refreshes via polling (~2s); and only the host can start the
game once at least 2 players are present.

---

## Discovery Notes

### Incomplete Behaviors in the Scaffold

1. **No host concept** — `POST /rooms` creates a room and returns a `participantId`,
   but nothing in the `Room` or `RoomSnapshot` model marks who the host is. The lobby
   has a "Start Game" button with no enforcement.

2. **Empty player names silently accepted** — `createRoom` and `joinRoom` in the
   backend store accept an undefined/empty `playerName` and fall back to `"Player"`;
   no validation error is returned to the caller.

3. **Lobby uses manual refresh only** — `LobbyPage.tsx` has a "Refresh Room" button
   but no `setInterval` / automatic polling; players joining after the host loads the
   lobby are invisible until the host clicks refresh.

4. **Room-code lookup is case-sensitive in the store but case-insensitive in the
   route** — `joinRoom` in the backend normalises the code to uppercase in the route
   handler, but the store `Map` key is whatever `generateCode` produces; a mismatch
   is possible if keys are ever stored inconsistently.

5. **Start Game button visible to all participants** — there is no
   `isHost` field in the snapshot, so the frontend cannot conditionally show/hide
   or enable/disable the Start Game button based on role.

### Assumptions

1. A "host" is defined as the participant whose `participantId` was returned by
   `POST /rooms` (the creator). Host status does not transfer if the creator leaves.

2. A player name consisting solely of whitespace is treated as empty and rejected,
   matching the intent of the empty-name rule.

3. Room codes are always stored and compared as uppercase; the backend is the
   canonical source for normalisation.

4. Auto-polling starts as soon as the lobby mounts and stops when the component
   unmounts; the interval is approximately 2 seconds.

5. "At least 2 players" means the total participant count (including the host) is
   ≥ 2 before the host can start the game.

### Relevant Files

- `backend/src/models/game.ts` — `Room`, `RoomSnapshot`, `Participant` interfaces
- `backend/src/services/roomStore.ts` — `createRoom`, `joinRoom`, `getRoom`, `toRoomSnapshot`
- `backend/src/api/rooms.ts` — route handlers for POST /rooms, POST /rooms/:code/join, GET /rooms/:code
- `backend/src/api/schemas.ts` — Zod validation schemas
- `frontend/src/pages/LobbyPage.tsx` — lobby UI and refresh logic
- `frontend/src/pages/CreateRoomPage.tsx` — create room form
- `frontend/src/pages/JoinRoomPage.tsx` — join room form
- `frontend/src/services/api.ts` — HTTP client and shared types
- `frontend/src/state/roomStore.ts` — frontend state store

---

## User Scenarios & Testing

### User Story 1 — Create a Room as Host (Priority: P1)

A player opens Scribble, enters their name, and creates a new room. They are
immediately recognised as the host and taken to the lobby. The room has a unique
shareable code.

**Why this priority**: Host creation is the entry point for every game session;
nothing else can happen without it.

**Independent Test**: Navigate to Create Room, submit a valid name, verify a
room code is displayed in the lobby and a "Start Game" button is visible (and
disabled because only 1 player is present).

**Acceptance Scenarios**:

1. **Given** the Create Room page, **When** a player submits a non-empty name,
   **Then** a room with a unique 4-character code is created, the player is
   marked as host in the returned snapshot, and the lobby is shown.

2. **Given** the Create Room page, **When** a player submits an empty or
   whitespace-only name, **Then** a validation error message is displayed and
   no room is created.

3. **Given** a newly created room with only the host present, **When** the lobby
   renders, **Then** the "Start Game" button is visible but disabled with a
   message indicating at least 2 players are required.

---

### User Story 2 — Join an Existing Room (Priority: P1)

A second player receives a room code, opens Scribble, enters their name and
the code, and joins the host's room. The host's lobby updates within ~2 seconds
to show the new participant.

**Why this priority**: Without joiners, no game can start; join parity with create
is P1.

**Independent Test**: Open two browser tabs. Tab 1 creates a room. Tab 2 joins
with the code. Within 2 seconds, Tab 1's lobby should show both players without
any manual refresh.

**Acceptance Scenarios**:

1. **Given** an existing room code, **When** a player submits a valid name and
   the correct code, **Then** they are added to the room and taken to the lobby
   showing all current participants.

2. **Given** the Join Room page, **When** a player submits an empty/whitespace
   name or an empty/whitespace room code, **Then** a clear validation error is
   shown and the join request is not sent.

3. **Given** the Join Room page, **When** a player submits a room code that does
   not exist, **Then** the backend returns an error and the UI displays "Room not
   found" feedback.

4. **Given** the host is in the lobby, **When** a second player joins, **Then**
   within approximately 2 seconds the host's lobby updates to show the new
   participant without manual interaction.

---

### User Story 3 — Host Starts the Game (Priority: P2)

Once at least 2 players are in the lobby, the host can start the game. Non-host
participants see a "Waiting for host to start…" message instead of the Start
Game button.

**Why this priority**: Gating on P1 stories; game cannot start until room and
join work correctly.

**Independent Test**: With 2 players in the lobby, verify Start Game is enabled
only for the host and disabled/hidden for the joiner.

**Acceptance Scenarios**:

1. **Given** 2+ players in the lobby and the current viewer is the host,
   **When** the lobby renders, **Then** the "Start Game" button is enabled.

2. **Given** 2+ players in the lobby and the current viewer is NOT the host,
   **When** the lobby renders, **Then** the "Start Game" button is not visible;
   a "Waiting for host to start…" message is shown instead.

3. **Given** only 1 player (the host) in the lobby, **When** the lobby renders,
   **Then** the "Start Game" button is visible but disabled with a tooltip/message
   indicating more players are needed.

---

### Edge Cases

- What happens when a player submits a room code with mixed case (e.g. "ab1c")?
  → The system MUST normalise to uppercase before lookup; the join MUST succeed.
- What happens when two players attempt to join the exact same room simultaneously?
  → Both succeed; each receives a distinct `participantId`; the room snapshot
  reflects both.
- What happens when the backend is unreachable during polling?
  → The lobby MUST NOT crash; a silent retry on next interval is acceptable; a
  user-visible error may be shown but is not required.

---

## Requirements

### Functional Requirements

- **FR-001**: When a player creates a room with a valid non-empty name, the system
  MUST mark that player as the host in the room record and return `isHost: true`
  in the room snapshot.
- **FR-002**: The system MUST reject a create-room or join-room request where the
  player name is empty or contains only whitespace, returning a descriptive error
  message.
- **FR-003**: The system MUST reject a join-room request where the room code is
  empty, whitespace-only, or does not match any existing room, returning a
  descriptive error message.
- **FR-004**: Room codes MUST be normalised to uppercase by the backend before
  storage and lookup; the frontend MAY send mixed-case codes.
- **FR-005**: The lobby page MUST automatically poll the room endpoint at
  approximately 2-second intervals and update the participant list without
  requiring user interaction. On poll failure, the lobby MUST NOT crash or
  show a blank screen; silent retry on the next interval is sufficient.
- **FR-006**: The "Start Game" button MUST be visible only to the host and MUST
  be disabled when fewer than 2 participants are present. Clicking the button
  is out of scope for this scenario; the click handler is a no-op until wired
  in a subsequent scenario.
- **FR-007**: Non-host participants in the lobby MUST see a "Waiting for host to
  start…" status message in place of the Start Game button.
- **FR-008**: The `RoomSnapshot` returned by `GET /rooms/:code` MUST include an
  `isHost` flag for the requesting participant (determined by the `participantId`
  query parameter).
- **FR-009**: Rooms MUST be fully isolated — actions in one room MUST NOT affect
  any other room.

### Key Entities

- **Room**: Uniquely identified by a 4-character uppercase code; has a status
  (`lobby`), a list of participants, a designated host participant ID, creation
  and update timestamps.
- **Participant**: Has a unique ID, a display name, and a joined-at timestamp.
- **RoomSnapshot**: The read-only projection of Room state returned to clients;
  includes the participant list, room status, available words, roles, and an
  `isHost` flag scoped to the requesting participant.

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: A player can create a room and reach the lobby in under 5 seconds
  on a local network.
- **SC-002**: A second player can join using the room code and appear in the
  host's lobby within 4 seconds (2 poll cycles) of joining, with no manual
  refresh.
- **SC-003**: 100% of empty-name or empty-code submissions are rejected with a
  visible error message before any network request is made (client-side
  validation) or immediately after (server-side fallback).
- **SC-004**: The Start Game button state (enabled/disabled/hidden) correctly
  reflects host status and player count in 100% of lobby renders.
- **SC-005**: The lobby continues to function (no crash, no blank screen) if a
  poll request fails.

---

## Assumptions

- The host role is permanent for the lifetime of the room; there is no host
  transfer mechanism.
- Player names do not need to be unique within a room; two players may share
  the same display name.
- There is no maximum player count enforced in this scenario.
- The app runs in a single-tab context per player; cross-tab synchronisation
  is not required.
- All state is in-memory on the backend; room data is lost on server restart,
  which is acceptable.
- The frontend already has routing, API client, and state store scaffolded;
  this feature extends them rather than replacing them.

---

## Explicitly Out of Scope

The following are intentionally excluded from this scenario and the entire lab:

- WebSockets / real-time sync — HTTP polling only
- Databases / persistent storage — in-memory only
- Authentication / accounts / sessions
- Multiple rounds, drawer rotation, round timers, speed bonuses
- Custom or random word packs, spectator mode, room moderation
- Room passwords, invite links
- New state-management or routing libraries beyond what the starter ships
- Rewriting the starter from scratch — extend only
- Deployment, Docker, CI pipelines

---

## Clarifications

### Session 2026-06-02

- Q: Is triggering "Start Game" (API call + navigation) in scope for Scenario 1, or is the button just rendered in the correct state? → A: Out of scope — button renders correctly (enabled/disabled/hidden) but clicking it does nothing; wired up in the next scenario.
- Q: When polling fails, should the lobby show a visible error indicator or silently retry? → A: Silent retry only — no user-visible feedback required; SC-005 only mandates no crash and no blank screen.
