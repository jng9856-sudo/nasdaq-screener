'use client';

import { useEffect, useState } from 'react';
import type { EarningsResult } from '@/app/api/earnings/route';

interface ApiResponse {
  data: EarningsResult[];
  updatedAt: string;
}

const SIGNAL_STYLE: Record<string, string> = {
  STRONG_BUY: 'text-terminal-green border-terminal-green bg-terminal-green/10',
  BUY:        'text-terminal-green border-terminal-green/50',
  NEUTRAL:    'text-terminal-dim   border-terminal-border',
  SELL:       'text-terminal-red   border-terminal-red/50',
};

function fmtPct(n: number | null) {
  if (n === null) return <span className="text-terminal-dim">—</span>;
  const cls = n > 0 ? 'up' : n < 0 ? 'down' : 'flat';
  return <span className={cls}>{n > 0 ? '+' : ''}{n.toFixed(1)}%</span>;
}

export default function EarningsGap() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'STRONG_BUY' | 'BUY'>('ALL');

  useEffect(() => {
    fetch('/api/earnings')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Failed to load earnings data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error || !data) return <ErrorMsg msg={error ?? 'Unknown error'} />;

  const filtered = data.data.filter((row) =>
    filter === 'ALL' ? true : row.signal === filter
  );

  return (
    <div className="p-6">
      {/* Filter bar */}
      <div className="mb-4 flex items-center gap-2">
        {(['ALL', 'STRONG_BUY', 'BUY'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`
              text-[10px] px-3 py-1 border rounded tracking-widest transition-colors
              ${filter === f
                ? 'border-terminal-green text-terminal-green bg-terminal-green/10'
                : 'border-terminal-border text-terminal-dim hover:text-terminal-text'}
            `}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-terminal-dim">
          {filtered.length} RESULTS · UPDATED {new Date(data.updatedAt).toLocaleTimeString()}
        </span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-terminal-dim text-xs tracking-widest">EARNINGS SURPRISE + GAP ANALYSIS</span>
        <div className="flex-1 h-px bg-terminal-border" />
        <span className="text-terminal-dim text-xs">SORTED BY EPS SURPRISE</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-terminal-border text-terminal-dim tracking-widest">
              <th className="px-4 py-2 text-left w-6">#</th>
              <th className="px-4 py-2 text-left">TICKER</th>
              <th className="px-4 py-2 text-left">COMPANY</th>
              <th className="px-4 py-2 text-right">PRICE</th>
              <th className="px-4 py-2 text-right">EPS EST</th>
              <th className="px-4 py-2 text-right">EPS ACT</th>
              <th className="px-4 py-2 text-right">SURPRISE</th>
              <th className="px-4 py-2 text-right">GAP %</th>
              <th className="px-4 py-2 text-right">POST-EARN DRIFT</th>
              <th className="px-4 py-2 text-left">DATE</th>
              <th className="px-4 py-2 text-center">SIGNAL</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr
                key={row.ticker}
                className="border-b border-terminal-border/50 hover:bg-terminal-surface/60 transition-colors"
              >
                <td className="px-4 py-2.5 text-terminal-dim">{i + 1}</td>
                <td className="px-4 py-2.5 font-bold text-terminal-blue">{row.ticker}</td>
                <td className="px-4 py-2.5 text-terminal-text truncate max-w-[160px]">
                  {row.companyName}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  ${row.price.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-terminal-dim">
                  {row.epsEstimate !== null ? `$${row.epsEstimate.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {row.epsActual !== null ? `$${row.epsActual.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {fmtPct(row.epsSurprisePct)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {fmtPct(row.gapPct)}
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums">
                  {fmtPct(row.postEarningsRet)}
                </td>
                <td className="px-4 py-2.5 text-terminal-dim text-[10px]">
                  {row.earningsDate}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`
                    text-[10px] px-2 py-0.5 border rounded tracking-widest
                    ${SIGNAL_STYLE[row.signal]}
                  `}>
                    {row.signal.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signal legend */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] text-terminal-dim">
        <div className="border border-terminal-border/50 p-2 rounded">
          <span className="text-terminal-green">STRONG BUY</span>
          {' '}— EPS surprise &gt; +15% AND gap &gt; +3%
        </div>
        <div className="border border-terminal-border/50 p-2 rounded">
          <span className="text-terminal-green">BUY</span>
          {' '}— EPS surprise &gt; +5%
        </div>
        <div className="border border-terminal-border/50 p-2 rounded">
          <span className="text-terminal-dim">NEUTRAL</span>
          {' '}— No significant surprise
        </div>
        <div className="border border-terminal-border/50 p-2 rounded">
          <span className="text-terminal-red">SELL</span>
          {' '}— EPS miss &gt; -10%
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="p-6 space-y-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="h-8 bg-terminal-surface rounded animate-pulse" />
      ))}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return <div className="p-6 text-terminal-red text-xs">✕ ERROR: {msg}</div>;
}
