import { z } from "zod";

export const Vec3 = z.tuple([z.number(), z.number(), z.number()]);
export const Vec2 = z.tuple([z.number(), z.number()]);
export const PositiveVec3 = z.tuple([z.number().positive(), z.number().positive(), z.number().positive()]);
const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const ObjectType = z.enum([
  "architectural",
  "furniture",
  "appliance",
  "decoration",
  "lighting",
  "custom",
  "reconstructed",
  "scanned",
]);

export const MaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: HexColor,
  roughness: z.number().min(0).max(1),
  metalness: z.number().min(0).max(1),
  opacity: z.number().min(0).max(1).default(1),
  texture: z.string().nullable().default(null),
});

export const WallSchema = z.object({
  id: z.string(),
  start: Vec2,
  end: Vec2,
  height: z.number().positive().max(20),
  thickness: z.number().positive().max(2),
  materialId: z.string(),
});

export const OpeningSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  kind: z.enum(["door", "window"]),
  offset: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
  sill: z.number().min(0),
});

export const RoomSchema = z.object({
  id: z.string(),
  unit: z.literal("m"),
  width: z.number().positive().max(100),
  depth: z.number().positive().max(100),
  height: z.number().positive().max(20),
  walls: z.array(WallSchema),
  openings: z.array(OpeningSchema),
  floorMaterialId: z.string(),
  ceilingMaterialId: z.string(),
});

export const SceneObjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ObjectType,
  category: z.string(),
  libraryId: z.string().nullable().default(null),
  assetId: z.string().nullable().default(null),
  position: Vec3,
  rotation: Vec3,
  scale: PositiveVec3,
  dimensions: PositiveVec3,
  materialId: z.string().nullable().default(null),
  color: HexColor.nullable().default(null),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
  parentId: z.string().nullable().default(null),
  origin: z.enum(["library", "manual", "reconstruction"]).default("library"),
});

export const SceneSchema = z.object({
  schemaVersion: z.literal(1),
  coordinateSystem: z.literal("x-right_y-up_z-depth"),
  room: RoomSchema,
  objects: z.array(SceneObjectSchema),
  materials: z.array(MaterialSchema),
});

export type Vec3 = z.infer<typeof Vec3>;
export type Vec2 = z.infer<typeof Vec2>;
export type Material = z.infer<typeof MaterialSchema>;
export type Wall = z.infer<typeof WallSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type Room = z.infer<typeof RoomSchema>;
export type SceneObject = z.infer<typeof SceneObjectSchema>;
export type Scene = z.infer<typeof SceneSchema>;

