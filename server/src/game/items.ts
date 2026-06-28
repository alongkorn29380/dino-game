import type { Item, ItemKind } from "../game/types";

export const ITEM_DEFINITIONS: Record<ItemKind, Omit<Item, "id">> = {
  sword: { 
    kind: "sword",    
    name: "ดาบ",       
    slots: 1,
    effect: {
        range: 1,
        targeting: true,
        passive: false,
        description: "โตมตีติดกัน ฆ่าได้ทันที"
    }
},

  spear: { 
    kind: "spear",    
    name: "หอก",       
    slots: 1, 
    effect: {
        range: 3,
        targeting: true,
        passive: false,
        description: "-1 HP ทันที",
    }
},

  shield: { 
    kind: "shield",   
    name: "โล่",        
    slots: 1,
    effect: {
        range: 0,
        targeting: false,
        passive: true,
        description: "กันตาย 1 ครั้งอัตโนมัติ",
    }
},

  medicine: { 
    kind: "medicine", 
    name: "ยา",        
    slots: 1,
    effect: {
        range: 0,
        targeting: false,
        passive: false,
        description: "+1 HP ทันที",
    }
},

  bandage: { 
    kind: "bandage",  
    name: "ผ้าพันแผล",  
    slots: 1,
    effect: {
        range: 0,
        targeting: false,
        passive: false,
        description: "+1 HP เมื่อผ่านไป 1 เทิร์น",
    }
},

  shoes: { 
    kind: "shoes",    
    name: "รองเท้าวิ่ง",  
    slots: 1,
    effect: {
        range: 0,
        targeting: false,
        passive: false,
        description: "+2 ระยะการเดิน 3 เทิร์น",
    }
},

  rope: { 
    kind: "rope",     
    name: "เชือก",     
    slots: 1,
    effect: {
        range: 3,
        targeting: true,
        passive: false,
        description: "พุ่งไปเป็นระยะ 3 ช่อง แต่ต้องมีต้นไม้",
    }
},

  decoy: { 
    kind: "decoy",    
    name: "ของล่อ",    
    slots: 1,
    effect: {
        range: 3,
        targeting: true,
        passive: false,
        description: "ของล่อไดโนเสาร์",
    }
},

  trap: { 
    kind: "trap",     
    name: "กับดัก",     
    slots: 1,
    effect: {
        range: 99,
        targeting: true,
        passive: false,
        description: " -1HP กับดักล่องหนจะมีแค่ผู้ที่วางจะเห็น",
    }
},

  rock: { 
    kind: "rock",     
    name: "ก้อนหิน",    
    slots: 1,
    effect: {
        range: 2,
        targeting: false,
        passive: false,
        description: "สตั้นผู้เล่นเป็นเวลา 1 เทิร์น",
    }
},

  lantern:  { 
    kind: "lantern",  
    name: "ตะเกียง",    
    slots: 1,
    effect: {
        range: 0,
        targeting: false,
        passive: true,
        description: "เมื่อหมอกลองจะมองเห็นในระยะและสามารถเก็บของได้",
    }
},

  raincoat: { 
    kind: "raincoat", 
    name: "เสื้อกันฝน",  
    slots: 1,
    effect: {
        range: 0,
        targeting: false,
        passive: true,
        description: "เมื่อผนตกยังสามารถเดินได้ตามปรกติ",
    }
},

  steal: { 
    kind: "steal",    
    name: "ขโมยของ",  
    slots: 1,
    effect: {
        range: 1,
        targeting: true,
        passive: false,
        description: "สุ่มขโมยของจากผู้เล่นรอบตัว 1 ช่อง",
    }
},
};

export type ItemEffect = {
  range: number;        
  targeting: boolean;   
  passive: boolean;    
  description: string; 
};

const WEIGHTS: Record<ItemKind, number> = {
  medicine: 8,   
  bandage:  8,
  rock:     6,
  spear:    5, 
  sword:    3,
  shoes:    3,
  rope:     3,
  trap:     3,
  decoy:    2,   
  shield:   2,
  lantern:  2,
  raincoat: 2,
  steal:    1,  
};

let _idCounter = 0;

export function randomItem(): Item {
  const kinds = Object.keys(WEIGHTS).filter(k => k !== "food") as ItemKind[];
  const total = kinds.reduce((s, k) => s + WEIGHTS[k], 0);
  let rand = Math.random() * total;
  for (const k of kinds) {
    rand -= WEIGHTS[k];
    if (rand <= 0) {
      return { id: `item_${_idCounter++}`, ...ITEM_DEFINITIONS[k] };
    }
  }
  return { id: `item_${_idCounter++}`, ...ITEM_DEFINITIONS["medicine"] };
}