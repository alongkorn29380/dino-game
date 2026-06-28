export type Coord = {
  x: number;
  y: number;
};

export type Dino = {
  pos: Coord;
};

export type Player = {
  id: number;
  name: string;
  color: string;
  pos: Coord | null;
  alive: boolean;
  hp: number;
  hunger: number;
  inventory: Item[];
};

export type ItemKind = 
  | "sword"
  | "spear"
  | "shield"
  | "medicine"
  | "bandage"
  | "shoes"
  | "rope"
  | "decoy"
  | "trap"
  | "rock"
  | "lantern"
  | "raincoat"
  | "steal";

export type Item = {
  id: string;
  kind: ItemKind;
  name: string;
  slots: number;
  effect: {
    range: number;
    targeting: boolean;
    passive: boolean;
    description: string;
  };
};

export type CellKind = 
  "empty" |
  "food"  |
  "treasure";

export type Cell = {
  kind: CellKind;
  item?: Item;
};

export type TerrainKind = 
  "tree" | 
  "grass";

export type Terrain = {
  kind: TerrainKind
};

export type GameState = {
  width: number;
  height: number;
  players: Player[];
  dino: Dino;
  turnIndex: number;
  round: number;
  dice: number;
  phase: "spawn" | "roll" | "move" | "action" | "over";
  winnerId: number | null;
  log: string[];
  cells: Record<string, Cell>;
  terrain: Record<string, Terrain>;
};