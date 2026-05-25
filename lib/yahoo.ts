const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

let _crumb = '';
let _cookie = '';
let _crumbExpiry = 0;

async function ensureCrumb(): Promise<void> {
  if (_crumb && Date.now() < _crumbExpiry) return;

  // Try multiple methods to get a valid session cookie
  const cookieMethods = [
    // Method 1: fc.yahoo.com redirect (manual = don't follow, grab cookie from redirect)
    async () => {
      const r = await fetch('https://fc.yahoo.com', {
        headers: { 'User-Agent': UA },
        redirect: 'manual',
      });
      return r.headers.get('set-cookie') ?? '';
    },
    // Method 2: finance.yahoo.com direct
    async () => {
      const r = await fetch('https://finance.yahoo.com', {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
      });
      // Node 18+ supports getSetCookie() returning array
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fn = (r.headers as any).getSetCookie;
      if (typeof fn === 'function') {
        const arr: string[] = (fn as () => string[]).call(r.headers);
        return arr.join(', ');
      }
      return r.headers.get('set-cookie') ?? '';
    },
  ];

  for (const method of cookieMethods) {
    try {
      const raw = await method();
      if (!raw) continue;
      // Extract all name=value pairs before semicolons and join
      const pairs = raw.split(/,(?=[^;]+=[^;]+;)/).map((s) => s.trim().split(';')[0]);
      _cookie = pairs.join('; ');
      if (_cookie) break;
    } catch {
      // try next method
    }
  }

  if (!_cookie) throw new Error('Could not obtain Yahoo Finance session cookie');

  const r2 = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
    headers: { 'User-Agent': UA, Cookie: _cookie },
  });
  if (!r2.ok) throw new Error(`getcrumb HTTP ${r2.status}`);
  _crumb = (await r2.text()).trim();
  if (!_crumb || _crumb.includes('<')) throw new Error('Invalid crumb response');
  _crumbExpiry = Date.now() + 3_600_000;
}

async function yf(path: string, params: Record<string, string> = {}): Promise<unknown> {
  // For chart data, try unauthenticated query2 first (faster, often works)
  if (path.startsWith('/v8/finance/chart/')) {
    try {
      const url = new URL(`https://query2.finance.yahoo.com${path}`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const r = await fetch(url.toString(), { headers: { 'User-Agent': UA } });
      if (r.ok) return r.json();
    } catch {
      // fall through to crumb method
    }
  }

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

// ── Public types ──────────────────────────────────────────────────────────────

export interface YFQuote {
  symbol: string;
  shortName?: string;
  longName?: string;
  regularMarketPrice?: number;
  regularMarketVolume?: number;
  marketCap?: number;
}

export interface YFBar {
  date: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// ── Public helpers ─────────────────────────────────────────────────────────────

export async function getQuotes(symbols: string | string[]): Promise<YFQuote[]> {
  const sym = Array.isArray(symbols) ? symbols.join(',') : symbols;
  const data = (await yf('/v7/finance/quote', { symbols: sym })) as {
    quoteResponse: { result: YFQuote[] };
  };
  return data.quoteResponse?.result ?? [];
}

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
        indicators: {
          quote: { open: number[]; high: number[]; low: number[]; close: number[]; volume: number[] }[];
        };
      }[];
    };
  };

  const result = data.chart?.result?.[0];
  if (!result) return [];
  const ts = result.timestamp ?? [];
  const q = result.indicators?.quote?.[0];
  if (!q) return [];

  return ts.map((t, i) => ({
    date:   t,
    open:   q.open[i]   ?? 0,
    high:   q.high[i]   ?? 0,
    low:    q.low[i]    ?? 0,
    close:  q.close[i]  ?? 0,
    volume: q.volume[i] ?? 0,
  }));
}

export async function getQuoteSummary(
  ticker: string,
  modules: string[]
): Promise<Record<string, unknown>> {
  const data = (await yf(`/v10/finance/quoteSummary/${ticker}`, {
    modules: modules.join(','),
  })) as { quoteSummary: { result: Record<string, unknown>[] } };
  return data.quoteSummary?.result?.[0] ?? {};
}

export function daysAgo(n: number): number {
  return Math.floor((Date.now() - n * 86_400_000) / 1000);
}

export async function batch<T>(
  items: string[],
  fn: (t: string) => Promise<T>,
  size = 5,
  delayMs = 250
): Promise<PromiseSettledResult<T>[]> {
  const out: PromiseSettledResult<T>[] = [];
  for (let i = 0; i < items.length; i += size) {
    const res = await Promise.allSettled(items.slice(i, i + size).map(fn));
    out.push(...res);
    if (i + size < items.length) await new Promise((r) => setTimeout(r, delayMs));
  }
  return out;
}
