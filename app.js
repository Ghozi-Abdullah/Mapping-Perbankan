import { $, $$, esc, getJSON, num, pct, signed, updatedText, lineChart, sparkline, barRows } from './kit.js';
import { tileMap, BY_KODE } from './provinsi.js';
import {
  GROUPS, monthLabel, monthsOf, at, yoy, yoyPoints, ratio, ratioSeries, yoySeries,
  totalSeries, groupRows, provinceValues, commonLatest
} from './logic.js';
import { orbit, useExtraLogos } from './orbit.js';
import { renderBanks, renderProfile, renderHome, orbitBanks, tileBack, qLabel, profileUrl } from './bank.js';
import { liquidSeg, edgeLight } from './ui.js';

// Situs ini terdiri dari beberapa halaman; tiap halaman menandai dirinya di <body data-page="...">.
const PAGE = document.body.dataset.page || 'beranda';

let DATA = null;
let YM = null;
const state = { share: 'kredit', trend: 'tumbuh', prov: 'kredit', rate: 'modal_kerja', pick: null };

/** Miliar rupiah → "Rp8.449 T" atau "Rp12,5 T". */
const triliun = (v) => (v == null ? '–' : `Rp${num(v / 1000, Math.abs(v) < 100000 ? 1 : 0)} T`);
const deltaTag = (v, unit = '%', goodUp = true, d = 1) => {
  if (v == null) return '';
  const dir = Math.abs(v) < 0.05 ? 'flat' : v > 0 ? 'up' : 'down';
  return `<span class="delta ${goodUp ? 'good-up ' : ''}${dir}">${signed(v, d, unit)}</span>`;
};

function seg(id, key, render) {
  const host = $(id);
  host.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    state[key] = b.dataset.v;
    $$('button', host).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    render();
  });
}

function simpananTotal() {
  const s = DATA.simpanan || {};
  const out = {};
  for (const ym of monthsOf(...GROUPS.map((g) => s[g.key]?.total))) {
    const vals = GROUPS.map((g) => at(s[g.key]?.total, ym));
    if (vals.every((v) => v != null)) out[ym] = vals.reduce((a, b) => a + b, 0);
  }
  return out;
}
function casaTotal() {
  const s = DATA.simpanan || {};
  const out = {};
  for (const ym of monthsOf(...GROUPS.map((g) => s[g.key]?.total))) {
    let tot = 0;
    let cheap = 0;
    let ok = true;
    for (const g of GROUPS) {
      const t = at(s[g.key]?.total, ym);
      const gi = at(s[g.key]?.giro, ym);
      const ta = at(s[g.key]?.tabungan, ym);
      if (t == null || gi == null || ta == null) { ok = false; break; }
      tot += t;
      cheap += gi + ta;
    }
    if (ok && tot) out[ym] = (cheap / tot) * 100;
  }
  return out;
}
const lastN = (s, n = 24) => {
  const ms = monthsOf(s).slice(-n);
  return ms.map((m) => s[m]);
};

function renderStats() {
  const kredit = totalSeries(DATA.kredit || {});
  const simp = simpananTotal();
  const ldr = ratioSeries(kredit, simp);
  const casa = casaTotal();
  const cards = [
    { label: 'Kredit seluruh bank', value: triliun(at(kredit, YM)), delta: deltaTag(yoy(kredit, YM)), note: 'dibanding setahun lalu', spark: lastN(kredit) },
    { label: 'Simpanan masyarakat', value: triliun(at(simp, YM)), delta: deltaTag(yoy(simp, YM)), note: 'dibanding setahun lalu', spark: lastN(simp) },
    { label: 'Kredit/simpanan', value: pct(at(ldr, YM)), delta: deltaTag(yoyPoints(ldr, YM), ' poin', true), note: 'perkiraan LDR', spark: lastN(ldr) },
    { label: 'Dana murah (giro + tabungan)', value: pct(at(casa, YM)), delta: deltaTag(yoyPoints(casa, YM), ' poin', true), note: 'dari total simpanan', spark: lastN(casa) }
  ];
  $('#stats').innerHTML = cards.map((c) => `<div class="card stat">
      <span class="stat-label">${esc(c.label)}</span>
      <span class="stat-value">${esc(c.value)}</span>
      <span class="stat-foot">${c.delta}<span class="note">${esc(c.note)}</span></span>
      ${sparkline(c.spark, 220, 36)}
    </div>`).join('');
}

