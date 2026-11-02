import { beforeEach, describe, expect, it } from "vitest";
import { findItem, itemDimensions, LIBRARY } from "../library/catalog";
import { findOverlaps } from "./constraints";
import { createDefaultScene } from "./factory";
import { wallLength, wallPieces } from "./room";
import { SceneSchema } from "./schema";
import { useSceneStore } from "./store";

function reset(width = 4, depth = 3) {
  useSceneStore.getState().loadScene("p1", createDefaultScene(width, depth));
}

describe("room 4 x 3", () => {
  beforeEach(() => reset());

  it("has interior dimensions of 4 x 3 meters with four walls", () => {
    const { room } = useSceneStore.getState().scene;
    expect(room.width).toBe(4);
    expect(room.depth).toBe(3);
    expect(room.walls.map((wall) => wallLength(wall))).toEqual([4, 3, 4, 3]);
  });

  it("validates against the schema", () => {
    expect(() => SceneSchema.parse(useSceneStore.getState().scene)).not.toThrow();
  });

  it("cuts walls around openings without losing wall area", () => {
    const { room } = useSceneStore.getState().scene;
    const wall = room.walls[0];
    const openings = room.openings.filter((opening) => opening.wallId === wall.id);
    const pieces = wallPieces(wall, openings, 0);
    const area = pieces.reduce((sum, piece) => sum + (piece.s1 - piece.s0) * (piece.y1 - piece.y0), 0);
    const holes = openings.reduce((sum, opening) => sum + opening.width * opening.height, 0);
    expect(area).toBeCloseTo(wallLength(wall) * wall.height - holes, 6);
  });
});

describe("bed acceptance", () => {
  beforeEach(() => reset());

  it("adds a bed, moves it, rotates it and survives a JSON roundtrip", () => {
    const store = useSceneStore.getState();
    const id = store.addFromLibrary("bed-queen");
    store.patchObject(id, { position: [2.5, 0, 1.4] });
    store.patchObject(id, { rotation: [0, Math.PI / 2, 0] });

    const bed = useSceneStore.getState().scene.objects[0];
    expect(bed.libraryId).toBe("bed-queen");
    expect(bed.position[0]).toBeCloseTo(2.5, 6);
    expect(bed.position[2]).toBeCloseTo(1.4, 6);
    expect(bed.rotation[1]).toBeCloseTo(Math.PI / 2, 6);

    const restored = SceneSchema.parse(JSON.parse(JSON.stringify(useSceneStore.getState().scene)));
    expect(restored).toEqual(useSceneStore.getState().scene);
  });

  it("keeps the bed inside the walls when constrained", () => {
    const store = useSceneStore.getState();
    const id = store.addFromLibrary("bed-queen");
    store.patchObject(id, { position: [50, 0, -20] });
    const bed = useSceneStore.getState().scene.objects[0];
    expect(bed.position[0]).toBeCloseTo(4 - 0.8, 6);
    expect(bed.position[2]).toBeCloseTo(1.0, 6);
  });

  it("allows leaving the room when the constraint is disabled", () => {
    const store = useSceneStore.getState();
    store.setConstrainToRoom(false);
    const id = store.addFromLibrary("bed-queen");
    store.patchObject(id, { position: [10, 0, 10] });
    expect(useSceneStore.getState().scene.objects[0].position[0]).toBe(10);
    store.setConstrainToRoom(true);
  });

  it("undoes and redoes operations", () => {
    const store = useSceneStore.getState();
    const id = store.addFromLibrary("bed-single");
    store.patchObject(id, { position: [1.5, 0, 1.5] });
    store.undo();
    expect(useSceneStore.getState().scene.objects[0].position[0]).not.toBeCloseTo(1.5, 6);
    store.undo();
    expect(useSceneStore.getState().scene.objects).toHaveLength(0);
    store.redo();
    expect(useSceneStore.getState().scene.objects).toHaveLength(1);
  });

  it("does not move locked objects and removes unlocked ones", () => {
    const store = useSceneStore.getState();
    const id = store.addFromLibrary("nightstand");
    store.patchObject(id, { locked: true });
    store.patchObject(id, { position: [1, 0, 1] });
    expect(useSceneStore.getState().scene.objects[0].position[0]).toBeCloseTo(2, 6);
    store.removeObject(id);
    expect(useSceneStore.getState().scene.objects).toHaveLength(1);
    store.patchObject(id, { locked: false });
    store.removeObject(id);
    expect(useSceneStore.getState().scene.objects).toHaveLength(0);
  });

  it("detects overlapping objects", () => {
    const store = useSceneStore.getState();
    const a = store.addFromLibrary("bed-single");
    const b = store.addFromLibrary("wardrobe");
    store.patchObject(a, { position: [2, 0, 1.5] });
    store.patchObject(b, { position: [2, 0, 1.5] });
    expect(findOverlaps(useSceneStore.getState().scene)).toHaveLength(1);
    store.patchObject(b, { position: [3.3, 0, 0.5] });
    expect(findOverlaps(useSceneStore.getState().scene)).toHaveLength(0);
  });
});

