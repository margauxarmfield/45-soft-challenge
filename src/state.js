// ---------- 45 Day Challenge — shared state ----------
// Start date: April 20, 2026. Today (April 22) = Day 3.
// Storage: localStorage. Export/Import code for cross-device sync.
// Hook for Firebase later: see window.__remoteAdapter at bottom.

(function () {
  const START_DATE = '2026-04-20'; // Day 1 is this date
  const TOTAL_DAYS = 45;

  const DEFAULT_GOALS = {
    margaux: {
      wake: '08:00',
      bed: '23:00',
      phoneAway: '22:30',
      water: 90,          // oz
      exercise: 45,       // min
      walk: 8000,         // STEPS
      read: 10,           // min
      enabled: { wake: true, bed: true, phoneAway: true, water: true, exercise: true, walk: true, read: true },
    },
    brenna: {
      wake: '07:30',
      bed: '22:30',
      phoneAway: '22:00',
      water: 90,
      exercise: 45,
      walk: 8000,
      read: 0,
      enabled: { wake: true, bed: true, phoneAway: true, water: true, exercise: true, walk: true, read: false },
    },
  };

  const DEFAULT_THEME = {
    stepsVariant: 'walker',   // walker | ring | footprints
    paper: 'cream',           // cream | blush | sage
  };

  const STORAGE_KEY = 'challenge45.v1';

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function addDays(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + n);
    const yy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, '0');
    const dd = String(dt.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  function daysBetween(a, b) {
    const [y1, m1, d1] = a.split('-').map(Number);
    const [y2, m2, d2] = b.split('-').map(Number);
    const dt1 = new Date(y1, m1 - 1, d1);
    const dt2 = new Date(y2, m2 - 1, d2);
    return Math.round((dt2 - dt1) / 86400000);
  }

  function dayIndexFor(iso) {
    // 1-indexed day within the challenge, or null if out of range
    const n = daysBetween(START_DATE, iso) + 1;
    if (n < 1 || n > TOTAL_DAYS) return null;
    return n;
  }

  // ---- Default seed: Days 1 & 2 completed for both ----
  function seedState() {
    const state = {
      version: 1,
      startDate: START_DATE,
      totalDays: TOTAL_DAYS,
      theme: { ...DEFAULT_THEME },
      people: {
        margaux: {
          name: 'Margaux',
          color: '#D98A7A',
          goals: clone(DEFAULT_GOALS.margaux),
          goalsAdjusted: false,
          history: {}, // iso -> { wake, bed, phoneAway, water, exercise, walk, read, waterAmt, walkAmt }
          waived: {},  // iso -> true (used one "miss" waiver — not used in this ruleset)
        },
        brenna: {
          name: 'Brenna',
          color: '#86A691',
          goals: clone(DEFAULT_GOALS.brenna),
          goalsAdjusted: false,
          history: {},
          waived: {},
        },
      },
    };
    // Pre-complete Days 1 and 2 for both
    for (const pid of ['margaux', 'brenna']) {
      const g = state.people[pid].goals;
      for (let d = 1; d <= 2; d++) {
        const iso = addDays(START_DATE, d - 1);
        state.people[pid].history[iso] = fullDayComplete(g);
      }
    }
    return state;
  }

  function fullDayComplete(goals) {
    const rec = {
      wake: true, bed: true, phoneAway: true,
      water: true, exercise: true, walk: true, read: goals.enabled.read,
      waterAmt: goals.water,
      walkAmt: goals.walk,
    };
    // Disabled goals count as "true" (not blocking)
    for (const k of ['wake','bed','phoneAway','water','exercise','walk','read']) {
      if (!goals.enabled[k]) rec[k] = true;
    }
    return rec;
  }

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  // ---- Load / save ----
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const s = seedState();
        save(s);
        return s;
      }
      const parsed = JSON.parse(raw);
      return migrate(parsed);
    } catch (e) {
      console.warn('State load failed, reseeding', e);
      const s = seedState();
      save(s);
      return s;
    }
  }

  function save(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  function migrate(s) {
    if (!s.theme) s.theme = { ...DEFAULT_THEME };
    if (!s.theme.stepsVariant) s.theme.stepsVariant = 'walker';
    if (!s.theme.paper) s.theme.paper = 'cream';
    for (const pid of ['margaux', 'brenna']) {
      if (!s.people[pid].goals.enabled) {
        s.people[pid].goals.enabled = clone(DEFAULT_GOALS[pid].enabled);
      }
    }
    return s;
  }

  // ---- Day completion check ----
  function isDayComplete(personState, iso) {
    const rec = personState.history[iso];
    if (!rec) return false;
    const g = personState.goals;
    const keys = ['wake','bed','phoneAway','water','exercise','walk','read'];
    for (const k of keys) {
      if (!g.enabled[k]) continue;
      if (!rec[k]) return false;
    }
    return true;
  }

  // Streak = consecutive completed days ending at (today-1) or today.
  // Rule: streak ends at first missed past day. Today is not counted against
  // the streak until it has passed (grace). Yesterday counts.
  function computeStreak(personState) {
    const today = todayISO();
    const todayIdx = dayIndexFor(today);
    let streak = 0;
    // Check today first (if complete, counts as +1 to visible streak)
    let cursorIdx = todayIdx;
    // start from today going backwards
    for (let idx = todayIdx; idx >= 1; idx--) {
      const iso = addDays(START_DATE, idx - 1);
      const complete = isDayComplete(personState, iso);
      if (complete) { streak++; continue; }
      if (idx === todayIdx) {
        // Today not complete yet → skip without breaking streak
        continue;
      }
      break;
    }
    return streak;
  }

  // "Warning" — did we miss yesterday? If yes, next miss breaks streak.
  function streakWarning(personState) {
    const today = todayISO();
    const todayIdx = dayIndexFor(today);
    if (!todayIdx || todayIdx < 2) return null;
    const yesterday = addDays(START_DATE, todayIdx - 2);
    const yIdx = dayIndexFor(yesterday);
    if (!yIdx) return null;
    if (!isDayComplete(personState, yesterday)) {
      return { missed: yesterday, missedIdx: yIdx };
    }
    return null;
  }

  // ---- Export / Import ----
  function exportCode(state) {
    const json = JSON.stringify(state);
    // Use base64 for easy paste
    return btoa(unescape(encodeURIComponent(json)));
  }
  function importCode(code) {
    try {
      const json = decodeURIComponent(escape(atob(code.trim())));
      return migrate(JSON.parse(json));
    } catch (e) {
      return null;
    }
  }

  // ---- Auto-check for bed / phoneAway (default: checked) ----
  // These default-to-true goals are created automatically when we enter
  // a new day record. User can uncheck.
  function ensureDayRecord(personState, iso) {
    if (!personState.history[iso]) {
      const now = new Date();
      const nowHM = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
      const g = personState.goals;
      personState.history[iso] = {
        wake: false,
        bed: true,          // auto-check ON by default
        phoneAway: true,    // auto-check ON by default
        water: false,
        exercise: false,
        walk: false,
        read: !g.enabled.read, // if disabled, treat as satisfied
        waterAmt: 0,
        walkAmt: 0,
      };
    }
    return personState.history[iso];
  }

  // Expose
  window.Challenge = {
    START_DATE,
    TOTAL_DAYS,
    DEFAULT_GOALS,
    todayISO,
    addDays,
    daysBetween,
    dayIndexFor,
    load,
    save,
    isDayComplete,
    computeStreak,
    streakWarning,
    exportCode,
    importCode,
    ensureDayRecord,
    seedState,
    clone,
  };
})();
