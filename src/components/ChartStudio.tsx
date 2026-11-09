import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Sliders, BarChart3, LineChart as LineIcon, PieChart as PieIcon, Activity } from 'lucide-react';
import { executeSQL } from '../lib/duckdb';
import { useAppStore } from '../store/useAppStore';
import type { ChartType, AggregationMethod, PaletteName } from '../types';

const PALETTES: Record<PaletteName, string[]> = {
  'Neubrutal Pop': ['#000000', '#FFDA56', '#00D8F6', '#FF5C35', '#00E599', '#5B61FF', '#FF3366', '#B872FF'],
  'Emerald High': ['#00E599', '#004D34', '#00D8F6', '#FFDA56', '#22C55E', '#10B981'],
  'Sunset Warm': ['#FF5C35', '#FF3366', '#FFDA56', '#FF9F1C', '#E11D48', '#BE123C'],
  'Midnight Neon': ['#00D8F6', '#00E599', '#FFDA56', '#B872FF', '#FF3366', '#FFFFFF'],
};

export const ChartStudio: React.FC = () => {
  const { metadata, formatValue, theme } = useAppStore();

  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');
  const [aggregation, setAggregation] = useState<AggregationMethod>('SUM');
  const [palette, setPalette] = useState<PaletteName>('Neubrutal Pop');
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDark = theme === 'dark';
  const textColor = isDark ? '#EDEDED' : '#000000';

  // Initialize axes when metadata arrives
  useEffect(() => {
    if (metadata) {
      if (!xAxis) setXAxis(metadata.primaryDimension);
      if (!yAxis) setYAxis(metadata.primaryMetric);
    }
  }, [metadata]);

  // Execute DuckDB aggregation whenever selections change
  useEffect(() => {
    if (!metadata || !xAxis || !yAxis) return;

    let isMounted = true;
    const runStudioQuery = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        let sql = '';
        if (chartType === 'scatter') {
          // Sample up to 1,500 points to ensure smooth browser rendering
          sql = `
            SELECT "${xAxis}" AS x_val, "${yAxis}" AS y_val
            FROM cleaned_data
            WHERE "${xAxis}" IS NOT NULL AND "${yAxis}" IS NOT NULL
            LIMIT 1500;
          `;
        } else {
          const duckAgg = aggregation;
          sql = `
            SELECT 
              CAST("${xAxis}" AS VARCHAR) AS label,
              ROUND(${duckAgg}("${yAxis}"), 2) AS value
            FROM cleaned_data
            WHERE "${xAxis}" IS NOT NULL
            GROUP BY "${xAxis}"
            ORDER BY value DESC
            LIMIT 15;
          `;
        }

        const res = await executeSQL(sql);
        if (isMounted) {
          setChartData(res.rows);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || 'Error executing chart query.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    runStudioQuery();
    return () => {
      isMounted = false;
    };
  }, [metadata, chartType, xAxis, yAxis, aggregation]);

  if (!metadata) return null;

  const currentColors = PALETTES[palette];

  return (
    <div className="card-nb p-6 mb-8 bg-white dark:bg-nbdark-surface">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b-3 border-black pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 border-2 border-black bg-nb-yellow text-black shadow-nb-sm">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xl font-black uppercase tracking-tight">
              INTERACTIVE CUSTOM CHART STUDIO
            </h3>
            <p className="text-xs font-mono font-bold text-nb-muted dark:text-nbdark-muted">
              Vectorized DuckDB-Wasm dynamic aggregation engine
            </p>
          </div>
        </div>
        <span className="badge-nb bg-nb-coral text-white">MEMORY AGGREGATION GUARD</span>
      </div>

      {/* Control Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-6 p-4 border-3 border-black bg-nb-cream dark:bg-nbdark-canvas shadow-nb">
        {/* Chart Type */}
        <div>
          <label className="block text-xs font-black uppercase mb-1 font-mono">Chart Type</label>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="w-full border-2 border-black bg-white dark:bg-nbdark-surface px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none"
          >
            <option value="bar">Bar Chart</option>
            <option value="line">Line Trend</option>
            <option value="area">Area Chart</option>
            <option value="donut">Pie / Donut</option>
            <option value="scatter">Scatter Plot</option>
          </select>
        </div>

        {/* X-Axis Dimension */}
        <div>
          <label className="block text-xs font-black uppercase mb-1 font-mono">X-Axis (Dim)</label>
          <select
            value={xAxis}
            onChange={(e) => setXAxis(e.target.value)}
            className="w-full border-2 border-black bg-white dark:bg-nbdark-surface px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none"
          >
            {metadata.columns.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name} ({c.type})
              </option>
            ))}
          </select>
        </div>

        {/* Y-Axis Metric */}
        <div>
          <label className="block text-xs font-black uppercase mb-1 font-mono">Y-Axis (Metric)</label>
          <select
            value={yAxis}
            onChange={(e) => setYAxis(e.target.value)}
            className="w-full border-2 border-black bg-white dark:bg-nbdark-surface px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none"
          >
            {(metadata.numericColumns.length > 0 ? metadata.numericColumns : metadata.columns.map((c) => c.name)).map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              )
            )}
          </select>
        </div>

        {/* Aggregation Selector */}
        <div>
          <label className="block text-xs font-black uppercase mb-1 font-mono">Aggregation</label>
          <select
            value={aggregation}
            disabled={chartType === 'scatter'}
            onChange={(e) => setAggregation(e.target.value as AggregationMethod)}
            className="w-full border-2 border-black bg-white dark:bg-nbdark-surface px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none disabled:opacity-50"
          >
            <option value="SUM">SUM</option>
            <option value="AVERAGE">AVERAGE</option>
            <option value="COUNT">COUNT</option>
            <option value="MIN">MIN</option>
            <option value="MAX">MAX</option>
          </select>
        </div>

        {/* Palette Selector */}
        <div>
          <label className="block text-xs font-black uppercase mb-1 font-mono">Palette</label>
          <select
            value={palette}
            onChange={(e) => setPalette(e.target.value as PaletteName)}
            className="w-full border-2 border-black bg-white dark:bg-nbdark-surface px-2.5 py-1.5 text-xs font-bold font-mono focus:outline-none"
          >
            <option value="Neubrutal Pop">Neubrutal Pop</option>
            <option value="Emerald High">Emerald High</option>
            <option value="Sunset Warm">Sunset Warm</option>
            <option value="Midnight Neon">Midnight Neon</option>
          </select>
        </div>
      </div>

      {/* Render Studio Chart Viewport */}
      <div className="h-96 w-full border-3 border-black bg-white dark:bg-nbdark-canvas p-4 shadow-nb">
        {loading ? (
          <div className="h-full flex items-center justify-center font-mono font-bold text-sm">
            <span className="animate-pulse">Querying DuckDB-Wasm in Worker...</span>
          </div>
        ) : errorMsg ? (
          <div className="h-full flex items-center justify-center text-sm font-mono text-nb-coral font-bold">
            {errorMsg}
          </div>
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'bar' ? (
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 40 }}>
                <XAxis
                  dataKey="label"
                  stroke={textColor}
                  tick={{ fontSize: 11, fontFamily: 'Space Grotesk', fontWeight: 700, fill: textColor }}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  stroke={textColor}
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: textColor }}
                  tickFormatter={(v) => formatValue(v, false)}
                />
                <Tooltip
                  formatter={(val: any) => [formatValue(Number(val)), yAxis]}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E1E22' : '#FFFFFF',
                    border: '3px solid #000000',
                    boxShadow: '4px 4px 0px #000000',
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 700,
                  }}
                  itemStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
                />
                <Bar dataKey="value" fill={currentColors[1]} stroke="#000000" strokeWidth={2} />
              </BarChart>
            ) : chartType === 'line' ? (
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 40 }}>
                <XAxis
                  dataKey="label"
                  stroke={textColor}
                  tick={{ fontSize: 11, fontFamily: 'Space Grotesk', fontWeight: 700, fill: textColor }}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  stroke={textColor}
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: textColor }}
                  tickFormatter={(v) => formatValue(v, false)}
                />
                <Tooltip
                  formatter={(val: any) => [formatValue(Number(val)), yAxis]}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E1E22' : '#FFFFFF',
                    border: '3px solid #000000',
                    boxShadow: '4px 4px 0px #000000',
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 700,
                  }}
                  itemStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={currentColors[1]}
                  strokeWidth={3}
                  dot={{ r: 5, stroke: '#000000', strokeWidth: 2, fill: currentColors[2] }}
                />
              </LineChart>
            ) : chartType === 'area' ? (
              <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 30, bottom: 40 }}>
                <XAxis
                  dataKey="label"
                  stroke={textColor}
                  tick={{ fontSize: 11, fontFamily: 'Space Grotesk', fontWeight: 700, fill: textColor }}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  stroke={textColor}
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: textColor }}
                  tickFormatter={(v) => formatValue(v, false)}
                />
                <Tooltip
                  formatter={(val: any) => [formatValue(Number(val)), yAxis]}
                  contentStyle={{
                    backgroundColor: isDark ? '#1E1E22' : '#FFFFFF',
                    border: '3px solid #000000',
                    boxShadow: '4px 4px 0px #000000',
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 700,
                  }}
                  itemStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#000000"
                  strokeWidth={2.5}
                  fill={currentColors[1]}
                  fillOpacity={0.8}
                />
              </AreaChart>
            ) : chartType === 'donut' ? (
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={115}
                  paddingAngle={2}
                  stroke="#000000"
                  strokeWidth={2.5}
                  label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={currentColors[index % currentColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [formatValue(Number(val)), yAxis]}
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
            ) : (
              <ScatterChart margin={{ top: 20, right: 30, left: 30, bottom: 20 }}>
                <XAxis
                  type="number"
                  dataKey="x_val"
                  name={xAxis}
                  stroke={textColor}
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: textColor }}
                />
                <YAxis
                  type="number"
                  dataKey="y_val"
                  name={yAxis}
                  stroke={textColor}
                  tick={{ fontSize: 11, fontFamily: 'JetBrains Mono', fill: textColor }}
                  tickFormatter={(v) => formatValue(v, false)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#1E1E22' : '#FFFFFF',
                    border: '3px solid #000000',
                    boxShadow: '4px 4px 0px #000000',
                    fontFamily: 'JetBrains Mono',
                    fontWeight: 700,
                  }}
                  itemStyle={{ color: isDark ? '#FFFFFF' : '#000000' }}
                />
                <Scatter
                  name="Points"
                  data={chartData}
                  fill={currentColors[1]}
                  stroke="#000000"
                  strokeWidth={1.5}
                />
              </ScatterChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-sm font-mono text-nb-muted">
            No aggregated records returned for current dimensions.
          </div>
        )}
      </div>
    </div>
  );
};
