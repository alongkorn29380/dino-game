import type { GameState, Player, Coord } from "./types";
import { shortestPath } from "./pathfinding";
import { CONFIG } from "./config";
import { key } from "./grid";

// หาผู้เล่นที่ใกล้ไดโนที่สุด
function nearestPlayer(state: GameState): Player | null {
  let best: Player | null = null;
  let bestDist = Infinity;

  // บล็อก terrain ทั้งหมด (ต้นไม้ + หญ้า)
  const blocked = Object.keys(state.terrain).map(k => {
    const [x, y] = k.split(",").map(Number);
    return { x, y };
  });

  for (const p of state.players) {
    if (!p.alive || !p.pos) continue;
    const path = shortestPath(state.dino.pos, p.pos, state.width, state.height, blocked);
    const dist = path.length;
    if (dist < bestDist || (dist === bestDist && best && p.id < best.id)) {
      bestDist = dist;
      best = p;
    }
  }
  return best;
}

export function updateDino(state: GameState): GameState {
  const target = nearestPlayer(state);
  if (!target || !target.pos) return state;

  const blocked = Object.keys(state.terrain).map(k => {
    const [x, y] = k.split(",").map(Number);
    return { x, y };
  });

  const path = shortestPath(state.dino.pos, target.pos, state.width, state.height, blocked);
  if (path.length === 0) return state;

  const steps = Math.min(CONFIG.DINO_SPEED, path.length);
  let currentPos: Coord = state.dino.pos;
  const newLog = [...state.log];
  let newPlayers = [...state.players];

  for (let i = 0; i < steps; i++) {
    currentPos = path[i];

    // เช็คว่าเหยียบใครไหม
    const victim = newPlayers.find(p => p.alive && p.pos && key(p.pos) === key(currentPos));
    if (victim) {
      // เช็คโล่ก่อน
      const hasShield = victim.inventory.some(it => it.kind === "shield");
      if (hasShield) {
        newPlayers = newPlayers.map(p =>
          p.id === victim.id
            ? { ...p, inventory: p.inventory.filter(it => it.kind !== "shield") }
            : p
        );
        newLog.push(`🛡️ ${victim.name} ใช้โล่กันไดโน!`);
      } else {
        newPlayers = newPlayers.map(p =>
          p.id === victim.id ? { ...p, alive: false } : p
        );
        newLog.push(`🦖 ไดโนจับ ${victim.name} ได้!`);
      }
      break;
    }
  }

  return {
    ...state,
    players: newPlayers,
    dino: { pos: currentPos },
    log: newLog,
  };
}