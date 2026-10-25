import test from 'node:test';
import assert from 'node:assert/strict';
import { yoy, yoyPoints, shiftMonth, ratioSeries, totalSeries, groupRows, provinceValues, commonLatest, monthLabel } from './logic.js';

test('bulan dan label', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2025-12', 1), '2026-01');
  assert.equal(monthLabel('2026-08'), 'Agu 26');
});

test('pertumbuhan tahunan', () => {
  const s = { '2025-08': 200, '2026-08': 230 };
  assert.equal(Math.round(yoy(s, '2026-08')), 15);
  assert.equal(yoy(s, '2026-07'), null);
  assert.equal(yoyPoints({ '2025-08': 5.1, '2026-08': 4.6 }, '2026-08').toFixed(1), '-0.5');
});

test('rasio dan total', () => {
  assert.deepEqual(ratioSeries({ '2026-08': 90 }, { '2026-08': 100 }), { '2026-08': 90 });
  const by = { persero: { m: 1 }, busn: { m: 2 }, bpd: { m: 3 }, kcba: { m: 4 }, bpr: { m: 5 } };
  assert.deepEqual(totalSeries(by), { m: 15 });
  assert.deepEqual(totalSeries({ ...by, total: { m: 99 } }), { m: 99 });
});

test('ringkasan kelompok', () => {
  const ym = '2026-08';
  const data = {
    kredit: { persero: { [ym]: 60 }, busn: { [ym]: 40 } },
    simpanan: { persero: { total: { [ym]: 100 }, giro: { [ym]: 30 }, tabungan: { [ym]: 40 } } }
  };
  const rows = groupRows(data, ym);
  const p = rows.find((r) => r.key === 'persero');
  assert.equal(p.pangsaKredit, 60);
  assert.equal(p.ldr, 60);
  assert.equal(p.casa, 70);
  assert.equal(rows.find((r) => r.key === 'bpd').kredit, null);
});

test('nilai provinsi dan bulan bersama', () => {
  const ym = '2026-08';
  const data = { kredit_prov: { provinsi: { 31: { [ym]: 50 } } }, simpanan_prov: { provinsi: { 31: { [ym]: 100 } } } };
  assert.deepEqual(provinceValues(data, 'ldr', ym), { 31: 50 });
  assert.equal(commonLatest([{ '2026-08': 1 }, { '2026-08': 1 }, { '2026-07': 1 }]), '2026-08');
  assert.equal(commonLatest([{ '2026-08': 1 }, { '2026-07': 1 }, { '2026-07': 1 }]), '2026-07');
});
