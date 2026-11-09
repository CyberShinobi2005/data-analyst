import React, { useState } from 'react';
import { Terminal, Play, Download, AlertOctagon, Clock, Database } from 'lucide-react';
import { executeSQL } from '../lib/duckdb';
import { useAppStore } from '../store/useAppStore';

export const SqlConsole: React.FC = () => {
  const { metadata } = useAppStore();

  const [sqlQuery, setSqlQuery] = useState<string>('SELECT * FROM cleaned_data LIMIT 10;');
  const [results, setResults] = useState<{
    rows: Record<string, unknown>[];
    columns: string[];
    executionTimeMs: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!metadata) return null;

  const handleExecute = async (queryToRun?: string) => {
    const q = (queryToRun || sqlQuery).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const res = await executeSQL(q);
      setResults(res);
    } catch (err: any) {
      setError(err.message || 'SQL execution failed.');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!results || results.rows.length === 0) return;
    const cols = results.columns;
    const csvHeaders = cols.join(',');
    const csvRows = results.rows.map((r) =>
      cols
        .map((c) => {
          const val = r[c];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
        })
        .join(',')
    );

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const chip1 = 'SELECT * FROM cleaned_data LIMIT 10;';
  const chip2 = `SELECT "${metadata.primaryDimension}", COUNT(*) AS volume, ROUND(SUM("${metadata.primaryMetric}"), 2) AS total_val FROM cleaned_data GROUP BY "${metadata.primaryDimension}" ORDER BY total_val DESC LIMIT 10;`;
  const chip3 = `SELECT COUNT(*) AS total_rows, ROUND(AVG("${metadata.primaryMetric}"), 2) AS mean_metric, ROUND(MEDIAN("${metadata.primaryMetric}"), 2) AS median_metric, ROUND(MAX("${metadata.primaryMetric}"), 2) AS peak_metric FROM cleaned_data;`;

  return (
    <div className="card-nb p-6 mb-8 bg-white dark:bg-nbdark-surface">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-3 border-black pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 border-2 border-black bg-nb-yellow text-black shadow-nb-sm">
            <Terminal className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              IN-BROWSER SQL WORKSPACE (DUCKDB-WASM)
            </h3>
            <p className="text-xs font-mono font-bold text-nb-muted dark:text-nbdark-muted">
              Queried against in-memory WebAssembly table: <code>cleaned_data</code>
            </p>
          </div>
        </div>
        <span className="badge-nb bg-nb-emerald text-black">ANSI SQL // CLIENT-SIDE RUNTIME</span>
      </div>

      {/* Preset Query Chips */}
      <div className="mb-4">
        <div className="text-xs font-mono font-black uppercase text-nb-muted dark:text-nbdark-muted mb-2">
          ⚡ Preloaded Query Chips:
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              setSqlQuery(chip1);
              handleExecute(chip1);
            }}
            className="btn-nb bg-white dark:bg-nbdark-canvas px-3 py-1.5 text-xs font-mono font-bold text-black dark:text-white"
          >
            Chip 1: Top 10 Records
          </button>
          <button
            onClick={() => {
              setSqlQuery(chip2);
              handleExecute(chip2);
            }}
            className="btn-nb bg-white dark:bg-nbdark-canvas px-3 py-1.5 text-xs font-mono font-bold text-black dark:text-white"
          >
            Chip 2: Group by {metadata.primaryDimension}
          </button>
          <button
            onClick={() => {
              setSqlQuery(chip3);
              handleExecute(chip3);
            }}
            className="btn-nb bg-white dark:bg-nbdark-canvas px-3 py-1.5 text-xs font-mono font-bold text-black dark:text-white"
          >
            Chip 3: Statistical Metrics
          </button>
        </div>
      </div>

      {/* SQL Editor Area */}
      <div className="mb-4">
        <textarea
          value={sqlQuery}
          onChange={(e) => setSqlQuery(e.target.value)}
          rows={5}
          placeholder="Enter ANSI SQL query against table 'cleaned_data'..."
          className="w-full border-3 border-black bg-nb-cream dark:bg-nbdark-canvas p-4 font-mono text-sm font-bold focus:outline-none shadow-nb text-black dark:text-white"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <button
          onClick={() => handleExecute()}
          disabled={loading || !sqlQuery.trim()}
          className="btn-nb bg-nb-coral text-white px-6 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-spin font-mono">⌛</span>
          ) : (
            <>
              <Play className="h-4 w-4 fill-white" />
              <span>EXECUTE SQL QUERY</span>
            </>
          )}
        </button>

        {results && (
          <div className="flex items-center gap-3">
            <span className="badge-nb bg-nb-cyan text-black flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {results.executionTimeMs} MS
            </span>
            <span className="badge-nb bg-nb-yellow text-black flex items-center gap-1">
              <Database className="h-3.5 w-3.5" />
              {results.rows.length.toLocaleString()} ROWS RETURNED
            </span>
            <button
              onClick={handleDownloadCSV}
              className="btn-nb bg-nb-emerald text-black px-3 py-1.5 text-xs flex items-center gap-1"
            >
              <Download className="h-3.5 w-3.5" />
              <span>CSV</span>
            </button>
          </div>
        )}
      </div>

      {/* Error Callout */}
      {error && (
        <div className="border-3 border-black bg-nb-coral text-white p-4 mb-6 shadow-nb">
          <div className="flex items-center gap-2 font-mono font-black text-sm uppercase mb-1">
            <AlertOctagon className="h-5 w-5" />
            <span>DuckDB-Wasm Syntax Error</span>
          </div>
          <div className="font-mono text-xs font-bold leading-relaxed whitespace-pre-wrap">
            {error}
          </div>
        </div>
      )}

      {/* Query Results Table */}
      {results && results.rows.length > 0 && (
        <div className="overflow-x-auto border-3 border-black shadow-nb bg-white dark:bg-nbdark-canvas">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr className="border-b-3 border-black bg-nb-yellow text-black">
                <th className="p-3 border-r-2 border-black font-black uppercase">#</th>
                {results.columns.map((c) => (
                  <th key={c} className="p-3 border-r-2 border-black font-black uppercase whitespace-nowrap">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b-2 border-black hover:bg-nb-cream dark:hover:bg-nbdark-surface transition-colors"
                >
                  <td className="p-2.5 border-r-2 border-black font-bold opacity-60">
                    {idx + 1}
                  </td>
                  {results.columns.map((c) => (
                    <td key={c} className="p-2.5 border-r-2 border-black whitespace-nowrap">
                      {String(row[c] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
