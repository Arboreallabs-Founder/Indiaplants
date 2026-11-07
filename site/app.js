// Indiaplants — client app
// Routes: #/  #/plants?…  #/categories  #/plant/:id  #/about  #/list  #/shop?cat=  #/shop/:id  #/cart
import { icon, hydrateIcons } from './icons.js?v=30';
import { submitSignup } from './crm.js?v=30';

const app = document.getElementById('app');
const PAGE = 60;
const HEIGHTS = ['Less than 50 cms', '50 cms to 100 cms', '1 to 2 meters', '2 to 4 meters', '4 to 6 meters', '6 to 8 meters', '8 to 12 meters', 'More than 12 meters'];
const LIGHT_LEVEL = { 'Sun growing': 3, 'Semi shade': 2, 'Shade growing': 1, 'Low light tolerant': 1 };
const WATER_LEVEL = { 'Requires less': 1, 'Can tolerate less': 1, 'Normal': 2, 'Can tolerate more': 3, 'Requires more': 3 };
const MONTHS = /^(January|February|March|April|May|June|July|August|September|October|November|December)$/;

let PLANTS = [], BY_ID = new Map(), CATS = [], CAT_COUNT = new Map();
let SHOP = [], SHOP_BY_ID = new Map(), SHOP_CATS = [];
let EDIT = {};
let teardown = null; // cleanup for the current view (e.g. the flytrap loop)

const esc = (s = '') => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nf = new Intl.NumberFormat('en-IN');
const inr = n => '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
const splitc = s => (s || '').split(/\s*,\s*/).filter(Boolean);
// All plant/shop photos resolve through one base URL. Local dev serves the downloaded copies; deployed
// builds load from the live site until photos move to a CDN (set window.IP_IMG_BASE before app.js loads).
const IMG_BASE = window.IP_IMG_BASE || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '../data/images/' : 'https://indiaplants.com/');
const relPath = u => u.replace(/^\.\.\/data\/images\//, '').replace(/^https?:\/\/(www\.)?indiaplants\.com\//, '');
const photo = u => (u ? IMG_BASE + relPath(u) : u);
const remote = src => (src ? 'https://indiaplants.com/' + relPath(src) : src);
// "India" in flag colours on hover: IN saffron, D white, IA green.
const INDIA = w => `<span class="india"><span class="in">${w.slice(0, 2)}</span><span class="d">${w[2]}</span><span class="ia">${w.slice(3)}</span></span>`;
const ind = s => esc(s).replace(/\bIndia\b/g, INDIA('India'));

/* ---------- Storage (per-viewer convenience) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } },
};
let LIST = new Set(store.get('ip.list', []).map(String));
let CART = store.get('ip.cart', []); // [{ key: 'shop:a11' | 'plant:123', qty }]

function badge(id, n) {
  const b = document.getElementById(id);
  const changed = b.textContent !== String(n);
  b.hidden = !n; b.textContent = n;
  if (changed && n) { b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); }
}
function saveList() { const ok = store.set('ip.list', [...LIST]); badge('listCount', LIST.size); return ok; }
function saveCart() { const ok = store.set('ip.cart', CART); badge('cartCount', CART.reduce((n, l) => n + l.qty, 0)); return ok; }

/* ---------- Toast + dialog ---------- */
const toastEl = document.getElementById('toast');
let toastTimer;
function toast(msg, { error = false, action, onAction, ms = 3200 } = {}) {
  clearTimeout(toastTimer);
  toastEl.classList.toggle('is-error', error);
  toastEl.querySelector('.toast__icon').innerHTML = icon(error ? 'alert' : 'check', 12);
  toastEl.querySelector('.toast__msg').textContent = msg;
  const btn = toastEl.querySelector('.toast__action');
  btn.hidden = !action; btn.textContent = action || '';
  btn.onclick = () => { hideToast(); onAction?.(); };
  toastEl.setAttribute('role', error ? 'alert' : 'status');
  toastEl.hidden = false;
  toastTimer = setTimeout(hideToast, action ? ms + 2000 : ms);
}
function hideToast() { toastEl.hidden = true; }

const dlg = document.getElementById('dlg');
function dialog({ title, body, ico = 'check', error = false, actions = [{ label: 'Done', primary: true }] }) {
  dlg.classList.toggle('is-error', error);
  document.getElementById('dlgIcon').innerHTML = icon(ico, 20);
  document.getElementById('dlgTitle').textContent = title;
  document.getElementById('dlgBody').innerHTML = body;
  const box = document.getElementById('dlgActions');
  box.innerHTML = actions.map((a, i) => `<button type="button" class="btn ${a.primary ? 'btn--primary' : ''}" data-a="${i}">${a.icon ? icon(a.icon, 14) : ''}${esc(a.label)}</button>`).join('');
  box.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { dlg.close(); actions[+b.dataset.a].onClick?.(); }));
  dlg.showModal();
  box.querySelector('.btn--primary')?.focus();
}

/* ---------- List + cart actions ---------- */
function togglePin(id, { silent } = {}) {
  id = String(id);
  const p = BY_ID.get(id);
  const adding = !LIST.has(id);
  adding ? LIST.add(id) : LIST.delete(id);
  const ok = saveList();
  document.querySelectorAll(`[data-pin="${id}"]`).forEach(b => {
    b.setAttribute('aria-pressed', adding);
    b.innerHTML = icon(adding ? 'bookmarkOn' : 'bookmark', 14) + (b.dataset.label ? `<span>${adding ? 'In my list' : 'Save to list'}</span>` : '');
    b.setAttribute('aria-label', (adding ? 'Remove from' : 'Save to') + ' my list');
  });
  if (silent) return;
  if (!ok) toast('Your browser blocked saving. The list resets when this tab closes.', { error: true });
  else if (adding) toast(`${p.n} saved to your list`, { action: 'View list', onAction: () => (location.hash = '#/list') });
  else toast(`${p.n} removed`, { action: 'Undo', onAction: () => { togglePin(id, { silent: true }); if (location.hash.startsWith('#/list')) route(); } });
}

function cartItem(key) {
  const [kind, id] = key.split(':');
  if (kind === 'shop') { const s = SHOP_BY_ID.get(id); return s && { key, kind, name: s.name, price: s.price, img: s.photos[0], href: `#/shop/${s.id}`, sub: s.cat }; }
  const p = BY_ID.get(id); return p && { key, kind, name: p.n, price: null, img: p.img, href: `#/plant/${p.id}`, sub: commonOf(p) || 'Plant' };
}
function addToCart(key, qty = 1) {
  const line = CART.find(l => l.key === key);
  line ? (line.qty = Math.min(99, line.qty + qty)) : CART.push({ key, qty });
  const ok = saveCart();
  const it = cartItem(key);
  if (!ok) toast('Your browser blocked saving the bag.', { error: true });
  else toast(`${it.name} added to your bag${it.price == null ? ' for a quote' : ''}`, { action: 'View bag', onAction: () => (location.hash = '#/cart') });
}

/* ---------- Data ---------- */
const CAT_FIX = {
  'Flower Arrangeing Accessories': 'Flower arranging', 'Garden Furniture And Accessories': 'Garden furniture', 'Shade nets & Weed mats': 'Shade nets & weed mats',
  'Ceramic pots': 'Pots', 'Cement Pots': 'Pots', 'Terracotta pots': 'Pots', 'Decorative Planters': 'Planters', 'Decorative Stones': 'Decorative stones',
  'Hanging Baskets': 'Hanging baskets', 'Coir Sticks': 'Coir sticks', 'Memberships': 'Memberships',
};
const NAME_FIX = { 'Tarracotta pots': 'Terracotta pots', 'Planters stone': 'Stone planters', 'Planters assorted': 'Assorted planters', 'Stone porbandar': 'Porbandar stone', 'Stone pebbles marble': 'Marble pebbles', 'Stone granite balls': 'Granite balls', 'Garden plants stands': 'Plant stands', 'Garden sculpture': 'Garden sculptures' };
const SHOP_ICON = { 'Pots': 'pot', 'Garden furniture': 'bench', 'Shade nets & weed mats': 'net', 'Coir sticks': 'stick', 'Decorative stones': 'stone', 'Flower arranging': 'vase', 'Planters': 'pot', 'Hanging baskets': 'basket', 'Memberships': 'badge' };

async function load() {
  const [pr, sr, er] = await Promise.all([fetch('data/plants.json'), fetch('data/shop.json'), fetch('data/editorial.json').catch(() => null)]);
  EDIT = er && er.ok ? await er.json() : {};
  if (!pr.ok) throw new Error(pr.status);
  PLANTS = await pr.json();
  SHOP = sr.ok ? await sr.json() : [];

  for (const p of PLANTS) {
    p.id = String(p.id);
    p.formL = splitc(p.form);
    p.seasonL = splitc(p.season).filter(s => !MONTHS.test(s));
    p.months = splitc(p.season).filter(s => MONTHS.test(s));
    p.flowerL = p.flower.filter(f => !/^Various/.test(f));
    p._q = [p.n, ...p.c, p.r, p.fam].join(' ').toLowerCase();
    p.img = photo(p.img); for (const g of p.g) { g.t = photo(g.t); g.f = photo(g.f); }
    BY_ID.set(p.id, p);
    for (const c of p.cat) CAT_COUNT.set(c, (CAT_COUNT.get(c) || 0) + 1);
  }
  for (const p of PLANTS) p.primary = p.cat.slice().sort((a, b) => CAT_COUNT.get(a) - CAT_COUNT.get(b))[0] || '';

  const used = new Set();
  CATS = [...CAT_COUNT.entries()].map(([name, count]) => ({ name, count }));
  for (const c of [...CATS].sort((a, b) => a.count - b.count)) {
    const inCat = PLANTS.filter(p => p.cat.includes(c.name));
    const best = inCat.filter(p => p.img && !used.has(p.id)).sort((a, b) => (a.cat.length - b.cat.length) || (b.g.length - a.g.length))[0];
    if (best) { used.add(best.id); c.img = best.img; }
    const fams = new Map();
    for (const p of inCat) if (p.fam) fams.set(p.fam, (fams.get(p.fam) || 0) + 1);
    c.topFam = [...fams.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    c.sun = Math.round(100 * inCat.filter(p => p.light.includes('Sun growing')).length / inCat.length);
    c.photos = inCat.reduce((n, p) => n + p.g.length + (p.img ? 1 : 0), 0);
  }
  CATS.sort((a, b) => b.count - a.count);
  for (const c of CATS) { const id = EDIT.categories?.[c.name]; const p = id && BY_ID.get(String(id)); if (p?.img) c.img = p.img; }

  for (const s of SHOP) {
    s.cat = CAT_FIX[s.cat] || s.cat;
    s.name = NAME_FIX[s.name] || s.name;
    s.photos = s.photos.map(photo);
    s.desc = (s.desc || '').replace(/varsatile/g, 'versatile');
    SHOP_BY_ID.set(s.id, s);
  }
  const sc = new Map();
  for (const s of SHOP) sc.set(s.cat, (sc.get(s.cat) || 0) + 1);
  SHOP_CATS = [...sc.entries()].sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));

  CART = CART.filter(l => cartItem(l.key));
  saveList(); saveCart();
}

/* ---------- Render helpers ---------- */
function img(src, alt = '', attrs = '') {
  if (!src) return '<span class="ph" aria-hidden="true"></span>';
  return `<img class="lz" src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async" ${attrs} onload="this.classList.add('is-in')" onerror="if(!this.dataset.r){this.dataset.r=1;this.src='${esc(remote(src))}'}">`;
}
const commonOf = p => p.c[0] || p.fam || '';
const pinBtn = (p, label = false) => {
  const on = LIST.has(p.id);
  return `<button type="button" class="${label ? 'btn' : 'pc__pin'}" data-pin="${p.id}" ${label ? 'data-label="1"' : ''} aria-pressed="${on}" aria-label="${on ? 'Remove from' : 'Save to'} my list">${icon(on ? 'bookmarkOn' : 'bookmark', 14)}${label ? `<span>${on ? 'In my list' : 'Save to list'}</span>` : ''}</button>`;
};
const short = h => (h || '').replace(' cms', ' cm').replace(' meters', ' m');

