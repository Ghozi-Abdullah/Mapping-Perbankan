// Perhitungan Peta Perbankan. Semua deret berbentuk { "YYYY-MM": nilai } dalam miliar rupiah atau persen.

export const GROUPS = [
  { key: 'persero', name: 'BUMN', long: 'Bank BUMN (Persero)', color: 'var(--s1)', note: 'BRI, Mandiri, BNI, BTN' },
  { key: 'busn', name: 'Swasta', long: 'Bank swasta nasional', color: 'var(--s2)', note: 'Termasuk bank swasta milik grup asing, seperti BCA, CIMB Niaga, Danamon' },
  { key: 'bpd', name: 'BPD', long: 'Bank pembangunan daerah', color: 'var(--s3)', note: 'Bank milik pemerintah daerah, seperti bank bjb dan Bank Jatim' },
  { key: 'kcba', name: 'Cabang asing', long: 'Kantor cabang bank luar negeri', color: 'var(--s4)', note: 'Cabang langsung bank yang berkantor pusat di luar negeri' },
  { key: 'bpr', name: 'BPR', long: 'Bank perekonomian rakyat', color: 'var(--s5)', note: 'Bank kecil yang melayani usaha mikro dan masyarakat sekitar' }
];
export const GROUP = Object.fromEntries(GROUPS.map((g) => [g.key, g]));

const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
export const monthLabel = (ym, long = false) => {
  if (!ym) return '–';
  const [y, m] = ym.split('-').map(Number);
  return long ? `${BULAN[m - 1]} ${y}` : `${BLN[m - 1]} ${String(y).slice(2)}`;
};
export const shiftMonth = (ym, n) => {
  const [y, m] = ym.split('-').map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};

export const monthsOf = (...series) => [...new Set(series.flatMap((s) => Object.keys(s || {})))].sort();
export const at = (s, ym) => (s && s[ym] != null ? s[ym] : null);
export function latestMonth(s) {
  const ks = Object.keys(s || {}).filter((k) => s[k] != null).sort();
  return ks[ks.length - 1] || null;
}

/** Pertumbuhan tahunan dalam persen; null bila bulan setahun lalu tidak ada. */
export function yoy(s, ym) {
  const now = at(s, ym);
  const before = at(s, shiftMonth(ym, -12));
  if (now == null || before == null || before === 0) return null;
  return ((now - before) / Math.abs(before)) * 100;
}
/** Selisih poin persentase dibanding setahun lalu (untuk suku bunga dan rasio). */
export function yoyPoints(s, ym) {
  const now = at(s, ym);
  const before = at(s, shiftMonth(ym, -12));
  return now == null || before == null ? null : now - before;
}

export function ratio(a, b, ym) {
  const x = at(a, ym);
  const y = at(b, ym);
  return x == null || !y ? null : (x / y) * 100;
}
/** Deret rasio bulanan a/b dalam persen. */
export function ratioSeries(a, b) {
  const out = {};
  for (const ym of monthsOf(a)) {
    const r = ratio(a, b, ym);
    if (r != null) out[ym] = r;
  }
  return out;
}
export function yoySeries(s) {
  const out = {};
  for (const ym of monthsOf(s)) {
    const g = yoy(s, ym);
    if (g != null) out[ym] = g;
  }
  return out;
}

/** Kredit atau simpanan seluruh bank: pakai baris Jumlah dari BI, atau jumlahkan kelompok bila tidak ada. */
export function totalSeries(byGroup) {
  if (byGroup.total && Object.keys(byGroup.total).length) return byGroup.total;
  const out = {};
  for (const ym of monthsOf(...GROUPS.map((g) => byGroup[g.key]))) {
    const vals = GROUPS.map((g) => at(byGroup[g.key], ym));
    if (vals.every((v) => v != null)) out[ym] = vals.reduce((a, b) => a + b, 0);
  }
  return out;
}

/** Ringkasan per kelompok untuk bulan ym. */
export function groupRows(data, ym) {
  const kredit = data.kredit || {};
  const simp = data.simpanan || {};
  const totK = GROUPS.reduce((a, g) => a + (at(kredit[g.key], ym) || 0), 0);
  const totS = GROUPS.reduce((a, g) => a + (at(simp[g.key]?.total, ym) || 0), 0);
  return GROUPS.map((g) => {
    const k = kredit[g.key];
    const s = simp[g.key] || {};
    const casa = s.total && s.giro && s.tabungan && at(s.total, ym) ? ((at(s.giro, ym) + at(s.tabungan, ym)) / at(s.total, ym)) * 100 : null;
    return {
      ...g,
      kredit: at(k, ym),
      pangsaKredit: totK && at(k, ym) != null ? (at(k, ym) / totK) * 100 : null,
      tumbuhKredit: yoy(k, ym),
      simpanan: at(s.total, ym),
      pangsaSimpanan: totS && at(s.total, ym) != null ? (at(s.total, ym) / totS) * 100 : null,
      tumbuhSimpanan: yoy(s.total, ym),
      ldr: ratio(k, s.total, ym),
      casa
    };
  });
}

/** Nilai per provinsi untuk peta: metric = kredit | simpanan | ldr | tumbuh. */
export function provinceValues(data, metric, ym) {
  const k = data.kredit_prov?.provinsi || {};
  const s = data.simpanan_prov?.provinsi || {};
  const out = {};
  for (const kode of new Set([...Object.keys(k), ...Object.keys(s)])) {
    let v = null;
    if (metric === 'kredit') v = at(k[kode], ym);
    else if (metric === 'simpanan') v = at(s[kode], ym);
    else if (metric === 'ldr') v = ratio(k[kode], s[kode], ym);
    else if (metric === 'tumbuh') v = yoy(k[kode], ym);
    if (v != null) out[kode] = v;
  }
  return out;
}

/** Bulan terbaru yang dimiliki sebagian besar deret (supaya satu tabel telat tidak membuat kolom kosong). */
export function commonLatest(seriesList) {
  const counts = {};
  for (const s of seriesList) {
    const m = latestMonth(s);
    if (m) counts[m] = (counts[m] || 0) + 1;
  }
  const ms = Object.keys(counts).sort();
  if (!ms.length) return null;
  const need = Math.ceil(seriesList.filter((s) => s && Object.keys(s).length).length / 2);
  let acc = 0;
  for (let i = ms.length - 1; i >= 0; i--) {
    acc += counts[ms[i]];
    if (acc >= need) return ms[i];
  }
  return ms[ms.length - 1];
}