function renderGroups() {
  const rows = groupRows(DATA, YM);
  const key = state.share === 'kredit' ? 'pangsaKredit' : 'pangsaSimpanan';
  const shown = rows.filter((r) => r[key] != null);
  $('#kelompok-sub').textContent = `Pangsa ${state.share}, ${monthLabel(YM, true)}`;
  $('#share').innerHTML = `<div class="share-bar" role="img" aria-label="Pangsa ${state.share} per kelompok bank">${shown.map((r) => `<i style="width:${r[key]}%;background:${r.color}" title="${esc(r.long)} ${pct(r[key])}"></i>`).join('')}</div>
    <ul class="share-legend">${shown.map((r) => `<li><i style="background:${r.color}"></i><span>${esc(r.name)}</span><b>${pct(r[key])}</b></li>`).join('')}</ul>`;
  $('#group-table').innerHTML = `<thead><tr><th>Kelompok</th><th class="num">Kredit</th><th class="num">Tumbuh 1 thn</th><th class="num">Simpanan</th><th class="num">Tumbuh 1 thn</th><th class="num">Kredit/simpanan</th><th class="num">Dana murah</th></tr></thead>
    <tbody>${rows.map((r) => `<tr>
      <td><span class="gname"><i style="background:${r.color}"></i><span><b>${esc(r.name)}</b><small>${esc(r.note)}</small></span></span></td>
      <td class="num">${triliun(r.kredit)}</td>
      <td class="num">${deltaTag(r.tumbuhKredit) || '–'}</td>
      <td class="num">${triliun(r.simpanan)}</td>
      <td class="num">${deltaTag(r.tumbuhSimpanan) || '–'}</td>
      <td class="num">${pct(r.ldr)}</td>
      <td class="num">${pct(r.casa)}</td>
    </tr>`).join('')}</tbody>`;
  $('#group-note').textContent = 'Bank swasta milik grup asing (misalnya CIMB Niaga, OCBC, Danamon, Permata) masuk kelompok swasta karena berbadan hukum Indonesia. Kelompok "cabang asing" hanya berisi cabang langsung bank luar negeri.';
}

function renderTrend() {
  const kredit = DATA.kredit || {};
  const simp = DATA.simpanan || {};
  const pick = {
    tumbuh: (g) => yoySeries(kredit[g.key]),
    kredit: (g) => kredit[g.key],
    simpanan: (g) => simp[g.key]?.total,
    ldr: (g) => ratioSeries(kredit[g.key], simp[g.key]?.total)
  }[state.trend];
  const series = GROUPS.map((g) => ({ g, s: pick(g) || {} }));
  const months = monthsOf(...series.map((x) => x.s)).slice(-36);
  const isPct = state.trend === 'tumbuh' || state.trend === 'ldr';
  $('#tren-sub').textContent = {
    tumbuh: 'Pertumbuhan kredit dibanding bulan yang sama tahun sebelumnya',
    kredit: 'Kredit yang masih berjalan, triliun rupiah',
    simpanan: 'Giro, tabungan, dan deposito, triliun rupiah',
    ldr: 'Kredit dibagi simpanan pada kelompok yang sama'
  }[state.trend];
  lineChart($('#trend-chart'), {
    label: $('#tren-sub').textContent,
    labels: months.map((m) => monthLabel(m)),
    series: series.map(({ g, s }) => ({ name: g.name, color: g.color, values: months.map((m) => (s[m] == null ? null : isPct ? s[m] : s[m] / 1000)) })),
    fmt: (v) => (isPct ? pct(v) : `Rp${num(v, 0)} T`),
    tick: (v) => (isPct ? `${num(v, 0)}%` : num(v, 0)),
    height: 260,
    area: false
  });
}

