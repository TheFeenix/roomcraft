import { create } from "zustand";
import { clampPositionToRoom, snapValue } from "./constraints";
import { createDefaultScene, createObjectFromAsset, createObjectFromLibrary } from "./factory";
import { findFreeOffset, openingsOverlap } from "./openings";
import { buildRoom, clampOpening, wallLength } from "./room";
import type { Opening, Scene, SceneObject, Vec3 } from "./schema";

export type TransformMode = "translate" | "rotate" | "scale";

export type OpeningPatch = Partial<Pick<Opening, "wallId" | "offset" | "width" | "height" | "sill">>;

export interface ObjectPatch {
  name?: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
  color?: string | null;
  visible?: boolean;
  locked?: boolean;
}

interface SceneState {
  scene: Scene;
  projectId: string | null;
  selectedId: string | null;
  selectedOpeningId: string | null;
  selectedWallId: string | null;
  mode: TransformMode;
  snapStep: number;
  constrainToRoom: boolean;
  past: Scene[];
  future: Scene[];
  dirty: boolean;
  loadScene: (projectId: string | null, scene: Scene) => void;
  select: (id: string | null) => void;
  setMode: (mode: TransformMode) => void;
  setSnapStep: (step: number) => void;
  setConstrainToRoom: (value: boolean) => void;
  addFromLibrary: (libraryId: string) => string;
  addImported: (asset: { id: string; name: string; dimensions: Vec3 }) => string;
  patchObject: (id: string, patch: ObjectPatch) => void;
  removeObject: (id: string) => void;
  duplicateObject: (id: string) => string | null;
  selectOpening: (id: string | null) => void;
  addOpening: (kind: Opening["kind"], wallId: string) => string | null;
  patchOpening: (id: string, patch: OpeningPatch) => boolean;
  removeOpening: (id: string) => void;
  selectWall: (id: string | null) => void;
  setWallLength: (wallId: string, length: number) => void;
  setRoomSize: (width: number, depth: number, height: number) => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
}

const HISTORY_LIMIT = 200;

export function applyPatch(scene: Scene, id: string, patch: ObjectPatch, constrain: boolean, snapStep: number): Scene {
  const objects = scene.objects.map((object): SceneObject => {
    if (object.id !== id) {
      return object;
    }
    let next: SceneObject = { ...object, ...patch };
    if (patch.position) {
      let position: Vec3 = patch.position;
      if (snapStep > 0) {
        position = [snapValue(position[0], snapStep), snapValue(position[1], snapStep), snapValue(position[2], snapStep)];
      }
      next = { ...next, position };
    }
    if (constrain) {
      next = { ...next, position: clampPositionToRoom(next.position, next, scene.room) };
    } else {
      next = { ...next, position: [next.position[0], Math.max(0, next.position[1]), next.position[2]] };
    }
    return next;
  });
  return { ...scene, objects };
}

