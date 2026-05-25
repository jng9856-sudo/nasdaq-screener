import { NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';
const yahooFinance = new YahooFinance();
import { SECTOR_ETFS, BENCHMARK } from '@/lib/tickers';

export const revalidate = 3600; // cache 1hr

export interface SectorData {
  sector: string;
  ticker: string;
  ret1W: number;
  ret1M: number;
  ret3M: number;
  price: number;
  volume: number;
}

function pctReturn(prices: number[]): number {
  if (prices.length < 2) return 0;
  return ((prices[prices.length - 1] - prices[0]) / prices[0]) * 100;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function GET() {
  try {
    const allTickers = [...Object.values(SECTOR_ETFS), BENCHMARK];

    const results = await Promise.allSettled(
      allTickers.map(async (ticker) => {
        const [hist3M, quote] = await Promise.all([
          yahooFinance.historical(ticker, {
            period1: daysAgo(95),
            period2: new Date(),
            interval: '1d',
          }),
          yahooFinance.quote(ticker),
        ]);

        const closes = hist3M.map((d) => d.close).filter(Boolean) as number[];
        const len = closes.length;

        // Approximate slice indices
        const idx1W = Math.max(0, len - 6);
        const idx1M = Math.max(0, len - 22);

        return {
          ticker,
          ret1W: pctReturn(closes.slice(idx1W)),
          ret1M: pctReturn(closes.slice(idx1M)),
          ret3M: pctReturn(closes),
          price: quote.regularMarketPrice ?? 0,
          volume: quote.regularMarketVolume ?? 0,
        };
      })
    );

    const benchmark = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<any>).value)
      .find((r) => r.ticker === BENCHMARK);

    const sectorData: SectorData[] = Object.entries(SECTOR_ETFS)
      .map(([sector, ticker]) => {
        const found = results
          .filter((r) => r.status === 'fulfilled')
          .map((r) => (r as PromiseFulfilledResult<any>).value)
          .find((r) => r.ticker === ticker);

        return found ? { sector, ...found } : null;
      })
      .filter(Boolean) as SectorData[];

    // Sort by 1M return descending
    sectorData.sort((a, b) => b.ret1M - a.ret1M);

    return NextResponse.json({
      data: sectorData,
      benchmark,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch sector data' }, { status: 500 });
  }
}
