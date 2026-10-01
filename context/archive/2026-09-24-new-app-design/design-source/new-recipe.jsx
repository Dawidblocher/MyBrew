// New Recipe wizard — multi-step creation flow
const { useState: useStateNR, useEffect: useEffectNR, useMemo: useMemoNR } = React;

// ---- BJCP style presets (condensed, homebrewer-relevant) ----
const BJCP_STYLES = [
  { code: "18B", name: "American Pale Ale", og: [1.045, 1.060], fg: [1.010, 1.015], abv: [4.5, 6.2], ibu: [30, 50], ebc: [10, 20] },
  { code: "21A", name: "American IPA", og: [1.056, 1.070], fg: [1.008, 1.014], abv: [5.5, 7.5], ibu: [40, 70], ebc: [12, 28] },
  { code: "21B", name: "NEIPA / Hazy IPA", og: [1.060, 1.085], fg: [1.010, 1.015], abv: [6.0, 9.0], ibu: [25, 60], ebc: [6, 14] },
  { code: "3B", name: "Czech Premium Pale Lager", og: [1.044, 1.060], fg: [1.013, 1.017], abv: [4.2, 5.8], ibu: [30, 45], ebc: [7, 16] },
  { code: "5D", name: "German Pils", og: [1.044, 1.050], fg: [1.008, 1.013], abv: [4.4, 5.2], ibu: [22, 40], ebc: [4, 10] },
  { code: "10A", name: "Weissbier / Hefeweizen", og: [1.044, 1.052], fg: [1.010, 1.014], abv: [4.3, 5.6], ibu: [8, 15], ebc: [4, 14] },
  { code: "20A", name: "American Porter", og: [1.050, 1.070], fg: [1.012, 1.018], abv: [4.8, 6.5], ibu: [25, 50], ebc: [40, 70] },
  { code: "20B", name: "American Stout", og: [1.050, 1.075], fg: [1.010, 1.022], abv: [5.0, 7.0], ibu: [35, 75], ebc: [60, 80] },
  { code: "16A", name: "Sweet Stout", og: [1.044, 1.060], fg: [1.012, 1.024], abv: [4.0, 6.0], ibu: [20, 40], ebc: [60, 80] },
  { code: "27", name: "Rauchbier", og: [1.050, 1.057], fg: [1.012, 1.016], abv: [4.8, 6.0], ibu: [20, 30], ebc: [24, 44] },
  { code: "23B", name: "Flanders Red Ale", og: [1.048, 1.057], fg: [1.002, 1.012], abv: [4.6, 6.5], ibu: [10, 25], ebc: [20, 32] },
  { code: "custom", name: "Własny (bez presetu)", og: [1.040, 1.060], fg: [1.008, 1.016], abv: [4.0, 6.0], ibu: [20, 40], ebc: [8, 30] },
];

const MASH_PRESETS = {
  infusion: { label: "Infuzja (jednotemp.)", rests: [{ name: "Przerwa scukrzająca", temp: 67, duration: 60 }, { name: "Mash-out", temp: 78, duration: 10 }] },
  step: { label: "Wieloetapowa (step)", rests: [{ name: "Przerwa białkowa", temp: 52, duration: 15 }, { name: "Przerwa maltozowa", temp: 63, duration: 30 }, { name: "Przerwa scukrzająca", temp: 72, duration: 30 }, { name: "Mash-out", temp: 78, duration: 10 }] },
  decoction: { label: "Dekokcja uproszczona", rests: [{ name: "Ferulic rest", temp: 45, duration: 15 }, { name: "Przerwa maltozowa", temp: 62, duration: 40 }, { name: "Przerwa scukrzająca", temp: 72, duration: 20 }, { name: "Mash-out", temp: 78, duration: 10 }] },
  custom: { label: "Własny", rests: [] },
};

function emptyRecipe() {
  return {
    name: "",
    nameEn: "",
    style: "18B",
    version: 1,
    volume: 23,
    boilTime: 60,
    boilOffRate: 3,        // L/h evaporation
    boilLoss: 1,           // L kettle loss (trub etc)
    fermLoss: 1.5,         // L fermenter loss
    dryHopLoss: 0.5,       // L absorbed by dry hop
    mashRatio: 3.0,        // L water per kg grain
    mashEfficiency: 75,    // mash conversion efficiency
    efficiency: 72,        // brewhouse efficiency
    targets: { og: 1.052, fg: 1.011, abv: 5.4, ibu: 35, ebc: 12, srm: 6 },
    grainBill: [],
    hops: [],
    yeast: { strain: "", attenuation: 81, flocculation: "średnia", tempMin: 15, tempMax: 22, pitchTemp: 19 },
    mashPreset: "step",
    mash: MASH_PRESETS.step.rests.map((r, i) => ({ id: `m${i}`, ramp: 1, ...r })),
    fermentation: {
      primary: { temp: 19, days: 7 },
      secondary: { enabled: false, temp: 14, days: 7 },
      bottle: { days: 14 },
    },
    adjuncts: [],
    water: { profile: "", ca: 0, mg: 0, na: 0, so4: 0, cl: 0, hco3: 0, ph: 5.4 },
    notes: "",
  };
}

const WIZARD_STEPS = [
  { key: "basics", label: "Podstawy", labelEn: "Basics", hint: "Nazwa, styl, objętość" },
  { key: "grain", label: "Zasyp", labelEn: "Grain", hint: "Słody i procenty" },
  { key: "mash", label: "Zacieranie", labelEn: "Mash", hint: "Przerwy temperaturowe" },
  { key: "hops", label: "Chmielenie", labelEn: "Hops", hint: "Plan chmielenia" },
  { key: "yeast", label: "Drożdże", labelEn: "Yeast", hint: "Szczep i fermentacja" },
  { key: "water", label: "Woda", labelEn: "Water", hint: "Profil i dodatki" },
  { key: "review", label: "Podgląd", labelEn: "Review", hint: "Podsumowanie" },
];

/* ===========================================================
   COMPUTED STATS — derived from grain bill, hops, yeast, volume
   =========================================================== */
// PPG (points per pound per gallon) approximation by EBC.
// Base malts ~37, crystal/caramel ~33, dark/roast ~28. Use EBC heuristic.
function ppgForEbc(ebc) {
  if (ebc <= 8) return 37;       // pilsner / pale base
  if (ebc <= 25) return 35;      // munich / vienna / light crystal
  if (ebc <= 80) return 33;      // medium-dark crystal
  if (ebc <= 200) return 30;     // chocolate / brown
  return 28;                     // roasted / black
}
// Convert PPG (points/lb/gal) → points/kg/L: factor ≈ 8.345
const PPG_TO_PKL = 8.345;

// Compute water/volume breakdown from batch parameters.
function computeVolumes(recipe) {
  const finalVolume = +recipe.volume || 0;
  const fermLoss = +recipe.fermLoss || 0;
  const dryHopLoss = +recipe.dryHopLoss || 0;
  const boilLoss = +recipe.boilLoss || 0;
  const boilOffRate = +recipe.boilOffRate || 0;
  const boilTime = +recipe.boilTime || 0;
  const ratio = +recipe.mashRatio || 3;

  const totalGrainKg = (recipe.grainBill || []).reduce((s, g) => s + (+g.qty || 0), 0);

  // Post-boil (kettle) volume = final beer + fermenter loss + dry-hop loss + kettle/trub loss
  const postBoilVolume = finalVolume + fermLoss + dryHopLoss + boilLoss;
  // Pre-boil = post-boil + evaporation
  const preBoilVolume = postBoilVolume + boilOffRate * (boilTime / 60);

  // Mash water (L) = grain weight × ratio
  const mashWater = totalGrainKg * ratio;
  // Grain takes up ~0.67 L per kg in displaced volume
  const totalMashVolume = mashWater + totalGrainKg * 0.67;
  // Sparge = preBoilVolume - mashWater + absorption (each kg absorbs ≈ 0.96 L net)
  const spargeWater = Math.max(0, preBoilVolume - mashWater + totalGrainKg * 0.96);

  return { totalGrainKg, postBoilVolume, preBoilVolume, mashWater, totalMashVolume, spargeWater };
}

