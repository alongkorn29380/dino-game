import type { GameState } from "./game/types";
import { CONFIG, PLAYER_COLORS } from "./game/config";
import { createInitialCells } from "./game/spawn";

export type RoomPlayer = {
  id: number;
  name: string;
  color: string;
  wsId: string; // unique id ของ WebSocket connection
};

export type Room = {
  code: string;
  players: RoomPlayer[];
  state: GameState | null;
  started: boolean;
};

// เก็บห้องทั้งหมด
const rooms = new Map<string, Room>();

// สร้างรหัสห้อง 4 ตัว
function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return rooms.has(code) ? generateCode() : code;
}

export function createRoom(wsId: string, playerName: string): Room {
  const code = generateCode();
  const player: RoomPlayer = {
    id: 0,
    name: playerName,
    color: PLAYER_COLORS[0],
    wsId,
  };
  const room: Room = { code, players: [player], state: null, started: false };
  rooms.set(code, room);
  return room;
}

export function joinRoom(code: string, wsId: string, playerName: string): Room | null {
  const room = rooms.get(code.toUpperCase());
  if (!room) return null;
  if (room.started) return null;
  if (room.players.length >= CONFIG.MAX_PLAYERS) return null;
  if (room.players.some(p => p.wsId === wsId)) return room;

  const id = room.players.length;
  room.players.push({
    id,
    name: playerName,
    color: PLAYER_COLORS[id % PLAYER_COLORS.length],
    wsId,
  });
  return room;
}

export function startRoom(code: string): Room | null {
  const room = rooms.get(code);
  if (!room) return null;
  if (room.players.length < CONFIG.MIN_PLAYERS) return null;

  const initialState: GameState = {
    width: CONFIG.GRID_W,
    height: CONFIG.GRID_H,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      color: p.color,
      pos: null,
      alive: true,
      hp: CONFIG.START_HP,
      hunger: CONFIG.HUNGER_START,
      inventory: [],
      buffs: [],
    })),
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

  room.state = initialState;
  room.started = true;
  return room;
}

export function getRoom(code: string): Room | undefined {
  return rooms.get(code);
}

export function getRoomByWsId(wsId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.wsId === wsId)) return room;
  }
  return undefined;
}

export function removePlayerFromRoom(wsId: string): Room | undefined {
  const room = getRoomByWsId(wsId);
  if (!room) return undefined;
  room.players = room.players.filter(p => p.wsId !== wsId);
  if (room.players.length === 0) rooms.delete(room.code);
  return room;
}