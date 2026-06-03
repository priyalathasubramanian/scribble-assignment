import {
  createElement,
  createContext,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
  type PropsWithChildren
} from "react";
import { api, type RoomSessionResponse, type RoomSnapshot, type Stroke } from "../services/api";

export interface RoomState {
  room: RoomSnapshot | null;
  participantId: string | null;
  error: string | null;
  isLoading: boolean;
}

type Listener = () => void;

export class RoomStore {
  private state: RoomState = {
    room: null,
    participantId: null,
    error: null,
    isLoading: false
  };

  private listeners = new Set<Listener>();

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.state;

  private setState(nextState: Partial<RoomState>) {
    this.state = {
      ...this.state,
      ...nextState
    };
    this.listeners.forEach((listener) => listener());
  }

  private async withLoading<T>(operation: () => Promise<T>) {
    this.setState({
      isLoading: true,
      error: null
    });

    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected request failure";
      this.setState({ error: message });
      throw error;
    } finally {
      this.setState({ isLoading: false });
    }
  }

  setRoomSession(response: RoomSessionResponse) {
    this.setState({
      participantId: response.participantId,
      room: response.room,
      error: null
    });
  }

  setRoomSnapshot(room: RoomSnapshot) {
    this.setState({
      room,
      error: null
    });
  }

  async createRoom(playerName: string) {
    const response = await this.withLoading(() => api.createRoom(playerName));
    this.setRoomSession(response);
    return response;
  }

  async joinRoom(code: string, playerName: string) {
    const response = await this.withLoading(() => api.joinRoom(code, playerName));
    this.setRoomSession(response);
    return response;
  }

  async startGame() {
    if (!this.state.room) {
      return null;
    }

    const response = await this.withLoading(() =>
      api.startGame(this.state.room!.code, this.state.participantId ?? "")
    );
    this.setRoomSnapshot(response.room);
    return response;
  }

  async fetchRoom() {
    if (!this.state.room) {
      return null;
    }

    const response = await api.fetchRoom(this.state.room.code, this.state.participantId ?? undefined);
    this.setRoomSnapshot(response.room);
    return response.room;
  }

  async addStroke(stroke: Stroke) {
    if (!this.state.room || !this.state.participantId) return;
    try {
      await api.addStroke(this.state.room.code, this.state.participantId, stroke);
    } catch {
      // silent — drawing continues locally on failure
    }
  }

  async clearCanvas() {
    if (!this.state.room || !this.state.participantId) return;
    try {
      await api.clearCanvas(this.state.room.code, this.state.participantId);
    } catch {
      // silent
    }
  }

  async submitGuess(text: string) {
    if (!this.state.room || !this.state.participantId) return null;
    try {
      return await api.submitGuess(this.state.room.code, this.state.participantId, text);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to submit guess";
      this.setState({ error: message });
      return null;
    }
  }

  async restartGame() {
    if (!this.state.room || !this.state.participantId) return null;
    const response = await this.withLoading(() =>
      api.restartGame(this.state.room!.code, this.state.participantId!)
    );
    this.setRoomSnapshot(response.room);
    return response;
  }

  async fetchRoomSilent() {
    if (!this.state.room) {
      return;
    }

    try {
      const response = await api.fetchRoom(this.state.room.code, this.state.participantId ?? undefined);
      this.setRoomSnapshot(response.room);
    } catch {
      // silent — lobby stays stable, retries on next interval
    }
  }
}

const RoomStoreContext = createContext<RoomStore | null>(null);

export function RoomStoreProvider({ children }: PropsWithChildren) {
  const storeRef = useRef<RoomStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = new RoomStore();
  }

  useEffect(() => undefined, []);

  return createElement(RoomStoreContext.Provider, { value: storeRef.current }, children);
}

export function useRoomStore() {
  const store = useContext(RoomStoreContext);

  if (!store) {
    throw new Error("RoomStoreProvider is missing");
  }

  return store;
}

export function useRoomState() {
  const store = useRoomStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
