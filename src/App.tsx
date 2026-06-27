import { useEffect, useState } from "react";
import { Board } from "./render/Board";
import { useGame } from "./render/useGame";

export default function App() {
  const { state, reachable, moveTo, spawnPlayer, rollDice } = useGame();
  const [showWinner, setShowWinner] = useState(false);

  const me = state.players[0];
  const cur = state.players[state.turnIndex];
  const isMyTurn = state.turnIndex === 0;

  useEffect(() => {
    if (state.phase === "over") setShowWinner(true);
  }, [state.phase]);

  return (
    <div className="h-screen bg-stone-950 flex overflow-hidden">

      {/* ซ้าย — sidebar */}
      <div className="w-64 flex-none flex flex-col border-r border-stone-800 p-4 gap-4">

        {/* รูปตัวละคร */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-28 h-28 rounded-2xl shadow-xl"
            style={{ background: me.color }}
          />
          <div className="text-stone-200 font-bold text-base">{me.name}</div>
          {!me.alive && <div className="text-stone-500 text-sm">💀 ตายแล้ว</div>}
        </div>

        {/* ปุ่มสุ่มเต๋า */}
        <button
          onClick={rollDice}
          disabled={!isMyTurn || state.phase !== "roll"}
          className={`w-full py-3 rounded-xl font-bold text-lg transition-all
            ${isMyTurn && state.phase === "roll"
              ? "bg-amber-500 hover:bg-amber-400 text-stone-900 cursor-pointer shadow-lg"
              : "bg-stone-800 text-stone-600 cursor-not-allowed"
            }`}
        >
          {state.phase === "move" && isMyTurn
            ? `🎲 ได้ ${state.dice} — เลือกช่อง`
            : state.phase === "roll" && isMyTurn
              ? "🎲 ทอยเต๋า"
              : state.phase === "spawn"
                ? "เลือกจุดเกิด"
                : `รอ ${cur.name}...`
          }
        </button>

        {/* HP */}
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-3 flex flex-col gap-2">
          <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">HP</div>
          <div className="flex gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`flex-1 h-5 rounded-lg ${i < me.hp ? "bg-red-500" : "bg-stone-700"}`}
              />
            ))}
          </div>
        </div>

        {/* หิว */}
        <div className="bg-stone-900 rounded-xl border border-stone-700 p-3 flex flex-col gap-2">
          <div className="flex justify-between">
            <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">ความหิว</div>
            <div className={`text-xs font-bold ${me.hunger <= 3 ? "text-red-400" : me.hunger <= 6 ? "text-amber-400" : "text-green-400"}`}>
              {me.hunger}/10
            </div>
          </div>
          <div className="w-full bg-stone-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                me.hunger <= 3 ? "bg-red-500" : me.hunger <= 6 ? "bg-amber-500" : "bg-green-500"
              }`}
              style={{ width: `${(me.hunger / 10) * 100}%` }}
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
          <div className="text-stone-500 text-[10px] mt-1">รอบ {state.round}</div>
        </div>

        {/* กระเป๋า — ด้านล่างสุด */}
        <div className="mt-auto bg-stone-900 rounded-xl border border-stone-700 p-3 flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <div className="text-stone-400 text-[10px] font-bold uppercase tracking-widest">กระเป๋า</div>
            <div className="text-stone-500 text-[10px]">0 / 7</div>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="w-10 h-10 rounded-lg border border-stone-700 bg-stone-800"
              />
            ))}
          </div>
        </div>

      </div>

      {/* กลาง — แมพเต็มจอ */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-stone-950">
        {state.phase === "spawn" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500/20 border border-amber-500 text-amber-400 text-sm font-bold px-4 py-2 rounded-xl z-10">
            {cur.name} — กดช่องบนแมพเพื่อเลือกจุดเกิด
          </div>
        )}
        <Board
          state={state}
          reachable={reachable}
          onCellClick={state.phase === "spawn" ? spawnPlayer : moveTo}
        />
      </div>

      {/* popup ชนะ */}
      {showWinner && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setShowWinner(false)}
        >
          <div className="bg-stone-900 border border-amber-500 rounded-2xl p-10 flex flex-col items-center gap-4 shadow-2xl">
            <div className="text-6xl">🏆</div>
            <div className="text-amber-400 text-3xl font-bold">
              {state.winnerId !== null
                ? `${state.players[state.winnerId].name} ชนะ!`
                : "☠️ ไม่มีผู้รอดชีวิต!"}
            </div>
            <div className="text-stone-400 text-sm">แตะที่ใดก็ได้เพื่อปิด</div>
          </div>
        </div>
      )}

    </div>
  );
}