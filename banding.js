// Halaman "Adu bank" (banding.html): dua atau tiga bank dari kelompok mana saja, berdampingan pada satu kuartal.
// Alamat halaman menyimpan pilihan, misalnya banding.html?b=BBRI,BBCA,NISP&q=2026Q2, jadi bisa dibagikan.

import { $, $$, esc, lineChart } from './kit.js';
import { logoImg } from './orbit.js';
import { lucide } from './icons.js';
import { develop } from './ui.js';
import {
  METRICS, groupLabel, valueAt, yoyAt, fmtMetric, growthTag, metricLabel, tick, star,
  qLabel, qShort, qSpan, prevYearQ, quarterProfit, sizeAt, profileUrl
} from './bank.js';

export const MAX = 3;
const COLORS = ['var(--s1)', 'var(--s2)', 'var(--s3)'];
const M = Object.fromEntries(METRICS.map((m) => [m.key, m]));
const TREND = ['kredit', 'aset', 'dpk', 'laba', 'npl', 'car', 'casa'];
/** Gelar untuk ukuran yang punya arah terbaik (LDR tidak punya). */
export const TITLE = {
  aset: 'Aset terbesar', kredit: 'Kredit terbanyak', dpk: 'Simpanan terbanyak', laba: 'Laba tertinggi',
  npl: 'NPL terendah', car: 'Modal paling tebal', casa: 'Dana murah terbanyak', nim: 'Margin bunga tertinggi'
};
const SHORT = {
  aset: 'Ukuran neraca', kredit: 'Pinjaman yang disalurkan', dpk: 'Giro, tabungan, deposito', laba: 'Kumulatif sejak Januari',
  npl: 'Kredit bermasalah; makin rendah makin baik', car: 'Kecukupan modal', casa: 'Porsi dana murah',
  ldr: 'Kredit dibanding simpanan; acuan BI 84–94%', nim: 'Margin bunga bersih'
};

/** Perbandingan siap pakai; yang kodenya tidak ada di data dilewati. */
export const PRESETS = [
  { name: 'Tiga terbesar', b: ['BMRI', 'BBRI', 'BBCA'] },
  { name: 'BUMN', b: ['BBRI', 'BMRI', 'BBNI'] },
  { name: 'Swasta lawan asing', b: ['BBCA', 'BNGA', 'NISP'] },
  { name: 'Bank asing', b: ['NISP', 'BNII', 'HSBC'] },
  { name: 'Bank digital', b: ['ARTO', 'SEABANK', 'SUPA'] },
  { name: 'Bank syariah', b: ['BRIS', 'BTPS', 'BCAS'] },
  { name: 'Bank daerah', b: ['BJBR', 'BJTM', 'JATENG'] }
];

/* ---------- Logika (tanpa DOM, diuji di banding.test.mjs) ---------- */

/** Kode bank dari alamat: dipisah koma, huruf besar, tanpa ganda, hanya yang ada, paling banyak tiga. */
export function parseCodes(text, banks) {
  const known = new Set(banks.map((b) => b.kode));
  const out = [];
  for (const k of String(text || '').toUpperCase().split(/[\s,;]+/)) {
    if (k && known.has(k) && !out.includes(k) && out.length < MAX) out.push(k);
  }
  return out;
}

const has = (b, q) => Boolean(b.kuartal?.[q]) && METRICS.some((m) => valueAt(b, q, m.key) != null);

/**
 * Kuartal pembanding: yang diminta bila ada bank terpilih yang punya angkanya; selain itu kuartal terakhir yang
 * dimiliki semua bank terpilih; bila tidak ada, kuartal terakhir dengan bank terbanyak.
 */
export function pickQuarter(sel, quarters, asked) {
  const avail = quarters.filter((q) => sel.some((b) => has(b, q)));
  if (!sel.length || !avail.length) return quarters[quarters.length - 1];
  if (asked && avail.includes(asked)) return asked;
  const all = avail.filter((q) => sel.every((b) => has(b, q)));
  if (all.length) return all[all.length - 1];
  let best = avail[avail.length - 1];
  let n = 0;
  for (const q of avail) {
    const c = sel.filter((b) => has(b, q)).length;
    if (c >= n) { n = c; best = q; }
  }
  return best;
}

