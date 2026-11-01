// Uji fungsi suku bunga per bank dan keabsahan bunga-bank.json. Jalankan: node --test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rate, tgl, rentang, lpsAt, lpsChanges, biRate, eventsFor, promoRows, sbdkRows, simpananRows, sortRows, filterRows, compareTable, grupOf } from './bunga.js';

const DATA = JSON.parse(readFileSync(new URL('./bunga-bank.json', import.meta.url)));
const DAFTAR = JSON.parse(readFileSync(new URL('./daftar-bank.json', import.meta.url)));
const D = Object.fromEntries(DAFTAR.bank.map((b) => [b.id, b]));

const MINI = {
  diperbarui: '2026-11-01',
  acuan: {
    lps: [{ berlaku: '2026-02-01', rupiah: 3.5 }, { berlaku: '2026-06-01', rupiah: 3.5 }, { berlaku: '2026-07-01', rupiah: 3.75 }],
    bi_rate: [{ tanggal: '2026-05-20', nilai: 5.25 }, { tanggal: '2026-06-18', nilai: 5.75 }, { tanggal: '2026-10-21', nilai: 5.75 }]
  },
  event: [
    { id: 'a', nama: 'Expo A', mulai: '2026-09-11' },
    { id: 'b', nama: 'Expo B', mulai: '2026-03-01' },
    { id: 'lama', nama: 'Expo lama', mulai: '2025-02-01' }
  ],
  promo: [
    { event: 'a', bank: 'bca', produk: 'kpr', bunga: 1.23, skema: 'fixed 1 tahun' },
    { event: 'a', bank: 'bca', produk: 'kpr', bunga: 2.5, skema: 'fixed 3 tahun' },
    { event: 'b', bank: 'bca', produk: 'kpr', bunga: 1.5 },
    { event: 'b', bank: 'bri', produk: 'kpr', bunga: 2.75 },
    { event: 'lama', bank: 'bni', produk: 'kpr', bunga: 0.5 },
    { event: 'a', bank: 'bri', produk: 'kkb', bunga: 1.8 }
  ],
  bank: {
    bca: { sbdk: { per: '2026-10', kpr: 9.07, non_kpr: 8.44 }, simpanan: { per: '2026-10-01', tabungan: { min: 0, max: 0.5 }, deposito: { 12: 3 } } },
    bri: { simpanan: { per: '2026-10-01', tabungan: { min: 0.1, max: 0.5 }, deposito: { 12: 2.5 } } }
  }
};

test('format persen dan tanggal', () => {
  assert.equal(rate(3.75), '3,75%');
  assert.equal(rate(2.5), '2,5%');
  assert.equal(rate(0), '0%');
  assert.equal(rate(null), '–');
  assert.equal(tgl('2026-02-27'), '27 Feb 2026');
  assert.equal(tgl('2026-10'), 'Okt 2026');
  assert.equal(rentang('2026-02-27', '2026-03-01'), '27 Feb–1 Mar 2026');
  assert.equal(rentang('2026-09-11', '2026-09-13'), '11–13 Sep 2026');
});

test('LPS: angka yang berlaku dan riwayat perubahan saja', () => {
  assert.equal(lpsAt(MINI.acuan, '2026-06-15').rupiah, 3.5);
  assert.equal(lpsAt(MINI.acuan, '2026-11-01').rupiah, 3.75);
  assert.deepEqual(lpsChanges(MINI.acuan).map((x) => x.berlaku), ['2026-02-01', '2026-07-01']);
});

test('BI-Rate: keputusan menahan tidak dihitung sebagai kenaikan', () => {
  const b = biRate(MINI.acuan);
  assert.equal(b.nilai, 5.75);
  assert.equal(b.tanggal, '2026-10-21');
  assert.equal(b.sejak, '2026-06-18');
  assert.equal(b.sebelum, 5.25);
});

