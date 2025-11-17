// RNNoise WASM Loader (stub)
// This module will fetch and instantiate rnnoise.wasm and expose a frame processor API.

export type RNNoiseHandle = {
  processFrame: (mono480: Float32Array) => Float32Array;
  sampleRate: number;
};

export async function loadRNNoise(): Promise<RNNoiseHandle> {
  // Placeholder: returns pass-through; swap with real WASM once bundled
  return {
    processFrame: (mono480: Float32Array) => mono480,
    sampleRate: 48000,
  };
}
