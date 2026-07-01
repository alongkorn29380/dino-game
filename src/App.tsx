import { useEffect, useMemo, useRef, useState } from "react";
import { Board } from "./render/Board";
import { useOnlineGame } from "./render/useOnlineGame";
import { CONFIG } from "./game/config";
import { reachableCells } from "./game/pathfinding";
import { key } from "./game/grid";
import type { Item, ItemKind } from "./game/types";
import { useTimer } from "./render/useTime";

function itemEmoji(kind: ItemKind) {
  const map: Record<ItemKind, string> = {
    sword: "⚔️", spear: "🗡️", shield: "🛡️",
    medicine: "💊", bandage: "🩹", shoes: "👟",
    rope: "🪢", decoy: "🎵", trap: "🪤",
    rock: "🪨", lantern: "🪔", raincoat: "🧥",
    steal: "🤏",
  };
  return map[kind] ?? "❓";
}

export default function App() {
  const {
    gameState, phase, roomCode, playerId, players, error, setError,
    createRoom, joinRoom, startGame, spawnPlayer, rollDice, moveTo, useItem, skipAction,
  } = useOnlineGame();

  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [activeItem, setActiveItem] = useState<Item | null>(null);
  const [showWinner, setShowWinner] = useState(false);

  const me = gameState?.players[playerId ?? 0];
  const cur = gameState?.players[gameState.turnIndex ?? 0];
  const isMyTurn = gameState?.turnIndex === playerId;

  const timerActive = !!gameState && isMyTurn &&
    (gameState.phase === "roll" || gameState.phase === "action");

  const timeLeft = useTimer(
    timerActive,
    30,
    () => {
      if (gameState?.phase === "roll") rollDice();
      if (gameState?.phase === "action") skipAction();
    }
  );

  // คำนวณช่องที่เดินได้
  const reachable = useMemo(() => {
    if (!gameState || !me) return new Set<string>();

    // targeting mode
    if (activeItem) {
      if (!me.pos) return new Set<string>();
      if (activeItem.kind === "rope") {
        const inRange = reachableCells(me.pos, activeItem.effect.range, gameState.width, gameState.height, []);
        return new Set(inRange.map(key).filter(k => gameState.terrain[k]?.kind === "tree"));
      }
      const blocked = Object.keys(gameState.terrain).map(k => {
        const [x, y] = k.split(",").map(Number);
        return { x, y };
      });
      const cells = reachableCells(me.pos, activeItem.effect.range, gameState.width, gameState.height, blocked);
      return new Set(cells.map(key));
    }

    if (gameState.phase !== "move" || !isMyTurn) return new Set<string>();
    if (!me.pos || !me.alive) return new Set<string>();

    const shoesBuff = me.buffs.find(b => b.kind === "shoes");
    const moveRange = gameState.dice + (shoesBuff ? 2 : 0);

    const blocked = [
      ...gameState.players.filter(p => p.alive && p.id !== me.id && p.pos !== null).map(p => p.pos!),
      gameState.dino.pos,
      ...Object.keys(gameState.terrain).map(k => {
        const [x, y] = k.split(",").map(Number);
        return { x, y };
      }),
    ];

    const cells = reachableCells(me.pos, moveRange, gameState.width, gameState.height, blocked);
    return new Set(cells.map(key));
  }, [gameState, isMyTurn, activeItem]);

  useEffect(() => {
    if (gameState?.phase === "over") setShowWinner(true);
  }, [gameState?.phase]);

  // ===== LOBBY =====
  if (phase === "lobby") {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="bg-stone-900 border border-stone-700 rounded-2xl p-8 w-80 flex flex-col gap-5">
          <div className="text-center">
            <div className="text-4xl mb-2">🦖</div>
            <h1 className="text-stone-200 text-2xl font-bold">เกมเอาตัวรอด</h1>
            <p className="text-stone-500 text-sm mt-1">ไดโนไล่ล่า</p>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-3 text-red-400 text-sm text-center">
              {error}
              <button onClick={() => setError("")} className="ml-2 text-red-300">✕</button>
            </div>
          )}

          <input
            className="bg-stone-800 border border-stone-700 rounded-xl px-4 py-2 text-stone-200 text-sm outline-none focus:border-amber-500"
            placeholder="ชื่อของคุณ"
            value={playerName}
            onChange={e => setPlayerName(e.target.value)}
          />

          <button
            onClick={() => playerName.trim() && createRoom(playerName.trim())}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold cursor-pointer"
          >
            🎮 สร้างห้องใหม่
          </button>

          <div className="flex gap-2">
            <input
              className="flex-1 bg-stone-800 border border-stone-700 rounded-xl px-3 py-2 text-stone-200 text-sm outline-none focus:border-amber-500 uppercase"
              placeholder="รหัสห้อง"
              value={joinCode}
              maxLength={4}
              onChange={e => setJoinCode(e.target.value.toUpperCase())}
            />
            <button
              onClick={() => playerName.trim() && joinCode.length === 4 && joinRoom(joinCode, playerName.trim())}
              className="px-4 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold cursor-pointer text-sm"
            >
              เข้าร่วม
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===== WAITING =====
  if (phase === "waiting") {
    const isHost = playerId === 0;
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="bg-stone-900 border border-stone-700 rounded-2xl p-8 w-80 flex flex-col gap-5">
          <div className="text-center">
            <div className="text-stone-400 text-sm">รหัสห้อง</div>
            <div className="text-amber-400 text-4xl font-bold tracking-widest mt-1">{roomCode}</div>
            <div className="text-stone-500 text-xs mt-1">แชร์รหัสนี้ให้เพื่อน</div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-stone-400 text-xs font-bold uppercase tracking-widest">ผู้เล่นในห้อง</div>
            {players.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-stone-800 rounded-xl p-3">
                <div className="w-4 h-4 rounded-sm flex-none" style={{ background: p.color }} />
                <span className="text-stone-200 text-sm font-bold">{p.name}</span>
                {p.id === 0 && <span className="text-amber-400 text-xs ml-auto">Host</span>}
              </div>
            ))}
          </div>

          {isHost && (
            <button
              onClick={startGame}
              disabled={players.length < CONFIG.MIN_PLAYERS}
              className={`w-full py-3 rounded-xl font-bold cursor-pointer
                ${players.length >= CONFIG.MIN_PLAYERS
                  ? "bg-amber-500 hover:bg-amber-400 text-stone-900"
                  : "bg-stone-700 text-stone-500 cursor-not-allowed"
                }`}
            >
              {players.length >= CONFIG.MIN_PLAYERS
                ? `🎮 เริ่มเกม (${players.length} คน)`
                : `รอผู้เล่นอีก ${CONFIG.MIN_PLAYERS - players.length} คน`}
            </button>
          )}

          {!isHost && (
            <div className="text-stone-500 text-sm text-center animate-pulse">
              รอ Host เริ่มเกม...
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== PLAYING =====
  if (!gameState || !me || !cur) return null;

  const usedSlots = me.inventory.reduce((s, it) => s + it.slots, 0);

  return (
    <div className="h-screen bg-stone-950 flex overflow-hidden">

      {/* ซ้าย — sidebar */}
      <div className="w-64 flex-none flex flex-col border-r border-stone-800 p-4 gap-4 overflow-y-auto">

        {/* รูปตัวละคร */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <div className="w-28 h-28 rounded-2xl shadow-xl" style={{ background: me.color }} />
          <div className="text-stone-200 font-bold text-base">{me.name}</div>
          {!me.alive && <div className="text-stone-500 text-sm">💀 ตายแล้ว</div>}
        </div>

        {/* ปุ่มทอยเต๋า */}
        <button
          onClick={rollDice}
          disabled={!isMyTurn || gameState.phase !== "roll"}
          className={`w-full py-3 rounded-xl font-bold text-lg transition-all
            ${isMyTurn && gameState.phase === "roll"
              ? "bg-amber-500 hover:bg-amber-400 text-stone-900 cursor-pointer shadow-lg"
              : "bg-stone-800 text-stone-600 cursor-not-allowed"
            }`}
        >
          {isMyTurn && gameState.phase === "roll"
            ? `🎲 ทอยเต๋า (${timeLeft}s)`
            : isMyTurn && gameState.phase === "move"
              ? `🎲 ได้ ${gameState.dice} — เลือกช่อง`
              : gameState.phase === "spawn"
                ? "เลือกจุดเกิด"
                : `รอ ${cur.name}...`
          }
        </button>

        {/* ปุ่มข้าม action */}
        {isMyTurn && gameState.phase === "action" && (
          <div className="flex flex-col gap-2">
            <div className="text-center text-amber-400 font-bold text-sm">
              เลือกใช้ของหรือข้าม ({timeLeft}s)
            </div>
            <button
              onClick={skipAction}
              className="w-full py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold text-sm cursor-pointer"
            >
              ข้าม →
            </button>
          </div>
        )}

        {/* targeting แจ้งเตือน */}
        {activeItem && (
          <div className="bg-amber-900/30 border border-amber-600 rounded-xl p-3 text-amber-400 text-xs text-center">
            เลือกเป้าหมายบนแมพ<br />
            <span className="font-bold">{itemEmoji(activeItem.kind)} {activeItem.name}</span>
          </div>
        )}

        {/* HP */}
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-3 flex flex-col gap-2">
          <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">HP</div>
          <div className="flex gap-2">
            {Array.from({ length: CONFIG.START_HP }).map((_, i) => (
              <div key={i} className={`flex-1 h-5 rounded-lg ${i < me.hp ? "bg-red-500" : "bg-stone-700"}`} />
            ))}
          </div>
        </div>

        {/* หิว */}
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-3 flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">ความหิว</div>
            <div className={`text-xs font-bold ${me.hunger <= 3 ? "text-red-400" : me.hunger <= 6 ? "text-amber-400" : "text-green-400"}`}>
              {me.hunger}/{CONFIG.HUNGER_MAX}
            </div>
          </div>
          <div className="w-full bg-stone-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                me.hunger <= 3 ? "bg-red-500" : me.hunger <= 6 ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${(me.hunger / CONFIG.HUNGER_MAX) * 100}%` }}
            />
          </div>
          {me.hunger <= 3 && (
            <div className="text-red-400 text-[10px] text-center animate-pulse">⚠️ กำลังอด!</div>
          )}
        </div>

        {/* บอกตาใคร */}
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-sm flex-none" style={{ background: cur.color }} />
            <span className="text-stone-300 text-xs font-bold">ตา {cur.name}</span>
          </div>
          <div className="text-stone-500 text-[10px] mt-1">รอบ {gameState.round}</div>
        </div>

        {/* กระเป๋า */}
        <div className="mt-auto bg-stone-900 rounded-xl border border-stone-700 p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">กระเป๋า</div>
            <div className="text-stone-500 text-[10px]">{usedSlots} / {CONFIG.INVENTORY_CAP}</div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: CONFIG.INVENTORY_CAP }).map((_, i) => {
              const item = me.inventory[i];
              return (
                <div
                  key={i}
                  onClick={() => item && isMyTurn && gameState.phase === "action" && setSelectedItem(item)}
                  className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all
                    ${item && isMyTurn && gameState.phase === "action"
                      ? "border-amber-600 bg-stone-700 cursor-pointer hover:bg-stone-600"
                      : "border-stone-700 bg-stone-800"
                    }`}
                  title={item?.name}
                >
                  {item && <span className="text-sm">{itemEmoji(item.kind)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* กลาง — แมพ */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-stone-950">
        {gameState.phase === "spawn" && isMyTurn && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/20 border border-amber-500 text-amber-400 text-sm font-bold px-4 py-2 rounded-xl z-10">
            กดช่องบนแมพเพื่อเลือกจุดเกิด
          </div>
        )}
        <Board
          state={gameState}
          reachable={reachable}
          onCellClick={(c) => {
            if (!isMyTurn) return;
            if (gameState.phase === "spawn") spawnPlayer(c);
            else if (gameState.phase === "move") moveTo(c);
            else if (activeItem) {
              useItem(activeItem, c);
              setActiveItem(null);
            }
          }}
        />
      </div>

      {/* popup ใช้ของ */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-stone-900 border border-stone-600 rounded-2xl p-6 flex flex-col gap-4 w-72">
            <div className="text-4xl text-center">{itemEmoji(selectedItem.kind)}</div>
            <div className="text-stone-200 font-bold text-center text-lg">{selectedItem.name}</div>
            <div className="text-stone-400 text-sm text-center">{selectedItem.effect.description}</div>
            {selectedItem.effect.passive && (
              <div className="text-amber-400 text-xs text-center bg-amber-900/20 rounded-lg p-2">
                Passive — ทำงานอัตโนมัติ
              </div>
            )}
            {(selectedItem.kind === "medicine" || selectedItem.kind === "bandage") && me.hp >= CONFIG.START_HP && (
              <div className="text-red-400 text-xs text-center bg-red-900/20 rounded-lg p-2">
                ⚠️ HP เต็มแล้ว ใช้ไม่ได้
              </div>
            )}
            <div className="flex gap-2">
              {!selectedItem.effect.passive &&
                !((selectedItem.kind === "medicine" || selectedItem.kind === "bandage") && me.hp >= CONFIG.START_HP) && (
                <button
                  onClick={() => {
                    if (selectedItem.effect.targeting) {
                      setActiveItem(selectedItem);
                    } else {
                      useItem(selectedItem, undefined);
                    }
                    setSelectedItem(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-900 font-bold cursor-pointer"
                >
                  {selectedItem.effect.targeting ? "🎯 เลือกเป้า" : "✅ ใช้เลย"}
                </button>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="flex-1 py-2 rounded-xl bg-stone-700 hover:bg-stone-600 text-stone-200 font-bold cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* popup ชนะ */}
      {showWinner && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowWinner(false)}
        >
          <div className="bg-stone-900 border border-amber-500 rounded-2xl p-10 flex flex-col items-center gap-4 shadow-2xl">
            <div className="text-6xl">🏆</div>
            <div className="text-amber-400 text-3xl font-bold">
              {gameState.winnerId !== null
                ? `${gameState.players[gameState.winnerId].name} ชนะ!`
                : "☠️ ไม่มีผู้รอดชีวิต!"}
            </div>
            <div className="text-stone-400 text-sm">แตะที่ใดก็ได้เพื่อปิด</div>
          </div>
        </div>
      )}

    </div>
  );
}