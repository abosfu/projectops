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
import { RunProvenance } from "./components/RunProvenance.js";
import { RunCleanup } from "./components/RunCleanup.js";
import { formatRunLabel } from "./utils/runLabelFormatter.js";

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
          <h1>ProjectOps</h1>
          <p className="page-subtitle">Construction Schedule & Budget Risk Monitor</p>
        </div>
        {reportPath && (
          <a href="#" onClick={(e) => { e.preventDefault(); openReport(); }} className="text-link">
            View full report →
          </a>
        )}
      </div>

      <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", marginBottom: "32px" }}>
        <CSVUpload onUploadSuccess={handleUploadSuccess} />
        <DemoRunGenerator onGenerateSuccess={handleUploadSuccess} />
        <div style={{ marginLeft: "auto" }}>
          <RunCleanup onCleanupSuccess={fetchRunMetadata} />
        </div>
      </div>

      <div style={{ marginBottom: "48px" }}>
        <select
          value={selectedRunId}
          onChange={(e) => setSelectedRunId(e.target.value)}
          disabled={loadingRuns}
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
        >
          <option value="">Compare with</option>
          {runMetadata
            .filter((run) => run.runId !== selectedRunId)
            .map((run) => (
              <option key={run.runId} value={run.runId}>
                {run.label}
              </option>
            ))}
        </select>
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
          <PerProjectTable
            signals={signals}
            compareSignals={compareSignals}
          />
          <RiskDistribution signals={signals} />
          <BottleneckBreakdown signals={signals} />
          <StatusOverview signals={signals} />
          <DataQualitySummary validation={validation} />
        </>
      )}
    </div>
  );
}
