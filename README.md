<div align="center">

# Peta Perbankan

**Daftar seluruh 105 bank umum di Indonesia, laporan keuangan 14 bank besar per kuartal sejak akhir 2023 yang dibandingkan dalam kelompoknya, plus peta kredit dan tabungan seluruh industri.**

[**Coba sekarang →**](https://ghozi-abdullah.github.io/Mapping-Perbankan/)

</div>

Peta Perbankan merangkum laporan keuangan bank dan statistik resmi Bank Indonesia menjadi beberapa halaman yang mudah dibaca. Bandingkan BRI dengan Mandiri, BCA dengan CIMB Niaga, atau bank bjb dengan Bank Jatim: siapa yang paling besar, paling untung, dan paling sehat. Lalu lihat gambaran seluruh industri: seberapa besar bank BUMN dibanding bank swasta, bank daerah, dan cabang bank asing; bagaimana kredit tumbuh setiap bulan; provinsi mana yang paling banyak menerima kredit; dan berapa bunga kredit serta deposito di tiap kelompok bank.

Dibuat untuk mahasiswa, analis, jurnalis, dan siapa saja yang ingin memahami peta perbankan Indonesia tanpa membuka puluhan tabel Excel.

## Kenapa Peta Perbankan

**Data resmi, bukan perkiraan.** Angka per bank berasal dari laporan keuangan publikasi dan rilis kinerja resmi tiap bank, dengan sumber tercantum di halaman bank masing-masing. Angka per kelompok berasal dari Statistik Ekonomi dan Keuangan Indonesia (SEKI) yang diterbitkan Bank Indonesia setiap bulan.

**Selalu terbaru.** Halaman memeriksa rilis SEKI dua kali seminggu dan menambahkan bulan baru secara otomatis. Riwayat bulan lama tetap disimpan, jadi grafik makin panjang dari waktu ke waktu.

**Bandingkan yang setara.** BUMN dibandingkan dengan BUMN, swasta dengan swasta, bank daerah dengan bank daerah. Peringkat tiap bank dihitung di dalam kelompoknya sendiri.

## Halaman

### Beranda
Logo 14 bank mengorbit dan berputar dalam ruang 3D di samping judul. Sisi depan menampilkan logo, sisi belakang laba terbaru; klik logo untuk membuka halaman bank itu. Di ponsel, logo tersusun dalam silinder yang bisa diputar dengan geseran jari. Di bawahnya: tiga rekor kuartal terakhir (kredit terbesar, laba tertinggi, NPL terendah), ringkasan tiap kelompok bank dalam satu tabel kecil, dan empat angka utama seluruh industri.

### Per bank
Pilih kuartal (Q4 2023 sampai kuartal terbaru) dan kelompok (BUMN, swasta, BPD, atau semua). Kartu tiap bank berisi laba, kredit, NPL, dan CAR beserta perubahannya dibanding kuartal yang sama tahun lalu. Pilih ukuran (kredit, aset, DPK, laba, NPL, CAR, CASA, LDR) untuk melihat peringkat dan grafik trennya berdampingan, lalu tabel lengkap dengan angka terbaik di tiap kolom ditebalkan. Karena semua bank dibandingkan pada kuartal yang sama, laba tiga bulan tidak pernah diadu dengan laba sembilan bulan. Pilihan kelompok, kuartal, dan ukuran tersimpan di alamat halaman, jadi tampilan yang sama bisa dibagikan.

### Halaman tiap bank
Setiap bank punya halaman sendiri, misalnya `profil.html?kode=BMRI`. Isinya profil singkat, kabar terbaru, sembilan angka utama dengan pertumbuhan tahunan dan peringkat di kelompoknya untuk kuartal mana pun, grafik tren di samping posisinya di antara bank sekelompok, tabel semua kuartal, sumber untuk setiap kuartal, dan tautan ke laporan keuangan di Bursa Efek Indonesia. Deretan logo di atas halaman memudahkan pindah ke bank lain. Perubahan cakupan data, seperti BSI yang keluar dari konsolidasi Bank Mandiri pada 2026, ditandai dengan garis yang diputus.

### Semua bank
Seluruh 105 bank umum yang beroperasi di Indonesia dalam satu halaman: BUMN dan anak usahanya, swasta nasional, 27 bank pembangunan daerah, bank syariah, bank digital, bank milik grup asing, dan kantor cabang bank asing. Tiap bank tampil dengan logo, nama resmi, kode transfer, kode SWIFT, kode saham bila tercatat di bursa, wilayah untuk bank daerah, perusahaan induk, dan nama lamanya (misalnya hibank dulu Bank Mayora, KBank Indonesia dulu Bank Maspion). Cari dengan nama, nama lama, kode, atau provinsi, lalu saring per kelompok atau sifat; tautan saringan bisa dibagikan. Bank yang punya laporan per kuartal langsung tertaut ke halamannya.

Daftar ini dicocokkan otomatis dengan daftar resmi kantor pusat bank umum dan syariah dari OJK. Bila ada bank baru, bank yang berganti nama, atau bank yang bergabung, perbedaannya langsung terlihat di bagian bawah halaman.

### Industri
Total kredit, total simpanan masyarakat, rasio kredit terhadap simpanan, dan porsi dana murah, lengkap dengan perubahan dari tahun lalu. Pangsa kredit dan simpanan BUMN, swasta, BPD, cabang bank asing, dan BPR, beserta grafik bulanan pertumbuhan kredit, nilai kredit, simpanan, dan rasio kredit/simpanan per kelompok.

### Provinsi
Peta petak seluruh provinsi untuk kredit, simpanan, rasio kredit/simpanan, dan pertumbuhan kredit. Pilih provinsi untuk melihat rinciannya, termasuk porsinya dari kredit nasional.

### Suku bunga
Bunga kredit modal kerja, investasi, dan konsumsi; bunga deposito 1 sampai 12 bulan; serta bunga tabungan, per kelompok bank, beserta perubahannya dalam setahun dan grafik trennya.

## Sumber data

**Per bank.** Rilis kinerja kuartalan, factsheet, dan laporan keuangan publikasi BRI, Bank Mandiri, BNI, BTN, BSI, BCA, CIMB Niaga, OCBC Indonesia, PermataBank, Danamon, Maybank Indonesia, PaninBank, bank bjb, dan Bank Jatim, serta media keuangan yang mengutipnya (Infobank, Kontan, Bisnis, Investor Trust, Katadata, CNBC Indonesia). Setiap angka di `bank.json` menyimpan tautan sumbernya. Angka yang tidak disebut di rilis dibiarkan kosong. Data diperbarui setiap musim laporan kuartalan. Logo bank dari koleksi [idn-finlogos](https://github.com/hafidznoor/idn-finlogos), disimpan di `logos.js` (14 bank utama) dan `logos-semua.js` (seluruh bank umum, dimuat hanya di halaman Semua bank) sehingga tidak dimuat dari situs lain.

**Daftar bank.** Daftar Alamat Kantor Pusat Bank Umum dan Syariah dari [OJK](https://www.ojk.go.id/id/kanal/perbankan/data-dan-statistik/Pages/Daftar-Alamat-Kantor-Pusat-Bank-Umum-Dan-Syariah.aspx), ditarik otomatis dua kali seminggu ke `data/ojk-bank.json`. Nama, kelompok, dan perubahan nama terbaru di `daftar-bank.json` dikumpulkan dari situs dan rilis resmi bank serta pemberitaan hingga Oktober 2026. Kode transfer dan SWIFT berasal dari metadata idn-finlogos. Unit usaha syariah ikut bank induknya; BPR dan BPR syariah tidak termasuk.

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

Tabel SEKI disajikan per kelompok bank, bukan per bank. Bila Bank Indonesia mengubah susunan tabelnya, penarik data menolak angka yang ketinggalan zaman, tetap menampilkan data terakhir yang benar, dan menyimpan file asli beserta catatan strukturnya untuk diperiksa. Bank swasta milik grup asing yang berbadan hukum Indonesia, seperti CIMB Niaga dan Danamon, termasuk kelompok bank swasta nasional.

## Tampilan

Latar putih tulang dengan kartu putih, teks biru tua, dan satu warna aksen biru untuk tombol, grafik, dan angka terbaik; oranye hanya muncul sebagai sorotan kecil. Huruf Plus Jakarta Sans, rancangan Tokotype untuk identitas kota Jakarta, disimpan di repo ini sehingga tampil sama di semua perangkat. Interaksi kecil seperti tombol pilihan yang indikatornya meregang, tepi kartu yang menyala mengikuti kursor, dan kartu yang muncul dari blur terinspirasi dari [Bencho](https://bencho.dev). Semua animasi berhenti bila perangkat memakai pengaturan "kurangi gerakan".

## Lisensi

Kode dirilis dengan lisensi MIT. Huruf Plus Jakarta Sans dirilis dengan SIL Open Font License (lihat `LICENSE-plus-jakarta-sans.txt`). Ikon dari Lucide dengan lisensi ISC. Logo bank dari idn-finlogos dirilis dengan lisensi CC BY-NC 4.0 untuk penggunaan nonkomersial; merek dan logo tetap milik bank masing-masing (lihat `LICENSE-logo-bank.txt`).
