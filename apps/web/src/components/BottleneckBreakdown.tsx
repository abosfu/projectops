import { ProjectSignals } from "../types/runTypes.js";

interface BottleneckBreakdownProps {
  signals: ProjectSignals;
}

export function BottleneckBreakdown({ signals }: BottleneckBreakdownProps) {
  // Filter to only show bottlenecks with schedule lag
  const subcontractorsWithLag = signals.topBottlenecksBySubcontractor
    .filter((b) => b.scheduleLag > 0)
    .slice(0, 10);

  const tradesWithLag = signals.topBottlenecksByTrade
    .filter((b) => b.scheduleLag > 0)
    .slice(0, 10);

  if (subcontractorsWithLag.length === 0 && tradesWithLag.length === 0) {
    return (
      <div style={{ 
        padding: "24px", 
        textAlign: "center", 
        color: "#64748b", 
        fontSize: "13px",
        border: "1px solid #e5e7eb",
        borderRadius: "4px"
      }}>
        <div style={{ marginBottom: "4px", fontWeight: "500" }}>No bottlenecks identified</div>
        <div style={{ fontSize: "12px", color: "#94a3b8" }}>No subcontractors or trades are currently causing schedule delays</div>
      </div>
    );
  }

  return (
    <div>
      {subcontractorsWithLag.length > 0 && (
        <>
          <h3 style={{ marginTop: "0", marginBottom: "12px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Top Subcontractors Causing Schedule Lag</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "24px" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Subcontractor</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Schedule Lag</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Blocked</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Budget Overburn</th>
              </tr>
            </thead>
            <tbody>
              {subcontractorsWithLag.map((bottleneck, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ textAlign: "left", padding: "12px", fontSize: "13px" }}>
                    <strong style={{ fontWeight: "600", color: "#111" }}>{bottleneck.subcontractor}</strong>
                  </td>
                  <td style={{ textAlign: "right", padding: "12px", fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                    {bottleneck.scheduleLag}
                  </td>
                  <td style={{ textAlign: "right", padding: "12px", fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                    {bottleneck.blocked}
                  </td>
                  <td style={{ textAlign: "right", padding: "12px", fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                    {bottleneck.budgetOverburn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tradesWithLag.length > 0 && (
        <>
          <h3 style={{ marginTop: subcontractorsWithLag.length > 0 ? "24px" : "0", marginBottom: "12px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Top Trades Causing Schedule Lag</h3>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                <th style={{ textAlign: "left", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Trade</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Schedule Lag</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Blocked</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#64748b", fontWeight: "600" }}>Budget Overburn</th>
              </tr>
            </thead>
            <tbody>
              {tradesWithLag.map((bottleneck, idx) => (
                <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9", backgroundColor: idx % 2 === 0 ? "#ffffff" : "#f8fafc" }}>
                  <td style={{ textAlign: "left", padding: "12px", fontSize: "13px" }}>
                    <strong style={{ fontWeight: "600", color: "#111" }}>{bottleneck.trade}</strong>
                  </td>
                  <td style={{ textAlign: "right", padding: "12px", fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                    {bottleneck.scheduleLag}
                  </td>
                  <td style={{ textAlign: "right", padding: "12px", fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                    {bottleneck.blocked}
                  </td>
                  <td style={{ textAlign: "right", padding: "12px", fontVariantNumeric: "tabular-nums", fontSize: "13px" }}>
                    {bottleneck.budgetOverburn}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
