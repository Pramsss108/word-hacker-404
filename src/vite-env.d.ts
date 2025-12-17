/// <reference types="vite/client" />

declare module '*.css' {
  const content: string
  export default content
}

declare module 'libraw-wasm' {
  const LibRawWasm: any
  export default LibRawWasm
}

declare module 'wasm-vips' {
  const VipsFactory: any
  export default VipsFactory
}

interface Window {
  SpeechRecognition: any;
  webkitSpeechRecognition: any;
}
