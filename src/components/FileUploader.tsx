import { useRef, useState, DragEvent } from 'react'
import { Upload, AlertCircle } from 'lucide-react'

const ACCEPTED_EXTENSIONS = ['.dng', '.cr2', '.nef']
const MAX_SIZE_BYTES = 300 * 1024 * 1024 // 300MB

interface FileUploaderProps {
  onConvert: (file: File) => void
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx >= 0 ? name.slice(idx).toLowerCase() : ''
}

const FileUploader = ({ onConvert }: FileUploaderProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lastFileName, setLastFileName] = useState<string | null>(null)

  const validateAndHandleFile = (file: File) => {
    const ext = getExtension(file.name)
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      setError(`Unsupported file type (${ext || 'unknown'}). Use .dng / .cr2 / .nef.`)
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError('File is larger than 300MB.')
      return
    }
    setError(null)
    setLastFileName(file.name)
    onConvert(file)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      validateAndHandleFile(file)
    }
  }

  const handleBrowse = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      validateAndHandleFile(file)
    }
  }

  return (
    <section className={`drop-area glass ${dragActive ? 'drag-active' : ''}`}
      onDragEnter={(e) => { e.preventDefault(); setDragActive(true) }}
      onDragOver={(e) => { e.preventDefault() }}
      onDragLeave={(e) => { e.preventDefault(); setDragActive(false) }}
      onDrop={handleDrop}
    >
      <Upload size={26} />
      <p className="drop-title">Drop RAW files here</p>
      <p className="drop-sub">Accepts .dng / .cr2 / .nef · &lt; 300MB</p>
      <button className="btn ghost" onClick={() => inputRef.current?.click()} type="button">
        Browse Files
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_EXTENSIONS.join(',')}
        style={{ display: 'none' }}
        onChange={handleBrowse}
      />
      {lastFileName && !error && (
        <p className="last-file">Last: {lastFileName}</p>
      )}
      {error && (
        <div className="drop-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </section>
  )
}

export default FileUploader
