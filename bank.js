// Bagian "Per bank": perbandingan antarbank dalam satu kelompok (BUMN, swasta, BPD) dan lembar detail tiap bank.

import { $, $$, esc } from './kit.js';
import { logoImg, wireLogos } from './orbit.js';

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
  { key: 'dpk', label: 'Dana pihak ketiga', unit: 'T', good: 'tinggi', note: 'Giro, tabungan, dan deposito nasabah.' },
  { key: 'laba', label: 'Laba bersih', unit: 'T', good: 'tinggi', note: 'Laba sejak Januari sampai akhir periode laporan.' },
  { key: 'npl', label: 'NPL', unit: '%', good: 'rendah', note: 'Porsi kredit bermasalah (gross); NPF untuk bank syariah. Makin rendah makin baik.' },
  { key: 'car', label: 'CAR', unit: '%', good: 'tinggi', note: 'Rasio kecukupan modal. Makin tinggi, makin tebal bantalan bank menahan kerugian.' },
  { key: 'casa', label: 'CASA', unit: '%', good: 'tinggi', note: 'Porsi dana murah (giro dan tabungan) dari seluruh simpanan. Makin tinggi, makin murah biaya dana.' },
  { key: 'ldr', label: 'LDR', unit: '%', good: null, note: 'Kredit dibanding simpanan. Tidak ada yang "terbaik": terlalu rendah berarti dana menganggur, terlalu tinggi berarti likuiditas ketat. Acuan BI sekitar 84–94%.' },
  { key: 'nim', label: 'NIM', unit: '%', good: 'tinggi', note: 'Margin bunga bersih: selisih bunga yang diterima dan dibayar, dibanding aset produktif.' },
  { key: 'roa', label: 'ROA', unit: '%', good: 'tinggi', note: 'Laba dibanding total aset, disetahunkan.' }
];
const M = Object.fromEntries(METRICS.map((m) => [m.key, m]));
const PICKABLE = ['kredit', 'aset', 'laba', 'npl', 'car', 'casa', 'ldr', 'nim'];

const nf = (d) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: d });
/** Angka triliun → "Rp1.646 T", "Rp31,2 T", "Rp2,4 T", "Rp698 M"; persen → "2,9%". */
export const fmtMetric = (key, v) => {
  if (v == null) return '–';
  if (M[key].unit === 'T') {
    if (v < 1) return `Rp${nf(0).format(v * 1000)} M`;
    return `Rp${nf(v >= 100 ? 0 : v >= 10 ? 1 : 2).format(v)} T`;
  }
  return `${nf(2).format(v)}%`;
};
const growth = (g, small = false) => (g == null ? '' : `<span class="delta good-up ${g > 0.05 ? 'up' : g < -0.05 ? 'down' : 'flat'}${small ? ' sm' : ''}">${g > 0 ? '+' : ''}${nf(1).format(g)}%</span>`);
const star = (b, key) => ((b.dihitung || []).includes(key) ? '<sup title="Dihitung dari angka laporan">*</sup>' : '');
const metricLabel = (b, key) => (b.syariah && key === 'npl' ? 'NPF' : b.syariah && key === 'kredit' ? 'Pembiayaan' : M[key].label);

/** Urutkan menurut arah metrik: terbaik dulu. Metrik tanpa arah (LDR) diurutkan dari terbesar. */
export function sortBy(list, key) {
  const m = M[key];
  return list.filter((b) => b[key] != null).sort((a, b) => (m.good === 'rendah' ? a[key] - b[key] : b[key] - a[key]));
}
/** Peringkat dalam daftar: 1 = terbaik menurut arah metrik. null bila tidak ada nilai atau metrik tanpa arah. */
export function rankIn(list, key, kode) {
  if (!M[key].good) return null;
  const vals = sortBy(list, key);
  const i = vals.findIndex((b) => b.kode === kode);
  return i < 0 ? null : { rank: i + 1, of: vals.length };
}
/** Nilai terbaik per kolom, hanya bila ada lebih dari satu bank yang melaporkan. */
export function bestOf(list) {
  const best = {};
  for (const c of METRICS) {
    if (!c.good) continue;
    const vals = list.map((b) => b[c.key]).filter((v) => v != null);
    if (vals.length > 1) best[c.key] = c.good === 'rendah' ? Math.min(...vals) : Math.max(...vals);
  }
  return best;
}
const PERIOD_MONTH = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, Mei: 5, Jun: 6, Jul: 7, Agu: 8, Sep: 9, Okt: 10, Nov: 11, Des: 12 };
/** "Sep 2026" → angka urut bulan. */
export const periodKey = (p) => { const [m, y] = String(p).split(' '); return +y * 12 + (PERIOD_MONTH[m] || 0); };
/** Periode laporan unik, urut dari yang terlama. */
export const periodsOf = (list) => [...new Set(list.map((b) => b.periode))].sort((a, b) => periodKey(a) - periodKey(b));

