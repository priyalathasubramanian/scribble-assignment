# Quickstart: Game Start & Drawer Flow

## Prerequisites

Both servers running:

```bash
# Terminal 1
cd backend && npm run dev   # http://localhost:3001

# Terminal 2
cd frontend && npm run dev  # http://localhost:5173
```

---

## Happy Path: Start Game and Verify Drawer/Guesser Visibility

**Setup**: Open two browser tabs — Tab 1 (host), Tab 2 (joiner).

1. **Tab 1**: Navigate to `http://localhost:5173`, click "Create Room", enter name "Alice", submit.
   - Expected: Lobby page with room code (e.g. `ABCD`), "Start Game" button disabled (1 player).

2. **Tab 2**: Navigate to `http://localhost:5173`, click "Join Room", enter name "Bob" and the code from Tab 1, submit.
   - Expected: Tab 2 shows Lobby page. Tab 1 auto-refreshes within 2s and shows both "Alice" and "Bob".

3. **Tab 1**: "Start Game" button is now enabled. Click it.
   - Expected: Tab 1 navigates to `/game`. The secret word "**rocket**" is displayed prominently.

4. **Tab 2**: Wait up to 2 seconds (one poll cycle).
   - Expected: Tab 2 navigates automatically from `/lobby` to `/game`. The secret word is **not** shown; a placeholder message appears instead.

5. **Tab 1** game page: Verify "Alice (Drawer)" or similar drawer label is visible.
6. **Tab 2** game page: Verify "Bob (Guesser)" or similar guesser label; no word visible.

---

## Validation: Host-Only Start Enforcement

1. Copy the room code and host's participantId (from browser network tab or note on create).
2. Open a new browser tab and use the browser dev console to call:
   ```javascript
   fetch('/rooms/ABCD/start', {
     method: 'POST',
     headers: {'Content-Type':'application/json'},
     body: JSON.stringify({ participantId: '<BOB_PARTICIPANT_ID>' })
   }).then(r => r.json()).then(console.log)
   ```
   - Expected: `{ "message": "Only the host can start the game" }` with HTTP 403.

---

## Validation: Join During Active Game Rejected

1. Start a game as above (room in `playing` state).
2. Open a third browser tab, navigate to Join Room, enter any name and the same room code, submit.
   - Expected: Error message "Game already in progress" is shown; tab stays on Join Room page.

---

## Validation: Start Game Error Display

1. In a lobby with 2 players, simulate a failure by stopping the backend (`Ctrl+C`).
2. Host clicks "Start Game".
   - Expected: An inline error message appears in the lobby (e.g. "Failed to start game" or the network error message). The Start Game button remains visible.

---

## Validation: Page Refresh Recovery

1. While on the game page, press `F5`/refresh.
   - Expected: Page redirects to `/` (the start page), because room state is lost on frontend refresh (in-memory only — Principle I).

---

## API Smoke Tests (curl)

```bash
# Create room
curl -s -X POST http://localhost:3001/rooms \
  -H 'Content-Type: application/json' \
  -d '{"playerName":"Alice"}' | jq .

# Join room (replace ABCD and save both participantIds)
curl -s -X POST http://localhost:3001/rooms/ABCD/join \
  -H 'Content-Type: application/json' \
  -d '{"playerName":"Bob"}' | jq .

# Start game (replace ABCD and ALICE_ID)
curl -s -X POST http://localhost:3001/rooms/ABCD/start \
  -H 'Content-Type: application/json' \
  -d '{"participantId":"ALICE_ID"}' | jq .

# GET snapshot as drawer — secretWord should be "rocket"
curl -s "http://localhost:3001/rooms/ABCD?participantId=ALICE_ID" | jq .room.secretWord

# GET snapshot as guesser — secretWord should be null
curl -s "http://localhost:3001/rooms/ABCD?participantId=BOB_ID" | jq .room.secretWord
```