function renderProvinces() {
  const vals = provinceValues(DATA, state.prov, YM);
  const fmt = (v) => (state.prov === 'kredit' || state.prov === 'simpanan' ? triliun(v) : pct(v));
  const label = { kredit: 'Kredit', simpanan: 'Simpanan', ldr: 'Kredit/simpanan', tumbuh: 'Pertumbuhan kredit 1 tahun' }[state.prov];
  $('#prov-sub').textContent = `${label} per provinsi, ${monthLabel(YM, true)}. Pilih provinsi untuk detail.`;
  tileMap($('#prov-map'), vals, {
    fmt, label,
    lowLabel: 'Rendah', highLabel: 'Tinggi',
    onPick: (kode) => { state.pick = kode; renderProvinceDetail(); }
  });
  const ranked = Object.entries(vals).sort((a, b) => b[1] - a[1]);
  $('#prov-rank').innerHTML = barRows(ranked.slice(0, 10).map(([k, v]) => ({ label: BY_KODE[k]?.nama || k, value: v })), fmt);
  if (!state.pick || !vals[state.pick]) state.pick = ranked[0]?.[0] || null;
  renderProvinceDetail();
}

function renderProvinceDetail() {
  const k = state.pick;
  const host = $('#prov-detail');
  if (!k) { host.innerHTML = ''; return; }
  const kr = DATA.kredit_prov?.provinsi?.[k];
  const sp = DATA.simpanan_prov?.provinsi?.[k];
  const totK = totalSeries({ total: DATA.kredit_prov?.total });
  host.innerHTML = `<div class="pd-head"><b>${esc(BY_KODE[k]?.nama || k)}</b><span class="note">${monthLabel(YM, true)}</span></div>
    <dl class="pd-grid">
      <div><dt>Kredit</dt><dd>${triliun(at(kr, YM))}</dd></div>
      <div><dt>Simpanan</dt><dd>${triliun(at(sp, YM))}</dd></div>
      <div><dt>Kredit/simpanan</dt><dd>${pct(ratio(kr, sp, YM))}</dd></div>
      <div><dt>Tumbuh kredit 1 thn</dt><dd>${yoy(kr, YM) == null ? '–' : signed(yoy(kr, YM), 1, '%')}</dd></div>
      <div><dt>Porsi kredit nasional</dt><dd>${pct(ratio(kr, totK, YM), 2)}</dd></div>
    </dl>
    ${sparkline(lastN(kr || {}), 280, 40)}`;
}

function rateCell(s) {
  const v = at(s, YM);
  if (v == null) return '<td class="num">–</td>';
  const d = yoyPoints(s, YM);
  return `<td class="num">${num(v, 2)}${d == null ? '' : `<small>${signed(d, 2)}</small>`}</td>`;
}
function renderRates() {
  const bk = DATA.bunga_kredit || {};
  const bd = DATA.bunga_deposito || {};
  const bt = DATA.bunga_tabungan || {};
  const rows = [...GROUPS.filter((g) => g.key !== 'bpr'), { key: 'umum', name: 'Semua bank umum', color: 'var(--ink)' }];
  const name = (g) => `<td><span class="gname"><i style="background:${g.color}"></i><b>${esc(g.name)}</b></span></td>`;
  $('#bunga-k-sub').textContent = `Rata-rata tertimbang, persen per tahun, ${monthLabel(YM, true)}. Angka kecil: perubahan setahun.`;
  $('#loan-rates').innerHTML = `<thead><tr><th>Kelompok</th><th class="num">Modal kerja</th><th class="num">Investasi</th><th class="num">Konsumsi</th></tr></thead>
    <tbody>${rows.filter((g) => bk[g.key]).map((g) => `<tr>${name(g)}${rateCell(bk[g.key].modal_kerja)}${rateCell(bk[g.key].investasi)}${rateCell(bk[g.key].konsumsi)}</tr>`).join('')}</tbody>`;
  $('#dep-rates').innerHTML = `<thead><tr><th>Kelompok</th><th class="num">1 bln</th><th class="num">3 bln</th><th class="num">6 bln</th><th class="num">12 bln</th><th class="num">Tabungan</th></tr></thead>
    <tbody>${rows.filter((g) => bd[g.key] || bt[g.key]).map((g) => `<tr>${name(g)}${['1', '3', '6', '12'].map((t) => rateCell(bd[g.key]?.[t])).join('')}${rateCell(bt[g.key]?.rata || bt[g.key])}</tr>`).join('')}</tbody>`;
  if (!rows.some((g) => bk[g.key])) $('#loan-rates').innerHTML = '<tbody><tr><td class="note">Tabel bunga kredit belum tersedia.</td></tr></tbody>';
}
function renderRateChart() {
  const bk = DATA.bunga_kredit || {};
  const bd = DATA.bunga_deposito || {};
  const pick = {
    konsumsi: (k) => bk[k]?.konsumsi,
    modal_kerja: (k) => bk[k]?.modal_kerja,
    d1: (k) => bd[k]?.['1'],
    d12: (k) => bd[k]?.['12']
  }[state.rate];
  const groups = GROUPS.filter((g) => g.key !== 'bpr' && pick(g.key));
  const months = monthsOf(...groups.map((g) => pick(g.key))).slice(-36);
  lineChart($('#rate-chart'), {
    label: 'Tren suku bunga',
    labels: months.map((m) => monthLabel(m)),
    series: groups.map((g) => ({ name: g.name, color: g.color, values: months.map((m) => at(pick(g.key), m)) })),
    fmt: (v) => `${num(v, 2)}%`,
    tick: (v) => `${num(v, 0)}%`,
    height: 240,
    area: false
  });
}

