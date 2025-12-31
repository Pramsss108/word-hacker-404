import React from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { GrammarIssue } from '../../lib/GrammarEngine';

interface GrammarPanelProps {
  issues: GrammarIssue[];
}

export const GrammarPanel: React.FC<GrammarPanelProps> = ({ issues }) => {
  if (issues.length === 0) {
    return (
      <div className="grammar-empty">
        <CheckCircle size={48} className="empty-icon" />
        <h3 className="empty-title">All Systems Nominal</h3>
        <p className="empty-text">No grammar or style issues detected in the current buffer.</p>
      </div>
    );
  }

  const getIssueType = (source: string) => {
    if (source.includes('passive')) return 'warning';
    if (source.includes('simplify')) return 'info';
    if (source.includes('equality')) return 'notice';
    return 'error'; // Default to error for spelling/grammar
  };

  const getIssueColorClass = (type: string) => {
    switch (type) {
      case 'warning': return 'issue-warning'; // Yellow
      case 'info': return 'issue-info';       // Blue
      case 'notice': return 'issue-notice';   // Purple
      default: return 'issue-error';          // Red
    }
  };

  return (
    <div className="grammar-panel custom-scrollbar">
      <div className="grammar-header">
        <h3 className="grammar-title">
          Detected Anomalies ({issues.length})
        </h3>
      </div>

      {issues.map((issue, index) => {
        const type = getIssueType(issue.source);
        const colorClass = getIssueColorClass(type);
        
        return (
          <div key={index} className={`grammar-issue group ${colorClass}`}>
            <div className="issue-content">
              <AlertTriangle size={16} className="issue-icon" />
              <div className="issue-details">
                <p className="issue-message">
                  {issue.message}
                </p>
                <div className="issue-meta">
                  <span className="issue-badge">
                    Ln {issue.line}, Col {issue.column}
                  </span>
                  <span className="issue-source">{issue.source}</span>
                </div>
                {issue.expected && issue.expected.length > 0 && (
                  <div className="issue-suggestions">
                    {issue.expected.map((suggestion, i) => (
                      <button
                        key={i}
                        className="suggestion-btn"
                        onClick={() => {
                          // TODO: Implement fix application
                          console.log('Apply fix:', suggestion);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
