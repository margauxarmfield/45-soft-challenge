// Goal card — row for a single habit on a given day
// Handles checkbox, amount entry (water/walk), time-based auto-check tooltip.

const { useState: useStateGC } = React;

function GoalRow({
  icon, label, done, onToggle,
  disabled,              // goal turned off
  tooltip,               // info hover
  rightSlot,             // e.g. the visual for water/walk
  accent,                // person accent
}) {
  if (disabled) {
    return (
      <div className="goal-row goal-row--disabled">
        <div className="goal-left">
          <span className="goal-icon" aria-hidden>{icon}</span>
          <span className="goal-label">{label}</span>
          <span className="goal-off-tag">off</span>
        </div>
      </div>
    );
  }
  return (
    <div className={`goal-row ${done ? 'goal-row--done' : ''}`}>
      <button
        className="goal-check"
        onClick={onToggle}
        aria-pressed={done}
        style={{ '--accent': accent }}
        aria-label={`${done ? 'Uncheck' : 'Check'} ${label}`}
      >
        {done ? (
          <svg viewBox="0 0 20 20" width="18" height="18"><path d="M4 10.5 L8.5 15 L17 5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : null}
      </button>
      <div className="goal-body">
        <div className="goal-head">
          <span className="goal-icon" aria-hidden>{icon}</span>
          <span className="goal-label">{label}</span>
          {tooltip && (
            <span className="goal-tip" tabIndex={0} aria-label={tooltip}>
              <svg viewBox="0 0 16 16" width="13" height="13"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.4"/><path d="M8 7v5 M8 4.2 v0.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
              <span className="goal-tip-body">{tooltip}</span>
            </span>
          )}
        </div>
        {rightSlot && <div className="goal-right">{rightSlot}</div>}
      </div>
    </div>
  );
}

function AmountStepper({ value, onChange, step = 8, min = 0, max = 999, unit, goal }) {
  const isOverGoal = goal != null && value > goal;
  const isAtGoal = goal != null && value >= goal;
  return (
    <div className={`amt-stepper ${isAtGoal ? 'amt-stepper--done' : ''}`}>
      <button className="amt-btn" onClick={() => onChange(Math.max(min, value - step))} aria-label={`-${step}`}>−</button>
      <input
        type="number"
        className="amt-input"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') { onChange(0); return; }
          const v = parseInt(raw, 10);
          if (isNaN(v)) return;
          onChange(Math.max(min, Math.min(max, v)));
        }}
      />
      <span className="amt-unit">{unit}{isOverGoal ? ' 🎉' : ''}</span>
      <button className="amt-btn" onClick={() => onChange(Math.min(max, value + step))} aria-label={`+${step}`}>+</button>
    </div>
  );
}

Object.assign(window, { GoalRow, AmountStepper });
