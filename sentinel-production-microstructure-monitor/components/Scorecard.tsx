import React from 'react';
import { ScorecardStats } from '../services/OutcomeTracker';

interface ScorecardProps {
  stats: ScorecardStats;
  onReset: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scorecard — shows whether the model's alarms have actually been right.
//
// Deliberately NOT styled to always look good. If hit rate is bad, it shows
// red. If a pattern has a poor track record, that shows too. The point of
// this panel is falsifiability, not reassurance — a scorecard that only ever
// looks good isn't a scorecard, it's marketing.
// ─────────────────────────────────────────────────────────────────────────────
export const Scorecard: React.FC<ScorecardProps> = ({ stats, onReset }) => {
  const hitRateColor =
    stats.hitRate === null ? 'text-gray-500' :
    stats.hitRate >= 60     ? 'text-emerald-400' :
    stats.hitRate >= 40     ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="bg-[#151a23] border border-gray-800 rounded-xl p-5 flex flex-col shadow-lg relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h2 className="text-[11px] font-black text-purple-400 uppercase tracking-[0.3em]">Self-Scorecard</h2>
          <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">
            Grading the model against what actually happened next
          </span>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="text-[9px] text-gray-400 font-mono px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded border border-gray-700 uppercase tracking-widest transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <Stat label="Predictions" value={stats.totalPredictions} />
        <Stat label="Resolved" value={stats.resolved} />
        <Stat label="Pending" value={stats.pending} accent="text-amber-400" />
        <Stat
          label="Hit Rate"
          value={stats.hitRate === null ? '—' : `${stats.hitRate.toFixed(0)}%`}
          accent={hitRateColor}
        />
      </div>

      {Object.keys(stats.byPattern).length > 0 && (
        <div className="mb-4">
          <h3 className="text-[8px] text-purple-400/60 uppercase tracking-widest font-mono mb-2">
            By Pattern — is the label actually predictive?
          </h3>
          <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
            {Object.entries(stats.byPattern)
              .sort((a, b) => b[1].total - a[1].total)
              .map(([pattern, s]) => (
                <div key={pattern} className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-gray-400 truncate max-w-[60%]">{pattern}</span>
                  <span className="text-gray-500 shrink-0">
                    {s.hits}/{s.total} ·{' '}
                    <span className={s.hitRate >= 50 ? 'text-emerald-400' : 'text-red-400'}>
                      {s.hitRate.toFixed(0)}%
                    </span>
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {stats.resolved === 0 && (
        <div className="text-[9px] text-gray-600 font-mono italic mb-4">
          No predictions resolved yet — each breach event needs ~5 minutes to score. This is expected on a fresh session.
        </div>
      )}

      <div className="text-[8px] text-gray-600 font-mono leading-relaxed border-t border-gray-800 pt-3">
        HIT = price moved ≥0.5% adverse within 5 min of the alert. MISS = it didn't. This is a live running
        track record, not a backtest — it only ever reflects what this instance actually observed, and resets
        if you clear browser storage. Small sample sizes are not statistically meaningful; treat early numbers
        as noise, not verdicts.
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string | number; accent?: string }> = ({ label, value, accent }) => (
  <div className="bg-[#0a0e14] border border-gray-800 rounded-lg p-3 flex flex-col">
    <span className="text-[8px] text-gray-600 uppercase tracking-widest font-mono">{label}</span>
    <span className={`text-lg font-black font-mono ${accent || 'text-white'}`}>{value}</span>
  </div>
);
