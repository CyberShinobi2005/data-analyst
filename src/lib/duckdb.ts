import * as duckdb from '@duckdb/duckdb-wasm';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ColumnMetadata, DatasetMetadata, SanitizationStats } from '../types';

let dbInstance: duckdb.AsyncDuckDB | null = null;
let connInstance: duckdb.AsyncDuckDBConnection | null = null;

// Initialize DuckDB-Wasm in dedicated Web Worker with local asset bundle
export async function initDuckDB(): Promise<{ db: duckdb.AsyncDuckDB; conn: duckdb.AsyncDuckDBConnection }> {
  if (dbInstance && connInstance) {
    return { db: dbInstance, conn: connInstance };
  }

  try {
    const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
      mvp: {
        mainModule: '/duckdb/duckdb-mvp.wasm',
        mainWorker: '/duckdb/duckdb-browser-mvp.worker.js',
      },
      eh: {
        mainModule: '/duckdb/duckdb-eh.wasm',
        mainWorker: '/duckdb/duckdb-browser-eh.worker.js',
      },
    };

    let bundle: duckdb.DuckDBBundle;
    try {
      bundle = await duckdb.selectBundle(MANUAL_BUNDLES);
    } catch {
      // Fallback to jsdelivr if local worker bundle isn't available
      const JSDELIVR_BUNDLES = duckdb.getJsDelivrBundles();
      bundle = await duckdb.selectBundle(JSDELIVR_BUNDLES);
    }

    const worker = new Worker(bundle.mainWorker!);
    const logger = new duckdb.VoidLogger();
    const db = new duckdb.AsyncDuckDB(logger, worker);

    await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
    const conn = await db.connect();

    dbInstance = db;
    connInstance = conn;

    return { db, conn };
  } catch (err) {
    console.error('Failed to initialize DuckDB-Wasm:', err);
    throw new Error('DuckDB-Wasm initialization failed. Check WebAssembly support in your browser.');
  }
}

// Convert Apache Arrow Table into an array of JS objects
export function arrowTableToJSON(table: any): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  const fields = table.schema.fields.map((f: any) => f.name);
  const numRows = table.numRows;

  for (let i = 0; i < numRows; i++) {
    const row: Record<string, unknown> = {};
    for (const field of fields) {
      const col = table.getChild(field);
      const val = col ? col.get(i) : null;
      // Convert BigInt to number if safe
      if (typeof val === 'bigint') {
        row[field] = Number(val);
      } else {
        row[field] = val;
      }
    }
    rows.push(row);
  }
  return rows;
}

// Execute arbitrary SQL query against DuckDB-Wasm
export async function executeSQL(sql: string): Promise<{
  rows: Record<string, unknown>[];
  columns: string[];
  executionTimeMs: number;
}> {
  const { conn } = await initDuckDB();
  const startTime = performance.now();

  const arrowResult = await conn.query(sql);
  const rows = arrowTableToJSON(arrowResult);
  const executionTimeMs = performance.now() - startTime;

  const columns = arrowResult.schema.fields.map((f: any) => f.name);
  return { rows, columns, executionTimeMs: Math.round(executionTimeMs * 100) / 100 };
}

