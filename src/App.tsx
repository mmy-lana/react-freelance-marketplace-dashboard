import React, { useState } from 'react';

type TabView = 'explorer' | 'dashboard' | 'orders' | 'earnings';

export default function App(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<TabView>('explorer');

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/95 backdrop-blur px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-lg">
              F
            </span>
            <span className="font-bold tracking-tight text-lg sm:text-xl text-white">
              GigHub
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            {(['explorer', 'dashboard', 'orders', 'earnings'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition capitalize ${
                  activeTab === tab
                    ? 'bg-slate-800 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              Level 2 Seller
            </span>
            <div className="h-8 w-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-semibold">
              JD
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 pb-[calc(var(--nav-bottom-height)+24px)] md:pb-8">
        <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-6 sm:p-8 text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-white capitalize mb-2">
            {activeTab} View
          </h1>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Freelance Marketplace Dashboard initialized with creative gig layout architecture.
          </p>
        </div>
      </main>

      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 h-[var(--nav-bottom-height)] border-t border-slate-800 bg-slate-900/95 backdrop-blur px-4 flex items-center justify-around"
      >
        {(['explorer', 'dashboard', 'orders', 'earnings'] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex flex-col items-center justify-center min-w-[48px] min-h-[48px] text-xs font-medium capitalize transition ${
              activeTab === tab ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </nav>
    </div>
  );
}
