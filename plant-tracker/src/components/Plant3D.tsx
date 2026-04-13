"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Float, Text, Html, Sparkles, Environment } from "@react-three/drei";
import { useRef, useMemo } from "react";
import * as THREE from "three";

interface Plant3DProps {
  healthScore: number;
  state: "thriving" | "okay" | "stressed" | "critical";
  temp?: number;
  humidity?: number;
  soilMoisture?: number;
  lux?: number;
}

// Leaves always stay green — health state only affects glow/effects/droop
const LEAF_GREEN = "#22c55e";

const stateGlow = {
  thriving: "#22c55e",
  okay: "#84cc16",
  stressed: "#eab308",
  critical: "#ef4444",
};

function Leaf({
  position,
  rotation,
  scale,
  color,
  glowColor,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  color: string;
  glowColor: string;
}) {
  const ref = useRef<THREE.Mesh>(null);

  // Create a leaf-shaped geometry
  const leafGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.3, 0.2, 0.6, 0.8, 0, 1.4);
    shape.bezierCurveTo(-0.6, 0.8, -0.3, 0.2, 0, 0);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      bevelSegments: 3,
      curveSegments: 12,
    });
    geo.center();
    return geo;
  }, []);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.z = rotation[2] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  return (
    <mesh ref={ref} position={position} rotation={rotation} scale={scale} geometry={leafGeometry}>
      <meshStandardMaterial
        color={color}
        roughness={0.4}
        metalness={0.1}
        emissive={glowColor}
        emissiveIntensity={0.15}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Stem() {
  return (
    <mesh position={[0, 0.2, 0]}>
      <cylinderGeometry args={[0.06, 0.1, 2, 16]} />
      {/* Dark woody brown stem */}
      <meshStandardMaterial color="#4a2511" roughness={0.9} metalness={0.02} />
    </mesh>
  );
}

function Pot() {
  return (
    <group>
      {/* Pot body — terracotta orange */}
      <mesh position={[0, -1.4, 0]}>
        <cylinderGeometry args={[1, 0.75, 1, 32]} />
        <meshStandardMaterial color="#c65d2e" roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Pot rim — slightly lighter terracotta */}
      <mesh position={[0, -0.9, 0]}>
        <torusGeometry args={[1, 0.1, 16, 48]} />
        <meshStandardMaterial color="#e07a3e" roughness={0.7} />
      </mesh>
      {/* Soil top — very dark brown/black */}
      <mesh position={[0, -0.85, 0]}>
        <cylinderGeometry args={[0.95, 0.95, 0.12, 32]} />
        <meshStandardMaterial color="#1a0d05" roughness={1} />
      </mesh>
    </group>
  );
}

