// Top NASDAQ large-cap universe for screening
export const NASDAQ_UNIVERSE = [
  // Mega-cap tech
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'META', 'AMZN', 'TSLA', 'AVGO',
  // Semiconductors
  'AMD', 'QCOM', 'INTC', 'TXN', 'AMAT', 'LRCX', 'KLAC', 'MRVL', 'MU', 'ASML',
  // Software
  'ADBE', 'INTU', 'SNPS', 'CDNS', 'PANW', 'CRWD', 'FTNT', 'NOW', 'CRM',
  // Internet / Consumer
  'NFLX', 'COST', 'ABNB', 'UBER', 'PYPL', 'SHOP',
  // Biotech / Healthcare
  'ISRG', 'REGN', 'VRTX', 'GILD', 'AMGN', 'MRNA', 'DXCM', 'ILMN',
  // Finance / Fintech
  'COIN', 'HOOD',
  // Other
  'ADP', 'MNST', 'ROKU', 'ZM',
];

// Sector ETF mapping
export const SECTOR_ETFS: Record<string, string> = {
  Technology:       'XLK',
  'Comm. Services': 'XLC',
  Healthcare:       'XLV',
  Financials:       'XLF',
  Energy:           'XLE',
  Industrials:      'XLI',
  'Consumer Disc':  'XLY',
  'Consumer Stpl':  'XLP',
  Materials:        'XLB',
  'Real Estate':    'XLRE',
  Utilities:        'XLU',
};

export const BENCHMARK = 'QQQ';
