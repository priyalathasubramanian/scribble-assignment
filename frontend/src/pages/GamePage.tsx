import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function GamePage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  useEffect(() => {
    const id = setInterval(() => {
      void roomStore.fetchRoomSilent();
    }, 2000);
    return () => clearInterval(id);
  }, [roomStore]);

  if (!room) {
    return null;
  }

  const isDrawer = room.currentDrawerId === participantId;

  return (
    <section className="panel placeholder-page">
      <div className="lobby-header">
        <PageHeader
          kicker="Round 1"
          title="Game"
          description={isDrawer ? "You are drawing!" : "Guess the secret word!"}
        />
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="summary-grid">
        <Card title="Players">
          <ul className="player-list">
            {room.participants.map((participant) => (
              <li key={participant.id}>
                <span>{participant.name}</span>
                <span className="player-list__meta">
                  {participant.id === room.currentDrawerId ? "Drawer" : "Guesser"}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Secret Word">
          {isDrawer ? (
            <p className="status-line" style={{ backgroundColor: '#dcfce7', color: '#166534', fontSize: '1.25rem', fontWeight: 'bold' }}>
              {room.secretWord}
            </p>
          ) : (
            <p className="status-line">Waiting for drawer to reveal the word…</p>
          )}
        </Card>
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
      </div>
    </section>
  );
}