export const useSceneStore = create<SceneState>((set, get) => {
  const commit = (next: Scene, extra: Partial<SceneState> = {}) => {
    const { scene, past } = get();
    set({
      scene: next,
      past: [...past, scene].slice(-HISTORY_LIMIT),
      future: [],
      dirty: true,
      ...extra,
    });
  };

  return {
    scene: createDefaultScene(),
    projectId: null,
    selectedId: null,
    selectedOpeningId: null,
    selectedWallId: null,
    mode: "translate",
    snapStep: 0.05,
    constrainToRoom: true,
    past: [],
    future: [],
    dirty: false,

    loadScene: (projectId, scene) =>
      set({ scene, projectId, selectedId: null, selectedOpeningId: null, selectedWallId: null, past: [], future: [], dirty: false }),

    select: (id) => set({ selectedId: id, selectedOpeningId: null, selectedWallId: null }),
    setMode: (mode) => set({ mode }),
    setSnapStep: (snapStep) => set({ snapStep }),
    setConstrainToRoom: (constrainToRoom) => set({ constrainToRoom }),

    addFromLibrary: (libraryId) => {
      const { scene, constrainToRoom } = get();
      const object = createObjectFromLibrary(libraryId, scene.room);
      const position = constrainToRoom ? clampPositionToRoom(object.position, object, scene.room) : object.position;
      commit({ ...scene, objects: [...scene.objects, { ...object, position }] }, { selectedId: object.id });
      return object.id;
    },

    addImported: (asset) => {
      const { scene, constrainToRoom } = get();
      const object = createObjectFromAsset(asset, scene.room);
      const position = constrainToRoom ? clampPositionToRoom(object.position, object, scene.room) : object.position;
      commit({ ...scene, objects: [...scene.objects, { ...object, position }] }, { selectedId: object.id });
      return object.id;
    },

    patchObject: (id, patch) => {
      const { scene, constrainToRoom, snapStep } = get();
      const target = scene.objects.find((object) => object.id === id);
      if (!target) {
        return;
      }
      if (target.locked && (patch.position || patch.rotation || patch.scale)) {
        return;
      }
      commit(applyPatch(scene, id, patch, constrainToRoom, snapStep));
    },

    removeObject: (id) => {
      const { scene, selectedId } = get();
      const target = scene.objects.find((object) => object.id === id);
      if (!target || target.locked) {
        return;
      }
      commit(
        { ...scene, objects: scene.objects.filter((object) => object.id !== id) },
        { selectedId: selectedId === id ? null : selectedId },
      );
    },

    duplicateObject: (id) => {
      const { scene, constrainToRoom } = get();
      const source = scene.objects.find((object) => object.id === id);
      if (!source) {
        return null;
      }
      const position: Vec3 = [source.position[0] + 0.3, source.position[1], source.position[2] + 0.3];
      const copy: SceneObject = {
        ...source,
        id: crypto.randomUUID(),
        name: `${source.name} (copia)`,
        position: constrainToRoom ? clampPositionToRoom(position, source, scene.room) : position,
        locked: false,
      };
      commit({ ...scene, objects: [...scene.objects, copy] }, { selectedId: copy.id });
      return copy.id;
    },

    selectOpening: (id) => set({ selectedOpeningId: id, selectedId: null, selectedWallId: null }),
    selectWall: (id) => set({ selectedWallId: id, selectedId: null, selectedOpeningId: null }),

    addOpening: (kind, wallId) => {
      const { scene } = get();
      const wall = scene.room.walls.find((candidate) => candidate.id === wallId);
      if (!wall) {
        return null;
      }
      const length = wallLength(wall);
      const base = kind === "window" ? { width: 1.2, height: 1.1, sill: 0.9 } : { width: 0.9, height: 2.1, sill: 0 };
      const width = Math.min(base.width, length * 0.9);
      const height = Math.min(base.height, wall.height);
      const sill = Math.min(base.sill, wall.height - height);
      const others = scene.room.openings.filter((candidate) => candidate.wallId === wallId);
      const offset = findFreeOffset(length, others, width);
      if (offset === null) {
        return null;
      }
      const opening: Opening = { id: crypto.randomUUID(), wallId, kind, offset, width, height, sill };
      commit(
        { ...scene, room: { ...scene.room, openings: [...scene.room.openings, opening] } },
        { selectedId: null, selectedOpeningId: opening.id },
      );
      return opening.id;
    },

    patchOpening: (id, patch) => {
      const { scene, snapStep } = get();
      const opening = scene.room.openings.find((candidate) => candidate.id === id);
      if (!opening) {
        return false;
      }
      let next: Opening = { ...opening, ...patch };
      const wall = scene.room.walls.find((candidate) => candidate.id === next.wallId);
      if (!wall) {
        return false;
      }
      const length = wallLength(wall);
      const others = scene.room.openings.filter((candidate) => candidate.id !== id);
      if (patch.offset !== undefined && snapStep > 0) {
        next = { ...next, offset: snapValue(next.offset, snapStep) };
      }
      next = clampOpening(next, length, wall.height);
      if (patch.wallId !== undefined && patch.wallId !== opening.wallId && patch.offset === undefined) {
        const free = findFreeOffset(length, others.filter((candidate) => candidate.wallId === next.wallId), next.width);
        if (free === null) {
          return false;
        }
        next = { ...next, offset: free };
      }
      if (others.some((candidate) => openingsOverlap(next, candidate))) {
        return false;
      }
      const unchanged =
        next.wallId === opening.wallId &&
        next.offset === opening.offset &&
        next.width === opening.width &&
        next.height === opening.height &&
        next.sill === opening.sill;
      if (unchanged) {
        return true;
      }
      commit({
        ...scene,
        room: { ...scene.room, openings: scene.room.openings.map((candidate) => (candidate.id === id ? next : candidate)) },
      });
      return true;
    },

    removeOpening: (id) => {
      const { scene, selectedOpeningId } = get();
      if (!scene.room.openings.some((candidate) => candidate.id === id)) {
        return;
      }
      commit(
        { ...scene, room: { ...scene.room, openings: scene.room.openings.filter((candidate) => candidate.id !== id) } },
        { selectedOpeningId: selectedOpeningId === id ? null : selectedOpeningId },
      );
    },

    setWallLength: (wallId, length) => {
      const { scene } = get();
      if (length <= 0) return;
      if (wallId === "wall-0" || wallId === "wall-2") {
        get().setRoomSize(length, scene.room.depth, scene.room.height);
      } else if (wallId === "wall-1" || wallId === "wall-3") {
        get().setRoomSize(scene.room.width, length, scene.room.height);
      }
    },

    setRoomSize: (width, depth, height) => {
      const { scene, constrainToRoom } = get();
      const first = scene.room.walls[0];
      const room = buildRoom(
        scene.room.id,
        width,
        depth,
        height,
        scene.room.openings,
        { wall: first.materialId, floor: scene.room.floorMaterialId, ceiling: scene.room.ceilingMaterialId },
        first.thickness,
      );
      const objects = constrainToRoom
        ? scene.objects.map((object) => ({ ...object, position: clampPositionToRoom(object.position, object, room) }))
        : scene.objects;
      commit({ ...scene, room, objects });
    },

    undo: () => {
      const { past, future, scene, selectedId } = get();
      if (past.length === 0) {
        return;
      }
      const previous = past[past.length - 1];
      set({
        scene: previous,
        past: past.slice(0, -1),
        future: [scene, ...future],
        dirty: true,
        selectedId: previous.objects.some((object) => object.id === selectedId) ? selectedId : null,
        selectedOpeningId: previous.room.openings.some((opening) => opening.id === get().selectedOpeningId)
          ? get().selectedOpeningId
          : null,
      });
    },

    redo: () => {
      const { past, future, scene, selectedId } = get();
      if (future.length === 0) {
        return;
      }
      const next = future[0];
      set({
        scene: next,
        past: [...past, scene],
        future: future.slice(1),
        dirty: true,
        selectedId: next.objects.some((object) => object.id === selectedId) ? selectedId : null,
        selectedOpeningId: next.room.openings.some((opening) => opening.id === get().selectedOpeningId)
          ? get().selectedOpeningId
          : null,
      });
    },

    markSaved: () => set({ dirty: false }),
  };
});

