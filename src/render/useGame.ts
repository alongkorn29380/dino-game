import { useState, useMemo } from "react";
import type { Coord, GameState } from "../game/types";
import { reachableCells } from "../game/pathfinding";
import { key } from "../game/grid";
import { CONFIG, PLAYER_COLORS } from "../game/config";
import { updateDino } from "../game/dino";

const INITIAL_STATE: GameState = {
  width: CONFIG.GRID_W,
  height: CONFIG.GRID_H,
  players: [
    { id: 0, name: "ผู้เล่น 1", color: PLAYER_COLORS[0], pos: null, alive: true, hp: CONFIG.START_HP, hunger: CONFIG.HUNGER_MAX },
    { id: 1, name: "ผู้เล่น 2", color: PLAYER_COLORS[1], pos: null, alive: true, hp: CONFIG.START_HP, hunger: CONFIG.HUNGER_MAX },
  ],
  dino: { pos: { x: Math.floor(CONFIG.GRID_W / 2), y: Math.floor(CONFIG.GRID_H / 2) } },
  turnIndex: 0,
  round: 1,
  dice: 3,
  phase: "spawn",
  winnerId: null,
  log: ["เลือกจุดเกิดได้เลย!"],
};

export function useGame() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);

  const reachable = useMemo(() => {
    if (state.phase === "over") return new Set<string>();
    if (state.phase === "spawn") return new Set<string>();

    const cur = state.players[state.turnIndex];
    if (!cur || !cur.pos || !cur.alive) return new Set<string>();

    const blocked = [
      ...state.players
        .filter(p => p.alive && p.id !== cur.id && p.pos !== null)
        .map(p => p.pos!),
      state.dino.pos,
    ];
    const cells = reachableCells(cur.pos, state.dice, state.width, state.height, blocked);
    return new Set(cells.map(key));
  }, [state]);

  function spawnPlayer(c: Coord) {
    if (state.phase !== "spawn") return;

    setState(prevState => {
      const taken = prevState.players.some(p => p.pos && p.pos.x === c.x && p.pos.y === c.y);
      if (taken) return prevState;

      const nextPlayers = prevState.players.map((p, i) =>
        i === prevState.turnIndex ? { ...p, pos: c } : p
      );

      const nextTurnIndex = prevState.turnIndex + 1;

      if (nextTurnIndex >= prevState.players.length) {
        return {
          ...prevState,
          players: nextPlayers,
          turnIndex: 0,
          dice: Math.floor(Math.random() * 6) + 1,
          phase: "move" as const,
          log: [...prevState.log, "ทุกคนพร้อมแล้ว — เริ่มเกม!"],
        };
      }

      return {
        ...prevState,
        players: nextPlayers,
        turnIndex: nextTurnIndex,
        log: [...prevState.log, `${prevState.players[prevState.turnIndex].name} เลือกจุดเกิดแล้ว`],
      };
    });
  }

  function moveTo(c: Coord) {
    const targetKey = key(c);
    if (!reachable.has(targetKey)) return;
    if (state.phase === "over") return;
    if (!state.players[state.turnIndex].alive) return;

    setState(prevState => {
      const nextPlayers = prevState.players.map((player, index) => {
        if (index === prevState.turnIndex) {
          return { ...player, pos: c };
        }
        return player;
      });

      const nextTurnIndex = (prevState.turnIndex + 1) % prevState.players.length;
      const isEndOfRound = nextTurnIndex === 0;

      const stateAfterMove: GameState = {
        ...prevState,
        players: nextPlayers,
        phase: "move",
        turnIndex: nextTurnIndex,
        round: isEndOfRound ? prevState.round + 1 : prevState.round,
        dice: Math.floor(Math.random() * 6) + 1,
        log: [...prevState.log, `${prevState.players[prevState.turnIndex].name} เดินไปที่ ${c.x},${c.y}`],
      };

      const afterDino = isEndOfRound ? updateDino(stateAfterMove) : stateAfterMove;
      const alivePlayers = afterDino.players.filter(p => p.alive);

      if (alivePlayers.length <= 1) {
        return {
          ...afterDino,
          phase: "over" as const,
          winnerId: alivePlayers.length === 1 ? alivePlayers[0].id : null,
          log: [
            ...afterDino.log,
            alivePlayers.length === 1
              ? `🏆 ${alivePlayers[0].name} รอดเป็นคนสุดท้าย!`
              : "☠️ จบเกม — ไม่มีผู้รอดชีวิต!",
          ],
        };
      }

      let nextIdx = nextTurnIndex;
      while (!afterDino.players[nextIdx].alive) {
        nextIdx = (nextIdx + 1) % afterDino.players.length;
      }

      return { ...afterDino, turnIndex: nextIdx };
    });
  }

  return { state, reachable, moveTo, spawnPlayer };
}