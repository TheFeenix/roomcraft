import { SceneSchema, type Scene } from "./scene/schema";

export interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface VersionSummary {
  id: string;
  project_id: string;
  label: string;
  created_at: string;
}

export interface ModelAsset {
  id: string;
  name: string;
  size_bytes: number;
  width: number;
  height: number;
  depth: number;
  created_at: string;
}

export const MAX_MODEL_BYTES = 50 * 1024 * 1024;

export function modelUrl(id: string): string {
  return `/api/v1/models/${id}/file`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!response.ok) {
    throw new Error(`${response.status} ${await response.text()}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export const api = {
  listProjects: () => request<ProjectSummary[]>("/projects"),
  createProject: async (name: string, scene: Scene) => {
    const data = await request<ProjectSummary & { scene: unknown }>("/projects", {
      method: "POST",
      body: JSON.stringify({ name, description: "", scene }),
    });
    return { ...data, scene: SceneSchema.parse(data.scene) };
  },
  getProject: async (id: string) => {
    const data = await request<ProjectSummary & { scene: unknown }>(`/projects/${id}`);
    return { ...data, scene: SceneSchema.parse(data.scene) };
  },
  renameProject: (id: string, name: string) =>
    request<ProjectSummary>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),
  duplicateProject: async (id: string) => {
    const data = await request<ProjectSummary & { scene: unknown }>(`/projects/${id}/duplicate`, { method: "POST" });
    return { ...data, scene: SceneSchema.parse(data.scene) };
  },
  saveScene: (id: string, scene: Scene) =>
    request<{ updated_at: string }>(`/projects/${id}/scene`, { method: "PUT", body: JSON.stringify(scene) }),
  listVersions: (id: string) => request<VersionSummary[]>(`/projects/${id}/versions`),
  createVersion: (id: string, label: string) =>
    request<VersionSummary>(`/projects/${id}/versions`, { method: "POST", body: JSON.stringify({ label }) }),
  restoreVersion: async (id: string, versionId: string) => {
    const data = await request<{ scene: unknown }>(`/projects/${id}/versions/${versionId}/restore`, { method: "POST" });
    return SceneSchema.parse(data.scene);
  },
  listModels: () => request<ModelAsset[]>("/models"),
  uploadModel: (file: File, name: string, size: [number, number, number]) => {
    const query = new URLSearchParams({
      name,
      width: String(size[0]),
      height: String(size[1]),
      depth: String(size[2]),
    });
    return request<ModelAsset>(`/models?${query.toString()}`, {
      method: "POST",
      body: file,
      headers: { "Content-Type": "application/octet-stream" },
    });
  },
  deleteModel: (id: string) => request<void>(`/models/${id}`, { method: "DELETE" }),
};

