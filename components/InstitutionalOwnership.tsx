'use client';

import { useEffect, useState } from 'react';
import type { InstitutionalResult } from '@/app/api/institutional/route';

interface ApiResponse {
  data: InstitutionalResult[];
  updatedAt: string;
}

const SIGNAL_COLORS: Record<string, string> = {
  STRONG: 'text-terminal-green border-terminal-green',
  WEAK:   'text-terminal-amber border-terminal-amber',
};

function fmt(n: number) { return (n * 100).toFixed(1); }
function fmtPct(n: number) { return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`; }
function fmtB(n: number) {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

export default function InstitutionalOwnership() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/institutional')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Failed to load institutional data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error || !data) return <ErrorMsg msg={error ?? 'Unknown error'} />;

  return (
    <div className="p-6">
      {/* Legend */}
      <div className="mb-4 flex items-center gap-6 text-xs text-terminal-dim">
        <span>INST% = % OF FLOAT HELD BY INSTITUTIONS</span>
        <span>RS3M = RELATIVE STRENGTH vs QQQ (3M)</span>
        <span className="ml-auto">
          UPDATED {new Date(data.updatedAt).toLocaleTimeString()}
        </span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-terminal-dim text-xs tracking-widest">INSTITUTIONAL POSITIONING</span>
        <div className="flex-1 h-px bg-terminal-border" />
        <span className="text-terminal-dim text-xs">SORTED BY INST % HELD</span>
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
              <th className="px-4 py-2 text-right">MKT CAP</th>
              <th className="px-4 py-2 text-right">INST %</th>
              <th className="px-4 py-2 text-right"># INST</th>
              <th className="px-4 py-2 text-right">RS 3M</th>
              <th className="px-4 py-2 text-center">SIGNAL</th>
              <th className="px-4 py-2 text-center">HOLDERS</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((row, i) => {
              const isBullish = row.rs3M > 5 && row.instPctHeld > 0.5;
              const isExpanded = expanded === row.ticker;

              return (
                <>
                  <tr
                    key={row.ticker}
                    className="border-b border-terminal-border/50 hover:bg-terminal-surface/60 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-terminal-dim">{i + 1}</td>
                    <td className="px-4 py-2.5 font-bold text-terminal-blue">{row.ticker}</td>
                    <td className="px-4 py-2.5 text-terminal-text truncate max-w-[180px]">
                      {row.companyName}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      ${row.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-terminal-dim">
                      {fmtB(row.marketCap)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className={row.instPctHeld > 0.7 ? 'up' : row.instPctHeld > 0.5 ? 'flat' : ''}>
                        {fmt(row.instPctHeld)}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-terminal-dim">
                      {row.instCount.toLocaleString()}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${row.rs3M > 0 ? 'up' : 'down'}`}>
                      {fmtPct(row.rs3M)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`
                        text-[10px] px-2 py-0.5 border rounded tracking-widest
                        ${isBullish ? 'text-terminal-green border-terminal-green' : 'text-terminal-dim border-terminal-border'}
                      `}>
                        {isBullish ? '▲ INST+RS' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {row.topHolders.length > 0 && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : row.ticker)}
                          className="text-terminal-dim hover:text-terminal-text transition-colors text-[11px]"
                        >
                          {isExpanded ? '▲ HIDE' : '▼ SHOW'}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded row: top holders */}
                  {isExpanded && row.topHolders.length > 0 && (
                    <tr key={`${row.ticker}-expanded`} className="bg-terminal-surface/80">
                      <td colSpan={10} className="px-8 py-3">
                        <div className="text-[10px] text-terminal-dim mb-2 tracking-widest">
                          TOP INSTITUTIONAL HOLDERS — {row.ticker}
                        </div>
                        <table className="w-full">
                          <thead>
                            <tr className="text-[10px] text-terminal-dim">
                              <th className="text-left py-1 pr-4">INSTITUTION</th>
                              <th className="text-right py-1 pr-4">% HELD</th>
                              <th className="text-right py-1 pr-4">SHARES</th>
                              <th className="text-right py-1">REPORT DATE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.topHolders.map((h, j) => (
                              <tr key={j} className="border-t border-terminal-border/30">
                                <td className="py-1.5 pr-4 text-terminal-text text-[11px]">
                                  {h.organization}
                                </td>
                                <td className="py-1.5 pr-4 text-right tabular-nums text-terminal-green text-[11px]">
                                  {(h.pctHeld * 100).toFixed(2)}%
                                </td>
                                <td className="py-1.5 pr-4 text-right tabular-nums text-terminal-dim text-[11px]">
                                  {h.shares.toLocaleString()}
                                </td>
                                <td className="py-1.5 text-right text-terminal-dim text-[11px]">
                                  {h.reportDate}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Note */}
      <div className="mt-4 text-[10px] text-terminal-dim border border-terminal-border/50 p-3 rounded">
        <span className="text-terminal-amber">▲ NOTE:</span> Institutional % from latest 13F filings.
        INST+RS signal = inst% &gt; 50% AND RS vs QQQ &gt; +5%. For Q/Q delta tracking,
        cross-reference with SEC EDGAR 13F filings or finviz.com/insiderfiling.
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="p-6 space-y-3">
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="h-8 bg-terminal-surface rounded animate-pulse" />
      ))}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return <div className="p-6 text-terminal-red text-xs">✕ ERROR: {msg}</div>;
}
