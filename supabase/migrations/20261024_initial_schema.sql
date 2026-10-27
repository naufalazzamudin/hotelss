-- ==============================================================================
-- HOTEL IT INVENTORY MANAGEMENT - SUPABASE DATABASE MIGRATION
-- Target: Supabase (PostgreSQL 15+)
-- ==============================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 2. TABLE: profiles
-- Menghubungkan auth.users dengan username dan role berjenjang IT Department
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('IT MANAGER', 'IT ASSIST', 'IT TRAINEE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ==============================================================================
-- 3. TABLE: inventory
-- Data inventaris rekapan hardware IT (PC, Network, CCTV/TV)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS')),
  date_repaired DATE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  serial_number TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_category ON public.inventory(category);
CREATE INDEX IF NOT EXISTS idx_inventory_date_repaired ON public.inventory(date_repaired);
CREATE INDEX IF NOT EXISTS idx_inventory_updated_at ON public.inventory(updated_at DESC);

-- ==============================================================================
-- 4. TABLE: purchase_orders
-- Data Purchase Order pengadaan barang IT
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  date_order DATE NOT NULL,
  date_arrival DATE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  for_use TEXT NOT NULL,
  remarks TEXT,
  status TEXT NOT NULL CHECK (status IN ('BELUM DATANG', 'SUDAH DATANG')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_po_status ON public.purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_po_date_order ON public.purchase_orders(date_order);
CREATE INDEX IF NOT EXISTS idx_po_updated_at ON public.purchase_orders(updated_at DESC);

-- ==============================================================================
-- 5. TABLE: preloved
-- Data inventaris barang bekas/rekondisi (Preloved IT Items)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.preloved (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS')),
  date_repaired DATE NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  serial_number TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_preloved_category ON public.preloved(category);
CREATE INDEX IF NOT EXISTS idx_preloved_date_repaired ON public.preloved(date_repaired);
CREATE INDEX IF NOT EXISTS idx_preloved_updated_at ON public.preloved(updated_at DESC);

-- ==============================================================================
-- 6. TABLE: activities
-- Riwayat aktivitas audit log (Added, Edited, Deleted)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.activities (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('Added', 'Edited', 'Deleted')),
  username TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  target_id TEXT,
  type TEXT
);

CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON public.activities(timestamp DESC);

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Aktifkan RLS di semua tabel
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.preloved ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Helper function: Dapatkan role pengguna yang sedang login
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- PROFILES POLICIES
-- 1. Pengguna terautentikasi dapat melihat seluruh profile
CREATE POLICY "Profiles viewable by authenticated users"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 2. Pengguna dapat mengupdate profil miliknya sendiri
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 3. IT MANAGER dapat mengupdate profile siapa saja
CREATE POLICY "IT MANAGER can update all profiles"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.current_user_role() = 'IT MANAGER');

-- INVENTORY POLICIES
-- 1. Semua pengguna terautentikasi dapat melihat data inventaris
CREATE POLICY "Inventory select policy"
ON public.inventory FOR SELECT
TO authenticated
USING (true);

-- 2. Semua staf IT (TRAINEE, ASSIST, MANAGER) dapat menambah inventaris
CREATE POLICY "Inventory insert policy"
ON public.inventory FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST', 'IT TRAINEE'));

-- 3. Staf IT dapat mengupdate inventaris
CREATE POLICY "Inventory update policy"
ON public.inventory FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST', 'IT TRAINEE'))
WITH CHECK (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST', 'IT TRAINEE'));

-- 4. IT MANAGER dan IT ASSIST dapat menghapus inventaris
CREATE POLICY "Inventory delete policy"
ON public.inventory FOR DELETE
TO authenticated
USING (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST'));

-- PURCHASE ORDERS POLICIES
CREATE POLICY "Purchase orders select policy"
ON public.purchase_orders FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Purchase orders insert policy"
ON public.purchase_orders FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST', 'IT TRAINEE'));

CREATE POLICY "Purchase orders update policy"
ON public.purchase_orders FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST', 'IT TRAINEE'))
WITH CHECK (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST', 'IT TRAINEE'));

CREATE POLICY "Purchase orders delete policy"
ON public.purchase_orders FOR DELETE
TO authenticated
USING (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST'));

-- PRELOVED POLICIES
CREATE POLICY "Preloved select policy"
ON public.preloved FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Preloved insert policy"
ON public.preloved FOR INSERT
TO authenticated
WITH CHECK (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST', 'IT TRAINEE'));

CREATE POLICY "Preloved update policy"
ON public.preloved FOR UPDATE
TO authenticated
USING (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST', 'IT TRAINEE'))
WITH CHECK (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST', 'IT TRAINEE'));

CREATE POLICY "Preloved delete policy"
ON public.preloved FOR DELETE
TO authenticated
USING (public.current_user_role() IN ('IT MANAGER', 'IT ASSIST'));

-- ACTIVITIES POLICIES
CREATE POLICY "Activities select policy"
ON public.activities FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Activities insert policy"
ON public.activities FOR INSERT
TO authenticated
WITH CHECK (true);

-- ==============================================================================
-- 8. SUPABASE STORAGE BUCKET: photos
-- ==============================================================================
-- Buat bucket penyimpanan foto inventaris & PO jika belum ada
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy Storage: Siapa saja dapat melihat foto publik
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'photos');

-- Policy Storage: Pengguna terautentikasi dapat mengunggah foto
CREATE POLICY "Authenticated Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'photos');

-- Policy Storage: Pengguna terautentikasi dapat mengubah foto
CREATE POLICY "Authenticated Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'photos');

-- Policy Storage: Pengguna IT MANAGER dan IT ASSIST dapat menghapus foto
CREATE POLICY "Authorized Delete Access"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'photos');
