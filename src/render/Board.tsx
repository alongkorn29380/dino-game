import type { GameState, Coord } from "../game/types";

type Props = {
  state: GameState;
  reachable: Set<string>;
  onCellClick: (c: Coord) => void;
};

export function Board({ state, reachable, onCellClick }: Props) 
{
    const cells = [];

    for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
            const canMove = reachable.has(`${x},${y}`);
            const player = state.players.find(p => p.alive && p.pos.x === x && p.pos.y === y);
            const isDino = state.dino.pos.x === x && state.dino.pos.y === y

            cells.push(
                <div 
                    key={`${x},${y}`} 
                    onClick={() => canMove && onCellClick({ x, y })}
                    className={`w-12 h-12 border rounded-lg flex items-center justify-center text-xl
                        ${canMove
                            ? "bg-amber-900/40 border-amber-600 cursor-pointer hover:bg-amber-800/50"
                            : "bg-stone-800 border-stone-700"
                        }`}
                    >
                    {isDino && <span>🦖</span>}
                    {player && (
                        <span
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-stone-900"
                            style={{ background: player.color }}
                        >
                            P
                        </span>
                        )}
                        {!player && !isDino && canMove && (
                            <span className="w-2 h-2 rounded-full bg-amber-500 opacity-50" />
                        )}
                </div>
            )
        }
    }

    return (
        <div 
            className="grid gap-1 p-3 bg-stone-900 rounded-xl border border-stone-700"
            style={{ gridTemplateColumns: `repeat(${state.width}, 48px)` }}
        >
            {cells}
        </div>
    )
}