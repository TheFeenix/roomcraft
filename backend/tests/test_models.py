import json
import struct

import app.main as main_module


def build_glb(document=None, extra=b""):
    document = document or {"asset": {"version": "2.0"}, "meshes": [{"primitives": []}]}
    payload = json.dumps(document).encode("utf-8")
    payload += b" " * (-len(payload) % 4)
    total = 12 + 8 + len(payload) + len(extra)
    return struct.pack("<III", 0x46546C67, 2, total) + struct.pack("<II", len(payload), 0x4E4F534A) + payload + extra


def upload(client, data, name="Silla", width=0.5, height=0.9, depth=0.5):
    return client.post(
        "/api/v1/models",
        params={"name": name, "width": width, "height": height, "depth": depth},
        content=data,
        headers={"Content-Type": "application/octet-stream"},
    )


def test_upload_list_and_download_roundtrip(client):
    data = build_glb()
    response = upload(client, data)
    assert response.status_code == 201, response.text
    asset = response.json()
    assert asset["name"] == "Silla"
    assert asset["height"] == 0.9
    assert asset["size_bytes"] == len(data)
    assert any(item["id"] == asset["id"] for item in client.get("/api/v1/models").json())
    downloaded = client.get(f"/api/v1/models/{asset['id']}/file")
    assert downloaded.status_code == 200
    assert downloaded.content == data
    assert downloaded.headers["content-type"].startswith("model/gltf-binary")


def test_rejects_files_that_are_not_glb(client):
    assert upload(client, b"not a model at all, just plain text bytes").status_code == 422
    assert upload(client, b"").status_code == 422


def test_rejects_wrong_declared_length(client):
    data = bytearray(build_glb())
    data[8:12] = struct.pack("<I", len(data) + 4)
    assert upload(client, bytes(data)).status_code == 422


def test_rejects_models_with_external_resources(client):
    document = {"asset": {"version": "2.0"}, "meshes": [{}], "buffers": [{"uri": "http://example.com/a.bin", "byteLength": 1}]}
    assert upload(client, build_glb(document)).status_code == 422


def test_rejects_models_without_meshes(client):
    assert upload(client, build_glb({"asset": {"version": "2.0"}})).status_code == 422


def test_rejects_invalid_dimensions(client):
    assert upload(client, build_glb(), width=0).status_code == 422
    assert upload(client, build_glb(), height=-1).status_code == 422


def test_rejects_oversized_upload(client, monkeypatch):
    monkeypatch.setattr(main_module, "MAX_MODEL_BYTES", 100)
    assert upload(client, build_glb(extra=b"\x00" * 200)).status_code == 413


def test_delete_unused_and_protect_used_models(client, scene):
    used = upload(client, build_glb(), name="Usado").json()
    free = upload(client, build_glb(), name="Libre").json()
    scene["objects"] = [
        {
            "id": "obj-1",
            "name": "Silla",
            "type": "custom",
            "category": "Importado",
            "libraryId": None,
            "assetId": used["id"],
            "position": [1, 0, 1],
            "rotation": [0, 0, 0],
            "scale": [1, 1, 1],
            "dimensions": [0.5, 0.9, 0.5],
            "origin": "manual",
        }
    ]
    created = client.post("/api/v1/projects", json={"name": "Con modelo", "scene": scene})
    assert created.status_code == 201
    stored = client.get(f"/api/v1/projects/{created.json()['id']}").json()
    assert stored["scene"]["objects"][0]["assetId"] == used["id"]
    assert client.delete(f"/api/v1/models/{used['id']}").status_code == 409
    assert client.delete(f"/api/v1/models/{free['id']}").status_code == 204
    assert client.get(f"/api/v1/models/{free['id']}/file").status_code == 404

