import { WALL_LABELS } from "../scene/openings";
import { wallLength } from "../scene/room";
import { useSceneStore } from "../scene/store";
import { NumberField } from "./NumberField";

export function WallInspector({ wallId }: { wallId: string }) {
  const wall = useSceneStore((state) => state.scene.room.walls.find((candidate) => candidate.id === wallId));
  const openings = useSceneStore((state) => state.scene.room.openings.filter((candidate) => candidate.wallId === wallId));
  const setWallLength = useSceneStore((state) => state.setWallLength);
  const selectOpening = useSceneStore((state) => state.selectOpening);

  if (!wall) {
    return null;
  }

  const length = wallLength(wall);

  return (
    <aside className="panel inspector">
      <h3>Pared arquitectonica</h3>
      <p className="muted">{WALL_LABELS[wall.id] ?? wall.id}</p>

      <h4>Dimensiones</h4>
      <div className="grid3">
        <NumberField
          label="Longitud (m)"
          value={length}
          step={0.1}
          min={1}
          max={50}
          onCommit={(value) => setWallLength(wall.id, value)}
        />
        <NumberField label="Grosor (m)" value={wall.thickness} step={0.01} disabled onCommit={() => {}} />
        <NumberField label="Altura (m)" value={wall.height} step={0.1} disabled onCommit={() => {}} />
      </div>

      <h4>Aberturas en esta pared ({openings.length})</h4>
      <ul className="versions">
        {openings.map((opening) => (
          <li key={opening.id}>
            <span>
              {opening.kind === "window" ? "Ventana" : "Puerta"} ({opening.width.toFixed(2)} m a {opening.offset.toFixed(2)} m)
            </span>
            <button onClick={() => selectOpening(opening.id)}>Editar</button>
          </li>
        ))}
      </ul>
      {openings.length === 0 && <p className="muted">Sin aberturas instaladas en esta pared.</p>}
    </aside>
  );
}

