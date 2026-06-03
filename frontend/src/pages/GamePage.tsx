import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GuessForm } from "../components/GuessForm";
import { PageHeader } from "../components/PageHeader";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { type Stroke } from "../services/api";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function GamePage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const currentPoints = useRef<Array<{ x: number; y: number }>>([]);

  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    }
  }, [navigate, room]);

  // Polling loop
  useEffect(() => {
    const id = setInterval(() => {
      void roomStore.fetchRoomSilent();
    }, 2000);
    return () => clearInterval(id);
  }, [roomStore]);

  // Timer countdown
  useEffect(() => {
    if (!room?.gameState) return;
    const endsAt = new Date(room.gameState.roundEndsAt).getTime();
    const tick = () => setTimeLeft(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [room?.gameState?.roundEndsAt]);

  // Render strokes on guesser canvas whenever strokes change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !room || !room.gameState) return;
    if (room.currentDrawerId === participantId) return; // drawer uses mouse events
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    for (const stroke of room.gameState.strokes) {
      if (stroke.points.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [room?.gameState?.strokes, participantId, room]);

  if (!room) return null;

  const isDrawer = room.currentDrawerId === participantId;
  const isRoundEnded = room.status === "ended";
  const hasGuessedCorrectly =
    !isDrawer &&
    participantId !== null &&
    (room.gameState?.correctGuessers.includes(participantId) ?? false);

  // Drawer canvas event handlers
  function getCanvasPoint(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawer || isRoundEnded) return;
    isDrawing.current = true;
    const point = getCanvasPoint(e);
    currentPoints.current = [point];
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing.current || !isDrawer) return;
    const point = getCanvasPoint(e);
    currentPoints.current.push(point);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function onMouseUp() {
    if (!isDrawing.current || !isDrawer) return;
    isDrawing.current = false;
    if (currentPoints.current.length > 0) {
      const stroke: Stroke = { points: currentPoints.current };
      void roomStore.addStroke(stroke);
      currentPoints.current = [];
    }
  }

  function onMouseLeave() {
    if (isDrawing.current) onMouseUp();
  }

  function handleClear() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    void roomStore.clearCanvas();
  }

  async function handleGuessSubmit(text: string) {
    await roomStore.submitGuess(text);
  }

  return (
    <section className="panel">
      <div className="lobby-header">
        <PageHeader
          kicker="Round 1"
          title="Game"
          description={isDrawer ? `Draw: ${room.secretWord ?? "…"}` : "Guess the word!"}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {timeLeft !== null && (
            <span style={{ fontWeight: "bold", color: timeLeft <= 10 ? "#dc2626" : undefined }}>
              Time: {timeLeft}s
            </span>
          )}
          <RoomCodeBadge code={room.code} />
        </div>
      </div>

      {isRoundEnded && (
        <div
          style={{
            padding: "0.75rem 1rem",
            backgroundColor: "#fef9c3",
            border: "1px solid #fde047",
            borderRadius: "0.5rem",
            marginBottom: "1rem"
          }}
        >
          <strong>Round over!</strong> The word was <strong>{room.secretWord ?? "unknown"}</strong>.
        </div>
      )}

      <div className="summary-grid">
        <div>
          <canvas
            ref={canvasRef}
            width={480}
            height={360}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: "0.5rem",
              cursor: isDrawer && !isRoundEnded ? "crosshair" : "default",
              display: "block",
              touchAction: "none"
            }}
            onMouseDown={isDrawer ? onMouseDown : undefined}
            onMouseMove={isDrawer ? onMouseMove : undefined}
            onMouseUp={isDrawer ? onMouseUp : undefined}
            onMouseLeave={isDrawer ? onMouseLeave : undefined}
          />
          {isDrawer && !isRoundEnded && (
            <div className="button-row" style={{ marginTop: "0.5rem" }}>
              <button className="button button--secondary" onClick={handleClear}>
                Clear
              </button>
            </div>
          )}
          {!isDrawer && (
            <GuessForm
              onSubmit={handleGuessSubmit}
              disabled={isRoundEnded || hasGuessedCorrectly}
            />
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Scoreboard
            scores={room.gameState?.scores ?? []}
            participants={room.participants}
          />
          <ResultPanel
            guesses={room.gameState?.guesses ?? []}
            participants={room.participants}
          />
        </div>
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
      </div>
    </section>
  );
}
