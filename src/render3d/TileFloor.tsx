import { useEffect, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  width: number;
  height: number;
};

export function TileFloor({ width, height }: Props) {
  const { nodes } = useGLTF("/models/Terrain.glb");
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.clear();

    const template = nodes.Terrain as THREE.Group;
    if (!template) return;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const clone = template.clone();
            clone.position.set(x, 0, y);
            clone.scale.set(1.05, 1, 1.05);
            groupRef.current.add(clone);
        }
    }
  }, [width, height, nodes]);

  return <group ref={groupRef} />;
}