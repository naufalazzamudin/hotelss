# 🏨 Hotel IT Department - Inventory, Purchase Order & Preloved Management System
### Modern Serverless Architecture: React + Vite + TypeScript + Supabase + Vercel

Aplikasi manajemen inventaris departemen IT hotel dengan arsitektur modern berbasis **Supabase (PostgreSQL, Supabase Auth, Supabase Storage)** dan di-hosting sebagai Single Page Application (SPA) di **Vercel** melalui **GitHub**.

---

## 📑 Daftar Isi
1. [Gambaran Arsitektur Baru](#1-gambaran-arsitektur-baru)
2. [Fitur Utama Aplikasi](#2-fitur-utama-aplikasi)
3. [Akun Pengguna & Hak Akses (Role)](#3-akun-pengguna--hak-akses-role)
4. [Langkah Setup Supabase](#4-langkah-setup-supabase)
   - [A. Menjalankan SQL Migration](#a-menjalankan-sql-migration)
   - [B. Konfigurasi Storage Bucket (`photos`)](#b-konfigurasi-storage-bucket-photos)
   - [C. Mendapatkan URL & Public Anon Key](#c-mendapatkan-url--public-anon-key)
5. [Menjalankan Aplikasi di Komputer Lokal](#5-menjalankan-aplikasi-di-komputer-lokal)
6. [Migrasi Data Lama (`data/db.json` ke Supabase)](#6-migrasi-data-lama-datadbjson-ke-supabase)
7. [Panduan Deployment ke Vercel](#7-panduan-deployment-ke-vercel)
8. [Keamanan & Row Level Security (RLS)](#8-keamanan--row-level-security-rls)
9. [Ekspor Excel Client-Side (100% Serverless)](#9-ekspor-excel-client-side-100-serverless)
10. [Pengujian & Verifikasi](#10-pengujian--verifikasi)
11. [Troubleshooting & Pemecahan Masalah](#11-troubleshooting--pemecahan-masalah)

---

## 1. Gambaran Arsitektur Baru

| Lapisan (Layer) | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons, Motion | Antarmuka pengguna responsif desktop dan mobile, modal bertab ringkas, tabel interaktif. |
| **Database** | Supabase (PostgreSQL 15+) | Tabel: `profiles`, `inventory`, `purchase_orders`, `preloved`, `activities` dengan constraint & index. |
| **Autentikasi** | Supabase Auth + JWT Token | Otentikasi aman tanpa hardcoded token, mendukung input username langsung (`ITMANAGER`, `ITASSIST`, `ITTRAINEE`). |
| **File Storage** | Supabase Storage (`photos` bucket) | Penyimpanan gambar cloud permanen dengan public CDN URL untuk preview dan ekspor. |
| **Ekspor Dokumen** | ExcelJS (Client-Side) | Menghasilkan file `.xlsx` terformat lengkap dengan logo dan foto langsung dari browser tanpa server Express. |
| **Hosting** | Vercel | Hosting frontend global berbasis CDN dengan konfigurasi routing SPA (`vercel.json`). |
| **Source Code** | Git / GitHub | Integrasi CI/CD otomatis ke Vercel setiap `git push`. |

---

## 2. Fitur Utama Aplikasi

- **Inventaris IT**: Manajemen stok PC, perangkat jaringan, dan CCTV/TV dengan status rekapan, jumlah unit, nomor seri, dan riwayat perbaikan.
- **Purchase Order (PO)**: Pelacakan pemesanan barang baru, estimasi kedatangan, jumlah unit, dan status (`BELUM DATANG` / `SUDAH DATANG`).
- **Preloved IT Items**: Pengelolaan barang bekas layak pakai atau rekondisi hotel.
- **Ekspor Excel Multi-Format**: Unduh laporan bulanan berformat rapi (.xlsx) langsung di browser.
- **Audit Log Aktivitas**: Pencatatan otomatis setiap penambahan, pengubahan, dan penghapusan data.
- **Manajemen Kredensial User**: Pengubahan username dan password berjenjang yang dilindungi kode rahasia (`INNRATTAN.BJM`).

---

## 3. Akun Pengguna & Hak Akses (Role)

Sistem menggunakan Supabase Auth dengan pemetaan username ramah pengguna:

| Username | Role | Default Password | Hak Akses Utama |
| :--- | :--- | :--- | :--- |
| **ITMANAGER** | `IT MANAGER` | `syah` | Hak penuh: Kelola semua data, kelola user & role, reset password akun lain, hapus data. |
| **ITASSIST** | `IT ASSIST` | `ihsan` | Tambah & edit data inventaris, PO, preloved, hapus data tertentu, ekspor laporan. |
| **ITTRAINEE** | `IT TRAINEE` | `andi` | Input & update operasional data inventaris, PO, dan preloved. |

> **Format Email Internal di Supabase Auth:**  
> Untuk mempertahankan UI login sederhana di mana pengguna cukup memasukkan username (`ITMANAGER`, `ITASSIST`, `ITTRAINEE`), sistem memetakan username menjadi email internal: `<username_lowercase>@hotel-it.internal` (contoh: `itmanager@hotel-it.internal`). Pengguna juga dapat memasukkan email biasa secara langsung jika didaftarkan.

---

## 4. Langkah Setup Supabase

### A. Menjalankan SQL Migration
1. Buka dashboard proyek Supabase Anda di [supabase.com](https://supabase.com).
2. Di menu sebelah kiri, klik **SQL Editor**.
3. Buat query baru (**New Query**).
4. Salin seluruh isi file `supabase/migrations/20261024_initial_schema.sql` dan tempel ke SQL Editor.
5. Klik tombol **Run** (Ctrl+Enter / Cmd+Enter).
6. Skrip ini akan membuat:
   - Tabel `profiles`, `inventory`, `purchase_orders`, `preloved`, `activities`.
   - Index pencarian dan tanggal.
   - Kebijakan Row Level Security (RLS) lengkap.
   - Storage bucket `photos` beserta permission-nya.

### B. Konfigurasi Storage Bucket (`photos`)
Skrip SQL otomatis membuat bucket `photos` sebagai bucket publik. Anda dapat memverifikasinya di dashboard Supabase:
1. Buka tab **Storage**.
2. Pastikan terdapat bucket bernama `photos` dengan label **Public**.
3. Jika belum publik, klik opsi bucket `photos` -> **Make bucket public**.

### C. Mendapatkan URL & Public Anon Key
1. Buka tab **Project Settings** (ikon gerigi) -> **API**.
2. Salin **Project URL** (contoh: `https://xyzcompany.supabase.co`).
3. Salin **Project API Keys** -> `anon` / `public` key (bukan service role).

---

## 5. Menjalankan Aplikasi di Komputer Lokal

### 1. Salin Environment Variables
```bash
cp .env.example .env.local
```
Edit `.env.local` dan masukkan kredensial Supabase Anda:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_SECRET_CODE=INNRATTAN.BJM
```

### 2. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka peramban di: **`http://localhost:3000`** (atau port yang ditampilkan oleh Vite).

---

## 6. Migrasi Data Lama (`data/db.json` ke Supabase)

Jika Anda memiliki data dari instalasi lama di `data/db.json`, jalankan skrip migrasi otomatis:

1. Buka dashboard Supabase -> **Project Settings** -> **API**.
2. Salin **`service_role` key** (secret key).
3. Jalankan perintah migrasi di terminal:
```bash
SUPABASE_URL="https://your-project-id.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOi..." \
npm run migrate:data
```
Skrip ini akan secara otomatis:
- Mendaftarkan user default ke Supabase Auth dengan password default yang aman.
- Mengisi data profil pengguna ke tabel `profiles`.
- Mengimpor seluruh data inventaris, purchase order, preloved, dan riwayat aktivitas.

---

## 7. Panduan Deployment ke Vercel

Aplikasi ini 100% kompatibel dengan Vercel karena berjalan sebagai static Single Page Application (SPA) tanpa memerlukan server backend terpisah.

### Langkah 1: Push Kode ke GitHub
```bash
git add .
git commit -m "feat: migrate backend to Supabase and prepare Vercel deployment"
git push origin main
```

### Langkah 2: Import Proyek di Vercel
1. Masuk ke [vercel.com](https://vercel.com) dan klik **Add New...** -> **Project**.
2. Pilih repositori GitHub proyek Hotel IT Inventory Anda.
3. Konfigurasi Proyek:
   - **Framework Preset**: `Vite` (terdeteksi otomatis).
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Langkah 3: Tambahkan Environment Variables di Vercel
Pada bagian **Environment Variables** di halaman setup Vercel, tambahkan:
- `VITE_SUPABASE_URL` = `https://your-project-id.supabase.co`
- `VITE_SUPABASE_ANON_KEY` = `eyJhbGciOiJIUzI1Ni...`
- `VITE_SECRET_CODE` = `INNRATTAN.BJM`

### Langkah 4: Klik Deploy
Vercel akan meng-compile aplikasi dan menyediakan URL publik (contoh: `https://hotel-it-inventory.vercel.app`) ber-SSL otomatis.

> File `vercel.json` sudah disediakan di root proyek untuk memastikan routing SPA tidak menghasilkan error 404 saat pengguna me-refresh halaman seperti `/inventory` atau `/preloved`.

---

## 8. Keamanan & Row Level Security (RLS)

Aplikasi menerapkan sistem keamanan berlapis:
1. **Otorisasi Server-Side via RLS PostgreSQL**:
   - Seluruh tabel (`profiles`, `inventory`, `purchase_orders`, `preloved`, `activities`) memiliki `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`.
   - Hanya pengguna dengan JWT valid yang dapat membaca data.
   - Pengecekan peran dilakukan langsung di database menggunakan fungsi SQL `current_user_role()`.
   - Pengguna dengan peran `IT TRAINEE` tidak dapat menghapus data barang.
2. **Tanpa Secret Key di Frontend**:
   - Frontend hanya menggunakan `VITE_SUPABASE_ANON_KEY`.
   - `service_role` key **tidak pernah** disertakan dalam bundle frontend.
3. **Penyimpanan Password Aman**:
   - Password dikelola secara terenkripsi oleh modul kriptografi Supabase Auth (Argon2 / Bcrypt), bukan disimpan dalam teks biasa.

---

## 9. Ekspor Excel Client-Side (100% Serverless)

Fitur ekspor file Excel (`.xlsx`) untuk:
- Inventaris (`HOTEL_IT_INVENTORY_*.xlsx`)
- Purchase Order (`HOTEL_IT_PURCHASE_ORDER_*.xlsx`)
- Preloved Items (`HOTEL_IT_PRELOVED_*.xlsx`)

Dibuat menggunakan pustaka **ExcelJS** yang dieksekusi langsung di peramban pengguna (*browser-side*). Fitur ini:
- Menyematkan foto thumbnail langsung ke dalam sel spreadsheet.
- Mengatur lebar kolom, warna sel zebra, styling font Arial, dan freeze panes.
- Menghasilkan file instan tanpa membebani server backend atau batasan waktu serverless (*timeout*).

---

## 10. Pengujian & Verifikasi

Jalankan pengujian unit dan type checking sebelum melakukan release:

```bash
# 1. Jalankan Unit Tests logika bisnis
npm test

# 2. Jalankan Pemeriksaan Tipe TypeScript
npm run lint

# 3. Jalankan Production Build Vite
npm run build
```

---

## 11. Troubleshooting & Pemecahan Masalah

1. **Muncul tulisan "Local Demo Mode" di Pengaturan**:
   - Pastikan file `.env.local` memiliki `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` yang benar.
   - Restart server development setelah mengubah file `.env.local`.

2. **Login Gagal dengan Pesan "Invalid login credentials"**:
   - Pastikan Anda telah menjalankan skrip `npm run migrate:data` atau membuat user di Supabase Auth.
   - Pastikan password yang dimasukkan sesuai (default: `syah`, `ihsan`, atau `andi`).

3. **Gagal Mengunggah Foto**:
   - Pastikan bucket `photos` di Supabase Storage berstatus **Public**.
   - Periksa RLS Storage Policy di dashboard Supabase (Storage -> Policies).

4. **Halaman 404 Saat di-Refresh di Vercel**:
   - Pastikan file `vercel.json` berada di root direktori repositori dengan rule rewrite ke `/index.html`.

---
*Hotel IT Inventory Management System — Arsitektur Modular, Cepat, Aman, dan Siap Produksi di Vercel & Supabase.*
