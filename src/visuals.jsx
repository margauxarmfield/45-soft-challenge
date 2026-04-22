// Visuals: WaterBottle + Steps variants
// Shows TWO layers:
//   - ghost/projected: where you *should* be by now (8am..8pm pacing)
//   - actual: what the user has logged (or full if checkbox is checked)
// Ghost stays visible even when actual overtakes it.

const { useMemo, useRef, useState, useEffect } = React;

// ---------- Shared helpers ----------
function behindAmount(actual, goal, paceFrac) {
  return Math.max(0, Math.round(goal * paceFrac - actual));
}

function paceStatus(actual, goal, paceFrac) {
  const expected = goal * paceFrac;
  if (actual >= goal) return { kind: 'done', label: '✓ at goal' };
  if (actual >= expected) return { kind: 'ahead', label: '✓ on pace' };
  const behind = Math.round(expected - actual);
  return { kind: 'behind', label: `↓ ${behind} behind pace` };
}

// ---------- WaterBottle ----------
// amount = actual oz logged. goal = target oz. paceFrac = 0..1.
function WaterBottle({ amount = 0, goal, paceFrac, color = '#6CB5E0' }) {
  const pacePct = Math.max(0, Math.min(1, paceFrac));
  // Cap visual fills at 1 but keep numeric overflow shown in caption
  const actualPct = Math.max(0, Math.min(1, amount / Math.max(1, goal)));
  const H = 180, W = 92;
  const bodyTop = 38, bodyBottom = 168;
  const innerH = bodyBottom - bodyTop;
  const actualY = bodyBottom - innerH * actualPct;
  const paceY = bodyBottom - innerH * pacePct;

  const waveId = useMemo(() => 'wave-' + Math.random().toString(36).slice(2, 8), []);
  const st = paceStatus(amount, goal, pacePct);
  const expectedOz = Math.round(goal * pacePct);

  return (
    <div className="viz-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} width="82" height="160" aria-hidden>
        <defs>
          <clipPath id={waveId + '-clip'}>
            <path d="M34,8 L34,18 C34,22 30,24 28,28 C22,34 14,40 14,60 L14,152 C14,164 22,170 34,170 L58,170 C70,170 78,164 78,152 L78,60 C78,40 70,34 64,28 C62,24 58,22 58,18 L58,8 Z" />
          </clipPath>
          {/* Ghost stripe pattern — diagonal lines in accent color */}
          <pattern id={waveId + '-ghost'} patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)">
            <rect width="6" height="6" fill={color} opacity="0.13"/>
            <line x1="0" y1="0" x2="0" y2="6" stroke={color} strokeWidth="1.4" opacity="0.45"/>
          </pattern>
          <linearGradient id={waveId + '-water'} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.95"/>
            <stop offset="100%" stopColor={color} stopOpacity="0.72"/>
          </linearGradient>
        </defs>

        {/* Bottle outline */}
        <path
          d="M34,8 L34,18 C34,22 30,24 28,28 C22,34 14,40 14,60 L14,152 C14,164 22,170 34,170 L58,170 C70,170 78,164 78,152 L78,60 C78,40 70,34 64,28 C62,24 58,22 58,18 L58,8 Z"
          fill="#fbfaf4"
          stroke="#2a2420"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <rect x="30" y="2" width="32" height="10" rx="2" fill="#2a2420" />
        <rect x="32" y="4" width="28" height="2" fill="#fff" opacity="0.18" />

        <g clipPath={`url(#${waveId}-clip)`}>
          {/* GHOST (projected): always drawn, stripes, bottle-wide */}
          {pacePct > 0.01 && (
            <rect x="0" y={paceY} width={W} height={H - paceY + 10} fill={`url(#${waveId}-ghost)`} />
          )}
          {/* Ghost top dashed line */}
          {pacePct > 0.01 && (
            <line x1="10" x2="82" y1={paceY} y2={paceY}
                  stroke={color} strokeWidth="1.6" strokeDasharray="4 3" opacity="0.85"/>
          )}

          {/* ACTUAL fill: solid color, narrower so ghost stripes show on the sides */}
          {actualPct > 0.01 && (
            <>
              <rect x="22" y={actualY} width={W - 44} height={H - actualY + 10}
                    fill={`url(#${waveId}-water)`} rx="2"/>
              <path
                d={`M 22 ${actualY} Q ${W/4 + 2} ${actualY - 3} ${W/2} ${actualY} T ${W - 22} ${actualY} V ${actualY + 2} H 22 Z`}
                fill="#ffffff" opacity="0.4"
              />
            </>
          )}
          {/* Full bubbles */}
          {amount >= goal && (
            <g opacity="0.55">
              <circle cx="34" cy={actualY + 50} r="3" fill="#fff"/>
              <circle cx="56" cy={actualY + 80} r="2" fill="#fff"/>
              <circle cx="42" cy={actualY + 110} r="2.5" fill="#fff"/>
            </g>
          )}
        </g>

        {/* Measurement ticks */}
        {[0.25, 0.5, 0.75].map((f, i) => {
          const y = bodyBottom - innerH * f;
          return <line key={i} x1="14" x2="19" y1={y} y2={y} stroke="#2a2420" strokeWidth="1.2" opacity="0.4" />;
        })}
        {/* Goal dashed line at top */}
        <line x1="14" x2="78" y1={bodyTop} y2={bodyTop} stroke="#2a2420" strokeWidth="1.2" strokeDasharray="3 3" opacity="0.45"/>
      </svg>
      <div className="viz-caption">
        <div className="viz-num">
          <span className="viz-current">{amount}</span>
          <span className="viz-slash">/</span>
          <span className="viz-goal">{goal} oz</span>
        </div>
        <div className="viz-sub">projected ~{expectedOz} oz by now</div>
        <div className={`viz-pace ${st.kind === 'behind' ? 'behind' : (st.kind === 'ahead' || st.kind === 'done') ? 'ahead' : ''}`}>
          {st.label}
        </div>
      </div>
    </div>
  );
}

