// Suku bunga per bank: KPR, KKB, tabungan, deposito, dan giro antarbank, ditambah bunga promo di tiap pameran
// properti dan otomotif. Data dari bunga-bank.json (dikumpulkan dari situs resmi bank, rilis, dan media).
// Fungsi tanpa DOM diekspor supaya bisa diuji dengan node.

import { $, $$, esc } from './kit.js';
import { lucide } from './icons.js';
import { groupIcon, profileUrl } from './bank.js';

export const PRODUK = [
  { key: 'kpr', label: 'KPR', long: 'Kredit pemilikan rumah', icon: 'house', loan: true },
  { key: 'kkb', label: 'KKB', long: 'Kredit kendaraan bermotor', icon: 'car', loan: true },
  { key: 'tabungan', label: 'Tabungan', long: 'Tabungan rupiah', icon: 'piggy-bank' },
  { key: 'deposito', label: 'Deposito', long: 'Deposito rupiah', icon: 'vault' },
  { key: 'giro', label: 'Giro', long: 'Giro rupiah', icon: 'wallet' }
];
export const TENOR = ['1', '3', '6', '12'];
export const GRUP = [
  { key: 'semua', name: 'Semua' },
  { key: 'bumn', name: 'BUMN' },
  { key: 'swasta', name: 'Swasta' },
  { key: 'asing', name: 'Asing' },
  { key: 'bpd', name: 'BPD' }
];
const GRUP_LONG = { bumn: 'BUMN', swasta: 'Swasta nasional', asing: 'Milik asing', bpd: 'Bank daerah' };
const SBDK_KEY = { kpr: 'kpr', kkb: 'non_kpr' };
const PRODUK_BY = Object.fromEntries(PRODUK.map((p) => [p.key, p]));
const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** Kelompok untuk halaman ini sama dengan halaman Per bank: swasta milik grup asing masuk "asing". */
export const grupOf = (d) => (d.grup === 'swasta' && d.milik ? 'asing' : d.grup);

/** Persen dengan koma, paling banyak dua desimal, tanpa nol di belakang: 3,75%, 2,5%, 0%. */
export function rate(v) {
  if (v == null || Number.isNaN(+v)) return '–';
  return `${(+v).toFixed(2).replace(/\.?0+$/, '').replace('.', ',')}%`;
}
const rateRange = (r) => (r == null ? '–' : r.min != null && r.max != null && r.min !== r.max ? `${rate(r.min).slice(0, -1)}–${rate(r.max)}` : rate(r.max ?? r.min));

/** Tanggal YYYY-MM-DD atau YYYY-MM jadi "27 Feb 2026" atau "Okt 2026". */
export function tgl(s, year = true) {
  if (!s) return '';
  const [y, m, d] = String(s).split('-').map(Number);
  if (!m) return String(y);
  return `${d ? `${d} ` : ''}${BLN[m - 1]}${year ? ` ${y}` : ''}`;
}
/** Rentang tanggal pameran: "27 Feb–1 Mar 2026", "5–15 Feb 2026". */
export function rentang(a, b) {
  if (!a) return '';
  if (!b || a === b) return tgl(a);
  const [ya, ma] = a.split('-');
  const [yb, mb] = b.split('-');
  if (ya !== yb) return `${tgl(a)}–${tgl(b)}`;
  if (ma !== mb) return `${tgl(a, false)}–${tgl(b)}`;
  return `${+a.split('-')[2]}–${tgl(b)}`;
}

/** Riwayat LPS yang angkanya berubah saja (periode berturut-turut dengan angka sama digabung). */
export function lpsChanges(acuan) {
  const list = [...(acuan?.lps || [])].sort((a, b) => a.berlaku.localeCompare(b.berlaku));
  return list.filter((x, i) => i === 0 || x.rupiah !== list[i - 1].rupiah);
}
/** Tingkat bunga penjaminan LPS yang berlaku pada tanggal tertentu (YYYY-MM-DD), atau yang terbaru. */
export function lpsAt(acuan, date) {
  const list = [...(acuan?.lps || [])].sort((a, b) => a.berlaku.localeCompare(b.berlaku));
  if (!list.length) return null;
  if (!date) return list[list.length - 1];
  return list.filter((x) => x.berlaku <= date).pop() || list[0];
}
/** Keputusan BI-Rate terbaru, tanggal angka itu mulai berlaku (`sejak`), dan angka sebelumnya (`sebelum`). */
export function biRate(acuan) {
  const list = [...(acuan?.bi_rate || [])].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  if (!list.length) return null;
  const now = list[list.length - 1];
  let i = list.length - 1;
  while (i > 0 && list[i - 1].nilai === now.nilai) i -= 1;
  return { ...now, sejak: list[i].tanggal, sebelum: i > 0 ? list[i - 1].nilai : null };
}

