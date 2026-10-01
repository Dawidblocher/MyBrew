// Materials (Surowce) — stock + catalog + submission
const { useState: useStateM } = React;

function MaterialsView({ t, lang, density }) {
  const [tab, setTab] = useStateM("malt");
  const [query, setQuery] = useStateM("");
  const [submitOpen, setSubmitOpen] = useStateM(false);

  const counts = {
    malt: window.DB.MATERIALS.malt.length,
    hop: window.DB.MATERIALS.hop.length,
    yeast: window.DB.MATERIALS.yeast.length,
    adjunct: window.DB.MATERIALS.adjunct.length,
  };
  const totalLow = Object.values(window.DB.MATERIALS).flat().filter(m => m.lowStock || m.stock === 0).length;

  return (
    <div style={{ padding: "28px 32px 48px", maxWidth: 1320, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4 }}>{t("materials.subtitle")}</div>
          <h1 className="serif" style={{ margin: 0, fontSize: 36, fontWeight: 500, letterSpacing: "-0.02em" }}>{t("materials.title")}</h1>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {totalLow > 0 && <Badge tone="warn">{totalLow} {lang === "pl" ? "do uzupełnienia" : "low stock"}</Badge>}
          <Button variant="primary" icon={<Icon.plus/>} onClick={() => setSubmitOpen(true)}>{t("materials.submit")}</Button>
        </div>
      </div>

      {/* category tabs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {[
          ["malt", t("materials.malt"), Icon.wheat, "var(--copper)"],
          ["hop", t("materials.hop"), Icon.leaf, "var(--hop)"],
          ["yeast", t("materials.yeast"), Icon.beaker, "var(--yeast)"],
          ["adjunct", t("materials.adjunct"), Icon.drop, "var(--water)"],
        ].map(([k, label, IconC, color]) => {
          const active = tab === k;
          return (
            <button key={k} onClick={() => setTab(k)} style={{
              padding: "18px 18px", background: active ? "var(--white)" : "var(--paper-2)",
              border: "1px solid " + (active ? "var(--ink)" : "var(--rule-soft)"),
              borderRadius: "var(--radius)", cursor: "pointer", textAlign: "left",
              display: "flex", flexDirection: "column", gap: 10,
              transition: "all 120ms ease",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color }}>
                  <IconC/>
                  <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{label}</span>
                </div>
                <span className="serif" style={{ fontSize: 24, fontWeight: 500, color: "var(--ink)" }}>{counts[k]}</span>
              </div>
              <div style={{ height: 3, background: color, width: active ? "100%" : "30%", transition: "width 200ms ease" }}/>
            </button>
          );
        })}
      </div>

      {/* search */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--white)", border: "1px solid var(--rule)", borderRadius: "var(--radius)", padding: "8px 12px", flex: 1 }}>
          <Icon.search style={{ color: "var(--ink-3)" }}/>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder={t("common.search")} style={{ border: "none", outline: "none", background: "transparent", flex: 1, fontFamily: "IBM Plex Sans, sans-serif", fontSize: 13 }}/>
        </div>
        <Button variant="outline" size="sm">{t("materials.stock")}</Button>
        <Button variant="ghost" size="sm">{t("materials.catalog")}</Button>
      </div>

      <MaterialsTable category={tab} t={t} lang={lang} query={query}/>

      {/* Pending submissions */}
      <div style={{ marginTop: 40 }}>
        <SectionTitle eyebrow={lang === "pl" ? "Zgłoszenia w recenzji" : "Pending submissions"} title={lang === "pl" ? "Katalog systemu" : "System catalog"}/>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {window.DB.SUBMISSIONS.map(s => (
            <Card key={s.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 15 }}>{s.name}</div>
                  <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>{s.category}</div>
                </div>
                <Badge tone={s.status === "approved" ? "ok" : "warn"}>{s.status === "approved" ? (lang === "pl" ? "zaakceptowano" : "approved") : (lang === "pl" ? "w recenzji" : "pending")}</Badge>
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-2)", lineHeight: 1.5 }}>{s.note}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", paddingTop: 8, borderTop: "1px dashed var(--rule-soft)" }}>
                {s.submittedBy} · {s.submittedAt}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {submitOpen && <SubmitModal onClose={() => setSubmitOpen(false)} t={t} lang={lang}/>}
    </div>
  );
}

