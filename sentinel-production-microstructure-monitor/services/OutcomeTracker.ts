import { CriticalEvent } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// OutcomeTracker — the model's self-scorecard.
//
// WHY THIS EXISTS:
// The AnalyticsEngine computes a stress score and fires CriticalEvents, but
// nothing in the original system ever checks whether those events were
// actually followed by the thing they implied (adverse price movement).
// A model that never grades itself against reality is just a plausible
// story generator. This closes that loop.
//
// HOW IT WORKS:
// 1. Every CriticalEvent is logged as a "prediction": at time T, price P,
//    the model implicitly claims "something bad is about to happen."
// 2. We track the price for a fixed horizon (default 5 min) after T.
// 3. If price ever moves >= HIT_THRESHOLD_PCT against the position within
//    that horizon, the prediction is scored HIT. Otherwise MISS.
// 4. Stats are aggregated overall AND per pattern_label, so you can see
//    which named patterns (e.g. "LIQUIDITY VACUUM SELLOFF") are actually
//    predictive vs which just sound dramatic.
//
// STORAGE: browser localStorage. Free, no backend, no server, persists
// across sessions on the same device/browser. Capped at last 500 events
// so it can't grow unbounded.
// ─────────────────────────────────────────────────────────────────────────────

export interface TrackedPrediction {
  id:                     string;
  timestamp:              number;
  price:                  number;
  stress_score:           number;
  level:                  string;
  pattern:                string | null;
  horizon_ms:             number;
  resolved:               boolean;
  resolved_at?:           number;
  price_at_resolution?:   number;
  // Largest adverse move (price drop, in %) observed at any point during the horizon.
  max_adverse_move_pct?:  number;
  outcome:                'PENDING' | 'HIT' | 'MISS';
}

export interface PatternStats {
  total:   number;
  hits:    number;
  hitRate: number;
}

export interface ScorecardStats {
  totalPredictions: number;
  resolved:         number;
  pending:          number;
  hits:             number;
  misses:           number;
  hitRate:          number | null; // null until at least one is resolved
  byPattern:        Record<string, PatternStats>;
  recent:           TrackedPrediction[];
}

const STORAGE_KEY        = 'sentinel_scorecard_v1';
const DEFAULT_HORIZON_MS = 5 * 60 * 1000; // 5 minutes — long enough to see a real move, short enough to resolve during normal use
const HIT_THRESHOLD_PCT  = 0.5;           // price must move >=0.5% adversely to count as a hit
const MAX_STORED         = 500;

export class OutcomeTracker {
  private predictions: TrackedPrediction[] = [];

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
      this.predictions = raw ? JSON.parse(raw) : [];
    } catch {
      this.predictions = [];
    }
  }

  private save(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const toSave = this.predictions.slice(-MAX_STORED);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch {
      // localStorage unavailable/full — scorecard just won't persist this run
    }
  }

  /** Log a new CriticalEvent as a prediction to be graded later. */
  recordEvent(event: CriticalEvent, pattern: string | null): void {
    if (this.predictions.find(p => p.id === event.id)) return; // already tracked
    this.predictions.push({
      id:          event.id,
      timestamp:   event.timestamp,
      price:       event.price,
      stress_score: event.stress_score,
      level:       event.level,
      pattern,
      horizon_ms:  DEFAULT_HORIZON_MS,
      resolved:    false,
      outcome:     'PENDING',
    });
    this.save();
  }

  /**
   * Call on every tick with the current price/timestamp. Updates the
   * running max-adverse-move for all pending predictions and resolves
   * (scores) any whose horizon has elapsed.
   */
  tick(price: number, timestamp: number): void {
    if (!isFinite(price) || !isFinite(timestamp) || this.predictions.length === 0) return;
    let changed = false;

    for (const pred of this.predictions) {
      if (pred.resolved) continue;
      const elapsed = timestamp - pred.timestamp;
      if (elapsed < 0) continue; // tick from before the prediction (e.g. seek/replay) — ignore

      const movePct     = ((price - pred.price) / pred.price) * 100;
      const adverseMove  = -movePct; // these are stress/selloff signals — "adverse" = price falling
      if (pred.max_adverse_move_pct === undefined || adverseMove > pred.max_adverse_move_pct) {
        pred.max_adverse_move_pct = adverseMove;
        changed = true;
      }

      if (elapsed >= pred.horizon_ms) {
        pred.resolved            = true;
        pred.resolved_at         = timestamp;
        pred.price_at_resolution = price;
        pred.outcome             = (pred.max_adverse_move_pct ?? 0) >= HIT_THRESHOLD_PCT ? 'HIT' : 'MISS';
        changed = true;
      }
    }

    if (changed) this.save();
  }

  getStats(): ScorecardStats {
    const resolved = this.predictions.filter(p => p.resolved);
    const hits      = resolved.filter(p => p.outcome === 'HIT').length;
    const total     = resolved.length;

    const byPattern: Record<string, PatternStats> = {};
    resolved.forEach(p => {
      const key = p.pattern || 'UNLABELED';
      if (!byPattern[key]) byPattern[key] = { total: 0, hits: 0, hitRate: 0 };
      byPattern[key].total++;
      if (p.outcome === 'HIT') byPattern[key].hits++;
    });
    Object.values(byPattern).forEach(v => { v.hitRate = v.total > 0 ? (v.hits / v.total) * 100 : 0; });

    return {
      totalPredictions: this.predictions.length,
      resolved:         total,
      pending:          this.predictions.length - total,
      hits,
      misses:           total - hits,
      hitRate:          total > 0 ? (hits / total) * 100 : null,
      byPattern,
      recent:           [...this.predictions].reverse().slice(0, 20),
    };
  }

  reset(): void {
    this.predictions = [];
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