/**
 * Siapa unggul di tiap ukuran pada kuartal q: { kunci: { v, kode: [...] } }. Gelar hanya diberikan bila semua bank
 * yang melapor di kuartal itu punya angkanya (minimal dua), supaya angka yang hilang tidak membuat bank lain tampak unggul.
 */
export function winners(sel, q) {
  const out = {};
  const reporting = sel.filter((b) => has(b, q));
  for (const key of Object.keys(TITLE)) {
    const vals = reporting.map((b) => ({ kode: b.kode, v: valueAt(b, q, key) })).filter((x) => x.v != null);
    if (vals.length < 2 || vals.length < reporting.length) continue;
    const v = M[key].good === 'rendah' ? Math.min(...vals.map((x) => x.v)) : Math.max(...vals.map((x) => x.v));
    out[key] = { v, kode: vals.filter((x) => x.v === v).map((x) => x.kode) };
  }
  return out;
}

/** Jumlah ukuran yang dimenangkan tiap bank. */
export function tally(wins) {
  const n = {};
  for (const w of Object.values(wins)) for (const k of w.kode) n[k] = (n[k] || 0) + 1;
  return n;
}

/** Bank sekelompok yang ukurannya paling dekat, sebagai saran lawan. */
export function nearest(b, banks, q, n = 3, skip = []) {
  const s = Math.log(Math.max(sizeAt(b, q), 1e-3));
  return banks
    .filter((x) => x.grup === b.grup && x.kode !== b.kode && !skip.includes(x.kode) && x.kuartal?.[q])
    .map((x) => ({ x, d: Math.abs(Math.log(Math.max(sizeAt(x, q), 1e-3)) - s) }))
    .sort((a, c) => a.d - c.d)
    .slice(0, n)
    .map((o) => o.x);
}

/** Cari bank menurut nama, nama resmi, kode, atau negara pemilik; awalan kata diutamakan, lalu yang terbesar. */
export function searchBanks(banks, text, q, skip = []) {
  const words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
  const pool = banks.filter((b) => !skip.includes(b.kode));
  if (!words.length) return [...pool].sort((a, c) => sizeAt(c, q) - sizeAt(a, q));
  const scored = [];
  for (const b of pool) {
    const hay = [b.nama, b.lengkap, b.kode, b.saham, b.milik, groupLabel(b)].filter(Boolean).join(' ').toLowerCase();
    if (!words.every((w) => hay.includes(w))) continue;
    const name = b.nama.toLowerCase();
    const score = name.startsWith(words[0]) ? 0 : name.split(/\s+/).some((t) => t.startsWith(words[0])) ? 1 : 2;
    scored.push({ b, score });
  }
  return scored.sort((a, c) => a.score - c.score || sizeAt(c.b, q) - sizeAt(a.b, q)).map((x) => x.b);
}

/* ---------- Tampilan ---------- */
let DATA = null;
let BANKS = [];
let QS = [];
const st = { sel: [], q: null, metric: 'kredit' };
const byKode = (k) => BANKS.find((b) => b.kode === k);
const selected = () => st.sel.map(byKode).filter(Boolean);
const colorOf = (kode) => COLORS[st.sel.indexOf(kode)] || COLORS[0];

