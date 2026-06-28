import type { Coord, GameState, Item, Terrain } from "./types";
import { key } from "./grid";
import { CONFIG } from "./config";
import { respawnCell } from "./spawn";

export function isBlockedByTree(
  from: Coord,
  to: Coord,
  terrain: Record<string, Terrain>
): boolean {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  for (let i = 1; i < steps; i++) {
    const x = Math.round(from.x + (dx * i) / steps);
    const y = Math.round(from.y + (dy * i) / steps);
    if (terrain[key({ x, y })]?.kind === "tree") return true;
  }
  return false;
}

export function getAdjacentToTree(treePos: Coord, state: GameState): Coord | null {
  const dirs = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];
  const cur = state.players[state.turnIndex];
  for (const d of dirs) {
    const c = { x: treePos.x + d.x, y: treePos.y + d.y };
    if (c.x < 0 || c.y < 0 || c.x >= state.width || c.y >= state.height) continue;
    if (state.terrain[key(c)]) continue;
    if (cur.pos && key(c) === key(cur.pos)) continue;
    return c;
  }
  return null;
}

export function applyItemEffect(
  prevState: GameState,
  item: Item,
  target: Coord | null
): GameState {
  const cur = prevState.players[prevState.turnIndex];
  let newPlayers = [...prevState.players];
  let newCells = { ...prevState.cells };
  let newLog = [...prevState.log];

  switch (item.kind) {
    case "medicine":
      if (cur.hp >= CONFIG.START_HP) {
        newLog.push(`💊 ${cur.name} HP เต็มแล้ว ใช้ยาไม่ได้`);
        break;
      }
      newPlayers = newPlayers.map((p, i) =>
        i === prevState.turnIndex
          ? { ...p, hp: Math.min(p.hp + 1, CONFIG.START_HP), inventory: p.inventory.filter(it => it.id !== item.id) }
          : p
      );
      newLog.push(`💊 ${cur.name} ใช้ยา +1 HP`);
      break;

    case "bandage":
      if (cur.hp >= CONFIG.START_HP) {
        newLog.push(`🩹 ${cur.name} HP เต็มแล้ว ใช้ผ้าพันแผลไม่ได้`);
        break;
      }
      newPlayers = newPlayers.map((p, i) =>
        i === prevState.turnIndex
          ? { ...p, hp: Math.min(p.hp + 1, CONFIG.START_HP), inventory: p.inventory.filter(it => it.id !== item.id) }
          : p
      );
      newLog.push(`🩹 ${cur.name} ใช้ผ้าพันแผล +1 HP`);
      break;

    case "shoes":
      newPlayers = newPlayers.map((p, i) =>
        i === prevState.turnIndex
          ? {
              ...p,
              buffs: [...p.buffs.filter(b => b.kind !== "shoes"), { kind: "shoes" as const, roundsLeft: 3 }],
              inventory: p.inventory.filter(it => it.id !== item.id),
            }
          : p
      );
      newLog.push(`👟 ${cur.name} ใส่รองเท้าวิ่ง +2 เดิน 3 รอบ`);
      break;

    case "rock":
      if (target) {
        newPlayers = newPlayers.map(p => {
          if (!p.alive || !p.pos || key(p.pos) !== key(target)) return p;
          const hasShield = p.inventory.some(it => it.kind === "shield");
          if (hasShield) {
            newLog.push(`🛡️ ${p.name} ใช้โล่กันก้อนหิน!`);
            return { ...p, inventory: p.inventory.filter(it => it.kind !== "shield") };
          }
          return { ...p, hp: p.hp - 1, alive: p.hp - 1 > 0 };
        });
        newPlayers = newPlayers.map((p, i) =>
          i === prevState.turnIndex
            ? { ...p, inventory: p.inventory.filter(it => it.id !== item.id) }
            : p
        );
        newLog.push(`🪨 ${cur.name} ขว้างก้อนหิน`);
      }
      break;

    case "spear":
      if (target) {
        const spearBlocked = isBlockedByTree(cur.pos!, target, prevState.terrain);
        if (spearBlocked) {
          newLog.push(`🗡️ ${cur.name} ขว้างหอกแต่โดนต้นไม้บัง!`);
        } else {
          newPlayers = newPlayers.map(p => {
            if (!p.alive || !p.pos || key(p.pos) !== key(target)) return p;
            const hasShield = p.inventory.some(it => it.kind === "shield");
            if (hasShield) {
              newLog.push(`🛡️ ${p.name} ใช้โล่กันหอก!`);
              return { ...p, inventory: p.inventory.filter(it => it.kind !== "shield") };
            }
            return { ...p, hp: p.hp - 1, alive: p.hp - 1 > 0 };
          });
          newLog.push(`🗡️ ${cur.name} ขว้างหอก -1 HP`);
        }
        newPlayers = newPlayers.map((p, i) =>
          i === prevState.turnIndex
            ? { ...p, inventory: p.inventory.filter(it => it.id !== item.id) }
            : p
        );
      }
      break;

    case "sword":
      if (target) {
        newPlayers = newPlayers.map(p => {
          if (!p.alive || !p.pos || key(p.pos) !== key(target)) return p;
          const hasShield = p.inventory.some(it => it.kind === "shield");
          if (hasShield) {
            newLog.push(`🛡️ ${p.name} ใช้โล่กันดาบ!`);
            return { ...p, inventory: p.inventory.filter(it => it.kind !== "shield") };
          }
          return { ...p, hp: 0, alive: false };
        });
        newPlayers = newPlayers.map((p, i) =>
          i === prevState.turnIndex
            ? { ...p, inventory: p.inventory.filter(it => it.id !== item.id) }
            : p
        );
        newLog.push(`⚔️ ${cur.name} ใช้ดาบ!`);
      }
      break;

    case "rope":
      if (target) {
        const adjacent = getAdjacentToTree(target, prevState);
        if (adjacent) {
          newPlayers = newPlayers.map((p, i) =>
            i === prevState.turnIndex ? { ...p, pos: adjacent } : p
          );
          newLog.push(`🪢 ${cur.name} พุ่งไปที่ต้นไม้!`);
        }
        newPlayers = newPlayers.map((p, i) =>
          i === prevState.turnIndex
            ? { ...p, inventory: p.inventory.filter(it => it.id !== item.id) }
            : p
        );
      }
      break;

    case "trap":
      if (target) {
        const k = key(target);
        newCells = { ...newCells, [k]: { kind: "treasure", item: { ...item } } };
        newPlayers = newPlayers.map((p, i) =>
          i === prevState.turnIndex
            ? { ...p, inventory: p.inventory.filter(it => it.id !== item.id) }
            : p
        );
        newLog.push(`🪤 ${cur.name} วางกับดัก`);
      }
      break;

    case "decoy":
      if (target) {
        newCells = { ...newCells, [key(target)]: { kind: "treasure", item } };
        newPlayers = newPlayers.map((p, i) =>
          i === prevState.turnIndex
            ? { ...p, inventory: p.inventory.filter(it => it.id !== item.id) }
            : p
        );
        newLog.push(`🎵 ${cur.name} วางของล่อ`);
      }
      break;

    case "steal":
      if (target) {
        const victim = newPlayers.find(p => p.alive && p.pos && key(p.pos) === key(target));
        if (victim && victim.inventory.length > 0) {
          const stolen = victim.inventory[Math.floor(Math.random() * victim.inventory.length)];
          newPlayers = newPlayers.map(p => {
            if (p.id === victim.id) return { ...p, inventory: p.inventory.filter(it => it.id !== stolen.id) };
            if (p.id === cur.id) return { ...p, inventory: [...p.inventory.filter(it => it.id !== item.id), stolen] };
            return p;
          });
          newLog.push(`🤏 ${cur.name} ขโมย${stolen.name}จาก${victim.name}`);
        } else {
          newPlayers = newPlayers.map((p, i) =>
            i === prevState.turnIndex
              ? { ...p, inventory: p.inventory.filter(it => it.id !== item.id) }
              : p
          );
          newLog.push(`🤏 ${cur.name} ขโมยของแต่เป้าหมายไม่มีของ`);
        }
      }
      break;

    default:
      newLog.push(`${cur.name} ใช้${item.name}`);
      newPlayers = newPlayers.map((p, i) =>
        i === prevState.turnIndex
          ? { ...p, inventory: p.inventory.filter(it => it.id !== item.id) }
          : p
      );
  }

  const alivePlayers = newPlayers.filter(p => p.alive);
  if (alivePlayers.length <= 1) {
    return {
      ...prevState,
      players: newPlayers,
      cells: newCells,
      phase: "over" as const,
      winnerId: alivePlayers.length === 1 ? alivePlayers[0].id : null,
      log: [...newLog, alivePlayers.length === 1
        ? `🏆 ${alivePlayers[0].name} ชนะ!`
        : "☠️ ไม่มีผู้รอด!"],
    };
  }

  return { ...prevState, players: newPlayers, cells: newCells, log: newLog };
}