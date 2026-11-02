import type { Vec3 } from "../scene/schema";
import { EXTRA_ITEMS } from "./furniture";

export interface Part {
  size: Vec3;
  center: Vec3;
  color: string;
  main?: boolean;
}

export interface LibraryItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  type: "furniture" | "appliance" | "decoration" | "lighting";
  elevation?: number;
  parts: Part[];
}

function bed(id: string, name: string, width: number, depth: number): LibraryItem {
  const frameHeight = 0.3;
  return {
    id,
    name,
    category: "Dormitorio",
    subcategory: "Camas",
    type: "furniture",
    parts: [
      { size: [width, frameHeight, depth], center: [0, frameHeight / 2, 0], color: "#7a5230" },
      { size: [width - 0.08, 0.22, depth - 0.12], center: [0, frameHeight + 0.11, 0.04], color: "#e9e4da", main: true },
      { size: [width, 0.95, 0.08], center: [0, 0.475, -depth / 2 + 0.04], color: "#5f3f22" },
      { size: [width * 0.4, 0.12, 0.35], center: [-width * 0.22, frameHeight + 0.28, -depth / 2 + 0.3], color: "#ffffff" },
      { size: [width * 0.4, 0.12, 0.35], center: [width * 0.22, frameHeight + 0.28, -depth / 2 + 0.3], color: "#ffffff" },
    ],
  };
}

function desk(): LibraryItem {
  const width = 1.2;
  const depth = 0.6;
  const height = 0.75;
  const leg = 0.05;
  const top = 0.03;
  const legHeight = height - top;
  const lx = width / 2 - leg / 2;
  const lz = depth / 2 - leg / 2;
  const legColor = "#3b3b3b";
  return {
    id: "desk",
    name: "Escritorio",
    category: "Oficina",
    subcategory: "Escritorios",
    type: "furniture",
    parts: [
      { size: [width, top, depth], center: [0, height - top / 2, 0], color: "#a8794a", main: true },
      { size: [leg, legHeight, leg], center: [-lx, legHeight / 2, -lz], color: legColor },
      { size: [leg, legHeight, leg], center: [lx, legHeight / 2, -lz], color: legColor },
      { size: [leg, legHeight, leg], center: [-lx, legHeight / 2, lz], color: legColor },
      { size: [leg, legHeight, leg], center: [lx, legHeight / 2, lz], color: legColor },
    ],
  };
}

export const LIBRARY: LibraryItem[] = [
  bed("bed-single", "Cama individual", 0.9, 2.0),
  bed("bed-double", "Cama matrimonial", 1.4, 1.9),
  bed("bed-queen", "Cama queen", 1.6, 2.0),
  {
    id: "nightstand",
    name: "Mesa de noche",
    category: "Dormitorio",
    subcategory: "Mesas de noche",
    type: "furniture",
    parts: [
      { size: [0.45, 0.5, 0.4], center: [0, 0.25, 0], color: "#8b6239", main: true },
      { size: [0.4, 0.18, 0.02], center: [0, 0.32, 0.21], color: "#6d4a2a" },
    ],
  },
  {
    id: "wardrobe",
    name: "Armario",
    category: "Dormitorio",
    subcategory: "Armarios",
    type: "furniture",
    parts: [
      { size: [1.2, 2.0, 0.55], center: [0, 1.0, 0], color: "#d8d2c4", main: true },
      { size: [0.02, 1.8, 0.02], center: [-0.04, 1.0, 0.285], color: "#555555" },
    ],
  },
  desk(),
  ...EXTRA_ITEMS,
];

export function findItem(id: string): LibraryItem | undefined {
  return LIBRARY.find((item) => item.id === id);
}

export function itemDimensions(item: LibraryItem): Vec3 {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (const part of item.parts) {
    minX = Math.min(minX, part.center[0] - part.size[0] / 2);
    maxX = Math.max(maxX, part.center[0] + part.size[0] / 2);
    minY = Math.min(minY, part.center[1] - part.size[1] / 2);
    maxY = Math.max(maxY, part.center[1] + part.size[1] / 2);
    minZ = Math.min(minZ, part.center[2] - part.size[2] / 2);
    maxZ = Math.max(maxZ, part.center[2] + part.size[2] / 2);
  }
  return [round(maxX - minX), round(maxY - minY), round(maxZ - minZ)];
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