export function renderBanding(data) {
  DATA = data;
  BANKS = data.bank;
  QS = data.kuartal;
  const p = new URLSearchParams(location.search);
  st.sel = p.has('b') ? parseCodes(p.get('b'), BANKS) : parseCodes(PRESETS[0].b.join(','), BANKS);
  st.q = pickQuarter(selected(), QS, p.get('q'));
  if (TREND.includes(p.get('ukuran'))) st.metric = p.get('ukuran');

  $('#cmp-metric').innerHTML = TREND.map((k) => `<button type="button" data-v="${k}" aria-pressed="false">${k === 'laba' ? 'Laba per kuartal' : M[k].label}</button>`).join('');
  $('#cmp-metric').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { st.metric = b.dataset.v; drawTrend(); sync(); } });
  $('#cmp-quarter').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { st.q = b.dataset.v; draw(false); } });
  $('#cmp-picks').addEventListener('click', (e) => {
    const b = e.target.closest('[data-preset]');
    if (!b) return;
    st.sel = parseCodes(b.dataset.preset, BANKS);
    st.q = pickQuarter(selected(), QS, null);
    draw();
  });
  $('#cmp-slots').addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if (rm) { remove(rm.dataset.remove); return; }
    const add = e.target.closest('[data-add]');
    if (add) addBank(add.dataset.add);
  });
  $('#cmp-share').addEventListener('click', share);
  document.addEventListener('click', (e) => { if (!e.target.closest('.cmp-pick')) closeLists(); });
  draw();
}

function addBank(kode) {
  if (st.sel.includes(kode) || st.sel.length >= MAX || !byKode(kode)) return;
  st.sel.push(kode);
  st.q = pickQuarter(selected(), QS, st.q);
  draw();
}

function remove(kode) {
  st.sel = st.sel.filter((k) => k !== kode);
  st.q = pickQuarter(selected(), QS, st.q);
  draw();
}

function sync() {
  const p = new URLSearchParams();
  if (st.sel.length) p.set('b', st.sel.join(','));
  p.set('q', st.q);
  if (st.metric !== 'kredit') p.set('ukuran', st.metric);
  history.replaceState(null, '', `?${p.toString().replace(/%2C/g, ',')}`);
  const names = selected().map((b) => b.nama);
  document.title = names.length > 1 ? `${names.join(' vs ')}: adu bank · Peta Perbankan` : 'Adu 2–3 bank · Peta Perbankan';
}

function draw(animate = true) {
  const sel = selected();
  sync();
  drawSlots(sel);
  drawPicks();
  drawQuarters(sel);
  drawVerdict(sel);
  drawTable(sel);
  drawTrend();
  drawSources(sel);
  $('#cmp-eyebrow').textContent = sel.length > 1 ? `Adu bank · ${sel.length} bank, ${qLabel(st.q)}` : 'Adu bank';
  if (animate) develop($('#cmp-slots'));
}

/** Ukuran singkat di kartu bank: aset, atau kredit bila rilis tidak menyebut aset. */
const size = (b) => {
  for (const k of ['aset', 'kredit']) {
    const v = valueAt(b, st.q, k);
    if (v != null) return `<span>${fmtMetric(k, v)} ${k}</span>`;
  }
  return '';
};

/* Kartu bank terpilih dan kolom tambah bank. */
function drawSlots(sel) {
  const html = [];
  sel.forEach((b, i) => {
    const qs = QS.filter((x) => has(b, x));
    const span = qs.length > 1 ? `${qLabel(qs[0])}–${qLabel(qs[qs.length - 1])}` : qs.length ? `Baru ${qLabel(qs[0])}` : 'Belum ada angka';
    html.push(`<article class="cmp-slot filled" style="--c:${COLORS[i]}">
      <div class="cs-top">${logoImg(b, 'logo-sm')}<button type="button" class="cs-x" data-remove="${esc(b.kode)}" aria-label="Hapus ${esc(b.nama)} dari perbandingan">${lucide('x')}</button></div>
      <div class="cs-name"><a href="${profileUrl(b.kode, st.q)}">${esc(b.nama)}</a><small>${esc(groupLabel(b))}</small></div>
      <div class="cs-meta"><span>${esc(span)}</span>${size(b)}</div>
    </article>`);
  });
  // Saran: bank sekelompok yang ukurannya paling dekat dengan bank pertama, atau bank terbesar bila belum ada pilihan.
  // Tiap kolom kosong mendapat saran yang berbeda.
  const pool = sel.length ? nearest(sel[0], BANKS, st.q, 3 * MAX, st.sel) : searchBanks(BANKS, '', st.q, st.sel);
  for (let i = sel.length; i < MAX; i++) {
    const k = i - sel.length;
    const sugg = pool.slice(k * 3, k * 3 + 3);
    const id = `cmp-in-${i}`;
    html.push(`<div class="cmp-slot vacant${i > sel.length ? ' later' : ''}">
      <div class="cmp-pick">
        <label class="cmp-search" for="${id}">${lucide('search')}<input id="${id}" type="search" autocomplete="off" spellcheck="false" placeholder="${i === sel.length ? `Tambah bank ke-${i + 1}` : 'Bank berikutnya'}" role="combobox" aria-expanded="false" aria-controls="${id}-list" aria-autocomplete="list"></label>
        <ul class="cmp-list" id="${id}-list" role="listbox" aria-label="Pilihan bank" hidden></ul>
      </div>
      ${sugg.length ? `<div class="cs-sugg"><small>${sel.length ? `Sepadan dengan ${esc(sel[0].nama)}` : 'Bank terbesar'}</small>${sugg.map((b) => `<button type="button" class="chip" data-add="${esc(b.kode)}">${lucide('plus')}${esc(b.nama)}</button>`).join('')}</div>` : ''}
    </div>`);
  }
  $('#cmp-slots').innerHTML = html.join('');
  $$('#cmp-slots input').forEach(wirePicker);
}

