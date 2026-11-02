import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ProjectSummary, type VersionSummary } from "./api";
import { createDefaultScene } from "./scene/factory";
import { useSceneStore } from "./scene/store";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useProject() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const saving = useRef<Promise<void> | null>(null);

  const refreshProjects = useCallback(async () => {
    setProjects(await api.listProjects());
  }, []);

  const refreshVersions = useCallback(async (projectId: string) => {
    setVersions(await api.listVersions(projectId));
  }, []);

  const openProject = useCallback(
    async (id: string) => {
      const project = await api.getProject(id);
      useSceneStore.getState().loadScene(project.id, project.scene);
      await refreshVersions(project.id);
      setStatus("saved");
    },
    [refreshVersions],
  );

  const saveNow = useCallback(async () => {
    const { projectId, scene } = useSceneStore.getState();
    if (!projectId) {
      return;
    }
    setStatus("saving");
    const task = api
      .saveScene(projectId, scene)
      .then(() => {
        if (useSceneStore.getState().scene === scene) {
          useSceneStore.getState().markSaved();
        }
        setStatus("saved");
      })
      .catch((cause: unknown) => {
        setStatus("error");
        setError(String(cause));
      });
    saving.current = task;
    await task;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        let list = await api.listProjects();
        if (list.length === 0) {
          await api.createProject("Mi habitacion", createDefaultScene());
          list = await api.listProjects();
        }
        if (cancelled) {
          return;
        }
        setProjects(list);
        await openProject(list[0].id);
        setReady(true);
      } catch (cause) {
        setError(String(cause));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [openProject]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = useSceneStore.subscribe((state, previous) => {
      if (state.scene !== previous.scene && state.dirty && state.projectId) {
        clearTimeout(timer);
        timer = setTimeout(() => {
          void saveNow();
        }, 800);
      }
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [saveNow]);

  const createProject = useCallback(
    async (name: string) => {
      const project = await api.createProject(name, createDefaultScene());
      await refreshProjects();
      await openProject(project.id);
    },
    [openProject, refreshProjects],
  );

  const duplicateProject = useCallback(async () => {
    const { projectId } = useSceneStore.getState();
    if (!projectId) {
      return;
    }
    await saveNow();
    const copy = await api.duplicateProject(projectId);
    await refreshProjects();
    await openProject(copy.id);
  }, [openProject, refreshProjects, saveNow]);

  const deleteProject = useCallback(async () => {
    const { projectId } = useSceneStore.getState();
    if (!projectId) {
      return;
    }
    await api.deleteProject(projectId);
    const list = await api.listProjects();
    if (list.length === 0) {
      await api.createProject("Mi habitacion", createDefaultScene());
    }
    const next = await api.listProjects();
    setProjects(next);
    await openProject(next[0].id);
  }, [openProject]);

  const renameProject = useCallback(
    async (name: string) => {
      const { projectId } = useSceneStore.getState();
      if (!projectId || !name.trim()) {
        return;
      }
      await api.renameProject(projectId, name.trim());
      await refreshProjects();
    },
    [refreshProjects],
  );

  const saveVersion = useCallback(
    async (label: string) => {
      const { projectId } = useSceneStore.getState();
      if (!projectId) {
        return;
      }
      await saveNow();
      await api.createVersion(projectId, label);
      await refreshVersions(projectId);
    },
    [refreshVersions, saveNow],
  );

  const restoreVersion = useCallback(async (versionId: string) => {
    const { projectId } = useSceneStore.getState();
    if (!projectId) {
      return;
    }
    const scene = await api.restoreVersion(projectId, versionId);
    useSceneStore.getState().loadScene(projectId, scene);
    setStatus("saved");
  }, []);

  return {
    projects,
    versions,
    status,
    error,
    ready,
    openProject,
    createProject,
    duplicateProject,
    deleteProject,
    renameProject,
    saveNow,
    saveVersion,
    restoreVersion,
  };
}

