import type {
  InventoryItem,
  UserAccount,
  ActivityRecord,
  InventoryStats,
  FilterOptions,
  PurchaseOrderItem,
  POFilterOptions,
  POStats,
  PrelovedItem,
  PrelovedStats,
  MasterItem,
  StockTransaction,
  MonthlyStockTransaction,
  DepartmentName,
  DepartmentMovement,
  EnrichedMotionRecord,
  DepartmentAssetItem,
  DepartmentSummary,
  MonthlyDepartmentalReportItem
} from './types';

const TOKEN_KEY = 'hotel_it_token';
const SECRET_TOKEN_KEY = 'hotel_it_secret_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredSecretToken(): string | null {
  return sessionStorage.getItem(SECRET_TOKEN_KEY);
}

export function setStoredSecretToken(token: string | null) {
  if (token) {
    sessionStorage.setItem(SECRET_TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(SECRET_TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getStoredToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  const secretToken = getStoredSecretToken();
  if (secretToken) {
    headers.set('x-secret-token', secretToken);
  }
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errData.message || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

// Authentication
export async function loginUser(username: string, password: string): Promise<{ token: string; user: UserAccount }> {
  const res = await request<{ token: string; user: UserAccount }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  setStoredToken(res.token);
  return res;
}

export async function getCurrentUser(): Promise<UserAccount> {
  const res = await request<{ user: UserAccount }>('/api/auth/me');
  return res.user;
}

export async function logoutUser(): Promise<void> {
  try {
    await request('/api/auth/logout', { method: 'POST' });
  } catch {
    // continue cleanup
  }
  setStoredToken(null);
  setStoredSecretToken(null);
}

// Secret Code & User Management
export async function verifySecretCode(secretCode: string): Promise<string> {
  const res = await request<{ success: boolean; secretToken: string }>('/api/auth/verify-secret', {
    method: 'POST',
    body: JSON.stringify({ secretCode })
  });
  setStoredSecretToken(res.secretToken);
  return res.secretToken;
}

export async function getUsersList(): Promise<UserAccount[]> {
  const res = await request<{ users: UserAccount[] }>('/api/users');
  return res.users;
}

export async function updateUserCredentials(id: string, username?: string, password?: string): Promise<{ message: string; user: UserAccount }> {
  return request<{ message: string; user: UserAccount }>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ username, password })
  });
}

// Inventory
export interface InventoryResponse {
  data: InventoryItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchInventory(filters: FilterOptions = {}, page = 1, limit = 50): Promise<InventoryResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.month && filters.month !== 'All') params.set('month', filters.month);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  return request<InventoryResponse>(`/api/inventory?${params.toString()}`);
}

export async function fetchRecentlyEdited(): Promise<InventoryItem[]> {
  const res = await request<{ data: InventoryItem[] }>('/api/inventory/recently-edited');
  return res.data;
}

export async function fetchStats(): Promise<InventoryStats> {
  return request<InventoryStats>('/api/inventory/stats');
}

export async function fetchRecentActivity(): Promise<ActivityRecord[]> {
  const res = await request<{ data: ActivityRecord[] }>('/api/inventory/recent-activity');
  return res.data;
}

export async function fetchInventoryItem(id: string): Promise<InventoryItem> {
  const res = await request<{ data: InventoryItem }>(`/api/inventory/${id}`);
  return res.data;
}

