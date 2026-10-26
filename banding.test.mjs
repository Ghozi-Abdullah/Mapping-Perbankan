import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCodes, pickQuarter, winners, tally, nearest, searchBanks, PRESETS, MAX } from './banding.js';

const DATA = JSON.parse(readFileSync(new URL('./bank.json', import.meta.url)));
const B = DATA.bank;
const QS = DATA.kuartal;
const get = (k) => B.find((b) => b.kode === k);

test('kode dari alamat: huruf besar, tanpa ganda, hanya yang ada, paling banyak tiga', () => {
  assert.deepEqual(parseCodes('bbri,BBCA,bbri', B), ['BBRI', 'BBCA']);
  assert.deepEqual(parseCodes('BBRI, XXXX ,NISP', B), ['BBRI', 'NISP']);
  assert.equal(parseCodes('BBRI,BMRI,BBNI,BBCA', B).length, MAX);
  assert.deepEqual(parseCodes('', B), []);
});

test('perbandingan siap pakai memakai kode yang ada', () => {
  for (const p of PRESETS) for (const k of p.b) assert.ok(get(k), `${p.name}: ${k}`);
});

test('kuartal pembanding: yang dimiliki semua bank terpilih', () => {
  const sel = ['BBRI', 'KALSEL'].map(get);
  assert.equal(pickQuarter(sel, QS, null), '2026Q2', 'bank tambahan baru punya Q2 2026');
  assert.equal(pickQuarter(sel, QS, '2025Q4'), '2025Q4', 'kuartal yang diminta tetap dipakai bila salah satu bank punya');
  assert.equal(pickQuarter(sel, QS, '2019Q1'), '2026Q2', 'kuartal di luar data diabaikan');
  assert.equal(pickQuarter([], QS, null), QS[QS.length - 1]);
});

test('siapa unggul: arah tiap ukuran dan seri', () => {
  const q = '2026Q2';
  const mk = (kode, v) => ({ kode, kuartal: { [q]: v } });
  const sel = [mk('A', { aset: 100, npl: 2, car: 20, laba: 5 }), mk('B', { aset: 80, npl: 1, car: 20 }), mk('C', { aset: 50, npl: 3, car: 15 }), mk('D', {})];
  const w = winners(sel, q);
  assert.deepEqual(w.aset.kode, ['A']);
  assert.deepEqual(w.npl.kode, ['B'], 'NPL makin rendah makin baik');
  assert.deepEqual(w.car.kode, ['A', 'B'], 'seri dihitung untuk keduanya');
  assert.equal(w.laba, undefined, 'angka laba B dan C hilang: tidak ada pemenang');
  assert.equal(w.ldr, undefined, 'LDR tidak punya arah terbaik');
  assert.deepEqual(tally(w), { A: 2, B: 2 });
  // Bank tanpa angka sama sekali di kuartal itu (D) tidak menghalangi gelar.
  assert.ok(w.aset);
});

test('saran lawan sepadan dan pencarian bank', () => {
  const q = '2026Q2';
  const n = nearest(get('BJTM'), B, q, 3);
  assert.equal(n.length, 3);
  assert.ok(n.every((b) => b.grup === 'bpd' && b.kode !== 'BJTM'));
  assert.equal(searchBanks(B, 'ocbc', q)[0].kode, 'NISP');
  assert.equal(searchBanks(B, 'jatim', q)[0].kode, 'BJTM');
  assert.ok(searchBanks(B, 'singapura', q).some((b) => b.kode === 'DBS'), 'negara pemilik ikut dicari');
  assert.ok(!searchBanks(B, 'bri', q, ['BBRI']).some((b) => b.kode === 'BBRI'), 'bank terpilih tidak ditawarkan lagi');
  const all = searchBanks(B, '', q);
  assert.equal(all.length, B.length);
});
