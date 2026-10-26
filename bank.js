// Data per bank: perbandingan antarbank dalam satu kelompok (BUMN, swasta nasional, milik asing, BPD) per kuartal
// (bank.html), halaman tiap bank (profil.html), dan sorotan di beranda. Perbandingan bebas 2–3 bank ada di banding.js.

import { $, $$, esc, lineChart } from './kit.js';
import { logoImg } from './orbit.js';
import { lucide } from './icons.js';
import { develop } from './ui.js';

// Kelompok perbandingan. "Asing" = bank milik asing: anak usaha bank luar negeri yang berbadan hukum Indonesia
// ditambah kantor cabang bank asing. Swasta nasional = bank swasta milik lokal.
export const BANK_GROUPS = [
  { key: 'bumn', name: 'BUMN' },
  { key: 'swasta', name: 'Swasta' },
  { key: 'asing', name: 'Asing' },
  { key: 'bpd', name: 'BPD' },
  { key: 'semua', name: 'Semua' }
];
export const GROUP_NAME = { bumn: 'BUMN dan anak usahanya', swasta: 'Swasta nasional', asing: 'Bank milik asing', bpd: 'Bank pembangunan daerah' };
const GROUP_SHORT = { bumn: 'BUMN', swasta: 'swasta', asing: 'asing', bpd: 'BPD' };
const GROUP_TITLE = { bumn: 'BUMN', swasta: 'Swasta', asing: 'Asing', bpd: 'BPD' };
export const GROUPS = ['bumn', 'swasta', 'asing', 'bpd'];
/** Keterangan kelompok satu bank; bank asing menyebut negara asal pemiliknya. */
export const groupLabel = (b) => (b.grup === 'asing' && b.milik ? (b.cabang ? `Cabang bank ${b.milik}` : `Milik ${b.milik}`) : GROUP_NAME[b.grup]);

// key, label, satuan, arah baik (tinggi/rendah/null), keterangan
export const METRICS = [
  { key: 'aset', label: 'Total aset', unit: 'T', good: 'tinggi', note: 'Ukuran bank: semua harta di neraca.' },
  { key: 'kredit', label: 'Kredit', unit: 'T', good: 'tinggi', note: 'Pinjaman yang disalurkan ke nasabah; pembiayaan untuk bank syariah.' },
  { key: 'dpk', label: 'DPK', unit: 'T', good: 'tinggi', note: 'Dana pihak ketiga: giro, tabungan, dan deposito nasabah.' },
  { key: 'laba', label: 'Laba bersih', unit: 'T', good: 'tinggi', note: 'Laba sejak Januari: Q1 tiga bulan, Q2 semester I, Q3 sembilan bulan, Q4 setahun.' },
  { key: 'npl', label: 'NPL', unit: '%', good: 'rendah', note: 'Porsi kredit bermasalah (gross); NPF untuk bank syariah. Makin rendah makin baik.' },
  { key: 'car', label: 'CAR', unit: '%', good: 'tinggi', note: 'Rasio kecukupan modal. Makin tinggi, makin tebal bantalan bank menahan kerugian.' },
  { key: 'casa', label: 'CASA', unit: '%', good: 'tinggi', note: 'Porsi dana murah (giro dan tabungan) dari seluruh simpanan. Makin tinggi, makin murah biaya dana.' },
  { key: 'ldr', label: 'LDR', unit: '%', good: null, note: 'Kredit dibanding simpanan. Tidak ada yang "terbaik": terlalu rendah berarti dana menganggur, terlalu tinggi berarti likuiditas ketat. Acuan BI sekitar 84–94%.' },
  { key: 'nim', label: 'NIM', unit: '%', good: 'tinggi', note: 'Margin bunga bersih: selisih bunga yang diterima dan dibayar, dibanding aset produktif.' }
];
const M = Object.fromEntries(METRICS.map((m) => [m.key, m]));
const PICKABLE = ['kredit', 'aset', 'dpk', 'laba', 'npl', 'car', 'casa', 'ldr'];
const SERIES = ['var(--s1)', 'var(--s2)', 'var(--s3)', 'var(--s4)', 'var(--s5)', 'var(--s6)', 'var(--s7)', 'var(--s8)'];

/* ---------- Kuartal ---------- */
const ROMAN = ['I', 'II', 'III', 'IV'];
export const qNum = (q) => +q.slice(5);
export const qYear = (q) => +q.slice(0, 4);
export const qLabel = (q) => `Q${qNum(q)} ${qYear(q)}`;
export const qShort = (q) => `Q${qNum(q)} ${String(qYear(q)).slice(2)}`;
export const qLong = (q) => `kuartal ${ROMAN[qNum(q) - 1]} ${qYear(q)}`;
export const qSpan = (q) => ['tiga bulan', 'semester I', 'sembilan bulan', 'setahun'][qNum(q) - 1];
export const prevYearQ = (q) => `${qYear(q) - 1}Q${qNum(q)}`;
export const prevQ = (q) => (qNum(q) === 1 ? `${qYear(q) - 1}Q4` : `${qYear(q)}Q${qNum(q) - 1}`);

