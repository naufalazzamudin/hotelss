import type {
  InventoryItem,
  FilterOptions,
  InventoryStats,
  Category,
  MasterItem,
  StockTransaction,
  InventorySummaryItem,
  MonthlyStockTransaction
} from './types';

export const MONTH_NAMES = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];

/**
 * Checks if a given dateRepaired string (YYYY-MM-DD or ISO) belongs to a specific month (1-12) and year.
 */
export function isDateRepairedInMonth(dateRepaired: string, month: number, year: number): boolean {
  if (!dateRepaired) return false;
  const parts = dateRepaired.split('T')[0].split('-');
  if (parts.length >= 2) {
    const itemYear = parseInt(parts[0], 10);
    const itemMonth = parseInt(parts[1], 10);
    return itemYear === year && itemMonth === month;
  }
  const d = new Date(dateRepaired);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === year && (d.getMonth() + 1) === month;
}

/**
 * Parses month string like "2026-08", "AUGUST 2026", or month index.
 */
export function parseMonthFilter(monthFilter?: string): { month: number; year: number } | null {
  if (!monthFilter || monthFilter.toLowerCase() === 'all') return null;

  // Format "2026-08" or "2026-8"
  if (/^\d{4}-\d{1,2}$/.test(monthFilter)) {
    const [y, m] = monthFilter.split('-').map(Number);
    return { year: y, month: m };
  }

  // Format "AUGUST 2026" or "AUGUST"
  const upper = monthFilter.toUpperCase().trim();
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const mName = MONTH_NAMES[i];
    if (upper.includes(mName)) {
      const yearMatch = upper.match(/\b(20\d{2})\b/);
      const year = yearMatch ? parseInt(yearMatch[1], 10) : 2026;
      return { month: i + 1, year };
    }
  }

  // Pure month number 1-12
  const num = parseInt(monthFilter, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) {
    return { month: num, year: 2026 };
  }

  return null;
}

/**
 * Pure function to filter inventory items
 */
export function filterInventory(items: InventoryItem[], filters: FilterOptions): InventoryItem[] {
  return items.filter(item => {
    // 1. Search across Item Name, Serial Number, Remark, Category, CreatedBy, UpdatedBy
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      const matchName = item.itemName.toLowerCase().includes(q);
      const matchSN = item.serialNumber ? item.serialNumber.toLowerCase().includes(q) : false;
      const matchRemark = item.remark ? item.remark.toLowerCase().includes(q) : false;
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchCreator = item.createdBy.toLowerCase().includes(q);
      const matchUpdater = item.updatedBy.toLowerCase().includes(q);
      if (!matchName && !matchSN && !matchRemark && !matchCategory && !matchCreator && !matchUpdater) {
        return false;
      }
    }

    // 2. Category Filter
    if (filters.category && filters.category !== 'All' && filters.category !== 'ALL') {
      if (item.category !== filters.category) {
        return false;
      }
    }

    // 3. Month Filter (based on dateRepaired strictly)
    if (filters.month) {
      const parsed = parseMonthFilter(filters.month);
      if (parsed) {
        if (!isDateRepairedInMonth(item.dateRepaired, parsed.month, parsed.year)) {
          return false;
        }
      }
    }

    // 4. User Filter (Added or Edited by)
    if (filters.user && filters.user !== 'All Users' && filters.user !== 'ALL') {
      const targetUser = filters.user.toLowerCase();
      const matchCreated = item.createdBy.toLowerCase() === targetUser;
      const matchUpdated = item.updatedBy.toLowerCase() === targetUser;
      if (!matchCreated && !matchUpdated) {
        return false;
      }
    }

    // 5. Date Range (from / to based on dateRepaired)
    if (filters.dateFrom) {
      const itemDate = item.dateRepaired.split('T')[0];
      if (itemDate < filters.dateFrom) return false;
    }
    if (filters.dateTo) {
      const itemDate = item.dateRepaired.split('T')[0];
      if (itemDate > filters.dateTo) return false;
    }

    return true;
  });
}

