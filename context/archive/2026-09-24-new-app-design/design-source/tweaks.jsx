// Tweaks panel — visible when edit-mode is active
const { useState: useStateTw, useEffect: useEffectTw } = React;

function TweaksPanel({ tweaks, setTweak, onClose, lang }) {
  return (
    <div className="no-print" style={{
      position: "fixed", right: 16, bottom: 16, zIndex: 200,
      width: 320, background: "var(--white)", border: "1px solid var(--ink)",
      borderRadius: "var(--radius)", boxShadow: "0 20px 40px -10px rgba(44,24,16,0.35)",
      fontFamily: "IBM Plex Sans, sans-serif",
    }}>
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--paper-2)" }}>
        <div>
          <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}>{lang === "pl" ? "Panel projektanta" : "Designer panel"}</div>
          <div className="serif" style={{ fontSize: 17, fontWeight: 500 }}>Tweaks</div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 4 }}><Icon.x/></button>
      </div>
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 16, maxHeight: "70vh", overflowY: "auto" }}>
        <TweakGroup label={lang === "pl" ? "Motyw" : "Theme"}>
          <TweakChips value={tweaks.theme} options={[["paper", lang === "pl" ? "Papier" : "Paper"], ["dark", lang === "pl" ? "Ciemny" : "Dark"], ["swiss", "Swiss"]]} onChange={v => setTweak("theme", v)}/>
        </TweakGroup>
        <TweakGroup label={lang === "pl" ? "Gęstość interfejsu" : "UI density"}>
          <TweakChips value={tweaks.density} options={[["comfortable", lang === "pl" ? "Luźna" : "Comfortable"], ["compact", lang === "pl" ? "Kompakt" : "Compact"]]} onChange={v => setTweak("density", v)}/>
        </TweakGroup>
        <TweakGroup label={lang === "pl" ? "Widok protokołu" : "Protocol view"}>
          <TweakChips value={tweaks.protocolView} options={[["timeline", "Timeline"], ["checklist", lang === "pl" ? "Lista" : "Checklist"], ["table", lang === "pl" ? "Tabela" : "Table"]]} onChange={v => setTweak("protocolView", v)}/>
        </TweakGroup>
        <TweakGroup label={lang === "pl" ? "Układ dashboardu" : "Dashboard layout"}>
          <TweakChips value={tweaks.dashboardLayout} options={[["split", "Split"], ["cards", lang === "pl" ? "Kafelki" : "Cards"], ["timeline", "Timeline"]]} onChange={v => setTweak("dashboardLayout", v)}/>
        </TweakGroup>
        <TweakGroup label={lang === "pl" ? "Język" : "Language"}>
          <TweakChips value={tweaks.language} options={[["pl", "Polski"], ["en", "English"]]} onChange={v => setTweak("language", v)}/>
        </TweakGroup>
        <TweakGroup label={lang === "pl" ? "Zaawansowane pola" : "Advanced fields"}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
            <input type="checkbox" checked={tweaks.showAdvanced} onChange={e => setTweak("showAdvanced", e.target.checked)}/>
            {lang === "pl" ? "Pokaż obliczenia wody i profile BJCP" : "Show water chemistry & BJCP stats"}
          </label>
        </TweakGroup>
      </div>
    </div>
  );
}

function TweakGroup({ label, children }) {
  return (
    <div>
      <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function TweakChips({ value, options, onChange }) {
  return (
    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: "6px 10px", fontSize: 12, fontFamily: "IBM Plex Sans",
          background: value === v ? "var(--ink)" : "var(--white)",
          color: value === v ? "var(--white)" : "var(--ink)",
          border: "1px solid " + (value === v ? "var(--ink)" : "var(--rule)"),
          borderRadius: "var(--radius)", cursor: "pointer",
          fontWeight: value === v ? 500 : 400,
        }}>{label}</button>
      ))}
    </div>
  );
}

window.TweaksPanel = TweaksPanel;
