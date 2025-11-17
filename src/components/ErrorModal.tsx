/**
 * Error Modal Component
 * PHRASE 16: User-friendly error display with retry capability
 * 
 * Features:
 * - Friendly error message
 * - One-click retry (if retryable)
 * - Advanced log toggle for technical details
 * - Consistent with app theme
 */

import { useState } from 'react'
import { AlertTriangle, X, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'
import type { ErrorDetails } from '../services/errorService'

interface ErrorModalProps {
  error: ErrorDetails
  onRetry?: () => void
  onDismiss: () => void
}

export default function ErrorModal({ error, onRetry, onDismiss }: ErrorModalProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="error-modal-overlay">
      <div className="error-modal">
        <div className="error-header">
          <div className="error-icon">
            <AlertTriangle size={24} />
          </div>
          <h2 className="error-title">Something Went Wrong</h2>
          <button className="btn ghost tiny" onClick={onDismiss} title="Dismiss">
            <X size={18} />
          </button>
        </div>

        <div className="error-body">
          <p className="error-message">{error.message}</p>

          {error.suggestions && error.suggestions.length > 0 && (
            <div className="error-suggestions">
              <p className="suggestions-label">Suggestions:</p>
              <ul className="suggestions-list">
                {error.suggestions.map((suggestion, idx) => (
                  <li key={idx}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {(error.technicalDetails || error.originalError) && (
            <div className="error-advanced">
              <button
                className="advanced-toggle"
                onClick={() => setShowAdvanced(!showAdvanced)}
              >
                {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showAdvanced ? 'Hide' : 'Show'} Technical Details
              </button>

              {showAdvanced && (
                <div className="advanced-content">
                  <div className="detail-row">
                    <span className="detail-label">Error Code:</span>
                    <span className="detail-value mono">{error.code}</span>
                  </div>

                  {error.technicalDetails && (
                    <div className="detail-row">
                      <span className="detail-label">Details:</span>
                      <pre className="detail-value mono">{error.technicalDetails}</pre>
                    </div>
                  )}

                  {error.originalError && (
                    <>
                      <div className="detail-row">
                        <span className="detail-label">Error Type:</span>
                        <span className="detail-value mono">{error.originalError.name}</span>
                      </div>
                      {error.originalError.stack && (
                        <div className="detail-row">
                          <span className="detail-label">Stack Trace:</span>
                          <pre className="detail-value mono stack-trace">{error.originalError.stack}</pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="error-actions">
          <button className="btn ghost" onClick={onDismiss}>
            Dismiss
          </button>
          {error.retryable && onRetry && (
            <button className="btn primary" onClick={onRetry}>
              <RefreshCw size={16} /> Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