function plantCard(p) {
  return `<div class="pc">
    <a class="pc__img" href="#/plant/${p.id}" tabindex="-1" aria-hidden="true">${img(p.img, '')}</a>
    ${pinBtn(p)}
    <a href="#/plant/${p.id}" class="pc__name bot">${esc(p.n)}</a>
    <div class="pc__common">${esc(commonOf(p))}</div>
    <div class="pc__meta">
      ${p.light[0] ? `<span>${icon(p.light[0] === 'Shade growing' ? 'shade' : 'sun', 12)}${esc(p.light[0].replace(' growing', ''))}</span>` : ''}
      ${p.h ? `<span>${icon('height', 12)}${esc(short(p.h))}</span>` : ''}
    </div>
  </div>`;
}

function plantTable(list, sort) {
  const th = (key, label, ic, cls = '') => `<th class="${cls}" ${sort === key ? 'aria-sort="ascending"' : ''}><button type="button" data-sort="${key}">${icon(ic, 12)}${label}</button></th>`;
  return `<div class="table-wrap"><table class="data">
    <thead><tr><th></th>${th('az', 'Plant', 'sort')}<th class="hide-sm">Category</th><th>Light</th><th class="hide-sm">Water</th>${th('height', 'Height', 'height', 'nowrap')}${th('photos', 'Photos', 'camera', 'r')}<th></th></tr></thead>
    <tbody>${list.map(p => `<tr>
      <td class="thumb"><a href="#/plant/${p.id}" tabindex="-1" aria-hidden="true">${img(p.g[0]?.t || p.img, '')}</a></td>
      <td><a class="row-link" href="#/plant/${p.id}"><span class="bot">${esc(p.n)}</span><br><span class="muted">${esc(commonOf(p))}</span></a></td>
      <td class="hide-sm">${esc(p.primary)}</td>
      <td class="nowrap">${esc(p.light.map(l => l.replace(' growing', '')).join(', '))}</td>
      <td class="hide-sm nowrap" title="${esc(p.water.join(', '))}">${p.water.length ? meter(Math.max(0, ...p.water.map(w => WATER_LEVEL[w] || 0))) + esc(p.water[0]) : ''}</td>
      <td class="nowrap">${esc(p.h)}</td>
      <td class="r">${p.g.length + (p.img ? 1 : 0)}</td>
      <td>${pinBtn(p)}</td>
    </tr>`).join('')}</tbody></table></div>`;
}
const meter = (lvl, max = 3) => `<span class="meter" aria-hidden="true">${Array.from({ length: max }, (_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</span>`;

function bindPins(root = app) {
  root.querySelectorAll('[data-pin]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); togglePin(b.dataset.pin); }));
}

function setNav(name) {
  document.querySelectorAll('[data-nav]').forEach(a => {
    const on = a.dataset.nav === name;
    a.classList.toggle('is-active', on);
    on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current');
  });
}

function seeded(arr, n, seed) {
  const a = arr.slice(); let s = (seed % 2147483646) + 1;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}
const daySeed = () => Math.floor(Date.now() / 864e5);

function gallery(shots, alt, firstCap) {
  return `<div class="gallery">
    <div class="gallery__main">
      ${img(shots[0]?.f, alt, 'id="mainImg"')}
      ${shots.length > 1 ? `<div class="gallery__nav"><button type="button" data-step="-1" aria-label="Previous photo">${icon('left', 14)}</button><button type="button" data-step="1" aria-label="Next photo">${icon('right', 14)}</button></div>` : ''}
    </div>
    <div class="gallery__cap"><span id="cap">${esc(firstCap)}</span><span class="num ico" id="pos">${shots.length > 1 ? `${icon('camera', 12)}1 / ${shots.length}` : ''}</span></div>
    ${shots.length > 1 ? `<div class="thumbs" role="tablist" aria-label="Photos">${shots.map((s, i) => `<button type="button" role="tab" data-i="${i}" aria-label="Photo ${i + 1}" aria-current="${i === 0}" aria-selected="${i === 0}">${img(s.t || s.f, '')}</button>`).join('')}</div>` : ''}
  </div>`;
}
function bindGallery(shots, fallbackCap) {
  let cur = 0;
  const main = app.querySelector('#mainImg');
  if (!main) return;
  const show = i => {
    cur = (i + shots.length) % shots.length;
    const s = shots[cur];
    main.classList.add('is-swapping');
    const pre = new Image();
    pre.onload = () => { main.src = pre.src; main.classList.remove('is-swapping'); };
    pre.onerror = () => {
      if (pre.src !== remote(s.f) && remote(s.f) !== s.f) { pre.src = remote(s.f); return; }
      main.classList.remove('is-swapping');
      toast('That photo could not be loaded.', { error: true });
    };
    pre.src = s.f;
    app.querySelectorAll('.thumbs button').forEach((b, j) => { b.setAttribute('aria-current', j === cur); b.setAttribute('aria-selected', j === cur); });
    app.querySelector('.thumbs button[aria-current="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
    app.querySelector('#cap').textContent = s.cap || fallbackCap;
    app.querySelector('#pos').innerHTML = `${icon('camera', 12)}${cur + 1} / ${shots.length}`;
  };
  app.querySelectorAll('.thumbs button').forEach(b => {
    b.addEventListener('pointerdown', () => show(+b.dataset.i));
    b.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); show(+b.dataset.i); } });
  });
  app.querySelectorAll('[data-step]').forEach(b => b.addEventListener('click', () => show(cur + +b.dataset.step)));
  app.querySelector('.gallery').addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(cur + 1); if (e.key === 'ArrowLeft') show(cur - 1); });
}

/* ---------- Search ---------- */
function search(q, list = PLANTS) {
  q = q.trim().toLowerCase();
  if (!q) return list;
  const terms = q.split(/\s+/);
  return list.filter(p => terms.every(t => p._q.includes(t)))
    .map(p => { const n = p.n.toLowerCase(), c = p.c.join(' ').toLowerCase(); return [n.startsWith(q) ? 0 : c.startsWith(q) ? 1 : n.includes(q) ? 2 : c.includes(q) ? 3 : 4, p]; })
    .sort((a, b) => a[0] - b[0] || a[1].n.localeCompare(b[1].n)).map(x => x[1]);
}

/* ---------- Facets ---------- */
const FACETS = [
  ['cat', 'Category', 'grid', p => p.cat],
  ['light', 'Light', 'sun', p => p.light],
  ['water', 'Water', 'drop', p => p.water],
  ['h', 'Height', 'height', p => p.h ? [p.h] : [], (a, b) => HEIGHTS.indexOf(a) - HEIGHTS.indexOf(b)],
  ['for', 'Grown for', 'flower', p => p.for],
  ['season', 'Flowering', 'calendar', p => p.seasonL],
  ['flower', 'Flower colour', 'palette', p => p.flowerL],
  ['foliage', 'Foliage colour', 'leaf', p => p.foliage],
  ['form', 'Form', 'form', p => p.formL],
  ['sp', 'Uses & traits', 'tag', p => p.sp],
];
const getF = k => FACETS.find(f => f[0] === k)[3];
const SORTS = { relevance: 'Best match', az: 'Name A–Z', photos: 'Most photos', height: 'Height' };

function href(params, base = '#/plants') {
  const s = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) (Array.isArray(v) ? v : [v]).filter(Boolean).forEach(x => s.append(k, x));
  return base + (s.toString() ? '?' + s : '');
}
const go = params => (location.hash = href(params));

/* ---------- Home ---------- */
const PICK = {
  sun: [['full', 'Full sun', 'sun', { light: ['Sun growing'] }], ['part', 'Part shade', 'form', { light: ['Semi shade'] }], ['shade', 'Shade', 'shade', { light: ['Shade growing', 'Low light tolerant'] }]],
  water: [['little', 'A little', 'dropLow', { water: ['Requires less', 'Can tolerate less'] }], ['normal', 'Normal', 'drop', { water: ['Normal'] }], ['plenty', 'Plenty', 'wave', { water: ['Requires more', 'Can tolerate more'] }]],
  space: [['pot', 'Pot', 'pot', { h: ['Less than 50 cms', '50 cms to 100 cms'] }, 'under 1 m'], ['bed', 'Bed', 'small', { h: ['1 to 2 meters'] }, '1–2 m'], ['garden', 'Garden', 'leaf', { h: ['2 to 4 meters', '4 to 6 meters'] }, '2–6 m'], ['large', 'Large', 'family', { h: ['6 to 8 meters', '8 to 12 meters', 'More than 12 meters'] }, '6 m+']],
  extra: [['flowers', 'Flowers', 'flower', { for: ['Flowers'] }], ['fragrant', 'Fragrant', 'wind', { sp: ['Fragrant flowers or leaves'] }], ['butterflies', 'Butterflies', 'butterfly', { sp: ['Attracts butterflies'] }], ['native', 'Native to India', 'pin', { sp: ['Indigenous (native to India)'] }], ['coastal', 'Coastal', 'wave', { sp: ['Good on seaside'] }], ['animal', 'Animal proof', 'shield', { sp: ['Animals will not eat'] }]],
};
const PICK_Q = [['sun', 'How much sun does the spot get?'], ['water', 'How much will you water?'], ['space', 'How much room is there?'], ['extra', 'Anything else?', 'optional']];

function pickerQuery(sel) {
  const q = {};
  for (const [group] of PICK_Q) {
    const choice = PICK[group].find(c => c[0] === sel[group]);
    if (choice) for (const [f, vals] of Object.entries(choice[3])) q[f] = vals;
  }
  return q;
}
const matchQuery = q => PLANTS.filter(p => Object.entries(q).every(([k, vals]) => vals.some(v => getF(k)(p).includes(v))));
// Why a plant matched, in its own recorded values (no claims beyond the record)
function matchReason(p, q) {
  const bits = [];
  if (q.light) bits.push(p.light.filter(v => q.light.includes(v)).map(v => v.replace(' growing', '')).join(', '));
  if (q.water) bits.push(p.water.filter(v => q.water.includes(v)).join(', ') + ' water');
  if (q.h) bits.push(short(p.h));
  for (const k of ['for', 'sp']) if (q[k]) bits.push(getF(k)(p).filter(v => q[k].includes(v)).join(', '));
  return bits.filter(Boolean).join(' · ');
}

const HERO_H1 = () => `A grower’s guide<br>to plants in ${INDIA('India')}.`;
const HERO_P = n => `${nf.format(n)} ornamental plant records with care notes and photographs, kept by the growers at Tukai Exotics, Pune.`;
const HERO_ACTIONS = `<div class="hero-actions">
    <a class="btn btn--primary btn--lg" href="#/plants">${icon('list', 15)}Explore plants</a>
    <button type="button" class="link link--light" data-jump="picker">Find plants for my space ${icon('arrow', 14)}</button>
  </div>`;

function specimenFacts(p) {
  return [
    ['Light', p.light.map(l => l.replace(' growing', '')).join(', '), ''],
    ['Water', p.water.join(', '), ''],
    ['Mature height, as recorded', short(p.h), p.formL?.[0] || ''],
  ];
}

function heroPicture(p, cls) {
  return `<picture>
    <source media="(max-width: 760px)" srcset="assets/hero/monstera-hero-mobile.jpg">
    <img class="${cls}" src="assets/hero/monstera-hero.jpg" alt="${esc(p.n)}, ${esc(commonOf(p))}, in a green pot" fetchpriority="high" onerror="this.onerror=null;this.parentNode.querySelector('source')?.remove();this.src='${esc(p.img)}'">
  </picture>`;
}

