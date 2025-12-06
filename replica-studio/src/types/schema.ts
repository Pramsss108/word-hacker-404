export type EnvironmentPreset = "studio" | "space" | "outdoor";

export type CameraPathPreset = "orbit" | "pan_horizontal" | "zoom_in";

export type OverlayType = "neon_line" | "floating_text" | "gauge";

export interface UniversalOverlayConfig {
  type: OverlayType;
  triggerFrame: number;
  data: Record<string, unknown>;
}

export interface UniversalSceneConfig {
  id: string;
  durationInFrames: number;
  modelQuery: string;
  environment: EnvironmentPreset;
  cameraPath: CameraPathPreset;
  overlays: UniversalOverlayConfig[];
}
