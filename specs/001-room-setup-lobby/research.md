# Research: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-02

---

## Decision 1: Host Tracking Strategy

**Decision**: Store `hostId` as a string field on the `Room` object, set to the first
participant's UUID at `createRoom` time. Expose `isHost: boolean` on `RoomSnapshot`,
computed by comparing `viewerParticipantId === room.hostId`.

**Rationale**: Minimal — one new field on the existing `Room` model. No new data
structure or lookup table needed. `hostId` never changes for the room's lifetime,
so no update logic required.

**Alternatives considered**:
- First participant in `participants[]` is always host — rejected because reordering
  or future participant removal would silently break host detection.
- Separate `hosts` Map — rejected as over-engineering (constitution Principle V).

---

## Decision 2: Player Name Validation

**Decision**: Add `.trim().min(1)` to both `createRoomSchema` and `joinRoomSchema`
Zod schemas. The frontend performs the same client-side check before sending the
request (trim + empty check). Backend is the authoritative validator.

**Rationale**: Zod's `.trim()` + `.min(1)` produces a clear, testable validation
error in one line. The existing error handler in `router.ts` already converts Zod
errors to HTTP 400 responses with descriptive messages. No new middleware needed.

**Alternatives considered**:
- Custom middleware — rejected; Zod already handles this with less code.
- Only client-side — rejected; backend is always the canonical validator per best
  practice and constitution Principle V.

---

## Decision 3: Room Code Normalisation

**Decision**: Normalise room code to uppercase inside `createRoom` and `joinRoom`
store functions (not in route handlers), so the Map key is always uppercase. Remove
the `.toUpperCase()` call from the route handlers to avoid dual-normalisation.

**Rationale**: The Map key must be canonical at the storage layer. Moving normalisation
into the store functions ensures consistency regardless of how the function is called.

**Alternatives considered**:
- Keep normalisation in route handler only — rejected; the store is the authority
  on room identity, not the HTTP layer.
- Case-insensitive Map — rejected; no standard JS Map supports this and a custom
  wrapper violates Principle V.

---

## Decision 4: Automatic Lobby Polling

**Decision**: Add a `useEffect` in `LobbyPage.tsx` that calls `roomStore.fetchRoom()`
on a `setInterval` of 2000 ms. The interval is cleared in the cleanup function.
The existing `withLoading` wrapper in `RoomStore` is bypassed for polling (to avoid
flicker); instead, `fetchRoom` updates the snapshot silently on success and swallows
errors (logs to console only) so the lobby never crashes.

**Rationale**: `setInterval` + cleanup is the idiomatic React pattern for polling.
The store already has a `fetchRoom()` method; no new method needed. Silent failure
on poll error satisfies SC-005 and the clarification (session 2026-06-02).

**Alternatives considered**:
- `setTimeout` recursive — functionally equivalent, marginally more complex; no
  benefit here.
- Polling in the store itself — rejected; constitution requires polling logic to
  live in the relevant Page component or RoomStore method, and the lobby is the
  natural owner since polling stops when the lobby unmounts.

---

## Decision 5: Start Game Button Gating

**Decision**: Read `isHost` from `RoomSnapshot`. If `isHost` is true, render the
Start Game button (disabled when `participants.length < 2`). If `isHost` is false,
render a "Waiting for host to start…" paragraph. The button's `onClick` is a no-op
in this scenario (wired in Scenario 2).

**Rationale**: The `isHost` field is already specified in FR-008. The frontend
already receives the snapshot on every poll cycle; no additional API call needed.
The conditional render is a single ternary in the JSX.

**Alternatives considered**:
- Separate `/rooms/:code/host` endpoint — rejected; redundant when `isHost` is in
  the snapshot.
- Local state for host detection — rejected; the server is authoritative on room
  membership.