// Static opening: phones, reduced motion, no WebGL, or if the 3D film fails to load.
function introMarkup(p, N) {
  return `<section class="intro bleed" id="intro" aria-label="Introduction">
    <div class="intro__media">${heroPicture(p, 'intro__photo')}</div>
    <div class="intro__copy">
      <h1>${HERO_H1()}</h1>
      <p>${HERO_P(N)}</p>
      ${HERO_ACTIONS}
    </div>
  </section>
  <div class="specimen-strip">
    <p class="specimen-strip__name"><a href="#/plant/${p.id}"><span class="bot">${esc(p.n)}</span> · ${esc(commonOf(p))}</a></p>
    <dl>${specimenFacts(p).map(([k, v, s]) => `<div><dt>${k}</dt><dd>${esc(v)}${s ? `<small>${esc(s)}</small>` : ''}</dd></div>`).join('')}</dl>
    <a class="link" href="#/plant/${p.id}">Full record ${icon('arrow', 14)}</a>
  </div>`;
}

function filmMarkup(p, N) {
  return `<section class="film bleed" id="film" aria-label="Introduction">
    <div class="film__stage">
      <div class="film__wall" aria-hidden="true"></div>
      <canvas class="film__gl" aria-hidden="true"></canvas>
      <div class="film__card">${heroPicture(p, 'film__photo')}</div>
      <svg class="film__lines" aria-hidden="true"></svg>
      <ul class="film__callouts" aria-label="${esc(p.n)} at a glance">
        ${specimenFacts(p).map(([k, v, s], i) => `<li class="film__callout" data-anchor="${['light', 'water', 'height'][i]}"><a href="#/plant/${p.id}"><span class="label">${k}</span><b>${esc(v)}</b>${s ? `<small>${esc(s)}</small>` : ''}</a></li>`).join('')}
      </ul>
      <div class="film__copy">
        <div class="film__act is-on">
          <h1>${HERO_H1()}</h1>
          <p>${HERO_P(N)}</p>
          ${HERO_ACTIONS}
        </div>
        <div class="film__act film__act--b" inert>
          <h2>Recorded by the people who grow it.</h2>
          <p><a class="link link--light" href="#/plant/${p.id}"><span class="bot">${esc(p.n)}</span> · ${esc(commonOf(p))}: full record ${icon('arrow', 14)}</a></p>
        </div>
        <div class="film__act film__act--c" inert>
          <h2><span class="count" id="filmCount">1</span> plant records.</h2>
          <form class="film__search" id="heroSearch" role="search" autocomplete="off">
            <label class="field">${icon('search', 16)}<input name="q" type="search" placeholder="Botanical, common or regional name" aria-label="Search plants"></label>
            <button class="btn btn--primary" type="submit">${icon('arrow', 14)}Search</button>
          </form>
        </div>
      </div>
      <div class="film__hint" aria-hidden="true">${icon('down', 12)}Scroll</div>
    </div>
  </section>`;
}

function viewHome() {
  setNav('');
  const N = PLANTS.length;
  const photos = PLANTS.reduce((n, p) => n + p.g.length + (p.img ? 1 : 0), 0);
  const fams = new Set(PLANTS.map(p => p.fam).filter(Boolean)).size;
  const spec = BY_ID.get(String(EDIT.specimen?.id || 445)) || PLANTS.find(p => p.img);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const webgl = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; } })();
  const useFilm = !reduce && webgl && innerWidth > 760 && !/[?&]static/.test(location.search);   // ?static previews the fallback

  const spread = (EDIT.spread || []).map(e => ({ ...e, p: BY_ID.get(String(e.id)) })).filter(e => e.p);
  const fig = (e, lead) => `<figure class="ed ${lead ? 'ed--lead' : ''}">
      <a class="ed__img" href="#/plant/${e.p.id}" tabindex="-1" aria-hidden="true">${img(e.p.img, '', `style="object-position:${e.focus || '50% 50%'}"`)}</a>
      <figcaption><a href="#/plant/${e.p.id}" class="bot">${esc(e.p.n)}</a><span class="ed__common">${esc(commonOf(e.p))}</span><p>${esc(e.caption)}</p></figcaption>
    </figure>`;
  const col = EDIT.collection || {};
  const natives = [...(col.ids || []).map(id => BY_ID.get(String(id))).filter(Boolean),
    ...PLANTS.filter(p => p.img && p.sp.includes(col.trait) && !(col.ids || []).includes(+p.id) && !spread.some(e => e.p === p)).sort((a, b) => b.g.length - a.g.length)]
    .slice(0, 6);
  const timeline = [['1975', 'Ramrao Jagtap turns his rose garden in Pune into a full-time nursery.'], ['1998', 'Tukai Exotics starts on a five-acre farm at Loni Kalbhor.'], ['2002', 'The Tukai Exotics Plant CD-ROM documents the range for the first time.'], ['Today', `${nf.format(N)} plant records online.`]];

  app.innerHTML = `<div>
  ${useFilm ? filmMarkup(spec, N) : introMarkup(spec, N)}
  <p class="provenance">${nf.format(N)} records · ${nf.format(photos)} photographs · ${CATS.length} categories · ${fams} botanical families · compiled by Tukai Exotics since the 2002 Plant CD-ROM</p>

  <section class="section discover" aria-labelledby="discoverTitle">
    <div class="discover__head">
      <h2 id="discoverTitle">Browse the collection</h2>
      <p>From giant water lilies to native trees, every record can be searched by name, growing condition and use.</p>
    </div>
    <div class="discover__grid">
      ${spread[0] ? fig(spread[0], true) : ''}
      <div class="discover__side">${spread.slice(1, 3).map(e => fig(e, false)).join('')}</div>
      <nav class="discover__cats" aria-label="Categories">
        <h3>Categories</h3>
        <ul>${CATS.slice(0, 12).map(c => `<li><a href="${href({ cat: c.name })}"><span>${esc(c.name)}</span><span class="num">${nf.format(c.count)}</span></a></li>`).join('')}</ul>
        <a class="link" href="#/categories">All ${CATS.length} categories ${icon('arrow', 14)}</a>
        <a class="btn btn--primary" href="#/plants">${icon('list', 14)}Browse all ${nf.format(N)} plants</a>
      </nav>
    </div>
  </section>

  <section class="band bleed" id="picker" aria-labelledby="pickerTitle">
    <div class="picker">
      <div>
        <div class="picker__head">
          <h2 id="pickerTitle">What should I plant here?</h2>
          <p>Describe the spot and see plants whose records match. Matching a record isn’t a guarantee for your exact conditions, so check each plant’s notes.</p>
        </div>
        ${PICK_Q.map(([g, label, opt]) => `<div class="q" role="group" aria-labelledby="q-${g}">
          <div class="q__label"><strong id="q-${g}">${label}</strong>${opt ? `<em>${opt}</em>` : ''}</div>
          <div class="choices">${PICK[g].map(([id, t, ic, , hint]) => `<button type="button" class="choice" data-g="${g}" data-v="${id}">${icon(ic, 14)}${t}${hint ? ` <small>${hint}</small>` : ''}</button>`).join('')}</div>
        </div>`).join('')}
      </div>
      <aside class="result" id="pickResult" aria-label="Matching plants"></aside>
      <span class="sr" aria-live="polite" id="pickLive"></span>
    </div>
  </section>

  <section class="section story" aria-labelledby="storyTitle">
    <div class="story__text">
      <h2 id="storyTitle">Written by growers, not compilers</h2>
      <p>The Jagtap family has grown plants in Pune since 1975. Their wholesale nursery, Tukai Exotics, produces the plants in these records on its own farms and supplies nurseries, landscape architects, hotels and corporate clients.</p>
      <a class="link" href="#/about">The family’s story ${icon('arrow', 14)}</a>
    </div>
    <ol class="timeline" aria-label="Milestones">${timeline.map(([y, t]) => `<li><b>${y}</b><span>${esc(t)}</span></li>`).join('')}</ol>
  </section>

  ${natives.length ? `<section class="section collection" aria-labelledby="colTitle">
    <div class="section__head"><div><h2 id="colTitle">${esc(col.title || 'Native to India')}</h2><p>${esc(col.intro || '')}</p></div><a class="link" href="${href({ sp: col.trait })}">All ${nf.format(PLANTS.filter(p => p.sp.includes(col.trait)).length)} native plants ${icon('arrow', 14)}</a></div>
    <div class="grid grid--six">${natives.map(plantCard).join('')}</div>
  </section>` : ''}

  <section class="section trade" aria-labelledby="tradeTitle">
    <div>
      <h2 id="tradeTitle">Buying for a project, or visiting?</h2>
      <p>Tukai Exotics sells wholesale to nurseries, garden shops, landscape architects, hotels, resorts and corporate clients. Retail visitors are welcome at The Enchanted Gardens every day, 9:30 am – 5:30 pm.</p>
    </div>
    <div class="trade__actions">
      <a class="btn btn--primary" href="#/contact">${icon('pin', 14)}Where to find us</a>
      <a class="btn" href="#/shop">${icon('bag', 14)}Accessories &amp; memberships</a>
    </div>
  </section></div>`;

  app.querySelectorAll('[data-jump]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.jump)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })));

  // plant picker: three explained results lead; the total supports them
  const sel = { sun: 'part', water: 'normal', space: 'pot', extra: '' };
  const out = app.querySelector('#pickResult'), live = app.querySelector('#pickLive');
  const renderPick = announce => {
    app.querySelectorAll('.choice').forEach(b => b.setAttribute('aria-pressed', sel[b.dataset.g] === b.dataset.v));
    const q = pickerQuery(sel);
    const hits = matchQuery(q).sort((a, b) => (!!b.img - !!a.img) || (b.g.length - a.g.length));
    out.innerHTML = hits.length ? `
      <ul class="picks">${hits.slice(0, 3).map(p => `<li><a href="#/plant/${p.id}">
        <span class="picks__img">${img(p.img, '')}</span>
        <span class="picks__text"><span class="bot">${esc(p.n)}</span><span class="picks__common">${esc(commonOf(p))}</span><small>${esc(matchReason(p, q))}</small></span>
      </a></li>`).join('')}</ul>
      <p class="result__sub"><b class="num">${nf.format(hits.length)}</b> of ${nf.format(N)} records match these answers.</p>
      <a class="btn btn--primary btn--lg" href="${href(q)}">${icon('arrow', 14)}See all ${nf.format(hits.length)}</a>`
      : `<p class="result__none" role="status">${icon('info', 12)} No record matches every answer. Try a different space, or remove the extra.</p>`;
    if (announce) live.textContent = `${nf.format(hits.length)} plants match`;
  };
  app.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => {
    const g = b.dataset.g;
    sel[g] = g === 'extra' && sel[g] === b.dataset.v ? '' : b.dataset.v;
    renderPick(true);
  }));
  renderPick(false);
  bindPins();

  if (!useFilm) { teardown = null; return; }
  // 3D film: mounted on first scroll or when the browser is idle, so the photo and copy come first
  const filmEl = app.querySelector('#film');
  let stopFilm = () => {}, started = false, gone = false;
  const countEl = filmEl.querySelector('#filmCount');
  const opts = { wall: seeded(PLANTS.filter(p => p.g[0]?.t || p.img), 600, 7).map(p => p.g[0]?.t || p.img), onCount: f2 => (countEl.textContent = nf.format(Math.round(1 + f2 * (N - 1)))) };
  const fallback = () => {
    if (gone || !filmEl.isConnected) return;
    filmEl.outerHTML = introMarkup(spec, N);
    app.querySelectorAll('#intro [data-jump]').forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.jump)?.scrollIntoView({ behavior: 'smooth' })));
  };
  const start = () => {
    if (started || gone) return; started = true;
    removeEventListener('scroll', start);
    import('./film3d.js?v=30').then(m => { if (!gone && filmEl.isConnected) stopFilm = m.mountFilm3d(filmEl, opts); }).catch(fallback);
  };
  addEventListener('scroll', start, { passive: true, once: true });
  const idle = (window.requestIdleCallback || (f => setTimeout(f, 1200)))(start, { timeout: 2500 });
  const f = filmEl.querySelector('#heroSearch');
  f.addEventListener('submit', e => { e.preventDefault(); go({ q: f.q.value }); });
  teardown = () => { gone = true; removeEventListener('scroll', start); (window.cancelIdleCallback || clearTimeout)(idle); stopFilm(); };
}

