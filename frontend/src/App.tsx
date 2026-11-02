import { FloorPlan2D } from "./components/FloorPlan2D";
import { Inspector } from "./components/Inspector";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import { Viewer } from "./components/Viewer";
import { useUiStore } from "./uiStore";
import { useProject } from "./useProject";

export default function App() {
  const project = useProject();
  const viewLayout = useUiStore((state) => state.viewLayout);

  if (project.error && !project.ready) {
    return (
      <div className="fatal">
        <h2>No se pudo conectar con el backend</h2>
        <p>{project.error}</p>
        <p>Inicia el backend en 127.0.0.1:8000 y recarga la pagina.</p>
      </div>
    );
  }

  if (!project.ready) {
    return <div className="fatal">Cargando proyecto...</div>;
  }

  return (
    <div className="app">
      <Toolbar status={project.status} onSave={() => void project.saveNow()} />
      <div className="main">
        <Sidebar project={project} />
        <div className="viewport">
          {viewLayout === "3d" && <Viewer />}
          {viewLayout === "2d" && <FloorPlan2D />}
          {viewLayout === "split" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", width: "100%", height: "100%" }}>
              <FloorPlan2D />
              <div style={{ position: "relative", width: "100%", height: "100%", borderLeft: "1px solid #2f3540" }}>
                <Viewer />
              </div>
            </div>
          )}
        </div>
        <Inspector />
      </div>
    </div>
  );
}

