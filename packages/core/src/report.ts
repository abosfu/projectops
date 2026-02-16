import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { Manifest } from "./storage.js";
import { ValidationReport } from "./storage.js";
import { ProjectSignals } from "./signals.js";
import { SIGNAL_THRESHOLDS } from "./config.js";

/**
 * Generate HTML report from run artifacts
 */
export function generateReport(runFolder: string): string {
  // Read artifacts
  const manifestPath = join(runFolder, "manifest.json");
  const validationReportPath = join(runFolder, "validation_report.json");
  const signalsPath = join(runFolder, "project_signals.json");

  const manifest: Manifest = JSON.parse(
    readFileSync(manifestPath, "utf-8")
  );
  const validationReport: ValidationReport = JSON.parse(
    readFileSync(validationReportPath, "utf-8")
  );
  const signals: ProjectSignals = JSON.parse(
    readFileSync(signalsPath, "utf-8")
  );

  // Generate HTML
  const html = generateHTML(manifest, validationReport, signals);

  // Write report
  const reportPath = join(runFolder, "dashboard_report.html");
  writeFileSync(reportPath, html, "utf-8");

  return reportPath;
}

/**
 * Generate HTML content
 */
function generateHTML(
  manifest: Manifest,
  validationReport: ValidationReport,
  signals: ProjectSignals
): string {
  const createdAt = new Date(manifest.createdAt).toLocaleString();
  const generatedAt = new Date(signals.generatedAt).toLocaleString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ProjectOps Report - ${manifest.runId}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 30px;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 3px solid #3498db;
      padding-bottom: 10px;
      margin-bottom: 30px;
    }
    h2 {
      color: #34495e;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 8px;
      border-bottom: 2px solid #ecf0f1;
    }
    .section {
      margin-bottom: 30px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }
    .card {
      background: #f8f9fa;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #3498db;
    }
    .card h3 {
      font-size: 14px;
      color: #7f8c8d;
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    .card .value {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ecf0f1;
    }
    th {
      background: #34495e;
      color: white;
      font-weight: 600;
    }
    tr:hover {
      background: #f8f9fa;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .badge.error { background: #fee; color: #c33; }
    .badge.warning { background: #ffeaa7; color: #856404; }
    .badge.info { background: #e3f2fd; color: #1976d2; }
    .explainability {
      background: #fff9e6;
      border: 2px solid #f1c40f;
      border-radius: 6px;
      padding: 20px;
      margin-top: 20px;
    }
    .explainability h3 {
      color: #856404;
      margin-bottom: 15px;
    }
    .explainability ul {
      margin-left: 20px;
      margin-top: 10px;
    }
    .explainability li {
      margin-bottom: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>ProjectOps Report</h1>

    <!-- Run Summary -->
    <div class="section">
      <h2>Run Summary</h2>
      <div class="grid">
        <div class="card">
          <h3>Run ID</h3>
          <div class="value">${manifest.runId}</div>
        </div>
        <div class="card">
          <h3>Input File</h3>
          <div class="value" style="font-size: 14px;">${manifest.inputFile}</div>
        </div>
        <div class="card">
          <h3>Created At</h3>
          <div class="value" style="font-size: 14px;">${createdAt}</div>
        </div>
        <div class="card">
          <h3>Total Tasks</h3>
          <div class="value">${manifest.totalRows}</div>
        </div>
        <div class="card">
          <h3>Valid Tasks</h3>
          <div class="value">${manifest.validRows}</div>
        </div>
        <div class="card">
          <h3>Invalid Tasks</h3>
          <div class="value">${manifest.invalidRows}</div>
        </div>
      </div>
    </div>

    <!-- Data Quality -->
    <div class="section">
      <h2>Data Quality</h2>
      
      <h3>Warnings Summary</h3>
      <div class="grid">
        <div class="card">
          <h3>Missing Trade</h3>
          <div class="value">${validationReport.warningsSummary.missingTrade}</div>
        </div>
        <div class="card">
          <h3>Missing Subcontractor</h3>
          <div class="value">${validationReport.warningsSummary.missingSubcontractor}</div>
        </div>
        <div class="card">
          <h3>Unknown Status Mapped</h3>
          <div class="value">${validationReport.warningsSummary.unknownStatusMapped}</div>
        </div>
        <div class="card">
          <h3>Progress Clamped</h3>
          <div class="value">${validationReport.warningsSummary.progressPctClamped}</div>
        </div>
        <div class="card">
          <h3>Budget Spent Defaulted</h3>
          <div class="value">${validationReport.warningsSummary.budgetSpentDefaulted}</div>
        </div>
      </div>

      ${validationReport.rejectedRows.length > 0 ? `
      <h3 style="margin-top: 20px;">Rejected Rows</h3>
      <table>
        <thead>
          <tr>
            <th>Row Number</th>
            <th>Errors</th>
          </tr>
        </thead>
        <tbody>
          ${validationReport.rejectedRows
            .map(
              (row) => `
          <tr>
            <td>${row.rowNumber}</td>
            <td>${row.errors.map((e) => `<span class="badge error">${escapeHtml(e)}</span>`).join(" ")}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
      ` : "<p>No rejected rows.</p>"}
    </div>

    <!-- Project Signals -->
    <div class="section">
      <h2>Project Signals</h2>
      <p style="color: #7f8c8d; margin-bottom: 15px;">Generated at: ${generatedAt}</p>

      <h3>Risk Totals</h3>
      <div class="grid">
        <div class="card">
          <h3>Schedule Lag</h3>
          <div class="value">${signals.totals.scheduleLagCount}</div>
        </div>
        <div class="card">
          <h3>Critical Path Risk</h3>
          <div class="value">${signals.totals.criticalPathRiskCount}</div>
        </div>
        <div class="card">
          <h3>Budget Overburn</h3>
          <div class="value">${signals.totals.budgetOverburnCount}</div>
        </div>
        <div class="card">
          <h3>Projected Overrun</h3>
          <div class="value">${signals.totals.projectedOverrunCount}</div>
        </div>
      </div>

      <h3 style="margin-top: 30px;">Status Counts</h3>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(signals.byStatus)
            .map(
              ([status, count]) => `
          <tr>
            <td>${escapeHtml(status)}</td>
            <td>${count}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>

      <h3 style="margin-top: 30px;">Top Bottlenecks by Subcontractor</h3>
      ${signals.topBottlenecksBySubcontractor.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Subcontractor</th>
            <th>Blocked</th>
            <th>Schedule Lag</th>
            <th>Budget Overburn</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${signals.topBottlenecksBySubcontractor
            .slice(0, 10)
            .map(
              (bottleneck) => `
          <tr>
            <td>${escapeHtml(bottleneck.subcontractor)}</td>
            <td>${bottleneck.blocked}</td>
            <td>${bottleneck.scheduleLag}</td>
            <td>${bottleneck.budgetOverburn}</td>
            <td><strong>${bottleneck.score}</strong></td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
      ` : "<p>No bottlenecks identified.</p>"}

      <h3 style="margin-top: 30px;">Top Bottlenecks by Trade</h3>
      ${signals.topBottlenecksByTrade.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Trade</th>
            <th>Blocked</th>
            <th>Schedule Lag</th>
            <th>Budget Overburn</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          ${signals.topBottlenecksByTrade
            .slice(0, 10)
            .map(
              (bottleneck) => `
          <tr>
            <td>${escapeHtml(bottleneck.trade)}</td>
            <td>${bottleneck.blocked}</td>
            <td>${bottleneck.scheduleLag}</td>
            <td>${bottleneck.budgetOverburn}</td>
            <td><strong>${bottleneck.score}</strong></td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
      ` : "<p>No bottlenecks identified.</p>"}

      <h3 style="margin-top: 30px;">Per-Project Risk Summary</h3>
      ${signals.perProjectRiskSummary.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Project ID</th>
            <th>Total Tasks</th>
            <th>Schedule Lag</th>
            <th>Critical Path Risk</th>
            <th>Budget Overburn</th>
            <th>Projected Overrun %</th>
          </tr>
        </thead>
        <tbody>
          ${signals.perProjectRiskSummary
            .map(
              (project) => `
          <tr>
            <td>${escapeHtml(project.projectId)}</td>
            <td>${project.totalTasks}</td>
            <td>${project.scheduleLagCount}</td>
            <td>${project.criticalPathRiskCount}</td>
            <td>${project.budgetOverburnCount}</td>
            <td>${project.projectedOverrunPct.toFixed(1)}%</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
      ` : "<p>No project data available.</p>"}
    </div>

    <!-- Explainability -->
    <div class="section">
      <h2>Explainability</h2>
      <div class="explainability">
        <h3>Assumptions Used</h3>
        <ul>
          <li><strong>Missing trade → "unknown"</strong> when trade field is empty</li>
          <li><strong>Missing subcontractor → "unknown"</strong> when subcontractor field is empty</li>
          <li><strong>Unknown status → "unknown"</strong> when status value is unrecognized</li>
          <li><strong>Missing budget_spent → 0</strong> when budget_spent field is empty</li>
          <li><strong>Progress percentage clamped</strong> to 0-100 range if out of bounds</li>
        </ul>

        <h3 style="margin-top: 20px;">Signal Computation Assumptions</h3>
        <ul>
          <li><strong>Behind Schedule Detection:</strong> Task is behind schedule if (expectedProgressPct - actualProgressPct) ≥ ${SIGNAL_THRESHOLDS.BEHIND_SCHEDULE_THRESHOLD_PCT}%. Expected progress is calculated based on planned_start, planned_end, and snapshot time (run createdAt).</li>
          <li><strong>Critical Path Risk:</strong> Task is at risk if blocked, or if any dependency in the chain (up to ${SIGNAL_THRESHOLDS.CRITICAL_PATH_DOWNSTREAM_THRESHOLD} levels) is blocked or behind schedule.</li>
          <li><strong>Budget Overburn:</strong> Task has overburn if budgetSpent > budgetAllocated × (progressPct/100) + ${SIGNAL_THRESHOLDS.OVERBURN_EPSILON} (accounts for expected spending based on progress).</li>
          <li><strong>Missing actual_start Warning:</strong> If progress_pct > 0 but actual_start is missing, schedule lag detection may be less accurate.</li>
        </ul>

        <h3 style="margin-top: 20px;">What Breaks</h3>
        <ul>
          <li><strong>Missing dependencies:</strong> Tasks with invalid depends_on_task_id cannot assess critical path risk accurately</li>
          <li><strong>Missing actual_start:</strong> Schedule lag detection is less accurate when actual start dates are not provided</li>
          <li><strong>Incomplete budget data:</strong> Budget overrun calculations are less reliable when budget_spent is missing or defaulted</li>
          <li><strong>Date inconsistencies:</strong> When planned_end < planned_start, the row is rejected</li>
        </ul>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}
