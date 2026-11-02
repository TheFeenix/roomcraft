from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from .scene_schema import Scene


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = ""
    scene: Scene


class ProjectUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None


class ProjectSummary(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    updated_at: datetime


class ProjectDetail(ProjectSummary):
    scene: Scene


class SceneEnvelope(BaseModel):
    scene: Scene
    updated_at: datetime


class VersionCreate(BaseModel):
    label: str = Field(default="", max_length=200)


class VersionSummary(BaseModel):
    id: str
    project_id: str
    label: str
    created_at: datetime


class VersionDetail(VersionSummary):
    scene: Scene



class AssetOut(BaseModel):
    id: str
    name: str
    size_bytes: int
    width: float
    height: float
    depth: float
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