function computeStats(recipe) {
  const vol = Math.max(0.1, +recipe.volume || 0);
  const eff = Math.max(1, +recipe.mashEfficiency || +recipe.efficiency || 75) / 100;
  const boilTime = +recipe.boilTime || 60;

  // ---- Gravity from grain bill ----
  // points = qty(kg) × PPG/kg/L × efficiency  →  OG = 1 + points/1000/vol
  let totalPoints = 0;
  let weightedEbcPoints = 0; // for color (Morey-ish)
  let totalKg = 0;
  recipe.grainBill.forEach(g => {
    const ppg = ppgForEbc(g.ebc);
    const pkl = ppg * PPG_TO_PKL;
    const pts = g.qty * pkl * eff;
    totalPoints += pts;
    // MCU (Malt Color Units) accumulator using SRM-equivalent of EBC: SRM ≈ EBC/1.97
    // MCU = (lb_color × kg_to_lb) × srm / gallons_vol_in_gal   — but easier: use kg×ebc/L scaled
    weightedEbcPoints += g.qty * g.ebc;
    totalKg += g.qty;
  });
  const og = 1 + (totalPoints / 1000 / vol);

  // ---- FG from yeast attenuation ----
  const att = Math.max(0, Math.min(100, +recipe.yeast.attenuation || 75)) / 100;
  const ogPoints = (og - 1) * 1000;
  const fgPoints = ogPoints * (1 - att);
  const fg = 1 + fgPoints / 1000;

  // ---- ABV (standard formula) ----
  const abv = (og - fg) * 131.25;

  // ---- IBU via Tinseth ----
  // Tinseth uses POST-BOIL wort volume (kettle volume) and BOIL gravity.
  // Post-boil ≈ finished volume + fermentation losses + dry-hop absorption (whatever leaves the kettle into fermenter and stays back).
  // Boil gravity ≈ average of pre-boil and post-boil gravity (mass of sugar is constant).
  const fermLoss = +recipe.fermLoss || 0;
  const dryHopLoss = +recipe.dryHopLoss || 0;
  const postBoilVol = vol + fermLoss + dryHopLoss; // L of wort going into kettle isomerization
  const boilOff = (+recipe.boilOffRate || 0) * (boilTime / 60);
  const preBoilVol = postBoilVol + boilOff;
  // Pre-boil gravity points scale inversely with volume (sugar mass conserved)
  const postBoilPoints = (og - 1) * 1000;
  const preBoilPoints = postBoilVol > 0 && preBoilVol > 0 ? postBoilPoints * postBoilVol / preBoilVol : postBoilPoints;
  const avgBoilSG = 1 + ((postBoilPoints + preBoilPoints) / 2) / 1000;

  let ibu = 0;
  recipe.hops.forEach(h => {
    if (h.type === "dryHop") return; // dry hop ≈ 0 IBU
    let t = +h.time || 0;
    if (h.type === "whirlpool") t = Math.min(20, t * 0.5); // approximate utilization
    const bigness = 1.65 * Math.pow(0.000125, avgBoilSG - 1);
    const timeFactor = (1 - Math.exp(-0.04 * t)) / 4.15;
    const utilization = bigness * timeFactor;
    const alpha = (+h.alpha || 0) / 100;
    const w = +h.qty || 0;
    ibu += (utilization * alpha * w * 1000) / postBoilVol;
  });

  // ---- EBC via Morey (using SRM, then convert) ----
  // SRM = 1.4922 × MCU^0.6859, MCU = sum(weight_lb × srm) / gallons
  const kgToLb = 2.20462;
  const lToGal = 0.264172;
  let mcu = 0;
  recipe.grainBill.forEach(g => {
    const lb = g.qty * kgToLb;
    const srm = g.ebc / 1.97;
    mcu += (lb * srm);
  });
  mcu = mcu / Math.max(0.1, vol * lToGal);
  const srm = mcu > 0 ? 1.4922 * Math.pow(mcu, 0.6859) : 0;
  const ebc = srm * 1.97;

  // ---- BU/GU ratio (balance) ----
  const bugu = ogPoints > 0 ? ibu / ogPoints : 0;

  // ---- Calories per 330ml ----
  const cal = Math.round(((6.9 * abv) + 4.0 * ((og - 1) - (fg - 1)) * 1000 * 0.1) * 0.33 * 10);

  // ---- BLG / Plato (Balling) — extract concentration in °P (cubic from SG) ----
  const sgToBlg = sg => -616.868 + 1111.14 * sg - 630.272 * sg * sg + 135.997 * sg * sg * sg;
  const blgOg = Math.max(0, sgToBlg(og));
  const blgFg = Math.max(0, sgToBlg(fg));

  return {
    og: +og.toFixed(3),
    fg: +fg.toFixed(3),
    blgOg: +blgOg.toFixed(1),
    blgFg: +blgFg.toFixed(1),
    abv: +abv.toFixed(1),
    ibu: Math.round(ibu),
    ebc: Math.round(ebc),
    srm: +srm.toFixed(1),
    bugu: +bugu.toFixed(2),
    cal,
    totalKg: +totalKg.toFixed(2),
    valid: totalKg > 0,
  };
}

// Merge computed stats into recipe.targets (used for save + downstream)
function recipeWithComputed(recipe) {
  const s = computeStats(recipe);
  return {
    ...recipe,
    targets: { og: s.og, fg: s.fg, blgOg: s.blgOg, blgFg: s.blgFg, abv: s.abv, ibu: s.ibu, ebc: s.ebc, srm: s.srm },
    computed: s,
  };
}

/* Persistent stats strip — rendered on EVERY step */
function ComputedStrip({ recipe, lang }) {
  const s = computeStats(recipe);
  const style = BJCP_STYLES.find(x => x.code === recipe.style);
  const t_ = (pl, en) => lang === "pl" ? pl : en;

  const cells = [
    { k: "OG", v: s.valid ? s.og.toFixed(3) : "—", range: style?.og, raw: s.og, fmt: v => v.toFixed(3) },
    { k: "FG", v: s.valid ? s.fg.toFixed(3) : "—", range: style?.fg, raw: s.fg, fmt: v => v.toFixed(3) },
    { k: "BLG", v: s.valid ? s.blgOg.toFixed(1) + "°" : "—", raw: s.blgOg, fmt: v => v.toFixed(1) + "°" },
    { k: "ABV", v: s.valid ? s.abv.toFixed(1) + "%" : "—", range: style?.abv, raw: s.abv, fmt: v => v.toFixed(1) + "%" },
    { k: "IBU", v: s.valid ? s.ibu : "—", range: style?.ibu, raw: s.ibu, fmt: v => v },
    { k: "EBC", v: s.valid ? s.ebc : "—", range: style?.ebc, raw: s.ebc, fmt: v => v },
    { k: "BU/GU", v: s.valid ? s.bugu.toFixed(2) : "—" },
  ];

  return (
    <div style={{
      borderBottom: "1px solid var(--rule)",
      background: "linear-gradient(180deg, var(--paper-2), var(--paper))",
      padding: "12px 28px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}>
          {t_("Parametry obliczone na żywo", "Live computed parameters")}
        </div>
        <div className="mono" style={{ fontSize: 9, letterSpacing: "0.08em", color: "var(--ink-3)" }}>
          {s.valid
            ? <>{s.totalKg.toFixed(2)} kg · {recipe.volume} L · {recipe.mashEfficiency || recipe.efficiency || 75}% eff</>
            : t_("Dodaj słody, aby zobaczyć obliczenia", "Add grains to see calculations")}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr) 56px", gap: 8, alignItems: "stretch" }}>
        {cells.map(c => {
          const inRange = !c.range || !s.valid ? null : (c.raw >= c.range[0] && c.raw <= c.range[1]);
          const tone = inRange === null ? "var(--ink-3)" : inRange ? "var(--ok)" : "var(--warn)";
          return (
            <div key={c.k} style={{
              padding: "8px 10px",
              background: "var(--white)",
              border: "1px solid " + (inRange === false ? "var(--warn)" : "var(--rule-soft)"),
              borderRadius: "var(--radius)",
              display: "flex", flexDirection: "column", gap: 2,
            }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)" }}>{c.k}</div>
              <div className="serif" style={{ fontSize: 17, fontWeight: 500, letterSpacing: "-0.02em", color: s.valid ? "var(--ink)" : "var(--ink-3)", lineHeight: 1 }}>{c.v}</div>
              {c.range && s.valid && (
                <div className="mono" style={{ fontSize: 8.5, color: tone, letterSpacing: "0.04em" }}>
                  {c.fmt(c.range[0])}–{c.fmt(c.range[1])}
                </div>
              )}
            </div>
          );
        })}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 6, background: "var(--white)", border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)" }}>
          <ColorSwatch ebc={s.ebc || 4} size={36}/>
        </div>
      </div>
    </div>
  );
}