export const valueAt = (b, q, key) => b.kuartal?.[q]?.[key] ?? null;

/** Pertumbuhan tahunan (persen) untuk angka rupiah: dihitung dari kuartal yang sama tahun lalu,
 *  atau angka yang disebut di rilis bila kuartal pembanding tidak tersedia. Untuk rasio: selisih poin. */
/** Apakah perbandingan q dengan tahun lalu melintasi perubahan cakupan data (misalnya dekonsolidasi anak usaha)? */
export const crossesBreak = (b, q, key) => Boolean(b.putus && b.putus.metrik.includes(key) && prevYearQ(q) < b.putus.kuartal && q >= b.putus.kuartal);

export function yoyAt(b, q, key) {
  const a = valueAt(b, q, key);
  const p = crossesBreak(b, q, key) ? null : valueAt(b, prevYearQ(q), key);
  if (a == null) return null;
  if (M[key].unit === '%') return p == null ? null : a - p;
  if (p != null && p > 0) return (a / p - 1) * 100;
  return b.kuartal?.[q]?.tumbuh_rilis?.[key] ?? null;
}

/** Laba satu kuartal saja (bukan kumulatif): Q1 apa adanya, kuartal lain dikurangi kuartal sebelumnya di tahun yang sama. */
export function quarterProfit(b, q) {
  const cur = valueAt(b, q, 'laba');
  if (cur == null) return null;
  if (qNum(q) === 1) return cur;
  const prev = valueAt(b, prevQ(q), 'laba');
  return prev == null ? null : cur - prev;
}

/** Kuartal terakhir yang sudah dilaporkan cukup banyak bank, sebagai pilihan awal perbandingan. */
export function defaultQuarter(banks, quarters, min = 10) {
  for (let i = quarters.length - 1; i >= 0; i--) {
    if (banks.filter((b) => valueAt(b, quarters[i], 'laba') != null).length >= min) return quarters[i];
  }
  return quarters[quarters.length - 1];
}
export const latestOf = (b, quarters) => [...quarters].reverse().find((q) => b.kuartal?.[q] && Object.keys(b.kuartal[q]).some((k) => M[k])) || null;

/* ---------- Format ---------- */
const nf = (d) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: d });
/** Angka triliun → "Rp1.646 T", "Rp31,2 T", "Rp2,4 T", "Rp698 M"; persen → "2,9%". */
export const fmtMetric = (key, v) => {
  if (v == null) return '–';
  if (M[key].unit === 'T') {
    // Rugi ditulis dengan tanda minus di depan: −Rp130 M.
    const sign = v < 0 ? '−' : '';
    const a = Math.abs(v);
    if (a < 1) return `${sign}Rp${nf(0).format(a * 1000)} M`;
    return `${sign}Rp${nf(a >= 100 ? 0 : a >= 10 ? 1 : 2).format(a)} T`;
  }
  return `${nf(2).format(v)}%`;
};
export const growthTag = (key, g) => {
  if (g == null) return '';
  const pct = M[key].unit === '%';
  const goodUp = M[key].good !== 'rendah';
  const dir = Math.abs(g) < (pct ? 0.005 : 0.05) ? 'flat' : g > 0 ? 'up' : 'down';
  const txt = pct ? `${g > 0 ? '+' : ''}${nf(2).format(g)} poin` : `${g > 0 ? '+' : ''}${nf(1).format(g)}%`;
  return `<span class="delta sm ${goodUp ? 'good-up ' : ''}${M[key].good ? dir : 'flat'}" title="Dibanding kuartal yang sama tahun lalu">${txt}</span>`;
};
export const star = (b, q, key) => ((b.kuartal?.[q]?.dihitung || []).includes(key) ? '<sup title="Dihitung dari angka laporan">*</sup>' : '');
export const metricLabel = (b, key) => (b.syariah && key === 'npl' ? 'NPF' : b.syariah && key === 'kredit' ? 'Pembiayaan' : b.syariah && key === 'ldr' ? 'FDR' : M[key].label);

