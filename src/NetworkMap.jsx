import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { makeApi, reducedMotion } from './anim.js';
import { Icon, Tag } from './ui.jsx';
import { SceneOverlay } from './scenes.jsx';
import { DROP_RULE, PHASE_B, STEALTH, SWEEP, ABLATION, ZERO_DAY, TAGS, fmt, int, mean } from './data.js';

const INK = '#0A0A0A';
const CORAL = '#F03C4A';
const STEP = 3.4;
const SITES = Array.from({ length: 10 }, (_, i) => ({ i, x: 120, y: 125 + i * 44 }));
const CHEATER_ORDER = [2, 7, 5, 9];

const PATHS = {
  alert: 'M 440 292 C 560 290 700 240 820 238',
  mirror: 'M 820 402 C 750 346 560 356 440 336',
  drop: 'M 900 282 L 900 378',
  up: 'M 400 370 C 420 440 470 470 545 468',
  down: 'M 545 506 C 460 522 380 450 366 370',
  lab: 'M 1050 425 L 982 425',
};

const SCENARIOS = {
  train: {
    label: 'A training round',
    title: 'One federated training round',
    steps: [
      ['The server sends its classifier to every site', 'The boosting model trained on the 5% labelled calibration set is broadcast. Every third round it is updated first.'],
      ['Each site runs the classifier on its own traffic', 'Packets it confidently calls an attack are set aside. What is left, treated as normal, is what the autoencoder learns from.'],
      ['Each autoencoder learns locally', 'The model learns to reconstruct normal traffic. Raw packets never leave the site.'],
      ['Only weight updates travel to the server', 'Each site sends the change in its autoencoder weights, not its data.'],
      ['The trust filter and trimmed mean combine them', 'Updates are scored against the median update, norm-clipped, then a 15% trimmed mean removes the extremes.'],
      ['The new shared autoencoder goes back to the sites', 'Next round starts from the combined model. The real runs use 20 rounds.'],
    ],
  },
  cheat: {
    label: 'Cheating sites caught',
    title: 'Sites that send poisoned updates',
    steps: [
      ['Some sites are cheating', 'Of 10 sites, the marked ones send poisoned updates (10 clients, as in the main runs).'],
      ['All sites train and send updates', 'Honest updates are shown in black, poisoned ones in red.'],
      ['Updates travel to the server', null],
      ['The trust filter compares every update to the median', 'Cosine similarity to the median update, a median-absolute-deviation test and a running trust score decide who is believed.'],
      ['Poisoned updates are held back, some still get through', null],
      ['The trimmed mean combines what remains', 'Even poisoned updates that pass are trimmed at the extremes. Compare with plain averaging below.'],
    ],
  },
  attack: {
    label: 'Attack caught and blocked',
    title: 'A recorded attack, blocked in the switch',
    steps: [
      ['The lab replays a recorded attack into the switch', 'tcpreplay sends the dataset’s own capture through an Open vSwitch inside Mininet.'],
      ['Features are pulled from each packet', 'tshark extracts the 130 features. The classifier runs first, the autoencoder only if the classifier is unsure.'],
      ['The cascade names the attack', null],
      ['The verdict goes to the controller', 'An alert is sent to the os-ken OpenFlow controller.'],
      ['The controller installs a drop rule', 'The rule is read back from the switch to confirm it is really there.'],
      ['Later packets from the attacker die at the switch', null],
    ],
  },
  zero: {
    label: 'Brand-new attack type',
    title: 'An attack the system never saw',
    steps: [
      ['One attack type is removed from training', 'The classifier and every autoencoder are trained without it (leave-one-class-out).'],
      ['Its traffic appears at the sites', 'The first-pass classifier has no label for it.'],
      ['The classifier may miss it or mislabel it', null],
      ['The autoencoder cannot rebuild it', 'Traffic unlike anything normal gives a large reconstruction error, above the site’s threshold.'],
      ['The cascade flags it', null],
    ],
  },
};

const NODE_LABEL = {
  sites: 'IoT sites',
  ae: 'Local autoencoder',
  clf: 'Server classifier',
  agg: 'Trust filter and aggregation',
  sdn: 'SDN controller and switch',
  lab: 'Live-replay lab',
};

function cheatersFor(frac) {
  return CHEATER_ORDER.slice(0, Math.round((frac / 100) * 10));
}

