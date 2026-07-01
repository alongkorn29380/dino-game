import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  position: { x: number; y: number };
};

const SCALE = 2.3;

export function Dino({ position }: Props) {
  const { nodes } = useGLTF("/models/Dino.glb");
  const groupRef = useRef<THREE.Group>(null);

  const template = nodes.Dino as THREE.Group;

  useEffect(() => {
    if (!groupRef.current) return;
    // smooth เดินไปตำแหน่งใหม่ ทำแบบง่ายก่อน (เดี๋ยวใส่ animation)
    groupRef.current.position.set(position.x, 0.15, position.y);
  }, [position]);

  if (!template) {
    console.log("Dino node not found, available:", Object.keys(nodes));
    return null;
  }

  return (
    <group ref={groupRef} scale={[SCALE, SCALE, SCALE]}>
      <primitive object={template.clone()} />
    </group>
  );
}