/** Batas tanggal "12 bulan terakhir" dihitung dari tanggal data diperbarui. */
const yearBefore = (iso) => {
  const [y, m, d] = String(iso || '2026-11-01').split('-');
  return `${+y - 1}-${m}-${d || '01'}`;
};

/** Pameran yang punya promo untuk produk ini, terbaru dulu. */
export function eventsFor(data, produk) {
  const used = new Set((data.promo || []).filter((p) => p.produk === produk).map((p) => p.event));
  return (data.event || []).filter((e) => used.has(e.id)).sort((a, b) => (b.mulai || '').localeCompare(a.mulai || ''));
}

const EV = (data) => Object.fromEntries((data.event || []).map((e) => [e.id, e]));

/**
 * Baris promo untuk produk dan pameran. eventId "semua": bunga promo terendah tiap bank dari pameran dalam
 * 12 bulan terakhir. Skema lain bank yang sama di pameran yang sama disimpan di `lain`.
 */
export function promoRows(data, produk, eventId = 'semua') {
  const ev = EV(data);
  const since = yearBefore(data.diperbarui);
  const list = (data.promo || []).filter((p) => p.produk === produk && ev[p.event]
    && (eventId === 'semua' ? (ev[p.event].mulai || '') >= since : p.event === eventId));
  const by = new Map();
  for (const p of list) {
    const cur = by.get(p.bank);
    const better = !cur || p.bunga < cur.bunga || (p.bunga === cur.bunga && (ev[p.event].mulai || '') > (ev[cur.event].mulai || ''));
    if (better) by.set(p.bank, { ...p, lain: cur ? [...cur.lain, cur] : [] });
    else cur.lain.push(p);
  }
  return [...by.values()].map((r) => ({
    id: r.bank, v: r.bunga, promo: r, event: ev[r.event],
    lain: r.lain.filter((x) => x.event === r.event)
  }));
}

/** Baris SBDK (bunga dasar kredit) untuk segmen KPR atau konsumsi non-KPR. */
export function sbdkRows(data, produk) {
  const key = SBDK_KEY[produk];
  return Object.entries(data.bank || {}).filter(([, b]) => b.sbdk?.[key] != null)
    .map(([id, b]) => ({ id, v: b.sbdk[key], per: b.sbdk.per, dibuka: b.sbdk.dibuka, val: b.sbdk.validasi, src: b.sbdk.sumber || [] }));
}

/** Baris bunga simpanan: tabungan dan giro berupa rentang lapisan saldo, deposito per tenor. */
export function simpananRows(data, produk, tenor = '12') {
  return Object.entries(data.bank || {}).map(([id, b]) => {
    const s = b.simpanan;
    if (!s) return null;
    const base = { id, per: s.per, dibuka: s.dibuka, val: s.validasi, src: s.sumber || [], catatan: s.catatan };
    if (produk === 'deposito') {
      const v = s.deposito?.[tenor];
      return v == null ? null : { ...base, v };
    }
    const r = s[produk];
    if (!r || (r.min == null && r.max == null)) return null;
    return { ...base, v: r.max ?? r.min, lo: r.min ?? r.max, produkNama: r.produk };
  }).filter(Boolean);
}

/** Urutan: kredit dari yang termurah, simpanan dari yang tertinggi. Seri diurutkan menurut nama. */
export function sortRows(rows, produk, nameOf = (id) => id) {
  const loan = PRODUK_BY[produk]?.loan;
  return [...rows].sort((a, b) => (loan ? a.v - b.v : b.v - a.v) || (loan ? 0 : (b.lo ?? 0) - (a.lo ?? 0)) || nameOf(a.id).localeCompare(nameOf(b.id), 'id'));
}

