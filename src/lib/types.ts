export type Category = 'PC ITEMS' | 'NETWORK ITEMS' | 'CCTV & TV ITEMS';

export const CATEGORIES: Category[] = [
  'PC ITEMS',
  'NETWORK ITEMS',
  'CCTV & TV ITEMS'
];

// Master Item Catalog (Katalog Barang)
export interface MasterItem {
  id: string; // Permanent unique ID
  itemName: string; // Required
  category: Category; // Required
  remark?: string | null; // Optional
  photoUrl?: string | null; // Optional
  isActive?: boolean; // Default true, soft-archived if has transactions
  createdAt: string; // ISO 8601
  createdBy: string;
  updatedAt: string; // ISO 8601
  updatedBy: string;
}

// Inventory Stock Transaction (Penambahan Unit / Inbound)
export interface StockTransaction {
  id: string;
  itemId: string; // References MasterItem.id
  transactionDate: string; // YYYY-MM-DD
  quantity: number; // Positive integer
  createdAt: string; // ISO 8601
  createdBy: string;
}

// Unified Inventory Summary Item (Displayed in Inventory View)
export interface InventorySummaryItem extends MasterItem {
  totalQuantity: number; // Sum of inbound transactions
  transactionCount: number; // Count of inbound transactions
  lastTransactionDate?: string | null;
  lastTransactionBy?: string | null;
  lastAddedBy?: string | null;
  lastTransactionQty?: number | null;
  lastTransactionQuantity?: number | null;
  transactions?: StockTransaction[];
}

// Inbound transaction joined with master item info (for Monthly Data)
export interface MonthlyStockTransaction {
  id: string;
  itemId: string;
  itemName: string;
  category: Category;
  photoUrl?: string | null;
  transactionDate: string;
  quantity: number;
  createdBy: string;
  remark?: string | null;
  createdAt: string;
}

// Backward-compatible InventoryItem interface
export interface InventoryItem {
  id: string;
  itemName: string;
  photoUrl: string;
  category: Category;
  dateRepaired: string; // YYYY-MM-DD (Tanggal Rekap / Penambahan)
  quantity?: number; // Jumlah unit
  serialNumber?: string | null;
  remark?: string | null;
  createdAt: string; // ISO 8601
  createdBy: string;
  updatedAt: string; // ISO 8601
  updatedBy: string;
  // Augmented summary properties for new architecture
  totalQuantity?: number;
  transactionCount?: number;
  lastTransactionDate?: string | null;
  lastTransactionBy?: string | null;
  lastAddedBy?: string | null;
  lastTransactionQty?: number | null;
  lastTransactionQuantity?: number | null;
  transactions?: StockTransaction[];
  isActive?: boolean;
}

export interface PrelovedItem {
  id: string;
  itemName: string;
  photoUrl: string;
  category: Category;
  dateRepaired: string; // YYYY-MM-DD (Tanggal dibereskan)
  quantity?: number; // Jumlah unit (opsional, default 1)
  serialNumber?: string | null;
  remark?: string | null; // Kolom "remark" (ex Front Office, ex Room)
  createdAt: string; // ISO 8601
  createdBy: string;
  updatedAt: string; // ISO 8601
  updatedBy: string;
}

export type POStatus = 'BELUM DATANG' | 'SUDAH DATANG';

export interface PurchaseOrderItem {
  id: string;
  itemName: string;
  photoUrl: string;
  dateOrder: string; // YYYY-MM-DD
  dateArrival?: string | null; // YYYY-MM-DD
  quantity: number; // Jumlah unit
  forUse: string; // Peruntukan / For use
  remarks?: string | null; // Catatan
  status: POStatus; // 'BELUM DATANG' | 'SUDAH DATANG'
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface UserAccount {
  id: string;
  username: string;
  role: 'IT MANAGER' | 'IT ASSIST' | 'IT TRAINEE' | string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityRecord {
  id: string;
  targetId?: string;
  inventoryId?: string;
  itemName: string;
  category?: string;
  type?: 'INVENTORY' | 'PURCHASE ORDER' | 'PRELOVED';
  action: 'Added' | 'Edited' | 'Deleted';
  username: string;
  timestamp: string;
}

export interface InventoryStats {
  total: number; // Jumlah jenis barang (master items aktif)
  totalUnits?: number; // Total unit stok tersedia
  pcCount: number;
  networkCount: number;
  cctvCount: number;
  addedThisMonth: number; // Unit penambahan bulan ini
}

export interface PrelovedStats {
  total: number;
  pcCount: number;
  networkCount: number;
  cctvCount: number;
  addedThisMonth: number;
}

export interface POStats {
  total: number;
  pendingCount: number; // Menunggu Datang / Belum Datang
  arrivedCount: number; // Sudah Datang
  orderedThisMonth: number;
}

export interface FilterOptions {
  search?: string;
  category?: string;
  month?: string; // e.g. "2026-08" or "AUGUST 2026" or "8"
  year?: number;
  user?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'name-asc' | 'name-desc' | 'date-newest' | 'date-oldest' | 'updated-newest' | 'category' | 'user';
}

export type PrelovedFilterOptions = FilterOptions;

export interface POFilterOptions {
  search?: string;
  status?: 'ALL' | 'BELUM DATANG' | 'SUDAH DATANG';
  month?: string;
  user?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'name-asc' | 'name-desc' | 'order-newest' | 'order-oldest' | 'arrival-newest' | 'updated-newest' | 'quantity-desc';
}

export type RecentItem = {
  type: 'INVENTORY' | 'PURCHASE ORDER' | 'PRELOVED';
  item: InventoryItem | PurchaseOrderItem | PrelovedItem;
};

