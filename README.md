# Duel Otak – Tarik Tambang Kuis

Platform game edukasi template tarik tambang digital **satu layar** untuk Smartboard dan laptop. Guru memasukkan bank soal dari mata pelajaran apa pun, mengatur mode pertandingan, lalu memainkannya langsung bersama kelas secara luring (*offline-ready*), tanpa AI, tanpa backend, dan tanpa database cloud.

## 1. Fitur Utama
- **3 Cara Input Soal (100% di Browser)**: Input manual cepat (termasuk penanda soal berkode & bonus 2×), tempel teks langsung dengan pratinjau seketika, serta unggah dokumen `.docx` (Word), `.xlsx` / `.xls` / `.csv` (Excel), `.pdf` berisi teks, dan `.txt`.
- **Mesin Tarik Tambang Dua Arena Mandiri**: Tim Merah (kiri ▲) dan Tim Biru (kanan ●) berjalan paralel tanpa saling menunggu, mendukung multi-sentuh Smartboard (`pointer events`), estafet pemain adil, timer otomatis, dan Ronde Penentuan saat seri.
- **3 Mode Permainan**: Mode **2 Tim**, Mode **4 Tim (Turnamen)** lengkap dengan Bagan & Podium Juara, serta Mode **1 Lawan 1 (Duel)** dengan undian pasangan acak & Papan Kemenangan Sesi.
- **Manajemen Game, Bagikan & PIN Guru**: Daftar Game Saya di `localStorage`, ekspor/impor **Paket `.json`**, **Salin Link (`#/impor/...`)** terkompresi (`lz-string`) + **QR Code PNG**, serta **PIN Guru (4 angka)** ramah sentuh.
- **Rekap CSV & Dukungan Offline**: Unduh hasil lengkap berformat CSV UTF-8 BOM (siap dibuka Excel) serta Service Worker lokal ringan agar aplikasi tetap dapat dibuka ulang tanpa internet.

## 2. Cara Menjalankan di Lokal (Pengembangan)
Prasyarat: Node.js 18+ dan npm.

```bash
npm install
npm run dev
```

Buka browser pada alamat lokal `http://localhost:3000/`.

## 3. Cara Membangun Versi Statis
```bash
npm run lint
npm run build
```
Hasil build statis siap pakai tersimpan di folder `dist/`. Untuk menguji hasil build statis secara lokal:
```bash
npm run preview
```

## 4. Cara Deploy Gratis
Karena seluruh aplikasi bersifat statis (*client-side*), folder `dist/` dapat di-deploy gratis ke berbagai layanan:

- **Google AI Studio**: Buka proyek applet di AI Studio lalu klik tombol **Deploy** / **Publish** bawaan AI Studio (server statis/preview otomatis menyajikan aplikasi di port 3000).
- **GitHub Pages**: Jalankan `npm run build`, lalu unggah isi folder `dist/` ke branch `gh-pages` (atau gunakan GitHub Actions `actions/deploy-pages` dengan artefak `./dist`). Karena routing memakai hash (`#/...`), seluruh rute langsung bekerja tanpa konfigurasi server tambahan.
- **Netlify**: Hubungkan repositori dengan *Build command* `npm run build` dan *Publish directory* `dist` (atau tarik langsung folder `dist/` ke Netlify Drop).
- **Cloudflare Pages**: Hubungkan repositori dengan *Build command* `npm run build` dan *Build output directory* `dist`.

## 5. Cara Mengganti Nama Aplikasi (`APP_NAME`)
Buka berkas `src/utils/constants.ts`, lalu ubah nilai konstanta:
- `APP_NAME` (judul lengkap aplikasi di Beranda)
- `APP_SHORT_NAME` (nama singkat di bilah atas)
- `APP_SUBTITLE` (subjudul aplikasi)

Sinkronkan pula tag `<title>` serta meta OpenGraph di `index.html` dan `metadata.json` bila diinginkan.

## 6. Format Dokumen Soal yang Didukung
- **Word (`.docx`)**: Format bernomor (`1.`, `1)`, `Soal 1`) dengan pilihan `A.`–`D.`, kunci dapat ditulis `Kunci: B`, ditandai `*B.`, atau **ditebalkan (Bold)** langsung pada teks pilihan benar di Word.
- **Excel / CSV (`.xlsx`, `.xls`, `.csv`)**: Gunakan header kolom: `Pertanyaan`, `A`, `B`, `C`, `D`, `Kunci` (opsional: `Penjelasan`, `Tingkat`, `Topik`, `Bonus`). Template siap pakai dapat diunduh langsung dari menu *Buat Game*.
- **PDF (`.pdf`)**: Hanya mendukung PDF yang berisi **teks dapat disalin**.
- **Teks Biasa (`.txt`) & Tempel Teks**: Format daftar soal bernomor dengan `A.`–`D.` dan baris `Kunci: ...` atau tanda `*`.

