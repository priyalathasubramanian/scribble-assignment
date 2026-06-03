import { type Participant } from "../services/api";
import { Card } from "./Card";

interface ScoreboardProps {
  scores: Array<{ participantId: string; score: number }>;
  participants: Participant[];
}

export function Scoreboard({ scores, participants }: ScoreboardProps) {
  const nameById = Object.fromEntries(participants.map((p) => [p.id, p.name]));
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  return (
    <Card title="Scoreboard">
      {sorted.length === 0 ? (
        <p className="status-line">Waiting for players…</p>
      ) : (
        <ul className="player-list">
          {sorted.map(({ participantId, score }) => (
            <li key={participantId}>
              <span>{nameById[participantId] ?? "Unknown"}</span>
              <strong className="player-list__meta">{score}</strong>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
