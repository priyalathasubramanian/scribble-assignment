# Research: Gameplay Interaction

## Decision 1: Canvas state representation

**Decision**: Store strokes as `Stroke[]` where each `Stroke` is `{ points: Array<{x: number; y: number}> }`. One stroke corresponds to one mouseDown→mouseUp path. The drawer POSTs a completed stroke on mouseUp; the server appends it to `room.strokes`. Clear replaces `room.strokes` with `[]`.

**Rationale**: A flat array of point arrays is serialisable, diffable in tests, and requires no special canvas library on the server. Colour/line-width are intentionally omitted for MVP — black pen only matches Scribble's simplicity and avoids schema bloat.

**Alternatives considered**:
- SVG path strings → harder to test individual coordinates; rejected
- Replace-all-strokes on every draw event → excess data per mousemove tick; rejected
- Per-point streaming → excessive HTTP overhead; rejected

---

## Decision 2: Round timer strategy — check-on-access

**Decision**: `startGame()` records `roundStartedAt: string` (ISO timestamp) and `roundDurationSeconds: number` (60). No `setTimeout` or background process. Every mutating call (`submitGuess`, `addStroke`) and the `toRoomSnapshot` helper call `checkRoundExpiry(room)` first: if `Date.now() >= new Date(room.roundStartedAt).getTime() + room.roundDurationSeconds * 1000` then `room.status = "ended"`.

**Rationale**: Background timers are stateful, hard to test, and introduce async teardown problems in the in-memory store. Check-on-access is synchronous, deterministic, and testable by setting `roundStartedAt` to a past timestamp. Constitution Principle I (no external state) and Principle V (minimal abstraction) both point here.

**Alternatives considered**:
- `setTimeout` in `startGame()` → implicit async mutation; breaks unit test isolation; rejected
- Client-side-only timer → server still needs to reject late guesses; both sides need the timer; this handles server enforcement

---

## Decision 3: Game state delivery — extend `GET /rooms/:code` snapshot

**Decision**: Add `gameState: GameState | null` to `RoomSnapshot`. `gameState` is non-null when `status === "playing" | "ended"`. The existing `fetchRoomSilent` polling loop at 2s already runs in `GamePage` — extending it means one poll covers everything with no second interval.

**Rationale**: A separate `GET /rooms/:code/game-state` would require a second polling loop in `GamePage`, doubling network requests for no gain. The extended snapshot remains a single JSON payload. Constitution Principle II (polling ≤2s) is satisfied with no new interval.

**Alternatives considered**:
- Separate `GET /rooms/:code/game-state` endpoint → two parallel polling loops; rejected
- WebSocket subscription → forbidden by constitution Principle II; rejected

---

## Decision 4: Score representation — `Record<string, number>` in Room

**Decision**: `room.scores: Record<string, number>` keyed by participantId, initialised to `0` for every participant present when `startGame()` is called. Incremented by 100 on a correct guess. Serialised in `GameState` as `Array<{ participantId: string; score: number }>` for a stable ordering.

**Rationale**: A plain object lookup is O(1) and requires no helper. Serialising as an array in the snapshot keeps the frontend side simple (can `map()` directly). No per-participant score object beyond what is needed.

**Alternatives considered**:
- `Map<string, number>` → not JSON-serialisable; rejected
- Score embedded in `Participant` → requires mutating the `Participant` shape established in Scenario 1; rejected

---

## Decision 5: Guesser lockout — `correctGuessers: string[]`

**Decision**: `room.correctGuessers: string[]` holds participantIds of guessers who submitted a correct answer. `submitGuess` checks `room.correctGuessers.includes(participantId)` and throws `HttpError(409, "Already guessed correctly")` if true. On correct guess, push to `correctGuessers`.

**Rationale**: Array is JSON-serialisable and straightforward to test. The list is only appended to — never mutated in place — so it is safe to clone with `[...room.correctGuessers, participantId]`.

**Alternatives considered**:
- `Set<string>` → not JSON-serialisable; rejected
- Boolean field on `Participant` → mutates the shape from Scenario 1; rejected

---

