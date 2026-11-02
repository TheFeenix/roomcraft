import { useState } from "react";
import { LIBRARY } from "../library/catalog";
import { WALL_LABELS } from "../scene/openings";
import { useSceneStore } from "../scene/store";
import type { useProject } from "../useProject";
import { NumberField } from "./NumberField";
import { ModelImporter } from "./ModelImporter";

type ProjectApi = ReturnType<typeof useProject>;

export function Sidebar({ project }: { project: ProjectApi }) {
  const room = useSceneStore((state) => state.scene.room);
  const projectId = useSceneStore((state) => state.projectId);
  const setRoomSize = useSceneStore((state) => state.setRoomSize);
  const addFromLibrary = useSceneStore((state) => state.addFromLibrary);
  const addOpening = useSceneStore((state) => state.addOpening);
  const [versionLabel, setVersionLabel] = useState("");
  const [openingWall, setOpeningWall] = useState("wall-1");
  const current = project.projects.find((candidate) => candidate.id === projectId);

  const categories = Array.from(new Set(LIBRARY.map((item) => item.category)));

  return (
    <aside className="panel sidebar">
      <h3>Proyecto</h3>
      <select value={projectId ?? ""} onChange={(event) => void project.openProject(event.target.value)}>
        {project.projects.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {candidate.name}
          </option>
        ))}
      </select>
      <div className="row">
        <button
          onClick={() => {
            const name = window.prompt("Nombre del proyecto", "Nueva habitacion");
            if (name) {
              void project.createProject(name);
            }
          }}
        >
          Nuevo
        </button>
        <button
          onClick={() => {
            const name = window.prompt("Nuevo nombre", current?.name ?? "");
            if (name) {
              void project.renameProject(name);
            }
          }}
        >
          Renombrar
        </button>
        <button onClick={() => void project.duplicateProject()}>Duplicar</button>
        <button
          className="danger"
          onClick={() => {
            if (window.confirm("Eliminar este proyecto?")) {
              void project.deleteProject();
            }
          }}
        >
          Eliminar
        </button>
      </div>

      <h3>Habitacion (m)</h3>
      <div className="grid3">
        <NumberField label="Ancho X" value={room.width} step={0.1} min={1} max={30} onCommit={(v) => setRoomSize(v, room.depth, room.height)} />
        <NumberField label="Largo Z" value={room.depth} step={0.1} min={1} max={30} onCommit={(v) => setRoomSize(room.width, v, room.height)} />
        <NumberField label="Alto Y" value={room.height} step={0.1} min={2} max={6} onCommit={(v) => setRoomSize(room.width, room.depth, v)} />
      </div>
      <p className="muted">
        Area: {(room.width * room.depth).toFixed(2)} m2. Medidas interiores definidas por el usuario, no verificadas por escaneo.
      </p>

      <h3>Ventanas y puertas</h3>
      <select value={openingWall} onChange={(event) => setOpeningWall(event.target.value)}>
        {room.walls.map((wall) => (
          <option key={wall.id} value={wall.id}>
            {WALL_LABELS[wall.id] ?? wall.id}
          </option>
        ))}
      </select>
      <div className="row">
        {(["window", "door"] as const).map((kind) => (
          <button
            key={kind}
            onClick={() => {
              if (addOpening(kind, openingWall) === null) {
                window.alert("No hay espacio libre en esa pared para agregarla.");
              }
            }}
          >
            {kind === "window" ? "Agregar ventana" : "Agregar puerta"}
          </button>
        ))}
      </div>
      <p className="muted">Haz clic sobre una ventana o puerta en el visor para editarla o moverla.</p>

      <h3>Biblioteca</h3>
      {categories.map((category) => (
        <div key={category}>
          <h4>{category}</h4>
          <div className="library">
            {LIBRARY.filter((item) => item.category === category).map((item) => (
              <button key={item.id} onClick={() => addFromLibrary(item.id)}>
                {item.name}
              </button>
            ))}
          </div>
        </div>
      ))}

      <ModelImporter />

      <h3>Versiones</h3>
      <div className="row">
        <input value={versionLabel} placeholder="Etiqueta" onChange={(event) => setVersionLabel(event.target.value)} />
        <button
          onClick={() => {
            void project.saveVersion(versionLabel || "Version").then(() => setVersionLabel(""));
          }}
        >
          Guardar
        </button>
      </div>
      <ul className="versions">
        {project.versions.map((version) => (
          <li key={version.id}>
            <span>
              {version.label || "Version"} - {new Date(version.created_at).toLocaleString()}
            </span>
            <button onClick={() => void project.restoreVersion(version.id)}>Restaurar</button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

