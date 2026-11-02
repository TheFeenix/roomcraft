from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

Vec3 = tuple[float, float, float]
Vec2 = tuple[float, float]

ObjectType = Literal[
    "architectural",
    "furniture",
    "appliance",
    "decoration",
    "lighting",
    "custom",
    "reconstructed",
    "scanned",
]


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Material(Strict):
    id: str
    name: str
    color: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    roughness: float = Field(ge=0, le=1)
    metalness: float = Field(ge=0, le=1)
    opacity: float = Field(default=1, ge=0, le=1)
    texture: str | None = None


class Wall(Strict):
    id: str
    start: Vec2
    end: Vec2
    height: float = Field(gt=0, le=20)
    thickness: float = Field(gt=0, le=2)
    materialId: str


class Opening(Strict):
    id: str
    wallId: str
    kind: Literal["door", "window"]
    offset: float = Field(ge=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    sill: float = Field(ge=0)


class Room(Strict):
    id: str
    unit: Literal["m"] = "m"
    width: float = Field(gt=0, le=100)
    depth: float = Field(gt=0, le=100)
    height: float = Field(gt=0, le=20)
    walls: list[Wall]
    openings: list[Opening]
    floorMaterialId: str
    ceilingMaterialId: str


class SceneObject(Strict):
    id: str
    name: str
    type: ObjectType
    category: str
    libraryId: str | None = None
    assetId: str | None = None
    position: Vec3
    rotation: Vec3
    scale: Vec3
    dimensions: Vec3
    materialId: str | None = None
    color: str | None = Field(default=None, pattern=r"^#[0-9a-fA-F]{6}$")
    visible: bool = True
    locked: bool = False
    parentId: str | None = None
    origin: Literal["library", "manual", "reconstruction"] = "library"

    @field_validator("scale", "dimensions")
    @classmethod
    def positive(cls, value: Vec3) -> Vec3:
        if any(component <= 0 for component in value):
            raise ValueError("values must be positive")
        return value


class Scene(Strict):
    schemaVersion: Literal[1] = 1
    coordinateSystem: Literal["x-right_y-up_z-depth"] = "x-right_y-up_z-depth"
    room: Room
    objects: list[SceneObject]
    materials: list[Material]

