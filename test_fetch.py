"""Uji pembaca SEKI dengan lembar tiruan yang meniru tata letak tabel Bank Indonesia."""

import unittest
from datetime import date, datetime

import fetch
import seki
from fetchlib import kode_provinsi

TODAY = date(2026, 10, 24)
MONTHS = ["Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu"]


def sheet(rows, months=MONTHS, years=True, title="I.17 POSISI SIMPANAN"):
    """Lembar: judul, satuan, baris tahun, baris bulan, lalu baris (no, label, nilai..., label Inggris)."""
    n = len(months)
    grid = [[title], ["(Miliar Rp)"], [], []]
    if years:
        yr = ["", ""] + [""] * n
        yr[2] = 2025
        yr[2 + months.index("Jan")] = 2026
        grid[2] = yr
    grid[3] = ["No", "Kelompok Bank"] + months + ["Group of Banks"]
    for i, (label, vals) in enumerate(rows, 1):
        cells = [vals(j) if callable(vals) else (vals[j] if vals else "") for j in range(n)] if vals is not None else [""] * n
        grid.append([float(i), label] + cells + ["(english)"])
    return grid


def ramp(base, step=10):
    return lambda j: f"{base + j * step:,}"


SIMPANAN = [
    ("Rupiah", ramp(7000)),
    ("Bank Persero", ramp(3000)), ("Giro", ramp(800)), ("Tabungan", ramp(1200)), ("Deposito", ramp(1000)),
    ("Bank Pemerintah Daerah", ramp(700)), ("Giro", ramp(170)), ("Tabungan", ramp(230)), ("Deposito", ramp(300)),
    ("Bank Swasta Nasional", ramp(3300)), ("Giro", ramp(750)), ("Tabungan", ramp(1100)), ("Deposito", ramp(1450)),
    ("Kantor Cabang dari Bank yang\nBerkedudukan di Luar Negeri", ramp(140)), ("Giro", ramp(95)), ("Tabungan", ramp(5)), ("Deposito", ramp(40)),
    ("Bank Perkreditan Rakyat", ramp(158)), ("Giro", ramp(0, 0)), ("Tabungan", ramp(48)), ("Deposito", ramp(110)),
    ("Valuta Asing", ramp(1300)),
    ("Bank Persero", ramp(614)), ("Giro", ramp(440)), ("Tabungan", ramp(56)), ("Deposito", ramp(118)),
    ("Bank Pemerintah Daerah", ramp(10)), ("Giro", ramp(8)), ("Tabungan", ramp(1)), ("Deposito", ramp(1)),
    ("Bank Swasta Nasional", ramp(600)), ("Giro", ramp(300)), ("Tabungan", ramp(100)), ("Deposito", ramp(200)),
]


class Header(unittest.TestCase):
    def test_years_from_year_row(self):
        g = sheet(SIMPANAN)
        h = seki.find_header(g)
        self.assertEqual(h, 3)
        cols = seki.month_columns(g, h, TODAY)
        vals = list(cols.values())
        self.assertEqual(vals[0], "2025-03")
        self.assertEqual(vals[9], "2025-12")
        self.assertEqual(vals[10], "2026-01")
        self.assertEqual(vals[-1], "2026-08")
        self.assertEqual(len(vals), 18)

    def test_year_only_over_second_year(self):
        g = sheet(SIMPANAN)
        g[2][2] = ""  # baris tahun hanya mencantumkan 2026
        vals = list(seki.month_columns(g, 3, TODAY).values())
        self.assertEqual((vals[0], vals[-1]), ("2025-03", "2026-08"))

    def test_year_centered_mid_block(self):
        g = sheet(SIMPANAN)
        g[2] = [""] * len(g[2])
        g[2][5] = 2025
        g[2][2 + 13] = 2026  # di atas "Apr" 2026, bukan "Jan"
        vals = list(seki.month_columns(g, 3, TODAY).values())
        self.assertEqual(vals[0], "2025-03")
        self.assertEqual(vals[10], "2026-01")
        self.assertEqual(vals[-1], "2026-08")

    def test_no_years_counts_back_from_today(self):
        g = sheet(SIMPANAN, years=False)
        vals = list(seki.month_columns(g, 3, TODAY).values())
        self.assertEqual((vals[0], vals[-1]), ("2025-03", "2026-08"))

    def test_date_cells(self):
        g = sheet(SIMPANAN, years=False)
        months = [datetime(2025, 3 + i, 1) if i < 10 else datetime(2026, i - 9, 1) for i in range(18)]
        g[3] = ["No", "Kelompok"] + months + ["Group"]
        vals = list(seki.month_columns(g, 3, TODAY).values())
        self.assertEqual((vals[0], vals[-1]), ("2025-03", "2026-08"))

    def test_footnote_marks(self):
        for cell, want in [("Agu*)", (None, 8)), ("Sep**", (None, 9)), ("Okt 1)", (None, 10)), ("Des^", (None, 12)), ("Jan 2026*)", (2026, 1)), ("Mar r)", (None, 3))]:
            self.assertEqual(seki.month_token(cell), want, cell)
        for cell, want in [("2026*)", 2026), ("2025 r)", 2025), ("2026**", 2026), ("2024 (*)", 2024)]:
            self.assertEqual(seki.year_token(cell), want, cell)

    def test_month_tokens(self):
        self.assertEqual(seki.month_token("Agt"), (None, 8))
        self.assertEqual(seki.month_token("Jan*"), (None, 1))
        self.assertEqual(seki.month_token("Des r)"), (None, 12))
        self.assertEqual(seki.month_token("Aug-26"), (2026, 8))
        self.assertEqual(seki.month_token("Mei 2026"), (2026, 5))
        self.assertIsNone(seki.month_token("Bank Persero"))
        self.assertIsNone(seki.month_token("Jumlah"))