/* ---------- Categories ---------- */
function viewCategories() {
  setNav('categories');
  const max = CATS[0]?.count || 1;
  app.innerHTML = `<div class="view-in" style="padding-top:28px">
    <div class="section__head"><div><h1>Categories</h1><p>${CATS.length} categories. A plant can sit in several, so the counts add up to more than ${nf.format(PLANTS.length)}.</p></div></div>
    <div class="table-wrap"><table class="data">
      <thead><tr><th></th><th>${icon('grid', 12)} Category</th><th>${icon('sprout', 12)} Plants</th><th class="hide-sm">${icon('camera', 12)} Photos</th><th class="hide-sm">${icon('sun', 12)} Full sun</th><th class="hide-sm">${icon('family', 12)} Most common family</th></tr></thead>
      <tbody>${CATS.map((c, i) => `<tr>
        <td class="thumb"><a href="${href({ cat: c.name })}" tabindex="-1" aria-hidden="true">${img(c.img, '')}</a></td>
        <td><a class="row-link" href="${href({ cat: c.name })}"><span class="bot">${esc(c.name)}</span></a></td>
        <td><div class="share"><i class="${i === 0 ? 'lead' : ''}" style="width:${Math.max(4, 100 * c.count / max)}px"></i><span class="num">${nf.format(c.count)}</span></div></td>
        <td class="hide-sm num">${nf.format(c.photos)}</td>
        <td class="hide-sm num">${c.sun}%</td>
        <td class="hide-sm muted">${esc(c.topFam)}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
}

/* ---------- Plant list ---------- */
function viewPlants(params) {
  setNav('plants');
  const q = params.get('q') || '';
  const sel = Object.fromEntries(FACETS.map(([k]) => [k, params.getAll(k)]));
  const sort = params.get('sort') || (q ? 'relevance' : 'az');
  const view = params.get('view') || store.get('ip.view', 'grid');
  const limit = +params.get('n') || PAGE;
  const expanded = new Set(params.getAll('more'));

  const base = search(q);
  const matches = (p, skip) => FACETS.every(([k, , , get]) => k === skip || !sel[k].length || sel[k].some(v => get(p).includes(v)));
  const results = base.filter(p => matches(p));
  if (sort === 'az') results.sort((a, b) => a.n.localeCompare(b.n));
  if (sort === 'photos') results.sort((a, b) => b.g.length - a.g.length);
  if (sort === 'height') results.sort((a, b) => (HEIGHTS.indexOf(a.h) + 1 || 99) - (HEIGHTS.indexOf(b.h) + 1 || 99));

  const state = () => ({ q, ...sel, sort: sort === (q ? 'relevance' : 'az') ? '' : sort, view: params.get('view') || '' });
  const facetHtml = FACETS.map(([k, label, ic, get, order]) => {
    const counts = new Map();
    for (const p of base) if (matches(p, k)) for (const v of get(p)) counts.set(v, (counts.get(v) || 0) + 1);
    for (const v of sel[k]) if (!counts.has(v)) counts.set(v, 0);
    const opts = [...counts.entries()].sort(order ? (a, b) => order(a[0], b[0]) : (a, b) => b[1] - a[1]);
    if (!opts.length) return '';
    const cap = 8, showAll = expanded.has(k) || opts.length <= cap + 2;
    const shown = showAll ? opts : [...opts.slice(0, cap), ...opts.slice(cap).filter(([v]) => sel[k].includes(v))];
    const open = sel[k].length || ['cat', 'light', 'water', 'h'].includes(k) ? 'open' : '';
    return `<details class="filter" ${open}><summary>${icon(ic, 14)}${label}${sel[k].length ? `<span class="on">${sel[k].length}</span>` : ''}</summary><div class="opts">
      ${shown.map(([v, n]) => `<label class="opt ${n ? '' : 'is-zero'}"><input type="checkbox" data-k="${k}" value="${esc(v)}" ${sel[k].includes(v) ? 'checked' : ''}><span>${esc(v)}</span><small>${n}</small></label>`).join('')}
      ${showAll ? '' : `<button type="button" class="more-opts" data-more="${k}">Show ${opts.length - shown.length} more</button>`}
    </div></details>`;
  }).join('');

  const active = FACETS.flatMap(([k]) => sel[k].map(v => [k, v]));
  const title = sel.cat.length === 1 && !q ? sel.cat[0] : q ? `“${q}”` : 'Plant list';
  const near = !results.length && q ? PLANTS.filter(p => p.n.toLowerCase().startsWith(q.toLowerCase().slice(0, 3))).slice(0, 6) : [];
  const body = results.length
    ? (view === 'table' ? plantTable(results.slice(0, limit), sort) : `<div class="grid">${results.slice(0, limit).map(plantCard).join('')}</div>`)
    : `<div class="empty" role="alert">
        <div class="empty__icon">${icon('search', 20)}</div>
        <h2>No plants match</h2>
        <p>${q ? `Nothing in ${nf.format(PLANTS.length)} records matches “${esc(q)}”${active.length ? ' with these filters' : ''}.` : 'No plant meets every selected filter.'} ${active.length ? 'Remove a filter, or clear them all.' : 'Check the spelling, or try the common name.'}</p>
        ${near.length ? `<p class="label" style="margin-top:14px">Plants starting with “${esc(q.slice(0, 3))}”</p><div class="suggestions">${near.map(p => `<a class="tag" href="#/plant/${p.id}">${icon('sprout', 12)}${esc(p.n)}</a>`).join('')}</div>` : ''}
      </div>`;

  app.innerHTML = `<div class="browse view-in">
    <aside class="filters" id="filters" aria-label="Filters">
      <div class="filters__head"><span class="label">${icon('filter', 12)}Filter</span>${active.length ? `<button class="btn btn--ghost" data-clear="filters" style="height:24px;font-size:.75rem">${icon('history', 12)}Reset</button>` : ''}</div>
      ${facetHtml}
    </aside>
    <section aria-labelledby="results-title">
      <div class="bar">
        <h1 id="results-title">${esc(title)}</h1>
        <span class="bar__count num" aria-live="polite">${nf.format(results.length)} ${results.length === 1 ? 'plant' : 'plants'}</span>
        <div class="bar__tools">
          <button class="btn filters-toggle" id="ftoggle" type="button" aria-controls="filters" aria-expanded="false">${icon('filter', 14)}Filters${active.length ? ` · ${active.length}` : ''}</button>
          <label class="select-wrap">${icon('sort', 12)}<select class="select" id="sort" aria-label="Sort">${Object.entries(SORTS).filter(([k]) => k !== 'relevance' || q).map(([k, l]) => `<option value="${k}" ${k === sort ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          <div class="seg" role="group" aria-label="Layout">
            <button type="button" data-view="grid" aria-pressed="${view === 'grid'}">${icon('grid', 12)}Grid</button>
            <button type="button" data-view="table" aria-pressed="${view === 'table'}">${icon('rows', 12)}Table</button>
          </div>
        </div>
        ${active.length || q ? `<div class="active">
          ${q ? `<button type="button" data-clear="q" aria-label="Remove search ${esc(q)}">${icon('search', 11)}${esc(q)} ${icon('x', 10)}</button>` : ''}
          ${active.map(([k, v]) => `<button type="button" data-rm="${k}" data-v="${esc(v)}" aria-label="Remove filter ${esc(v)}">${esc(v)} ${icon('x', 10)}</button>`).join('')}
          ${active.length + (q ? 1 : 0) > 1 ? '<button type="button" class="clear" data-clear="all">Clear all</button>' : ''}
        </div>` : ''}
      </div>
      ${body}
      ${results.length > limit ? `<div class="load-more"><span class="num">Showing ${nf.format(limit)} of ${nf.format(results.length)}</span><button class="btn" id="more">${icon('plus', 14)}Show ${Math.min(PAGE, results.length - limit)} more</button></div>` : ''}
    </section>
  </div>`;

  app.querySelectorAll('.opt input').forEach(cb => cb.addEventListener('change', () => {
    const s = state(), k = cb.dataset.k;
    s[k] = cb.checked ? [...s[k], cb.value] : s[k].filter(v => v !== cb.value);
    go(s);
  }));
  app.querySelectorAll('[data-more]').forEach(b => b.addEventListener('click', () => { const s = new URLSearchParams(params); s.append('more', b.dataset.more); history.replaceState(null, '', '#/plants?' + s); keepScroll(route); }));
  app.querySelector('#sort').addEventListener('change', e => go({ ...state(), sort: e.target.value }));
  app.querySelectorAll('[data-sort]').forEach(b => b.addEventListener('click', () => go({ ...state(), sort: b.dataset.sort })));
  app.querySelectorAll('[data-view]').forEach(b => b.addEventListener('click', () => { store.set('ip.view', b.dataset.view); const s = new URLSearchParams(params); s.set('view', b.dataset.view); history.replaceState(null, '', '#/plants?' + s); keepScroll(route); }));
  app.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { const s = state(); s[b.dataset.rm] = s[b.dataset.rm].filter(v => v !== b.dataset.v); go(s); }));
  app.querySelectorAll('[data-clear]').forEach(b => b.addEventListener('click', () => { const c = b.dataset.clear; go(c === 'q' ? { ...state(), q: '' } : c === 'filters' ? { q, sort: state().sort, view: state().view } : {}); }));
  app.querySelector('#more')?.addEventListener('click', () => { const s = new URLSearchParams(params); s.set('n', limit + PAGE); history.replaceState(null, '', '#/plants?' + s); keepScroll(route); });
  app.querySelector('#ftoggle').addEventListener('click', e => { const f = document.getElementById('filters'), open = f.classList.toggle('is-open'); e.currentTarget.setAttribute('aria-expanded', open); });
  bindPins();
  document.querySelector('#navSearch input').value = q;
}
function keepScroll(fn) { const y = scrollY; fn(); scrollTo(0, y); }
function para(t) { return t.split(/\n+/).map(l => l.replace(/^[-•]\s*/, '').trim()).filter(Boolean).map(l => `<p>${esc(l)}</p>`).join(''); }

/* ---------- Plant detail ---------- */
function viewPlant(id) {
  setNav('plants');
  const p = BY_ID.get(id);
  if (!p) {
    app.innerHTML = `<div class="empty view-in" role="alert"><div class="empty__icon">${icon('alert', 20)}</div><h2>This plant isn't in the database</h2><p>The link may be from the old site or mistyped. Search for it by name instead.</p><a class="btn btn--primary" href="#/plants">${icon('list', 14)}Go to the plant list</a></div>`;
    return;
  }
  const shots = [{ t: p.img, f: p.img, cap: p.cap }, ...p.g.map(g => ({ t: g.t, f: g.f }))].filter(s => s.f);
  const lightLvl = Math.max(0, ...p.light.map(l => LIGHT_LEVEL[l] || 0));
  const waterLvl = Math.max(0, ...p.water.map(w => WATER_LEVEL[w] || 0));
  const genus = p.n.split(' ')[0];
  const sameGenus = PLANTS.filter(x => x !== p && x.img && x.n.split(' ')[0] === genus).slice(0, 10);
  const related = sameGenus.length >= 3 ? sameGenus
    : [...sameGenus, ...PLANTS.filter(x => x !== p && x.img && !sameGenus.includes(x) && x.fam === p.fam && x.primary === p.primary)].slice(0, 10);
  const relTitle = sameGenus.length >= 3 ? `More ${genus}` : `Related in ${p.primary || 'the records'}`;
  const relWhy = sameGenus.length >= 3 ? `${sameGenus.length === 10 ? 'Ten' : sameGenus.length} other ${genus} records.` : `${sameGenus.length ? `${genus} first, then` : 'Plants from'} the same family (${(p.fam || '').split(' or ')[0]}) and category.`;
  const inBag = CART.some(l => l.key === 'plant:' + p.id);
  const ref = [p.fam && (p.fam.split(' or ')[0]), p.primary, `Record ${p.id}`].filter(Boolean).join(' · ');
  const row = (k, v) => v && v.length ? `<tr><th scope="row">${k}</th><td>${esc(Array.isArray(v) ? v.join(', ') : v)}</td></tr>` : '';

  app.innerHTML = `<div class="view-in plant">
  <nav class="crumbs" aria-label="Breadcrumb">
    <a href="#/plants">Plant list</a><span aria-hidden="true">/</span>
    ${p.primary ? `<a href="${href({ cat: p.primary })}">${esc(p.primary)}</a><span aria-hidden="true">/</span>` : ''}
    <span aria-current="page">${esc(p.n)}</span>
  </nav>
  <div class="specimen">
    <div class="specimen__media">
      ${gallery(shots, commonOf(p) || p.n, p.cap || p.n)}
      <button type="button" class="btn btn--ghost specimen__whole" id="whole" aria-pressed="false">${icon('camera', 14)}Show whole photo</button>
    </div>
    <div class="specimen__info">
      <p class="specimen__ref">${esc(ref)}</p>
      <h1 class="bot">${esc(p.n)}</h1>
      ${p.c.length ? `<p class="specimen__common">${esc(p.c.join(' · '))}</p>` : ''}
      ${p.r ? `<p class="specimen__regional">${esc(p.r)}</p>` : ''}
      <dl class="care">
        ${p.light.length ? `<div><dt>Light</dt><dd>${lightLvl ? meter(lightLvl) : ''}${esc(p.light.map(l => l.replace(' growing', '')).join(', '))}</dd></div>` : ''}
        ${p.water.length ? `<div><dt>Water</dt><dd>${waterLvl ? meter(waterLvl) : ''}${esc(p.water.join(', '))}</dd></div>` : ''}
        ${p.h ? `<div><dt>Mature height, as recorded</dt><dd>${esc(p.h)}${p.formL?.[0] ? `<small>${esc(p.form)}</small>` : ''}</dd></div>` : ''}
      </dl>
      <div class="actions">
        <button type="button" class="btn btn--primary btn--lg ${inBag ? 'is-added' : ''}" id="enquire">${icon(inBag ? 'check' : 'bag', 15)}<span>${inBag ? 'In bag for a quote' : 'Enquire to buy'}</span></button>
        ${pinBtn(p, true)}
        <button type="button" class="btn btn--ghost" id="copy">${icon('link', 14)}<span>Copy link</span></button>
      </div>
      ${p.avail ? `<p class="specimen__avail">Availability in India, as recorded: ${esc(p.avail)}</p>` : ''}
    </div>
  </div>

  <div class="record">
    <div class="record__main">
      ${p.tips ? `<section class="growers"><h2>From the growers</h2>${para(p.tips)}</section>` : ''}
      ${p.desc ? `<section><h2>About this plant</h2>${para(p.desc)}</section>` : ''}
      ${p.pests ? `<section><h2>Insect pests</h2>${para(p.pests)}</section>` : ''}
      ${p.dis ? `<section><h2>Diseases</h2>${para(p.dis)}</section>` : ''}
    </div>
    <aside class="record__aside">
      <h2>Full record</h2>
      <table class="facts"><tbody>
        ${row('Light', p.light)}${row('Water', p.water)}${row('Height', p.h)}${row('Spread', p.w)}${row('Form', p.form)}${row('Life span', p.life)}
        ${row('Grown for', p.for)}${row('Flowering', p.months.length ? p.months.join(', ') : p.seasonL)}${row('Flower colour', p.flower)}${row('Foliage', p.foliage)}
        ${row('Family', p.fam)}
        <tr><th scope="row">Categories</th><td class="tags">${p.cat.map(c => `<a class="tag" href="${href({ cat: c })}">${esc(c)}</a>`).join('')}</td></tr>
        ${row('Availability', p.avail)}
      </tbody></table>
      ${p.sp.length ? `<h3>Uses &amp; traits</h3><ul class="traits">${p.sp.map(s => `<li><a href="${href({ sp: s })}">${esc(s)}</a></li>`).join('')}</ul>` : ''}
    </aside>
  </div>
  ${related.length ? `<section class="section"><div class="section__head"><div><h2>${esc(relTitle)}</h2><p>${esc(relWhy)}</p></div></div><div class="rail">${related.map(plantCard).join('')}</div></section>` : ''}
  </div>`;

  bindGallery(shots, p.n);
  const whole = app.querySelector('#whole');
  whole.addEventListener('click', () => {
    const on = app.querySelector('.gallery__main').classList.toggle('is-whole');
    whole.setAttribute('aria-pressed', on);
    whole.lastChild.textContent = on ? 'Fill frame' : 'Show whole photo';
  });
  app.querySelector('#copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); toast('Link copied'); }
    catch { toast('Couldn’t copy. Select the address bar and copy it manually.', { error: true }); }
  });
  app.querySelector('#enquire').addEventListener('click', e => {
    if (CART.some(l => l.key === 'plant:' + p.id)) { location.hash = '#/cart'; return; }
    addToCart('plant:' + p.id);
    e.currentTarget.classList.add('is-added');
    e.currentTarget.innerHTML = `${icon('check', 15)}<span>In bag for a quote</span>`;
  });
  bindPins();
}