## Decision 6: `RoomStatus` extended to `"lobby" | "playing" | "ended"`

**Decision**: Add `"ended"` to `RoomStatus`. Transition `"playing" → "ended"` occurs lazily via `checkRoundExpiry`. The `startGame` guard is updated to `room.status !== "lobby"` (rejects both `"playing"` and `"ended"` rooms).

**Rationale**: Clients need to distinguish "round in progress" from "round over" to show final scores and disable further guessing. The `GamePage` polling loop already checks `room.status`; adding `"ended"` gives it a clean transition to a results view without new fields.

**Alternatives considered**:
- Reuse `"playing"` with a boolean `roundEnded` flag → extra field; `"ended"` is more expressive; rejected
- Remove `"ended"` and rely on `roundEndsAt` timestamp comparison on the client → server still needs to reject guesses; server must track status; rejected

---

## Decision 7: Draw submission granularity — one `POST /rooms/:code/draw` per completed path

**Decision**: The drawer accumulates `{x, y}` points during a mouseDown→mouseMove→mouseUp sequence. On mouseUp, the client POSTs `{ participantId, stroke: { points } }` to `POST /rooms/:code/draw`. The server appends to `room.strokes`. Canvas clear is `POST /rooms/:code/clear` with `{ participantId }`.

**Rationale**: Sending one request per completed path keeps HTTP traffic low (no per-mousemove requests) while preserving stroke granularity for re-render on the guesser side. The server never needs to understand drawing order — strokes are append-only, replayed in index order.

**Alternatives considered**:
- POST per mousemove point → excessive traffic; rejected
- WebSocket stream → forbidden; rejected
- Single `POST /draw` with all current strokes (replace-all) → retransmits entire canvas state on every stroke; rejected

---

## Decision 8: Round duration constant

**Decision**: `ROUND_DURATION_SECONDS = 60`, exported from `backend/src/seed/starterData.ts` alongside `STARTER_WORDS`. Included in `RoomSnapshot.gameState.roundEndsAt` (computed ISO string = `roundStartedAt + 60_000ms`). Frontend derives the countdown from `roundEndsAt - Date.now()`.

**Rationale**: A single exported constant is the simplest testable source of truth. 60 seconds is the spec assumption. Keeping it next to `STARTER_WORDS` avoids a new file.

**Alternatives considered**:
- Configurable via env var → over-engineering for a single-round assignment; rejected
- Hard-coded `60` in `startGame()` body → magic number, harder to assert in tests; rejected

---

## Decision 9: Secret word reveal on round end — extend `toRoomSnapshot`

**Decision**: When `room.status === "ended"`, `toRoomSnapshot` returns `secretWord` to all viewers (not just the drawer). A single boolean flag `revealWord = room.status === "ended"` is added alongside the existing `isDrawer` check: `secretWord: isDrawer || revealWord ? room.secretWord : null`.

**Rationale**: The reveal is a visibility rule, not a data mutation. `toRoomSnapshot` already owns visibility logic (`isDrawer` check for playing). Adding one OR condition is the minimal change. No new endpoint, no new field, no new polling loop — the next poll after expiry delivers the reveal automatically.

**Alternatives considered**:
- Separate `GET /rooms/:code/result` endpoint → second polling loop; rejected
- Add a `revealedWord` field to `GameState` → duplicates `secretWord`; rejected
- Client-side reveal only — show word from a previous correct-guesser's knowledge → not all players may have it; rejected

---

## Decision 10: Polling failure behaviour — silent retry

**Decision**: `fetchRoomSilent` in `RoomStore` already catches errors silently and returns without updating state. No change needed. FR-018 documents this as the specified behaviour: retain last known state, retry on the next 2s interval, show no error to the player.

**Rationale**: A transient network blip should not disrupt gameplay. The polling interval is 2s — a single missed poll is invisible to users. Showing an error for a one-cycle failure would be noisy and alarming. Constitution Principle II mandates polling; silent retry is the expected pattern for polling architectures.

**Alternatives considered**:
- Show a "Reconnecting…" toast after N missed polls → adds complexity; rejected for MVP
- Exponential backoff → unnecessary for a local dev server; rejected
