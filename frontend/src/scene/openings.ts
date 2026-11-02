import type { Opening } from "./schema";

const EPSILON = 1e-6;

export const WALL_LABELS: Record<string, string> = {
  "wall-0": "Pared 1 (frente, Z=0)",
  "wall-1": "Pared 2 (derecha, X=ancho)",
  "wall-2": "Pared 3 (fondo, Z=largo)",
  "wall-3": "Pared 4 (izquierda, X=0)",
};

export function openingsOverlap(a: Opening, b: Opening): boolean {
  return a.wallId === b.wallId && a.offset < b.offset + b.width - EPSILON && a.offset + a.width > b.offset + EPSILON;
}

export function findFreeOffset(length: number, others: Opening[], width: number): number | null {
  const sorted = [...others].sort((x, y) => x.offset - y.offset);
  const gaps: Array<[number, number]> = [];
  let cursor = 0;
  for (const other of sorted) {
    if (other.offset > cursor) {
      gaps.push([cursor, other.offset]);
    }
    cursor = Math.max(cursor, other.offset + other.width);
  }
  if (length > cursor) {
    gaps.push([cursor, length]);
  }
  const middle = length / 2;
  let best: number | null = null;
  let bestDistance = Infinity;
  for (const [start, end] of gaps) {
    if (end - start < width - EPSILON) {
      continue;
    }
    const center = Math.min(Math.max(middle, start + width / 2), end - width / 2);
    const distance = Math.abs(center - middle);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = center - width / 2;
    }
  }
  return best;
}