/** Baris untuk mode tertentu sebelum disaring kelompok dan pencarian. */
export function rowsFor(data, st) {
  const p = PRODUK_BY[st.produk];
  if (p.loan) return st.view === 'sbdk' ? sbdkRows(data, st.produk) : promoRows(data, st.produk, st.event);
  return simpananRows(data, st.produk, st.tenor);
}

/** Saring menurut kelompok dan teks pencarian (nama pendek, nama resmi, atau id). */
export function filterRows(rows, daftar, { grup = 'semua', q = '' } = {}) {
  const t = q.trim().toLowerCase();
  return rows.filter((r) => {
    const d = daftar[r.id];
    if (!d) return false;
    if (grup !== 'semua' && grupOf(d) !== grup) return false;
    return !t || `${d.nama} ${d.resmi} ${d.id}`.toLowerCase().includes(t);
  });
}

/** Baris tabel perbandingan untuk bank terpilih. `best` = indeks kolom terbaik (atau -1). */
export function compareTable(data, ids) {
  const out = [];
  const cell = (v, text, sub = '') => ({ v, text, sub });
  const add = (group, label, better, cells) => {
    const vals = cells.map((c) => c.v).filter((v) => v != null);
    let best = -1;
    if (vals.length > 1 && new Set(vals).size > 1) {
      const target = better === 'low' ? Math.min(...vals) : Math.max(...vals);
      best = cells.findIndex((c) => c.v === target);
    }
    out.push({ group, label, better, cells, best });
  };
  for (const produk of ['kpr', 'kkb']) {
    const promo = new Map(promoRows(data, produk, 'semua').map((r) => [r.id, r]));
    add('kredit', `${PRODUK_BY[produk].label} promo terendah`, 'low', ids.map((id) => {
      const r = promo.get(id);
      return r ? cell(r.v, rate(r.v), `${r.promo.skema ? `${r.promo.skema}, ` : ''}${r.event.nama}`) : cell(null, '–');
    }));
    add('kredit', `SBDK ${produk === 'kpr' ? 'KPR' : 'konsumsi non-KPR'}`, 'low', ids.map((id) => {
      const v = data.bank?.[id]?.sbdk?.[SBDK_KEY[produk]];
      return cell(v ?? null, rate(v), v != null ? `per ${tgl(data.bank[id].sbdk.per || data.bank[id].sbdk.dibuka)}` : '');
    }));
  }
  for (const k of ['tabungan', 'giro']) {
    add('simpanan', PRODUK_BY[k].label, 'high', ids.map((id) => {
      const r = data.bank?.[id]?.simpanan?.[k];
      const v = r ? r.max ?? r.min : null;
      return cell(v ?? null, rateRange(r), r?.produk || '');
    }));
  }
  for (const t of TENOR) {
    add('simpanan', `Deposito ${t} bulan`, 'high', ids.map((id) => {
      const v = data.bank?.[id]?.simpanan?.deposito?.[t];
      return cell(v ?? null, rate(v));
    }));
  }
  return out;
}

/* ---------------------------------------------------------------- Tampilan */

const st = { produk: 'kpr', view: 'promo', event: 'semua', tenor: '12', grup: 'semua', q: '', pick: [] };
let DATA = null;
let D = {};
let LOGOS = null;

const logoBox = (id) => {
  const d = D[id];
  const src = LOGOS?.logoSrc(id);
  if (!src) return `<span class="rb-logo mono">${esc((d?.nama || id).replace(/^Bank\s+/i, '').slice(0, 4))}</span>`;
  return `<span class="rb-logo"><img src="${src}" alt="" loading="lazy" decoding="async"></span>`;
};
const srcLink = (src) => {
  const u = (src || []).map((s) => (typeof s === 'string' ? s : s?.url)).find(Boolean);
  return u ? `<a class="rb-src-a" href="${esc(u)}" target="_blank" rel="noopener" title="Buka sumber" aria-label="Buka sumber angka">${lucide('external-link')}</a>` : '<span></span>';
};
const nameOf = (id) => D[id]?.nama || id;
const profileOf = (id) => (D[id]?.laporan ? profileUrl(D[id].laporan) : null);

