import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../services/api";
import { RoomStore } from "./roomStore";

vi.mock("../services/api", () => ({
  api: {
    fetchRoom: vi.fn(),
    addStroke: vi.fn(),
    clearCanvas: vi.fn(),
    submitGuess: vi.fn(),
    createRoom: vi.fn(),
    joinRoom: vi.fn(),
    startGame: vi.fn()
  }
}));

describe("RoomStore.fetchRoomSilent", () => {
  let store: RoomStore;

  beforeEach(() => {
    store = new RoomStore();
    vi.clearAllMocks();
  });

  it("retains existing room state when api.fetchRoom rejects (FR-018)", async () => {
    const initialRoom = {
      code: "ABCD",
      status: "playing" as const,
      participants: [{ id: "p1", name: "Alice", joinedAt: "" }],
      availableWords: [],
      isHost: true,
      currentDrawerId: "p1",
      secretWord: "rocket",
      scores: [],
      gameState: null
    };

    store.setRoomSession({ participantId: "p1", room: initialRoom });
    vi.mocked(api.fetchRoom).mockRejectedValue(new Error("Network error"));

    await store.fetchRoomSilent();

    const state = store.getSnapshot();
    expect(state.room).toEqual(initialRoom);
    expect(state.error).toBeNull();
  });

  it("does not expose a network error to the player when fetchRoomSilent fails (FR-018)", async () => {
    const initialRoom = {
      code: "ABCD",
      status: "playing" as const,
      participants: [],
      availableWords: [],
      isHost: false,
      currentDrawerId: null,
      secretWord: null,
      scores: [],
      gameState: null
    };

    store.setRoomSession({ participantId: "p1", room: initialRoom });
    vi.mocked(api.fetchRoom).mockRejectedValue(new Error("Timeout"));

    await store.fetchRoomSilent();

    const state = store.getSnapshot();
    expect(state.error).toBeNull();
    expect(state.room?.code).toBe("ABCD");
  });

  it("is a no-op when no room is in state", async () => {
    await store.fetchRoomSilent();

    expect(api.fetchRoom).not.toHaveBeenCalled();
    expect(store.getSnapshot().room).toBeNull();
  });
});