function buildScenario(id, params, tl, svg, layer) {
  const api = makeApi(tl, svg, layer);
  const { go, stream, dot, pulse, say, fade } = api;
  const at = (i, off = 0) => i * STEP + off;
  const n = SCENARIOS[id].steps.length;
  for (let i = 0; i < n; i += 1) tl.addLabel(`s${i}`, i * STEP);
  tl.set({}, {}, n * STEP); // pad the timeline to its full length
  fade('#verdict', 0, 0, 0.01);
  fade('#rule', 0, 0, 0.01);
  fade('#heldlbl', 0, 0, 0.01);

  if (id === 'train') {
    SITES.forEach((s) => go(dot(`cs${s.i}`, { fill: CORAL, r: 5 }), { at: at(0, 0.1 + s.i * 0.07), dur: 1.5 }));
    pulse('node-clf', at(0), 1);
    SITES.forEach((s) => stream(`sp${s.i}`, { at: at(1, s.i * 0.08), count: 2, gap: 0.3, dur: 1.2 }));
    pulse('node-sites', at(1), 1);
    pulse('node-ae', at(2), 3);
    stream('up', { at: at(3), count: 10, gap: 0.12, dur: 1.2, colors: [INK] });
    pulse('node-agg', at(4), 2);
    stream('down', { at: at(5), count: 5, gap: 0.14, dur: 1.2, colors: [CORAL] });
    pulse('node-sites', at(5, 1.4), 1);
  }

  if (id === 'cheat') {
    const bad = cheatersFor(params.frac);
    const surv = params.kind === 'stealth' ? STEALTH.find((s) => s.pct === params.frac).stealth : STEALTH.find((s) => s.pct === params.frac).flip[0];
    const survivors = Math.round(surv * bad.length);
    bad.forEach((b) => {
      tl.set(svg.querySelector(`#site${b}`), { attr: { fill: CORAL } }, 0);
      pulse('node-sites', at(0, 0.2), 2);
    });
    const dots = SITES.map((s) => {
      const isBad = bad.includes(s.i);
      return { s, isBad, d: dot(`sa${s.i}`, { fill: isBad ? CORAL : INK, r: 6 }) };
    });
    dots.forEach(({ s, d }) => go(d, { at: at(1, s.i * 0.1), dur: 1.4, hide: true }));
    const ups = dots.map(({ s, isBad }) => ({ s, isBad, d: dot('up', { fill: isBad ? CORAL : INK, r: 6 }) }));
    ups.forEach(({ s, d, isBad }) => go(d, { at: at(2, s.i * 0.1), dur: 1.0, to: 0.78, hide: false }));
    pulse('node-agg', at(3), 2);
    let passed = 0;
    ups.forEach(({ s, d, isBad }) => {
      const stay = isBad && passed >= survivors;
      if (isBad && !stay) passed += 1;
      if (stay) {
        tl.to(d.t, { v: 0.35, duration: 0.7, ease: 'power2.in', onUpdate: () => api.place(d) }, at(4, s.i * 0.05));
        tl.to(d.c, { attr: { r: 0 }, duration: 0.25 }, at(4, 0.7 + s.i * 0.05));
      } else {
        tl.to(d.t, { v: 1, duration: 0.7, ease: 'power1.inOut', onUpdate: () => api.place(d) }, at(4, s.i * 0.05));
        tl.set(d.c, { attr: { opacity: 0 } }, at(4, 0.75 + s.i * 0.05));
      }
    });
    pulse('node-agg', at(5), 2);
    stream('down', { at: at(5, 0.6), count: 4, gap: 0.14, dur: 1.2, colors: [INK] });
  }

  if (id === 'attack') {
    const row = PHASE_B[params.capture];
    stream('lab', { at: at(0), count: 8, gap: 0.16, dur: 0.9, colors: [CORAL] });
    pulse('node-lab', at(0), 2);
    stream('mirror', { at: at(1), count: 5, gap: 0.2, dur: 1.4, colors: [CORAL] });
    pulse('node-ae', at(1, 1.4), 2);
    api.say('#verdict', `${row.cls} · ${row.conf.toFixed(3)}`, at(2, 0.1));
    fade('#verdict', 1, at(2, 0.1), 0.3);
    pulse('node-clf', at(2), 1);
    stream('alert', { at: at(3), count: 3, gap: 0.2, dur: 1.3, colors: [CORAL] });
    pulse('node-sdn', at(3, 1.3), 2);
    stream('drop', { at: at(4), count: 3, gap: 0.2, dur: 0.8, colors: [INK] });
    fade('#rule', 1, at(4, 0.8), 0.4);
    pulse('node-sdn', at(4, 1), 2);
    stream('lab', { at: at(5), count: 6, gap: 0.22, dur: 0.9, colors: [CORAL], shrink: true, to: 1 });
    fade('#rule', 1, at(5), 0.01);
  }

  if (id === 'zero') {
    const row = ZERO_DAY[params.held];
    api.say('#heldlbl', `held out: ${row.cls}`, at(0, 0.1));
    fade('#heldlbl', 1, at(0, 0.1), 0.3);
    pulse('node-clf', at(0), 1);
    SITES.forEach((s) => { if (s.i % 2 === 0) stream(`sp${s.i}`, { at: at(1, s.i * 0.07), count: 2, gap: 0.25, dur: 1.2, colors: [CORAL] }); });
    pulse('node-sites', at(1), 1);
    pulse('node-clf', at(2), 1);
    pulse('node-ae', at(3), 3);
    stream('alert', { at: at(4), count: 3, gap: 0.2, dur: 1.3, colors: [CORAL] });
    pulse('node-sdn', at(4, 1.3), 2);
  }
}

