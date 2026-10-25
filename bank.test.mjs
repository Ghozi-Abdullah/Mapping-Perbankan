import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fmtMetric, sortBy, rankIn, bestOf, periodsOf, periodKey, METRICS } from './bank.js';
import { initials } from './orbit.js';

const DATA = JSON.parse(readFileSync(new URL('./bank.json', import.meta.url)));

test('format angka bank', () => {
  assert.equal(fmtMetric('kredit', 1646), 'Rp1.646 T');
  assert.equal(fmtMetric('laba', 31.2), 'Rp31,2 T');
  assert.equal(fmtMetric('laba', 2.4), 'Rp2,4 T');
  assert.equal(fmtMetric('laba', 0.698), 'Rp698 M');
  assert.equal(fmtMetric('npl', 0.98), '0,98%');
  assert.equal(fmtMetric('car', null), '–');
});

test('urutan dan peringkat mengikuti arah metrik', () => {
  const list = [
    { kode: 'A', npl: 2.9, car: 20, ldr: 90 },
    { kode: 'B', npl: 1.0, car: 25, ldr: 80 },
    { kode: 'C', npl: null, car: 18, ldr: 95 }
  ];
  assert.deepEqual(sortBy(list, 'npl').map((b) => b.kode), ['B', 'A']);
  assert.deepEqual(sortBy(list, 'car').map((b) => b.kode), ['B', 'A', 'C']);
  assert.deepEqual(rankIn(list, 'npl', 'A'), { rank: 2, of: 2 });
  assert.equal(rankIn(list, 'npl', 'C'), null);
  assert.equal(rankIn(list, 'ldr', 'A'), null, 'LDR tidak punya arah terbaik');
  const best = bestOf(list);
  assert.equal(best.npl, 1.0);
  assert.equal(best.car, 25);
  assert.equal(best.ldr, undefined);
});

test('periode laporan diurutkan', () => {
  assert.ok(periodKey('Sep 2026') > periodKey('Agu 2026'));
  assert.deepEqual(periodsOf([{ periode: 'Sep 2026' }, { periode: 'Jun 2026' }, { periode: 'Agu 2026' }, { periode: 'Jun 2026' }]), ['Jun 2026', 'Agu 2026', 'Sep 2026']);
});

test('inisial logo cadangan', () => {
  assert.equal(initials('BRI'), 'BRI');
  assert.equal(initials('bank bjb'), 'BJB');
  assert.equal(initials('Bank Jatim'), 'J');
  assert.equal(initials('Bank Mandiri'), 'M');
  assert.equal(initials('CIMB Niaga'), 'CN');
  assert.equal(initials('OCBC Indonesia'), 'OI');
});

test('bank.json lengkap dan masuk akal', () => {
  assert.match(DATA.diperbarui, /^\d{4}-\d{2}-\d{2}$/);
  const kode = new Set();
  for (const b of DATA.bank) {
    const at = `${b.kode}`;
    assert.match(b.kode, /^[A-Z]{4}$/, at);
    assert.ok(!kode.has(b.kode), `${at} ganda`);
    kode.add(b.kode);
    assert.ok(['bumn', 'swasta', 'bpd'].includes(b.grup), at);
    assert.match(b.periode, /^(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des) 20\d\d$/, at);
    assert.match(b.domain, /^[a-z0-9.-]+\.[a-z]{2,}$/, at);
    for (const k of ['nama', 'lengkap', 'laporan', 'profil']) assert.ok(b[k]?.length > 2, `${at}.${k}`);
    assert.ok(b.sumber.length >= 1, `${at} tanpa sumber`);
    for (const s of b.sumber) assert.match(s.url, /^https:\/\//, at);
    assert.ok(b.kredit > 0 && b.dpk > 0 && b.laba != null, `${at} angka inti`);
    if (b.aset != null) assert.ok(b.aset > b.kredit, `${at} aset < kredit`);
    if (b.npl != null) assert.ok(b.npl > 0 && b.npl < 10, `${at} npl`);
    if (b.car != null) assert.ok(b.car > 8 && b.car < 60, `${at} car`);
    if (b.casa != null) assert.ok(b.casa > 20 && b.casa < 100, `${at} casa`);
    if (b.ldr != null) {
      assert.ok(b.ldr > 50 && b.ldr < 120, `${at} ldr`);
      // LDR resmi bisa berbeda sedikit dari kredit/DPK di rilis, tapi tidak jauh.
      if (!b.keterangan) assert.ok(Math.abs(b.ldr - (b.kredit / b.dpk) * 100) < 6, `${at} ldr jauh dari kredit/DPK tanpa keterangan`);
    }
    for (const k of b.dihitung || []) assert.ok(METRICS.some((m) => m.key === k), `${at} dihitung ${k}`);
    for (const [k, v] of Object.entries(b.tumbuh || {})) if (v != null) assert.ok(Math.abs(v) < 100, `${at} tumbuh ${k}`);
  }
  for (const g of ['bumn', 'swasta', 'bpd']) assert.ok(DATA.bank.filter((b) => b.grup === g).length >= 2, `kelompok ${g} minimal dua bank`);
  assert.ok(periodsOf(DATA.bank).length >= 1);
});
