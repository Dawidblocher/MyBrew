// Brew protocol — timeline, timers, sanitation, measurements, event log
const { useState: useStateP, useEffect: useEffectP, useRef: useRefP } = React;

function ProtocolView({ t, lang, density, protocolView, recipeId }) {
  const recipe = window.DB.RECIPES.find(r => r.id === (recipeId || window.DB.ACTIVE_SESSION.recipeId));
  const [session, setSession] = useStateP(() => JSON.parse(JSON.stringify(window.DB.ACTIVE_SESSION)));
  const [runningTimer, setRunningTimer] = useStateP(null);

  // tick the elapsed minute counter for the active step every second for demo
  const [elapsedSec, setElapsedSec] = useStateP(0);
  useEffectP(() => {
    const i = setInterval(() => setElapsedSec(s => s + 1), 1000);
    return () => clearInterval(i);
  }, []);

  if (!recipe) return null;

  return (
    <div style={{ padding: "24px 32px 48px", maxWidth: 1400, margin: "0 auto" }}>
      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, gap: 20 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>{t("protocol.subtitle")}</div>
            <LivePill t={t}/>
          </div>
          <h1 className="serif" style={{ margin: 0, fontSize: 36, fontWeight: 500, letterSpacing: "-0.02em", display: "flex", alignItems: "baseline", gap: 14 }}>
            {recipe.name}
            <span style={{ fontSize: 18, color: "var(--ink-3)", fontWeight: 400 }}>· {t("protocol.activeSession")}</span>
          </h1>
          <div style={{ marginTop: 8, color: "var(--ink-3)", fontSize: 13 }}>
            <span className="mono">#{session.id.toUpperCase()}</span> · {lang === "pl" ? "Rozpoczęto" : "Started"} {new Date(session.startedAt).toLocaleString(lang === "pl" ? "pl-PL" : "en-GB", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button variant="outline" size="sm" icon={<Icon.pdf/>}>{t("common.export")}</Button>
          <Button variant="outline" size="sm">{lang === "pl" ? "Zakończ sesję" : "End session"}</Button>
        </div>
      </div>

      {/* view switch for demo; the actual tweak is at app level */}
      {protocolView === "timeline" && <ProtocolTimeline session={session} setSession={setSession} recipe={recipe} t={t} lang={lang} elapsedSec={elapsedSec}/>}
      {protocolView === "checklist" && <ProtocolChecklist session={session} setSession={setSession} recipe={recipe} t={t} lang={lang}/>}
      {protocolView === "table" && <ProtocolTable session={session} setSession={setSession} recipe={recipe} t={t} lang={lang}/>}
    </div>
  );
}

function LivePill({ t }) {
  const [blink, setBlink] = useStateP(true);
  useEffectP(() => {
    const i = setInterval(() => setBlink(b => !b), 900);
    return () => clearInterval(i);
  }, []);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px", background: "var(--err)", color: "white", fontFamily: "IBM Plex Mono", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 500, borderRadius: "var(--radius)" }}>
      <span style={{ width: 6, height: 6, borderRadius: 3, background: "white", opacity: blink ? 1 : 0.3, transition: "opacity 200ms" }}/>
      {t("protocol.live")}
    </span>
  );
}

function ProtocolTimeline({ session, setSession, recipe, t, lang, elapsedSec }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <StepsTimeline session={session} setSession={setSession} t={t} lang={lang} elapsedSec={elapsedSec}/>
        <GravityReadings session={session} setSession={setSession} recipe={recipe} t={t} lang={lang}/>
        <ComparisonPanel session={session} recipe={recipe} t={t} lang={lang}/>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SanitationChecklist session={session} setSession={setSession} t={t} lang={lang}/>
        <Timers t={t} lang={lang}/>
        <EventLog session={session} setSession={setSession} t={t} lang={lang}/>
      </div>
    </div>
  );
}

