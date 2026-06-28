import { useState, useMemo } from "react";
import type { Coord, GameState, Item, Terrain } from "../game/types";
import { reachableCells } from "../game/pathfinding";
import { key } from "../game/grid";
import { CONFIG, PLAYER_COLORS } from "../game/config";
import { updateDino } from "../game/dino";
import { createInitialCells, respawnCell } from "../game/spawn";

const INITIAL_STATE: GameState = {
  width: CONFIG.GRID_W,
  height: CONFIG.GRID_H,
  players: [
    { id: 0, name: "ผู้เล่น 1", color: PLAYER_COLORS[0], pos: null, alive: true, hp: CONFIG.START_HP, hunger: CONFIG.HUNGER_START, inventory: [] },
    { id: 1, name: "ผู้เล่น 2", color: PLAYER_COLORS[1], pos: null, alive: true, hp: CONFIG.START_HP, hunger: CONFIG.HUNGER_START, inventory: [] },
  ],
  dino: { pos: { x: Math.floor(CONFIG.GRID_W / 2), y: Math.floor(CONFIG.GRID_H / 2) } },
  turnIndex: 0,
  round: 1,
  dice: 0,
  phase: "spawn",
  winnerId: null,
  log: ["เลือกจุดเกิดได้เลย!"],
  cells: {},
  terrain: {},
};