function RealNumbers({ id, params }) {
  if (id === 'train') {
    return (
      <div className="mini-bars">
        <p className="note">Measured on the full pool, 10 clients, seed 42, 20 rounds.</p>
        <Bar label="Known attacks caught" v={0.9974} />
        <Bar label="Normal wrongly flagged (per connection)" v={0.0034} digits={4} />
        <Tag>{TAGS.real3}</Tag>
      </div>
    );
  }
  if (id === 'cheat') {
    const st = STEALTH.find((s) => s.pct === params.frac);
    const sw = SWEEP.find((s) => s.pct === params.frac);
    const abl = params.frac === 30 ? ABLATION : null;
    return (
      <div className="mini-bars">
        <p className="note">{params.frac}% of the sites cheat.</p>
        <Bar label="Cheaters that got through (sign-flip, seed 42)" v={st.flip[0]} />
        {params.kind === 'stealth' && <Bar label="Cheaters that got through (stealth, seed 42)" v={st.stealth} />}
        <Bar label="Autoencoder recall, full pipeline" v={sw.ae[0]} />
        {abl && <Bar label="Autoencoder recall, plain averaging" v={abl[3].ae[0]} />}
        {!abl && <p className="note">Plain-averaging comparison was measured at 30% only.</p>}
        <p className="note">Seeds 42 / 43 / 44: survival {st.flip.map((v) => fmt(v, 2)).join(' / ')}; autoencoder recall {sw.ae.map((v) => fmt(v, 3)).join(' / ')}.</p>
        <Tag>{params.kind === 'stealth' ? 'stealth: seed 42 only' : TAGS.real3}</Tag>
      </div>
    );
  }
  if (id === 'attack') {
    const r = PHASE_B[params.capture];
    return (
      <div className="mini-bars">
        <Bar label="Confidence" v={r.conf} />
        <Bar label="Packets flagged" v={r.flagged / r.total} />
        <p className="note">{int(r.flagged)} of {int(r.total)} packets flagged · replayed in {r.secs} s · decision: block.</p>
        {r.wrong && <p className="warnline">Named {r.cls}, which is not the true type. It was still blocked.</p>}
        {r.damaged && <p className="warnline">This capture is damaged in the released dataset; only its readable first {int(r.total)} packets were replayed.</p>}
        <div className="rule">{DROP_RULE}</div>
        <Tag>{TAGS.phaseB}</Tag>
      </div>
    );
  }
  const z = ZERO_DAY[params.held];
  return (
    <div className="mini-bars">
      <p className="note">Share of every {int(z.rows)} held-out rows detected, mean of 3 seeds.</p>
      <Bar label="Classifier alone" v={mean(z.clf)} />
      <Bar label="Autoencoder alone" v={mean(z.ae)} />
      <Bar label="Cascade" v={mean(z.cascade)} />
      <p className="note">Cascade by seed: {z.cascade.map((v) => fmt(v, 3)).join(' / ')}.</p>
      <Tag>{TAGS.real3}</Tag>
    </div>
  );
}

