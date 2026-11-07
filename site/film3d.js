// 3D scroll film. The photo is scanned into a procedural Monstera "digital twin" that turns while its
// data is pinned to points on the model, then dissolves into particles and the plant wall.
// Scroll maps 1:1 to progress; only cursor lean is smoothed (spring).
import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- Procedural Monstera ---------- */
const SPLITS = [0.2, 0.34, 0.48, 0.62, 0.76];
function halfWidth(y) {                       // leaf half-width along the midrib (0 = base, 1 = tip)
  const t = clamp((y + 0.07) / 1.07);
  return 0.5 * Math.pow(Math.sin(Math.PI * t), 0.72) * (1 - 0.18 * t);
}
function notch(y) {                            // deep, narrow pinnate splits
  let d = 1;
  for (const s of SPLITS) d *= 1 - 0.64 * Math.exp(-(((y - s) / 0.016) ** 2));
  return d;
}
function bend(x, y) {                          // droop toward the tip + V-fold along the midrib
  return -0.26 * y * y + 0.14 * Math.abs(x) - 0.05 * Math.sin(Math.PI * y);
}

function leafShape() {
  const right = [[0, 0], [0.13, -0.06], [0.26, -0.04]];
  for (let i = 1; i <= 90; i++) { const y = i / 90 * 0.98 + 0.02; right.push([halfWidth(y) * notch(y), y]); }
  right.push([0, 1]);
  const pts = [...right, ...right.slice(1, -1).reverse().map(([x, y]) => [-x, y])];
  const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  // fenestrations: small oval holes near the midrib, between splits
  for (const s of SPLITS.slice(0, 4)) for (const side of [-1, 1]) {
    const hole = new THREE.Path();
    hole.absellipse(side * 0.1, s + 0.07, 0.035, 0.016, 0, Math.PI * 2, side < 0, 0.35 * side);
    shape.holes.push(hole);
  }
  return shape;
}

