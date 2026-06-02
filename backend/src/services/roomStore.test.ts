import { describe, expect, it } from "vitest";
import { createRoom, joinRoom, startGame, toRoomSnapshot } from "./roomStore.js";

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
});
