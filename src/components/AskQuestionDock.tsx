import React, { useState } from 'react';
import { MessageSquare, Sparkles, Send, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { executeSQL } from '../lib/duckdb';
import { useAppStore } from '../store/useAppStore';
import type { QAResult } from '../types';

export const AskQuestionDock: React.FC = () => {
  const { metadata, formatValue, currency, theme } = useAppStore();

  const [inputQuery, setInputQuery] = useState('');
  const [qaResult, setQaResult] = useState<QAResult | null>(null);
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';
  const textColor = isDark ? '#EDEDED' : '#000000';

  if (!metadata) return null;

  const quickChips = [
    { label: '💡 Avg Unit Cost by Dept', query: 'average unit cost by department' },
    { label: '💡 Top 5 Sales Reps', query: 'top 5 sales reps by revenue' },
    { label: '💡 Quantity by Region', query: 'total quantity by region' },
    { label: '💡 Total Row Count', query: 'how many rows in the dataset?' },
  ];

  // Heuristic Natural Language Intent to DuckDB-Wasm SQL Resolver
  const handleAsk = async (queryText: string) => {
    const q = queryText.trim().toLowerCase();
    if (!q) return;

    setLoading(true);

    try {
      const numCols = metadata.numericColumns;
      const catCols = metadata.categoricalColumns;

      // Match Metric
      let targetMetric = metadata.primaryMetric;
      const metricSynonyms: Record<string, string[]> = {
        revenue: ['revenue', 'sales', 'turnover', 'income', 'rev', 'gross', 'earnings'],
        unit_cost: ['cost', 'unit cost', 'expense', 'cogs', 'spending'],
        quantity: ['quantity', 'volume', 'units', 'qty', 'items', 'count of items'],
        discount_pct: ['discount', 'rebate', 'discount pct'],
        profit_margin: ['margin', 'profit', 'profitability', 'markup'],
      };

      // Direct Metric matching
      for (const col of numCols) {
        const colFormatted = col.toLowerCase().replace(/_/g, ' ');
        if (q.includes(col.toLowerCase()) || q.includes(colFormatted)) {
          targetMetric = col;
          break;
        }
      }

      if (targetMetric === metadata.primaryMetric) {
        for (const [canonical, aliases] of Object.entries(metricSynonyms)) {
          if (numCols.includes(canonical)) {
            if (aliases.some((a) => q.includes(a))) {
              targetMetric = canonical;
              break;
            }
          }
        }
      }

      // Match Dimension
      let targetDim = metadata.primaryDimension;
      const dimSynonyms: Record<string, string[]> = {
        sales_rep: ['rep', 'sales rep', 'agent', 'person', 'salesperson', 'seller', 'employee'],
        region: ['region', 'territory', 'geography', 'location', 'area', 'zone'],
        department: ['department', 'dept', 'team', 'division', 'unit', 'group'],
        product_category: ['category', 'product', 'offering', 'service', 'item type'],
        customer_segment: ['segment', 'customer', 'client', 'tier'],
      };

      // Direct Dimension matching
      for (const col of catCols) {
        const colFormatted = col.toLowerCase().replace(/_/g, ' ');
        if (q.includes(col.toLowerCase()) || q.includes(colFormatted)) {
          targetDim = col;
          break;
        }
      }

      if (targetDim === metadata.primaryDimension) {
        for (const [canonical, aliases] of Object.entries(dimSynonyms)) {
          if (catCols.includes(canonical)) {
            if (aliases.some((a) => q.includes(a))) {
              targetDim = canonical;
              break;
            }
          }
        }
      }

      // Check Intent 1: Row count / Volume
      if (q.includes('how many rows') || q.includes('count rows') || q.includes('total rows') || q.includes('record count')) {
        const sql = `SELECT COUNT(*) AS total_rows FROM cleaned_data;`;
        const res = await executeSQL(sql);
        const count = Number(res.rows[0]?.total_rows || 0);

        setQaResult({
          question: queryText,
          intentBadge: '[INTENT: DATASET ROW VOLUME]',
          kpiLabel: 'TOTAL VERIFIED RECORDS',
          kpiValue: count.toLocaleString(),
          kpiSub: `${metadata.columns.length} columns stored in WebAssembly memory`,
          explanation: `The dataset holds exactly **${count.toLocaleString()} rows** in DuckDB columnar memory.`,
          sqlQuery: sql,
        });
        return;
      }

      // Check Aggregation Type
      let aggFunc = 'SUM';
      let aggLabel = 'Total';
      if (q.includes('average') || q.includes('mean') || q.includes('avg')) {
        aggFunc = 'AVG';
        aggLabel = 'Average';
      } else if (q.includes('max') || q.includes('highest') || q.includes('top') || q.includes('peak')) {
        aggFunc = 'MAX';
        aggLabel = 'Peak';
      } else if (q.includes('min') || q.includes('lowest') || q.includes('bottom')) {
        aggFunc = 'MIN';
        aggLabel = 'Lowest';
      }

      // Check Limit
      let limit = 10;
      const limitMatch = q.match(/\b(?:top|first|bottom|last)\s+(\d+)\b/);
      if (limitMatch) {
        limit = Math.min(25, Math.max(1, parseInt(limitMatch[1], 10)));
      }

      const isBottom = q.includes('bottom') || q.includes('lowest');
      const sortOrder = isBottom ? 'ASC' : 'DESC';

      // Execute Grouped Aggregation
      const sql = `
        SELECT 
          CAST("${targetDim}" AS VARCHAR) AS dim_label, 
          ROUND(${aggFunc}("${targetMetric}"), 2) AS metric_val
        FROM cleaned_data
        WHERE "${targetDim}" IS NOT NULL AND "${targetMetric}" IS NOT NULL
        GROUP BY "${targetDim}"
        ORDER BY metric_val ${sortOrder}
        LIMIT ${limit};
      `;

      const res = await executeSQL(sql);
      const topRow = res.rows[0];
      const topLabel = String(topRow?.dim_label || 'N/A');
      const topVal = Number(topRow?.metric_val || 0);

      const isCurrency = targetMetric.includes('revenue') || targetMetric.includes('cost');
      const formattedVal = formatValue(topVal, isCurrency);

      setQaResult({
        question: queryText,
        intentBadge: `[INTENT: ${aggLabel.toUpperCase()} ${targetMetric.toUpperCase()} BY ${targetDim.toUpperCase()}]`,
        kpiLabel: `LEADING ${targetDim.toUpperCase()} (${aggLabel.toUpperCase()})`,
        kpiValue: formattedVal,
        kpiSub: `${topLabel} (${targetMetric})`,
        explanation: `**${topLabel}** leads with **${formattedVal}** in ${aggLabel.toLowerCase()} \`${targetMetric}\`.`,
        sqlQuery: sql,
        chartData: res.rows.map((r) => ({
          label: r.dim_label,
          val: r.metric_val,
        })),
        chartXKey: 'label',
        chartYKey: 'val',
      });
    } catch (err: any) {
      console.error('Q&A resolution error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-nb p-6 mb-8 bg-white dark:bg-nbdark-surface">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-3 border-black pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 border-2 border-black bg-nb-emerald text-black shadow-nb-sm">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              CONVERSATIONAL Q&A CONSOLE ("ASK YOUR DATA")
            </h3>
            <p className="text-xs font-mono font-bold text-nb-muted dark:text-nbdark-muted">
              Heuristic Natural Language to DuckDB-Wasm deterministic SQL resolver
            </p>
          </div>
        </div>
        <span className="badge-nb bg-nb-yellow text-black flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          ZERO BACKEND API // 100% CLIENT-SIDE
        </span>
      </div>

      {/* Suggested Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {quickChips.map((chip) => (
          <button
            key={chip.label}
            onClick={() => {
              setInputQuery(chip.query);
              handleAsk(chip.query);
            }}
            className="btn-nb bg-white dark:bg-nbdark-canvas px-3 py-1 text-xs font-mono font-bold text-black dark:text-white"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Search Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(inputQuery);
        }}
        className="flex gap-2 mb-6"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Ask anything in English: e.g., 'What is the average revenue by department?' or 'Top 5 sales reps'..."
          className="flex-1 border-3 border-black bg-white dark:bg-nbdark-canvas px-4 py-2.5 text-sm font-bold font-mono focus:outline-none shadow-nb"
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="btn-nb bg-nb-coral text-white px-5 py-2.5 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <span className="animate-spin font-mono">⌛</span>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>ASK</span>
            </>
          )}
        </button>
      </form>

      {/* Result Card */}
      {qaResult && (
        <div className="border-3 border-black bg-nb-cream dark:bg-nbdark-canvas p-5 shadow-nb">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3 mb-4">
            <span className="badge-nb bg-nb-yellow text-black">{qaResult.intentBadge}</span>
            <span className="text-xs font-mono text-nb-muted dark:text-nbdark-muted">
              Query: "{qaResult.question}"
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Answer Scorecard */}
            <div className="border-3 border-black bg-white dark:bg-nbdark-surface p-4 shadow-nb flex flex-col justify-between">
              <div>
                <div className="text-xs font-mono font-black uppercase text-nb-muted dark:text-nbdark-muted mb-1">
                  {qaResult.kpiLabel}
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-black text-nb-coral my-1">
                  {qaResult.kpiValue}
                </div>
                <div className="text-xs font-mono font-bold mt-1 text-black dark:text-white">
                  {qaResult.kpiSub}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t-2 border-black text-xs font-mono text-nb-muted dark:text-nbdark-muted">
                {qaResult.explanation}
              </div>
            </div>

            {/* Supplementary Chart */}
            <div className="md:col-span-2 border-3 border-black bg-white dark:bg-nbdark-surface p-4 shadow-nb">
              <div className="text-xs font-mono font-bold uppercase mb-2">
                Comparative Breakdown ({qaResult.chartData?.length || 0} entities)
              </div>
              <div className="h-48 w-full">
                {qaResult.chartData && qaResult.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={qaResult.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                      <XAxis
                        dataKey="label"
                        stroke={textColor}
                        tick={{ fontSize: 10, fontFamily: 'Space Grotesk', fontWeight: 700, fill: textColor }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis
                        stroke={textColor}
                        tick={{ fontSize: 10, fontFamily: 'JetBrains Mono', fill: textColor }}
                        tickFormatter={(v) => formatValue(v, false)}
                      />
                      <Tooltip
                        formatter={(val: any) => [formatValue(Number(val)), 'Result']}
                        contentStyle={{
                          backgroundColor: isDark ? '#1E1E22' : '#FFFFFF',
                          border: '3px solid #000000',
                          boxShadow: '4px 4px 0px #000000',
                          fontFamily: 'JetBrains Mono',
                          fontWeight: 700,
                        }}
                        itemStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
                      />
                      <Bar dataKey="val" fill="#00D8F6" stroke="#000000" strokeWidth={2} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center font-mono text-xs text-nb-muted">
                    No visual distribution required for this query.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Generated SQL query preview */}
          <div className="mt-4 pt-3 border-t-2 border-black flex items-center justify-between gap-2 text-[11px] font-mono text-nb-muted dark:text-nbdark-muted">
            <span className="truncate">
              <strong>DuckDB SQL:</strong> <code>{qaResult.sqlQuery.replace(/\s+/g, ' ')}</code>
            </span>
            <span className="badge-nb bg-black text-white shrink-0">WASM EXECUTED</span>
          </div>
        </div>
      )}
    </div>
  );
};
