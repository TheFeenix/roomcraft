import os
import tempfile

_tmp = tempfile.mkdtemp(prefix="roomcraft-test-")
os.environ["ROOMCRAFT_DATA_DIR"] = _tmp
os.environ["ROOMCRAFT_DATABASE_URL"] = f"sqlite:///{_tmp.replace(chr(92), '/')}/test.db"

import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def scene():
    corners = [(0, 0), (4, 0), (4, 3), (0, 3)]
    walls = [
        {
            "id": f"wall-{i}",
            "start": list(corners[i]),
            "end": list(corners[(i + 1) % 4]),
            "height": 2.5,
            "thickness": 0.12,
            "materialId": "mat-wall",
        }
        for i in range(4)
    ]
    return {
        "schemaVersion": 1,
        "coordinateSystem": "x-right_y-up_z-depth",
        "room": {
            "id": "room-1",
            "unit": "m",
            "width": 4,
            "depth": 3,
            "height": 2.5,
            "walls": walls,
            "openings": [
                {"id": "door-1", "wallId": "wall-0", "kind": "door", "offset": 0.5, "width": 0.9, "height": 2.1, "sill": 0}
            ],
            "floorMaterialId": "mat-floor",
            "ceilingMaterialId": "mat-ceiling",
        },
        "objects": [],
        "materials": [
            {"id": "mat-wall", "name": "Pared", "color": "#e8e4dc", "roughness": 0.9, "metalness": 0, "opacity": 1, "texture": None},
            {"id": "mat-floor", "name": "Piso", "color": "#b08968", "roughness": 0.7, "metalness": 0, "opacity": 1, "texture": None},
            {"id": "mat-ceiling", "name": "Techo", "color": "#f5f5f5", "roughness": 0.95, "metalness": 0, "opacity": 1, "texture": None},
        ],
    }


@pytest.fixture()
def bed():
    return {
        "id": "bed-1",
        "name": "Cama queen",
        "type": "furniture",
        "category": "Dormitorio",
        "libraryId": "bed-queen",
        "position": [2.5, 0, 1.4],
        "rotation": [0, 1.5707963267948966, 0],
        "scale": [1, 1, 1],
        "dimensions": [1.6, 1.25, 2.0],
        "materialId": None,
        "color": None,
        "visible": True,
        "locked": False,
        "parentId": None,
        "origin": "library",
    }

