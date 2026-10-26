"""Uji penarik daftar bank OJK dengan berkas tiruan (susunan asli belum bisa diunduh dari lingkungan pengembangan)."""

import io
import unittest

import openpyxl

import ojk


def workbook(rows):
    wb = openpyxl.Workbook()
    ws = wb.active
    for r in rows:
        ws.append(r)
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


class Links(unittest.TestCase):
    def test_latest_file_first(self):
        html = '''<a href="/id/kanal/perbankan/data-dan-statistik/Documents/Pages/Daftar-Alamat-Kantor-Pusat-Bank-Umum-Dan-Syariah/Daftar%20Alamat%20Kantor%20Pusat%20Bank%20Umum%20Dan%20Syariah%20-%20Desember%202025.xlsx">x</a>
        <a href="/id/kanal/perbankan/data-dan-statistik/Documents/Pages/Daftar-Alamat-Kantor-Pusat-Bank-Umum-Dan-Syariah/Daftar%20Alamat%20Kantor%20Pusat%20Bank%20Umum%20Dan%20Syariah%20-%20Juni%202026.xlsx">y</a>
        <a href="/lain/laporan.xlsx">z</a>'''
        links = ojk.file_links(html)
        self.assertEqual(len(links), 2)
        self.assertEqual(links[0][0], (2026, 6))
        self.assertTrue(links[0][1].startswith("https://www.ojk.go.id/id/kanal/perbankan/"))
        self.assertEqual(ojk.period_label(links[0][0]), "Juni 2026")


class Table(unittest.TestCase):
    def test_sections_header_and_continuation(self):
        rows = [
            ["DAFTAR ALAMAT KANTOR PUSAT BANK UMUM DAN SYARIAH"],
            ["Posisi Juni 2026"],
            [],
            ["No", "Nama Bank", "Alamat", "Kota", "Telepon", "Website"],
            ["BANK PERSERO"],
            [1, "PT Bank Rakyat Indonesia (Persero) Tbk", "Jl. Jenderal Sudirman Kav. 44-46", "Jakarta Pusat", "021-2510244", "www.bri.co.id"],
            [2, "PT Bank Mandiri (Persero) Tbk", "Jl. Jenderal Gatot Subroto Kav. 36-38", "Jakarta Selatan", "", "www.bankmandiri.co.id"],
            [None, None, "Plaza Mandiri", None, None, None],
            ["KANTOR CABANG BANK YANG BERKEDUDUKAN DI LUAR NEGERI"],
            [3, "Citibank, N.A.", "Jl. Jenderal Sudirman Kav. 54-55", "Jakarta Selatan", "", ""],
            [4, "PT BANK TANPA ALAMAT TBK"],
            ["Sumber: OJK"],
        ]
        sheets = ojk.read_rows(workbook(rows))
        banks, header = ojk.parse_table(sheets[0])
        self.assertEqual([b["nama"] for b in banks], [
            "PT Bank Rakyat Indonesia (Persero) Tbk", "PT Bank Mandiri (Persero) Tbk", "Citibank, N.A.", "PT BANK TANPA ALAMAT TBK"])
        self.assertEqual(banks[0]["kelompok"], "Bank Persero")
        self.assertEqual(banks[0]["situs"], "www.bri.co.id")
        self.assertEqual(banks[0]["kota"], "Jakarta Pusat")
        self.assertIn("Plaza Mandiri", banks[1]["alamat"])
        self.assertTrue(banks[2]["kelompok"].startswith("Kantor Cabang Bank"))
        self.assertEqual(banks[3]["kelompok"], banks[2]["kelompok"], "nama PT ... TBK tanpa alamat tetap bank, bukan judul bagian")
        self.assertEqual(header[1], "Nama Bank")

    def test_no_header(self):
        self.assertEqual(ojk.parse_table([["a", "b"], ["c", "d"]]), ([], []))


if __name__ == "__main__":
    unittest.main()
