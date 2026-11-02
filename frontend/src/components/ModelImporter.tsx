import { useCallback, useEffect, useState } from "react";
import { api, MAX_MODEL_BYTES, type ModelAsset } from "../api";
import { measureGlb } from "../library/glbMeasure";
import { useSceneStore } from "../scene/store";
import { NumberField } from "./NumberField";

interface Pending {
  file: File;
  name: string;
  native: [number, number, number];
  height: number;
}

export function ModelImporter() {
  const addImported = useSceneStore((state) => state.addImported);
  const [assets, setAssets] = useState<ModelAsset[]>([]);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setAssets(await api.listModels());
  }, []);

  useEffect(() => {
    void refresh().catch((cause: unknown) => setMessage(String(cause)));
  }, [refresh]);

  const choose = async (file: File | undefined) => {
    setMessage(null);
    setPending(null);
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setMessage("Solo se aceptan archivos .glb. Convierte .gltf a .glb antes de importarlo.");
      return;
    }
    if (file.size > MAX_MODEL_BYTES) {
      setMessage("El archivo supera el limite de 50 MB.");
      return;
    }
    setBusy(true);
    try {
      const native = await measureGlb(file);
      setPending({ file, name: file.name.replace(/\.glb$/i, ""), native, height: Number(native[1].toFixed(3)) });
    } catch (cause) {
      setMessage(`No se pudo leer el modelo: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setBusy(false);
    }
  };

  const upload = async () => {
    if (!pending) {
      return;
    }
    const factor = pending.height / pending.native[1];
    const size: [number, number, number] = [pending.native[0] * factor, pending.height, pending.native[2] * factor];
    setBusy(true);
    setMessage(null);
    try {
      const asset = await api.uploadModel(pending.file, pending.name.trim() || "Modelo", size);
      setPending(null);
      await refresh();
      addImported({ id: asset.id, name: asset.name, dimensions: [asset.width, asset.height, asset.depth] });
    } catch (cause) {
      setMessage(`No se pudo importar: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (asset: ModelAsset) => {
    if (!window.confirm(`Eliminar el modelo "${asset.name}" de tus archivos?`)) {
      return;
    }
    try {
      await api.deleteModel(asset.id);
      await refresh();
    } catch (cause) {
      const text = String(cause);
      setMessage(text.includes("409") ? "Ese modelo esta en uso en algun proyecto. Eliminalo de la escena primero." : text);
    }
  };

  const factor = pending ? pending.height / pending.native[1] : 1;

  return (
    <div>
      <h3>Mis modelos 3D</h3>
      <input
        type="file"
        accept=".glb,model/gltf-binary"
        disabled={busy}
        onChange={(event) => {
          void choose(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {busy && <p className="muted">Procesando...</p>}
      {message && <p className="muted">{message}</p>}

      {pending && (
        <div>
          <p className="muted">
            Tamano detectado en el archivo: {pending.native[0].toFixed(2)} x {pending.native[1].toFixed(2)} x {pending.native[2].toFixed(2)}. Indica el alto
            real del objeto para escalarlo a metros.
          </p>
          <input value={pending.name} placeholder="Nombre" onChange={(event) => setPending({ ...pending, name: event.target.value })} />
          <NumberField
            label="Alto real (m)"
            value={pending.height}
            step={0.05}
            min={0.01}
            max={20}
            onCommit={(value) => setPending({ ...pending, height: value })}
          />
          <p className="muted">
            Resultado: {(pending.native[0] * factor).toFixed(2)} x {pending.height.toFixed(2)} x {(pending.native[2] * factor).toFixed(2)} m
          </p>
          <div className="row">
            <button disabled={busy} onClick={() => void upload()}>
              Importar y agregar
            </button>
            <button disabled={busy} onClick={() => setPending(null)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <ul className="versions">
        {assets.map((asset) => (
          <li key={asset.id}>
            <span>
              {asset.name} - {asset.width.toFixed(2)} x {asset.height.toFixed(2)} x {asset.depth.toFixed(2)} m
            </span>
            <span className="row">
              <button onClick={() => addImported({ id: asset.id, name: asset.name, dimensions: [asset.width, asset.height, asset.depth] })}>
                Agregar
              </button>
              <button className="danger" onClick={() => void remove(asset)}>
                Borrar
              </button>
            </span>
          </li>
        ))}
      </ul>
      {assets.length === 0 && <p className="muted">Sin modelos importados. Admite archivos .glb de hasta 50 MB.</p>}
    </div>
  );
}