function StepsTimeline({ session, setSession, t, lang, elapsedSec }) {
  const activeStep = session.steps.find(s => s.status === "active");

  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--rule-soft)" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 4 }}>
          {lang === "pl" ? "Etapy warzenia" : "Brewing stages"}
        </div>
        <div className="serif" style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em" }}>
          {lang === "pl" ? "Postęp" : "Progress"}
        </div>
      </div>

      {/* horizontal stepper */}
      <div style={{ padding: "20px 20px 8px", borderBottom: "1px solid var(--rule-soft)", background: "var(--paper-2)" }}>
        <div style={{ display: "flex", position: "relative", gap: 0 }}>
          {session.steps.map((s, i) => {
            const icons = { mashIn: Icon.wheat, mash: Icon.thermo, lauter: Icon.drop, boil: Icon.flame, hop: Icon.leaf, chill: Icon.drop, pitch: Icon.beaker, ferment: Icon.beaker };
            const Ic = icons[s.key] || Icon.dot;
            const color = s.status === "done" ? "var(--ok)" : s.status === "active" ? "var(--copper)" : "var(--rule)";
            return (
              <div key={s.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {i > 0 && <div style={{ position: "absolute", left: "-50%", right: "50%", top: 18, height: 2, background: s.status === "pending" ? "var(--rule)" : "var(--ok)" }}/>}
                <div style={{
                  width: 38, height: 38, borderRadius: "50%",
                  background: s.status === "active" ? "var(--copper)" : s.status === "done" ? "var(--ok)" : "var(--paper-3)",
                  color: s.status === "pending" ? "var(--ink-3)" : "white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  border: "3px solid " + (s.status === "active" ? "rgba(184,99,45,0.25)" : "var(--paper-2)"),
                  position: "relative", zIndex: 1,
                  animation: s.status === "active" ? "pulse 2s ease infinite" : "none",
                }}>
                  {s.status === "done" ? <Icon.check/> : <Ic/>}
                </div>
                <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 8, letterSpacing: "0.05em", textTransform: "uppercase", textAlign: "center" }}>
                  {t("protocol.steps." + s.key)}
                </div>
              </div>
            );
          })}
        </div>
        <style>{`@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(184,99,45,0.4); } 50% { box-shadow: 0 0 0 8px rgba(184,99,45,0); } }`}</style>
      </div>

      {/* active step detail */}
      {activeStep && activeStep.subSteps && (
        <div style={{ padding: "20px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
            <div>
              <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--copper)" }}>{lang === "pl" ? "Aktywny etap" : "Active stage"}</div>
              <div className="serif" style={{ fontSize: 20, fontWeight: 500 }}>{t("protocol.steps." + activeStep.key)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div className="mono" style={{ fontSize: 10, color: "var(--ink-3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{t("protocol.elapsed")}</div>
              <div className="serif" style={{ fontSize: 28, fontWeight: 500, color: "var(--copper)" }}>
                {String(Math.floor(activeStep.elapsedMin / 60)).padStart(2, "0")}:{String(activeStep.elapsedMin % 60).padStart(2, "0")}:{String(elapsedSec % 60).padStart(2, "0")}
              </div>
            </div>
          </div>

          {activeStep.subSteps.map((ss, i) => {
            const pct = ss.status === "done" ? 100 : ss.status === "active" ? ((ss.elapsedDur || 0) / ss.plannedDur) * 100 : 0;
            const devTemp = ss.actualTemp ? (ss.actualTemp - ss.plannedTemp).toFixed(1) : null;
            return (
              <div key={i} style={{ padding: "12px 0", borderBottom: "1px dashed var(--rule-soft)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "24px 1fr 70px 70px 70px", gap: 10, alignItems: "center" }}>
                  <div>
                    {ss.status === "done" ? <div style={{ width: 20, height: 20, borderRadius: 10, background: "var(--ok)", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.check/></div> :
                     ss.status === "active" ? <div style={{ width: 20, height: 20, borderRadius: 10, background: "var(--copper)", border: "3px solid rgba(184,99,45,0.3)" }}/> :
                     <div style={{ width: 20, height: 20, borderRadius: 10, border: "2px dashed var(--rule)" }}/>}
                  </div>
                  <div style={{ fontWeight: ss.status === "active" ? 500 : 400, color: ss.status === "pending" ? "var(--ink-3)" : "var(--ink)" }}>{ss.name}</div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>PLAN</div>
                    <div className="mono" style={{ fontSize: 13 }}>{ss.plannedTemp}°C</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>REAL</div>
                    <div className="mono" style={{ fontSize: 13, color: ss.actualTemp ? (Math.abs(devTemp) < 0.5 ? "var(--ok)" : Math.abs(devTemp) < 1 ? "var(--warn)" : "var(--err)") : "var(--ink-3)" }}>
                      {ss.actualTemp ? `${ss.actualTemp}°C` : "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{t("common.min")}</div>
                    <div className="mono" style={{ fontSize: 13 }}>
                      {ss.status === "active" ? `${ss.elapsedDur || 0}/${ss.plannedDur}` : `${ss.actualDur || ss.plannedDur}`}
                    </div>
                  </div>
                </div>
                {(ss.status === "active") && (
                  <div style={{ marginTop: 8, paddingLeft: 34 }}>
                    <div style={{ height: 4, background: "var(--paper-3)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ width: `${pct}%`, height: "100%", background: "var(--copper)", transition: "width 500ms" }}/>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <Button variant="ghost" size="sm"><Icon.pause/> {lang === "pl" ? "Pauza" : "Pause"}</Button>
            <Button variant="copper" size="sm" style={{ marginLeft: "auto" }}>{lang === "pl" ? "Zakończ przerwę" : "Finish rest"} →</Button>
          </div>
        </div>
      )}

      {/* upcoming steps */}
      <div style={{ padding: "16px 20px", borderTop: "1px solid var(--rule-soft)", background: "var(--paper-2)" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 10 }}>{lang === "pl" ? "Kolejne kroki" : "Upcoming"}</div>
        {session.steps.filter(s => s.status === "pending").slice(0, 3).map(s => (
          <div key={s.key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12.5 }}>
            <span>{t("protocol.steps." + s.key)}</span>
            <span className="mono" style={{ color: "var(--ink-3)" }}>
              {s.plannedDuration > 60 * 24 ? `${Math.round(s.plannedDuration / (60 * 24))} d` : s.plannedDuration > 60 ? `${Math.round(s.plannedDuration / 60)} h` : `${s.plannedDuration} min`}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SanitationChecklist({ session, setSession, t, lang }) {
  const done = session.sanitation.filter(c => c.done).length;
  const total = session.sanitation.length;
  const toggle = (id) => setSession({ ...session, sanitation: session.sanitation.map(c => c.id === id ? { ...c, done: !c.done } : c) });

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>{t("protocol.sanitation")}</div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 500 }}>{done}/{total}</div>
        </div>
        <div style={{ width: 60, height: 60, position: "relative" }}>
          <svg viewBox="0 0 60 60">
            <circle cx="30" cy="30" r="24" fill="none" stroke="var(--paper-3)" strokeWidth="6"/>
            <circle cx="30" cy="30" r="24" fill="none" stroke="var(--ok)" strokeWidth="6"
              strokeDasharray={2 * Math.PI * 24}
              strokeDashoffset={2 * Math.PI * 24 * (1 - done / total)}
              strokeLinecap="round"
              transform="rotate(-90 30 30)"
              style={{ transition: "stroke-dashoffset 300ms ease" }}/>
            <text x="30" y="34" textAnchor="middle" fontFamily="IBM Plex Mono" fontSize="13" fontWeight="500" fill="var(--ink)">{Math.round((done / total) * 100)}%</text>
          </svg>
        </div>
      </div>
      <div style={{ marginTop: 8 }}>
        {session.sanitation.map(c => (
          <label key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 0", borderBottom: "1px dashed var(--rule-soft)", cursor: "pointer" }}>
            <button onClick={() => toggle(c.id)} style={{
              width: 18, height: 18, flexShrink: 0, marginTop: 1,
              border: "1.5px solid " + (c.done ? "var(--ok)" : "var(--rule)"),
              background: c.done ? "var(--ok)" : "transparent",
              color: "white", display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", borderRadius: 3, padding: 0,
            }}>
              {c.done && <Icon.check/>}
            </button>
            <span style={{ fontSize: 13, color: c.done ? "var(--ink-3)" : "var(--ink)", textDecoration: c.done ? "line-through" : "none" }}>{c.label}</span>
          </label>
        ))}
      </div>
    </Card>
  );
}

function Timers({ t, lang }) {
  const [timers, setTimers] = useStateP([
    { id: "t1", name: "Przerwa scukrzająca 72°C", total: 30 * 60, remaining: 16 * 60, running: true, tone: "copper" },
    { id: "t2", name: "Magnum 60 min", total: 60 * 60, remaining: 60 * 60, running: false, tone: "hop" },
    { id: "t3", name: "Whirlpool 20 min", total: 20 * 60, remaining: 20 * 60, running: false, tone: "hop" },
  ]);

  useEffectP(() => {
    const i = setInterval(() => {
      setTimers(ts => ts.map(t => t.running && t.remaining > 0 ? { ...t, remaining: t.remaining - 1 } : t));
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const toggle = (id) => setTimers(ts => ts.map(t => t.id === id ? { ...t, running: !t.running } : t));

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>{t("protocol.timers")}</div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 500 }}>{timers.filter(t => t.running).length} {t("common.running")}</div>
        </div>
        <Button size="sm" variant="ghost" icon={<Icon.plus/>}>{lang === "pl" ? "Dodaj" : "Add"}</Button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {timers.map(tm => {
          const pct = ((tm.total - tm.remaining) / tm.total) * 100;
          return (
            <div key={tm.id} style={{ padding: 12, border: "1px solid " + (tm.running ? "var(--copper)" : "var(--rule-soft)"), background: tm.running ? "rgba(184,99,45,0.04)" : "var(--paper-2)", borderRadius: "var(--radius)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 500, flex: 1, minWidth: 0 }}>{tm.name}</div>
                <button onClick={() => toggle(tm.id)} style={{
                  width: 28, height: 28, borderRadius: 14,
                  background: tm.running ? "var(--copper)" : "var(--ink)",
                  color: "white", border: "none", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>{tm.running ? <Icon.pause/> : <Icon.play/>}</button>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span className="mono" style={{ fontSize: 22, fontWeight: 500, color: tm.running ? "var(--copper)" : "var(--ink)" }}>{fmt(tm.remaining)}</span>
                <span className="mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>/ {fmt(tm.total)}</span>
              </div>
              <div style={{ height: 3, background: "var(--paper-3)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: tm.tone === "hop" ? "var(--hop)" : "var(--copper)", transition: "width 500ms linear" }}/>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function GravityReadings({ session, setSession, recipe, t, lang }) {
  const readings = [
    { label: t("protocol.preboil"), planned: 1.044, actual: 1.046, when: "przed gotowaniem" },
    { label: t("protocol.postboil"), planned: recipe.targets.og, actual: null, when: "po gotowaniu" },
    { label: t("protocol.og"), planned: recipe.targets.og, actual: null, when: "nastaw" },
    { label: t("protocol.fg"), planned: recipe.targets.fg, actual: null, when: "koniec fermentacji" },
  ];

  return (
    <Card>
      <SectionTitle eyebrow={t("protocol.gravity")} title={lang === "pl" ? "Pomiary" : "Readings"} right={<Button size="sm" variant="ghost" icon={<Icon.plus/>}>{t("protocol.addMeasurement")}</Button>}/>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10 }}>
        {readings.map((r, i) => {
          const dev = r.actual ? r.actual - r.planned : null;
          return (
            <div key={i} style={{ padding: 14, background: "var(--paper-2)", border: "1px solid var(--rule-soft)", borderRadius: "var(--radius)" }}>
              <div className="mono" style={{ fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)", marginBottom: 6 }}>{r.label}</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>plan</span>
                <span className="mono" style={{ fontSize: 13 }}>{r.planned.toFixed(3)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 2 }}>
                <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>real</span>
                <span className="mono" style={{ fontSize: 18, fontWeight: 500, color: r.actual ? (Math.abs(dev) < 0.002 ? "var(--ok)" : "var(--warn)") : "var(--ink-3)" }}>
                  {r.actual ? r.actual.toFixed(3) : "—"}
                </span>
              </div>
              {r.actual && (
                <div style={{ fontSize: 10, fontFamily: "IBM Plex Mono", color: dev > 0 ? "var(--ok)" : "var(--warn)", textAlign: "right", marginTop: 2 }}>
                  {dev > 0 ? "+" : ""}{dev.toFixed(3)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function ComparisonPanel({ session, recipe, t, lang }) {
  const rows = [
    { label: lang === "pl" ? "Temp. zacierania (śr.)" : "Mash temp (avg)", planned: "65.3°C", actual: "65.1°C", dev: "−0.2" },
    { label: lang === "pl" ? "Czas zacierania" : "Mash duration", planned: "85 min", actual: "87 min", dev: "+2" },
    { label: lang === "pl" ? "pH zacieru" : "Mash pH", planned: "5.30", actual: "5.35", dev: "+0.05" },
    { label: lang === "pl" ? "Gęstość przed gotow." : "Pre-boil gravity", planned: "1.044", actual: "1.046", dev: "+0.002" },
  ];
  return (
    <Card>
      <SectionTitle eyebrow={t("protocol.comparison")} title={lang === "pl" ? "Plan vs. wykonanie" : "Plan vs. actual"}/>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 80px", gap: 8, padding: "6px 0", borderBottom: "1px solid var(--rule)", fontFamily: "IBM Plex Mono", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)" }}>
        <div></div>
        <div style={{ textAlign: "right" }}>{t("common.planned")}</div>
        <div style={{ textAlign: "right" }}>{t("common.actual")}</div>
        <div style={{ textAlign: "right" }}>Δ</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 90px 80px", gap: 8, padding: "10px 0", borderBottom: "1px dashed var(--rule-soft)" }}>
          <div style={{ fontSize: 13 }}>{r.label}</div>
          <div className="mono" style={{ fontSize: 12, color: "var(--ink-3)", textAlign: "right" }}>{r.planned}</div>
          <div className="mono" style={{ fontSize: 13, fontWeight: 500, textAlign: "right" }}>{r.actual}</div>
          <div className="mono" style={{ fontSize: 12, color: r.dev.startsWith("+") ? "var(--ok)" : "var(--warn)", textAlign: "right" }}>{r.dev}</div>
        </div>
      ))}
    </Card>
  );
}

function EventLog({ session, setSession, t, lang }) {
  const [note, setNote] = useStateP("");
  const addEvent = () => {
    if (!note.trim()) return;
    const time = new Date();
    const hm = `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}`;
    setSession({ ...session, events: [...session.events, { id: `e${Date.now()}`, time: hm, note, kind: "note" }] });
    setNote("");
  };

  return (
    <Card>
      <SectionTitle eyebrow={t("protocol.eventLog")} title={`${session.events.length} ${lang === "pl" ? "wpisów" : "entries"}`}/>
      <div style={{ maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
        {session.events.slice().reverse().map(e => (
          <div key={e.id} style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 10, padding: "10px 0", borderBottom: "1px dashed var(--rule-soft)" }}>
            <div className="mono" style={{ fontSize: 11, color: e.kind === "step" ? "var(--copper)" : "var(--ink-3)", fontWeight: e.kind === "step" ? 500 : 400 }}>{e.time}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {e.kind === "step" && <Badge tone="copper" size="sm" style={{ marginRight: 6 }}>krok</Badge>}
              {e.note}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 6 }}>
        <input value={note} onChange={e => setNote(e.target.value)} onKeyDown={e => e.key === "Enter" && addEvent()}
          placeholder={t("protocol.placeholder")}
          style={{ flex: 1, padding: "9px 12px", border: "1px solid var(--rule)", borderRadius: "var(--radius)", background: "var(--white)", fontSize: 13, fontFamily: "IBM Plex Sans", outline: "none" }}/>
        <Button variant="primary" size="sm" onClick={addEvent}><Icon.plus/></Button>
      </div>
    </Card>
  );
}

function ProtocolChecklist({ session, setSession, recipe, t, lang }) {
  // compact single-column checklist view
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>
      <Card style={{ padding: 0 }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--rule)" }}>
          <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>{lang === "pl" ? "Widok listy" : "Checklist view"}</div>
          <div className="serif" style={{ fontSize: 22, fontWeight: 500 }}>{lang === "pl" ? "Dzień warzenia" : "Brew day"}</div>
        </div>
        {session.steps.map((s, i) => (
          <div key={s.key} style={{ display: "flex", alignItems: "flex-start", gap: 14, padding: "16px 22px", borderBottom: "1px solid var(--rule-soft)", background: s.status === "active" ? "rgba(184,99,45,0.05)" : "transparent" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
              background: s.status === "done" ? "var(--ok)" : s.status === "active" ? "var(--copper)" : "var(--paper-3)",
              color: s.status === "pending" ? "var(--ink-3)" : "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "IBM Plex Mono", fontSize: 12, fontWeight: 500,
            }}>
              {s.status === "done" ? <Icon.check/> : i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div className="serif" style={{ fontSize: 17, fontWeight: 500, color: s.status === "pending" ? "var(--ink-3)" : "var(--ink)" }}>{t("protocol.steps." + s.key)}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>
                  {s.plannedDuration > 60 * 24 ? `${Math.round(s.plannedDuration / (60 * 24))} d` : s.plannedDuration > 60 ? `${Math.round(s.plannedDuration / 60)} h` : `${s.plannedDuration} min`}
                </div>
              </div>
              {s.subSteps && (
                <div style={{ marginTop: 8, padding: "0 0 0 0" }}>
                  {s.subSteps.map((ss, j) => (
                    <div key={j} style={{ padding: "4px 0", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 6, background: ss.status === "done" ? "var(--ok)" : ss.status === "active" ? "var(--copper)" : "var(--paper-3)" }}/>
                      <span style={{ flex: 1, color: ss.status === "pending" ? "var(--ink-3)" : "var(--ink)" }}>{ss.name}</span>
                      <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{ss.plannedDur} min</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </Card>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <SanitationChecklist session={session} setSession={setSession} t={t} lang={lang}/>
        <EventLog session={session} setSession={setSession} t={t} lang={lang}/>
      </div>
    </div>
  );
}

function ProtocolTable({ session, setSession, recipe, t, lang }) {
  return (
    <Card style={{ padding: 0 }}>
      <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--rule)" }}>
        <div className="mono" style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-3)" }}>{lang === "pl" ? "Widok tabelaryczny" : "Table view"}</div>
        <div className="serif" style={{ fontSize: 22, fontWeight: 500 }}>{lang === "pl" ? "Protokół pełny" : "Full log"}</div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--paper-2)" }}>
              {[lang === "pl" ? "Krok" : "Step", lang === "pl" ? "Planowana temp." : "Planned temp", lang === "pl" ? "Rzeczywista" : "Actual", lang === "pl" ? "Planowany czas" : "Planned time", lang === "pl" ? "Rzeczywisty" : "Actual", lang === "pl" ? "Odchylenie" : "Deviation", "Status"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontFamily: "IBM Plex Mono", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-3)", borderBottom: "1px solid var(--rule)", fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {session.steps.flatMap(s => {
              if (s.subSteps) return s.subSteps.map((ss, j) => ({
                name: ss.name, plannedT: ss.plannedTemp + "°C", actualT: ss.actualTemp ? ss.actualTemp + "°C" : "—",
                plannedD: ss.plannedDur + " min", actualD: ss.actualDur ? ss.actualDur + " min" : ss.elapsedDur ? `${ss.elapsedDur}/${ss.plannedDur} min` : "—",
                dev: ss.actualTemp ? ((ss.actualTemp - ss.plannedTemp).toFixed(1) + "°C") : "—",
                status: ss.status,
              }));
              return [{ name: t("protocol.steps." + s.key), plannedT: "—", actualT: "—", plannedD: (s.plannedDuration > 60 * 24 ? Math.round(s.plannedDuration / (60 * 24)) + " d" : s.plannedDuration > 60 ? Math.round(s.plannedDuration / 60) + " h" : s.plannedDuration + " min"), actualD: s.actualDuration ? s.actualDuration + " min" : "—", dev: "—", status: s.status }];
            }).map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--rule-soft)" }}>
                <td style={{ padding: "12px 16px", fontWeight: 500 }}>{row.name}</td>
                <td style={{ padding: "12px 16px", fontFamily: "IBM Plex Mono", color: "var(--ink-3)" }}>{row.plannedT}</td>
                <td style={{ padding: "12px 16px", fontFamily: "IBM Plex Mono", fontWeight: 500 }}>{row.actualT}</td>
                <td style={{ padding: "12px 16px", fontFamily: "IBM Plex Mono", color: "var(--ink-3)" }}>{row.plannedD}</td>
                <td style={{ padding: "12px 16px", fontFamily: "IBM Plex Mono", fontWeight: 500 }}>{row.actualD}</td>
                <td style={{ padding: "12px 16px", fontFamily: "IBM Plex Mono", color: row.dev.includes("−") || row.dev.includes("+") ? "var(--warn)" : "var(--ink-3)" }}>{row.dev}</td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge tone={row.status === "done" ? "ok" : row.status === "active" ? "copper" : "neutral"}>{t("common." + (row.status === "done" ? "done" : row.status === "active" ? "running" : "pending"))}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

Object.assign(window, { ProtocolView });
