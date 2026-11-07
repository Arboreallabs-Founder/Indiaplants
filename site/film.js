// Scroll-driven hero, three acts on one sticky stage:
//   A  full-bleed Monstera that leans toward the cursor
//   B  the photo pulls back into a card; its real data draws in as callouts
//   C  the card shrinks into one tile of a wall of every plant; the count ticks up
// Scroll maps 1:1 to progress (direct manipulation). Only the cursor lean uses a spring.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a, b, t) => a + (b - a) * t;
const lerpRect = (r1, r2, t) => ({ x: lerp(r1.x, r2.x, t), y: lerp(r1.y, r2.y, t), w: lerp(r1.w, r2.w, t), h: lerp(r1.h, r2.h, t), r: lerp(r1.r, r2.r, t) });

export function mountFilm(section, { wall = [], onCount } = {}) {
  const stage = section.querySelector('.film__stage');
  const card = section.querySelector('.film__card');
  const photo = section.querySelector('.film__photo');
  const wallEl = section.querySelector('.film__wall');
  const lines = section.querySelector('.film__lines');
  const callouts = [...section.querySelectorAll('.film__callout')];
  const acts = [...section.querySelectorAll('.film__act')];
  const steps = [...section.querySelectorAll('.film__step')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W = 0, H = 0, tiles = [], center = null, mobile = false, wallLoaded = false, p = 0;
  const lean = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };

  function buildWall() {
    const tw = mobile ? 64 : 96, th = tw * 0.75, gap = mobile ? 4 : 6;
    const cols = Math.ceil(W / (tw + gap)) + 1, rows = Math.ceil(H / (th + gap)) + 1;
    const ox = (W - cols * (tw + gap) + gap) / 2, oy = (H - rows * (th + gap) + gap) / 2;
    const cc = Math.floor(cols / 2), cr = Math.floor(rows / 2);
    const maxD = Math.hypot(cc, cr);
    let html = '', k = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = ox + c * (tw + gap), y = oy + r * (th + gap);
      if (r === cr && c === cc) { center = { x, y, w: tw, h: th, r: 6 }; continue; }
      const src = wall.length ? wall[k++ % wall.length] : '';
      const d = (Math.hypot(c - cc, r - cr) / maxD).toFixed(3);
      html += `<i style="left:${x}px;top:${y}px;width:${tw}px;height:${th}px;--d:${d}" data-src="${src}"></i>`;
    }
    wallEl.innerHTML = html;
    tiles = [...wallEl.children];
    wallLoaded = false;
  }

  function layout() {
    W = stage.clientWidth; H = stage.clientHeight; mobile = W < 760;
    buildWall();
    render();
  }

  const full = () => ({ x: 0, y: 0, w: W, h: H, r: 0 });
  function framed() {
    const w = mobile ? W * 0.78 : Math.min(W * 0.36, 560), h = w * 0.75;
    return { x: (W - w) / 2, y: mobile ? H * 0.2 : (H - h) / 2 + H * 0.04, w, h, r: 18 };
  }

  function render() {
    const a = ease(seg(p, 0.12, 0.38));   // full → framed
    const c = ease(seg(p, 0.64, 0.86));   // framed → tile
    let rect = lerpRect(full(), framed(), a);
    if (c > 0 && center) rect = lerpRect(framed(), center, c);
    const inset = `inset(${rect.y}px ${W - rect.x - rect.w}px ${H - rect.y - rect.h}px ${rect.x}px round ${rect.r}px)`;
    card.style.clipPath = inset;
    // photo follows the card window and leans toward the cursor in act A
    const zoom = lerp(1.14, 1, a);
    const cx = rect.x + rect.w / 2, cy = rect.y + rect.h / 2;
    const s = Math.max(rect.w / W, rect.h / H) * zoom;
    const lx = lean.x * (1 - a) * 18, ly = lean.y * (1 - a) * 12;
    photo.style.transform = `translate(${cx - W / 2 + lx}px, ${cy - H / 2 + ly}px) scale(${s}) rotateY(${lean.x * (1 - a) * 3}deg) rotateX(${-lean.y * (1 - a) * 2}deg)`;
    stage.style.setProperty('--dim', (0.55 * (1 - a)).toFixed(3));

    // callouts draw in during act B, leave in act C
    const b = seg(p, 0.36, 0.56), out = seg(p, 0.6, 0.68);
    const fr = framed();
    let path = '';
    callouts.forEach((el, i) => {
      const t = clamp((b - i * 0.09) / 0.45) * (1 - out);
      el.style.opacity = t; el.style.transform = `translateY(${(1 - t) * 8}px)`;
      if (mobile) return;
      const left = i % 2 === 0, row = Math.floor(i / 2);
      const ax = fr.x + fr.w * +el.dataset.ax, ay = fr.y + fr.h * +el.dataset.ay;
      const lx2 = left ? fr.x - 40 : fr.x + fr.w + 40, ly2 = fr.y + 26 + row * (fr.h / 2.6);
      el.style.left = (left ? lx2 - el.offsetWidth - 10 : lx2 + 10) + 'px';
      el.style.top = (ly2 - 12) + 'px';
      if (t > 0.01) {
        path += `<path d="M${ax},${ay} L${(ax + lx2) / 2},${ly2} L${lx2},${ly2}" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:${1 - t}"/><circle cx="${ax}" cy="${ay}" r="${3.5 * t}"/>`;
      }
    });
    lines.innerHTML = path;

    // wall
    if (!wallLoaded && p > 0.45) { tiles.forEach(t => { const s2 = t.dataset.src; if (s2) t.style.backgroundImage = `url("${s2}")`; }); wallLoaded = true; }
    wallEl.style.setProperty('--q', seg(p, 0.66, 0.95).toFixed(3));
    onCount?.(ease(seg(p, 0.7, 0.94))); // 0 → 1; the page maps it to 1 → total plants

    // copy + step indicator
    const act = p < 0.3 ? 0 : p < 0.64 ? 1 : 2;
    acts.forEach((el, i) => el.classList.toggle('is-on', i === act));
    steps.forEach((el, i) => el.setAttribute('aria-current', i === act));
  }

  function progress() {
    const r = section.getBoundingClientRect();
    const total = section.offsetHeight - innerHeight;
    return clamp(-r.top / (total || 1));
  }

  // cursor lean (spring, damping 0.9, response 0.5)
  let raf = 0, last = 0;
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now;
    const k = (2 * Math.PI / 0.5) ** 2, cdamp = 4 * Math.PI * 0.9 / 0.5;
    for (const ax of ['x', 'y']) {
      const v = 'v' + ax, t = 't' + ax;
      lean[v] += (-k * (lean[ax] - lean[t]) - cdamp * lean[v]) * dt;
      lean[ax] += lean[v] * dt;
    }
    p = progress();
    render();
    if (Math.abs(lean.x - lean.tx) + Math.abs(lean.y - lean.ty) + Math.abs(lean.vx) + Math.abs(lean.vy) > 0.001) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
  const onScroll = () => kick();
  const onMove = e => {
    const r = stage.getBoundingClientRect();
    lean.tx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1);
    lean.ty = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1);
    kick();
  };
  const onLeave = () => { lean.tx = 0; lean.ty = 0; kick(); };

  const ro = new ResizeObserver(layout);
  ro.observe(stage);
  if (reduce) { section.classList.add('is-static'); p = 0.5; layout(); }
  else {
    addEventListener('scroll', onScroll, { passive: true });
    stage.addEventListener('pointermove', onMove, { passive: true });
    stage.addEventListener('pointerleave', onLeave);
    layout(); p = progress(); render();
  }

  return () => {
    cancelAnimationFrame(raf); ro.disconnect();
    removeEventListener('scroll', onScroll);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerleave', onLeave);
  };
}
