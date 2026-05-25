const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ─── Crumb cache (module-level, reused within same serverless instance) ───────
let _crumb = '';
let _cookie = '';
let _crumbExpiry = 0;

async function ensureCrumb(): Promise<void> {
  if (_crumb && Date.now() < _crumbExpiry) return;

  // 1) Get session cookie
  const r1 = await fetch('https://finance.yahoo.com/', {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    redirect: 'follow',
  });
  const raw = r1.headers.get('set-cookie') ?? '';
  // grab the A1 cookie value used by Yahoo
  const a1 = raw.match(/A1=([^;,\s]+)/)?.[1];
  _cookie = a1 ? `A1=${a1}` : raw.split(';')[0] ?? '';

  // 2) Get crumb token
  const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: _cookie },
  });
  if (!r2.ok) throw new Error(`getcrumb failed: ${r2.status}`);
  _crumb = await r2.text();
  _crumbExpiry = Date.now() + 3_600_000; // 1 hr
}

async function yf(path: string, params: Record<string, string> = {}): Promise<unknown> {
  await ensureCrumb();
  const url = new URL(`https://query1.finance.yahoo.com${path}`);
  url.searchParams.set('crumb', _crumb);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': UA, Cookie: _cookie },
  });
  if (!res.ok) throw new Error(`Yahoo Finance ${path} [${res.status}]`);
  return res.json();
}

// ─── Public helpers ────────────────────────────────────────────────────────────

export interface YFQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketVolume?: number;
  marketCap?: number;
}

export interface YFBar {
  date: number; // unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** Single or multi-quote (comma-separated symbols) */
export async function getQuotes(symbols: string | string[]): Promise<YFQuote[]> {
  const sym = Array.isArray(symbols) ? symbols.join(',') : symbols;
  const data = (await yf('/v7/finance/quote', { symbols: sym })) as {
    quoteResponse: { result: YFQuote[] };
  };
  return data.quoteResponse?.result ?? [];
}

/** OHLCV bars */
export async function getChart(
  ticker: string,
  period1: number,
  period2: number,
  interval = '1d'
): Promise<YFBar[]> {
  const data = (await yf(`/v8/finance/chart/${ticker}`, {
    period1: String(period1),
    period2: String(period2),
    interval,
  })) as {
    chart: {
      result: {
        timestamp: number[];
        indicators: { quote: { open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }[] };
      }[];
    };
  };

  const result = data.chart?.result?.[0];
  if (!result) return [];

  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0];
  if (!q) return [];

  return ts.map((t, i) => ({
    date: t,
    open: q.open[i] ?? 0,
    high: q.high[i] ?? 0,
    low: q.low[i] ?? 0,
    close: q.close[i] ?? 0,
    volume: q.volume[i] ?? 0,
  }));
}

/** quoteSummary modules */
export async function getQuoteSummary(
  ticker: string,
  modules: string[]
): Promise<Record<string, unknown>> {
  const data = (await yf(`/v10/finance/quoteSummary/${ticker}`, {
    modules: modules.join(','),
  })) as { quoteSummary: { result: Record<string, unknown>[] } };
  return data.quoteSummary?.result?.[0] ?? {};
}

/** Helper: unix timestamp for N days ago */
export function daysAgo(n: number): number {
  return Math.floor((Date.now() - n * 86_400_000) / 1000);
}

/** Batch runner with concurrency and delay */
export async function batch<T>(
  items: string[],
  fn: (t: string) => Promise<T>,
  size = 5,
  delayMs = 250
): Promise<PromiseSettledResult<T>[]> {
  const out: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < items.length; i += size) {
    const slice = items.slice(i, i + size);
    const res = await Promise.allSettled(slice.map(fn));
    out.push(...res);
    if (i + size < items.length) await new Promise((r) => setTimeout(r, delayMs));
  }
  return out;
}
