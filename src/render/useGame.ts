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
  dice: 0,
  phase: "spawn",
  winnerId: null,
  log: ["เลือกจุดเกิดได้เลย!"],
};

export function useGame() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);

  const reachable = useMemo(() => {
    if (state.phase !== "move") return new Set<string>();

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

  // เลือกจุดเกิด
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
          dice: 0,
          phase: "roll" as const,
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

  // กดสุ่มเต๋า
  function rollDice() {
    if (state.phase !== "roll") return;
    const rolled = Math.floor(Math.random() * 6) + 1;
    setState(prev => ({
      ...prev,
      dice: rolled,
      phase: "move" as const,
      log: [...prev.log, `${prev.players[prev.turnIndex].name} ทอยได้ ${rolled}`],
    }));
  }

  // เดิน
  function moveTo(c: Coord) {
    if (state.phase !== "move") return;
    if (!reachable.has(key(c))) return;
    if (!state.players[state.turnIndex].alive) return;

    setState(prevState => {
      const nextPlayers = prevState.players.map((player, index) =>
        index === prevState.turnIndex ? { ...player, pos: c } : player
      );

      const nextTurnIndex = (prevState.turnIndex + 1) % prevState.players.length;
      const isEndOfRound = nextTurnIndex === 0;

      const stateAfterMove: GameState = {
        ...prevState,
        players: nextPlayers,
        phase: "roll" as const,
        turnIndex: nextTurnIndex,
        round: isEndOfRound ? prevState.round + 1 : prevState.round,
        dice: 0,
        log: [...prevState.log, `${prevState.players[prevState.turnIndex].name} เดินไปที่ ${c.x},${c.y}`],
      };

      // ครบรอบ → ไดโนขยับ + หิวลด
      let afterDino = isEndOfRound ? updateDino(stateAfterMove) : stateAfterMove;

      if (isEndOfRound) {
        afterDino = {
          ...afterDino,
          players: afterDino.players.map(p => {
            if (!p.alive) return p;
            const newHunger = p.hunger - 1;
            if (newHunger <= 0) return { ...p, hunger: 0, alive: false };
            return { ...p, hunger: newHunger };
          }),
          log: [...afterDino.log, "🍖 ทุกคนหิวขึ้น 1"],
        };
      }

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

      // ข้ามคนตาย
      let nextIdx = nextTurnIndex;
      while (!afterDino.players[nextIdx].alive) {
        nextIdx = (nextIdx + 1) % afterDino.players.length;
      }

      return { ...afterDino, turnIndex: nextIdx };
    });
  }

  return { state, reachable, moveTo, spawnPlayer, rollDice };
}