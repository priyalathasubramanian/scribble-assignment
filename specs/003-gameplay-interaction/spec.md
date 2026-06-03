# Feature Specification: Gameplay Interaction

**Feature Branch**: `004-gameplay-interaction`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Gameplay Interaction — Given a round is active with a drawer and guessers (all scores start at 0), When the drawer draws/clears the canvas and guessers submit their guesses, Then the drawing is visible on the drawer's screen; guesses are trimmed, case-insensitively compared, and empty ones rejected; the guess history is synced to all players via polling; correct guesses score 100 (incorrect add 0)."

## Clarifications

### Session 2026-06-03

- Q: Is showing the live canvas state to guessers in scope for this Gameplay Interaction feature? → A: In scope — guessers poll for canvas state in this feature.
- Q: After a guesser submits a correct guess, can they submit further guesses for the rest of that round? → A: Locked out — no further guesses allowed once correct.
- Q: What ends a round? → A: A fixed time limit expires (timer-based).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Drawer Sees Their Own Canvas (Priority: P1)

As the drawer, I need to see my drawing rendered on screen as I draw, so I can know what I'm communicating to guessers.

**Why this priority**: Without canvas visibility for the drawer, the core game interaction is impossible. All other stories depend on drawing working first.

**Independent Test**: Can be tested by starting a round as drawer, drawing on the canvas, and confirming the strokes are visible on the drawer's screen.

**Acceptance Scenarios**:

