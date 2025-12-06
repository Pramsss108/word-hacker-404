# Desktop App Plan

## Overview
This folder contains the Electron wrapper for Word Hacker 404.
It is designed to run the same React app but with access to native hardware.

## Features
1. **Frameless Window**: Custom header/footer to look like "Software".
2. **Hardware Detection**: Uses Node.js `os` module to detect RAM/GPU.
3. **Local LLM Support**: 
   - Future goal: Bundle a Python backend or use WebGPU for 7B models.
   - Current state: Loads the web interface.

## Setup
1. `cd desktop-app`
2. `npm install`
3. `npm start` (Ensure the main Vite app is running on port 3001)

## Building
1. Build the React app: `cd .. && npm run build`
2. Update `src/main.js` to load `loadFile` instead of `loadURL`.
3. `npm run build` (in this folder) to generate .exe
