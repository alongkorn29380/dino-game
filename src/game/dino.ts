import type { GameState, Coord, Player } from "./types";
import { shortestPath } from "./pathfinding";
import { CONFIG } from "./config";
import { key } from "./grid";

export function updateDino(state: GameState): GameState {
  let currentPos = { ...state.dino.pos };
  
  const activePlayers = state.players.filter(p => p.alive);
  
  if (activePlayers.length === 0) return state;

  let shortestSteps = Infinity;
  let bestPath: Coord[] | null = null;
  let targetPlayer: Player | null = null;

  for (const player of activePlayers) {
    if (!player.pos) continue;
    const path = shortestPath(currentPos, player.pos, state.width, state.height);
    
    if (path && path.length < shortestSteps) {
      shortestSteps = path.length;
      bestPath = path;
      targetPlayer = player;
    }
  }

  const nextLog = [...state.log];

  if (bestPath && bestPath.length > 0) {

    const stepsToTake = Math.min(CONFIG.DINO_SPEED, bestPath.length);
    
    currentPos = bestPath[stepsToTake - 1]; 
    nextLog.push(`🦖 ไดโนเสาร์ขยับไปที่ ${currentPos.x},${currentPos.y}`);
  }

  const dinoKey = key(currentPos);
  const nextPlayers = state.players.map(player => {
    if (player.alive && player.pos && key(player.pos) === dinoKey) {
        nextLog.push(`💀 ${player.name} ถูกไดโนเสาร์เหยียบแล้ว!`);
        return { ...player, alive: false };
    }
    return player;
    });

  return {
    ...state,
    players: nextPlayers,
    dino: {
      ...state.dino,
      pos: currentPos
    },
    log: nextLog
  };
}