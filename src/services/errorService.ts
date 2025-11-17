/**
 * Error Code System
 * PHRASE 16: Robust error handling with user-friendly messages
 * 
 * Features:
 * - Coded error types for all failure scenarios
 * - User-friendly messages + technical details
 * - Retry capabilities where applicable
 */

export enum ErrorCode {
  // File Upload & Validation
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  FILE_READ_ERROR = 'FILE_READ_ERROR',

  // Preview Generation
  UTIF_PREVIEW_MISSING = 'UTIF_PREVIEW_MISSING',
  UTIF_DECODE_FAIL = 'UTIF_DECODE_FAIL',
  PREVIEW_GENERATION_FAIL = 'PREVIEW_GENERATION_FAIL',

  // WASM & Workers
  WASM_LOAD_FAIL = 'WASM_LOAD_FAIL',
  WASM_INIT_FAIL = 'WASM_INIT_FAIL',
  WORKER_POOL_INIT_FAIL = 'WORKER_POOL_INIT_FAIL',
  WORKER_TIMEOUT = 'WORKER_TIMEOUT',
  WORKER_CRASH = 'WORKER_CRASH',

  // RAW Decode
  DECODE_FAIL = 'DECODE_FAIL',
  INVALID_RAW_FORMAT = 'INVALID_RAW_FORMAT',
  CORRUPT_RAW_DATA = 'CORRUPT_RAW_DATA',
  UNSUPPORTED_CFA = 'UNSUPPORTED_CFA',

  // Processing
  LINEARIZE_FAIL = 'LINEARIZE_FAIL',
  DEMOSAIC_FAIL = 'DEMOSAIC_FAIL',
  TRANSFORM_FAIL = 'TRANSFORM_FAIL',

  // Encoding & Export
  ENCODE_FAIL = 'ENCODE_FAIL',
  ENCODER_NOT_AVAILABLE = 'ENCODER_NOT_AVAILABLE',
  DOWNLOAD_FAIL = 'DOWNLOAD_FAIL',

  // Memory & Resources
  MEMORY_ERR = 'MEMORY_ERR',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',
  BUFFER_OVERFLOW = 'BUFFER_OVERFLOW',

  // Generic
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export interface ErrorDetails {
  code: ErrorCode
  message: string // User-friendly message
  technicalDetails?: string // Technical details for advanced log
  retryable: boolean
  suggestions?: string[]
  originalError?: Error
}

export class AppError extends Error {
  public readonly details: ErrorDetails

