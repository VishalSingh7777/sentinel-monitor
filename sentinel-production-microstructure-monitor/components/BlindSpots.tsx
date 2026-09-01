import React from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// BlindSpots — a static, upfront disclosure of what this system structurally
// cannot see. Every model has failure modes; the honest move is to name them
// before someone discovers them the hard way, not bury them in a README.
// ─────────────────────────────────────────────────────────────────────────────

const BLIND_SPOTS: { title: string; detail: string }[] = [
  {
    title: 'Gradual, multi-hour distribution',
    detail: 'The engine reacts to depth/flow/volatility changes on the scale of seconds to a few minutes. A large position unwound slowly over many hours, staying under every per-tick threshold, will not trigger any signal.',
  },
  {
    title: 'Off-exchange / OTC block trades',
    detail: 'Only the Binance BTCUSDT spot order book and trade tape are observed. Large trades executed OTC or on other venues are invisible here, even if they move the "real" market.',
  },
  {
    title: 'Coordinated wash trading',
    detail: 'Order Flow and Forced Selling assume trade volume reflects genuine supply/demand. Self-trading or coordinated wash volume can push these signals in either direction without real economic meaning.',
  },
  {
    title: 'Cross-asset contagion',
    detail: 'Every signal is computed from BTCUSDT alone. Stress originating elsewhere (a stablecoin depeg, an altcoin liquidation cascade) is only visible here once — and if — it eventually spills into BTC price or order flow.',
  },
  {
    title: 'Spoofed order book depth',
    detail: 'Liquidity Fragility reads displayed bid/ask depth directly. Large resting orders that get pulled the instant they would be executed against ("spoofing") can make the book look deeper or thinner than it actually is.',
  },
];

export const BlindSpots: React.FC = () => (
  <div className="bg-[#151a23] border border-gray-800 rounded-xl p-5 flex flex-col shadow-lg">
    <div className="flex flex-col mb-3">
      <h2 className="text-[11px] font-black text-red-400/80 uppercase tracking-[0.3em]">Known Blind Spots</h2>
      <span className="text-[8px] text-gray-600 font-mono uppercase tracking-widest">
        What this system structurally cannot see — stated up front
      </span>
    </div>
    <div className="space-y-3">
      {BLIND_SPOTS.map((b, i) => (
        <div key={i} className="border-l-2 border-red-900/50 pl-3">
          <div className="text-[10px] font-black text-gray-300 font-mono">{b.title}</div>
          <div className="text-[9px] text-gray-500 leading-relaxed mt-0.5">{b.detail}</div>
        </div>
      ))}
    </div>
  </div>
);