describe("room resizing", () => {
  beforeEach(() => reset());

  it("resizes the room and keeps openings inside their walls", () => {
    useSceneStore.getState().setRoomSize(3, 2, 2.4);
    const { room } = useSceneStore.getState().scene;
    expect(room.width).toBe(3);
    expect(room.walls.map((wall) => wallLength(wall))).toEqual([3, 2, 3, 2]);
    for (const opening of room.openings) {
      const wall = room.walls.find((candidate) => candidate.id === opening.wallId)!;
      expect(opening.offset + opening.width).toBeLessThanOrEqual(wallLength(wall) + 1e-9);
    }
  });
});


describe("openings", () => {
  beforeEach(() => reset());

  it("adds a window on a free wall and selects it", () => {
    const store = useSceneStore.getState();
    const id = store.addOpening("window", "wall-2");
    expect(id).not.toBeNull();
    const state = useSceneStore.getState();
    expect(state.selectedOpeningId).toBe(id);
    const opening = state.scene.room.openings.find((candidate) => candidate.id === id)!;
    expect(opening.wallId).toBe("wall-2");
    expect(opening.offset + opening.width).toBeLessThanOrEqual(4 + 1e-9);
    expect(opening.offset).toBeCloseTo((4 - opening.width) / 2, 6);
  });

  it("moves, resizes and removes an opening with undo support", () => {
    const store = useSceneStore.getState();
    const id = store.addOpening("window", "wall-2")!;
    expect(store.patchOpening(id, { offset: 0.5 })).toBe(true);
    expect(store.patchOpening(id, { width: 1.5 })).toBe(true);
    let opening = useSceneStore.getState().scene.room.openings.find((candidate) => candidate.id === id)!;
    expect(opening.offset).toBeCloseTo(0.5, 6);
    expect(opening.width).toBeCloseTo(1.5, 6);
    store.removeOpening(id);
    expect(useSceneStore.getState().scene.room.openings.some((candidate) => candidate.id === id)).toBe(false);
    store.undo();
    opening = useSceneStore.getState().scene.room.openings.find((candidate) => candidate.id === id)!;
    expect(opening.width).toBeCloseTo(1.5, 6);
  });

  it("clamps an opening inside its wall", () => {
    const store = useSceneStore.getState();
    const id = store.addOpening("window", "wall-2")!;
    store.patchOpening(id, { offset: 99 });
    const opening = useSceneStore.getState().scene.room.openings.find((candidate) => candidate.id === id)!;
    expect(opening.offset + opening.width).toBeLessThanOrEqual(4 + 1e-9);
  });

  it("rejects openings that overlap another one on the same wall", () => {
    const store = useSceneStore.getState();
    const first = store.addOpening("window", "wall-2")!;
    store.patchOpening(first, { offset: 0.2 });
    const second = store.addOpening("window", "wall-2")!;
    const before = useSceneStore.getState().scene.room.openings.find((candidate) => candidate.id === second)!;
    expect(store.patchOpening(second, { offset: 0.5 })).toBe(false);
    const after = useSceneStore.getState().scene.room.openings.find((candidate) => candidate.id === second)!;
    expect(after.offset).toBe(before.offset);
  });

  it("refuses to add an opening when the wall has no free space", () => {
    const store = useSceneStore.getState();
    const first = store.addOpening("door", "wall-2")!;
    expect(store.patchOpening(first, { width: 4, offset: 0 })).toBe(true);
    expect(useSceneStore.getState().scene.room.openings.find((candidate) => candidate.id === first)!.width).toBe(4);
    expect(store.addOpening("window", "wall-2")).toBeNull();
  });

  it("persists openings through the schema", () => {
    const store = useSceneStore.getState();
    store.addOpening("door", "wall-3");
    const restored = SceneSchema.parse(JSON.parse(JSON.stringify(useSceneStore.getState().scene)));
    expect(restored.room.openings).toHaveLength(3);
  });
});

