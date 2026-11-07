// One icon family: 16×16 grid, 1.5 stroke, round caps, currentColor.
const P = {
  search: '<circle cx="7" cy="7" r="4.6"/><path d="m13.5 13.5-3.2-3.2"/>',
  list: '<path d="M6 4h7.5M6 8h7.5M6 12h7.5"/><circle cx="2.8" cy="4" r=".6" fill="currentColor"/><circle cx="2.8" cy="8" r=".6" fill="currentColor"/><circle cx="2.8" cy="12" r=".6" fill="currentColor"/>',
  grid: '<rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="9" y="2.5" width="4.5" height="4.5" rx="1"/><rect x="2.5" y="9" width="4.5" height="4.5" rx="1"/><rect x="9" y="9" width="4.5" height="4.5" rx="1"/>',
  rows: '<path d="M2.5 4h11M2.5 8h11M2.5 12h11"/>',
  bag: '<path d="M3.2 5.5h9.6l-.8 8H4z"/><path d="M5.8 5.5V4.6a2.2 2.2 0 0 1 4.4 0v.9"/>',
  cart: '<path d="M3.2 5.5h9.6l-.8 8H4z"/><path d="M5.8 7.5V4.6a2.2 2.2 0 0 1 4.4 0v2.9"/>',
  sprout: '<path d="M8 14V8.5"/><path d="M8 8.5C8 5.8 6 4 3 4c0 2.8 2 4.5 5 4.5z"/><path d="M8 10c0-3 2.2-5 5-5 0 3-2.2 5-5 5z"/>',
  bookmark: '<path d="M4.2 2.5h7.6v11L8 10.9l-3.8 2.6z"/>',
  bookmarkOn: '<path d="M4.2 2.5h7.6v11L8 10.9l-3.8 2.6z" fill="currentColor"/>',
  sun: '<circle cx="8" cy="8" r="2.6"/><path d="M8 1.8v1.4M8 12.8v1.4M1.8 8h1.4M12.8 8h1.4M3.6 3.6l1 1M11.4 11.4l1 1M3.6 12.4l1-1M11.4 4.6l1-1"/>',
  shade: '<path d="M12.8 9.6A5.2 5.2 0 0 1 6.4 3.2a5.2 5.2 0 1 0 6.4 6.4z"/>',
  drop: '<path d="M8 2.2s4.3 4.6 4.3 7.6a4.3 4.3 0 0 1-8.6 0C3.7 6.8 8 2.2 8 2.2z"/>',
  dropLow: '<path d="M8 2.2s4.3 4.6 4.3 7.6a4.3 4.3 0 0 1-8.6 0C3.7 6.8 8 2.2 8 2.2z"/><path d="M5.8 10.2h4.4"/>',
  height: '<path d="M8 2v12M5.2 4.6 8 2l2.8 2.6M5.2 11.4 8 14l2.8-2.6"/>',
  spread: '<path d="M2 8h12M4.6 5.2 2 8l2.6 2.8M11.4 5.2 14 8l-2.6 2.8"/>',
  form: '<path d="M8 13.5V9"/><path d="M8 9c-3 0-4.8-1.8-4.8-4.2C3.2 3.4 5.4 2.5 8 2.5s4.8.9 4.8 2.3C12.8 7.2 11 9 8 9z"/>',
  clock: '<circle cx="8" cy="8" r="5.6"/><path d="M8 5v3.2l2 1.3"/>',
  flower: '<circle cx="8" cy="8" r="1.6"/><path d="M8 6.4C6.6 4.6 7 2.5 8 2.5s1.4 2.1 0 3.9zM9.6 8c1.8-1.4 3.9-1 3.9 0s-2.1 1.4-3.9 0zM8 9.6c1.4 1.8 1 3.9 0 3.9s-1.4-2.1 0-3.9zM6.4 8C4.6 9.4 2.5 9 2.5 8s2.1-1.4 3.9 0z"/>',
  calendar: '<rect x="2.5" y="3.5" width="11" height="10" rx="1.6"/><path d="M2.5 7h11M5.5 2v3M10.5 2v3"/>',
  palette: '<path d="M8 2.5a5.5 5.5 0 1 0 0 11c1 0 1.3-.7 1-1.4-.4-.9.2-1.6 1.1-1.6h1.4a2 2 0 0 0 2-2A5.8 5.8 0 0 0 8 2.5z"/><circle cx="5.3" cy="7" r=".7" fill="currentColor"/><circle cx="8" cy="5.2" r=".7" fill="currentColor"/><circle cx="10.7" cy="7" r=".7" fill="currentColor"/>',
  leaf: '<path d="M13.2 2.8C7.6 2.6 3 5 3 9.6c0 1.4.5 2.6 1.2 3.4"/><path d="M13.2 2.8c.4 5.6-2.4 10-7 10-.8 0-1.4-.1-2-.4"/><path d="M4.2 13c1.6-3.4 4-6 7-8"/>',
  family: '<path d="M8 14V6.5M8 9.5 4.6 7M8 8l3.4-2.6"/><circle cx="8" cy="4.2" r="1.7"/><circle cx="3.8" cy="6.4" r="1.2"/><circle cx="12.2" cy="5" r="1.2"/>',
  tag: '<path d="M2.5 2.5h5.2l5.8 5.8-5.2 5.2-5.8-5.8z"/><circle cx="5.3" cy="5.3" r=".9" fill="currentColor"/>',
  box: '<path d="M2.5 5 8 2.5 13.5 5v6L8 13.5 2.5 11z"/><path d="M2.5 5 8 7.5 13.5 5M8 7.5v6"/>',
  camera: '<rect x="2" y="4.5" width="12" height="8.5" rx="1.6"/><path d="M5.5 4.5 6.6 2.8h2.8l1.1 1.7"/><circle cx="8" cy="8.7" r="2.2"/>',
  pin: '<path d="M8 14s4.5-4.2 4.5-7.6a4.5 4.5 0 0 0-9 0C3.5 9.8 8 14 8 14z"/><circle cx="8" cy="6.4" r="1.6"/>',
  wave: '<path d="M1.8 6c1.5 0 1.5-1.2 3.1-1.2S6.4 6 8 6s1.6-1.2 3.1-1.2S12.7 6 14.2 6M1.8 10c1.5 0 1.5-1.2 3.1-1.2S6.4 10 8 10s1.6-1.2 3.1-1.2 1.6 1.2 3.1 1.2"/>',
  butterfly: '<path d="M8 5v8"/><path d="M8 7.5C6.6 4.4 2.5 2.8 2.5 5.4c0 1.9 1.8 3 5.5 2.1zM8 7.5c1.4-3.1 5.5-4.7 5.5-2.1 0 1.9-1.8 3-5.5 2.1z"/><path d="M8 9c-1.7 0-4 .9-3.6 2.6.4 1.4 2.6.9 3.6-1.2M8 9c1.7 0 4 .9 3.6 2.6-.4 1.4-2.6.9-3.6-1.2"/>',
  wind: '<path d="M2 6h7.5a2 2 0 1 0-2-2M2 9.5h10a2 2 0 1 1-2 2M2 13h4.5"/>',
  shield: '<path d="M8 2.2 13 4v4c0 3-2.2 5-5 5.8C5.2 13 3 11 3 8V4z"/><path d="m5.8 8 1.5 1.5 3-3"/>',
  small: '<path d="M8 13.5V8M5.6 10 8 13.5 10.4 10"/><path d="M2.5 13.5h11"/><path d="M8 8c0-2.3-1.6-3.8-4-3.8C4 6.5 5.6 8 8 8zM8 7c0-2 1.5-3.4 3.6-3.4 0 2-1.5 3.4-3.6 3.4z"/>',
  link: '<path d="M6.7 9.3l2.6-2.6M7.2 4.6l.9-.9a2.7 2.7 0 0 1 3.8 3.8l-.9.9M8.8 11.4l-.9.9a2.7 2.7 0 0 1-3.8-3.8l.9-.9"/>',
  copy: '<rect x="5.5" y="5.5" width="8" height="8" rx="1.6"/><path d="M10.5 5.5V3.6c0-.6-.5-1.1-1.1-1.1H3.6c-.6 0-1.1.5-1.1 1.1v5.8c0 .6.5 1.1 1.1 1.1h1.9"/>',
  x: '<path d="M4 4l8 8M12 4l-8 8"/>',
  check: '<path d="m3.5 8.4 3 3 6-6.4"/>',
  plus: '<path d="M8 3.5v9M3.5 8h9"/>',
  minus: '<path d="M3.5 8h9"/>',
  trash: '<path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.4 4.5l.6 9h6l.6-9"/>',
  left: '<path d="m10 3.5-4.5 4.5 4.5 4.5"/>',
  right: '<path d="m6 3.5 4.5 4.5L6 12.5"/>',
  arrow: '<path d="M3 8h10M9 4l4 4-4 4"/>',
  instagram: '<rect x="2.5" y="2.5" width="11" height="11" rx="3.2"/><circle cx="8" cy="8" r="2.6"/><circle cx="11.3" cy="4.7" r=".6" fill="currentColor"/>',
  facebook: '<path d="M9.2 14V8.6h1.9l.3-2.1H9.2V5.2c0-.6.2-1 1-1h1.2V2.3c-.2 0-.9-.1-1.6-.1-1.6 0-2.7 1-2.7 2.8v1.5H5.3v2.1h1.8V14"/>',
  youtube: '<rect x="1.8" y="3.6" width="12.4" height="8.8" rx="2.6"/><path d="M6.8 6v4l3.4-2z" fill="currentColor"/>',
  linkedin: '<rect x="2.5" y="2.5" width="11" height="11" rx="2"/><path d="M5.3 7v4M5.3 5.2v.1M7.8 11V7M7.8 8.8c0-1.1.7-1.8 1.6-1.8s1.4.6 1.4 1.7V11"/>',
  whatsapp: '<path d="M3.2 13l.8-2.6A5.6 5.6 0 1 1 6 12.3z"/><path d="M6.2 5.6c.2-.3.5-.3.7 0l.5 1c.1.3 0 .5-.2.7l-.3.3c.4.8 1 1.4 1.8 1.8l.3-.3c.2-.2.4-.3.7-.2l1 .5c.3.2.3.5 0 .7-.5.6-1.3.8-2 .5A5.6 5.6 0 0 1 5.8 7.6c-.3-.7-.1-1.5.4-2z"/>',
  xsocial: '<path d="M3 3l10 10M13 3L3 13"/>',
  lock: '<rect x="3.2" y="7" width="9.6" height="7" rx="1.6"/><path d="M5.3 7V5.2a2.7 2.7 0 0 1 5.4 0V7"/>',
  join: '<circle cx="6.5" cy="5.5" r="2.6"/><path d="M1.8 13.5c.5-2.4 2.4-3.9 4.7-3.9 1 0 1.9.3 2.6.8M12 8.5v5M9.5 11h5"/>',
  down: '<path d="M8 3v10M4 9l4 4 4-4"/>',
  back: '<path d="M13 8H3M7 4 3 8l4 4"/>',
  filter: '<path d="M2 4h12M4.5 8h7M7 12h2"/>',
  sort: '<path d="M5 2.5v11M2.5 11 5 13.5 7.5 11M11 13.5v-11M8.5 5 11 2.5 13.5 5"/>',
  alert: '<path d="M8 2.2 14.3 13H1.7z"/><path d="M8 6.5v3M8 11.3v.2"/>',
  info: '<circle cx="8" cy="8" r="5.8"/><path d="M8 7.3v3.6M8 5v.2"/>',
  badge: '<circle cx="8" cy="6.5" r="4"/><path d="m5.7 9.7-1 4.3L8 12.4l3.3 1.6-1-4.3"/>',
  fence: '<path d="M3 4.5 4.5 3 6 4.5V14H3zM10 4.5 11.5 3 13 4.5V14h-3zM6 7h4M6 11h4"/>',
  stone: '<path d="M3 11.5c0-3 2.2-6 5.2-6 2.9 0 4.8 2.6 4.8 5.2 0 1.6-1.4 2.8-5 2.8s-5-.7-5-2z"/>',
  pot: '<path d="M3 5.5h10l-1.4 8H4.4z"/><path d="M2.5 3.5h11v2h-11z"/>',
  net: '<path d="M2.5 3.5h11v9h-11zM2.5 6.5h11M2.5 9.5h11M6.2 3.5v9M9.8 3.5v9"/>',
  stick: '<path d="M8 2v12M5.5 4.5 8 6M10.5 6.5 8 8M5.5 9 8 10.5"/>',
  bench: '<path d="M2 7h12M3 7v5M13 7v5M2.5 10h11M4 4.5h8V7H4z"/>',
  vase: '<path d="M6 2.5h4M6.5 2.5v2C4 6 3.8 8.5 4.8 11c.6 1.6 1.6 2.5 3.2 2.5s2.6-.9 3.2-2.5c1-2.5.8-5-1.7-6.5v-2"/>',
  basket: '<path d="M2.5 7h11l-1.4 6.5H3.9z"/><path d="M5 7a3 3 0 0 1 6 0M2.5 2.5 5.5 7M13.5 2.5 10.5 7"/>',
  phone: '<path d="M4.6 2.5h2l1 3-1.5 1a7 7 0 0 0 3.4 3.4l1-1.5 3 1v2c0 .8-.7 1.4-1.5 1.3A11 11 0 0 1 3.3 4c-.1-.8.5-1.5 1.3-1.5z"/>',
  mail: '<rect x="2" y="3.5" width="12" height="9" rx="1.6"/><path d="m2.5 4.5 5.5 4.2 5.5-4.2"/>',
  user: '<circle cx="8" cy="5.5" r="2.8"/><path d="M2.8 13.6c.6-2.5 2.7-4 5.2-4s4.6 1.5 5.2 4"/>',
  note: '<path d="M3 2.5h7l3 3v8H3z"/><path d="M10 2.5v3h3M5.5 8.5h5M5.5 11h3"/>',
  city: '<path d="M2.5 13.5v-7l4-2v9M6.5 13.5V2.5l7 3v8M2 13.5h12M9 7h2M9 9.5h2"/>',
  history: '<path d="M2.8 8A5.2 5.2 0 1 0 4.4 4.3M2.5 2.5v2.5H5"/><path d="M8 5.2v3l2 1.2"/>',
  store: '<path d="M2.5 6.5 3.5 2.5h9l1 4M2.5 6.5c0 1.1.9 2 2 2s2-.9 2-2c0 1.1.9 2 1.5 2s1.5-.9 1.5-2c0 1.1.9 2 2 2s2-.9 2-2M3.5 8.4v5.1h9V8.4M6.5 13.5V11h3v2.5"/>',
  trap: '<path d="M8 14V9"/><path d="M8 9C5 9 2.5 7 2.5 4.5 5 4.5 8 6.5 8 9zM8 9c3 0 5.5-2 5.5-4.5C11 4.5 8 6.5 8 9z"/><path d="M3.6 4.8l-.8-1.2M5.2 5.4l-.4-1.3M12.4 4.8l.8-1.2M10.8 5.4l.4-1.3"/>',
};

export function icon(name, size = 16, cls = '') {
  const body = P[name];
  if (!body) return '';
  return `<svg class="${cls}" viewBox="0 0 16 16" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

// Hydrate static markup: <a data-icon="x">Label</a> gets the icon prepended;
// an empty <span data-icon="x"></span> is replaced by the icon.
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    if (el.dataset.iconDone) return;
    el.dataset.iconDone = '1';
    const svg = icon(el.dataset.icon, el.dataset.iconSize ? +el.dataset.iconSize : 16);
    if (el.tagName === 'SPAN' && !el.textContent.trim() && !el.children.length) el.outerHTML = svg;
    else el.insertAdjacentHTML('afterbegin', svg);
  });
}
