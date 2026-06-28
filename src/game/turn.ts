import type { GameState } from "./types";
import { updateDino } from "./dino";

export function endTurn(prevState: GameState): GameState {
  if (prevState.phase === "over") return prevState;

  const nextTurnIndex = (prevState.turnIndex + 1) % prevState.players.length;
  const isEndOfRound = nextTurnIndex === 0;

  // ลด buff roundsLeft ทุกรอบ
  const updatedPlayers = prevState.players.map(p => ({
    ...p,
    buffs: isEndOfRound
      ? p.buffs.map(b => ({ ...b, roundsLeft: b.roundsLeft - 1 })).filter(b => b.roundsLeft > 0)
      : p.buffs,
  }));

  let next: GameState = {
    ...prevState,
    players: updatedPlayers,
    phase: "roll" as const,
    turnIndex: nextTurnIndex,
    round: isEndOfRound ? prevState.round + 1 : prevState.round,
    dice: 0,
  };

  let afterDino = isEndOfRound ? updateDino(next) : next;

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
      log: [...afterDino.log, alivePlayers.length === 1
        ? `🏆 ${alivePlayers[0].name} รอดเป็นคนสุดท้าย!`
        : "☠️ จบเกม — ไม่มีผู้รอดชีวิต!"],
    };
  }

  let nextIdx = nextTurnIndex;
  while (!afterDino.players[nextIdx].alive) {
    nextIdx = (nextIdx + 1) % afterDino.players.length;
  }

  return { ...afterDino, turnIndex: nextIdx };
}