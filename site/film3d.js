// 3D scroll film, one transformation: photograph → botanical specimen with three facts → catalogue.
// The photo crossfades into a procedural Monstera that turns slightly while three record facts are
// pinned to it; the specimen then recedes and the plant wall takes over. Scroll maps 1:1 to progress;
// only the cursor lean is smoothed. Loaded on demand by app.js after the photo and copy are visible.
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- Procedural Monstera ---------- */
const SPLITS = [0.2, 0.34, 0.48, 0.62, 0.76];
function halfWidth(y) {
  const t = clamp((y + 0.07) / 1.07);
  return 0.5 * Math.pow(Math.sin(Math.PI * t), 0.72) * (1 - 0.18 * t);
}
function notch(y) {
  let d = 1;
  for (const s of SPLITS) d *= 1 - 0.64 * Math.exp(-(((y - s) / 0.016) ** 2));
  return d;
}
const bendOf = (x, y, droop) => -droop * y * y + 0.12 * Math.abs(x) - 0.05 * Math.sin(Math.PI * y);

function leafShape() {
  const right = [[0, 0], [0.13, -0.06], [0.26, -0.04]];
  for (let i = 1; i <= 90; i++) { const y = i / 90 * 0.98 + 0.02; right.push([halfWidth(y) * notch(y), y]); }
  right.push([0, 1]);
  const pts = [...right, ...right.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const s of SPLITS.slice(0, 4)) for (const side of [-1, 1]) {
    const hole = new THREE.Path();
    hole.absellipse(side * 0.1, s + 0.07, 0.035, 0.016, 0, Math.PI * 2, side < 0, 0.35 * side);
    shape.holes.push(hole);
  }
  return shape;
}
function bent(geo, droop) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, bendOf(pos.getX(i), pos.getY(i), droop));
  pos.needsUpdate = true; geo.computeVertexNormals();
  return geo;
}

// Crown modelled on the hero photograph: a tall central leaf, overlapping upper layer, wider lower
// leaves, and a few small inner leaves. [angle from vertical°, reach, size, depth, pitch°, roll°, droop]
const LEAVES = [
  [-4, 1.62, 1.22, 0.32, 18, -6, 0.22], [24, 1.5, 1.08, 0.05, 8, 14, 0.26], [-30, 1.46, 1.1, 0.1, 6, -16, 0.24],
  [46, 1.22, 1.04, -0.2, -6, 24, 0.3], [-52, 1.18, 1.0, -0.15, -4, -22, 0.3], [70, 0.92, 0.92, 0.12, -14, 30, 0.34],
  [-72, 0.86, 0.9, 0.18, -12, -28, 0.34], [12, 1.12, 0.78, -0.42, 22, 4, 0.18], [-18, 1.04, 0.72, -0.38, 20, -8, 0.2],
  [58, 0.7, 0.7, 0.42, -2, 18, 0.3], [-60, 0.66, 0.66, 0.44, 0, -18, 0.3],
];

function buildPlant() {
  const plant = new THREE.Group();
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7d3d, roughness: 0.36, metalness: 0.02, side: THREE.DoubleSide });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x4f7f33, roughness: 0.55 });
  const potMat = new THREE.MeshStandardMaterial({ color: 0x2b4a35, roughness: 0.8 });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1 });
  const shape = leafShape();
  const leaves = [];
  const base = new THREE.Vector3(0, 0.62, 0);

  for (const [deg, reach, size, depth, pitch, roll, droop] of LEAVES) {
    const a = THREE.MathUtils.degToRad(deg);
    const attach = new THREE.Vector3(Math.sin(a) * reach * 1.25, 0.62 + Math.cos(a) * reach + 0.3, depth);
    const up = new THREE.Vector3(Math.sin(a) * 1.05, Math.cos(a) * 0.6 + 0.28, 0.1 + depth * 0.25).normalize();
    const face = new THREE.Vector3(Math.sin(a) * 0.3, 0.32, 1).normalize();
    const z = face.clone().sub(up.clone().multiplyScalar(face.dot(up))).normalize();
    const x = new THREE.Vector3().crossVectors(up, z).normalize();
    const k = size * 1.18;
    const m = new THREE.Matrix4().makeBasis(x, up, z)
      .multiply(new THREE.Matrix4().makeRotationY(THREE.MathUtils.degToRad(roll)))
      .multiply(new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(-pitch)))
      .scale(new THREE.Vector3(k, k, k)).setPosition(attach);
    const geo = bent(new THREE.ShapeGeometry(shape, 4), droop);
    const leaf = new THREE.Mesh(geo, leafMat); leaf.applyMatrix4(m); leaf.userData.droop = droop; plant.add(leaf); leaves.push(leaf);

    const mid = base.clone().lerp(attach, 0.55).add(new THREE.Vector3(0, 0.18, depth * 0.3));
    const curve = new THREE.CatmullRomCurve3([base.clone().add(new THREE.Vector3(Math.sin(a) * 0.04, 0, 0)), mid, attach]);
    plant.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.016, 6, false), stemMat));
  }
  const prof = [[0, 0], [0.4, 0], [0.47, 0.3], [0.5, 0.6], [0.52, 0.66], [0.47, 0.66], [0.45, 0.62]].map(([x, y]) => new THREE.Vector2(x, y));
  plant.add(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), potMat));
  plant.add(new THREE.Mesh(new THREE.CircleGeometry(0.46, 32).rotateX(-Math.PI / 2).translate(0, 0.62, 0), soilMat));

  const anchors = { light: new THREE.Vector3(-0.2, 2.75, 0.32), water: new THREE.Vector3(0.18, 0.64, 0.25), height: new THREE.Vector3(1.55, 1.75, 0.05) };
  return { plant, leaves, mats: { leafMat, stemMat, potMat, soilMat }, anchors };
}