/* ---------- My list ---------- */
function viewList() {
  setNav('list');
  const items = [...LIST].map(id => BY_ID.get(id)).filter(Boolean);
  if (!items.length) {
    app.innerHTML = `<div class="empty view-in"><div class="empty__icon">${icon('bookmark', 20)}</div><h1 style="margin-bottom:10px">My list</h1><p>Save plants while you browse to compare them here. Use the bookmark on any plant photo or page.</p><a class="btn btn--primary" href="#/plants">${icon('list', 14)}Browse plants</a></div>`;
    return;
  }
  app.innerHTML = `<div class="view-in" style="padding-top:28px">
    <div class="section__head">
      <div><h1>My list</h1><p>${items.length} ${items.length === 1 ? 'plant' : 'plants'}, saved in this browser.</p></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn" id="quoteList">${icon('bag', 14)}Request a quote for all</button><button class="btn" id="copyList">${icon('copy', 14)}Copy as text</button><button class="btn" id="clearList">${icon('trash', 14)}Clear</button></div>
    </div>
    ${plantTable(items, '')}
  </div>`;
  bindPins();
  app.querySelectorAll('[data-pin]').forEach(b => b.addEventListener('click', () => setTimeout(() => keepScroll(route), 0)));
  app.querySelector('#clearList').addEventListener('click', () => {
    const before = [...LIST];
    LIST.clear(); saveList(); route();
    toast(`Cleared ${before.length} ${before.length === 1 ? 'plant' : 'plants'}`, { action: 'Undo', onAction: () => { LIST = new Set(before); saveList(); route(); } });
  });
  app.querySelector('#quoteList').addEventListener('click', () => {
    let added = 0;
    for (const p of items) if (!CART.some(l => l.key === 'plant:' + p.id)) { CART.push({ key: 'plant:' + p.id, qty: 1 }); added++; }
    saveCart();
    toast(added ? `${added} plants added to your bag for a quote` : 'These plants are already in your bag', { action: 'View bag', onAction: () => (location.hash = '#/cart') });
  });
  app.querySelector('#copyList').addEventListener('click', async () => {
    const text = items.map(p => `${p.n}${p.c[0] ? ' (' + p.c[0] + ')' : ''} — ${p.light.join(', ')}; ${p.h}`).join('\n');
    try { await navigator.clipboard.writeText(text); toast(`Copied ${items.length} plants`); }
    catch { toast('Couldn’t copy to the clipboard in this browser.', { error: true }); }
  });
}

/* ---------- Shop ---------- */
function prodCard(s, wide = false) {
  const inBag = CART.some(l => l.key === 'shop:' + s.id);
  return `<article class="prod ${wide ? 'prod--wide' : ''}">
    <a class="prod__img" href="#/shop/${s.id}" tabindex="-1" aria-hidden="true">${img(s.photos[0], '')}</a>
    <span class="prod__cat">${icon(SHOP_ICON[s.cat] || 'tag', 12)}${esc(s.cat)}</span>
    <a class="prod__name" href="#/shop/${s.id}">${esc(s.name)}</a>
    <div class="prod__row">
      ${s.price != null ? `<span class="price">${inr(s.price)}</span>` : '<span class="price price--ask">Price on request</span>'}
      <button type="button" class="btn add ${inBag ? 'is-added' : ''}" data-add="${s.id}" aria-label="${inBag ? 'In bag' : 'Add'} ${esc(s.name)}">${icon(inBag ? 'check' : 'plus', 13)}${inBag ? 'In bag' : s.price != null ? 'Add' : 'Quote'}</button>
    </div>
  </article>`;
}
function bindAdds() {
  app.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', () => {
    const key = 'shop:' + b.dataset.add;
    if (CART.some(l => l.key === key)) { location.hash = '#/cart'; return; }
    addToCart(key);
    b.classList.add('is-added'); b.innerHTML = `${icon('check', 13)}In bag`;
  }));
}

// Grouped by use, from the catalogue's own categories
const SHOP_GROUPS = [
  ['Pots & planters', 'Ceramic, cement and terracotta pots, planters and hanging baskets.', ['Pots', 'Planters', 'Hanging baskets']],
  ['Supports & shade', 'Coir sticks for climbers, shade nets and weed mats for growing areas.', ['Coir sticks', 'Shade nets & weed mats']],
  ['Garden & décor', 'Furniture, water features, stones and flower-arranging accessories.', ['Garden furniture', 'Decorative stones', 'Flower arranging']],
  ['Memberships', 'Professional access to the full plant records.', ['Memberships']],
];
const slugify = t => t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
function viewShop(params) {
  setNav('shop');
  const cat = params.get('cat') || '';
  const items = cat ? SHOP.filter(s => s.cat === cat) : SHOP.slice().sort((a, b) => (a.kind === 'membership') - (b.kind === 'membership'));
  const priced = SHOP.filter(s => s.price != null).length;
  app.innerHTML = `<div class="view-in">
    <div class="shop-head">
      <div><h1>Shop</h1><p>Garden accessories from Tukai Exotics, Pune, and Indiaplants memberships. ${priced} items have listed prices; the other ${SHOP.length - priced} are quoted on request, as are plants.</p></div>
      <a class="btn" href="#/cart">${icon('cart', 14)}Bag${CART.length ? ` · ${CART.reduce((n, l) => n + l.qty, 0)}` : ''}</a>
    </div>
    <nav class="shop-tabs" aria-label="Shop categories">
      <a href="#/shop" aria-current="${!cat}">${icon('store', 13)}All <small>${SHOP.length}</small></a>
      ${SHOP_CATS.map(c => `<a href="${href({ cat: c.name }, '#/shop')}" aria-current="${cat === c.name}">${icon(SHOP_ICON[c.name] || 'tag', 13)}${esc(c.name)} <small>${c.count}</small></a>`).join('')}
    </nav>
    ${!items.length ? `<div class="empty"><div class="empty__icon">${icon('store', 20)}</div><h2>Nothing in this category</h2><p><a class="link" href="#/shop">See all items ${icon('arrow', 14)}</a></p></div>`
      : cat ? `<div class="shop-grid">${items.map(s => prodCard(s)).join('')}</div>`
      : SHOP_GROUPS.map(([title, note, cats]) => {
          const list = SHOP.filter(s => cats.includes(s.cat));
          return list.length ? `<section class="shop-group" aria-labelledby="g-${slugify(title)}"><div class="shop-group__head"><h2 id="g-${slugify(title)}">${title}</h2><p>${note}</p></div><div class="shop-grid">${list.map(s => prodCard(s)).join('')}</div></section>` : '';
        }).join('')}
  </div>`;
  bindAdds();
}

