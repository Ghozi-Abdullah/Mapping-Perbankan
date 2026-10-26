import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { nameKey, matchName, isUUS, compareOJK, filterBanks } from './daftar.js';
import { LOGO } from './logos-semua.js';

const DATA = JSON.parse(readFileSync(new URL('./daftar-bank.json', import.meta.url)));
const BANKJSON = JSON.parse(readFileSync(new URL('./bank.json', import.meta.url)));
const B = DATA.bank;

test('daftar-bank.json: lengkap dan konsisten', () => {
  assert.match(DATA.diperbarui, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(B.length >= 100, 'seluruh bank umum, sekitar 105');
  const ids = new Set();
  for (const b of B) {
    assert.match(b.id, /^[a-z0-9]+$/, b.id);
    assert.ok(!ids.has(b.id), `${b.id} ganda`);
    ids.add(b.id);
    assert.ok(['bumn', 'swasta', 'bpd', 'asing'].includes(b.grup), b.id);
    assert.ok(b.nama?.length > 1 && b.resmi?.length > 5, b.id);
    if (b.grup !== 'asing') assert.match(b.resmi, /^PT /, `${b.id}: bank berbadan hukum Indonesia`);
    if (b.grup === 'bpd') assert.ok(b.wilayah && b.kota, `${b.id}: BPD punya wilayah dan kota`);
    if (b.kode) assert.match(b.kode, /^\d{3}$/, b.id);
    if (b.swift) assert.match(b.swift, /^[A-Z0-9]{8}$/, b.id);
    if (b.saham) assert.match(b.saham, /^[A-Z]{4}$/, b.id);
    if (b.situs) assert.doesNotMatch(b.situs, /^https?:|\s/, b.id);
    if (b.laporan) assert.ok(BANKJSON.bank.some((x) => x.kode === b.laporan), `${b.id}: laporan ${b.laporan} ada di bank.json`);
  }
  const per = (g) => B.filter((b) => b.grup === g).length;
  assert.equal(per('bpd'), 27, '27 bank pembangunan daerah');
  assert.ok(per('asing') >= 5 && per('asing') <= 9, 'kantor cabang bank asing');
  // Setiap bank yang punya laporan kuartalan muncul di daftar.
  for (const x of BANKJSON.bank) assert.ok(B.some((b) => b.laporan === x.kode), `${x.kode} ada di daftar`);
  // Nama resmi unik setelah dinormalkan, supaya pencocokan dengan OJK tidak ambigu.
  const keys = B.map((b) => nameKey(b.resmi));
  assert.equal(new Set(keys).size, keys.length, 'kunci nama resmi unik');
});

test('logo tersedia untuk hampir semua bank dan aman', () => {
  const without = B.filter((b) => !LOGO[b.id]).map((b) => b.id);
  assert.ok(without.length <= 3, `tanpa logo: ${without.join(', ')}`);
  for (const [id, l] of Object.entries(LOGO)) {
    assert.ok(l.r > 0.3 && l.r < 16, `${id} rasio`);
    if (l.svg) {
      assert.match(l.svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, id);
      assert.doesNotMatch(l.svg, /<script|\son\w+=|href=|<image|<foreignObject/i, id);
    } else {
      assert.match(l.webp, /^UklGR/, `${id} WebP`);
    }
  }
});

test('kunci nama: PT, Tbk, Persero, nama lama, dan BPD disamakan', () => {
  assert.equal(nameKey('PT Bank Rakyat Indonesia (Persero) Tbk'), 'rakyat indonesia');
  assert.equal(nameKey('PT BPD Jawa Timur'), nameKey('PT Bank Pembangunan Daerah Jawa Timur Tbk'));
  assert.equal(nameKey('PT Bank Saqu Indonesia (d.h PT Bank Jasa Jakarta)'), 'saqu indonesia');
  assert.equal(nameKey('PT Bank Raya Indonesia Tbk d/h PT BRI Agroniaga Tbk'), 'raya indonesia');
  assert.equal(nameKey('PT Bank Victoria Internasional Tbk'), nameKey('PT Bank Victoria International Tbk'));
  assert.ok(isUUS('PT Bank CIMB Niaga Syariah (UUS)'));
  assert.ok(!isUUS('PT Bank Syariah Indonesia'));
});

test('nama bank umum dari daftar luar cocok dengan bank yang benar', () => {
  const cases = {
    'PT Pan Indonesia Bank Tbk': 'panin',
    'PT BANK KB INDONESIA TBK': 'kb',
    'PT Bank KB Bukopin Syariah': 'kbs',
    'PT BPD Kaltim Kaltara': 'kaltimtara',
    'PT BPD Yogyakarta': 'diy',
    'PT Bank DKI': 'jakarta',
    'PT Bank Syariah Nasional (d.h PT Bank Victoria Syariah)': 'bsn',
    'PT Bank China Construction Bank Indonesia Tbk d/h PT BWK Internasional': 'ccb',
    'PT Bank Jtrust Indonesia d/h Bank Mutiara': 'jtrust',
    'PT Bank Kasikorn Indonesia Tbk': 'kbank',
    'PT Bank Multiarta Sentosa Tbk': 'mas',
    'PT Bank Mandiri (Persero) Tbk': 'mandiri',
    'PT Bank Mandiri Taspen': 'mantap',
    'PT Bank Syariah Indonesia': 'bsi',
    'PT Bank Jabar Banten Syariah': 'bjbs',
    'PT BPD Jawa Barat Dan Banten Tbk': 'bjb',
    'PT BPD Riau Kepri Syariah (Perseroda)': 'brks',
    'Citibank, N.A.': 'citi',
    'Bank of China (Hong Kong) Limited': 'boc',
    'PT Bank of India Indonesia Tbk': 'boi'
  };
  for (const [name, id] of Object.entries(cases)) assert.equal(matchName(name, B)?.id, id, name);
  assert.equal(matchName('PT Bank Perekonomian Rakyat Hasamitra', B), null, 'BPR tidak dicocokkan ke bank umum');
});

test('perbandingan dengan daftar OJK: UUS tidak dihitung, nama asing dilaporkan', () => {
  const rows = [
    { nama: 'PT Bank Rakyat Indonesia (Persero) Tbk' },
    { nama: 'PT Bank CIMB Niaga Tbk - UUS', kelompok: 'Unit Usaha Syariah' },
    { nama: 'PT Bank Contoh Baru Tbk' }
  ];
  const c = compareOJK(rows, B);
  assert.equal(c.found.size, 1);
  assert.equal(c.uus, 1);
  assert.deepEqual(c.missing.map((r) => r.nama), ['PT Bank Contoh Baru Tbk']);
  assert.equal(c.notInOJK.length, B.length - 1);
});

test('saring: kata kunci, kelompok, dan sifat', () => {
  assert.deepEqual(filterBanks(B, { q: '002' }).map((b) => b.id), ['bri']);
  assert.deepEqual(filterBanks(B, { q: 'BRINIDJA' }).map((b) => b.id), ['bri']);
  assert.ok(filterBanks(B, { q: 'mayora' }).some((b) => b.id === 'hibank'), 'nama lama ikut dicari');
  assert.equal(filterBanks(B, { grup: 'bpd' }).length, 27);
  assert.ok(filterBanks(B, { grup: 'bpd', sifat: new Set(['syariah']) }).every((b) => b.grup === 'bpd' && b.syariah));
  assert.ok(filterBanks(B, { q: 'jawa timur' }).some((b) => b.id === 'jatim'), 'provinsi ikut dicari');
});
