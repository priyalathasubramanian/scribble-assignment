export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Stroke {
  points: Array<{ x: number; y: number }>;
}

export interface Guess {
  participantId: string;
  text: string;
  isCorrect: boolean;
  submittedAt: string;
}

export interface GameState {
  roundEndsAt: string;
  strokes: Stroke[];
  guesses: Guess[];
  scores: Array<{ participantId: string; score: number }>;
  correctGuessers: string[];
}

export interface RoomSnapshot {
  code: string;
  status: "lobby" | "playing" | "ended";
  participants: Participant[];
  availableWords: string[];
  isHost: boolean;
  currentDrawerId: string | null;
  secretWord: string | null;
  scores: Array<{ participantId: string; score: number }>;
  gameState: GameState | null;
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ message: "Request failed" }))) as {
      message?: string;
    };

    throw new Error(errorBody.message ?? "Request failed");
  }

  return (await response.json()) as T;
}

export const api = {
  createRoom(playerName: string) {
    return request<RoomSessionResponse>("/rooms", {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  joinRoom(code: string, playerName: string) {
    return request<RoomSessionResponse>(`/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  fetchRoom(code: string, participantId?: string) {
    const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : "";
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}${query}`);
  },
  startGame(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/start`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  },
  addStroke(code: string, participantId: string, stroke: Stroke) {
    return request<{ ok: boolean }>(`/rooms/${encodeURIComponent(code)}/draw`, {
      method: "POST",
      body: JSON.stringify({ participantId, stroke })
    });
  },
  clearCanvas(code: string, participantId: string) {
    return request<{ ok: boolean }>(`/rooms/${encodeURIComponent(code)}/clear`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  },
  submitGuess(code: string, participantId: string, text: string) {
    return request<{ guess: Guess }>(`/rooms/${encodeURIComponent(code)}/guess`, {
      method: "POST",
      body: JSON.stringify({ participantId, text })
    });
  },
  restartGame(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/restart`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  }
};
