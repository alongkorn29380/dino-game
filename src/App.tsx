import { Board } from "./render/Board";
import { useGame } from "./render/useGame";

export default function App() {
  const { state, reachable, moveTo } = useGame();

  return (
    <div className="min-h-screen bg-stone-950 flex flex-col items-center pt-8">
      <h1 className="text-stone-200 text-2xl font-bold mb-4">เกมเอาตัวรอด</h1>
      <Board state={state} reachable={reachable} onCellClick={moveTo} />
    </div>
  );
}