/* Kotak cari dengan daftar pilihan; panah atas/bawah, Enter memilih, Esc menutup. */
function wirePicker(input) {
  const list = document.getElementById(input.getAttribute('aria-controls'));
  let items = [];
  let active = -1;
  const show = () => {
    items = searchBanks(BANKS, input.value, st.q, st.sel).slice(0, 8);
    active = items.length && input.value.trim() ? 0 : -1;
    list.innerHTML = items.length
      ? items.map((b, i) => `<li role="option" id="${list.id}-${i}" data-kode="${esc(b.kode)}" aria-selected="${i === active}">${logoImg(b, 'logo-xs')}<span><b>${esc(b.nama)}</b><small>${esc(groupLabel(b))}${has(b, st.q) ? '' : ` · belum ada angka ${qLabel(st.q)}`}</small></span></li>`).join('')
      : '<li class="cmp-none">Tidak ada bank yang cocok. Daftar lengkap ada di <a href="daftar.html">Semua bank</a>.</li>';
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    mark();
  };
  const mark = () => {
    $$('[role="option"]', list).forEach((li, i) => li.setAttribute('aria-selected', String(i === active)));
    if (active >= 0) {
      input.setAttribute('aria-activedescendant', `${list.id}-${active}`);
      list.children[active]?.scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  };
  input.addEventListener('focus', show);
  input.addEventListener('input', show);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (list.hidden) show();
      if (!items.length) return;
      active = (active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      mark();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const b = items[Math.max(0, active)];
      if (b) addBank(b.kode);
    } else if (e.key === 'Escape') {
      closeLists();
    }
  });
  list.addEventListener('mousedown', (e) => e.preventDefault());
  list.addEventListener('click', (e) => { const li = e.target.closest('[data-kode]'); if (li) addBank(li.dataset.kode); });
}

function closeLists() {
  $$('.cmp-list').forEach((l) => { l.hidden = true; });
  $$('.cmp-search input').forEach((i) => { i.setAttribute('aria-expanded', 'false'); i.removeAttribute('aria-activedescendant'); });
}

function drawPicks() {
  const presets = PRESETS.map((p) => ({ ...p, b: p.b.filter(byKode) })).filter((p) => p.b.length >= 2);
  const on = (p) => p.b.join(',') === st.sel.join(',');
  $('#cmp-picks').innerHTML = `<span class="cp-label">Coba</span>${presets.map((p) => `<button type="button" class="chip${on(p) ? ' on' : ''}" data-preset="${p.b.join(',')}" aria-pressed="${on(p)}" title="${esc(p.b.map((k) => byKode(k).nama).join(', '))}">${esc(p.name)}<small>${esc(p.b.map((k) => byKode(k).nama).join(' · '))}</small></button>`).join('')}`;
}

