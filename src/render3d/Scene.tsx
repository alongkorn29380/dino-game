import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { TileFloor } from "./TileFloor";
import { Tree } from "./Tree";
import { Bush } from "./Bush";
import { Dino } from "./Dino";

// สุ่มตำแหน่งไม่ซ้ำกัน
function generateUniquePositions(count: number, gridSize: number, exclude: Set<string> = new Set()) {
  const positions: { x: number; y: number }[] = [];
  const taken = new Set(exclude);

  let attempts = 0;
  while (positions.length < count && attempts < count * 20) {
    const x = Math.floor(Math.random() * gridSize);
    const y = Math.floor(Math.random() * gridSize);
    const key = `${x},${y}`;
    if (!taken.has(key)) {
      taken.add(key);
      positions.push({ x, y });
    }
    attempts++;
  }
  return positions;
}

const testTrees = generateUniquePositions(15, 24);
const treeKeys = new Set(testTrees.map(p => `${p.x},${p.y}`));
const testBushes = generateUniquePositions(15, 24, treeKeys);

export function Scene() {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas camera={{ position: [12, 28, 30], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={0.8} />
        <TileFloor width={24} height={24} />
        <Tree positions={testTrees} />
        <Bush positions={testBushes} />
        <Dino position={{ x: 12, y: 12 }} />
        <OrbitControls target={[12, 0, 12]} />
      </Canvas>
    </div>
  );
}