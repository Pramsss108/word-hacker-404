Place rnnoise.wasm in this folder for local testing.
- Expected path at runtime: /wasm/rnnoise.wasm (Vite copies public/*)
- Sample rate expected by rnnoise: 48000 Hz, frame size: 480 samples (~10 ms)
- If wasm is not present, pipeline falls back to placeholder denoise.
