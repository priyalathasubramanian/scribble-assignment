# Quickstart: Gameplay Interaction

## What this feature adds

- **Canvas drawing**: The drawer sees a `<canvas>` element. Strokes are sent to the server on each mouseUp event. A "Clear" button wipes all strokes.
- **Canvas viewing**: Guessers see the same canvas re-rendered from the `gameState.strokes` array, refreshed by the existing 2s poll.
- **Guess submission**: Guessers type a word and submit it via `POST /rooms/:code/guess`. The server trims, validates, and scores the guess.
- **Round timer**: The round runs for 60 seconds from `startGame`. `roundEndsAt` is carried in `gameState`; clients can display a countdown. The server lazily transitions to `"ended"` on the next access.
- **Scoreboard & guess feed**: `gameState.scores` and `gameState.guesses` power the `Scoreboard` and `ResultPanel` components already scaffolded in the frontend.

---

## Running locally

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open `http://localhost:5173` in two browser tabs. Create a room in Tab 1 (host), join it in Tab 2 (guesser), then start the game from Tab 1.

---

## Manual smoke test

1. Host creates room → joins as drawer after "Start Game".
2. In the drawer tab: draw a few strokes → verify canvas renders.
3. Click "Clear" → canvas resets to blank.
4. In the guesser tab: wait ≤2s → strokes appear on guesser canvas.
5. Guesser submits wrong guess → appears in guess feed; score stays 0.
6. Guesser submits correct word ("rocket") → appears as correct; score updates to 100.
7. Guesser tries another guess → guess form shows "You already guessed correctly!" and is disabled.
8. Wait 60 seconds (or set `roundStartedAt` back 60s in a test) → status transitions to "ended".
9. Guesser tab: verify round-over banner appears showing "The word was rocket"; guess form is disabled.
10. Drawer tab: verify round-over banner appears with the same secret word; canvas is still visible (read-only).
11. Test no-winner path: in a fresh room, let the timer expire without any correct guesses → all scores remain 0; secret word is still revealed in the round-over banner.

---

## Key files changed

### Backend

| File | Change |
|---|---|
| `backend/src/models/game.ts` | Add `Stroke`, `Guess`, `GameState` types; extend `Room` with new fields; extend `RoomStatus` with `"ended"`; extend `RoomSnapshot` with `gameState` |
| `backend/src/seed/starterData.ts` | Export `ROUND_DURATION_SECONDS = 60` |
| `backend/src/services/roomStore.ts` | Add `submitGuess`, `addStroke`, `clearCanvas`, `checkRoundExpiry`; extend `startGame` and `toRoomSnapshot` |
| `backend/src/api/schemas.ts` | Add `submitGuessSchema`, `addStrokeSchema`, `clearCanvasSchema` |
| `backend/src/api/rooms.ts` | Add `POST /:code/guess`, `POST /:code/draw`, `POST /:code/clear` handlers |
| `backend/src/services/roomStore.test.ts` | Add tests for all new store functions |
| `backend/src/api/schemas.test.ts` | Add tests for new schemas |

### Frontend

| File | Change |
|---|---|
| `frontend/src/services/api.ts` | Add `Stroke`, `Guess`, `GameState` interfaces; extend `RoomSnapshot`; add `submitGuess`, `addStroke`, `clearCanvas` methods |
| `frontend/src/state/roomStore.ts` | Add `submitGuess`, `addStroke`, `clearCanvas` store methods |
| `frontend/src/pages/GamePage.tsx` | Add drawing canvas (drawer) / read-only canvas (guesser); round timer display; wire `GuessForm`, `Scoreboard`, `ResultPanel` |
| `frontend/src/components/GuessForm.tsx` | Wire `onSubmit` to `roomStore.submitGuess`; disable when not guesser or already correct or round ended |
| `frontend/src/components/Scoreboard.tsx` | Render `gameState.scores` with participant names |
| `frontend/src/components/ResultPanel.tsx` | Render `gameState.guesses` in order with correct/incorrect indicator |

---

## Tip: testing timer expiry without waiting

In a Vitest test, pass a `roundStartedAt` that is already 61 seconds in the past and call `checkRoundExpiry(room)` — the room status transitions to `"ended"` synchronously, no clock manipulation needed.
