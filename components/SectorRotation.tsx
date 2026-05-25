'use client';

import { useEffect, useState } from 'react';
import type { SectorRow } from '@/app/api/sector/route';

interface Res { data: SectorRow[]; benchmark: SectorRow | null; updatedAt: string }

function P({ v }: { v: number }) {
  const c = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
  return <span className={c}>{v > 0 ? '+' : ''}{v.toFixed(2)}%</span>;
}

export default function SectorRotation() {
  const [res, setRes]       = useState<Res | null>(null);
  const [loading, setLoad]  = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    fetch('/api/sector').then(r => r.json()).then(setRes).catch(() => setError('fetch failed')).finally(() => setLoad(false));
  }, []);

  if (loading) return <Skel />;
  if (error || !res) return <Err msg={error} />;

  const max = Math.max(...res.data.map(d => Math.abs(d.ret1M)), 0.1);
  const bm  = res.benchmark;

  return (
    <div className="p-6">
      {/* Benchmark */}
      {bm && (
        <div className="mb-5 flex flex-wrap gap-5 p-3 border border-t-border bg-t-surface text-[11px]">
          <span className="text-t-dim tracking-widest">BENCHMARK QQQ</span>
          <span className="font-semibold">${bm.price.toFixed(2)}</span>
          <span>1W <P v={bm.ret1W} /></span>
          <span>1M <P v={bm.ret1M} /></span>
          <span>3M <P v={bm.ret3M} /></span>
          <span className="ml-auto text-t-dim">UPD {new Date(res.updatedAt).toLocaleTimeString()}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-3 text-[11px]">
        <span className="text-t-dim tracking-widest">SECTOR ROTATION</span>
        <div className="flex-1 h-px bg-t-border" />
        <span className="text-t-dim">SORTED BY 1M</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-t-border text-[10px] text-t-dim tracking-widest">
              <th className="px-3 py-2 text-left w-5">#</th>
              <th className="px-3 py-2 text-left">SECTOR</th>
              <th className="px-3 py-2 text-left">ETF</th>
              <th className="px-3 py-2 text-right">PRICE</th>
              <th className="px-3 py-2 text-right">1W</th>
              <th className="px-3 py-2 text-right">1M</th>
              <th className="px-3 py-2 text-right">3M</th>
              <th className="px-3 py-2 text-left w-36">HEAT</th>
              <th className="px-3 py-2 text-right">vs QQQ 1M</th>
            </tr>
          </thead>
          <tbody>
            {res.data.map((row, i) => {
              const vsQQQ = bm ? row.ret1M - bm.ret1M : 0;
              const barPct = Math.min(Math.abs(row.ret1M) / max, 1) * 100;
              return (
                <tr key={row.ticker} className="border-b border-t-border/40 hover:bg-t-surface/60 transition-colors">
                  <td className="px-3 py-2 text-t-dim">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{row.sector}</td>
                  <td className="px-3 py-2 text-t-blue">{row.ticker}</td>
                  <td className="px-3 py-2 text-right tabular-nums">${row.price.toFixed(2)}</td>
                  <td className="px-3 py-2 text-right tabular-nums"><P v={row.ret1W} /></td>
                  <td className="px-3 py-2 text-right tabular-nums"><P v={row.ret1M} /></td>
                  <td className="px-3 py-2 text-right tabular-nums"><P v={row.ret3M} /></td>
                  <td className="px-3 py-2">
                    <div className="h-1 bg-t-border rounded overflow-hidden">
                      <div className="h-full rounded transition-all duration-500"
                        style={{ width: `${barPct}%`, backgroundColor: row.ret1M >= 0 ? '#00d084' : '#ff4d4d' }} />
                    </div>
                  </td>
                  <td className={`px-3 py-2 text-right tabular-nums ${vsQQQ >= 0 ? 'up' : 'down'}`}>
                    {vsQQQ >= 0 ? '+' : ''}{vsQQQ.toFixed(2)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const Skel = () => <div className="p-6 space-y-2">{Array.from({length:12}).map((_,i)=><div key={i} className="h-8 bg-t-surface rounded animate-pulse"/>)}</div>;
const Err  = ({ msg }: { msg: string }) => <div className="p-6 text-t-red text-xs">✕ {msg}</div>;