class Simpanan(unittest.TestCase):
    def test_sums_rupiah_and_valas(self):
        rows = seki.data_rows(sheet(SIMPANAN), TODAY)
        out = seki.simpanan_by_group(rows)
        self.assertEqual(set(out), {"persero", "bpd", "busn", "kcba", "bpr"})
        self.assertEqual(out["persero"]["total"]["2025-03"], 3000 + 614)
        self.assertEqual(out["persero"]["giro"]["2026-08"], 800 + 170 + 440 + 170)
        self.assertEqual(out["kcba"]["total"]["2025-03"], 140)  # tanpa blok valas
        self.assertEqual(out["bpr"]["giro"]["2025-03"], 0)
        fetch.check("simpanan", out)

    def test_total_block_preferred(self):
        rows = SIMPANAN + [("Jumlah", ramp(9000)), ("Bank Persero", ramp(5000)), ("Giro", ramp(1))]
        out = seki.simpanan_by_group(seki.data_rows(sheet(rows), TODAY))
        self.assertEqual(out["persero"]["total"]["2025-03"], 5000)
        self.assertEqual(out["persero"]["giro"]["2025-03"], 1)


KREDIT = [
    ("1. Bank Persero", ramp(3376)), ("Pinjaman Menurut Lapangan Usaha", ramp(3000)), ("Pertanian", ramp(200)),
    ("Rumah Tangga", ramp(500)),
    ("2. Bank Pemerintah Daerah", ramp(644)), ("Pertanian", ramp(20)),
    ("3. Bank Swasta Nasional", ramp(3437)), ("Pertanian", ramp(300)),
    ("4. Kantor Cabang dari Bank yang Berkedudukan di Luar Negeri", ramp(190)),
    ("5. Bank Perkreditan Rakyat", ramp(169)),
    ("6. Jumlah (1 s.d. 5)", ramp(7818)),
]


class Kredit(unittest.TestCase):
    def test_group_totals(self):
        out = seki.by_group_totals(seki.data_rows(sheet(KREDIT, title="I.4"), TODAY))
        self.assertEqual(out["persero"]["2025-03"], 3376)
        self.assertEqual(out["total"]["2026-08"], 7818 + 170)
        self.assertEqual(out["kcba"]["2025-04"], 200)
        fetch.check("kredit", out)

    def test_incomplete_rejected(self):
        with self.assertRaises(ValueError):
            fetch.check("kredit", {"persero": {"2025-03": 1}})


RATES = [
    ("Bank Persero", None), ("Pinjaman Modal Kerja Yang Diberikan", ["8.82"] * 18), ("Pinjaman Investasi Yang Diberikan", ["9.09"] * 18),
    ("Pinjaman Konsumsi Yang Diberikan", ["9.04"] * 18),
    ("Bank Swasta Nasional", None), ("Pinjaman Modal Kerja Yang Diberikan", ["8.60"] * 18),
    ("Bank Umum", None), ("Pinjaman Modal Kerja Yang Diberikan", ["8.66"] * 18),
]
TENOR = [("Bank Persero", None), ("1 Bulan", ["4.68"] * 18), ("12 Bulan", ["3.54"] * 18),
         ("Bank Umum", None), ("1 Bulan", ["4.82"] * 18), ("24 Bulan", ["4.45"] * 18)]


