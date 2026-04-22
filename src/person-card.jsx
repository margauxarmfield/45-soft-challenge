// PersonCard — renders one person's day tracker + streak + expandable details
const { useState: useStatePC, useMemo: useMemoPC, useEffect: useEffectPC } = React;

// Live pacing — re-render every minute so visuals creep up through the day
function useNow(intervalMs = 60 * 1000) {
  const [now, setNow] = useStatePC(() => new Date());
  useEffectPC(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

const ICONS = {
  wake: '☀️',
  bed: '🌙',
  phoneAway: '📵',
  water: '💧',
  exercise: '🏋️',
  walk: '👟',
  read: '📖',
};

const LABELS = (g) => ({
  wake: `Wake by ${fmtTime(g.wake)}`,
  bed: `In bed by ${fmtTime(g.bed)}`,
  phoneAway: `Phone away by ${fmtTime(g.phoneAway)}`,
  water: `Drink ${g.water} oz of water`,
  exercise: `Exercise ${g.exercise} min`,
  walk: `Walk ${fmtSteps(g.walk)} steps`,
  read: `Read ${g.read} min`,
});

function fmtTime(t) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = ((h + 11) % 12) + 1;
  return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2,'0')}${ampm}`;
}

// Returns 0..1 fraction of 8am..8pm that has elapsed
function paceFraction(now = new Date()) {
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = 8 * 60;
  const end = 20 * 60;
  if (mins <= start) return 0;
  if (mins >= end) return 1;
  return (mins - start) / (end - start);
}

function PersonCard({
  personId, person, viewDate, isToday,
  onUpdateRecord, onToggle, onEditGoals,
  stepsVariant, streak, warning, totalDays,
}) {
  const g = person.goals;
  const labels = LABELS(g);
  const rec = person.history[viewDate] || {
    wake: false, bed: isToday, phoneAway: isToday,
    water: false, exercise: false, walk: false,
    read: !g.enabled.read,
    waterAmt: 0, walkAmt: 0,
  };
  const now = useNow(60 * 1000);
  const pace = paceFraction(now);
  const paceForDate = isToday ? pace : 1;

  const toggleBool = (k) => {
    const next = { ...rec, [k]: !rec[k] };
    // Checkbox SNAPS amount to goal when checking on;
    // clearing the checkbox wipes the amount so the visual resets too.
    if (k === 'water') next.waterAmt = next.water ? g.water : 0;
    if (k === 'walk') next.walkAmt = next.walk ? g.walk : 0;
    onUpdateRecord(personId, viewDate, next);
  };

  // Manual-entry handler: updates amount and syncs the done checkbox.
  // If amount >= goal, done=true. If amount < goal, done=false (unchecks).
  const setAmt = (k, amtKey, goalAmt) => (v) => {
    const clean = Math.max(0, isNaN(v) ? 0 : v);
    const next = { ...rec, [amtKey]: clean, [k]: clean >= goalAmt };
    onUpdateRecord(personId, viewDate, next);
  };

  const autoTip = isToday
    ? "Auto-checked at your set time each day — uncheck if you missed it."
    : "Default is checked — uncheck if missed.";

  return (
    <section className="person-card" style={{ '--accent': person.color }}>
      <header className="person-head">
        <div className="person-title">
          <span className="person-dot" aria-hidden />
          <h2 className="person-name">{person.name}</h2>
          {person.goalsAdjusted && (
            <span className="adjusted-tag" title="Goals adjusted after start">adjusted</span>
          )}
        </div>
        <button className="edit-goals-btn" onClick={() => onEditGoals(personId)} aria-label={`Edit ${person.name}'s goals`}>
          <svg viewBox="0 0 16 16" width="13" height="13" aria-hidden><path d="M11.5 2.5 L13.5 4.5 L5 13 L2 14 L3 11 Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          edit
        </button>
      </header>

      <div className="streak-row">
        <div className="streak-big">
          <span className="streak-num">{streak}</span>
          <span className="streak-lbl">day streak</span>
          <span className="streak-flame" aria-hidden>{streak >= 7 ? '🔥' : streak >= 3 ? '✨' : '🌱'}</span>
        </div>
        {warning && (
          <div className="streak-warn" role="alert">
            <strong>heads up —</strong> you missed {fmtShortDate(warning.missed)}. one more miss and the streak resets.
          </div>
        )}
      </div>

      <ol className="goals-list">
        <li>
          <GoalRow
            icon={ICONS.wake} label={labels.wake}
            accent={person.color}
            done={rec.wake} disabled={!g.enabled.wake}
            onToggle={() => toggleBool('wake')}
          />
        </li>
        <li>
          <GoalRow
            icon={ICONS.bed} label={labels.bed}
            accent={person.color}
            done={rec.bed} disabled={!g.enabled.bed}
            onToggle={() => toggleBool('bed')}
            tooltip={autoTip}
          />
        </li>
        <li>
          <GoalRow
            icon={ICONS.phoneAway} label={labels.phoneAway}
            accent={person.color}
            done={rec.phoneAway} disabled={!g.enabled.phoneAway}
            onToggle={() => toggleBool('phoneAway')}
            tooltip={autoTip}
          />
        </li>
        <li>
          <GoalRow
            icon={ICONS.water} label={labels.water}
            accent={person.color}
            done={rec.water} disabled={!g.enabled.water}
            onToggle={() => toggleBool('water')}
            tooltip="Striped fill = where you should be by now. Solid fill = what you've logged. Check the box to snap to 100%."
            rightSlot={
              <div className="viz-and-input">
                <div className="water-row">
                  <WaterBottle amount={rec.waterAmt || 0} goal={g.water} paceFrac={paceForDate} color={person.color} />
                  <WaterPlant amount={rec.waterAmt || 0} goal={g.water} color={person.color} />
                </div>
                <AmountStepper
                  value={rec.waterAmt || 0}
                  onChange={setAmt('water', 'waterAmt', g.water)}
                  step={8} min={0} max={500} unit="oz"
                  goal={g.water}
                />
              </div>
            }
          />
        </li>
        <li>
          <GoalRow
            icon={ICONS.exercise} label={labels.exercise}
            accent={person.color}
            done={rec.exercise} disabled={!g.enabled.exercise}
            onToggle={() => toggleBool('exercise')}
          />
        </li>
        <li>
          <GoalRow
            icon={ICONS.walk} label={labels.walk}
            accent={person.color}
            done={rec.walk} disabled={!g.enabled.walk}
            onToggle={() => toggleBool('walk')}
            tooltip="Dashed/ghost layer = expected pace. Solid layer = what you've logged. You can exceed the goal — enter any number."
            rightSlot={
              <div className="viz-and-input">
                <StepsViz variant={stepsVariant} amount={rec.walkAmt || 0} goal={g.walk} paceFrac={paceForDate} color={person.color}
                          onAmountChange={setAmt('walk', 'walkAmt', g.walk)} />
                <AmountStepper
                  value={rec.walkAmt || 0}
                  onChange={setAmt('walk', 'walkAmt', g.walk)}
                  step={500} min={0} max={100000} unit="steps"
                  goal={g.walk}
                />
              </div>
            }
          />
        </li>
        <li>
          <GoalRow
            icon={ICONS.read} label={g.enabled.read ? labels.read : 'Reading — opted out'}
            accent={person.color}
            done={rec.read} disabled={!g.enabled.read}
            onToggle={() => toggleBool('read')}
          />
        </li>
      </ol>
    </section>
  );
}

function fmtShortDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

Object.assign(window, { PersonCard, ICONS, LABELS, fmtTime, fmtShortDate, paceFraction });
