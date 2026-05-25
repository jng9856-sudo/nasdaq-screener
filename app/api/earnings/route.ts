import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { NASDAQ_UNIVERSE } from '@/lib/tickers';

export const revalidate = 3600;

export interface EarningsResult {
  ticker: string;
  companyName: string;
  earningsDate: string;
  epsEstimate: number | null;
  epsActual: number | null;
  epsSurprisePct: number | null; // (actual - estimate) / |estimate| * 100
  gapPct: number | null;         // (open on earnings day - prev close) / prev close * 100
  postEarningsRet: number | null; // return from earnings open to now
  price: number;
  signal: 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL';
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function batchProcess<T>(
  items: string[],
  fn: (ticker: string) => Promise<T>,
  batchSize = 5,
  delayMs = 300
): Promise<PromiseSettledResult<T>[]> {
  const results: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(fn));
    results.push(...batchResults);
    if (i + batchSize < items.length) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return results;
}

function classifySignal(
  epsSurprisePct: number | null,
  gapPct: number | null
): EarningsResult['signal'] {
  if (epsSurprisePct === null) return 'NEUTRAL';
  if (epsSurprisePct > 15 && (gapPct ?? 0) > 3) return 'STRONG_BUY';
  if (epsSurprisePct > 5) return 'BUY';
  if (epsSurprisePct < -10) return 'SELL';
  return 'NEUTRAL';
}

export async function GET() {
  try {
    const rawResults = await batchProcess(NASDAQ_UNIVERSE, async (ticker) => {
      const [summary, hist, quote] = await Promise.all([
        yahooFinance.quoteSummary(ticker, {
          modules: ['earnings', 'calendarEvents'],
        }),
        yahooFinance.historical(ticker, {
          period1: daysAgo(45),
          period2: new Date(),
          interval: '1d',
        }),
        yahooFinance.quote(ticker),
      ]);

      // Find most recent past earnings from earningsHistory
      const earningsHistory = summary.earnings?.earningsChart?.quarterly ?? [];
      const mostRecent = earningsHistory[earningsHistory.length - 1];

      if (!mostRecent) return null;

      const epsActual = mostRecent.actual ?? null;
      const epsEstimate = mostRecent.estimate ?? null;

      // EPS surprise %
      let epsSurprisePct: number | null = null;
      if (epsActual !== null && epsEstimate !== null && epsEstimate !== 0) {
        epsSurprisePct = ((epsActual - epsEstimate) / Math.abs(epsEstimate)) * 100;
      }

      // Find earnings date from calendar
      const earningsDates = summary.calendarEvents?.earnings?.earningsDate ?? [];
      // Use the most recent past earnings date
      const pastDates = earningsDates
        .map((d: any) => new Date(d))
        .filter((d: Date) => d < new Date())
        .sort((a: Date, b: Date) => b.getTime() - a.getTime());

      const earningsDate = pastDates[0]
        ? pastDates[0].toISOString().slice(0, 10)
        : mostRecent.date ?? '';

      // Find gap: open on earnings day vs prev close
      let gapPct: number | null = null;
      let postEarningsRet: number | null = null;

      if (earningsDate && hist.length > 1) {
        const earningsDt = new Date(earningsDate);
        const earningsIdx = hist.findIndex(
          (d) => new Date(d.date).toDateString() === earningsDt.toDateString()
        );
        if (earningsIdx > 0) {
          const prevClose = hist[earningsIdx - 1].close;
          const earningsOpen = hist[earningsIdx].open;
          if (prevClose && earningsOpen) {
            gapPct = ((earningsOpen - prevClose) / prevClose) * 100;
          }
          // Post-earnings drift: from earnings open to current price
          const currentPrice = quote.regularMarketPrice ?? hist[hist.length - 1].close;
          if (earningsOpen && currentPrice) {
            postEarningsRet = ((currentPrice - earningsOpen) / earningsOpen) * 100;
          }
        }
      }

      return {
        ticker,
        companyName: quote.shortName ?? quote.longName ?? ticker,
        earningsDate,
        epsEstimate,
        epsActual,
        epsSurprisePct,
        gapPct,
        postEarningsRet,
        price: quote.regularMarketPrice ?? 0,
        signal: classifySignal(epsSurprisePct, gapPct),
      } as EarningsResult;
    });

    const valid = rawResults
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<EarningsResult | null>).value)
      .filter((v): v is EarningsResult => v !== null && v.epsSurprisePct !== null);

    // Sort by EPS surprise descending
    valid.sort((a, b) => (b.epsSurprisePct ?? 0) - (a.epsSurprisePct ?? 0));

    return NextResponse.json({ data: valid, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch earnings data' }, { status: 500 });
  }
}
