import { useState } from 'react'
import CyberCanvas from './CyberCanvas'
import VectorCommandCenter from './VectorCommandCenter'

export default function AIEditor() {
  const [selectedImage, setSelectedImage] = useState<string | undefined>(undefined)
  const [showVector, setShowVector] = useState(true)

  return (
    <div style={{ display: 'flex', gap: 20, padding: 20, boxSizing: 'border-box' }}>
      <div style={{ flex: 1, minWidth: 360 }}>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: '#0aff6a', fontFamily: 'JetBrains Mono' }}>AI Image Generator</h3>
          <p style={{ margin: '6px 0 0', color: '#9aa3b2' }}>Generate images and send a selection to the vectorizer.</p>
        </div>
        <CyberCanvas onBack={() => {}} onVectorize={(url) => { setSelectedImage(url); setShowVector(true); }} />
      </div>

      <div style={{ width: 560, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ color: '#0aff6a', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>Vectorizer</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setShowVector(s => !s)} style={{ background: '#222', color: '#fff', border: '1px solid #333', padding: '6px 10px', borderRadius: 6 }}>{showVector ? 'Hide' : 'Show'}</button>
          </div>
        </div>

        {showVector && (
          <div style={{ flex: 1, borderRadius: 12, border: '1px solid #222', padding: 12, background: 'rgba(0,0,0,0.3)' }}>
            <VectorCommandCenter initialImageUrl={selectedImage} />
          </div>
        )}
      </div>
    </div>
  )
}