/**
 * Pure function to sort inventory items
 */
export function sortInventory(items: InventoryItem[], sortBy: FilterOptions['sortBy'] = 'updated-newest'): InventoryItem[] {
  const sorted = [...items];
  switch (sortBy) {
    case 'name-asc':
      return sorted.sort((a, b) => a.itemName.localeCompare(b.itemName));
    case 'name-desc':
      return sorted.sort((a, b) => b.itemName.localeCompare(a.itemName));
    case 'date-newest':
      return sorted.sort((a, b) => new Date(b.dateRepaired).getTime() - new Date(a.dateRepaired).getTime());
    case 'date-oldest':
      return sorted.sort((a, b) => new Date(a.dateRepaired).getTime() - new Date(b.dateRepaired).getTime());
    case 'category':
      return sorted.sort((a, b) => a.category.localeCompare(b.category));
    case 'user':
      return sorted.sort((a, b) => a.createdBy.localeCompare(b.createdBy));
    case 'updated-newest':
    default:
      return sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }
}

/**
 * Compute dashboard stats from inventory items
 */
export function computeStats(items: InventoryItem[], referenceDate = new Date()): InventoryStats {
  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1;

  let pcCount = 0;
  let networkCount = 0;
  let cctvCount = 0;
  let addedThisMonth = 0;
  let totalUnits = 0;

  for (const item of items) {
    if (item.category === 'PC ITEMS') pcCount++;
    else if (item.category === 'NETWORK ITEMS') networkCount++;
    else if (item.category === 'CCTV & TV ITEMS') cctvCount++;

    const qty = item.totalQuantity !== undefined ? item.totalQuantity : (item.quantity ?? 1);
    totalUnits += qty;

    // Added this month is based on createdAt or dateRepaired
    const created = new Date(item.createdAt);
    if (!isNaN(created.getTime())) {
      if (created.getFullYear() === currentYear && (created.getMonth() + 1) === currentMonth) {
        addedThisMonth += (item.quantity ?? 1);
      }
    }
  }

  return {
    total: items.length,
    totalUnits,
    pcCount,
    networkCount,
    cctvCount,
    addedThisMonth
  };
}

/**
 * Builds unified InventorySummaryItem array by combining MasterItems with their StockTransactions
 */
export function buildInventorySummaries(
  masterItems: (MasterItem | any)[],
  transactions: (StockTransaction | any)[]
): (InventorySummaryItem & InventoryItem)[] {
  return masterItems.map((master) => {
    // Filter transactions for this item, sorted newest first
    const itemTxs = transactions
      .filter((t) => t.itemId === master.id)
      .sort((a, b) => new Date(b.transactionDate || b.createdAt).getTime() - new Date(a.transactionDate || a.createdAt).getTime());

    const totalQuantity = itemTxs.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);
    const transactionCount = itemTxs.length;
    const lastTx = itemTxs[0] || null;

    const summary: InventorySummaryItem & InventoryItem = {
      ...master,
      // Default to master properties
      id: master.id,
      itemName: master.itemName,
      photoUrl: master.photoUrl || '',
      category: master.category as Category,
      remark: master.remark || null,
      isActive: master.isActive !== false,
      createdAt: master.createdAt,
      createdBy: master.createdBy,
      updatedAt: master.updatedAt,
      updatedBy: master.updatedBy,

      // Summary properties
      totalQuantity,
      quantity: totalQuantity, // alias for components expecting quantity
      transactionCount,
      lastTransactionDate: lastTx ? lastTx.transactionDate : null,
      lastTransactionBy: lastTx ? lastTx.createdBy : null,
      lastAddedBy: lastTx ? lastTx.createdBy : null,
      lastTransactionQty: lastTx ? lastTx.quantity : null,
      lastTransactionQuantity: lastTx ? lastTx.quantity : null,
      transactions: itemTxs,
      dateRepaired: lastTx ? lastTx.transactionDate : (master.createdAt ? master.createdAt.split('T')[0] : '2026-10-01')
    };

    return summary;
  });
}

