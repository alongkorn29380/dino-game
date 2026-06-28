import type { Coord } from "./types";

export function inBounds(c: Coord, w: number, h: number): boolean {
    return c.x >= 0 && c.x < w && c.y >= 0 && c.y < h
}

export function sameCell(a: Coord, b: Coord): boolean {
    return a.x === b.x && a.y === b.y
}

export function key(c: Coord) : string {
    return `${c.x},${c.y}`;
}