class Rates(unittest.TestCase):
    def test_loan_rates(self):
        out = seki.rates_by_group(seki.data_rows(sheet(RATES, title="I.26"), TODAY), seki.LOAN_TYPES)
        self.assertEqual(out["persero"]["modal_kerja"]["2026-08"], 8.82)
        self.assertEqual(out["persero"]["konsumsi"]["2025-03"], 9.04)
        self.assertEqual(out["umum"]["modal_kerja"]["2025-03"], 8.66)
        self.assertNotIn("investasi", out["busn"])

    def test_tenors(self):
        out = seki.rates_by_group(seki.data_rows(sheet(TENOR, title="I.28"), TODAY), seki.TENORS)
        self.assertEqual(out["persero"]["12"]["2025-03"], 3.54)
        self.assertEqual(out["umum"]["24"]["2025-03"], 4.45)
        self.assertNotIn("12", out["umum"])


class Provinsi(unittest.TestCase):
    def test_provinces(self):
        names = ["Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Jambi", "Sumatera Selatan", "Bengkulu", "Lampung",
                 "Kep. Bangka Belitung", "Kepulauan Riau", "DKI Jakarta", "Jawa Barat", "Jawa Tengah", "D.I. Yogyakarta",
                 "Jawa Timur", "Banten", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur 1)", "Kalimantan Barat",
                 "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara", "Sulawesi Utara",
                 "Sulawesi Tengah", "Sulawesi Selatan", "Sulawesi Tenggara", "Gorontalo", "Sulawesi Barat", "Maluku",
                 "Maluku Utara", "Papua Barat", "Papua", "Jumlah"]
        rows = [(n, ramp(100 + i)) for i, n in enumerate(names)]
        prov, total = seki.by_province(seki.data_rows(sheet(rows, title="I.12"), TODAY), kode_provinsi)
        self.assertEqual(len(prov), 34)
        self.assertEqual(prov["53"]["2025-03"], 118)
        self.assertEqual(prov["34"]["2025-03"], 113)
        self.assertEqual(total["2025-03"], 134)
        fetch.check("kredit_prov", {"provinsi": prov, "total": total})


class Files(unittest.TestCase):
    def test_html_table_fallback(self):
        html = "<table><tr><td>I.30</td></tr><tr><td></td><td>2026</td></tr><tr><td>No</td><td>Kelompok</td>" + \
            "".join(f"<td>{m}</td>" for m in ["Mar", "Apr", "Mei", "Jun", "Jul", "Agu"]) + \
            "</tr><tr><td>1</td><td>Bank Persero</td>" + "".join("<td>1.25</td>" for _ in range(6)) + "</tr></table>"
        rows = seki.data_rows(seki.read_grid(html.encode()), TODAY)
        self.assertEqual(rows[0][0], "Bank Persero")
        self.assertEqual(rows[0][1]["2026-08"], 1.25)

    def test_unknown_format(self):
        with self.assertRaises(ValueError):
            seki.read_grid(b"%PDF-1.4 ...")

    @unittest.skipUnless(__import__("importlib").util.find_spec("xlwt"), "xlwt tidak terpasang")
    def test_real_xls(self):
        import io

        import xlwt

        wb = xlwt.Workbook()
        ws = wb.add_sheet("I.4")
        g = sheet(KREDIT, title="I.4")
        g[2] = []
        for r, row in enumerate(g):
            for c, v in enumerate(row):
                if v != "":
                    ws.write(r, c, v)
        ws.write_merge(2, 2, 2, 11, 2025)
        ws.write_merge(2, 2, 12, 19, 2026)
        buf = io.BytesIO()
        wb.save(buf)
        rows = seki.data_rows(seki.read_grid(buf.getvalue()), TODAY)
        out = seki.by_group_totals(rows)
        self.assertEqual(out["persero"]["2025-03"], 3376)
        self.assertEqual(max(out["total"]), "2026-08")


class SplitSheets(unittest.TestCase):
    """Tabel I.4 versi 2026: kelompok bank dipecah ke tiga lembar dengan bulan yang sama."""

    def workbook(self):
        import io

        import xlwt

        wb = xlwt.Workbook()
        groups = [[], [], []]
        part = 0
        for label, vals in KREDIT:
            low = label.lower()
            if "swasta" in low:
                part = 1
            elif "perkreditan" in low or "bpr" in low:
                part = 2
            groups[part].append((label, vals))
        for i, rows in enumerate(groups, 1):
            ws = wb.add_sheet(f"I.4_{i}")
            for r, row in enumerate(sheet(rows, title="I.4")):
                for c, v in enumerate(row):
                    if v != "":
                        ws.write(r, c, v)
        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue(), groups

    @unittest.skipUnless(__import__("importlib").util.find_spec("xlwt"), "xlwt tidak terpasang")
    def test_split_sheets_are_joined(self):
        raw, groups = self.workbook()
        self.assertTrue(all(groups), "tiap lembar berisi sebagian kelompok")
        sheets = seki.sheet_rows(raw, TODAY)
        self.assertEqual(len(sheets), 3)
        with self.assertRaises((ValueError, KeyError)):
            fetch.check("kredit", fetch.extract("kredit", sheets[0][1]))
        joined = fetch.extract("kredit", fetch.join_sheets([rows for _, rows in sheets]))
        fetch.check("kredit", joined)
        self.assertEqual(max(joined["persero"]), "2026-08")
        self.assertEqual(set(joined) >= {"persero", "bpd", "busn", "kcba", "bpr"}, True)


