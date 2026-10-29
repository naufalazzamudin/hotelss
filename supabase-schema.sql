-- ==============================================================================
-- HOTEL IT INVENTORY MANAGEMENT - COMPLETE SUPABASE SQL SCHEMA (DDL)
-- Architecture: Zero-RLS (All tables open for direct client Anon Key access)
-- Execute this script directly in the Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Drop existing tables if re-initializing (Optional, safe clean setup)
DROP TABLE IF EXISTS public.activities CASCADE;
DROP TABLE IF EXISTS public.department_movements CASCADE;
DROP TABLE IF EXISTS public.stock_transactions CASCADE;
DROP TABLE IF EXISTS public.master_items CASCADE;
DROP TABLE IF EXISTS public.purchase_orders CASCADE;
DROP TABLE IF EXISTS public.preloved CASCADE;
DROP TABLE IF EXISTS public.inventory CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- ==============================================================================
-- 3. TABLE: master_items (Katalog Master Barang IT)
-- ==============================================================================
CREATE TABLE public.master_items (
  id TEXT PRIMARY KEY,
  item_code TEXT,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS')),
  remark TEXT,
  photo_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by TEXT NOT NULL DEFAULT 'IT System',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by TEXT NOT NULL DEFAULT 'IT System'
);

CREATE INDEX idx_master_items_category ON public.master_items(category);
CREATE INDEX idx_master_items_name ON public.master_items(item_name);