// ---------- Steps: Walker variant ----------
function StepsWalker({ amount = 0, goal, paceFrac, color = '#D98A7A', onAmountChange }) {
  const pacePct = Math.max(0, Math.min(1, paceFrac));
  const actualPct = Math.max(0, Math.min(1, amount / Math.max(1, goal)));
  const W = 420, H = 120;
  const pathY = 80;
  const walkerX = 28 + (W - 56) * actualPct;
  const paceX = 28 + (W - 56) * pacePct;
  const expectedSteps = Math.round(goal * pacePct);
  const st = paceStatus(amount, goal, pacePct);

  const svgRef = useRef(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);
  const draggable = typeof onAmountChange === 'function';

  const xToAmount = (clientX) => {
    if (!svgRef.current) return amount;
    const rect = svgRef.current.getBoundingClientRect();
    const svgX = ((clientX - rect.left) / rect.width) * W;
    const frac = Math.max(0, Math.min(1.5, (svgX - 28) / (W - 56)));
    const raw = frac * goal;
    return Math.round(raw / 100) * 100;
  };

  const onPointerDown = (e) => {
    if (!draggable) return;
    e.preventDefault();
    e.stopPropagation();
    draggingRef.current = true;
    setDragging(true);
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
    // don't snap on initial click — wait for actual movement
  };
  const onPointerMove = (e) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    onAmountChange(xToAmount(e.clientX));
  };
  const onPointerUp = (e) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch (_) {}
  };

  return (
    <div className="viz-wrap wide">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className={`steps-walker-svg ${draggable ? 'is-draggable' : ''} ${dragging ? 'is-dragging' : ''}`}
      >
        {/* Path */}
        <path d={`M 18 ${pathY} Q ${W/2} ${pathY - 5} ${W - 18} ${pathY}`}
              fill="none" stroke="#2a2420" strokeWidth="2" strokeLinecap="round" strokeDasharray="1.5 7" opacity="0.55"/>
        <circle cx="18" cy={pathY} r="4" fill="#2a2420"/>
        {/* Flag */}
        <g transform={`translate(${W - 18} ${pathY})`}>
          <line x1="0" y1="0" x2="0" y2="-30" stroke="#2a2420" strokeWidth="2"/>
          <path d="M 0 -30 L 16 -25 L 0 -20 Z" fill={color} stroke="#2a2420" strokeWidth="1.6" strokeLinejoin="round"/>
        </g>

        {/* Ghost pace trail */}
        <path d={`M 18 ${pathY} L ${paceX} ${pathY}`}
              stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray="4 4" opacity="0.6"/>
        {/* Ghost walker */}
        <g transform={`translate(${paceX} ${pathY})`} opacity="0.55">
          <circle cx="0" cy="-19" r="7" fill="none" stroke={color} strokeWidth="2" strokeDasharray="3 2.5"/>
          <path d="M 0 -12 L 0 4 M -7 -5 L 7 -5 M -5 11 L 0 4 L 5 11"
                fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeDasharray="3 2.5"/>
        </g>

        {/* Actual trail */}
        <path d={`M 18 ${pathY} L ${walkerX} ${pathY}`}
              stroke={color} strokeWidth="5" strokeLinecap="round" opacity="0.9" style={{ pointerEvents: 'none' }}/>
        {/* Actual walker + drag halo — only THIS group is draggable */}
        <g transform={`translate(${walkerX} ${pathY})`}
           onPointerDown={draggable ? onPointerDown : undefined}
           onPointerMove={draggable ? onPointerMove : undefined}
           onPointerUp={draggable ? onPointerUp : undefined}
           onPointerCancel={draggable ? onPointerUp : undefined}
           style={{ cursor: draggable ? (dragging ? 'grabbing' : 'grab') : 'default', touchAction: 'none' }}>
          {/* hit halo — only visible while dragging */}
          {draggable && (
            <circle cx="0" cy="-8" r="22"
                    fill={color} opacity={dragging ? 0.18 : 0}
                    stroke={color} strokeWidth={dragging ? 1.5 : 0} strokeOpacity="0.5"/>
          )}
          <circle cx="0" cy="-20" r="8" fill="#fbfaf4" stroke="#2a2420" strokeWidth="2"/>
          <path d="M 0 -12 L 0 4" stroke="#2a2420" strokeWidth="2.6" strokeLinecap="round"/>
          <path d="M -7 -5 L 7 -5" stroke="#2a2420" strokeWidth="2.6" strokeLinecap="round"/>
          <path d="M -6 11 L 0 4 L 6 11" fill="none" stroke="#2a2420" strokeWidth="2.6" strokeLinecap="round"/>
          <path d="M -2 -7 Q -10 -2 -9 6" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round"/>
          {/* little face */}
          <circle cx="-2" cy="-21" r="0.9" fill="#2a2420"/>
          <circle cx="2" cy="-21" r="0.9" fill="#2a2420"/>
          <path d="M -2 -17 Q 0 -15.5 2 -17" fill="none" stroke="#2a2420" strokeWidth="0.9" strokeLinecap="round"/>
          {amount >= goal && <text x="0" y="-32" textAnchor="middle" fontSize="16">⭐</text>}
        </g>
      </svg>
      <div className="viz-caption">
        <div className="viz-num">
          <span className="viz-current">{fmtSteps(amount)}</span>
          <span className="viz-slash">/</span>
          <span className="viz-goal">{fmtSteps(goal)} steps</span>
        </div>
        <div className="viz-sub">projected ~{fmtSteps(expectedSteps)} by now{draggable ? ' · drag the walker' : ''}</div>
        <div className={`viz-pace ${st.kind === 'behind' ? 'behind' : 'ahead'}`}>{st.label}</div>
      </div>
    </div>
  );
}