export function useGame() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [activeItem, setActiveItem] = useState<Item | null>(null);

  const reachable = useMemo(() => {
    if (activeItem) {
      const cur = state.players[state.turnIndex];
      if (!cur.pos) return new Set<string>();

      // ถ้าเป็นเชือก — ไฮไลต์เฉพาะช่องที่มีต้นไม้ในระยะ
      if (activeItem.kind === "rope") {
        const inRange = reachableCells(cur.pos, activeItem.effect.range, state.width, state.height, []);
        const treeKeys = new Set(
          inRange.map(key).filter(k => state.terrain[k]?.kind === "tree")
        );
        return treeKeys;
      }

      // targeting อื่นๆ — บล็อกต้นไม้ + หญ้า (เดินผ่านไม่ได้)
      const blocked = Object.entries(state.terrain).map(([k]) => {
        const [x, y] = k.split(",").map(Number);
        return { x, y };
      });
      const cells = reachableCells(cur.pos, activeItem.effect.range, state.width, state.height, blocked);
      return new Set(cells.map(key));
    }

    if (state.phase !== "move") return new Set<string>();
    const cur = state.players[state.turnIndex];
    if (!cur || !cur.pos || !cur.alive) return new Set<string>();

    // บล็อกต้นไม้ + หญ้า + คนอื่น + ไดโน
    const blocked = [
      ...state.players.filter(p => p.alive && p.id !== cur.id && p.pos !== null).map(p => p.pos!),
      state.dino.pos,
      ...Object.entries(state.terrain).map(([k]) => {
        const [x, y] = k.split(",").map(Number);
        return { x, y };
      }),
    ];
    const cells = reachableCells(cur.pos, state.dice, state.width, state.height, blocked);
    return new Set(cells.map(key));
  }, [state, activeItem]);

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
        const stateReady: GameState = {
          ...prevState,
          players: nextPlayers,
          turnIndex: 0,
          dice: 0,
          phase: "roll" as const,
          log: [...prevState.log, "ทุกคนพร้อมแล้ว — เริ่มเกม!"],
          cells: {},
          terrain: {},
        };
        const { cells, terrain } = createInitialCells(stateReady);
        return { ...stateReady, cells, terrain };
      }

      return {
        ...prevState,
        players: nextPlayers,
        turnIndex: nextTurnIndex,
        log: [...prevState.log, `${prevState.players[prevState.turnIndex].name} เลือกจุดเกิดแล้ว`],
      };
    });
  }

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

  function moveTo(c: Coord) {
    if (activeItem) {
      useItemOnCell(c);
      return;
    }
    if (state.phase !== "move") return;
    if (!reachable.has(key(c))) return;
    if (!state.players[state.turnIndex].alive) return;

    setState(prevState => {
      const cur = prevState.players[prevState.turnIndex];
      const cellKey = key(c);
      const cell = prevState.cells[cellKey];
      let newCells = { ...prevState.cells };
      let newLog = [...prevState.log, `${cur.name} เดินไปที่ ${c.x},${c.y}`];

      let newPlayers = prevState.players.map((p, i) =>
        i === prevState.turnIndex ? { ...p, pos: c } : p
      );

      if (cell?.kind === "food") {
        newPlayers = newPlayers.map((p, i) => {
          if (i !== prevState.turnIndex) return p;
          const newHunger = Math.min(p.hunger + CONFIG.HUNGER_PER_FOOD, CONFIG.HUNGER_MAX);
          return { ...p, hunger: newHunger };
        });
        delete newCells[cellKey];
        newCells = respawnCell({ ...prevState, cells: newCells }, "food");
        newLog.push(`🍖 ${cur.name} เก็บอาหาร +${CONFIG.HUNGER_PER_FOOD} หิว`);
      } else if (cell?.kind === "treasure" && cell.item) {
        const usedSlots = newPlayers[prevState.turnIndex].inventory.reduce((s, it) => s + it.slots, 0);
        if (usedSlots + cell.item.slots <= CONFIG.INVENTORY_CAP) {
          newPlayers = newPlayers.map((p, i) => {
            if (i !== prevState.turnIndex) return p;
            return { ...p, inventory: [...p.inventory, cell.item!] };
          });
          delete newCells[cellKey];
          newCells = respawnCell({ ...prevState, cells: newCells }, "treasure");
          newLog.push(`🎁 ${cur.name} เก็บ${cell.item.name}`);
        } else {
          newLog.push(`🎒 ${cur.name} กระเป๋าเต็ม!`);
        }
      }

      return {
        ...prevState,
        players: newPlayers,
        cells: newCells,
        phase: "action" as const,
        turnIndex: prevState.turnIndex,
        round: prevState.round,
        dice: 0,
        log: newLog,
      };
    });
  }

  function selectItem(item: Item) {
    if (state.phase !== "action") return;
    if (item.effect.passive) return;
    if (!item.effect.targeting) {
      applyItemEffect(item, null);
    } else {
      setActiveItem(item);
    }
  }

  function useItemOnCell(c: Coord) {
    if (!activeItem) return;
    if (!reachable.has(key(c))) return;
    applyItemEffect(activeItem, c);
    setActiveItem(null);
  }

  function skipAction() {
    if (state.phase !== "action") return;
    setActiveItem(null);
    endTurn();
  }

  function applyItemEffect(item: Item, target: Coord | null) {
    setState(prevState => {
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

        case "rock":
          if (target) {
            newPlayers = newPlayers.map(p => {
              if (!p.alive || !p.pos || key(p.pos) !== key(target)) return p;
              const hasShield = p.inventory.some(it => it.kind === "shield");
              if (hasShield) return { ...p, inventory: p.inventory.filter(it => it.kind !== "shield") };
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
            // เช็คว่ามีต้นไม้กั้นระหว่างผู้ยิงกับเป้าไหม
            const spearBlocked = isBlockedByTree(cur.pos!, target, prevState.terrain);
            if (spearBlocked) {
              newLog.push(`🗡️ ${cur.name} ขว้างหอกแต่โดนต้นไม้บัง!`);
            } else {
              newPlayers = newPlayers.map(p => {
                if (!p.alive || !p.pos || key(p.pos) !== key(target)) return p;
                const hasShield = p.inventory.some(it => it.kind === "shield");
                if (hasShield) return { ...p, inventory: p.inventory.filter(it => it.kind !== "shield") };
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
            // พุ่งไปอยู่ติดกับต้นไม้
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

        case "shoes":
          // ใส่ buff shoes — เฟส 3 ค่อยทำ buff system เต็ม
          newPlayers = newPlayers.map((p, i) =>
            i === prevState.turnIndex
              ? { ...p, inventory: p.inventory.filter(it => it.id !== item.id) }
              : p
          );
          newLog.push(`👟 ${cur.name} ใส่รองเท้าวิ่ง +2 เดิน 3 รอบ`);
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
    });

    setTimeout(() => endTurn(), 0);
  }

  // เช็คว่ามีต้นไม้กั้นระหว่าง 2 จุดไหม (ray cast แบบง่าย)
  function isBlockedByTree(from: Coord, to: Coord, terrain: Record<string, Terrain>): boolean {
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

  // หาช่องที่อยู่ติดกับต้นไม้ที่เลือก (สำหรับเชือก)
  function getAdjacentToTree(treePos: Coord, state: GameState): Coord | null {
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

  function endTurn() {
    setState(prevState => {
      if (prevState.phase === "over") return prevState;

      const nextTurnIndex = (prevState.turnIndex + 1) % prevState.players.length;
      const isEndOfRound = nextTurnIndex === 0;

      let next: GameState = {
        ...prevState,
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
    });
  }

  return { state, reachable, activeItem, moveTo, spawnPlayer, rollDice, selectItem, skipAction };
}