// Photographic textures (assets/3d/). Leaves are alpha-cut (alphaTest) so edges stay crisp and depth
// sorting stays correct; the fade is done on the whole canvas instead of per material.
async function applyTextures(P, renderer, isAlive, onReady) {
  const dir = new URL('assets/3d/', location.href);
  const loader = new THREE.TextureLoader();
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const load = name => loader.loadAsync(new URL(name, dir).href).then(t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; }).catch(() => null);
  const tex = await Promise.all(['leaf.png', 'leaf-back.png', 'pot.jpg', 'soil.jpg', 'stem.jpg'].map(load));
  if (!isAlive()) { tex.forEach(t => t?.dispose()); return; }
  const [leaf, leafBack, pot, soil, stem] = tex;
  P.textures = tex.filter(Boolean);
  if (leaf) {
    const front = new THREE.MeshStandardMaterial({ map: leaf, alphaTest: 0.5, side: leafBack ? THREE.FrontSide : THREE.DoubleSide, roughness: 0.4 });
    const back = leafBack ? new THREE.MeshStandardMaterial({ map: leafBack, alphaTest: 0.5, side: THREE.BackSide, roughness: 0.62 }) : null;
    P.extraMats = [front, back].filter(Boolean);
    for (const m of P.leaves) {
      const g = bent(new THREE.PlaneGeometry(1.12, 1.12, 28, 28).translate(0, 0.5, 0), m.userData.droop);
      m.geometry.dispose(); m.geometry = g; m.material = front;
      if (back) { const b = new THREE.Mesh(g, back); b.applyMatrix4(m.matrix); m.parent.add(b); }
    }
  }
  if (pot) { pot.wrapS = THREE.RepeatWrapping; pot.repeat.set(2, 1); P.mats.potMat.map = pot; P.mats.potMat.color.set(0xffffff); P.mats.potMat.needsUpdate = true; }
  if (soil) { P.mats.soilMat.map = soil; P.mats.soilMat.color.set(0xffffff); P.mats.soilMat.needsUpdate = true; }
  if (stem) { stem.wrapS = stem.wrapT = THREE.RepeatWrapping; stem.repeat.set(6, 1); P.mats.stemMat.map = stem; P.mats.stemMat.color.set(0xffffff); P.mats.stemMat.needsUpdate = true; }
  onReady();
}