/**
 * Filter master inventory summary items
 */
export function filterInventorySummaries(
  items: (InventorySummaryItem & InventoryItem)[],
  filters: FilterOptions
): (InventorySummaryItem & InventoryItem)[] {
  return items.filter((item) => {
    // Hide archived unless specified
    if (item.isActive === false) return false;

    // Search across Item Name, Remark, Category, Creator, Updater, Last Inbound By
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      const matchName = (item.itemName || '').toLowerCase().includes(q);
      const matchRemark = (item.remark || '').toLowerCase().includes(q);
      const matchCategory = (item.category || '').toLowerCase().includes(q);
      const matchCreator = (item.createdBy || '').toLowerCase().includes(q);
      const matchUpdater = (item.updatedBy || '').toLowerCase().includes(q);
      const matchLastBy = (item.lastTransactionBy || '').toLowerCase().includes(q);
      if (!matchName && !matchRemark && !matchCategory && !matchCreator && !matchUpdater && !matchLastBy) {
        return false;
      }
    }

    // Category Filter
    if (filters.category && filters.category !== 'All' && filters.category !== 'ALL') {
      if (item.category !== filters.category) {
        return false;
      }
    }

    // Month Filter: checks if item had an inbound transaction in the specified month
    if (filters.month && filters.month !== 'All') {
      const parsed = parseMonthFilter(filters.month);
      if (parsed) {
        const hasTxInMonth = (item.transactions || []).some((t) =>
          isDateRepairedInMonth(t.transactionDate, parsed.month, parsed.year)
        );
        if (!hasTxInMonth) {
          return false;
        }
      }
    }

    return true;
  });
}

/**
 * Filter stock inbound transactions for Monthly Data view
 */
export function getMonthlyTransactions(
  masterItems: MasterItem[],
  transactions: StockTransaction[],
  month: number,
  year: number,
  category?: string,
  search?: string
): MonthlyStockTransaction[] {
  const masterMap = new Map<string, MasterItem>();
  for (const m of masterItems) {
    masterMap.set(m.id, m);
  }

  const results: MonthlyStockTransaction[] = [];

  for (const tx of transactions) {
    if (!isDateRepairedInMonth(tx.transactionDate, month, year)) {
      continue;
    }

    const master = masterMap.get(tx.itemId);
    const itemName = master ? master.itemName : 'Barang Dihapus';
    const itemCategory = master ? master.category : ('PC ITEMS' as Category);
    const photoUrl = master ? master.photoUrl : null;
    const remark = master ? master.remark : null;

    if (category && category !== 'All' && category !== 'ALL') {
      if (itemCategory !== category) {
        continue;
      }
    }

    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      const matchName = itemName.toLowerCase().includes(q);
      const matchRemark = (remark || '').toLowerCase().includes(q);
      const matchUser = tx.createdBy.toLowerCase().includes(q);
      if (!matchName && !matchRemark && !matchUser) {
        continue;
      }
    }

    results.push({
      id: tx.id,
      itemId: tx.itemId,
      itemName,
      category: itemCategory,
      photoUrl,
      transactionDate: tx.transactionDate,
      quantity: tx.quantity,
      createdBy: tx.createdBy,
      remark,
      createdAt: tx.createdAt
    });
  }

  // Sort newest transaction date first
  return results.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());
}

/**
 * Format date for display: "08 October 2026"
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Format datetime for display: "08 October 2026, 17:03"
 */
export function formatDateTime(isoString: string): string {
  if (!isoString) return '-';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  const datePart = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
  const timePart = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  return `${datePart}, ${timePart}`;
}
