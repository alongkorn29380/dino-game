import type { GameState, Coord } from "../game/types";

type Props = {
  state: GameState;
  reachable: Set<string>;
  onCellClick: (c: Coord) => void;
};

export function Board({ state, reachable, onCellClick }: Props) {
  const cells = [];
  const isSpawn = state.phase === "spawn";

  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const canMove = reachable.has(`${x},${y}`);
      const player = state.players.find(
        p => p.alive && p.pos && p.pos.x === x && p.pos.y === y
      );
      const isDino = state.dino.pos.x === x && state.dino.pos.y === y;

      cells.push(
        <div
          key={`${x},${y}`}
          onClick={() => {
            if (isSpawn) onCellClick({ x, y });
            else if (canMove) onCellClick({ x, y });
          }}
          className={`w-8 h-8 border rounded-md flex items-center justify-center
            ${isSpawn
              ? "bg-stone-800 border-stone-700 cursor-pointer hover:bg-stone-600"
              : canMove
                ? "bg-amber-900/40 border-amber-600 cursor-pointer hover:bg-amber-800/50"
                : "bg-stone-800 border-stone-700"
            }`}
        >
          {isDino && <span className="text-xs">🦖</span>}
          {player && (
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-stone-900"
              style={{ background: player.color }}
            >
              {player.id + 1}
            </span>
          )}
          {!player && !isDino && canMove && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 opacity-50" />
          )}
        </div>
      );
    }
  }

  return (
    <div
      className="grid gap-0.5"
      style={{ gridTemplateColumns: `repeat(${state.width}, 32px)` }}
    >
      {cells}
    </div>
  );
}