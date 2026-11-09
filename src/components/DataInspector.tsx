import React, { useState } from 'react';
import { Download, ChevronLeft, ChevronRight, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export const DataInspector: React.FC = () => {
  const { cleanRows, metadata } = useAppStore();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  if (!metadata || cleanRows.length === 0) return null;

  const totalPages = Math.ceil(cleanRows.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const currentRows = cleanRows.slice(startIndex, startIndex + pageSize);
  const columns = metadata.columns.map((c) => c.name);

  // Instant Clean CSV Export
  const handleExportCSV = () => {
    const csvHeaders = columns.join(',');
    const csvRows = cleanRows.map((row) =>
      columns
        .map((col) => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('\n') ? `"${str}"` : str;
        })
        .join(',')
    );

    const csvContent = [csvHeaders, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `purified_dataset_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="card-nb p-6 mb-8 bg-white dark:bg-nbdark-surface">
      {/* Title & Audit Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b-3 border-black pb-4 mb-6">
        <div>
          <span className="badge-nb bg-nb-emerald text-black mb-1">[PURIFICATION ENGINE AUDIT]</span>
          <h2 className="text-2xl font-black uppercase tracking-tight">
            DATA INSPECTOR & PURIFIED AUDIT MATRIX
          </h2>
          <p className="text-xs font-mono font-bold text-nb-muted dark:text-nbdark-muted">
            Vectorized client-side sanitization output held in DuckDB-Wasm memory
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn-nb bg-nb-emerald text-black px-4 py-2.5 text-xs flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          <span>EXPORT CLEAN DATASET (.CSV)</span>
        </button>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
        <div className="border-3 border-black bg-nb-yellow p-3 text-black shadow-nb-sm">
          <div className="text-[10px] font-mono font-black uppercase">ORIGINAL ROWS</div>
          <div className="text-xl font-mono font-black">{metadata.stats.originalRows.toLocaleString()}</div>
        </div>
        <div className="border-3 border-black bg-nb-cyan p-3 text-black shadow-nb-sm">
          <div className="text-[10px] font-mono font-black uppercase">VALIDATED ROWS</div>
          <div className="text-xl font-mono font-black">{metadata.stats.cleanedRows.toLocaleString()}</div>
        </div>
        <div className="border-3 border-black bg-nb-emerald p-3 text-black shadow-nb-sm">
          <div className="text-[10px] font-mono font-black uppercase">CURRENCY STRIPPED</div>
          <div className="text-xl font-mono font-black">{metadata.stats.currenciesStripped.toLocaleString()}</div>
        </div>
        <div className="border-3 border-black bg-nb-purple p-3 text-black shadow-nb-sm">
          <div className="text-[10px] font-mono font-black uppercase">NULLS IMPUTED</div>
          <div className="text-xl font-mono font-black">{metadata.stats.nullsImputed.toLocaleString()}</div>
        </div>
        <div className="border-3 border-black bg-nb-coral p-3 text-white shadow-nb-sm">
          <div className="text-[10px] font-mono font-black uppercase">PROCESSING TIME</div>
          <div className="text-xl font-mono font-black">{metadata.stats.elapsedMs} ms</div>
        </div>
      </div>

      {/* Paginated Table Viewport */}
      <div className="overflow-x-auto border-3 border-black shadow-nb mb-4 bg-white dark:bg-nbdark-canvas">
        <table className="w-full text-left font-mono text-xs border-collapse">
          <thead>
            <tr className="border-b-3 border-black bg-nb-yellow text-black">
              <th className="p-3 border-r-2 border-black font-black uppercase">#</th>
              {columns.map((col) => (
                <th key={col} className="p-3 border-r-2 border-black font-black uppercase whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, idx) => (
              <tr
                key={startIndex + idx}
                className="border-b-2 border-black hover:bg-nb-cream dark:hover:bg-nbdark-surface transition-colors"
              >
                <td className="p-3 border-r-2 border-black font-bold opacity-60">
                  {startIndex + idx + 1}
                </td>
                {columns.map((col) => (
                  <td key={col} className="p-3 border-r-2 border-black whitespace-nowrap">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 border-3 border-black bg-nb-cream dark:bg-nbdark-surface shadow-nb">
        <div className="text-xs font-mono font-bold text-nb-muted dark:text-nbdark-muted">
          Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + pageSize, cleanRows.length)}</strong> of{' '}
          <strong>{cleanRows.length.toLocaleString()}</strong> records
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono font-bold">
            <span>Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border-2 border-black bg-white dark:bg-nbdark-canvas px-2 py-1 text-xs font-bold font-mono focus:outline-none"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn-nb bg-white dark:bg-nbdark-canvas p-1.5 text-xs disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-mono text-xs font-black px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="btn-nb bg-white dark:bg-nbdark-canvas p-1.5 text-xs disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