describe("expanded library", () => {
  beforeEach(() => reset(6, 5));

  it("defines every new item with positive dimensions starting at the floor or its elevation", () => {
    for (const item of LIBRARY) {
      const dimensions = itemDimensions(item);
      expect(dimensions.every((value) => value > 0)).toBe(true);
    }
    expect(LIBRARY.length).toBeGreaterThanOrEqual(19);
  });

  it("includes kitchen appliances, tables and crates", () => {
    const ids = LIBRARY.map((item) => item.id);
    for (const id of ["refrigerator", "oven", "dining-table", "kitchen-table", "crate-small", "crate-large", "chair", "sofa"]) {
      expect(ids).toContain(id);
    }
    expect(findItem("refrigerator")!.type).toBe("appliance");
    expect(findItem("oven")!.type).toBe("appliance");
  });

  it("places a wall shelf at its default elevation", () => {
    const id = useSceneStore.getState().addFromLibrary("wall-shelf");
    const shelf = useSceneStore.getState().scene.objects.find((object) => object.id === id)!;
    expect(shelf.position[1]).toBe(1.5);
  });

  it("adds every library item to a scene that still validates", () => {
    for (const item of LIBRARY) {
      useSceneStore.getState().addFromLibrary(item.id);
    }
    expect(() => SceneSchema.parse(useSceneStore.getState().scene)).not.toThrow();
    expect(useSceneStore.getState().scene.objects).toHaveLength(LIBRARY.length);
  });
});

describe("double bed and imported models", () => {
  beforeEach(() => reset(4, 3));

  it("adds a double bed of 1.40 x 1.90 m", () => {
    const id = useSceneStore.getState().addFromLibrary("bed-double");
    const bed = useSceneStore.getState().scene.objects.find((object) => object.id === id)!;
    expect(bed.name).toBe("Cama matrimonial");
    expect(bed.dimensions[0]).toBeCloseTo(1.4, 3);
    expect(bed.dimensions[2]).toBeCloseTo(1.9, 3);
  });

  it("adds an imported model as an independent object that references its asset", () => {
    const id = useSceneStore.getState().addImported({ id: "asset-1", name: "Silla importada", dimensions: [0.5, 0.9, 0.5] });
    const object = useSceneStore.getState().scene.objects.find((candidate) => candidate.id === id)!;
    expect(object.assetId).toBe("asset-1");
    expect(object.type).toBe("custom");
    expect(object.libraryId).toBeNull();
    expect(object.dimensions).toEqual([0.5, 0.9, 0.5]);
    useSceneStore.getState().patchObject(id, { position: [3.9, 0, 2.9] });
    const moved = useSceneStore.getState().scene.objects.find((candidate) => candidate.id === id)!;
    expect(moved.position[0]).toBeCloseTo(3.75, 6);
    expect(moved.position[2]).toBeCloseTo(2.75, 6);
  });

  it("keeps the asset reference through a JSON roundtrip and defaults it for old scenes", () => {
    useSceneStore.getState().addImported({ id: "asset-2", name: "Mesa", dimensions: [1, 0.75, 0.6] });
    const scene = useSceneStore.getState().scene;
    const restored = SceneSchema.parse(JSON.parse(JSON.stringify(scene)));
    expect(restored.objects[0].assetId).toBe("asset-2");
    const legacy = JSON.parse(JSON.stringify(scene));
    delete legacy.objects[0].assetId;
    expect(SceneSchema.parse(legacy).objects[0].assetId).toBeNull();
  });

  it("undoes the import of a model", () => {
    useSceneStore.getState().addImported({ id: "asset-3", name: "Lampara", dimensions: [0.3, 1.2, 0.3] });
    useSceneStore.getState().undo();
    expect(useSceneStore.getState().scene.objects).toHaveLength(0);
  });
});

