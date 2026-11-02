import gsap from 'gsap';

const NS = 'http://www.w3.org/2000/svg';

// Keep animations on wall-clock time: when a frame is late (slow device, busy tab) they catch up
// instead of slowing down, so a live presentation never drags.
gsap.ticker.lagSmoothing(0);

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Builds helpers that add packets, node pulses and captions to a GSAP timeline.
 * `svg` is the map's <svg>, `layer` is the <g> that holds the moving dots.
 */
export function makeApi(tl, svg, layer) {
  const pathCache = new Map();
  const pathInfo = (id) => {
    if (!pathCache.has(id)) {
      const el = svg.querySelector(`#${id}`);
      pathCache.set(id, { el, len: el.getTotalLength() });
    }
    return pathCache.get(id);
  };

  const place = (dot) => {
    const { el, len } = pathInfo(dot.path);
    const p = el.getPointAtLength(Math.max(0, Math.min(1, dot.t.v)) * len);
    dot.c.setAttribute('cx', p.x.toFixed(1));
    dot.c.setAttribute('cy', p.y.toFixed(1));
  };

  /** Create one packet that sits on `path` at progress 0 and is hidden until shown. */
  function dot(path, { r = 6, fill = '#0A0A0A', stroke = '#F5F5F4', t0 = 0 } = {}) {
    const c = document.createElementNS(NS, 'circle');
    c.setAttribute('r', r);
    c.setAttribute('fill', fill);
    c.setAttribute('stroke', stroke);
    c.setAttribute('stroke-width', '1.5');
    c.setAttribute('opacity', '0');
    layer.appendChild(c);
    const d = { c, path, t: { v: t0 }, r };
    place(d);
    return d;
  }

  /** Show a dot at `at`, move it along its path from `from` to `to`, and optionally hide it. */
  function go(d, { at, dur = 1.2, from = 0, to = 1, ease = 'power1.inOut', hide = true, shrink = false }) {
    tl.set(d.c, { attr: { opacity: 1, r: d.r } }, at);
    tl.fromTo(d.t, { v: from }, { v: to, duration: dur, ease, onUpdate: () => place(d) }, at);
    if (shrink) tl.to(d.c, { attr: { r: 0 }, duration: 0.28, ease: 'power2.in' }, at + dur);
    else if (hide) tl.set(d.c, { attr: { opacity: 0 } }, at + dur);
    return at + dur;
  }

  /** Several packets one after the other along one path. Returns the dots. */
  function stream(path, { at, count = 4, gap = 0.16, dur = 1.1, from = 0, to = 1, hide = true, shrink = false, colors, r = 6, ease }) {
    const out = [];
    for (let i = 0; i < count; i += 1) {
      const fill = Array.isArray(colors) ? colors[i % colors.length] : colors || '#0A0A0A';
      const d = dot(path, { fill, r });
      go(d, { at: at + i * gap, dur, from, to, hide, shrink, ease });
      out.push(d);
    }
    return out;
  }

  /** Flash the coral halo behind a node. */
  function pulse(nodeId, at, times = 1) {
    const halo = svg.querySelector(`#${nodeId} .halo`);
    if (!halo) return;
    for (let i = 0; i < times; i += 1) {
      tl.fromTo(halo, { opacity: 0.0, scale: 0.96 }, { opacity: 0.9, scale: 1.04, duration: 0.28, ease: 'power2.out', transformOrigin: '50% 50%', svgOrigin: halo.dataset.origin }, at + i * 0.6);
      tl.to(halo, { opacity: 0, duration: 0.3, ease: 'power2.in' }, at + i * 0.6 + 0.3);
    }
  }

  /** Change the text of an SVG <text> element at a given time (reversible when scrubbing). */
  function say(sel, text, at) {
    const el = svg.querySelector(sel);
    if (!el) return;
    const prev = { v: el.textContent };
    tl.call(() => { el.textContent = text; }, null, at);
    tl.call(() => { el.textContent = prev.v; }, null, Math.max(0, at - 0.001));
  }

  function fade(sel, to, at, dur = 0.3) {
    const el = svg.querySelector(sel);
    if (el) tl.to(el, { opacity: to, duration: dur, ease: 'power2.out' }, at);
  }

  return { dot, go, stream, pulse, say, fade, place };
}

export { gsap };