function syncUrl() {
  const u = new URLSearchParams();
  if (st.produk !== 'kpr') u.set('produk', st.produk);
  if (PRODUK_BY[st.produk].loan && st.view === 'sbdk') u.set('lihat', 'sbdk');
  if (PRODUK_BY[st.produk].loan && st.view === 'promo' && st.event !== 'semua') u.set('pameran', st.event);
  if (st.produk === 'deposito' && st.tenor !== '12') u.set('tenor', st.tenor);
  if (st.grup !== 'semua') u.set('grup', st.grup);
  if (st.pick.length) u.set('banding', st.pick.join(','));
  const s = u.toString();
  history.replaceState(null, '', s ? `?${s}` : location.pathname);
}

function readUrl() {
  const p = new URLSearchParams(location.search);
  if (PRODUK_BY[p.get('produk')]) st.produk = p.get('produk');
  if (p.get('lihat') === 'sbdk') st.view = 'sbdk';
  if (p.get('pameran') && (DATA.event || []).some((e) => e.id === p.get('pameran'))) st.event = p.get('pameran');
  if (TENOR.includes(p.get('tenor'))) st.tenor = p.get('tenor');
  if (GRUP.some((g) => g.key === p.get('grup'))) st.grup = p.get('grup');
  st.pick = (p.get('banding') || '').split(',').filter((id) => D[id]).slice(0, 3);
}

function pressed(host, v) {
  $$('[data-v]', host).forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === v)));
}

function renderAcuan() {
  const lps = lpsAt(DATA.acuan, DATA.diperbarui);
  const ch = lpsChanges(DATA.acuan).filter((x) => !lps || x.berlaku <= lps.berlaku);
  const lpsSince = ch[ch.length - 1];
  const lpsPrev = ch[ch.length - 2];
  const bi = biRate(DATA.acuan);
  const nBank = Object.values(DATA.bank || {}).filter((b) => b.sbdk || b.simpanan).length;
  const nPromo = new Set((DATA.promo || []).map((p) => p.bank)).size;
  const delta = (now, before, unit = ' poin') => (before == null || now === before ? '' : `<span class="delta flat">${now > before ? 'naik' : 'turun'} ${rate(Math.abs(now - before)).slice(0, -1)}${unit}</span>`);
  const tiles = [
    lps && { icon: 'shield-check', label: 'Bunga penjaminan LPS', value: rate(lps.rupiah), foot: `${delta(lps.rupiah, lpsPrev?.rupiah)}<span class="note">bank umum, rupiah, sejak ${tgl(lpsSince.berlaku)}${lps.sampai ? `, ditinjau lagi ${tgl(lps.sampai)}` : ''}</span>`, src: lps.sumber },
    bi && { icon: 'landmark', label: 'BI-Rate', value: rate(bi.nilai), foot: bi.sejak === bi.tanggal ? `${delta(bi.nilai, bi.sebelum)}<span class="note">keputusan ${tgl(bi.tanggal)}</span>` : `<span class="delta flat">tetap</span><span class="note">keputusan ${tgl(bi.tanggal)}; ${bi.sebelum != null ? `${bi.nilai > bi.sebelum ? 'naik' : 'turun'} ke angka ini ` : 'berlaku '}sejak ${tgl(bi.sejak)}</span>`, src: bi.sumber },
    { icon: 'percent', label: 'Bank dengan angka bunga', value: `${nBank}`, foot: `<span class="note">dari ${Object.keys(D).length} bank umum; ${nPromo} bank punya promo pameran</span>` },
    { icon: 'calendar-range', label: 'Pameran tercatat', value: `${(DATA.event || []).length}`, foot: `<span class="note">properti dan otomotif, ${(DATA.event || []).length ? `${tgl([...DATA.event].sort((a, b) => a.mulai.localeCompare(b.mulai))[0].mulai)}–sekarang` : 'belum ada'}</span>` }
  ].filter(Boolean);
  $('#rb-acuan').innerHTML = tiles.map((c) => `<div class="card stat">
      <span class="stat-label"><span class="st-ic">${lucide(c.icon)}</span>${esc(c.label)}${c.src ? srcLink(c.src) : ''}</span>
      <span class="stat-value">${c.value}</span>
      <span class="stat-foot">${c.foot}</span>
    </div>`).join('');
}

