import { useState, useMemo } from "react";
import type { Coord, GameState } from "../game/types";
import { reachableCells } from "../game/pathfinding";
import { key } from "../game/grid";
import { CONFIG, PLAYER_COLORS } from "../game/config";

const INITIAL_STATE: GameState = {
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
};

export function useGame()
{
    const [state, setState] = useState<GameState>(INITIAL_STATE);

    // Calculate walking distance.
    const reachable = useMemo (() => {
        const cur = state.players[state.turnIndex];
        console.log("dice:", state.dice);
        const blocked = [
        ...state.players.filter(p => p.alive && p.id !== cur.id).map(p => p.pos),
        state.dino.pos,
        ];

        const cells = reachableCells(cur.pos, state.dice, state.width, state.height, blocked);
        console.log("reachable count:", cells.length);
        return new Set(cells.map(key));
    }, [state]);

    function moveTo(c: Coord) {
        const targetKey = key(c);

        if (!reachable.has(targetKey)) {
            return;
        }

        setState(prevState => {
            const nextPlayers = prevState.players.map((player, index) => {
                if (index === prevState.turnIndex) {
                    return { ...player, pos: c };
                }
                return player;
            });

            return {
            ...prevState,
            players: nextPlayers,
            phase: "move",                                             
            turnIndex: (prevState.turnIndex + 1) % prevState.players.length, 
            dice: Math.floor(Math.random() * 6) + 1,
            log: [...prevState.log, `${prevState.players[prevState.turnIndex].name} เดินไปที่ ${c.x},${c.y}`],
            };
        });
    }
  return { state, reachable, moveTo };
}