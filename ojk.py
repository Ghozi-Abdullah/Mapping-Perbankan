"""Tarik daftar resmi kantor pusat bank umum dan syariah dari situs OJK, lalu simpan ke data/ojk-bank.json.

Halaman OJK memuat satu berkas Excel per periode ("Daftar Alamat Kantor Pusat Bank Umum Dan Syariah - Juni 2026.xlsx").
Penarik mencari tautan berkas terbaru di halaman itu, membaca tabelnya tanpa mengandalkan posisi kolom yang pasti
(kolom dikenali dari judulnya), dan mencatat kelompok bank dari baris judul bagian bila ada.

Halaman "Semua bank" mencocokkan daftar ini dengan daftar-bank.json: bank yang ada di OJK tapi belum ada di situs,
atau sebaliknya, langsung terlihat. Bila gagal, data lama tetap dipakai dan berkas aslinya disimpan di data/mentah
untuk diperiksa.
"""

import io
import os
import re
import sys
import urllib.parse

from fetchlib import http_get, iso_now, log, read_json, write_json

PAGE = "https://www.ojk.go.id/id/kanal/perbankan/data-dan-statistik/Pages/Daftar-Alamat-Kantor-Pusat-Bank-Umum-Dan-Syariah.aspx"
OUT = "data/ojk-bank.json"
RAW_DIR = "data/mentah"
BULAN = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"]
COLS = {
    "nama": re.compile(r"nama"),
    "alamat": re.compile(r"alamat"),
    "kota": re.compile(r"kota|kab"),
    "telepon": re.compile(r"telp|telepon|phone"),
    "situs": re.compile(r"web|situs|homepage|url|laman"),
    "kelompok": re.compile(r"kelompok|jenis|kategori"),
    "sandi": re.compile(r"sandi|kode"),
}


def file_links(html, base=PAGE):
    """Semua tautan berkas Excel di halaman, terbaru dulu (menurut bulan dan tahun di nama berkas)."""
    out = []
    for href in re.findall(r'href="([^"]+?\.xlsx?)"', html, flags=re.I):
        url = urllib.parse.urljoin(base, href.replace("&amp;", "&"))
        name = urllib.parse.unquote(url.rsplit("/", 1)[-1])
        if "bank umum" not in name.lower() and "kantor pusat" not in name.lower():
            continue
        out.append((period_of(name), url, name))
    seen = set()
    uniq = [x for x in out if not (x[1] in seen or seen.add(x[1]))]
    return sorted(uniq, key=lambda x: x[0] or (0, 0), reverse=True)


def period_of(name):
    """(tahun, bulan) dari nama berkas, misalnya "... - Juni 2026.xlsx" → (2026, 6)."""
    low = name.lower()
    y = re.search(r"(20\d\d)", low)
    m = next((i + 1 for i, b in enumerate(BULAN) if b in low), None)
    if not y:
        return None
    return (int(y.group(1)), m or 0)


def period_label(p):
    if not p:
        return ""
    y, m = p
    return f"{BULAN[m - 1].capitalize()} {y}" if m else str(y)


def read_rows(raw, name=""):
    """Baris-baris tiap lembar sebagai daftar teks. Mendukung xlsx (openpyxl) dan xls (xlrd)."""
    sheets = []
    if raw[:2] == b"PK":
        import openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(raw), read_only=True, data_only=True)
        for ws in wb.worksheets:
            sheets.append([[clean(c) for c in row] for row in ws.iter_rows(values_only=True)])
    else:
        import xlrd
        book = xlrd.open_workbook(file_contents=raw)
        for sh in book.sheets():
            sheets.append([[clean(c) for c in sh.row_values(r)] for r in range(sh.nrows)])
    return sheets


def clean(v):
    if v is None:
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return re.sub(r"\s+", " ", str(v)).strip()


def find_header(rows, limit=25):
    """Indeks baris judul dan peta kolom {nama: i, alamat: j, ...}."""
    for i, row in enumerate(rows[:limit]):
        low = [c.lower() for c in row]
        if not any(COLS["nama"].search(c) for c in low):
            continue
        if not any(COLS["alamat"].search(c) or COLS["kota"].search(c) or COLS["telepon"].search(c) for c in low):
            continue
        cols = {}
        for key, rx in COLS.items():
            for j, c in enumerate(low):
                if c and rx.search(c) and j not in cols.values():
                    # "Nama Kota" bukan kolom nama bank.
                    if key == "nama" and COLS["kota"].search(c):
                        continue
                    cols[key] = j
                    break
        if "nama" in cols:
            return i, cols
    return None, None


