import React, { useState } from 'react';
import { UploadCloud, Zap, ShieldCheck, Database, BarChart2 } from 'lucide-react';
import { ingestFile, generateDemoDataset, sanitizeRawData, loadIntoDuckDB } from '../lib/duckdb';
import { useAppStore } from '../store/useAppStore';

export const EmptyHero: React.FC = () => {
  const { setDataset, setLoading, setError, isLoading, loadingMessage } = useAppStore();
  const [isDragOver, setIsDragOver] = useState(false);

  // Ingest Uploaded File
  const handleFile = async (file: File) => {
    setLoading(true, `Sanitizing ${file.name} & registering in DuckDB-Wasm...`);
    try {
      const { cleanRows, metadata } = await ingestFile(file);
      setDataset(cleanRows, metadata);
    } catch (err: any) {
      setError(err.message || 'File ingestion failed.');
    }
  };

  // One-Click 25k Demo Generator
  const handleLoadDemo = async () => {
    setLoading(true, 'Generating 25,000 enterprise records & executing DuckDB-Wasm audit...');
    // Yield to let React show loading state
    await new Promise((r) => setTimeout(r, 60));

    try {
      const rawDemo = generateDemoDataset(25000);
      const { cleanRows, metadata } = sanitizeRawData(rawDemo);
      await loadIntoDuckDB(cleanRows);
      setDataset(cleanRows, metadata);
    } catch (err: any) {
      setError(err.message || 'Failed to generate demo dataset.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Floating Hero Banner */}
      <div className="card-nb-lg p-8 sm:p-12 mb-8 bg-white dark:bg-nbdark-surface">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="badge-nb bg-nb-coral text-white">[STANDBY // NO DATA LOADED]</span>
          <span className="badge-nb bg-nb-yellow text-black">DUCKDB-WASM ACCELERATED</span>
          <span className="badge-nb bg-nb-emerald text-black">100% IN-BROWSER</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight leading-[1.05] mb-4">
          ZERO-SERVER DATA PURIFICATION &<br />
          ANALYTICS WORKSPACE
        </h1>

        <p className="text-sm sm:text-base font-medium max-w-3xl leading-relaxed text-nb-muted dark:text-nbdark-muted mb-8">
          Enterprise-grade client-side analytical dashboard executing all data ingestion, regex sanitization,
          SQL queries, natural language questions, and visualizations entirely within your browser WebAssembly sandbox.
          <strong> Zero backend servers. Zero API data leaks.</strong>
        </p>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`border-4 border-dashed border-black dark:border-nbdark-borderWhite p-8 text-center transition-colors mb-6 ${
            isDragOver ? 'bg-nb-yellow/40' : 'bg-nb-cream dark:bg-nbdark-canvas'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="p-3 border-3 border-black bg-white dark:bg-nbdark-surface shadow-nb text-nb-coral">
              <UploadCloud className="h-8 w-8" />
            </div>
            <div>
              <div className="text-base font-black uppercase tracking-tight mb-1">
                DRAG & DROP CSV OR EXCEL SPREADSHEETS HERE
              </div>
              <div className="text-xs font-mono font-bold text-nb-muted dark:text-nbdark-muted">
                Accepts .csv, .xlsx, .xls up to 100,000+ records
              </div>
            </div>

            <label className="btn-nb bg-nb-yellow text-black px-5 py-2.5 text-xs font-mono font-bold mt-2 inline-flex items-center gap-2 cursor-pointer">
              <span>BROWSE LOCAL FILES</span>
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.tsv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
            </label>
          </div>
        </div>

        {/* One-Click 25k Demo Button */}
        <div className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleLoadDemo}
            disabled={isLoading}
            className="btn-nb bg-nb-coral text-white px-8 py-3.5 text-sm sm:text-base font-black flex items-center gap-2 disabled:opacity-50"
          >
            <Zap className="h-5 w-5 fill-white" />
            <span>⚡ LOAD DEMO DATASET (25K ROWS)</span>
          </button>
          <span className="text-xs font-mono font-bold text-nb-muted dark:text-nbdark-muted">
            Instant enterprise demo: sales, departments, currencies & outliers.
          </span>
        </div>

        {isLoading && (
          <div className="mt-4 p-3 border-2 border-black bg-nb-yellow text-black text-xs font-mono font-bold animate-pulse">
            {loadingMessage || 'Processing in DuckDB-Wasm...'}
          </div>
        )}
      </div>

      {/* 3 Summary Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-nb p-6 bg-nb-yellow text-black">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5" />
            <span className="badge-nb bg-black text-white">01 // WASM INGESTION</span>
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-2">
            DuckDB-Wasm Vector Engine
          </h3>
          <p className="text-xs font-sans font-bold leading-relaxed text-black/90">
            Initializes DuckDB in a dedicated browser Web Worker with SIMD acceleration. Ingests CSV and Excel files into columnar memory.
          </p>
        </div>

        <div className="card-nb p-6 bg-nb-cyan text-black">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="h-5 w-5" />
            <span className="badge-nb bg-black text-white">02 // AUTO-PURIFICATION</span>
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-2">
            C-Engine Regex Cleaning
          </h3>
          <p className="text-xs font-sans font-bold leading-relaxed text-black/90">
            Vectorized regex sanitizes currency symbols ($ ₹ € £), strips percentage marks, normalizes headers into snake_case, and imputes nulls.
          </p>
        </div>

        <div className="card-nb p-6 bg-nb-emerald text-black">
          <div className="flex items-center gap-2 mb-3">
            <BarChart2 className="h-5 w-5" />
            <span className="badge-nb bg-black text-white">03 // REAL-TIME SUITE</span>
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight mb-2">
            SQL & Visual Intelligence
          </h3>
          <p className="text-xs font-sans font-bold leading-relaxed text-black/90">
            Natural language conversational Q&A console, interactive chart studio, in-browser SQL terminal, and 1-click printable business dossiers.
          </p>
        </div>
      </div>
    </div>
  );
};