/* ---------- Peringkat ---------- */
/** Urutkan menurut arah metrik pada kuartal q: terbaik dulu. Metrik tanpa arah (LDR) diurutkan dari terbesar. */
export function sortBy(list, key, q) {
  const m = M[key];
  const v = (b) => (q ? valueAt(b, q, key) : b[key]);
  return list.filter((b) => v(b) != null).sort((a, b) => (m.good === 'rendah' ? v(a) - v(b) : v(b) - v(a)));
}
/** Peringkat dalam daftar: 1 = terbaik menurut arah metrik. null bila tidak ada nilai atau metrik tanpa arah. */
export function rankIn(list, key, kode, q) {
  if (!M[key].good) return null;
  const vals = sortBy(list, key, q);
  const i = vals.findIndex((b) => b.kode === kode);
  return i < 0 ? null : { rank: i + 1, of: vals.length };
}
/** Nilai terbaik per kolom, hanya bila ada lebih dari satu bank yang melaporkan. */
export function bestOf(list, q) {
  const best = {};
  for (const c of METRICS) {
    if (!c.good) continue;
    const vals = list.map((b) => (q ? valueAt(b, q, c.key) : b[c.key])).filter((v) => v != null);
    if (vals.length > 1) best[c.key] = c.good === 'rendah' ? Math.min(...vals) : Math.max(...vals);
  }
  return best;
}

/* ---------- Alamat halaman ---------- */
/** Alamat halaman satu bank, misalnya profil.html?kode=BBRI. */
export const profileUrl = (kode, q) => `profil.html?kode=${encodeURIComponent(kode)}${q ? `&q=${q}` : ''}`;
/** Alamat halaman perbandingan dengan kelompok dan kuartal tertentu. */
export const compareUrl = (grup, q) => `bank.html?grup=${grup}${q ? `&q=${q}` : ''}`;
/** Alamat halaman adu 2–3 bank, misalnya banding.html?b=BBRI,BBCA. */
export const pairUrl = (kodes, q) => `banding.html?b=${kodes.map(encodeURIComponent).join(',')}${q ? `&q=${q}` : ''}`;

/** Jumlah kolom supaya baris kartu terisi rata: 5 kartu muat 5 kolom → 5; 6 kartu muat 5 kolom → 3 + 3. */
export function balancedCols(n, max) {
  if (n <= 0 || max <= 1) return 1;
  const rows = Math.ceil(n / max);
  return Math.ceil(n / rows);
}

/* ---------- Data bersama ---------- */
let DATA = null;
let BANKS = [];
let QS = [];
const COLOR = {};

function setData(data) {
  DATA = data;
  BANKS = data.bank;
  QS = data.kuartal;
  // Warna mengikuti bank, bukan peringkat: urutan tetap di dalam kelompoknya.
  for (const g of GROUPS) BANKS.filter((b) => b.grup === g).forEach((b, i) => { COLOR[b.kode] = SERIES[i % SERIES.length]; });
}
export const tick = (key) => (v) => (M[key].unit === '%' ? `${nf(1).format(v)}%` : nf(v >= 100 ? 0 : 1).format(v));
const pressed = (host, v) => $$('button', host).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
const onSeg = (host, fn) => host.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) fn(b.dataset.v); });
/** Ukuran bank untuk mengurutkan: aset, atau kredit bila aset tidak disebut. */
export const sizeAt = (b, q) => valueAt(b, q, 'aset') ?? (valueAt(b, q, 'kredit') != null ? valueAt(b, q, 'kredit') * 1.4 : null) ?? valueAt(b, q, 'dpk') ?? 0;
const bySize = (list, q) => [...list].sort((a, b) => sizeAt(b, q) - sizeAt(a, q));
/** Kode saham bila bank tercatat di bursa (14 bank utama memakai kode saham sebagai kode). */
export const tickerOf = (b) => b.saham || (b.ringkas ? null : b.kode);
/** Banyaknya kuartal yang berisi angka. */
const depth = (b) => QS.filter((x) => b.kuartal?.[x]).length;

/** Batang peringkat untuk satu metrik pada kuartal q. Baris bank `mark` disorot dan selalu tampil. */
function rankBars(list, key, q, mark = null, limit = Infinity) {
  const m = M[key];
  const sorted = sortBy(list, key, q);
  const max = Math.max(...sorted.map((b) => Math.abs(valueAt(b, q, key))), 1e-4);
  const missing = list.filter((b) => valueAt(b, q, key) == null);
  const shown = sorted.filter((b, i) => i < limit || b.kode === mark);
  const row = (b) => {
    const i = sorted.indexOf(b);
    const v = valueAt(b, q, key);
    return `<li><a class="bb${b.kode === mark ? ' on' : ''}" href="${profileUrl(b.kode, q)}"${b.kode === mark ? ' aria-current="page"' : ''}>
      <span class="bb-rank">${m.good ? i + 1 : ''}</span>${logoImg(b, 'logo-xs')}
      <span class="bb-name"><b>${esc(b.nama)}</b><small>${esc(groupLabel(b))}</small></span>
      <span class="bar${v < 0 ? ' neg' : ''}"><i style="width:${Math.max(2, (Math.abs(v) / max) * 100).toFixed(1)}%"></i></span>
      <span class="bb-val"><b>${fmtMetric(key, v)}${star(b, q, key)}</b>${growthTag(key, yoyAt(b, q, key))}</span>
    </a></li>`;
  };
  const more = sorted.length - shown.length;
  return shown.map(row).join('')
    + (more > 0 ? `<li><button type="button" class="bb-more" data-more="1">Tampilkan ${more} bank lainnya</button></li>` : '')
    + (missing.length ? `<li class="bb-missing">Belum ada angka ${M[key].label.toLowerCase()} ${qLabel(q)}: ${missing.length > 12 ? `${missing.length} bank` : missing.map((b) => esc(b.nama)).join(', ')}</li>` : '');
}

