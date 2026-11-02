import hashlib

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from . import models, schemas
from .db import DATA_DIR, Base, engine, get_db
from .glb import validate_glb
from .scene_schema import Scene

Base.metadata.create_all(engine)

MODELS_DIR = DATA_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
MAX_MODEL_BYTES = 50 * 1024 * 1024

app = FastAPI(title="ROOMCRAFT 3D", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def dump(scene: Scene) -> str:
    return scene.model_dump_json()


def load(raw: str) -> Scene:
    return Scene.model_validate_json(raw)


def get_project(db: Session, project_id: str) -> models.Project:
    project = db.get(models.Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


def detail(project: models.Project) -> schemas.ProjectDetail:
    return schemas.ProjectDetail(
        id=project.id,
        name=project.name,
        description=project.description,
        created_at=project.created_at,
        updated_at=project.updated_at,
        scene=load(project.scene_json),
    )


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


@app.get("/api/v1/projects", response_model=list[schemas.ProjectSummary])
def list_projects(db: Session = Depends(get_db)):
    return db.scalars(select(models.Project).order_by(models.Project.updated_at.desc())).all()


@app.post("/api/v1/projects", response_model=schemas.ProjectDetail, status_code=201)
def create_project(payload: schemas.ProjectCreate, db: Session = Depends(get_db)):
    project = models.Project(name=payload.name, description=payload.description, scene_json=dump(payload.scene))
    db.add(project)
    db.commit()
    return detail(project)


@app.get("/api/v1/projects/{project_id}", response_model=schemas.ProjectDetail)
def read_project(project_id: str, db: Session = Depends(get_db)):
    return detail(get_project(db, project_id))


@app.patch("/api/v1/projects/{project_id}", response_model=schemas.ProjectDetail)
def update_project(project_id: str, payload: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    db.commit()
    return detail(project)


@app.delete("/api/v1/projects/{project_id}", status_code=204)
def delete_project(project_id: str, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    db.delete(project)
    db.commit()
    return Response(status_code=204)


@app.post("/api/v1/projects/{project_id}/duplicate", response_model=schemas.ProjectDetail, status_code=201)
def duplicate_project(project_id: str, db: Session = Depends(get_db)):
    source = get_project(db, project_id)
    copy = models.Project(name=f"{source.name} (copia)", description=source.description, scene_json=source.scene_json)
    db.add(copy)
    db.commit()
    return detail(copy)


@app.get("/api/v1/projects/{project_id}/scene", response_model=schemas.SceneEnvelope)
def read_scene(project_id: str, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    return schemas.SceneEnvelope(scene=load(project.scene_json), updated_at=project.updated_at)


@app.put("/api/v1/projects/{project_id}/scene", response_model=schemas.SceneEnvelope)
def write_scene(project_id: str, scene: Scene, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    project.scene_json = dump(scene)
    db.commit()
    return schemas.SceneEnvelope(scene=scene, updated_at=project.updated_at)


@app.get("/api/v1/projects/{project_id}/versions", response_model=list[schemas.VersionSummary])
def list_versions(project_id: str, db: Session = Depends(get_db)):
    return get_project(db, project_id).versions


@app.post("/api/v1/projects/{project_id}/versions", response_model=schemas.VersionSummary, status_code=201)
def create_version(project_id: str, payload: schemas.VersionCreate, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    version = models.SceneVersion(project_id=project.id, label=payload.label, scene_json=project.scene_json)
    db.add(version)
    db.commit()
    return version


@app.get("/api/v1/projects/{project_id}/versions/{version_id}", response_model=schemas.VersionDetail)
def read_version(project_id: str, version_id: str, db: Session = Depends(get_db)):
    get_project(db, project_id)
    version = db.get(models.SceneVersion, version_id)
    if version is None or version.project_id != project_id:
        raise HTTPException(status_code=404, detail="Version not found")
    return schemas.VersionDetail(
        id=version.id,
        project_id=version.project_id,
        label=version.label,
        created_at=version.created_at,
        scene=load(version.scene_json),
    )


@app.post("/api/v1/projects/{project_id}/versions/{version_id}/restore", response_model=schemas.SceneEnvelope)
def restore_version(project_id: str, version_id: str, db: Session = Depends(get_db)):
    project = get_project(db, project_id)
    version = db.get(models.SceneVersion, version_id)
    if version is None or version.project_id != project_id:
        raise HTTPException(status_code=404, detail="Version not found")
    project.scene_json = version.scene_json
    db.commit()
    return schemas.SceneEnvelope(scene=load(project.scene_json), updated_at=project.updated_at)



def get_asset(db: Session, asset_id: str) -> models.ModelAsset:
    asset = db.get(models.ModelAsset, asset_id)
    if asset is None:
        raise HTTPException(status_code=404, detail="Model not found")
    return asset


@app.get("/api/v1/models", response_model=list[schemas.AssetOut])
def list_models(db: Session = Depends(get_db)):
    return db.scalars(select(models.ModelAsset).order_by(models.ModelAsset.created_at.desc())).all()


@app.post("/api/v1/models", response_model=schemas.AssetOut, status_code=201)
async def upload_model(
    request: Request,
    name: str = Query(min_length=1, max_length=200),
    width: float = Query(gt=0, le=100),
    height: float = Query(gt=0, le=100),
    depth: float = Query(gt=0, le=100),
    db: Session = Depends(get_db),
):
    chunks: list[bytes] = []
    total = 0
    async for chunk in request.stream():
        total += len(chunk)
        if total > MAX_MODEL_BYTES:
            raise HTTPException(status_code=413, detail="Model file is too large")
        chunks.append(chunk)
    data = b"".join(chunks)
    try:
        validate_glb(data)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    asset = models.ModelAsset(
        name=name.strip(),
        size_bytes=len(data),
        sha256=hashlib.sha256(data).hexdigest(),
        width=width,
        height=height,
        depth=depth,
    )
    db.add(asset)
    db.flush()
    (MODELS_DIR / f"{asset.id}.glb").write_bytes(data)
    db.commit()
    return asset


@app.get("/api/v1/models/{asset_id}/file")
def download_model(asset_id: str, db: Session = Depends(get_db)):
    asset = get_asset(db, asset_id)
    path = MODELS_DIR / f"{asset.id}.glb"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Model file is missing")
    return FileResponse(path, media_type="model/gltf-binary", headers={"Cache-Control": "private, max-age=3600"})


@app.delete("/api/v1/models/{asset_id}", status_code=204)
def delete_model(asset_id: str, db: Session = Depends(get_db)):
    asset = get_asset(db, asset_id)
    in_use = db.scalar(select(func.count()).select_from(models.Project).where(models.Project.scene_json.contains(asset.id)))
    if in_use:
        raise HTTPException(status_code=409, detail="The model is used by a project scene")
    (MODELS_DIR / f"{asset.id}.glb").unlink(missing_ok=True)
    db.delete(asset)
    db.commit()
    return Response(status_code=204)
