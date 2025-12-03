import { memo, useMemo } from 'react'
import { ShieldAlert, ShieldCheck } from 'lucide-react'
import { getSharedArrayBufferWatchdogReport } from '../raw'

function RawWatchdogIndicatorCore() {
  const report = useMemo(() => getSharedArrayBufferWatchdogReport(), [])
  const ok = report.available
  const icon = ok ? <ShieldCheck size={12} aria-hidden /> : <ShieldAlert size={12} aria-hidden />
  const label = ok ? 'SAB LOCK' : 'SAB FALLBACK'
  const detail = ok ? 'cross-origin isolated' : report.reason ?? 'missing COOP/COEP'

  return (
    <div
      className={`watchdog-chip ${ok ? 'watchdog-ok' : 'watchdog-warn'}`}
      role="status"
      aria-live="polite"
      title={`SharedArrayBuffer status: ${detail}`}
    >
      {icon}
      <span className="watchdog-text">{label}</span>
    </div>
  )
}

const RawWatchdogIndicator = memo(RawWatchdogIndicatorCore)

export default RawWatchdogIndicator
