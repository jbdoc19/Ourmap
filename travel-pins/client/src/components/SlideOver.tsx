import React from "react";

export default function SlideOver(props: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}) {
  const { open, onClose, children, title } = props;

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: open ? 0 : -360,
        width: 360,
        height: "100%",
        background: "white",
        borderLeft: "1px solid rgba(0,0,0,0.12)",
        boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
        transition: "right 180ms ease",
        zIndex: 3,
        display: "flex",
        flexDirection: "column"
      }}
    >
      <div style={{ padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 18 }}>
          ✕
        </button>
      </div>
      <div style={{ padding: 12, overflow: "auto", flex: 1 }}>{children}</div>
    </div>
  );
}
