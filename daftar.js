// Halaman "Semua bank": direktori seluruh bank umum di Indonesia (daftar-bank.json), dicocokkan dengan
// daftar resmi kantor pusat bank umum dari OJK (data/ojk-bank.json, ditarik otomatis lewat GitHub Actions).

import { $, $$, esc } from './kit.js';
import { lucide } from './icons.js';
import { develop } from './ui.js';
import { LOGO, logoSrc } from './logos-semua.js';

export const GRUP = [
  { key: 'bumn', name: 'BUMN', long: 'BUMN dan anak usahanya', note: '4 bank Persero dan anak usahanya' },
  { key: 'swasta', name: 'Swasta', long: 'Swasta nasional', note: 'Termasuk milik grup asing yang berbadan hukum Indonesia' },
  { key: 'bpd', name: 'BPD', long: 'Bank pembangunan daerah', note: 'Milik pemerintah provinsi' },
  { key: 'asing', name: 'Cabang asing', long: 'Kantor cabang bank asing', note: 'Cabang langsung bank luar negeri' }
];
const GRUP_NAME = Object.fromEntries(GRUP.map((g) => [g.key, g]));
export const SIFAT = [
  { key: 'syariah', name: 'Syariah', test: (b) => b.syariah },
  { key: 'digital', name: 'Digital', test: (b) => b.digital },
  { key: 'milik', name: 'Milik asing', test: (b) => Boolean(b.milik) && b.grup !== 'asing' },
  { key: 'saham', name: 'Tercatat di bursa', test: (b) => Boolean(b.saham) }
];

/* ---------- Pencocokan nama dengan daftar OJK ---------- */
const STOP = new Set(['pt', 'tbk', 'persero', 'perseroda', 'bank', 'bpd', 'the', 'ltd', 'limited', 'n', 'a', 'na', 'ag', 'dan', 'and', 'co']);
const SYN = { international: 'internasional', pembangunan: '', daerah: '' };

/** Kunci nama untuk dicocokkan: tanpa PT/Tbk/Persero/kata "bank", tanpa nama lama (d/h ...), huruf kecil. */
export function nameKey(s) {
  let t = String(s || '').toLowerCase();
  t = t.replace(/\(\s*d\.?\s*\/?\s*h\.?[^)]*\)/g, ' ').replace(/\bd\s*[./]\s*h\b.*$/g, ' ').replace(/\bdahulu\b.*$/g, ' ');
  t = t.replace(/\(\s*uus\s*\)|\bunit usaha syariah\b/g, ' ');
  t = t.replace(/bank pembangunan daerah/g, ' ');
  t = t.replace(/[^a-z0-9]+/g, ' ');
  return t.split(' ').map((w) => (w in SYN ? SYN[w] : w)).filter((w) => w && !STOP.has(w)).join(' ');
}
/** Baris OJK untuk unit usaha syariah (bukan bank tersendiri). */
export const isUUS = (s) => /\(\s*uus\s*\)|unit usaha syariah/i.test(String(s || ''));

const tokens = (k) => new Set(k.split(' ').filter(Boolean));
const subset = (a, b) => [...a].every((x) => b.has(x));

/**
 * Cocokkan satu nama dari OJK dengan daftar kita. Urutan: kunci sama persis (nama resmi, merek, nama lama, alias);
 * lalu satu-satunya bank yang kata-katanya mencakup atau tercakup; lalu kemiripan kata tertinggi (≥ 0,6) yang tidak seri.
 */