// Clean and sanitize raw ingested rows
export function sanitizeRawData(rawRows: Record<string, unknown>[]): {
  cleanRows: Record<string, unknown>[];
  metadata: DatasetMetadata;
} {
  const start = performance.now();
  const originalRows = rawRows.length;
  if (originalRows === 0) {
    throw new Error('Cannot sanitize empty dataset.');
  }

  // 1. Normalize Column Headers to snake_case
  const rawHeaders = Object.keys(rawRows[0]);
  const headerMap: Record<string, string> = {};
  const seen: Record<string, number> = {};

  for (const h of rawHeaders) {
    let clean = h.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (!clean) clean = 'col';
    if (clean in seen) {
      seen[clean]++;
      clean = `${clean}_${seen[clean]}`;
    } else {
      seen[clean] = 0;
    }
    headerMap[h] = clean;
  }

  const cleanHeaders = Object.values(headerMap);
  let currenciesStripped = 0;
  let datesNormalized = 0;
  let nullsImputed = 0;

  // 2. Identify Column Types and Clean Values
  // Sample the first 100 rows to detect format
  const sampleSize = Math.min(originalRows, 100);
  const isCurrencyOrNumericCol: Record<string, boolean> = {};
  const isDateCol: Record<string, boolean> = {};

  for (const [rawH, cleanH] of Object.entries(headerMap)) {
    let numericHits = 0;
    let dateHits = 0;

    for (let i = 0; i < sampleSize; i++) {
      const val = rawRows[i]?.[rawH];
      if (val !== undefined && val !== null && val !== '') {
        const strVal = String(val).trim();
        // Check for currency or numeric punctuation
        if (/[$₹€£¥%]/.test(strVal) || /^[+-]?[\d,]+(\.\d+)?$/.test(strVal)) {
          numericHits++;
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(strVal) || /date|time|timestamp/i.test(cleanH)) {
          dateHits++;
        }
      }
    }

    if (numericHits / sampleSize >= 0.6) {
      isCurrencyOrNumericCol[cleanH] = true;
    }
    if (dateHits / sampleSize >= 0.6) {
      isDateCol[cleanH] = true;
    }
  }

  // 3. Process all rows
  const cleanRows: Record<string, unknown>[] = [];
  const colValuesForMedian: Record<string, number[]> = {};
  for (const cleanH of cleanHeaders) {
    if (isCurrencyOrNumericCol[cleanH]) {
      colValuesForMedian[cleanH] = [];
    }
  }

  for (let i = 0; i < originalRows; i++) {
    const raw = rawRows[i];
    const cleanRow: Record<string, unknown> = {};

    for (const [rawH, cleanH] of Object.entries(headerMap)) {
      const val = raw[rawH];

      if (val === null || val === undefined || val === '') {
        cleanRow[cleanH] = null;
        nullsImputed++;
        continue;
      }

      if (isCurrencyOrNumericCol[cleanH]) {
        if (typeof val === 'number') {
          cleanRow[cleanH] = val;
          colValuesForMedian[cleanH].push(val);
        } else {
          const str = String(val).replace(/[$₹€£¥%,\s]/g, '');
          const num = parseFloat(str);
          if (!isNaN(num)) {
            cleanRow[cleanH] = num;
            colValuesForMedian[cleanH].push(num);
            currenciesStripped++;
          } else {
            cleanRow[cleanH] = null;
            nullsImputed++;
          }
        }
      } else if (isDateCol[cleanH]) {
        try {
          const d = new Date(String(val));
          if (!isNaN(d.getTime())) {
            cleanRow[cleanH] = d.toISOString().split('T')[0];
            datesNormalized++;
          } else {
            cleanRow[cleanH] = String(val).trim();
          }
        } catch {
          cleanRow[cleanH] = String(val).trim();
        }
      } else {
        cleanRow[cleanH] = String(val).trim();
      }
    }
    cleanRows.push(cleanRow);
  }

  // Calculate medians for null imputation
  const medians: Record<string, number> = {};
  for (const [col, vals] of Object.entries(colValuesForMedian)) {
    if (vals.length > 0) {
      vals.sort((a, b) => a - b);
      const mid = Math.floor(vals.length / 2);
      medians[col] = vals.length % 2 !== 0 ? vals[mid] : (vals[mid - 1] + vals[mid]) / 2;
    } else {
      medians[col] = 0;
    }
  }

  // Impute nulls with medians and 'Unassigned'
  for (const row of cleanRows) {
    for (const cleanH of cleanHeaders) {
      if (row[cleanH] === null) {
        if (isCurrencyOrNumericCol[cleanH]) {
          row[cleanH] = medians[cleanH] ?? 0;
        } else {
          row[cleanH] = 'Unassigned';
        }
      }
    }
  }

  // 4. Build Metadata
  const columnsMeta: ColumnMetadata[] = cleanHeaders.map((colName) => {
    const isNum = !!isCurrencyOrNumericCol[colName];
    const isDate = !!isDateCol[colName];
    const isCat = !isNum && !isDate;
    const samples = cleanRows.slice(0, 5).map((r) => r[colName] as string | number);

    return {
      name: colName,
      type: isNum ? 'DOUBLE' : isDate ? 'DATE' : 'VARCHAR',
      isNumeric: isNum,
      isCategorical: isCat,
      isDate: isDate,
      sampleValues: samples,
    };
  });

  const numericCols = columnsMeta.filter((c) => c.isNumeric).map((c) => c.name);
  const categoricalCols = columnsMeta.filter((c) => c.isCategorical).map((c) => c.name);

  // Pick representative primary metric and primary dimension
  let primaryMetric = numericCols[0] || cleanHeaders[0];
  for (const candidate of ['revenue', 'sales', 'total', 'amount', 'profit', 'value', 'cost']) {
    const found = numericCols.find((c) => c.includes(candidate));
    if (found) {
      primaryMetric = found;
      break;
    }
  }

  let primaryDimension = categoricalCols[0] || cleanHeaders[0];
  for (const candidate of ['category', 'department', 'region', 'segment', 'rep', 'status', 'name']) {
    const found = categoricalCols.find((c) => c.includes(candidate));
    if (found) {
      primaryDimension = found;
      break;
    }
  }

  const elapsedMs = Math.round((performance.now() - start) * 100) / 100;

  const stats: SanitizationStats = {
    originalRows,
    cleanedRows: cleanRows.length,
    currenciesStripped,
    datesNormalized,
    nullsImputed,
    duplicatesRemoved: 0,
    elapsedMs,
  };

  const metadata: DatasetMetadata = {
    tableName: 'cleaned_data',
    rowCount: cleanRows.length,
    columns: columnsMeta,
    numericColumns: numericCols,
    categoricalColumns: categoricalCols,
    primaryMetric,
    primaryDimension,
    stats,
  };

  return { cleanRows, metadata };
}

