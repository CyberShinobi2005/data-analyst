import React from 'react';
import { Sun, Moon, Database, DollarSign, RefreshCw, Cpu } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { CurrencySymbol } from '../types';

export const Navbar: React.FC = () => {
  const {
    theme,
    toggleTheme,
    currency,
    setCurrency,
    metadata,
    clearDataset,
  } = useAppStore();

  const currencies: { label: string; symbol: CurrencySymbol }[] = [
    { label: '$ USD', symbol: '$' },
    { label: '₹ INR', symbol: '₹' },
    { label: '€ EUR', symbol: '€' },
    { label: '£ GBP', symbol: '£' },
    { label: 'None', symbol: '' },
  ];

  return (
    <header className="sticky top-0 z-50 border-b-4 border-black bg-white px-4 py-3 shadow-nb dark:border-black dark:bg-nbdark-surface no-print">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        {/* Brand Logo & Telemetry Badge */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center border-3 border-black bg-nb-coral font-black text-white shadow-nb text-xl">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight uppercase">
                BRUTAL <span className="text-nb-coral">// DUCKDB</span>
              </span>
              <span className="badge-nb bg-nb-emerald text-black hidden sm:inline-flex">
                <span className="h-2 w-2 rounded-full bg-black animate-ping" />
                WASM // 100% IN-BROWSER
              </span>
            </div>
            <div className="text-xs font-mono font-bold text-nb-muted dark:text-nbdark-muted flex items-center gap-1">
              <Cpu className="h-3 w-3 text-nb-indigo dark:text-nbdark-indigo" />
              CLIENT-SIDE VECTORIZED DATA ENGINE
            </div>
          </div>
        </div>

        {/* Right Controls Dock */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Active Dataset Pill */}
          {metadata && (
            <div className="hidden md:flex items-center gap-2 border-3 border-black bg-nb-yellow px-3 py-1.5 shadow-nb text-xs font-mono font-black text-black">
              <Database className="h-4 w-4" />
              <span>{metadata.rowCount.toLocaleString()} ROWS VERIFIED</span>
            </div>
          )}

          {/* Currency Selector */}
          <div className="flex items-center border-3 border-black bg-white dark:bg-nbdark-canvas shadow-nb">
            <span className="px-2 font-mono font-bold text-xs text-nb-muted dark:text-nbdark-muted flex items-center gap-1 border-r-2 border-black">
              <DollarSign className="h-3.5 w-3.5" />
            </span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as CurrencySymbol)}
              className="bg-transparent px-2.5 py-1.5 text-xs font-mono font-bold focus:outline-none cursor-pointer"
            >
              {currencies.map((c) => (
                <option key={c.label} value={c.symbol} className="bg-white dark:bg-nbdark-surface text-black dark:text-white">
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Theme Switcher Toggle (Sun / Moon) */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="btn-nb flex h-10 w-10 items-center justify-center bg-nb-yellow dark:bg-nbdark-yellow text-black"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5 text-black" />}
          </button>

          {/* Reset / Unload Button */}
          {metadata && (
            <button
              onClick={clearDataset}
              className="btn-nb flex items-center gap-1.5 bg-nb-pink text-white px-3 py-1.5 text-xs"
              title="Reset active dataset"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">RESET</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
