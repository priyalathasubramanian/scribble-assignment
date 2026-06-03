# Gameplay Requirements Checklist: Gameplay Interaction

**Purpose**: Validate the quality, completeness, and testability of gameplay requirements — covering state transitions, multi-actor UX, polling contract, and the canvas/guess/score/timer system. Tests the spec as written, not the implementation.
**Created**: 2026-06-03
**Feature**: [spec.md](../spec.md)
**Audience**: Spec author — validating before the next feature builds on this one
**Depth**: Thorough (formal gate)

---

## Requirement Completeness

- [x] CHK001 Does the spec define what the drawer's screen shows while the round is active beyond the canvas — e.g., are the secret word display, timer, and scoreboard visibility requirements all stated? [Completeness, Spec §US1]
- [x] CHK002 Are requirements defined for the drawer's experience *after* the round ends (can they still see the canvas, is it cleared, do they see the final scores)? [Completeness, Gap]
- [x] CHK003 Are requirements defined for what a player sees when they arrive at the game screen *before* any strokes have been drawn (blank canvas state for both drawer and guesser)? [Completeness, Spec §US5]
- [x] CHK004 Is the visual state of a guesser who has already guessed correctly fully specified — e.g., is their guess form disabled with a visible message, or silently hidden? [Completeness, Spec §FR-009]
- [x] CHK005 Are requirements defined for what all players see in the interval between round end and the start of the next round (or return to lobby) — i.e., is there a defined post-round state? [Completeness, Gap]
- [x] CHK006 Does the spec define whether the drawer sees a live count or list of how many/which guessers have guessed correctly during the round? [Completeness, Gap]
- [x] CHK007 Are requirements stated for the case where only one player is in the room when the game starts (no guessers)? [Completeness, Edge Case]

---

## Requirement Clarity

- [x] CHK008 Is "in real time" (Spec §US1 acceptance scenario 1) quantified — does it mean immediately on `mouseUp`, or within a specific latency bound? [Clarity, Spec §US1]
- [x] CHK009 Is the phrase "displayed on the drawer's screen" (Spec §FR-001) clear about whether this means the canvas is pre-rendered from server state or drawn locally without a server round-trip? [Clarity, Spec §FR-001]
- [x] CHK010 Is the "silent rejection" behaviour for empty guesses (Spec §FR-005, SC-003) defined from the user's perspective — does the input clear, does an error message appear, or does nothing visibly happen? [Clarity, Spec §FR-005]
- [x] CHK011 Is "locked out" (Spec §FR-009) defined clearly — does the guess form disappear, become disabled, or show a specific message? Is the locked-out state visible in the guess history to other players? [Clarity, Spec §FR-009]
- [x] CHK012 Is "the secret word is revealed to all players" (Spec §FR-016) clear about the delivery mechanism — does it appear in the round-ended banner, in a dedicated field, or replace the guesser's word placeholder? [Clarity, Spec §FR-016]
- [x] CHK013 Is the term "within one polling cycle" in SC-001, SC-006, SC-008 consistent with the ≤2s polling interval defined in the constitution, and is the maximum acceptable latency (≤2s) explicitly stated in those criteria rather than implied? [Clarity, Spec §SC-001, SC-006, SC-008]
- [x] CHK014 Are "correct/incorrect indicator" requirements for the guess history (Spec §US4) specified in enough detail — colour, symbol, text label — to be unambiguously implementable? [Clarity, Spec §US4]

---

## Requirement Consistency

- [x] CHK015 Is there a conflict between "guesses are case-insensitively compared" (Spec §FR-006) and the trimming rule (Spec §FR-004) — does the spec state the order of operations (trim first, then compare) or is it ambiguous? [Consistency, Spec §FR-004, FR-006]
- [x] CHK016 Do the two 409 rejection cases in Spec §FR-009 (already-correct lockout) and §FR-015 (post-expiry rejection) produce the same user-facing experience, or are they differentiated? The spec should state whether the error messages are distinct. [Consistency, Spec §FR-009, FR-015]
- [x] CHK017 Are the polling interval requirements consistent across all data types — the spec states ≤2s for guess history (FR-011), canvas state (FR-012), and scores (SC-001), but does it also apply to the round status (`"ended"`) and the secret word reveal (FR-016, SC-008)? [Consistency, Spec §FR-011, FR-012, FR-016]
- [x] CHK018 Is the Assumptions section consistent with FR-016 — the assumption "hidden from guessers during the round; revealed on end" matches the requirement, but does the spec also state the reveal applies to guessers who *did* guess correctly (they already knew the word)? [Consistency, Spec §FR-016, Assumptions]
- [x] CHK019 Do the success criteria (SC-007: round ends automatically) and the requirement (FR-014: round ends at time limit) consistently describe the same trigger — or could one be read as permitting a manual host override? [Consistency, Spec §SC-007, FR-014]

