// Peta petak 38 provinsi: tiap provinsi satu kotak, disusun kira-kira sesuai letaknya dari Aceh sampai Papua.
// Tidak butuh data batas wilayah, tetap terbaca di layar HP, dan semua provinsi punya ukuran sama.

import { esc } from './kit.js';

// [kode BPS, nama resmi, singkatan, kolom, baris]
export const PROVINSI = [
  ['11', 'Aceh', 'ACE', 0, 0],
  ['12', 'Sumatera Utara', 'SUT', 1, 1],
  ['13', 'Sumatera Barat', 'SUB', 1, 2],
  ['14', 'Riau', 'RIA', 2, 2],
  ['21', 'Kepulauan Riau', 'KRI', 3, 1],
  ['17', 'Bengkulu', 'BEN', 2, 3],
  ['15', 'Jambi', 'JAM', 3, 3],
  ['16', 'Sumatera Selatan', 'SUS', 3, 4],
  ['19', 'Kepulauan Bangka Belitung', 'BAB', 4, 4],
  ['18', 'Lampung', 'LAM', 4, 5],
  ['36', 'Banten', 'BTN', 5, 6],
  ['31', 'DKI Jakarta', 'JKT', 6, 5],
  ['32', 'Jawa Barat', 'JBR', 6, 6],
  ['33', 'Jawa Tengah', 'JTG', 7, 6],
  ['34', 'DI Yogyakarta', 'YOG', 7, 7],
  ['35', 'Jawa Timur', 'JTM', 8, 6],
  ['51', 'Bali', 'BAL', 9, 7],
  ['52', 'Nusa Tenggara Barat', 'NTB', 10, 7],
  ['53', 'Nusa Tenggara Timur', 'NTT', 11, 7],
  ['61', 'Kalimantan Barat', 'KBR', 6, 3],
  ['62', 'Kalimantan Tengah', 'KTG', 7, 3],
  ['63', 'Kalimantan Selatan', 'KSL', 8, 4],
  ['64', 'Kalimantan Timur', 'KTM', 8, 3],
  ['65', 'Kalimantan Utara', 'KUT', 8, 2],
  ['75', 'Gorontalo', 'GOR', 10, 2],
  ['71', 'Sulawesi Utara', 'SLU', 11, 2],
  ['72', 'Sulawesi Tengah', 'SLT', 10, 3],
  ['76', 'Sulawesi Barat', 'SLB', 9, 4],
  ['73', 'Sulawesi Selatan', 'SLS', 10, 4],
  ['74', 'Sulawesi Tenggara', 'SLG', 11, 4],
  ['82', 'Maluku Utara', 'MLU', 12, 2],
  ['81', 'Maluku', 'MAL', 12, 4],
  ['92', 'Papua Barat Daya', 'PBD', 13, 2],
  ['91', 'Papua Barat', 'PBR', 13, 3],
  ['94', 'Papua', 'PAP', 14, 2],
  ['96', 'Papua Tengah', 'PTG', 14, 3],
  ['97', 'Papua Pegunungan', 'PPG', 15, 3],
  ['95', 'Papua Selatan', 'PSL', 15, 4]
].map(([kode, nama, abbr, col, row]) => ({ kode, nama, abbr, col, row }));

export const BY_KODE = Object.fromEntries(PROVINSI.map((p) => [p.kode, p]));

const ALIAS = {
  'nanggroe aceh darussalam': '11', 'nad': '11', 'di aceh': '11',
  'north sumatera': '12', 'north sumatra': '12', 'sumut': '12',
  'west sumatera': '13', 'west sumatra': '13', 'sumbar': '13',
  'riau islands': '21', 'kepri': '21', 'kep riau': '21',
  'south sumatera': '16', 'south sumatra': '16', 'sumsel': '16',
  'bangka belitung': '19', 'bangka belitung islands': '19', 'kep bangka belitung': '19', 'babel': '19',
  'jakarta': '31', 'dki': '31', 'dki jakarta raya': '31', 'daerah khusus ibukota jakarta': '31', 'daerah khusus jakarta': '31',
  'west java': '32', 'jabar': '32', 'central java': '33', 'jateng': '33', 'east java': '35', 'jatim': '35',
  'yogyakarta': '34', 'di yogyakarta': '34', 'daerah istimewa yogyakarta': '34', 'diy': '34', 'special region of yogyakarta': '34',
  'west nusa tenggara': '52', 'ntb': '52', 'east nusa tenggara': '53', 'ntt': '53',
  'west kalimantan': '61', 'kalbar': '61', 'central kalimantan': '62', 'kalteng': '62', 'south kalimantan': '63', 'kalsel': '63',
  'east kalimantan': '64', 'kaltim': '64', 'north kalimantan': '65', 'kaltara': '65',
  'north sulawesi': '71', 'sulut': '71', 'central sulawesi': '72', 'sulteng': '72', 'south sulawesi': '73', 'sulsel': '73',
  'southeast sulawesi': '74', 'south east sulawesi': '74', 'sultra': '74', 'west sulawesi': '76', 'sulbar': '76',
  'north maluku': '82', 'malut': '82', 'west papua': '91', 'irian jaya barat': '91', 'southwest papua': '92', 'south west papua': '92',
  'central papua': '96', 'highland papua': '97', 'papua highlands': '97', 'south papua': '95', 'irian jaya': '94'
};

