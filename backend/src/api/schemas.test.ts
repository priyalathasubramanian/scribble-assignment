import { describe, expect, it } from "vitest";
import { addStrokeSchema, clearCanvasSchema, createRoomSchema, restartGameSchema, roomCodeParamsSchema, submitGuessSchema } from "./schemas.js";

describe("schemas", () => {
  it("createRoomSchema accepts a valid body with playerName", () => {
    const result = createRoomSchema.parse({ playerName: "Alice" });

    expect(result.playerName).toBe("Alice");
  });

  it("createRoomSchema rejects empty playerName", () => {
    expect(() => createRoomSchema.parse({ playerName: "" })).toThrow();
  });

  it("createRoomSchema rejects whitespace-only playerName", () => {
    expect(() => createRoomSchema.parse({ playerName: "   " })).toThrow();
  });

  it("roomCodeParamsSchema rejects missing code", () => {
    expect(() => roomCodeParamsSchema.parse({})).toThrow();
  });

  it("submitGuessSchema accepts valid participantId and text", () => {
    const result = submitGuessSchema.parse({ participantId: "p1", text: "rocket" });
    expect(result.participantId).toBe("p1");
    expect(result.text).toBe("rocket");
  });

  it("submitGuessSchema trims text", () => {
    const result = submitGuessSchema.parse({ participantId: "p1", text: "  rocket  " });
    expect(result.text).toBe("rocket");
  });

  it("submitGuessSchema rejects empty text after trim", () => {
    expect(() => submitGuessSchema.parse({ participantId: "p1", text: "   " })).toThrow();
  });

  it("submitGuessSchema rejects missing participantId", () => {
    expect(() => submitGuessSchema.parse({ text: "rocket" })).toThrow();
  });

  it("addStrokeSchema accepts valid stroke with points", () => {
    const result = addStrokeSchema.parse({
      participantId: "p1",
      stroke: { points: [{ x: 10, y: 20 }] }
    });
    expect(result.stroke.points).toHaveLength(1);
  });

  it("addStrokeSchema rejects empty points array", () => {
    expect(() =>
      addStrokeSchema.parse({ participantId: "p1", stroke: { points: [] } })
    ).toThrow();
  });

  it("clearCanvasSchema accepts valid participantId", () => {
    const result = clearCanvasSchema.parse({ participantId: "p1" });
    expect(result.participantId).toBe("p1");
  });

  it("clearCanvasSchema rejects missing participantId", () => {
    expect(() => clearCanvasSchema.parse({})).toThrow();
  });

  it("restartGameSchema accepts valid participantId", () => {
    const result = restartGameSchema.parse({ participantId: "p1" });
    expect(result.participantId).toBe("p1");
  });

  it("restartGameSchema rejects missing participantId", () => {
    expect(() => restartGameSchema.parse({})).toThrow();
  });

  it("restartGameSchema rejects empty string participantId", () => {
    expect(() => restartGameSchema.parse({ participantId: "" })).toThrow();
  });
});