class MultiSheet(unittest.TestCase):
    """Berkas BI berisi lembar riwayat lama yang lebih panjang dan lembar terbaru yang lebih pendek."""

    def workbook(self):
        import io

        import xlwt

        wb = xlwt.Workbook()
        names = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
        old_months = [f"{names[(i) % 12]} {2015 + i // 12}" for i in range(30)]  # Jan 2015 .. Jun 2017
        ws = wb.add_sheet("1999-2017")
        g = sheet([(label, ramp(100 * k)) for k, (label, _) in enumerate(KREDIT, 1)], months=old_months, years=False, title="I.4 lama")
        for r, row in enumerate(g):
            for c, v in enumerate(row):
                if v != "":
                    ws.write(r, c, v)
        ws2 = wb.add_sheet("2017-")
        g = sheet(KREDIT, title="I.4")
        g[2] = []
        for r, row in enumerate(g):
            for c, v in enumerate(row):
                if v != "":
                    ws2.write(r, c, v)
        ws2.write_merge(2, 2, 2, 11, 2025)
        ws2.write_merge(2, 2, 12, 19, 2026)
        buf = io.BytesIO()
        wb.save(buf)
        return buf.getvalue()

    @unittest.skipUnless(__import__("importlib").util.find_spec("xlwt"), "xlwt tidak terpasang")
    def test_newest_sheet_wins_and_all_sheets_read(self):
        raw = self.workbook()
        self.assertEqual(max(seki.by_group_totals(seki.data_rows(seki.read_grid(raw, TODAY), TODAY))["total"]), "2026-08")
        sheets = seki.sheet_rows(raw, TODAY)
        self.assertEqual([latest for latest, _ in sheets], ["2017-06", "2026-08"])
        part = {}
        for _, rows in sheets:
            part = fetch.merge_tree(part, seki.by_group_totals(rows))
        self.assertIn("2015-01", part["persero"])
        self.assertIn("2026-08", part["persero"])
        pruned = fetch.prune(part)
        self.assertNotIn("2017-06", pruned["persero"])
        self.assertEqual(min(pruned["persero"]), "2025-03")


class StackedBlocks(unittest.TestCase):
    def test_two_blocks_in_one_sheet(self):
        """Blok lama (Mar 2025 s.d. Agu 2026 versi lama) ditumpuk di atas blok baru dengan bulan berbeda."""
        old_months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
        top = sheet([("Bank Persero", ramp(100)), ("Bank Pemerintah Daerah", ramp(50)), ("Bank Swasta Nasional", ramp(80))], months=old_months, years=False)
        top[3] = ["No", "Kelompok Bank"] + [f"{m} 2024" for m in old_months] + ["Group"]
        bottom = sheet([("Bank Persero", ramp(200)), ("Bank Pemerintah Daerah", ramp(60)), ("Bank Swasta Nasional", ramp(90))])
        grid = top + [[], []] + bottom
        self.assertEqual(len(seki.header_rows(grid)), 2)
        parts = [seki.by_group_totals(seki.data_rows(b, TODAY)) for b in seki.blocks(grid)]
        self.assertEqual(max(parts[0]["persero"]), "2024-12")
        self.assertEqual(max(parts[1]["persero"]), "2026-08")
        self.assertEqual(parts[1]["persero"]["2025-03"], 200)


class Merge(unittest.TestCase):
    def test_history_kept_and_revised(self):
        old = {"persero": {"2024-01": 1.0, "2025-03": 2.0}}
        new = {"persero": {"2025-03": 2.5, "2025-04": 3.0}, "bpd": {"2025-03": 9.0}}
        out = fetch.merge_tree(old, new)
        self.assertEqual(out["persero"], {"2024-01": 1.0, "2025-03": 2.5, "2025-04": 3.0})
        self.assertEqual(out["bpd"], {"2025-03": 9.0})


if __name__ == "__main__":
    unittest.main()
