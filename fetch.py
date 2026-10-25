"""Tarik tabel SEKI Bank Indonesia untuk Peta Perbankan, lalu tulis data/perbankan.json.

Riwayat bulan lama disimpan: tabel SEKI hanya memuat sekitar 18 bulan terakhir, jadi setiap tarikan
menggabungkan bulan baru ke data yang sudah ada.
"""

import sys

import seki
from fetchlib import FetchError, Status, http_get, iso_now, kode_provinsi, log, read_json, write_json

BASE = "https://www.bi.go.id/SEKI/tabel/"
OUT = "data/perbankan.json"
TABLES = {
    "kredit": ("TABEL1_4", "I.4 Kredit Bank Umum dan BPR menurut kelompok bank"),
    "simpanan": ("TABEL1_17", "I.17 Simpanan masyarakat menurut kelompok bank dan jenis simpanan"),
    "kredit_prov": ("TABEL1_12", "I.12 Kredit menurut lokasi proyek provinsi"),
    "simpanan_prov": ("TABEL1_19", "I.19 Simpanan masyarakat menurut provinsi"),
    "kpr": ("TABEL1_15", "I.15 Kredit properti menurut kelompok bank"),
    "bunga_kredit": ("TABEL1_26", "I.26 Suku bunga kredit rupiah menurut kelompok bank"),
    "bunga_deposito": ("TABEL1_28", "I.28 Suku bunga deposito rupiah menurut kelompok bank"),
    "bunga_tabungan": ("TABEL1_30", "I.30 Suku bunga tabungan rupiah menurut kelompok bank"),
}
GROUP_KEYS = ("persero", "bpd", "busn", "kcba", "bpr", "umum", "total")


def merge(old, new):
    """Gabungkan dua deret {bulan: nilai}; nilai baru menimpa (BI kadang merevisi bulan sebelumnya)."""
    out = dict(old or {})
    out.update(new or {})
    return dict(sorted(out.items()))


def merge_tree(old, new):
    if not isinstance(new, dict):
        return new
    if new and all(isinstance(k, str) and len(k) == 7 and k[4] == "-" for k in new):
        return merge(old if isinstance(old, dict) else {}, new)
    out = dict(old or {}) if isinstance(old, dict) else {}
    for k, v in new.items():
        out[k] = merge_tree(out.get(k), v)
    return out


def extract(name, rows):
    if name == "kredit":
        return seki.by_group_totals(rows)
    if name == "kpr":
        # Tabel I.15 berisi beberapa jenis properti per kelompok; ambil baris total tiap kelompok.
        return seki.by_group_totals(rows)
    if name == "simpanan":
        return seki.simpanan_by_group(rows)
    if name in ("kredit_prov", "simpanan_prov"):
        prov, total = seki.by_province(rows, kode_provinsi)
        return {"provinsi": prov, "total": total or {}}
    if name == "bunga_kredit":
        return seki.rates_by_group(rows, seki.LOAN_TYPES)
    if name == "bunga_deposito":
        return seki.rates_by_group(rows, seki.TENORS)
    if name == "bunga_tabungan":
        out = {}
        for label, vals in rows:
            g = seki.group_of(label)
            if g and vals and g not in out:
                out["umum" if g == "total" else g] = vals
        return out
    raise KeyError(name)


def check(name, part):
    """Tolak hasil yang jelas salah baca supaya data lama tidak tertimpa sampah."""
    if name in ("kredit", "simpanan", "kpr"):
        found = [g for g in ("persero", "bpd", "busn") if part.get(g)]
        if len(found) < 3:
            raise ValueError(f"kelompok bank tidak lengkap ({', '.join(part) or 'kosong'})")
    elif name.endswith("_prov"):
        if len(part["provinsi"]) < 30:
            raise ValueError(f"hanya {len(part['provinsi'])} provinsi terbaca")
    elif not part:
        raise ValueError("tidak ada baris suku bunga terbaca")


def structure(rows, limit=60):
    """Ringkasan label untuk berkas diagnosa, supaya perubahan format BI cepat ketahuan."""
    return [[label, len(vals), max(vals) if vals else None] for label, vals in rows[:limit]]


def main():
    status = Status()
    prev = read_json(OUT, {}) or {}
    data = {k: prev.get(k, {}) for k in TABLES}
    diag = {}
    for name, (code, title) in TABLES.items():
        url = f"{BASE}{code}.xls"
        try:
            raw = http_get(url, timeout=60, headers={"Referer": "https://www.bi.go.id/id/statistik/ekonomi-keuangan/seki/default.aspx"})
            rows = seki.data_rows(seki.read_grid(raw))
            diag[name] = structure(rows)
            part = extract(name, rows)
            check(name, part)
            data[name] = merge_tree(data.get(name), part)
            months = sorted({m for s in _series(part) for m in s})
            status.ok(name, f"{code}: {months[0]} s.d. {months[-1]}" if months else code, len(rows))
        except (FetchError, ValueError, ImportError, KeyError) as e:
            status.fail(name, f"{code}: {e}")
    status.save()
    write_json("data/diagnosa.json", {"updated": iso_now(), "tabel": diag}, pretty=True)
    if not status.any_ok:
        log("Semua tabel gagal; data lama dibiarkan.")
        return 1
    latest = max((m for s in _series(data) for m in s), default=None)
    write_json(OUT, {
        "updated": iso_now(),
        "periode": latest,
        "satuan": {"nilai": "miliar rupiah", "bunga": "persen per tahun"},
        "sumber": [{"kode": code, "judul": title, "url": f"{BASE}{code}.xls"} for code, title in TABLES.values()],
        **data,
    })
    log("Selesai, periode terbaru", latest)
    return 0


def _series(tree):
    if isinstance(tree, dict):
        if tree and all(isinstance(k, str) and len(k) == 7 and k[4] == "-" for k in tree):
            yield tree
        else:
            for v in tree.values():
                yield from _series(v)


if __name__ == "__main__":
    sys.exit(main())
