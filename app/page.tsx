'use client';

import { useState } from 'react';
import SectorRotation from '@/components/SectorRotation';
import InstitutionalOwnership from '@/components/InstitutionalOwnership';
import EarningsGap from '@/components/EarningsGap';

type Tab = 'sector' | 'institutional' | 'earnings';

const TABS: { id: Tab; label: string; desc: string }[] = [
  { id: 'sector',        label: '01 · SECTOR ROTATION',     desc: 'Money flow by sector ETF' },
  { id: 'institutional', label: '02 · INSTITUTIONAL',        desc: 'Smart money positioning' },
  { id: 'earnings',      label: '03 · EARNINGS GAP',         desc: 'Post-earnings momentum' },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>('sector');
  const now = new Date().toUTCString().slice(0, 25);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-terminal-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-xs text-terminal-dim">▶</span>
          <h1 className="text-sm font-bold tracking-[0.2em] text-terminal-text">
            NASDAQ SCREENER
          </h1>
          <span className="text-xs text-terminal-dim">v1.0</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-terminal-dim">
          <span className="w-1.5 h-1.5 rounded-full bg-terminal-green live-dot inline-block" />
          <span>LIVE</span>
          <span className="ml-2">{now} UTC</span>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="border-b border-terminal-border px-6 flex gap-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative px-5 py-3 text-xs tracking-widest transition-colors
              ${activeTab === tab.id
                ? 'text-terminal-green border-b-2 border-terminal-green -mb-px'
                : 'text-terminal-dim hover:text-terminal-text'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'sector'        && <SectorRotation />}
        {activeTab === 'institutional' && <InstitutionalOwnership />}
        {activeTab === 'earnings'      && <EarningsGap />}
      </main>

      {/* Footer */}
      <footer className="border-t border-terminal-border px-6 py-2 flex items-center justify-between text-xs text-terminal-dim">
        <span>DATA: YAHOO FINANCE · CACHE: 1HR · UNIVERSE: NASDAQ TOP 50</span>
        <span>FOR INFORMATIONAL PURPOSES ONLY · NOT FINANCIAL ADVICE</span>
      </footer>
    </div>
  );
}
