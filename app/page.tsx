'use client';

import { useState, useEffect } from 'react';
import SectorRotation from '@/components/SectorRotation';
import InstitutionalOwnership from '@/components/InstitutionalOwnership';
import EarningsGap from '@/components/EarningsGap';

type Tab = 'sector' | 'institutional' | 'earnings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'sector',        label: '01 · SECTOR ROTATION' },
  { id: 'institutional', label: '02 · INSTITUTIONAL'    },
  { id: 'earnings',      label: '03 · EARNINGS GAP'     },
];

export default function Home() {
  const [tab, setTab]       = useState<Tab>('sector');
  const [clock, setClock]   = useState('');

  // Clock only runs client-side — avoids hydration mismatch
  useEffect(() => {
    const tick = () => setClock(new Date().toUTCString().slice(0, 22) + ' UTC');
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-t-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-t-green text-xs">▶</span>
          <span className="text-sm font-bold tracking-[.2em]">NASDAQ SCREENER</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-t-dim">
          <span className="w-1.5 h-1.5 rounded-full bg-t-green live inline-block" />
          {clock && <span>LIVE · {clock}</span>}
        </div>
      </header>

      <nav className="border-b border-t-border px-6 flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-3 text-[11px] tracking-widest transition-colors border-b-2 -mb-px
              ${tab === t.id
                ? 'text-t-green border-t-green'
                : 'text-t-dim border-transparent hover:text-t-text'}`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="flex-1 overflow-auto">
        {tab === 'sector'        && <SectorRotation />}
        {tab === 'institutional' && <InstitutionalOwnership />}
        {tab === 'earnings'      && <EarningsGap />}
      </main>

      <footer className="border-t border-t-border px-6 py-2 text-[10px] text-t-dim flex justify-between">
        <span>DATA: YAHOO FINANCE · CACHE: 1HR · UNIVERSE: NASDAQ TOP 38</span>
        <span>INFORMATIONAL ONLY · NOT FINANCIAL ADVICE</span>
      </footer>
    </div>
  );
}