/* ---------- Halaman perbandingan (bank.html) ---------- */
const state = { group: 'bumn', metric: 'kredit', quarter: null, allCards: false, allBars: false };
const CARD_LIMIT = 12;
const BAR_LIMIT = 15;

export function renderBanks(data) {
  setData(data);
  const p = new URLSearchParams(location.search);
  if (BANK_GROUPS.some((g) => g.key === p.get('grup'))) state.group = p.get('grup');
  if (PICKABLE.includes(p.get('ukuran'))) state.metric = p.get('ukuran');
  state.quarter = QS.includes(p.get('q')) ? p.get('q') : defaultQuarter(BANKS, QS);
  $('#bank-group').innerHTML = BANK_GROUPS.map((g) => `<button type="button" data-v="${g.key}" aria-pressed="false">${g.name}<small>${g.key === 'semua' ? BANKS.length : BANKS.filter((b) => b.grup === g.key).length}</small></button>`).join('');
  $('#bank-metric').innerHTML = PICKABLE.map((k) => `<button type="button" data-v="${k}" aria-pressed="false">${M[k].label}</button>`).join('');
  $('#bank-quarter').innerHTML = QS.map((q) => {
    const n = BANKS.filter((b) => b.kuartal?.[q]).length;
    return `<button type="button" data-v="${q}" aria-pressed="false" title="${n} bank punya angka ${qLabel(q)}">${qShort(q)}</button>`;
  }).join('');
  onSeg($('#bank-group'), (v) => { state.group = v; state.allCards = false; state.allBars = false; draw(); });
  onSeg($('#bank-metric'), (v) => { state.metric = v; draw(false); });
  onSeg($('#bank-quarter'), (v) => { state.quarter = v; draw(); });
  $('#bank-cards-more').addEventListener('click', () => { state.allCards = !state.allCards; draw(false); });
  $('#bank-bars').addEventListener('click', (e) => { if (e.target.closest('[data-more]')) { state.allBars = true; draw(false); } });
  new ResizeObserver(fitCards).observe($('#bank-cards'));
  draw();
  // Gulir pilihan kuartal ke kanan supaya kuartal terbaru terlihat di layar sempit.
  const qs = $('#bank-quarter');
  qs.scrollLeft = qs.scrollWidth;
}

/** Kartu dibagi rata per baris, jadi tidak ada satu kartu yang tertinggal sendirian di baris terakhir. */
function fitCards() {
  const host = $('#bank-cards');
  const n = host.children.length;
  const max = Math.max(1, Math.floor((host.clientWidth + 12) / (228 + 12)));
  host.style.setProperty('--cols', balancedCols(n, max));
}

function groupList() {
  return state.group === 'semua' ? BANKS : BANKS.filter((b) => b.grup === state.group);
}