function renderTools() {
  $('#rb-produk').innerHTML = PRODUK.map((p) => `<button type="button" data-v="${p.key}" aria-pressed="false">${lucide(p.icon)}<span>${p.label}</span></button>`).join('');
  $('#rb-grup').innerHTML = GRUP.map((g) => `<button type="button" data-v="${g.key}" aria-pressed="false">${g.key === 'semua' ? lucide('layers', 'lc gi') : groupIcon(g.key)}${g.name}</button>`).join('');
  $('#rb-produk').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b || b.dataset.v === st.produk) return;
    st.produk = b.dataset.v;
    if (!eventsFor(DATA, st.produk).some((ev) => ev.id === st.event)) st.event = 'semua';
    draw();
  });
  $('#rb-sub').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    if (PRODUK_BY[st.produk].loan) st.view = b.dataset.v; else st.tenor = b.dataset.v;
    draw();
  });
  $('#rb-grup').addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    st.grup = b.dataset.v;
    draw();
  });
  $('#rb-q').addEventListener('input', (e) => { st.q = e.target.value; drawList(); });
  $('#rb-ctx').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ev]');
    if (!b) return;
    st.event = b.dataset.ev;
    draw();
  });
  $('#rb-bars').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (b) { togglePick(b.dataset.pick); return; }
    if (e.target.closest('[data-more]')) { $('#rb-bars').classList.add('all'); e.target.closest('li').remove(); }
  });
  $('#rb-cmp').addEventListener('click', (e) => {
    const b = e.target.closest('[data-unpick]');
    if (b) togglePick(b.dataset.unpick);
  });
  $('#rb-dock').addEventListener('click', () => $('#rb-cmp').scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

function togglePick(id) {
  if (st.pick.includes(id)) st.pick = st.pick.filter((x) => x !== id);
  else if (st.pick.length < 3) st.pick = [...st.pick, id];
  else st.pick = [...st.pick.slice(1), id];
  drawCompare();
  $$('#rb-bars [data-pick]').forEach((b) => {
    const on = st.pick.includes(b.dataset.pick);
    b.setAttribute('aria-pressed', String(on));
    b.innerHTML = lucide(on ? 'check' : 'plus');
    b.closest('.rb-row').classList.toggle('on', on);
  });
  syncUrl();
}

/** Bagian konteks di atas daftar, tingginya tetap: pameran (promo), penjelasan SBDK, atau acuan LPS (simpanan). */
function drawContext() {
  const p = PRODUK_BY[st.produk];
  const host = $('#rb-ctx');
  if (p.loan && st.view === 'promo') {
    const evs = eventsFor(DATA, st.produk);
    const count = (id) => new Set((DATA.promo || []).filter((x) => x.produk === st.produk && x.event === id).map((x) => x.bank)).size;
    host.className = 'rb-ctx ev-mode';
    host.innerHTML = `<div class="rb-ev-list" role="group" aria-label="Pilih pameran">
      <button type="button" class="ev all" data-ev="semua" aria-pressed="${st.event === 'semua'}"><span class="ev-date">${lucide('tag')}</span><span class="ev-t"><b>Semua pameran</b><small>Promo terendah tiap bank, 12 bulan terakhir</small></span></button>
      ${evs.map((e) => {
        const [y, m, d] = (e.mulai || '').split('-');
        return `<button type="button" class="ev" data-ev="${esc(e.id)}" aria-pressed="${st.event === e.id}" title="${esc(e.nama)}, ${esc(rentang(e.mulai, e.selesai))}">
          <span class="ev-date"><b>${d ? +d : '–'}</b><small>${m ? BLN[m - 1] : ''} ${y ? y.slice(2) : ''}</small></span>
          <span class="ev-t"><b>${esc(e.nama)}</b><small>${lucide(e.jenis === 'otomotif' ? 'car' : e.jenis === 'properti' ? 'house' : 'tag')}${esc(e.lokasi || rentang(e.mulai, e.selesai))} · ${count(e.id)} bank</small></span>
        </button>`;
      }).join('')}
    </div>`;
    host.querySelector('[aria-pressed="true"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    return;
  }
  if (p.loan) {
    host.className = 'rb-ctx note-mode';
    host.innerHTML = `<span class="st-ic">${lucide('info')}</span><p><b>SBDK</b> (suku bunga dasar kredit) adalah bunga terendah sebelum ditambah premi risiko tiap nasabah. Semua bank wajib mengumumkannya. ${st.produk === 'kkb' ? 'KKB termasuk segmen <b>konsumsi non-KPR</b>, bersama kredit tanpa agunan dan kartu kredit.' : 'Bunga KPR yang ditawarkan setelah masa promo biasanya jauh di atas angka ini.'}</p>`;
    return;
  }
  const lps = lpsAt(DATA.acuan, DATA.diperbarui);
  const hist = lpsChanges(DATA.acuan).filter((x) => x.berlaku <= lps?.berlaku).slice(-4);
  const cur = hist[hist.length - 1];
  host.className = 'rb-ctx note-mode';
  host.innerHTML = lps
    ? `<span class="st-ic warn">${lucide('shield-alert')}</span><p>Simpanan dijamin LPS sampai Rp2 miliar per nasabah per bank, asalkan bunganya tidak di atas <b>${rate(lps.rupiah)}</b> (bank umum, rupiah). Bunga di atas garis putus-putus tidak dijamin.</p>
       <ol class="rb-lps" aria-label="Riwayat bunga penjaminan LPS">${hist.map((h) => `<li${h === cur ? ' class="on"' : ''}><b>${rate(h.rupiah)}</b><small>sejak ${tgl(h.berlaku)}</small></li>`).join('')}</ol>`
    : '<span class="st-ic">' + lucide('info') + '</span><p>Bunga simpanan dari halaman suku bunga tiap bank.</p>';
}

function drawSub() {
  const p = PRODUK_BY[st.produk];
  const host = $('#rb-sub');
  if (p.loan) {
    host.innerHTML = `<button type="button" data-v="promo" aria-pressed="false">${lucide('tag')}Promo pameran</button><button type="button" data-v="sbdk" aria-pressed="false">${lucide('scale')}Bunga dasar (SBDK)</button>`;
    pressed(host, st.view);
  } else if (st.produk === 'deposito') {
    host.innerHTML = TENOR.map((t) => `<button type="button" data-v="${t}" aria-pressed="false">${t} bln</button>`).join('');
    pressed(host, st.tenor);
  } else {
    host.innerHTML = `<button type="button" data-v="rentang" aria-pressed="true" disabled>${lucide('chart-bar')}Saldo terendah–tertinggi</button>`;
  }
}

function titleText() {
  const p = PRODUK_BY[st.produk];
  const g = st.grup === 'semua' ? 'semua bank' : `bank ${GRUP.find((x) => x.key === st.grup).name}`;
  if (p.loan && st.view === 'promo') {
    const e = EV(DATA)[st.event];
    return {
      t: e ? `Bunga promo ${p.label} di ${e.nama}` : `Bunga promo ${p.label} terendah, ${g}`,
      n: e ? `${rentang(e.mulai, e.selesai)}${e.lokasi ? `, ${e.lokasi}` : ''}. Bunga awal pada masa fixed; sesudahnya bunga mengambang mengikuti bank.` : 'Angka terendah tiap bank dari semua pameran dalam 12 bulan terakhir. Bunga berlaku pada masa fixed saja.'
    };
  }
  if (p.loan) return { t: `SBDK ${st.produk === 'kpr' ? 'KPR' : 'konsumsi non-KPR'}, ${g}`, n: 'Persen per tahun, dari pengumuman bulanan tiap bank. Makin rendah makin murah.' };
  if (st.produk === 'deposito') return { t: `Bunga deposito ${st.tenor} bulan, ${g}`, n: 'Bunga rupiah biasa (bukan special rate) untuk nominal terkecil. Makin tinggi makin untung.' };
  return { t: `Bunga ${p.label.toLowerCase()}, ${g}`, n: 'Batang dimulai dari bunga saldo terendah sampai saldo tertinggi. Makin tinggi makin untung.' };
}

function drawList() {
  const p = PRODUK_BY[st.produk];
  const all = rowsFor(DATA, st);
  const rows = sortRows(filterRows(all, D, st), st.produk, nameOf);
  const { t, n } = titleText();
  $('#rb-title').textContent = t;
  $('#rb-note').textContent = n;
  $('#rb-ic').innerHTML = lucide(p.icon);
  const lps = !p.loan ? lpsAt(DATA.acuan, DATA.diperbarui)?.rupiah : null;
  const max = Math.max(...rows.map((r) => r.v), lps || 0, 0.5) * 1.06;
  const w = (v) => `${Math.max(1.5, (v / max) * 100).toFixed(1)}%`;
  const row = (r, i) => {
    const d = D[r.id];
    const on = st.pick.includes(r.id);
    const href = profileOf(r.id);
    let sub = `${groupIcon(grupOf(d))}${esc(GRUP_LONG[grupOf(d)])}`;
    let small = '';
    let src = r.src;
    if (r.promo) {
      sub += st.event === 'semua' ? ` · ${esc(r.event.nama)}` : '';
      small = esc(r.promo.skema || '');
      src = r.promo.sumber;
      if (r.promo.catatan || r.lain.length) {
        const extra = [r.promo.catatan, ...r.lain.map((x) => `${x.skema || 'skema lain'} ${rate(x.bunga)}`)].filter(Boolean).join(' · ');
        sub += `<span class="rb-cat" title="${esc(extra)}"> · ${esc(extra)}</span>`;
      }
    } else if (r.per || r.dibuka) {
      const old = r.per && String(r.per).slice(0, 7) < yearBefore(DATA.diperbarui).slice(0, 7);
      sub += old ? ` · <span class="rb-old" title="Tanggal di sumber lebih dari setahun lalu">per ${esc(tgl(r.per))}</span>` : r.per ? ` · per ${esc(tgl(r.per))}` : ` · dicek ${esc(tgl(r.dibuka))}`;
    }
    if (r.val === 'media') sub += ' · dari media';
    if (r.produkNama) small = esc(r.produkNama);
    const over = lps != null && r.v > lps;
    const bar = r.lo != null && r.lo !== r.v
      ? `<i class="lo" style="width:${w(r.lo)}"></i><i class="hi" style="left:${w(r.lo)};width:calc(${w(r.v)} - ${w(r.lo)})"></i>`
      : `<i style="width:${w(r.v)}"></i>`;
    return `<li class="rb-row${on ? ' on' : ''}${i >= 25 ? ' extra' : ''}">
      <span class="bb-rank">${i + 1}</span>${logoBox(r.id)}
      <span class="bb-name">${href ? `<a href="${href}"><b>${esc(d.nama)}</b></a>` : `<b>${esc(d.nama)}</b>`}<small>${sub}</small></span>
      <span class="bar rb-bar">${bar}${lps != null ? `<span class="lps-mark" style="left:${w(lps)}" aria-hidden="true"></span>` : ''}</span>
      <span class="bb-val"><b>${r.lo != null && r.lo !== r.v ? rateRange({ min: r.lo, max: r.v }) : rate(r.v)}</b>${small ? `<small>${small}</small>` : ''}${over ? `<em class="rb-over" title="Di atas bunga penjaminan LPS ${rate(lps)}">${lucide('shield-alert')}di atas LPS</em>` : ''}</span>
      ${srcLink(src)}
      <button type="button" class="rb-pick" data-pick="${esc(r.id)}" aria-pressed="${on}" aria-label="${on ? 'Hapus' : 'Tambah'} ${esc(d.nama)} ${on ? 'dari' : 'ke'} perbandingan">${lucide(on ? 'check' : 'plus')}</button>
    </li>`;
  };
  const ids = new Set(rows.map((r) => r.id));
  const missing = filterRows(Object.keys(D).map((id) => ({ id })), D, st).filter((r) => !ids.has(r.id));
  const empty = !rows.length
    ? `<li class="rb-empty">${lucide('search')}<span>${st.q ? `Tidak ada bank "${esc(st.q)}" dengan angka ini.` : 'Belum ada angka untuk pilihan ini.'}${p.loan && st.view === 'promo' && st.event === 'semua' ? ' Coba pilih satu pameran.' : ''}</span></li>`
    : '';
  $('#rb-bars').classList.remove('all');
  $('#rb-bars').innerHTML = empty + rows.map(row).join('')
    + (rows.length > 25 ? `<li><button type="button" class="bb-more" data-more="1">Tampilkan ${rows.length - 25} bank lainnya</button></li>` : '')
    + (missing.length && !st.q ? `<li class="bb-missing">${lucide('info')}Belum ada angka untuk ${missing.length} bank${missing.length <= 12 ? `: ${missing.map((r) => esc(D[r.id].nama)).join(', ')}` : ''}.</li>` : '');
}

function drawCompare() {
  const ids = st.pick;
  const slots = [0, 1, 2].map((i) => {
    const id = ids[i];
    if (!id) return `<div class="rb-slot vacant"><span>${lucide('plus')}</span><small>Pilih bank</small></div>`;
    return `<div class="rb-slot">${logoBox(id)}<b>${esc(nameOf(id))}</b><button type="button" data-unpick="${esc(id)}" aria-label="Hapus ${esc(nameOf(id))}">${lucide('x')}</button></div>`;
  }).join('');
  const table = compareTable(DATA, [0, 1, 2].map((i) => ids[i] || null));
  let group = '';
  const rows = table.map((r) => {
    const head = r.group !== group ? `<div class="rb-cg">${r.group === 'kredit' ? `${lucide('hand-coins')}Kredit, makin rendah makin murah` : `${lucide('piggy-bank')}Simpanan, makin tinggi makin untung`}</div>` : '';
    group = r.group;
    return `${head}<div class="rb-cr"><span class="rb-cl">${esc(r.label)}</span>${r.cells.map((c, i) => `<span class="rb-cc${i === r.best ? ' best' : ''}${ids[i] ? '' : ' none'}" title="${esc(c.sub)}"><b>${ids[i] ? c.text : ''}${i === r.best ? lucide('check') : ''}</b>${ids[i] && c.sub ? `<small>${esc(c.sub)}</small>` : ''}</span>`).join('')}</div>`;
  }).join('');
  $('#rb-cmp-body').innerHTML = `<div class="rb-slots">${slots}</div><div class="rb-ctable">${rows}</div>`;
  $('#rb-cmp-note').textContent = ids.length ? `${ids.length} dari 3 bank. Centang hijau: terbaik di baris itu.` : 'Ketuk + pada daftar untuk memilih sampai tiga bank.';
  $('#rb-cmp').classList.toggle('rb-nopick', !ids.length);
  const dock = $('#rb-dock');
  dock.hidden = !ids.length;
  dock.querySelector('span').textContent = `Bandingkan ${ids.length} bank`;
}

function drawSources() {
  const used = new Map();
  const add = (s) => (s || []).forEach((x) => {
    const u = typeof x === 'string' ? x : x?.url;
    if (u && !used.has(u)) used.set(u, (typeof x === 'object' && x.judul) || DATA.sumber?.[u] || u);
  });
  (DATA.event || []).forEach((e) => add(e.sumber));
  (DATA.promo || []).forEach((p) => add(p.sumber));
  Object.values(DATA.bank || {}).forEach((b) => { add(b.sbdk?.sumber); add(b.simpanan?.sumber); });
  add(DATA.acuan?.lps?.flatMap((x) => x.sumber || []));
  add(DATA.acuan?.bi_rate?.flatMap((x) => x.sumber || []));
  $('#rb-src-n').textContent = `${used.size} sumber`;
  $('#rb-src').innerHTML = `<p>SBDK dan bunga simpanan diambil dari halaman resmi tiap bank. Bunga promo pameran dari pengumuman bank dan berita media keuangan yang mengutip bank. Tanggal di bawah nama bank adalah tanggal berlaku yang tertulis di sumber. Bunga promo hanya berlaku selama masa fixed, untuk pengajuan di pameran itu, dan dengan syarat masing-masing bank. Angka diperbarui ${tgl(DATA.diperbarui)}.</p>
    <ul class="rb-srcl">${[...used].map(([u, t]) => `<li><a href="${esc(u)}" target="_blank" rel="noopener">${esc(t)}</a></li>`).join('')}</ul>`;
}

function draw() {
  pressed($('#rb-produk'), st.produk);
  pressed($('#rb-grup'), st.grup);
  drawSub();
  drawContext();
  drawList();
  syncUrl();
}

export async function renderBunga(data, daftar) {
  DATA = data;
  D = Object.fromEntries(daftar.bank.map((b) => [b.id, b]));
  try { LOGOS = await import('./logos-semua.js'); } catch { LOGOS = null; }
  readUrl();
  renderAcuan();
  renderTools();
  drawCompare();
  drawSources();
  draw();
}
