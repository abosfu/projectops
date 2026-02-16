# ProjectOps Architecture

## System Flow

```
User
  ↓
Upload / CLI Ingestion
  ↓
Normalization Layer
  ↓
Validation Layer
  ↓
Signal Computation
  ↓
Run Snapshot (runs/<runId>/)
  ↓
Web Viewer
```

## Component Overview

### Ingestion
- Accepts CSV files via CLI or web upload
- Parses and validates input format
- Generates unique run ID (timestamp-based)

### Normalization
- Maps raw CSV fields to canonical schema
- Standardizes formats (dates, statuses, budgets)
- Handles missing values with explicit defaults

### Validation
- Enforces required fields (project_id, task_id, planned_start, planned_end)
- Validates data types and formats
- Generates warnings for data quality issues
- Rejects invalid rows with error messages

### Signal Computation
- Calculates schedule lag (tasks behind schedule)
- Computes critical path risks (blocked tasks and dependencies)
- Identifies budget overruns and projected overruns
- Ranks bottleneck hotspots by subcontractor and trade
- Generates project health scores (0-100)
- Generates deterministic decision signals

### Run Snapshot
Each ingestion creates an immutable snapshot:
- `manifest.json` - Run metadata (label, source type, timestamps)
- `raw.csv` - Original input (preserved)
- `normalized_tasks.json` - Clean, structured task data
- `validation_report.json` - Data quality assessment
- `project_signals.json` - Computed project signals and health scores
- `dashboard_report.html` - Static HTML report

### Web Viewer
- Reads run snapshots from disk
- Provides interactive dashboard
- Supports run comparison
- Displays project health scores, risk metrics, and visualizations

