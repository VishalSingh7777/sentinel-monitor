import { SignalOutput, SignalType } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// DivergenceAnalyzer — measures how much the four signals disagree.
//
// WHY: the engine's weighted-average + smoothing pipeline is specifically
// designed to collapse four numbers into one clean score. That's useful for
// a headline number, but it actively hides the most interesting case: when
// signals point in different directions (e.g. liquidity says calm, flow says
// panic). A high spread with a moderate overall score often means something
// real is starting that the aggregate hasn't caught up to yet.
// ─────────────────────────────────────────────────────────────────────────────

export interface DivergenceReading {
  timestamp: number;
  spread:    number; // max signal value − min signal value (0–100)
  stdDev:    number; // standard deviation across the four raw values
  highest:   { signal: SignalType; value: number };
  lowest:    { signal: SignalType; value: number };
  note:      string;
}

export function computeDivergence(
  signals: Record<SignalType, SignalOutput>,
  timestamp: number
): DivergenceReading {
  const entries = Object.values(signals);
  const values  = entries.map(s => s.value);

  const max  = Math.max(...values);
  const min  = Math.min(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  const stdDev   = Math.sqrt(variance);

  const highest = entries.reduce((a, b) => (a.value >= b.value ? a : b));
  const lowest  = entries.reduce((a, b) => (a.value <= b.value ? a : b));
  const spread  = max - min;

  let note: string;
  if (spread > 50) {
    note = `${highest.name} reads ${highest.value}/100 while ${lowest.name} reads ${lowest.value}/100 — the signals disagree sharply.`;
  } else if (spread < 15) {
    note = 'All four signals broadly agree — low internal disagreement right now.';
  } else {
    note = 'Moderate disagreement between signals.';
  }

  return {
    timestamp,
    spread,
    stdDev,
    highest: { signal: highest.name, value: highest.value },
    lowest:  { signal: lowest.name,  value: lowest.value },
    note,
  };
}