function bentGeometry(geo) {
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setZ(i, bend(pos.getX(i), pos.getY(i)));
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

function leafVeins() {
  const v = [];
  const P = (x, y) => [x, y, bend(x, y)];
  for (let i = 0; i < 24; i++) { const a = i / 24, b = (i + 1) / 24; v.push(...P(0, a), ...P(0, b)); }
  for (let k = 0; k <= SPLITS.length; k++) {
    const y0 = (k === 0 ? 0.06 : SPLITS[k - 1]) + 0.02, y1 = (k === SPLITS.length ? 0.95 : SPLITS[k]) - 0.02;
    const ym = (y0 + y1) / 2, yb = Math.max(0.03, ym - 0.1);
    for (const side of [-1, 1]) {
      const xe = side * halfWidth(ym + 0.04) * 0.86;
      const steps = 6;
      for (let s = 0; s < steps; s++) {
        const t0 = s / steps, t1 = (s + 1) / steps;
        v.push(...P(xe * t0, lerp(yb, ym + 0.04, t0)), ...P(xe * t1, lerp(yb, ym + 0.04, t1)));
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  return g;
}

// Fan of leaves, roughly matching the hero photograph (angle from vertical°, reach, size, depth)
const LEAVES = [[-64, 1.2, 0.92, -0.1], [-42, 1.42, 1.02, -0.25], [-16, 1.55, 1.08, -0.3], [12, 1.58, 1.02, -0.3], [38, 1.46, 1.06, -0.22], [62, 1.25, 0.96, -0.1],
  [-80, 0.78, 0.84, 0.15], [80, 0.82, 0.88, 0.15], [-30, 0.95, 0.95, 0.35], [30, 0.98, 0.96, 0.35], [2, 1.12, 1.18, 0.5]];

function buildPlant() {
  const plant = new THREE.Group();
  const solids = [], wires = [], pointSrc = [], leafMeshes = [], stemMeshes = [];
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3f7d3d, roughness: 0.34, metalness: 0.05, side: THREE.DoubleSide, transparent: true });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c8f3a, roughness: 0.5, transparent: true });
  const potMat = new THREE.MeshStandardMaterial({ color: 0x2b4a35, roughness: 0.8, transparent: true });
  const soilMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1e, roughness: 1, transparent: true });
  const wireMat = new THREE.LineBasicMaterial({ color: 0xcfffdc, transparent: true, opacity: 0 });

  const shape = leafShape();
  const leafGeo = bentGeometry(new THREE.ShapeGeometry(shape, 4));
  const leafEdges = new THREE.EdgesGeometry(leafGeo, 30);
  const veins = leafVeins();

  const base = new THREE.Vector3(0, 0.62, 0);
  for (const [deg, reach, size, depth] of LEAVES) {
    const a = THREE.MathUtils.degToRad(deg);
    const attach = new THREE.Vector3(Math.sin(a) * reach * 1.3, 0.62 + Math.cos(a) * reach * 1.0 + 0.35, depth);
    const up = new THREE.Vector3(Math.sin(a) * 1.1, Math.cos(a) * 0.55 + 0.3, 0.12 + depth * 0.2).normalize();
    const face = new THREE.Vector3(Math.sin(a) * 0.35, 0.35, 1).normalize();
    const z = face.clone().sub(up.clone().multiplyScalar(face.dot(up))).normalize();
    const x = new THREE.Vector3().crossVectors(up, z).normalize();
    const k = size * 1.18;
    const m = new THREE.Matrix4().makeBasis(x, up, z).scale(new THREE.Vector3(k, k, k)).setPosition(attach);

    const leaf = new THREE.Mesh(leafGeo, leafMat); leaf.applyMatrix4(m); plant.add(leaf); solids.push(leaf); leafMeshes.push(leaf);
    const e = new THREE.LineSegments(leafEdges, wireMat); e.applyMatrix4(m); plant.add(e); wires.push(e);
    const vn = new THREE.LineSegments(veins, wireMat); vn.applyMatrix4(m); plant.add(vn); wires.push(vn);
    pointSrc.push([leafGeo, m]);

    // petiole
    const mid = base.clone().lerp(attach, 0.55).add(new THREE.Vector3(0, 0.22, depth * 0.3));
    const curve = new THREE.CatmullRomCurve3([base.clone().add(new THREE.Vector3(Math.sin(a) * 0.05, 0, 0)), mid, attach]);
    const tube = new THREE.TubeGeometry(curve, 20, 0.022, 6, false);
    const stem = new THREE.Mesh(tube, stemMat); plant.add(stem); solids.push(stem); stemMeshes.push(stem);
    const sp = curve.getPoints(14); const sv = [];
    for (let i = 0; i < sp.length - 1; i++) sv.push(sp[i].x, sp[i].y, sp[i].z, sp[i + 1].x, sp[i + 1].y, sp[i + 1].z);
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sv, 3));
    const sl = new THREE.LineSegments(sg, wireMat); plant.add(sl); wires.push(sl);
    pointSrc.push([sg, new THREE.Matrix4()]);
  }

  // pot + soil
  const prof = [[0, 0], [0.4, 0], [0.47, 0.3], [0.5, 0.6], [0.52, 0.66], [0.47, 0.66], [0.45, 0.62]].map(([x, y]) => new THREE.Vector2(x, y));
  const potGeo = new THREE.LatheGeometry(prof, 40);
  const pot = new THREE.Mesh(potGeo, potMat); plant.add(pot); solids.push(pot);
  const soil = new THREE.Mesh(new THREE.CircleGeometry(0.46, 32).rotateX(-Math.PI / 2).translate(0, 0.62, 0), soilMat); plant.add(soil); solids.push(soil);
  const pw = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.LatheGeometry(prof, 16), 1), wireMat); plant.add(pw); wires.push(pw);
  pointSrc.push([potGeo, new THREE.Matrix4()]);

  // height dimension line beside the plant (data overlay)
  const top = 0.62 + 1.58 + 0.35 + 1.08 * 1.18 * 0.75;
  const dim = new THREE.BufferGeometry();
  dim.setAttribute('position', new THREE.Float32BufferAttribute([2.75, 0, 0, 2.75, top, 0, 2.65, 0, 0, 2.85, 0, 0, 2.65, top, 0, 2.85, top, 0], 3));
  const dimMat = new THREE.LineBasicMaterial({ color: 0xfd550a, transparent: true, opacity: 0 });
  const dimLine = new THREE.LineSegments(dim, dimMat); plant.add(dimLine);

  // particles sampled from every surface vertex
  const pos = [], dir = [], col = [];
  const mint = new THREE.Color(0xcfffdc), orange = new THREE.Color(0xfd550a);
  const v = new THREE.Vector3();
  for (const [g, m] of pointSrc) {
    const a = g.attributes.position;
    const stride = a.count > 600 ? 2 : 1;
    for (let i = 0; i < a.count; i += stride) {
      v.fromBufferAttribute(a, i).applyMatrix4(m);
      pos.push(v.x, v.y, v.z);
      const d = new THREE.Vector3(v.x, v.y - 1.4, v.z).normalize().multiplyScalar(1.5 + Math.random() * 3.5);
      d.x += (Math.random() - 0.5) * 1.5; d.y += (Math.random() - 0.3) * 1.5; d.z += (Math.random() - 0.5) * 2;
      dir.push(d.x, d.y, d.z);
      const c = Math.random() < 0.06 ? orange : mint; col.push(c.r, c.g, c.b);
    }
  }
  const pg = new THREE.BufferGeometry();
  const basePos = new Float32Array(pos);
  pg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  pg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  const ptsMat = new THREE.PointsMaterial({ size: 0.028, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(pg, ptsMat); plant.add(pts);

  // anchors for callouts (plant-local)
  const anchors = {
    light: new THREE.Vector3(-0.8, 2.6, -0.1), water: new THREE.Vector3(0.18, 0.64, 0.2), height: new THREE.Vector3(2.75, top / 2, 0),
    family: new THREE.Vector3(1.45, 2.1, 0.1), flowering: new THREE.Vector3(-1.5, 1.3, 0.3), supply: new THREE.Vector3(-0.42, 0.3, 0.42),
  };
  return { plant, solids, wires, pts, basePos, dir: new Float32Array(dir), mats: { leafMat, stemMat, potMat, soilMat, wireMat, ptsMat, dimMat }, anchors, top, leafMeshes, stemMeshes };
}

// Optional photographic textures (docs: assets/3d/). Each file is independent; any that is missing
// leaves the procedural shading in place.
async function applyTextures(P, renderer, onReady) {
  const dir = new URL('assets/3d/', location.href);
  const loader = new THREE.TextureLoader();
  const aniso = renderer.capabilities.getMaxAnisotropy();
  const load = name => loader.loadAsync(new URL(name, dir).href).then(t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; }).catch(() => null);
  const [leaf, leafBack, pot, soil, stem] = await Promise.all(['leaf.png', 'leaf-back.png', 'pot.jpg', 'soil.jpg', 'stem.jpg'].map(load));

  if (leaf) {
    // a subdivided plane bent like the procedural leaf; the texture's alpha cuts the splits and holes
    const g = new THREE.PlaneGeometry(1.12, 1.12, 32, 32).translate(0, 0.5, 0);
    bentGeometry(g);
    const front = new THREE.MeshStandardMaterial({ map: leaf, alphaHash: true, side: leafBack ? THREE.FrontSide : THREE.DoubleSide, roughness: 0.38, metalness: 0.02 });
    P.mats.leafMat = front;
    const extra = [];
    for (const m of P.leafMeshes) {
      m.geometry = g; m.material = front;
      if (leafBack) {
        const back = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: leafBack, alphaHash: true, side: THREE.BackSide, roughness: 0.6 }));
        back.applyMatrix4(m.matrix); m.parent.add(back); extra.push(back.material);
      }
    }
    P.mats.leafBack = extra;
  }
  if (pot) { pot.wrapS = THREE.RepeatWrapping; pot.repeat.set(2, 1); P.mats.potMat.map = pot; P.mats.potMat.color.set(0xffffff); P.mats.potMat.needsUpdate = true; }
  if (soil) { P.mats.soilMat.map = soil; P.mats.soilMat.color.set(0xffffff); P.mats.soilMat.needsUpdate = true; }
  if (stem) { stem.wrapS = stem.wrapT = THREE.RepeatWrapping; stem.repeat.set(6, 1); P.mats.stemMat.map = stem; P.mats.stemMat.color.set(0xffffff); P.mats.stemMat.needsUpdate = true; }
  P.textured = !!leaf;
  if (leaf || pot || soil || stem) onReady();
}

