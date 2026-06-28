import { useEffect, useRef, useState } from "react";
import { Board } from "./render/Board";
import { useGame } from "./render/useGame";
import { CONFIG } from "./game/config";
import type { Item, ItemKind } from "./game/types";

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
  const { state, reachable, activeItem, moveTo, spawnPlayer, rollDice, selectItem, skipAction } = useGame();
  const [showWinner, setShowWinner] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const me = state.players[state.turnIndex];
  const cur = state.players[state.turnIndex];
  const usedSlots = me.inventory.reduce((s, it) => s + it.slots, 0);

  // timer เริ่มตั้งแต่เริ่มเทิร์น
  useEffect(() => {
    if (state.phase === "roll" || state.phase === "action") {
      setTimeLeft(30);
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            if (state.phase === "roll") rollDice();
            if (state.phase === "action") skipAction();
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state.phase, state.turnIndex]);

  useEffect(() => {
    if (state.phase === "over") setShowWinner(true);
  }, [state.phase]);

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
          disabled={state.phase !== "roll"}
          className={`w-full py-3 rounded-xl font-bold text-lg transition-all
            ${state.phase === "roll"
              ? "bg-amber-500 hover:bg-amber-400 text-stone-900 cursor-pointer shadow-lg"
              : "bg-stone-800 text-stone-600 cursor-not-allowed"
            }`}
        >
          {state.phase === "roll"
            ? `🎲 ทอยเต๋า (${timeLeft}s)`
            : state.phase === "move"
              ? `🎲 ได้ ${state.dice} — เลือกช่อง`
              : state.phase === "spawn"
                ? "เลือกจุดเกิด"
                : `รอ ${cur.name}...`
          }
        </button>

        {/* ปุ่มข้าม (phase action) */}
        {state.phase === "action" && (
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

        {/* targeting mode แจ้งเตือน */}
        {activeItem && (
          <div className="bg-amber-900/30 border border-amber-600 rounded-xl p-3 text-amber-400 text-xs text-center">
            เลือกเป้าหมายบนแมพ<br />
            <span className="font-bold">{itemEmoji(activeItem.kind)} {activeItem.name}</span><br />
            ระยะ {activeItem.effect.range} ช่อง
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
          <div className="text-stone-500 text-[10px] mt-1">รอบ {state.round}</div>
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
                  onClick={() => item && state.phase === "action" && setSelectedItem(item)}
                  className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-all
                    ${item && state.phase === "action"
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

      {/* popup ใช้ของ */}
        {selectedItem && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-stone-900 border border-stone-600 rounded-2xl p-6 flex flex-col gap-4 w-72">
              <div className="text-4xl text-center">{itemEmoji(selectedItem.kind)}</div>
              <div className="text-stone-200 font-bold text-center text-lg">{selectedItem.name}</div>
              <div className="text-stone-400 text-sm text-center">{selectedItem.effect.description}</div>

              {/* passive */}
              {selectedItem.effect.passive && (
                <div className="text-amber-400 text-xs text-center bg-amber-900/20 rounded-lg p-2">
                  Passive — ทำงานอัตโนมัติ ไม่ต้องกดใช้
                </div>
              )}

              {/* HP เต็ม */}
              {(selectedItem.kind === "medicine" || selectedItem.kind === "bandage") && me.hp >= CONFIG.START_HP && (
                <div className="text-red-400 text-xs text-center bg-red-900/20 rounded-lg p-2">
                  ⚠️ HP เต็มแล้ว ใช้ไม่ได้
                </div>
              )}

              <div className="flex gap-2">
                {!selectedItem.effect.passive &&
                  !(( selectedItem.kind === "medicine" || selectedItem.kind === "bandage") && me.hp >= CONFIG.START_HP) && (
                  <button
                    onClick={() => { selectItem(selectedItem); setSelectedItem(null); }}
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