export function matchName(name, banks) {
  const k = nameKey(name);
  if (!k) return null;
  const keysOf = (b) => [b.resmi, b.nama, ...(b.dulu ? b.dulu.split(/[,;]/) : []), ...(b.cocok || [])].map(nameKey).filter(Boolean);
  const exact = banks.filter((b) => keysOf(b).includes(k));
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return exact.find((b) => nameKey(b.resmi) === k) || exact[0];
  const t = tokens(k);
  const cover = banks.filter((b) => keysOf(b).some((kk) => { const u = tokens(kk); return subset(t, u) || subset(u, t); }));
  if (cover.length === 1) return cover[0];
  let best = null; let score = 0; let tie = false;
  for (const b of (cover.length ? cover : banks)) {
    for (const kk of keysOf(b)) {
      const u = tokens(kk);
      const inter = [...t].filter((x) => u.has(x)).length;
      const j = inter / new Set([...t, ...u]).size;
      if (j > score + 1e-9) { best = b; score = j; tie = false; } else if (Math.abs(j - score) < 1e-9 && best !== b) tie = true;
    }
  }
  return score >= 0.6 && !tie ? best : null;
}

/** Bandingkan daftar OJK dengan daftar kita: siapa yang belum ada di sini, siapa yang tidak ditemukan di OJK. */
export function compareOJK(ojkRows, banks) {
  const found = new Map();
  const missing = [];
  let uus = 0;
  for (const r of ojkRows) {
    if (isUUS(r.nama) || /unit usaha syariah|uus/i.test(r.kelompok || '')) { uus++; continue; }
    const b = matchName(r.nama, banks);
    if (b) found.set(b.id, r);
    else missing.push(r);
  }
  const notInOJK = banks.filter((b) => !found.has(b.id));
  return { found, missing, notInOJK, uus };
}

/* ---------- Tampilan ---------- */
const state = { q: '', grup: 'semua', sifat: new Set(), urut: 'nama' };
let BANKS = [];
let OJK = null;

const logoBox = (b) => {
  const src = logoSrc(b.id);
  if (!src) return `<span class="dlogo mono" data-initials="${esc(b.nama.replace(/^Bank\s+/i, '').slice(0, 5))}"></span>`;
  return `<span class="dlogo" style="--ratio:${LOGO[b.id].r}"><img src="${src}" alt="Logo ${esc(b.nama)}" loading="lazy" decoding="async"></span>`;
};
const url = (s) => (/^https?:/.test(s) ? s : `https://${s}`);

function card(b) {
  const g = GRUP_NAME[b.grup];
  const tags = [`<span class="tag g-${b.grup}">${esc(g.name)}</span>`];
  if (b.syariah) tags.push('<span class="tag">Syariah</span>');
  if (b.digital) tags.push('<span class="tag">Digital</span>');
  if (b.milik && b.grup !== 'asing') tags.push(`<span class="tag">Milik ${esc(b.milik)}</span>`);
  if (b.grup === 'asing' && b.milik) tags.push(`<span class="tag">${esc(b.milik)}</span>`);
  const meta = [];
  if (b.kode || b.swift) meta.push(`<div><dt>Kode transfer</dt><dd>${esc(b.kode || '–')}${b.swift ? `<small>SWIFT ${esc(b.swift)}</small>` : ''}</dd></div>`);
  if (b.saham) meta.push(`<div><dt>Kode saham</dt><dd>${esc(b.saham)}</dd></div>`);
  if (b.wilayah) meta.push(`<div class="wide"><dt>Wilayah</dt><dd>${esc(b.wilayah)}</dd></div>`);
  if (b.induk) meta.push(`<div class="wide"><dt>Induk</dt><dd>${esc(b.induk)}</dd></div>`);
  if (b.dulu) meta.push(`<div class="wide"><dt>Dulu</dt><dd>${esc(b.dulu)}</dd></div>`);
  const situs = b.situs || OJK?.found.get(b.id)?.situs;
  const links = [];
  if (b.laporan) links.push(`<a class="btn dark sm" href="profil.html?kode=${esc(b.laporan)}">Laporan per kuartal ${lucide('arrow-right')}</a>`);
  if (situs) links.push(`<a class="btn light sm" href="${esc(url(situs))}" target="_blank" rel="noopener">Situs ${lucide('arrow-up-right')}</a>`);
  if (b.saham) links.push(`<a class="btn light sm" href="https://www.idx.co.id/id/perusahaan-tercatat/profil-perusahaan-tercatat/${esc(b.saham)}" target="_blank" rel="noopener">IDX ${lucide('arrow-up-right')}</a>`);
  return `<article class="dcard${b.laporan ? ' has-report' : ''}" id="b-${esc(b.id)}">
    <div class="dc-head">${logoBox(b)}<div class="dc-title"><h3>${esc(b.nama)}</h3><p>${esc(b.resmi)}</p></div></div>
    <div class="dc-tags">${tags.join('')}</div>
    ${meta.length ? `<dl class="dc-meta">${meta.join('')}</dl>` : ''}
    ${links.length ? `<div class="dc-links">${links.join('')}</div>` : ''}
  </article>`;
}

