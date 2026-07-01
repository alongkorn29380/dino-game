import { useRef, useEffect } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

type Props = {
  position: { x: number; y: number };
  color: string; // สีเสื้อตาม player
};

const SCALE = 0.5;

export function Character({ position, color }: Props) {
  const { nodes } = useGLTF("/models/Character.glb");
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.position.set(position.x, 0.25, position.y);
  }, [position]);

  const body = nodes.Body as THREE.Mesh;
  const shirt = nodes.Shirt as THREE.Mesh;

  if (!body || !shirt) {
    console.log("Character nodes not found, available:", Object.keys(nodes));
    return null;
  }

  return (
    <group ref={groupRef} scale={[SCALE, SCALE, SCALE]}>
      {/* ตัว — ใช้สีเดิมจาก Blender (ผิว ตา ผม) */}
      <mesh geometry={body.geometry} material={body.material} />

      {/* เสื้อ — override สีตาม player */}
      <mesh geometry={shirt.geometry}>
        <meshLambertMaterial color={color} />
      </mesh>
    </group>
  );
}