import type { Opening, Room, Vec2, Wall } from "./schema";

export const WALL_THICKNESS = 0.12;

export function wallLength(wall: Wall): number {
  return Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
}

export interface WallFrame {
  center: Vec2;
  angleY: number;
  length: number;
  normal: Vec2;
}

export function wallFrame(wall: Wall, roomCenter: Vec2): WallFrame {
  const length = wallLength(wall);
  const dx = (wall.end[0] - wall.start[0]) / length;
  const dz = (wall.end[1] - wall.start[1]) / length;
  const mid: Vec2 = [(wall.start[0] + wall.end[0]) / 2, (wall.start[1] + wall.end[1]) / 2];
  let normal: Vec2 = [dz, -dx];
  const toWall: Vec2 = [mid[0] - roomCenter[0], mid[1] - roomCenter[1]];
  if (normal[0] * toWall[0] + normal[1] * toWall[1] < 0) {
    normal = [-normal[0], -normal[1]];
  }
  const half = wall.thickness / 2;
  return {
    center: [mid[0] + normal[0] * half, mid[1] + normal[1] * half],
    angleY: Math.atan2(-dz, dx),
    length,
    normal,
  };
}

export interface WallPiece {
  s0: number;
  s1: number;
  y0: number;
  y1: number;
}

export function wallPieces(wall: Wall, openings: Opening[], extension: number): WallPiece[] {
  const length = wallLength(wall);
  const pieces: WallPiece[] = [];
  const sorted = [...openings].sort((a, b) => a.offset - b.offset);
  let cursor = -extension;
  for (const opening of sorted) {
    if (opening.offset > cursor) {
      pieces.push({ s0: cursor, s1: opening.offset, y0: 0, y1: wall.height });
    }
    const end = opening.offset + opening.width;
    if (opening.sill > 0) {
      pieces.push({ s0: opening.offset, s1: end, y0: 0, y1: Math.min(opening.sill, wall.height) });
    }
    const top = opening.sill + opening.height;
    if (top < wall.height) {
      pieces.push({ s0: opening.offset, s1: end, y0: top, y1: wall.height });
    }
    cursor = end;
  }
  if (length + extension > cursor) {
    pieces.push({ s0: cursor, s1: length + extension, y0: 0, y1: wall.height });
  }
  return pieces;
}

export function clampOpening(opening: Opening, length: number, wallHeight: number): Opening {
  const width = Math.min(opening.width, length);
  const height = Math.min(opening.height, wallHeight);
  const sill = Math.min(opening.sill, Math.max(0, wallHeight - height));
  const offset = Math.min(Math.max(opening.offset, 0), Math.max(0, length - width));
  return { ...opening, width, height, sill, offset };
}

export function buildRoom(
  id: string,
  width: number,
  depth: number,
  height: number,
  openings: Opening[],
  materials: { wall: string; floor: string; ceiling: string },
  thickness: number = WALL_THICKNESS,
): Room {
  const corners: Vec2[] = [
    [0, 0],
    [width, 0],
    [width, depth],
    [0, depth],
  ];
  const walls: Wall[] = corners.map((start, index) => ({
    id: `wall-${index}`,
    start,
    end: corners[(index + 1) % 4],
    height,
    thickness,
    materialId: materials.wall,
  }));
  const fitted = openings.map((opening) => {
    const wall = walls.find((candidate) => candidate.id === opening.wallId);
    return wall ? clampOpening(opening, wallLength(wall), height) : opening;
  });
  return {
    id,
    unit: "m",
    width,
    depth,
    height,
    walls,
    openings: fitted,
    floorMaterialId: materials.floor,
    ceilingMaterialId: materials.ceiling,
  };
}