function viewProduct(id) {
  setNav('shop');
  const s = SHOP_BY_ID.get(id);
  if (!s) {
    app.innerHTML = `<div class="empty view-in" role="alert"><div class="empty__icon">${icon('alert', 20)}</div><h2>This item isn't available</h2><p>It may have been removed from the catalogue.</p><a class="btn btn--primary" href="#/shop">${icon('store', 14)}Back to the shop</a></div>`;
    return;
  }
  const shots = s.photos.map(f => ({ f, t: f }));
  const more = SHOP.filter(x => x !== s && x.cat === s.cat).concat(SHOP.filter(x => x !== s && x.cat !== s.cat)).slice(0, 4);
  let qty = 1;
  app.innerHTML = `<div class="view-in">
    <nav class="crumbs" aria-label="Breadcrumb"><a href="#/shop">${icon('store', 12)}Shop</a><span aria-hidden="true">/</span><a href="${href({ cat: s.cat }, '#/shop')}">${esc(s.cat)}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(s.name)}</span></nav>
    <div class="prod-detail">
      ${gallery(shots, s.name, s.name)}
      <div class="info">
        <span class="label">${icon(SHOP_ICON[s.cat] || 'tag', 12)}${esc(s.cat)}</span>
        <h1 style="margin-top:8px">${esc(s.name)}</h1>
        <div style="margin-top:12px">${s.price != null ? `<span class="price">${inr(s.price)}</span>` : '<span class="price price--ask">Price on request — we reply with a quote</span>'}</div>
        <div class="buy">
          <div class="qty" role="group" aria-label="Quantity"><button type="button" data-q="-1" aria-label="Decrease quantity" disabled>${icon('minus', 13)}</button><output id="qty" aria-live="polite">1</output><button type="button" data-q="1" aria-label="Increase quantity">${icon('plus', 13)}</button></div>
          <button type="button" class="btn btn--primary btn--lg" id="addBtn">${icon('bag', 14)}${s.price != null ? 'Add to bag' : 'Add to quote request'}</button>
        </div>
        <div class="longform" style="margin-top:0;padding-top:16px;grid-template-columns:1fr"><section><h2>${icon('note', 16)}About this item</h2>${para(s.desc)}</section></div>
      </div>
    </div>
    ${more.length ? `<section class="section"><div class="section__head"><div><h2>More from the shop</h2></div></div><div class="shop-grid">${more.map(x => prodCard(x)).join('')}</div></section>` : ''}
  </div>`;
  bindGallery(shots, s.name);
  bindAdds();
  const out = app.querySelector('#qty'), dec = app.querySelector('[data-q="-1"]');
  app.querySelectorAll('[data-q]').forEach(b => b.addEventListener('click', () => { qty = Math.min(99, Math.max(1, qty + +b.dataset.q)); out.textContent = qty; dec.disabled = qty <= 1; }));
  app.querySelector('#addBtn').addEventListener('click', () => addToCart('shop:' + s.id, qty));
}

/* ---------- Bag / checkout ---------- */
function viewCart() {
  setNav('cart');
  const lines = CART.map(l => ({ ...l, it: cartItem(l.key) })).filter(l => l.it);
  if (!lines.length) {
    app.innerHTML = `<div class="empty view-in"><div class="empty__icon">${icon('cart', 20)}</div><h1 style="margin-bottom:10px">Your bag is empty</h1><p>Add accessories or memberships from the shop, or use “Enquire to buy” on any plant to request a quote.</p><div style="display:flex;gap:6px"><a class="btn btn--primary" href="#/shop">${icon('store', 14)}Go to the shop</a><a class="btn" href="#/plants">${icon('list', 14)}Browse plants</a></div></div>`;
    return;
  }
  const priced = lines.filter(l => l.it.price != null), quote = lines.filter(l => l.it.price == null);
  const subtotal = priced.reduce((n, l) => n + l.it.price * l.qty, 0);
  const lineHtml = l => `<div class="line" data-key="${l.key}">
    <a class="line__img" href="${l.it.href}" tabindex="-1" aria-hidden="true">${img(l.it.img, '')}</a>
    <div><a class="line__name" href="${l.it.href}">${esc(l.it.name)}</a><small>${icon(l.kind === 'plant' ? 'sprout' : (SHOP_ICON[l.it.sub] || 'tag'), 11)} ${esc(l.it.sub)}</small></div>
    <div class="qty" role="group" aria-label="Quantity for ${esc(l.it.name)}"><button type="button" data-d="-1" aria-label="Decrease" ${l.qty <= 1 ? 'disabled' : ''}>${icon('minus', 12)}</button><output>${l.qty}</output><button type="button" data-d="1" aria-label="Increase">${icon('plus', 12)}</button></div>
    <span class="price">${l.it.price != null ? inr(l.it.price * l.qty) : '<span class="price--ask">Quote</span>'}</span>
    <button type="button" class="icon-btn" data-rmline aria-label="Remove ${esc(l.it.name)}">${icon('trash', 14)}</button>
  </div>`;
  const field = (id, label, ic, type = 'text', attrs = '', msg = '') => `<div class="field-row" data-f="${id}">
    <label for="f-${id}" class="ico">${icon(ic, 12)}${label}</label>
    ${type === 'textarea' ? `<textarea class="input" id="f-${id}" name="${id}" ${attrs}></textarea>` : `<input class="input" id="f-${id}" name="${id}" type="${type}" ${attrs}>`}
    <span class="field-msg" id="m-${id}">${icon('alert', 11)}${msg}</span>
  </div>`;

  app.innerHTML = `<div class="cart view-in">
    <div>
      <h1>Bag</h1>
      <p class="muted">${lines.reduce((n, l) => n + l.qty, 0)} items. Priced items are confirmed with payment details by phone; quote items get a price from the nursery first.</p>
      ${priced.length ? `<div class="cart__group"><span class="label">${icon('badge', 12)}Priced · ${priced.length}</span>${priced.map(lineHtml).join('')}</div>` : ''}
      ${quote.length ? `<div class="cart__group"><span class="label">${icon('note', 12)}For a quote · ${quote.length}</span>${quote.map(lineHtml).join('')}</div>` : ''}
    </div>
    <aside class="summary" aria-labelledby="sumTitle">
      <h2 id="sumTitle">Request summary</h2>
      <div class="sum-row"><span>Priced items</span><span class="num">${priced.reduce((n, l) => n + l.qty, 0)}</span></div>
      <div class="sum-row"><span>Quote items</span><span class="num">${quote.reduce((n, l) => n + l.qty, 0)}</span></div>
      <div class="sum-row total"><span>Subtotal</span><span class="price">${inr(subtotal)}</span></div>
      <form class="form" id="checkout" novalidate>
        ${field('name', 'Full name', 'user', 'text', 'autocomplete="name" required', 'Enter your name')}
        ${field('phone', 'Mobile number', 'phone', 'tel', 'autocomplete="tel" inputmode="tel" placeholder="98765 43210" required', 'Enter a 10-digit Indian mobile number')}
        ${field('email', 'Email', 'mail', 'email', 'autocomplete="email" placeholder="optional"', 'That email address looks incomplete')}
        ${field('city', 'City', 'city', 'text', 'autocomplete="address-level2" required', 'Enter your city for delivery')}
        ${field('note', 'Notes for the nursery', 'note', 'textarea', 'placeholder="Sizes, quantities, delivery timing"')}
        <button class="btn btn--primary btn--lg" type="submit">${icon('arrow', 14)}Send request</button>
        <p class="note">${icon('info', 12)}Prototype: requests are not sent anywhere yet.</p>
      </form>
    </aside>
  </div>`;

  app.querySelectorAll('.line').forEach(row => {
    const key = row.dataset.key;
    row.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { const l = CART.find(x => x.key === key); l.qty = Math.min(99, Math.max(1, l.qty + +b.dataset.d)); saveCart(); keepScroll(route); }));
    row.querySelector('[data-rmline]').addEventListener('click', () => {
      const i = CART.findIndex(x => x.key === key), removed = CART[i];
      CART.splice(i, 1); saveCart(); keepScroll(route);
      toast(`${cartItem(key).name} removed`, { action: 'Undo', onAction: () => { CART.splice(i, 0, removed); saveCart(); keepScroll(route); } });
    });
  });

  const form = app.querySelector('#checkout');
  const rules = {
    name: v => v.trim().length >= 2,
    phone: v => /^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/.test(v.trim()),
    email: v => !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    city: v => v.trim().length >= 2,
    note: () => true,
  };
  const check = (name, show = true) => {
    const el = form.elements[name], ok = rules[name](el.value), row = el.closest('.field-row');
    if (show) { row.classList.toggle('is-invalid', !ok); row.classList.toggle('is-valid', ok && !!el.value.trim()); }
    el.setAttribute('aria-invalid', !ok);
    ok ? el.removeAttribute('aria-describedby') : el.setAttribute('aria-describedby', 'm-' + name);
    return ok;
  };
  Object.keys(rules).forEach(n => {
    const el = form.elements[n];
    el.addEventListener('blur', () => { if (el.value) check(n); });
    el.addEventListener('input', () => { if (el.closest('.field-row').classList.contains('is-invalid')) check(n); });
  });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const bad = Object.keys(rules).filter(n => !check(n));
    if (bad.length) {
      form.elements[bad[0]].focus();
      toast(`Check ${bad.length === 1 ? 'the highlighted field' : `${bad.length} highlighted fields`} before sending.`, { error: true });
      return;
    }
    const name = form.elements.name.value.trim().split(/\s+/)[0];
    dialog({
      title: `Request ready, ${name}`,
      body: `<p>${lines.length} ${lines.length === 1 ? 'item' : 'items'}${subtotal ? `, ${inr(subtotal)} in priced items` : ''}. Tukai Exotics would call <b>${esc(form.elements.phone.value.trim())}</b> to confirm${quote.length ? ' and quote the remaining items' : ''}.</p><p class="note">${icon('info', 12)}Not sent: online ordering isn't connected in this prototype.</p>`,
      actions: [{ label: 'Keep bag' }, { label: 'Clear bag', primary: true, icon: 'check', onClick: () => { CART = []; saveCart(); route(); toast('Bag cleared'); } }],
    });
  });
}

/* ---------- About ---------- */
function viewAbout() {
  setNav('about');
  app.innerHTML = `<div class="about view-in">
    <div class="about__intro">
      <h1>The Jagtap family, growing plants in Pune since 1975</h1>
      <p>Indiaplants is compiled by the people who propagate and sell these plants: Tukai Exotics, a wholesale nursery, and The Enchanted Gardens, its display garden.</p>
      <ol class="timeline" aria-label="Timeline">
        <li><b>1918</b><span>Sarjerao Jagtap moves to Pune from a drought-prone farming village.</span></li>
        <li><b>1975</b><span>Ramrao Jagtap turns his rose garden into a full-time nursery.</span></li>
        <li><b>1998</b><span>Tukai Exotics starts on a five-acre farm at Loni Kalbhor.</span></li>
        <li><b>2002</b><span>Tukai Exotics Plant CD-ROM released.</span></li>
        <li><b>Now</b><span>${nf.format(PLANTS.length)} plants online; 70 acres across five locations.</span></li>
      </ol>
    </div>
    <article>
      <h2>${icon('history', 18)}From a chemistry lab to a rose garden</h2>
      <p>Of Sarjerao Jagtap's eight children, Ramrao was the one devoted to plants. Dryland farming was too uncertain to be a career, so he took a Master's in inorganic chemistry, worked as a scientist at the National Chemical Laboratory, then started a factory making chromatography chemicals.</p>
      <p>Evenings in the garden were what he looked forward to. When neighbours in Pune cantonment kept asking to buy his roses, he began selling them, and in 1975 he made flower growing his full-time work. His wife Chandralekha, who grew up in Gwalior and studied Sanskrit, learned the trade alongside him.</p>
      <h2>${icon('box', 18)}Tukai Exotics — wholesale</h2>
      <p>Named after the deity of the family's ancestral village, Tukai Exotics grows everything it sells on its own farms, so plants arrive established and acclimatised. It supplies nurseries, garden shops, landscape architects, hotels, resorts and corporate clients.</p>
      <p>The range covers flowering pot plants all year, landscape climbers, groundcovers, shrubs and trees, bedding seedlings, palms, identified rose varieties, bromeliads, orchids, indoor plants, lawn grass, water lilies and new Poinsettia varieties.</p>
      <div class="address">${icon('pin', 15)}<div>Gat #253, opp. H.P. Terminus, Pune–Solapur Road, Loni Kalbhor, Pune 412 201<br>Wholesale only. Retail enquiries go to The Enchanted Gardens.</div></div>
      <h2>${icon('flower', 18)}The Enchanted Gardens — retail and display</h2>
      <p>A 12,000 m² display garden just before the Pune–Mumbai Expressway on the Pune side, and one of the largest in ${INDIA('India')}. Visitors can see the plants at full size, in flower, before choosing what to buy for a farmhouse, bungalow, apartment or indoor space.</p>
    </article>
  </div>`;
}

