import React from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { DivergenceReading } from '../services/DivergenceAnalyzer';

interface DivergencePanelProps {
  current: DivergenceReading | null;
  history: DivergenceReading[]; // oldest first, most recent last
}

export const DivergencePanel: React.FC<DivergencePanelProps> = ({ current, history }) => {
  if (!current) {
    return (
      <div className="bg-[#151a23] border border-gray-800 rounded-xl p-5 flex items-center justify-center min-h-[140px]">
        <span className="text-gray-600 font-mono text-[10px] uppercase tracking-widest">Awaiting signals...</span>
      </div>
    );
  }

  const chartData = history.map(h => ({ t: h.timestamp, spread: h.spread }));
  const color = current.spread > 50 ? '#ef4444' : current.spread > 25 ? '#eab308' : '#10b981';

  return (
    <div className="bg-[#151a23] border border-gray-800 rounded-xl p-5 flex flex-col shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <div className="flex flex-col">
          <h2 className="text-[11px] font-black text-pink-400 uppercase tracking-[0.3em]">Signal Divergence</h2>
          <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">
            When the four signals disagree with each other
          </span>
        </div>
        <span className="text-lg font-black font-mono" style={{ color }}>{current.spread.toFixed(0)}</span>
      </div>

      {chartData.length >= 2 && (
        <div className="h-12 mb-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <YAxis domain={[0, 100]} hide />
              <Line type="monotone" dataKey="spread" stroke={color} strokeWidth={1.5} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <p className="text-[10px] text-gray-400 leading-relaxed">{current.note}</p>

      <div className="flex justify-between mt-3 pt-3 border-t border-gray-800 text-[9px] font-mono">
        <span className="text-gray-500">Highest: <span className="text-gray-300">{current.highest.signal} ({current.highest.value})</span></span>
        <span className="text-gray-500">Lowest: <span className="text-gray-300">{current.lowest.signal} ({current.lowest.value})</span></span>
      </div>
    </div>
  );
};
