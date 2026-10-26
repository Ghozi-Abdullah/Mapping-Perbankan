// Bagian "Per bank": perbandingan antarbank dalam satu kelompok (BUMN, swasta, BPD) per kuartal,
// tren kuartalan, dan lembar detail tiap bank.

import { $, $$, esc, lineChart } from './kit.js';
import { logoImg } from './orbit.js';
import { lucide } from './icons.js';
import { develop, liquidSeg } from './ui.js';

export const BANK_GROUPS = [
  { key: 'bumn', name: 'BUMN' },
  { key: 'swasta', name: 'Swasta' },
  { key: 'bpd', name: 'BPD' },
  { key: 'semua', name: 'Semua' }
];
export const GROUP_NAME = { bumn: 'BUMN', swasta: 'Swasta nasional', bpd: 'Bank pembangunan daerah' };
const GROUP_SHORT = { bumn: 'BUMN', swasta: 'swasta', bpd: 'BPD' };

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
    if (Math.abs(v) < 1) return `Rp${nf(0).format(v * 1000)} M`;
    return `Rp${nf(Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2).format(v)} T`;
  }
  return `${nf(2).format(v)}%`;
};
const growthTag = (key, g) => {
  if (g == null) return '';
  const pct = M[key].unit === '%';
  const goodUp = M[key].good !== 'rendah';
  const dir = Math.abs(g) < (pct ? 0.005 : 0.05) ? 'flat' : g > 0 ? 'up' : 'down';
  const txt = pct ? `${g > 0 ? '+' : ''}${nf(2).format(g)} poin` : `${g > 0 ? '+' : ''}${nf(1).format(g)}%`;
  return `<span class="delta sm ${goodUp ? 'good-up ' : ''}${M[key].good ? dir : 'flat'}" title="Dibanding kuartal yang sama tahun lalu">${txt}</span>`;
};
const star = (b, q, key) => ((b.kuartal?.[q]?.dihitung || []).includes(key) ? '<sup title="Dihitung dari angka laporan">*</sup>' : '');
const metricLabel = (b, key) => (b.syariah && key === 'npl' ? 'NPF' : b.syariah && key === 'kredit' ? 'Pembiayaan' : b.syariah && key === 'ldr' ? 'FDR' : M[key].label);

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

/* ---------- Tampilan ---------- */
const state = { group: 'bumn', metric: 'kredit', quarter: null };
let DATA = null;
let BANKS = [];
let QS = [];
let onGroup = () => {};
const COLOR = {};

