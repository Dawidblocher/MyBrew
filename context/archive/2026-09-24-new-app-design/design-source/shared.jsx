// Shared components — cards, buttons, badges, inputs, icons
const { useState, useEffect, useRef, useMemo, useCallback } = React;

/* ---------- icons (hand-tuned, minimal, line-based) ---------- */
const Icon = {
  recipe: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M5 4h11l3 3v13H5z"/><path d="M16 4v3h3"/><path d="M8 11h8M8 14h8M8 17h5"/>
    </svg>
  ),
  materials: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 7l8-4 8 4v10l-8 4-8-4z"/><path d="M4 7l8 4 8-4M12 11v10"/>
    </svg>
  ),
  protocol: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>
    </svg>
  ),
  home: (p) => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}>
      <path d="M4 11l8-7 8 7v9h-6v-6h-4v6H4z"/>
    </svg>
  ),
  plus: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  search: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  play: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...p}><path d="M7 5v14l11-7z"/></svg>,
  pause: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...p}><path d="M7 5h3v14H7zM14 5h3v14h-3z"/></svg>,
  check: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12l5 5 9-11"/></svg>,
  x: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>,
  dot: (p) => <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor" {...p}><circle cx="12" cy="12" r="5"/></svg>,
  chevron: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 6l6 6-6 6"/></svg>,
  edit: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M14 6l4 4"/></svg>,
  copy: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>,
  pdf: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4"/><path d="M9 13h2a1.5 1.5 0 0 1 0 3H9v-3zM14 13h2M14 13v4"/></svg>,
  flame: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3s4 4 4 9a4 4 0 0 1-8 0c0-2 1-3 1-5-2 1-3 3-3 6a6 6 0 0 0 12 0c0-6-6-10-6-10z"/></svg>,
  drop: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3s6 7 6 12a6 6 0 0 1-12 0c0-5 6-12 6-12z"/></svg>,
  thermo: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0V4z"/><path d="M12 16a2 2 0 1 0 0-4"/></svg>,
  leaf: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 4C10 4 4 10 4 20c10 0 16-6 16-16z"/><path d="M4 20L16 8"/></svg>,
  beaker: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 3h6v6l5 10a2 2 0 0 1-2 3H6a2 2 0 0 1-2-3l5-10z"/><path d="M9 3h6"/></svg>,
  wheat: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22V8"/><path d="M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 12c3 0 5-2 5-5-3 0-5 2-5 5zM12 17c-3 0-5-2-5-5 3 0 5 2 5 5zM12 17c3 0 5-2 5-5-3 0-5 2-5 5z"/></svg>,
  settings: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3h0a1.6 1.6 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v0a1.6 1.6 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/></svg>,
  globe: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>,
};

/* ---------- Logo ---------- */
function Logo({ size = 28 }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ display: "block" }}>
      {/* beer-growler silhouette */}
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#D4A574"/>
          <stop offset="1" stopColor="#8B4513"/>
        </linearGradient>
      </defs>
      <path d="M22 8 h20 v6 l6 8 v30 a6 6 0 0 1 -6 6 h-20 a6 6 0 0 1 -6 -6 v-30 l6 -8 z"
            fill="url(#lg)" stroke="#2C1810" strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="22" y="28" width="20" height="10" fill="#FBF8F2" opacity="0.9"/>
      <text x="32" y="36" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="8" fontWeight="700" fill="#2C1810">mG</text>
    </svg>
  );
}

/* ---------- primitives ---------- */
function Button({ children, variant = "default", size = "md", icon, ...rest }) {
  const base = {
    fontFamily: "IBM Plex Sans, sans-serif",
    fontSize: size === "sm" ? 12 : 13,
    fontWeight: 500,
    padding: size === "sm" ? "6px 10px" : "9px 14px",
    border: "1px solid var(--rule)",
    background: "var(--white)",
    color: "var(--ink)",
    borderRadius: "var(--radius)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "all 120ms ease",
    letterSpacing: "-0.005em",
  };
  const variants = {
    default: {},
    primary: { background: "var(--ink)", color: "var(--white)", borderColor: "var(--ink)" },
    copper: { background: "var(--copper)", color: "var(--white)", borderColor: "var(--copper)" },
    ghost: { background: "transparent", borderColor: "transparent" },
    outline: { background: "transparent" },
    danger: { color: "var(--err)", borderColor: "var(--rule)" },
  };
  return (
    <button
      {...rest}
      style={{ ...base, ...variants[variant], ...(rest.style || {}) }}
      onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(0.98)"; e.currentTarget.style.transform = "translateY(-1px)"; rest.onMouseEnter?.(e); }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.transform = "translateY(0)"; rest.onMouseLeave?.(e); }}
    >
      {icon}{children}
    </button>
  );
}

