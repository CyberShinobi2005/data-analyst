import React, { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Trophy, PieChart as PieIcon } from 'lucide-react';
import { executeSQL } from '../lib/duckdb';
import { useAppStore } from '../store/useAppStore';

const NEUBRUTAL_PALETTE = ['#000000', '#FFDA56', '#00D8F6', '#FF5C35', '#00E599', '#5B61FF', '#FF3366', '#B872FF'];

export const DefaultDashboard: React.FC = () => {
  const { metadata, formatValue, theme } = useAppStore();
  const [topPerformers, setTopPerformers] = useState<Record<string, unknown>[]>([]);
  const [marketShare, setMarketShare] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(false);

  const isDark = theme === 'dark';
  const textColor = isDark ? '#EDEDED' : '#000000';
  const gridLineColor = isDark ? '#333333' : '#E5E7EB';

  useEffect(() => {
    if (!metadata || !metadata.primaryMetric || !metadata.primaryDimension) return;

    let isMounted = true;
    const fetchDefaultVisuals = async () => {
      setLoading(true);
      try {
        const dim = metadata.primaryDimension;
        const metric = metadata.primaryMetric;

        // Query 1: Top 10 Ranked Performers
        const qBar = `
          SELECT "${dim}" AS label, ROUND(SUM("${metric}"), 2) AS value
          FROM cleaned_data
          GROUP BY "${dim}"
          ORDER BY value DESC
          LIMIT 10;
        `;
        const resBar = await executeSQL(qBar);

        // Query 2: Category Market Share Donut
        const qPie = `
          SELECT "${dim}" AS name, ROUND(SUM("${metric}"), 2) AS value
          FROM cleaned_data
          GROUP BY "${dim}"
          ORDER BY value DESC
          LIMIT 7;
        `;
        const resPie = await executeSQL(qPie);

        if (isMounted) {
          setTopPerformers(resBar.rows);
          setMarketShare(resPie.rows);
        }
      } catch (err) {
        console.error('Failed to load default dashboard queries:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDefaultVisuals();
    return () => {
      isMounted = false;
    };
  }, [metadata]);

  if (!metadata) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Chart 1: Ranked Top 10 Performers Bar Chart */}
      <div className="card-nb p-5 bg-white dark:bg-nbdark-surface">
        <div className="flex items-center justify-between gap-2 border-b-3 border-black pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 border-2 border-black bg-nb-yellow text-black shadow-nb-sm">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-base sm:text-lg">
                TOP 10 RANKED PERFORMERS
              </h3>
              <p className="text-xs font-mono font-bold text-nb-muted dark:text-nbdark-muted">
                {metadata.primaryDimension} ranked by total {metadata.primaryMetric}
              </p>
            </div>
          </div>
          <span className="badge-nb bg-black text-white">DUCKDB // WASM</span>
        </div>

        <div className="h-80 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center font-mono font-bold text-sm">
              Executing DuckDB-WASM aggregation...
            </div>
          ) : topPerformers.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topPerformers}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <XAxis
                  type="number"
                  stroke={textColor}
                  tickLine={false}
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: textColor }}
                  tickFormatter={(v) => formatValue(v, false)}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  stroke={textColor}
                  tickLine={false}
                  width={110}
                  tick={{ fontSize: 11, fontFamily: 'Space Grotesk', fontWeight: 700, fill: textColor }}
                />
                <Tooltip
                  formatter={(val: any) => [formatValue(Number(val)), metadata.primaryMetric]}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E1E22' : '#FFFFFF',
                    border: '3px solid #000000',
                    boxShadow: '4px 4px 0px #000000',
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 700,
                  }}
                  itemStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
                />
                <Bar
                  dataKey="value"
                  fill="#FFDA56"
                  stroke="#000000"
                  strokeWidth={2}
                  radius={[0, 0, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm font-mono text-nb-muted">
              Insufficient dimension or numeric data.
            </div>
          )}
        </div>
      </div>

      {/* Chart 2: Category Market Share Donut Chart */}
      <div className="card-nb p-5 bg-white dark:bg-nbdark-surface">
        <div className="flex items-center justify-between gap-2 border-b-3 border-black pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 border-2 border-black bg-nb-cyan text-black shadow-nb-sm">
              <PieIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-black uppercase tracking-tight text-base sm:text-lg">
                CATEGORY MARKET SHARE
              </h3>
              <p className="text-xs font-mono font-bold text-nb-muted dark:text-nbdark-muted">
                Central cutout percentage contribution
              </p>
            </div>
          </div>
          <span className="badge-nb bg-nb-emerald text-black">SHARE RATIO</span>
        </div>

        <div className="h-80 w-full">
          {loading ? (
            <div className="h-full flex items-center justify-center font-mono font-bold text-sm">
              Executing DuckDB-WASM aggregation...
            </div>
          ) : marketShare.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={marketShare}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={2}
                  stroke="#000000"
                  strokeWidth={2.5}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {marketShare.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={NEUBRUTAL_PALETTE[index % NEUBRUTAL_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatValue(Number(val)), 'Total']}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E1E22' : '#FFFFFF',
                    border: '3px solid #000000',
                    boxShadow: '4px 4px 0px #000000',
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 700,
                  }}
                  itemStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm font-mono text-nb-muted">
              Insufficient dimension data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