1. **Given** an active round where I am the drawer, **When** I draw on the canvas, **Then** the drawing strokes are rendered locally on my screen without delay (no polling required for the drawer's own view).
2. **Given** I have drawn strokes on the canvas, **When** I click the clear button, **Then** all strokes are removed and the canvas is blank.
3. **Given** an active round where I am the drawer, **When** the game screen is displayed, **Then** the secret word I must draw is visible to me.
4. **Given** an active round where I am the drawer, **When** the game screen is displayed, **Then** a countdown timer showing the remaining seconds is visible to me.

---

### User Story 2 - Guesser Submits a Guess (Priority: P1)

As a guesser, I want to type a word and submit it so that I can attempt to identify the drawing.

**Why this priority**: Guess submission is the core guesser action. Without it, no scoring or game progress is possible.

**Independent Test**: Can be tested by being a guesser in an active round, submitting a guess, and verifying it appears in the guess history.

**Acceptance Scenarios**:

1. **Given** an active round where I am a guesser, **When** I type a word and submit, **Then** my guess is recorded and appears in the guess history.
2. **Given** I type a guess with leading/trailing whitespace (e.g., "  apple  "), **When** I submit, **Then** the guess is trimmed to "apple" before being stored or compared.
3. **Given** I submit an empty string or a string of only whitespace, **When** the system processes the guess, **Then** the guess is rejected with no entry added to the guess history and no visible error message shown to the guesser (silent rejection).
4a. **Given** the secret word is "rocket" and I submit "  ROCKET  " (with whitespace and uppercase), **When** the system processes the guess, **Then** the guess is trimmed first (yielding "ROCKET"), then compared case-insensitively, and the match is recognized as correct.
4. **Given** the secret word is "Castle" and I submit "castle", **When** the system compares, **Then** the match is recognized as correct (case-insensitive comparison).

---

### User Story 3 - Correct Guess Scores 100 Points (Priority: P2)

As a guesser, I want to receive 100 points for a correct guess so that my skill is rewarded.

**Why this priority**: Scoring is the outcome of a correct guess. The game is playable without visual score updates, but scoring makes it meaningful.

**Independent Test**: Can be tested by submitting a correct guess and verifying the player's score increases by exactly 100.

**Acceptance Scenarios**:

1. **Given** all scores start at 0, **When** I submit a correct guess, **Then** my score increases to 100.
2. **Given** my current score is 0, **When** I submit an incorrect guess, **Then** my score remains 0.
3. **Given** I have already submitted a correct guess this round, **When** I attempt to submit another guess, **Then** the submission is rejected and my score remains unchanged.
4. **Given** I have already submitted a correct guess this round, **When** the game screen is displayed, **Then** the guess submission form is disabled and a message such as "You already guessed correctly!" is shown in place of the input.

---

### User Story 4 - All Players See Updated Guess History (Priority: P2)

As any player (drawer or guesser), I want to see the running list of guesses submitted during the round so I can follow the game's progress.

**Why this priority**: Shared guess history creates the social experience of the game. It is essential for all players to stay synchronized.

**Independent Test**: Can be tested by having two guesser clients open simultaneously, submitting a guess on one, and confirming it appears on both within the polling interval.

**Acceptance Scenarios**:

1. **Given** a guesser submits a guess, **When** the polling interval elapses on another player's client, **Then** the new guess appears in that player's guess history.
2. **Given** a correct guess is submitted, **When** the guess history syncs to all players, **Then** all players see the guess marked as correct.
3. **Given** a guesser on one client submits multiple guesses over time, **When** another client polls, **Then** all submitted guesses are shown in submission order.

---

### User Story 5 - Guessers See the Live Drawing (Priority: P1)

As a guesser, I want to see the drawer's current canvas state so that I can form and submit a guess.

**Why this priority**: Without seeing the drawing, guessers cannot participate. This is required for an end-to-end testable gameplay loop.

**Independent Test**: Can be tested by drawing on the canvas as drawer, then confirming the strokes appear on a guesser's screen within the polling interval.

**Acceptance Scenarios**:

1. **Given** the drawer has drawn strokes on the canvas, **When** the polling interval elapses on a guesser's client, **Then** the guesser sees the current canvas state.
2. **Given** the drawer clears the canvas, **When** the guesser's client next polls, **Then** the guesser sees a blank canvas.
3. **Given** the drawer has not yet drawn anything, **When** the guesser polls, **Then** the guesser sees a blank canvas.

---

### User Story 6 - Round Ends and Results Are Shown (Priority: P2)

As any player (drawer or guesser), I want to see the round outcome — the secret word, final scores, and whether anyone guessed correctly — so I know how the round concluded.

**Why this priority**: Without a defined round-end state, players have no closure. This story completes the game loop started in User Stories 1–5.

**Independent Test**: Can be tested by waiting for the timer to expire (or triggering expiry in a test) and confirming all players see the secret word and final scoreboard without any player action.

**Acceptance Scenarios**:

1. **Given** the round timer expires, **When** any player's client next polls, **Then** all players see a "Round over" indicator and the secret word revealed.
2. **Given** the round has ended with no guesser having guessed correctly, **When** the round-over state is displayed, **Then** all players see the secret word and final scores (all 0 for guessers).
3. **Given** the round has ended, **When** the round-over state is displayed, **Then** the guess submission form is disabled for all guessers.
4. **Given** the round has ended, **When** the round-over state is displayed, **Then** the drawer's canvas is still visible (read-only) so players can review the drawing.

---

### Edge Cases

- What happens when a guesser submits a guess after the round's time limit expires? The guess is rejected and not recorded; the error message is "Round is not active" (distinct from the already-correct lockout message).
- What is the time limit duration? 60 seconds per round (`ROUND_DURATION_SECONDS`), confirmed in research.md Decision 8.
- What happens if two guessers submit the correct answer at the same time? Both receive 100 points independently. The guess history records them in server-receipt order; no tie-breaking beyond arrival order is required.
- What happens if the drawer clears the canvas mid-round? All strokes are removed; guessers see the cleared canvas on their next poll.
- What if a guesser submits the same correct word twice? The second submission is rejected with the message "Already guessed correctly" — distinct from the post-expiry rejection message.
- What is the order of operations for guess processing? Whitespace is trimmed first, then the trimmed text is checked for emptiness, then compared case-insensitively to the secret word. A guess of "  " (whitespace only) is rejected before comparison even if the secret word were somehow an empty string.
- What happens when a player's polling request fails (network error)? The client retains the last successfully received state; no error is shown to the player. The next successful poll restores the current state. Polling failures are silent.
- What happens if the round ends between a guesser typing and submitting? The submission is rejected by the server with "Round is not active". The client shows the rejection silently and the round-over state appears within the next poll cycle.
- What happens if no guesser guesses correctly within the time limit? The round ends normally at timer expiry; all guesser scores remain 0. The secret word is revealed to all players in the round-over state.
- Is multi-round play in scope? No — this feature covers a single round only. After the round ends, players see the round-over state. Navigation back to lobby and starting another round is out of scope for this feature.
- Can a single-player room (only the drawer, no guessers) have a round? Yes — the round starts and timer runs, but no guesses can be submitted. The round ends at expiry with the secret word revealed.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display the drawer's canvas strokes on the drawer's own screen as they draw.
- **FR-002**: The system MUST allow the drawer to clear all strokes from the canvas.
- **FR-003**: Guessers MUST be able to submit a text guess during an active round.
- **FR-004**: The system MUST trim leading and trailing whitespace from any submitted guess before any further processing. Trimming occurs before the empty-check and before case-insensitive comparison.
- **FR-005**: The system MUST reject empty guesses (empty string or whitespace-only after trimming) without recording them and without displaying an error message to the guesser.
- **FR-006**: The system MUST compare the trimmed guess to the secret word using case-insensitive matching (both sides lowercased before comparison).
- **FR-007**: The system MUST award 100 points to a guesser whose trimmed guess matches the secret word (case-insensitively).
- **FR-008**: Incorrect guesses MUST add 0 points to the guesser's score.
- **FR-009**: Once a guesser submits a correct guess, the system MUST prevent that guesser from submitting any further guesses for the remainder of the round. The guess form MUST be disabled and display the message "You already guessed correctly!".
- **FR-010**: All submitted guesses (correct and incorrect) MUST be recorded in a guess history for the round.
- **FR-011**: The system MUST make the round's guess history available to all players (drawer and guessers) via polling at ≤ 2-second intervals.
- **FR-012**: The system MUST make the current canvas state available to guessers via polling at ≤ 2-second intervals so they can see the drawing as it progresses.
- **FR-013**: All scores MUST start at 0 at the beginning of a round.
- **FR-014**: A round MUST end automatically when its fixed time limit expires.
- **FR-015**: The system MUST reject any guess submitted after the round's time limit has expired.
- **FR-016**: When a round ends, the system MUST reveal the secret word to all players (including guessers who did not guess correctly). The word is displayed in a "Round over" banner visible on all clients within one polling cycle (≤ 2 seconds) of expiry.
- **FR-017**: The round status transition from `"playing"` to `"ended"`, the secret word reveal, scores, and guess history MUST all be delivered via the same polling endpoint (≤ 2-second interval) — no separate polling loop is required.
- **FR-018**: If a polling request fails (network error or timeout), the client MUST retain the last successfully received game state and retry silently on the next interval. No error message is shown to the player for transient polling failures.

### Key Entities

- **Round**: An active game session with a designated drawer, a secret word, a set of guessers, and a canvas state.
- **Guess**: A single submission by a guesser containing the guesser's participant ID, their trimmed input text, a correct/incorrect flag, and a timestamp.
- **Canvas State**: The set of drawing strokes representing the current state of the drawer's canvas; cleared when the drawer resets.
- **Score**: A per-participant integer tally starting at 0; incremented by 100 on a correct guess.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A guesser's correct submission is reflected in their score within one polling cycle (≤ 2 seconds of server receipt).
- **SC-002**: The guess history shown to all players is consistent — every player sees the same guesses in server-receipt order after polling. Simultaneous submissions are ordered by server arrival time; no additional tie-breaking is specified.
- **SC-003**: 100% of empty or whitespace-only guess submissions are silently rejected — no entry is added to the guess history and no error message is displayed to the guesser.
- **SC-004**: Case-insensitive matching is applied to 100% of guess comparisons — no correct guess is marked incorrect due to letter casing.
- **SC-005**: All player scores begin at exactly 0 when a round starts; no pre-existing score state carries over.
- **SC-006**: Guessers see the drawer's current canvas state within one polling cycle (≤ 2 seconds) of any stroke being added or cleared.
- **SC-007**: The round ends automatically when the 60-second timer expires — no player action or host intervention is required.
- **SC-008**: When the round ends, the secret word and a "Round over" indicator are visible to all players within one polling cycle (≤ 2 seconds of expiry).
- **SC-009**: A guesser who has already guessed correctly sees a disabled guess form with the message "You already guessed correctly!" for the remainder of the round.

## Assumptions

- A round is already active (started by the host) before gameplay interaction begins; round creation is handled by the prior feature (game start & drawer flow). That feature guarantees `room.secretWord` is non-null and `room.status === "playing"` when the game screen is reached.
- The secret word is hidden from guessers during the round; it is revealed to all players (via the same polling snapshot) once the round ends.
- All game state — canvas strokes, guesses, scores, round status, and the secret word reveal — is delivered through the single existing `GET /rooms/:code` polling endpoint used by `fetchRoomSilent`. No second polling loop is introduced.
- Polling interval is ≤ 2 seconds, consistent with the project constitution (Principle II). All "within one polling cycle" success criteria mean ≤ 2 seconds from the server-side state change.
- All state is in-memory; guess history, scores, and the secret word are lost on server restart (Constitution Principle I). This applies equally to the post-round secret word reveal.
- The word list is fixed (rocket, pizza, castle, guitar, sunflower) as defined in the project constitution.
- Participant identity is carried via a `participantId` returned at room join/create time; no authentication is required or used.
- The drawer cannot submit guesses during their turn as drawer.
- A round has a fixed time limit of 60 seconds (`ROUND_DURATION_SECONDS`); the round ends automatically when the timer expires, regardless of how many guessers have guessed correctly.
- The number of strokes and points per stroke are unbounded within a single round. No server-side stroke count limit is enforced; this is acceptable under the in-memory constraint for a single-round game with 2–10 players.
- Accessibility requirements (keyboard navigation, ARIA labels, screen reader support) are out of scope for this feature.
- The canvas dimensions (480×360 pixels) are an implementation default and are not a product-level requirement; they may be adjusted during implementation without a spec change.
