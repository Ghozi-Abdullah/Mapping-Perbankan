// Alat bantu bersama seri #30Hari30Website: format angka/tanggal Indonesia, ikon, dan grafik SVG kecil tanpa pustaka.

export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** JSON dari folder data/. Tidak memakai cache browser supaya data terbaru langsung terlihat. */
export async function getJSON(path) {
  const res = await fetch(path, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${path}: ${res.status}`);
  return res.json();
}

const nf = (d) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });
export const num = (n, d = 0) => (n == null || Number.isNaN(+n) ? '–' : nf(d).format(+n));
export const pct = (n, d = 1) => (n == null || Number.isNaN(+n) ? '–' : `${nf(d).format(+n)}%`);
export const signed = (n, d = 1, unit = '') => (n == null || Number.isNaN(+n) ? '–' : `${+n > 0 ? '+' : ''}${nf(d).format(+n)}${unit}`);
export function rupiah(n, short = false) {
  if (n == null || Number.isNaN(+n)) return '–';
  const v = +n;
  if (short) {
    const a = Math.abs(v);
    if (a >= 1e15) return `Rp${nf(1).format(v / 1e15)} kuadriliun`;
    if (a >= 1e12) return `Rp${nf(1).format(v / 1e12)} T`;
    if (a >= 1e9) return `Rp${nf(1).format(v / 1e9)} M`;
    if (a >= 1e6) return `Rp${nf(1).format(v / 1e6)} jt`;
  }
  return `Rp${nf(0).format(Math.round(v))}`;
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const monthName = (m, short = false) => (short ? BLN : BULAN)[m];

/** Tanggal dalam WIB: "24 Okt 2026" (short) atau "Sabtu, 24 Oktober 2026" (long). Menerima ISO atau detik. */
export function date(v, style = 'short') {
  const d = toDate(v);
  if (!d) return '–';
  const w = new Date(d.getTime() + 7 * 3600e3);
  const day = w.getUTCDate();
  const m = w.getUTCMonth();
  const y = w.getUTCFullYear();
  if (style === 'long') return `${HARI[w.getUTCDay()]}, ${day} ${BULAN[m]} ${y}`;
  if (style === 'month') return `${BULAN[m]} ${y}`;
  if (style === 'dm') return `${day} ${BLN[m]}`;
  return `${day} ${BLN[m]} ${y}`;
}
export function time(v) {
  const d = toDate(v);
  if (!d) return '–';
  const w = new Date(d.getTime() + 7 * 3600e3);
  return `${String(w.getUTCHours()).padStart(2, '0')}.${String(w.getUTCMinutes()).padStart(2, '0')}`;
}
export function toDate(v) {
  if (v == null || v === '') return null;
  const d = typeof v === 'number' ? new Date(v < 1e12 ? v * 1000 : v) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}
/** "5 menit lalu", "3 jam lalu", "kemarin", lalu tanggal. */
export function ago(v, now = Date.now()) {
  const d = toDate(v);
  if (!d) return '–';
  const s = Math.max(0, (now - d.getTime()) / 1000);
  if (s < 90) return 'baru saja';
  if (s < 3600) return `${Math.round(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.round(s / 3600)} jam lalu`;
  if (s < 2 * 86400) return 'kemarin';
  if (s < 7 * 86400) return `${Math.round(s / 86400)} hari lalu`;
  return date(d);
}

/** Baris "Diperbarui ..." di header. */
export function updatedText(iso) {
  return iso ? `Diperbarui ${date(iso)}, ${time(iso)} WIB` : 'Menunggu penarikan data pertama';
}

// Ikon garis (stroke), dipakai lewat icon('nama').
const ICONS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 10v4M12 17.5v.01"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/>',
  link: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>',
  chart: '<path d="M4 20V4M4 20h16M8 16l3-4 3 2 5-7"/>',
  bank: '<path d="M3 10 12 4l9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18"/>',
  film: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  basket: '<path d="M4 9h16l-1.5 10a1 1 0 0 1-1 .9h-11a1 1 0 0 1-1-.9L4 9Z"/><path d="m8 9 4-5 4 5"/>',
  wave: '<path d="M2 12c2.5 0 2.5-6 5-6s2.5 12 5 12 2.5-12 5-12 2.5 6 5 6"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 16h15a3 3 0 1 1-3 3M3 12h8"/>',
  news: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 8h10M7 12h10M7 16h6"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
  code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
  pulse: '<path d="M3 12h4l2-6 4 12 2-6h6"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5Z"/><path d="M4 19a2 2 0 0 1 2-2h13"/>',
  calc: '<rect x="5" y="3" width="14" height="18" rx="3"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01"/>',
  play: '<path d="M8 5v14l11-7L8 5Z"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  star: '<path d="m12 3 2.7 5.9 6.3.7-4.7 4.3 1.3 6.3L12 17l-5.6 3.2 1.3-6.3L3 9.6l6.3-.7L12 3Z"/>',
  fire: '<path d="M12 21c4 0 6-2.7 6-6 0-4-3-5.5-4-9-2.5 2-3 4-3 6-1-.5-2-1.5-2-3-2 2-3 4-3 6 0 3.3 2 6 6 6Z"/>',
  mountain: '<path d="m3 19 6-10 4 6 2-3 6 7H3Z"/>'
};
export const icon = (name, cls = 'ic') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

// ---------------------------------------------------------------- grafik

const niceStep = (span, target = 4) => {
  const raw = span / target;
  const mag = 10 ** Math.floor(Math.log10(raw || 1));
  const n = raw / mag;
  return (n >= 5 ? 10 : n >= 2 ? 5 : n >= 1 ? 2 : 1) * mag;
};

/**
 * Grafik garis responsif dengan garis bantu dan tooltip saat disentuh/diarahkan.
 * opts: { labels: [..], series: [{ name, values: [..], cls: 's2' }], fmt: (v) => '', height: 220, area: true, min: 0 }
 */
export function lineChart(host, opts) {
  const { labels, series, fmt = (v) => num(v, 1), height = 220, area = true } = opts;
  host._opts = opts;
  if (!host._ro && 'ResizeObserver' in window) {
    host._ro = new ResizeObserver(() => {
      if (host._opts && Math.abs((host.clientWidth || 0) - (host._w || 0)) > 4) lineChart(host, host._opts);
    });
    host._ro.observe(host);
  }
  // Lebar SVG mengikuti lebar kartu supaya teks sumbu tetap 11px di layar mana pun.
  const W = Math.max(280, Math.round(host.clientWidth || 640));
  host._w = W;
  const H = W < 480 ? Math.round(height * 0.85) : height;
  const pad = { l: 44, r: 14, t: 12, b: 26 };
  const vals = series.flatMap((s) => s.values).filter((v) => v != null && !Number.isNaN(+v));
  if (!vals.length || labels.length < 2) {
    host.innerHTML = '<p class="note">Data grafik belum cukup.</p>';
    return;
  }
  let lo = opts.min != null ? Math.min(opts.min, ...vals) : Math.min(...vals);
  let hi = Math.max(...vals);
  if (lo === hi) { lo -= 1; hi += 1; }
  const step = niceStep(hi - lo, W < 480 ? 3 : 4);
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const x = (i) => pad.l + (i * (W - pad.l - pad.r)) / (labels.length - 1);
  const y = (v) => pad.t + ((hi - v) * (H - pad.t - pad.b)) / (hi - lo);
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(v);
  const last = labels.length - 1;
  // Jarak antarlabel mengikuti panjang label terpanjang supaya tidak saling tumpang.
  const labelW = Math.max(...labels.map((l) => String(l).length)) * 6.6 + 34;
  const every = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor((W - pad.l - pad.r) / labelW))));
  const showLabel = (i) => i === last || (i % every === 0 && last - i >= every);
  // breaks: indeks tempat garis sengaja diputus (misalnya perubahan cakupan data), meski kedua sisi berisi angka.
  const path = (vs, breaks = []) => vs.map((v, i) => (v == null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`)).reduce((acc, p, i) => {
    if (p == null) { acc.push(''); return acc; }
    if (breaks.includes(i) && acc[acc.length - 1]) acc.push('');
    acc[acc.length - 1] += (acc[acc.length - 1] ? ' L' : 'M') + p;
    return acc;
  }, ['']).filter(Boolean).join(' ');
  // dots: 'isolated' menandai titik yang tidak tersambung garis (tetangganya kosong) supaya tetap terlihat.
  const lone = (s) => (opts.dots !== 'isolated' ? '' : s.values.map((v, i) => {
    if (v == null) return '';
    const br = s.breaks || [];
    const left = i > 0 && s.values[i - 1] != null && !br.includes(i);
    const right = i < last && s.values[i + 1] != null && !br.includes(i + 1);
    return left || right ? '' : `<circle class="lone" cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3.5"${s.color ? ` style="fill:${s.color}"` : ''}/>`;
  }).join(''));
  host.classList.add('chart');
  host.innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opts.label || 'Grafik')}">
    <g class="axis">${ticks.map((t) => `<line class="grid-line" x1="${pad.l}" x2="${W - pad.r}" y1="${y(t)}" y2="${y(t)}"/><text x="${pad.l - 8}" y="${y(t) + 4}" text-anchor="end">${esc(opts.tick ? opts.tick(t) : num(t, step < 1 ? 1 : 0))}</text>`).join('')}
      ${labels.map((l, i) => (showLabel(i) ? `<text x="${x(i)}" y="${H - 6}" text-anchor="${i === last ? 'end' : i === 0 ? 'start' : 'middle'}">${esc(l)}</text>` : '')).join('')}</g>
    ${area && series.length === 1 ? `<path class="area" d="${path(series[0].values)} L${x(last)},${y(lo)} L${x(0)},${y(lo)} Z"/>` : ''}
    ${series.map((s) => `<path class="series ${s.cls || ''}" d="${path(s.values, s.breaks)}"${s.color ? ` style="stroke:${s.color}"` : ''}/>${lone(s)}`).join('')}
    <line class="cursor" y1="${pad.t}" y2="${H - pad.b}" x1="0" x2="0" visibility="hidden"/>
  </svg><div class="tip" hidden></div>`;
  if (series.length > 1) {
    host.insertAdjacentHTML('beforeend', `<div class="legend">${series.map((s) => `<span><i style="${s.color ? `background:${s.color}` : ''}" class="${s.cls || ''}"></i>${esc(s.name)}</span>`).join('')}</div>`);
  }
  const svg = host.querySelector('svg');
  const tip = host.querySelector('.tip');
  const cursor = host.querySelector('.cursor');
  const show = (ev) => {
    const r = svg.getBoundingClientRect();
    const px = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left) * (W / r.width);
    const i = Math.max(0, Math.min(last, Math.round(((px - pad.l) / (W - pad.l - pad.r)) * last)));
    cursor.setAttribute('x1', x(i));
    cursor.setAttribute('x2', x(i));
    cursor.setAttribute('visibility', 'visible');
    tip.hidden = false;
    tip.innerHTML = `<b>${esc(labels[i])}</b><br>${series.map((s) => `${series.length > 1 ? `<i class="tip-dot" style="background:${s.color || 'var(--accent)'}"></i>${esc(s.name)}: ` : ''}${esc(s.values[i] == null ? '–' : fmt(s.values[i]))}`).join('<br>')}`;
    const left = (x(i) / W) * r.width;
    tip.style.left = `${Math.min(Math.max(left, 70), r.width - 70)}px`;
    const top = Math.min(...series.map((s) => (s.values[i] == null ? H : y(s.values[i]))));
    tip.style.top = `${(top / H) * r.height}px`;
  };
  const hide = () => { tip.hidden = true; cursor.setAttribute('visibility', 'hidden'); };
  svg.addEventListener('pointermove', show);
  svg.addEventListener('pointerleave', hide);
  svg.addEventListener('touchstart', show, { passive: true });
}

/** Garis kecil tanpa sumbu untuk kartu angka. */
export function sparkline(values, w = 120, h = 34) {
  const vs = values.filter((v) => v != null);
  if (vs.length < 2) return '';
  const lo = Math.min(...vs);
  const hi = Math.max(...vs);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => (v == null ? null : `${(i * w) / (values.length - 1)},${h - 3 - ((v - lo) * (h - 6)) / span}`)).filter(Boolean);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts.join(' ')}" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/** Batang horizontal: [{ label, value, sub }] → baris dengan bar proporsional. */
export function barRows(items, fmt = (v) => num(v)) {
  const max = Math.max(...items.map((i) => Math.abs(i.value) || 0), 1);
  return items.map((it) => `<li class="bar-row"><span class="bar-label">${esc(it.label)}${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span>
    <span class="bar"><i style="width:${Math.max(2, (Math.abs(it.value) / max) * 100)}%;${it.color ? `background:${it.color}` : ''}"></i></span>
    <span class="bar-value">${esc(fmt(it.value))}</span></li>`).join('');
}
