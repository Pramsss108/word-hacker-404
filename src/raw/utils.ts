const HEX_LOOKUP = Array.from({ length: 256 }, (_, value) => value.toString(16).padStart(2, '0'))

export const DEFAULT_HEADER_BYTES = 512

export function sliceToUint8(blob: Blob, length: number): Promise<Uint8Array> {
  return blob
    .slice(0, length)
    .arrayBuffer()
    .then((buffer) => new Uint8Array(buffer))
}

export function toDataView(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
}

export function asciiFrom(bytes: Uint8Array, max = bytes.length): string {
  const limit = Math.min(bytes.length, max)
  let result = ''
  for (let i = 0; i < limit; i += 1) {
    const code = bytes[i]
    result += code >= 32 && code <= 126 ? String.fromCharCode(code) : '\u0000'
  }
  return result
}

export function readAscii(view: DataView, offset: number, length: number): string {
  let output = ''
  for (let i = 0; i < length; i += 1) {
    const code = view.getUint8(offset + i)
    output += code >= 32 && code <= 126 ? String.fromCharCode(code) : '\u0000'
  }
  return output
}

export function digestHeader(bytes: Uint8Array, take = 16): string {
  const limit = Math.min(bytes.length, take)
  let output = ''
  for (let i = 0; i < limit; i += 1) {
    output += HEX_LOOKUP[bytes[i]]
  }
  return output
}

export function createTraceToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const now = Date.now().toString(16)
  const random = Math.floor(Math.random() * 0xffffffff)
    .toString(16)
    .padStart(8, '0')
  return `${now}-${random}`
}