export async function createInventory(item: Partial<InventoryItem>): Promise<{ message: string; data: InventoryItem }> {
  return request<{ message: string; data: InventoryItem }>('/api/inventory', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

export async function updateInventory(id: string, item: Partial<InventoryItem>): Promise<{ message: string; data: InventoryItem }> {
  return request<{ message: string; data: InventoryItem }>(`/api/inventory/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function deleteInventory(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/inventory/${id}`, {
    method: 'DELETE'
  });
}

// Master Items API
export async function fetchMasterItems(options: { search?: string; category?: string; status?: string } = {}): Promise<MasterItem[]> {
  const params = new URLSearchParams();
  if (options.search) params.set('search', options.search);
  if (options.category && options.category !== 'All') params.set('category', options.category);
  if (options.status) params.set('status', options.status);

  const res = await request<{ data: MasterItem[] }>(`/api/master-items?${params.toString()}`);
  return res.data;
}

export async function createMasterItem(item: {
  itemName: string;
  category: string;
  remark?: string | null;
  photoUrl?: string | null;
}): Promise<{ message: string; data: MasterItem }> {
  return request<{ message: string; data: MasterItem }>('/api/master-items', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

export async function updateMasterItem(
  id: string,
  item: Partial<MasterItem>
): Promise<{ message: string; data: MasterItem }> {
  return request<{ message: string; data: MasterItem }>(`/api/master-items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function deleteMasterItem(id: string): Promise<{ message: string; archived?: boolean }> {
  return request<{ message: string; archived?: boolean }>(`/api/master-items/${id}`, {
    method: 'DELETE'
  });
}

// Stock Transactions API
export async function fetchStockTransactions(options: {
  itemId?: string;
  month?: string;
  year?: number;
  category?: string;
  search?: string;
} = {}): Promise<MonthlyStockTransaction[]> {
  const params = new URLSearchParams();
  if (options.itemId) params.set('itemId', options.itemId);
  if (options.month && options.month !== 'All') params.set('month', options.month);
  if (options.year) params.set('year', options.year.toString());
  if (options.category && options.category !== 'All') params.set('category', options.category);
  if (options.search) params.set('search', options.search);

  const res = await request<{ data: MonthlyStockTransaction[] }>(`/api/inventory/transactions?${params.toString()}`);
  return res.data;
}

export async function recordStockInbound(data: {
  itemId: string;
  transactionDate: string;
  quantity: number;
}): Promise<{ message: string; data: StockTransaction }> {
  return request<{ message: string; data: StockTransaction }>('/api/inventory/transactions', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function updateStockTransaction(
  id: string,
  data: { transactionDate?: string; quantity?: number }
): Promise<{ message: string; data: StockTransaction }> {
  return request<{ message: string; data: StockTransaction }>(`/api/inventory/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export async function deleteStockTransaction(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/inventory/transactions/${id}`, {
    method: 'DELETE'
  });
}

// Upload photo
export async function uploadImageBase64(imageBase64: string): Promise<string> {
  const res = await request<{ url: string }>('/api/upload', {
    method: 'POST',
    body: JSON.stringify({ imageBase64 })
  });
  return res.url;
}

// Trigger Excel download (Master Catalog or Monthly Inbound)
export async function downloadExcel(filters: FilterOptions & { type?: 'master' | 'monthly' } = {}): Promise<void> {
  const params = new URLSearchParams();
  if (filters.type) params.set('type', filters.type);
  if (filters.month) params.set('month', filters.month);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.search) params.set('search', filters.search);

  const token = getStoredToken();
  const url = `/api/export/excel?${params.toString()}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!res.ok) {
    throw new Error('Failed to generate Excel file.');
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;

  const contentDisposition = res.headers.get('content-disposition');
  let filename = filters.type === 'master' ? 'HOTEL_IT_MASTER_INVENTORY.xlsx' : 'HOTEL_IT_INVENTORY.xlsx';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// Purchase Orders API
export interface POResponse {
  data: PurchaseOrderItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchPurchaseOrders(filters: POFilterOptions = {}, page = 1, limit = 50): Promise<POResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
  if (filters.month && filters.month !== 'All') params.set('month', filters.month);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  return request<POResponse>(`/api/po?${params.toString()}`);
}

export async function fetchPOStats(): Promise<POStats> {
  return request<POStats>('/api/po/stats');
}

export async function fetchPurchaseOrderItem(id: string): Promise<PurchaseOrderItem> {
  const res = await request<{ data: PurchaseOrderItem }>(`/api/po/${id}`);
  return res.data;
}

export async function createPurchaseOrder(item: Partial<PurchaseOrderItem>): Promise<{ message: string; data: PurchaseOrderItem }> {
  return request<{ message: string; data: PurchaseOrderItem }>('/api/po', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

export async function updatePurchaseOrder(id: string, item: Partial<PurchaseOrderItem>): Promise<{ message: string; data: PurchaseOrderItem }> {
  return request<{ message: string; data: PurchaseOrderItem }>(`/api/po/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function deletePurchaseOrder(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/po/${id}`, {
    method: 'DELETE'
  });
}

export async function downloadPOExcel(filters: POFilterOptions = {}): Promise<void> {
  const params = new URLSearchParams();
  if (filters.month) params.set('month', filters.month);
  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.search) params.set('search', filters.search);

  const token = getStoredToken();
  const url = `/api/export/excel-po?${params.toString()}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!res.ok) {
    throw new Error('Failed to generate Purchase Order Excel file.');
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;

  const contentDisposition = res.headers.get('content-disposition');
  let filename = 'HOTEL_IT_PURCHASE_ORDER.xlsx';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// ==========================================
// Preloved API
// ==========================================

export interface PrelovedResponse {
  data: PrelovedItem[];
  total: number;
  page: number;
  totalPages: number;
}

export async function fetchPreloved(filters: FilterOptions = {}, page = 1, limit = 50): Promise<PrelovedResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.month && filters.month !== 'All') params.set('month', filters.month);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  params.set('page', page.toString());
  params.set('limit', limit.toString());

  return request<PrelovedResponse>(`/api/preloved?${params.toString()}`);
}

export async function fetchPrelovedStats(): Promise<PrelovedStats> {
  return request<PrelovedStats>('/api/preloved/stats');
}

export async function fetchPrelovedItem(id: string): Promise<PrelovedItem> {
  const res = await request<{ data: PrelovedItem }>(`/api/preloved/${id}`);
  return res.data;
}

export async function createPreloved(item: Partial<PrelovedItem>): Promise<{ message: string; data: PrelovedItem }> {
  return request<{ message: string; data: PrelovedItem }>('/api/preloved', {
    method: 'POST',
    body: JSON.stringify(item)
  });
}

export async function updatePreloved(id: string, item: Partial<PrelovedItem>): Promise<{ message: string; data: PrelovedItem }> {
  return request<{ message: string; data: PrelovedItem }>(`/api/preloved/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  });
}

export async function deletePreloved(id: string): Promise<{ message: string }> {
  return request<{ message: string }>(`/api/preloved/${id}`, {
    method: 'DELETE'
  });
}

export async function downloadPrelovedExcel(filters: FilterOptions = {}): Promise<void> {
  const params = new URLSearchParams();
  if (filters.month) params.set('month', filters.month);
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.user && filters.user !== 'All Users') params.set('user', filters.user);
  if (filters.search) params.set('search', filters.search);

  const token = getStoredToken();
  const url = `/api/export/excel-preloved?${params.toString()}`;

  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!res.ok) {
    throw new Error('Failed to generate Preloved Excel file.');
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;

  const contentDisposition = res.headers.get('content-disposition');
  let filename = 'HOTEL_IT_PRELOVED.xlsx';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) {
      filename = match[1];
    }
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

// ==========================================
// DEPARTMENTAL ASSET & MOTION ANALYTICS API
// ==========================================

export async function fetchDepartments(): Promise<DepartmentSummary[]> {
  const res = await request<{ data: DepartmentSummary[] }>('/api/departments');
  return res.data;
}

export async function fetchDepartmentItems(
  name: DepartmentName,
  filters: { category?: string; search?: string } = {}
): Promise<{ department: DepartmentName; data: DepartmentAssetItem[]; totalUnits: number; totalJenis: number }> {
  const params = new URLSearchParams();
  if (filters.category && filters.category !== 'All') params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  return request(`/api/departments/${encodeURIComponent(name)}/items?${params.toString()}`);
}

export async function transferAssetToDepartment(data: {
  itemId: string;
  department: DepartmentName;
  quantity: number;
  date: string;
  remark?: string;
}): Promise<{ message: string; movement: DepartmentMovement; remainingInventoryStock: number }> {
  return request('/api/departments/transfer', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function returnAssetToInventory(data: {
  itemId: string;
  department: DepartmentName;
  quantity: number;
  date: string;
  remark?: string;
}): Promise<{ message: string; movement: DepartmentMovement; remainingDeptStock: number }> {
  return request('/api/departments/return', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export async function fetchMotionAnalytics(filters: {
  search?: string;
  department?: string;
  category?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{
  data: EnrichedMotionRecord[];
  total: number;
  page: number;
  totalPages: number;
  summary: { totalMovements: number; totalTransferredUnits: number; totalReturnedUnits: number };
}> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.department && filters.department !== 'ALL') params.set('department', filters.department);
  if (filters.category && filters.category !== 'ALL') params.set('category', filters.category);
  if (filters.type && filters.type !== 'ALL') params.set('type', filters.type);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  return request(`/api/motion-analytics?${params.toString()}`);
}

export async function fetchMonthlyDepartmental(
  name: DepartmentName,
  month: number,
  year: number
): Promise<{
  department: DepartmentName;
  month: number;
  year: number;
  data: MonthlyDepartmentalReportItem[];
  totalReceived: number;
  totalReturned: number;
  totalClosing: number;
}> {
  return request(`/api/departments/${encodeURIComponent(name)}/monthly?month=${month}&year=${year}`);
}

export async function downloadDepartmentExcel(options: {
  department?: string;
  month?: number;
  year?: number;
} = {}): Promise<void> {
  const params = new URLSearchParams();
  if (options.department && options.department !== 'ALL') params.set('department', options.department);
  if (options.month) params.set('month', String(options.month));
  if (options.year) params.set('year', String(options.year));

  const token = getStoredToken();
  const res = await fetch(`/api/export/excel-department?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to generate Department Excel.');
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const contentDisposition = res.headers.get('content-disposition');
  let filename = 'HOTEL_IT_ASSET_DEPARTMENT.xlsx';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export async function downloadMotionExcel(options: {
  department?: string;
  month?: number;
  year?: number;
} = {}): Promise<void> {
  const params = new URLSearchParams();
  if (options.department && options.department !== 'ALL') params.set('department', options.department);
  if (options.month) params.set('month', String(options.month));
  if (options.year) params.set('year', String(options.year));

  const token = getStoredToken();
  const res = await fetch(`/api/export/excel-motion?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });
  if (!res.ok) throw new Error('Failed to generate Motion Analytics Excel.');
  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  const contentDisposition = res.headers.get('content-disposition');
  let filename = 'HOTEL_IT_MOTION_ANALYTICS.xlsx';
  if (contentDisposition) {
    const match = contentDisposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}




