# Brutal // DuckDB — Zero-Server Analytics & BI Workspace

> **Production-grade, zero-server Business Intelligence and Analytics Workspace built with React 19, TypeScript, Vite, Tailwind CSS, and DuckDB-Wasm.**

All data ingestion, regex sanitization, SQL query execution, natural language questions, and chart visualizations execute **100% within the client's browser WebAssembly runtime** with zero backend API calls.

---

## ⚡ Highlights

- **100% Client-Side WebAssembly**: Powered by `@duckdb/duckdb-wasm`. No server dependencies, zero data egress, complete privacy, sub-millisecond query execution.
- **Authentic Bold Neubrutalism**: High-contrast black borders (`3px/4px solid #000000`), zero-blur hard offset shadows (`4px 4px 0px #000000`), retro-modern typography (**Space Grotesk** + **JetBrains Mono**).
- **Dual Mode System**: Strict support for Light Mode (Cream `#FFFDF5`) and Dark Mode (Obsidian `#121214`).
- **Dynamic Currency Switching**: Live toggle between `$ USD`, `₹ INR`, `€ EUR`, `£ GBP`, or `None`, updating all KPI cards and reports dynamically.
- **Client-Side Data Sanitization**: Vectorized regex strips currency markers, percentage symbols, normalizes headers to `snake_case`, and performs median/mode null imputation.
- **⚡ 25,000 Row Demo Generator**: Generates realistic enterprise datasets with messy currencies, discounts, and margins for instant testing.
- **Interactive Chart Studio**: 5 chart types (Bar, Line, Area, Donut, Scatter), dynamic metric/dimension selectors, aggregations (SUM, AVG, COUNT, MIN, MAX), and 4 color palettes.
- **Conversational Q&A Console**: Plain English natural language query resolution into deterministic DuckDB SQL queries with KPI scorecards and live charts.
- **Data Inspector**: Paginated data grid with sanitization audit metrics and clean CSV export.
- **In-Browser SQL Workspace**: Monospace SQL terminal with execution timer, preloaded query chips, and result export.
- **1-Click Executive Report**: Presentation-ready business dossier exportable as standalone offline HTML or printed to PDF.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (tested on Node v22)
- npm 9+

### Installation & Running Locally

```bash
# Clone the repository
git clone https://github.com/CyberShinobi2005/data-analyst.git
cd data-analyst

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite 6 (with worker `es` format & cross-origin isolation headers)
- **Data Engine**: `@duckdb/duckdb-wasm` + Apache Arrow
- **Styling**: Tailwind CSS (Neubrutalism preset with custom shadow offsets)
- **Charts**: Recharts
- **State Management**: Zustand
- **File Parsing**: PapaParse (CSV) + SheetJS (XLSX)
- **Icons**: Lucide React
- **Fonts**: Space Grotesk & JetBrains Mono

---

## 📄 License

MIT
