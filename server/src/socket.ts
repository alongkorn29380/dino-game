import { WebSocket, WebSocketServer } from "ws";
import { createRoom, joinRoom, startRoom, getRoom, getRoomByWsId, removePlayerFromRoom } from "./room";
import { createInitialCells } from "./game/spawn";
import { applyItemEffect } from "./game/combat";
import { endTurn } from "./game/turn";
import type { Coord, GameState } from "./game/types";

// unique id ให้แต่ละ connection
let _idCounter = 0;
function newId() { return `ws_${_idCounter++}`; }

// broadcast ให้ทุกคนในห้อง
function broadcast(wss: WebSocketServer, roomCode: string, data: object) {
  const room = getRoom(roomCode);
  if (!room) return;
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    const room2 = getRoomByWsId((client as any)._wsId);
    if (room2?.code === roomCode && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

export function handleConnection(ws: WebSocket, wss: WebSocketServer) {
  const wsId = newId();
  (ws as any)._wsId = wsId;

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      handleMessage(ws, wss, wsId, msg);
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "invalid message" }));
    }
  });

  ws.on("close", () => {
    const room = removePlayerFromRoom(wsId);
    if (room) {
      broadcast(wss, room.code, { type: "player_left", players: room.players });
    }
  });
}

function handleMessage(ws: WebSocket, wss: WebSocketServer, wsId: string, msg: any) {
  switch (msg.type) {

    case "create_room": {
      const room = createRoom(wsId, msg.playerName ?? "ผู้เล่น 1");
      ws.send(JSON.stringify({ type: "room_created", code: room.code, playerId: 0 }));
      break;
    }

    case "join_room": {
      const room = joinRoom(msg.code, wsId, msg.playerName ?? `ผู้เล่น`);
      if (!room) {
        ws.send(JSON.stringify({ type: "error", message: "ห้องไม่มีหรือเต็มแล้ว" }));
        return;
      }
      const playerId = room.players.find(p => p.wsId === wsId)?.id ?? 0;
      ws.send(JSON.stringify({ type: "room_joined", code: room.code, playerId }));
      broadcast(wss, room.code, { type: "lobby_update", players: room.players });
      break;
    }

    case "start_game": {
      const room = startRoom(msg.code);
      if (!room || !room.state) {
        ws.send(JSON.stringify({ type: "error", message: "เริ่มเกมไม่ได้" }));
        return;
      }
      broadcast(wss, room.code, { type: "game_started", state: room.state });
      break;
    }

    case "spawn": {
      const room = getRoomByWsId(wsId);
      if (!room || !room.state) return;
      const state = room.state;
      const c: Coord = msg.coord;

      const taken = state.players.some(p => p.pos && p.pos.x === c.x && p.pos.y === c.y);
      if (taken) return;

      state.players = state.players.map((p, i) =>
        i === state.turnIndex ? { ...p, pos: c } : p
      );

      const nextTurnIndex = state.turnIndex + 1;
      if (nextTurnIndex >= state.players.length) {
        const { cells, terrain } = createInitialCells(state);
        state.cells = cells;
        state.terrain = terrain;
        state.turnIndex = 0;
        state.phase = "roll";
        state.log = [...state.log, "ทุกคนพร้อมแล้ว — เริ่มเกม!"];
      } else {
        state.turnIndex = nextTurnIndex;
        state.log = [...state.log, `${state.players[state.turnIndex - 1].name} เลือกจุดเกิดแล้ว`];
      }

      room.state = state;
      broadcast(wss, room.code, { type: "state_update", state: room.state });
      break;
    }

    case "roll": {
  const room = getRoomByWsId(wsId);
  if (!room || !room.state) return;
  if (room.state.phase !== "roll") return;

  // หา playerId จาก RoomPlayer แทน
  const roomPlayer = room.players.find(p => p.wsId === wsId);
  if (!roomPlayer) return;
  if (room.state.turnIndex !== roomPlayer.id) return;

  const rolled = Math.floor(Math.random() * 6) + 1;
  room.state = {
    ...room.state,
    dice: rolled,
    phase: "move",
    log: [...room.state.log, `${room.state.players[room.state.turnIndex].name} ทอยได้ ${rolled}`],
  };
  broadcast(wss, room.code, { type: "state_update", state: room.state });
  break;
}

    case "move": {
      const room = getRoomByWsId(wsId);
      if (!room || !room.state) return;
      if (room.state.phase !== "move") return;

      const c: Coord = msg.coord;
      const state = room.state;
      const cur = state.players[state.turnIndex];
      const cellKey = `${c.x},${c.y}`;
      const cell = state.cells[cellKey];
      let newCells = { ...state.cells };
      let newLog = [...state.log, `${cur.name} เดินไปที่ ${c.x},${c.y}`];
      let newPlayers = state.players.map((p, i) =>
        i === state.turnIndex ? { ...p, pos: c } : p
      );

      if (cell?.kind === "food") {
        newPlayers = newPlayers.map((p, i) => {
          if (i !== state.turnIndex) return p;
          const newHunger = Math.min(p.hunger + 3, 15);
          return { ...p, hunger: newHunger };
        });
        delete newCells[cellKey];
        newLog.push(`🍖 ${cur.name} เก็บอาหาร`);
      } else if (cell?.kind === "treasure" && cell.item) {
        const usedSlots = newPlayers[state.turnIndex].inventory.reduce((s, it) => s + it.slots, 0);
        if (usedSlots + cell.item.slots <= 7) {
          newPlayers = newPlayers.map((p, i) => {
            if (i !== state.turnIndex) return p;
            return { ...p, inventory: [...p.inventory, cell.item!] };
          });
          delete newCells[cellKey];
          newLog.push(`🎁 ${cur.name} เก็บ${cell.item.name}`);
        } else {
          newLog.push(`🎒 ${cur.name} กระเป๋าเต็ม!`);
        }
      }

      room.state = {
        ...state,
        players: newPlayers,
        cells: newCells,
        phase: "action",
        dice: 0,
        log: newLog,
      };
      broadcast(wss, room.code, { type: "state_update", state: room.state });
      break;
    }

    case "use_item": {
      const room = getRoomByWsId(wsId);
      if (!room || !room.state) return;
      if (room.state.phase !== "action") return;

      const newState = applyItemEffect(room.state, msg.item, msg.target ?? null);
      room.state = endTurn(newState);
      broadcast(wss, room.code, { type: "state_update", state: room.state });
      break;
    }

    case "skip_action": {
      const room = getRoomByWsId(wsId);
      if (!room || !room.state) return;
      if (room.state.phase !== "action") return;

      room.state = endTurn(room.state);
      broadcast(wss, room.code, { type: "state_update", state: room.state });
      break;
    }

    default:
      ws.send(JSON.stringify({ type: "error", message: `unknown type: ${msg.type}` }));
  }
}