import type { Cell, Coord, GameState, Terrain } from "./types";
import { key } from "./grid";
import { randomItem } from "../data/items";
import { CONFIG } from "./config";

// สุ่มจุดที่ไม่ซ้ำกับที่มีคนยืน ไดโน หรือช่องที่มีของอยู่แล้ว
function randomEmptyCoord(state: GameState, taken: Set<string>): Coord | null {
  const attempts = 100;
  for (let i = 0; i < attempts; i++) {
    const x = Math.floor(Math.random() * state.width);
    const y = Math.floor(Math.random() * state.height);
    const k = key({ x, y });
    if (!taken.has(k)) return { x, y };
  }
  return null;
}

// สร้าง cells เริ่มต้น (เรียกตอนเริ่มเกมจริง หลัง spawn)
export function createInitialCells(state: GameState): {
  cells: Record<string, Cell>;
  terrain: Record<string, Terrain>;
} {
  const cells: Record<string, Cell> = {};
  const terrain: Record<string, Terrain> = {};
  const taken = new Set<string>();

  // เพิ่มตำแหน่งคนและไดโนใน taken
  for (const p of state.players) {
    if (p.pos) taken.add(key(p.pos));
  }
  taken.add(key(state.dino.pos));

   // วางต้นไม้
  for (let i = 0; i < CONFIG.TREE_COUNT; i++) {
    const coord = randomEmptyCoord(state, taken);
    if (!coord) break;
    const k = key(coord);
    terrain[k] = { kind: "tree" };
    taken.add(k);
  }

  // วางหญ้า
  for (let i = 0; i < CONFIG.GRASS_COUNT; i++) {
    const coord = randomEmptyCoord(state, taken);
    if (!coord) break;
    const k = key(coord);
    terrain[k] = { kind: "grass" };
    taken.add(k);
  }

  // วางอาหาร (ต้องไม่ทับ terrain)
  for (let i = 0; i < CONFIG.FOOD_COUNT; i++) {
    const coord = randomEmptyCoord(state, taken);
    if (!coord) break;
    const k = key(coord);
    cells[k] = { kind: "food" };
    taken.add(k);
  }

  // วางสมบัติ
  for (let i = 0; i < CONFIG.TREASURE_COUNT; i++) {
    const coord = randomEmptyCoord(state, taken);
    if (!coord) break;
    const k = key(coord);
    cells[k] = { kind: "treasure", item: randomItem() };
    taken.add(k);
  }

  return { cells, terrain };
}

// เกิดของใหม่ 1 ชิ้นแทนที่ที่หายไป (เรียกหลังเก็บของ)
export function respawnCell(
  state: GameState,
  kind: "food" | "treasure"
): Record<string, Cell> {
  const taken = new Set<string>(Object.keys(state.cells));
  for (const p of state.players) {
    if (p.pos) taken.add(key(p.pos));
  }
  taken.add(key(state.dino.pos));

  const coord = randomEmptyCoord(state, taken);
  if (!coord) return state.cells;

  const k = key(coord);
  const newCell: Cell =
    kind === "food"
      ? { kind: "food" }
      : { kind: "treasure", item: randomItem() };

  return { ...state.cells, [k]: newCell };
}