// Register sanitized rows into DuckDB-Wasm in-memory table `cleaned_data`
export async function loadIntoDuckDB(cleanRows: Record<string, unknown>[]): Promise<void> {
  const { db, conn } = await initDuckDB();

  // Serialize to JSON string and register as virtual file
  const jsonContent = JSON.stringify(cleanRows);
  await db.registerFileText('temp_import.json', jsonContent);

  // Ingest via read_json_auto into DuckDB columnar table
  await conn.query(`
    DROP TABLE IF EXISTS cleaned_data;
    CREATE TABLE cleaned_data AS SELECT * FROM read_json_auto('temp_import.json');
  `);

  // Cleanup virtual file
  await db.dropFile('temp_import.json');
}

// Ingest CSV or Excel file directly from browser File object
export async function ingestFile(file: File): Promise<{
  cleanRows: Record<string, unknown>[]
  metadata: DatasetMetadata
}> {
  const extension = file.name.split('.').pop()?.toLowerCase();

  let rawRows: Record<string, unknown>[] = [];

  if (extension === 'csv' || extension === 'tsv' || extension === 'txt') {
    rawRows = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        dynamicTyping: false,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data as Record<string, unknown>[]),
        error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
      });
    });
  } else if (extension === 'xlsx' || extension === 'xls') {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' });
  } else {
    throw new Error(`Unsupported file type: .${extension}. Please upload .csv or .xlsx.`);
  }

  const { cleanRows, metadata } = sanitizeRawData(rawRows);
  await loadIntoDuckDB(cleanRows);

  return { cleanRows, metadata };
}

// High-speed 25,000 Row Enterprise Demo Dataset Generator
export function generateDemoDataset(numRecords: number = 25000): Record<string, unknown>[] {
  const regions = ['North America', 'EMEA', 'Asia Pacific', 'Latin America', 'Global Enterprise'];
  const departments = ['Cloud Solutions', 'Cybersecurity', 'FinTech Systems', 'AI Platform', 'Hardware Ops'];
  const segments = ['Enterprise Tier 1', 'Strategic Mid-Market', 'SMB Growth', 'Public Sector', 'Global Channel'];
  const categories = ['Platform Subscriptions', 'Professional Services', 'Compute Clusters', 'API Tokens', 'Support Retainers'];
  const reps = ['Elena Rostova', 'Marcus Brody', 'Chen Wei', 'Sarah Connor', 'Alex Vance', 'David Miller'];

  const rows: Record<string, unknown>[] = [];
  const baseDate = new Date('2026-11-01').getTime();

  for (let i = 0; i < numRecords; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const dateStr = new Date(baseDate - daysAgo * 86400000).toISOString().split('T')[0];

    const revBase = Math.round((Math.exp(Math.random() * 2.2) * 450 + 200) * 100) / 100;
    // Messy currency strings to demonstrate client-side regex cleaning
    const revFormatted = Math.random() > 0.4 ? `$${revBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : `€${revBase.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    const unitCost = Math.random() > 0.05 ? Math.round(revBase * (0.35 + Math.random() * 0.35) * 100) / 100 : '';
    const quantity = Math.floor(Math.random() * 45) + 1;
    const discount = `${Math.floor(Math.random() * 25)}%`;
    const profitMargin = Math.round(((revBase - (typeof unitCost === 'number' ? unitCost : revBase * 0.5)) / revBase) * 10000) / 100;

    rows.push({
      'Transaction ID': `TXN-${100000 + i}`,
      'Date': dateStr,
      'Region': regions[Math.floor(Math.random() * regions.length)],
      'Department': departments[Math.floor(Math.random() * departments.length)],
      'Customer Segment': segments[Math.floor(Math.random() * segments.length)],
      'Product Category': categories[Math.floor(Math.random() * categories.length)],
      'REVENUE ($)': revFormatted,
      'Unit Cost': unitCost,
      'Quantity': quantity,
      'Discount Pct': discount,
      'Profit Margin %': profitMargin,
      'Sales Rep': reps[Math.floor(Math.random() * reps.length)],
    });
  }

  return rows;
}
