<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned template) → 1.0.0
Modified principles: All placeholders replaced (first population)
Added sections: Core Principles (I–V), Tech Constraints, Development Workflow, Governance
Removed sections: N/A (first population)
Templates requiring updates:
  ✅ plan-template.md — Constitution Check gates align with principles below
  ✅ spec-template.md — Functional requirements format consistent with FR-XXX style
  ✅ tasks-template.md — Phase structure and parallel markers align with workflow
Follow-up TODOs: None — all fields resolved from project context
-->

# Scribble Constitution

## Core Principles

### I. In-Memory Simplicity (NON-NEGOTIABLE)

The backend MUST use only in-memory data structures (JavaScript Maps/Arrays).
No database, no file-based persistence, no external storage of any kind is permitted.
State resets on server restart; this is acceptable and expected.

**Rationale**: The assignment explicitly forbids databases to keep focus on API
design, polling patterns, and game state logic rather than persistence concerns.

### II. Polling Over Real-Time

The frontend MUST use HTTP polling (interval-based GET requests) to synchronize
state. No WebSockets, Server-Sent Events, or any push mechanism is permitted.
Polling interval MUST be ≤ 2 seconds in active game/lobby screens.

**Rationale**: WebSockets are forbidden by the assignment constraints. Polling
teaches the tradeoffs of stateless HTTP for multi-player synchronization.

### III. No Authentication

The system MUST NOT implement authentication, sessions, JWT, OAuth, or any
identity verification. Participant identity is scoped to a single in-memory
participantId returned at join/create time. Clients are trusted with their own
participantId.

**Rationale**: Auth is explicitly out of scope. Adding it creates scope creep
and obscures the game logic the assignment is designed to teach.

### IV. Spec Kit Artifact Discipline

Every feature group MUST have corresponding entries in spec.md, plan.md, and
tasks.md before implementation begins. Artifacts MUST be updated incrementally
as each feature group is completed. Discovery notes MUST document ≥ 3 incomplete
behaviors and ≥ 2 assumptions before planning begins.

**Rationale**: The assignment requires demonstrable Spec Kit workflow. Artifacts
are graded artifacts, not optional documentation.

### V. Minimal Abstraction

Code MUST solve the immediate requirement and no more. No repository patterns,
no dependency injection containers, no abstract base classes, no generics for
hypothetical future types. Helper functions are acceptable; frameworks-within-
frameworks are not.

**Rationale**: Over-engineering a learning scaffold obscures the core game logic
and makes the codebase harder to evaluate and extend.

## Tech Constraints

- **Language/Runtime**: TypeScript 5.x on Node.js 18+ (backend), TypeScript 5.x
  in Vite 5 + React 18 (frontend)
- **Backend framework**: Express 4.x with Zod validation — no other frameworks
- **Frontend routing**: React Router v6 — no other router
- **State (frontend)**: Custom store via `useSyncExternalStore` — no Redux,
  Zustand, MobX, or similar
- **Testing**: Vitest for both backend and frontend unit tests
- **Forbidden**: WebSockets, databases (any), auth libraries, CSS-in-JS libraries,
  component libraries (use existing app.css)
- **Word list**: Fixed seed — rocket, pizza, castle, guitar, sunflower
- **Roles**: drawer | guesser (seed data only, not user-configurable)

## Development Workflow

- Feature work MUST start from an up-to-date `scribble` branch
- Each feature group MUST follow the Spec Kit sequence:
  `/speckit-specify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-implement`
- Acceptance criteria in spec.md MUST be verified before marking a task done
- All Zod schemas for new request bodies MUST live in `backend/src/api/schemas.ts`
- New API endpoints MUST be added to `backend/src/api/rooms.ts` (or a new router
  file if logically distinct) and registered in `backend/src/api/router.ts`
- Frontend API calls MUST go through `frontend/src/services/api.ts` — no raw
  `fetch` calls in components or pages
- Polling logic MUST live in the relevant Page component or RoomStore method —
  not scattered across components

## Governance

This constitution supersedes all other development guidelines for this project.
Amendments require: (1) a documented reason, (2) a version bump per semantic
versioning, and (3) an updated Sync Impact Report prepended as an HTML comment.

All PRs to `main` MUST verify compliance with principles I–V before merge.
Complexity violations (e.g., adding a database) require explicit justification
in the plan.md Complexity Tracking table and instructor approval.

**Version**: 1.0.0 | **Ratified**: 2026-06-02 | **Last Amended**: 2026-06-02