---

## Acceptance Criteria Quality

- [x] CHK020 Is SC-001 ("within one polling cycle") measurable independently of implementation — i.e., is there a defined test scenario that produces an unambiguous pass/fail without knowing the polling interval? [Measurability, Spec §SC-001]
- [x] CHK021 Is SC-003 ("100% of empty or whitespace-only submissions silently rejected") measurable — does the spec define what "silently" means in a way that allows objective verification (no error shown, no entry added)? [Measurability, Spec §SC-003]
- [x] CHK022 Can SC-002 ("consistent — every player sees the same guesses in the same order") be objectively verified — is there a specified tie-breaking rule for simultaneous submissions, or is ordering undefined in that edge case? [Measurability, Spec §SC-002]
- [x] CHK023 Are the acceptance scenarios for US2 sufficient to cover the trim-then-compare sequence — is there a scenario that specifically tests a guess that would be empty *before* trimming but the check would pass *if* trimming were skipped? [Acceptance Criteria, Spec §US2]
- [x] CHK024 Does the acceptance scenario for SC-008 (secret word visible within one polling cycle of round end) have a corresponding acceptance scenario in a User Story, or does it exist only as a success criterion with no testable scenario? [Acceptance Criteria, Spec §SC-008, Gap]

---

## Scenario Coverage

- [x] CHK025 Are alternate flow requirements defined for a guesser who joins the room after the round has already started — can they see the canvas history and existing guesses? [Coverage, Gap]
- [x] CHK026 Are requirements defined for the case where the drawer's connection drops mid-stroke — is the partial stroke discarded, or does the spec intentionally leave this as out of scope? [Coverage, Edge Case]
- [x] CHK027 Is the two-simultaneous-correct-guess edge case (Spec §Edge Cases) specified with enough detail — both receive 100 points is stated, but is the ordering of those two entries in the guess history defined? [Coverage, Spec §Edge Cases]
- [x] CHK028 Are requirements defined for what happens when the timer reaches zero and *no* guesser has submitted any guess — is there a "no winner" state or message specified? [Coverage, Gap]
- [x] CHK029 Are recovery requirements defined for a polling failure — if a client's GET request times out, is the expected behaviour (retry, stale display, error state) specified? [Coverage, Exception Flow, Gap]
- [x] CHK030 Is the multi-round scenario explicitly out of scope — the spec mentions "single round" in Assumptions but does not state whether navigating back to lobby and starting again is supported or prohibited? [Coverage, Spec §Assumptions]

---

## Non-Functional Requirements

- [x] CHK031 Are canvas rendering performance requirements defined — is there a maximum acceptable stroke-render latency on the drawer's side (between `mouseUp` and the stroke appearing locally)? [Non-Functional, Gap]
- [x] CHK032 Are requirements specified for canvas dimensions — is the 480×360 pixel size (from implementation) an agreed product requirement documented in the spec, or an undocumented implementation decision? [Non-Functional, Gap]
- [x] CHK033 Are accessibility requirements defined for the guess submission form — keyboard-only submit, ARIA labels, screen reader hints for correct/incorrect indicators? [Non-Functional, Gap]
- [x] CHK034 Are requirements specified for the maximum number of strokes or points per stroke — is there a defined upper bound to prevent runaway memory growth, or is it explicitly unbounded per Constitution Principle I? [Non-Functional, Spec §Assumptions]
- [x] CHK035 Are requirements defined for the guess history display under high-volume conditions — e.g., is there a maximum number of guesses shown, or is scroll required? [Non-Functional, Gap]

---

## Dependencies & Assumptions

- [x] CHK036 Is the assumption that `startGame` already sets `secretWord` validated against the prior feature (002-game-start-drawer-flow) spec — does that spec guarantee the field is always non-null when status is `"playing"`? [Assumption, Spec §Assumptions]
- [x] CHK037 Is the dependency on the 2s polling loop established in the prior feature explicitly stated — does the spec name the mechanism (existing `fetchRoomSilent` interval) or merely say "via polling", leaving implementation latitude? [Assumption, Spec §Assumptions]
- [x] CHK038 Is the assumption that "all state is in-memory" (Spec §Assumptions) cross-referenced against FR-016 — if the server restarts between round start and round end, the secret word reveal would also be lost. Is this acknowledged? [Assumption, Spec §Assumptions, FR-016]

---

## Notes

- Check items off as completed: `[x]`
- Items marked `[Gap]` flag requirements that appear to be missing from the spec entirely
- Items marked `[Ambiguity]` flag requirements that exist but need sharpening
- CHK024 and CHK028 are the highest-risk gaps: SC-008 has no backing acceptance scenario, and the no-winner round-end state is fully unspecified