/** Saring menurut kata kunci (nama, nama resmi, nama lama, kode transfer, SWIFT, kode saham, wilayah). */
export function filterBanks(banks, { q = '', grup = 'semua', sifat = new Set() } = {}) {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return banks.filter((b) => {
    if (grup !== 'semua' && b.grup !== grup) return false;
    for (const s of sifat) if (!SIFAT.find((x) => x.key === s).test(b)) return false;
    if (!words.length) return true;
    const hay = [b.nama, b.resmi, b.dulu, b.kode, b.swift, b.saham, b.wilayah, b.kota, b.induk, b.milik].filter(Boolean).join(' ').toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

function draw(animate = true) {
  const list = filterBanks(BANKS, state);
  const sorted = state.urut === 'nama'
    ? [...list].sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }))
    : GRUP.flatMap((g) => list.filter((b) => b.grup === g.key).sort((a, b) => a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' })));
  let html = '';
  if (state.urut === 'grup') {
    for (const g of GRUP) {
      const part = sorted.filter((b) => b.grup === g.key);
      if (part.length) html += `<h2 class="dgroup">${esc(g.long)} <small>${part.length} bank · ${esc(g.note)}</small></h2>${part.map(card).join('')}`;
    }
  } else {
    html = sorted.map(card).join('');
  }
  $('#dgrid').innerHTML = html || '<p class="empty"><b>Tidak ada bank yang cocok.</b>Coba kata kunci lain atau hapus saringan.</p>';
  $('#dcount').textContent = list.length === BANKS.length ? `${BANKS.length} bank` : `${list.length} dari ${BANKS.length} bank`;
  $$('#dgrup button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === state.grup)));
  $$('#dsifat button').forEach((x) => x.setAttribute('aria-pressed', String(state.sifat.has(x.dataset.v))));
  $$('#durut button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.v === state.urut)));
  $$('#dsum button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.kind === 'grup'
    ? state.grup === x.dataset.v && !state.sifat.size
    : state.grup === 'semua' && state.sifat.size === 1 && state.sifat.has(x.dataset.v))));
  if (animate) develop($('#dgrid'), ':scope > .dcard:nth-child(-n+12)');
  const p = new URLSearchParams();
  if (state.q) p.set('cari', state.q);
  if (state.grup !== 'semua') p.set('grup', state.grup);
  if (state.sifat.size) p.set('sifat', [...state.sifat].join(','));
  if (state.urut !== 'nama') p.set('urut', state.urut);
  history.replaceState(null, '', `${location.pathname}${p.toString() ? `?${p}` : ''}`);
}

function drawOJK(ojk) {
  const host = $('#ojk');
  if (!ojk || !ojk.bank?.length) {
    host.innerHTML = `<p class="note">${ojk?.pesan ? esc(ojk.pesan) : 'Daftar resmi dari OJK akan ditarik otomatis pada penarikan data berikutnya, lalu dicocokkan dengan daftar di halaman ini.'}</p>`;
    return;
  }
  const c = OJK;
  const total = ojk.bank.length - c.uus;
  const warn = ojk.ok === false && ojk.pesan ? `<p class="note">${esc(ojk.pesan)} Daftar di bawah dari penarikan sebelumnya.</p>` : '';
  const line = (r) => `<li>${esc(r.nama)}${r.kelompok ? `<small>${esc(r.kelompok)}</small>` : ''}</li>`;
  host.innerHTML = `${warn}<p class="ojk-sum"><b>${total}</b> bank umum di daftar OJK ${esc(ojk.periode || '')}${c.uus ? ` (ditambah ${c.uus} unit usaha syariah)` : ''}. <b>${c.found.size}</b> sudah ada di halaman ini.</p>
    ${c.missing.length ? `<div class="ojk-col"><h3>Ada di daftar OJK, belum ada di sini (${c.missing.length})</h3><ul>${c.missing.map(line).join('')}</ul></div>` : ''}
    ${c.notInOJK.length ? `<div class="ojk-col"><h3>Tidak ditemukan di daftar OJK (${c.notInOJK.length})</h3><p class="note">Bisa karena berganti nama, bergabung, atau ejaan di daftar OJK berbeda.</p><ul>${c.notInOJK.map((b) => `<li>${esc(b.nama)}<small>${esc(b.resmi)}</small></li>`).join('')}</ul></div>` : ''}
    <p class="note">Sumber: <a href="${esc(ojk.sumber)}" target="_blank" rel="noopener">${esc(ojk.judul || 'Daftar Alamat Kantor Pusat Bank Umum dan Syariah, OJK')}</a>, ditarik ${esc(ojk.diambil?.slice(0, 10) || '')}.</p>`;
}

export function renderDaftar(data, ojk) {
  BANKS = data.bank;
  if (ojk?.bank?.length) OJK = compareOJK(ojk.bank, BANKS);
  const p = new URLSearchParams(location.search);
  state.q = p.get('cari') || '';
  if (GRUP_NAME[p.get('grup')]) state.grup = p.get('grup');
  for (const s of (p.get('sifat') || '').split(',')) if (SIFAT.some((x) => x.key === s)) state.sifat.add(s);
  if (p.get('urut') === 'grup') state.urut = 'grup';

  const count = (fn) => BANKS.filter(fn).length;
  $('#dsum').innerHTML = [
    ...GRUP.map((g) => ({ v: g.key, kind: 'grup', n: count((b) => b.grup === g.key), label: g.long })),
    ...SIFAT.map((s) => ({ v: s.key, kind: 'sifat', n: count(s.test), label: s.name }))
  ].map((x) => `<button type="button" class="dsum" data-kind="${x.kind}" data-v="${x.v}"><b>${x.n}</b><span>${esc(x.label)}</span></button>`).join('');
  $('#dgrup').innerHTML = [{ key: 'semua', name: 'Semua' }, ...GRUP].map((g) => `<button type="button" data-v="${g.key}" aria-pressed="false">${esc(g.name)}<small>${g.key === 'semua' ? BANKS.length : count((b) => b.grup === g.key)}</small></button>`).join('');
  $('#dsifat').innerHTML = SIFAT.map((s) => `<button type="button" class="chip" data-v="${s.key}" aria-pressed="false">${esc(s.name)}</button>`).join('');
  $('#dq').value = state.q;

  $('#dq').addEventListener('input', (e) => { state.q = e.target.value.trim(); draw(false); });
  $('#dgrup').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.grup = b.dataset.v; draw(); } });
  $('#dsifat').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (state.sifat.has(b.dataset.v)) state.sifat.delete(b.dataset.v); else state.sifat.add(b.dataset.v);
    draw();
  });
  $('#durut').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { state.urut = b.dataset.v; draw(); } });
  $('#dsum').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.kind === 'grup') { state.grup = state.grup === b.dataset.v ? 'semua' : b.dataset.v; state.sifat.clear(); }
    else { state.grup = 'semua'; state.sifat = new Set([b.dataset.v]); }
    draw();
    $('#dtools').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  draw();
  drawOJK(ojk);
}
