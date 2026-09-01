import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { HistoricalDataPoint, HistoricalDataLoader } from '../services/HistoricalDataLoader';
import { runCounterfactual, CounterfactualComparison, Perturbation } from '../services/CounterfactualEngine';

interface CounterfactualLabProps {
  historicalPoints: HistoricalDataPoint[];
  historyLoader:    HistoricalDataLoader;
}

export const CounterfactualLab: React.FC<CounterfactualLabProps> = ({ historicalPoints, historyLoader }) => {
  const [depthPct, setDepthPct]     = useState(0); // -50 .. +50 (%)
  const [sellVolPct, setSellVolPct] = useState(0); // -50 .. +100 (%)
  const [result, setResult]         = useState<CounterfactualComparison | null>(null);
  const [isRunning, setIsRunning]   = useState(false);

  const run = () => {
    if (historicalPoints.length === 0) return;
    setIsRunning(true);
    // Let the "running" state actually paint before the synchronous replay loop blocks the thread.
    setTimeout(() => {
      const perturbation: Perturbation = {
        depthMultiplier:      1 + depthPct / 100,
        sellVolumeMultiplier: 1 + sellVolPct / 100,
      };
      const res = runCounterfactual(historicalPoints, perturbation, historyLoader);
      setResult(res);
      setIsRunning(false);
    }, 20);
  };

  const chartData = result
    ? result.baseline.map((b, i) => ({
        t:         b.timestamp,
        baseline:  b.stress,
        perturbed: result.perturbed[i]?.stress ?? null,
      }))
    : [];

  return (
    <div className="bg-[#151a23] border border-gray-800 rounded-xl p-5 flex flex-col shadow-lg">
      <div className="flex flex-col mb-4">
        <h2 className="text-[11px] font-black text-cyan-300 uppercase tracking-[0.3em]">Counterfactual Lab</h2>
        <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">
          "What if depth/selling had been different?" — replays the loaded dataset from a fresh engine
        </span>
      </div>

      {historicalPoints.length === 0 ? (
        <div className="text-[10px] text-gray-600 font-mono italic">
          Switch to Historical mode to load a dataset before running counterfactuals.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-gray-500 font-mono uppercase tracking-widest flex justify-between">
                <span>Order Book Depth</span>
                <span className={depthPct === 0 ? 'text-gray-500' : depthPct > 0 ? 'text-emerald-400' : 'text-red-400'}>
                  {depthPct > 0 ? '+' : ''}{depthPct}%
                </span>
              </label>
              <input
                type="range" min={-50} max={50} step={5} value={depthPct}
                onChange={e => setDepthPct(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] text-gray-500 font-mono uppercase tracking-widest flex justify-between">
                <span>Sell Volume</span>
                <span className={sellVolPct === 0 ? 'text-gray-500' : sellVolPct > 0 ? 'text-red-400' : 'text-emerald-400'}>
                  {sellVolPct > 0 ? '+' : ''}{sellVolPct}%
                </span>
              </label>
              <input
                type="range" min={-50} max={100} step={5} value={sellVolPct}
                onChange={e => setSellVolPct(parseInt(e.target.value))}
                className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={run}
            disabled={isRunning}
            className="self-start px-4 py-1.5 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white text-[10px] font-black font-mono uppercase tracking-widest rounded transition-all mb-4"
          >
            {isRunning ? 'Replaying...' : 'Run Counterfactual Replay'}
          </button>

          {result && (
            <>
              <div className="h-[180px] mb-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                    <XAxis dataKey="t" stroke="#4b5563" fontSize={9} hide />
                    <YAxis domain={[0, 100]} stroke="#9ca3af" fontSize={9} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0e14', border: '1px solid #374151', borderRadius: '8px', fontSize: '11px' }}
                      labelFormatter={t => new Date(t as number).toLocaleString()}
                      isAnimationActive={false}
                    />
                    <Legend wrapperStyle={{ fontSize: '9px', fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="baseline" name="Actual" stroke="#6b7280" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="perturbed" name="Counterfactual" stroke="#22d3ee" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[10px] font-mono">
                <div className="bg-[#0a0e14] border border-gray-800 rounded-lg p-3">
                  <div className="text-gray-500 uppercase text-[8px] mb-1">Actual</div>
                  <div className="text-gray-300">Peak stress: <span className="text-white font-black">{result.baselinePeak.toFixed(0)}</span></div>
                  <div className="text-gray-300">Breaches: <span className="text-white font-black">{result.baselineBreaches}</span></div>
                </div>
                <div className="bg-[#0a0e14] border border-cyan-900/40 rounded-lg p-3">
                  <div className="text-cyan-500 uppercase text-[8px] mb-1">Counterfactual</div>
                  <div className="text-gray-300">Peak stress: <span className="text-white font-black">{result.perturbedPeak.toFixed(0)}</span></div>
                  <div className="text-gray-300">Breaches: <span className="text-white font-black">{result.perturbedBreaches}</span></div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};