function draw(animateCards = true) {
  pressed($('#bank-group'), state.group);
  pressed($('#bank-metric'), state.metric);
  pressed($('#bank-quarter'), state.quarter);
  history.replaceState(null, '', `?${new URLSearchParams({ grup: state.group, q: state.quarter, ukuran: state.metric })}`);
  const list = groupList();
  const q = state.quarter;
  const key = state.metric;
  const m = M[key];
  const reported = bySize(list.filter((b) => b.kuartal?.[q]), q);
  const missing = list.filter((b) => !b.kuartal?.[q]);
  const who = state.group === 'semua' ? 'bank' : `bank ${GROUP_SHORT[state.group]}`;
  $('#bank-sub').textContent = `${qLabel(q)} (${qSpan(q)}) · ${reported.length} dari ${list.length} ${who} punya angka`;

  // Kartu bank yang punya angka di kuartal ini, terbesar dulu.
  const cards = state.allCards ? reported : reported.slice(0, CARD_LIMIT);
  $('#bank-cards').innerHTML = cards.map((b) => {
    const stat = (k) => `<span><small>${metricLabel(b, k)}</small><b>${fmtMetric(k, valueAt(b, q, k))}${star(b, q, k)}</b>${growthTag(k, yoyAt(b, q, k))}</span>`;
    return `<a class="bcard" href="${profileUrl(b.kode, q)}">
      <span class="bc-head">${logoImg(b, 'logo-sm')}<span class="bc-title"><b>${esc(b.nama)}</b><small>${esc(b.grup === 'asing' ? groupLabel(b) : tickerOf(b) || GROUP_NAME[b.grup])} · ${qLabel(q)}</small></span><span class="bc-go">${lucide('arrow-up-right')}</span></span>
      <span class="bc-stats">${stat('laba')}${stat('kredit')}${stat('npl')}${stat('car')}</span>
    </a>`;
  }).join('');
  const hidden = reported.length - cards.length;
  $('#bank-cards-more').hidden = reported.length <= CARD_LIMIT;
  $('#bank-cards-more').textContent = state.allCards ? 'Tampilkan lebih sedikit' : `Tampilkan ${hidden} bank lainnya`;
  $('#bank-cards-missing').textContent = missing.length
    ? `Belum ada angka ${qLabel(q)} untuk ${missing.length > 8 ? `${missing.length} bank` : missing.map((b) => b.nama).join(', ')}${missing.some((b) => b.ringkas) ? '. Bank tambahan baru punya angka Juni 2026 (Q2 26); kuartal lain menyusul' : ''}.`
    : '';
  fitCards();
  if (animateCards) develop($('#bank-cards'));

  // Batang perbandingan untuk metrik terpilih.
  $('#bank-bars-title').textContent = `${m.label}, ${state.group === 'semua' ? 'semua bank' : `antarbank ${GROUP_SHORT[state.group]}`}, ${qLabel(q)}`;
  $('#bank-bars-note').textContent = m.note;
  $('#bank-bars').innerHTML = rankBars(reported, key, q, null, state.allBars ? Infinity : BAR_LIMIT);

  drawTrend(list);

  // Tabel lengkap untuk kuartal terpilih.
  const best = bestOf(reported, q);
  $('#bank-table').innerHTML = `<thead><tr><th>Bank</th>${METRICS.map((c) => `<th class="num${c.key === key ? ' on' : ''}" title="${esc(c.note)}">${c.label}</th>`).join('')}</tr></thead>
    <tbody>${reported.map((b) => `<tr>
      <td><a class="tb-name" href="${profileUrl(b.kode, q)}">${logoImg(b, 'logo-xs')}<span><b>${esc(b.nama)}</b><small>${esc(b.grup === 'asing' ? groupLabel(b) : tickerOf(b) || GROUP_SHORT[b.grup])}</small></span></a></td>
      ${METRICS.map((c) => { const v = valueAt(b, q, c.key); return `<td class="num${best[c.key] != null && v === best[c.key] ? ' best' : ''}${c.key === key ? ' on' : ''}">${fmtMetric(c.key, v)}${star(b, q, c.key)}</td>`; }).join('')}
    </tr>`).join('')}</tbody>`;
  $('#bank-table-title').textContent = `Semua angka, ${qLabel(q)} (${reported.length} bank)`;
}

/** Garis tren kuartalan metrik terpilih. Hanya bank yang punya riwayat beberapa kuartal; paling banyak delapan terbesar. */
function drawTrend(list) {
  const key = state.metric;
  const q = state.quarter;
  const withHistory = list.filter((b) => depth(b) >= 4);
  const banks = bySize(withHistory, q).slice(0, 8);
  let note = '';
  if (withHistory.length > banks.length) note += ' Delapan bank terbesar saja supaya garisnya terbaca.';
  if (list.length > withHistory.length) note += ` ${list.length - withHistory.length} bank lain belum punya riwayat kuartalan di sini.`;
  const val = (b, x) => (key === 'laba' ? quarterProfit(b, x) : valueAt(b, x, key));
  const brk = (b) => (b.putus && b.putus.metrik.includes(key) ? [QS.indexOf(b.putus.kuartal)] : []);
  const series = banks.map((b, i) => ({ name: b.nama, values: QS.map((x) => val(b, x)), breaks: brk(b), color: state.group === 'semua' ? SERIES[i] : COLOR[b.kode] }))
    .filter((s) => s.values.some((v) => v != null));
  const broken = banks.filter((b) => brk(b).length);
  if (broken.length) note += ` Garis ${broken.map((b) => b.nama).join(', ')} diputus di ${broken.map((b) => qLabel(b.putus.kuartal)).join(', ')} karena ${broken.map((b) => b.putus.alasan).join('; ')}.`;
  $('#bank-trend-title').textContent = key === 'laba' ? 'Laba per kuartal' : `${M[key].label} per kuartal`;
  $('#bank-trend-note').textContent = (key === 'laba'
    ? 'Laba tiap kuartal saja, dihitung dari selisih laba kumulatif. Celah berarti salah satu kuartal tidak ditemukan di rilis.'
    : 'Celah berarti angka kuartal itu tidak ditemukan di rilis yang dikutip.') + note;
  if (!series.length) {
    $('#bank-trend').innerHTML = '<p class="note">Belum ada bank di kelompok ini dengan riwayat beberapa kuartal.</p>';
    return;
  }
  lineChart($('#bank-trend'), {
    labels: QS.map(qShort),
    series,
    area: false,
    dots: 'isolated',
    height: 250,
    fmt: (v) => fmtMetric(key, v),
    tick: tick(key),
    label: `${M[key].label} per kuartal`
  });
}

