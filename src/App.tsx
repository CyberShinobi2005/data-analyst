import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  Activity,
  Database,
  Layers,
  AlertTriangle,
  X,
  LayoutDashboard,
  Table,
  Terminal,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { EmptyHero } from './components/EmptyHero';
import { KpiCard } from './components/KpiCard';
import { DefaultDashboard } from './components/DefaultDashboard';
import { ChartStudio } from './components/ChartStudio';
import { AskQuestionDock } from './components/AskQuestionDock';
import { ExecutiveDossier } from './components/ExecutiveDossier';
import { DataInspector } from './components/DataInspector';
import { SqlConsole } from './components/SqlConsole';
import { useAppStore } from './store/useAppStore';
import { executeSQL } from './lib/duckdb';
import type { ActiveTab } from './types';

export const App: React.FC = () => {
  const {
    metadata,
    activeTab,
    setActiveTab,
    isLoading,
    loadingMessage,
    error,
    setError,
    formatValue,
  } = useAppStore();

  const [topKpis, setTopKpis] = useState<{
    totalVal: number;
    avgVal: number;
    uniqueDims: number;
  }>({
    totalVal: 0,
    avgVal: 0,
    uniqueDims: 0,
  });

  // Calculate 4 Neubrutal KPI metrics when metadata loads
  useEffect(() => {
    if (!metadata || !metadata.primaryMetric || !metadata.primaryDimension) return;

    let isMounted = true;
    const fetchTopKpiValues = async () => {
      try {
        const metric = metadata.primaryMetric;
        const dim = metadata.primaryDimension;

        const q = `
          SELECT 
            ROUND(SUM("${metric}"), 2) AS total_val,
            ROUND(AVG("${metric}"), 2) AS avg_val,
            COUNT(DISTINCT "${dim}") AS unique_dims
          FROM cleaned_data;
        `;
        const res = await executeSQL(q);

        if (isMounted && res.rows.length > 0) {
          setTopKpis({
            totalVal: Number(res.rows[0].total_val || 0),
            avgVal: Number(res.rows[0].avg_val || 0),
            uniqueDims: Number(res.rows[0].unique_dims || 0),
          });
        }
      } catch (err) {
        console.error('Failed to query top KPI stats:', err);
      }
    };

    fetchTopKpiValues();
    return () => {
      isMounted = false;
    };
  }, [metadata]);

  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; color: string }[] = [
    {
      id: 'dashboard',
      label: '1. EXECUTIVE DASHBOARD & STUDIO',
      icon: <LayoutDashboard className="h-4 w-4" />,
      color: 'bg-nb-yellow',
    },
    {
      id: 'inspector',
      label: '2. DATA INSPECTOR',
      icon: <Table className="h-4 w-4" />,
      color: 'bg-nb-emerald',
    },
    {
      id: 'sql',
      label: '3. IN-BROWSER SQL',
      icon: <Terminal className="h-4 w-4" />,
      color: 'bg-nb-cyan',
    },
    {
      id: 'report',
      label: '4. EXECUTIVE DOSSIER',
      icon: <FileCheck className="h-4 w-4" />,
      color: 'bg-nb-purple',
    },
  ];

  return (
    <div className="min-h-screen bg-nb-cream dark:bg-nbdark-canvas text-black dark:text-nbdark-text transition-colors">
      {/* Sticky High-Contrast Navbar */}
      <Navbar />

      {/* Global Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="card-nb p-4 bg-nb-coral text-white flex items-center justify-between gap-3 animate-shake">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div className="text-xs sm:text-sm font-mono font-bold">{error}</div>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:bg-black/20 border-2 border-white"
              title="Dismiss error"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Global Loading Overlay Banner */}
      {isLoading && (
        <div className="fixed bottom-5 right-5 z-50 card-nb p-4 bg-nb-yellow text-black flex items-center gap-3 shadow-nb-lg animate-bounce">
          <div className="h-3 w-3 bg-nb-coral rounded-full animate-ping" />
          <span className="font-mono font-black text-xs uppercase tracking-wider">
            {loadingMessage || 'DuckDB-Wasm processing query...'}
          </span>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-6">
        {!metadata ? (
          /* Empty State Hero (Dropzone & 25K Demo Button) */
          <EmptyHero />
        ) : (
          <>
            {/* 4 Neubrutal KPI Cards Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard
                title="TOTAL CORE VALUE"
                value={formatValue(topKpis.totalVal)}
                subtext={`Aggregate sum of ${metadata.primaryMetric}`}
                badgeText="AGGREGATE"
                accentColor="yellow"
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <KpiCard
                title="BENCHMARK MEAN"
                value={formatValue(topKpis.avgVal)}
                subtext={`Central mean per record`}
                badgeText="BENCHMARK"
                accentColor="emerald"
                icon={<Activity className="h-5 w-5" />}
              />
              <KpiCard
                title="RECORD VOLUME"
                value={metadata.rowCount.toLocaleString()}
                subtext="100% Vectorized DuckDB Memory"
                badgeText="VERIFIED"
                accentColor="cyan"
                icon={<Database className="h-5 w-5" />}
              />
              <KpiCard
                title="UNIQUE ENTITIES"
                value={topKpis.uniqueDims.toLocaleString()}
                subtext={`Distinct ${metadata.primaryDimension}`}
                badgeText="DIMENSION"
                accentColor="purple"
                icon={<Layers className="h-5 w-5" />}
              />
            </div>

            {/* Neubrutalist Navigation Tabs Switcher */}
            <div className="card-nb p-2 mb-6 bg-white dark:bg-nbdark-surface flex flex-wrap gap-2 items-center justify-between no-print">
              <div className="flex flex-wrap gap-2">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`btn-nb flex items-center gap-2 px-3 sm:px-4 py-2 text-xs font-mono font-black transition-all ${
                        isActive
                          ? `${tab.color} text-black translate-x-[2px] translate-y-[2px] shadow-none`
                          : 'bg-white dark:bg-nbdark-canvas text-black dark:text-white hover:bg-nb-cream'
                      }`}
                    >
                      {tab.icon}
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden xl:flex items-center gap-2 px-3 py-1 bg-nb-cream dark:bg-nbdark-canvas border-2 border-black font-mono text-[11px] font-bold">
                <Sparkles className="h-3.5 w-3.5 text-nb-coral" />
                <span>ACTIVE: {metadata.tableName} ({metadata.columns.length} COLS)</span>
              </div>
            </div>

            {/* Tab Views */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Visualizations: Top 10 Ranked Bar & Market Share Donut */}
                <DefaultDashboard />

                {/* Interactive Chart Studio */}
                <ChartStudio />

                {/* Conversational Q&A Console */}
                <AskQuestionDock />

                {/* Strategic Business Takeaways */}
                <ExecutiveDossier />
              </div>
            )}

            {activeTab === 'inspector' && (
              <div>
                <DataInspector />
              </div>
            )}

            {activeTab === 'sql' && (
              <div>
                <SqlConsole />
              </div>
            )}

            {activeTab === 'report' && (
              <div>
                <ExecutiveDossier />
              </div>
            )}
          </>
        )}
      </main>

      {/* Neubrutalist Footer */}
      <footer className="mt-12 border-t-4 border-black bg-white dark:bg-nbdark-surface py-6 px-4 no-print">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-xs uppercase tracking-tight">
              BRUTAL // DUCKDB-WASM BI PLATFORM
            </span>
            <span className="badge-nb bg-nb-yellow text-black text-[10px]">
              V1.0.0 PRODUCTION
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono font-bold">
            <span className="border-2 border-black px-2 py-0.5 bg-nb-cream dark:bg-nbdark-canvas">
              REACT 19
            </span>
            <span className="border-2 border-black px-2 py-0.5 bg-nb-cream dark:bg-nbdark-canvas">
              TYPESCRIPT 5
            </span>
            <span className="border-2 border-black px-2 py-0.5 bg-nb-cream dark:bg-nbdark-canvas">
              DUCKDB-WASM
            </span>
            <span className="border-2 border-black px-2 py-0.5 bg-nb-cream dark:bg-nbdark-canvas">
              TAILWIND CSS
            </span>
            <span className="border-2 border-black px-2 py-0.5 bg-nb-emerald text-black">
              ZERO-SERVER SANDBOX
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
