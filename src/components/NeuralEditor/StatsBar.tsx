import React from 'react';
import { AnalysisResult } from '../../lib/AnalysisEngine';
import { Activity, BookOpen, Zap, AlertTriangle } from 'lucide-react';

interface StatsBarProps {
  stats: AnalysisResult;
}

export const StatsBar: React.FC<StatsBarProps> = ({ stats }) => {
  const getGradeColor = (score: number) => {
    if (score < 8) return '#4ade80'; // green-400
    if (score < 12) return '#facc15'; // yellow-400
    return '#f87171'; // red-400
  };

  return (
    <div className="neural-stats">
      <div className="stat-group">
        <div className="stat-item" title="Word Count">
          <BookOpen size={14} />
          <span>{stats.wordCount} w</span>
        </div>
        <div className="stat-item" title="Readability Grade">
          <Activity size={14} />
          <span style={{ color: getGradeColor(stats.readabilityScore) }}>
            Grade {stats.readabilityScore.toFixed(1)}
          </span>
        </div>
      </div>
      
      <div className="stat-group">
        {stats.passiveVoiceCount > 0 && (
          <div className="stat-item" style={{ color: '#facc15' }}>
            <Zap size={14} />
            <span>{stats.passiveVoiceCount} Passive</span>
          </div>
        )}
        {stats.complexWordCount > 0 && (
          <div className="stat-item" style={{ color: '#60a5fa' }}>
            <AlertTriangle size={14} />
            <span>{stats.complexWordCount} Complex</span>
          </div>
        )}
      </div>
    </div>
  );
};