function banner(status) {
  const failed = Object.entries(status?.sources || {}).filter(([, s]) => !s.ok);
  const el = $('#banner');
  if (!failed.length || !el) return;
  el.hidden = false;
  el.innerHTML = `<span>Sebagian tabel BI gagal diperbarui pada penarikan terakhir (${failed.map(([k]) => esc(k.replace('_', ' '))).join(', ')}). Bagian itu menampilkan data terakhir yang berhasil ditarik.</span>`;
}

const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const tanggal = (iso) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${BLN[m - 1]} ${y}`; };
const setText = (sel, text) => { const el = $(sel); if (el) el.textContent = text; };

/** Alamat lama versi satu halaman (#bank-BMRI, #provinsi, ...) diarahkan ke halaman barunya. */
function redirectOldHash() {
  const h = location.hash.slice(1);
  if (!h) return false;
  const m = h.match(/^bank-([A-Z0-9]{4})$/i);
  const to = m ? profileUrl(m[1].toUpperCase())
    : { 'per-bank': 'bank.html', industri: 'industri.html', kelompok: 'industri.html', tren: 'industri.html', stats: 'industri.html', provinsi: 'provinsi.html', bunga: 'bunga.html', 'tren-bunga': 'bunga.html' }[h];
  if (to) location.replace(to);
  return Boolean(to);
}

async function loadBanks() {
  try {
    // Logo seluruh bank dimuat bersamaan dengan data; bila gagal, bank tanpa logo tampil dengan inisial.
    const [data, logos] = await Promise.all([getJSON('bank.json'), import('./logos-semua.js').catch(() => null)]);
    if (logos) useExtraLogos(logos);
    setText('#updated', `Data bank per ${tanggal(data.diperbarui)}`);
    return data;
  } catch {
    return null;
  }
}

/** Data SEKI per kelompok bank. Mengembalikan false bila belum ada. */
async function loadSeki() {
  let status = null;
  try { status = await getJSON('data/status.json'); } catch { /* belum ada */ }
  try {
    DATA = await getJSON('data/perbankan.json');
  } catch {
    return false;
  }
  const k = DATA.kredit || {};
  const s = DATA.simpanan || {};
  YM = commonLatest([k.persero, k.busn, k.bpd, s.persero?.total, s.busn?.total, DATA.kredit_prov?.total].filter(Boolean)) || DATA.periode;
  if (PAGE !== 'beranda') setText('#updated', updatedText(DATA.updated));
  setText('#eyebrow', `Data Bank Indonesia, posisi ${monthLabel(YM, true)}`);
  const src = $('#src-list');
  if (src) src.innerHTML = (DATA.sumber || []).map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener" title="${esc(x.judul)}">${esc(x.kode.replace('TABEL', 'Tabel ').replace('_', '.'))}</a>`).join(', ');
  banner(status);
  return true;
}

