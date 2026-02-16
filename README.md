# ProjectOps

**Construction Schedule & Budget Risk Monitor**

ProjectOps is a deterministic operational analytics engine that converts raw construction project exports into structured decision signals with reproducible run snapshots. It identifies schedule delays, budget overruns, and dependency bottlenecks across multiple projects to help construction operations teams make data-driven decisions.

## Who It's For

- **Construction Operations Managers** monitoring multiple active projects
- **Project Managers** tracking schedule and budget risks
- **Operations Analysts** analyzing project health and bottlenecks

## What Decisions It Supports

- **Schedule Risk**: Identify tasks behind schedule and critical path dependencies at risk
- **Budget Overburn**: Detect tasks overspending and project projected overruns
- **Dependency Bottlenecks**: Surface subcontractors and trades causing schedule lag

## Quickstart

### Development

```bash
# Install dependencies
npm install

# Start the web application (API + UI)
npm run dev
```

Then:
1. Open http://localhost:3000
2. Click **"Generate Demo Run"** to create a sample dataset
3. Or click **"Upload Weekly Snapshot CSV"** to upload your own data

The dashboard will automatically load and display project health scores, risk metrics, and per-project summaries.

### Production

```bash
# Build for production
npm run build

# Start production server
npm start
```

The production server runs on http://localhost:3001 and serves both the API and static web files.

## CLI Usage (Optional)

For batch processing or automation:

```bash
# Ingest a CSV file
npm run ingest -- data/sample_inputs/projectops_tasks.csv

# Generate a sample dataset
npm run gen:sample -- --seed 42 --projects 3 --tasks 25
```

## Input CSV Schema

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

## Output Artifacts

Each ingestion run creates a timestamped folder in `runs/` containing:

| File | Description |
|------|-------------|
| `manifest.json` | Run metadata: label, source type, row counts, timestamps |
| `raw.csv` | Original input CSV (preserved) |
| `normalized_tasks.json` | Canonical task data with validation results |
| `validation_report.json` | Data quality summary: rejected rows, warnings |
| `project_signals.json` | Computed metrics: health scores, bottlenecks, per-project risks |
| `dashboard_report.html` | Static HTML report (openable in browser) |

## Screenshots

<!-- TODO: Add screenshots -->
- Executive Snapshot with Project Health Score
- Per-Project Risk Summary Table
- Schedule Lag Bottlenecks by Subcontractor/Trade
- Data Reliability Summary

## Design Principles

- **Deterministic**: No machine learning or randomness—same input produces same output. Demo runs use seeded random number generation (default seed: 42) for reproducible results.
- **Reproducible Snapshots**: Each run is an immutable snapshot with full audit trail, including source type, seed (for demos), and generation timestamp.
- **Minimal Dependencies**: Core logic is pure TypeScript with Zod validation
- **Manager-Friendly**: Business language, not technical jargon

## Run Management

### Cleanup

The `runs/` folder contains local artifacts and is not meant to be committed. Use cleanup commands to manage disk space:

```bash
# Keep latest 10 demo runs, delete older ones
npm run cleanup:runs

# Delete all demo runs and regenerate baseline (seed 42)
npm run reset:demo
```

The web UI also includes a "Clean up runs" button that keeps the latest 10 demo runs.

### Demo Run Determinism

Demo runs are generated using a seeded random number generator. Clicking "Generate Demo Run" multiple times with the same seed produces identical metrics. The default seed is 42, ensuring consistent demo data for screenshots and documentation.

## License

ISC