function NewRecipeWizard({ onClose, onSave, lang }) {
  const [step, setStep] = useStateNR(0);
  const [recipe, setRecipe] = useStateNR(emptyRecipe());
  const [duplicateOf, setDuplicateOf] = useStateNR(null);

  const setR = (patch) => setRecipe(r => ({ ...r, ...patch }));
  const [skipWater, setSkipWater] = useStateNR(false);
  const [settingsOpen, setSettingsOpen] = useStateNR(false);
  const visibleSteps = WIZARD_STEPS.map((s, i) => ({ ...s, idx: i })).filter(s => !(skipWater && s.key === "water"));
  const stepIsVisible = (i) => !(skipWater && WIZARD_STEPS[i].key === "water");
  const nextVisible = (from, dir) => {
    let i = from + dir;
    while (i >= 0 && i < WIZARD_STEPS.length && !stepIsVisible(i)) i += dir;
    return Math.max(0, Math.min(WIZARD_STEPS.length - 1, i));
  };
  const next = () => setStep(s => nextVisible(s, 1));
  const prev = () => setStep(s => nextVisible(s, -1));

  const canProceed = validateStep(step, recipe);

  const t_ = (pl, en) => lang === "pl" ? pl : en;

  return (
    <div style={{ minHeight: "100vh", height: "100vh", background: "var(--paper)", display: "grid", gridTemplateColumns: "260px 1fr" }}>
        {/* LEFT: stepper */}
        <aside style={{ background: "var(--paper-2)", borderRight: "1px solid var(--rule)", padding: "24px 20px", display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, position: "relative" }}>
            <div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4 }}>{t_("Nowa receptura", "New recipe")}</div>
              <div className="serif" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{t_("Kreator", "Wizard")}</div>
            </div>
            <button
              onClick={() => setSettingsOpen(o => !o)}
              aria-label={t_("Ustawienia kreatora", "Wizard settings")}
              aria-expanded={settingsOpen}
              style={{
                width: 28, height: 28, marginTop: 4, padding: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: settingsOpen ? "var(--paper-3)" : "transparent",
                border: "1px solid " + (settingsOpen ? "var(--rule)" : "transparent"),
                borderRadius: "var(--radius)", cursor: "pointer", color: "var(--ink-2)",
                transition: "background 120ms",
              }}
              onMouseEnter={e => { if (!settingsOpen) e.currentTarget.style.background = "var(--paper-3)"; }}
              onMouseLeave={e => { if (!settingsOpen) e.currentTarget.style.background = "transparent"; }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
              </svg>
            </button>
            {settingsOpen && (
              <>
                <div onClick={() => setSettingsOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }}/>
                <div style={{
                  position: "absolute", top: 36, right: 0, width: 240, zIndex: 50,
                  background: "var(--white)", border: "1px solid var(--rule)", borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow)", padding: "12px 14px",
                }}>
                  <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 10 }}>
                    {t_("Ustawienia kroków", "Step settings")}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                    <button
                      type="button"
                      onClick={() => {
                        const willSkip = !skipWater;
                        setSkipWater(willSkip);
                        // if currently on water step and turning it off, advance
                        if (willSkip && WIZARD_STEPS[step].key === "water") {
                          setStep(nextVisible(step, 1));
                        }
                      }}
                      aria-pressed={!skipWater}
                      style={{
                        width: 32, height: 18, borderRadius: 9, padding: 2, flexShrink: 0,
                        background: !skipWater ? "var(--copper)" : "var(--rule)",
                        border: "none", cursor: "pointer", position: "relative",
                        transition: "background 0.15s",
                      }}
                    >
                      <div style={{
                        width: 14, height: 14, borderRadius: 7, background: "var(--white)",
                        transform: `translateX(${!skipWater ? 14 : 0}px)`,
                        transition: "transform 0.15s",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                      }}/>
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", marginBottom: 1 }}>
                        {t_("Krok 6 \u00b7 Woda", "Step 6 \u00b7 Water")}
                      </div>
                      <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em" }}>
                        {t_("Profil wody i dodatki", "Water profile and additions")}
                      </div>
                    </div>
                  </label>
                </div>
              </>
            )}
          </div>

          <nav style={{ flex: 1 }}>
            {visibleSteps.map((s) => {
              const i = s.idx;
              const done = i < step;
              const active = i === step;
              return (
                <button key={s.key} onClick={() => setStep(i)} style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "10px 10px", background: "transparent", border: "none", textAlign: "left", cursor: "pointer",
                  borderRadius: "var(--radius)", marginBottom: 2,
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--paper-3)"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{
                    width: 24, height: 24, flexShrink: 0, borderRadius: 12,
                    background: done ? "var(--ok)" : active ? "var(--copper)" : "var(--paper-3)",
                    color: done || active ? "white" : "var(--ink-3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "IBM Plex Mono", fontSize: 11, fontWeight: 500,
                    border: active ? "3px solid rgba(184,99,45,0.25)" : "none",
                  }}>
                    {done ? <Icon.check/> : i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: active ? 500 : 400, color: active ? "var(--ink)" : "var(--ink-2)" }}>
                      {lang === "pl" ? s.label : s.labelEn}
                    </div>
                    <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>{s.hint}</div>
                  </div>
                </button>
              );
            })}
          </nav>

          <div style={{ borderTop: "1px solid var(--rule-soft)", paddingTop: 14, marginTop: 14 }}>
            <div className="mono" style={{ fontSize: 9, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>{t_("Szybki start", "Quick start")}</div>
            <select value={duplicateOf || ""} onChange={e => {
              if (!e.target.value) { setRecipe(emptyRecipe()); setDuplicateOf(null); return; }
              const base = window.DB.RECIPES.find(r => r.id === e.target.value);
              if (base) {
                setRecipe({ ...JSON.parse(JSON.stringify(base)), name: base.name + (lang === "pl" ? " (kopia)" : " (copy)"), version: 1, brewCount: 0 });
                setDuplicateOf(e.target.value);
              }
            }} style={{ width: "100%", padding: "8px 10px", border: "1px solid var(--rule)", borderRadius: "var(--radius)", background: "var(--white)", fontSize: 12, fontFamily: "IBM Plex Sans" }}>
              <option value="">{t_("— Pusta receptura —", "— Blank recipe —")}</option>
              {window.DB.RECIPES.map(r => <option key={r.id} value={r.id}>{t_("Duplikuj: ", "Duplicate: ")}{r.name}</option>)}
            </select>
          </div>
        </aside>

        {/* RIGHT: step content */}
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "20px 28px 12px", borderBottom: "1px solid var(--rule)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>
                {t_("Krok", "Step")} {step + 1} / {WIZARD_STEPS.length}
              </div>
              <div className="serif" style={{ fontSize: 24, fontWeight: 500, letterSpacing: "-0.02em" }}>
                {lang === "pl" ? WIZARD_STEPS[step].label : WIZARD_STEPS[step].labelEn}
              </div>
            </div>
            <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 8, color: "var(--ink-3)" }}><Icon.x/></button>
          </div>

          {/* progress bar */}
          <div style={{ height: 2, background: "var(--paper-3)" }}>
            <div style={{ width: `${((step + 1) / WIZARD_STEPS.length) * 100}%`, height: "100%", background: "var(--copper)", transition: "width 300ms ease" }}/>
          </div>

          {/* persistent computed-stats strip */}
          <ComputedStrip recipe={recipe} lang={lang}/>

          <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
            {step === 0 && <StepBasics recipe={recipe} setR={setR} lang={lang}/>}
            {step === 1 && <StepGrain recipe={recipe} setR={setR} lang={lang}/>}
            {step === 2 && <StepMash recipe={recipe} setR={setR} lang={lang}/>}
            {step === 3 && <StepHops recipe={recipe} setR={setR} lang={lang}/>}
            {step === 4 && <StepYeast recipe={recipe} setR={setR} lang={lang}/>}
            {step === 5 && <StepWater recipe={recipe} setR={setR} lang={lang}/>}
            {step === 6 && <StepReview recipe={recipe} lang={lang} setR={setR}/>}
          </div>

          {/* footer */}
          <div style={{ padding: "14px 28px", borderTop: "1px solid var(--rule)", background: "var(--paper-2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, color: "var(--ink-3)" }}>
              {canProceed ? (lang === "pl" ? "Wszystko wygląda dobrze" : "Looking good") : (
                <span style={{ color: "var(--warn)" }}>⚠ {lang === "pl" ? "Uzupełnij wymagane pola" : "Complete required fields"}</span>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="ghost" onClick={onClose}>{t_("Anuluj", "Cancel")}</Button>
              <Button variant="outline" onClick={prev} disabled={step === 0} style={{ opacity: step === 0 ? 0.4 : 1 }}>← {t_("Wstecz", "Back")}</Button>
              {step < WIZARD_STEPS.length - 1 ? (
                <Button variant="primary" onClick={next} disabled={!canProceed} style={{ opacity: canProceed ? 1 : 0.5 }}>
                  {t_("Dalej", "Next")} →
                </Button>
              ) : (
                <Button variant="copper" onClick={() => onSave(recipeWithComputed(recipe))} icon={<Icon.check/>}>
                  {t_("Zapisz recepturę", "Save recipe")}
                </Button>
              )}
            </div>
          </div>
        </div>
    </div>
  );
}

function validateStep(step, recipe) {
  if (step === 0) return recipe.name.trim() && recipe.volume > 0;
  if (step === 1) return recipe.grainBill.length > 0;
  if (step === 3) return recipe.hops.length > 0;
  if (step === 4) return recipe.yeast.strain.trim();
  return true;
}

/* ======= STEP 1 — BASICS ======= */
function StepBasics({ recipe, setR, lang }) {
  const t_ = (pl, en) => lang === "pl" ? pl : en;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{t_("Jak nazywa się twoje piwo?", "What's your beer called?")}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 12 }}>{t_("Nadaj recepturze charakter. Nazwę polską i angielską (opcjonalnie).", "Give your recipe a name. Polish and English (optional).")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label={t_("Nazwa receptury", "Recipe name")}>
            <Input value={recipe.name} onChange={e => setR({ name: e.target.value })} placeholder={t_("np. Chmielowa Mgła", "e.g. Hopfog")} autoFocus/>
          </Field>
          <Field label={t_("Nazwa angielska", "English name")} hint={t_("opcjonalnie", "optional")}>
            <Input value={recipe.nameEn} onChange={e => setR({ nameEn: e.target.value })}/>
          </Field>
        </div>
      </div>

      <div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 500, marginBottom: 12 }}>{t_("Styl BJCP", "BJCP style")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {BJCP_STYLES.map(s => {
            const active = recipe.style === s.code;
            return (
              <button key={s.code} onClick={() => setR({ style: s.code })} style={{
                padding: "12px 14px", textAlign: "left", cursor: "pointer",
                background: active ? "var(--white)" : "var(--paper-2)",
                border: "1px solid " + (active ? "var(--ink)" : "var(--rule-soft)"),
                borderRadius: "var(--radius)",
              }}>
                <div className="mono" style={{ fontSize: 10, color: active ? "var(--copper)" : "var(--ink-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 4 }}>{s.code}</div>
                <div style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{s.name}</div>
                {active && s.code !== "custom" && (
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 6 }}>
                    ABV {s.abv[0]}–{s.abv[1]}% · IBU {s.ibu[0]}–{s.ibu[1]}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== Rozmiar warki — objętość, gotowanie, straty ===== */}
      <div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{t_("Rozmiar warki", "Batch sizing")}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 12 }}>{t_("Objętość, gotowanie i straty — system policzy ile wody potrzebujesz.", "Volume, boil and losses — the system will compute how much water you need.")}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          <Field label={t_("Oczekiwana ilość gotowego piwa", "Expected finished beer")}>
            <Input type="number" value={recipe.volume} onChange={e => setR({ volume: +e.target.value })} unit="L"/>
          </Field>
          <Field label={t_("Czas gotowania", "Boil time")}>
            <Input type="number" value={recipe.boilTime} onChange={e => setR({ boilTime: +e.target.value })} unit="min"/>
          </Field>
          <Field label={t_("Szybkość odparowywania", "Boil-off rate")} hint={t_("zwykle 2–4 L/h", "usually 2–4 L/h")}>
            <Input type="number" step="0.1" value={recipe.boilOffRate} onChange={e => setR({ boilOffRate: +e.target.value })} unit="L/h"/>
          </Field>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
          <Field label={t_("Straty z gotowania", "Boil/kettle loss")} hint={t_("trub w kotle", "kettle trub")}>
            <Input type="number" step="0.1" value={recipe.boilLoss} onChange={e => setR({ boilLoss: +e.target.value })} unit="L"/>
          </Field>
          <Field label={t_("Straty z fermentacji", "Fermentation loss")} hint={t_("osad drożdżowy", "yeast trub")}>
            <Input type="number" step="0.1" value={recipe.fermLoss} onChange={e => setR({ fermLoss: +e.target.value })} unit="L"/>
          </Field>
          <Field label={t_("Straty z chmielenia na zimno", "Dry-hop loss")} hint={t_("absorbcja chmielem", "hop absorption")}>
            <Input type="number" step="0.1" value={recipe.dryHopLoss} onChange={e => setR({ dryHopLoss: +e.target.value })} unit="L"/>
          </Field>
        </div>

        {/* Computed volumes */}
        <VolumeBreakdown recipe={recipe} lang={lang}/>
      </div>
    </div>
  );
}

/* Computed volume breakdown card — used in StepBasics & StepMash */
function VolumeBreakdown({ recipe, lang }) {
  const t_ = (pl, en) => lang === "pl" ? pl : en;
  const v = computeVolumes(recipe);
  const tile = (label, value, unit, accent) => (
    <div style={{ padding: "12px 14px", background: "var(--white)", border: "1px solid " + (accent ? "var(--copper)" : "var(--rule-soft)"), borderRadius: "var(--radius)" }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4 }}>{label}</div>
      <div className="serif" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: accent ? "var(--copper)" : "var(--ink)" }}>
        {value}<span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 400, marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
  return (
    <div>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>{t_("Obliczone objętości", "Computed volumes")}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {tile(t_("Po gotowaniu", "Post-boil"), v.postBoilVolume.toFixed(1), "L")}
        {tile(t_("Przed gotowaniem", "Pre-boil"), v.preBoilVolume.toFixed(1), "L", true)}
        {tile(t_("Woda do zacierania", "Mash water"), v.mashWater.toFixed(1), "L")}
        {tile(t_("Woda do wysładzania", "Sparge water"), v.spargeWater.toFixed(1), "L")}
      </div>
      {v.totalGrainKg === 0 && (
        <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 8, fontStyle: "italic" }}>
          {t_("⌁ Dodaj słody (krok 2), aby policzyć wodę zacierną i wysładzania.", "⌁ Add grains (step 2) to compute mash & sparge water.")}
        </div>
      )}
    </div>
  );
}

