// Recipes view — list + detail + editor
const { useState: useStateR, useMemo: useMemoR } = React;

function RecipesView({ t, lang, onStartBrew, density, showAdvanced, onBack, onCreate }) {
  const [selectedId, setSelectedId] = useStateR("r1");
  const [editing, setEditing] = useStateR(false);
  const [query, setQuery] = useStateR("");
  const [styleFilter, setStyleFilter] = useStateR("all");
  const [creating, setCreating] = useStateR(false);
  const [savedToast, setSavedToast] = useStateR(null);
  const recipes = window.DB.RECIPES;

  const filtered = recipes.filter(r =>
    (styleFilter === "all" || r.style === styleFilter) &&
    (query === "" || r.name.toLowerCase().includes(query.toLowerCase()) || r.style.toLowerCase().includes(query.toLowerCase()))
  );

  const selected = recipes.find(r => r.id === selectedId) || recipes[0];
  const styles = ["all", ...new Set(recipes.map(r => r.style))];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", height: "100vh", minHeight: 0 }}>
      {/* LIST */}
      <aside style={{ borderRight: "1px solid var(--rule)", display: "grid", gridTemplateRows: "auto auto 1fr auto", minHeight: 0, height: "100vh", background: "var(--paper-2)", position: "sticky", top: 0 }}>
        {/* Back button row */}
        <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--rule-soft)", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={onBack} aria-label={lang === "pl" ? "Wróć do menu" : "Back to menu"}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "transparent", border: "1px solid var(--rule)",
              borderRadius: "var(--radius)", padding: "6px 10px 6px 8px",
              cursor: "pointer", fontFamily: "IBM Plex Sans", fontSize: 12.5,
              color: "var(--ink-2)", fontWeight: 500,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "var(--white)"; e.currentTarget.style.borderColor = "var(--ink-3)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "var(--rule)"; }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6"/></svg>
            <span>{lang === "pl" ? "Wróć" : "Back"}</span>
          </button>
          <div style={{ flex: 1 }}/>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Logo size={22}/>
            <div className="serif" style={{ fontSize: 14, fontWeight: 600, letterSpacing: "-0.01em" }}>myGrowl</div>
          </div>
        </div>

        {/* Header / search / filters */}
        <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--rule-soft)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>{t("recipe.subtitle")}</div>
              <div className="serif" style={{ fontSize: 22, letterSpacing: "-0.02em", fontWeight: 500 }}>{t("recipe.title")}</div>
            </div>
            <Badge tone="neutral">{recipes.length}</Badge>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--white)", border: "1px solid var(--rule)", borderRadius: "var(--radius)", padding: "6px 10px", marginBottom: 8 }}>
            <Icon.search style={{ color: "var(--ink-3)" }}/>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("common.search")} style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontFamily: "IBM Plex Sans, sans-serif", fontSize: 13 }}/>
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {styles.map(s => (
              <button key={s} onClick={() => setStyleFilter(s)} style={{
                padding: "3px 8px", fontSize: 11, fontFamily: "IBM Plex Mono, monospace",
                letterSpacing: "0.03em", textTransform: "uppercase",
                background: styleFilter === s ? "var(--ink)" : "transparent",
                color: styleFilter === s ? "var(--white)" : "var(--ink-3)",
                border: "1px solid " + (styleFilter === s ? "var(--ink)" : "var(--rule)"),
                borderRadius: "var(--radius)", cursor: "pointer",
              }}>{s === "all" ? t("common.all") : s.split(" ")[0]}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowY: "auto", padding: 12, minHeight: 0 }}>
          {filtered.map(r => (
            <div key={r.id} onClick={() => { setSelectedId(r.id); setEditing(false); }}
              style={{
                padding: "12px 14px", marginBottom: 6, borderRadius: "var(--radius)", cursor: "pointer",
                background: r.id === selectedId ? "var(--white)" : "transparent",
                border: "1px solid " + (r.id === selectedId ? "var(--ink)" : "transparent"),
                transition: "background 120ms ease",
              }}
              onMouseEnter={e => { if (r.id !== selectedId) e.currentTarget.style.background = "var(--paper-3)"; }}
              onMouseLeave={e => { if (r.id !== selectedId) e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <ColorSwatch ebc={r.targets.ebc} size={32}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="serif" style={{ fontWeight: 500, fontSize: 16, letterSpacing: "-0.01em", color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {lang === "en" ? r.nameEn : r.name}
                  </div>
                  <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>
                    {r.style}
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 10, paddingTop: 10, borderTop: "1px dashed var(--rule-soft)" }}>
                <Mini label="ABV" value={r.targets.abv.toFixed(1)} unit="%"/>
                <Mini label="IBU" value={r.targets.ibu}/>
                <Mini label="EBC" value={r.targets.ebc}/>
                <Mini label="vol" value={r.volume} unit="L"/>
              </div>
            </div>
          ))}
        </div>
        <div style={{ padding: 14, borderTop: "1px solid var(--rule-soft)" }}>
          <Button variant="primary" icon={<Icon.plus/>} onClick={onCreate} style={{ width: "100%", justifyContent: "center" }}>{t("recipe.newRecipe")}</Button>
        </div>
      </aside>

      {/* DETAIL */}
      <section style={{ overflowY: "auto", padding: "0", background: "var(--paper)", minHeight: 0 }}>
        <RecipeDetail recipe={selected} t={t} lang={lang} editing={editing} setEditing={setEditing} onStartBrew={() => onStartBrew(selected.id)} showAdvanced={showAdvanced}/>
      </section>

      {creating && false && window.NewRecipeWizard && (
        <window.NewRecipeWizard
          lang={lang}
          onClose={() => setCreating(false)}
          onSave={(recipe) => {
            setCreating(false);
            setSavedToast(lang === "pl" ? `Zapisano: ${recipe.name}` : `Saved: ${recipe.name}`);
            setTimeout(() => setSavedToast(null), 3000);
          }}
        />
      )}

      {savedToast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--ink)", color: "var(--white)", padding: "12px 20px",
          borderRadius: "var(--radius)", fontSize: 13, zIndex: 300,
          boxShadow: "0 10px 30px -10px rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <Icon.check style={{ color: "var(--ok)" }}/>
          {savedToast}
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, unit }) {
  return (
    <div style={{ flex: 1 }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>{label}</div>
      <div className="mono" style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500, marginTop: 1 }}>{value}{unit && <span style={{ color: "var(--ink-3)", fontWeight: 400, marginLeft: 2 }}>{unit}</span>}</div>
    </div>
  );
}

