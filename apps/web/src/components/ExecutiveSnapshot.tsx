import { Manifest, ProjectSignals, ValidationReport } from "../types/runTypes.js";
import { computeDelta, formatDelta, getWarningCount } from "../utils/comparisonUtils.js";
import { 
  getTaskMetricSeverity, 
  getOverrunSeverity, 
  getSeverityColor,
  getHealthScoreLabel,
  getHealthScoreColor
} from "../utils/severityHelpers.js";
import { safePercentage, clampPercentage } from "../utils/metricDisplayUtils.js";

interface ExecutiveSnapshotProps {
  manifest: Manifest;
  signals: ProjectSignals;
  validation: ValidationReport;
  compareSignals: ProjectSignals | null;
  compareValidation: ValidationReport | null;
}

export function ExecutiveSnapshot({
  manifest,
  signals,
  validation,
  compareSignals,
  compareValidation,
}: ExecutiveSnapshotProps) {
  const globalHealthScore = signals.globalHealthScore;
  const tasksBehindSchedule = signals.totals.scheduleLagCount;
  const criticalPathRisk = signals.totals.criticalPathRiskCount;
  const budgetOverburn = signals.totals.budgetOverburnCount;
  const totalTasks = signals.totals.tasks;
  
  // Calculate projected overrun dollar amount (average across projects)
  const formatCurrency = (amount: number): string => {
    if (amount < 1000) {
      return `$${Math.round(amount)}`;
    }
    if (amount < 1000000) {
      return `$${(amount / 1000).toFixed(1)}k`;
    }
    return `$${(amount / 1000000).toFixed(2)}M`;
  };
  
  const avgProjectedOverrunAmount = signals.perProjectRiskSummary.length > 0
    ? signals.perProjectRiskSummary.reduce((sum, p) => {
        const overrun = Math.max(0, p.totalBudgetSpent - p.totalBudgetAllocated);
        return sum + overrun;
      }, 0) / signals.perProjectRiskSummary.length
    : 0;

  // Get severity levels
  const behindScheduleSeverity = getTaskMetricSeverity(tasksBehindSchedule, totalTasks);
  const criticalPathSeverity = getTaskMetricSeverity(criticalPathRisk, totalTasks);
  const overburnSeverity = getTaskMetricSeverity(budgetOverburn, totalTasks);
  // Calculate overrun percentage for severity (using average percentage across projects)
  const avgProjectedOverrunPct = signals.perProjectRiskSummary.length > 0
    ? clampPercentage(signals.perProjectRiskSummary.reduce((sum, p) => sum + clampPercentage(p.projectedOverrunPct), 0) / signals.perProjectRiskSummary.length)
    : 0;
  const overrunSeverity = getOverrunSeverity(avgProjectedOverrunPct);

  return (
    <div style={{ marginBottom: "40px", paddingBottom: "32px", borderBottom: "1px solid #e5e7eb" }}>
      <div style={{ marginBottom: "32px" }}>
        <div style={{ 
          fontSize: "10px", 
          textTransform: "uppercase", 
          letterSpacing: "0.8px", 
          color: "#64748b", 
          fontWeight: "600",
          marginBottom: "12px"
        }}>
          PROJECT HEALTH SCORE
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: "16px", marginBottom: "8px" }}>
          <div 
            style={{ 
              fontSize: "80px", 
              fontWeight: "700",
              color: getHealthScoreColor(globalHealthScore),
              lineHeight: "1",
              letterSpacing: "-3px",
            }}
          >
            {globalHealthScore.toFixed(1)}
          </div>
          <div style={{ 
            fontSize: "14px", 
            color: "#64748b", 
            fontWeight: "400"
          }}>
            / 100
          </div>
          <div style={{ 
            display: "inline-flex",
            alignItems: "center",
            padding: "4px 10px",
            borderRadius: "4px",
            backgroundColor: getHealthScoreColor(globalHealthScore) + "15",
            border: `1px solid ${getHealthScoreColor(globalHealthScore)}40`,
            fontSize: "11px", 
            color: getHealthScoreColor(globalHealthScore),
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
          }}>
            {getHealthScoreLabel(globalHealthScore)}
          </div>
        </div>
      </div>

      {/* Executive Summary */}
      <div style={{ marginTop: "24px", marginBottom: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ 
          fontSize: "10px", 
          textTransform: "uppercase", 
          letterSpacing: "0.8px", 
          color: "#64748b", 
          fontWeight: "600",
          marginBottom: "12px"
        }}>
          Executive Summary
        </div>
        <ul style={{ 
          margin: 0, 
          padding: 0, 
          listStyle: "none",
          fontSize: "13px",
          color: "#111",
          lineHeight: "1.8"
        }}>
          {(() => {
            const insights: string[] = [];
            
            // Systemic risk patterns
            if (totalTasks > 0) {
              const behindPct = safePercentage(tasksBehindSchedule, totalTasks);
              const criticalPct = safePercentage(criticalPathRisk, totalTasks);
              const overburnPct = safePercentage(budgetOverburn, totalTasks);
              
              // Identify systemic patterns
              if (behindPct > 30 || criticalPct > 25 || overburnPct > 20) {
                const patterns: string[] = [];
                if (behindPct > 30) patterns.push("widespread schedule delays");
                if (criticalPct > 25) patterns.push("critical path exposure");
                if (overburnPct > 20) patterns.push("budget overruns");
                insights.push(`Systemic risk patterns detected: ${patterns.join(", ")}.`);
              } else if (behindPct > 0 || criticalPct > 0 || overburnPct > 0) {
                insights.push("Isolated risk indicators present across portfolio.");
              } else {
                insights.push("Portfolio operating within expected parameters.");
              }
            }
            
            // Trade concentration
            if (signals.topBottlenecksByTrade.length > 0) {
              const topTrade = signals.topBottlenecksByTrade[0];
              const tradeLagPct = totalTasks > 0 ? safePercentage(topTrade.scheduleLag, totalTasks) : 0;
              if (tradeLagPct > 15) {
                insights.push(`Trade concentration risk: ${topTrade.trade} accounts for ${tradeLagPct.toFixed(0)}% of schedule delays.`);
              }
            }
            
            // Budget clustering
            if (signals.topBottlenecksBySubcontractor.length > 0) {
              const topSub = signals.topBottlenecksBySubcontractor[0];
              const subOverburnPct = totalTasks > 0 ? safePercentage(topSub.budgetOverburn, totalTasks) : 0;
              if (subOverburnPct > 10) {
                insights.push(`Budget clustering: ${topSub.subcontractor} represents ${subOverburnPct.toFixed(0)}% of overrun exposure.`);
              }
            }
            
            return insights.slice(0, 3).map((insight, idx) => (
              <li key={idx} style={{ marginBottom: "6px" }}>
                {insight}
              </li>
            ));
          })()}
        </ul>
      </div>

      {/* Strategic Signals */}
      <div style={{ marginTop: "24px", marginBottom: "24px", paddingTop: "20px", borderTop: "1px solid #f1f5f9" }}>
        <div style={{ 
          fontSize: "10px", 
          textTransform: "uppercase", 
          letterSpacing: "0.8px", 
          color: "#64748b", 
          fontWeight: "600",
          marginBottom: "12px"
        }}>
          Strategic Signals
        </div>
        <ul style={{ 
          margin: 0, 
          padding: 0, 
          listStyle: "none",
          fontSize: "13px",
          color: "#111",
          lineHeight: "1.8"
        }}>
          {(() => {
            const strategicSignals: string[] = [];
            
            // Highest trade lag
            if (totalTasks > 0 && signals.topBottlenecksByTrade.length > 0) {
              const topTrade = signals.topBottlenecksByTrade[0];
              if (topTrade.scheduleLag > 0) {
                strategicSignals.push(`${topTrade.trade} showing highest schedule lag (${topTrade.scheduleLag} tasks).`);
              }
            }
            
            // Highest subcontractor overburn
            if (totalTasks > 0 && signals.topBottlenecksBySubcontractor.length > 0) {
              const topSub = signals.topBottlenecksBySubcontractor.find(b => b.budgetOverburn > 0);
              if (topSub) {
                strategicSignals.push(`${topSub.subcontractor} with highest budget overburn (${topSub.budgetOverburn} tasks).`);
              }
            }
            
            // Projects with highest critical path risk
            const projectsWithCriticalRisk = signals.perProjectRiskSummary
              .filter(p => p.criticalPathRiskCount > 0)
              .sort((a, b) => b.criticalPathRiskCount - a.criticalPathRiskCount)
              .slice(0, 2);
            if (projectsWithCriticalRisk.length > 0) {
              const projectNames = projectsWithCriticalRisk.map(p => p.projectId).join(", ");
              strategicSignals.push(`Critical path exposure concentrated in: ${projectNames}.`);
            }
            
            // Portfolio trend direction
            if (compareSignals) {
              const healthDelta = globalHealthScore - compareSignals.globalHealthScore;
              if (healthDelta < -5) {
                strategicSignals.push("Portfolio trending downward; intervention required.");
              } else if (healthDelta > 5) {
                strategicSignals.push("Portfolio trending upward; positive momentum.");
              } else if (healthDelta < 0) {
                strategicSignals.push("Portfolio showing slight decline; monitor closely.");
              } else if (healthDelta > 0) {
                strategicSignals.push("Portfolio showing slight improvement.");
              }
            }
            
            return strategicSignals.slice(0, 4).map((signal, idx) => (
              <li key={idx} style={{ marginBottom: "6px" }}>
                {signal}
              </li>
            ));
          })()}
        </ul>
      </div>

      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(4, 1fr)", 
        gap: "32px",
        marginTop: "24px"
      }}>
        <div>
          <div style={{ 
            fontSize: "10px", 
            textTransform: "uppercase", 
            letterSpacing: "0.5px", 
            color: "#64748b", 
            fontWeight: "600",
            marginBottom: "6px"
          }}>
            Tasks Behind Schedule
          </div>
          <div style={{ 
            fontSize: "32px", 
            fontWeight: "700", 
            color: getSeverityColor(behindScheduleSeverity),
            lineHeight: "1.2",
            letterSpacing: "-0.5px",
            marginBottom: "3px"
          }}>
            {tasksBehindSchedule}
          </div>
          <div style={{ 
            fontSize: "11px", 
            color: "#64748b", 
            fontWeight: "400"
          }}>
            {totalTasks === 0 ? "No tasks" : `${safePercentage(tasksBehindSchedule, totalTasks).toFixed(1)}% of tasks`}
          </div>
        </div>

        <div>
          <div style={{ 
            fontSize: "10px", 
            textTransform: "uppercase", 
            letterSpacing: "0.5px", 
            color: "#64748b", 
            fontWeight: "600",
            marginBottom: "6px"
          }}>
            Critical Path Risk
          </div>
          <div style={{ 
            fontSize: "32px", 
            fontWeight: "700", 
            color: getSeverityColor(criticalPathSeverity),
            lineHeight: "1.2",
            letterSpacing: "-0.5px",
            marginBottom: "3px"
          }}>
            {criticalPathRisk}
          </div>
          <div style={{ 
            fontSize: "11px", 
            color: "#64748b", 
            fontWeight: "400"
          }}>
            {totalTasks === 0 ? "No tasks" : `${safePercentage(criticalPathRisk, totalTasks).toFixed(1)}% of tasks`}
          </div>
        </div>

        <div>
          <div style={{ 
            fontSize: "10px", 
            textTransform: "uppercase", 
            letterSpacing: "0.5px", 
            color: "#64748b", 
            fontWeight: "600",
            marginBottom: "6px"
          }}>
            Budget Overburn
          </div>
          <div style={{ 
            fontSize: "32px", 
            fontWeight: "700", 
            color: getSeverityColor(overburnSeverity),
            lineHeight: "1.2",
            letterSpacing: "-0.5px",
            marginBottom: "3px"
          }}>
            {budgetOverburn}
          </div>
          <div style={{ 
            fontSize: "11px", 
            color: "#64748b", 
            fontWeight: "400"
          }}>
            {totalTasks === 0 ? "No tasks" : `${safePercentage(budgetOverburn, totalTasks).toFixed(1)}% of tasks`}
          </div>
        </div>

        <div>
          <div style={{ 
            fontSize: "10px", 
            textTransform: "uppercase", 
            letterSpacing: "0.5px", 
            color: "#64748b", 
            fontWeight: "600",
            marginBottom: "6px"
          }}>
            Projected Overrun
          </div>
          <div style={{ 
            fontSize: "32px", 
            fontWeight: "700", 
            color: getSeverityColor(overrunSeverity),
            lineHeight: "1.2",
            letterSpacing: "-0.5px",
            marginBottom: "3px"
          }}>
            {formatCurrency(avgProjectedOverrunAmount)}
          </div>
          <div style={{ 
            fontSize: "11px", 
            color: "#64748b", 
            fontWeight: "400"
          }}>
            Average across projects
          </div>
        </div>
      </div>
    </div>
  );
}
