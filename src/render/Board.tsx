import type { GameState, Coord } from "../game/types";
import { key } from "../game/grid";

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
      const c = { x, y };
      const k = key(c);
      const canMove = reachable.has(k);
      const player = state.players.find(p => p.alive && p.pos && p.pos.x === x && p.pos.y === y);
      const isDino = state.dino.pos.x === x && state.dino.pos.y === y;
      const cell = state.cells[k];
      const terrain = state.terrain[k];
      const isFood = cell?.kind === "food";
      const isTreasure = cell?.kind === "treasure";
      const isTree = terrain?.kind === "tree";
      const isGrass = terrain?.kind === "grass";

      // terrain บล็อกการ spawn ด้วย
      const isBlocked = isTree || isGrass;

      cells.push(
        <div
          key={k}
          onClick={() => {
            if (isBlocked && !isSpawn) return; // terrain กดไม่ได้ตอนเดิน
            if (isSpawn && !isBlocked) onCellClick(c);
            else if (!isSpawn && canMove) onCellClick(c);
          }}
          className={`w-8 h-8 border rounded-md flex items-center justify-center relative text-sm select-none
            ${isTree
              ? "bg-green-950 border-green-800"
              : isGrass
                ? "bg-green-900/30 border-green-900"
                : isSpawn
                  ? "bg-stone-800 border-stone-700 cursor-pointer hover:bg-stone-600"
                  : canMove
                    ? "bg-amber-900/40 border-amber-600 cursor-pointer hover:bg-amber-800/50"
                    : "bg-stone-800 border-stone-700"
            }`}
        >
          {/* terrain */}
          {isTree && !player && !isDino && <span>🌳</span>}
          {isGrass && !player && !isDino && <span className="opacity-60">🌿</span>}

          {/* ไดโน */}
          {isDino && <span>🦖</span>}

          {/* ผู้เล่น */}
          {player && (
            <span
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-stone-900 z-10"
              style={{ background: player.color }}
            >
              {player.id + 1}
            </span>
          )}

          {/* ของบนพื้น */}
          {!player && !isDino && !isTree && !isGrass && isFood && (
            <span>🍖</span>
          )}
          {!player && !isDino && !isTree && !isGrass && isTreasure && (
            <span>📦</span>
          )}

          {/* จุดไฮไลต์ */}
          {!player && !isDino && !isTree && !isGrass && canMove && !isFood && !isTreasure && (
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