function RecipeDetail({ recipe, t, lang, editing, setEditing, onStartBrew, showAdvanced }) {
  if (!recipe) return null;
  const [tab, setTab] = useStateR("overview");

  return (
    <div>
      {/* HEADER */}
      <div style={{ padding: "28px 32px 20px", borderBottom: "1px solid var(--rule)", background: "var(--paper-2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <Badge tone="copper">{recipe.bjcp} · {recipe.style}</Badge>
              <Badge tone="neutral">v{recipe.version}</Badge>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {t("recipe.brewed")} {recipe.brewCount} {recipe.brewCount === 1 ? t("recipe.once") : t("recipe.times")}
                {recipe.lastBrewed && ` · ${t("recipe.lastBrewed")} ${recipe.lastBrewed}`}
              </span>
            </div>
            <h1 className="serif" style={{ margin: 0, fontSize: 44, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1 }}>{lang === "en" ? recipe.nameEn : recipe.name}</h1>
            <div style={{ marginTop: 10, color: "var(--ink-3)", fontSize: 13, maxWidth: 520 }}>
              {lang === "pl" ? "Jasny pale ale ze środkowym body, silnym aromatem tropikalnym i wyraźną goryczką. Dobre warzenie w 4–5 godzin." : "Pale ale with medium body, strong tropical aroma and firm bitterness. 4–5 hour brew day."}
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
            <div style={{ display: "flex", gap: 6 }}>
              <Button variant="outline" size="sm" icon={<Icon.copy/>}>{t("recipe.duplicate")}</Button>
              <Button variant="outline" size="sm" icon={<Icon.pdf/>}>{t("common.export")}</Button>
              <Button variant={editing ? "primary" : "outline"} size="sm" icon={<Icon.edit/>} onClick={() => setEditing(!editing)}>
                {editing ? t("common.save") : t("common.edit")}
              </Button>
            </div>
            <Button variant="copper" icon={<Icon.flame/>} onClick={onStartBrew}>{t("recipe.startBrew")}</Button>
          </div>
        </div>

        {/* target parameters strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr) 80px", gap: 14, marginTop: 22 }}>
          <StatTile label="OG" value={recipe.targets.og.toFixed(3)}/>
          <StatTile label="FG" value={recipe.targets.fg.toFixed(3)}/>
          <StatTile label="ABV" value={recipe.targets.abv.toFixed(1)} unit="%"/>
          <StatTile label="IBU" value={recipe.targets.ibu}/>
          <StatTile label="EBC" value={recipe.targets.ebc}/>
          <StatTile label={t("recipe.volume")} value={recipe.volume} unit="L"/>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 14, background: "var(--paper-3)", borderRadius: "var(--radius)", border: "1px solid var(--rule-soft)" }}>
            <ColorSwatch ebc={recipe.targets.ebc} size={56}/>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div style={{ padding: "0 32px", borderBottom: "1px solid var(--rule)", background: "var(--paper)", position: "sticky", top: 0, zIndex: 2 }}>
        <div style={{ display: "flex", gap: 2 }}>
          {[
            ["overview", lang === "pl" ? "Przegląd" : "Overview"],
            ["grain", t("recipe.grainBill")],
            ["hops", t("recipe.hopSchedule")],
            ["yeast", t("recipe.yeast")],
            ["mash", t("recipe.mashSchedule")],
            ["ferment", t("recipe.fermentation")],
            ["water", t("recipe.waterProfile")],
            ["history", t("recipe.notes")],
          ].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: "14px 14px 12px", fontSize: 12.5, fontFamily: "IBM Plex Sans, sans-serif", fontWeight: 500,
              background: "transparent", border: "none", cursor: "pointer",
              color: tab === k ? "var(--ink)" : "var(--ink-3)",
              borderBottom: "2px solid " + (tab === k ? "var(--copper)" : "transparent"),
              marginBottom: -1, letterSpacing: "-0.005em",
            }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: "24px 32px 48px" }}>
        {tab === "overview" && <Overview recipe={recipe} t={t} lang={lang}/>}
        {tab === "grain" && <GrainBill recipe={recipe} t={t} editing={editing}/>}
        {tab === "hops" && <HopSchedule recipe={recipe} t={t} editing={editing}/>}
        {tab === "yeast" && <YeastPanel recipe={recipe} t={t} lang={lang}/>}
        {tab === "mash" && <MashSchedule recipe={recipe} t={t} editing={editing}/>}
        {tab === "ferment" && <FermentationPanel recipe={recipe} t={t} lang={lang}/>}
        {tab === "water" && <WaterProfile recipe={recipe} t={t} showAdvanced={showAdvanced}/>}
        {tab === "history" && <History recipe={recipe} t={t}/>}
      </div>
    </div>
  );
}

function Overview({ recipe, t, lang }) {
  const totalGrain = recipe.grainBill.reduce((s, g) => s + g.qty, 0);
  const totalHops = recipe.hops.reduce((s, h) => s + h.qty, 0);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <Card>
        <SectionTitle eyebrow={t("recipe.grainBill")} title={`${totalGrain.toFixed(2)} kg`} right={<Badge>{recipe.grainBill.length}</Badge>}/>
        {recipe.grainBill.map(g => (
          <div key={g.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr 60px 50px", gap: 10, alignItems: "center", padding: "10px 0", borderBottom: "1px dashed var(--rule-soft)" }}>
            <ColorSwatch ebc={g.ebc} size={22}/>
            <div>
              <div style={{ fontWeight: 500 }}>{g.name}</div>
              <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{g.origin}</div>
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--ink)", textAlign: "right" }}>{g.qty.toFixed(2)} kg</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right" }}>{g.pct}%</span>
              <Bar value={g.pct} max={100} tone="copper"/>
            </div>
          </div>
        ))}
      </Card>

      <Card>
        <SectionTitle eyebrow={t("recipe.hopSchedule")} title={`${totalHops} g`} right={<Badge tone="hop">{recipe.hops.length}</Badge>}/>
        <HopTimelineMini recipe={recipe} t={t}/>
      </Card>

      <Card>
        <SectionTitle eyebrow={t("recipe.yeast")} title={recipe.yeast.strain}/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Mini label={t("recipe.attenuation")} value={recipe.yeast.attenuation} unit="%"/>
          <Mini label={t("recipe.tempRange")} value={`${recipe.yeast.tempMin}–${recipe.yeast.tempMax}`} unit="°C"/>
          <Mini label={t("recipe.flocculation")} value={recipe.yeast.flocculation}/>
        </div>
      </Card>

      <Card>
        <SectionTitle eyebrow={t("recipe.mashSchedule")} title={`${recipe.mash.reduce((s, m) => s + m.duration, 0)} ${t("common.min")}`}/>
        <MashProfileChart rests={recipe.mash} t={t}/>
      </Card>
    </div>
  );
}

function HopTimelineMini({ recipe, t }) {
  // timeline 0 → 60 min boil + whirlpool + dry hop
  const boilTime = recipe.boilTime || 60;
  const pctFor = (time, type) => {
    if (type === "whirlpool") return 101;
    if (type === "dryHop") return 110;
    return ((boilTime - time) / boilTime) * 100;
  };
  return (
    <div>
      <div style={{ position: "relative", height: 120, margin: "14px 0 24px" }}>
        {/* axis */}
        <div style={{ position: "absolute", left: 0, right: 0, top: 60, height: 2, background: "var(--rule)" }}/>
        {[0, 15, 30, 45, 60].map((m) => (
          <div key={m} style={{ position: "absolute", left: `${(m / boilTime) * 83}%`, top: 0, bottom: 0, borderLeft: "1px dashed var(--rule-soft)" }}>
            <span className="mono" style={{ position: "absolute", bottom: -18, left: -8, fontSize: 10, color: "var(--ink-3)" }}>{boilTime - m}</span>
          </div>
        ))}
        <div style={{ position: "absolute", left: "85%", top: 0, bottom: 0, borderLeft: "1px dashed var(--rule-soft)" }}>
          <span className="mono" style={{ position: "absolute", bottom: -18, left: -15, fontSize: 10, color: "var(--ink-3)" }}>WP</span>
        </div>
        <div style={{ position: "absolute", left: "95%", top: 0, bottom: 0, borderLeft: "1px dashed var(--rule-soft)" }}>
          <span className="mono" style={{ position: "absolute", bottom: -18, left: -12, fontSize: 10, color: "var(--ink-3)" }}>DH</span>
        </div>
        {recipe.hops.map((h, i) => {
          const left = h.type === "whirlpool" ? 86 : h.type === "dryHop" ? 96 : ((boilTime - h.time) / boilTime) * 83;
          const size = Math.min(40, 14 + h.qty * 0.4);
          return (
            <div key={h.id} title={`${h.name} — ${h.qty}g @ ${h.time} min`} style={{
              position: "absolute", left: `${left}%`, top: 60 - size / 2, width: size, height: size,
              background: h.type === "dryHop" ? "var(--hop-2)" : "var(--hop)",
              borderRadius: "50%", border: "2px solid var(--paper-2)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "var(--white)", fontFamily: "IBM Plex Mono, monospace", fontSize: 10, fontWeight: 500,
              transform: "translateX(-50%)",
            }}>{h.qty}</div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recipe.hops.map(h => (
          <div key={h.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 60px 60px", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px dashed var(--rule-soft)" }}>
            <div><span style={{ fontWeight: 500 }}>{h.name}</span> <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>α {h.alpha}%</span></div>
            <Badge tone={h.type === "dryHop" ? "hop" : "neutral"}>{t(`recipe.${h.type}`)}</Badge>
            <span className="mono" style={{ fontSize: 12, textAlign: "right" }}>{h.qty} g</span>
            <span className="mono" style={{ fontSize: 12, textAlign: "right", color: "var(--ink-3)" }}>{h.time} {t("common.min")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MashProfileChart({ rests, t }) {
  // line chart of temp over time
  const totalTime = rests.reduce((s, r) => s + r.duration + (r.ramp || 0), 0);
  const maxT = Math.max(...rests.map(r => r.temp)) + 6;
  const minT = 20;
  const W = 560, H = 180, pad = { l: 36, r: 12, t: 12, b: 28 };
  const timeToX = (m) => pad.l + (m / totalTime) * (W - pad.l - pad.r);
  const tempToY = (temp) => H - pad.b - ((temp - minT) / (maxT - minT)) * (H - pad.t - pad.b);

  let pts = [{ t: 0, y: 20 }];
  let cursor = 0;
  let prev = 20;
  rests.forEach(r => {
    cursor += r.ramp || 1;
    pts.push({ t: cursor, y: r.temp });
    cursor += r.duration;
    pts.push({ t: cursor, y: r.temp });
    prev = r.temp;
  });

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${timeToX(p.t)} ${tempToY(p.y)}`).join(" ");
  const fillPath = path + ` L ${timeToX(cursor)} ${H - pad.b} L ${pad.l} ${H - pad.b} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* grid */}
        {[30, 50, 70, 90].map(temp => (
          <g key={temp}>
            <line x1={pad.l} x2={W - pad.r} y1={tempToY(temp)} y2={tempToY(temp)} stroke="var(--rule-soft)" strokeDasharray="3 3"/>
            <text x={pad.l - 6} y={tempToY(temp) + 3} fontFamily="IBM Plex Mono" fontSize="10" fill="var(--ink-3)" textAnchor="end">{temp}°</text>
          </g>
        ))}
        <path d={fillPath} fill="var(--copper)" fillOpacity="0.10"/>
        <path d={path} fill="none" stroke="var(--copper)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        {rests.map((r, i) => {
          const x = timeToX(pts[1 + i * 2].t);
          return (
            <g key={i}>
              <circle cx={x} cy={tempToY(r.temp)} r="4" fill="var(--copper)" stroke="var(--white)" strokeWidth="2"/>
              <text x={x} y={tempToY(r.temp) - 10} fontFamily="IBM Plex Mono" fontSize="10" fill="var(--ink)" textAnchor="middle" fontWeight="500">{r.temp}°</text>
            </g>
          );
        })}
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 10 }}>
        {rests.map(r => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 50px 60px", gap: 8, fontSize: 12, padding: "6px 0", borderBottom: "1px dashed var(--rule-soft)" }}>
            <span>{r.name}</span>
            <span className="mono" style={{ color: "var(--ink-3)", textAlign: "right" }}>{r.temp}°C</span>
            <span className="mono" style={{ color: "var(--ink-3)", textAlign: "right" }}>{r.duration} {t("common.min")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function GrainBill({ recipe, t, editing }) {
  return (
    <Card>
      <SectionTitle eyebrow={t("recipe.grainBill")} title={`${recipe.grainBill.reduce((s, g) => s + g.qty, 0).toFixed(2)} kg`}
        right={editing && <Button size="sm" icon={<Icon.plus/>}>{t("recipe.addIngredient")}</Button>}/>
      <div style={{ display: "grid", gridTemplateColumns: "28px 2fr 1fr 80px 80px 80px", gap: 12, padding: "8px 0", borderBottom: "1px solid var(--rule)", fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>
        <div></div><div>Składnik</div><div>Producent</div><div style={{ textAlign: "right" }}>EBC</div><div style={{ textAlign: "right" }}>Ilość</div><div style={{ textAlign: "right" }}>%</div>
      </div>
      {recipe.grainBill.map(g => (
        <div key={g.id} style={{ display: "grid", gridTemplateColumns: "28px 2fr 1fr 80px 80px 80px", gap: 12, padding: "12px 0", borderBottom: "1px dashed var(--rule-soft)", alignItems: "center" }}>
          <ColorSwatch ebc={g.ebc}/>
          <div style={{ fontWeight: 500 }}>{g.name}</div>
          <div style={{ color: "var(--ink-3)" }}>{g.origin}</div>
          <div className="mono" style={{ textAlign: "right" }}>{g.ebc}</div>
          <div className="mono" style={{ textAlign: "right", fontWeight: 500 }}>{g.qty.toFixed(2)} kg</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="mono" style={{ fontSize: 11, textAlign: "right" }}>{g.pct}%</span>
            <Bar value={g.pct} max={100}/>
          </div>
        </div>
      ))}
    </Card>
  );
}

function HopSchedule({ recipe, t, editing }) {
  return (
    <Card>
      <SectionTitle eyebrow={t("recipe.hopSchedule")} title={`${recipe.hops.reduce((s, h) => s + h.qty, 0)} g`}
        right={editing && <Button size="sm" icon={<Icon.plus/>}>{t("recipe.addHop")}</Button>}/>
      <HopTimelineMini recipe={recipe} t={t}/>
    </Card>
  );
}

function YeastPanel({ recipe, t, lang }) {
  const y = recipe.yeast;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
      <Card>
        <SectionTitle eyebrow={t("recipe.yeast")} title={y.strain}/>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <StatTile label={t("recipe.attenuation")} value={y.attenuation} unit="%"/>
          <StatTile label={t("recipe.flocculation")} value={y.flocculation}/>
          <StatTile label={t("recipe.tempRange")} value={`${y.tempMin}–${y.tempMax}`} unit="°C"/>
          <StatTile label="Pitch" value={y.pitchTemp} unit="°C"/>
        </div>
      </Card>
      <Card>
        <SectionTitle eyebrow={lang === "pl" ? "Profil temperatury" : "Temperature profile"} title={`${y.tempMin}–${y.tempMax}°C`}/>
        <div style={{ padding: "20px 0" }}>
          <div style={{ position: "relative", height: 40, background: "linear-gradient(to right, #7AA2CB, #D9A441, #C97A2B)", borderRadius: 4 }}>
            <div style={{ position: "absolute", top: -4, bottom: -4, left: `${(y.tempMin / 30) * 100}%`, right: `${100 - (y.tempMax / 30) * 100}%`, border: "2px solid var(--ink)", borderRadius: 4, background: "rgba(255,255,255,0.3)" }}/>
            <div style={{ position: "absolute", top: -6, bottom: -6, left: `${(y.pitchTemp / 30) * 100}%`, width: 2, background: "var(--ink)" }}/>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>0°C</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>15°C</span>
            <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>30°C</span>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MashSchedule({ recipe, t, editing }) {
  return (
    <Card>
      <SectionTitle eyebrow={t("recipe.mashSchedule")} title={`${recipe.mash.length} ${recipe.mash.length === 1 ? "przerwa" : "przerw"} · ${recipe.mash.reduce((s, m) => s + m.duration, 0)} min`}
        right={editing && <Button size="sm" icon={<Icon.plus/>}>{t("recipe.addRest")}</Button>}/>
      <MashProfileChart rests={recipe.mash} t={t}/>
    </Card>
  );
}

function FermentationPanel({ recipe, t, lang }) {
  // Normalize fermentation data: support both new object shape ({primary, secondary, bottle}) and legacy array
  const f = recipe.fermentation;
  let phases;
  if (Array.isArray(f)) {
    phases = f;
  } else {
    phases = [];
    if (f.primary) phases.push({ phase: "primary", days: f.primary.days, temp: f.primary.temp });
    if (f.secondary && f.secondary.enabled) phases.push({ phase: "secondary", days: f.secondary.days, temp: f.secondary.temp });
    if (f.bottle) phases.push({ phase: "bottle", days: f.bottle.days, temp: f.bottle.temp ?? 20 });
  }
  const totalDays = phases.reduce((s, p) => s + p.days, 0) || 1;
  return (
    <Card>
      <SectionTitle eyebrow={t("recipe.fermentation")} title={`${totalDays} dni`}/>
      <div style={{ display: "flex", height: 60, border: "1px solid var(--rule)", borderRadius: "var(--radius)", overflow: "hidden" }}>
        {phases.map((p, i) => {
          const pct = (p.days / totalDays) * 100;
          const bg = p.phase === "primary" ? "var(--copper)" : p.phase === "dryHop" ? "var(--hop)" : "var(--water)";
          return (
            <div key={i} style={{ width: `${pct}%`, background: bg, color: "var(--white)", padding: "8px 12px", display: "flex", flexDirection: "column", justifyContent: "space-between", borderRight: i < phases.length - 1 ? "1px solid var(--white)" : "none" }}>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.9 }}>{t(`recipe.${p.phase}`)}</div>
              <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{p.days} dni · {p.temp}°C</div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function WaterProfile({ recipe, t, showAdvanced }) {
  const w = recipe.water;
  if (!w.profile) return <Card><div style={{ color: "var(--ink-3)" }}>Brak profilu wody.</div></Card>;
  const ions = [
    ["Ca²⁺", w.ca, "mg/L", "var(--copper)"],
    ["Mg²⁺", w.mg, "mg/L", "var(--hop)"],
    ["Na⁺", w.na, "mg/L", "var(--water)"],
    ["SO₄²⁻", w.so4, "mg/L", "var(--yeast)"],
    ["Cl⁻", w.cl, "mg/L", "var(--ink-3)"],
    ["HCO₃⁻", w.hco3, "mg/L", "var(--copper-2)"],
  ];
  const maxVal = Math.max(...ions.map(i => i[1]));
  return (
    <Card>
      <SectionTitle eyebrow={t("recipe.waterProfile")} title={w.profile}/>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 12, marginBottom: 20 }}>
        {ions.map(([name, val, unit, color]) => (
          <div key={name} style={{ padding: "12px", background: "var(--paper-2)", borderRadius: "var(--radius)", border: "1px solid var(--rule-soft)", textAlign: "center" }}>
            <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginBottom: 4 }}>{name}</div>
            <div className="serif" style={{ fontSize: 22, fontWeight: 500 }}>{val}</div>
            <div className="mono" style={{ fontSize: 9, color: "var(--ink-3)" }}>{unit}</div>
            <div style={{ height: 4, background: "var(--paper-3)", borderRadius: 2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: `${(val / maxVal) * 100}%`, height: "100%", background: color }}/>
            </div>
          </div>
        ))}
      </div>
      {showAdvanced && (
        <div style={{ padding: 14, background: "var(--paper-2)", borderRadius: "var(--radius)", border: "1px solid var(--rule-soft)", display: "flex", gap: 24 }}>
          <Mini label="pH docelowe" value={w.ph}/>
          <Mini label="Stosunek SO₄/Cl" value={(w.so4 / w.cl).toFixed(2)}/>
          <Mini label="Twardość" value={Math.round(2.5 * w.ca + 4.1 * w.mg)} unit="mg/L CaCO₃"/>
        </div>
      )}
    </Card>
  );
}

function History({ recipe, t }) {
  return (
    <Card>
      <SectionTitle eyebrow={t("recipe.notes")} title={`v${recipe.version}`}/>
      {recipe.history.length === 0 ? (
        <div style={{ color: "var(--ink-3)", padding: "20px 0" }}>—</div>
      ) : (
        <div style={{ position: "relative", paddingLeft: 20 }}>
          <div style={{ position: "absolute", left: 7, top: 12, bottom: 12, width: 1, background: "var(--rule)" }}/>
          {recipe.history.map(h => (
            <div key={h.v} style={{ position: "relative", padding: "12px 0", borderBottom: "1px dashed var(--rule-soft)" }}>
              <div style={{ position: "absolute", left: -20, top: 16, width: 14, height: 14, borderRadius: "50%", background: "var(--paper-2)", border: "2px solid var(--copper)" }}/>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                <Badge tone="copper">v{h.v}</Badge>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{h.date}</span>
              </div>
              <div>{h.note}</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

Object.assign(window, { RecipesView, Mini, HopTimelineMini, MashProfileChart });
