// Root app — sidebar + routing + tweak state sync
const { useState: useStateA, useEffect: useEffectA } = React;

function App() {
  const [tweaks, setTweaks] = useStateA({ ...window.__TWEAK_DEFAULTS });
  const [view, setView] = useStateA(() => localStorage.getItem("myGrowl.view") || "recipes");
  const [tweaksOpen, setTweaksOpen] = useStateA(false);
  const [activeBrewRecipe, setActiveBrewRecipe] = useStateA(null);

  // Persist view
  useEffectA(() => localStorage.setItem("myGrowl.view", view), [view]);

  // Apply theme + density to root
  useEffectA(() => {
    document.documentElement.dataset.theme = tweaks.theme;
    document.documentElement.dataset.density = tweaks.density;
  }, [tweaks.theme, tweaks.density]);

  const setTweak = (k, v) => {
    const next = { ...tweaks, [k]: v };
    setTweaks(next);
    window.parent.postMessage({ type: "__edit_mode_set_keys", edits: { [k]: v } }, "*");
  };

  // Edit-mode protocol
  useEffectA(() => {
    const handler = (e) => {
      if (!e.data || typeof e.data !== "object") return;
      if (e.data.type === "__activate_edit_mode") setTweaksOpen(true);
      if (e.data.type === "__deactivate_edit_mode") setTweaksOpen(false);
    };
    window.addEventListener("message", handler);
    window.parent.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);

  const lang = tweaks.language;
  const t = window.useT(lang);

  const startBrew = (recipeId) => {
    setActiveBrewRecipe(recipeId);
    setView("protocol");
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: (view === "recipes" || view === "newRecipe") ? "1fr" : "232px 1fr", minHeight: "100vh", background: "var(--paper)" }}>
      {/* SIDEBAR — hidden in recipes/newRecipe view, which renders its own list-as-sidebar */}
      {view !== "recipes" && view !== "newRecipe" && (
      <aside style={{ borderRight: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid var(--rule-soft)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={32}/>
            <div>
              <div className="serif" style={{ fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}>myGrowl</div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginTop: 3 }}>{t("tagline")}</div>
            </div>
          </div>
        </div>

        <nav style={{ padding: "14px 12px", flex: 1 }}>
          <NavItem icon={<Icon.home/>} label={t("nav.dashboard")} active={view === "dashboard"} onClick={() => setView("dashboard")}/>
          <NavItem icon={<Icon.recipe/>} label={t("nav.recipes")} active={view === "recipes"} onClick={() => setView("recipes")} badge={window.DB.RECIPES.length}/>
          <NavItem icon={<Icon.materials/>} label={t("nav.materials")} active={view === "materials"} onClick={() => setView("materials")} badge={Object.values(window.DB.MATERIALS).flat().length}/>
          <NavItem icon={<Icon.protocol/>} label={t("nav.protocol")} active={view === "protocol"} onClick={() => setView("protocol")} dot="live"/>
        </nav>

        {/* active brew mini-card */}
        <div style={{ margin: 12, padding: 14, background: "var(--white)", border: "1px solid var(--copper)", borderRadius: "var(--radius)", cursor: "pointer" }} onClick={() => setView("protocol")}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--err)", animation: "blink 1.2s infinite" }}/>
            <span className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--err)", fontWeight: 500 }}>{t("protocol.active")}</span>
          </div>
          <div className="serif" style={{ fontSize: 15, fontWeight: 500, marginBottom: 2 }}>Chmielowa Mgła</div>
          <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{lang === "pl" ? "Zacieranie · przerwa 72°C" : "Mashing · 72°C rest"}</div>
          <div style={{ height: 3, background: "var(--paper-3)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
            <div style={{ width: "48%", height: "100%", background: "var(--copper)" }}/>
          </div>
        </div>
        <style>{`@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }`}</style>

        <div style={{ padding: "14px 16px", borderTop: "1px solid var(--rule-soft)", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 16, background: "var(--copper)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Fraunces", fontSize: 14, fontWeight: 500 }}>J</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500 }}>Jan Piwowar</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>HBU #0142</div>
          </div>
          <button onClick={() => setTweak("language", lang === "pl" ? "en" : "pl")} title="Language" style={{ background: "transparent", border: "1px solid var(--rule)", borderRadius: "var(--radius)", padding: "4px 6px", cursor: "pointer", fontFamily: "IBM Plex Mono", fontSize: 10, color: "var(--ink-3)" }}>
            {lang.toUpperCase()}
          </button>
        </div>
      </aside>
      )}

      {/* MAIN */}
      <main style={{ minWidth: 0 }}>
        {view === "dashboard" && <DashboardView t={t} lang={lang} setView={setView} tweaks={tweaks}/>}
        {view === "recipes" && <RecipesView t={t} lang={lang} onStartBrew={startBrew} density={tweaks.density} showAdvanced={tweaks.showAdvanced} onBack={() => setView("dashboard")} onCreate={() => setView("newRecipe")}/>}
        {view === "newRecipe" && window.NewRecipeWizard && (
          <window.NewRecipeWizard
            lang={lang}
            onClose={() => setView("recipes")}
            onSave={(recipe) => {
              setView("recipes");
              window.__justSavedRecipeName = recipe.name;
            }}
          />
        )}
        {view === "materials" && <MaterialsView t={t} lang={lang} density={tweaks.density}/>}
        {view === "protocol" && <ProtocolView t={t} lang={lang} density={tweaks.density} protocolView={tweaks.protocolView} recipeId={activeBrewRecipe}/>}
      </main>

      {tweaksOpen && <TweaksPanel tweaks={tweaks} setTweak={setTweak} onClose={() => setTweaksOpen(false)} lang={lang}/>}
    </div>
  );
}

