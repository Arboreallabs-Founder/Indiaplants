// Venus flytrap that tracks the cursor inside the hero and lunges at it — always falling short.
// Motion is spring-driven (damping ratio + response, Apple-style) so every phase starts from the
// live on-screen value and can be interrupted by the next pointer move.

const NS = 'http://www.w3.org/2000/svg';
const TAU = Math.PI * 2;

function spring(s, target, response, damping, dt) {
  const k = (TAU / response) ** 2;
  const c = (4 * Math.PI * damping) / response;
  s.v += (-k * (s.x - target) - c * s.v) * dt;
  s.x += s.v * dt;
}
const S = x => ({ x, v: 0 });
const len = (x, y) => Math.hypot(x, y) || 1e-6;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

// Lobe geometry in local units: hinge at (0,0), pointing +x, bulging to -y. Lower lobe is mirrored.
const LIP = [[96, -8], [52, 4], [0, 0]]; // quadratic from tip back to hinge
function lobeMarkup() {
  const teeth = [];
  for (let i = 0; i < 12; i++) {
    const t = 0.03 + i * 0.068;
    const [p0, p1, p2] = LIP;
    const x = (1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    const L = 12 + 3 * Math.sin(t * Math.PI);
    teeth.push(`M${x.toFixed(1)},${y.toFixed(1)} l${(3.5).toFixed(1)},${L.toFixed(1)}`);
  }
  return `
    <path class="tooth" d="${teeth.join(' ')}"/>
    <path class="lobe-skin" d="M0,0 C14,-34 62,-50 96,-8 Q52,4 0,0 Z"/>
    <path class="lobe-mouth" d="M7,-2.5 C22,-24 64,-36 89,-8.5 Q50,0.5 7,-2.5 Z"/>
    <path class="hair" d="M36,-11 l2,-6 M50,-13 l1,-7 M63,-11 l-1,-6"/>
    <path class="lobe-rim" d="M0,0 C14,-34 62,-50 96,-8"/>`;
}

export function mountFlytrap(hero, { onSnap } = {}) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'trap');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <ellipse class="soil" id="ftShadow" rx="40" ry="5" opacity=".1"/>
    <g id="ftBase">
      <path class="leaf" d="M0,-2 C-22,-8 -44,-26 -70,-22 C-64,-8 -32,4 0,-2Z"/><path class="leaf-vein" d="M0,-2 C-24,-8 -46,-18 -66,-20"/>
      <path class="leaf" d="M0,-2 C22,-10 46,-30 74,-26 C66,-10 34,4 0,-2Z"/><path class="leaf-vein" d="M0,-2 C24,-10 48,-22 70,-24"/>
      <path class="leaf" d="M0,-4 C-8,-24 -30,-44 -40,-60 C-24,-56 -6,-30 0,-4Z"/>
      <rect class="pot-rim" x="-52" y="-2" width="104" height="13" rx="3"/>
      <ellipse class="soil" cx="0" cy="0" rx="46" ry="4.5"/>
      <path class="pot" d="M-46,11 L46,11 L38,66 L-38,66 Z"/>
    </g>
    <path class="stem" id="ftStem"/>
    <path class="stem-hi" id="ftStemHi"/>
    <g id="ftHead">
      <g id="ftDown">${lobeMarkup()}</g>
      <g id="ftUp">${lobeMarkup()}</g>
      <circle class="pot-rim" r="6"/>
    </g>`;
  hero.appendChild(svg);
  const $ = id => svg.querySelector('#' + id);
  const elBase = $('ftBase'), elStem = $('ftStem'), elStemHi = $('ftStemHi'), elHead = $('ftHead'), elUp = $('ftUp'), elDown = $('ftDown'), elShadow = $('ftShadow');

  // Optional photographic skin (see docs/flytrap-assets.md). The rig — springs, hinge, stem — is the
  // same; only the artwork swaps. Each image is aligned by the pivot/tip pixels in the manifest so
  // regenerated art never needs code changes.
  const SKIN = new URL('assets/flytrap/', location.href);
  fetch(new URL('manifest.json', SKIN)).then(r => (r.ok ? r.json() : null)).then(m => {
    if (!m || !svg.isConnected) return;
    const lobe = (spec, mirrored) => {
      const [px, py] = spec.pivot, [tx, ty] = spec.tip;
      const k = 96 / Math.hypot(tx - px, ty - py);              // hinge→tip = 96 rig units
      const rot = -Math.atan2(ty - py, tx - px) * 180 / Math.PI + Math.atan2(-8, 96) * 180 / Math.PI;
      const im = `<image href="${new URL(spec.src, SKIN)}" x="${-px}" y="${-py}" width="${spec.w}" height="${spec.h}" preserveAspectRatio="none"/>`;
      const g = `<g transform="rotate(${rot}) scale(${k})">${im}</g>`;
      return mirrored ? `<g transform="scale(1,-1)">${g}</g>` : g;
    };
    if (m.upper) elUp.innerHTML = lobe(m.upper, false);
    if (m.upper || m.lower) elDown.innerHTML = m.lower ? lobe(m.lower, true) : lobe(m.upper, false);
    if (m.base) {
      const b = m.base, k = (b.displayWidth || 150) / b.w;
      elBase.innerHTML = `<g transform="scale(${k})"><image href="${new URL(b.src, SKIN)}" x="${-b.anchor[0]}" y="${-b.anchor[1]}" width="${b.w}" height="${b.h}"/></g>`;
      // how far the pot reaches below the stem anchor, so the whole pot sits on the ground band
      baseDrop = (b.bottom ?? b.h) * k - b.anchor[1] * k;
      layout();
    }
    svg.querySelector('#ftHead > circle')?.remove(); // photo lobes carry their own hinge
    if (m.headScale) { headK = m.headScale; layout(); }
    if (m.stem) {
      elStem.style.stroke = m.stem.color || ''; elStemHi.style.stroke = m.stem.highlight || '';
      if (m.stem.width) stemW = m.stem.width;
    }
    svg.classList.add('is-photo');
    if (reduce) render();
  }).catch(() => { /* no skin: keep the vector plant */ });
  let stemW = 9, baseDrop = 58, headK = 1;

  let W = 0, H = 0, sc = 1, bx = 0, by = 0, restLen = 200, jaw = 96;
  const hx = S(0), hy = S(0), ang = S(-60), open = S(30);
  const ptr = { x: 0, y: 0, active: false, touch: false };
  let phase = 'idle', phaseAt = 0, cooldownUntil = 0, snapped = false, strike = { x: 0, y: 0 }, snaps = 0;

  function layout() {
    const r = hero.getBoundingClientRect();
    W = r.width; H = r.height;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    sc = clamp(H / 560, 0.72, 1.12);
    jaw = 96 * sc * headK;
    restLen = clamp(H * 0.46, 170, 290);
    bx = W < 760 ? W * 0.62 : W * 0.76;
    by = H - Math.max(58, baseDrop - 10) * sc;
    elBase.setAttribute('transform', `translate(${bx},${by}) scale(${sc})`);
    if (!hx.x) { hx.x = bx - 40 * sc; hy.x = by - restLen; }
  }

  function aimFor(cx, cy) {
    const tx = cx - bx, ty = cy - by, d = len(tx, ty);
    const k = 0.55;
    let ux = (tx / d) * k, uy = -(1 - k) + (ty / d) * k;
    const ul = len(ux, uy); ux /= ul; uy /= ul;
    if (uy > -0.3) { uy = -0.3; ux = Math.sign(ux || -1) * Math.sqrt(1 - uy * uy); }
    return [bx + ux * restLen, by + uy * restLen];
  }

  function target(t) {
    if (ptr.active) return [ptr.x, ptr.y];
    // idle: look up-left, drifting slowly
    return [bx - 170 * sc + Math.sin(t * 0.5) * 30, by - restLen - 70 * sc + Math.cos(t * 0.4) * 16];
  }

  function setPhase(p, t) { phase = p; phaseAt = t; }

  function update(t, dt) {
    const [cx, cy] = target(t);
    const [ax, ay] = aimFor(cx, cy);
    const a = Math.atan2(cy - hy.x, cx - hx.x) * 180 / Math.PI;
    const tipX = hx.x + Math.cos(ang.x * Math.PI / 180) * jaw, tipY = hy.x + Math.sin(ang.x * Math.PI / 180) * jaw;
    const el = t - phaseAt;

    if (phase === 'idle' && ptr.active && t > cooldownUntil && len(cx - tipX, cy - tipY) < 175 * sc) {
      setPhase('windup', t);
    }

    let pr = 0.45, pd = 0.86, aTarget = a, ar = 0.22, ad = 0.9, oT = 30 + Math.sin(t * 2.1) * 2.5, or = 0.4, od = 1;
    let px = ax, py = ay;

    if (phase === 'windup') {
      const ux = (ax - bx) / restLen, uy = (ay - by) / restLen;
      px = ax - ux * 26 * sc; py = ay - uy * 26 * sc;  // pull back
      pr = 0.16; pd = 1; oT = 50; or = 0.09;
      if (el > 0.13) {
        // pick a landing point just short of the cursor, and never further than the stem allows
        const dx = cx - hx.x, dy = cy - hy.x, d = len(dx, dy);
        const gap = jaw + 28 * sc;
        let sx = cx - (dx / d) * gap, sy = cy - (dy / d) * gap;
        const ox = sx - bx, oy = sy - by, od2 = len(ox, oy), maxL = restLen + 120 * sc;
        if (od2 > maxL) { sx = bx + (ox / od2) * maxL; sy = by + (oy / od2) * maxL; }
        strike = { x: sx, y: sy }; snapped = false;
        setPhase('lunge', t);
      }
    } else if (phase === 'lunge') {
      px = strike.x; py = strike.y; pr = 0.11; pd = 0.86; ar = 0.08; ad = 1;
      oT = 50; or = 0.08;
      if (el > 0.07) { oT = 1.5; or = 0.045; }
      if (el > 0.07 && !snapped) {
        snapped = true; snaps++;
        onSnap?.(snaps);
        if (ptr.touch) navigator.vibrate?.(12);
      }
      if (el > 0.42) setPhase('recover', t);
    } else if (phase === 'recover') {
      pr = 0.55; pd = 1; ar = 0.35;
      oT = el > 0.3 ? 30 : 1.5; or = 0.6;
      if (el > 0.75) { setPhase('idle', t); cooldownUntil = t + 0.25; }
    }

    // shortest-path angle
    let da = aTarget - ang.x; da = ((da + 540) % 360) - 180;
    spring(hx, px, pr, pd, dt);
    spring(hy, py, pr, pd, dt);
    spring(ang, ang.x + da, ar, ad, dt);
    spring(open, oT, or, od, dt);
    open.x = clamp(open.x, 0, 58);
  }

  function render() {
    const a = ang.x * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
    const nx = hx.x + dx * 2 * sc, ny = hy.x + dy * 2 * sc; // tuck the stem into the hinge
    const L = len(nx - bx, ny - by);
    const c1x = bx, c1y = by - L * 0.45;
    const c2x = nx - dx * L * 0.35, c2y = ny - dy * L * 0.35;
    const d = `M${bx},${by} C${c1x},${c1y} ${c2x},${c2y} ${nx},${ny}`;
    elStem.setAttribute('d', d); elStemHi.setAttribute('d', d);
    elStem.style.strokeWidth = stemW * sc; elStemHi.style.strokeWidth = stemW * 0.28 * sc;
    elHead.setAttribute('transform', `translate(${hx.x},${hy.x}) rotate(${ang.x}) scale(${sc * headK})`);
    elUp.setAttribute('transform', `rotate(${-open.x})`);
    elDown.setAttribute('transform', `scale(1,-1) rotate(${-open.x})`);
    elShadow.setAttribute('cx', hx.x + dx * jaw * 0.5);
    elShadow.setAttribute('cy', H - 22);
    elShadow.setAttribute('rx', 30 + 30 * clamp(1 - (H - hy.x) / H, 0, 1));
  }

  let raf = 0, last = 0, visible = true;
  function frame(now) {
    raf = 0;
    const t = now / 1000;
    let dt = Math.min(0.05, last ? t - last : 1 / 60);
    last = t;
    const step = 1 / 240;
    while (dt > 0) { const h = Math.min(step, dt); update(t, h); dt -= h; }
    render();
    if (visible && !document.hidden) raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf && !reduce) { last = 0; raf = requestAnimationFrame(frame); } };
  const stop = () => { cancelAnimationFrame(raf); raf = 0; };

  function local(e) {
    const r = hero.getBoundingClientRect();
    ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top;
  }
  const onMove = e => { local(e); ptr.active = true; ptr.touch = e.pointerType === 'touch'; start(); };
  const onDown = e => { onMove(e); if (phase === 'idle') cooldownUntil = 0; };
  const onLeave = e => { if (e.pointerType !== 'touch') ptr.active = false; };
  hero.addEventListener('pointermove', onMove, { passive: true });
  hero.addEventListener('pointerdown', onDown, { passive: true });
  hero.addEventListener('pointerleave', onLeave);
  const onVis = () => (document.hidden ? stop() : start());
  document.addEventListener('visibilitychange', onVis);

  const ro = new ResizeObserver(() => { layout(); if (reduce) render(); });
  ro.observe(hero);
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; visible ? start() : stop(); });
  io.observe(hero);

  layout();
  if (reduce) { const [ax, ay] = aimFor(bx - 200, by - restLen - 80); hx.x = ax; hy.x = ay; ang.x = -150; open.x = 28; render(); }
  else start();

  return () => {
    stop(); ro.disconnect(); io.disconnect();
    hero.removeEventListener('pointermove', onMove);
    hero.removeEventListener('pointerdown', onDown);
    hero.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('visibilitychange', onVis);
    svg.remove();
  };
}