  constructor(details: ErrorDetails) {
    super(details.message)
    this.name = 'AppError'
    this.details = details
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

/**
 * Get error details for a specific error code
 */
export function getErrorDetails(
  code: ErrorCode,
  technicalDetails?: string,
  originalError?: Error
): ErrorDetails {
  const errorMap: Record<ErrorCode, Omit<ErrorDetails, 'code' | 'technicalDetails' | 'originalError'>> = {
    // File errors
    [ErrorCode.FILE_TOO_LARGE]: {
      message: 'File size exceeds limit',
      retryable: false,
      suggestions: ['Try a file smaller than 500MB', 'Consider using a different RAW file']
    },
    [ErrorCode.INVALID_FILE_TYPE]: {
      message: 'Invalid file type',
      retryable: false,
      suggestions: ['Only RAW image formats are supported (CR2, NEF, DNG, ARW, etc.)', 'Check file extension']
    },
    [ErrorCode.FILE_READ_ERROR]: {
      message: 'Failed to read file',
      retryable: true,
      suggestions: ['Check file permissions', 'Try uploading again', 'File may be corrupted']
    },

    // Preview errors
    [ErrorCode.UTIF_PREVIEW_MISSING]: {
      message: 'No embedded preview found in RAW file',
      retryable: true,
      suggestions: ['Will attempt full decode instead', 'This may take longer']
    },
    [ErrorCode.UTIF_DECODE_FAIL]: {
      message: 'Failed to decode RAW file preview',
      retryable: true,
      suggestions: ['Try running full RAW decode', 'File may use unsupported format']
    },
    [ErrorCode.PREVIEW_GENERATION_FAIL]: {
      message: 'Could not generate preview',
      retryable: true,
      suggestions: ['Try full RAW decode instead', 'Check browser console for details']
    },

    // WASM errors
    [ErrorCode.WASM_LOAD_FAIL]: {
      message: 'Failed to load WebAssembly module',
      retryable: true,
      suggestions: ['Check internet connection', 'Try refreshing the page', 'Browser may not support WASM']
    },
    [ErrorCode.WASM_INIT_FAIL]: {
      message: 'WebAssembly initialization failed',
      retryable: true,
      suggestions: ['Refresh the page and try again', 'Clear browser cache']
    },
    [ErrorCode.WORKER_POOL_INIT_FAIL]: {
      message: 'Failed to initialize worker threads',
      retryable: true,
      suggestions: ['Browser may not support Web Workers', 'Try in a different browser']
    },
    [ErrorCode.WORKER_TIMEOUT]: {
      message: 'Processing timed out',
      retryable: true,
      suggestions: ['File may be too large or complex', 'Try a smaller file', 'Retry operation']
    },
    [ErrorCode.WORKER_CRASH]: {
      message: 'Worker thread crashed',
      retryable: true,
      suggestions: ['File may be corrupted', 'Try restarting the application']
    },

    // Decode errors
    [ErrorCode.DECODE_FAIL]: {
      message: 'RAW decode failed',
      retryable: true,
      suggestions: ['File may be corrupted', 'Format may not be fully supported', 'Try another RAW file']
    },
    [ErrorCode.INVALID_RAW_FORMAT]: {
      message: 'RAW format not recognized',
      retryable: false,
      suggestions: ['Check if file is a valid RAW format', 'Supported: CR2, NEF, DNG, ARW, RAF, etc.']
    },
    [ErrorCode.CORRUPT_RAW_DATA]: {
      message: 'RAW data appears corrupted',
      retryable: false,
      suggestions: ['File may be damaged', 'Try opening in another RAW viewer', 'Re-export from camera']
    },
    [ErrorCode.UNSUPPORTED_CFA]: {
      message: 'Color filter array pattern not supported',
      retryable: false,
      suggestions: ['Camera sensor type may be uncommon', 'File metadata may be missing CFA info']
    },

    // Processing errors
    [ErrorCode.LINEARIZE_FAIL]: {
      message: 'Linearization failed',
      retryable: true,
      suggestions: ['Black/white level data may be invalid', 'Try skipping linearization']
    },
    [ErrorCode.DEMOSAIC_FAIL]: {
      message: 'Demosaicing failed',
      retryable: true,
      suggestions: ['CFA pattern may be invalid', 'Try a different demosaic method']
    },
    [ErrorCode.TRANSFORM_FAIL]: {
      message: 'Image transformation failed',
      retryable: true,
      suggestions: ['Crop or rotation parameters may be invalid', 'Try resetting edits']
    },

    // Export errors
    [ErrorCode.ENCODE_FAIL]: {
      message: 'Image encoding failed',
      retryable: true,
      suggestions: ['Try a different export format', 'Image dimensions may be too large']
    },
    [ErrorCode.ENCODER_NOT_AVAILABLE]: {
      message: 'Encoder not available',
      retryable: false,
      suggestions: ['Selected format may not be supported', 'Try PNG or TIFF instead']
    },
    [ErrorCode.DOWNLOAD_FAIL]: {
      message: 'Download failed',
      retryable: true,
      suggestions: ['Check browser download permissions', 'Try again']
    },

    // Memory errors
    [ErrorCode.MEMORY_ERR]: {
      message: 'Memory error occurred',
      retryable: true,
      suggestions: ['Image may be too large', 'Close other tabs', 'Try a smaller file']
    },
    [ErrorCode.OUT_OF_MEMORY]: {
      message: 'Out of memory',
      retryable: false,
      suggestions: ['File is too large for available RAM', 'Try on a device with more memory', 'Use a smaller image']
    },
    [ErrorCode.BUFFER_OVERFLOW]: {
      message: 'Buffer overflow detected',
      retryable: false,
      suggestions: ['Image dimensions exceed limits', 'File may be corrupted']
    },

    // Generic
    [ErrorCode.UNKNOWN_ERROR]: {
      message: 'An unexpected error occurred',
      retryable: true,
      suggestions: ['Try refreshing the page', 'Check browser console for details']
    },
    [ErrorCode.NETWORK_ERROR]: {
      message: 'Network connection error',
      retryable: true,
      suggestions: ['Check internet connection', 'Try again when back online']
    }
  }

  const baseDetails = errorMap[code] || errorMap[ErrorCode.UNKNOWN_ERROR]

  return {
    code,
    message: baseDetails.message,
    retryable: baseDetails.retryable,
    suggestions: baseDetails.suggestions,
    technicalDetails,
    originalError
  }
}

/**
 * Create an AppError from an error code
 */
export function createError(
  code: ErrorCode,
  technicalDetails?: string,
  originalError?: Error
): AppError {
  const details = getErrorDetails(code, technicalDetails, originalError)
  return new AppError(details)
}

/**
 * Convert unknown error to AppError
 */
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error
  }

  if (error instanceof Error) {
    return createError(
      ErrorCode.UNKNOWN_ERROR,
      error.message,
      error
    )
  }

  return createError(
    ErrorCode.UNKNOWN_ERROR,
    String(error)
  )
}
