import type { ParticipantRole } from "../models/game.js";

export const STARTER_WORDS = [
  "rocket",
  "pizza",
  "castle",
  "guitar",
  "sunflower"
] as const;

export const STARTER_ROLES: ParticipantRole[] = ["drawer", "guesser"];

export const ROUND_DURATION_SECONDS = 60;
