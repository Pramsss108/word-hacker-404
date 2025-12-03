import type { CFAPattern } from './types'
import { readAscii } from './utils'

export interface RawSignature {
  label: string
  mimeType: string
  vendor: string
  extensions: string[]
  cfa: CFAPattern
  matcher: (view: DataView, ascii: string) => boolean
  littleEndian?: boolean
}

const TIFF_LITTLE = 'II*\u0000'
const TIFF_BIG = 'MM\u0000*'

const isTiff = (ascii: string): boolean => ascii.startsWith(TIFF_LITTLE) || ascii.startsWith(TIFF_BIG)

export const RAW_SIGNATURES: RawSignature[] = [
  {
    label: 'Canon CR2',
    mimeType: 'image/x-canon-cr2',
    vendor: 'Canon',
    extensions: ['cr2'],
    cfa: 'RGGB',
    matcher: (view) => readAscii(view, 0, 4) === TIFF_LITTLE && readAscii(view, 8, 2) === 'CR',
    littleEndian: true,
  },
  {
    label: 'Canon CR3',
    mimeType: 'image/x-canon-cr3',
    vendor: 'Canon',
    extensions: ['cr3'],
    cfa: 'RGGB',
    matcher: (_, ascii) => ascii.includes('ftypcrx'),
    littleEndian: true,
  },
  {
    label: 'Adobe DNG',
    mimeType: 'image/x-adobe-dng',
    vendor: 'Adobe',
    extensions: ['dng'],
    cfa: 'RGGB',
    matcher: (view) => isTiff(readAscii(view, 0, 4)) && readAscii(view, 8, 4) === 'ADBE',
  },
  {
    label: 'Nikon NEF',
    mimeType: 'image/x-nikon-nef',
    vendor: 'Nikon',
    extensions: ['nef'],
    cfa: 'RGGB',
    matcher: (view) => readAscii(view, 0, 4) === TIFF_LITTLE && readAscii(view, 8, 4) === 'Nikon',
    littleEndian: true,
  },
  {
    label: 'Sony ARW',
    mimeType: 'image/x-sony-arw',
    vendor: 'Sony',
    extensions: ['arw', 'srf', 'sr2'],
    cfa: 'RGGB',
    matcher: (view) => readAscii(view, 0, 4) === TIFF_LITTLE && readAscii(view, 8, 4) === 'SONY',
    littleEndian: true,
  },
  {
    label: 'Fujifilm RAF',
    mimeType: 'image/x-fuji-raf',
    vendor: 'Fujifilm',
    extensions: ['raf'],
    cfa: 'X-Trans',
    matcher: (view) => readAscii(view, 0, 12) === 'FUJIFILMCCD',
    littleEndian: true,
  },
  {
    label: 'Olympus ORF',
    mimeType: 'image/x-olympus-orf',
    vendor: 'Olympus',
    extensions: ['orf'],
    cfa: 'GRBG',
    matcher: (_, ascii) => ascii.startsWith('IIRO') || ascii.startsWith('MMMOR'),
    littleEndian: true,
  },
  {
    label: 'Panasonic RW2',
    mimeType: 'image/x-panasonic-rw2',
    vendor: 'Panasonic',
    extensions: ['rw2'],
    cfa: 'BGGR',
    matcher: (view, ascii) => ascii.startsWith('II*\u0000') && readAscii(view, 8, 4) === 'Panasonic',
    littleEndian: true,
  },
]

export function guessSignature(view: DataView, ascii: string): RawSignature | undefined {
  return RAW_SIGNATURES.find((signature) => {
    try {
      return signature.matcher(view, ascii)
    } catch (error) {
      console.warn('[RawSignature] matcher failed', error)
      return false
    }
  })
}