/* ======= STEP — GRAIN BILL ======= */
function StepGrain({ recipe, setR, lang }) {
  const t_ = (pl, en) => lang === "pl" ? pl : en;
  const totalKg = recipe.grainBill.reduce((s, g) => s + g.qty, 0);

  const updateGrain = (id, patch) => setR({ grainBill: recipe.grainBill.map(g => g.id === id ? { ...g, ...patch } : g) });
  const addGrain = (preset) => {
    const id = `g${Date.now()}`;
    const next = [...recipe.grainBill, { id, name: preset?.name || "", origin: preset?.supplier || "", qty: preset?.qty || 1, ebc: preset?.ebc || 10, pct: 0 }];
    setR({ grainBill: recalcPcts(next) });
  };
  const updateQty = (id, qty) => {
    const next = recipe.grainBill.map(g => g.id === id ? { ...g, qty: +qty } : g);
    setR({ grainBill: recalcPcts(next) });
  };

  const suggested = window.DB.MATERIALS.malt.slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{t_("Zasyp słodów", "Grain bill")}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{t_("Procenty są liczone automatycznie na podstawie wagi.", "Percentages are computed automatically from weights.")}</div>
      </div>

      {/* current grain bill */}
      {recipe.grainBill.length === 0 ? (
        <div style={{ padding: "28px 20px", background: "var(--paper-2)", border: "1px dashed var(--rule)", borderRadius: "var(--radius)", textAlign: "center", color: "var(--ink-3)" }}>
          {t_("Dodaj pierwszy słód z magazynu poniżej lub ręcznie.", "Add your first grain from inventory below or manually.")}
        </div>
      ) : (
        <div style={{ background: "var(--white)", border: "1px solid var(--rule)", borderRadius: "var(--radius)", overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 90px 100px 100px 24px", gap: 10, padding: "10px 14px", background: "var(--paper-2)", borderBottom: "1px solid var(--rule)", fontFamily: "IBM Plex Mono", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>
            <div></div><div>{t_("Słód", "Malt")}</div><div style={{ textAlign: "right" }}>EBC</div><div style={{ textAlign: "right" }}>{t_("Ilość", "Qty")}</div><div style={{ textAlign: "right" }}>%</div><div></div>
          </div>
          {recipe.grainBill.map(g => (
            <div key={g.id} style={{ display: "grid", gridTemplateColumns: "30px 1fr 90px 100px 100px 24px", gap: 10, padding: "10px 14px", borderBottom: "1px solid var(--rule-soft)", alignItems: "center" }}>
              <ColorSwatch ebc={g.ebc} size={24}/>
              <Input value={g.name} onChange={e => updateGrain(g.id, { name: e.target.value })} placeholder={t_("nazwa słodu", "malt name")}/>
              <Input type="number" value={g.ebc} onChange={e => updateGrain(g.id, { ebc: +e.target.value })}/>
              <Input type="number" step="0.01" value={g.qty} onChange={e => updateQty(g.id, e.target.value)} unit="kg"/>
              <div style={{ textAlign: "right" }}>
                <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{g.pct}%</div>
                <div style={{ marginTop: 4 }}><Bar value={g.pct} max={100}/></div>
              </div>
              <button onClick={() => setR({ grainBill: recalcPcts(recipe.grainBill.filter(x => x.id !== g.id)) })}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0 }}><Icon.x/></button>
            </div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "30px 1fr 90px 100px 100px 24px", gap: 10, padding: "12px 14px", background: "var(--paper-3)", fontFamily: "IBM Plex Mono", fontSize: 12, fontWeight: 500 }}>
            <div></div><div>{t_("Razem", "Total")}</div><div></div>
            <div style={{ textAlign: "right" }}>{totalKg.toFixed(2)} kg</div>
            <div style={{ textAlign: "right" }}>{recipe.grainBill.reduce((s, g) => s + g.pct, 0)}%</div>
            <div></div>
          </div>
        </div>
      )}

      {/* add from inventory */}
      <div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>{t_("Dodaj z magazynu", "Add from inventory")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {suggested.map(m => (
            <button key={m.id} onClick={() => addGrain({ name: m.name, supplier: m.supplier, ebc: m.ebc, qty: 1 })} style={{
              padding: "10px 12px", background: "var(--paper-2)", border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)",
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--copper)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--rule-soft)"}
            >
              <ColorSwatch ebc={m.ebc} size={24}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{m.supplier} · EBC {m.ebc}</div>
              </div>
              <Icon.plus style={{ color: "var(--copper)" }}/>
            </button>
          ))}
        </div>
        <Button variant="ghost" icon={<Icon.plus/>} onClick={() => addGrain({ name: "", ebc: 10, qty: 0.5 })} style={{ marginTop: 10 }}>
          {t_("Dodaj ręcznie", "Add manually")}
        </Button>
      </div>
    </div>
  );
}

