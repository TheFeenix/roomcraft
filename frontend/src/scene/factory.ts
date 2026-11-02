import { findItem, itemDimensions } from "../library/catalog";
import { buildRoom } from "./room";
import type { Material, Opening, Scene, SceneObject, Vec3 } from "./schema";

export const MATERIAL_IDS = {
  wall: "mat-wall",
  floor: "mat-floor",
  ceiling: "mat-ceiling",
};

export function defaultMaterials(): Material[] {
  return [
    { id: MATERIAL_IDS.wall, name: "Pintura de pared", color: "#e8e4dc", roughness: 0.9, metalness: 0, opacity: 1, texture: null },
    { id: MATERIAL_IDS.floor, name: "Piso de madera", color: "#b08968", roughness: 0.7, metalness: 0, opacity: 1, texture: null },
    { id: MATERIAL_IDS.ceiling, name: "Techo", color: "#f5f5f5", roughness: 0.95, metalness: 0, opacity: 1, texture: null },
  ];
}

export function defaultOpenings(width: number, depth: number): Opening[] {
  return [
    { id: "door-1", wallId: "wall-0", kind: "door", offset: Math.min(0.5, Math.max(0, width - 0.9)), width: 0.9, height: 2.1, sill: 0 },
    { id: "window-1", wallId: "wall-1", kind: "window", offset: Math.max(0, depth / 2 - 0.6), width: 1.2, height: 1.1, sill: 0.9 },
  ];
}

export function createDefaultScene(width = 4, depth = 3, height = 2.5): Scene {
  return {
    schemaVersion: 1,
    coordinateSystem: "x-right_y-up_z-depth",
    room: buildRoom(crypto.randomUUID(), width, depth, height, defaultOpenings(width, depth), {
      wall: MATERIAL_IDS.wall,
      floor: MATERIAL_IDS.floor,
      ceiling: MATERIAL_IDS.ceiling,
    }),
    objects: [],
    materials: defaultMaterials(),
  };
}

export function createObjectFromLibrary(libraryId: string, room: { width: number; depth: number }): SceneObject {
  const item = findItem(libraryId);
  if (!item) {
    throw new Error(`Unknown library item ${libraryId}`);
  }
  return {
    id: crypto.randomUUID(),
    name: item.name,
    type: item.type,
    category: item.category,
    libraryId: item.id,
    assetId: null,
    position: [room.width / 2, item.elevation ?? 0, room.depth / 2],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    dimensions: itemDimensions(item),
    materialId: null,
    color: null,
    visible: true,
    locked: false,
    parentId: null,
    origin: "library",
  };
}


export function createObjectFromAsset(
  asset: { id: string; name: string; dimensions: Vec3 },
  room: { width: number; depth: number },
): SceneObject {
  return {
    id: crypto.randomUUID(),
    name: asset.name,
    type: "custom",
    category: "Importado",
    libraryId: null,
    assetId: asset.id,
    position: [room.width / 2, 0, room.depth / 2],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    dimensions: asset.dimensions,
    materialId: null,
    color: null,
    visible: true,
    locked: false,
    parentId: null,
    origin: "manual",
  };
}
