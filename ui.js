// ui.js
// Dono pages (home + game) ke shared helpers

// User ne "reduce motion" on kiya hai ya nahi
export const reducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// localStorage kabhi kabhi block hota hai (private mode), isliye safe wrapper
export const store = {
  get(key, fallback = null) {
    try {
      const v = localStorage.getItem(key);
      return v === null ? fallback : v;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage band hai, koi baat nahi */
    }
  },
};

// Moire rings: do concentric ring sets, ek thoda offset pe.
// Ek ko ghumane se interference pattern banta hai, jo optical illusion jaisa dikhta hai.
// Ghumane ka kaam sirf CSS transform hai, toh GPU pe chalta hai aur smooth rehta hai.
export function mountRings(host, { count = 24, gap = 16, orbit = 10 } = {}) {
  if (!host) return;
  const NS = 'http://www.w3.org/2000/svg';

  const makeSet = (cx, cls) => {
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '-400 -400 800 800');
    svg.setAttribute('class', `ring-set ${cls}`);
    for (let i = 1; i <= count; i++) {
      const c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', cx);
      c.setAttribute('cy', 0);
      c.setAttribute('r', i * gap);
      svg.appendChild(c);
    }
    return svg;
  };

  host.replaceChildren(makeSet(0, 'ring-a'), makeSet(orbit, 'ring-b'));
}

// Number ko smoothly from -> to tak count karta hai (score ke liye)
export function countUp(el, from, to, ms = 600) {
  if (!el) return;
  if (reducedMotion() || from === to) {
    el.textContent = to;
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / ms);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
