import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { makeApi, reducedMotion } from './anim.js';
import { Icon, Tag } from './ui.jsx';
import { DROP_RULE, RUNS, SWEEP, ABLATION, TAGS, fmt } from './data.js';

const INK = '#0A0A0A';
const CORAL = '#F03C4A';
const DEEP = '#8F1D27';
const GREY = '#A3A3A0';
const PAPER = '#F5F5F4';

const INFO = {
  sites: {
    title: 'IoT sites',
    body: [
      'Each site keeps its own traffic. The server never receives raw packets, only model updates.',
      'Sites are deliberately different. For every attack class a Dirichlet draw with α = 0.3 decides each site’s share, so one site can be 94% normal traffic and another mostly flooding.',
      'A connection stays whole: all packets of one connection go to one site and to one of its train, benign-validation or test slices. A test packet never has a near-identical twin in training.',
      'Each site scales its features with a scaler fitted only on its own training rows, clipped at ±10.',
    ],
    facts: [
      ['10 or 20 sites in the real runs, 20 rounds', TAGS.cfg],
      ['Held-out test slices hold 283,090 to 295,566 rows per run', TAGS.real3],
      [`Sites with no normal rows to set a threshold: ${RUNS.map((r) => r.noVal).join(', ')} across the six runs. Their autoencoder flags nothing.`, TAGS.real3],
    ],
  },
  ae: {
    title: 'Local autoencoder',
    body: [
      'The second pass runs only on traffic the classifier did not confidently call an attack.',
      'It learns to rebuild normal traffic, trained only on what the classifier filtered as normal. Traffic that rebuilds badly is unlike anything normal.',
      'If the rebuild error is above the site’s threshold (the 97th percentile of its own normal validation error), the packet is flagged anomalous. This is the only part that can flag an attack type nobody labelled.',
    ],
    facts: [
      ['9,600 weights per autoencoder', TAGS.real1],
      [`Autoencoder alone catches ${fmt(0.457, 3)} / ${fmt(0.492, 3)} / ${fmt(0.221, 3)} of known attacks (10 clients, seeds 42 / 43 / 44). It is a backstop, not the main detector, and it is weaker at this scale than in smaller runs. The cause is not established.`, TAGS.real3],
    ],
  },
  clf: {
    title: 'Server classifier',
    body: [
      'LightGBM boosted trees, trained on the server from a 5% labelled calibration set and updated as confident labels arrive. Sites never reveal their own labels.',
      'It sees 130 features per packet: the original 91, plus the service port, 18 content features and 20 connection features.',
      '63 leaves, learning rate 0.1, class weights from the square root of inverse class frequency.',
      'MITM is one single connection (406 rows), so it cannot be split by connection. It goes wholly to the calibration set and is scored only by the unseen-attack test and the live replay.',
    ],
    facts: [
      ['Calibration set 71,853 to 79,866 rows (seed dependent)', TAGS.real3],
      ['Classifier alone catches 0.9954 to 0.9981 of known attacks across six real runs', TAGS.real3],
      ['Standalone on all rows with a connection-grouped split: 99.7% accuracy, 0.983 macro F1', TAGS.std],
    ],
  },
  agg: {
    title: 'Trust filter and aggregation',
    body: [
      'Each site’s update is compared with the median update using cosine similarity, a median-absolute-deviation test and a running trust score.',
      'Update sizes are clipped, then a 15% trimmed mean combines what is left, so a few extreme updates cannot drag the result.',
      'A sign-flip attacker is easy to see. A stealth attacker (cosine target 0.1 to the last aggregate, size 1.5× honest) slips through more often.',
    ],
    facts: [
      [`At 30% cheaters, ${SWEEP[2].surv.map((v) => fmt(v, 2)).join(' / ')} of poisoned updates got through (seeds 42 / 43 / 44). The filter lets more through at full scale than in smaller runs; why is not established.`, TAGS.real3],
      [`Autoencoder recall at 30%: full pipeline ${SWEEP[2].ae.map((v) => fmt(v, 3)).join(' / ')}, plain averaging ${ABLATION[3].ae.map((v) => fmt(v, 3)).join(' / ')}.`, TAGS.real3],
    ],
  },
  sdn: {
    title: 'SDN controller and switch',
    body: [
      'A Mininet network with an Open vSwitch switch and an os-ken controller speaking OpenFlow 1.3.',
      'When the cascade decides to block, the controller installs a drop rule on the switch. The rule is then read back from the switch to prove it is really there.',
    ],
    facts: [
      ['All 14 attack captures ended in a block decision, with the rule read back from the switch every time', TAGS.phaseB],
      [DROP_RULE, 'example rule as installed'],
    ],
  },
  lab: {
    title: 'Live-replay lab',
    body: [
      'Phase B replays the dataset’s own attack recordings with tcpreplay into the switch. tshark pulls the 130 features from each packet, the trained cascade classifies them, and the controller blocks.',
      'These are the dataset’s own captures, so this is a demonstration of the pipeline, not a test on unseen traffic.',
      'The released Vulnerability-scanner capture is damaged (a record claims a 136 MB packet), so the 265,827 readable packets were replayed.',
    ],
    facts: [
      ['12 of 14 captures were named correctly. MITM was called Ransomware (0.991) and OS fingerprinting was called DDoS_ICMP (0.980). Both were still blocked.', TAGS.phaseB],
      ['Largest replay: DDoS UDP, 3,215,732 packets in 268 s', TAGS.phaseB],
    ],
  },
};

