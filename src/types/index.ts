export type CurrencySymbol = '$' | '₹' | '€' | '£' | '';

export type ActiveTab = 'dashboard' | 'inspector' | 'sql' | 'report';

export type ThemeMode = 'light' | 'dark';

export interface ColumnMetadata {
  name: string;
  type: 'DOUBLE' | 'BIGINT' | 'VARCHAR' | 'TIMESTAMP' | 'DATE' | 'UNKNOWN';
  isNumeric: boolean;
  isCategorical: boolean;
  isDate: boolean;
  sampleValues: (string | number)[];
}

export interface SanitizationStats {
  originalRows: number;
  cleanedRows: number;
  currenciesStripped: number;
  datesNormalized: number;
  nullsImputed: number;
  duplicatesRemoved: number;
  elapsedMs: number;
}

export interface DatasetMetadata {
  tableName: string;
  rowCount: number;
  columns: ColumnMetadata[];
  numericColumns: string[];
  categoricalColumns: string[];
  primaryMetric: string;
  primaryDimension: string;
  stats: SanitizationStats;
}

export type ChartType = 'bar' | 'line' | 'scatter' | 'donut' | 'area';

export type AggregationMethod = 'SUM' | 'AVG' | 'COUNT' | 'MIN' | 'MAX';

export type PaletteName = 'Neubrutal Pop' | 'Emerald High' | 'Sunset Warm' | 'Midnight Neon';

export interface ChartStudioConfig {
  chartType: ChartType;
  xAxis: string;
  yAxis: string;
  aggregation: AggregationMethod;
  palette: PaletteName;
  limit: number;
}

export interface QAResult {
  question: string;
  intentBadge: string;
  kpiLabel: string;
  kpiValue: string;
  kpiSub: string;
  explanation: string;
  sqlQuery: string;
  chartData?: Record<string, unknown>[];
  chartXKey?: string;
  chartYKey?: string;
}

export interface ExecutiveTakeaway {
  id: string;
  badge: string;
  badgeColor: string;
  title: string;
  metricHighlight: string;
  description: string;
}
