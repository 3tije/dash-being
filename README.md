# BEING Voice Full v1.1 — Perbaikan Login dan Link

Perbaikan utama:
- Login admin kini dapat dilakukan tanpa token lama.
- Semua tombol Konsultasi dan LMS membaca `assets/config.js`.
- Link eksternal otomatis dibuka di tab baru.
- Cache-busting ditambahkan agar perubahan GitHub lebih cepat terbaca.

# BEING Voice — Versi Penuh

Paket ini berisi:

- `index.html` — dashboard utama BEING yang sudah terintegrasi.
- `suara-anda.html` — halaman publik jajak pendapat.
- `admin.html` — dashboard admin pembuat survei.
- `assets/config.js` — tempat menempel URL Apps Script dan mengubah tautan Konsultasi/LMS.
- `apps-script/Code.gs` — backend.
- `apps-script/appsscript.json` — konfigurasi Apps Script.

## A. Menyiapkan Google Sheets dan Apps Script

1. Buat Google Spreadsheet baru, misalnya **Database BEING Voice**.
2. Buka **Ekstensi → Apps Script**.
3. Hapus kode awal, lalu salin seluruh isi `apps-script/Code.gs`.
4. Pada **Project Settings**, pastikan zona waktu `Asia/Jakarta`.
5. Jalankan fungsi `setupBeingVoice()` satu kali.
6. Beri izin saat Google meminta otorisasi.
7. Sistem otomatis membuat sheet:
   - `SURVEYS`
   - `QUESTIONS`
   - `RESPONSES`
8. PIN admin awal: `being123`.

## B. Deploy Apps Script

1. Klik **Deploy → New deployment**.
2. Pilih jenis **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Klik **Deploy**.
6. Salin URL Web App yang berakhir `/exec`.

## C. Menghubungkan GitHub dengan Apps Script

Buka:

`assets/config.js`

Ganti:

```javascript
API_URL: "PASTE_APPS_SCRIPT_WEB_APP_URL_HERE"
```

menjadi:

```javascript
API_URL: "https://script.google.com/macros/s/...../exec"
```

Di file yang sama, tautan layanan dapat diubah kapan saja:

```javascript
CONSULTATION_URL: "https://alamat-konsultasi...",
LMS_URL: "https://alamat-lms...",
VOICE_URL: "suara-anda.html",
ADMIN_URL: "admin.html"
```

## D. Mengunggah ke GitHub Pages

Unggah seluruh isi folder ini ke repository BEING. Jangan hanya mengunggah `index.html`, karena folder `assets` dan halaman lain juga dibutuhkan.

## E. Alur Admin

1. Buka `https://alamat-website/admin.html`.
2. Masuk menggunakan PIN awal `being123`.
3. Segera buka **Pengaturan → Ganti PIN Admin**.
4. Buat survei.
5. Tambahkan pertanyaan.
6. Ubah status survei menjadi **Aktif / dipublikasikan**.
7. Survei akan otomatis tampil pada halaman `suara-anda.html`.
8. Hasil dapat dilihat dalam grafik dan diunduh sebagai CSV.

## Jenis pertanyaan

- Pilihan tunggal
- Pilihan lebih dari satu
- Skala 1–5
- Skala 1–10
- Ya/Tidak
- Jawaban singkat
- Jawaban panjang

## Catatan keamanan

Versi ini cocok untuk jajak pendapat, evaluasi layanan, dan survei kebutuhan nonrahasia. Jangan menggunakannya untuk diagnosis klinis, rekam medis, atau data psikologis yang sangat sensitif tanpa penguatan autentikasi, persetujuan, retensi data, dan kebijakan privasi.