export const norm = (s) => String(s || '').toLowerCase()
  .replace(/\(.*?\)/g, ' ')
  .replace(/^\s*\d+[.)]?\s*/, '')
  .replace(/\bprov(insi|\.)?\b/g, ' ')
  .replace(/\bkep(ulauan|\.)?\b/g, 'kep')
  .replace(/\bd\.?\s?i\.?\s/g, 'di ')
  .replace(/[^a-z ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const BY_NORM = Object.fromEntries(PROVINSI.map((p) => [norm(p.nama), p.kode]));

/** Kode BPS dari nama provinsi apa pun (Indonesia/Inggris, singkatan, huruf besar). null bila bukan provinsi. */
export function kodeProvinsi(name) {
  if (name == null) return null;
  const raw = String(name).trim();
  if (/^\d{2}$/.test(raw) && BY_KODE[raw]) return raw;
  const n = norm(raw);
  return BY_NORM[n] || ALIAS[n] || BY_NORM[n.replace(/^kep /, 'kepulauan ')] || null;
}

/**
 * Gambar peta petak. values: { kode: angka }. opts: { fmt, label, low = 'baik', invert, onPick(kode) }
 * Warna satu rona (terang ke gelap) dibagi 5 kelas kuantil; provinsi tanpa data tetap tampil abu-abu.
 */
export function tileMap(host, values, opts = {}) {
  const fmt = opts.fmt || ((v) => String(v));
  const S = 46;
  const G = 5;
  const cols = 16;
  const rows = 8;
  const W = cols * S;
  const H = rows * S;
  const nums = Object.values(values).filter((v) => v != null && !Number.isNaN(+v)).map(Number).sort((a, b) => a - b);
  const q = (p) => nums[Math.min(nums.length - 1, Math.floor(p * nums.length))];
  const cuts = nums.length ? [q(0.2), q(0.4), q(0.6), q(0.8)] : [];
  const klass = (v) => {
    let k = 0;
    while (k < cuts.length && v > cuts[k]) k++;
    return opts.invert ? 4 - k : k;
  };
  const shades = [14, 30, 50, 72, 100];
  const fill = (k) => `color-mix(in oklab, var(--accent) ${shades[k]}%, #fff)`;
  const ink = (k) => (k >= 3 ? '#fff' : 'var(--ink)');
  host.classList.add('tilemap');
  host.innerHTML = `<div class="tm-scroll"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Peta provinsi')}">
    ${PROVINSI.map((p) => {
      const v = values[p.kode];
      const has = v != null && !Number.isNaN(+v);
      const k = has ? klass(+v) : -1;
      return `<g class="tile${has ? '' : ' none'}" data-kode="${p.kode}" tabindex="0" role="button" aria-label="${esc(p.nama)}: ${has ? esc(fmt(+v)) : 'tidak ada data'}">
        <rect x="${p.col * S + G / 2}" y="${p.row * S + G / 2}" width="${S - G}" height="${S - G}" rx="12" fill="${has ? fill(k) : 'var(--bg)'}"/>
        <text x="${p.col * S + S / 2}" y="${p.row * S + S / 2 + 4}" text-anchor="middle" fill="${has ? ink(k) : 'var(--ink-3)'}">${p.abbr}</text>
      </g>`;
    }).join('')}
  </svg></div><div class="tip" hidden></div>
  ${cuts.length ? `<div class="scale"><span>${esc(opts.lowLabel || 'Rendah')}</span>${shades.map((_, i) => `<i style="background:${fill(opts.invert ? 4 - i : i)}"></i>`).join('')}<span>${esc(opts.highLabel || 'Tinggi')}</span></div>` : ''}`;
  const tip = host.querySelector('.tip');
  const svg = host.querySelector('svg');
  const show = (g) => {
    const p = BY_KODE[g.dataset.kode];
    const v = values[p.kode];
    const r = svg.getBoundingClientRect();
    const h = host.getBoundingClientRect();
    tip.hidden = false;
    tip.innerHTML = `<b>${esc(p.nama)}</b><br>${v == null ? 'Tidak ada data' : esc(fmt(+v))}${opts.extra ? esc(opts.extra(p.kode) || '') : ''}`;
    tip.style.left = `${r.left - h.left + ((p.col + 0.5) * S * r.width) / W}px`;
    tip.style.top = `${r.top - h.top + (p.row * S * r.height) / H}px`;
  };
  host.querySelectorAll('.tile').forEach((g) => {
    g.addEventListener('pointerenter', () => show(g));
    g.addEventListener('focus', () => show(g));
    g.addEventListener('pointerleave', () => { tip.hidden = true; });
    g.addEventListener('blur', () => { tip.hidden = true; });
    g.addEventListener('click', () => opts.onPick && opts.onPick(g.dataset.kode));
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' && opts.onPick) opts.onPick(g.dataset.kode); });
  });
}
