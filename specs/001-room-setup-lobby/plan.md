# Implementation Plan: Room Setup & Lobby

**Branch**: `scribble` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-room-setup-lobby/spec.md`

---

## Summary

Extend the existing room creation and join scaffold to add host tracking, player
name validation (reject empty/whitespace), automatic lobby polling at ~2s, and
host-only Start Game button gating. All changes are additive to existing files;
no new routes, no new libraries, no architectural changes.

---

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js 18+ (backend); TypeScript 5.x, React 18 (frontend)

**Primary Dependencies**: Express 4.x + Zod (backend); React + React Router v6 (frontend)

**Storage**: In-memory `Map<string, Room>` — no database

**Testing**: Vitest (backend + frontend)

**Target Platform**: Local development (localhost:3001 backend, localhost:5173 frontend)

**Project Type**: Web application (backend API + frontend SPA)

**Performance Goals**: Lobby poll latency < 2s; create/join < 5s on local network

**Constraints**: No WebSockets, no DB, no auth, no new libraries; extend existing files only

**Scale/Scope**: Single-session local game; 2–10 players per room

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. In-Memory Simplicity | ✅ Pass | `Room` stored in `Map`; `hostId` is a string field, not a new collection |
| II. Polling Over Real-Time | ✅ Pass | `setInterval` at 2000ms in `LobbyPage`; no WebSockets |
| III. No Authentication | ✅ Pass | `participantId` is identity; `isHost` is computed server-side from it |
| IV. Spec Kit Discipline | ✅ Pass | spec → clarify → plan → tasks → implement sequence followed |
| V. Minimal Abstraction | ✅ Pass | No new patterns; one new field on `Room`, one new field on `RoomSnapshot` |

No violations. No Complexity Tracking entries required.

---

## Project Structure

### Documentation (this feature)

```text
specs/001-room-setup-lobby/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── api.md           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks)
```

### Source Code (files touched by this feature)

```text
backend/
└── src/
    ├── models/
    │   └── game.ts              # Add hostId to Room; add isHost to RoomSnapshot
    ├── services/
    │   └── roomStore.ts         # Set hostId on createRoom; compute isHost in
    │                            # toRoomSnapshot; normalise code in store
    └── api/
        ├── schemas.ts           # playerName: .trim().min(1) on create + join schemas
        └── rooms.ts             # Remove duplicate .toUpperCase(); update 404 message

frontend/
└── src/
    ├── services/
    │   └── api.ts               # Add isHost: boolean to RoomSnapshot type
    ├── state/
    │   └── roomStore.ts         # Add fetchRoomSilent() for polling (no loading state)
    └── pages/
        └── LobbyPage.tsx        # Replace manual-only refresh with setInterval poll;
                                 # conditional Start Game / waiting message render
```

**Structure Decision**: Web application (Option 2). No new files. No new directories.

---

## File-Level Change Plan

### 1. `backend/src/models/game.ts`

- Add `hostId: string` to `Room` interface
- Add `isHost: boolean` to `RoomSnapshot` interface

### 2. `backend/src/services/roomStore.ts`

- `createRoom`: set `room.hostId = participant.id` before `rooms.set()`
- `joinRoom`: normalise `code` to `code.toUpperCase()` before `rooms.get()` (move from route handler)
- `toRoomSnapshot`: remove `void viewerParticipantId`; compute and return `isHost: viewerParticipantId === room.hostId`

### 3. `backend/src/api/schemas.ts`

- `createRoomSchema`: `playerName: z.string().trim().min(1, "Player name is required")`
- `joinRoomSchema`: same

### 4. `backend/src/api/rooms.ts`

- `POST /rooms/:code/join`: remove `.toUpperCase()` from code (now in store)
- `GET /rooms/:code`: remove `.toUpperCase()` from code (now in store)
- Join 404 message: change `"Unable to join room"` → `"Room not found"`

### 5. `frontend/src/services/api.ts`

- Add `isHost: boolean` to `RoomSnapshot` interface

### 6. `frontend/src/state/roomStore.ts`

- Add `fetchRoomSilent()`: calls `api.fetchRoom` without `withLoading`; on success calls `setRoomSnapshot`; on error swallows silently (no state update, no throw)

### 7. `frontend/src/pages/LobbyPage.tsx`

- Add `useEffect`: `setInterval(() => roomStore.fetchRoomSilent(), 2000)` — cleared on unmount
- Replace Start Game button with conditional:
  - `room.isHost === true` + `participants.length >= 2` → enabled button (no-op onClick)
  - `room.isHost === true` + `participants.length < 2` → disabled button with helper text
  - `room.isHost === false` → "Waiting for host to start…" paragraph

---

## Data Flow

```
[Create Room]
  Browser → POST /rooms { playerName }
         ← 201 { participantId, room: { ...isHost: true } }
  Store: setRoomSession → room + participantId saved in RoomStore

[Join Room]
  Browser → POST /rooms/:code/join { playerName }
         ← 200 { participantId, room: { ...isHost: false } }
  Store: setRoomSession → room + participantId saved in RoomStore

[Lobby Polling — every 2s]
  setInterval → GET /rooms/:code?participantId=...
             ← 200 { room: { participants: [...updated], isHost: bool } }
  Store: setRoomSnapshot → participants list updated silently
  LobbyPage re-renders via useSyncExternalStore

[Start Game Button State]
  isHost=true  + participants.length >= 2 → enabled  (no-op onClick for Scenario 1)
  isHost=true  + participants.length < 2  → disabled + helper text
  isHost=false                            → "Waiting for host to start…"
```

---

## Complexity Tracking

> No constitution violations — this section is intentionally empty.
