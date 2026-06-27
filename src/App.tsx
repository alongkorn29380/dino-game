import { Board } from "./render/Board";
import { useGame } from "./render/useGame";

export default function App() {
  const { state, reachable, moveTo, spawnPlayer } = useGame();

  const cur = state.players[state.turnIndex];

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center pt-8">
      <h1 className="text-stone-200 text-2xl font-bold mb-4">เกมเอาตัวรอด</h1>

      {state.phase === "spawn" && (
        <p className="text-amber-400 font-bold text-lg mb-3">
          {cur.name} — เลือกจุดเกิดของคุณ
        </p>
      )}

      {state.phase === "over" && (
        <div className="text-2xl font-bold text-amber-400 mb-4">
          {state.winnerId !== null
            ? `🏆 ${state.players[state.winnerId].name} ชนะ!`
            : "☠️ จบเกม — ไม่มีผู้รอดชีวิต!"}
        </div>
      )}

      <Board
        state={state}
        reachable={reachable}
        onCellClick={state.phase === "spawn" ? spawnPlayer : moveTo}
      />
    </div>
  );
}