/* ---------- Film ---------- */
export function mountFilm3d(section, { wall = [], onCount } = {}) {
  const stage = section.querySelector('.film__stage');
  const card = section.querySelector('.film__card');
  const photo = section.querySelector('.film__photo');
  const canvas = section.querySelector('.film__gl');
  const wallEl = section.querySelector('.film__wall');
  const lines = section.querySelector('.film__lines');
  const callouts = [...section.querySelectorAll('.film__callout')];
  const acts = [...section.querySelectorAll('.film__act')];
  section.classList.add('is-3d');
  let alive = true;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xdfffe6, 0x16261b, 1.15));
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(-4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xcfffdc, 0.9); rim.position.set(4, 3, -4); scene.add(rim);
  const P = buildPlant();
  scene.add(P.plant);
  applyTextures(P, renderer, () => alive, () => frame());

  let W = 0, H = 0, tiles = [], wallLoaded = false, p = 0;
  const lean = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };

  function buildWall() {
    const tw = 96, th = 72, gap = 6;
    const cols = Math.ceil(W / (tw + gap)) + 1, rows = Math.ceil(H / (th + gap)) + 1;
    const ox = (W - cols * (tw + gap) + gap) / 2, oy = (H - rows * (th + gap) + gap) / 2;
    const cc = cols / 2, cr = rows / 2, maxD = Math.hypot(cc, cr);
    let html = '', k = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const src = wall.length ? wall[k++ % wall.length] : '';
      html += `<i style="left:${ox + c * (tw + gap)}px;top:${oy + r * (th + gap)}px;width:${tw}px;height:${th}px;--d:${(Math.hypot(c - cc, r - cr) / maxD).toFixed(3)}" data-src="${src}"></i>`;
    }
    wallEl.innerHTML = html; tiles = [...wallEl.children]; wallLoaded = false;
  }
  function layout() {
    W = stage.clientWidth; H = stage.clientHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    buildWall(); frame();
  }

  const v = new THREE.Vector3();
  const screen = a => { v.copy(a).applyMatrix4(P.plant.matrixWorld).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H]; };

  function frame() {
    const cross = ease(seg(p, 0.14, 0.32));       // photo → specimen
    const recede = ease(seg(p, 0.62, 0.82));      // specimen → catalogue
    const turn = ease(seg(p, 0.18, 0.62));
    const wide = W >= 1100;

    // act A: photo sits right of the copy, eases to centre before the crossfade
    const shift = wide ? W * 0.16 * (1 - seg(p, 0.04, 0.16)) : 0;
    photo.style.transform = `translate(${shift + lean.x * 14 * (1 - cross)}px, ${lean.y * 9 * (1 - cross)}px)`;
    card.style.opacity = (1 - cross).toFixed(3);
    stage.style.setProperty('--dim', (0.35 * (1 - cross)).toFixed(3));

    // camera framed to match the photograph at the crossfade, then eases back for the facts
    camera.position.set(lean.x * 0.2, lerp(1.72, 1.9, cross) - lean.y * 0.15, lerp(7.9, 11.4, ease(seg(p, 0.22, 0.4))) + recede * 4);
    camera.lookAt(0, lerp(1.72, 2.05, ease(seg(p, 0.22, 0.4))), 0);
    P.plant.rotation.y = turn * 0.5 + lean.x * 0.1 * cross;

    const glA = cross * (1 - recede);
    canvas.style.opacity = glA.toFixed(3);
    if (glA > 0.001) { P.plant.updateMatrixWorld(); renderer.render(scene, camera); }

    // three facts, pinned to the specimen, each linking to the full record
    const b = seg(p, 0.32, 0.46) * (1 - seg(p, 0.58, 0.64));
    let path = '';
    callouts.forEach((el, i) => {
      const t = clamp((b - i * 0.12) / 0.6);
      el.style.opacity = t; el.style.transform = `translateY(${(1 - t) * 6}px)`;
      el.inert = t < 0.5;
      if (t <= 0.01) return;
      const [ax, ay] = screen(P.anchors[el.dataset.anchor]);
      const left = i === 0, lx2 = left ? W * 0.22 : W * 0.78, ly2 = H * [0.3, 0.62, 0.42][i];
      el.style.left = (left ? lx2 - el.offsetWidth - 12 : lx2 + 12) + 'px';
      el.style.top = (ly2 - 14) + 'px';
      path += `<path d="M${ax},${ay} L${lerp(ax, lx2, 0.55)},${ly2} L${lx2},${ly2}" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:${1 - t}"/><circle cx="${ax}" cy="${ay}" r="${3.5 * t}"/>`;
    });
    lines.innerHTML = path;

    if (!wallLoaded && p > 0.4) { tiles.forEach(t => { if (t.dataset.src) t.style.backgroundImage = `url("${t.dataset.src}")`; }); wallLoaded = true; }
    wallEl.style.setProperty('--q', seg(p, 0.66, 0.92).toFixed(3));
    onCount?.(ease(seg(p, 0.66, 0.9)));

    const act = p < 0.22 ? 0 : p < 0.64 ? 1 : 2;
    acts.forEach((el, i) => { const on = i === act; el.classList.toggle('is-on', on); el.inert = !on; });
  }

  function progress() {
    const r = section.getBoundingClientRect();
    return clamp(-r.top / ((section.offsetHeight - stage.offsetHeight) || 1));
  }

  let raf = 0, last = 0;
  function tick(now) {
    raf = 0;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 1 / 60); last = now;
    const k = (2 * Math.PI / 0.55) ** 2, c = 4 * Math.PI * 0.9 / 0.55;
    for (const ax of ['x', 'y']) { lean['v' + ax] += (-k * (lean[ax] - lean['t' + ax]) - c * lean['v' + ax]) * dt; lean[ax] += lean['v' + ax] * dt; }
    p = progress(); frame();
    if (Math.abs(lean.x - lean.tx) + Math.abs(lean.y - lean.ty) + Math.abs(lean.vx) + Math.abs(lean.vy) > 0.001) raf = requestAnimationFrame(tick);
  }
  const kick = () => { if (!raf) { last = 0; raf = requestAnimationFrame(tick); } };
  const onMove = e => { const r = stage.getBoundingClientRect(); lean.tx = clamp((e.clientX - r.left) / r.width * 2 - 1, -1, 1); lean.ty = clamp((e.clientY - r.top) / r.height * 2 - 1, -1, 1); kick(); };
  const onLeave = () => { lean.tx = 0; lean.ty = 0; kick(); };
  addEventListener('scroll', kick, { passive: true });
  stage.addEventListener('pointermove', onMove, { passive: true });
  stage.addEventListener('pointerleave', onLeave);
  const ro = new ResizeObserver(layout); ro.observe(stage);
  layout(); p = progress(); frame();

  return () => {
    alive = false;
    cancelAnimationFrame(raf); ro.disconnect();
    removeEventListener('scroll', kick);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerleave', onLeave);
    P.plant.traverse(o => { o.geometry?.dispose?.(); });
    [...Object.values(P.mats), ...(P.extraMats || [])].forEach(m => m.dispose());
    (P.textures || []).forEach(t => t.dispose());
    renderer.dispose();
  };
}
