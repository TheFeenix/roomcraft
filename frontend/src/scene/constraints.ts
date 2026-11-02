import type { Room, Scene, SceneObject, Vec3 } from "./schema";

export function footprintHalfExtents(object: Pick<SceneObject, "dimensions" | "scale" | "rotation">): [number, number] {
  const sx = (object.dimensions[0] * object.scale[0]) / 2;
  const sz = (object.dimensions[2] * object.scale[2]) / 2;
  const angle = object.rotation[1];
  const c = Math.abs(Math.cos(angle));
  const s = Math.abs(Math.sin(angle));
  return [c * sx + s * sz, s * sx + c * sz];
}

export function clampPositionToRoom(
  position: Vec3,
  object: Pick<SceneObject, "dimensions" | "scale" | "rotation">,
  room: Pick<Room, "width" | "depth" | "height">,
): Vec3 {
  const [hx, hz] = footprintHalfExtents(object);
  const x = room.width >= hx * 2 ? Math.min(Math.max(position[0], hx), room.width - hx) : room.width / 2;
  const z = room.depth >= hz * 2 ? Math.min(Math.max(position[2], hz), room.depth - hz) : room.depth / 2;
  const y = Math.max(0, position[1]);
  return [x, y, z];
}

export function snapValue(value: number, step: number): number {
  if (step <= 0) {
    return value;
  }
  return Math.round(value / step) * step;
}

export function findOverlaps(scene: Scene): Array<[string, string]> {
  const boxes = scene.objects
    .filter((object) => object.visible)
    .map((object) => {
      const [hx, hz] = footprintHalfExtents(object);
      const height = object.dimensions[1] * object.scale[1];
      return {
        id: object.id,
        minX: object.position[0] - hx,
        maxX: object.position[0] + hx,
        minY: object.position[1],
        maxY: object.position[1] + height,
        minZ: object.position[2] - hz,
        maxZ: object.position[2] + hz,
      };
    });
  const pairs: Array<[string, string]> = [];
  const epsilon = 1e-6;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (
        a.minX < b.maxX - epsilon &&
        a.maxX > b.minX + epsilon &&
        a.minY < b.maxY - epsilon &&
        a.maxY > b.minY + epsilon &&
        a.minZ < b.maxZ - epsilon &&
        a.maxZ > b.minZ + epsilon
      ) {
        pairs.push([a.id, b.id]);
      }
    }
  }
  return pairs;
}

