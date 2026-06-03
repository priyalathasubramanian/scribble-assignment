# Feature Specification: Result, Restart & Final Validation

**Feature Branch**: `005-result-restart-validation`

**Created**: 2026-06-03

**Status**: Draft

**Input**: User description: "Result, Restart & Final Validation: Given a round has ended, When the result state is displayed and the host restarts, Then all players see the correct word, final scores, and full guess history; on restart, everyone returns to the lobby with players preserved and all round state cleared."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Round Results (Priority: P1)

When a round ends (either the timer expires or all guessers have correctly guessed the word), every participant — the drawer and all guessers — is automatically shown the results screen. This screen reveals the secret word that was being drawn, each player's accumulated score, and the full chronological list of guesses made during that round.

**Why this priority**: This is the core closure of every round. Without it, players have no feedback on how the round went, and the game feels incomplete. All other restart behavior depends on this state being visible first.

**Independent Test**: Can be fully tested by simulating a round end (timer expiry or all-correct scenario) and verifying that all connected clients display the result screen with correct word, scores, and guess history.

**Acceptance Scenarios**:

1. **Given** a round is active with a drawer and at least one guesser, **When** the round timer reaches zero without all guessers guessing correctly, **Then** all participants see a results screen showing the correct word, each player's current score, and every guess submitted during the round in the order they were made.
2. **Given** a round is active and all guessers have correctly guessed the word, **When** the last correct guess is submitted, **Then** all participants are immediately shown the results screen with the correct word, final scores, and full guess history — without waiting for the timer.
3. **Given** a participant joins a room that is already in the result state, **When** they load the room, **Then** they see the current results screen with the correct word, scores, and guess history (they are not redirected to lobby prematurely).

---

### User Story 2 - Host Restarts the Game (Priority: P2)

After the results screen is shown, the host can choose to start a new round. When the host presses "Restart" (or equivalent), all participants are returned to the lobby screen. Player identities and names are preserved, but all round-specific state (the drawn word, timer, guess history, per-round scores) is cleared so the next round begins fresh.

**Why this priority**: Without restart, the game can only ever be played once per session. Restart enables repeated play, which is the primary use pattern for a party-style drawing game.

**Independent Test**: Can be fully tested by completing a round, having the host trigger restart, and verifying all clients transition to the lobby with player list intact and no residual round data visible.

**Acceptance Scenarios**:

1. **Given** all participants are on the results screen, **When** the host presses "Play Again" / "Restart", **Then** all participants are immediately navigated to the lobby screen showing the current player list.
2. **Given** the restart has occurred, **When** any participant views the lobby, **Then** the player list contains all players who were in the game (no one is dropped on restart).
3. **Given** the restart has occurred, **When** any participant views the lobby, **Then** no guess history, drawn word, or round timer from the previous round is visible anywhere in the UI.
4. **Given** the restart has occurred, **When** any participant views the lobby, **Then** accumulated scores from prior rounds are preserved and visible on the lobby (scores are not reset by restart).
5. **Given** a non-host participant is on the results screen, **When** they attempt to trigger restart (if the control is visible), **Then** the action has no effect — only the host can restart.

---

### User Story 3 - Polling Reflects Round-End State (Priority: P3)

Each participant's client polls the server for game state. When the server transitions to the result state, the next poll response for every client must reflect the round-end state so clients can render the results screen without manual intervention.

**Why this priority**: The game uses polling rather than push events. If the transition to result state is not surfaced in polls, clients stall on the previous screen indefinitely. This is a correctness requirement to make P1 and P2 work reliably.

**Independent Test**: Can be tested in isolation by advancing server state to result and issuing a poll request, then asserting the response contains result-state fields (correct word, scores, guess history, phase indicator).

**Acceptance Scenarios**:

1. **Given** the server has transitioned the round to the result phase, **When** a client polls for room state, **Then** the response includes the phase set to "result", the correct word, all player scores, and the full ordered guess history.
2. **Given** the server has transitioned back to lobby after restart, **When** a client polls for room state, **Then** the response reflects lobby phase with the preserved player list and no round-specific fields.

---

### Edge Cases