function MaterialsTable({ category, t, lang, query }) {
  const items = window.DB.MATERIALS[category].filter(m =>
    query === "" || m.name.toLowerCase().includes(query.toLowerCase()) || m.supplier.toLowerCase().includes(query.toLowerCase())
  );

  const isHop = category === "hop";
  const isMalt = category === "malt";
  const isYeast = category === "yeast";

  const propCol = isHop ? { label: "α-acids", key: "alpha", unit: "%" } :
                  isMalt ? { label: "EBC", key: "ebc", unit: "" } :
                  isYeast ? { label: "Atten.", key: "attenuation", unit: "%" } :
                  { label: "—", key: null };

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "40px 2fr 1fr 80px 1fr 1fr 100px 140px",
        gap: 12, padding: "12px 18px",
        background: "var(--paper-2)", borderBottom: "1px solid var(--rule)",
        fontFamily: "IBM Plex Mono, monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)"
      }}>
        <div></div>
        <div>{lang === "pl" ? "Nazwa" : "Name"}</div>
        <div>{t("materials.supplier")}</div>
        <div style={{ textAlign: "right" }}>{propCol.label}</div>
        <div>{t("materials.usedIn")}</div>
        <div style={{ textAlign: "right" }}>{lang === "pl" ? "Cena" : "Price"}</div>
        <div style={{ textAlign: "right" }}>{t("materials.quantity")}</div>
        <div>{lang === "pl" ? "Status" : "Status"}</div>
      </div>

      {items.map(m => {
        const recipes = m.usedIn.map(id => window.DB.RECIPES.find(r => r.id === id)?.name).filter(Boolean);
        const stockStatus = m.stock === 0 ? "out" : m.lowStock ? "low" : "ok";
        const maxStock = category === "malt" ? 20 : category === "hop" ? 200 : category === "yeast" ? 5 : 1000;
        return (
          <div key={m.id} style={{
            display: "grid",
            gridTemplateColumns: "40px 2fr 1fr 80px 1fr 1fr 100px 140px",
            gap: 12, padding: "14px 18px",
            borderBottom: "1px solid var(--rule-soft)",
            alignItems: "center",
            cursor: "pointer",
            transition: "background 100ms ease",
          }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--paper-2)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <div>
              {isMalt && <ColorSwatch ebc={m.ebc} size={26}/>}
              {isHop && <div style={{ width: 26, height: 26, borderRadius: 13, background: "var(--hop)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "IBM Plex Mono" }}>α</div>}
              {isYeast && <div style={{ width: 26, height: 26, borderRadius: 13, background: "var(--yeast)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "IBM Plex Mono" }}>Y</div>}
              {category === "adjunct" && <div style={{ width: 26, height: 26, borderRadius: 13, background: "var(--water)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: "IBM Plex Mono" }}>+</div>}
            </div>
            <div>
              <div style={{ fontWeight: 500 }}>{m.name}</div>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 1 }}>{m.origin}</div>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{m.supplier}</div>
            <div className="mono" style={{ textAlign: "right", fontSize: 12.5, fontWeight: 500 }}>
              {propCol.key && m[propCol.key]}
              {propCol.unit && <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>{propCol.unit}</span>}
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {recipes.length === 0 ? <span style={{ color: "var(--ink-3)", fontSize: 11 }}>—</span> :
                recipes.slice(0, 2).map(r => <Badge key={r} tone="neutral" size="sm">{r}</Badge>)}
              {recipes.length > 2 && <Badge tone="neutral" size="sm">+{recipes.length - 2}</Badge>}
            </div>
            <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "right" }}>{m.price} PLN/{m.unit}</div>
            <div style={{ textAlign: "right" }}>
              <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>{m.stock} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>{m.unit}</span></div>
              <div style={{ marginTop: 4 }}><Bar value={m.stock} max={maxStock} tone={isHop ? "hop" : isYeast ? "yeast" : "copper"}/></div>
            </div>
            <div>
              {stockStatus === "ok" && <Badge tone="ok">{t("materials.inStock")}</Badge>}
              {stockStatus === "low" && <Badge tone="warn">{t("materials.lowStock")}</Badge>}
              {stockStatus === "out" && <Badge tone="err">{t("materials.outOfStock")}</Badge>}
            </div>
          </div>
        );
      })}
    </Card>
  );
}

function SubmitModal({ onClose, t, lang }) {
  const [form, setForm] = useStateM({ name: "", category: "hop", origin: "", supplier: "", description: "", prop: "" });
  const [submitted, setSubmitted] = useStateM(false);

  const propLabel = form.category === "malt" ? "EBC" : form.category === "hop" ? "α-kwasy (%)" : form.category === "yeast" ? "Atenuacja (%)" : "Parametr";

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(44, 24, 16, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ width: 560, maxWidth: "100%", maxHeight: "90vh", overflowY: "auto", background: "var(--paper-2)", border: "1px solid var(--ink)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)" }}>
        <div style={{ padding: "22px 26px", borderBottom: "1px solid var(--rule)" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>{t("materials.submit")}</div>
          <h2 className="serif" style={{ margin: "4px 0 6px", fontSize: 26, fontWeight: 500, letterSpacing: "-0.02em" }}>{t("materials.submitFull")}</h2>
          <div style={{ fontSize: 12, color: "var(--ink-3)" }}>{t("materials.submitNote")}</div>
        </div>
        {submitted ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, margin: "0 auto 14px", borderRadius: "50%", background: "var(--ok)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon.check style={{ width: 24, height: 24 }}/>
            </div>
            <div className="serif" style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>{lang === "pl" ? "Zgłoszenie przyjęte" : "Submission received"}</div>
            <div style={{ color: "var(--ink-3)", fontSize: 13, marginBottom: 18 }}>
              {lang === "pl" ? "Moderatorzy rozpatrzą Twoje zgłoszenie w ciągu 24–48h." : "Moderators will review your submission within 24–48h."}
            </div>
            <Button variant="primary" onClick={onClose}>{t("common.close")}</Button>
          </div>
        ) : (
          <>
            <div style={{ padding: 26, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Field label={lang === "pl" ? "Nazwa" : "Name"} style={{ gridColumn: "1 / -1" }}>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={lang === "pl" ? "np. Hallertau Blanc" : "e.g. Hallertau Blanc"}/>
              </Field>
              <Field label={t("materials.category")}>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ padding: "8px 10px", border: "1px solid var(--rule)", borderRadius: "var(--radius)", background: "var(--white)", fontSize: 13, fontFamily: "IBM Plex Sans" }}>
                  <option value="malt">{t("materials.malt")}</option>
                  <option value="hop">{t("materials.hop")}</option>
                  <option value="yeast">{t("materials.yeast")}</option>
                  <option value="adjunct">{t("materials.adjunct")}</option>
                </select>
              </Field>
              <Field label={t("materials.origin")}>
                <Input value={form.origin} onChange={e => setForm({ ...form, origin: e.target.value })} placeholder="DE / US / CZ / PL"/>
              </Field>
              <Field label={t("materials.supplier")}>
                <Input value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}/>
              </Field>
              <Field label={propLabel}>
                <Input value={form.prop} onChange={e => setForm({ ...form, prop: e.target.value })} type="number"/>
              </Field>
              <Field label={t("materials.description")} style={{ gridColumn: "1 / -1" }}>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  style={{ padding: "8px 10px", border: "1px solid var(--rule)", borderRadius: "var(--radius)", background: "var(--white)", fontSize: 13, fontFamily: "IBM Plex Sans", resize: "vertical" }}
                  placeholder={lang === "pl" ? "Profil smakowo-aromatyczny, sugerowane zastosowania, źródła…" : "Flavor/aroma profile, suggested uses, sources…"}/>
              </Field>
            </div>
            <div style={{ padding: "16px 26px", borderTop: "1px solid var(--rule)", display: "flex", justifyContent: "flex-end", gap: 8, background: "var(--paper-3)" }}>
              <Button variant="ghost" onClick={onClose}>{t("common.cancel")}</Button>
              <Button variant="primary" onClick={() => setSubmitted(true)}>{lang === "pl" ? "Wyślij do recenzji" : "Submit for review"}</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { MaterialsView });
