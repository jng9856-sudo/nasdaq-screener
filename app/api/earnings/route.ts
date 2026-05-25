import { NextResponse } from 'next/server';
import { getQuoteSummary, getChart, getQuotes, daysAgo, batch } from '@/lib/yahoo';
import { NASDAQ_UNIVERSE } from '@/lib/tickers';

export const revalidate = 3600;

export type Signal = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL';

export interface EarningsRow {
  ticker: string;
  name: string;
  price: number;
  earningsDate: string;
  epsEst: number | null;
  epsAct: number | null;
  surprisePct: number | null;
  gapPct: number | null;
  driftPct: number | null;
  signal: Signal;
}

function toSignal(surprise: number | null, gap: number | null): Signal {
  if (surprise === null) return 'NEUTRAL';
  if (surprise > 15 && (gap ?? 0) > 3) return 'STRONG_BUY';
  if (surprise > 5)  return 'BUY';
  if (surprise < -10) return 'SELL';
  return 'NEUTRAL';
}

export async function GET() {
  try {
    const quotes = await getQuotes(NASDAQ_UNIVERSE);
    const quoteMap = Object.fromEntries(quotes.map((q) => [q.symbol, q]));

    const summaryResults = await batch(
      NASDAQ_UNIVERSE,
      (t) => getQuoteSummary(t, ['earnings', 'calendarEvents']),
      5, 300
    );

    const chartResults = await batch(
      NASDAQ_UNIVERSE,
      (t) => getChart(t, daysAgo(50), daysAgo(0)),
      5, 200
    );

    const rows: EarningsRow[] = NASDAQ_UNIVERSE.flatMap((ticker, i) => {
      const sr = summaryResults[i];
      const cr = chartResults[i];
      if (sr.status !== 'fulfilled') return [];

      const summary = sr.value;
      const bars    = cr.status === 'fulfilled' ? cr.value : [];
      const quote   = quoteMap[ticker];

      // EPS from earnings.earningsChart.quarterly
      type EpsQuarter = { date?: string; actual?: number; estimate?: number };
      const quarterly = ((summary.earnings as Record<string, unknown>)
        ?.earningsChart as Record<string, unknown>)
        ?.quarterly as EpsQuarter[] | undefined;

      const latest = quarterly ? quarterly[quarterly.length - 1] : undefined;
      const epsAct = latest?.actual ?? null;
      const epsEst = latest?.estimate ?? null;

      const surprisePct =
        epsAct !== null && epsEst !== null && epsEst !== 0
          ? ((epsAct - epsEst) / Math.abs(epsEst)) * 100
          : null;

      // Earnings date from calendarEvents
      type CalEarnings = { earningsDate?: number[] };
      const calEarnings = (summary.calendarEvents as Record<string, unknown>)
        ?.earnings as CalEarnings | undefined;

      const pastDates = (calEarnings?.earningsDate ?? [])
        .map((ts) => ts * 1000) // Yahoo sometimes returns seconds
        .filter((ms) => ms < Date.now())
        .sort((a, b) => b - a);

      const earningsTsMs = pastDates[0] ?? null;
      const earningsDate = earningsTsMs
        ? new Date(earningsTsMs).toISOString().slice(0, 10)
        : (latest?.date ?? '');

      // Gap: open on earnings day vs prev close
      let gapPct: number | null = null;
      let driftPct: number | null = null;

      if (earningsTsMs && bars.length > 1) {
        const earningsDayStr = new Date(earningsTsMs).toISOString().slice(0, 10);
        const idx = bars.findIndex(
          (b) => new Date(b.date * 1000).toISOString().slice(0, 10) === earningsDayStr
        );
        if (idx > 0) {
          const prevClose    = bars[idx - 1].close;
          const earningsOpen = bars[idx].open;
          const currentPrice = quote?.regularMarketPrice ?? bars[bars.length - 1].close;

          if (prevClose && earningsOpen) {
            gapPct    = ((earningsOpen - prevClose) / prevClose) * 100;
            driftPct  = ((currentPrice - earningsOpen) / earningsOpen) * 100;
          }
        }
      }

      // Only include if we have at least EPS data
      if (surprisePct === null) return [];

      return [{
        ticker,
        name:        quote?.shortName ?? quote?.longName ?? ticker,
        price:       quote?.regularMarketPrice ?? 0,
        earningsDate,
        epsEst,
        epsAct,
        surprisePct,
        gapPct,
        driftPct,
        signal: toSignal(surprisePct, gapPct),
      }];
    });

    rows.sort((a, b) => (b.surprisePct ?? 0) - (a.surprisePct ?? 0));

    return NextResponse.json({ data: rows, updatedAt: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ data: [], benchmark: null, error: msg }, { status: 200 });
  }
}
