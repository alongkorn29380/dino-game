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
  pos: Coord;
  alive: boolean;
};

export type GameState = {
  width: number;
  height: number;
  players: Player[];
  dino: Dino;
  turnIndex: number;
  round: number;
  dice: number;
  phase: "move" | "action";
  winnerId: number | null;
  log: string[];
};