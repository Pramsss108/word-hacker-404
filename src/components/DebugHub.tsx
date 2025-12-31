import { useEffect, useState } from 'react'

export default function DebugHub() {
  const [store, setStore] = useState<any>({})
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const hub: any = {
      _store: { logs: [] },
      log: (msg: string) => { hub._store.logs.push({ time: Date.now(), msg }) },
      set: (k: string, v: any) => { hub._store[k] = v },
      get: (k: string) => hub._store[k],
      getStore: () => hub._store,
    }

    // expose globally so other components can push debug data
    ;(window as any).__DEBUG_HUB__ = hub

    const t = setInterval(() => {
      setStore(Object.assign({}, hub._store))
    }, 500)

    return () => {
      clearInterval(t)
      try { delete (window as any).__DEBUG_HUB__ } catch(e) {}
    }
  }, [])

  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 10000 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={() => setVisible(v => !v)} style={{ background: '#0aff6a', color: '#000', border: 'none', padding: '6px 8px', borderRadius: 6, cursor: 'pointer' }}>{visible ? 'HIDE DEBUG' : 'SHOW DEBUG'}</button>
        <div style={{ color: '#0aff6a', fontSize: 12 }}>Master Debug</div>
      </div>

      {visible && (
        <div style={{ width: 380, maxHeight: '60vh', overflow: 'auto', marginTop: 8, background: 'rgba(0,0,0,0.9)', border: '1px solid #0aff6a', padding: 12, borderRadius: 8, fontFamily: 'monospace', fontSize: 12, color: '#0aff6a' }}>
          <div style={{ marginBottom: 8 }}><strong>Store Snapshot</strong></div>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{JSON.stringify(store, null, 2)}</pre>
        </div>
      )}
    </div>
  )
}