function Bar({ label, v, digits = 3 }) {
  return (
    <div className="b" style={{ gridTemplateColumns: '1fr 54px' }}>
      <div>
        <div style={{ fontSize: 12.5, marginBottom: 4 }}>{label}</div>
        <div className="track"><i style={{ width: `${Math.max(1, v * 100)}%` }} /></div>
      </div>
      <div className="v">{fmt(v, digits)}</div>
    </div>
  );
}

function Node({ id, x, y, onOpen, label, children, haloBox }) {
  const [hx, hy, hw, hh] = haloBox;
  return (
    <g
      id={`node-${id}`}
      className="node"
      tabIndex={0}
      role="button"
      aria-label={`${label}: open the detailed animation`}
      onClick={(e) => onOpen(id, e.currentTarget)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(id, e.currentTarget); } }}
    >
      <rect className="halo" data-origin={`${hx + hw / 2} ${hy + hh / 2}`} x={hx - 8} y={hy - 8} width={hw + 16} height={hh + 16} rx="26" fill={CORAL} opacity="0" />
      {children}
    </g>
  );
}

export default function NetworkMap({ active }) {
  const wrapRef = useRef(null);
  const svgRef = useRef(null);
  const layerRef = useRef(null);
  const tlRef = useRef(null);
  const lastStep = useRef(-1);
  const [scn, setScn] = useState('train');
  const [params, setParams] = useState({ frac: 30, kind: 'flip', capture: 0, held: 11 });
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!reducedMotion());
  const [speed, setSpeed] = useState(1);
  const [scene, setScene] = useState(null);
  const sc = SCENARIOS[scn];

  const cheaters = useMemo(() => (scn === 'cheat' ? cheatersFor(params.frac) : []), [scn, params.frac]);

  useEffect(() => {
    const svg = svgRef.current;
    const layer = layerRef.current;
    if (!svg || !layer) return undefined;
    layer.innerHTML = '';
    lastStep.current = -1;
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        paused: true,
        onUpdate() {
          const s = Math.min(sc.steps.length - 1, Math.floor(tl.time() / STEP + 1e-4));
          if (s !== lastStep.current) { lastStep.current = s; setStep(s); }
        },
        onComplete() { tl.restart(); },
      });
      buildScenario(scn, params, tl, svg, layer);
      tlRef.current = tl;
    }, svg);
    setStep(0);
    return () => {
      ctx.revert();
      layer.innerHTML = '';
      svg.querySelectorAll('[id^="site"]').forEach((c) => c.setAttribute('fill', '#F5F5F4'));
      tlRef.current = null;
    };
  }, [scn, params.frac, params.kind, params.capture, params.held]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;
    tl.timeScale(speed);
    if (playing && active && !scene) tl.play(); else tl.pause();
  }, [playing, speed, active, scene, scn, params.frac, params.kind, params.capture, params.held]);

  const jump = (i) => {
    const tl = tlRef.current;
    if (!tl) return;
    const t = Math.max(0, Math.min(sc.steps.length - 1, i)) * STEP;
    setPlaying(false);
    tl.pause();
    gsap.to(tl, { time: t, duration: 0.7, ease: 'power2.inOut', overwrite: true });
  };

  const openScene = (id, el) => {
    const stage = el.closest('.stage');
    const sr = stage.getBoundingClientRect();
    const nr = el.getBoundingClientRect();
    setScene({ id, stage, ox: nr.left + nr.width / 2 - sr.left, oy: nr.top + nr.height / 2 - sr.top });
  };

  const stepText = (i) => {
    const base = sc.steps[i][1];
    if (base) return base;
    if (scn === 'cheat' && i === 2) {
      return params.kind === 'stealth'
        ? 'A stealth attacker steers its update to a cosine similarity of 0.1 with the last aggregate and scales it to 1.5 times an honest update, so it does not look reversed.'
        : 'A sign-flip attacker sends its honest update multiplied by minus one.';
    }
    if (scn === 'cheat' && i === 4) {
      const st = STEALTH.find((s) => s.pct === params.frac);
      const v = params.kind === 'stealth' ? st.stealth : st.flip[0];
      return `Measured survival of poisoned updates at ${params.frac}%: ${fmt(v, 2)} (seed 42). The animation lets that share through.`;
    }
    if (scn === 'attack' && i === 2) {
      const r = PHASE_B[params.capture];
      return `Class ${r.cls}, confidence ${r.conf.toFixed(3)}, decided by the boosting classifier.${r.wrong ? ' This is the wrong type.' : ''}`;
    }
    if (scn === 'attack' && i === 5) {
      const r = PHASE_B[params.capture];
      return `${int(r.flagged)} of ${int(r.total)} packets were flagged in the real replay.`;
    }
    if (scn === 'zero') {
      const z = ZERO_DAY[params.held];
      if (i === 2) return `Classifier alone detected ${fmt(mean(z.clf), 3)} of ${z.cls} traffic (mean of 3 seeds). Often it calls it normal or another class.`;
      if (i === 4) return `The two stages together detected ${fmt(mean(z.cascade), 3)} of ${z.cls} traffic (mean of 3 seeds).`;
    }
    return '';
  };

  return (
    <div className="map-grid" ref={wrapRef}>
      <div className="map-main">
        <div className="scn-tabs" role="tablist" aria-label="Scenarios">
          {Object.entries(SCENARIOS).map(([k, v]) => (
            <button key={k} role="tab" aria-selected={scn === k} className={`pill${scn === k ? ' on' : ''}`} onClick={() => { setScn(k); setPlaying(!reducedMotion()); }}>{v.label}</button>
          ))}
        </div>
        <div className="map-svg">
          <svg ref={svgRef} viewBox="0 0 1200 640" role="img" aria-label="Network map of the system: IoT sites with autoencoders, the server, the SDN controller and switch, and the live-replay lab">
            <defs>
              <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 1L9 5L0 9z" fill={INK} /></marker>
            </defs>
            {/* containers */}
            <rect x="40" y="66" width="420" height="520" rx="26" fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="9 8" />
            <text x="62" y="96" className="svg-text lg">Each IoT site</text>
            <text x="62" y="116" className="svg-text sm" style={{ fill: '#5C5C58' }}>runs the cascade locally</text>
            <rect x="520" y="66" width="220" height="520" rx="26" fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="9 8" />
            <text x="542" y="96" className="svg-text lg">Server</text>
            <rect x="790" y="150" width="220" height="380" rx="26" fill="none" stroke={INK} strokeWidth="2.5" strokeDasharray="9 8" />
            <text x="812" y="180" className="svg-text lg">SDN network</text>

            {/* connectors */}
            <g fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.55">
              {SITES.map((s) => <path key={s.i} id={`sp${s.i}`} d={`M 135 ${s.y} C 220 ${s.y} 270 320 330 320`} />)}
              <path id="up" d={PATHS.up} markerEnd="url(#arr)" />
              <path id="down" d={PATHS.down} markerEnd="url(#arr)" />
              <path id="alert" d={PATHS.alert} markerEnd="url(#arr)" />
              <path id="mirror" d={PATHS.mirror} strokeDasharray="3 7" markerEnd="url(#arr)" />
              <path id="drop" d={PATHS.drop} markerEnd="url(#arr)" />
              <path id="lab" d={PATHS.lab} markerEnd="url(#arr)" />
            </g>
            <g fill="none" stroke="none">
              {SITES.map((s) => <path key={s.i} id={`cs${s.i}`} d={`M 545 170 C 460 96 280 100 ${s.x + 14} ${s.y}`} />)}
              {SITES.map((s) => <path key={s.i} id={`sa${s.i}`} d={`M 135 ${s.y} C 220 ${s.y} 270 320 330 320`} />)}
            </g>
            <text x="560" y="276" className="svg-text sm" style={{ fill: '#5C5C58' }} transform="rotate(-11 560 276)">alerts</text>
            <text x="600" y="368" className="svg-text sm" style={{ fill: '#5C5C58' }}>features</text>
            <text x="1004" y="414" className="svg-text sm" style={{ fill: '#5C5C58' }}>replay</text>

            {/* nodes */}
            <Node id="sites" label={NODE_LABEL.sites} onOpen={openScene} haloBox={[96, 104, 48, 440]}>
              <rect className="shape" x="96" y="104" width="48" height="440" rx="24" fill={INK} />
              {SITES.map((s) => (
                <g key={s.i}>
                  <circle id={`site${s.i}`} cx={s.x} cy={s.y} r="15" fill="#F5F5F4" stroke={INK} strokeWidth="2.5" />
                  <path d={`M ${s.x - 6} ${s.y + 3} h12 M ${s.x - 3} ${s.y - 3} h6`} stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
                </g>
              ))}
              <text x="120" y="574" textAnchor="middle" className="svg-text lg" style={{ fill: INK }}>IoT sites</text>
            </Node>

            <Node id="ae" label={NODE_LABEL.ae} onOpen={openScene} haloBox={[330, 268, 110, 104]}>
              <rect className="shape" x="330" y="268" width="110" height="104" rx="18" fill={INK} />
              <path d="M 346 296 L 372 308 L 372 332 L 346 344 Z M 424 296 L 398 308 L 398 332 L 424 344 Z" fill="#F5F5F4" />
              <circle cx="385" cy="320" r="6" fill={CORAL} />
              <text x="385" y="364" textAnchor="middle" className="svg-text sm" style={{ fill: '#F5F5F4' }}>Autoencoder</text>
            </Node>

            <Node id="clf" label={NODE_LABEL.clf} onOpen={openScene} haloBox={[545, 120, 170, 120]}>
              <rect className="shape" x="545" y="120" width="170" height="120" rx="20" fill={INK} />
              <g stroke="#F5F5F4" strokeWidth="2" fill="#F5F5F4">
                {[0, 1, 2].map((k) => (
                  <g key={k} transform={`translate(${578 + k * 52} 142)`}>
                    <path d="M 14 8 L 4 28 M 14 8 L 24 28 M 4 28 L 0 44 M 4 28 L 10 44" fill="none" />
                    <circle cx="14" cy="8" r="5" /><circle cx="4" cy="28" r="4" /><circle cx="24" cy="28" r="4" fill={CORAL} stroke={CORAL} />
                  </g>
                ))}
              </g>
              <text x="630" y="212" textAnchor="middle" className="svg-text lg" style={{ fill: '#F5F5F4', fontSize: 15 }}>Classifier</text>
              <text x="630" y="228" textAnchor="middle" className="svg-text sm" style={{ fill: '#A3A3A0' }}>LightGBM</text>
            </Node>

            <Node id="agg" label={NODE_LABEL.agg} onOpen={openScene} haloBox={[545, 400, 170, 150]}>
              <rect className="shape" x="545" y="400" width="170" height="150" rx="20" fill={INK} />
              <path d="M 572 428 H 688 L 640 476 V 506 L 620 496 V 476 Z" fill="none" stroke="#F5F5F4" strokeWidth="2.4" strokeLinejoin="round" />
              <circle cx="630" cy="446" r="4" fill={CORAL} /><circle cx="604" cy="446" r="4" fill="#F5F5F4" /><circle cx="656" cy="446" r="4" fill="#F5F5F4" />
              <text x="630" y="524" textAnchor="middle" className="svg-text lg" style={{ fill: '#F5F5F4', fontSize: 14 }}>Trust filter +</text>
              <text x="630" y="541" textAnchor="middle" className="svg-text lg" style={{ fill: '#F5F5F4', fontSize: 14 }}>aggregation</text>
            </Node>

            <Node id="sdn" label={NODE_LABEL.sdn} onOpen={openScene} haloBox={[820, 190, 160, 280]}>
              <rect className="shape" x="820" y="190" width="160" height="92" rx="18" fill={INK} />
              <rect className="shape" x="820" y="378" width="160" height="92" rx="18" fill={INK} />
              <text x="900" y="226" textAnchor="middle" className="svg-text lg" style={{ fill: '#F5F5F4' }}>Controller</text>
              <text x="900" y="246" textAnchor="middle" className="svg-text sm" style={{ fill: '#A3A3A0' }}>os-ken · OpenFlow 1.3</text>
              <text x="900" y="414" textAnchor="middle" className="svg-text lg" style={{ fill: '#F5F5F4' }}>Switch</text>
              <text x="900" y="434" textAnchor="middle" className="svg-text sm" style={{ fill: '#A3A3A0' }}>Open vSwitch · Mininet</text>
              <circle cx="946" cy="224" r="5" fill={CORAL} /><circle cx="946" cy="412" r="5" fill={CORAL} />
            </Node>

            <Node id="lab" label={NODE_LABEL.lab} onOpen={openScene} haloBox={[1050, 350, 130, 150]}>
              <rect className="shape" x="1050" y="350" width="130" height="150" rx="20" fill={INK} />
              <path d="M 1086 378 h30 l12 12 v34 h-42 z" fill="none" stroke="#F5F5F4" strokeWidth="2.4" strokeLinejoin="round" />
              <path d="M 1094 400 h26 M 1094 410 h26" stroke={CORAL} strokeWidth="2.4" strokeLinecap="round" />
              <text x="1115" y="456" textAnchor="middle" className="svg-text lg" style={{ fill: '#F5F5F4', fontSize: 14 }}>Live-replay lab</text>
              <text x="1115" y="474" textAnchor="middle" className="svg-text sm" style={{ fill: '#A3A3A0' }}>pcap · tcpreplay</text>
            </Node>

            <text id="verdict" x="630" y="318" textAnchor="middle" className="svg-text lg" style={{ fill: CORAL }} opacity="0">verdict</text>
            <text id="heldlbl" x="250" y="620" textAnchor="middle" className="svg-text lg" style={{ fill: CORAL }} opacity="0">held out</text>
            <text id="rule" x="900" y="500" textAnchor="middle" className="svg-text sm" opacity="0">{DROP_RULE}</text>
            <g id="layer" ref={layerRef} style={{ pointerEvents: 'none' }} />
          </svg>
        </div>
        <p className="map-hint">Click any dark part to zoom in. Animations are schematic; the numbers beside them are measured.</p>
      </div>

      <aside className="map-side" aria-live="polite">
        <div>
          <h3>{sc.title}</h3>
          <div style={{ marginTop: 6 }}><Tag>{TAGS.schematic}</Tag></div>
        </div>
        {scn === 'cheat' && (
          <div className="ctrls">
            <label className="field" style={{ flex: 1 }}>Cheating sites
              <select value={params.frac} onChange={(e) => setParams({ ...params, frac: Number(e.target.value) })}>
                <option value={20}>20% (2 of 10)</option><option value={30}>30% (3 of 10)</option><option value={40}>40% (4 of 10)</option>
              </select>
            </label>
            <label className="field" style={{ flex: 1 }}>Attacker
              <select value={params.kind} onChange={(e) => setParams({ ...params, kind: e.target.value })}>
                <option value="flip">Sign-flip</option><option value="stealth">Stealth (seed 42)</option>
              </select>
            </label>
          </div>
        )}
        {scn === 'attack' && (
          <label className="field">Recorded attack
            <select value={params.capture} onChange={(e) => setParams({ ...params, capture: Number(e.target.value) })}>
              {PHASE_B.map((p, i) => <option key={p.capture} value={i}>{p.capture}</option>)}
            </select>
          </label>
        )}
        {scn === 'zero' && (
          <label className="field">Attack type held out
            <select value={params.held} onChange={(e) => setParams({ ...params, held: Number(e.target.value) })}>
              {ZERO_DAY.map((z, i) => <option key={z.cls} value={i}>{z.cls}</option>)}
            </select>
          </label>
        )}
        <div className="ctrls">
          <button className="iconbtn" aria-label="Previous step" onClick={() => jump(step - 1)}>{Icon.left}</button>
          <button className="iconbtn" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>{playing ? Icon.pause : Icon.play}</button>
          <button className="iconbtn" aria-label="Next step" onClick={() => jump(step + 1)}>{Icon.right}</button>
          <label className="field" style={{ flex: 1, minWidth: 90 }}>Speed
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
              <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option>
            </select>
          </label>
        </div>
        <ol className="step-list">
          {sc.steps.map((s, i) => (
            <li key={i} className={i === step ? 'on' : ''} onClick={() => jump(i)}>
              <b>{i + 1}</b>
              <span><strong>{s[0]}</strong>{i === step && stepText(i) ? <><br />{stepText(i)}</> : null}</span>
            </li>
          ))}
        </ol>
        <RealNumbers id={scn} params={params} />
      </aside>

      {scene && createPortal(
        <SceneOverlay id={scene.id} ox={scene.ox} oy={scene.oy} onClose={() => setScene(null)} />,
        scene.stage,
      )}
    </div>
  );
}
