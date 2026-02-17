import { useState, ReactNode } from "react";

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function Accordion({ title, children, defaultOpen = false }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: "32px" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 0",
          border: "none",
          borderTop: "1px solid #e5e7eb",
          borderBottom: isOpen ? "1px solid #e5e7eb" : "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <h2 style={{ margin: 0, fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.8px", color: "#111" }}>
          {title}
        </h2>
        <span style={{ fontSize: "16px", color: "#64748b", fontWeight: "300" }}>
          {isOpen ? "−" : "+"}
        </span>
      </button>
      {isOpen && (
        <div style={{ paddingTop: "20px", paddingBottom: "20px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

