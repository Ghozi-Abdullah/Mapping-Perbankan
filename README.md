<div align="center">

# Peta Perbankan

**Laporan keuangan 14 bank besar Indonesia per kuartal sejak akhir 2023, dibandingkan dalam kelompoknya, plus peta kredit dan tabungan seluruh industri.**

[**Coba sekarang →**](https://ghozi-abdullah.github.io/Mapping-Perbankan/)

</div>

Peta Perbankan merangkum laporan keuangan bank dan statistik resmi Bank Indonesia menjadi satu halaman yang mudah dibaca. Bandingkan BRI dengan Mandiri, BCA dengan CIMB Niaga, atau bank bjb dengan Bank Jatim: siapa yang paling besar, paling untung, dan paling sehat. Lalu lihat gambaran seluruh industri: seberapa besar bank BUMN dibanding bank swasta, bank daerah, dan cabang bank asing; bagaimana kredit tumbuh setiap bulan; provinsi mana yang paling banyak menerima kredit; dan berapa bunga kredit serta deposito di tiap kelompok bank.

Dibuat untuk mahasiswa, analis, jurnalis, dan siapa saja yang ingin memahami peta perbankan Indonesia tanpa membuka puluhan tabel Excel.

## Kenapa Peta Perbankan

**Data resmi, bukan perkiraan.** Angka per bank berasal dari laporan keuangan publikasi dan rilis kinerja resmi tiap bank, dengan sumber tercantum di halaman bank masing-masing. Angka per kelompok berasal dari Statistik Ekonomi dan Keuangan Indonesia (SEKI) yang diterbitkan Bank Indonesia setiap bulan.

**Selalu terbaru.** Halaman memeriksa rilis SEKI dua kali seminggu dan menambahkan bulan baru secara otomatis. Riwayat bulan lama tetap disimpan, jadi grafik makin panjang dari waktu ke waktu.

**Bandingkan yang setara.** BUMN dibandingkan dengan BUMN, swasta dengan swasta, bank daerah dengan bank daerah. Peringkat tiap bank dihitung di dalam kelompoknya sendiri.

## Fitur

### Logo bank yang melayang
Logo 14 bank mengorbit dan berputar dalam ruang 3D di halaman pembuka. Sisi depan menampilkan logo, sisi belakang laba terbaru. Putarannya melambat saat logo menghadap depan, jadi logo lebih sering terlihat. Arahkan kursor untuk menghentikan putarannya, lalu klik untuk membuka laporan bank itu. Di ponsel, logo tersusun dalam silinder yang bisa diputar dengan geseran jari.

### Per bank, per kuartal
Pilih kuartal (Q4 2023 sampai kuartal terbaru) dan kelompok (BUMN, swasta, BPD, atau semua). Kartu tiap bank berisi laba, kredit, NPL, dan CAR beserta perubahannya dibanding kuartal yang sama tahun lalu. Pilih ukuran (kredit, aset, DPK, laba, NPL, CAR, CASA, LDR) untuk melihat peringkatnya, lalu baca tabel lengkapnya dengan angka terbaik di tiap kolom ditebalkan. Karena semua bank dibandingkan pada kuartal yang sama, laba tiga bulan tidak pernah diadu dengan laba sembilan bulan.

### Tren kuartalan
Grafik garis untuk setiap bank di kelompok yang dipilih. Laba ditampilkan per kuartal (bukan kumulatif) supaya naik turunnya terlihat. Perubahan cakupan data, seperti BSI yang keluar dari konsolidasi Bank Mandiri pada 2026, ditandai dengan garis yang diputus.

### Halaman tiap bank
Profil singkat, sembilan angka utama dengan pertumbuhan tahunan dan peringkat di kelompoknya, grafik tren, tabel semua kuartal, kabar terbaru dari laporan bulanan, sumber untuk setiap kuartal, dan tautan langsung ke laporan keuangan di Bursa Efek Indonesia. Setiap bank punya alamat sendiri, misalnya `#bank-BMRI`, jadi mudah dibagikan.

### Ringkasan nasional
Total kredit, total simpanan masyarakat, rasio kredit terhadap simpanan, dan porsi dana murah (giro dan tabungan), lengkap dengan perubahan dari tahun lalu dan grafik kecil dua tahun terakhir.

### BUMN vs swasta vs BPD vs asing
Pangsa kredit dan simpanan tiap kelompok bank, pertumbuhan tahunan, rasio kredit/simpanan, dan porsi dana murah dalam satu tabel.

### Tren bulanan
Grafik pertumbuhan kredit, nilai kredit, simpanan, dan rasio kredit/simpanan per kelompok bank. Arahkan kursor atau sentuh grafik untuk melihat angka tiap bulan.

### Peta provinsi
Peta petak 34 provinsi untuk kredit, simpanan, rasio kredit/simpanan, dan pertumbuhan kredit. Pilih provinsi untuk melihat rinciannya, termasuk porsinya dari kredit nasional.

### Suku bunga
Bunga kredit modal kerja, investasi, dan konsumsi; bunga deposito 1 sampai 12 bulan; serta bunga tabungan, per kelompok bank, beserta perubahannya dalam setahun.

## Sumber data

**Per bank.** Rilis kinerja kuartalan, factsheet, dan laporan keuangan publikasi BRI, Bank Mandiri, BNI, BTN, BSI, BCA, CIMB Niaga, OCBC Indonesia, PermataBank, Danamon, Maybank Indonesia, PaninBank, bank bjb, dan Bank Jatim, serta media keuangan yang mengutipnya (Infobank, Kontan, Bisnis, Investor Trust, Katadata, CNBC Indonesia). Setiap angka di `bank.json` menyimpan tautan sumbernya. Angka yang tidak disebut di rilis dibiarkan kosong. Data diperbarui setiap musim laporan kuartalan. Logo bank berupa SVG dari koleksi [idn-finlogos](https://github.com/hafidznoor/idn-finlogos), disimpan di `logos.js` sehingga tajam di semua ukuran dan tidak dimuat dari situs lain.

**Per kelompok.** Bank Indonesia, [Statistik Ekonomi dan Keuangan Indonesia](https://www.bi.go.id/id/statistik/ekonomi-keuangan/seki/default.aspx):

| Tabel | Isi |
|---|---|
| I.4 | Kredit bank umum dan BPR menurut kelompok bank |
| I.12 | Kredit menurut lokasi proyek per provinsi |
| I.15 | Kredit properti menurut kelompok bank |
| I.17 | Simpanan masyarakat menurut kelompok bank dan jenis simpanan |
| I.19 | Simpanan masyarakat menurut provinsi |
| I.26 | Suku bunga kredit rupiah menurut kelompok bank |
| I.28 | Suku bunga deposito rupiah menurut kelompok bank |
| I.30 | Suku bunga tabungan rupiah menurut kelompok bank |

Tabel SEKI disajikan per kelompok bank, bukan per bank. Bank swasta milik grup asing yang berbadan hukum Indonesia, seperti CIMB Niaga dan Danamon, termasuk kelompok bank swasta nasional.

## Tampilan

Palet editorial Warm Ivory, Deep Editorial Blue, dan Coral Orange. Huruf mengikuti perangkat: SF di Apple, Aptos bila terpasang, dan Inter untuk sisanya. Interaksi kecil seperti tombol pilihan yang indikatornya meregang, tepi kartu yang menyala mengikuti kursor, dan kartu yang muncul dari blur terinspirasi dari [Bencho](https://bencho.dev). Semua animasi berhenti bila perangkat memakai pengaturan "kurangi gerakan".

## Lisensi

Kode dirilis dengan lisensi MIT. Huruf Inter dirilis dengan SIL Open Font License (lihat `LICENSE-inter.txt`). Ikon dari Lucide dengan lisensi ISC. Logo bank dari idn-finlogos dirilis dengan lisensi CC BY-NC 4.0 untuk penggunaan nonkomersial; merek dan logo tetap milik bank masing-masing (lihat `LICENSE-logo-bank.txt`).
