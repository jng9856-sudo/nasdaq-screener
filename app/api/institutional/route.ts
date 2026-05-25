import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { NASDAQ_UNIVERSE } from '@/lib/tickers';

export const revalidate = 3600;

export interface InstitutionalHolder {
  organization: string;
  pctHeld: number;
  shares: number;
  reportDate: string;
}

export interface InstitutionalResult {
  ticker: string;
  companyName: string;
  price: number;
  marketCap: number;
  instPctHeld: number;       // % held by institutions
  instCount: number;          // number of institutions
  topHolders: InstitutionalHolder[];
  // RS: relative strength vs QQQ (3M)
  rs3M: number;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function getRs3M(ticker: string): Promise<number> {
  const [stockHist, benchHist] = await Promise.all([
    yahooFinance.historical(ticker, { period1: daysAgo(95), period2: new Date(), interval: '1d' }),
    yahooFinance.historical('QQQ',   { period1: daysAgo(95), period2: new Date(), interval: '1d' }),
  ]);
  const stockRet = stockHist.length > 1
    ? (stockHist[stockHist.length - 1].close - stockHist[0].close) / stockHist[0].close * 100
    : 0;
  const benchRet = benchHist.length > 1
    ? (benchHist[benchHist.length - 1].close - benchHist[0].close) / benchHist[0].close * 100
    : 0;
  return stockRet - benchRet; // positive = outperforming QQQ
}

// Process in batches to avoid Yahoo Finance rate limiting
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

export async function GET() {
  try {
    const rawResults = await batchProcess(NASDAQ_UNIVERSE, async (ticker) => {
      const [summary, quote] = await Promise.all([
        yahooFinance.quoteSummary(ticker, {
          modules: ['institutionOwnership', 'majorHoldersBreakdown', 'defaultKeyStatistics'],
        }),
        yahooFinance.quote(ticker),
      ]);

      const breakdown = summary.majorHoldersBreakdown;
      const instOwnership = summary.institutionOwnership;
      const keyStats = summary.defaultKeyStatistics;

      const topHolders: InstitutionalHolder[] = (instOwnership?.ownershipList ?? [])
        .slice(0, 6)
        .map((h: any) => ({
          organization: h.organization ?? '',
          pctHeld: h.pctHeld ?? 0,
          shares: h.position ?? 0,
          reportDate: h.reportDate
            ? new Date(h.reportDate).toISOString().slice(0, 10)
            : '',
        }));

      return {
        ticker,
        companyName: quote.shortName ?? quote.longName ?? ticker,
        price: quote.regularMarketPrice ?? 0,
        marketCap: quote.marketCap ?? 0,
        instPctHeld: breakdown?.institutionsPercentHeld ?? 0,
        instCount: breakdown?.institutionsCount ?? 0,
        topHolders,
        rs3M: 0, // filled below
      } as InstitutionalResult;
    });

    const valid = rawResults
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<InstitutionalResult>).value);

    // Fetch RS for top 20 by institutional % (speed optimization)
    const top20 = [...valid]
      .sort((a, b) => b.instPctHeld - a.instPctHeld)
      .slice(0, 20);

    const rsResults = await batchProcess(
      top20.map((t) => t.ticker),
      getRs3M,
      5,
      200
    );
    rsResults.forEach((r, i) => {
      if (r.status === 'fulfilled') top20[i].rs3M = r.value;
    });

    // Merge RS back
    const rsMap = Object.fromEntries(top20.map((t) => [t.ticker, t.rs3M]));
    valid.forEach((t) => {
      if (rsMap[t.ticker] !== undefined) t.rs3M = rsMap[t.ticker];
    });

    // Sort: high inst% + positive RS = buying signal
    valid.sort((a, b) => {
      const scoreA = a.instPctHeld * 100 + (a.rs3M > 0 ? 10 : 0);
      const scoreB = b.instPctHeld * 100 + (b.rs3M > 0 ? 10 : 0);
      return scoreB - scoreA;
    });

    return NextResponse.json({ data: valid, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch institutional data' }, { status: 500 });
  }
}