function sekiMissing() {
  $$('.seki').forEach((el) => { el.hidden = true; });
  const el = $('#banner');
  if (!el) return;
  el.hidden = false;
  el.innerHTML = '<span><b>Data Bank Indonesia belum tersedia.</b> Penarikan dari SEKI berjalan otomatis lewat GitHub Actions. Muat ulang halaman ini beberapa menit lagi.</span>';
}

function bankMissing() {
  $$('.needs-bank').forEach((el) => { el.hidden = true; });
  const el = $('#banner');
  if (!el) return;
  el.hidden = false;
  el.innerHTML = `<span><b>Data per bank gagal dimuat.</b> Periksa bahwa ${PAGE === 'daftar' ? 'daftar-bank.json dan logos-semua.js' : 'bank.json'} ikut terunggah.</span>`;
}

/** Di layar sempit menu bisa digeser; pastikan halaman yang aktif terlihat. */
function showActiveNav() {
  const nav = $('.top-nav');
  const a = $('.top-nav [aria-current="page"]');
  if (nav && a && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2;
}

async function main() {
  if (PAGE === 'beranda' && redirectOldHash()) return;
  showActiveNav();
  edgeLight(document.body, '.bcard, .card, .fact');

  if (PAGE === 'beranda') {
    const banks = await loadBanks();
    if (banks) {
      const qs = banks.kuartal;
      setText('#bank-eyebrow', `${banks.bank.length} bank · ${qLabel(qs[0])}–${qLabel(qs[qs.length - 1])}`);
      setText('#hero-nbank', String(banks.bank.length));
      const stage = orbitBanks(banks, 16);
      setText('#orbit-count', `${stage.length} bank terbesar`);
      orbit($('#orbit-field'), stage, { onPick: (kode) => { location.href = profileUrl(kode); }, back: (b) => tileBack(b, qs), keep: $('#orbit-core') });
      renderHome(banks);
    } else {
      bankMissing();
    }
    if (await loadSeki()) renderStats();
    else $$('.seki').forEach((el) => { el.hidden = true; });
  } else if (PAGE === 'daftar') {
    try {
      const [mod, data] = await Promise.all([import('./daftar.js'), getJSON('daftar-bank.json')]);
      let ojk = null;
      try { ojk = await getJSON('data/ojk-bank.json'); } catch { /* belum ditarik */ }
      setText('#updated', `Daftar per ${tanggal(data.diperbarui)}`);
      setText('#daftar-eyebrow', `${data.bank.length} bank umum`);
      mod.renderDaftar(data, ojk);
    } catch (e) {
      console.error(e);
      bankMissing();
    }
  } else if (PAGE === 'bank' || PAGE === 'profil') {
    const banks = await loadBanks();
    if (!banks) bankMissing();
    else if (PAGE === 'bank') renderBanks(banks);
    else renderProfile(banks);
  } else if (PAGE === 'banding') {
    const [banks, mod] = await Promise.all([loadBanks(), import('./banding.js')]);
    if (!banks) bankMissing();
    else mod.renderBanding(banks);
  } else if (!(await loadSeki())) {
    setText('#updated', 'Menunggu data pertama');
    sekiMissing();
  } else if (PAGE === 'industri') {
    renderStats();
    renderGroups();
    renderTrend();
    seg('#share-seg', 'share', renderGroups);
    seg('#trend-seg', 'trend', renderTrend);
  } else if (PAGE === 'provinsi') {
    renderProvinces();
    seg('#prov-seg', 'prov', renderProvinces);
  } else if (PAGE === 'bunga') {
    renderRates();
    renderRateChart();
    seg('#rate-seg', 'rate', renderRateChart);
  }
  $$('.seg').forEach(liquidSeg);
}

main();
