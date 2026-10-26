import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  fmtMetric, sortBy, rankIn, bestOf, METRICS, qLabel, qShort, prevQ, prevYearQ, valueAt, yoyAt,
  quarterProfit, defaultQuarter, latestOf, balancedCols, profileUrl, compareUrl
} from './bank.js';
import { initials } from './orbit.js';
import { LOGOS } from './logos.js';

const DATA = JSON.parse(readFileSync(new URL('./bank.json', import.meta.url)));
const KEYS = METRICS.map((m) => m.key);

test('format angka bank', () => {
  assert.equal(fmtMetric('kredit', 1646), 'Rp1.646 T');
  assert.equal(fmtMetric('laba', 31.2), 'Rp31,2 T');
  assert.equal(fmtMetric('laba', 2.4), 'Rp2,4 T');
  assert.equal(fmtMetric('laba', 0.698), 'Rp698 M');
  assert.equal(fmtMetric('npl', 0.98), '0,98%');
  assert.equal(fmtMetric('car', null), '–');
});

test('label dan urutan kuartal', () => {
  assert.equal(qLabel('2026Q2'), 'Q2 2026');
  assert.equal(qShort('2023Q4'), 'Q4 23');
  assert.equal(prevQ('2026Q1'), '2025Q4');
  assert.equal(prevQ('2026Q3'), '2026Q2');
  assert.equal(prevYearQ('2026Q2'), '2025Q2');
});

test('pertumbuhan tahunan dan laba per kuartal', () => {
  const b = {
    kuartal: {
      '2025Q1': { laba: 10, kredit: 100, npl: 2.0 },
      '2025Q2': { laba: 21, kredit: 105 },
      '2026Q1': { laba: 12, kredit: 110, npl: 1.8 },
      '2026Q2': { laba: 25, tumbuh_rilis: { kredit: 9 } }
    }
  };
  assert.equal(Math.round(yoyAt(b, '2026Q1', 'laba')), 20);
  assert.equal(yoyAt(b, '2026Q2', 'kredit'), null, 'tanpa nilai kuartal ini, tidak ada pertumbuhan');
  assert.equal(yoyAt({ kuartal: { '2026Q2': { kredit: 120, tumbuh_rilis: { kredit: 9 } } } }, '2026Q2', 'kredit'), 9, 'pakai angka rilis bila pembanding tidak ada');
  assert.equal(Number(yoyAt(b, '2026Q1', 'npl').toFixed(2)), -0.2, 'rasio dalam selisih poin');
  assert.equal(quarterProfit(b, '2025Q1'), 10);
  assert.equal(quarterProfit(b, '2025Q2'), 11);
  assert.equal(quarterProfit(b, '2026Q2'), 13);
  assert.equal(quarterProfit({ kuartal: { '2025Q3': { laba: 30 } } }, '2025Q3'), null, 'kuartal sebelumnya hilang');
});

test('urutan dan peringkat pada kuartal tertentu', () => {
  const q = '2026Q2';
  const mk = (kode, v) => ({ kode, kuartal: { [q]: v } });
  const list = [mk('A', { npl: 2.9, car: 20, ldr: 90 }), mk('B', { npl: 1.0, car: 25, ldr: 80 }), mk('C', { car: 18, ldr: 95 })];
  assert.deepEqual(sortBy(list, 'npl', q).map((b) => b.kode), ['B', 'A']);
  assert.deepEqual(sortBy(list, 'car', q).map((b) => b.kode), ['B', 'A', 'C']);
  assert.deepEqual(rankIn(list, 'npl', 'A', q), { rank: 2, of: 2 });
  assert.equal(rankIn(list, 'npl', 'C', q), null);
  assert.equal(rankIn(list, 'ldr', 'A', q), null, 'LDR tidak punya arah terbaik');
  const best = bestOf(list, q);
  assert.equal(best.npl, 1.0);
  assert.equal(best.car, 25);
  assert.equal(best.ldr, undefined);
});

test('kartu dibagi rata per baris dan alamat halaman', () => {
  assert.equal(balancedCols(5, 5), 5);
  assert.equal(balancedCols(6, 5), 3, '6 kartu: 3 + 3, bukan 5 + 1');
  assert.equal(balancedCols(14, 5), 5, '14 kartu: 5 + 5 + 4');
  assert.equal(balancedCols(5, 4), 3, '5 kartu: 3 + 2, bukan 4 + 1');
  assert.equal(balancedCols(3, 4), 3);
  assert.equal(balancedCols(4, 1), 1);
  assert.equal(profileUrl('BBRI'), 'profil.html?kode=BBRI');
  assert.equal(profileUrl('BMRI', '2026Q2'), 'profil.html?kode=BMRI&q=2026Q2');
  assert.equal(compareUrl('swasta', '2025Q4'), 'bank.html?grup=swasta&q=2025Q4');
});

