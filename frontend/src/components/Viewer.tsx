import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, TransformControls } from "@react-three/drei";
import type { Group, Mesh } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { findItem } from "../library/catalog";
import { findOverlaps } from "../scene/constraints";
import { wallFrame, wallPieces } from "../scene/room";
import type { Material, Opening, Scene, SceneObject } from "../scene/schema";
import { useSceneStore } from "../scene/store";
import { useUiStore } from "../uiStore";
import { ImportedAsset } from "./ImportedModel";

function materialOf(scene: Scene, id: string): Material {
  return scene.materials.find((material) => material.id === id) ?? scene.materials[0];
}

function Surface({ material, size, position }: { material: Material; size: [number, number, number]; position: [number, number, number] }) {
  return (
    <mesh position={position} receiveShadow castShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={material.color}
        roughness={material.roughness}
        metalness={material.metalness}
        transparent={material.opacity < 1}
        opacity={material.opacity}
      />
    </mesh>
  );
}

function OpeningMesh({
  opening,
  length,
  selected,
  onSelect,
  onMesh,
}: {
  opening: Opening;
  length: number;
  selected: boolean;
  onSelect: () => void;
  onMesh: (mesh: Mesh | null) => void;
}) {
  const ref = useRef<Mesh>(null);
  const isWindow = opening.kind === "window";

  useEffect(() => {
    if (!selected) {
      return;
    }
    onMesh(ref.current);
    return () => onMesh(null);
  }, [selected, onMesh]);

  return (
    <mesh
      ref={ref}
      position={[opening.offset + opening.width / 2 - length / 2, opening.sill + opening.height / 2, 0]}
      onClick={(event) => {
        event.stopPropagation();
        onSelect();
      }}
    >
      <boxGeometry args={[opening.width, opening.height, isWindow ? 0.02 : 0.04]} />
      <meshStandardMaterial
        color={isWindow ? "#9ec9e2" : "#6b4a2b"}
        transparent={isWindow}
        opacity={isWindow ? 0.35 : 1}
        roughness={0.4}
        emissive={selected ? "#2060ff" : "#000000"}
        emissiveIntensity={selected ? 0.6 : 0}
      />
    </mesh>
  );
}

function OpeningGizmo({
  opening,
  length,
  mesh,
  onDrag,
}: {
  opening: Opening;
  length: number;
  mesh: Mesh;
  onDrag: (value: { id: string; offset: number } | null) => void;
}) {
  const snapStep = useSceneStore((state) => state.snapStep);
  const patchOpening = useSceneStore((state) => state.patchOpening);

  const offsetOf = () =>
    Math.min(Math.max(mesh.position.x + length / 2 - opening.width / 2, 0), Math.max(0, length - opening.width));

  return (
    <TransformControls
      object={mesh}
      mode="translate"
      space="local"
      showY={false}
      showZ={false}
      translationSnap={snapStep > 0 ? snapStep : null}
      onObjectChange={() => onDrag({ id: opening.id, offset: offsetOf() })}
      onMouseUp={() => {
        patchOpening(opening.id, { offset: offsetOf() });
        const stored = useSceneStore.getState().scene.room.openings.find((candidate) => candidate.id === opening.id);
        if (stored) {
          mesh.position.set(stored.offset + stored.width / 2 - length / 2, stored.sill + stored.height / 2, 0);
        }
        onDrag(null);
      }}
    />
  );
}

function RoomMesh({ scene }: { scene: Scene }) {
  const showCeiling = useUiStore((state) => state.showCeiling);
  const selectedOpeningId = useSceneStore((state) => state.selectedOpeningId);
  const selectOpening = useSceneStore((state) => state.selectOpening);
  const [gizmoMesh, setGizmoMesh] = useState<Mesh | null>(null);
  const [drag, setDrag] = useState<{ id: string; offset: number } | null>(null);
  const { room } = scene;
  const center: [number, number] = [room.width / 2, room.depth / 2];
  const floor = materialOf(scene, room.floorMaterialId);
  const ceiling = materialOf(scene, room.ceilingMaterialId);
  const selectedOpening = room.openings.find((opening) => opening.id === selectedOpeningId);
  const selectedWall = selectedOpening ? room.walls.find((wall) => wall.id === selectedOpening.wallId) : undefined;

  return (
    <group>
      <Surface material={floor} size={[room.width, 0.05, room.depth]} position={[room.width / 2, -0.025, room.depth / 2]} />
      {showCeiling && (
        <Surface material={ceiling} size={[room.width, 0.05, room.depth]} position={[room.width / 2, room.height + 0.025, room.depth / 2]} />
      )}
      {room.walls.map((wall, index) => {
        const frame = wallFrame(wall, center);
        const openings = room.openings
          .filter((opening) => opening.wallId === wall.id)
          .map((opening) => (drag && drag.id === opening.id ? { ...opening, offset: drag.offset } : opening));
        const pieces = wallPieces(wall, openings, index % 2 === 0 ? wall.thickness : 0);
        const material = materialOf(scene, wall.materialId);
        return (
          <group key={wall.id} position={[frame.center[0], 0, frame.center[1]]} rotation={[0, frame.angleY, 0]}>
            {pieces.map((piece, pieceIndex) => (
              <Surface
                key={pieceIndex}
                material={material}
                size={[piece.s1 - piece.s0, piece.y1 - piece.y0, wall.thickness]}
                position={[(piece.s0 + piece.s1) / 2 - frame.length / 2, (piece.y0 + piece.y1) / 2, 0]}
              />
            ))}
            {openings.map((opening) => (
              <OpeningMesh
                key={opening.id}
                opening={opening}
                length={frame.length}
                selected={opening.id === selectedOpeningId}
                onSelect={() => selectOpening(opening.id)}
                onMesh={setGizmoMesh}
              />
            ))}
          </group>
        );
      })}
      {gizmoMesh && selectedOpening && selectedWall && (
        <OpeningGizmo
          opening={selectedOpening}
          length={Math.hypot(selectedWall.end[0] - selectedWall.start[0], selectedWall.end[1] - selectedWall.start[1])}
          mesh={gizmoMesh}
          onDrag={setDrag}
        />
      )}
    </group>
  );
}