function NavItem({ icon, label, active, onClick, badge, dot }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, width: "100%",
      padding: "10px 12px", marginBottom: 2,
      background: active ? "var(--white)" : "transparent",
      border: "1px solid " + (active ? "var(--rule)" : "transparent"),
      borderLeft: "2px solid " + (active ? "var(--copper)" : "transparent"),
      color: active ? "var(--ink)" : "var(--ink-2)",
      cursor: "pointer", textAlign: "left",
      fontFamily: "IBM Plex Sans", fontSize: 13.5, fontWeight: active ? 500 : 400,
      borderRadius: "var(--radius)",
      transition: "background 120ms",
    }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--paper-3)"; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ color: active ? "var(--copper)" : "var(--ink-3)", display: "flex" }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", background: active ? "var(--paper-3)" : "transparent", padding: "1px 6px", borderRadius: 8 }}>{badge}</span>}
      {dot === "live" && <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--err)", animation: "blink 1.2s infinite" }}/>}
    </button>
  );
}

function DashboardView({ t, lang, setView, tweaks }) {
  const stats = {
    recipes: window.DB.RECIPES.length,
    brews: window.DB.RECIPES.reduce((s, r) => s + r.brewCount, 0),
    ingredients: Object.values(window.DB.MATERIALS).flat().length,
    avgAbv: (window.DB.RECIPES.reduce((s, r) => s + r.targets.abv, 0) / window.DB.RECIPES.length).toFixed(1),
  };
  return (
    <div style={{ padding: "36px 40px 48px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ marginBottom: 32 }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>{new Date().toLocaleDateString(lang === "pl" ? "pl-PL" : "en-GB", { weekday: "long", day: "numeric", month: "long" })}</div>
        <h1 className="serif" style={{ margin: 0, fontSize: 44, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1.05 }}>{t("dashboard.welcome")}</h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 28 }}>
        <StatTile label={t("dashboard.totalRecipes")} value={stats.recipes}/>
        <StatTile label={t("dashboard.totalBrews")} value={stats.brews}/>
        <StatTile label={t("dashboard.ingredients")} value={stats.ingredients}/>
        <StatTile label={t("dashboard.avgAbv")} value={stats.avgAbv} unit="%"/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 20 }}>
        <Card onClick={() => setView("protocol")} interactive style={{ cursor: "pointer", borderColor: "var(--copper)", padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "22px 24px", background: "linear-gradient(135deg, var(--copper) 0%, var(--copper-2) 100%)", color: "white" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <LivePill t={t}/>
              <span className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.85 }}>{t("protocol.activeSession")}</span>
            </div>
            <div className="serif" style={{ fontSize: 28, fontWeight: 500, letterSpacing: "-0.02em", marginBottom: 6 }}>Chmielowa Mgła</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>{lang === "pl" ? "Zacieranie · przerwa scukrzająca 72°C · 14/30 min" : "Mashing · saccharification rest 72°C · 14/30 min"}</div>
          </div>
          <div style={{ padding: "18px 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
            <Mini label={lang === "pl" ? "Etap" : "Stage"} value="2/8"/>
            <Mini label={t("protocol.elapsed")} value="42 min"/>
            <Mini label={lang === "pl" ? "Temp." : "Temp"} value="71.6" unit="°C"/>
            <Mini label="pH" value="5.35"/>
          </div>
        </Card>

        <Card style={{ padding: 0 }}>
          <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--rule-soft)" }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>{t("dashboard.upcoming")}</div>
            <div className="serif" style={{ fontSize: 18, fontWeight: 500 }}>{lang === "pl" ? "Najbliższe kroki" : "Next up"}</div>
          </div>
          {[
            ["00:16", lang === "pl" ? "Koniec przerwy scukrzającej" : "End saccharification rest", "var(--copper)"],
            ["00:26", lang === "pl" ? "Mash-out 78°C" : "Mash-out 78°C", "var(--copper)"],
            ["01:11", lang === "pl" ? "Początek gotowania" : "Start boil", "var(--warn)"],
            ["02:11", lang === "pl" ? "Dodatek Magnum 15 g" : "Magnum hop 15 g", "var(--hop)"],
          ].map(([time, label, color], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", borderBottom: "1px solid var(--rule-soft)" }}>
              <div style={{ width: 4, height: 28, background: color, borderRadius: 2 }}/>
              <span className="mono" style={{ fontSize: 13, fontWeight: 500, width: 54 }}>{time}</span>
              <span style={{ fontSize: 13, flex: 1 }}>{label}</span>
            </div>
          ))}
        </Card>

        <Card onClick={() => setView("recipes")} interactive>
          <SectionTitle eyebrow={t("nav.recipes")} title={lang === "pl" ? "Biblioteka" : "Library"} right={<Icon.chevron style={{ color: "var(--ink-3)" }}/>}/>
          {window.DB.RECIPES.slice(0, 4).map(r => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px dashed var(--rule-soft)" }}>
              <ColorSwatch ebc={r.targets.ebc} size={28}/>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{lang === "en" ? r.nameEn : r.name}</div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>{r.style}</div>
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                <Mini label="ABV" value={r.targets.abv.toFixed(1)} unit="%"/>
                <Mini label="IBU" value={r.targets.ibu}/>
              </div>
            </div>
          ))}
        </Card>

        <Card onClick={() => setView("materials")} interactive>
          <SectionTitle eyebrow={t("nav.materials")} title={lang === "pl" ? "Niskie zapasy" : "Low stock"} right={<Icon.chevron style={{ color: "var(--ink-3)" }}/>}/>
          {Object.values(window.DB.MATERIALS).flat().filter(m => m.lowStock || m.stock === 0).map(m => (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px dashed var(--rule-soft)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{m.name}</div>
                <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)" }}>{m.supplier}</div>
              </div>
              <span className="mono" style={{ fontSize: 12 }}>{m.stock} {m.unit}</span>
              <Badge tone={m.stock === 0 ? "err" : "warn"}>{m.stock === 0 ? t("materials.outOfStock") : t("materials.lowStock")}</Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

// Mount
ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