/* ---------- Halaman tiap bank (profil.html) ---------- */
const prof = { bank: null, q: null, metric: 'kredit', allPeers: false };
const PROFILE_TREND = ['kredit', 'aset', 'dpk', 'laba', 'npl', 'car', 'casa'];
const TABLE_KEYS = ['aset', 'kredit', 'dpk', 'laba', 'npl', 'car', 'casa', 'ldr', 'nim'];

export function renderProfile(data) {
  setData(data);
  const p = new URLSearchParams(location.search);
  const asked = (p.get('kode') || '').toUpperCase();
  const b = BANKS.find((x) => x.kode === asked) || BANKS[0];
  prof.bank = b;
  const qsWith = QS.filter((x) => b.kuartal?.[x]);
  // Kuartal awal: kuartal yang sudah dilaporkan sebagian besar bank (supaya bisa dibandingkan), bila bank ini punya.
  const common = defaultQuarter(BANKS, QS);
  prof.q = qsWith.includes(p.get('q')) ? p.get('q') : qsWith.includes(common) ? common : latestOf(b, QS);
  if (b.kode !== asked) history.replaceState(null, '', `?kode=${b.kode}`);
  document.title = `${b.nama}: laporan keuangan per kuartal · Peta Perbankan`;
  $('meta[name="description"]')?.setAttribute('content', `Aset, kredit, DPK, laba, NPL, CAR, CASA, dan LDR ${b.lengkap}, dibandingkan dengan bank ${GROUP_SHORT[b.grup]} lain.`);

  // Pindah bank: logo bank sekelompok (terbesar dulu) dan pilihan semua bank.
  const q0 = defaultQuarter(BANKS, QS);
  const peersSw = bySize(BANKS.filter((x) => x.grup === b.grup), q0).slice(0, 12);
  if (!peersSw.includes(b)) peersSw.push(b);
  const opts = GROUPS.map((g) => {
    const xs = BANKS.filter((x) => x.grup === g).sort((a, c) => a.nama.localeCompare(c.nama, 'id'));
    return xs.length ? `<optgroup label="${esc(GROUP_NAME[g])}">${xs.map((x) => `<option value="${esc(x.kode)}"${x.kode === b.kode ? ' selected' : ''}>${esc(x.nama)}</option>`).join('')}</optgroup>` : '';
  }).join('');
  $('#bank-switch').innerHTML = `<label class="sw-pick"><span class="sr-only">Pilih bank</span><select class="select" id="sw-select">${opts}</select></label>
    <div class="sw-group"><span class="sw-label">${esc(GROUP_TITLE[b.grup])}</span>${peersSw.map((x) => `<a class="sw${x.kode === b.kode ? ' on' : ''}" href="${profileUrl(x.kode)}"${x.kode === b.kode ? ' aria-current="page"' : ''} title="${esc(x.nama)}">${logoImg(x, 'logo-xs')}<span>${esc(x.nama)}</span></a>`).join('')}</div>`;
  $('#sw-select').addEventListener('change', (e) => { location.href = profileUrl(e.target.value); });
  const on = $('#bank-switch .sw.on');
  if (on) { const host = $('#bank-switch'); host.scrollLeft = on.offsetLeft - host.clientWidth / 2; }

  const first = qsWith[0];
  const src = (u) => esc(DATA.sumber?.[u] || u);
  const ticker = tickerOf(b);
  $('#pf-id').innerHTML = `<div class="pf-title">${logoImg(b, 'logo-lg')}<div><span class="kicker">${esc(b.grup === 'asing' && b.milik ? `${GROUP_NAME.asing} · ${b.milik}${b.cabang ? ', kantor cabang' : ''}` : GROUP_NAME[b.grup])}</span><h1 class="pf-name">${esc(b.nama)}</h1><p class="sub">${esc(b.lengkap)}${ticker ? ` · kode saham ${esc(ticker)}` : ''}</p></div></div>
    <p class="pf-profile">${esc(b.profil)}</p>
    ${b.terbaru ? `<p class="bd-news"><b>${lucide('trending-up')}Kabar terbaru</b>${esc(b.terbaru)}</p>` : ''}
    ${b.keterangan ? `<p class="bd-key">${lucide('info')}<span>${esc(b.keterangan)}</span></p>` : ''}
    <div class="pf-actions">${ticker ? `<a class="btn dark sm" href="https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat/${esc(ticker)}" target="_blank" rel="noopener">Laporan di IDX ${lucide('arrow-up-right')}</a>` : ''}${b.domain ? `<a class="btn ${ticker ? 'light' : 'dark'} sm" href="https://${esc(b.domain)}" target="_blank" rel="noopener">Situs bank ${lucide('arrow-up-right')}</a>` : ''}<a class="btn light sm" href="${pairUrl([b.kode])}">${lucide('scale')}Adu dengan bank lain</a><a class="btn light sm" href="${compareUrl(b.grup, prof.q)}">Semua bank ${esc(GROUP_SHORT[b.grup])} ${lucide('arrow-right')}</a></div>`;
  $('#pf-quarter').innerHTML = qsWith.map((x) => `<button type="button" data-v="${x}" aria-pressed="false">${qShort(x)}</button>`).join('');
  $('#pf-quarter').hidden = qsWith.length < 2;
  $('#pf-metric').innerHTML = PROFILE_TREND.map((k) => `<button type="button" data-v="${k}" aria-pressed="false">${k === 'laba' ? (qsWith.length > 1 ? 'Laba per kuartal' : 'Laba') : metricLabel(b, k)}</button>`).join('');
  onSeg($('#pf-quarter'), (v) => { prof.q = v; drawProfile(); });
  onSeg($('#pf-metric'), (v) => { prof.metric = v; drawProfile(false); });
  $('#pf-stats-sub').addEventListener('click', (e) => { const x = e.target.closest('[data-q]'); if (x) { prof.q = x.dataset.q; drawProfile(); } });
  $('#pf-peers').addEventListener('click', (e) => { if (e.target.closest('[data-more]')) { prof.allPeers = true; drawProfile(false); } });
  // Satu kuartal saja: grafik tren belum berarti, jadi posisi di antara bank sekelompok tampil selebar halaman.
  $('#pf-trend-card').hidden = qsWith.length < 2;
  $('#pf-grid').classList.toggle('one', qsWith.length < 2);

  $('#pf-table').innerHTML = `<thead><tr><th>Kuartal</th>${TABLE_KEYS.map((k) => `<th class="num">${metricLabel(b, k)}</th>`).join('')}</tr></thead>
    <tbody>${[...qsWith].reverse().map((x) => `<tr><td><b>${qLabel(x)}</b><small>${qSpan(x)}</small></td>${TABLE_KEYS.map((k) => `<td class="num">${fmtMetric(k, valueAt(b, x, k))}${star(b, x, k)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  $('#pf-table-sub').textContent = `${qsWith.length} kuartal${qsWith.length > 1 ? `, ${qLabel(first)} sampai ${qLabel(qsWith.at(-1))}` : `, ${qLabel(first)}`}. Laba kumulatif sejak Januari. Tanda – berarti angka itu tidak ditemukan di sumber yang dikutip; tanda * berarti dihitung dari angka laporan.`;
  $('#pf-sources').innerHTML = [...qsWith].reverse().map((x) => `<li><b>${qLabel(x)}</b>${(b.kuartal[x].sumber || []).map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${src(u)}</a>`).join('')}</li>`).join('');
  drawProfile();
  const qs = $('#pf-quarter');
  qs.scrollLeft = qs.scrollWidth;
}

function drawProfile(all = true) {
  const b = prof.bank;
  const q = prof.q;
  const key = prof.metric;
  const peers = BANKS.filter((x) => x.grup === b.grup && x.kuartal?.[q]);
  pressed($('#pf-quarter'), q);
  pressed($('#pf-metric'), key);
  if (all) {
    const stat = (k) => {
      const r = rankIn(peers, k, b.kode, q);
      const g = yoyAt(b, q, k);
      return `<div class="ds"><span class="stat-label">${metricLabel(b, k)}</span>
        <b>${fmtMetric(k, valueAt(b, q, k))}${star(b, q, k)}</b>
        <span class="ds-foot">${g != null ? growthTag(k, g) : ''}${r && r.of > 1 ? `<small>ke-${r.rank} dari ${r.of} bank ${GROUP_SHORT[b.grup]}</small>` : ''}</span></div>`;
    };
    const newest = latestOf(b, QS);
    $('#pf-stats-sub').innerHTML = `${qLabel(q)} (${qSpan(q)}) · pertumbuhan dibanding ${qLabel(prevYearQ(q))}${newest > q ? ` · <button type="button" class="linkish" data-q="${newest}">terbaru ${qLabel(newest)}</button>` : ''}`;
    $('#pf-stats').innerHTML = TABLE_KEYS.map(stat).join('');
    develop($('#pf-stats'));
  }
  // Tren bank ini.
  if (!$('#pf-trend-card').hidden) {
    const values = QS.map((x) => (key === 'laba' ? quarterProfit(b, x) : valueAt(b, x, key)));
    const breaks = b.putus && b.putus.metrik.includes(key) ? [QS.indexOf(b.putus.kuartal)] : [];
    $('#pf-trend-title').textContent = key === 'laba' ? 'Laba per kuartal' : `${metricLabel(b, key)} per kuartal`;
    lineChart($('#pf-chart'), { labels: QS.map(qShort), series: [{ name: b.nama, values, breaks, color: 'var(--accent)' }], area: false, dots: 'isolated', height: 230, fmt: (v) => fmtMetric(key, v), tick: tick(key), label: `${M[key].label} ${b.nama}` });
  }
  // Posisi di antara bank sekelompok untuk ukuran yang sama.
  $('#pf-peers-title').textContent = `${metricLabel(b, key)} antarbank ${GROUP_SHORT[b.grup]}, ${qLabel(q)}`;
  $('#pf-peers-note').textContent = key === 'laba' ? 'Laba kumulatif sejak Januari, dibandingkan pada kuartal yang sama.' : M[key].note;
  $('#pf-peers').innerHTML = rankBars(peers, key, q, b.kode, prof.allPeers ? Infinity : BAR_LIMIT);
}

/* ---------- Beranda ---------- */
/** Tiga rekor kuartal terakhir dan ringkasan tiap kelompok untuk halaman depan. */
export function renderHome(data) {
  setData(data);
  const q = defaultQuarter(BANKS, QS);
  const top = (key) => sortBy(BANKS, key, q)[0];
  const facts = [
    { key: 'kredit', label: 'Kredit terbesar' },
    { key: 'laba', label: `Laba tertinggi, ${qSpan(q)}` },
    { key: 'npl', label: 'NPL terendah' }
  ].map((f) => ({ ...f, b: top(f.key) })).filter((f) => f.b);
  $('#hero-facts').innerHTML = facts.map((f) => `<a class="fact" href="${profileUrl(f.b.kode, q)}"><small>${esc(f.label)}</small><b>${fmtMetric(f.key, valueAt(f.b, q, f.key))}</b><span>${logoImg(f.b, 'logo-xs')}${esc(f.b.nama)}</span></a>`).join('');
  $('#hero-facts-q').textContent = `${qLabel(q)}, ${BANKS.filter((b) => b.kuartal?.[q]).length} bank`;

  const COLS = ['kredit', 'laba', 'npl', 'car'];
  const SHOW = 7;
  $('#sorotan').innerHTML = GROUPS.map((g) => {
    const all = BANKS.filter((b) => b.grup === g && b.kuartal?.[q]);
    const list = sortBy(all, 'kredit', q);
    const ordered = [...list, ...all.filter((b) => !list.includes(b))];
    const best = bestOf(all, q);
    const more = ordered.length - SHOW;
    return `<div class="card so">
      <div class="so-head"><div><span class="kicker">${esc(GROUP_NAME[g])}</span><h3>${all.length} bank, ${qLabel(q)}</h3></div><a class="so-go" href="${compareUrl(g, q)}" aria-label="Bandingkan bank ${esc(GROUP_SHORT[g])}">${lucide('arrow-right')}</a></div>
      <div class="table-wrap"><table class="tbl so-tbl"><thead><tr><th>Bank</th>${COLS.map((k) => `<th class="num">${M[k].label.replace('Laba bersih', 'Laba').replace('Total aset', 'Aset')}</th>`).join('')}</tr></thead>
      <tbody>${ordered.slice(0, SHOW).map((b) => `<tr><td><a class="tb-name" href="${profileUrl(b.kode, q)}">${logoImg(b, 'logo-xs')}<b>${esc(b.nama)}</b></a></td>${COLS.map((k) => { const v = valueAt(b, q, k); return `<td class="num${best[k] != null && v === best[k] ? ' best' : ''}">${fmtMetric(k, v)}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>
      ${more > 0 ? `<a class="so-more" href="${compareUrl(g, q)}">dan ${more} bank lainnya ${lucide('arrow-right')}</a>` : ''}
    </div>`;
  }).join('');
  $('#sorotan-sub').textContent = `Tujuh bank dengan kredit terbesar di tiap kelompok. Laba ${qSpan(q)} (kumulatif sejak Januari). Angka terbaik di kelompoknya ditebalkan. Bank asing = anak usaha bank luar negeri dan kantor cabang bank asing.`;
  return q;
}

/** Bank yang tampil di panggung logo: yang terbesar menurut aset atau kredit di kuartal pembanding. */
export function orbitBanks(data, n = 20) {
  setData(data);
  const q = defaultQuarter(BANKS, QS);
  return bySize(BANKS.filter((b) => b.kuartal?.[q]), q).slice(0, n);
}

/** Isi sisi belakang kartu di panggung 3D: laba kuartal terakhir bank itu. */
export function tileBack(b, quarters) {
  const q = latestOf(b, quarters);
  const g = q ? yoyAt(b, q, 'laba') : null;
  const grp = GROUP_TITLE[b.grup];
  return `<small>${esc(grp)}</small>
  <b>${fmtMetric('laba', q ? valueAt(b, q, 'laba') : null)}</b><span>laba ${q ? qLabel(q) : ''}</span>
  ${g != null ? `<em class="${g < 0 ? 'neg' : ''}">${g > 0 ? '+' : ''}${nf(1).format(g)}% setahun</em>` : ''}`;
}
