import { useState, useMemo } from "react";
import type { Coord, GameState, Item } from "../game/types";
import { reachableCells } from "../game/pathfinding";
import { key } from "../game/grid";
import { CONFIG, PLAYER_COLORS } from "../game/config";
import { applyItemEffect } from "../game/combat";
import { endTurn } from "../game/turn";
import { createInitialCells, respawnCell } from "../game/spawn";

const INITIAL_STATE: GameState = {
  width: CONFIG.GRID_W,
  height: CONFIG.GRID_H,
  players: [
    { id: 0, name: "ผู้เล่น 1", color: PLAYER_COLORS[0], pos: null, alive: true, hp: CONFIG.START_HP, hunger: CONFIG.HUNGER_START, inventory: [], buffs: [] },
    { id: 1, name: "ผู้เล่น 2", color: PLAYER_COLORS[1], pos: null, alive: true, hp: CONFIG.START_HP, hunger: CONFIG.HUNGER_START, inventory: [], buffs: [] },
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

      if (activeItem.kind === "rope") {
        const inRange = reachableCells(cur.pos, activeItem.effect.range, state.width, state.height, []);
        return new Set(inRange.map(key).filter(k => state.terrain[k]?.kind === "tree"));
      }

      const blocked = Object.keys(state.terrain).map(k => {
        const [x, y] = k.split(",").map(Number);
        return { x, y };
      });
      const cells = reachableCells(cur.pos, activeItem.effect.range, state.width, state.height, blocked);
      return new Set(cells.map(key));
    }

    if (state.phase !== "move") return new Set<string>();
    const cur = state.players[state.turnIndex];
    if (!cur || !cur.pos || !cur.alive) return new Set<string>();

    const shoesBuff = cur.buffs.find(b => b.kind === "shoes");
    const moveRange = state.dice + (shoesBuff ? 2 : 0);

    const blocked = [
      ...state.players.filter(p => p.alive && p.id !== cur.id && p.pos !== null).map(p => p.pos!),
      state.dino.pos,
      ...Object.keys(state.terrain).map(k => {
        const [x, y] = k.split(",").map(Number);
        return { x, y };
      }),
    ];
    const cells = reachableCells(cur.pos, moveRange, state.width, state.height, blocked);
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
          return { ...p, hunger: Math.min(p.hunger + CONFIG.HUNGER_PER_FOOD, CONFIG.HUNGER_MAX) };
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
      setState(prev => applyItemEffect(prev, item, null));
      setTimeout(() => setState(prev => endTurn(prev)), 0);
    } else {
      setActiveItem(item);
    }
  }

  function useItemOnCell(c: Coord) {
    if (!activeItem) return;
    if (!reachable.has(key(c))) return;
    setState(prev => applyItemEffect(prev, activeItem, c));
    setActiveItem(null);
    setTimeout(() => setState(prev => endTurn(prev)), 0);
  }

  function skipAction() {
    if (state.phase !== "action") return;
    setActiveItem(null);
    setState(prev => endTurn(prev));
  }

  return { state, reachable, activeItem, moveTo, spawnPlayer, rollDice, selectItem, skipAction };
}