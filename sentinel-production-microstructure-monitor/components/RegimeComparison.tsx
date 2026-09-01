import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AnalyticsEngine } from '../services/AnalyticsEngine';
import { HistoricalDataLoader, REGIME_PRESETS } from '../services/HistoricalDataLoader';

// ─────────────────────────────────────────────────────────────────────────────
// RegimeComparison — "what does real panic actually look like next to a
// normal week?" Fetches several named historical windows (all free, keyless
// Binance klines — same source as the COVID replay), runs each through its
// own fresh AnalyticsEngine, and overlays the resulting stress curves
// normalized by % elapsed through the window (since the windows differ in
// length). Understanding what distinguishes a real crisis from an ordinary
// day, in the model's own signal shapes, is the point — not the model's
// verdict about any one of them in isolation.
// ─────────────────────────────────────────────────────────────────────────────

interface RegimeResult {
  label: string;
  points: { pct: number; stress: number }[];
  peak: number;
  breaches: number;
  error?: string;
}

const COLORS = ['#ef4444', '#f97316', '#10b981'];

export const RegimeComparison: React.FC = () => {
  const [results, setResults] = useState<RegimeResult[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const run = async () => {
    setIsLoading(true);
    setResults(null);
    const loader = new HistoricalDataLoader();
    const out: RegimeResult[] = [];

    for (const preset of REGIME_PRESETS) {
      try {
        const points = await loader.loadWindow(preset.startTime, preset.endTime);
        const engine = new AnalyticsEngine();
        let peak = 0;
        let breaches = 0;
        const series = points.map((point, i) => {
          const tick = loader.convertToTick(point);
          const res  = engine.processTick(tick);
          if (res.stress.score > peak) peak = res.stress.score;
          if (res.criticalEvent) breaches++;
          return { pct: points.length > 1 ? (i / (points.length - 1)) * 100 : 0, stress: res.stress.score };
        });
        out.push({ label: preset.label, points: series, peak, breaches });
      } catch (e) {
        out.push({ label: preset.label, points: [], peak: 0, breaches: 0, error: 'Failed to fetch this window.' });
      }
    }

    setResults(out);
    setIsLoading(false);
  };

  // Merge all three series onto a common 0-100% x-axis for the overlay chart.
  const chartData: Record<string, number>[] = [];
  if (results) {
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const row: Record<string, number> = { pct: i };
      results.forEach(r => {
        if (r.points.length === 0) return;
        // nearest point to this pct
        let nearest = r.points[0];
        for (const p of r.points) {
          if (Math.abs(p.pct - i) < Math.abs(nearest.pct - i)) nearest = p;
        }
        row[r.label] = nearest.stress;
      });
      chartData.push(row);
    }
  }

  return (
    <div className="bg-[#151a23] border border-gray-800 rounded-xl p-5 flex flex-col shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <h2 className="text-[11px] font-black text-orange-400 uppercase tracking-[0.3em]">Regime Comparison</h2>
          <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">
            Real crisis vs. an ordinary week — same model, three different periods
          </span>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={isLoading}
          className="px-4 py-1.5 bg-orange-700 hover:bg-orange-600 disabled:opacity-50 text-white text-[10px] font-black font-mono uppercase tracking-widest rounded transition-all"
        >
          {isLoading ? 'Fetching + Replaying...' : 'Run Comparison'}
        </button>
      </div>

      {!results && !isLoading && (
        <div className="text-[10px] text-gray-600 font-mono italic">
          Fetches {REGIME_PRESETS.map(p => p.label).join(', ')} from Binance and replays each through a fresh engine. Takes a few seconds.
        </div>
      )}

      {results && (
        <>
          <div className="h-[220px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="pct" tickFormatter={v => `${v}%`} stroke="#4b5563" fontSize={9} />
                <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={9} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0a0e14', border: '1px solid #374151', borderRadius: '8px', fontSize: '11px' }}
                  isAnimationActive={false}
                />
                <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace' }} />
                {results.map((r, i) => (
                  <Line
                    key={r.label}
                    type="monotone"
                    dataKey={r.label}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-3 gap-3 text-[10px] font-mono">
            {results.map((r, i) => (
              <div key={r.label} className="bg-[#0a0e14] border border-gray-800 rounded-lg p-3">
                <div style={{ color: COLORS[i % COLORS.length] }} className="uppercase text-[8px] mb-1 font-black">{r.label}</div>
                {r.error ? (
                  <div className="text-red-500">{r.error}</div>
                ) : (
                  <>
                    <div className="text-gray-300">Peak stress: <span className="text-white font-black">{r.peak.toFixed(0)}</span></div>
                    <div className="text-gray-300">Breaches: <span className="text-white font-black">{r.breaches}</span></div>
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
