// Goal editor modal
const { useState: useStateGE } = React;

function GoalEditor({ person, personId, onSave, onClose, startDateISO }) {
  const [g, setG] = useStateGE(() => Challenge.clone(person.goals));
  const challengeStarted = Challenge.dayIndexFor(Challenge.todayISO()) >= 1;

  const set = (k, v) => setG((prev) => ({ ...prev, [k]: v }));
  const setEnabled = (k, v) => setG((prev) => ({ ...prev, enabled: { ...prev.enabled, [k]: v } }));

  const save = () => {
    onSave(personId, g, challengeStarted);
    onClose();
  };

  const row = (k, label, input, canDisable = true) => (
    <div className={`ge-row ${!g.enabled[k] ? 'ge-row--off' : ''}`}>
      <label className="ge-toggle">
        <input
          type="checkbox"
          checked={g.enabled[k]}
          onChange={(e) => setEnabled(k, e.target.checked)}
          disabled={!canDisable}
        />
        <span className="ge-toggle-box" aria-hidden></span>
        <span className="ge-label">{label}</span>
      </label>
      <div className="ge-input-wrap">{input}</div>
    </div>
  );

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ '--accent': person.color }}>
        <header className="modal-head">
          <h3>Edit {person.name}'s goals</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="modal-body">
          {row('wake', 'Wake by',
            <input type="time" value={g.wake} onChange={(e) => set('wake', e.target.value)} />
          )}
          {row('bed', 'In bed by',
            <input type="time" value={g.bed} onChange={(e) => set('bed', e.target.value)} />
          )}
          {row('phoneAway', 'Phone away by',
            <input type="time" value={g.phoneAway} onChange={(e) => set('phoneAway', e.target.value)} />
          )}
          {row('water', 'Water (oz)',
            <input type="number" min="0" max="300" value={g.water} onChange={(e) => set('water', parseInt(e.target.value || '0', 10))} />
          )}
          {row('exercise', 'Exercise (min)',
            <input type="number" min="0" max="300" value={g.exercise} onChange={(e) => set('exercise', parseInt(e.target.value || '0', 10))} />
          )}
          {row('walk', 'Walk (steps)',
            <input type="number" min="0" max="50000" step="500" value={g.walk} onChange={(e) => set('walk', parseInt(e.target.value || '0', 10))} />
          )}
          {row('read', 'Read (min)',
            <input type="number" min="0" max="300" value={g.read} onChange={(e) => set('read', parseInt(e.target.value || '0', 10))} />
          )}
          {challengeStarted && (
            <p className="ge-note">
              Since you've started, any changes will be marked with an <em>"adjusted"</em> tag on the card.
            </p>
          )}
        </div>
        <footer className="modal-foot">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save}>Save</button>
        </footer>
      </div>
    </div>
  );
}

function SyncModal({ onClose, onImport, getExportCode }) {
  const [code, setCode] = useStateGE('');
  const [copied, setCopied] = useStateGE(false);
  const myCode = getExportCode();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(myCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal modal-sync" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h3>Sync between devices</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </header>
        <div className="modal-body">
          <p className="sync-blurb">
            This page saves to your browser. To share progress with each other,
            copy your code and paste theirs. (On the to-do: real-time cloud sync.)
          </p>

          <div className="sync-section">
            <label className="sync-label">Your code</label>
            <textarea className="sync-textarea" value={myCode} readOnly rows={4} />
            <button className="btn-primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
          </div>

          <div className="sync-section">
            <label className="sync-label">Paste theirs to merge in</label>
            <textarea className="sync-textarea" value={code} onChange={(e) => setCode(e.target.value)} rows={4} placeholder="paste sync code here…"/>
            <button className="btn-ghost" onClick={() => onImport(code)} disabled={!code.trim()}>Import & overwrite</button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { GoalEditor, SyncModal });
