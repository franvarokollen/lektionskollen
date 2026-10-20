// ============================================================
// UI primitives — Icon, Button, Field, Input, Select, LangToggle, HelpTooltip.
// All exported on `window` for other components to consume.
// Depends on: React (UMD global)
// ============================================================
const { useState: useState_ui, useEffect: useEffect_ui, useRef: useRef_ui } = React;

// Inline SVG icon set. Add new ones by extending the `icons` map.
window.Icon = function Icon({ name, size = 16, style = {} }) {
  const icons = {
    settings: "M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z",
    key: "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4",
    book: "M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z",
    coffee: "M18 8h1a4 4 0 010 8h-1 M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z M6 1v3 M10 1v3 M14 1v3",
    plus: "M12 5v14 M5 12h14",
    x: "M18 6L6 18 M6 6l12 12",
    refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0114.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0020.49 15",
    print: "M6 9V2h12v7 M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2 M6 14h12v8H6z",
    download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4 M7 10l5 5 5-5 M12 15V3",
    chevronRight: "M9 18l6-6-6-6",
    alert: "M12 9v4 M12 17h.01 M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
    sparkles: "M12 3l1.9 5.8L20 10l-5.8 1.9L12 18l-1.9-6.1L4 10l6.1-1.2L12 3z M5 3v4 M3 5h4 M19 16v4 M17 18h4",
    clock: "M12 22a10 10 0 100-20 10 10 0 000 20z M12 6v6l4 2",
    check: "M20 6L9 17l-5-5",
    target: "M12 22a10 10 0 100-20 10 10 0 000 20z M12 18a6 6 0 100-12 6 6 0 000 12z M12 14a2 2 0 100-4 2 2 0 000 4z",
    file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8",
    users: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M23 21v-2a4 4 0 00-3-3.87 M16 3.13a4 4 0 010 7.75",
    layers: "M12 2L2 7l10 5 10-5-10-5z M2 17l10 5 10-5 M2 12l10 5 10-5",
    share: "M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8 M16 6l-4-4-4 4 M12 2v13",
    award: "M12 15a7 7 0 100-14 7 7 0 000 14z M8.21 13.89L7 23l5-3 5 3-1.21-9.12",
    image: "M21 19a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2zm-13-9a2 2 0 100-4 2 2 0 000 4z M21 15l-5-5L5 21",
    external: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6 M15 3h6v6 M10 14L21 3",
  };
  const path = icons[name];
  if (!path) return null;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }}>
      {path.split(" M").map((p, i) => <path key={i} d={i === 0 ? p : "M" + p} />)}
    </svg>
  );
};

window.Button = function Button({ variant = "secondary", icon, children, onClick, disabled, type = "button", style = {} }) {
  const variants = {
    primary: { background: "var(--accent)", color: "#fff", border: "1px solid var(--accent)" },
    primaryHover: { background: "var(--accent-hover)" },
    secondary: { background: "var(--bg-surface)", color: "var(--text-primary)", border: "1px solid var(--border-default)" },
    secondaryHover: { background: "var(--bg-secondary)", borderColor: "var(--border-strong)" },
    yellow: { background: "#F5C518", color: "#1A1A1A", border: "1px solid #C9A013" },
    yellowHover: { background: "#E8B814" },
    ghost: { background: "transparent", color: "var(--text-secondary)", border: "1px solid transparent" },
    ghostHover: { background: "var(--bg-secondary)", color: "var(--text-primary)" },
    danger: { background: "var(--bg-surface)", color: "var(--danger-text)", border: "1px solid var(--border-default)" },
    dangerHover: { background: "var(--danger-bg)", borderColor: "var(--danger-text)" },
  };
  const [hover, setHover] = useState_ui(false);
  const base = variants[variant] || variants.secondary;
  const hoverStyles = !disabled && hover ? variants[variant + "Hover"] || {} : {};
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "8px 14px", fontSize: 13, fontWeight: 500,
        borderRadius: "var(--radius-md)", transition: "all 0.12s",
        whiteSpace: "nowrap",
        ...base, ...hoverStyles, ...style,
      }}>
      {icon}
      {children}
    </button>
  );
};