test('inisial logo cadangan', () => {
  assert.equal(initials('BRI'), 'BRI');
  assert.equal(initials('bank bjb'), 'BJB');
  assert.equal(initials('Bank Jatim'), 'J');
  assert.equal(initials('CIMB Niaga'), 'CN');
});

test('bank.json: struktur kuartal lengkap dan masuk akal', () => {
  assert.match(DATA.diperbarui, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(DATA.kuartal.length >= 8, 'minimal dua tahun kuartal');
  DATA.kuartal.forEach((q, i) => {
    assert.match(q, /^20\d\dQ[1-4]$/);
    if (i) assert.equal(prevQ(q), DATA.kuartal[i - 1], 'kuartal berurutan tanpa celah');
  });
  const kode = new Set();
  for (const b of DATA.bank) {
    const at = b.kode;
    assert.match(b.kode, /^[A-Z]{4}$/, at);
    assert.ok(!kode.has(b.kode), `${at} ganda`);
    kode.add(b.kode);
    assert.ok(['bumn', 'swasta', 'bpd'].includes(b.grup), at);
    for (const k of ['nama', 'lengkap', 'profil', 'domain']) assert.ok(b[k]?.length > 2, `${at}.${k}`);
    const qs = Object.keys(b.kuartal);
    assert.ok(qs.length >= 8, `${at} minimal 8 kuartal berisi`);
    for (const q of qs) {
      assert.ok(DATA.kuartal.includes(q), `${at} ${q} di luar daftar kuartal`);
      const r = b.kuartal[q];
      assert.ok(Array.isArray(r.sumber) && r.sumber.length, `${at} ${q} tanpa sumber`);
      for (const u of r.sumber) {
        assert.match(u, /^https:\/\//, `${at} ${q}`);
        assert.ok(DATA.sumber[u], `${at} ${q} sumber tanpa judul`);
      }
      for (const k of Object.keys(r)) assert.ok(KEYS.includes(k) || ['sumber', 'dihitung', 'tumbuh_rilis', 'roa', 'roe'].includes(k), `${at} ${q} kunci asing ${k}`);
      if (r.aset != null && r.kredit != null) assert.ok(r.aset > r.kredit, `${at} ${q} aset < kredit`);
      if (r.npl != null) assert.ok(r.npl > 0 && r.npl < 10, `${at} ${q} npl`);
      if (r.car != null) assert.ok(r.car > 8 && r.car < 60, `${at} ${q} car`);
      if (r.casa != null) assert.ok(r.casa > 20 && r.casa < 100, `${at} ${q} casa`);
      if (r.ldr != null) assert.ok(r.ldr > 50 && r.ldr < 120, `${at} ${q} ldr`);
      if (r.laba != null) assert.ok(r.laba > 0 && r.laba < 100, `${at} ${q} laba`);
    }
    // Laba kumulatif tidak boleh turun di dalam satu tahun (Q1 ≤ Q2 ≤ Q3 ≤ Q4).
    for (const q of qs) {
      if (q.endsWith('Q1')) continue;
      const cur = valueAt(b, q, 'laba');
      const prev = valueAt(b, prevQ(q), 'laba');
      if (cur != null && prev != null) assert.ok(cur >= prev, `${at} laba ${q} (${cur}) < ${prevQ(q)} (${prev})`);
    }
    // Aset dan kredit tidak melompat lebih dari 35% antarkuartal, kecuali ada keterangan perubahan cakupan.
    for (const key of ['aset', 'kredit']) {
      for (const q of qs) {
        const cur = valueAt(b, q, key);
        const prev = valueAt(b, prevQ(q), key);
        if (cur != null && prev != null && !b.keterangan) assert.ok(Math.abs(cur / prev - 1) < 0.35, `${at} ${key} ${q} melompat`);
      }
    }
    assert.ok(latestOf(b, DATA.kuartal), `${at} tanpa data`);
  }
  for (const g of ['bumn', 'swasta', 'bpd']) assert.ok(DATA.bank.filter((b) => b.grup === g).length >= 2, `kelompok ${g} minimal dua bank`);
  assert.equal(defaultQuarter(DATA.bank, DATA.kuartal), '2026Q2', 'kuartal awal = kuartal terakhir yang dilaporkan mayoritas bank');
});

test('setiap bank punya logo SVG yang aman', () => {
  for (const b of DATA.bank) {
    const l = LOGOS[b.kode];
    assert.ok(l, `${b.kode} tanpa logo`);
    assert.match(l.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, b.kode);
    assert.doesNotMatch(l.svg, /<script|\son\w+=|href=|<image|<foreignObject/i, b.kode);
  }
});
