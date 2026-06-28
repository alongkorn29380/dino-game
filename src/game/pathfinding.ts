import type { Coord } from "./types";
import { inBounds, key } from "./grid";

export function neighbors (c: Coord, w: number, h: number): Coord[] {
    const dirs = [
        { x:  0, y: -1 },
        { x:  0, y:  1 },
        { x: -1, y:  0 },
        { x:  1, y:  0 }
    ];

    const allNeighbors = dirs.map(d => ({
    x: c.x + d.x,
    y: c.y + d.y,
    }))

    return allNeighbors.filter(nextCoord => inBounds(nextCoord, w, h));
}

export function reachableCells(
  start: Coord,
  maxSteps: number,
  w: number,
  h: number,
  blocked: Coord[]
): Coord[] {
  const blockedSet = new Set(blocked.map(key));
  const seen = new Set<string>([key(start)]);
  const result: Coord[] = [];
  let frontier: Coord[] = [start];

  for (let step = 0; step < maxSteps; step++) {
    const next: Coord[] = [];
    for (const cell of frontier) {
      for (const n of neighbors(cell, w, h)) {
        const nkey = key(n);
        if (seen.has(nkey) || blockedSet.has(nkey)) continue;
        seen.add(nkey);
        result.push(n);
        next.push(n);
      }
    }
    frontier = next;
  }
  return result;
}

export function shortestPath(
  start: Coord,
  goal: Coord,
  w: number,
  h: number,
  blocked: Coord[] = [] // ← default ว่าง ไม่ต้องแก้ที่อื่น
): Coord[] {
  if (start.x === goal.x && start.y === goal.y) return [];

  const blockedSet = new Set(blocked.map(key));
  const came = new Map<string, Coord>();
  const seen = new Set<string>([key(start)]);
  let frontier: Coord[] = [start];

  while (frontier.length > 0) {
    const next: Coord[] = [];
    for (const cell of frontier) {
      for (const n of neighbors(cell, w, h)) {
        const nk = key(n);
        if (seen.has(nk)) continue;
        if (blockedSet.has(nk)) continue;
        seen.add(nk);
        came.set(nk, cell);
        if (n.x === goal.x && n.y === goal.y) {
          return rebuild(came, start, goal);
        }
        next.push(n);
      }
    }
    frontier = next;
  }
  return [];
}

function rebuild(came: Map<string, Coord>, start: Coord, goal: Coord): Coord[] {
  const path: Coord[] = [];
  let cur: Coord = goal;
  while (!(cur.x === start.x && cur.y === start.y)) {
    path.push(cur);
    cur = came.get(key(cur))!;
  }
  path.reverse();
  return path;
}