export function renderBanks(data, opts = {}) {
  DATA = data;
  BANKS = data.bank;
  QS = data.kuartal;
  onGroup = opts.onGroup || onGroup;
  // Warna mengikuti bank, bukan peringkat: urutan tetap di dalam kelompoknya.
  for (const g of ['bumn', 'swasta', 'bpd']) BANKS.filter((b) => b.grup === g).forEach((b, i) => { COLOR[b.kode] = SERIES[i % SERIES.length]; });
  state.quarter = defaultQuarter(BANKS, QS);
  $('#bank-group').innerHTML = BANK_GROUPS.map((g) => `<button type="button" data-v="${g.key}" aria-pressed="false">${g.name}<small>${g.key === 'semua' ? BANKS.length : BANKS.filter((b) => b.grup === g.key).length}</small></button>`).join('');
  $('#bank-metric').innerHTML = PICKABLE.map((k) => `<button type="button" data-v="${k}" aria-pressed="false">${M[k].label}</button>`).join('');
  $('#bank-quarter').innerHTML = QS.map((q) => {
    const n = BANKS.filter((b) => valueAt(b, q, 'laba') != null).length;
    return `<button type="button" data-v="${q}" aria-pressed="false" title="${n} dari ${BANKS.length} bank sudah melapor">${qShort(q)}</button>`;
  }).join('');
  $('#bank-group').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.group = b.dataset.v; onGroup(b.dataset.v); draw(); } });
  $('#bank-metric').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.metric = b.dataset.v; draw(false); } });
  $('#bank-quarter').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.quarter = b.dataset.v; draw(); } });
  $('#per-bank').addEventListener('click', (e) => { const el = e.target.closest('[data-kode]'); if (el) openBank(el.dataset.kode); });
  $('#bank-sheet').addEventListener('close', () => {
    if (location.hash.startsWith('#bank-')) history.replaceState(null, '', location.pathname + location.search);
  });
  const fromHash = () => { const m = location.hash.match(/^#bank-([A-Z0-9]+)$/i); if (m) openBank(m[1].toUpperCase()); };
  addEventListener('hashchange', fromHash);
  draw();
  fromHash();
  // Gulir pilihan kuartal ke kanan supaya kuartal terbaru terlihat di layar sempit.
  const qs = $('#bank-quarter');
  qs.scrollLeft = qs.scrollWidth;
}

function groupList() {
  return state.group === 'semua' ? BANKS : BANKS.filter((b) => b.grup === state.group);
}

function draw(animateCards = true) {
  $$('#bank-group button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state.group)));
  $$('#bank-metric button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state.metric)));
  $$('#bank-quarter button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state.quarter)));
  const list = groupList();
  const q = state.quarter;
  const key = state.metric;
  const m = M[key];
  const reported = list.filter((b) => b.kuartal?.[q]);
  const who = state.group === 'semua' ? 'bank' : `bank ${GROUP_SHORT[state.group]}`;
  $('#bank-sub').textContent = `${qLabel(q)} (${qSpan(q)}) · ${reported.length} dari ${list.length} ${who} sudah melapor`;

  // Kartu bank.
  $('#bank-cards').innerHTML = list.map((b) => {
    const has = Boolean(b.kuartal?.[q]);
    const stat = (k) => `<span><small>${metricLabel(b, k)}</small><b>${fmtMetric(k, valueAt(b, q, k))}${star(b, q, k)}</b>${growthTag(k, yoyAt(b, q, k))}</span>`;
    return `<button class="bcard${has ? '' : ' empty-q'}" data-kode="${esc(b.kode)}" type="button">
      <span class="bc-head">${logoImg(b, 'logo-sm')}<span class="bc-title"><b>${esc(b.nama)}</b><small>${esc(b.kode)} · ${has ? qLabel(q) : `belum melapor ${qLabel(q)}`}</small></span><span class="bc-go">${lucide('arrow-up-right')}</span></span>
      <span class="bc-stats">${stat('laba')}${stat('kredit')}${stat('npl')}${stat('car')}</span>
    </button>`;
  }).join('');
  if (animateCards) develop($('#bank-cards'));

  // Batang perbandingan untuk metrik terpilih.
  const sorted = sortBy(list, key, q);
  const max = Math.max(...sorted.map((b) => Math.abs(valueAt(b, q, key))), 1e-4);
  const missing = list.filter((b) => valueAt(b, q, key) == null);
  $('#bank-bars-title').textContent = `${m.label}, ${state.group === 'semua' ? 'semua bank' : `antarbank ${GROUP_SHORT[state.group]}`}, ${qLabel(q)}`;
  $('#bank-bars-note').textContent = m.note;
  $('#bank-bars').innerHTML = sorted.map((b, i) => `<li><button class="bb" data-kode="${esc(b.kode)}" type="button">
      <span class="bb-rank">${m.good ? i + 1 : ''}</span>${logoImg(b, 'logo-xs')}
      <span class="bb-name"><b>${esc(b.nama)}</b><small>${esc(GROUP_NAME[b.grup])}</small></span>
      <span class="bar"><i style="width:${Math.max(2, (Math.abs(valueAt(b, q, key)) / max) * 100).toFixed(1)}%"></i></span>
      <span class="bb-val"><b>${fmtMetric(key, valueAt(b, q, key))}${star(b, q, key)}</b>${growthTag(key, yoyAt(b, q, key))}</span>
    </button></li>`).join('') + (missing.length ? `<li class="bb-missing">Belum ada angka ${qLabel(q)}: ${missing.map((b) => esc(b.nama)).join(', ')}</li>` : '');

  drawTrend(list);

  // Tabel lengkap untuk kuartal terpilih.
  const best = bestOf(list, q);
  $('#bank-table').innerHTML = `<thead><tr><th>Bank</th>${METRICS.map((c) => `<th class="num${c.key === key ? ' on' : ''}" title="${esc(c.note)}">${c.label}</th>`).join('')}</tr></thead>
    <tbody>${list.map((b) => `<tr>
      <td><button class="tb-name" type="button" data-kode="${esc(b.kode)}">${logoImg(b, 'logo-xs')}<span><b>${esc(b.nama)}</b><small>${esc(b.kode)}</small></span></button></td>
      ${METRICS.map((c) => { const v = valueAt(b, q, c.key); return `<td class="num${best[c.key] != null && v === best[c.key] ? ' best' : ''}${c.key === key ? ' on' : ''}">${fmtMetric(c.key, v)}${star(b, q, c.key)}</td>`; }).join('')}
    </tr>`).join('')}</tbody>`;
  $('#bank-table-title').textContent = `Semua angka, ${qLabel(q)}`;
}

/** Garis tren kuartalan metrik terpilih untuk bank-bank di kelompok. Laba ditampilkan per kuartal, bukan kumulatif. */
function drawTrend(list) {
  const key = state.metric;
  let banks = list;
  let note = '';
  if (state.group === 'semua') {
    const q = state.quarter;
    banks = [...list].sort((a, b) => (valueAt(b, q, 'aset') ?? valueAt(b, q, 'kredit') ?? 0) - (valueAt(a, q, 'aset') ?? valueAt(a, q, 'kredit') ?? 0)).slice(0, 6);
    note = ' Enam bank terbesar saja supaya garisnya terbaca; pilih satu kelompok untuk melihat semuanya.';
  }
  const val = (b, q) => (key === 'laba' ? quarterProfit(b, q) : valueAt(b, q, key));
  const brk = (b) => (b.putus && b.putus.metrik.includes(key) ? [QS.indexOf(b.putus.kuartal)] : []);
  const series = banks.map((b, i) => ({ name: b.nama, values: QS.map((q) => val(b, q)), breaks: brk(b), color: state.group === 'semua' ? SERIES[i] : COLOR[b.kode] }))
    .filter((s) => s.values.some((v) => v != null));
  const broken = banks.filter((b) => brk(b).length);
  if (broken.length) note += ` Garis ${broken.map((b) => b.nama).join(', ')} diputus di ${broken.map((b) => qLabel(b.putus.kuartal)).join(', ')} karena ${broken.map((b) => b.putus.alasan).join('; ')}.`;
  $('#bank-trend-title').textContent = key === 'laba' ? 'Laba per kuartal' : `${M[key].label} per kuartal`;
  $('#bank-trend-note').textContent = (key === 'laba'
    ? 'Laba tiap kuartal saja, dihitung dari selisih laba kumulatif. Celah berarti salah satu kuartal tidak ditemukan di rilis.'
    : 'Celah berarti angka kuartal itu tidak ditemukan di rilis yang dikutip.') + note;
  lineChart($('#bank-trend'), {
    labels: QS.map(qShort),
    series,
    area: false,
    dots: 'isolated',
    fmt: (v) => fmtMetric(key, v),
    tick: (v) => (M[key].unit === '%' ? `${nf(1).format(v)}%` : nf(v >= 100 ? 0 : 1).format(v)),
    label: `${M[key].label} per kuartal`
  });
}

/* ---------- Lembar detail ---------- */
const sheet = { kode: null, metric: 'kredit' };

export function openBank(kode) {
  const b = BANKS.find((x) => x.kode === kode);
  if (!b) return;
  sheet.kode = kode;
  const q = b.kuartal?.[state.quarter] ? state.quarter : latestOf(b, QS);
  const peers = BANKS.filter((x) => x.grup === b.grup);
  const stat = (key) => {
    const r = rankIn(peers, key, b.kode, q);
    const g = yoyAt(b, q, key);
    return `<div class="ds"><span class="stat-label">${metricLabel(b, key)}</span>
      <b>${fmtMetric(key, valueAt(b, q, key))}${star(b, q, key)}</b>
      <span class="ds-foot">${g != null ? growthTag(key, g) : ''}${r && r.of > 1 ? `<small>ke-${r.rank} dari ${r.of} bank ${GROUP_SHORT[b.grup]}</small>` : ''}</span></div>`;
  };
  const first = QS.find((x) => b.kuartal?.[x]);
  const qsWith = QS.filter((x) => b.kuartal?.[x]);
  const src = (u) => esc(DATA.sumber?.[u] || u);
  $('#bank-sheet-body').innerHTML = `<div class="bank-detail">
    <div class="bd-head">${logoImg(b, 'logo-lg')}<div class="bd-title"><h2 class="bd-name">${esc(b.nama)}</h2><p class="sub">${esc(b.lengkap)} · kode saham ${esc(b.kode)}</p>
      <div class="chips"><span class="tag accent">${esc(GROUP_NAME[b.grup])}</span><span class="tag">${lucide('calendar')}${qsWith.length} kuartal, ${qLabel(first)} sampai ${qLabel(qsWith.at(-1))}</span></div></div></div>
    <p class="bd-profile">${esc(b.profil)}</p>
    ${b.terbaru ? `<p class="bd-news"><b>${lucide('trending-up')}Kabar terbaru</b>${esc(b.terbaru)}</p>` : ''}
    ${b.keterangan ? `<p class="bd-key">${lucide('info')}<span>${esc(b.keterangan)}</span></p>` : ''}
    <div class="bd-sec"><h3 class="bd-h3">${qLabel(q)} <span>(${qSpan(q)})</span></h3><small>Pertumbuhan dibanding ${qLabel(prevYearQ(q))}</small></div>
    <div class="bd-stats">${['aset', 'kredit', 'dpk', 'laba', 'npl', 'car', 'casa', 'ldr', 'nim'].map(stat).join('')}</div>
    <div class="bd-sec"><h3 class="bd-h3">Tren per kuartal</h3>
      <div class="seg sm" id="bd-metric" role="group" aria-label="Ukuran tren">${['kredit', 'aset', 'dpk', 'laba', 'npl', 'car'].map((k) => `<button type="button" data-v="${k}" aria-pressed="${k === sheet.metric}">${k === 'laba' ? 'Laba per kuartal' : metricLabel(b, k)}</button>`).join('')}</div></div>
    <div id="bd-chart" class="bd-chart"></div>
    <details class="bd-more"><summary>${lucide('chart-column')}Tabel semua kuartal</summary>
      <div class="table-wrap"><table class="tbl bd-tbl"><thead><tr><th>Kuartal</th>${['aset', 'kredit', 'dpk', 'laba', 'npl', 'car', 'casa', 'ldr'].map((k) => `<th class="num">${metricLabel(b, k)}</th>`).join('')}</tr></thead>
      <tbody>${[...qsWith].reverse().map((x) => `<tr><td><b>${qLabel(x)}</b><small>${qSpan(x)}</small></td>${['aset', 'kredit', 'dpk', 'laba', 'npl', 'car', 'casa', 'ldr'].map((k) => `<td class="num">${fmtMetric(k, valueAt(b, x, k))}${star(b, x, k)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
    </details>
    <p class="note">Laba kumulatif sejak Januari. Tanda – berarti angka itu tidak ditemukan di rilis yang dikutip. Tanda * berarti dihitung dari angka laporan. Peringkat hanya di antara ${peers.length} bank ${GROUP_SHORT[b.grup]} di halaman ini.</p>
    <details class="bd-more"><summary>${lucide('layers')}Sumber per kuartal</summary>
      <ul class="bd-sources">${[...qsWith].reverse().map((x) => `<li><b>${qLabel(x)}</b>${(b.kuartal[x].sumber || []).map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${src(u)}</a>`).join('')}</li>`).join('')}</ul>
    </details>
    <div class="film-actions"><a class="btn dark" href="https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat/${esc(b.kode)}" target="_blank" rel="noopener">Laporan keuangan di IDX ${lucide('arrow-up-right')}</a><a class="btn light" href="https://${esc(b.domain)}" target="_blank" rel="noopener">Situs ${esc(b.nama)} ${lucide('arrow-up-right')}</a></div>
  </div>`;
  const dlg = $('#bank-sheet');
  if (!dlg.open) dlg.showModal();
  dlg.scrollTop = 0;
  const drawSheetChart = () => {
    const key = sheet.metric;
    const values = QS.map((x) => (key === 'laba' ? quarterProfit(b, x) : valueAt(b, x, key)));
    const breaks = b.putus && b.putus.metrik.includes(key) ? [QS.indexOf(b.putus.kuartal)] : [];
    lineChart($('#bd-chart'), { labels: QS.map(qShort), series: [{ name: b.nama, values, breaks, color: 'var(--accent)' }], area: false, dots: 'isolated', height: 200, fmt: (v) => fmtMetric(key, v), tick: (v) => (M[key].unit === '%' ? `${nf(1).format(v)}%` : nf(v >= 100 ? 0 : 1).format(v)), label: `${M[key].label} ${b.nama}` });
  };
  $('#bd-metric').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    sheet.metric = btn.dataset.v;
    $$('#bd-metric button').forEach((x) => x.setAttribute('aria-pressed', String(x === btn)));
    drawSheetChart();
  });
  liquidSeg($('#bd-metric'));
  requestAnimationFrame(drawSheetChart);
  if (location.hash !== `#bank-${b.kode}`) history.replaceState(null, '', `#bank-${b.kode}`);
}

/** Isi sisi belakang kartu di panggung 3D: laba kuartal terakhir bank itu. */
export function tileBack(b, quarters) {
  const q = latestOf(b, quarters);
  const g = q ? yoyAt(b, q, 'laba') : null;
  return `<small>${esc(GROUP_SHORT[b.grup] === 'swasta' ? 'Swasta' : GROUP_SHORT[b.grup])}</small>
  <b>${fmtMetric('laba', q ? valueAt(b, q, 'laba') : null)}</b><span>laba ${q ? qLabel(q) : ''}</span>
  ${g != null ? `<em class="${g < 0 ? 'neg' : ''}">${g > 0 ? '+' : ''}${nf(1).format(g)}% setahun</em>` : ''}`;
}
