import { useState } from "react"
import { CONFIG, PLAYER_COLORS } from "./game/config"
import type { GameState } from "./game/types"
import { Board } from "./render/Board"

export default function App() {
  const [state, setState] = useState<GameState>({
  width: CONFIG.GRID_W,
  height: CONFIG.GRID_H,
  players: [
    { id: 0, name: "ผู้เล่น 1", color: PLAYER_COLORS[0], pos: { x: 0, y: 0 }, alive: true },
    { id: 1, name: "ผู้เล่น 2", color: PLAYER_COLORS[1], pos: { x: 8, y: 8 }, alive: true },
  ],
  dino: { pos: { x: 4, y: 4 } },
  turnIndex: 0,
  round: 1,
  dice: 3,
  phase: "move",
  winnerId: null,
  log: ["เริ่มเกม!"],
  });

  return (
  <div className="min-h-screen bg-stone-950 flex flex-col items-center pt-8">
    <h1 className="text-stone-200 text-2xl font-bold mb-4">เกมเอาตัวรอด</h1>
    <Board state={state} />
  </div>
);
}