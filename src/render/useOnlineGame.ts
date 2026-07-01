import { useState, useEffect, useRef } from "react";
import type { GameState } from "../game/types";

type Phase = "lobby" | "waiting" | "playing";

export function useOnlineGame() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [phase, setPhase] = useState<Phase>("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [playerId, setPlayerId] = useState<number | null>(null);
  const [players, setPlayers] = useState<{ id: number; name: string; color: string }[]>([]);
  const [error, setError] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;

    const ws = new WebSocket("ws://localhost:3001");
    wsRef.current = ws;

    ws.onopen = () => {
      if (cancelled) return;
      console.log("Connected to Game Server");
      setError("");
    };

    ws.onmessage = (e) => {
      if (cancelled) return;
      try {
        const msg = JSON.parse(e.data);
        switch (msg.type) {
          case "room_created":
            setRoomCode(msg.code);
            setPlayerId(msg.playerId);
            setPhase("waiting");
            break;
          case "room_joined":
            setRoomCode(msg.code);
            setPlayerId(msg.playerId);
            setPhase("waiting");
            break;
          case "lobby_update":
            setPlayers(msg.players);
            break;
          case "game_started":
            setGameState(msg.state);
            setPhase("playing");
            break;
          case "state_update":
            setGameState(msg.state);
            break;
          case "error":
            setError(msg.message);
            break;
          default:
            console.log("Unhandled message type:", msg.type);
        }
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
      }
    };

    ws.onerror = () => {
      if (cancelled) return;
      console.error("WebSocket Error");
      setError("Connection error occurred.");
    };

    ws.onclose = () => {
      if (cancelled) return;
      console.log("Disconnected from Game Server");
      wsRef.current = null;
    };

    return () => {
      cancelled = true;
      ws.close();
    };
  }, []);

  function send(data: object) {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      setError("Server connection lost. Please refresh the page.");
    }
  }

  function createRoom(playerName: string) {
    send({ type: "create_room", playerName });
  }

  function joinRoom(code: string, playerName: string) {
    send({ type: "join_room", code, playerName });
  }

  function startGame() {
    send({ type: "start_game", code: roomCode });
  }

  function spawnPlayer(coord: { x: number; y: number }) {
    send({ type: "spawn", coord });
  }

  function rollDice() {
    send({ type: "roll" });
  }

  function moveTo(coord: { x: number; y: number }) {
    send({ type: "move", coord });
  }

  function useItem(item: object, target?: { x: number; y: number }) {
    send({ type: "use_item", item, target: target ?? null });
  }

  function skipAction() {
    send({ type: "skip_action" });
  }

  return {
    gameState,
    phase,
    roomCode,
    playerId,
    players,
    error,
    setError,
    createRoom,
    joinRoom,
    startGame,
    spawnPlayer,
    rollDice,
    moveTo,
    useItem,
    skipAction,
  };
}