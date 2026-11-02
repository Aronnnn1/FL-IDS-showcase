import { fmt, SEEDS } from './data.js';

export const Tag = ({ children }) => <span className="tag">{children}</span>;

export function Stat({ value, label, tag, accent }) {
  return (
    <div className="stat">
      <div className={`v${accent ? ' accent' : ''}`}>{value}</div>
      <div className="l">{label}</div>
      {tag && <div><Tag>{tag}</Tag></div>}
    </div>
  );
}

export function Marquee({ items }) {
  const run = [...items, ...items, ...items, ...items];
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee-track">
        {run.map((t, i) => (
          <span key={i}>{t}<i> ✦ </i></span>
        ))}
      </div>
    </div>
  );
}

export function BarCell({ value, max = 1, digits = 3 }) {
  return (
    <div className="bar-cell">
      <div className="track"><i style={{ width: `${Math.max(0, Math.min(1, value / max)) * 100}%` }} /></div>
      <span>{fmt(value, digits)}</span>
    </div>
  );
}

// columns: [{ key, label, num, render }]
export function DataTable({ columns, rows, caption }) {
  return (
    <div>
      <div className="table-wrap">
        <table className="dt">
          <thead>
            <tr>{columns.map((c) => <th key={c.key} className={c.num ? 'n' : ''}>{c.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c.key} className={c.num ? 'n' : ''}>{c.render ? c.render(r, i) : r[c.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <p className="note" style={{ marginTop: 8 }}>{caption}</p>}
    </div>
  );
}

// Grouped horizontal bars. groups: [{label, values:[v...]}], series: [{name,color}]
export function GroupBars({ groups, series, max = 1, min = 0, width = 640, rowH = 22, labelW = 150, fmtv = (v) => fmt(v, 3) }) {
  const gap = 10;
  const bh = Math.max(6, (rowH - 4) / series.length);
  const h = groups.length * (rowH + gap);
  const plot = width - labelW - 56;
  const sx = (v) => ((Math.max(min, v) - min) / (max - min)) * plot;
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${width} ${h + 6}`} role="img">
        {groups.map((g, gi) => {
          const y = gi * (rowH + gap);
          return (
            <g key={g.label} transform={`translate(0 ${y})`}>
              <text className="lbl" x={labelW - 10} y={rowH / 2 + 4} textAnchor="end">{g.label}</text>
              {g.values.map((v, si) => (
                <g key={si}>
                  <rect x={labelW} y={si * bh} width={plot} height={bh - 1.5} rx={2} fill="var(--line)" opacity="0.6" />
                  <rect x={labelW} y={si * bh} width={Math.max(1, sx(v))} height={bh - 1.5} rx={2} fill={series[si].color} />
                  {series.length === 1 && <text x={labelW + plot + 8} y={si * bh + bh - 2}>{fmtv(v)}</text>}
                </g>
              ))}
              {series.length > 1 && <text x={labelW + plot + 8} y={rowH / 2 + 4}>{fmtv(g.values[g.values.length - 1])}</text>}
            </g>
          );
        })}
      </svg>
      {series.length > 1 && (
        <div className="legend">{series.map((s) => <span key={s.name}><i style={{ background: s.color }} />{s.name}</span>)}</div>
      )}
    </div>
  );
}

// One line per seed across x categories. points: [{x, v:[s42,s43,s44]|null}]
export function SeedLines({ points, yLabel, yMax = 1, yMin = 0, xFmt = (x) => `${x}%`, height = 260, colors }) {
  const W = 560, H = height, L = 46, R = 18, T = 16, B = 38;
  const cols = colors || ['var(--accent)', 'var(--fg)', 'var(--dim)'];
  const xs = (i) => L + (points.length === 1 ? 0 : (i / (points.length - 1)) * (W - L - R));
  const ys = (v) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => yMin + t * (yMax - yMin));
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={yLabel}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={ys(t)} y2={ys(t)} stroke="var(--line)" />
            <text x={L - 8} y={ys(t) + 4} textAnchor="end">{t.toFixed(2)}</text>
          </g>
        ))}
        {points.map((p, i) => <text key={i} x={xs(i)} y={H - 14} textAnchor="middle">{xFmt(p.x)}</text>)}
        {SEEDS.map((s, si) => {
          const pts = points.map((p, i) => (p.v ? [xs(i), ys(p.v[si]), p.v[si]] : null)).filter(Boolean);
          return (
            <g key={s}>
              <polyline fill="none" stroke={cols[si]} strokeWidth="2.5" strokeLinejoin="round" points={pts.map((q) => `${q[0]},${q[1]}`).join(' ')} />
              {pts.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r="4" fill={cols[si]} />)}
            </g>
          );
        })}
      </svg>
      <div className="legend">{SEEDS.map((s, i) => <span key={s}><i style={{ background: cols[i] }} />seed {s}</span>)}<span>{yLabel}</span></div>
    </div>
  );
}

// Vertical paired columns: items [{label, a, b}] with names and colors for a and b.
export function PairColumns({ items, aName, bName, aColor, bColor, unit = '%', height = 250, scale = 100 }) {
  const W = 620, H = height, L = 40, T = 18, B = 52;
  const max = Math.max(...items.flatMap((i) => [i.a, i.b])) * scale * 1.12;
  const bw = ((W - L - 10) / items.length) / 2.5;
  const y = (v) => T + (1 - (v * scale) / max) * (H - T - B);
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img">
        {[0, 0.5, 1].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - 6} y1={T + (1 - t) * (H - T - B)} y2={T + (1 - t) * (H - T - B)} stroke="var(--line)" />
            <text x={L - 6} y={T + (1 - t) * (H - T - B) + 4} textAnchor="end">{(t * max).toFixed(0)}{unit}</text>
          </g>
        ))}
        {items.map((it, i) => {
          const cx = L + 10 + (i + 0.5) * ((W - L - 10) / items.length);
          return (
            <g key={it.label}>
              <rect x={cx - bw - 1} y={y(it.a)} width={bw} height={H - B - y(it.a)} rx="2" fill={aColor} />
              <rect x={cx + 1} y={y(it.b)} width={bw} height={H - B - y(it.b)} rx="2" fill={bColor} />
              <text x={cx} y={H - B + 16} textAnchor="middle">{it.label}</text>
              <text x={cx - bw / 2 - 1} y={y(it.a) - 5} textAnchor="middle" className="lbl">{(it.a * scale).toFixed(1)}</text>
              <text x={cx + bw / 2 + 1} y={y(it.b) - 5} textAnchor="middle" className="lbl">{(it.b * scale).toFixed(1)}</text>
            </g>
          );
        })}
      </svg>
      <div className="legend"><span><i style={{ background: aColor }} />{aName}</span><span><i style={{ background: bColor }} />{bName}</span></div>
    </div>
  );
}

export const Icon = {
  left: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>,
  right: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 5l7 7-7 7" /></svg>,
  play: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 4l13 8-13 8z" /></svg>,
  pause: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>,
  close: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round"><path d="M5 5l14 14M19 5L5 19" /></svg>,
  info: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.1" /></svg>,
  reset: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 1 0 3-6.2M4 4v5h5" /></svg>,
};
