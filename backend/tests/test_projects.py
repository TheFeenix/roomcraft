def create(client, scene, name="Cuarto"):
    response = client.post("/api/v1/projects", json={"name": name, "scene": scene})
    assert response.status_code == 201, response.text
    return response.json()


def test_create_and_retrieve_project(client, scene):
    created = create(client, scene)
    fetched = client.get(f"/api/v1/projects/{created['id']}").json()
    assert fetched["scene"]["room"]["width"] == 4
    assert fetched["scene"]["room"]["depth"] == 3
    assert fetched["name"] == "Cuarto"
    listing = client.get("/api/v1/projects").json()
    assert any(item["id"] == created["id"] for item in listing)


def test_bed_scene_persists_exactly(client, scene, bed):
    project = create(client, scene)
    scene["objects"] = [bed]
    response = client.put(f"/api/v1/projects/{project['id']}/scene", json=scene)
    assert response.status_code == 200
    stored = client.get(f"/api/v1/projects/{project['id']}/scene").json()["scene"]
    assert stored["objects"][0]["position"] == [2.5, 0, 1.4]
    assert stored["objects"][0]["rotation"] == [0, 1.5707963267948966, 0]
    assert stored["objects"][0]["libraryId"] == "bed-queen"
    assert stored["room"] == scene["room"]


def test_invalid_scene_is_rejected(client, scene, bed):
    project = create(client, scene)
    bed["scale"] = [0, 1, 1]
    scene["objects"] = [bed]
    assert client.put(f"/api/v1/projects/{project['id']}/scene", json=scene).status_code == 422
    scene["objects"] = []
    scene["room"]["width"] = -1
    assert client.put(f"/api/v1/projects/{project['id']}/scene", json=scene).status_code == 422
    unchanged = client.get(f"/api/v1/projects/{project['id']}/scene").json()["scene"]
    assert unchanged["room"]["width"] == 4


def test_unknown_project_returns_404(client):
    assert client.get("/api/v1/projects/missing").status_code == 404


def test_versions_snapshot_and_restore(client, scene, bed):
    project = create(client, scene)
    pid = project["id"]
    version = client.post(f"/api/v1/projects/{pid}/versions", json={"label": "vacio"}).json()
    scene["objects"] = [bed]
    client.put(f"/api/v1/projects/{pid}/scene", json=scene)
    assert len(client.get(f"/api/v1/projects/{pid}/scene").json()["scene"]["objects"]) == 1
    snapshot = client.get(f"/api/v1/projects/{pid}/versions/{version['id']}").json()
    assert snapshot["scene"]["objects"] == []
    restored = client.post(f"/api/v1/projects/{pid}/versions/{version['id']}/restore").json()
    assert restored["scene"]["objects"] == []
    assert len(client.get(f"/api/v1/projects/{pid}/versions").json()) == 1


def test_duplicate_and_delete(client, scene, bed):
    scene["objects"] = [bed]
    project = create(client, scene)
    copy = client.post(f"/api/v1/projects/{project['id']}/duplicate").json()
    assert copy["id"] != project["id"]
    assert copy["scene"]["objects"][0]["id"] == "bed-1"
    assert client.delete(f"/api/v1/projects/{project['id']}").status_code == 204
    assert client.get(f"/api/v1/projects/{project['id']}").status_code == 404
    assert client.get(f"/api/v1/projects/{copy['id']}").status_code == 200