- What happens when a participant disconnects between round end and the results display?
- How does the system handle a host who disconnects on the results screen before restarting — can another player (or the new host) trigger restart?
- What if the host triggers restart while some clients have not yet received the result state via polling?
- What happens if a new participant joins during the result phase — do they see results or are they queued for the next round?
- What if scores overflow or reach unexpected values (e.g., very long games)?
- If no guesses are submitted during a round, the guess history section shows "No guesses were made" rather than a blank or missing section.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST transition all room participants to the result phase automatically when the round timer reaches zero.
- **FR-002**: System MUST transition all room participants to the result phase immediately when all guessers have submitted a correct guess, without waiting for the timer.
- **FR-003**: System MUST make the correct word available to all participants (including the drawer) on the results screen.
- **FR-004**: System MUST display each player's cumulative total score on the results screen (running total across all rounds played in the session, not a per-round delta).
- **FR-005**: System MUST display the full guess history for the round in chronological order, including both correct and incorrect guesses and the player who made each guess. If no guesses were submitted, the history section MUST display a "No guesses were made" placeholder message.
- **FR-006**: System MUST display a "Play Again" control on the results screen only to the host; non-host participants do not see this control at all.
- **FR-007**: When the host triggers restart, the system MUST transition all participants to the lobby phase.
- **FR-008**: On restart, the system MUST preserve all player identities and names in the lobby.
- **FR-009**: On restart, the system MUST preserve accumulated scores from prior rounds so players can track cumulative progress.
- **FR-010**: On restart, the system MUST clear all round-specific state: drawn word, guess history, active timer, and drawer assignment. The round duration configuration (60 seconds) is NOT cleared — it is a fixed constant, not round-specific state.
- **FR-011**: The system MUST surface the result phase in the room state polling endpoint so all clients can autonomously detect and display the results screen.
- **FR-012**: The system MUST surface the lobby phase in the room state polling endpoint after restart so all clients automatically navigate to the lobby.
- **FR-013**: Non-host participants MUST NOT be able to trigger a restart.
- **FR-014**: The lobby screen after restart MUST display each player's cumulative score alongside their name, so players can track overall standings between rounds.

### Key Entities

- **Round Result**: The snapshot of a completed round — correct word, guess history (ordered list of guess entries), per-player scores earned in that round, and the round phase indicator.
- **Guess Entry**: A single guess event — submitting player identity, the guessed text, whether it was correct, and its position in the sequence.
- **Player**: A participant with a persistent identity (participantId), display name, and accumulated score across rounds. Survives restarts.
- **Room Phase**: The current state of the room — one of: `lobby` | `playing` | `ended`. Controls which screen all clients render.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All participants see the results screen within one polling cycle (≤ 2 seconds) of the round ending, with no manual action required.
- **SC-002**: The results screen displays 100% of guesses made during the round in the correct chronological order.
- **SC-003**: After the host triggers restart, all participants' clients transition to the lobby within one polling cycle (≤ 2 seconds).
- **SC-004**: Zero players are dropped from the room on restart — all players who were present before restart appear in the post-restart lobby.
- **SC-005**: Accumulated scores are retained with 100% accuracy across restarts for the duration of the in-memory session.
- **SC-006**: Non-host participants cannot initiate a restart — 100% of unauthorized restart attempts are rejected.

## Clarifications

### Session 2026-06-03

- Q: What score value does the results screen show per player? → A: Cumulative total score only (running total across all rounds, not a per-round delta).
- Q: How is the Play Again control presented to non-host participants? → A: Hidden entirely — non-hosts see no restart control.
- Q: What does the results screen show when the round ends with zero guesses submitted? → A: Show empty guess history with a "No guesses were made" placeholder message.
- Q: Does the drawer see different content on the results screen vs. guessers? → A: Same screen for all roles — drawer and guessers see identical content (correct word, scores, guess history).
- Q: After restart, does the lobby show cumulative scores alongside player names? → A: Yes — lobby MUST display each player's cumulative score next to their name.
- Q: Guard against double-click on Play Again? → A: Backend 409 guard (room already "lobby") is sufficient; no additional UI loading state required.
- Q: Are polling-delay-beyond-2s and accessibility requirements in scope? → A: Both out of scope; existing silent-retry polling behaviour applies.

## Assumptions

- Scores accumulate within a single server session only; an in-memory reset (server restart) wipes all state, which is acceptable per the project constitution.
- Polling interval is ≤ 2 seconds on active screens, meaning the maximum observable delay for result/lobby transitions is 2 seconds.
- The "host" is the participant who created the room; host identity persists for the session and is not re-assigned on restart.
- If the host disconnects during the result phase with no mechanism for re-assignment, the restart button becomes inaccessible until the host reconnects — re-assignment logic is out of scope for this feature.
- A new participant who joins during the result phase is placed into the lobby and participates from the next round; they do not see the in-progress results.
- The word list is a fixed seed (rocket, pizza, castle, guitar, sunflower); word selection for the next round after restart follows the same selection rules as the initial game start.
- Score earning rules (how many points per correct guess, whether the drawer earns points) are already defined by the gameplay interaction feature and are not re-specified here.