/* ---------- Where to find us ---------- */
const MAP_LINK = 'https://share.google/CZuie7KRDB4sdBHHI';
const MAP_EMBED = 'https://www.google.com/maps?q=Tukai+Exotics,+Pune+Solapur+Road,+Loni+Kalbhor,+Pune+412201&z=15&output=embed';
const PHONES = ['+91 83800 04025', '+91 98817 13953', '+91 88888 44282', '+91 98220 38323'];
const tel = n => `<a class="link" href="tel:${n.replace(/\s/g, '')}">${n}</a>`;

function viewContact() {
  setNav('contact');
  app.innerHTML = `<div class="view-in">
    <div class="page-head">
      <span class="mono muted">Visit · Call · Write</span>
      <h1>Where to find us</h1>
      <p>Two places near Pune: the wholesale nursery at Loni Kalbhor, and the retail display garden by the Mumbai–Pune Expressway.</p>
    </div>
    <div class="visit">
      <div class="map" id="map">
        <div class="map__placeholder">
          ${icon('pin', 22)}
          <strong>Tukai Exotics, Loni Kalbhor</strong>
          <p>The map loads from Google Maps. Google may set cookies when it loads.</p>
          <div class="map__actions">
            <button class="btn btn--primary" type="button" id="loadMap">${icon('pin', 14)}Show map</button>
            <a class="btn" href="${MAP_LINK}" target="_blank" rel="noopener">${icon('arrow', 14)}Open in Google Maps</a>
          </div>
        </div>
      </div>
      <div class="places">
        <section class="place">
          <span class="mono">01 · Wholesale nursery</span>
          <h2>Tukai Exotics</h2>
          <dl class="spec">
            <div class="spec__row"><dt>${icon('pin', 13)}Address</dt><dd>Gat #253, opp. H.P. Terminus,<br>Pune–Solapur Road, Loni Kalbhor,<br>Pune 412 201</dd></div>
            <div class="spec__row"><dt>${icon('user', 13)}Contact</dt><dd>Ms. Mayura S. Jagtap</dd></div>
            <div class="spec__row"><dt>${icon('phone', 13)}Phone</dt><dd class="stack">${PHONES.map(tel).join('')}</dd></div>
            <div class="spec__row"><dt>${icon('mail', 13)}Email</dt><dd><a class="link" href="mailto:sales@tukaiexotics.com">sales@tukaiexotics.com</a></dd></div>
            <div class="spec__row"><dt>${icon('box', 13)}Supplies</dt><dd>Wholesale only: nurseries, garden shops, landscape architects, hotels, resorts and corporate clients.</dd></div>
          </dl>
          <a class="btn" href="${MAP_LINK}" target="_blank" rel="noopener" style="margin-top:14px">${icon('arrow', 14)}Directions</a>
        </section>
        <section class="place">
          <span class="mono">02 · Retail &amp; display garden</span>
          <h2>The Enchanted Gardens</h2>
          <dl class="spec">
            <div class="spec__row"><dt>${icon('clock', 13)}Open</dt><dd>Every day of the year, 9:30 am – 5:30 pm</dd></div>
            <div class="spec__row"><dt>${icon('phone', 13)}Phone</dt><dd>${tel('+91 98817 13954')}</dd></div>
            <div class="spec__row"><dt>${icon('pin', 13)}From Mumbai</dt><dd>At the end of the Mumbai–Pune Expressway, keep right toward Pune/Satara. Within 2 km you reach the bridge over the Pawna; the garden is just after it, on the left.</dd></div>
            <div class="spec__row"><dt>${icon('pin', 13)}From Pune</dt><dd>About 2 km before the expressway starts, at the Pawna bridge. The garden is on the right before the bridge: cross it, U-turn and come back.</dd></div>
            <div class="spec__row"><dt>${icon('pot', 13)}Accessories</dt><dd>By M/s. Garden Essentials · Ms. Preeti Bhoite, ${tel('+91 98817 13961')}</dd></div>
          </dl>
        </section>
      </div>
    </div>
  </div>`;
  app.querySelector('#loadMap').addEventListener('click', () => {
    const box = app.querySelector('#map');
    box.innerHTML = `<iframe title="Map: Tukai Exotics, Loni Kalbhor, Pune" src="${MAP_EMBED}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
    const f = box.querySelector('iframe');
    const fail = setTimeout(() => toast('The map is taking a while. You can open it in Google Maps instead.', { error: true, action: 'Open', onAction: () => open(MAP_LINK, '_blank', 'noopener') }), 8000);
    f.addEventListener('load', () => clearTimeout(fail));
  });
}

/* ---------- Legal pages ---------- */
function legalPage({ nav, title, kicker, updated, intro, sections }) {
  setNav(nav);
  app.innerHTML = `<div class="view-in legal">
    <aside class="legal__toc" aria-label="On this page">
      <span class="label">${icon('list', 12)}On this page</span>
      <ol>${sections.map(([h], i) => `<li><button type="button" data-to="s${i}"><span class="mono">${String(i + 1).padStart(2, '0')}</span>${h}</button></li>`).join('')}</ol>
    </aside>
    <article>
      <span class="mono muted">${kicker}</span>
      <h1>${title}</h1>
      <p class="legal__meta">${icon('clock', 12)}${updated}</p>
      <p class="legal__intro">${intro}</p>
      ${sections.map(([h, body], i) => `<section id="s${i}"><h2><span class="mono">${String(i + 1).padStart(2, '0')}</span>${h}</h2>${body}</section>`).join('')}
      <div class="address">${icon('mail', 15)}<div>Questions about this page? Write to <a class="link" href="mailto:sales@tukaiexotics.com">sales@tukaiexotics.com</a> or see <a class="link" href="#/contact">where to find us</a>.</div></div>
    </article>
  </div>`;
  const btns = [...app.querySelectorAll('[data-to]')];
  btns.forEach(b => b.addEventListener('click', () => document.getElementById(b.dataset.to).scrollIntoView({ behavior: 'smooth', block: 'start' })));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) btns.forEach(b => b.classList.toggle('is-active', b.dataset.to === e.target.id));
  }), { rootMargin: '-30% 0px -60% 0px' });
  app.querySelectorAll('article section').forEach(s => io.observe(s));
  teardown = () => io.disconnect();
}

const ul = items => `<ul>${items.map(t => `<li>${t}</li>`).join('')}</ul>`;

function viewPrivacy() {
  legalPage({
    nav: 'privacy', title: 'Privacy policy', kicker: 'Legal', updated: 'Draft for review · November 2026',
    intro: 'This policy explains what Indiaplants collects, why, and what you can do about it. It covers this website only; other sites we link to have their own policies.',
    sections: [
      ['What we collect', `<p>We only collect personal information you choose to give us:</p>${ul(['<b>Sign-up:</b> name, email, and optionally mobile number, city, what describes you, and the topics you want to hear about.', '<b>Quote and order requests:</b> name, mobile number, email (optional), city and any notes you add.', '<b>Messages</b> you send us by email or phone.'])}<p>We do not ask for payment card details on this website.</p>`],
      ['How we use it', `${ul(['To answer the request you made: a quote, an order, or a question.', 'To send newsletters or offers <b>only if you ticked the box</b> asking for them. Every email will have a way to stop.', 'To keep records required by law, such as invoices.'])}<p>We do not sell your personal information.</p>`],
      ['Stored in your browser', `<p>Some features remember things on your own device using your browser's local storage. Nothing here is sent to us:</p>${ul(['<b>My list</b>: the plants you saved.', '<b>Bag</b>: the items you added for a quote or order.', '<b>Layout</b>: whether you prefer the grid or table view.'])}<p>You can clear these at any time from the My list and Bag pages, or by clearing your browser's site data.</p>`],
      ['Cookies, analytics and maps', `<p>This website does not currently use advertising or analytics cookies. If we add analytics, we will update this policy first.</p><p>The map on <a class="link" href="#/contact">Where to find us</a> is provided by Google Maps and only loads when you press <i>Show map</i>. Google may then set its own cookies under <a class="link" href="https://policies.google.com/privacy" target="_blank" rel="noopener">Google's privacy policy</a>.</p>`],
      ['Who we share it with', `<p>Only with people who help us fulfil your request (for example a courier for a delivery) and, when connected, the customer-records system we use to manage enquiries. They may use it only for that purpose.</p><p>We may also share information with government agencies or companies assisting us when the law requires it, or to prevent or investigate fraud. It is never shared with them for marketing.</p>`],
      ['How long we keep it', `<p>Enquiries are kept for as long as needed to serve you and for our records, then deleted. Newsletter details are kept until you unsubscribe.</p>`],
      ['Keeping it secure', `<p>Only authorised staff, agents and contractors who have agreed to keep it confidential can see your information.</p>`],
      ['Your choices', `${ul(['Ask what information we hold about you, and have it corrected or deleted.', 'Withdraw newsletter consent at any time.', 'Clear saved lists from your own browser.'])}<p>Write to us using the address below and we will respond within 30 days.</p>`],
      ['Changes to this policy', `<p>If we change this policy we will post the new version here with a new date. Changes apply from that date; they are not retroactive.</p>`],
    ],
  });
}

function viewTerms() {
  legalPage({
    nav: 'terms', title: 'Terms & conditions', kicker: 'Legal', updated: 'Draft for review · November 2026',
    intro: 'These terms apply when you use Indiaplants or ask Tukai Exotics for plants, accessories or memberships. By using the site you accept them.',
    sections: [
      ['Using the plant information', `<p>Plant growth depends on many local factors: climate, soil, water, light and care. Use the information here together with your own judgement about local conditions. Indiaplants cannot be held responsible for losses that come from using it.</p><p>The content changes often. We work to keep it accurate but do not claim it is free of errors, and we are not responsible for technical faults in showing it.</p>`],
      ['Copyright', `<p>All information, photographs and search results on this site belong to Indiaplants. Using the site gives you no ownership of them. No part may be copied, reproduced or translated in any form, including photocopying, recording, the internet or any storage and retrieval system, without our written permission. Unauthorised use may lead to action under Indian and international law.</p>`],
      ['Quotes and orders', `<p>Items with a listed price are confirmed with you by phone before payment. Items marked <i>Price on request</i>, and all plants, are quoted first; nothing is final until you accept the quote.</p><p>All prices and payments are in Indian Rupees (INR).</p>`],
      ['Where we deliver', `<p>Memberships are available anywhere. Plants and garden accessories are delivered within India only, to locations the courier company serves; because plants are perishable this keeps them fresh. If your exact location is not served, choose the nearest location that is and collect the parcel there.</p>`],
      ['Shipping and delivery', `${ul(['Shipping is calculated by product and location and confirmed with your quote.', 'Tracking details are shared when the courier provides them.', 'Delivery times depend on location and items; we aim to meet the quoted time but cannot guarantee it. Larger orders may arrive in more than one shipment.', 'Please give an accurate address and delivery instructions. We are not liable for loss or damage after delivery has been made as instructed.'])}`],
      ['Returns and replacements', `${ul(['Plants, seeds and accessories that arrive damaged are replaced free. If an item runs out of stock, we send a similar item of the same price.', 'If you have trouble growing a plant, tell us by email and we will help.', 'Memberships: if you are not satisfied within the first 2 weeks, we refund the subscription after a 25% processing charge.', 'We cannot refund when delivery fails because of a wrong address or phone number. Re-shipping is charged at double the shipping cost.'])}`],
      ['Cancelling an order', `<p>We reserve and prepare plants as soon as an order is confirmed, so a full refund is not possible. Orders can be cancelled up to 24 hours before shipping, with a 25% deduction for processing. The balance is refunded within 4 weeks of payment reaching our bank.</p>`],
      ['Changes to these terms', `<p>We may update these terms. The version on this page, with its date, is the one that applies.</p>`],
    ],
  });
}