/* ---------- Film ---------- */
export function mountFilm3d(section, { wall = [], onCount } = {}) {
  const stage = section.querySelector('.film__stage');
  const card = section.querySelector('.film__card');
  const photo = section.querySelector('.film__photo');
  const canvas = section.querySelector('.film__gl');
  const scanEl = section.querySelector('.film__scan');
  const wallEl = section.querySelector('.film__wall');
  const lines = section.querySelector('.film__lines');
  const callouts = [...section.querySelectorAll('.film__callout')];
  const acts = [...section.querySelectorAll('.film__act')];
  const steps = [...section.querySelectorAll('.film__step')];
  section.classList.add('is-3d');

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xdfffe6, 0x16261b, 1.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-4, 6, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xcfffdc, 1.1); rim.position.set(4, 3, -4); scene.add(rim);
  const P = buildPlant();
  scene.add(P.plant);
  applyTextures(P, renderer, () => frame());

  let W = 0, H = 0, mobile = false, tiles = [], wallLoaded = false, p = 0, exploded = false;
  const lean = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };

  function buildWall() {
    const tw = mobile ? 64 : 96, th = tw * 0.75, gap = mobile ? 4 : 6;
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
    W = stage.clientWidth; H = stage.clientHeight; mobile = W < 760;
    renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    buildWall(); frame();
  }

  const v = new THREE.Vector3();
  const screen = a => { v.copy(a).applyMatrix4(P.plant.matrixWorld).project(camera); return [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H, v.z]; };

  function frame() {
    const scan = seg(p, 0.06, 0.2);
    const solidIn = ease(seg(p, 0.2, 0.32));
    const fadeOut = seg(p, 0.6, 0.7);
    const explode = ease(seg(p, 0.6, 0.8));
    const ptsOut = seg(p, 0.74, 0.88);
    const dolly = ease(seg(p, 0.1, 0.34));
    const turn = ease(seg(p, 0.14, 0.66));

    // photo: lean + zoom, then masked away by the scan line
    const lx = lean.x * 16, ly = lean.y * 10;
    photo.style.transform = `translate(${lx}px, ${ly}px) scale(${lerp(1.06, 1.0, scan)})`;
    card.style.clipPath = 'none';
    card.style.setProperty('--scan', (scan * 100).toFixed(2) + '%');
    card.style.opacity = scan >= 1 ? 0 : 1;
    scanEl.style.top = (scan * 100) + '%';
    scanEl.style.opacity = scan > 0 && scan < 1 ? 1 : 0;
    stage.style.setProperty('--dim', 0.4);

    // camera: starts close (plant fills the frame like the photo), pulls back to fit the data overlay
    const fitZ = mobile ? 15 : 12.2, closeZ = mobile ? 9.5 : 7.6;
    camera.position.set(lean.x * 0.25 * (1 - dolly) , lerp(1.75, 1.95, dolly) - lean.y * 0.2, lerp(closeZ, fitZ, dolly));
    camera.lookAt(mobile ? 0 : lerp(0, 0.2, dolly), lerp(1.7, 2.15, dolly), 0);
    P.plant.rotation.y = turn * 0.7 + lean.x * 0.14 * dolly;
    P.plant.rotation.x = lean.y * 0.04 * dolly;

    // materials
    const solidA = solidIn * (1 - fadeOut);
    for (const m of [P.mats.leafMat, P.mats.stemMat, P.mats.potMat, P.mats.soilMat, ...(P.mats.leafBack || [])]) {
      m.opacity = solidA; m.visible = solidA > 0.01;
      if (!m.alphaHash) m.depthWrite = solidA > 0.95;   // hashed (textured) leaves keep depth; they dither in
    }
    P.mats.wireMat.opacity = (scan > 0 ? lerp(1, P.textured ? 0.08 : 0.32, solidIn) : 0) * (1 - fadeOut);
    P.mats.dimMat.opacity = seg(p, 0.32, 0.44) * (1 - fadeOut);
    P.mats.ptsMat.opacity = (scan > 0 ? lerp(0.85, 0.35, solidIn) : 0) + explode * 0.6 * (1 - ptsOut);
    if (ptsOut > 0) P.mats.ptsMat.opacity *= 1 - ptsOut;
    const attr = P.pts.geometry.attributes.position;
    if (explode > 0 || exploded) {
      for (let i = 0; i < attr.array.length; i++) attr.array[i] = P.basePos[i] + P.dir[i] * explode;
      attr.needsUpdate = true; exploded = explode > 0;
    }

    // tilt-shift feel: render only while the 3D is on screen
    canvas.style.opacity = scan > 0 && ptsOut < 1 ? 1 : 0;
    if (scan > 0 && ptsOut < 1) { P.plant.updateMatrixWorld(); renderer.render(scene, camera); }

    // callouts pinned to 3D anchors
    const b = seg(p, 0.3, 0.5), out = seg(p, 0.58, 0.66);
    let path = '';
    const keys = ['light', 'water', 'height', 'family', 'flowering', 'supply'];
    callouts.forEach((el, i) => {
      const t = clamp((b - i * 0.08) / 0.5) * (1 - out);
      el.style.opacity = t; el.style.transform = `translateY(${(1 - t) * 8}px)`;
      if (mobile || t <= 0.01) return;
      const [ax, ay] = screen(P.anchors[keys[i]]);
      const left = i % 2 === 0, row = Math.floor(i / 2);
      const lx2 = left ? W * 0.2 : W * 0.8, ly2 = H * (0.32 + row * 0.2);
      el.style.left = (left ? lx2 - el.offsetWidth - 12 : lx2 + 12) + 'px';
      el.style.top = (ly2 - 12) + 'px';
      const mx = lerp(ax, lx2, 0.6);
      path += `<path d="M${ax},${ay} L${mx},${ly2} L${lx2},${ly2}" pathLength="1" style="stroke-dasharray:1;stroke-dashoffset:${1 - t}"/><circle cx="${ax}" cy="${ay}" r="${3.5 * t}"/>`;
    });
    lines.innerHTML = path;

    // wall + count
    if (!wallLoaded && p > 0.5) { tiles.forEach(t => { if (t.dataset.src) t.style.backgroundImage = `url("${t.dataset.src}")`; }); wallLoaded = true; }
    wallEl.style.setProperty('--q', seg(p, 0.72, 0.96).toFixed(3));
    onCount?.(ease(seg(p, 0.66, 0.9)));

    const act = p < 0.18 ? 0 : p < 0.66 ? 1 : 2;
    acts.forEach((el, i) => el.classList.toggle('is-on', i === act));
    steps.forEach((el, i) => el.setAttribute('aria-current', i === act));
  }

  function progress() {
    const r = section.getBoundingClientRect();
    return clamp(-r.top / ((section.offsetHeight - innerHeight) || 1));
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
    cancelAnimationFrame(raf); ro.disconnect();
    removeEventListener('scroll', kick);
    stage.removeEventListener('pointermove', onMove);
    stage.removeEventListener('pointerleave', onLeave);
    renderer.dispose();
    P.plant.traverse(o => { o.geometry?.dispose?.(); });
  };
}
