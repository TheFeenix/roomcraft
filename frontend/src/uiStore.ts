import { create } from "zustand";

export type CameraView = "perspective" | "top";
export type ViewLayout = "3d" | "2d" | "split";

interface UiState {
  cameraView: CameraView;
  viewLayout: ViewLayout;
  showCeiling: boolean;
  setCameraView: (view: CameraView) => void;
  setViewLayout: (layout: ViewLayout) => void;
  setShowCeiling: (value: boolean) => void;
}

export const useUiStore = create<UiState>((set) => ({
  cameraView: "perspective",
  viewLayout: "3d",
  showCeiling: false,
  setCameraView: (cameraView) => set({ cameraView }),
  setViewLayout: (viewLayout) => set({ viewLayout }),
  setShowCeiling: (showCeiling) => set({ showCeiling }),
}));