/* ---------- Sign up ---------- */
const ROLES = ['Home gardener', 'Landscape architect or designer', 'Nursery or garden shop', 'Hotel or resort', 'Corporate or facility manager', 'Builder or developer', 'Student or college', 'Government department', 'Other'];
const INTERESTS = [['tips', 'Growing tips', 'sprout'], ['new', 'New arrivals', 'flower'], ['wholesale', 'Wholesale price lists', 'box'], ['visits', 'Garden visits & workshops', 'calendar']];

function viewSignup() {
  setNav('signup');
  app.innerHTML = `<div class="view-in signup">
    <div class="signup__aside">
      <span class="mono muted">Free account</span>
      <h1>Join Indiaplants</h1>
      <p>Get growing tips, new arrivals and garden visit dates from the growers at Tukai Exotics. Trade buyers can ask for wholesale price lists.</p>
      <ul class="ticks">
        <li>${icon('check', 14)}Seasonal care notes for Indian conditions</li>
        <li>${icon('check', 14)}First look at new varieties</li>
        <li>${icon('check', 14)}Workshops and open days at The Enchanted Gardens</li>
        <li>${icon('check', 14)}Unsubscribe from any email in one click</li>
      </ul>
    </div>
    <form class="form signup__form" id="signup" novalidate>
      <div class="field-row" data-f="name"><label for="s-name" class="ico">${icon('user', 12)}Full name</label><input class="input" id="s-name" name="name" autocomplete="name" required><span class="field-msg" id="sm-name">${icon('alert', 11)}Enter your name</span></div>
      <div class="field-row" data-f="email"><label for="s-email" class="ico">${icon('mail', 12)}Email</label><input class="input" id="s-email" name="email" type="email" autocomplete="email" required><span class="field-msg" id="sm-email">${icon('alert', 11)}Enter a valid email address</span></div>
      <div class="two">
        <div class="field-row" data-f="phone"><label for="s-phone" class="ico">${icon('phone', 12)}Mobile <em>optional</em></label><input class="input" id="s-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="98765 43210"><span class="field-msg" id="sm-phone">${icon('alert', 11)}Use a 10-digit Indian mobile number</span></div>
        <div class="field-row" data-f="city"><label for="s-city" class="ico">${icon('city', 12)}City</label><input class="input" id="s-city" name="city" autocomplete="address-level2" required><span class="field-msg" id="sm-city">${icon('alert', 11)}Enter your city</span></div>
      </div>
      <div class="field-row" data-f="role"><label for="s-role" class="ico">${icon('badge', 12)}What describes you?</label>
        <select class="input" id="s-role" name="role" required><option value="">Choose one</option>${ROLES.map(r => `<option>${r}</option>`).join('')}</select>
        <span class="field-msg" id="sm-role">${icon('alert', 11)}Choose the option closest to you</span></div>
      <fieldset class="field-row interests"><legend class="ico">${icon('tag', 12)}Send me</legend>
        <div class="choices">${INTERESTS.map(([v, t, ic]) => `<label class="pick"><input type="checkbox" name="interests" value="${v}"><span>${icon(ic, 13)}${t}</span></label>`).join('')}</div>
      </fieldset>
      <label class="check"><input type="checkbox" name="newsletter"><span>Email me the newsletter. I can unsubscribe at any time.</span></label>
      <div class="field-row" data-f="consent"><label class="check"><input type="checkbox" name="consent" required><span>I agree to the <a class="link" href="#/terms">terms</a> and <a class="link" href="#/privacy">privacy policy</a>.</span></label><span class="field-msg" id="sm-consent">${icon('alert', 11)}Please accept to continue</span></div>
      <button class="btn btn--primary btn--lg" type="submit" id="signupBtn">${icon('arrow', 14)}Create account</button>
      <p class="note">${icon('info', 12)}Prototype: sign-ups are not sent to a CRM yet.</p>
    </form>
  </div>`;

  const form = app.querySelector('#signup');
  const rules = {
    name: v => v.trim().length >= 2,
    email: v => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
    phone: v => !v.trim() || /^(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}$/.test(v.trim()),
    city: v => v.trim().length >= 2,
    role: v => !!v,
    consent: (_, el) => el.checked,
  };
  const check = n => {
    const el = form.elements[n], ok = rules[n](el.value, el), row = el.closest('.field-row');
    row.classList.toggle('is-invalid', !ok);
    row.classList.toggle('is-valid', ok && el.type !== 'checkbox' && !!el.value.trim());
    el.setAttribute('aria-invalid', !ok);
    ok ? el.removeAttribute('aria-describedby') : el.setAttribute('aria-describedby', 'sm-' + n);
    return ok;
  };
  Object.keys(rules).forEach(n => {
    const el = form.elements[n];
    el.addEventListener('blur', () => { if (el.value || el.type === 'checkbox') check(n); });
    el.addEventListener(el.tagName === 'SELECT' || el.type === 'checkbox' ? 'change' : 'input', () => { if (el.closest('.field-row').classList.contains('is-invalid')) check(n); });
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const bad = Object.keys(rules).filter(n => !check(n));
    if (bad.length) { form.elements[bad[0]].focus(); toast(`Check ${bad.length === 1 ? 'the highlighted field' : `${bad.length} highlighted fields`}.`, { error: true }); return; }
    const btn = form.querySelector('#signupBtn');
    btn.disabled = true; btn.innerHTML = `${icon('clock', 14)}Creating account…`;
    const lead = {
      name: form.elements.name.value.trim(), email: form.elements.email.value.trim(), phone: form.elements.phone.value.trim(),
      city: form.elements.city.value.trim(), role: form.elements.role.value,
      interests: [...form.querySelectorAll('[name="interests"]:checked')].map(i => i.value),
      newsletter: form.elements.newsletter.checked, consentAt: new Date().toISOString(), source: 'indiaplants-web',
    };
    try {
      const r = await submitSignup(lead);
      dialog({
        title: `Welcome, ${lead.name.split(/\s+/)[0]}`,
        body: `<p>Your account details are ready for <b>${esc(lead.email)}</b>.${lead.newsletter ? ' You chose to receive the newsletter.' : ''}</p>${r.connected ? '' : `<p class="note">${icon('info', 12)}Not sent: the CRM isn't connected in this prototype.</p>`}`,
        actions: [{ label: 'Browse plants', primary: true, icon: 'list', onClick: () => (location.hash = '#/plants') }],
      });
      form.reset(); form.querySelectorAll('.field-row').forEach(r2 => r2.classList.remove('is-valid', 'is-invalid'));
    } catch {
      toast('We couldn’t create your account just now. Please try again in a minute.', { error: true });
    } finally {
      btn.disabled = false; btn.innerHTML = `${icon('arrow', 14)}Create account`;
    }
  });
}

/* ---------- Phone menu ---------- */
const menuBtn = document.getElementById('menuBtn');
const menu = document.getElementById('menu');
function setMenu(open, focusSearch) {
  menu.hidden = !open;
  menuBtn.setAttribute('aria-expanded', open);
  menuBtn.lastChild.textContent = open ? 'Close' : 'Menu';
  if (open && focusSearch) menu.querySelector('input').focus();
}
menuBtn.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
document.getElementById('menuSearch').addEventListener('submit', e => { e.preventDefault(); setMenu(false); go({ q: e.target.q.value }); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); menuBtn.focus(); } });
// header height feeds the sticky hero stage
const navEl = document.getElementById('nav');
new ResizeObserver(() => document.documentElement.style.setProperty('--nav-h', navEl.querySelector('.nav__inner').offsetHeight + 'px')).observe(navEl);

/* ---------- Nav search with live suggestions ---------- */
const navForm = document.getElementById('navSearch');
const navInput = navForm.q;
const sug = document.getElementById('suggest');
let sugIndex = -1;
function renderSuggest() {
  const q = navInput.value.trim();
  if (q.length < 2 || !PLANTS.length) { closeSuggest(); return; }
  const hits = search(q);
  sugIndex = -1;
  sug.innerHTML = hits.slice(0, 6).map((p, i) => `<li role="option" id="sg${i}" aria-selected="false"><a href="#/plant/${p.id}">${p.g[0]?.t || p.img ? `<img src="${esc(p.g[0]?.t || p.img)}" alt="">` : '<span class="ph"></span>'}<span><span class="bot">${esc(p.n)}</span><small>${esc(commonOf(p))}</small></span></a></li>`).join('')
    + `<li class="all" role="option" id="sgAll" aria-selected="false"><a href="${href({ q })}">${hits.length ? `See all ${nf.format(hits.length)} results` : `No matches for “${esc(q)}”`}</a></li>`;
  sug.hidden = false; navInput.setAttribute('aria-expanded', 'true');
}
function closeSuggest() { sug.hidden = true; navInput.setAttribute('aria-expanded', 'false'); navInput.removeAttribute('aria-activedescendant'); }
navInput.addEventListener('input', renderSuggest);
navInput.addEventListener('focus', renderSuggest);
navInput.addEventListener('keydown', e => {
  const items = [...sug.querySelectorAll('li')];
  if (sug.hidden || !items.length) return;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    sugIndex = (sugIndex + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((li, i) => li.setAttribute('aria-selected', i === sugIndex));
    navInput.setAttribute('aria-activedescendant', items[sugIndex].id);
  } else if (e.key === 'Enter' && sugIndex >= 0) {
    e.preventDefault(); location.hash = items[sugIndex].querySelector('a').getAttribute('href'); closeSuggest(); navInput.blur();
  } else if (e.key === 'Escape') closeSuggest();
});
navForm.addEventListener('submit', e => { e.preventDefault(); closeSuggest(); go({ q: navInput.value }); navInput.blur(); });
document.addEventListener('pointerdown', e => { if (!document.getElementById('navSearchWrap').contains(e.target)) closeSuggest(); });
sug.addEventListener('click', () => { closeSuggest(); navInput.blur(); });
document.addEventListener('keydown', e => {
  if (e.key === '/' && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); navInput.focus(); navInput.select(); }
});
// Social links are placeholders until the client's accounts are ready.
document.querySelectorAll('[data-soon]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); toast(`${a.dataset.soon} link coming soon`); }));
document.getElementById('year').textContent = new Date().getFullYear();
const nav = document.getElementById('nav');
addEventListener('scroll', () => nav.classList.toggle('is-scrolled', scrollY > 4), { passive: true });

/* ---------- Router ---------- */
function route() {
  teardown?.(); teardown = null;
  document.title = 'Indiaplants';
  const [path, qs] = location.hash.replace(/^#/, '').split('?');
  const params = new URLSearchParams(qs || '');
  const [a, b] = (path || '/').split('/').filter(Boolean);
  if (a === 'plants') viewPlants(params);
  else if (a === 'plant') viewPlant(b);
  else if (a === 'categories') viewCategories();
  else if (a === 'about') viewAbout();
  else if (a === 'list') viewList();
  else if (a === 'shop' && b) viewProduct(b);
  else if (a === 'shop') viewShop(params);
  else if (a === 'cart') viewCart();
  else if (a === 'contact') viewContact();
  else if (a === 'privacy') viewPrivacy();
  else if (a === 'terms') viewTerms();
  else if (a === 'signup') viewSignup();
  else viewHome();
}
addEventListener('hashchange', () => { setMenu(false); route(); scrollTo({ top: 0 }); app.focus({ preventScroll: true }); closeSuggest(); });

hydrateIcons();
app.innerHTML = '<p class="muted" style="padding:48px 0" role="status">Loading plant records…</p>';
load().then(route).catch(() => {
  app.innerHTML = `<div class="empty" role="alert"><div class="empty__icon">${icon('alert', 20)}</div><h2>Plant records didn’t load</h2><p>The data file couldn’t be fetched. If you opened this page straight from disk, run it from a local server instead (see README).</p><button class="btn btn--primary" onclick="location.reload()">${icon('history', 14)}Try again</button></div>`;
});