function recalcPcts(grainBill) {
  const total = grainBill.reduce((s, g) => s + g.qty, 0) || 1;
  return grainBill.map(g => ({ ...g, pct: Math.round((g.qty / total) * 100) }));
}

/* ======= STEP 4 — MASH ======= */
function StepMash({ recipe, setR, lang }) {
  const t_ = (pl, en) => lang === "pl" ? pl : en;
  const applyPreset = (key) => {
    const p = MASH_PRESETS[key];
    setR({ mashPreset: key, mash: p.rests.map((r, i) => ({ id: `m${i}`, ramp: 1, ...r })) });
  };
  const updateRest = (id, patch) => setR({ mash: recipe.mash.map(m => m.id === id ? { ...m, ...patch } : m) });
  const addRest = () => setR({ mash: [...recipe.mash, { id: `m${Date.now()}`, name: t_("Nowa przerwa", "New rest"), temp: 65, duration: 20, ramp: 1 }] });
  const removeRest = (id) => setR({ mash: recipe.mash.filter(m => m.id !== id) });
  const moveRest = (id, dir) => {
    const idx = recipe.mash.findIndex(m => m.id === id);
    const j = idx + dir;
    if (j < 0 || j >= recipe.mash.length) return;
    const next = recipe.mash.slice();
    [next[idx], next[j]] = [next[j], next[idx]];
    setR({ mash: next });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{t_("Schemat zacierania", "Mash schedule")}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{t_("Zacznij od presetu lub zbuduj własny profil przerw temperaturowych.", "Start from a preset or build your own temperature step profile.")}</div>
      </div>

      {/* ===== Parametry zacierania ===== */}
      <div style={{ background: "var(--paper-2)", border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)", padding: 16 }}>
        <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 10 }}>{t_("Parametry zacierania", "Mash parameters")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
          <Field label={t_("Stosunek wody do ziarna", "Water-to-grain ratio")} hint={t_("typowo 2.5–3.5 L/kg", "typically 2.5–3.5 L/kg")}>
            <Input type="number" step="0.1" value={recipe.mashRatio} onChange={e => setR({ mashRatio: +e.target.value })} unit="L/kg"/>
          </Field>
          <Field label={t_("Wydajność zacierania", "Mash efficiency")} hint={t_("konwersja w mashu", "conversion in mash")}>
            <Input type="number" value={recipe.mashEfficiency} onChange={e => setR({ mashEfficiency: +e.target.value })} unit="%"/>
          </Field>
        </div>

        {/* Computed mash totals */}
        <MashTotals recipe={recipe} lang={lang}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
        {Object.entries(MASH_PRESETS).map(([k, p]) => {
          const active = recipe.mashPreset === k;
          return (
            <button key={k} onClick={() => applyPreset(k)} style={{
              padding: "10px 12px", background: active ? "var(--ink)" : "var(--paper-2)",
              color: active ? "white" : "var(--ink)",
              border: "1px solid " + (active ? "var(--ink)" : "var(--rule-soft)"),
              borderRadius: "var(--radius)", cursor: "pointer", fontSize: 12, fontFamily: "IBM Plex Sans",
              textAlign: "left",
            }}>
              <div className="mono" style={{ fontSize: 9, opacity: 0.7, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 3 }}>{p.rests.length} {t_("przerw", "rests")}</div>
              <div style={{ fontSize: 12, fontWeight: active ? 500 : 400 }}>{p.label}</div>
            </button>
          );
        })}
      </div>

      {recipe.mash.length > 0 && (
        <Card style={{ padding: 14 }}>
          <MashProfileChart rests={recipe.mash} t={() => "min"}/>
        </Card>
      )}

      <div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>{t_("Przerwy", "Rests")}</div>
        {recipe.mash.length === 0 ? (
          <div style={{ padding: 20, textAlign: "center", background: "var(--paper-2)", border: "1px dashed var(--rule)", borderRadius: "var(--radius)", color: "var(--ink-3)" }}>
            {t_("Brak przerw. Dodaj pierwszą.", "No rests yet. Add one.")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {recipe.mash.map((m, i) => (
              <div key={m.id} style={{ display: "grid", gridTemplateColumns: "30px 1fr 100px 100px 100px 30px 24px", gap: 8, alignItems: "center", padding: "10px 12px", background: "var(--white)", border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)" }}>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}>{i + 1}</div>
                <Input value={m.name} onChange={e => updateRest(m.id, { name: e.target.value })}/>
                <Input type="number" value={m.temp} onChange={e => updateRest(m.id, { temp: +e.target.value })} unit="°C"/>
                <Input type="number" value={m.duration} onChange={e => updateRest(m.id, { duration: +e.target.value })} unit="min"/>
                <Input type="number" value={m.ramp} onChange={e => updateRest(m.id, { ramp: +e.target.value })} unit="°/min"/>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <button onClick={() => moveRest(m.id, -1)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0, fontSize: 10 }}>▲</button>
                  <button onClick={() => moveRest(m.id, 1)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0, fontSize: 10 }}>▼</button>
                </div>
                <button onClick={() => removeRest(m.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0 }}><Icon.x/></button>
              </div>
            ))}
          </div>
        )}
        <Button variant="ghost" icon={<Icon.plus/>} onClick={addRest} style={{ marginTop: 10 }}>{t_("Dodaj przerwę", "Add rest")}</Button>
      </div>
    </div>
  );
}

