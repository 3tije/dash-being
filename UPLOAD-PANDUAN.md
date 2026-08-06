# BEINGPSIKOLOGI Full Safe v1.8

Paket ini dibuat untuk mengembalikan dashboard secara penuh dengan struktur yang benar.

## Penting
JANGAN menghapus file `assets/config.js` yang saat ini sudah ada di repository GitHub.
Paket ini sengaja tidak menyertakan `assets/config.js`, sehingga konfigurasi Apps Script,
LMS, konsultasi, dan BEING Voice yang sudah bekerja tidak tertimpa.

## Cara upload paling aman

1. Buka repository `dash-being`.
2. Pilih **Add file → Upload files**.
3. Ekstrak ZIP ini di komputer.
4. Upload seluruh isi folder hasil ekstrak, bukan folder pembungkusnya.
5. Pastikan struktur GitHub menjadi:

```
CNAME
.nojekyll
index.html
admin.html
suara-anda.html
human-development-series.html
konsultasi.html
manifest.webmanifest
assets/
  style.css
  being-logo.png
  cover.jpg
  team.jpg
  experts.jpg
  health-team.jpg
  tri-tjahyono-profile.png
  app.js
  voice.css
  voice-api.js
  voice-public.js
  voice-admin.js
```

6. Saat GitHub menanyakan file yang sama, pilih overwrite/replace.
7. Jangan menghapus `assets/config.js` yang sudah ada.
8. Commit dengan pesan: `Restore full BEING website v1.8`.
9. Tunggu Actions `pages build and deployment` menjadi hijau.
10. Buka `https://beingpsikologi.com/?v=18`.

## Pemeriksaan cepat

Buka URL berikut:
- `https://beingpsikologi.com/assets/style.css?v=18`
- `https://beingpsikologi.com/assets/being-logo.png`
- `https://beingpsikologi.com/assets/tri-tjahyono-profile.png`

Jika ketiganya terbuka, struktur aset sudah benar.
