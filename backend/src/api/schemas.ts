import { z } from "zod";

export const createRoomSchema = z.object({
  playerName: z.string().trim().min(1, "Player name is required")
});

export const joinRoomSchema = z.object({
  playerName: z.string().trim().min(1, "Player name is required")
});

export const roomCodeParamsSchema = z.object({
  code: z.string()
});

export const roomViewerQuerySchema = z.object({
  participantId: z.string().optional()
});

export const startGameSchema = z.object({
  participantId: z.string().min(1, "participantId is required")
});

export const submitGuessSchema = z.object({
  participantId: z.string().min(1, "participantId is required"),
  text: z.string().trim().min(1, "Guess cannot be empty")
});

const pointSchema = z.object({ x: z.number(), y: z.number() });

export const addStrokeSchema = z.object({
  participantId: z.string().min(1, "participantId is required"),
  stroke: z.object({ points: z.array(pointSchema).min(1) })
});

export const clearCanvasSchema = z.object({
  participantId: z.string().min(1, "participantId is required")
});

export const restartGameSchema = z.object({
  participantId: z.string().min(1, "participantId is required")
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
