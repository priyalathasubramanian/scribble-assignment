# Research: Game Start & Drawer Flow

## Decision 1: `roles` array removal strategy

**Decision**: Remove `roles: ParticipantRole[]` from `RoomSnapshot` entirely (both backend model and frontend type). The `ParticipantRole` type (`"drawer" | "guesser"`) is retained as a TypeScript type alias for documentation purposes but is not serialised in any API response. Role is derived client-side by comparing `participantId === room.currentDrawerId`.

**Rationale**: Constitution Principle V (Minimal Abstraction) — the flat array carried no participant association, making it positionally fragile and redundant once `currentDrawerId` exists. Removing it reduces model surface and eliminates a class of sync bugs where `roles[0]` might not match `currentDrawerId`.

**Alternatives considered**:
- Keep `roles` populated in participant order → fragile positional coupling; rejected
- Replace with `Record<string, ParticipantRole>` map → heavier than needed; rejected

---

## Decision 2: `startGame` HTTP method and body

**Decision**: `POST /rooms/:code/start` with a JSON body `{ participantId: string }`. Returns the updated `RoomSnapshot` (status: "playing", currentDrawerId set).

**Rationale**: The host's `participantId` is needed to authorise the request (Principle III — no auth; participantId is the only identity token). Body is minimal; no schema complexity beyond `z.object({ participantId: z.string().min(1) })`.

**Alternatives considered**:
- Query param `?participantId=` — not idiomatic for a mutating action; rejected
- Header `X-Participant-Id` — unconventional for this stack; rejected

---

## Decision 3: Secret word selection

**Decision**: `STARTER_WORDS[0]` ("rocket") — the first entry of the existing `STARTER_WORDS` constant in `backend/src/seed/starterData.ts`. No randomness introduced.

**Rationale**: Constitution requires deterministic, testable behaviour without random seeds. Index 0 is maximally predictable; tests can assert `secretWord === "rocket"` with no setup.

**Alternatives considered**:
- `Math.random()` pick → non-deterministic; violates testability; rejected
- Hash of room code → clever but unnecessary complexity; rejected

---

## Decision 4: `joinRoom` status guard placement

**Decision**: Add the `playing` status check inside `joinRoom` in `roomStore.ts` (store layer), throwing an `HttpError(409, "Game already in progress")` before any participant is added.

**Rationale**: Consistent with Scenario 1 decision to place normalisation/validation at the store layer, not the route handler. The route handler receives a clean error and passes it to `next(error)`.

**Alternatives considered**:
- Check in the route handler → breaks the "store is the authoritative gatekeeper" pattern; rejected

---

## Decision 5: Lobby polling → auto-navigate for non-host

**Decision**: Extend the existing `fetchRoomSilent` polling `useEffect` in `LobbyPage.tsx`. After each silent fetch, check if `room.status === "playing"`. If so, call `navigate("/game")`. No separate polling loop needed.

**Rationale**: The 2-second polling interval is already running. Checking `.status` is a single conditional in the existing `useEffect` cleanup flow. Constitution Principle II mandates polling ≤2s; the existing interval already satisfies this.

**Alternatives considered**:
- Start a new polling loop in the host's Start Game handler → race condition between two intervals; rejected
- Navigate immediately on button click (host only) → still need polling for non-host; solution combined: host navigates on success, non-host detects via polling

---

## Decision 6: `GamePage.tsx` scope for Scenario 2

**Decision**: Replace the existing scaffolded `GamePage.tsx` body (which references unimplemented `GuessForm`, `ResultPanel`, `Scoreboard` components) with a minimal game-state display:
- Participant list with drawer badge
- Secret word for drawer / placeholder for guessers
- Polling via `fetchRoomSilent` `useEffect` (same pattern as `LobbyPage`)
- Redirect to `/` if no room in store

The scaffolded sidebar components (`GuessForm`, `ResultPanel`, `Scoreboard`) are deferred to Scenario 3. The `/game` route is already registered in `frontend/src/routes/index.tsx` — no `App.tsx` change needed.

**Rationale**: Spec states game page is "read-only display of game state for this scenario". Constitution Principle V prohibits adding future-facing scaffolding. The Scenario 3 spec will extend `GamePage` when those components are needed.

**Alternatives considered**:
- Keep scaffolded placeholders → imports of non-functional components add noise and TypeScript type risk; rejected
- Create a separate `GameLobbyPage` → unnecessary duplication; rejected
