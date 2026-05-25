'use client';

import { useEffect, useState } from 'react';
import type { SectorData } from '@/app/api/sector/route';

interface ApiResponse {
  data: SectorData[];
  benchmark: SectorData;
  updatedAt: string;
}

function RetCell({ val }: { val: number }) {
  const cls = val > 0 ? 'up' : val < 0 ? 'down' : 'flat';
  return (
    <td className={`px-4 py-2.5 text-right text-xs tabular-nums ${cls}`}>
      {val > 0 ? '+' : ''}{val.toFixed(2)}%
    </td>
  );
}

function HeatBar({ val, max }: { val: number; max: number }) {
  const pct = Math.min(Math.abs(val) / max, 1) * 100;
  const color = val > 0 ? '#00d084' : '#ff4d4d';
  return (
    <div className="w-full h-1 bg-terminal-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

export default function SectorRotation() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sector')
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError('Failed to load sector data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;
  if (error || !data) return <ErrorMsg msg={error ?? 'Unknown error'} />;

  const max1M = Math.max(...data.data.map((d) => Math.abs(d.ret1M)));
  const bm = data.benchmark;

  return (
    <div className="p-6">
      {/* Benchmark strip */}
      {bm && (
        <div className="mb-6 flex items-center gap-6 p-3 border border-terminal-border bg-terminal-surface rounded text-xs">
          <span className="text-terminal-dim tracking-widest">BENCHMARK QQQ</span>
          <span className="text-terminal-text font-semibold">${bm.price.toFixed(2)}</span>
          <span className={bm.ret1W >= 0 ? 'up' : 'down'}>
            1W {bm.ret1W >= 0 ? '+' : ''}{bm.ret1W.toFixed(2)}%
          </span>
          <span className={bm.ret1M >= 0 ? 'up' : 'down'}>
            1M {bm.ret1M >= 0 ? '+' : ''}{bm.ret1M.toFixed(2)}%
          </span>
          <span className={bm.ret3M >= 0 ? 'up' : 'down'}>
            3M {bm.ret3M >= 0 ? '+' : ''}{bm.ret3M.toFixed(2)}%
          </span>
          <span className="ml-auto text-terminal-dim">
            UPDATED {new Date(data.updatedAt).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Section label */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-terminal-dim text-xs tracking-widest">SECTOR ROTATION RANKING</span>
        <div className="flex-1 h-px bg-terminal-border" />
        <span className="text-terminal-dim text-xs">SORTED BY 1M RETURN</span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-terminal-border text-terminal-dim tracking-widest">
              <th className="px-4 py-2 text-left w-6">#</th>
              <th className="px-4 py-2 text-left">SECTOR</th>
              <th className="px-4 py-2 text-left">ETF</th>
              <th className="px-4 py-2 text-right">PRICE</th>
              <th className="px-4 py-2 text-right">1W</th>
              <th className="px-4 py-2 text-right">1M</th>
              <th className="px-4 py-2 text-right">3M</th>
              <th className="px-4 py-2 text-left w-40">MOMENTUM</th>
              <th className="px-4 py-2 text-right">vs QQQ (1M)</th>
            </tr>
          </thead>
          <tbody>
            {data.data.map((row, i) => {
              const vsQQQ = bm ? row.ret1M - bm.ret1M : 0;
              return (
                <tr
                  key={row.ticker}
                  className="border-b border-terminal-border/50 hover:bg-terminal-surface/60 transition-colors"
                >
                  <td className="px-4 py-2.5 text-terminal-dim">{i + 1}</td>
                  <td className="px-4 py-2.5 font-medium text-terminal-text">{row.sector}</td>
                  <td className="px-4 py-2.5 text-terminal-blue">{row.ticker}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">${row.price.toFixed(2)}</td>
                  <RetCell val={row.ret1W} />
                  <RetCell val={row.ret1M} />
                  <RetCell val={row.ret3M} />
                  <td className="px-4 py-2.5 w-40">
                    <HeatBar val={row.ret1M} max={max1M} />
                  </td>
                  <td className={`px-4 py-2.5 text-right text-xs tabular-nums ${vsQQQ > 0 ? 'up' : 'down'}`}>
                    {vsQQQ > 0 ? '+' : ''}{vsQQQ.toFixed(2)}%
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
  return (
    <div className="p-6 text-terminal-red text-xs">
      ✕ ERROR: {msg}
    </div>
  );
}
