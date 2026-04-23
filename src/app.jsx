// Main app
const { useState, useEffect, useMemo } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "stepsVariant": "walker",
  "paper": "cream",
  "showDayStrip": true
} /*EDITMODE-END*/;

function App() {
  const [state, setState] = useState(() => Challenge.load());
  const [viewDate, setViewDate] = useState(Challenge.todayISO());
  const [editingPerson, setEditingPerson] = useState(null);
  const [showSync, setShowSync] = useState(false);
  const [tweaksOpen, setTweaksOpen] = useState(false);
  const [tweaks, setTweaks] = useState(() => ({
    stepsVariant: state.theme.stepsVariant || TWEAK_DEFAULTS.stepsVariant,
    paper: state.theme.paper || TWEAK_DEFAULTS.paper,
    showDayStrip: TWEAK_DEFAULTS.showDayStrip
  }));

  // Firebase init + real-time sync
  useEffect(() => {
    Challenge.initFirebase({
      apiKey: "AIzaSyCbGt0Z3A3ySsv1IoMgK0_MQEGIl2logpE",
      authDomain: "soft-challenge-be2ff.firebaseapp.com",
      projectId: "soft-challenge-be2ff",
      storageBucket: "soft-challenge-be2ff.firebasestorage.app",
      messagingSenderId: "166470624080",
      appId: "1:166470624080:web:f1477b7fa30720e5d44255",
    });
    const unsub = Challenge.subscribe((remoteState) => {
      setState(remoteState);
    });
    return unsub;
  }, []);

  // Re-fetch from Firestore when the tab returns to foreground —
  // mobile browsers freeze the WebSocket when backgrounded, so onSnapshot
  // may have missed updates while the screen was locked.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        Challenge.fetchLatest((remoteState) => setState(remoteState));
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // Persist state locally + remotely on every change
  useEffect(() => {Challenge.save(state);}, [state]);

  // Ensure today's day record exists (for auto-check defaults)
  useEffect(() => {
    setState((s) => {
      const next = Challenge.clone(s);
      const today = Challenge.todayISO();
      for (const pid of ['margaux', 'brenna']) {
        Challenge.ensureDayRecord(next.people[pid], today);
      }
      return next;
    });
    // re-run on date change at midnight
    const id = setInterval(() => {
      setState((s) => {
        const today = Challenge.todayISO();
        if (!s.people.margaux.history[today] || !s.people.brenna.history[today]) {
          const next = Challenge.clone(s);
          for (const pid of ['margaux', 'brenna']) {
            Challenge.ensureDayRecord(next.people[pid], today);
          }
          return next;
        }
        return s;
      });
    }, 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Apply paper theme to body
  useEffect(() => {
    document.body.dataset.paper = tweaks.paper;
  }, [tweaks.paper]);

  // --- Tweaks postMessage protocol ---
  useEffect(() => {
    const handler = (ev) => {
      const d = ev.data || {};
      if (d.type === '__activate_edit_mode') setTweaksOpen(true);
      if (d.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const setTweak = (k, v) => {
    setTweaks((prev) => ({ ...prev, [k]: v }));
    // Persist steps/paper into app state too so it survives refresh
    if (k === 'stepsVariant' || k === 'paper') {
      setState((s) => ({ ...s, theme: { ...s.theme, [k]: v } }));
    }
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [k]: v } }, '*');
  };

  // --- actions ---
  const updateRecord = (personId, iso, rec) => {
    setState((s) => {
      const next = Challenge.clone(s);
      next.people[personId].history[iso] = rec;
      return next;
    });
  };

  const onEditGoals = (pid) => setEditingPerson(pid);
  const onSaveGoals = (pid, goals, markAdjusted) => {
    setState((s) => {
      const next = Challenge.clone(s);
      next.people[pid].goals = goals;
      if (markAdjusted) next.people[pid].goalsAdjusted = true;
      return next;
    });
  };

  const exportCode = () => Challenge.exportCode(state);
  const onImport = (code) => {
    const imported = Challenge.importCode(code);
    if (!imported) {alert('Invalid sync code.');return;}
    if (!confirm('This will replace your local data with the imported state. Continue?')) return;
    setState(imported);
    setShowSync(false);
  };

  // --- derived ---
  const todayISO = Challenge.todayISO();
  const isViewingToday = viewDate === todayISO;
  const dayIdx = Challenge.dayIndexFor(viewDate);
  const totalDays = state.totalDays;

  const mStreak = Challenge.computeStreak(state.people.margaux);
  const bStreak = Challenge.computeStreak(state.people.brenna);
  const mWarn = Challenge.streakWarning(state.people.margaux);
  const bWarn = Challenge.streakWarning(state.people.brenna);

  const reset = () => {
    if (!confirm('Reset all progress back to the default seed (Days 1 & 2 completed)?')) return;
    const fresh = Challenge.seedState();
    Challenge.save(fresh);
    setState(fresh);
  };

  return (
    <div className="app">
      <AppHeader
        dayIdx={dayIdx} totalDays={totalDays}
        viewDate={viewDate} isToday={isViewingToday}
        onOpenSync={() => setShowSync(true)} />
      

      {tweaks.showDayStrip &&
      <DayStrip
        startDate={state.startDate}
        totalDays={totalDays}
        todayISO={todayISO}
        viewDate={viewDate}
        setViewDate={setViewDate}
        people={state.people} />

      }

      <main className="grid">
        <PersonCard
          personId="margaux" person={state.people.margaux}
          viewDate={viewDate} isToday={isViewingToday}
          onUpdateRecord={updateRecord}
          onEditGoals={onEditGoals}
          stepsVariant={tweaks.stepsVariant}
          streak={mStreak} warning={mWarn} totalDays={totalDays} />
        
        <PersonCard
          personId="brenna" person={state.people.brenna}
          viewDate={viewDate} isToday={isViewingToday}
          onUpdateRecord={updateRecord}
          onEditGoals={onEditGoals}
          stepsVariant={tweaks.stepsVariant}
          streak={bStreak} warning={bWarn} totalDays={totalDays} />
        
      </main>

      <footer className="foot">
        <div className="foot-left">started <strong>{fmtShortDate(state.startDate)}</strong> · ends <strong>{fmtShortDate(Challenge.addDays(state.startDate, totalDays - 1))}</strong></div>
        <div className="foot-right">
          <button className="link-btn" onClick={() => setShowSync(true)}>sync devices</button>
          <span className="dot-sep">·</span>
          <button className="link-btn" onClick={reset}>reset</button>
        </div>
      </footer>

      {editingPerson &&
      <GoalEditor
        person={state.people[editingPerson]}
        personId={editingPerson}
        onSave={onSaveGoals}
        onClose={() => setEditingPerson(null)}
        startDateISO={state.startDate} />

      }
      {showSync &&
      <SyncModal
        onClose={() => setShowSync(false)}
        getExportCode={exportCode}
        onImport={onImport} />

      }

      {tweaksOpen &&
      <TweaksPanel tweaks={tweaks} setTweak={setTweak} onClose={() => setTweaksOpen(false)} />
      }
    </div>);

}

function AppHeader({ dayIdx, totalDays, viewDate, isToday, onOpenSync }) {
  const [y, m, d] = viewDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const long = dt.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  return (
    <header className="app-head">
      <div className="brand">
        <span className="brand-sticker" aria-hidden>45</span>
        <div>
          <h1 className="brand-title">45 Soft Challenge</h1>
          <p className="brand-sub">a sisterly experiment · <em>{long}</em></p>
        </div>
      </div>
      <div className="day-chip">
        <span className="day-chip-lbl">{isToday ? 'today' : 'viewing'}</span>
        <span className="day-chip-num">
          Day {dayIdx ?? '—'}<span className="day-chip-of"> / {totalDays}</span>
        </span>
      </div>
    </header>);

}

function DayStrip({ startDate, totalDays, todayISO, viewDate, setViewDate, people }) {
  const todayIdx = Challenge.dayIndexFor(todayISO);
  return (
    <div className="daystrip-wrap">
      <div className="daystrip">
        {Array.from({ length: totalDays }).map((_, i) => {
          const idx = i + 1;
          const iso = Challenge.addDays(startDate, i);
          const isFuture = todayIdx != null ? idx > todayIdx : false;
          const isToday = iso === todayISO;
          const isView = iso === viewDate;
          const mDone = Challenge.isDayComplete(people.margaux, iso);
          const bDone = Challenge.isDayComplete(people.brenna, iso);
          const past = todayIdx != null && idx < todayIdx;
          return (
            <button
              key={idx}
              className={`daycell ${isToday ? 'daycell--today' : ''} ${isView ? 'daycell--view' : ''} ${isFuture ? 'daycell--future' : ''} ${past ? 'daycell--past' : ''}`}
              onClick={() => !isFuture && setViewDate(iso)}
              aria-current={isToday ? 'date' : undefined}
              title={fmtShortDate(iso) + ` · Day ${idx}`}
              disabled={isFuture}>
              
              <span className="daycell-num">{idx}</span>
              <span className="daycell-dots">
                <i className={`d d-m ${mDone ? 'on' : ''}`} title="Margaux" />
                <i className={`d d-b ${bDone ? 'on' : ''}`} title="Brenna" />
              </span>
            </button>);

        })}
      </div>
    </div>);

}

function TweaksPanel({ tweaks, setTweak, onClose }) {
  return (
    <div className="tweaks-panel">
      <header className="tweaks-head">
        <h4>Tweaks</h4>
        <button className="tweaks-close" onClick={onClose}>×</button>
      </header>
      <div className="tweaks-body">
        <label className="tweaks-label">Steps visual</label>
        <div className="tweaks-segmented">
          {['walker', 'ring', 'footprints'].map((v) =>
          <button
            key={v}
            className={tweaks.stepsVariant === v ? 'seg seg--on' : 'seg'}
            onClick={() => setTweak('stepsVariant', v)}>
            {v}</button>
          )}
        </div>
        <label className="tweaks-label">Paper color</label>
        <div className="tweaks-segmented">
          {['cream', 'blush', 'sage'].map((v) =>
          <button
            key={v}
            className={tweaks.paper === v ? 'seg seg--on' : 'seg'}
            onClick={() => setTweak('paper', v)}>
            {v}</button>
          )}
        </div>
        <label className="tweaks-label">Day strip</label>
        <div className="tweaks-segmented">
          <button className={tweaks.showDayStrip ? 'seg seg--on' : 'seg'} onClick={() => setTweak('showDayStrip', true)}>show</button>
          <button className={!tweaks.showDayStrip ? 'seg seg--on' : 'seg'} onClick={() => setTweak('showDayStrip', false)}>hide</button>
        </div>
      </div>
    </div>);

}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);