const state = { group: 'bumn', metric: 'kredit' };
let BANKS = [];
let onGroup = () => {};

export function renderBanks(data, opts = {}) {
  BANKS = data.bank;
  onGroup = opts.onGroup || onGroup;
  $('#bank-group').innerHTML = BANK_GROUPS.map((g) => `<button type="button" data-v="${g.key}" aria-pressed="false">${g.name}<small>${g.key === 'semua' ? BANKS.length : BANKS.filter((b) => b.grup === g.key).length}</small></button>`).join('');
  $('#bank-metric').innerHTML = PICKABLE.map((k) => `<button type="button" data-v="${k}" aria-pressed="false">${M[k].label}</button>`).join('');
  $('#bank-group').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { setGroup(b.dataset.v); onGroup(b.dataset.v); } });
  $('#bank-metric').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.metric = b.dataset.v; draw(); } });
  $('#per-bank').addEventListener('click', (e) => { const el = e.target.closest('[data-kode]'); if (el) openBank(el.dataset.kode); });
  $('#bank-sheet').addEventListener('close', () => {
    if (location.hash.startsWith('#bank-')) history.replaceState(null, '', location.pathname + location.search);
  });
  const fromHash = () => { const m = location.hash.match(/^#bank-([A-Z0-9]+)$/i); if (m) openBank(m[1].toUpperCase()); };
  addEventListener('hashchange', fromHash);
  setGroup(state.group);
  fromHash();
}

export function setGroup(g) {
  state.group = g;
  draw();
}

function groupList() {
  return state.group === 'semua' ? BANKS : BANKS.filter((b) => b.grup === state.group);
}

function draw() {
  $$('#bank-group button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state.group)));
  $$('#bank-metric button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === state.metric)));
  const list = groupList();
  const key = state.metric;
  const m = M[key];
  const periods = periodsOf(list);
  $('#bank-sub').textContent = `${list.length} bank ${state.group === 'semua' ? 'yang tercatat di BEI' : GROUP_SHORT[state.group]} · periode laporan ${periods.join(', ')}`;

  // Kartu bank.
  $('#bank-cards').innerHTML = list.map((b) => `<button class="bcard" data-kode="${esc(b.kode)}" type="button">
      <span class="bc-head">${logoImg(b, 64, 'logo-sm')}<span class="bc-title"><b>${esc(b.nama)}</b><small>${esc(b.kode)} · ${esc(b.periode)}</small></span></span>
      <span class="bc-stats">
        <span><small>Laba</small><b>${fmtMetric('laba', b.laba)}</b>${growth(b.tumbuh?.laba, true)}</span>
        <span><small>${metricLabel(b, 'kredit')}</small><b>${fmtMetric('kredit', b.kredit)}</b>${growth(b.tumbuh?.kredit, true)}</span>
        <span><small>${metricLabel(b, 'npl')}</small><b>${fmtMetric('npl', b.npl)}</b></span>
        <span><small>CAR</small><b>${fmtMetric('car', b.car)}</b></span>
      </span>
    </button>`).join('');

  // Batang perbandingan untuk metrik terpilih.
  const sorted = sortBy(list, key);
  const max = Math.max(...sorted.map((b) => b[key]), 1e-4);
  const missing = list.filter((b) => b[key] == null);
  $('#bank-bars-title').textContent = state.group === 'semua' ? `${m.label}, semua bank` : `${m.label}, antarbank ${GROUP_SHORT[state.group]}`;
  const warn = key === 'laba' && periods.length > 1
    ? ` Periode laporan di daftar ini berbeda (${periods.join(', ')}), jadi laba untuk rentang bulan yang berbeda tidak setara; bandingkan pertumbuhan tahunannya.`
    : '';
  $('#bank-bars-note').textContent = m.note + warn;
  $('#bank-bars').innerHTML = sorted.map((b, i) => `<li><button class="bb" data-kode="${esc(b.kode)}" type="button">
      <span class="bb-rank">${m.good ? i + 1 : ''}</span>${logoImg(b, 32, 'logo-xs')}
      <span class="bb-name"><b>${esc(b.nama)}</b><small>${esc(b.periode)}</small></span>
      <span class="bar"><i style="width:${Math.max(2, (b[key] / max) * 100).toFixed(1)}%"></i></span>
      <span class="bb-val"><b>${fmtMetric(key, b[key])}${star(b, key)}</b>${growth(b.tumbuh?.[key], true)}</span>
    </button></li>`).join('') + (missing.length ? `<li class="bb-missing">Tidak disebutkan dalam rilis yang dikutip: ${missing.map((b) => esc(b.nama)).join(', ')}</li>` : '');

  // Tabel lengkap.
  const best = bestOf(list);
  const cols = METRICS.filter((c) => c.key !== 'roa');
  $('#bank-table').innerHTML = `<thead><tr><th>Bank</th>${cols.map((c) => `<th class="num${c.key === key ? ' on' : ''}" title="${esc(c.note)}">${c.label}</th>`).join('')}</tr></thead>
    <tbody>${list.map((b) => `<tr>
      <td><button class="tb-name" type="button" data-kode="${esc(b.kode)}">${logoImg(b, 32, 'logo-xs')}<span><b>${esc(b.nama)}</b><small>${esc(b.periode)}</small></span></button></td>
      ${cols.map((c) => `<td class="num${best[c.key] != null && b[c.key] === best[c.key] ? ' best' : ''}${c.key === key ? ' on' : ''}">${fmtMetric(c.key, b[c.key])}${star(b, c.key)}</td>`).join('')}
    </tr>`).join('')}</tbody>`;
  wireLogos($('#per-bank'));
}

export function openBank(kode) {
  const b = BANKS.find((x) => x.kode === kode);
  if (!b) return;
  const peers = BANKS.filter((x) => x.grup === b.grup);
  const stat = (key) => {
    const r = rankIn(peers, key, b.kode);
    const g = b.tumbuh?.[key];
    return `<div class="ds"><span class="stat-label">${metricLabel(b, key)}</span>
      <b>${fmtMetric(key, b[key])}${star(b, key)}</b>
      <span class="ds-foot">${g != null ? `${growth(g, true)}<small>setahun</small>` : ''}${r && r.of > 1 ? `<small>ke-${r.rank} dari ${r.of} bank ${GROUP_SHORT[b.grup]}</small>` : ''}</span></div>`;
  };
  $('#bank-sheet-body').innerHTML = `<div class="bank-detail">
    <div class="bd-head">${logoImg(b, 128, 'logo-lg')}<div class="bd-title"><h2 class="bd-name">${esc(b.nama)}</h2><p class="sub">${esc(b.lengkap)} · kode saham ${esc(b.kode)}</p>
      <div class="chips"><span class="tag accent">${esc(GROUP_NAME[b.grup])}</span><span class="tag">${esc(b.laporan)}</span></div></div></div>
    <p class="bd-profile">${esc(b.profil)}</p>
    ${b.terbaru ? `<p class="bd-news"><b>Kabar terbaru</b>${esc(b.terbaru)}</p>` : ''}
    <div class="bd-stats">${['aset', 'kredit', 'dpk', 'laba', 'npl', 'car', 'casa', 'ldr', 'nim', 'roa'].map(stat).join('')}</div>
    ${b.keterangan ? `<p class="bd-key">${esc(b.keterangan)}</p>` : ''}
    <p class="note">Periode ${esc(b.periode)}. Tanda – berarti angka itu tidak disebutkan dalam rilis yang dikutip. Tanda * berarti dihitung dari angka laporan. Peringkat hanya di antara ${peers.length} bank ${GROUP_SHORT[b.grup]} di halaman ini.</p>
    <h3 class="bd-h3">Sumber</h3>
    <ul class="bd-sources">${b.sumber.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.judul)}</a></li>`).join('')}</ul>
    <div class="film-actions"><a class="btn dark" href="https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat/${esc(b.kode)}" target="_blank" rel="noopener">Laporan keuangan di IDX</a><a class="btn light" href="https://${esc(b.domain)}" target="_blank" rel="noopener">Situs ${esc(b.nama)}</a></div>
  </div>`;
  wireLogos($('#bank-sheet-body'));
  const dlg = $('#bank-sheet');
  if (!dlg.open) dlg.showModal();
  $('#bank-sheet-body').scrollTop = 0;
  dlg.scrollTop = 0;
  if (location.hash !== `#bank-${b.kode}`) history.replaceState(null, '', `#bank-${b.kode}`);
}

/** Isi sisi belakang kartu di panggung 3D. */
export const tileBack = (b) => `<small>${esc(GROUP_SHORT[b.grup] === 'swasta' ? 'Swasta' : GROUP_SHORT[b.grup])}</small>
  <b>${fmtMetric('laba', b.laba)}</b><span>laba ${esc(b.periode)}</span>
  ${b.tumbuh?.laba != null ? `<em class="${b.tumbuh.laba < 0 ? 'neg' : ''}">${b.tumbuh.laba > 0 ? '+' : ''}${nf(1).format(b.tumbuh.laba)}% setahun</em>` : ''}`;