-- ==============================================================================
-- 4. TABLE: stock_transactions (Transaksi Inbound Stok / Penambahan Unit)
-- ==============================================================================
CREATE TABLE public.stock_transactions (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES public.master_items(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by TEXT NOT NULL DEFAULT 'IT Team'
);

CREATE INDEX idx_stock_trans_item_id ON public.stock_transactions(item_id);
CREATE INDEX idx_stock_trans_date ON public.stock_transactions(transaction_date);

-- ==============================================================================
-- 5. TABLE: department_movements (Mutasi Transfer & Pengembalian Departemen)
-- ==============================================================================
CREATE TABLE public.department_movements (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL REFERENCES public.master_items(id) ON DELETE CASCADE,
  department TEXT NOT NULL CHECK (department IN (
    'Front Office',
    'House Keeping',
    'Engineering',
    'Human Resource',
    'Food & Beverage',
    'Sales & Marketing',
    'Accounting'
  )),
  type TEXT NOT NULL CHECK (type IN ('TRANSFER_TO_DEPARTMENT', 'RETURN_TO_INVENTORY')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  recipient_name TEXT,
  remark TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by TEXT NOT NULL DEFAULT 'IT Team'
);

CREATE INDEX idx_dept_movements_item ON public.department_movements(item_id);
CREATE INDEX idx_dept_movements_dept ON public.department_movements(department);
CREATE INDEX idx_dept_movements_type ON public.department_movements(type);
CREATE INDEX idx_dept_movements_date ON public.department_movements(date);

-- ==============================================================================
-- 6. TABLE: purchase_orders (Data Pengadaan Barang IT / Purchase Orders)
-- ==============================================================================
CREATE TABLE public.purchase_orders (
  id TEXT PRIMARY KEY,
  po_number TEXT,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'PC ITEMS',
  photo_url TEXT,
  date_order DATE NOT NULL DEFAULT CURRENT_DATE,
  date_arrival DATE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  for_use TEXT NOT NULL,
  remarks TEXT,
  vendor TEXT,
  status TEXT NOT NULL CHECK (status IN ('BELUM DATANG', 'SUDAH DATANG')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by TEXT NOT NULL DEFAULT 'IT Admin',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by TEXT NOT NULL DEFAULT 'IT Admin'
);

CREATE INDEX idx_po_status ON public.purchase_orders(status);
CREATE INDEX idx_po_date_order ON public.purchase_orders(date_order);

-- ==============================================================================
-- 7. TABLE: preloved (Hardware Bekas / Refurbished / Spare Parts)
-- ==============================================================================
CREATE TABLE public.preloved (
  id TEXT PRIMARY KEY,
  item_code TEXT,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS')),
  date_repaired DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  serial_number TEXT,
  remark TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  created_by TEXT NOT NULL DEFAULT 'IT Team',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_by TEXT NOT NULL DEFAULT 'IT Team'
);

CREATE INDEX idx_preloved_category ON public.preloved(category);
CREATE INDEX idx_preloved_date ON public.preloved(date_repaired);

-- ==============================================================================
-- 8. TABLE: activities (Audit Trail Log Aktivitas Sistem)
-- ==============================================================================
CREATE TABLE public.activities (
  id TEXT PRIMARY KEY,
  item_name TEXT NOT NULL,
  category TEXT,
  action TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT 'IT User',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  target_id TEXT,
  type TEXT
);

CREATE INDEX idx_activities_timestamp ON public.activities(timestamp DESC);

-- ==============================================================================
-- 9. CRITICAL REQUIREMENT: DISABLE ROW LEVEL SECURITY (RLS) FOR ZERO-FRICTION
-- Developer & user can query and perform CRUD directly with Supabase Anon Key.
-- ==============================================================================
ALTER TABLE public.master_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.preloved DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities DISABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 10. STORAGE BUCKET: photos (Public Bucket for Hardware Images)
-- ==============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Ensure public access to photos
DROP POLICY IF EXISTS "Public Storage Read" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Insert" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Update" ON storage.objects;
DROP POLICY IF EXISTS "Public Storage Delete" ON storage.objects;

CREATE POLICY "Public Storage Read" ON storage.objects FOR SELECT TO public USING (bucket_id = 'photos');
CREATE POLICY "Public Storage Insert" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'photos');
CREATE POLICY "Public Storage Update" ON storage.objects FOR UPDATE TO public USING (bucket_id = 'photos');
CREATE POLICY "Public Storage Delete" ON storage.objects FOR DELETE TO public USING (bucket_id = 'photos');

-- ==============================================================================
-- 11. INITIAL SEED DATA (HOTEL IT INVENTORY DEMO READY)
-- ==============================================================================

-- Seed Master Items
INSERT INTO public.master_items (id, item_code, item_name, category, remark, photo_url, created_by, updated_by)
VALUES
('item-001', 'PC-001', 'Dell OptiPlex 7090 Desktop Intel Core i7', 'PC ITEMS', 'Front Office & Admin Standard Workstation', 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400&auto=format&fit=crop&q=80', 'admin@hotel.com', 'admin@hotel.com'),
('item-002', 'PC-002', 'Lenovo ThinkPad E14 Gen 4 Core i5', 'PC ITEMS', 'Management & Duty Manager Laptop', 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&auto=format&fit=crop&q=80', 'admin@hotel.com', 'admin@hotel.com'),
('item-003', 'NET-001', 'Cisco Catalyst 2960-X 48-Port PoE Switch', 'NETWORK ITEMS', 'Floor Distribution & AP Core Switch', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&auto=format&fit=crop&q=80', 'admin@hotel.com', 'admin@hotel.com'),
('item-004', 'NET-002', 'Ubiquiti UniFi U6-Pro WiFi 6 Access Point', 'NETWORK ITEMS', 'Guest Corridor & Ball Room Access Points', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80', 'admin@hotel.com', 'admin@hotel.com'),
('item-005', 'CCTV-001', 'Hikvision 4MP IP Dome Camera DS-2CD2143G2-I', 'CCTV & TV ITEMS', 'Lobby & Corridor Night Vision Surveillance', 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&auto=format&fit=crop&q=80', 'admin@hotel.com', 'admin@hotel.com'),
('item-006', 'CCTV-002', 'Samsung 50" Crystal 4K UHD Smart Hospitality TV', 'CCTV & TV ITEMS', 'Guest Room & Executive Lounge Display', 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&auto=format&fit=crop&q=80', 'admin@hotel.com', 'admin@hotel.com')
ON CONFLICT (id) DO NOTHING;

-- Seed Inbound Stock Transactions (Stok Masuk)
INSERT INTO public.stock_transactions (id, item_id, transaction_date, quantity, remark, created_by)
VALUES
('tx-001', 'item-001', CURRENT_DATE - INTERVAL '10 days', 15, 'Batch pengadaan PC Q4', 'admin@hotel.com'),
('tx-002', 'item-002', CURRENT_DATE - INTERVAL '8 days', 10, 'Pengadaan Laptop Staff', 'admin@hotel.com'),
('tx-003', 'item-003', CURRENT_DATE - INTERVAL '15 days', 6, 'Cadangan Switch Server Room', 'admin@hotel.com'),
('tx-004', 'item-004', CURRENT_DATE - INTERVAL '5 days', 20, 'Ekspansi WiFi Lantai 3-5', 'admin@hotel.com'),
('tx-005', 'item-005', CURRENT_DATE - INTERVAL '12 days', 25, 'Replacement CCTV Unit', 'admin@hotel.com'),
('tx-006', 'item-006', CURRENT_DATE - INTERVAL '20 days', 12, 'Stok Spare TV Kamar Deluxe', 'admin@hotel.com')
ON CONFLICT (id) DO NOTHING;

-- Seed Department Movements (Transfer & Return)
INSERT INTO public.department_movements (id, item_id, department, type, quantity, date, recipient_name, remark, created_by)
VALUES
('mov-001', 'item-001', 'Front Office', 'TRANSFER_TO_DEPARTMENT', 4, CURRENT_DATE - INTERVAL '7 days', 'Budi Santoso (FOM)', 'Unit PC untuk Receptionist Counter 1-4', 'admin@hotel.com'),
('mov-002', 'item-001', 'Accounting', 'TRANSFER_TO_DEPARTMENT', 3, CURRENT_DATE - INTERVAL '6 days', 'Siti Rahma (Chief Acct)', 'Unit PC Finance & Night Auditor', 'admin@hotel.com'),
('mov-003', 'item-002', 'Sales & Marketing', 'TRANSFER_TO_DEPARTMENT', 2, CURRENT_DATE - INTERVAL '4 days', 'Rian Pratama (DOSM)', 'Laptop untuk Sales Executive Client Visit', 'admin@hotel.com'),
('mov-004', 'item-004', 'Engineering', 'TRANSFER_TO_DEPARTMENT', 5, CURRENT_DATE - INTERVAL '3 days', 'Agus Setiawan (Chief Eng)', 'Pemasangan AP Area Pre-function', 'admin@hotel.com'),
('mov-005', 'item-005', 'House Keeping', 'TRANSFER_TO_DEPARTMENT', 2, CURRENT_DATE - INTERVAL '2 days', 'Lina Marlina (HK Mgr)', 'CCTV Koridor Linen Room', 'admin@hotel.com'),
('mov-006', 'item-001', 'Front Office', 'RETURN_TO_INVENTORY', 1, CURRENT_DATE - INTERVAL '1 days', 'Budi Santoso (FOM)', 'Kembali ke IT untuk maintenance berkala', 'admin@hotel.com')
ON CONFLICT (id) DO NOTHING;

-- Seed Purchase Orders
INSERT INTO public.purchase_orders (id, po_number, item_name, category, photo_url, date_order, date_arrival, quantity, for_use, remarks, vendor, status, created_by, updated_by)
VALUES
('po-001', 'PO-2026-10-001', 'Logitech MK270 Wireless Keyboard & Mouse Combo', 'PC ITEMS', 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&auto=format&fit=crop&q=80', CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '2 days', 20, 'Stock Keyboard Replacement All Depts', 'Vendor Surya Komputer Jakarta', 'Surya Komputer', 'SUDAH DATANG', 'admin@hotel.com', 'admin@hotel.com'),
('po-002', 'PO-2026-10-002', 'Cat6 UTP Cable Belden 305m Roll', 'NETWORK ITEMS', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&auto=format&fit=crop&q=80', CURRENT_DATE - INTERVAL '5 days', NULL, 3, 'Peremajaan Kabel LAN Gedung Annex', 'Kabelindo Jaya Mandiri', 'Kabelindo Jaya', 'BELUM DATANG', 'admin@hotel.com', 'admin@hotel.com'),
('po-003', 'PO-2026-10-003', 'Hikvision 16-Channel NVR 4K DS-7616NI-Q2', 'CCTV & TV ITEMS', 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&auto=format&fit=crop&q=80', CURRENT_DATE - INTERVAL '3 days', NULL, 1, 'Upgrade Server CCTV Ruang Security', 'Security CCTV Specialist', 'Security CCTV Specialist', 'BELUM DATANG', 'admin@hotel.com', 'admin@hotel.com')
ON CONFLICT (id) DO NOTHING;

-- Seed Preloved Hardware
INSERT INTO public.preloved (id, item_code, item_name, category, date_repaired, quantity, serial_number, remark, photo_url, created_by, updated_by)
VALUES
('pre-001', 'PRE-PC-01', 'HP ProDesk 400 G4 Desktop (Refurbished)', 'PC ITEMS', CURRENT_DATE - INTERVAL '12 days', 2, 'SN-HP-99201A', 'Ex Front Office counter. RAM upgraded to 16GB, SSD 256GB baru', 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400&auto=format&fit=crop&q=80', 'admin@hotel.com', 'admin@hotel.com'),
('pre-002', 'PRE-NET-01', 'MikroTik Cloud Router RB1100AHx4', 'NETWORK ITEMS', CURRENT_DATE - INTERVAL '8 days', 1, 'SN-MT-48218C', 'Ex Core Backup. Sudah di-reset default RouterOS v7.14', 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&auto=format&fit=crop&q=80', 'admin@hotel.com', 'admin@hotel.com'),
('pre-003', 'PRE-CCTV-01', 'LG 43" Commercial TV 43UN7100 (Ex Guest Room)', 'CCTV & TV ITEMS', CURRENT_DATE - INTERVAL '4 days', 3, 'SN-LG-88319X', 'Ex Kamar 401-403, kondisi layar mulus 95%, lengkap remote & bracket', 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&auto=format&fit=crop&q=80', 'admin@hotel.com', 'admin@hotel.com')
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Activities Log
INSERT INTO public.activities (id, item_name, category, action, username, timestamp, type)
VALUES
('act-001', 'Dell OptiPlex 7090 Desktop', 'PC ITEMS', 'Added', 'admin@hotel.com', CURRENT_DATE - INTERVAL '10 days', 'INVENTORY'),
('act-002', 'Front Office Handover (4 Units)', 'PC ITEMS', 'Transfer', 'admin@hotel.com', CURRENT_DATE - INTERVAL '7 days', 'DEPARTMENT'),
('act-003', 'Logitech MK270 Wireless Combo', 'PC ITEMS', 'Received', 'admin@hotel.com', CURRENT_DATE - INTERVAL '2 days', 'PURCHASE ORDER'),
('act-004', 'Front Office Return (1 Unit)', 'PC ITEMS', 'Return', 'admin@hotel.com', CURRENT_DATE - INTERVAL '1 days', 'DEPARTMENT')
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- SCHEMA MIGRATION COMPLETED SUCCESSFULLY
-- Zero RLS is configured. Tables are fully accessible via Supabase Client SDK.
-- ==============================================================================