/* ------------------------------------------------------------------ art helpers */

function useArt(ref, build, deps, register) {
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return undefined;
    let tl;
    const ctx = gsap.context(() => {
      tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
      build(tl, svg);
      register(tl);
    }, svg);
    return () => ctx.revert();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

const T = ({ x, y, children, cls = '', anchor = 'start', fill }) => (
  <text x={x} y={y} textAnchor={anchor} className={`svg-text ${cls}`} style={fill ? { fill } : undefined}>{children}</text>
);

/* ------------------------------------------------------------------ SITES */

const MIX = [
  [0.94, 0.02, 0.03, 0.01],
  [0.40, 0.45, 0.10, 0.05],
  [0.62, 0.05, 0.30, 0.03],
  [0.20, 0.60, 0.12, 0.08],
  [0.55, 0.10, 0.15, 0.20],
  [0.30, 0.15, 0.45, 0.10],
];
const MIX_COL = [INK, CORAL, DEEP, GREY];
const SPLIT = [0.70, 0.15, 0.15];
const SPLIT_COL = [INK, CORAL, GREY];

function SitesArt({ register }) {
  const ref = useRef(null);
  useArt(ref, (tl, svg) => {
    const api = makeApi(tl, svg, svg.querySelector('#layer'));
    MIX.forEach((_, i) => {
      const at = i * 0.35;
      svg.querySelectorAll(`.mix${i}`).forEach((r) => {
        const w = Number(r.dataset.w);
        tl.fromTo(r, { attr: { width: 0 } }, { attr: { width: w }, duration: 0.9, ease: 'power2.out' }, at + 0.6);
      });
      svg.querySelectorAll(`.spl${i}`).forEach((r) => {
        const w = Number(r.dataset.w);
        tl.fromTo(r, { attr: { width: 0 } }, { attr: { width: w }, duration: 0.7, ease: 'power2.out' }, at + 1.9);
      });
      tl.fromTo(svg.querySelector(`#z${i}`), { opacity: 0 }, { opacity: 1, duration: 0.4 }, at + 2.7);
      for (let k = 0; k < 4; k += 1) {
        const d = api.dot(`feed${i}`, { r: 5, fill: k % 3 === 2 ? CORAL : INK });
        api.go(d, { at: at + k * 0.12, dur: 0.6, ease: 'power2.in' });
      }
    });
    tl.fromTo(svg.querySelector('#lock'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 3.8);
    tl.to({}, { duration: 0.6 }, 4.8);
  }, [], register);

  return (
    <svg ref={ref} viewBox="0 0 800 460" role="img" aria-label="Six sites with different traffic mixes, each splitting its own data into train, validation and test">
      {MIX.map((m, i) => {
        const x = 30 + (i % 3) * 252;
        const y = 24 + Math.floor(i / 3) * 190;
        let off = 0;
        let off2 = 0;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path id={`feed${i}`} d="M 14 -24 L 14 30" fill="none" stroke="none" />
            <rect x="0" y="0" width="230" height="168" rx="18" fill="#fff" stroke={INK} strokeWidth="2.5" />
            <T x="14" y="26" cls="lg">{`Site ${i + 1}`}</T>
            {m.map((v, k) => { const w = v * 202; const r = <rect key={k} className={`mix${i}`} data-w={w} x={14 + off} y="42" width={w} height="20" fill={MIX_COL[k]} />; off += w; return r; })}
            <T x="14" y="82" cls="sm">traffic mix of this site</T>
            {SPLIT.map((v, k) => { const w = v * 202; const r = <rect key={k} className={`spl${i}`} data-w={w} x={14 + off2} y="98" width={w} height="14" fill={SPLIT_COL[k]} />; off2 += w; return r; })}
            <T x="14" y="132" cls="sm">train · normal validation · test</T>
            <g id={`z${i}`} opacity="0"><T x="14" y="152" cls="sm" fill={CORAL}>own scaler, clipped at ±10</T></g>
          </g>
        );
      })}
      <g id="lock" opacity="0">
        <rect x="30" y="400" width="740" height="44" rx="22" fill={INK} />
        <T x="400" y="428" anchor="middle" cls="lg" fill={PAPER}>Raw traffic never leaves a site. Only model updates go to the server.</T>
      </g>
      <g id="layer" style={{ pointerEvents: 'none' }} />
      <T x="772" y="392" anchor="end" cls="sm" fill="#5C5C58">black normal · red flooding · dark red web attacks · grey scans (illustrative mixes)</T>
    </svg>
  );
}

/* ------------------------------------------------------------------ AUTOENCODER */

const N_IN = [60, 90, 70, 110, 80, 100, 65, 85];
const N_OUT = [64, 86, 72, 106, 82, 96, 68, 84];
const A_IN = [150, 30, 160, 25, 150, 35, 155, 20];
const A_OUT = [72, 84, 76, 100, 82, 94, 70, 82];
const BASE = 340;

function AutoencoderArt({ register }) {
  const ref = useRef(null);
  useArt(ref, (tl, svg) => {
    const ins = svg.querySelectorAll('.bin');
    const outs = svg.querySelectorAll('.bout');
    const err = svg.querySelector('#err');
    const set = (inp, out, e, col, at) => {
      ins.forEach((r, i) => tl.to(r, { attr: { height: inp[i], y: BASE - inp[i] }, duration: 0.5, ease: 'power2.out' }, at));
      outs.forEach((r, i) => tl.to(r, { attr: { height: out[i], y: BASE - out[i], fill: col }, duration: 0.5, ease: 'power2.out' }, at + 0.7));
      tl.to(err, { attr: { height: e, y: 340 - e, fill: col }, duration: 0.6, ease: 'power2.out' }, at + 1.2);
    };
    tl.set(err, { attr: { height: 0, y: 340 } }, 0);
    set(N_IN, N_OUT, 22, INK, 0.2);
    tl.fromTo('#okmsg', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 1.9);
    tl.to('#okmsg', { opacity: 0, duration: 0.25 }, 3.4);
    set(A_IN, A_OUT, 200, CORAL, 3.6);
    tl.fromTo('#badmsg', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 5.3);
    tl.to('#badmsg', { opacity: 0, duration: 0.25 }, 7.2);
    tl.to({}, { duration: 0.2 }, 7.4);
  }, [], register);

  return (
    <svg ref={ref} viewBox="0 0 800 460" role="img" aria-label="An autoencoder rebuilding a normal packet well and an unusual one badly">
      <T x="40" y="40" cls="lg">Packet features</T>
      <T x="445" y="40" cls="lg">Rebuilt features</T>
      <T x="650" y="40" cls="lg">Rebuild error</T>
      {N_IN.map((h, i) => <rect key={i} className="bin" x={40 + i * 24} y={BASE - h} width="16" height={h} rx="2" fill={INK} />)}
      <path d="M 232 150 L 300 205 L 300 275 L 232 330 Z" fill={INK} />
      <T x="266" y="244" anchor="middle" cls="sm" fill={PAPER}>encoder</T>
      {[210, 245, 280].map((y) => <circle key={y} cx="338" cy={y} r="11" fill={CORAL} stroke={INK} strokeWidth="2.5" />)}
      <T x="338" y="316" anchor="middle" cls="sm">bottleneck</T>
      <path d="M 376 205 L 444 150 L 444 330 L 376 275 Z" fill={INK} transform="translate(-6 0)" />
      <T x="404" y="244" anchor="middle" cls="sm" fill={PAPER}>decoder</T>
      {N_OUT.map((h, i) => <rect key={i} className="bout" x={455 + i * 24} y={BASE - h} width="16" height={h} rx="2" fill={INK} />)}
      <line x1="30" x2="660" y1={BASE} y2={BASE} stroke={INK} strokeWidth="2.5" />
      <rect x="690" y="130" width="46" height="210" rx="8" fill="none" stroke={INK} strokeWidth="2.5" />
      <rect id="err" x="692" y="340" width="42" height="0" fill={INK} />
      <line x1="682" x2="746" y1="230" y2="230" stroke={CORAL} strokeWidth="3" strokeDasharray="6 5" />
      <T x="713" y="364" anchor="middle" cls="sm" fill={CORAL}>dashed line:</T>
      <T x="713" y="378" anchor="middle" cls="sm" fill="#5C5C58">threshold, the 97th</T>
      <T x="713" y="392" anchor="middle" cls="sm" fill="#5C5C58">percentile</T>
      <g id="okmsg" opacity="0"><rect x="40" y="384" width="620" height="44" rx="22" fill={INK} /><T x="350" y="412" anchor="middle" cls="lg" fill={PAPER}>Normal traffic: rebuilt well, error under the threshold, not flagged</T></g>
      <g id="badmsg" opacity="0"><rect x="40" y="384" width="620" height="44" rx="22" fill={CORAL} /><T x="350" y="412" anchor="middle" cls="lg" fill={INK}>Unusual traffic: rebuilt badly, error over the threshold, flagged</T></g>
    </svg>
  );
}

/* ------------------------------------------------------------------ CLASSIFIER */

const CLASSES = ['Normal', 'DDoS_UDP', 'Password', 'SQL_inj.', 'XSS'];
const CONF = [0.01, 0.97, 0.01, 0.005, 0.005];
const UNSURE = [0.34, 0.06, 0.22, 0.16, 0.22];

function ClassifierArt({ register }) {
  const ref = useRef(null);
  useArt(ref, (tl, svg) => {
    const bars = svg.querySelectorAll('.vote');
    const setBars = (vals, at, col) => bars.forEach((b, i) => tl.to(b, { attr: { height: vals[i] * 150, y: 400 - vals[i] * 150, fill: i === vals.indexOf(Math.max(...vals)) ? col : INK }, duration: 0.7, ease: 'power2.out' }, at));
    const lights = (at) => svg.querySelectorAll('.leaf').forEach((l, i) => {
      tl.fromTo(l, { opacity: 0.15 }, { opacity: 1, duration: 0.3 }, at + i * 0.18);
    });
    tl.set(bars, { attr: { height: 0, y: 400 } }, 0);
    tl.set('.leaf', { opacity: 0.15 }, 0);
    tl.fromTo('#pk', { x: 0, opacity: 0 }, { x: 70, opacity: 1, duration: 0.5 }, 0.2);
    lights(0.7);
    setBars(CONF, 1.8, CORAL);
    tl.fromTo('#conf', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 2.6);
    tl.to('#conf', { opacity: 0, duration: 0.25 }, 4.6);
    tl.to('.leaf', { opacity: 0.15, duration: 0.3 }, 4.7);
    tl.set(bars, { attr: { height: 0, y: 400 } }, 5.0);
    lights(5.2);
    setBars(UNSURE, 6.3, INK);
    tl.fromTo('#unsure', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 7.1);
    tl.to('#unsure', { opacity: 0, duration: 0.25 }, 9.1);
    tl.to({}, { duration: 0.2 }, 9.3);
  }, [], register);

  return (
    <svg ref={ref} viewBox="0 0 800 460" role="img" aria-label="Boosted trees voting on a packet, once confident and once unsure">
      <T x="40" y="38" cls="lg">Boosted trees vote</T>
      <g id="pk"><rect x="24" y="84" width="38" height="26" rx="8" fill={CORAL} stroke={INK} strokeWidth="2.5" /><T x="43" y="102" anchor="middle" cls="sm" fill={INK}>pkt</T></g>
      {[0, 1, 2, 3, 4, 5].map((k) => (
        <g key={k} transform={`translate(${140 + k * 100} 70)`}>
          <path d="M 40 10 L 15 55 M 40 10 L 65 55 M 15 55 L 5 100 M 15 55 L 28 100 M 65 55 L 52 100 M 65 55 L 78 100" fill="none" stroke={INK} strokeWidth="2.5" />
          <circle cx="40" cy="10" r="9" fill={INK} /><circle cx="15" cy="55" r="8" fill={INK} /><circle cx="65" cy="55" r="8" fill={INK} />
          <circle className="leaf" cx={k % 2 ? 28 : 78} cy="100" r="9" fill={CORAL} stroke={INK} strokeWidth="2" />
          <circle cx={k % 2 ? 5 : 52} cy="100" r="7" fill="#fff" stroke={INK} strokeWidth="2" />
        </g>
      ))}
      <line x1="40" x2="780" y1="400" y2="400" stroke={INK} strokeWidth="2.5" />
      {CLASSES.map((c, i) => (
        <g key={c}>
          <rect className="vote" x={110 + i * 130} y="400" width="70" height="0" rx="3" fill={INK} />
          <T x={145 + i * 130} y="424" anchor="middle" cls="sm">{c}</T>
        </g>
      ))}
      <T x="40" y="222" cls="sm" fill="#5C5C58">combined vote for each class</T>
      <g id="conf" opacity="0"><rect x="220" y="238" width="420" height="40" rx="20" fill={CORAL} /><T x="430" y="264" anchor="middle" cls="lg" fill={INK}>Confident: named DDoS_UDP and blocked</T></g>
      <g id="unsure" opacity="0"><rect x="160" y="238" width="520" height="40" rx="20" fill={INK} /><T x="420" y="264" anchor="middle" cls="lg" fill={PAPER}>Not confident: passed to the autoencoder</T></g>
    </svg>
  );
}

/* ------------------------------------------------------------------ TRUST */

const HONEST = [-24, -14, -8, -3, 2, 7, 12, 18];
function polar(a, len) { const r = (a * Math.PI) / 180; return [Math.cos(r) * len, -Math.sin(r) * len]; }

function TrustArt({ register }) {
  const [kind, setKind] = useState('flip');
  const ref = useRef(null);
  const cheats = kind === 'flip'
    ? [{ a: 168, len: 105, cos: -0.97 }, { a: 190, len: 100, cos: -0.97 }]
    : [{ a: 84, len: 160, cos: 0.1 }, { a: 80, len: 158, cos: 0.1 }];
  const rows = [...HONEST.map((a) => ({ a, len: 100 + (a % 5) * 3, cos: Math.cos((a * Math.PI) / 180), bad: false })), ...cheats.map((c) => ({ ...c, bad: true }))];
  useArt(ref, (tl, svg) => {
    svg.querySelectorAll('.arrow').forEach((l, i) => {
      const tx = Number(l.dataset.tx); const ty = Number(l.dataset.ty);
      tl.fromTo(l, { attr: { x2: 0, y2: 0 } }, { attr: { x2: tx, y2: ty }, duration: 0.7, ease: 'power2.out' }, 0.2 + i * 0.12);
      const tip = svg.querySelector(`#tip${i}`);
      tl.fromTo(tip, { attr: { cx: 0, cy: 0 } }, { attr: { cx: tx, cy: ty }, duration: 0.7, ease: 'power2.out' }, 0.2 + i * 0.12);
    });
    svg.querySelectorAll('.cosbar').forEach((b, i) => {
      tl.fromTo(b, { attr: { width: 0 } }, { attr: { width: Number(b.dataset.w) }, duration: 0.6, ease: 'power2.out' }, 2.0 + i * 0.08);
    });
    tl.fromTo('#medarrow', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 1.5);
    svg.querySelectorAll('.bad').forEach((el) => tl.to(el, { opacity: kind === 'flip' ? 0.12 : 0.5, duration: 0.6 }, 3.6));
    tl.fromTo('#final', { opacity: 0 }, { opacity: 1, duration: 0.5 }, 4.6);
    tl.fromTo('#verdict2', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 4.8);
    tl.to({}, { duration: 1.6 }, 5.2);
  }, [kind], register);

  return (
    <svg ref={ref} viewBox="0 0 800 460" role="img" aria-label="Client updates as arrows, the median update, and cheating updates being down-weighted">
      <g transform="translate(60 40)">
        <foreignObject x="0" y="-8" width="300" height="40">
          <div xmlns="http://www.w3.org/1999/xhtml" style={{ display: 'flex', gap: 8 }}>
            <button className={`pill${kind === 'flip' ? ' on' : ''}`} style={{ color: INK, padding: '5px 12px', fontSize: 11 }} onClick={() => setKind('flip')}>Sign-flip</button>
            <button className={`pill${kind === 'stealth' ? ' on' : ''}`} style={{ color: INK, padding: '5px 12px', fontSize: 11 }} onClick={() => setKind('stealth')}>Stealth</button>
          </div>
        </foreignObject>
      </g>
      <g transform="translate(200 270)">
        <circle r="168" fill="none" stroke="#cfcec9" strokeWidth="2" />
        <circle r="84" fill="none" stroke="#cfcec9" strokeWidth="1.5" strokeDasharray="4 6" />
        {rows.map((r, i) => {
          const [tx, ty] = polar(r.a, r.len);
          return (
            <g key={i} className={r.bad ? 'bad' : ''}>
              <line className="arrow" data-tx={tx} data-ty={ty} x1="0" y1="0" x2="0" y2="0" stroke={r.bad ? CORAL : INK} strokeWidth="3.2" strokeLinecap="round" />
              <circle id={`tip${i}`} cx="0" cy="0" r="6" fill={r.bad ? CORAL : INK} />
            </g>
          );
        })}
        <g id="medarrow" opacity="0"><line x1="0" y1="0" x2="118" y2="0" stroke={INK} strokeWidth="6" strokeLinecap="round" strokeDasharray="1 11" /><T x="126" y="5" cls="sm">median update</T></g>
        <g id="final" opacity="0"><line x1="0" y1="0" x2="108" y2="-6" stroke={CORAL} strokeWidth="7" strokeLinecap="round" /><T x="-40" y="-100" cls="lg" fill={CORAL}>trimmed mean</T></g>
        <circle r="6" fill={INK} />
      </g>
      <T x="470" y="40" cls="lg">Similarity to the median update</T>
      {rows.map((r, i) => {
        const y = 66 + i * 32;
        const w = ((r.cos + 1) / 2) * 200;
        return (
          <g key={i} className={r.bad ? 'bad' : ''}>
            <T x="470" y={y + 16} cls="sm">{r.bad ? `site ${i + 1} (cheater)` : `site ${i + 1}`}</T>
            <rect x="590" y={y} width="200" height="20" rx="4" fill="#e7e6e3" />
            <rect className="cosbar" data-w={w} x="590" y={y} width="0" height="20" rx="4" fill={r.bad ? CORAL : INK} />
          </g>
        );
      })}
      <line x1="690" x2="690" y1="60" y2={66 + rows.length * 32} stroke={GREY} strokeDasharray="3 5" />
      <T x="590" y={66 + rows.length * 32 + 16} cls="sm" fill="#5C5C58">opposite</T>
      <T x="790" y={66 + rows.length * 32 + 16} anchor="end" cls="sm" fill="#5C5C58">identical</T>
      <g id="verdict2" opacity="0">
        <rect x="470" y="418" width="320" height="30" rx="15" fill={INK} />
        <T x="630" y="438" anchor="middle" cls="sm" fill={PAPER}>{kind === 'flip' ? 'Reversed updates are easy to spot' : 'Stealth updates look similar enough to slip through more often'}</T>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ SDN */

function SdnArt({ register }) {
  const ref = useRef(null);
  useArt(ref, (tl, svg) => {
    const api = makeApi(tl, svg, svg.querySelector('#layer'));
    // before the rule: both flows pass
    for (let k = 0; k < 4; k += 1) {
      api.go(api.dot('h1s', { fill: CORAL }), { at: 0.2 + k * 0.35, dur: 0.8 });
      api.go(api.dot('sh2', { fill: CORAL }), { at: 1.0 + k * 0.35, dur: 0.8 });
      api.go(api.dot('h3s', { fill: INK }), { at: 0.4 + k * 0.45, dur: 0.7 });
      api.go(api.dot('sh2', { fill: INK }), { at: 1.1 + k * 0.45, dur: 0.8 });
    }
    // alert to controller, rule back
    api.go(api.dot('sc', { fill: CORAL, r: 7 }), { at: 2.8, dur: 0.9 });
    tl.fromTo('#ctl', { scale: 1 }, { scale: 1.06, svgOrigin: '400 70', duration: 0.25, yoyo: true, repeat: 1 }, 3.7);
    api.go(api.dot('cs', { fill: INK, r: 7 }), { at: 4.2, dur: 0.9 });
    tl.fromTo('#row1', { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: 0.5, ease: 'power2.out' }, 5.1);
    // after the rule: attacker dies, benign passes
    for (let k = 0; k < 4; k += 1) {
      api.go(api.dot('h1s', { fill: CORAL }), { at: 6.0 + k * 0.4, dur: 0.8, to: 1, hide: false, shrink: true });
      api.go(api.dot('h3s', { fill: INK }), { at: 6.1 + k * 0.5, dur: 0.7 });
      api.go(api.dot('sh2', { fill: INK }), { at: 6.8 + k * 0.5, dur: 0.8 });
    }
    tl.fromTo('#blocked', { opacity: 0 }, { opacity: 1, duration: 0.3 }, 6.9);
    tl.to('#blocked', { opacity: 0, duration: 0.3 }, 9.4);
    tl.to('#row1', { opacity: 0, duration: 0.3 }, 9.6);
    tl.to({}, { duration: 0.2 }, 10);
  }, [], register);

  return (
    <svg ref={ref} viewBox="0 0 800 460" role="img" aria-label="A controller installing a drop rule on a switch, after which attacker packets stop but normal packets pass">
      <g fill="none" stroke={INK} strokeWidth="3">
        <path id="h1s" d="M 120 360 L 400 225" /><path id="h3s" d="M 400 400 L 400 235" /><path id="sh2" d="M 400 225 L 680 360" />
        <path id="sc" d="M 392 205 L 392 100" strokeDasharray="4 6" /><path id="cs" d="M 408 100 L 408 205" strokeDasharray="4 6" />
      </g>
      <g id="ctl"><rect x="320" y="30" width="160" height="70" rx="16" fill={INK} /><T x="400" y="62" anchor="middle" cls="lg" fill={PAPER}>Controller</T><T x="400" y="82" anchor="middle" cls="sm" fill={GREY}>os-ken · OpenFlow 1.3</T></g>
      <rect x="330" y="200" width="140" height="50" rx="14" fill={INK} /><T x="400" y="232" anchor="middle" cls="lg" fill={PAPER}>Switch</T>
      <rect x="40" y="340" width="150" height="60" rx="14" fill={CORAL} stroke={INK} strokeWidth="3" /><T x="115" y="366" anchor="middle" cls="lg">Attacker</T><T x="115" y="386" anchor="middle" cls="sm">10.0.0.1</T>
      <rect x="610" y="340" width="150" height="60" rx="14" fill="#fff" stroke={INK} strokeWidth="3" /><T x="685" y="366" anchor="middle" cls="lg">Victim</T><T x="685" y="386" anchor="middle" cls="sm">server</T>
      <rect x="325" y="400" width="150" height="46" rx="14" fill="#fff" stroke={INK} strokeWidth="3" /><T x="400" y="428" anchor="middle" cls="lg">Normal host</T>
      <rect x="530" y="30" width="250" height="130" rx="16" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <T x="544" y="56" cls="lg">Switch flow table</T>
      <g id="row1" opacity="0"><rect x="540" y="70" width="230" height="74" rx="8" fill={INK} /><T x="548" y="92" cls="sm" fill={PAPER}>priority=100,ip,</T><T x="548" y="110" cls="sm" fill={PAPER}>nw_src=10.0.0.1</T><T x="548" y="128" cls="sm" fill={CORAL}>actions=drop</T></g>
      <g id="blocked" opacity="0"><rect x="30" y="268" width="250" height="36" rx="18" fill={INK} /><T x="155" y="292" anchor="middle" cls="lg" fill={PAPER}>Dropped at the switch</T></g>
      <g id="layer" style={{ pointerEvents: 'none' }} />
    </svg>
  );
}

/* ------------------------------------------------------------------ LAB */

const STAGES = ['pcap file', 'tcpreplay', 'Open vSwitch', 'tshark: 130 features', 'cascade', 'controller', 'drop rule'];

function LabArt({ register }) {
  const ref = useRef(null);
  useArt(ref, (tl, svg) => {
    const api = makeApi(tl, svg, svg.querySelector('#layer'));
    STAGES.slice(0, -1).forEach((_, i) => {
      api.stream(`ln${i}`, { at: 0.2 + i * 0.9, count: 3, gap: 0.2, dur: 0.8, colors: [CORAL] });
      tl.fromTo(`#st${i + 1}`, { opacity: 0.55 }, { opacity: 1, duration: 0.3, yoyo: true, repeat: 1 }, 0.9 + i * 0.9);
    });
    const c = { v: 0 };
    const el = svg.querySelector('#cnt');
    tl.fromTo(c, { v: 0 }, { v: 3215732, duration: 6.4, ease: 'none', onUpdate: () => { el.textContent = Math.round(c.v).toLocaleString('en-US'); } }, 0);
    tl.fromTo('#done', { opacity: 0 }, { opacity: 1, duration: 0.4 }, 6.6);
    tl.to({}, { duration: 1.4 }, 7);
  }, [], register);

  return (
    <svg ref={ref} viewBox="0 0 800 460" role="img" aria-label="The replay chain from recorded capture to drop rule">
      {STAGES.map((s, i) => {
        const x = 12 + i * 112;
        return (
          <g key={s} id={`st${i}`} opacity={i === 0 ? 1 : 0.55}>
            <rect x={x} y="150" width="96" height="86" rx="16" fill={i === 4 ? CORAL : INK} />
            <foreignObject x={x + 4} y="156" width="88" height="74"><div xmlns="http://www.w3.org/1999/xhtml" style={{ color: i === 4 ? INK : PAPER, font: '700 13px var(--display)', textAlign: 'center', display: 'grid', placeItems: 'center', height: 74, lineHeight: 1.15 }}>{s}</div></foreignObject>
            {i < STAGES.length - 1 && <path id={`ln${i}`} d={`M ${x + 96} 193 L ${x + 112} 193`} stroke={INK} strokeWidth="3" fill="none" />}
          </g>
        );
      })}
      <T x="40" y="300" cls="lg">Packets replayed (largest capture, DDoS UDP)</T>
      <text id="cnt" x="40" y="352" className="svg-text lg" style={{ fontSize: 48 }}>0</text>
      <T x="40" y="378" cls="sm" fill="#5C5C58">of 3,215,732 packets; the real replay took 268 s (animation is compressed)</T>
      <g id="done" opacity="0"><rect x="40" y="396" width="420" height="40" rx="20" fill={INK} /><T x="250" y="422" anchor="middle" cls="lg" fill={PAPER}>Verdict: block · rule read back</T></g>
      <rect x="500" y="290" width="270" height="146" rx="16" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <T x="514" y="316" cls="lg">One capture is damaged</T>
      <T x="514" y="340" cls="sm">Vulnerability scanner: a record</T>
      <T x="514" y="356" cls="sm">claims a 136 MB packet. The</T>
      <T x="514" y="372" cls="sm">265,827 packets before it were</T>
      <T x="514" y="388" cls="sm">replayed.</T>
      <g id="layer" style={{ pointerEvents: 'none' }} />
    </svg>
  );
}

const ART = { sites: SitesArt, ae: AutoencoderArt, clf: ClassifierArt, agg: TrustArt, sdn: SdnArt, lab: LabArt };

/* ------------------------------------------------------------------ overlay */

export function SceneOverlay({ id, ox, oy, onClose }) {
  const root = useRef(null);
  const tlRef = useRef(null);
  const [playing, setPlaying] = useState(!reducedMotion());
  const [speed, setSpeed] = useState(1);
  const [ready, setReady] = useState(0);
  const info = INFO[id];
  const Art = ART[id];

  const close = () => {
    const el = root.current;
    if (!el || reducedMotion()) { onClose(); return; }
    gsap.to(el, { clipPath: `circle(0px at ${ox}px ${oy}px)`, duration: 0.45, ease: 'power3.in', onComplete: onClose });
  };

  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (reducedMotion()) { el.style.clipPath = 'none'; return; }
    gsap.fromTo(el, { clipPath: `circle(0px at ${ox}px ${oy}px)` }, { clipPath: `circle(160% at ${ox}px ${oy}px)`, duration: 0.7, ease: 'power3.out', clearProps: 'clipPath' });
  }, [ox, oy]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const tl = tlRef.current;
    if (!tl) return;
    tl.timeScale(speed);
    tl.paused(!playing);
  }, [playing, speed, ready]);

  return (
    <div className="scene" ref={root} role="dialog" aria-modal="true" aria-label={info.title}>
      <div className="scene-art">
        <Art register={(tl) => { tlRef.current = tl; setReady((n) => n + 1); }} />
        <div className="scene-ctrls">
          <button className="iconbtn" aria-label={playing ? 'Pause' : 'Play'} onClick={() => setPlaying((p) => !p)}>{playing ? Icon.pause : Icon.play}</button>
          <button className="iconbtn" aria-label="Restart" onClick={() => { tlRef.current?.restart(); setPlaying(true); }}>{Icon.reset}</button>
          <label className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 8, color: '#5C5C58' }}>Speed
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} style={{ background: '#fff', color: INK, border: `1.5px solid ${INK}` }}>
              <option value={0.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option>
            </select>
          </label>
          <span style={{ marginLeft: 'auto' }}><Tag>{TAGS.schematic}</Tag></span>
        </div>
      </div>
      <div className="scene-text">
        <button className="pill back" onClick={close}>{Icon.left} Back to the map</button>
        <h2>{info.title}</h2>
        {info.body.map((p, i) => <p key={i}>{p}</p>)}
        <ul>
          {info.facts.map(([f, t], i) => (
            <li key={i}>{f} <Tag>{t}</Tag></li>
          ))}
        </ul>
      </div>
      <button className="iconbtn scene-close" aria-label="Close" onClick={close}>{Icon.close}</button>
    </div>
  );
}
