import { useSceneStore } from "../scene/store";
import type { Vec3 } from "../scene/schema";
import { NumberField } from "./NumberField";
import { OpeningInspector } from "./OpeningInspector";
import { WallInspector } from "./WallInspector";

const RAD = Math.PI / 180;

export function Inspector() {
  const selectedId = useSceneStore((state) => state.selectedId);
  const object = useSceneStore((state) => state.scene.objects.find((candidate) => candidate.id === selectedId));
  const patchObject = useSceneStore((state) => state.patchObject);
  const removeObject = useSceneStore((state) => state.removeObject);
  const duplicateObject = useSceneStore((state) => state.duplicateObject);
  const selectedOpeningId = useSceneStore((state) => state.selectedOpeningId);
  const selectedWallId = useSceneStore((state) => state.selectedWallId);

  if (selectedOpeningId) {
    return <OpeningInspector openingId={selectedOpeningId} />;
  }

  if (selectedWallId) {
    return <WallInspector wallId={selectedWallId} />;
  }

  if (!object) {
    return (
      <aside className="panel inspector">
        <h3>Propiedades</h3>
        <p className="muted">Selecciona un objeto en el visor.</p>
      </aside>
    );
  }

  const setAxis = (key: "position" | "scale", axis: number, value: number) => {
    const next: Vec3 = [...object[key]];
    next[axis] = value;
    patchObject(object.id, { [key]: next });
  };

  const setRotationY = (degrees: number) => {
    patchObject(object.id, { rotation: [object.rotation[0], degrees * RAD, object.rotation[2]] });
  };

  const size = object.dimensions.map((dimension, index) => dimension * object.scale[index]);

  return (
    <aside className="panel inspector">
      <h3>{object.name}</h3>
      <p className="muted">
        {object.category} - {size[0].toFixed(2)} x {size[1].toFixed(2)} x {size[2].toFixed(2)} m
      </p>

      <h4>Posicion (m)</h4>
      <div className="grid3">
        <NumberField label="X" value={object.position[0]} step={0.05} disabled={object.locked} onCommit={(v) => setAxis("position", 0, v)} />
        <NumberField label="Y" value={object.position[1]} step={0.05} min={0} disabled={object.locked} onCommit={(v) => setAxis("position", 1, v)} />
        <NumberField label="Z" value={object.position[2]} step={0.05} disabled={object.locked} onCommit={(v) => setAxis("position", 2, v)} />
      </div>

      <h4>Rotacion</h4>
      <div className="grid3">
        <NumberField
          label="Y (grados)"
          value={(object.rotation[1] / RAD) % 360}
          step={5}
          decimals={1}
          disabled={object.locked}
          onCommit={setRotationY}
        />
      </div>

      <h4>Escala</h4>
      <div className="grid3">
        <NumberField label="X" value={object.scale[0]} step={0.05} min={0.1} max={5} disabled={object.locked} onCommit={(v) => setAxis("scale", 0, v)} />
        <NumberField label="Y" value={object.scale[1]} step={0.05} min={0.1} max={5} disabled={object.locked} onCommit={(v) => setAxis("scale", 1, v)} />
        <NumberField label="Z" value={object.scale[2]} step={0.05} min={0.1} max={5} disabled={object.locked} onCommit={(v) => setAxis("scale", 2, v)} />
      </div>

      <div className="row">
        <label className="check">
          <input type="checkbox" checked={object.visible} onChange={(event) => patchObject(object.id, { visible: event.target.checked })} />
          Visible
        </label>
        <label className="check">
          <input type="checkbox" checked={object.locked} onChange={(event) => patchObject(object.id, { locked: event.target.checked })} />
          Bloqueado
        </label>
      </div>

      <div className="row">
        <button onClick={() => duplicateObject(object.id)}>Duplicar</button>
        <button className="danger" disabled={object.locked} onClick={() => removeObject(object.id)}>
          Eliminar
        </button>
      </div>
    </aside>
  );
}