/* Mash totals — computed from grain bill + mash ratio */
function MashTotals({ recipe, lang }) {
  const t_ = (pl, en) => lang === "pl" ? pl : en;
  const v = computeVolumes(recipe);
  const tile = (label, value, unit, accent) => (
    <div style={{ padding: "12px 14px", background: "var(--white)", border: "1px solid " + (accent ? "var(--copper)" : "var(--rule-soft)"), borderRadius: "var(--radius)" }}>
      <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4 }}>{label}</div>
      <div className="serif" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", color: accent ? "var(--copper)" : "var(--ink)" }}>
        {value}<span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 400, marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {tile(t_("Zasyp ziarna", "Total grain"), v.totalGrainKg.toFixed(2), "kg")}
        {tile(t_("Woda do zacierania", "Mash water"), v.mashWater.toFixed(1), "L", true)}
        {tile(t_("Całkowita objętość zacieru", "Total mash volume"), v.totalMashVolume.toFixed(1), "L")}
      </div>
      {v.totalGrainKg === 0 && (
        <div className="mono" style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 8, fontStyle: "italic" }}>
          {t_("⌁ Dodaj słody w kroku Zasyp, aby policzyć ilość wody zaciernej.", "⌁ Add grains in the Grain step to compute mash water.")}
        </div>
      )}
    </div>
  );
}

