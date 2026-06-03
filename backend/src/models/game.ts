export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "playing" | "ended";

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

export interface Room {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  hostId: string;
  currentDrawerId: string | null;
  secretWord: string | null;
  strokes: Stroke[];
  guesses: Guess[];
  scores: Record<string, number>;
  correctGuessers: string[];
  roundStartedAt: string | null;
  roundDurationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
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
