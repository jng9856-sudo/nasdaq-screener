'use client';

import { useEffect, useState } from 'react';
import type { EarningsRow, Signal } from '@/app/api/earnings/route';

interface Res { data: EarningsRow[]; updatedAt: string; error?: string }

const SIG: Record<Signal, string> = {
  STRONG_BUY: 'text-t-green border-t-green bg-t-green/10',
  BUY:        'text-t-green border-t-green/50',
  NEUTRAL:    'text-t-dim   border-t-border',
  SELL:       'text-t-red   border-t-red/50',
};

function Pct({ v }: { v: number | null }) {
  if (v === null) return <span className="text-t-dim">—</span>;
  const c = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  return <span className={c}>{v > 0 ? '+' : ''}{v.toFixed(1)}%</span>;
}

type Filter = 'ALL' | 'STRONG_BUY' | 'BUY';

export default function EarningsGap() {
  const [res, setRes]       = useState<Res | null>(null);
  const [loading, setLoad]  = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');

  useEffect(() => {
    fetch('/api/earnings')
      .then(r => r.json())
      .then(setRes)
      .catch(() => setRes({ data: [], updatedAt: '', error: 'fetch failed' }))
      .finally(() => setLoad(false));
  }, []);

  if (loading) return <Skel />;
  if (!res || res.data.length === 0) return <Err msg={res?.error ?? 'No data'} />;

  const rows = res.data.filter(r => filter === 'ALL' ? true : r.signal === filter);

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center gap-2">
        {(['ALL','STRONG_BUY','BUY'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-[10px] px-3 py-1 border rounded tracking-widest transition-colors
              ${filter === f ? 'border-t-green text-t-green' : 'border-t-border text-t-dim hover:text-t-text'}`}>
            {f.replace('_',' ')}
          </button>
        ))}
        <div className="flex-1"/>
        <span className="text-[11px] text-t-dim">{rows.length} RESULTS · UPD {new Date(res.updatedAt).toLocaleTimeString()}</span>
      </div>
      <div className="flex items-center gap-2 mb-3 text-[11px]">
        <span className="text-t-dim tracking-widest">EARNINGS SURPRISE + GAP</span>
        <div className="flex-1 h-px bg-t-border"/>
        <span className="text-t-dim">SORTED BY SURPRISE %</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-t-border text-[10px] text-t-dim tracking-widest">
              <th className="px-3 py-2 text-left w-5">#</th>
              <th className="px-3 py-2 text-left">TICKER</th>
              <th className="px-3 py-2 text-left">COMPANY</th>
              <th className="px-3 py-2 text-right">PRICE</th>
              <th className="px-3 py-2 text-right">EPS EST</th>
              <th className="px-3 py-2 text-right">EPS ACT</th>
              <th className="px-3 py-2 text-right">SURPRISE</th>
              <th className="px-3 py-2 text-right">GAP %</th>
              <th className="px-3 py-2 text-right">DRIFT</th>
              <th className="px-3 py-2 text-left">DATE</th>
              <th className="px-3 py-2 text-center">SIGNAL</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.ticker} className="border-b border-t-border/40 hover:bg-t-surface/60 transition-colors">
                <td className="px-3 py-2 text-t-dim">{i + 1}</td>
                <td className="px-3 py-2 font-bold text-t-blue">{row.ticker}</td>
                <td className="px-3 py-2 max-w-[150px] truncate">{row.name}</td>
                <td className="px-3 py-2 text-right tabular-nums">${row.price.toFixed(2)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-t-dim">{row.epsEst !== null ? `$${row.epsEst.toFixed(2)}` : '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{row.epsAct !== null ? `$${row.epsAct.toFixed(2)}` : '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums"><Pct v={row.surprisePct} /></td>
                <td className="px-3 py-2 text-right tabular-nums"><Pct v={row.gapPct} /></td>
                <td className="px-3 py-2 text-right tabular-nums"><Pct v={row.driftPct} /></td>
                <td className="px-3 py-2 text-[10px] text-t-dim">{row.earningsDate}</td>
                <td className="px-3 py-2 text-center">
                  <span className={`text-[10px] px-2 py-0.5 border rounded tracking-widest ${SIG[row.signal]}`}>
                    {row.signal.replace('_',' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Skel = () => <div className="p-6 space-y-2">{Array.from({length:12}).map((_,i)=><div key={i} className="h-8 bg-t-surface rounded animate-pulse"/>)}</div>;
const Err  = ({ msg }: { msg: string }) => (
  <div className="p-6">
    <div className="text-t-red text-xs mb-1">✕ API ERROR</div>
    <div className="text-t-dim text-[11px]">{msg}</div>
  </div>
);