window.Field = function Field({ label, children, hint }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: "var(--text-secondary)", marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <div style={{ fontSize: 11, color: "var(--text-tertiary)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
};

window.Input = function Input(props) {
  return <input {...props} style={{
    width: "100%", padding: "8px 12px", fontSize: 14,
    border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
    background: "var(--bg-surface)", color: "var(--text-primary)",
    transition: "border-color 0.12s", ...(props.style || {}),
  }} />;
};

window.Select = function Select({ children, ...props }) {
  return (
    <select {...props} style={{
      width: "100%", padding: "8px 12px", fontSize: 14,
      border: "1px solid var(--border-default)", borderRadius: "var(--radius-md)",
      background: "var(--bg-surface)", color: "var(--text-primary)",
      appearance: "none",
      backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%235A5A55\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 10px center",
      paddingRight: 32,
      ...(props.style || {}),
    }}>{children}</select>
  );
};

window.LangToggle = function LangToggle({ value, onChange }) {
  const btn = (code) => ({
    padding: "5px 11px", fontSize: 12, fontWeight: 600,
    background: value === code ? "var(--accent)" : "transparent",
    color: value === code ? "#fff" : "var(--text-secondary)",
    border: "none", cursor: "pointer",
  });
  return (
    <div style={{
      display: "inline-flex",
      border: "1px solid var(--border-default)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}>
      <button onClick={() => onChange("sv")} style={btn("sv")}>SV</button>
      <button onClick={() => onChange("en")} style={btn("en")}>EN</button>
    </div>
  );
};

// HelpTooltip — small "?" icon that opens a popover with instructions
// and an external "Get key →" link. Closes on outside click.
window.HelpTooltip = function HelpTooltip({ title, steps, linkUrl, linkLabel }) {
  const [open, setOpen] = useState_ui(false);
  const wrapRef = useRef_ui(null);
  useEffect_ui(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);
  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-flex", marginLeft: 6 }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Help"
        style={{
          width: 16, height: 16, padding: 0,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: open ? "var(--accent)" : "var(--bg-secondary)",
          color: open ? "#fff" : "var(--text-secondary)",
          border: "1px solid var(--border-default)",
          borderRadius: "50%", fontSize: 11, fontWeight: 700, lineHeight: 1,
          cursor: "pointer",
        }}
      >?</button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0,
          zIndex: 60, width: 320, padding: 12,
          background: "var(--bg-surface)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-md)",
          fontSize: 12, lineHeight: 1.5, color: "var(--text-primary)",
        }}>
          {title && <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>}
          <ol style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 3 }}>
            {steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          {linkUrl && (
            <a href={linkUrl} target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: 5,
              marginTop: 10, padding: "5px 10px", fontSize: 12, fontWeight: 500,
              background: "var(--accent)", color: "#fff",
              borderRadius: "var(--radius-sm)", textDecoration: "none",
            }}>{linkLabel || "Get key"} →</a>
          )}
        </div>
      )}
    </span>
  );
};

// Shared small button style used by modals throughout the app.
window.smallBtn = {
  padding: "5px 10px", fontSize: 12,
  background: "transparent", color: "var(--text-secondary)",
  border: "1px solid var(--border-default)",
  borderRadius: "var(--radius-sm)", cursor: "pointer",
};

// Toggle pill style used by tab switchers within extras.
window.miniToggle = function miniToggle(active) {
  return {
    padding: "5px 10px", fontSize: 12, fontWeight: 500,
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--text-secondary)",
    border: `1px solid ${active ? "var(--accent)" : "var(--border-default)"}`,
    borderRadius: "var(--radius-sm)", cursor: "pointer",
  };
};
