declare module 'libraw-wasm' {
  const LibRawWasm: any
  export default LibRawWasm
}

declare module 'wasm-vips' {
  const VipsFactory: any
  export default VipsFactory
}

declare module 'utif' {
  export function decode(buffer: Uint8Array): Array<Record<string, unknown>>
  export function decodeImage(buffer: Uint8Array, ifd: Record<string, unknown>): void
  export function toRGBA8(ifd: Record<string, unknown>): Uint8Array
}