function drawQuarters(sel) {
  const avail = QS.filter((q) => sel.some((b) => has(b, q)));
  $('#cmp-qbar').hidden = avail.length < 2;
  $('#cmp-quarter').innerHTML = avail.map((q) => {
    const n = sel.filter((b) => has(b, q)).length;
    const part = n < sel.length;
    return `<button type="button" data-v="${q}" aria-pressed="${q === st.q}"${part ? ' class="part"' : ''} title="${part ? `Hanya ${n} dari ${sel.length} bank punya angka ${qLabel(q)}` : `Semua bank punya angka ${qLabel(q)}`}">${qShort(q)}</button>`;
  }).join('');
  const seg = $('#cmp-quarter');
  const on = $('[aria-pressed="true"]', seg);
  if (on) seg.scrollLeft = on.offsetLeft - seg.clientWidth + on.offsetWidth + 8;
}

/* Siapa unggul: kalimat ringkas dan delapan gelar. */
function drawVerdict(sel) {
  const host = $('#cmp-verdict');
  if (sel.length < 2) {
    host.innerHTML = `<div class="vd-lead"><b>${sel.length ? 'Tambah satu bank lagi' : 'Pilih dua atau tiga bank'}</b><span>Ketik nama bank di kotak di atas, atau pilih salah satu perbandingan siap pakai.</span></div>`;
    return;
  }
  const wins = winners(sel, st.q);
  const n = tally(wins);
  const total = Object.keys(wins).length;
  const order = [...sel].sort((a, b) => (n[b.kode] || 0) - (n[a.kode] || 0));
  const dot = (kode) => `<i class="vd-dot" style="background:${colorOf(kode)}"></i>`;
  const lead = total
    ? order.map((b, i) => `<span class="vd-score">${dot(b.kode)}<b>${esc(b.nama)}</b> ${i ? 'di' : 'unggul di'} ${n[b.kode] || 0}${i ? '' : ` dari ${total} ukuran`}</span>`).join('')
    : `<span>Belum ada ukuran yang bisa dibandingkan pada ${qLabel(st.q)}.</span>`;
  host.innerHTML = `<div class="vd-lead"><small>${qLabel(st.q)}, ${qSpan(st.q)}</small><div class="vd-scores">${lead}</div></div>
    ${Object.keys(TITLE).map((key) => {
      const w = wins[key];
      if (!w) return `<div class="vd off"><small>${TITLE[key]}</small><b>–</b><span>angka belum lengkap</span></div>`;
      const names = w.kode.map((k) => byKode(k).nama);
      return `<div class="vd"><small>${TITLE[key]}</small><b>${w.kode.map(dot).join('')}${esc(names.join(' & '))}</b><span>${fmtMetric(key, w.v)}</span></div>`;
    }).join('')}`;
}

/* Tabel berdampingan: satu baris per ukuran, satu kolom per bank. */
function drawTable(sel) {
  const host = $('#cmp-table');
  const q = st.q;
  host.style.setProperty('--n', Math.max(1, sel.length));
  if (!sel.length) {
    host.innerHTML = '<p class="note">Belum ada bank yang dipilih.</p>';
    $('#cmp-table-sub').textContent = '';
    return;
  }
  const wins = sel.length > 1 ? winners(sel, q) : {};
  const head = `<div class="ct-row ct-head" role="row"><div class="ct-label" role="columnheader"><span class="sr-only">Ukuran</span></div>${sel.map((b) => `<div class="ct-bank" role="columnheader" style="--c:${colorOf(b.kode)}">${logoImg(b, 'logo-xs')}<span><b>${esc(b.nama)}</b><small>${esc(groupLabel(b))}</small></span></div>`).join('')}</div>`;
  const rows = METRICS.map((m) => {
    const vals = sel.map((b) => valueAt(b, q, m.key));
    const max = Math.max(...vals.filter((v) => v != null).map(Math.abs), 1e-6);
    const cells = sel.map((b, i) => {
      const v = vals[i];
      const best = wins[m.key]?.kode.includes(b.kode);
      const alt = metricLabel(b, m.key) !== m.label ? `<small class="ct-alt">${esc(metricLabel(b, m.key))}</small>` : '';
      return `<div class="ct-cell${best ? ' best' : ''}${v == null ? ' none' : ''}" role="cell" style="--c:${colorOf(b.kode)}">
        <span class="ct-who">${esc(b.nama)}</span>
        <span class="ct-val">${alt}<b>${fmtMetric(m.key, v)}${star(b, q, m.key)}</b>${best ? `<em>${lucide('check')}terbaik</em>` : ''}</span>
        ${v != null ? `<span class="ct-bar${v < 0 ? ' neg' : ''}"><i style="width:${Math.max(3, (Math.abs(v) / max) * 100).toFixed(1)}%"></i></span>` : ''}
        <span class="ct-g">${growthTag(m.key, yoyAt(b, q, m.key))}</span>
      </div>`;
    }).join('');
    return `<div class="ct-row" role="row"><div class="ct-label" role="rowheader"><b>${esc(m.label)}</b><small>${esc(SHORT[m.key])}</small></div>${cells}</div>`;
  }).join('');
  host.innerHTML = head + rows;
  const missing = sel.filter((b) => !has(b, q));
  $('#cmp-table-sub').textContent = `${qLabel(q)} (${qSpan(q)}). Pertumbuhan dibanding ${qLabel(prevYearQ(q))}. Panjang batang dibandingkan di dalam baris yang sama.`
    + (missing.length ? ` Belum ada angka ${qLabel(q)} untuk ${missing.map((b) => b.nama).join(', ')}; pilih kuartal lain.` : '');
}

