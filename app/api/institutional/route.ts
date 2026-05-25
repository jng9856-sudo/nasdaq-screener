import { NextResponse } from 'next/server';
import { getQuoteSummary, getChart, getQuotes, daysAgo, batch } from '@/lib/yahoo';
import { NASDAQ_UNIVERSE, BENCHMARK } from '@/lib/tickers';

export const revalidate = 3600;

export interface Holder {
  organization: string;
  pctHeld: number;
  shares: number;
  reportDate: string;
}

export interface InstRow {
  ticker: string;
  name: string;
  price: number;
  marketCap: number;
  instPct: number;
  instCount: number;
  rs3M: number;
  topHolders: Holder[];
  signal: boolean; // instPct > 50% AND rs3M > 5
}

export async function GET() {
  try {
    // ── 1. Fetch quote data for all tickers ───────────────────────────────────
    const quotes = await getQuotes(NASDAQ_UNIVERSE);
    const quoteMap = Object.fromEntries(quotes.map((q) => [q.symbol, q]));

    // ── 2. Fetch QQQ 3M return for RS calculation ─────────────────────────────
    const benchBars = await getChart(BENCHMARK, daysAgo(95), daysAgo(0));
    const benchRet = benchBars.length > 1
      ? ((benchBars[benchBars.length - 1].close - benchBars[0].close) / benchBars[0].close) * 100
      : 0;

    // ── 3. Fetch institutionOwnership + majorHoldersBreakdown per ticker ───────
    const summaryResults = await batch(
      NASDAQ_UNIVERSE,
      (t) => getQuoteSummary(t, ['institutionOwnership', 'majorHoldersBreakdown']),
      5, 300
    );

    // ── 4. Fetch 3M chart for RS per ticker ───────────────────────────────────
    const chartResults = await batch(
      NASDAQ_UNIVERSE,
      (t) => getChart(t, daysAgo(95), daysAgo(0)),
      5, 200
    );

    // ── 5. Assemble rows ──────────────────────────────────────────────────────
    const rows: InstRow[] = NASDAQ_UNIVERSE.flatMap((ticker, i) => {
      const sr = summaryResults[i];
      const cr = chartResults[i];
      if (sr.status !== 'fulfilled') return [];

      const summary = sr.value;
      const bars    = cr.status === 'fulfilled' ? cr.value : [];
      const quote   = quoteMap[ticker];

      // RS vs QQQ
      const stockRet = bars.length > 1
        ? ((bars[bars.length - 1].close - bars[0].close) / bars[0].close) * 100
        : 0;
      const rs3M = stockRet - benchRet;

      // majorHoldersBreakdown
      const mhb = summary.majorHoldersBreakdown as Record<string, unknown> | undefined;
      const instPct   = (mhb?.institutionsPercentHeld   as number | undefined) ?? 0;
      const instCount = (mhb?.institutionsCount          as number | undefined) ?? 0;

      // institutionOwnership list
      type OwnerRaw = { organization?: string; pctHeld?: number; position?: number; reportDate?: number };
      const ownerList = ((summary.institutionOwnership as Record<string, unknown>)
        ?.ownershipList as OwnerRaw[] | undefined) ?? [];

      const topHolders: Holder[] = ownerList.slice(0, 6).map((h) => ({
        organization: h.organization ?? '',
        pctHeld:      h.pctHeld ?? 0,
        shares:       h.position ?? 0,
        reportDate:   h.reportDate
          ? new Date(h.reportDate * 1000).toISOString().slice(0, 10)
          : '',
      }));

      return [{
        ticker,
        name:       quote?.shortName ?? quote?.longName ?? ticker,
        price:      quote?.regularMarketPrice ?? bars[bars.length - 1]?.close ?? 0,
        marketCap:  quote?.marketCap ?? 0,
        instPct,
        instCount,
        rs3M,
        topHolders,
        signal: instPct > 0.5 && rs3M > 5,
      }];
    });

    rows.sort((a, b) => b.instPct - a.instPct);

    return NextResponse.json({ data: rows, updatedAt: new Date().toISOString() });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
