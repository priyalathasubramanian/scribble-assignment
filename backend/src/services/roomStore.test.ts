import { describe, expect, it } from "vitest";
import { addStroke, checkRoundExpiry, clearCanvas, createRoom, getRoom, joinRoom, restartGame, startGame, submitGuess, toRoomSnapshot } from "./roomStore.js";
import { ROUND_DURATION_SECONDS } from "../seed/starterData.js";

describe("roomStore", () => {
  it("createRoom returns a room with a 4-character uppercase code", () => {
    const result = createRoom("Alice");

    expect(result.room.code).toMatch(/^[A-Z0-9]{4}$/);
    expect(result.room.participants).toHaveLength(1);
    expect(result.room.participants[0].name).toBe("Alice");
    expect(result.participantId).toBeDefined();
  });

  it("createRoom sets hostId to the creator's participantId", () => {
    const result = createRoom("Alice");

    expect(result.room.hostId).toBe(result.participantId);
  });

  it("toRoomSnapshot returns isHost true for the creator", () => {
    const result = createRoom("Alice");
    const snapshot = toRoomSnapshot(result.room, result.participantId);

    expect(snapshot.isHost).toBe(true);
  });

  it("toRoomSnapshot returns isHost false for a non-host participant", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    const snapshot = toRoomSnapshot(joined!.room, joined!.participantId);

    expect(snapshot.isHost).toBe(false);
  });

  it("joinRoom returns null for an unknown room code", () => {
    const result = joinRoom("ZZZZ", "Bob");

    expect(result).toBeNull();
  });

  it("joinRoom accepts mixed-case room codes", () => {
    const created = createRoom("Alice");
    const lowerCode = created.room.code.toLowerCase();
    const result = joinRoom(lowerCode, "Bob");

    expect(result).not.toBeNull();
    expect(result!.room.participants).toHaveLength(2);
  });

  it("startGame transitions room to playing and sets currentDrawerId", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    const started = startGame(created.room.code, created.participantId);

    expect(started.status).toBe("playing");
    expect(started.currentDrawerId).toBe(created.participantId);
    expect(started.secretWord).toBe("rocket");
    expect(joined).not.toBeNull();
  });

  it("startGame throws 403 when non-host tries to start", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");

    expect(() => startGame(created.room.code, joined!.participantId)).toThrow("Only the host can start the game");
  });

  it("startGame throws 409 when game is already playing", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);

    expect(() => startGame(created.room.code, created.participantId)).toThrow("Game already in progress");
  });

  it("joinRoom throws 409 when game is already in progress", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);

    expect(() => joinRoom(created.room.code, "Charlie")).toThrow("Game already in progress");
  });

  it("toRoomSnapshot returns secretWord only for the drawer when playing", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    const started = startGame(created.room.code, created.participantId);

    const drawerSnapshot = toRoomSnapshot(started, created.participantId);
    const guesserSnapshot = toRoomSnapshot(started, joined!.participantId);

    expect(drawerSnapshot.secretWord).toBe("rocket");
    expect(guesserSnapshot.secretWord).toBeNull();
  });

  it("toRoomSnapshot returns null secretWord for all participants in lobby", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");

    const hostSnapshot = toRoomSnapshot(created.room, created.participantId);
    const joinerSnapshot = toRoomSnapshot(joined!.room, joined!.participantId);

    expect(hostSnapshot.secretWord).toBeNull();
    expect(joinerSnapshot.secretWord).toBeNull();
  });

  it("toRoomSnapshot does not include roles field", () => {
    const created = createRoom("Alice");
    const snapshot = toRoomSnapshot(created.room, created.participantId);

    expect(snapshot).not.toHaveProperty("roles");
  });

  it("toRoomSnapshot returns currentDrawerId as hostId after startGame", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    const started = startGame(created.room.code, created.participantId);

    const snapshot = toRoomSnapshot(started, created.participantId);

    expect(snapshot.currentDrawerId).toBe(created.participantId);
  });

  it("startGame initialises scores to 0 for all participants", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    const started = startGame(created.room.code, created.participantId);

    const snapshot = toRoomSnapshot(started, created.participantId);

    expect(snapshot.gameState).not.toBeNull();
    expect(snapshot.gameState!.scores).toHaveLength(2);
    expect(snapshot.gameState!.scores.every((s) => s.score === 0)).toBe(true);
    expect(joined).not.toBeNull();
  });

  it("startGame initialises strokes, guesses, and correctGuessers to empty arrays", () => {
    const created = createRoom("Alice");
    const started = startGame(created.room.code, created.participantId);

    expect(started.strokes).toHaveLength(0);
    expect(started.guesses).toHaveLength(0);
    expect(started.correctGuessers).toHaveLength(0);
  });

  it("startGame sets roundStartedAt and roundDurationSeconds", () => {
    const created = createRoom("Alice");
    const started = startGame(created.room.code, created.participantId);

    expect(started.roundStartedAt).not.toBeNull();
    expect(started.roundDurationSeconds).toBe(ROUND_DURATION_SECONDS);
  });

  it("startGame rejects an already ended room with 409", () => {
    const created = createRoom("Alice");
    const room = startGame(created.room.code, created.participantId);
    room.roundStartedAt = new Date(Date.now() - (ROUND_DURATION_SECONDS + 1) * 1000).toISOString();
    checkRoundExpiry(room);

    expect(() => startGame(created.room.code, created.participantId)).toThrow("Game already in progress");
  });

  it("toRoomSnapshot returns gameState null in lobby", () => {
    const created = createRoom("Alice");
    const snapshot = toRoomSnapshot(created.room, created.participantId);

    expect(snapshot.gameState).toBeNull();
  });

  it("toRoomSnapshot returns gameState with roundEndsAt when playing", () => {
    const created = createRoom("Alice");
    const started = startGame(created.room.code, created.participantId);
    const snapshot = toRoomSnapshot(started, created.participantId);

    expect(snapshot.gameState).not.toBeNull();
    expect(snapshot.gameState!.roundEndsAt).toBeDefined();
    expect(new Date(snapshot.gameState!.roundEndsAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("checkRoundExpiry transitions playing room to ended after time elapses", () => {
    const created = createRoom("Alice");
    const room = startGame(created.room.code, created.participantId);
    room.roundStartedAt = new Date(Date.now() - (ROUND_DURATION_SECONDS + 1) * 1000).toISOString();

    checkRoundExpiry(room);

    expect(room.status).toBe("ended");
  });

  it("checkRoundExpiry is a no-op when time has not elapsed", () => {
    const created = createRoom("Alice");
    const room = startGame(created.room.code, created.participantId);

    checkRoundExpiry(room);

    expect(room.status).toBe("playing");
  });

  it("checkRoundExpiry is a no-op on lobby rooms", () => {
    const created = createRoom("Alice");

    checkRoundExpiry(created.room);

    expect(created.room.status).toBe("lobby");
  });

  // addStroke
  it("addStroke appends a stroke to the room", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);
    const stroke = { points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] };

    addStroke(created.room.code, created.participantId, stroke);

    const room = getRoom(created.room.code)!;
    const snapshot = toRoomSnapshot(room, created.participantId);
    expect(snapshot.gameState!.strokes).toHaveLength(1);
    expect(snapshot.gameState!.strokes[0].points).toHaveLength(2);
  });

  it("addStroke throws 403 when non-drawer calls it", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);

    expect(() =>
      addStroke(created.room.code, joined!.participantId, { points: [{ x: 0, y: 0 }] })
    ).toThrow("Only the drawer can draw");
  });

  it("addStroke throws 409 when round is not active", () => {
    const created = createRoom("Alice");
    const stroke = { points: [{ x: 0, y: 0 }] };

    expect(() => addStroke(created.room.code, created.participantId, stroke)).toThrow("Round is not active");
  });

  // clearCanvas
  it("clearCanvas throws 403 when non-drawer calls it", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);

    expect(() => clearCanvas(created.room.code, joined!.participantId)).toThrow("Only the drawer can clear the canvas");
  });

  it("clearCanvas throws 409 when round is not active", () => {
    const created = createRoom("Alice");

    expect(() => clearCanvas(created.room.code, created.participantId)).toThrow("Round is not active");
  });

  // submitGuess
  it("submitGuess records an incorrect guess with score unchanged", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);

    const guess = submitGuess(created.room.code, joined!.participantId, "pizza");

    expect(guess.isCorrect).toBe(false);
    expect(guess.text).toBe("pizza");
  });

  it("submitGuess records a correct guess and awards 100 points", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);

    const guess = submitGuess(created.room.code, joined!.participantId, "rocket");

    expect(guess.isCorrect).toBe(true);
  });

  it("submitGuess applies case-insensitive matching", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);

    const guess = submitGuess(created.room.code, joined!.participantId, "ROCKET");

    expect(guess.isCorrect).toBe(true);
  });

  it("submitGuess trims whitespace before comparing", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);

    const guess = submitGuess(created.room.code, joined!.participantId, "  rocket  ");

    expect(guess.isCorrect).toBe(true);
    expect(guess.text).toBe("rocket");
  });

  it("submitGuess throws 400 for empty guess after trim", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);

    expect(() => submitGuess(created.room.code, joined!.participantId, "   ")).toThrow("Guess cannot be empty");
  });

  it("submitGuess throws 403 when the drawer tries to guess", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);

    expect(() => submitGuess(created.room.code, created.participantId, "rocket")).toThrow("Drawer cannot submit guesses");
  });

  it("submitGuess throws 409 when round is not active", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");

    expect(() => submitGuess(created.room.code, created.participantId, "rocket")).toThrow("Round is not active");
  });

  it("submitGuess throws 409 after guesser has already guessed correctly", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);
    submitGuess(created.room.code, joined!.participantId, "rocket");

    expect(() => submitGuess(created.room.code, joined!.participantId, "rocket")).toThrow("Already guessed correctly");
  });

  it("submitGuess throws 409 when round has expired", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    const room = startGame(created.room.code, created.participantId);
    room.roundStartedAt = new Date(Date.now() - (ROUND_DURATION_SECONDS + 1) * 1000).toISOString();
    checkRoundExpiry(room);

    expect(() => submitGuess(created.room.code, joined!.participantId, "rocket")).toThrow("Round is not active");
  });

  // restartGame
  it("restartGame transitions ended room back to lobby and clears round state", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    const room = startGame(created.room.code, created.participantId);
    room.roundStartedAt = new Date(Date.now() - (ROUND_DURATION_SECONDS + 1) * 1000).toISOString();
    checkRoundExpiry(room);

    const result = restartGame(created.room.code, created.participantId);

    expect(result.status).toBe("lobby");
    expect(result.currentDrawerId).toBeNull();
    expect(result.secretWord).toBeNull();
    expect(result.strokes).toHaveLength(0);
    expect(result.guesses).toHaveLength(0);
    expect(result.correctGuessers).toHaveLength(0);
    expect(result.roundStartedAt).toBeNull();
  });

  it("restartGame preserves cumulative scores", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);
    submitGuess(created.room.code, joined!.participantId, "rocket");
    const room = getRoom(created.room.code)!;
    room.roundStartedAt = new Date(Date.now() - (ROUND_DURATION_SECONDS + 1) * 1000).toISOString();
    checkRoundExpiry(room);

    const result = restartGame(created.room.code, created.participantId);

    expect(result.scores[joined!.participantId]).toBe(100);
    expect(result.scores[created.participantId]).toBe(0);
  });

  it("restartGame throws 404 for unknown room", () => {
    expect(() => restartGame("ZZZZ", "any-id")).toThrow("Room not found");
  });

  it("restartGame throws 403 when non-host calls it", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    const room = startGame(created.room.code, created.participantId);
    room.roundStartedAt = new Date(Date.now() - (ROUND_DURATION_SECONDS + 1) * 1000).toISOString();
    checkRoundExpiry(room);

    expect(() => restartGame(created.room.code, joined!.participantId)).toThrow("Only the host can restart the game");
  });

  it("restartGame throws 409 when room is not ended", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);

    expect(() => restartGame(created.room.code, created.participantId)).toThrow("Game has not ended yet");
  });

  it("restartGame throws 409 when room is in lobby", () => {
    const created = createRoom("Alice");

    expect(() => restartGame(created.room.code, created.participantId)).toThrow("Game has not ended yet");
  });

  it("toRoomSnapshot exposes secretWord to all when status is ended", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    const room = startGame(created.room.code, created.participantId);
    room.roundStartedAt = new Date(Date.now() - (ROUND_DURATION_SECONDS + 1) * 1000).toISOString();
    checkRoundExpiry(room);

    const guesserSnapshot = toRoomSnapshot(room, joined!.participantId);

    expect(guesserSnapshot.secretWord).toBe("rocket");
  });

  it("toRoomSnapshot returns gameState null and scores array after restart", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    const room = startGame(created.room.code, created.participantId);
    room.roundStartedAt = new Date(Date.now() - (ROUND_DURATION_SECONDS + 1) * 1000).toISOString();
    checkRoundExpiry(room);
    restartGame(created.room.code, created.participantId);

    const restarted = getRoom(created.room.code)!;
    const snapshot = toRoomSnapshot(restarted, created.participantId);

    expect(snapshot.status).toBe("lobby");
    expect(snapshot.gameState).toBeNull();
    expect(snapshot.scores).toHaveLength(2);
  });

  it("toRoomSnapshot always populates scores field in lobby phase", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    const room = getRoom(created.room.code)!;

    const snapshot = toRoomSnapshot(room, created.participantId);

    expect(snapshot.scores).toBeDefined();
    expect(snapshot.scores).toHaveLength(2);
    expect(snapshot.scores.every((s) => s.score === 0)).toBe(true);
  });

  it("startGame preserves existing scores across restarts", () => {
    const created = createRoom("Alice");
    const joined = joinRoom(created.room.code, "Bob");
    startGame(created.room.code, created.participantId);
    submitGuess(created.room.code, joined!.participantId, "rocket");
    const room = getRoom(created.room.code)!;
    room.roundStartedAt = new Date(Date.now() - (ROUND_DURATION_SECONDS + 1) * 1000).toISOString();
    checkRoundExpiry(room);
    restartGame(created.room.code, created.participantId);

    const started2 = startGame(created.room.code, created.participantId);

    expect(started2.scores[joined!.participantId]).toBe(100);
    expect(started2.scores[created.participantId]).toBe(0);
  });

  it("checkRoundExpiry still transitions to ended after startGame score-init patch", () => {
    const created = createRoom("Alice");
    joinRoom(created.room.code, "Bob");
    const room = startGame(created.room.code, created.participantId);
    room.roundStartedAt = new Date(Date.now() - (ROUND_DURATION_SECONDS + 1) * 1000).toISOString();

    checkRoundExpiry(room);

    expect(room.status).toBe("ended");
  });
});