/* Tren kuartalan: hanya bank yang punya angka di beberapa kuartal. */
function drawTrend() {
  const sel = selected();
  const key = st.metric;
  $$('#cmp-metric button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === key)));
  const val = (b, x) => (key === 'laba' ? quarterProfit(b, x) : valueAt(b, x, key));
  const series = sel.map((b) => ({ b, values: QS.map((x) => val(b, x)) }))
    .filter((s) => s.values.filter((v) => v != null).length >= 2);
  const short = sel.filter((b) => !series.some((s) => s.b === b));
  $('#cmp-trend-sect').hidden = !series.length;
  if (!series.length) return;
  $('#cmp-trend-h').textContent = key === 'laba' ? 'Laba per kuartal' : `${M[key].label} per kuartal`;
  $('#cmp-trend-note').textContent = (key === 'laba'
    ? 'Laba tiap kuartal saja, dihitung dari selisih laba kumulatif.'
    : 'Celah berarti angka kuartal itu tidak ditemukan di rilis yang dikutip.')
    + (short.length ? ` ${short.map((b) => b.nama).join(', ')} belum punya riwayat kuartalan di sini.` : '');
  lineChart($('#cmp-trend'), {
    labels: QS.map(qShort),
    series: series.map((s) => ({
      name: s.b.nama, values: s.values, color: colorOf(s.b.kode),
      breaks: s.b.putus && s.b.putus.metrik.includes(key) ? [QS.indexOf(s.b.putus.kuartal)] : []
    })),
    area: false,
    dots: 'isolated',
    height: 260,
    fmt: (v) => fmtMetric(key, v),
    tick: tick(key),
    label: `${M[key].label} per kuartal`
  });
}

function drawSources(sel) {
  const src = (u) => esc(DATA.sumber?.[u] || u);
  const rows = sel.map((b) => ({ b, urls: b.kuartal?.[st.q]?.sumber || [] })).filter((r) => r.urls.length);
  $('#cmp-sources').innerHTML = rows.length
    ? rows.map((r) => `<li><b>${esc(r.b.nama)}, ${qLabel(st.q)}</b>${r.urls.map((u) => `<a href="${esc(u)}" target="_blank" rel="noopener">${src(u)}</a>`).join('')}</li>`).join('')
    : `<li>Belum ada sumber untuk ${qLabel(st.q)}.</li>`;
}

async function share() {
  const btn = $('#cmp-share');
  const label = $('span', btn);
  const old = 'Salin tautan perbandingan';
  try {
    await navigator.clipboard.writeText(location.href);
    label.textContent = 'Tautan disalin';
  } catch {
    label.textContent = 'Salin dari kolom alamat';
  }
  setTimeout(() => { label.textContent = old; }, 2200);
}
