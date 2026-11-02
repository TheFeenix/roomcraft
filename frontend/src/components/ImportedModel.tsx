import { Component, Suspense, useEffect, useMemo, type ReactNode } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, Vector3, type Mesh, type MeshStandardMaterial } from "three";
import { modelUrl } from "../api";
import type { SceneObject, Vec3 } from "../scene/schema";

function Placeholder({ dimensions, color }: { dimensions: Vec3; color: string }) {
  return (
    <mesh position={[0, dimensions[1] / 2, 0]}>
      <boxGeometry args={dimensions} />
      <meshStandardMaterial color={color} wireframe />
    </mesh>
  );
}

class ModelBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function LoadedModel({ url, dimensions, selected, overlapping }: { url: string; dimensions: Vec3; selected: boolean; overlapping: boolean }) {
  const gltf = useGLTF(url);

  const wrapper = useMemo(() => {
    const clone = gltf.scene.clone(true);
    clone.position.set(0, 0, 0);
    clone.traverse((child) => {
      const mesh = child as Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.material = Array.isArray(mesh.material) ? mesh.material.map((item) => item.clone()) : mesh.material.clone();
      }
    });
    clone.updateMatrixWorld(true);
    const box = new Box3().setFromObject(clone);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    const group = new Group();
    group.add(clone);
    group.scale.set(
      size.x > 0 ? dimensions[0] / size.x : 1,
      size.y > 0 ? dimensions[1] / size.y : 1,
      size.z > 0 ? dimensions[2] / size.z : 1,
    );
    return group;
  }, [gltf, dimensions[0], dimensions[1], dimensions[2]]);

  useEffect(() => {
    const color = overlapping ? "#ff2020" : "#2060ff";
    const intensity = overlapping ? 0.45 : selected ? 0.18 : 0;
    wrapper.traverse((child) => {
      const mesh = child as Mesh;
      if (!mesh.isMesh) {
        return;
      }
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const material of materials) {
        const standard = material as MeshStandardMaterial;
        if (standard.emissive) {
          standard.emissive.set(intensity > 0 ? color : "#000000");
          standard.emissiveIntensity = intensity;
        }
      }
    });
  }, [wrapper, selected, overlapping]);

  return <primitive object={wrapper} />;
}

export function ImportedAsset({ object, overlapping, selected }: { object: SceneObject; overlapping: boolean; selected: boolean }) {
  const failed = <Placeholder dimensions={object.dimensions} color="#ff5050" />;
  return (
    <ModelBoundary fallback={failed}>
      <Suspense fallback={<Placeholder dimensions={object.dimensions} color="#9aa4b2" />}>
        <LoadedModel
          url={modelUrl(object.assetId ?? "")}
          dimensions={object.dimensions}
          selected={selected}
          overlapping={overlapping}
        />
      </Suspense>
    </ModelBoundary>
  );
}

