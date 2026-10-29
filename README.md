# 🏨 Hotel IT Department - Inventory, Departmental Assets & Hardware Control System
### Super Lightweight, Zero-Bundler, Zero-Framework Architecture (Vanilla JS + Tailwind CDN + Supabase BaaS + SheetJS)

Aplikasi web manajemen inventaris departemen IT hotel dengan arsitektur **super ringan, zero-bundler, zero-framework (NO React, NO Next.js, NO Vue)** dan **100% kompatibel untuk di-deploy di platform manapun (Localhost, GitHub Pages, Netlify, Vercel, hingga cPanel / Shared Hosting biasa) TANPA PERLU PROSES BUILD (`npm run build`)!**

Seluruh data dan autentikasi terhubung langsung ke **Supabase** sebagai satu-satunya Backend-as-a-Service (BaaS) dengan RLS dimatikan (Zero-RLS) demi kemudahan eksekusi tanpa hambatan izin database.

---

## 📑 Daftar Isi
1. [Fitur Utama Aplikasi](#1-fitur-utama-aplikasi)
2. [Arsitektur & Spesifikasi Teknis](#2-arsitektur--spesifikasi-teknis)
3. [Panduan Setup Database Supabase (SQL Editor)](#3-panduan-setup-database-supabase-sql-editor)
4. [Autentikasi Supabase & Manajemen User](#4-autentikasi-supabase--manajemen-user)
5. [Logika Invariant Stok & 7 Departemen Hotel](#5-logika-invariant-stok--7-departemen-hotel)
6. [Fitur Ekspor Excel Client-Side (SheetJS)](#6-fitur-ekspor-excel-client-side-sheetjs)
7. [Panduan Deployment ke Berbagai Platform](#7-panduan-deployment-ke-berbagai-platform)
   - [A. Localhost / Komputer Lokal](#a-localhost--komputer-lokal)
   - [B. GitHub Pages](#b-github-pages)
   - [C. Netlify](#c-netlify)
   - [D. Vercel](#d-vercel)
   - [E. Shared Hosting / cPanel](#e-shared-hosting--cpanel)
8. [Troubleshooting & Pemecahan Masalah](#8-troubleshooting--pemecahan-masalah)

---

## 1. Fitur Utama Aplikasi

- **Dashboard Real-Time**: 
  - **Dynamic Personalized Greeting**: Menyapa pengguna berdasarkan email akun tanpa domain (misal `adminhotel@gmail.com` menjadi `Welcome Adminhotel! What are we diving into today?😉`).
  - **Mobile Off-Canvas Navigation**: Header bar rapi dan bebas overflow di layar ponsel dengan drawer sidebar responsif, animasi transisi halus, dan auto-close saat navigasi.
  - Hero action banner dengan aksi cepat (`+ Add Departmental Asset`, `+ Inbound Stock`, `+ Create Master Item`, `Export All Excel`).
  - 6 Kartu statistik interaktif: Stok Tersedia di Gudang IT, Unit Dipegang Departemen, Katalog Barang, Purchase Orders, Preloved, dan Total Mutasi.
  - Ringkasan cepat 7 Departemen Hotel Resmi beserta jumlah unit hardware yang dipegang.
  - Distribusi kategori barang (PC, Network, CCTV/TV) dan audit log aktivitas terkini.

- **Inventory / Master Catalog**:
  - Filter kategori (`ALL`, `PC ITEMS`, `NETWORK ITEMS`, `CCTV & TV ITEMS`) dan pencarian real-time.
  - Rekapitulasi unit: **Total Inbound**, **Transferred to Depts**, **Returned to IT**, dan **Stok Tersedia di IT**.
  - Status stok otomatis (`In Stock`, `Low Stock`, `Out of Stock`).
  - Tombol aksi cepat: Transfer ke departemen, Tambah stok masuk, dan Hapus.

- **Create Master Item**:
  - Formulir penambahan master barang baru dengan 4 field:
    1. **Nama Barang** (wajib diisi).
    2. **Kategori Barang** (wajib dipilih: PC ITEMS, NETWORK ITEMS, CCTV & TV ITEMS).
    3. **Remark / Keterangan** (opsional).
    4. **Foto Barang** (opsional, unggah berkas atau tautan URL dengan pratinjau instan).

- **Departmental Asset (7 Departemen Resmi)**:
  - 7 Tab navigasi departemen hotel resmi:
    1. **Front Office**
    2. **House Keeping**
    3. **Engineering**
    4. **Human Resource**
    5. **Food & Beverage**
    6. **Sales & Marketing**
    7. **Accounting**
  - Tabel aset yang sedang dipegang departemen, nama penerima/PIC, tanggal terakhir perpindahan, dan tombol **Return to IT** untuk mengembalikan barang ke gudang stok IT.

- **Motion Analytics & Audit Trail**:
  - Log kronologis lengkap seluruh transaksi mutasi (Transfer ke Departemen & Pengembalian ke IT).
  - Filter berdasarkan jenis mutasi, departemen, dan pencarian PIC/barang.

- **Purchase Orders (PO)**:
  - Manajemen pengadaan barang baru, monitoring status (`BELUM DATANG` / `SUDAH DATANG`), jumlah unit, vendor, tanggal pemesanan, dan peruntukan alokasi.

- **Preloved & Refurbished Hardware**:
  - Pencatatan hardware bekas layak pakai, spare parts rekondisi, serial number, tanggal perbaikan, dan lokasi asal (ex-kamar atau ex-counter).

- **Monthly Data & Reports**:
  - Pemilih bulan dan tahun (misal: 2026-10).
  - Tab rekapitulasi bulanan: Inbound Stok, Mutasi Departemen, Purchase Orders, dan Preloved.
  - Ekspor laporan bulanan khusus dalam satu klik.

- **Export Excel Hub (SheetJS)**:
  - Ekspor 100% di sisi peramban (client-side) tanpa dependensi backend Node.js.
  - Pilihan file: Master Inventory, Departmental Assets, Motion Log, Purchase Orders, Preloved, dan **Full Master Backup (Multi-Sheet Workbook)**.

- **Settings & BaaS Configuration**:
  - Konfigurasi Supabase Project URL & Anon Key dinamis yang tersimpan di `localStorage`.
  - Mode Demo Offline otomatis jika belum ada konfigurasi Supabase (aplikasi langsung bisa dicoba tanpa layar blank).
  - Tombol salin skema SQL dan reset data demo.

---

## 2. Arsitektur & Spesifikasi Teknis

| Komponen | Spesifikasi | Keterangan |
| :--- | :--- | :--- |
| **Arsitektur** | Zero-Bundler, Zero-Framework SPA | Tanpa React, Next.js, atau Vue. Berjalan langsung di peramban. |
| **Bahasa** | Vanilla JavaScript (ES6+) & HTML5 | File utama: `index.html` dan `app.js`. |
| **Styling** | Tailwind CSS v3 via CDN | Skema warna luxury dark mode (slate-950, indigo, cyan, amber, emerald). |
| **Ikon** | FontAwesome 6 Free via CDN | Ikon font andal tanpa kompilasi build. |
| **Backend / BaaS** | Supabase (PostgreSQL 15+) | Autentikasi Supabase Auth + Database REST API via `@supabase/supabase-js` CDN. |
| **Keamanan DB** | Zero-RLS (`DISABLE ROW LEVEL SECURITY`) | Seluruh tabel dapat diakses langsung oleh Anon Key publik tanpa error izin. |
| **Ekspor File** | SheetJS (`xlsx.full.min.js`) via CDN | Ekspor format `.xlsx` instan langsung di sisi peramban. |
| **Build Step** | **TIDAK ADA (`NO BUILD REQUIRED`)** | File statis murni yang dapat dibuka langsung lewat server statis manapun. |

---

## 3. Panduan Setup Database Supabase (SQL Editor)

Untuk menghubungkan aplikasi ke proyek Supabase milik Anda:

1. Buka [Supabase Dashboard](https://supabase.com/dashboard) dan buat proyek baru (atau gunakan proyek yang sudah ada).
2. Masuk ke menu **SQL Editor** di bilah navigasi kiri.
3. Buka file `supabase-schema.sql` di repositori ini, salin seluruh isinya, lalu tempelkan ke SQL Editor Supabase.
4. Klik tombol **Run**.
5. Skrip akan membuat tabel-tabel berikut dengan RLS dinonaktifkan:
   - `master_items`
   - `stock_transactions`
   - `department_movements`
   - `purchase_orders`
   - `preloved`
   - `activities`
   - Storage bucket publik `photos`
   - Data awal demo hotel (hardware, stok, mutasi departemen, PO, preloved).
6. Masuk ke menu **Project Settings > API**, lalu salin:
   - **Project URL** (misal: `https://xyzproject.supabase.co`)
   - **Project API Keys: `anon` `public`**
7. Buka aplikasi di peramban, buka menu **Settings & BaaS** (atau klik accordion di halaman Login), tempel URL dan Anon Key Anda, lalu klik **Save & Connect**.

---

## 4. Autentikasi Supabase & Manajemen User

- **Metode Login**: Menggunakan Email & Password melalui Supabase Auth Client SDK.
- **Pusat Manajemen User**: Seluruh pengelolaan pengguna (tambah akun staf IT, edit email, ganti password, reset password, hapus user) dilakukan secara terpusat oleh administrator langsung di dashboard Supabase (**Authentication > Users**).
- **Penghapusan Fitur Edit Password**: Sesuai instruksi pembaruan, seluruh form edit user dan ubah password di dalam aplikasi telah dihapus demi keamanan dan simplifikasi.
- **Penghapusan Role Khusus**: Tidak ada lagi hierarki role internal (`ITMANAGER`, `ITASSIST`, `ITTRAINEE`). Semua staf IT terotentikasi memiliki akses operasional penuh ke sistem.
- **Tombol Logout**: Tersedia di header utama untuk membersihkan session autentikasi dengan aman.
- **Mode Demo Preview**: Tersedia tombol *Direct Demo Preview* pada halaman login untuk mengakses antarmuka dan seluruh fitur simulasi secara instan tanpa login Supabase.

---

## 5. Logika Invariant Stok & 7 Departemen Hotel

Sistem menerapkan validasi matematika invariant yang ketat:

1. **Stok Tersedia di Gudang IT**:
   $$\text{Available Stock} = \sum(\text{Inbound}) - \sum(\text{Transfers to Depts}) + \sum(\text{Returns to IT})$$

2. **Aset yang Dipegang Departemen**:
   $$\text{Department Held Units} = \sum(\text{Received}) - \sum(\text{Returned})$$

3. **Batasan Mutasi (Invariants)**:
   - **Transfer ke Departemen**: Jumlah unit yang ditransfer **tidak boleh melebihi** stok yang tersedia di gudang IT. Jika melebihi, sistem akan menolak dan menampilkan peringatan error.
   - **Pengembalian (Return) ke IT**: Jumlah unit yang dikembalikan **tidak boleh melebihi** jumlah unit yang sedang dipegang oleh departemen terkait.

---

## 6. Fitur Ekspor Excel Client-Side (SheetJS)

Aplikasi menyertakan pustaka **SheetJS (`xlsx.full.min.js`)** via CDN. Proses pembuatan file Excel berlangsung 100% di browser pengguna tanpa memerlukan backend Node.js atau server Express:

- **Inventory Report**: Kode barang, nama, kategori, total masuk, total ditransfer, dikembalikan, stok tersedia, dan status.
- **Departmental Asset Report**: Daftar inventaris yang dipegang oleh 7 departemen hotel lengkap dengan PIC dan tanggal terakhir.
- **Motion Analytics Audit Trail**: Histori mutasi perpindahan barang (tanggal, barang, departemen, jenis gerakan, jumlah, PIC).
- **Purchase Orders Report**: Riwayat pengadaan PO, vendor, tanggal order, tanggal tiba, dan status.
- **Preloved Hardware Report**: Rekap hardware rekondisi, serial number, dan kondisi ex-kamar.
- **Full Master Backup**: Satu file workbook `.xlsx` yang berisi seluruh lembar kerja (*multi-sheet*).

---

## 7. Panduan Deployment ke Berbagai Platform

Karena aplikasi ini berarsitektur **Zero-Bundler & Zero-Framework**, Anda **TIDAK PERLU** menjalankan `npm run build` atau proses kompilasi apapun.

### A. Localhost / Komputer Lokal
Cukup jalankan web server statis sederhana atau gunakan script bawaan:
```bash
# Opsi 1: Menggunakan server bawaan
npm run dev

# Opsi 2: Menggunakan python server bawaan
python3 -m http.server 3000

# Opsi 3: Menggunakan npx serve
npx serve . -p 3000
```
Buka `http://localhost:3000` di peramban Anda.

### B. GitHub Pages
1. Push repositori ke GitHub:
   ```bash
   git add .
   git commit -m "Deploy Hotel IT Inventory"
   git push origin main
   ```
2. Buka repositori di GitHub -> **Settings** -> **Pages**.
3. Pada bagian **Build and deployment > Source**, pilih **Deploy from a branch**.
4. Pilih Branch **main** dan folder **/(root)**, lalu klik **Save**.
5. Situs Anda akan langsung online dalam beberapa detik tanpa proses build!

### C. Netlify
1. Buka dashboard Netlify dan pilih **Add new site > Import an existing project**.
2. Hubungkan dengan repositori GitHub Anda.
3. Pada pengaturan Build:
   - **Build command**: *(kosongkan)*
   - **Publish directory**: `.` *(titik atau root)*
4. Klik **Deploy site**.

### D. Vercel
Proyek telah dilengkapi dengan konfigurasi `vercel.json` statis:
1. Hubungkan repositori ke Vercel Dashboard.
2. Vercel akan otomatis mendeteksi file `index.html` dan `app.js`.
3. Klik **Deploy**.

### E. Shared Hosting / cPanel Biasa
1. Buka **File Manager** di cPanel Anda.
2. Masuk ke direktori `public_html` (atau subdomain folder).
3. Upload file `index.html`, `app.js`, dan folder `public/` (jika ada aset foto).
4. Selesai! Web langsung berjalan 100% tanpa perlu Node.js di server hosting.

---

## 8. Troubleshooting & Pemecahan Masalah

- **Tampilan masih meminta login**: Gunakan akun email dan password yang telah Anda buat di dashboard Supabase Auth, atau klik tombol **Direct Demo Preview** untuk eksplorasi instan.
- **Data belum tersinkronisasi dengan Supabase**:
  1. Pastikan Anda telah menjalankan seluruh isi skrip `supabase-schema.sql` di SQL Editor Supabase.
  2. Buka menu **Settings & BaaS** di dalam aplikasi, pastikan Supabase URL dan Anon Key sudah benar, lalu klik **Save & Re-sync Data**.
- **Ekspor Excel tidak mendownload**:
  Pastikan peramban Anda tidak memblokir unduhan otomatis (*pop-up blocker*). SheetJS berjalan langsung di memori browser dan akan memicu dialog simpan file `.xlsx`.
