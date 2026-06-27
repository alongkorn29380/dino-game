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
    const blockedSet = new Set(blocked.map(key))
    const seen = new Set<string>([key(start)])
    const result: Coord[] = [];
    let frontier: Coord[] = [start];

    for (let step = 0; step < maxSteps; step++) {
        const next: Coord[] = [];
        for(const cell of frontier) {
            for (const n of neighbors(cell, w, h)) {
                const nkey = key(n);

                // If you have been here before (seen) or it is a blocked passage -> skip it.
                if(seen.has(nkey) || blockedSet.has(nkey)) {
                    continue;
                }

                // If it's a new, navigable lane -> Save status
                seen.add(nkey);
                result.push(n)
                next.push(n)
            }
        }
        frontier = next;
    }
    return result;
}