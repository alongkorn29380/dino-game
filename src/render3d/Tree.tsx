import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  positions: { x: number; y: number }[];
};

const SCALE = 0.25

export function Tree({ positions }: Props) {
  const { nodes } = useGLTF("/models/Tree.glb");
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.clear();

    const template = nodes.Tree as THREE.Group;
    if (!template) {
      console.log("Tree node not found, available:", Object.keys(nodes));
      return;
    }

    for (const pos of positions) {
      const clone = template.clone();
      clone.position.set(pos.x, 0.9, pos.y);
      clone.scale.set(SCALE, SCALE, SCALE);
      groupRef.current.add(clone);
    }
  }, [positions, nodes]);

  return <group ref={groupRef} />;
}