## 7. Batasan yang Diketahui
- **PDF Hasil Scan Tidak Didukung**: Dokumen PDF yang berupa gambar/foto pindaian tidak bisa dibaca karena aplikasi tidak memakai OCR cloud maupun AI; pindahkan soal ke Word/Excel atau salin teksnya.
- **Batas Panjang Link & QR Code**: Berbagi lewat link `#/impor/...` dan QR Code dibatasi ukuran payload agar tetap dapat dipindai (±20–30 soal tergantung panjang soal). Untuk bank soal lebih besar, gunakan fitur **Unduh Paket (.json)**.
- **Kunci Jawaban di Paket & Link**: Karena tidak ada server, data game di link maupun paket `.json` membawa kunci jawaban agar penerima dapat langsung memainkan dan menilainya.
- **Sifat PIN Guru**: PIN 4 angka hanya mengunci tampilan antarmuka (Panel Guru, kunci, ubah game, dan menu Bagikan), bukan enkripsi kriptografis atas data di penyimpanan lokal atau link.
- **Mode Privat / Incognito**: Bila `localStorage` dinonaktifkan oleh browser, data game disimpan sementara di memori dan hilang saat tab ditutup; ekspor cadangan ke Paket `.json`.

## 8. Fitur Opsional: Bagikan Online (Firebase)
Seluruh fitur inti aplikasi tetap berjalan 100% **offline dan tanpa login**. Fitur **Bagikan Online** (`#/g/KODE` dan halaman `#/online`) bersifat opsional dengan memakai Firebase Authentication (Google Sign-In) dan Cloud Firestore.

### a. Menghubungkan Firebase di AI Studio
1. Pada proyek AI Studio, jalankan integrasi Firebase (*Firebase setup*) untuk membuat berkas konfigurasi `firebase-applet-config.json` (berisi `projectId`, `apiKey`, `authDomain`, `appId`, dan `firestoreDatabaseId`) serta men-deploy `firestore.rules`.
2. Pastikan metode masuk **Google** aktif di **Firebase Console → Authentication → Sign-in method**.
3. Jika aplikasi di-deploy ke tempat lain tanpa `firebase-applet-config.json` yang valid atau dibuka tanpa internet, fitur inti tetap berjalan penuh dan tombol online menampilkan pesan *"Fitur online belum tersedia, gunakan paket berkas"*.

### b. Menambahkan Domain Hasil Publish ke Authorized Domains (Wajib untuk Login Google)
Jika aplikasi sudah dipublikasikan ke domain sendiri (mis. GitHub Pages, Netlify, Cloudflare Pages, atau Firebase Hosting), login Google tidak akan berfungsi sebelum domain tersebut didaftarkan:
1. Buka **Firebase Console → Authentication → Settings → Authorized domains**.
2. Klik **Add domain**, lalu masukkan domain hasil publish Anda (tanpa `https://` dan tanpa path, contoh: `nama-akun.github.io` atau `duel-otak-sekolah.netlify.app`).
3. Di dalam dialog **Bagikan** atau halaman **Game Online Saya**, atur kolom **Alamat aplikasi untuk link** ke URL publik tersebut agar link `#/g/KODE` dan QR mengarah ke alamat yang benar.

### c. Aturan Otomatisasi Hapus Data Kedaluwarsa (Firestore TTL — Opsional)
Koleksi `game_online` menyimpan field `kedaluwarsaPada` (Timestamp, maksimal 90 hari sejak diterbitkan/diperpanjang):
- Aturan keamanan `firestore.rules` langsung menolak akses baca umum terhadap dokumen yang sudah kedaluwarsa (`kedaluwarsaPada <= request.time`).
- Agar dokumen kedaluwarsa juga terhapus otomatis dari penyimpanan Firestore tanpa biaya Cloud Functions, buka **Firebase Console → Firestore Database → Time-to-live (TTL)** → **Create policy**:
  - Collection group: `game_online`
  - Timestamp field: `kedaluwarsaPada`

### d. Catatan Kuota Harian Gratis Firebase (Spark Plan)
Aplikasi ini dirancang hemat kuota gratis (**tanpa listener `onSnapshot` dan tanpa polling**):
- Membuka link `#/g/KODE` hanya memakai **1× `getDoc`**.
- Batas maksimal Spark Plan saat ini: sekitar **50.000 pembacaan** dan **20.000 penulisan/penghapusan per hari**, cukup untuk ribuan pembukaan link sekolah setiap hari.
- Setiap akun Google guru dibatasi maksimal **20 game online aktif** (`BATAS_MAKS_GAME_ONLINE_GURU = 20`), dan setiap dokumen dibatasi ukuran payload terkompresi maksimal **900 KB**.
- **Privasi**: Hanya `ownerUid` (UID anonim akun Firebase guru) yang disimpan di Firestore — alamat email guru tidak disimpan di database. Kunci jawaban ikut tersimpan di dalam dokumen game agar penerima link dapat langsung memainkannya tanpa login.

