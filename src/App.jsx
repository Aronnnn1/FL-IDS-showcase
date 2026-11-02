import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { SLIDES } from './slides.jsx';
import Results from './Results.jsx';
import { Icon } from './ui.jsx';
import { LINKS } from './data.js';
import { reducedMotion } from './anim.js';

function parseHash() {
  const h = window.location.hash || '#/';
  if (h.startsWith('#/results')) return { page: 'results' };
  const m = h.match(/^#\/slide\/(\d+)/);
  return { page: 'deck', idx: m ? Math.max(0, Math.min(SLIDES.length - 1, Number(m[1]) - 1)) : 0 };
}

function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const on = () => setRoute(parseHash());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

function useNarrow() {
  const q = '(max-width: 900px)';
  const [n, setN] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const m = window.matchMedia(q);
    const on = () => setN(m.matches);
    m.addEventListener('change', on);
    return () => m.removeEventListener('change', on);
  }, []);
  return n;
}

function Nav({ page }) {
  return (
    <nav className="nav" aria-label="Main">
      <a className="logo" href="#/" aria-label="FL-IDS home">FL-IDS<b>.</b></a>
      <a className={`nav-link${page === 'deck' ? ' on' : ''}`} href="#/">Present</a>
      <a className={`nav-link${page === 'results' ? ' on' : ''}`} href="#/results">Results</a>
      <a className="nav-link hide-s" href={LINKS.report} target="_blank" rel="noreferrer">Report</a>
      <a className="nav-link hide-s" href={LINKS.repo} target="_blank" rel="noreferrer">GitHub</a>
    </nav>
  );
}

function SlideBody({ slide, go, active }) {
  const ctx = { go, active };
  return slide.fill ? (
    <div className="slide-scroll" style={{ padding: '40px 20px 18px' }}>
      <div className="slide-inner wide" style={{ height: '100%', minHeight: 0 }}>{slide.render(ctx)}</div>
    </div>
  ) : (
    <div className="slide-scroll"><div className="slide-inner">{slide.render(ctx)}</div></div>
  );
}

function Deck({ idx }) {
  const narrow = useNarrow();
  const [drawer, setDrawer] = useState(false);
  const innerRef = useRef(null);
  const slide = SLIDES[idx];

  const go = useCallback((i) => {
    const n = Math.max(0, Math.min(SLIDES.length - 1, i));
    window.location.hash = `#/slide/${n + 1}`;
  }, []);

  useEffect(() => { setDrawer(false); }, [idx]);

  useLayoutEffect(() => {
    if (narrow || reducedMotion() || !innerRef.current) return undefined;
    const kids = innerRef.current.querySelectorAll('.slide-inner > *');
    const target = slide.fill ? innerRef.current.querySelector('.slide-inner') : null;
    const ctx = gsap.context(() => {
      if (target) gsap.from(target, { opacity: 0, y: 14, duration: 0.45, ease: 'power3.out' });
      else gsap.from(kids, { opacity: 0, y: 22, duration: 0.55, stagger: 0.07, ease: 'power3.out' });
    }, innerRef);
    return () => ctx.revert();
  }, [idx, narrow, slide.fill]);

  useEffect(() => {
    if (narrow) return undefined;
    const onKey = (e) => {
      const t = e.target;
      if (t && ['INPUT', 'SELECT', 'TEXTAREA'].includes(t.tagName)) return;
      if (document.querySelector('.scene')) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); go(idx + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(idx - 1); }
      else if (e.key === 'Home') go(0);
      else if (e.key === 'End') go(SLIDES.length - 1);
      else if (e.key === 'd' || e.key === 'D') setDrawer((v) => !v);
      else if (e.key === 'Escape') setDrawer(false);
      else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, narrow, go]);

  if (narrow) {
    return (
      <main className="deck">
        <div className="stage-stack">
          {SLIDES.map((s, i) => (
            <section key={s.id} className={`stage tone-${s.tone}`} aria-label={s.label}>
              <SlideBody slide={s} go={go} active />
              <div style={{ padding: '0 22px 26px' }}>
                <details className="mobile-detail"><summary>More detail</summary><div style={{ marginTop: 12 }}>{s.detail()}</div></details>
              </div>
            </section>
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="deck">
      <section className={`stage tone-${slide.tone}`} aria-label={slide.label} ref={innerRef}>
        <span className="slide-title-chip">{String(idx + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')} · {slide.label}</span>
        <SlideBody key={slide.id} slide={slide} go={go} active />
        <aside className={`drawer${drawer ? ' open' : ''}`} aria-hidden={!drawer} aria-label="More detail">
          <button className="iconbtn close" aria-label="Close detail" onClick={() => setDrawer(false)}>{Icon.close}</button>
          {slide.detail()}
        </aside>
      </section>
      <div className="deckbar">
        <button className="iconbtn" aria-label="Previous slide" disabled={idx === 0} onClick={() => go(idx - 1)}>{Icon.left}</button>
        <div className="progress" aria-hidden="true"><i style={{ width: `${((idx + 1) / SLIDES.length) * 100}%` }} /></div>
        <span className="count">{idx + 1} / {SLIDES.length}</span>
        <button className="pill" onClick={() => setDrawer((v) => !v)} aria-expanded={drawer}>{Icon.info} More detail</button>
        <button className="iconbtn" aria-label="Next slide" disabled={idx === SLIDES.length - 1} onClick={() => go(idx + 1)}>{Icon.right}</button>
      </div>
    </main>
  );
}

export default function App() {
  const route = useRoute();
  useEffect(() => { window.scrollTo(0, 0); }, [route.page]);
  return (
    <>
      <Nav page={route.page} />
      {route.page === 'results' ? <Results /> : <Deck idx={route.idx} />}
    </>
  );
}