// ---------- Steps: Ring variant (two concentric rings) ----------
function StepsRing({ amount = 0, goal, paceFrac, color = '#D98A7A' }) {
  const pacePct = Math.max(0, Math.min(1, paceFrac));
  const actualPct = Math.max(0, Math.min(1, amount / Math.max(1, goal)));
  const OUTER = 30, INNER = 22;
  const Co = 2 * Math.PI * OUTER;
  const Ci = 2 * Math.PI * INNER;
  const expectedSteps = Math.round(goal * pacePct);
  const st = paceStatus(amount, goal, pacePct);

  return (
    <div className="viz-wrap">
      <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden>
        {/* Outer: actual (thick, solid) */}
        <circle cx="40" cy="40" r={OUTER} fill="none" stroke="#2a2420" strokeWidth="4" opacity="0.1"/>
        <circle cx="40" cy="40" r={OUTER} fill="none" stroke={color} strokeWidth="4"
                strokeDasharray={`${Co * actualPct} ${Co}`} strokeLinecap="round"
                transform="rotate(-90 40 40)"/>
        {/* Inner: ghost pace (thinner, dashed) */}
        <circle cx="40" cy="40" r={INNER} fill="none" stroke="#2a2420" strokeWidth="2" opacity="0.1"/>
        <circle cx="40" cy="40" r={INNER} fill="none" stroke={color} strokeWidth="2"
                strokeDasharray={`${Ci * pacePct} ${Ci}`} strokeLinecap="round" opacity="0.75"
                transform="rotate(-90 40 40)"/>
        <text x="40" y="39" textAnchor="middle" fontSize="12" fontWeight="700" fill="#2a2420" fontFamily="Fraunces, serif">
          {Math.round(actualPct * 100)}%
        </text>
        <text x="40" y="50" textAnchor="middle" fontSize="6.5" fill="#2a2420" opacity="0.55" fontFamily="Nunito, sans-serif" letterSpacing="0.8">
          OF GOAL
        </text>
      </svg>
      <div className="viz-caption">
        <div className="viz-num">
          <span className="viz-current">{fmtSteps(amount)}</span>
          <span className="viz-slash">/</span>
          <span className="viz-goal">{fmtSteps(goal)} steps</span>
        </div>
        <div className="viz-sub">projected ~{fmtSteps(expectedSteps)} by now</div>
        <div className={`viz-pace ${st.kind === 'behind' ? 'behind' : 'ahead'}`}>{st.label}</div>
      </div>
    </div>
  );
}

