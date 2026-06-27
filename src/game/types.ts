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
};

export type GameState = {
  width: number;
  height: number;
  players: Player[];
  dino: Dino;
  turnIndex: number;
  round: number;
  dice: number;
  phase: "spawn" | "move" | "action" | "over";
  winnerId: number | null;
  log: string[];
};