describe("phase 2 architectural editor and 2D synchronization", () => {
  beforeEach(() => reset(4, 3));

  it("changes a wall from 3 to 4 meters and updates the parametric room and all walls", () => {
    const store = useSceneStore.getState();
    const wall1 = store.scene.room.walls.find((w) => w.id === "wall-1")!;
    expect(wallLength(wall1)).toBeCloseTo(3, 6);

    store.setWallLength("wall-1", 4);

    const updatedRoom = useSceneStore.getState().scene.room;
    expect(updatedRoom.depth).toBe(4);
    expect(updatedRoom.width).toBe(4);
    const updatedWall1 = updatedRoom.walls.find((w) => w.id === "wall-1")!;
    expect(wallLength(updatedWall1)).toBeCloseTo(4, 6);
    const updatedWall3 = updatedRoom.walls.find((w) => w.id === "wall-3")!;
    expect(wallLength(updatedWall3)).toBeCloseTo(4, 6);
    expect(() => SceneSchema.parse(useSceneStore.getState().scene)).not.toThrow();
  });

  it("changes a width wall from 4 to 5 meters and updates room width", () => {
    const store = useSceneStore.getState();
    store.setWallLength("wall-0", 5);
    const updatedRoom = useSceneStore.getState().scene.room;
    expect(updatedRoom.width).toBe(5);
    expect(updatedRoom.depth).toBe(3);
    const updatedWall0 = updatedRoom.walls.find((w) => w.id === "wall-0")!;
    expect(wallLength(updatedWall0)).toBeCloseTo(5, 6);
    const updatedWall2 = updatedRoom.walls.find((w) => w.id === "wall-2")!;
    expect(wallLength(updatedWall2)).toBeCloseTo(5, 6);
  });

  it("selects wall and clears other selections", () => {
    const store = useSceneStore.getState();
    const objId = store.addFromLibrary("desk");
    expect(useSceneStore.getState().selectedId).toBe(objId);

    store.selectWall("wall-0");
    const state = useSceneStore.getState();
    expect(state.selectedWallId).toBe("wall-0");
    expect(state.selectedId).toBeNull();
    expect(state.selectedOpeningId).toBeNull();
  });

  it("synchronizes 2D position changes with 3D model and constrains to new room boundaries", () => {
    const store = useSceneStore.getState();
    const id = store.addFromLibrary("desk");
    store.patchObject(id, { position: [1.2, 0, 2.0] });
    let obj = useSceneStore.getState().scene.objects.find((o) => o.id === id)!;
    expect(obj.position[0]).toBeCloseTo(1.2, 6);
    expect(obj.position[2]).toBeCloseTo(2.0, 6);

    store.setWallLength("wall-1", 4);
    store.patchObject(id, { position: [1.2, 0, 3.5] });
    obj = useSceneStore.getState().scene.objects.find((o) => o.id === id)!;
    expect(obj.position[2]).toBeCloseTo(3.5, 6);
  });
});