/* ======= STEP — HOPS ======= */
function StepHops({ recipe, setR, lang }) {
  const t_ = (pl, en) => lang === "pl" ? pl : en;
  const addHop = (preset) => {
    const id = `h${Date.now()}`;
    setR({ hops: [...recipe.hops, { id, name: preset?.name || "", alpha: preset?.alpha || 10, qty: 20, type: "flavor", time: 15 }] });
  };
  const updateHop = (id, patch) => setR({ hops: recipe.hops.map(h => h.id === id ? { ...h, ...patch } : h) });
  const removeHop = (id) => setR({ hops: recipe.hops.filter(h => h.id !== id) });

  const suggested = window.DB.MATERIALS.hop.slice(0, 6);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{t_("Plan chmielenia", "Hop schedule")}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{t_("Dodaj chmiele goryczkowe, smakowe, aromatyczne oraz dry hop i whirlpool.", "Add bittering, flavor, aroma hops plus dry hop and whirlpool.")}</div>
      </div>

      {recipe.hops.length > 0 && (
        <Card style={{ padding: 14 }}>
          <HopTimelineMini recipe={recipe} t={(k) => k.split(".").pop()}/>
        </Card>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {recipe.hops.map(h => {
          const typeColors = { bittering: "var(--warn)", flavor: "var(--copper)", aroma: "var(--hop)", whirlpool: "var(--hop-2)", dryHop: "var(--hop-2)" };
          return (
            <div key={h.id} style={{ display: "grid", gridTemplateColumns: "4px 1fr 140px 90px 90px 90px 24px", gap: 8, alignItems: "center", padding: "10px 12px", background: "var(--white)", border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)" }}>
              <div style={{ width: 4, height: 36, background: typeColors[h.type], borderRadius: 2 }}/>
              <Input value={h.name} onChange={e => updateHop(h.id, { name: e.target.value })} placeholder={t_("nazwa chmielu", "hop name")}/>
              <select value={h.type} onChange={e => updateHop(h.id, { type: e.target.value })} style={{ padding: "8px 10px", border: "1px solid var(--rule)", borderRadius: "var(--radius)", background: "var(--white)", fontFamily: "IBM Plex Sans", fontSize: 13 }}>
                <option value="bittering">{t_("Goryczkowy", "Bittering")}</option>
                <option value="flavor">{t_("Smakowy", "Flavor")}</option>
                <option value="aroma">{t_("Aromatyczny", "Aroma")}</option>
                <option value="whirlpool">Whirlpool</option>
                <option value="dryHop">{t_("Na zimno", "Dry hop")}</option>
              </select>
              <Input type="number" step="0.1" value={h.alpha} onChange={e => updateHop(h.id, { alpha: +e.target.value })} unit="α%"/>
              <Input type="number" value={h.qty} onChange={e => updateHop(h.id, { qty: +e.target.value })} unit="g"/>
              <Input type="number" value={h.time} onChange={e => updateHop(h.id, { time: +e.target.value })} unit={h.type === "dryHop" ? "dni" : "min"}/>
              <button onClick={() => removeHop(h.id)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 0 }}><Icon.x/></button>
            </div>
          );
        })}
      </div>

      <div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 8 }}>{t_("Dodaj z magazynu", "Add from inventory")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
          {suggested.map(m => (
            <button key={m.id} onClick={() => addHop({ name: m.name, alpha: m.alpha })} style={{
              padding: "10px 12px", background: "var(--paper-2)", border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)",
              display: "flex", alignItems: "center", gap: 10, cursor: "pointer", textAlign: "left",
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = "var(--hop)"}
            onMouseLeave={e => e.currentTarget.style.borderColor = "var(--rule-soft)"}
            >
              <div style={{ width: 24, height: 24, borderRadius: 12, background: "var(--hop)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "IBM Plex Mono", fontSize: 10 }}>α</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500 }}>{m.name}</div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>α {m.alpha}% · {m.origin}</div>
              </div>
              <Icon.plus style={{ color: "var(--hop)" }}/>
            </button>
          ))}
        </div>
        <Button variant="ghost" icon={<Icon.plus/>} onClick={() => addHop({ name: "", alpha: 10 })} style={{ marginTop: 10 }}>
          {t_("Dodaj ręcznie", "Add manually")}
        </Button>
      </div>
    </div>
  );
}

/* ======= STEP 6 — YEAST ======= */
function StepYeast({ recipe, setR, lang }) {
  const t_ = (pl, en) => lang === "pl" ? pl : en;
  const setY = (patch) => setR({ yeast: { ...recipe.yeast, ...patch } });
  const setFerm = (key, patch) => setR({ fermentation: { ...recipe.fermentation, [key]: { ...recipe.fermentation[key], ...patch } } });
  const suggested = window.DB.MATERIALS.yeast;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{t_("Drożdże", "Yeast")}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{t_("Wybierz szczep z katalogu lub wpisz własny.", "Pick a strain from catalog or enter your own.")}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {suggested.map(m => {
          const active = recipe.yeast.strain === m.name;
          return (
            <button key={m.id} onClick={() => setY({ strain: m.name, attenuation: m.attenuation })} style={{
              padding: "12px 14px", background: active ? "var(--white)" : "var(--paper-2)",
              border: "1px solid " + (active ? "var(--ink)" : "var(--rule-soft)"),
              borderRadius: "var(--radius)", cursor: "pointer", textAlign: "left",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ width: 20, height: 20, borderRadius: 10, background: "var(--yeast)", color: "white", fontFamily: "IBM Plex Mono", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>Y</div>
                <div style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{m.name}</div>
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>{m.supplier} · {m.attenuation}% atten.</div>
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 14 }}>
        <Field label={t_("Szczep (własny)", "Strain (custom)")}>
          <Input value={recipe.yeast.strain} onChange={e => setY({ strain: e.target.value })} placeholder={t_("np. WLP001 California Ale", "e.g. WLP001 California Ale")}/>
        </Field>
        <Field label={t_("Atenuacja", "Attenuation")}>
          <Input type="number" value={recipe.yeast.attenuation} onChange={e => setY({ attenuation: +e.target.value })} unit="%"/>
        </Field>
        <Field label={t_("Flokulacja", "Flocculation")}>
          <select value={recipe.yeast.flocculation} onChange={e => setY({ flocculation: e.target.value })} style={{ padding: "8px 10px", border: "1px solid var(--rule)", borderRadius: "var(--radius)", background: "var(--white)", fontSize: 13, fontFamily: "IBM Plex Sans" }}>
            <option value="niska">{t_("niska", "low")}</option>
            <option value="średnia">{t_("średnia", "medium")}</option>
            <option value="wysoka">{t_("wysoka", "high")}</option>
          </select>
        </Field>
      </div>

      <div>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 10 }}>{t_("Profil fermentacji", "Fermentation profile")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Burzliwa — always */}
          <div style={{ padding: "14px 16px", background: "var(--white)", border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)", display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{t_("Fermentacja burzliwa", "Primary fermentation")}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em" }}>{t_("Aktywne ferm. cukru przez drożdże", "Active sugar fermentation")}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 120px", gap: 8 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>{t_("Temp. docelowa", "Target temp")}</div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>{t_("Czas", "Duration")}</div>
              <Input type="number" value={recipe.fermentation.primary.temp} onChange={e => setFerm("primary", { temp: +e.target.value })} unit="°C"/>
              <Input type="number" value={recipe.fermentation.primary.days} onChange={e => setFerm("primary", { days: +e.target.value })} unit={t_("d", "d")}/>
            </div>
          </div>

          {/* Cicha — optional */}
          <div style={{ padding: "14px 16px", background: recipe.fermentation.secondary.enabled ? "var(--white)" : "var(--paper-2)", border: "1px solid " + (recipe.fermentation.secondary.enabled ? "var(--rule-soft)" : "var(--rule-soft)"), borderRadius: "var(--radius)", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 16, alignItems: "center" }}>
            <button
              onClick={() => setFerm("secondary", { enabled: !recipe.fermentation.secondary.enabled })}
              style={{
                width: 40, height: 22, borderRadius: 11, padding: 2,
                background: recipe.fermentation.secondary.enabled ? "var(--copper)" : "var(--rule)",
                border: "none", cursor: "pointer", position: "relative",
                transition: "background 0.15s",
              }}
              aria-pressed={recipe.fermentation.secondary.enabled}
            >
              <div style={{
                width: 18, height: 18, borderRadius: 9, background: "var(--white)",
                transform: `translateX(${recipe.fermentation.secondary.enabled ? 18 : 0}px)`,
                transition: "transform 0.15s",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
              }}/>
            </button>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2, color: recipe.fermentation.secondary.enabled ? "var(--ink)" : "var(--ink-2)" }}>
                {t_("Fermentacja cicha", "Secondary fermentation")} <span style={{ fontWeight: 400, color: "var(--ink-3)", fontSize: 12 }}>· {t_("opcjonalnie", "optional")}</span>
              </div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em" }}>{t_("Klarowanie i dojrzewanie po przelaniu", "Clarification and maturation after racking")}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px 120px", gap: 8, opacity: recipe.fermentation.secondary.enabled ? 1 : 0.4, pointerEvents: recipe.fermentation.secondary.enabled ? "auto" : "none" }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>{t_("Temp. docelowa", "Target temp")}</div>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>{t_("Czas", "Duration")}</div>
              <Input type="number" value={recipe.fermentation.secondary.temp} onChange={e => setFerm("secondary", { temp: +e.target.value })} unit="°C"/>
              <Input type="number" value={recipe.fermentation.secondary.days} onChange={e => setFerm("secondary", { days: +e.target.value })} unit={t_("d", "d")}/>
            </div>
          </div>

          {/* Leżakowanie w butelkach — always */}
          <div style={{ padding: "14px 16px", background: "var(--white)", border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)", display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>{t_("Leżakowanie w butelkach", "Bottle conditioning")}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.04em" }}>{t_("Czas dojrzewania w butelkach przed pierwszym próbowaniem", "Maturation in bottles before first taste")}</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "120px", gap: 8 }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>{t_("Czas", "Duration")}</div>
              <Input type="number" value={recipe.fermentation.bottle.days} onChange={e => setFerm("bottle", { days: +e.target.value })} unit={t_("d", "d")}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======= STEP 7 — WATER ======= */
