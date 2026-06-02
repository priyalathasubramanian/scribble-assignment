# Quickstart: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-02

Use this guide to manually validate the feature after implementation.

---

## Prerequisites

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Open http://localhost:5173 in two browser tabs (Tab A = host, Tab B = joiner).

---

## Happy Path: Create and Join

**Tab A — Create Room**
1. Click "Create Room"
2. Enter name `Alice` → click Create
3. Verify: lobby shows room code badge, participant list shows `Alice`, Start Game button is visible but **disabled**

**Tab B — Join Room**
1. Click "Join Room"
2. Enter name `Bob` and the room code from Tab A (try lowercase) → click Join
3. Verify: lobby shows both Alice and Bob, Start Game button shows "Waiting for host to start…"

**Tab A — Watch auto-refresh**
1. Do NOT click Refresh Room
2. Within ~2 seconds, Alice's lobby should update to show Bob without any manual action

---

## Validation Checks

### Name Validation
1. On Create Room, submit with empty name → expect error message, no navigation
2. On Create Room, submit with spaces only → expect error message
3. On Join Room, submit with empty name → expect error message

### Code Validation
1. On Join Room, submit a non-existent code (e.g. `ZZZZ`) → expect "Room not found" error
2. On Join Room, submit the room code in lowercase → expect successful join

### Host Gating
1. With only Tab A in the lobby (1 player) → Start Game button disabled
2. After Tab B joins (2 players), Tab A → Start Game button enabled
3. Tab B → no Start Game button, shows "Waiting for host to start…"

### Multi-Room Isolation
1. Tab A creates room `AAAA`
2. Open Tab C, create a second room `BBBB`
3. Verify: each lobby shows only its own participants

---

## Automated Tests

```bash
# Backend unit tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test
```

Expected: all existing tests pass; new tests for validation and isHost field pass.