function WaterDrops({ count }: { count: number }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, i) => {
        child.position.y = -1 + (((state.clock.elapsedTime * 0.5 + i * 0.3) % 2) - 1) * 2;
      });
    }
  });
  return (
    <group ref={groupRef}>
      {Array.from({ length: count }).map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={0.5} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function SensorLabel({
  position,
  color,
  label,
  value,
}: {
  position: [number, number, number];
  color: string;
  label: string;
  value: string;
}) {
  return (
    <Html position={position} center distanceFactor={8} zIndexRange={[0, 10]}>
      <div
        className="px-2 py-1 rounded-lg text-[10px] font-semibold whitespace-nowrap border backdrop-blur-sm pointer-events-none"
        style={{
          background: `${color}22`,
          borderColor: `${color}66`,
          color: color,
          boxShadow: `0 0 12px ${color}44`,
        }}
      >
        <div className="opacity-70 text-[8px] uppercase tracking-wider">{label}</div>
        <div className="text-xs font-bold">{value}</div>
      </div>
    </Html>
  );
}

function PlantModel({
  healthScore,
  state,
  temp = 0,
  humidity = 0,
  soilMoisture = 0,
  lux = 0,
}: Plant3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  const leafColor = LEAF_GREEN;
  const glowColor = stateGlow[state];
  const leafScale = 0.4 + (healthScore / 100) * 0.6;
  const droopAngle = state === "critical" || state === "stressed" ? 0.6 : 0;

  // Generate multiple layers of leaves for a fuller plant
  const leaves = useMemo(() => {
    const result: {
      position: [number, number, number];
      rotation: [number, number, number];
      scale: number;
    }[] = [];
    // Layer 1: lower leaves
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      result.push({
        position: [Math.cos(angle) * 0.4, -0.3, Math.sin(angle) * 0.4],
        rotation: [Math.PI / 2.2 + droopAngle, angle, 0],
        scale: leafScale * 0.8,
      });
    }
    // Layer 2: middle leaves
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2 + 0.3;
      result.push({
        position: [Math.cos(angle) * 0.5, 0.3, Math.sin(angle) * 0.5],
        rotation: [Math.PI / 2.5 + droopAngle * 0.7, angle, 0],
        scale: leafScale,
      });
    }
    // Layer 3: upper leaves
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + 0.6;
      result.push({
        position: [Math.cos(angle) * 0.45, 0.8, Math.sin(angle) * 0.45],
        rotation: [Math.PI / 2.8 + droopAngle * 0.4, angle, 0],
        scale: leafScale * 0.9,
      });
    }
    // Top leaves
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2;
      result.push({
        position: [Math.cos(angle) * 0.25, 1.2, Math.sin(angle) * 0.25],
        rotation: [Math.PI / 3, angle, 0],
        scale: leafScale * 0.75,
      });
    }
    return result;
  }, [leafScale, droopAngle]);

  return (
    <group ref={groupRef}>
      <Pot />
      <Stem />
      {leaves.map((leaf, i) => (
        <Float key={i} speed={1.5 + (i % 3) * 0.3} rotationIntensity={0.2} floatIntensity={0.2}>
          <Leaf
            position={leaf.position}
            rotation={leaf.rotation}
            scale={leaf.scale}
            color={leafColor}
            glowColor={glowColor}
          />
        </Float>
      ))}

      {/* Top bud */}
      <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.3}>
        <mesh position={[0, 1.4, 0]} scale={leafScale * 0.6}>
          <sphereGeometry args={[0.25, 16, 16]} />
          <meshStandardMaterial
            color={leafColor}
            roughness={0.3}
            emissive={glowColor}
            emissiveIntensity={0.3}
          />
        </mesh>
      </Float>

      {/* Sparkles if thriving */}
      {state === "thriving" && (
        <Sparkles count={40} scale={[3, 3, 3]} size={3} speed={0.4} color={glowColor} />
      )}

      {/* Water drops if stressed */}
      {(state === "critical" || state === "stressed") && <WaterDrops count={8} />}

      {/* Live sensor labels floating around the plant */}
      <SensorLabel position={[1.8, 1.2, 0]} color="#f59e0b" label="Temp" value={`${temp.toFixed(1)}°C`} />
      <SensorLabel position={[-1.8, 1.2, 0]} color="#3b82f6" label="Humidity" value={`${humidity.toFixed(0)}%`} />
      <SensorLabel position={[1.8, -0.3, 0]} color="#8b5cf6" label="Soil" value={`${soilMoisture.toFixed(0)}%`} />
      <SensorLabel position={[-1.8, -0.3, 0]} color="#f97316" label="Light" value={`${lux.toFixed(0)}lx`} />
      <SensorLabel position={[0, 2.1, 0]} color={glowColor} label="Health" value={`${healthScore.toFixed(0)}%`} />

      {/* 3D floating health text */}
      <Float speed={2} floatIntensity={0.5}>
        <Text
          position={[0, -2.2, 0]}
          fontSize={0.25}
          color={glowColor}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.01}
          outlineColor="#000"
        >
          {state.toUpperCase()}
        </Text>
      </Float>
    </group>
  );
}

export default function Plant3D(props: Plant3DProps) {
  return (
    <div className="w-full h-[400px] rounded-2xl bg-gradient-to-br from-card/80 via-card/50 to-card/20 border border-border/50 backdrop-blur-sm overflow-hidden relative">
      <Canvas camera={{ position: [4, 1.5, 4], fov: 55 }} shadows>
        <color attach="background" args={["#0a0a0a"]} />
        <fog attach="fog" args={["#0a0a0a", 6, 14]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
        <pointLight position={[-5, 4, -5]} intensity={0.6} color="#88ffaa" />
        <pointLight position={[5, 2, -5]} intensity={0.4} color="#ffaa88" />
        <Environment preset="sunset" />
        <PlantModel {...props} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={4}
          maxDistance={10}
          autoRotate={false}
        />
      </Canvas>
      <div className="absolute top-3 left-3 text-[10px] text-muted-foreground/60 pointer-events-none">
        drag to rotate • scroll to zoom
      </div>
    </div>
  );
}
