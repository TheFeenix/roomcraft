import { Box3, Vector3 } from "three";
import { DRACOLoader } from "three/addons/loaders/DRACOLoader.js";
import { GLTFLoader, type GLTF } from "three/addons/loaders/GLTFLoader.js";

export async function measureGlb(file: File): Promise<[number, number, number]> {
  const buffer = await file.arrayBuffer();
  const loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
  loader.setDRACOLoader(draco);
  try {
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      loader.parse(buffer, "", resolve, reject);
    });
    gltf.scene.updateMatrixWorld(true);
    const size = new Box3().setFromObject(gltf.scene).getSize(new Vector3());
    if (!(size.x > 0 && size.y > 0 && size.z > 0)) {
      throw new Error("El modelo no tiene volumen medible");
    }
    return [size.x, size.y, size.z];
  } finally {
    draco.dispose();
  }
}