function ObjectParts({ object, overlapping, selected }: { object: SceneObject; overlapping: boolean; selected: boolean }) {
  if (object.assetId) {
    return <ImportedAsset object={object} overlapping={overlapping} selected={selected} />;
  }
  const item = object.libraryId ? findItem(object.libraryId) : undefined;
  if (!item) {
    return (
      <mesh position={[0, object.dimensions[1] / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={object.dimensions} />
        <meshStandardMaterial color={object.color ?? "#999999"} />
      </mesh>
    );
  }
  return (
    <>
      {item.parts.map((part, index) => (
        <mesh key={index} position={part.center} castShadow receiveShadow>
          <boxGeometry args={part.size} />
          <meshStandardMaterial
            color={part.main && object.color ? object.color : part.color}
            roughness={0.8}
            emissive={overlapping ? "#ff2020" : selected ? "#2060ff" : "#000000"}
            emissiveIntensity={overlapping ? 0.45 : selected ? 0.18 : 0}
          />
        </mesh>
      ))}
    </>
  );
}

function SceneObjectNode({ object, overlapping }: { object: SceneObject; overlapping: boolean }) {
  const ref = useRef<Group>(null);
  const selectedId = useSceneStore((state) => state.selectedId);
  const mode = useSceneStore((state) => state.mode);
  const snapStep = useSceneStore((state) => state.snapStep);
  const select = useSceneStore((state) => state.select);
  const patchObject = useSceneStore((state) => state.patchObject);
  const selected = selectedId === object.id;

  const onMouseUp = () => {
    const node = ref.current;
    if (!node) {
      return;
    }
    patchObject(object.id, {
      position: [node.position.x, node.position.y, node.position.z],
      rotation: [node.rotation.x, node.rotation.y, node.rotation.z],
      scale: [node.scale.x, node.scale.y, node.scale.z],
    });
    const stored = useSceneStore.getState().scene.objects.find((candidate) => candidate.id === object.id);
    if (stored) {
      node.position.set(...stored.position);
      node.rotation.set(...stored.rotation);
      node.scale.set(...stored.scale);
    }
  };

  if (!object.visible) {
    return null;
  }

  return (
    <>
      <group
        ref={ref}
        position={object.position}
        rotation={object.rotation}
        scale={object.scale}
        onClick={(event) => {
          event.stopPropagation();
          select(object.id);
        }}
      >
        <ObjectParts object={object} overlapping={overlapping} selected={selected} />
      </group>
      {selected && !object.locked && (
        <TransformControls
          object={ref as React.RefObject<Group>}
          mode={mode}
          showX={mode !== "rotate"}
          showZ={mode !== "rotate"}
          translationSnap={snapStep > 0 ? snapStep : null}
          rotationSnap={Math.PI / 12}
          scaleSnap={0.05}
          onMouseUp={onMouseUp}
        />
      )}
    </>
  );
}

function CameraRig({ width, depth }: { width: number; depth: number }) {
  const view = useUiStore((state) => state.cameraView);
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as OrbitControlsImpl | null;

  useEffect(() => {
    const cx = width / 2;
    const cz = depth / 2;
    if (view === "top") {
      camera.position.set(cx, Math.max(width, depth) * 1.4 + 1.5, cz + 0.01);
    } else {
      camera.position.set(cx + width * 0.9, Math.max(width, depth) * 0.9 + 1.5, cz + depth * 1.6 + 1);
    }
    if (controls) {
      controls.target.set(cx, 0.8, cz);
      controls.update();
    } else {
      camera.lookAt(cx, 0.8, cz);
    }
  }, [view, width, depth, camera, controls]);

  return null;
}

export function Viewer() {
  const scene = useSceneStore((state) => state.scene);
  const select = useSceneStore((state) => state.select);
  const overlaps = useMemo(() => new Set(findOverlaps(scene).flat()), [scene]);

  return (
    <Canvas shadows camera={{ fov: 50, position: [6, 5, 6], near: 0.05, far: 200 }} onPointerMissed={() => select(null)}>
      <color attach="background" args={["#1b1f27"]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#ffffff", "#8a7a66", 0.35]} />
      <directionalLight
        position={[scene.room.width * 1.2, scene.room.height * 3, scene.room.depth * 0.2]}
        intensity={1.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      <RoomMesh scene={scene} />
      {scene.objects.map((object) => (
        <SceneObjectNode key={object.id} object={object} overlapping={overlaps.has(object.id)} />
      ))}
      <OrbitControls makeDefault enableDamping={false} />
      <CameraRig width={scene.room.width} depth={scene.room.depth} />
    </Canvas>
  );
}