test('promo per pameran dan promo terendah 12 bulan terakhir', () => {
  assert.deepEqual(eventsFor(MINI, 'kpr').map((e) => e.id), ['a', 'b', 'lama']);
  assert.deepEqual(eventsFor(MINI, 'kkb').map((e) => e.id), ['a']);
  const a = promoRows(MINI, 'kpr', 'a');
  assert.equal(a.length, 1);
  assert.equal(a[0].v, 1.23);
  assert.equal(a[0].lain.length, 1, 'skema 3 tahun disimpan sebagai skema lain');
  const all = promoRows(MINI, 'kpr', 'semua');
  assert.deepEqual(all.map((r) => [r.id, r.v]).sort(), [['bca', 1.23], ['bri', 2.75]], 'pameran lebih dari setahun tidak ikut');
});

test('urutan: kredit termurah dulu, simpanan tertinggi dulu', () => {
  assert.deepEqual(sortRows(sbdkRows(MINI, 'kpr'), 'kpr').map((r) => r.id), ['bca']);
  assert.deepEqual(sortRows(simpananRows(MINI, 'deposito', '12'), 'deposito').map((r) => r.id), ['bca', 'bri']);
  const tab = sortRows(simpananRows(MINI, 'tabungan'), 'tabungan');
  assert.deepEqual(tab.map((r) => r.id), ['bri', 'bca'], 'max sama: bunga saldo terendah lebih tinggi menang');
});

test('saring kelompok dan pencarian', () => {
  const rows = [{ id: 'bca' }, { id: 'bri' }, { id: 'maybank' }];
  assert.deepEqual(filterRows(rows, D, { grup: 'bumn' }).map((r) => r.id), ['bri']);
  assert.deepEqual(filterRows(rows, D, { grup: 'asing' }).map((r) => r.id), ['maybank']);
  assert.deepEqual(filterRows(rows, D, { q: 'central asia' }).map((r) => r.id), ['bca']);
  assert.equal(grupOf(D.cimb), 'asing');
});

test('tabel banding menandai yang terbaik per baris', () => {
  const t = compareTable(MINI, ['bca', 'bri', null]);
  const row = (label) => t.find((r) => r.label === label);
  assert.equal(row('KPR promo terendah').best, 0);
  assert.equal(row('Deposito 12 bulan').best, 0);
  assert.equal(row('Tabungan').best, -1, 'seri tidak ditandai');
  assert.equal(row('KKB promo terendah').best, -1, 'hanya satu bank berangka');
});

test('bunga-bank.json: bank dikenal, angka wajar, semua bersumber', () => {
  const urlOk = (list) => Array.isArray(list) && list.length && list.every((u) => /^https?:\/\//.test(u));
  for (const [id, b] of Object.entries(DATA.bank)) {
    assert.ok(D[id], `bank ${id} ada di daftar`);
    if (b.sbdk) {
      assert.ok(urlOk(b.sbdk.sumber), `${id} sbdk bersumber`);
      for (const k of ['korporasi', 'ritel', 'mikro', 'kpr', 'non_kpr']) if (b.sbdk[k] != null) assert.ok(b.sbdk[k] >= 2 && b.sbdk[k] <= 35, `${id} sbdk ${k}`);
    }
    if (b.simpanan) {
      assert.ok(urlOk(b.simpanan.sumber), `${id} simpanan bersumber`);
      for (const k of ['tabungan', 'giro']) {
        const r = b.simpanan[k];
        if (r) assert.ok(r.min >= 0 && r.max <= 10 && r.min <= r.max, `${id} ${k}`);
      }
      for (const [t, v] of Object.entries(b.simpanan.deposito || {})) assert.ok(['1', '3', '6', '12', '24'].includes(t) && v >= 0 && v <= 12, `${id} deposito ${t}`);
    }
  }
  const ev = new Set(DATA.event.map((e) => e.id));
  for (const p of DATA.promo) {
    assert.ok(ev.has(p.event) && D[p.bank] && ['kpr', 'kkb'].includes(p.produk), `promo ${p.event} ${p.bank}`);
    assert.ok(p.bunga >= 0 && p.bunga <= 20 && urlOk(p.sumber), `promo ${p.event} ${p.bank} angka dan sumber`);
  }
  for (const e of DATA.event) assert.match(e.mulai, /^\d{4}-\d{2}-\d{2}$/, `tanggal ${e.id}`);
  assert.ok(DATA.acuan.lps.length && DATA.acuan.bi_rate.length, 'acuan LPS dan BI-Rate ada');
});