def looks_bank(s):
    """Nama badan hukum bank (PT ..., ... Tbk, ... N.A., ... Ltd/Limited/AG), bukan judul bagian."""
    return bool(re.match(r"^p\.?\s?t\.?\s", s, flags=re.I) or re.search(r"\b(tbk|n\.\s?a\.?|ltd|limited|ag|plc|berhad)\b", s, flags=re.I))


def parse_table(rows):
    """Daftar bank dari satu lembar. Baris judul bagian (misalnya "BANK PERSERO") menjadi kelompok."""
    h, cols = find_header(rows)
    if h is None:
        return [], []
    header = rows[h]
    banks = []
    section = ""
    get = lambda row, k: row[cols[k]] if k in cols and cols[k] < len(row) else ""
    for row in rows[h + 1:]:
        cells = [c for c in row if c]
        if not cells:
            continue
        nama = get(row, "nama")
        others = [get(row, k) for k in ("alamat", "kota", "telepon", "situs")]
        text = " ".join(cells)
        if re.match(r"^(sumber|keterangan|catatan|total|jumlah)\b", text, flags=re.I):
            continue
        # Judul bagian: satu sel teks saja, tanpa alamat, dan bukan nama badan hukum.
        if len(cells) == 1 and not any(others) and not re.match(r"^\d+$", cells[0]) and not looks_bank(cells[0]):
            section = cells[0].title() if cells[0].isupper() else cells[0]
            continue
        if not nama:
            # Lanjutan alamat dari baris sebelumnya.
            if banks and get(row, "alamat"):
                banks[-1]["alamat"] = (banks[-1].get("alamat", "") + " " + get(row, "alamat")).strip()
            continue
        if re.match(r"^\d+$", nama) or nama.lower() == header[cols["nama"]].lower():
            continue
        item = {"nama": nama}
        for k in ("alamat", "kota", "telepon", "situs", "sandi"):
            v = get(row, k)
            if v:
                item[k] = v
        kel = get(row, "kelompok") or section
        if kel:
            item["kelompok"] = kel
        banks.append(item)
    return banks, header


def main():
    old = read_json(OUT, {}) or {}
    result = {"diambil": iso_now(), "halaman": PAGE}
    raw = None
    try:
        html = http_get(PAGE, timeout=60, retries=3).decode("utf-8", "replace")
        links = file_links(html)
        if not links:
            raise ValueError("tautan berkas daftar bank tidak ditemukan di halaman OJK")
        period, url, name = links[0]
        log("OJK:", name)
        raw = http_get(url, timeout=90, retries=3, headers={"Referer": PAGE})
        banks, header = [], []
        for rows in read_rows(raw, name):
            b, h = parse_table(rows)
            if len(b) > len(banks):
                banks, header = b, h
        if len(banks) < 50:
            raise ValueError(f"hanya {len(banks)} baris bank terbaca dari {name}; susunan tabel mungkin berubah")
        result.update(ok=True, sumber=url, judul=os.path.splitext(name)[0], periode=period_label(period),
                      kolom=[c for c in header if c], bank=banks)
        log("OJK:", len(banks), "baris")
    except Exception as e:  # noqa: BLE001 — catat penyebabnya, jangan hentikan alur kerja
        msg = f"{type(e).__name__}: {e}"[:300]
        log("OJK gagal:", msg)
        if raw:
            os.makedirs(RAW_DIR, exist_ok=True)
            with open(os.path.join(RAW_DIR, "ojk-daftar-bank.xlsx"), "wb") as f:
                f.write(raw)
        # Data lama yang berhasil tetap dipakai.
        keep = {k: old[k] for k in ("sumber", "judul", "periode", "kolom", "bank") if k in old}
        result.update(keep, ok=False, pesan=f"Penarikan daftar OJK terakhir gagal ({msg}).")
    write_json(OUT, result, pretty=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
