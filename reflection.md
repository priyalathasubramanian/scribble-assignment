# Reflection

## What I built

A multiplayer Scribble drawing-and-guessing game implemented across four scenarios:

1. **Room Setup & Lobby** — create/join rooms via room code, lobby with participant list and host-controlled game start
2. **Game Start & Drawer Flow** — host starts game, drawer is assigned, word is selected from a fixed seed list
3. **Gameplay Interaction** — canvas drawing with stroke sync via polling, guess submission with scoring, 60-second round timer (check-on-access), round-over banner with word reveal
4. **Result, Restart & Final Validation** — results screen (correct word, cumulative scores, full guess history), host-only Play Again button, restart preserving players and accumulated scores, lobby showing per-player standings

## Technical decisions

**Polling over WebSockets**: The assignment constraint (no WebSockets) pushed me toward a 2-second polling loop in each active screen. This simplified the backend significantly — no connection management, no push infrastructure — but required careful thought about stale state and silent retry on failure. The `fetchRoomSilent` pattern (no error surface to user, retain last known state) handles transient failures cleanly.

**Lazy timer expiry**: Instead of a background `setInterval` on the server, the round timer is checked on every access (`checkRoundExpiry` called at the top of each store function and `toRoomSnapshot`). This keeps the backend stateless between requests and eliminates timer drift across server restarts. The tradeoff is that expiry is only noticed when a client polls — acceptable given the ≤2s polling interval.

**In-memory only**: No database meant all state lives in a `Map<string, Room>`. This forced a clean data model but also made me think carefully about what to clear on restart vs. what to preserve (scores and participants survive; round-specific fields don't). The `startGame` score-init patch to preserve cumulative scores across restarts was a non-obvious consequence of this design.

**Spec Kit workflow**: Working through spec → clarify → plan → tasks → analyze → implement gave me a forcing function to surface ambiguities early (e.g. the `RoomSnapshot.scores` field missing from the lobby phase, the `gameState` being null in lobby, the FR-010 `roundDurationSeconds` contradiction). The analysis step caught a real implementation blocker before writing any code.

## What I'd do differently

- Add a host re-assignment mechanism on disconnect — the current assumption that "restart is inaccessible if host disconnects" is a known limitation
- Word selection after restart always uses `STARTER_WORDS[0]` (rocket) — a rotating or random selection within the fixed seed would improve repeated-play experience
- The lobby "joined" vs score display could be unified from the start rather than added as FR-014 late in the process
