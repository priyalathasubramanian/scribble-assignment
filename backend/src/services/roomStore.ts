import { randomUUID } from "node:crypto";
import type { GameState, Participant, Room, RoomSnapshot, Stroke } from "../models/game.js";
import { HttpError } from "../api/schemas.js";
import { ROUND_DURATION_SECONDS, STARTER_WORDS } from "../seed/starterData.js";

const rooms = new Map<string, Room>();

function now() {
  return new Date().toISOString();
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function generateUniqueCode() {
  let code = generateCode();

  while (rooms.has(code)) {
    code = generateCode();
  }

  return code;
}

function displayName(name?: string) {
  return name || "Player";
}

function createParticipant(name?: string): Participant {
  return {
    id: randomUUID(),
    name: displayName(name),
    joinedAt: now()
  };
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

export function listWords() {
  return [...STARTER_WORDS];
}

export function checkRoundExpiry(room: Room): void {
  if (room.status !== "playing") return;
  if (room.roundStartedAt === null) return;
  const endsAt = new Date(room.roundStartedAt).getTime() + room.roundDurationSeconds * 1000;
  if (Date.now() >= endsAt) {
    room.status = "ended";
    room.updatedAt = now();
    rooms.set(room.code, room);
  }
}

export function createRoom(playerName?: string) {
  const participant = createParticipant(playerName);
  const room: Room = {
    code: generateUniqueCode(),
    status: "lobby",
    participants: [participant],
    hostId: participant.id,
    currentDrawerId: null,
    secretWord: null,
    strokes: [],
    guesses: [],
    scores: {},
    correctGuessers: [],
    roundStartedAt: null,
    roundDurationSeconds: ROUND_DURATION_SECONDS,
    createdAt: now(),
    updatedAt: now()
  };

  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function joinRoom(code: string, playerName?: string) {
  const room = rooms.get(code.toUpperCase());

  if (!room) {
    return null;
  }

  if (room.status === "playing") {
    throw new HttpError(409, "Game already in progress");
  }

  const participant = createParticipant(playerName);
  room.participants.push(participant);
  room.updatedAt = now();
  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function getRoom(code: string) {
  const room = rooms.get(code);
  return room ? cloneRoom(room) : null;
}

export function saveRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
  return getRoom(room.code);
}

export function startGame(code: string, participantId: string) {
  const room = rooms.get(code.toUpperCase());

  if (!room) {
    throw new HttpError(404, "Room not found");
  }

  if (participantId !== room.hostId) {
    throw new HttpError(403, "Only the host can start the game");
  }

  if (room.status !== "lobby") {
    throw new HttpError(409, "Game already in progress");
  }

  room.status = "playing";
  room.currentDrawerId = room.hostId;
  room.secretWord = STARTER_WORDS[0];
  room.strokes = [];
  room.guesses = [];
  room.correctGuessers = [];
  room.scores = Object.fromEntries(room.participants.map((p) => [p.id, 0]));
  room.roundStartedAt = now();
  room.roundDurationSeconds = ROUND_DURATION_SECONDS;
  room.updatedAt = now();
  rooms.set(room.code, room);

  return cloneRoom(room);
}

export function submitGuess(code: string, participantId: string, rawText: string) {
  const room = rooms.get(code.toUpperCase());
  if (!room) throw new HttpError(404, "Room not found");
  checkRoundExpiry(room);
  if (room.status !== "playing") throw new HttpError(409, "Round is not active");
  if (participantId === room.currentDrawerId) throw new HttpError(403, "Drawer cannot submit guesses");
  if (room.correctGuessers.includes(participantId)) throw new HttpError(409, "Already guessed correctly");
  const text = rawText.trim();
  if (text.length === 0) throw new HttpError(400, "Guess cannot be empty");
  const isCorrect = text.toLowerCase() === (room.secretWord ?? "").toLowerCase();
  const guess = { participantId, text, isCorrect, submittedAt: now() };
  room.guesses.push(guess);
  if (isCorrect) {
    room.scores[participantId] = (room.scores[participantId] ?? 0) + 100;
    room.correctGuessers.push(participantId);
  }
  room.updatedAt = now();
  rooms.set(room.code, room);
  return { ...guess };
}

export function addStroke(code: string, participantId: string, stroke: Stroke) {
  const room = rooms.get(code.toUpperCase());
  if (!room) throw new HttpError(404, "Room not found");
  checkRoundExpiry(room);
  if (room.status !== "playing") throw new HttpError(409, "Round is not active");
  if (participantId !== room.currentDrawerId) throw new HttpError(403, "Only the drawer can draw");
  room.strokes.push({ points: stroke.points.map((p) => ({ ...p })) });
  room.updatedAt = now();
  rooms.set(room.code, room);
}

export function clearCanvas(code: string, participantId: string) {
  const room = rooms.get(code.toUpperCase());
  if (!room) throw new HttpError(404, "Room not found");
  checkRoundExpiry(room);
  if (room.status !== "playing") throw new HttpError(409, "Round is not active");
  if (participantId !== room.currentDrawerId) throw new HttpError(403, "Only the drawer can clear the canvas");
  room.strokes = [];
  room.updatedAt = now();
  rooms.set(room.code, room);
}

export function toRoomSnapshot(room: Room, viewerParticipantId?: string): RoomSnapshot {
  checkRoundExpiry(room);
  const isDrawer = room.status !== "lobby" && viewerParticipantId === room.currentDrawerId;
  const revealWord = room.status === "ended";

  let gameState: GameState | null = null;
  if (room.status === "playing" || room.status === "ended") {
    const roundEndsAt = room.roundStartedAt
      ? new Date(new Date(room.roundStartedAt).getTime() + room.roundDurationSeconds * 1000).toISOString()
      : new Date().toISOString();
    gameState = {
      roundEndsAt,
      strokes: room.strokes.map((s) => ({ points: s.points.map((p) => ({ ...p })) })),
      guesses: room.guesses.map((g) => ({ ...g })),
      scores: room.participants.map((p) => ({ participantId: p.id, score: room.scores[p.id] ?? 0 })),
      correctGuessers: [...room.correctGuessers]
    };
  }

  return {
    code: room.code,
    status: room.status,
    participants: room.participants.map((participant) => ({ ...participant })),
    availableWords: listWords(),
    isHost: viewerParticipantId === room.hostId,
    currentDrawerId: room.currentDrawerId,
    secretWord: isDrawer || revealWord ? room.secretWord : null,
    gameState
  };
}
