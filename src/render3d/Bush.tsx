import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  positions: { x: number; y: number }[];
};

const SCALE = 3;
const Y_OFFSET = 0.35;

export function Bush({ positions }: Props) {
  const { nodes } = useGLTF("/models/Bush.glb");
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.clear();

    const template = nodes.Bush as THREE.Group;
    if (!template) {
      console.log("Bush node not found, available:", Object.keys(nodes));
      return;
    }

    for (const pos of positions) {
      const clone = template.clone();
      clone.position.set(pos.x, Y_OFFSET, pos.y);
      clone.scale.set(SCALE, SCALE, SCALE);
      groupRef.current.add(clone);
    }
  }, [positions, nodes]);

  return <group ref={groupRef} />;
}