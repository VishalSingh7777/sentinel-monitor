import { AnalyticsEngine } from './AnalyticsEngine';
import { HistoricalDataLoader, HistoricalDataPoint } from './HistoricalDataLoader';

// ─────────────────────────────────────────────────────────────────────────────
// CounterfactualEngine — "what if depth/selling had been different?"
//
// WHY: the AnalyticsEngine is (aside from its rolling buffers, which are
// reset per run) a deterministic function of the tick sequence it's fed.
// That means we can replay the exact same historical window twice — once
// unperturbed, once with one variable scaled — from two fresh engine
// instances, and directly compare the resulting stress curves. This lets
// you ask "would this have still triggered a breach if the book had been
// 20% deeper?" with an actual answer instead of a guess.
// ─────────────────────────────────────────────────────────────────────────────

export interface CounterfactualResult {
  timestamp: number;
  price:     number;
  stress:    number;
}

export interface CounterfactualComparison {
  baseline:          CounterfactualResult[];
  perturbed:         CounterfactualResult[];
  baselinePeak:      number;
  perturbedPeak:     number;
  baselineBreaches:  number;
  perturbedBreaches: number;
}

export interface Perturbation {
  depthMultiplier:      number; // e.g. 1.2 = order book 20% deeper
  sellVolumeMultiplier: number; // e.g. 1.5 = 50% more sell volume per candle
}

function applyPerturbation(point: HistoricalDataPoint, p: Perturbation): HistoricalDataPoint {
  return {
    ...point,
    bid_depth:   point.bid_depth * p.depthMultiplier,
    ask_depth:   point.ask_depth * p.depthMultiplier,
    sell_volume: point.sell_volume * p.sellVolumeMultiplier,
  };
}

export function runCounterfactual(
  points:       HistoricalDataPoint[],
  perturbation: Perturbation,
  loader:       HistoricalDataLoader
): CounterfactualComparison {
  const baselineEngine  = new AnalyticsEngine();
  const perturbedEngine = new AnalyticsEngine();

  const baseline:  CounterfactualResult[] = [];
  const perturbed: CounterfactualResult[] = [];
  let baselineBreaches  = 0;
  let perturbedBreaches = 0;
  let baselinePeak      = 0;
  let perturbedPeak     = 0;

  for (const point of points) {
    const baseTick = loader.convertToTick(point);
    const baseRes  = baselineEngine.processTick(baseTick);
    baseline.push({ timestamp: point.timestamp, price: point.close, stress: baseRes.stress.score });
    if (baseRes.stress.score > baselinePeak) baselinePeak = baseRes.stress.score;
    if (baseRes.criticalEvent) baselineBreaches++;

    const perturbedPoint = applyPerturbation(point, perturbation);
    const pertTick = loader.convertToTick(perturbedPoint);
    const pertRes  = perturbedEngine.processTick(pertTick);
    perturbed.push({ timestamp: point.timestamp, price: point.close, stress: pertRes.stress.score });
    if (pertRes.stress.score > perturbedPeak) perturbedPeak = pertRes.stress.score;
    if (pertRes.criticalEvent) perturbedBreaches++;
  }

  return { baseline, perturbed, baselinePeak, perturbedPeak, baselineBreaches, perturbedBreaches };
}
