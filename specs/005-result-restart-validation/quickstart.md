# Quickstart: Result, Restart & Final Validation

**Branch**: `005-result-restart-validation` | **Date**: 2026-06-03

## Running the App

```bash
# From repo root — two terminals

# Terminal 1: backend
cd backend && npm run dev

# Terminal 2: frontend
cd frontend && npm run dev
```

Backend runs on `http://localhost:3001`, frontend on `http://localhost:5173`.

## Manual Test Path

1. Open two browser windows/tabs at `http://localhost:5173`
2. Window 1: Create a room, note the room code
3. Window 2: Join the room with the code
4. Window 1 (host): Start the game
5. Submit guesses (or let timer expire) to reach the `"ended"` state
6. Confirm both windows show the round-over banner with the correct word, all scores, and full guess history
7. Window 1 (host): Click "Play Again" — verify both windows return to the lobby
8. Confirm the lobby shows all players and cumulative scores are preserved
9. Window 2 (non-host): Confirm no "Play Again" button is visible
10. Start a second round and verify scores accumulate from the prior round

## Running Tests

```bash
# Backend unit tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test
```

## Key Files for This Feature

| File | Purpose |
|---|---|
| `backend/src/services/roomStore.ts` | `restartGame` function + modified `startGame` |
| `backend/src/api/schemas.ts` | `restartGameSchema` |
| `backend/src/api/rooms.ts` | `POST /:code/restart` route handler |
| `frontend/src/services/api.ts` | `api.restartGame` method |
| `frontend/src/state/roomStore.ts` | `RoomStore.restartGame()` method |
| `frontend/src/pages/GamePage.tsx` | "Play Again" button + lobby navigation on poll |
| `frontend/src/components/ResultPanel.tsx` | "No guesses were made." empty state |
