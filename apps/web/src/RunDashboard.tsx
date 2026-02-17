import { useState, useEffect } from "react";
import { Manifest, ValidationReport, ProjectSignals, RunMetadata } from "./types/runTypes.js";
import { ExecutiveSnapshot } from "./components/ExecutiveSnapshot.js";
import { RiskDistribution } from "./components/RiskDistribution.js";
import { PerProjectTable } from "./components/PerProjectTable.js";
import { BottleneckBreakdown } from "./components/BottleneckBreakdown.js";
import { StatusOverview } from "./components/StatusOverview.js";
import { DataQualitySummary } from "./components/DataQualitySummary.js";
import { CSVUpload } from "./components/CSVUpload.js";
import { DemoRunGenerator } from "./components/DemoRunGenerator.js";
import { Accordion } from "./components/Accordion.js";
import { RunProvenance } from "./components/RunProvenance.js";
import { Definitions } from "./components/Definitions.js";
import { formatRunLabel } from "./utils/runLabelFormatter.js";
import { computeDelta, formatDelta } from "./utils/comparisonUtils.js";

export function RunDashboard() {
  const [runMetadata, setRunMetadata] = useState<RunMetadata[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [compareRunId, setCompareRunId] = useState<string>("");
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [validation, setValidation] = useState<ValidationReport | null>(null);
  const [signals, setSignals] = useState<ProjectSignals | null>(null);
  const [compareSignals, setCompareSignals] = useState<ProjectSignals | null>(null);
  const [compareValidation, setCompareValidation] = useState<ValidationReport | null>(null);
  const [reportPath, setReportPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingRuns, setLoadingRuns] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRunMetadata();
  }, []);

  useEffect(() => {
    if (selectedRunId) {
      fetchRunData(selectedRunId);
    }
  }, [selectedRunId]);

  useEffect(() => {
    if (compareRunId && selectedRunId) {
      fetchCompareData(compareRunId);
    } else {
      setCompareSignals(null);
      setCompareValidation(null);
    }
  }, [compareRunId, selectedRunId]);

  const fetchRunMetadata = async () => {
    setLoadingRuns(true);
    try {
      const response = await fetch("/api/runs");
      if (!response.ok) throw new Error("Failed to fetch runs");
      const runSummaries: Array<{ runId: string; runLabel: string; createdAt: string; sourceType: string }> = await response.json();

      const metadataPromises = runSummaries.map(async (summary) => {
        try {
          const [manifestRes, signalsRes] = await Promise.all([
            fetch(`/api/runs/${summary.runId}/manifest`),
            fetch(`/api/runs/${summary.runId}/signals`),
          ]);

          if (manifestRes.ok) {
            const manifestData: Manifest = await manifestRes.json();
            let signalsData: ProjectSignals | null = null;

            if (signalsRes.ok) {
              signalsData = await signalsRes.json();
            }

            const label = formatRunLabel(manifestData, signalsData);
            return {
              runId: summary.runId,
              label,
              manifest: manifestData,
              signals: signalsData,
            } as RunMetadata;
          }
          return null;
        } catch (err) {
          console.error(`Failed to fetch metadata for ${summary.runId}:`, err);
          return null;
        }
      });

      const metadata = (await Promise.all(metadataPromises)).filter(
        (m): m is RunMetadata => m !== null
      );

      setRunMetadata(metadata);
      if (metadata.length > 0 && !selectedRunId) {
        setSelectedRunId(metadata[0].runId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load runs");
    } finally {
      setLoadingRuns(false);
    }
  };

  const fetchRunData = async (runId: string) => {
    setLoading(true);
    setError(null);
    try {
      const [manifestRes, validationRes, signalsRes, reportRes] =
        await Promise.all([
          fetch(`/api/runs/${runId}/manifest`),
          fetch(`/api/runs/${runId}/validation`),
          fetch(`/api/runs/${runId}/signals`),
          fetch(`/api/runs/${runId}/report-path`),
        ]);

      if (!manifestRes.ok) throw new Error("Failed to fetch manifest");
      if (!validationRes.ok) throw new Error("Failed to fetch validation");
      if (!signalsRes.ok) throw new Error("Failed to fetch signals");

      const manifestData = await manifestRes.json();
      const validationData = await validationRes.json();
      const signalsData = await signalsRes.json();

      setManifest(manifestData);
      setValidation(validationData);
      setSignals(signalsData);

      if (reportRes.ok) {
        const reportData = await reportRes.json();
        setReportPath(reportData.path);
      } else {
        setReportPath(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load run data");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompareData = async (runId: string) => {
    try {
      const [validationRes, signalsRes] = await Promise.all([
        fetch(`/api/runs/${runId}/validation`),
        fetch(`/api/runs/${runId}/signals`),
      ]);

      if (validationRes.ok && signalsRes.ok) {
        const validationData = await validationRes.json();
        const signalsData = await validationRes.json();
        setCompareValidation(validationData);
        setCompareSignals(signalsData);
      }
    } catch (err) {
      console.error("Failed to load comparison data:", err);
    }
  };

  const openReport = () => {
    if (reportPath) {
      window.open(`file://${reportPath}`, "_blank");
    }
  };

  const handleUploadSuccess = (runId: string) => {
    // Reload metadata to include new run
    fetchRunMetadata().then(() => {
      // Auto-select the newly uploaded run
      setSelectedRunId(runId);
    });
  };


  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "48px" }}>
        <div>
          <h1 style={{ textTransform: "none" }}>ProjectOps</h1>
          <p className="page-subtitle">Internal Construction Operations Intelligence</p>
        </div>
        {reportPath && (
          <a 
            href="#" 
            onClick={(e) => { e.preventDefault(); openReport(); }} 
            style={{
              color: "#16a34a",
              textDecoration: "none",
              fontSize: "12px",
              fontWeight: "400",
              marginTop: "8px",
            }}
            onMouseEnter={(e) => e.currentTarget.style.textDecoration = "underline"}
            onMouseLeave={(e) => e.currentTarget.style.textDecoration = "none"}
          >
            View full report →
          </a>
        )}
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", marginBottom: "32px" }}>
        <CSVUpload onUploadSuccess={handleUploadSuccess} />
        <DemoRunGenerator onGenerateSuccess={handleUploadSuccess} />
      </div>

      <div style={{ marginBottom: "56px" }}>
        <label style={{ 
          display: "block", 
          fontSize: "11px", 
          fontWeight: "600", 
          textTransform: "uppercase", 
          letterSpacing: "0.5px",
          color: "#64748b",
          marginBottom: "12px"
        }}>
          Weekly Portfolio Snapshot
        </label>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <select
            value={selectedRunId}
            onChange={(e) => setSelectedRunId(e.target.value)}
            disabled={loadingRuns}
            style={{ minWidth: "280px" }}
          >
            <option value="">Select snapshot</option>
            {runMetadata.map((run) => (
              <option key={run.runId} value={run.runId}>
                {run.label}
              </option>
            ))}
          </select>

          <select
            value={compareRunId}
            onChange={(e) => setCompareRunId(e.target.value)}
            disabled={loadingRuns}
            style={{ minWidth: "200px" }}
          >
            <option value="">Compare to (optional)</option>
            {runMetadata
              .filter((run) => run.runId !== selectedRunId)
              .map((run) => (
                <option key={run.runId} value={run.runId}>
                  {run.label}
                </option>
              ))}
          </select>
        </div>
      </div>

      {error && <div className="error">Error: {error}</div>}

      {loading && <div className="loading">Loading...</div>}

      {!loading && manifest && signals && validation && (
        <>
          <RunProvenance manifest={manifest} />
          <ExecutiveSnapshot
            manifest={manifest}
            signals={signals}
            validation={validation}
            compareSignals={compareSignals}
            compareValidation={compareValidation}
          />
          
          {compareSignals && (
            <div style={{ marginTop: "32px", marginBottom: "32px", padding: "20px 0", borderTop: "1px solid #e5e7eb", borderBottom: "1px solid #e5e7eb" }}>
              <h3 style={{ marginBottom: "16px", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b" }}>
                Change Summary
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "24px" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Tasks Behind Schedule</div>
                  <div style={{ fontSize: "20px", fontWeight: "600", color: "#111" }}>
                    {formatDelta(computeDelta(signals.totals.scheduleLagCount, compareSignals.totals.scheduleLagCount), true)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Critical Path Risk</div>
                  <div style={{ fontSize: "20px", fontWeight: "600", color: "#111" }}>
                    {formatDelta(computeDelta(signals.totals.criticalPathRiskCount, compareSignals.totals.criticalPathRiskCount), true)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Budget Overburn</div>
                  <div style={{ fontSize: "20px", fontWeight: "600", color: "#111" }}>
                    {formatDelta(computeDelta(signals.totals.budgetOverburnCount, compareSignals.totals.budgetOverburnCount), true)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "4px" }}>Projected Overrun</div>
                  <div style={{ fontSize: "20px", fontWeight: "600", color: "#111" }}>
                    {(() => {
                      const formatCurrency = (amount: number): string => {
                        if (amount < 1000) {
                          return `$${Math.round(amount)}`;
                        }
                        if (amount < 1000000) {
                          return `$${(amount / 1000).toFixed(1)}k`;
                        }
                        return `$${(amount / 1000000).toFixed(2)}M`;
                      };
                      const currentAvg = signals.perProjectRiskSummary.reduce((sum, p) => {
                        const overrun = Math.max(0, p.totalBudgetSpent - p.totalBudgetAllocated);
                        return sum + overrun;
                      }, 0) / signals.perProjectRiskSummary.length;
                      const compareAvg = compareSignals.perProjectRiskSummary.reduce((sum, p) => {
                        const overrun = Math.max(0, p.totalBudgetSpent - p.totalBudgetAllocated);
                        return sum + overrun;
                      }, 0) / compareSignals.perProjectRiskSummary.length;
                      const delta = computeDelta(currentAvg, compareAvg);
                      const baseValue = formatCurrency(currentAvg);
                      return delta !== null && delta !== 0 
                        ? `${baseValue} ${formatDelta(delta, false, formatCurrency)}`
                        : baseValue;
                    })()}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Accordion title="Project Portfolio Overview" defaultOpen={true}>
            <PerProjectTable
              signals={signals}
              compareSignals={compareSignals}
            />
          </Accordion>

          <Accordion title="Portfolio Risk Breakdown">
            <RiskDistribution signals={signals} />
          </Accordion>

          <Accordion title="Operational Bottlenecks">
            <BottleneckBreakdown signals={signals} />
          </Accordion>

          <Accordion title="Status Overview">
            <StatusOverview signals={signals} />
          </Accordion>

          <Accordion title="Data Integrity Status">
            <DataQualitySummary validation={validation} />
          </Accordion>

          <Accordion title="Metric Definitions" defaultOpen={false}>
            <Definitions />
          </Accordion>
        </>
      )}
    </div>
  );
}