// ---------- Steps: Footprints variant ----------
// Ghost footprints = dashed outlines at the pace position
// Actual footprints = solid filled up to the actual count
function StepsFootprints({ amount = 0, goal, paceFrac, color = '#D98A7A' }) {
  const pacePct = Math.max(0, Math.min(1, paceFrac));
  const actualPct = Math.max(0, Math.min(1, amount / Math.max(1, goal)));
  const N = 14;
  const actualDone = Math.round(actualPct * N);
  const paceDone = Math.round(pacePct * N);
  const expectedSteps = Math.round(goal * pacePct);
  const st = paceStatus(amount, goal, pacePct);

  return (
    <div className="viz-wrap wide">
      <svg viewBox="0 0 280 60" width="240" height="52" aria-hidden>
        {Array.from({ length: N }).map((_, i) => {
          const x = 12 + i * (256 / (N - 1));
          const y = i % 2 === 0 ? 22 : 38;
          const isActual = i < actualDone;
          const isPaceOnly = !isActual && i < paceDone; // ghost-only zone
          return (
            <g key={i} transform={`translate(${x} ${y}) rotate(${i % 2 === 0 ? -18 : 18})`}>
              <ellipse cx="0" cy="0" rx="5" ry="7"
                       fill={isActual ? color : (isPaceOnly ? color : '#fbfaf4')}
                       fillOpacity={isActual ? 1 : (isPaceOnly ? 0.22 : 1)}
                       stroke={color}
                       strokeWidth={isActual ? 1.4 : 1.2}
                       strokeDasharray={isActual ? '' : '2 2'}
                       opacity={isActual ? 1 : (isPaceOnly ? 0.95 : 0.55)}/>
              <circle cx="-3" cy="-8" r="1.2"
                      fill={isActual ? color : (isPaceOnly ? color : 'none')}
                      fillOpacity={isActual ? 1 : (isPaceOnly ? 0.25 : 1)}
                      stroke={color} strokeWidth="0.7"
                      opacity={isActual ? 1 : (isPaceOnly ? 0.9 : 0.5)}/>
              <circle cx="2" cy="-8.5" r="1.1"
                      fill={isActual ? color : (isPaceOnly ? color : 'none')}
                      fillOpacity={isActual ? 1 : (isPaceOnly ? 0.25 : 1)}
                      stroke={color} strokeWidth="0.7"
                      opacity={isActual ? 1 : (isPaceOnly ? 0.9 : 0.5)}/>
              <circle cx="4.5" cy="-6" r="1"
                      fill={isActual ? color : (isPaceOnly ? color : 'none')}
                      fillOpacity={isActual ? 1 : (isPaceOnly ? 0.25 : 1)}
                      stroke={color} strokeWidth="0.7"
                      opacity={isActual ? 1 : (isPaceOnly ? 0.9 : 0.5)}/>
            </g>
          );
        })}
      </svg>
      <div className="viz-caption">
        <div className="viz-num">
          <span className="viz-current">{fmtSteps(amount)}</span>
          <span className="viz-slash">/</span>
          <span className="viz-goal">{fmtSteps(goal)} steps</span>
        </div>
        <div className="viz-sub">projected ~{fmtSteps(expectedSteps)} by now</div>
        <div className={`viz-pace ${st.kind === 'behind' ? 'behind' : 'ahead'}`}>{st.label}</div>
      </div>
    </div>
  );
}

function fmtSteps(n) {
  if (n == null || isNaN(n)) return '0';
  if (Math.abs(n) >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k';
  return String(n);
}

function StepsViz(props) {
  const v = props.variant || 'walker';
  if (v === 'ring') return <StepsRing {...props} />;
  if (v === 'footprints') return <StepsFootprints {...props} />;
  return <StepsWalker {...props} />;
}

Object.assign(window, { WaterBottle, StepsViz, StepsWalker, StepsRing, StepsFootprints, fmtSteps });
