import { describe, expect, it } from "vitest";
import { createRoom, joinRoom, toRoomSnapshot } from "./roomStore.js";

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
});
