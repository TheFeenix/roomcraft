import { useEffect } from "react";
import { useSceneStore, type TransformMode } from "../scene/store";
import { useUiStore } from "../uiStore";
import type { SaveStatus } from "../useProject";

const MODES: Array<[TransformMode, string]> = [
  ["translate", "Mover"],
  ["rotate", "Rotar"],
  ["scale", "Escalar"],
];

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: "",
  saving: "Guardando...",
  saved: "Guardado",
  error: "Error al guardar",
};

export function Toolbar({ status, onSave }: { status: SaveStatus; onSave: () => void }) {
  const mode = useSceneStore((state) => state.mode);
  const setMode = useSceneStore((state) => state.setMode);
  const snapStep = useSceneStore((state) => state.snapStep);
  const setSnapStep = useSceneStore((state) => state.setSnapStep);
  const constrain = useSceneStore((state) => state.constrainToRoom);
  const setConstrain = useSceneStore((state) => state.setConstrainToRoom);
  const undo = useSceneStore((state) => state.undo);
  const redo = useSceneStore((state) => state.redo);
  const canUndo = useSceneStore((state) => state.past.length > 0);
  const canRedo = useSceneStore((state) => state.future.length > 0);
  const dirty = useSceneStore((state) => state.dirty);
  const cameraView = useUiStore((state) => state.cameraView);
  const setCameraView = useUiStore((state) => state.setCameraView);
  const viewLayout = useUiStore((state) => state.viewLayout);
  const setViewLayout = useUiStore((state) => state.setViewLayout);
  const showCeiling = useUiStore((state) => state.showCeiling);
  const setShowCeiling = useUiStore((state) => state.setShowCeiling);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "SELECT") {
        return;
      }
      const store = useSceneStore.getState();
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          store.redo();
        } else {
          store.undo();
        }
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        store.redo();
      } else if ((event.key === "Delete" || event.key === "Backspace") && store.selectedId) {
        store.removeObject(store.selectedId);
      } else if ((event.key === "Delete" || event.key === "Backspace") && store.selectedOpeningId) {
        store.removeOpening(store.selectedOpeningId);
      } else if (event.key === "g") {
        store.setMode("translate");
      } else if (event.key === "r") {
        store.setMode("rotate");
      } else if (event.key === "s") {
        store.setMode("scale");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="toolbar">
      <div className="group">
        {MODES.map(([value, label]) => (
          <button key={value} className={mode === value ? "active" : ""} onClick={() => setMode(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="group">
        <button disabled={!canUndo} onClick={undo}>
          Deshacer
        </button>
        <button disabled={!canRedo} onClick={redo}>
          Rehacer
        </button>
      </div>
      <div className="group">
        <label>
          Cuadricula
          <select value={snapStep} onChange={(event) => setSnapStep(Number(event.target.value))}>
            <option value={0}>Libre</option>
            <option value={0.01}>1 cm</option>
            <option value={0.05}>5 cm</option>
            <option value={0.1}>10 cm</option>
            <option value={0.25}>25 cm</option>
          </select>
        </label>
        <label className="check">
          <input type="checkbox" checked={constrain} onChange={(event) => setConstrain(event.target.checked)} />
          Limitar a paredes
        </label>
        <label className="check">
          <input type="checkbox" checked={showCeiling} onChange={(event) => setShowCeiling(event.target.checked)} />
          Techo
        </label>
      </div>
      <div className="group">
        <button className={viewLayout === "3d" ? "active" : ""} onClick={() => setViewLayout("3d")}>
          Vista 3D
        </button>
        <button className={viewLayout === "2d" ? "active" : ""} onClick={() => setViewLayout("2d")}>
          Vista 2D
        </button>
        <button className={viewLayout === "split" ? "active" : ""} onClick={() => setViewLayout("split")}>
          Dividida
        </button>
      </div>
      {viewLayout !== "2d" && (
        <div className="group">
          <button className={cameraView === "perspective" ? "active" : ""} onClick={() => setCameraView("perspective")}>
            Perspectiva
          </button>
          <button className={cameraView === "top" ? "active" : ""} onClick={() => setCameraView("top")}>
            Cenital
          </button>
        </div>
      )}
      <div className="group right">
        <span className="status">{dirty && status !== "saving" ? "Cambios pendientes" : STATUS_TEXT[status]}</span>
        <button onClick={onSave}>Guardar</button>
      </div>
    </div>
  );
}