function Badge({ children, tone = "neutral", size = "md" }) {
  const tones = {
    neutral: { bg: "var(--chip)", fg: "var(--chip-ink)" },
    ok: { bg: "rgba(91,122,63,0.14)", fg: "#3D5529" },
    warn: { bg: "rgba(201,122,43,0.15)", fg: "#7A4617" },
    err: { bg: "rgba(168,58,39,0.12)", fg: "#7E2B1E" },
    ink: { bg: "var(--ink)", fg: "var(--white)" },
    copper: { bg: "rgba(184,99,45,0.14)", fg: "#7A3F1B" },
    hop: { bg: "rgba(107,142,78,0.15)", fg: "#3F5529" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: size === "sm" ? "1px 6px" : "2px 8px",
      background: t.bg,
      color: t.fg,
      fontFamily: "IBM Plex Mono, monospace",
      fontSize: size === "sm" ? 10 : 11,
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      fontWeight: 500,
      borderRadius: "var(--radius)",
      whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

function Card({ children, style, interactive = false, ...rest }) {
  return (
    <div {...rest} style={{
      background: "var(--white)",
      border: "1px solid var(--rule)",
      borderRadius: "var(--radius)",
      padding: "var(--density-y) var(--density-x)",
      transition: "border-color 120ms ease, transform 120ms ease",
      cursor: interactive ? "pointer" : "default",
      ...(style || {}),
    }}
    onMouseEnter={(e) => { if (interactive) e.currentTarget.style.borderColor = "var(--ink-3)"; rest.onMouseEnter?.(e); }}
    onMouseLeave={(e) => { if (interactive) e.currentTarget.style.borderColor = "var(--rule)"; rest.onMouseLeave?.(e); }}
    >{children}</div>
  );
}

function Field({ label, hint, children, style }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
      <span style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", fontFamily: "IBM Plex Mono, monospace" }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: "var(--ink-3)" }}>{hint}</span>}
    </label>
  );
}

function Input({ unit, ...rest }) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "var(--white)", border: "1px solid var(--rule)", borderRadius: "var(--radius)" }}>
      <input {...rest} style={{
        flex: 1, border: "none", background: "transparent", outline: "none",
        padding: "8px 10px", fontFamily: "IBM Plex Sans, sans-serif", fontSize: 13, color: "var(--ink)",
        ...(rest.style || {})
      }}/>
      {unit && <span style={{ padding: "0 10px", fontFamily: "IBM Plex Mono, monospace", fontSize: 11, color: "var(--ink-3)" }}>{unit}</span>}
    </div>
  );
}

function SectionTitle({ eyebrow, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 12, paddingBottom: 10, borderBottom: "1px solid var(--rule-soft)" }}>
      <div>
        {eyebrow && <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4 }}>{eyebrow}</div>}
        <div className="serif" style={{ fontSize: 22, fontWeight: 500, color: "var(--ink)", letterSpacing: "-0.02em" }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function StatTile({ label, value, unit, hint, tone }) {
  return (
    <div style={{ padding: "14px 16px", background: "var(--paper-2)", border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)" }}>
      <div style={{ fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="serif" style={{ fontSize: 28, fontWeight: 500, color: tone === "ok" ? "var(--ok)" : tone === "warn" ? "var(--warn)" : "var(--ink)", letterSpacing: "-0.02em" }}>{value}</span>
        {unit && <span className="mono" style={{ fontSize: 12, color: "var(--ink-3)" }}>{unit}</span>}
      </div>
      {hint && <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

/* ---------- SRM / EBC color swatch ---------- */
function ColorSwatch({ ebc, size = 28 }) {
  // approximate EBC -> hex
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const t = clamp(ebc / 80, 0, 1);
  const colors = [
    [0.00, [252, 243, 178]],
    [0.08, [247, 213, 92]],
    [0.20, [220, 143, 27]],
    [0.35, [167, 80, 18]],
    [0.55, [102, 43, 12]],
    [0.75, [51, 22, 10]],
    [1.00, [20, 10, 5]],
  ];
  let c = colors[0][1];
  for (let i = 1; i < colors.length; i++) {
    if (t <= colors[i][0]) {
      const [a, b] = [colors[i - 1], colors[i]];
      const k = (t - a[0]) / (b[0] - a[0]);
      c = a[1].map((v, j) => Math.round(v + k * (b[1][j] - v)));
      break;
    }
  }
  const hex = `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  return (
    <div title={`EBC ${ebc}`} style={{
      width: size, height: size, borderRadius: 999, background: hex,
      border: "1px solid rgba(0,0,0,0.15)",
      boxShadow: "inset 0 -4px 6px rgba(0,0,0,0.18), inset 0 2px 3px rgba(255,255,255,0.25)",
      flexShrink: 0,
    }}/>
  );
}

/* ---------- bar / progress ---------- */
function Bar({ value, max, tone = "copper" }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const color = tone === "hop" ? "var(--hop)" : tone === "water" ? "var(--water)" : tone === "yeast" ? "var(--yeast)" : "var(--copper)";
  return (
    <div style={{ height: 6, background: "var(--paper-3)", borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, transition: "width 200ms ease" }}/>
    </div>
  );
}

/* ---------- expose ---------- */
Object.assign(window, {
  Icon, Logo, Button, Badge, Card, Field, Input, SectionTitle, StatTile, ColorSwatch, Bar,
});
