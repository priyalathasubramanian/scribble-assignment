import { type Guess, type Participant } from "../services/api";
import { Card } from "./Card";

interface ResultPanelProps {
  guesses: Guess[];
  participants: Participant[];
  isRoundEnded?: boolean;
}

export function ResultPanel({ guesses, participants, isRoundEnded }: ResultPanelProps) {
  const nameById = Object.fromEntries(participants.map((p) => [p.id, p.name]));

  return (
    <Card title="Guesses">
      {guesses.length === 0 ? (
        <p className="status-line">{isRoundEnded ? "No guesses were made." : "No guesses yet."}</p>
      ) : (
        <ul className="player-list">
          {guesses.map((guess, index) => (
            <li key={index}>
              <span>
                <strong>{nameById[guess.participantId] ?? "Unknown"}</strong>: {guess.text}
              </span>
              <span
                className="player-list__meta"
                style={{ color: guess.isCorrect ? "#16a34a" : "#dc2626" }}
              >
                {guess.isCorrect ? "✓" : "✗"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
