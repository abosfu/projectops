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

  if (subcontractorsWithLag.length === 0 && tradesWithLag.length === 0) return null;

  return (
    <div className="section">
      <h2>Schedule Lag Bottlenecks</h2>
      
      {subcontractorsWithLag.length > 0 && (
        <>
          <h3 style={{ marginTop: "24px" }}>Top Subcontractors Causing Schedule Lag</h3>
          <table>
            <thead>
              <tr>
                <th>Subcontractor</th>
                <th>Schedule Lag</th>
                <th>Blocked</th>
                <th>Budget Overburn</th>
              </tr>
            </thead>
            <tbody>
              {subcontractorsWithLag.map((bottleneck, idx) => (
                <tr key={idx}>
                  <td>
                    <strong>{bottleneck.subcontractor}</strong>
                  </td>
                  <td>{bottleneck.scheduleLag}</td>
                  <td>{bottleneck.blocked}</td>
                  <td>{bottleneck.budgetOverburn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {tradesWithLag.length > 0 && (
        <>
          <h3 style={{ marginTop: "32px" }}>Top Trades Causing Schedule Lag</h3>
          <table>
            <thead>
              <tr>
                <th>Trade</th>
                <th>Schedule Lag</th>
                <th>Blocked</th>
                <th>Budget Overburn</th>
              </tr>
            </thead>
            <tbody>
              {tradesWithLag.map((bottleneck, idx) => (
                <tr key={idx}>
                  <td>
                    <strong>{bottleneck.trade}</strong>
                  </td>
                  <td>{bottleneck.scheduleLag}</td>
                  <td>{bottleneck.blocked}</td>
                  <td>{bottleneck.budgetOverburn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
