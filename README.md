# ProjectOps — Internal Ops Dashboard

Construction operations teams need visibility into schedule and budget risks across multiple active projects, but existing tools often require manual analysis or lack deterministic risk calculations. ProjectOps ingests weekly CSV snapshots from construction project management systems and automatically computes operational risk signals—schedule lag, critical path dependencies, and budget overruns—enabling data-driven decision making without manual spreadsheet analysis.

## Features

- **Deterministic risk signal calculation** — Computes schedule lag, critical path risk, and budget overburn using consistent v1 rules (no ML, reproducible results)
- **Portfolio health scoring** — Weighted health scores per project and portfolio-level aggregation
- **Bottleneck identification** — Surfaces subcontractors and trades causing schedule delays
- **Snapshot comparison** — Track changes between weekly snapshots with delta metrics
- **HTML report generation** — Automatic `dashboard_report.html` generation for each ingestion run

## Tech Stack

- **React + Vite** — Modern frontend with TypeScript
- **Node/TypeScript API** — Express server for file upload and data processing
- **Shared core package** — Centralized ingestion pipeline and signal calculations
- **Vitest** — Test suite for core logic and metrics

## Run Locally

### Development

```bash
# Install dependencies
npm install

# Start development server (API + Web UI)
npm run dev
```

Then open http://localhost:3000 in your browser. The API runs on port 3001, and the web UI runs on port 3000 with Vite's dev server.

### Tests

```bash
# Run test suite
npm test

# Run tests once (CI mode)
npm run test:run
```

### Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

### Lint

```bash
# Type-check TypeScript code
npm run lint
```

## Demo Generation

Demo data generation uses a seeded random number generator for reproducibility. The default seed (`20260215`) ensures consistent output across runs:

```bash
# Generate demo snapshot (uses default seed)
npm run demo:reset

# Or via UI: Click "Generate Demo Snapshot"
```

Each demo run produces:
- 4-8 projects with 80-140 total tasks
- Realistic risk metric ranges (10-45% behind schedule, 8-35% critical path risk, etc.)
- Deterministic results when using the same seed

The seed is stored in the run manifest for provenance. Changing the seed produces different but still realistic data distributions.

## Data Contract

Your CSV must include these columns:

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `project_id` | ✅ Yes | Unique project identifier | `PROJ-001` |
| `task_id` | ✅ Yes | Unique task identifier | `TASK-001` |
| `task_name` | ✅ Yes | Task description | `Foundation Pour` |
| `trade` | ⚠️ Warn | Trade category | `concrete`, `framing`, `electrical` |
| `subcontractor` | ⚠️ Warn | Subcontractor name | `Premier Concrete Co` |
| `planned_start` | ✅ Yes | ISO date | `2024-01-15T08:00:00Z` |
| `planned_end` | ✅ Yes | ISO date | `2024-01-20T17:00:00Z` |
| `actual_start` | No | ISO date (optional) | `2024-01-16T08:00:00Z` |
| `progress_pct` | No | 0-100 | `45` |
| `budget_allocated` | No | Dollar amount | `50000` |
| `budget_spent` | ⚠️ Warn | Dollar amount (defaults to 0) | `25000` |
| `depends_on_task_id` | No | Task dependency | `TASK-000` |
| `status` | ⚠️ Warn | Task status | `not_started`, `in_progress`, `blocked`, `done` |

**Validation Rules:**
- Hard fail: Missing `project_id`, `task_id`, `planned_start`, or `planned_end`
- Hard fail: `planned_end` < `planned_start`
- Soft warn: Missing `trade`/`subcontractor`/`status` → mapped to "unknown"
- Soft warn: `progress_pct` out of range → clamped to 0-100
- Soft warn: Missing `budget_spent` → defaults to 0

## Portfolio Notes

**Computed Metrics**: All numbers displayed in the dashboard are computed from the uploaded snapshot data, not hard-coded. The system uses deterministic calculations based on:
- Schedule lag (tasks behind planned end dates)
- Critical path dependencies (tasks blocking other tasks)
- Budget spend rates (actual vs. allocated)
- Task status distribution

**Data Integrity**: The ingestion pipeline performs comprehensive validation:
- Date validation (ensures planned_end > planned_start)
- Missing field detection (warns on optional fields, fails on required fields)
- Progress percentage clamping (0-100 range)
- Status count validation (ensures status counts sum to total tasks)

**V1 Scope**: This is a portfolio demonstration of an internal operations dashboard. Current features:
- CSV ingestion with validation
- Deterministic risk signal calculation
- Portfolio-level and per-project metrics
- Snapshot comparison

**Future Expansion** (not in current scope):
- User authentication and multi-tenant support
- Real-time integrations with construction management systems
- Persistent database storage (currently file-based)
- Advanced analytics and forecasting
- Custom alerting and notifications

## HTML Report Generation

Each CSV ingestion automatically generates a `dashboard_report.html` file in the run folder. The report includes:

- Run summary and metadata
- Project signals (risk totals, status counts)
- Per-project risk breakdown
- Top bottlenecks by subcontractor and trade
- Data quality validation results

**Access reports:**
- Via UI: Click "View full report →" link (appears when a run is selected)
- Via CLI: Reports are in `runs/{runId}/dashboard_report.html`
- Via API: `GET /api/runs/{runId}/report` returns the report path

Reports are generated synchronously during ingestion, so they're always available immediately after upload or demo generation.

## Development

### Project Structure

```
projectops/
├── apps/
│   ├── api/          # Express API server
│   ├── web/          # React frontend
│   └── cli/          # CLI tools
├── packages/
│   └── core/         # Shared ingestion and signal calculation logic
├── scripts/          # Utility scripts (demo generation, cleanup)
├── tests/            # Test suite
└── data/
    └── sample_inputs/ # Sample CSV files
```

### Scripts

- `npm run dev` — Start API + Web UI in development mode
- `npm run build` — Build for production (API + Web)
- `npm run test` — Run test suite
- `npm run lint` — Type-check TypeScript code
- `npm run demo:reset` — Reset demo data
- `npm run ingest -- <file>` — Ingest a CSV file via CLI

## License

ISC
