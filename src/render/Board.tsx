import type { GameState } from "../game/types";

type Props = {
    state: GameState;
};

export function Board({ state }: Props)
{
    const cells = [];

    for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
            const player = state.players.find(p => p.alive && p.pos.x === x && p.pos.y === y);

            const isDino = state.dino.pos.x === x && state.dino.pos.y === y

            cells.push(
                <div 
                    key={`${x},${y}`} 
                    className="w-12 h-12 bg-stone-800 border border-stone-700 rounded-lg flex items-center justify-center text-xl"
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