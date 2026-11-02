import { useState } from "react";
import { WALL_LABELS } from "../scene/openings";
import { wallLength } from "../scene/room";
import type { Opening } from "../scene/schema";
import { useSceneStore } from "../scene/store";
import { NumberField } from "./NumberField";

export function OpeningInspector({ openingId }: { openingId: string }) {
  const opening = useSceneStore((state) => state.scene.room.openings.find((candidate) => candidate.id === openingId));
  const walls = useSceneStore((state) => state.scene.room.walls);
  const patchOpening = useSceneStore((state) => state.patchOpening);
  const removeOpening = useSceneStore((state) => state.removeOpening);
  const [nonce, setNonce] = useState(0);

  if (!opening) {
    return null;
  }

  const wall = walls.find((candidate) => candidate.id === opening.wallId);
  const length = wall ? wallLength(wall) : 0;

  const apply = (patch: Partial<Pick<Opening, "wallId" | "offset" | "width" | "height" | "sill">>) => {
    if (!patchOpening(opening.id, patch)) {
      setNonce((value) => value + 1);
    }
  };

  const label = opening.kind === "window" ? "Ventana" : "Puerta";

  return (
    <aside className="panel inspector">
      <h3>{label}</h3>
      <p className="muted">
        {opening.width.toFixed(2)} x {opening.height.toFixed(2)} m en {WALL_LABELS[opening.wallId] ?? opening.wallId}
      </p>

      <h4>Pared</h4>
      <select key={`wall-${nonce}`} value={opening.wallId} onChange={(event) => apply({ wallId: event.target.value })}>
        {walls.map((candidate) => (
          <option key={candidate.id} value={candidate.id}>
            {WALL_LABELS[candidate.id] ?? candidate.id}
          </option>
        ))}
      </select>

      <h4>Medidas (m)</h4>
      <div className="grid3">
        <NumberField key={`offset-${nonce}`} label="Desde inicio" value={opening.offset} step={0.05} min={0} max={length} onCommit={(v) => apply({ offset: v })} />
        <NumberField key={`width-${nonce}`} label="Ancho" value={opening.width} step={0.05} min={0.3} max={length} onCommit={(v) => apply({ width: v })} />
        <NumberField key={`height-${nonce}`} label="Alto" value={opening.height} step={0.05} min={0.3} max={wall?.height ?? 3} onCommit={(v) => apply({ height: v })} />
        <NumberField key={`sill-${nonce}`} label="Altura base" value={opening.sill} step={0.05} min={0} max={wall?.height ?? 3} onCommit={(v) => apply({ sill: v })} />
      </div>
      <p className="muted">Arrastra la flecha roja del visor para deslizarla por la pared.</p>

      <div className="row">
        <button className="danger" onClick={() => removeOpening(opening.id)}>
          Eliminar
        </button>
      </div>
    </aside>
  );
}

