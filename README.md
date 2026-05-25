# NASDAQ Screener

Bloomberg Terminal-style dashboard for NASDAQ stock screening.

## Features

- **Sector Rotation** — 11 sector ETFs ranked by 1W/1M/3M return vs QQQ benchmark
- **Institutional Ownership** — Top institutional holders, % held, RS vs QQQ signal
- **Earnings Gap** — Post-earnings EPS surprise, gap %, and post-earnings drift

## Data Source

Yahoo Finance (via `yahoo-finance2`). Data is cached for **1 hour** by Next.js.

## Local Development

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Deploy to Vercel

### Option 1: GitHub → Vercel (Recommended)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project**
3. Import your GitHub repo
4. Click **Deploy** — no env vars needed

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel
```

## Important Notes for Vercel

**Hobby plan**: Serverless functions have a **10s timeout**.  
The `/api/institutional` route fetches ~50 tickers in batches and may occasionally exceed this.

**Fix**: Upgrade to Vercel Pro (60s timeout) OR reduce `NASDAQ_UNIVERSE` in `lib/tickers.ts` to ~20 tickers.

```ts
// lib/tickers.ts — reduce universe for Hobby plan
export const NASDAQ_UNIVERSE = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA', 'AVGO',
  'AMD', 'NFLX', 'COST', 'ADBE', 'INTU', 'PANW', 'CRWD', 'NOW',
  'ISRG', 'REGN', 'VRTX', 'AMGN',
];
```

## Project Structure

```
nasdaq-screener/
├── app/
│   ├── page.tsx                  # Main dashboard (tab UI)
│   ├── layout.tsx                # Root layout + fonts
│   ├── globals.css               # Terminal styling
│   └── api/
│       ├── sector/route.ts       # Sector ETF rotation
│       ├── institutional/route.ts # Institutional ownership
│       └── earnings/route.ts     # Earnings gap analysis
├── components/
│   ├── SectorRotation.tsx
│   ├── InstitutionalOwnership.tsx
│   └── EarningsGap.tsx
└── lib/
    └── tickers.ts                # Ticker universe config
```

## Customization

### Add more tickers to screen
Edit `NASDAQ_UNIVERSE` in `lib/tickers.ts`.

### Adjust cache duration
Change `export const revalidate = 3600` in each API route (seconds).

### Change institutional signal threshold
In `InstitutionalOwnership.tsx`:
```ts
const isBullish = row.rs3M > 5 && row.instPctHeld > 0.5;
//                         ^^^                      ^^^
//                     RS threshold           inst% threshold
```

## Disclaimer

For informational purposes only. Not financial advice.
