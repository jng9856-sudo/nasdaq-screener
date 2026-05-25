'use client';

import { useEffect, useState } from 'react';
import type { InstRow } from '@/app/api/institutional/route';

interface Res { data: InstRow[]; updatedAt: string }

function fmtCap(n: number) {
  if (n >= 1e12) return `$${(n/1e12).toFixed(1)}T`;
  if (n >= 1e9)  return `$${(n/1e9).toFixed(1)}B`;
  return `$${(n/1e6).toFixed(0)}M`;
}

export default function InstitutionalOwnership() {
  const [res, setRes]      = useState<Res | null>(null);
  const [loading, setLoad] = useState(true);
  const [error, setError]  = useState('');
  const [open, setOpen]    = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/institutional').then(r => r.json()).then(setRes).catch(() => setError('fetch failed')).finally(() => setLoad(false));
  }, []);

  if (loading) return <Skel />;
  if (error || !res) return <Err msg={error} />;

  return (
    <div className="p-6">
      <div className="mb-3 flex items-center gap-2 text-[11px]">
        <span className="text-t-dim tracking-widest">INSTITUTIONAL POSITIONING</span>
        <div className="flex-1 h-px bg-t-border" />
        <span className="text-t-dim">UPD {new Date(res.updatedAt).toLocaleTimeString()}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-t-border text-[10px] text-t-dim tracking-widest">
              <th className="px-3 py-2 text-left w-5">#</th>
              <th className="px-3 py-2 text-left">TICKER</th>
              <th className="px-3 py-2 text-left">COMPANY</th>
              <th className="px-3 py-2 text-right">PRICE</th>
              <th className="px-3 py-2 text-right">MKT CAP</th>
              <th className="px-3 py-2 text-right">INST %</th>
              <th className="px-3 py-2 text-right"># INST</th>
              <th className="px-3 py-2 text-right">RS 3M</th>
              <th className="px-3 py-2 text-center">SIGNAL</th>
              <th className="px-3 py-2 text-center">TOP HOLDERS</th>
            </tr>
          </thead>
          <tbody>
            {res.data.map((row, i) => {
              const isOpen = open === row.ticker;
              return (
                <>
                  <tr key={row.ticker} className="border-b border-t-border/40 hover:bg-t-surface/60 transition-colors">
                    <td className="px-3 py-2 text-t-dim">{i + 1}</td>
                    <td className="px-3 py-2 font-bold text-t-blue">{row.ticker}</td>
                    <td className="px-3 py-2 max-w-[160px] truncate">{row.name}</td>
                    <td className="px-3 py-2 text-right tabular-nums">${row.price.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-t-dim">{fmtCap(row.marketCap)}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${row.instPct > 0.7 ? 'up' : row.instPct > 0.5 ? 'flat' : ''}`}>
                      {(row.instPct * 100).toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-t-dim">{row.instCount.toLocaleString()}</td>
                    <td className={`px-3 py-2 text-right tabular-nums ${row.rs3M >= 0 ? 'up' : 'down'}`}>
                      {row.rs3M >= 0 ? '+' : ''}{row.rs3M.toFixed(1)}%
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.signal && (
                        <span className="text-[10px] px-2 py-0.5 border border-t-green text-t-green rounded tracking-widest">
                          ▲ INST+RS
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-center">
                      {row.topHolders.length > 0 && (
                        <button onClick={() => setOpen(isOpen ? null : row.ticker)}
                          className="text-[10px] text-t-dim hover:text-t-text transition-colors">
                          {isOpen ? '▲ HIDE' : '▼ SHOW'}
                        </button>
                      )}
                    </td>
                  </tr>

                  {isOpen && (
                    <tr key={`${row.ticker}-exp`} className="bg-t-surface/80">
                      <td colSpan={10} className="px-8 py-3">
                        <p className="text-[10px] text-t-dim mb-2 tracking-widest">TOP HOLDERS — {row.ticker}</p>
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-[10px] text-t-dim">
                              <th className="text-left py-1 pr-6">INSTITUTION</th>
                              <th className="text-right py-1 pr-6">% HELD</th>
                              <th className="text-right py-1 pr-6">SHARES</th>
                              <th className="text-right py-1">REPORT DATE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {row.topHolders.map((h, j) => (
                              <tr key={j} className="border-t border-t-border/30">
                                <td className="py-1.5 pr-6">{h.organization}</td>
                                <td className="py-1.5 pr-6 text-right text-t-green tabular-nums">{(h.pctHeld * 100).toFixed(2)}%</td>
                                <td className="py-1.5 pr-6 text-right text-t-dim tabular-nums">{h.shares.toLocaleString()}</td>
                                <td className="py-1.5 text-right text-t-dim">{h.reportDate}</td>
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
      <p className="mt-3 text-[10px] text-t-dim border border-t-border/50 p-2 rounded">
        <span className="text-t-amber">▲ NOTE:</span> INST % from 13F filings (quarterly lag). INST+RS = inst% &gt; 50% AND RS vs QQQ &gt; +5%.
      </p>
    </div>
  );
}

const Skel = () => <div className="p-6 space-y-2">{Array.from({length:15}).map((_,i)=><div key={i} className="h-8 bg-t-surface rounded animate-pulse"/>)}</div>;
const Err  = ({ msg }: { msg: string }) => <div className="p-6 text-t-red text-xs">✕ {msg}</div>;
