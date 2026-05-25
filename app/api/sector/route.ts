import { NextResponse } from 'next/server';
import { getChart, getQuotes, daysAgo, batch } from '@/lib/yahoo';
import { SECTOR_ETFS, BENCHMARK } from '@/lib/tickers';

export const revalidate = 3600;

export interface SectorRow {
  sector: string;
  ticker: string;
  price: number;
  ret1W: number;
  ret1M: number;
  ret3M: number;
}

function pct(bars: { close: number }[], fromIdx: number): number {
  if (bars.length < 2 || fromIdx >= bars.length) return 0;
  const first = bars[fromIdx]?.close ?? 0;
  const last  = bars[bars.length - 1]?.close ?? 0;
  if (!first) return 0;
  return ((last - first) / first) * 100;
}

export async function GET() {
  try {
    const tickers = [...Object.values(SECTOR_ETFS), BENCHMARK];

    const chartResults = await batch(
      tickers,
      (t) => getChart(t, daysAgo(95), daysAgo(0)),
      5, 200
    );

    const quotes = await getQuotes(tickers);
    const quoteMap = Object.fromEntries(quotes.map((q) => [q.symbol, q]));

    const rows: SectorRow[] = [];
    let benchmark: SectorRow | null = null;

    tickers.forEach((ticker, i) => {
      const r = chartResults[i];
      const bars = r.status === 'fulfilled' ? r.value : [];
      const len  = bars.length;
      const price = quoteMap[ticker]?.regularMarketPrice ?? bars[len - 1]?.close ?? 0;

      const row: SectorRow = {
        sector: ticker === BENCHMARK
          ? 'NASDAQ (QQQ)'
          : Object.entries(SECTOR_ETFS).find(([, v]) => v === ticker)?.[0] ?? ticker,
        ticker,
        price,
        ret1W: pct(bars, Math.max(0, len - 6)),
        ret1M: pct(bars, Math.max(0, len - 22)),
        ret3M: pct(bars, 0),
      };

      if (ticker === BENCHMARK) benchmark = row;
      else rows.push(row);
    });

    rows.sort((a, b) => b.ret1M - a.ret1M);

    return NextResponse.json({ data: rows, benchmark, updatedAt: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