function StepWater({ recipe, setR, lang }) {
  const t_ = (pl, en) => lang === "pl" ? pl : en;
  const setW = (patch) => setR({ water: { ...recipe.water, ...patch } });

  const profiles = [
    { key: "pilzno", name: "Pilzno (miękka)", ca: 7, mg: 3, na: 5, so4: 5, cl: 5, hco3: 15 },
    { key: "burton", name: "Burton-on-Trent", ca: 275, mg: 40, na: 25, so4: 610, cl: 35, hco3: 270 },
    { key: "munich", name: "Monachium", ca: 75, mg: 18, na: 2, so4: 10, cl: 2, hco3: 150 },
    { key: "dublin", name: "Dublin (stout)", ca: 115, mg: 4, na: 12, so4: 55, cl: 19, hco3: 200 },
    { key: "balanced", name: t_("Zbalansowana (ale)", "Balanced (ale)"), ca: 80, mg: 10, na: 25, so4: 100, cl: 80, hco3: 50 },
    { key: "custom", name: t_("Własna", "Custom"), ca: 0, mg: 0, na: 0, so4: 0, cl: 0, hco3: 0 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div className="serif" style={{ fontSize: 18, fontWeight: 500, marginBottom: 4 }}>{t_("Profil wody", "Water profile")}</div>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{t_("Wybierz preset miejski lub zbuduj własny profil jonowy.", "Pick a city preset or build your own ion profile.")}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {profiles.map(p => {
          const active = recipe.water.profile === p.name;
          return (
            <button key={p.key} onClick={() => setW({ profile: p.name, ca: p.ca, mg: p.mg, na: p.na, so4: p.so4, cl: p.cl, hco3: p.hco3 })} style={{
              padding: "10px 12px", background: active ? "var(--white)" : "var(--paper-2)",
              border: "1px solid " + (active ? "var(--ink)" : "var(--rule-soft)"),
              borderRadius: "var(--radius)", cursor: "pointer", textAlign: "left",
            }}>
              <div style={{ fontSize: 12.5, fontWeight: active ? 500 : 400 }}>{p.name}</div>
              {p.key !== "custom" && <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 3 }}>Ca {p.ca} · SO₄ {p.so4} · Cl {p.cl}</div>}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr) 120px", gap: 10 }}>
        {[["ca", "Ca²⁺"], ["mg", "Mg²⁺"], ["na", "Na⁺"], ["so4", "SO₄²⁻"], ["cl", "Cl⁻"], ["hco3", "HCO₃⁻"]].map(([k, l]) => (
          <Field key={k} label={l}>
            <Input type="number" value={recipe.water[k]} onChange={e => setW({ [k]: +e.target.value })} unit="mg/L"/>
          </Field>
        ))}
        <Field label="pH">
          <Input type="number" step="0.1" value={recipe.water.ph} onChange={e => setW({ ph: +e.target.value })}/>
        </Field>
      </div>

      {recipe.water.so4 + recipe.water.cl > 0 && (
        <div style={{ padding: "14px 16px", background: "var(--paper-2)", border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)", display: "flex", gap: 20 }}>
          <Mini label={t_("Stosunek SO₄/Cl", "SO₄/Cl ratio")} value={(recipe.water.so4 / Math.max(1, recipe.water.cl)).toFixed(2)}/>
          <Mini label={t_("Charakter", "Character")} value={recipe.water.so4 > recipe.water.cl * 1.5 ? t_("wytrawny, gorzki", "dry, bitter") : recipe.water.cl > recipe.water.so4 * 1.5 ? t_("słodki, pełny", "sweet, full") : t_("zbalansowany", "balanced")}/>
          <Mini label={t_("Twardość", "Hardness")} value={Math.round(2.5 * recipe.water.ca + 4.1 * recipe.water.mg)} unit="mg/L CaCO₃"/>
        </div>
      )}
    </div>
  );
}

/* ======= STEP 8 — REVIEW ======= */
function StepReview({ recipe, lang, setR }) {
  const t_ = (pl, en) => lang === "pl" ? pl : en;
  const totalGrain = recipe.grainBill.reduce((s, g) => s + g.qty, 0);
  const totalHops = recipe.hops.reduce((s, h) => s + h.qty, 0);
  const s = computeStats(recipe);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* hero */}
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 20, alignItems: "center", padding: "18px 20px", background: "var(--white)", border: "1px solid var(--rule)", borderRadius: "var(--radius)" }}>
        <ColorSwatch ebc={s.ebc} size={72}/>
        <div>
          <Badge tone="copper">{recipe.style} · v{recipe.version}</Badge>
          <h2 className="serif" style={{ margin: "6px 0 2px", fontSize: 32, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{recipe.name || t_("(bez nazwy)", "(untitled)")}</h2>
          <div style={{ color: "var(--ink-3)", fontSize: 13 }}>{recipe.volume} L · {recipe.boilTime} min · {recipe.mashEfficiency || recipe.efficiency || 75}% {t_("wydajności", "efficiency")} · {s.cal} kcal/330ml</div>
        </div>
      </div>

      {/* stats — computed */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
        <StatTile label="OG" value={s.og.toFixed(3)}/>
        <StatTile label="FG" value={s.fg.toFixed(3)}/>
        <StatTile label="BLG" value={s.blgOg.toFixed(1)} unit="°P"/>
        <StatTile label="ABV" value={s.abv.toFixed(1)} unit="%"/>
        <StatTile label="IBU" value={s.ibu}/>
        <StatTile label="EBC" value={s.ebc}/>
        <StatTile label="BU/GU" value={s.bugu.toFixed(2)}/>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card>
          <SectionTitle eyebrow={t_("Zasyp", "Grain bill")} title={`${totalGrain.toFixed(2)} kg`} right={<Badge>{recipe.grainBill.length}</Badge>}/>
          {recipe.grainBill.map(g => (
            <div key={g.id} style={{ display: "grid", gridTemplateColumns: "24px 1fr 70px 40px", gap: 8, padding: "6px 0", alignItems: "center", fontSize: 12.5 }}>
              <ColorSwatch ebc={g.ebc} size={18}/>
              <div>{g.name || t_("(bez nazwy)", "(unnamed)")}</div>
              <div className="mono" style={{ textAlign: "right" }}>{g.qty.toFixed(2)} kg</div>
              <div className="mono" style={{ textAlign: "right", color: "var(--ink-3)" }}>{g.pct}%</div>
            </div>
          ))}
        </Card>

        <Card>
          <SectionTitle eyebrow={t_("Chmielenie", "Hops")} title={`${totalHops} g`} right={<Badge tone="hop">{recipe.hops.length}</Badge>}/>
          {recipe.hops.map(h => (
            <div key={h.id} style={{ display: "grid", gridTemplateColumns: "1fr 90px 60px 50px", gap: 8, padding: "6px 0", alignItems: "center", fontSize: 12.5 }}>
              <div>{h.name || t_("(bez nazwy)", "(unnamed)")}</div>
              <Badge tone={h.type === "dryHop" ? "hop" : "neutral"} size="sm">{h.type}</Badge>
              <div className="mono" style={{ textAlign: "right" }}>{h.qty} g</div>
              <div className="mono" style={{ textAlign: "right", color: "var(--ink-3)" }}>{h.time}</div>
            </div>
          ))}
        </Card>

        <Card>
          <SectionTitle eyebrow={t_("Drożdże", "Yeast")} title={recipe.yeast.strain || t_("(nie wybrano)", "(not chosen)")}/>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 12.5 }}>
            <Mini label="Atten." value={recipe.yeast.attenuation} unit="%"/>
            <Mini label="Flok." value={recipe.yeast.flocculation}/>
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow={t_("Zacieranie", "Mash")} title={`${recipe.mash.length} ${t_("przerw", "rests")}`}/>
          {recipe.mash.map(m => (
            <div key={m.id} style={{ display: "grid", gridTemplateColumns: "1fr 60px 60px", gap: 8, padding: "4px 0", fontSize: 12.5 }}>
              <div>{m.name}</div>
              <div className="mono" style={{ textAlign: "right", color: "var(--ink-3)" }}>{m.temp}°C</div>
              <div className="mono" style={{ textAlign: "right", color: "var(--ink-3)" }}>{m.duration} min</div>
            </div>
          ))}
        </Card>
      </div>

      <Field label={t_("Notatki", "Notes")}>
        <textarea value={recipe.notes} onChange={e => setR && setR({ notes: e.target.value })} rows={3} placeholder={t_("Dodaj notatkę…", "Add a note…")}
          style={{ padding: "8px 10px", border: "1px solid var(--rule)", borderRadius: "var(--radius)", background: "var(--white)", fontSize: 13, fontFamily: "IBM Plex Sans", resize: "vertical" }}/>
      </Field>
    </div>
  );
}

window.NewRecipeWizard = NewRecipeWizard;
