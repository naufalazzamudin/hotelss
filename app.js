/**
 * ==============================================================================
 * HOTEL IT INVENTORY MANAGEMENT - ZERO-BUNDLER VANILLA JAVASCRIPT CORE
 * BaaS Engine: Supabase (Auth & Database with RLS disabled)
 * Export Engine: SheetJS (xlsx.full.min.js) 100% Client-Side Generation
 * ==============================================================================
 */

// 1. CONSTANTS & SYSTEM CONFIGURATION
const DEPARTMENTS = [
  'Front Office',
  'House Keeping',
  'Engineering',
  'Human Resource',
  'Food & Beverage',
  'Sales & Marketing',
  'Accounting'
];

const CATEGORIES = ['PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS'];

const STORAGE_KEYS = {
  SUPABASE_URL: 'HOTEL_IT_SUPABASE_URL',
  SUPABASE_KEY: 'HOTEL_IT_SUPABASE_KEY',
  AUTH_USER: 'HOTEL_IT_AUTH_USER',
  DEMO_DATA: 'HOTEL_IT_DATA_CACHE'
};

// Default fallback Supabase credentials
const DEFAULT_SUPABASE_URL = 'https://your-project-ref.supabase.co';
const DEFAULT_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here';

// Application State
let supabaseClient = null;
let currentUser = null;
let isLiveSupabase = false;

let state = {
  masterItems: [],
  stockTransactions: [],
  departmentMovements: [],
  purchaseOrders: [],
  preloved: [],
  activities: []
};

// UI Filters
let activeView = 'dashboard';
let activeDept = 'Front Office';
let invCategoryFilter = 'ALL';
let deptCategoryFilter = 'ALL';
let prelovedCategoryFilter = 'ALL';
let poStatusFilter = 'ALL';
let currentMonthlyTab = 'inbound';
let pendingPhotoDataUrl = null;

// ==============================================================================
// 2. INITIAL SEED / OFFLINE FALLBACK DATA
// ==============================================================================
function getInitialSeedData() {
  const dAgo = (days) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };

  return {
    masterItems: [
      {
        id: 'item-001',
        item_code: 'PC-001',
        item_name: 'Dell OptiPlex 7090 Desktop Intel Core i7',
        category: 'PC ITEMS',
        remark: 'Front Office & Admin Standard Workstation (16GB RAM, 512GB SSD)',
        photo_url: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400&auto=format&fit=crop&q=80',
        is_active: true,
        created_at: dAgo(15),
        created_by: 'admin@hotel.com',
        updated_at: dAgo(15)
      },
      {
        id: 'item-002',
        item_code: 'PC-002',
        item_name: 'Lenovo ThinkPad E14 Gen 4 Core i5',
        category: 'PC ITEMS',
        remark: 'Management & Duty Manager Laptop',
        photo_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&auto=format&fit=crop&q=80',
        is_active: true,
        created_at: dAgo(12),
        created_by: 'admin@hotel.com',
        updated_at: dAgo(12)
      },
      {
        id: 'item-003',
        item_code: 'NET-001',
        item_name: 'Cisco Catalyst 2960-X 48-Port PoE Switch',
        category: 'NETWORK ITEMS',
        remark: 'Floor Distribution & AP Core Switch',
        photo_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&auto=format&fit=crop&q=80',
        is_active: true,
        created_at: dAgo(18),
        created_by: 'admin@hotel.com',
        updated_at: dAgo(18)
      },
      {
        id: 'item-004',
        item_code: 'NET-002',
        item_name: 'Ubiquiti UniFi U6-Pro WiFi 6 Access Point',
        category: 'NETWORK ITEMS',
        remark: 'Guest Corridor & Ballroom High Density AP',
        photo_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&auto=format&fit=crop&q=80',
        is_active: true,
        created_at: dAgo(10),
        created_by: 'admin@hotel.com',
        updated_at: dAgo(10)
      },
      {
        id: 'item-005',
        item_code: 'CCTV-001',
        item_name: 'Hikvision 4MP IP Dome Camera DS-2CD2143G2-I',
        category: 'CCTV & TV ITEMS',
        remark: 'Lobby & Corridor Night Vision Surveillance',
        photo_url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&auto=format&fit=crop&q=80',
        is_active: true,
        created_at: dAgo(14),
        created_by: 'admin@hotel.com',
        updated_at: dAgo(14)
      },
      {
        id: 'item-006',
        item_code: 'CCTV-002',
        item_name: 'Samsung 50" Crystal 4K UHD Smart Hospitality TV',
        category: 'CCTV & TV ITEMS',
        remark: 'Guest Room & Executive Lounge Display',
        photo_url: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&auto=format&fit=crop&q=80',
        is_active: true,
        created_at: dAgo(20),
        created_by: 'admin@hotel.com',
        updated_at: dAgo(20)
      }
    ],
    stockTransactions: [
      { id: 'tx-001', item_id: 'item-001', transaction_date: dAgo(15), quantity: 15, remark: 'Batch pengadaan PC Q4', created_by: 'admin@hotel.com', created_at: dAgo(15) },
      { id: 'tx-002', item_id: 'item-002', transaction_date: dAgo(12), quantity: 10, remark: 'Pengadaan Laptop Staff', created_by: 'admin@hotel.com', created_at: dAgo(12) },
      { id: 'tx-003', item_id: 'item-003', transaction_date: dAgo(18), quantity: 6, remark: 'Cadangan Switch Server Room', created_by: 'admin@hotel.com', created_at: dAgo(18) },
      { id: 'tx-004', item_id: 'item-004', transaction_date: dAgo(10), quantity: 20, remark: 'Ekspansi WiFi Lantai 3-5', created_by: 'admin@hotel.com', created_at: dAgo(10) },
      { id: 'tx-005', item_id: 'item-005', transaction_date: dAgo(14), quantity: 25, remark: 'Replacement CCTV Unit', created_by: 'admin@hotel.com', created_at: dAgo(14) },
      { id: 'tx-006', item_id: 'item-006', transaction_date: dAgo(20), quantity: 12, remark: 'Stok Spare TV Kamar Deluxe', created_by: 'admin@hotel.com', created_at: dAgo(20) }
    ],
    departmentMovements: [
      { id: 'mov-001', item_id: 'item-001', department: 'Front Office', type: 'TRANSFER_TO_DEPARTMENT', quantity: 4, date: dAgo(8), recipient_name: 'Budi Santoso (FOM)', remark: 'Unit PC untuk Receptionist Counter 1-4', created_by: 'admin@hotel.com', created_at: dAgo(8) },
      { id: 'mov-002', item_id: 'item-001', department: 'Accounting', type: 'TRANSFER_TO_DEPARTMENT', quantity: 3, date: dAgo(7), recipient_name: 'Siti Rahma (Chief Acct)', remark: 'Unit PC Finance & Night Auditor', created_by: 'admin@hotel.com', created_at: dAgo(7) },
      { id: 'mov-003', item_id: 'item-002', department: 'Sales & Marketing', type: 'TRANSFER_TO_DEPARTMENT', quantity: 2, date: dAgo(5), recipient_name: 'Rian Pratama (DOSM)', remark: 'Laptop untuk Sales Executive Client Visit', created_by: 'admin@hotel.com', created_at: dAgo(5) },
      { id: 'mov-004', item_id: 'item-004', department: 'Engineering', type: 'TRANSFER_TO_DEPARTMENT', quantity: 5, date: dAgo(4), recipient_name: 'Agus Setiawan (Chief Eng)', remark: 'Pemasangan AP Area Pre-function', created_by: 'admin@hotel.com', created_at: dAgo(4) },
      { id: 'mov-005', item_id: 'item-005', department: 'House Keeping', type: 'TRANSFER_TO_DEPARTMENT', quantity: 2, date: dAgo(3), recipient_name: 'Lina Marlina (HK Mgr)', remark: 'CCTV Koridor Linen Room', created_by: 'admin@hotel.com', created_at: dAgo(3) },
      { id: 'mov-006', item_id: 'item-001', department: 'Front Office', type: 'RETURN_TO_INVENTORY', quantity: 1, date: dAgo(1), recipient_name: 'Budi Santoso (FOM)', remark: 'Kembali ke IT untuk maintenance berkala', created_by: 'admin@hotel.com', created_at: dAgo(1) }
    ],
    purchaseOrders: [
      { id: 'po-001', po_number: 'PO-2026-10-001', item_name: 'Logitech MK270 Wireless Keyboard & Mouse Combo', category: 'PC ITEMS', photo_url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&auto=format&fit=crop&q=80', date_order: dAgo(14), date_arrival: dAgo(2), quantity: 20, for_use: 'Stock Keyboard Replacement All Depts', remarks: 'Vendor Surya Komputer Jakarta', vendor: 'Surya Komputer', status: 'SUDAH DATANG', created_by: 'admin@hotel.com', updated_by: 'admin@hotel.com', created_at: dAgo(14) },
      { id: 'po-002', po_number: 'PO-2026-10-002', item_name: 'Cat6 UTP Cable Belden 305m Roll', category: 'NETWORK ITEMS', photo_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&auto=format&fit=crop&q=80', date_order: dAgo(5), date_arrival: null, quantity: 3, for_use: 'Peremajaan Kabel LAN Gedung Annex', remarks: 'Menunggu pengiriman dari distributor', vendor: 'Kabelindo Jaya Mandiri', status: 'BELUM DATANG', created_by: 'admin@hotel.com', updated_by: 'admin@hotel.com', created_at: dAgo(5) },
      { id: 'po-003', po_number: 'PO-2026-10-003', item_name: 'Hikvision 16-Channel NVR 4K DS-7616NI-Q2', category: 'CCTV & TV ITEMS', photo_url: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400&auto=format&fit=crop&q=80', date_order: dAgo(3), date_arrival: null, quantity: 1, for_use: 'Upgrade Server CCTV Ruang Security', remarks: 'Estimasi tiba akhir bulan', vendor: 'Security CCTV Specialist', status: 'BELUM DATANG', created_by: 'admin@hotel.com', updated_by: 'admin@hotel.com', created_at: dAgo(3) }
    ],
    preloved: [
      { id: 'pre-001', item_code: 'PRE-PC-01', item_name: 'HP ProDesk 400 G4 Desktop (Refurbished)', category: 'PC ITEMS', date_repaired: dAgo(12), quantity: 2, serial_number: 'SN-HP-99201A', remark: 'Ex Front Office counter. RAM upgraded to 16GB, SSD 256GB baru', photo_url: 'https://images.unsplash.com/photo-1587831990711-23ca6441447b?w=400&auto=format&fit=crop&q=80', created_by: 'admin@hotel.com', updated_by: 'admin@hotel.com', created_at: dAgo(12) },
      { id: 'pre-002', item_code: 'PRE-NET-01', item_name: 'MikroTik Cloud Router RB1100AHx4', category: 'NETWORK ITEMS', date_repaired: dAgo(8), quantity: 1, serial_number: 'SN-MT-48218C', remark: 'Ex Core Backup. Sudah di-reset default RouterOS v7.14', photo_url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=400&auto=format&fit=crop&q=80', created_by: 'admin@hotel.com', updated_by: 'admin@hotel.com', created_at: dAgo(8) },
      { id: 'pre-003', item_code: 'PRE-CCTV-01', item_name: 'LG 43" Commercial TV 43UN7100 (Ex Guest Room)', category: 'CCTV & TV ITEMS', date_repaired: dAgo(4), quantity: 3, serial_number: 'SN-LG-88319X', remark: 'Ex Kamar 401-403, kondisi layar mulus 95%, lengkap remote & bracket', photo_url: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&auto=format&fit=crop&q=80', created_by: 'admin@hotel.com', updated_by: 'admin@hotel.com', created_at: dAgo(4) }
    ],
    activities: [
      { id: 'act-001', item_name: 'Dell OptiPlex 7090 Desktop', category: 'PC ITEMS', action: 'Added', username: 'admin@hotel.com', timestamp: dAgo(15), type: 'INVENTORY' },
      { id: 'act-002', item_name: 'Front Office Handover (4 Units)', category: 'PC ITEMS', action: 'Transfer', username: 'admin@hotel.com', timestamp: dAgo(8), type: 'DEPARTMENT' },
      { id: 'act-003', item_name: 'Logitech MK270 Wireless Combo', category: 'PC ITEMS', action: 'Received', username: 'admin@hotel.com', timestamp: dAgo(2), type: 'PURCHASE ORDER' },
      { id: 'act-004', item_name: 'Front Office Return (1 Unit)', category: 'PC ITEMS', action: 'Return', username: 'admin@hotel.com', timestamp: dAgo(1), type: 'DEPARTMENT' }
    ]
  };
}

// ==============================================================================
// 3. STORAGE & SUPABASE INITIALIZATION
// ==============================================================================
function initSupabaseClient() {
  const url = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const key = localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || DEFAULT_SUPABASE_KEY;

  const isValidUrl = url && url.startsWith('http') && !url.includes('your-project-ref');

  if (window.supabase && isValidUrl) {
    try {
      supabaseClient = window.supabase.createClient(url, key);
      isLiveSupabase = true;
      updateConnectionBadge(true);
      return;
    } catch (e) {
      console.warn('Supabase client init warning:', e);
    }
  }

  isLiveSupabase = false;
  updateConnectionBadge(false);
}

function updateConnectionBadge(isLive) {
  const headerText = document.getElementById('header-conn-text');
  const headerStatus = document.getElementById('header-conn-status');
  const settingsBadge = document.getElementById('settings-status-badge');
  const configLabel = document.getElementById('config-status-label');

  if (isLive) {
    if (headerText) headerText.textContent = 'Supabase Live';
    if (headerStatus) {
      headerStatus.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-medium text-emerald-300';
    }
    if (settingsBadge) {
      settingsBadge.textContent = 'Connected (Live BaaS)';
      settingsBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    }
    if (configLabel) {
      configLabel.textContent = 'Ready for Live Supabase';
      configLabel.className = 'text-[11px] text-emerald-400 font-medium';
    }
  } else {
    if (headerText) headerText.textContent = 'Demo Mode (Offline)';
    if (headerStatus) {
      headerStatus.className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/60 border border-amber-500/40 text-[11px] font-medium text-amber-300';
    }
    if (settingsBadge) {
      settingsBadge.textContent = 'Demo Cache Active';
      settingsBadge.className = 'px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30';
    }
    if (configLabel) {
      configLabel.textContent = 'Demo mode active. Connect URL for live sync.';
      configLabel.className = 'text-[11px] text-slate-400';
    }
  }
}

// ==============================================================================
// 4. DATA ENGINE & SUPABASE SYNC
// ==============================================================================
async function loadApplicationData() {
  if (isLiveSupabase && supabaseClient) {
    try {
      const [
        itemsRes,
        txsRes,
        movementsRes,
        poRes,
        prelovedRes,
        activitiesRes
      ] = await Promise.all([
        supabaseClient.from('master_items').select('*').order('created_at', { ascending: false }),
        supabaseClient.from('stock_transactions').select('*').order('transaction_date', { ascending: false }),
        supabaseClient.from('department_movements').select('*').order('date', { ascending: false }),
        supabaseClient.from('purchase_orders').select('*').order('date_order', { ascending: false }),
        supabaseClient.from('preloved').select('*').order('date_repaired', { ascending: false }),
        supabaseClient.from('activities').select('*').order('timestamp', { ascending: false }).limit(20)
      ]);

      if (!itemsRes.error && itemsRes.data) {
        state.masterItems = itemsRes.data;
        state.stockTransactions = txsRes.data || [];
        state.departmentMovements = movementsRes.data || [];
        state.purchaseOrders = poRes.data || [];
        state.preloved = prelovedRes.data || [];
        state.activities = activitiesRes.data || [];

        localStorage.setItem(STORAGE_KEYS.DEMO_DATA, JSON.stringify(state));
        refreshAllViews();
        return;
      }
    } catch (err) {
      console.warn('Live fetch error, falling back to local cache:', err);
    }
  }

  const cached = localStorage.getItem(STORAGE_KEYS.DEMO_DATA);
  if (cached) {
    try {
      state = JSON.parse(cached);
    } catch (e) {
      state = getInitialSeedData();
      localStorage.setItem(STORAGE_KEYS.DEMO_DATA, JSON.stringify(state));
    }
  } else {
    state = getInitialSeedData();
    localStorage.setItem(STORAGE_KEYS.DEMO_DATA, JSON.stringify(state));
  }

  refreshAllViews();
}

function persistState() {
  localStorage.setItem(STORAGE_KEYS.DEMO_DATA, JSON.stringify(state));
  refreshAllViews();
}

function logActivity(itemName, category, action, type = 'INVENTORY') {
  const username = currentUser ? currentUser.email : 'admin@hotel.com';
  const newAct = {
    id: `act-${Date.now()}`,
    item_name: itemName,
    category: category || 'GENERAL',
    action: action,
    username: username,
    timestamp: new Date().toISOString(),
    type: type
  };

  state.activities.unshift(newAct);
  if (state.activities.length > 30) state.activities.pop();

  if (isLiveSupabase && supabaseClient) {
    supabaseClient.from('activities').insert(newAct).then(() => {});
  }
}

// ==============================================================================
// 5. INVARIANT STOCK ENGINE
// Available = Total Inbound - Transferred to Depts + Returned to Inventory
// Dept Held = Received - Returned
// ==============================================================================
function calculateStockMetrics(itemId) {
  const inbounds = state.stockTransactions.filter(t => t.item_id === itemId);
  const totalInbound = inbounds.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);

  const transfers = state.departmentMovements.filter(m => m.item_id === itemId && m.type === 'TRANSFER_TO_DEPARTMENT');
  const totalTransferred = transfers.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  const returns = state.departmentMovements.filter(m => m.item_id === itemId && m.type === 'RETURN_TO_INVENTORY');
  const totalReturned = returns.reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  const availableStock = Math.max(0, totalInbound - totalTransferred + totalReturned);
  const totalHeldByDepts = Math.max(0, totalTransferred - totalReturned);

  return {
    totalInbound,
    totalTransferred,
    totalReturned,
    availableStock,
    totalHeldByDepts
  };
}

function calculateDeptItemStock(deptName, itemId) {
  const received = state.departmentMovements
    .filter(m => m.department === deptName && m.item_id === itemId && m.type === 'TRANSFER_TO_DEPARTMENT')
    .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  const returned = state.departmentMovements
    .filter(m => m.department === deptName && m.item_id === itemId && m.type === 'RETURN_TO_INVENTORY')
    .reduce((sum, m) => sum + (Number(m.quantity) || 0), 0);

  const held = Math.max(0, received - returned);

  return { received, returned, held };
}

function getDeptTotalMetrics(deptName) {
  let totalUnits = 0;
  let totalUniqueItems = 0;

  state.masterItems.forEach(item => {
    const { held } = calculateDeptItemStock(deptName, item.id);
    if (held > 0) {
      totalUnits += held;
      totalUniqueItems += 1;
    }
  });

  return { totalUnits, totalUniqueItems };
}

// ==============================================================================
// 6. GREETING & MOBILE NAVIGATION HELPERS
// ==============================================================================
function getGreetingPrefix(email) {
  if (!email) return 'Admin';
  const raw = email.split('@')[0] || 'Admin';
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function updateHeroGreeting() {
  const heroTitle = document.getElementById('hero-greeting-title');
  if (heroTitle) {
    const name = getGreetingPrefix(currentUser?.email);
    heroTitle.textContent = `Welcome ${name}! What are we diving into today?😉`;
  }
}

function toggleMobileSidebar(forceState) {
  const sidebar = document.getElementById('app-sidebar');
  const overlay = document.getElementById('mobile-sidebar-overlay');
  if (!sidebar) return;

  const isCurrentlyOpen = sidebar.classList.contains('translate-x-0');
  const shouldOpen = typeof forceState === 'boolean' ? forceState : !isCurrentlyOpen;

  if (shouldOpen) {
    sidebar.classList.remove('-translate-x-full');
    sidebar.classList.add('translate-x-0');
    if (overlay) overlay.classList.remove('hidden');
    document.body.classList.add('overflow-hidden', 'md:overflow-auto');
  } else {
    sidebar.classList.add('-translate-x-full');
    sidebar.classList.remove('translate-x-0');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('overflow-hidden', 'md:overflow-auto');
  }
}

// ==============================================================================
// 7. VIEW ROUTING & SPA TAB MANAGEMENT
// ==============================================================================
function navigateTo(viewId) {
  activeView = viewId;
  toggleMobileSidebar(false);

  document.querySelectorAll('.app-view').forEach(el => {
    el.classList.add('hidden');
  });

  const target = document.getElementById(`view-${viewId}`);
  if (target) {
    target.classList.remove('hidden');
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('bg-slate-800', 'text-white', 'border-l-4', 'border-brand-500');
    btn.classList.add('text-slate-300');
  });

  const activeBtn = document.getElementById(`nav-${viewId}`);
  if (activeBtn) {
    activeBtn.classList.add('bg-slate-800', 'text-white', 'border-l-4', 'border-brand-500');
    activeBtn.classList.remove('text-slate-300');
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (viewId === 'dashboard') renderDashboard();
  if (viewId === 'inventory') renderInventoryTable();
  if (viewId === 'departmental') renderDepartmentalView();
  if (viewId === 'motion') renderMotionTable();
  if (viewId === 'purchase-orders') renderPOTable();
  if (viewId === 'preloved') renderPrelovedTable();
  if (viewId === 'monthly') renderMonthlyView();
}

function refreshAllViews() {
  updateHeaderCounters();
  renderDashboard();
  renderInventoryTable();
  renderDepartmentalView();
  renderMotionTable();
  renderPOTable();
  renderPrelovedTable();
  renderMonthlyView();
}

function updateHeaderCounters() {
  let totalInventoryStock = 0;
  let totalDeptStock = 0;

  state.masterItems.forEach(item => {
    const metrics = calculateStockMetrics(item.id);
    totalInventoryStock += metrics.availableStock;
    totalDeptStock += metrics.totalHeldByDepts;
  });

  const headerStock = document.getElementById('header-stock-counter');
  const headerDept = document.getElementById('header-dept-counter');

  if (headerStock) headerStock.textContent = totalInventoryStock;
  if (headerDept) headerDept.textContent = totalDeptStock;
}

// ==============================================================================
// 7. DASHBOARD RENDERING
// ==============================================================================
function renderDashboard() {
  updateHeroGreeting();
  let totalInventoryStock = 0;
  let totalDeptStock = 0;

  state.masterItems.forEach(item => {
    const metrics = calculateStockMetrics(item.id);
    totalInventoryStock += metrics.availableStock;
    totalDeptStock += metrics.totalHeldByDepts;
  });

  const statAvailable = document.getElementById('stat-available-stock');
  const statDept = document.getElementById('stat-dept-stock');
  const statMaster = document.getElementById('stat-master-items');
  const statPO = document.getElementById('stat-po-count');
  const statPOPending = document.getElementById('stat-po-pending');
  const statPreloved = document.getElementById('stat-preloved-count');
  const statMovements = document.getElementById('stat-movements-count');

  if (statAvailable) statAvailable.textContent = totalInventoryStock;
  if (statDept) statDept.textContent = totalDeptStock;
  if (statMaster) statMaster.textContent = state.masterItems.length;

  const pendingPOs = state.purchaseOrders.filter(p => p.status === 'BELUM DATANG').length;
  if (statPO) statPO.textContent = state.purchaseOrders.length;
  if (statPOPending) statPOPending.textContent = `${pendingPOs} Pending Delivery`;

  if (statPreloved) statPreloved.textContent = state.preloved.length;
  if (statMovements) statMovements.textContent = state.departmentMovements.length;

  // 7 Departments Quick Glance Grid
  const deptsGrid = document.getElementById('dashboard-depts-grid');
  if (deptsGrid) {
    deptsGrid.innerHTML = DEPARTMENTS.map(dept => {
      const { totalUnits, totalUniqueItems } = getDeptTotalMetrics(dept);
      return `
        <div
          onclick="selectDepartmentAndNavigate('${dept}')"
          class="p-4 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-brand-500/50 cursor-pointer transition group"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-slate-300 group-hover:text-white transition">${dept}</span>
            <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-600 group-hover:text-brand-400 transition"></i>
          </div>
          <div class="mt-2 flex items-baseline gap-2">
            <span class="text-xl font-bold font-mono text-amber-400">${totalUnits}</span>
            <span class="text-[10px] text-slate-500">units held</span>
          </div>
          <div class="text-[10px] text-slate-400 mt-1">${totalUniqueItems} distinct items</div>
        </div>
      `;
    }).join('');
  }

  // Category Breakdown
  const catContainer = document.getElementById('dashboard-categories-container');
  if (catContainer) {
    const pcCount = state.masterItems.filter(i => i.category === 'PC ITEMS').length;
    const netCount = state.masterItems.filter(i => i.category === 'NETWORK ITEMS').length;
    const cctvCount = state.masterItems.filter(i => i.category === 'CCTV & TV ITEMS').length;
    const total = state.masterItems.length || 1;

    catContainer.innerHTML = `
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-slate-300 font-medium">PC ITEMS</span>
          <span class="text-slate-400 font-mono font-bold">${pcCount} (${Math.round((pcCount / total) * 100)}%)</span>
        </div>
        <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div class="h-full bg-cyan-400 rounded-full" style="width: ${(pcCount / total) * 100}%"></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-slate-300 font-medium">NETWORK ITEMS</span>
          <span class="text-slate-400 font-mono font-bold">${netCount} (${Math.round((netCount / total) * 100)}%)</span>
        </div>
        <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div class="h-full bg-indigo-500 rounded-full" style="width: ${(netCount / total) * 100}%"></div>
        </div>
      </div>
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="text-slate-300 font-medium">CCTV & TV ITEMS</span>
          <span class="text-slate-400 font-mono font-bold">${cctvCount} (${Math.round((cctvCount / total) * 100)}%)</span>
        </div>
        <div class="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
          <div class="h-full bg-amber-400 rounded-full" style="width: ${(cctvCount / total) * 100}%"></div>
        </div>
      </div>
    `;
  }

  // Recent Activities
  const actList = document.getElementById('dashboard-activities-list');
  if (actList) {
    const recent = state.activities.slice(0, 5);
    if (recent.length === 0) {
      actList.innerHTML = `<div class="text-xs text-slate-500 text-center py-4">No recent activities recorded.</div>`;
    } else {
      actList.innerHTML = recent.map(a => {
        let icon = 'fa-boxes-stacked';
        let color = 'text-brand-400';
        if (a.action === 'Transfer') { icon = 'fa-share-from-square'; color = 'text-amber-400'; }
        if (a.action === 'Return') { icon = 'fa-arrow-rotate-left'; color = 'text-emerald-400'; }
        if (a.action === 'Received') { icon = 'fa-file-invoice'; color = 'text-blue-400'; }

        const dateStr = a.timestamp ? new Date(a.timestamp).toLocaleDateString('en-GB') : '';

        return `
          <div class="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-lg bg-slate-800 ${color} flex items-center justify-center">
                <i class="fa-solid ${icon}"></i>
              </div>
              <div>
                <div class="font-semibold text-white">${escapeHtml(a.item_name)}</div>
                <div class="text-[11px] text-slate-400">${a.action} by ${escapeHtml(a.username || 'System')}</div>
              </div>
            </div>
            <span class="text-[10px] font-mono text-slate-500">${dateStr}</span>
          </div>
        `;
      }).join('');
    }
  }
}

function selectDepartmentAndNavigate(deptName) {
  activeDept = deptName;
  navigateTo('departmental');
}

// ==============================================================================
// 8. INVENTORY VIEW RENDERING
// ==============================================================================
function setInvCategoryFilter(cat) {
  invCategoryFilter = cat;
  document.querySelectorAll('.inv-cat-pill').forEach(btn => {
    if (btn.dataset.cat === cat) {
      btn.className = 'inv-cat-pill px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white';
    } else {
      btn.className = 'inv-cat-pill px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white';
    }
  });
  renderInventoryTable();
}

function renderInventoryTable() {
  const tbody = document.getElementById('inventory-table-body');
  const emptyState = document.getElementById('inv-empty-state');
  const search = (document.getElementById('inv-search')?.value || '').toLowerCase();

  if (!tbody) return;

  const filtered = state.masterItems.filter(item => {
    const matchCat = invCategoryFilter === 'ALL' || item.category === invCategoryFilter;
    const matchSearch =
      item.item_name.toLowerCase().includes(search) ||
      (item.item_code && item.item_code.toLowerCase().includes(search)) ||
      (item.remark && item.remark.toLowerCase().includes(search));
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');

  tbody.innerHTML = filtered.map(item => {
    const { totalInbound, totalTransferred, totalReturned, availableStock } = calculateStockMetrics(item.id);

    const statusBadge = availableStock === 0
      ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">Out of Stock</span>`
      : availableStock <= 2
      ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">Low Stock (${availableStock})</span>`
      : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">In Stock</span>`;

    const photoImg = item.photo_url
      ? `<img src="${item.photo_url}" onclick="openLightbox('${item.photo_url}', '${escapeHtml(item.item_name)}')" class="w-10 h-10 rounded-lg object-cover cursor-pointer hover:scale-105 transition border border-slate-700">`
      : `<div class="w-10 h-10 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center text-sm border border-slate-700"><i class="fa-solid fa-box"></i></div>`;

    return `
      <tr class="hover:bg-slate-900/50 transition">
        <td class="py-3 px-4">
          <div class="flex items-center gap-3">
            ${photoImg}
            <div>
              <div class="font-bold text-white">${escapeHtml(item.item_name)}</div>
              <div class="text-[11px] text-slate-400 font-mono">${escapeHtml(item.item_code || 'SKU-GEN')}</div>
            </div>
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            ${item.category}
          </span>
        </td>
        <td class="py-3 px-4 text-center font-mono font-semibold text-slate-300">${totalInbound}</td>
        <td class="py-3 px-4 text-center font-mono text-amber-400">${totalTransferred}</td>
        <td class="py-3 px-4 text-center font-mono text-emerald-400">${totalReturned}</td>
        <td class="py-3 px-4 text-center font-mono text-sm font-bold text-white bg-slate-900/40">${availableStock}</td>
        <td class="py-3 px-4">${statusBadge}</td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onclick="openModalTransfer('${item.id}')"
              title="Transfer to Department"
              class="p-1.5 rounded-lg bg-brand-600/20 hover:bg-brand-600 text-brand-300 hover:text-white transition text-xs"
            >
              <i class="fa-solid fa-share-from-square"></i>
            </button>
            <button
              type="button"
              onclick="openModalInbound('${item.id}')"
              title="Add Inbound Stock"
              class="p-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 text-cyan-300 hover:text-white transition text-xs"
            >
              <i class="fa-solid fa-plus"></i>
            </button>
            <button
              type="button"
              onclick="confirmDeleteMasterItem('${item.id}', '${escapeHtml(item.item_name)}')"
              title="Delete Item"
              class="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition text-xs"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ==============================================================================
// 9. CREATE MASTER ITEM HANDLER
// ==============================================================================
function handleImageUploadPreview(event, previewId) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    pendingPhotoDataUrl = e.target.result;
    const preview = document.getElementById(previewId);
    const container = document.getElementById(`${previewId}-container`);
    if (preview) preview.src = pendingPhotoDataUrl;
    if (container) container.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function handleImageUrlPreview(url, previewId) {
  if (!url || !url.startsWith('http')) return;
  pendingPhotoDataUrl = url;
  const preview = document.getElementById(previewId);
  const container = document.getElementById(`${previewId}-container`);
  if (preview) preview.src = url;
  if (container) container.classList.remove('hidden');
}

function clearImagePreview(previewId, containerId) {
  pendingPhotoDataUrl = null;
  const preview = document.getElementById(previewId);
  const container = document.getElementById(containerId);
  if (preview) preview.src = '';
  if (container) container.classList.add('hidden');
  const fileInput = document.getElementById('create-item-file');
  if (fileInput) fileInput.value = '';
  const urlInput = document.getElementById('create-item-url');
  if (urlInput) urlInput.value = '';
}

async function handleCreateMasterItemSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('create-item-name').value.trim();
  const category = document.getElementById('create-item-category').value;
  const remark = document.getElementById('create-item-remark').value.trim();

  if (!name || !category) {
    showToast('Nama Barang dan Kategori wajib diisi!', 'error');
    return;
  }

  const prefix = category === 'PC ITEMS' ? 'PC' : category === 'NETWORK ITEMS' ? 'NET' : 'CCTV';
  const randomCode = `${prefix}-${Math.floor(100 + Math.random() * 900)}`;

  const newItem = {
    id: `item-${Date.now()}`,
    item_code: randomCode,
    item_name: name,
    category: category,
    remark: remark || null,
    photo_url: pendingPhotoDataUrl || null,
    is_active: true,
    created_at: new Date().toISOString(),
    created_by: currentUser ? currentUser.email : 'admin@hotel.com',
    updated_at: new Date().toISOString()
  };

  if (isLiveSupabase && supabaseClient) {
    const { error } = await supabaseClient.from('master_items').insert(newItem);
    if (error) {
      console.warn('Supabase insert master item error:', error);
    }
  }

  state.masterItems.unshift(newItem);
  logActivity(name, category, 'Added', 'INVENTORY');
  persistState();

  document.getElementById('form-create-master-item').reset();
  clearImagePreview('create-item-preview', 'create-item-preview-container');

  showToast(`Master Item "${name}" berhasil dibuat!`, 'success');
  navigateTo('inventory');
}

async function confirmDeleteMasterItem(itemId, itemName) {
  if (!confirm(`Hapus master barang "${itemName}"? Seluruh transaksi terkait akan ikut dihapus.`)) {
    return;
  }

  if (isLiveSupabase && supabaseClient) {
    await supabaseClient.from('master_items').delete().eq('id', itemId);
  }

  state.masterItems = state.masterItems.filter(i => i.id !== itemId);
  state.stockTransactions = state.stockTransactions.filter(t => t.item_id !== itemId);
  state.departmentMovements = state.departmentMovements.filter(m => m.item_id !== itemId);

  logActivity(itemName, 'GENERAL', 'Deleted', 'INVENTORY');
  persistState();
  showToast(`Item "${itemName}" berhasil dihapus.`, 'info');
}

// ==============================================================================
// 10. DEPARTMENTAL ASSET VIEW & INVARIANT TRANSFER/RETURN
// ==============================================================================
function renderDepartmentalView() {
  const tabsBar = document.getElementById('dept-tabs-bar');
  const tbody = document.getElementById('dept-assets-table-body');
  const emptyState = document.getElementById('dept-empty-state');
  const title = document.getElementById('dept-active-title');
  const subtitle = document.getElementById('dept-active-subtitle');

  if (title) title.textContent = activeDept;

  if (tabsBar) {
    tabsBar.innerHTML = DEPARTMENTS.map(dept => {
      const { totalUnits } = getDeptTotalMetrics(dept);
      const isActive = dept === activeDept;
      const activeClass = isActive
        ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
        : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800';

      return `
        <button
          type="button"
          onclick="switchActiveDepartment('${dept}')"
          class="px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition ${activeClass}"
        >
          <span>${dept}</span>
          <span class="px-1.5 py-0.5 rounded-md text-[10px] font-mono ${isActive ? 'bg-slate-950 text-amber-300' : 'bg-slate-800 text-slate-400'}">
            ${totalUnits}
          </span>
        </button>
      `;
    }).join('');
  }

  const deptItems = [];
  state.masterItems.forEach(item => {
    if (deptCategoryFilter !== 'ALL' && item.category !== deptCategoryFilter) {
      return;
    }

    const { received, returned, held } = calculateDeptItemStock(activeDept, item.id);
    if (held > 0 || received > 0) {
      const lastMov = state.departmentMovements
        .filter(m => m.department === activeDept && m.item_id === item.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

      deptItems.push({
        item,
        held,
        received,
        returned,
        lastRecipient: lastMov?.recipient_name || '-',
        lastDate: lastMov?.date || '-'
      });
    }
  });

  const { totalUnits, totalUniqueItems } = getDeptTotalMetrics(activeDept);
  if (subtitle) {
    subtitle.textContent = `Total ${totalUniqueItems} jenis hardware, ${totalUnits} unit aktif dipegang oleh departemen ${activeDept}.`;
  }

  if (deptItems.length === 0) {
    if (tbody) tbody.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');

  if (tbody) {
    tbody.innerHTML = deptItems.map(({ item, held, received, returned, lastRecipient, lastDate }) => {
      const photoImg = item.photo_url
        ? `<img src="${item.photo_url}" onclick="openLightbox('${item.photo_url}', '${escapeHtml(item.item_name)}')" class="w-10 h-10 rounded-lg object-cover cursor-pointer hover:scale-105 transition border border-slate-700">`
        : `<div class="w-10 h-10 rounded-lg bg-slate-800 text-slate-500 flex items-center justify-center text-sm border border-slate-700"><i class="fa-solid fa-box"></i></div>`;

      return `
        <tr class="hover:bg-slate-900/50 transition">
          <td class="py-3 px-4">
            <div class="flex items-center gap-3">
              ${photoImg}
              <div>
                <div class="font-bold text-white">${escapeHtml(item.item_name)}</div>
                <div class="text-[11px] text-slate-400 font-mono">${escapeHtml(item.item_code || 'SKU-GEN')}</div>
              </div>
            </div>
          </td>
          <td class="py-3 px-4">
            <span class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
              ${item.category}
            </span>
          </td>
          <td class="py-3 px-4 text-center font-mono font-bold text-amber-400 text-sm bg-slate-900/40">
            ${held}
          </td>
          <td class="py-3 px-4 text-center font-mono text-slate-300">${received}</td>
          <td class="py-3 px-4 text-center font-mono text-emerald-400">${returned}</td>
          <td class="py-3 px-4 text-slate-300">${escapeHtml(lastRecipient)}</td>
          <td class="py-3 px-4 font-mono text-[11px] text-slate-400">${lastDate}</td>
          <td class="py-3 px-4 text-right">
            ${held > 0 ? `
              <button
                type="button"
                onclick="openModalReturn('${activeDept}', '${item.id}')"
                class="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-slate-950 font-semibold text-xs transition"
              >
                Return to IT
              </button>
            ` : `<span class="text-slate-600 text-[11px]">All returned</span>`}
          </td>
        </tr>
      `;
    }).join('');
  }
}

function switchActiveDepartment(deptName) {
  activeDept = deptName;
  renderDepartmentalView();
}

function setDeptCatFilter(cat) {
  deptCategoryFilter = cat;
  document.querySelectorAll('.dept-cat-pill').forEach(btn => {
    if (btn.dataset.cat === cat) {
      btn.className = 'dept-cat-pill px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white';
    } else {
      btn.className = 'dept-cat-pill px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white';
    }
  });
  renderDepartmentalView();
}

// ==============================================================================
// 11. MODAL WORKFLOWS (INBOUND, TRANSFER, RETURN, PO, PRELOVED)
// ==============================================================================
function openModal(modalId) {
  document.getElementById(modalId)?.classList.remove('hidden');
}

function closeModal(modalId) {
  document.getElementById(modalId)?.classList.add('hidden');
}

// Inbound Modal
function openModalInbound(preselectedItemId = null) {
  const select = document.getElementById('inbound-item-id');
  const dateInput = document.getElementById('inbound-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  if (select) {
    select.innerHTML = state.masterItems.map(item => {
      const { availableStock } = calculateStockMetrics(item.id);
      return `<option value="${item.id}" ${item.id === preselectedItemId ? 'selected' : ''}>
        ${escapeHtml(item.item_name)} (${item.category}) - Available: ${availableStock} unit
      </option>`;
    }).join('');
  }

  openModal('modal-inbound');
}

async function handleInboundSubmit(e) {
  e.preventDefault();
  const itemId = document.getElementById('inbound-item-id').value;
  const qty = parseInt(document.getElementById('inbound-qty').value, 10);
  const date = document.getElementById('inbound-date').value;
  const remark = document.getElementById('inbound-remark').value.trim();

  if (!itemId || isNaN(qty) || qty <= 0) {
    showToast('Jumlah unit inbound tidak valid!', 'error');
    return;
  }

  const item = state.masterItems.find(i => i.id === itemId);
  if (!item) return;

  const newTx = {
    id: `tx-${Date.now()}`,
    item_id: itemId,
    transaction_date: date,
    quantity: qty,
    remark: remark || null,
    created_by: currentUser ? currentUser.email : 'admin@hotel.com',
    created_at: new Date().toISOString()
  };

  if (isLiveSupabase && supabaseClient) {
    await supabaseClient.from('stock_transactions').insert(newTx);
  }

  state.stockTransactions.unshift(newTx);
  logActivity(`${item.item_name} (+${qty} units)`, item.category, 'Added', 'INVENTORY');
  persistState();

  closeModal('modal-inbound');
  showToast(`Berhasil menambahkan stok masuk ${qty} unit untuk ${item.item_name}!`, 'success');
}

// Transfer Modal
function openModalTransfer(preselectedItemId = null) {
  const select = document.getElementById('transfer-item-id');
  const dateInput = document.getElementById('transfer-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  if (select) {
    select.innerHTML = state.masterItems.map(item => {
      const { availableStock } = calculateStockMetrics(item.id);
      return `<option value="${item.id}" ${item.id === preselectedItemId ? 'selected' : ''}>
        ${escapeHtml(item.item_name)} (${item.category}) — Stok Tersedia: ${availableStock}
      </option>`;
    }).join('');
  }

  updateTransferAvailableStock();
  openModal('modal-transfer');
}

function updateTransferAvailableStock() {
  const select = document.getElementById('transfer-item-id');
  const hint = document.getElementById('transfer-stock-hint');
  if (!select || !hint) return;

  const itemId = select.value;
  const { availableStock } = calculateStockMetrics(itemId);
  hint.textContent = `Stok Tersedia di Gudang IT: ${availableStock} unit`;

  if (availableStock <= 0) {
    hint.className = 'text-[11px] text-rose-400 mt-1 font-semibold';
  } else {
    hint.className = 'text-[11px] text-brand-400 mt-1 font-semibold';
  }
}

async function handleTransferSubmit(e) {
  e.preventDefault();
  const itemId = document.getElementById('transfer-item-id').value;
  const dept = document.getElementById('transfer-department').value;
  const qty = parseInt(document.getElementById('transfer-qty').value, 10);
  const date = document.getElementById('transfer-date').value;
  const recipient = document.getElementById('transfer-recipient').value.trim();
  const remark = document.getElementById('transfer-remark').value.trim();

  const item = state.masterItems.find(i => i.id === itemId);
  if (!item) return;

  const { availableStock } = calculateStockMetrics(itemId);

  if (qty > availableStock) {
    showToast(`Gagal transfer! Jumlah diminta (${qty}) melebihi stok tersedia (${availableStock})!`, 'error');
    return;
  }

  const newMov = {
    id: `mov-${Date.now()}`,
    item_id: itemId,
    department: dept,
    type: 'TRANSFER_TO_DEPARTMENT',
    quantity: qty,
    date: date,
    recipient_name: recipient,
    remark: remark || null,
    created_by: currentUser ? currentUser.email : 'admin@hotel.com',
    created_at: new Date().toISOString()
  };

  if (isLiveSupabase && supabaseClient) {
    await supabaseClient.from('department_movements').insert(newMov);
  }

  state.departmentMovements.unshift(newMov);
  logActivity(`${item.item_name} -> ${dept} (${qty} units)`, item.category, 'Transfer', 'DEPARTMENT');
  persistState();

  closeModal('modal-transfer');
  showToast(`Berhasil mentransfer ${qty} unit ${item.item_name} ke ${dept}!`, 'success');
}

// Return Modal
function openModalReturn(preselectedDept = null, preselectedItemId = null) {
  const deptSelect = document.getElementById('return-department');
  const dateInput = document.getElementById('return-date');
  if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

  if (deptSelect && preselectedDept) {
    deptSelect.value = preselectedDept;
  }

  updateReturnItemOptions(preselectedItemId);
  openModal('modal-return');
}

function updateReturnItemOptions(preselectedItemId = null) {
  const dept = document.getElementById('return-department').value;
  const itemSelect = document.getElementById('return-item-id');
  if (!itemSelect) return;

  const validItems = [];
  state.masterItems.forEach(item => {
    const { held } = calculateDeptItemStock(dept, item.id);
    if (held > 0) {
      validItems.push({ item, held });
    }
  });

  if (validItems.length === 0) {
    itemSelect.innerHTML = `<option value="">(Tidak ada unit hardware dipegang oleh departemen ini)</option>`;
    document.getElementById('return-stock-hint').textContent = 'Departemen ini tidak memegang unit hardware.';
    return;
  }

  itemSelect.innerHTML = validItems.map(({ item, held }) => `
    <option value="${item.id}" ${item.id === preselectedItemId ? 'selected' : ''}>
      ${escapeHtml(item.item_name)} (${item.category}) — Dipegang: ${held} unit
    </option>
  `).join('');

  updateReturnAvailableStock();
}

function updateReturnAvailableStock() {
  const dept = document.getElementById('return-department').value;
  const itemSelect = document.getElementById('return-item-id');
  const hint = document.getElementById('return-stock-hint');
  if (!itemSelect || !hint) return;

  const itemId = itemSelect.value;
  if (!itemId) {
    hint.textContent = 'Pilih barang terlebih dahulu';
    return;
  }

  const { held } = calculateDeptItemStock(dept, itemId);
  hint.textContent = `Unit aktif dipegang oleh ${dept}: ${held} unit`;
}

async function handleReturnSubmit(e) {
  e.preventDefault();
  const dept = document.getElementById('return-department').value;
  const itemId = document.getElementById('return-item-id').value;
  const qty = parseInt(document.getElementById('return-qty').value, 10);
  const date = document.getElementById('return-date').value;
  const remark = document.getElementById('return-remark').value.trim();

  if (!itemId) {
    showToast('Pilih barang yang ingin dikembalikan!', 'error');
    return;
  }

  const item = state.masterItems.find(i => i.id === itemId);
  if (!item) return;

  const { held } = calculateDeptItemStock(dept, itemId);

  if (qty > held) {
    showToast(`Gagal! Jumlah dikembalikan (${qty}) melebihi unit yang dipegang departemen (${held})!`, 'error');
    return;
  }

  const newMov = {
    id: `mov-${Date.now()}`,
    item_id: itemId,
    department: dept,
    type: 'RETURN_TO_INVENTORY',
    quantity: qty,
    date: date,
    recipient_name: `Returned to IT`,
    remark: remark || null,
    created_by: currentUser ? currentUser.email : 'admin@hotel.com',
    created_at: new Date().toISOString()
  };

  if (isLiveSupabase && supabaseClient) {
    await supabaseClient.from('department_movements').insert(newMov);
  }

  state.departmentMovements.unshift(newMov);
  logActivity(`${dept} -> IT Return (${qty} units: ${item.item_name})`, item.category, 'Return', 'DEPARTMENT');
  persistState();

  closeModal('modal-return');
  showToast(`Berhasil mengembalikan ${qty} unit ${item.item_name} ke stok IT!`, 'success');
}

// PO Modal
function openModalPO(editId = null) {
  const form = document.getElementById('form-po');
  form.reset();
  document.getElementById('po-edit-id').value = '';
  document.getElementById('po-modal-title').textContent = 'New Purchase Order';
  document.getElementById('po-date-order').value = new Date().toISOString().split('T')[0];

  if (editId) {
    const po = state.purchaseOrders.find(p => p.id === editId);
    if (po) {
      document.getElementById('po-edit-id').value = po.id;
      document.getElementById('po-modal-title').textContent = 'Edit Purchase Order';
      document.getElementById('po-item-name').value = po.item_name;
      document.getElementById('po-category').value = po.category;
      document.getElementById('po-qty').value = po.quantity;
      document.getElementById('po-date-order').value = po.date_order;
      document.getElementById('po-status').value = po.status;
      document.getElementById('po-for-use').value = po.for_use;
      document.getElementById('po-vendor').value = po.vendor || '';
      document.getElementById('po-remarks').value = po.remarks || '';
    }
  }

  openModal('modal-po');
}

async function handlePOSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('po-edit-id').value;
  const itemName = document.getElementById('po-item-name').value.trim();
  const category = document.getElementById('po-category').value;
  const qty = parseInt(document.getElementById('po-qty').value, 10);
  const dateOrder = document.getElementById('po-date-order').value;
  const status = document.getElementById('po-status').value;
  const forUse = document.getElementById('po-for-use').value.trim();
  const vendor = document.getElementById('po-vendor').value.trim();
  const remarks = document.getElementById('po-remarks').value.trim();

  if (editId) {
    const existing = state.purchaseOrders.find(p => p.id === editId);
    if (existing) {
      existing.item_name = itemName;
      existing.category = category;
      existing.quantity = qty;
      existing.date_order = dateOrder;
      existing.status = status;
      existing.for_use = forUse;
      existing.vendor = vendor || null;
      existing.remarks = remarks || null;
      existing.updated_at = new Date().toISOString();

      if (status === 'SUDAH DATANG' && !existing.date_arrival) {
        existing.date_arrival = new Date().toISOString().split('T')[0];
      }

      if (isLiveSupabase && supabaseClient) {
        await supabaseClient.from('purchase_orders').update(existing).eq('id', editId);
      }
      showToast('Purchase Order berhasil diperbarui!', 'success');
    }
  } else {
    const newPO = {
      id: `po-${Date.now()}`,
      po_number: `PO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      item_name: itemName,
      category: category,
      photo_url: null,
      date_order: dateOrder,
      date_arrival: status === 'SUDAH DATANG' ? dateOrder : null,
      quantity: qty,
      for_use: forUse,
      vendor: vendor || null,
      remarks: remarks || null,
      status: status,
      created_by: currentUser ? currentUser.email : 'admin@hotel.com',
      updated_by: currentUser ? currentUser.email : 'admin@hotel.com',
      created_at: new Date().toISOString()
    };

    if (isLiveSupabase && supabaseClient) {
      await supabaseClient.from('purchase_orders').insert(newPO);
    }
    state.purchaseOrders.unshift(newPO);
    logActivity(`PO: ${itemName} (${qty} units)`, category, 'Added', 'PURCHASE ORDER');
    showToast('Purchase Order baru berhasil disimpan!', 'success');
  }

  persistState();
  closeModal('modal-po');
}

// Preloved Modal
function openModalPreloved(editId = null) {
  const form = document.getElementById('form-preloved');
  form.reset();
  document.getElementById('preloved-edit-id').value = '';
  document.getElementById('preloved-modal-title').textContent = 'Add Preloved Hardware';
  document.getElementById('preloved-date').value = new Date().toISOString().split('T')[0];

  if (editId) {
    const pre = state.preloved.find(p => p.id === editId);
    if (pre) {
      document.getElementById('preloved-edit-id').value = pre.id;
      document.getElementById('preloved-modal-title').textContent = 'Edit Preloved Hardware';
      document.getElementById('preloved-item-name').value = pre.item_name;
      document.getElementById('preloved-category').value = pre.category;
      document.getElementById('preloved-qty').value = pre.quantity;
      document.getElementById('preloved-date').value = pre.date_repaired;
      document.getElementById('preloved-serial').value = pre.serial_number || '';
      document.getElementById('preloved-remark').value = pre.remark || '';
    }
  }

  openModal('modal-preloved');
}

async function handlePrelovedSubmit(e) {
  e.preventDefault();
  const editId = document.getElementById('preloved-edit-id').value;
  const itemName = document.getElementById('preloved-item-name').value.trim();
  const category = document.getElementById('preloved-category').value;
  const qty = parseInt(document.getElementById('preloved-qty').value, 10);
  const dateRepaired = document.getElementById('preloved-date').value;
  const serial = document.getElementById('preloved-serial').value.trim();
  const remark = document.getElementById('preloved-remark').value.trim();

  if (editId) {
    const existing = state.preloved.find(p => p.id === editId);
    if (existing) {
      existing.item_name = itemName;
      existing.category = category;
      existing.quantity = qty;
      existing.date_repaired = dateRepaired;
      existing.serial_number = serial || null;
      existing.remark = remark || null;
      existing.updated_at = new Date().toISOString();

      if (isLiveSupabase && supabaseClient) {
        await supabaseClient.from('preloved').update(existing).eq('id', editId);
      }
      showToast('Preloved item berhasil diperbarui!', 'success');
    }
  } else {
    const newPre = {
      id: `pre-${Date.now()}`,
      item_code: `PRE-${Math.floor(100 + Math.random() * 900)}`,
      item_name: itemName,
      category: category,
      date_repaired: dateRepaired,
      quantity: qty,
      serial_number: serial || null,
      remark: remark || null,
      photo_url: null,
      created_by: currentUser ? currentUser.email : 'admin@hotel.com',
      updated_by: currentUser ? currentUser.email : 'admin@hotel.com',
      created_at: new Date().toISOString()
    };

    if (isLiveSupabase && supabaseClient) {
      await supabaseClient.from('preloved').insert(newPre);
    }
    state.preloved.unshift(newPre);
    logActivity(`Preloved: ${itemName} (${qty} units)`, category, 'Added', 'PRELOVED');
    showToast('Barang Preloved berhasil ditambahkan!', 'success');
  }

  persistState();
  closeModal('modal-preloved');
}

// ==============================================================================
// 12. MOTION ANALYTICS TABLE
// ==============================================================================
function renderMotionTable() {
  const tbody = document.getElementById('motion-table-body');
  const emptyState = document.getElementById('motion-empty-state');
  const typeFilter = document.getElementById('motion-type-filter')?.value || 'ALL';
  const deptFilter = document.getElementById('motion-dept-filter')?.value || 'ALL';
  const search = (document.getElementById('motion-search')?.value || '').toLowerCase();

  if (!tbody) return;

  const filtered = state.departmentMovements.filter(mov => {
    const matchType = typeFilter === 'ALL' || mov.type === typeFilter;
    const matchDept = deptFilter === 'ALL' || mov.department === deptFilter;

    const item = state.masterItems.find(i => i.id === mov.item_id);
    const itemName = item ? item.item_name.toLowerCase() : '';
    const matchSearch =
      itemName.includes(search) ||
      (mov.recipient_name && mov.recipient_name.toLowerCase().includes(search)) ||
      (mov.remark && mov.remark.toLowerCase().includes(search));

    return matchType && matchDept && matchSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');

  tbody.innerHTML = filtered.map(mov => {
    const item = state.masterItems.find(i => i.id === mov.item_id);
    const itemName = item ? item.item_name : '(Item deleted)';
    const itemCat = item ? item.category : '-';

    const isTransfer = mov.type === 'TRANSFER_TO_DEPARTMENT';
    const typeBadge = isTransfer
      ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">TRANSFER TO DEPT</span>`
      : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">RETURN TO IT</span>`;

    return `
      <tr class="hover:bg-slate-900/50 transition">
        <td class="py-3 px-4 font-mono text-[11px] text-slate-400">${mov.date}</td>
        <td class="py-3 px-4 font-bold text-white">${escapeHtml(itemName)}</td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            ${itemCat}
          </span>
        </td>
        <td class="py-3 px-4 text-center">${typeBadge}</td>
        <td class="py-3 px-4 text-slate-300 font-medium">${mov.department}</td>
        <td class="py-3 px-4 text-center font-mono font-bold ${isTransfer ? 'text-amber-400' : 'text-emerald-400'}">${mov.quantity}</td>
        <td class="py-3 px-4 text-slate-300">${escapeHtml(mov.recipient_name || '-')}</td>
        <td class="py-3 px-4 text-slate-400 text-[11px]">${escapeHtml(mov.remark || '-')}</td>
      </tr>
    `;
  }).join('');
}

// ==============================================================================
// 13. PURCHASE ORDERS TABLE
// ==============================================================================
function setPOStatusFilter(status) {
  poStatusFilter = status;
  document.querySelectorAll('.po-filter-btn').forEach(btn => {
    if (btn.dataset.status === status) {
      btn.className = 'po-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white';
    } else {
      btn.className = 'po-filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white';
    }
  });
  renderPOTable();
}

function renderPOTable() {
  const tbody = document.getElementById('po-table-body');
  const emptyState = document.getElementById('po-empty-state');
  const search = (document.getElementById('po-search')?.value || '').toLowerCase();

  if (!tbody) return;

  const filtered = state.purchaseOrders.filter(po => {
    const matchStatus = poStatusFilter === 'ALL' || po.status === poStatusFilter;
    const matchSearch =
      po.item_name.toLowerCase().includes(search) ||
      (po.po_number && po.po_number.toLowerCase().includes(search)) ||
      (po.for_use && po.for_use.toLowerCase().includes(search)) ||
      (po.vendor && po.vendor.toLowerCase().includes(search));
    return matchStatus && matchSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');

  tbody.innerHTML = filtered.map(po => {
    const isArrived = po.status === 'SUDAH DATANG';
    const statusBadge = isArrived
      ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">SUDAH DATANG</span>`
      : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">BELUM DATANG</span>`;

    return `
      <tr class="hover:bg-slate-900/50 transition">
        <td class="py-3 px-4">
          <div class="font-bold text-white">${escapeHtml(po.item_name)}</div>
          <div class="text-[11px] text-slate-400 font-mono">${escapeHtml(po.po_number || 'PO-GEN')}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            ${po.category}
          </span>
        </td>
        <td class="py-3 px-4 font-mono text-[11px] text-slate-400">${po.date_order}</td>
        <td class="py-3 px-4 font-mono text-[11px] text-slate-400">${po.date_arrival || '-'}</td>
        <td class="py-3 px-4 text-center font-mono font-bold text-white">${po.quantity}</td>
        <td class="py-3 px-4 text-slate-300">${escapeHtml(po.for_use)}</td>
        <td class="py-3 px-4">${statusBadge}</td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            ${!isArrived ? `
              <button
                type="button"
                onclick="markPOArrived('${po.id}')"
                title="Mark Arrived"
                class="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white transition text-xs"
              >
                <i class="fa-solid fa-check"></i>
              </button>
            ` : ''}
            <button
              type="button"
              onclick="openModalPO('${po.id}')"
              title="Edit PO"
              class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs border border-slate-700"
            >
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button
              type="button"
              onclick="confirmDeletePO('${po.id}', '${escapeHtml(po.item_name)}')"
              title="Delete PO"
              class="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition text-xs"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function markPOArrived(poId) {
  const po = state.purchaseOrders.find(p => p.id === poId);
  if (!po) return;

  po.status = 'SUDAH DATANG';
  po.date_arrival = new Date().toISOString().split('T')[0];
  po.updated_at = new Date().toISOString();

  if (isLiveSupabase && supabaseClient) {
    await supabaseClient.from('purchase_orders').update(po).eq('id', poId);
  }

  logActivity(`PO Received: ${po.item_name}`, po.category, 'Received', 'PURCHASE ORDER');
  persistState();
  showToast(`Status PO ${po.item_name} ditandai SUDAH DATANG!`, 'success');
}

async function confirmDeletePO(poId, itemName) {
  if (!confirm(`Hapus Purchase Order "${itemName}"?`)) return;

  if (isLiveSupabase && supabaseClient) {
    await supabaseClient.from('purchase_orders').delete().eq('id', poId);
  }

  state.purchaseOrders = state.purchaseOrders.filter(p => p.id !== poId);
  persistState();
  showToast('Purchase Order berhasil dihapus.', 'info');
}

// ==============================================================================
// 14. PRELOVED ITEMS TABLE
// ==============================================================================
function setPrelovedCatFilter(cat) {
  prelovedCategoryFilter = cat;
  document.querySelectorAll('.preloved-cat-pill').forEach(btn => {
    if (btn.dataset.cat === cat) {
      btn.className = 'preloved-cat-pill px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-600 text-white';
    } else {
      btn.className = 'preloved-cat-pill px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white';
    }
  });
  renderPrelovedTable();
}

function renderPrelovedTable() {
  const tbody = document.getElementById('preloved-table-body');
  const emptyState = document.getElementById('preloved-empty-state');
  const search = (document.getElementById('preloved-search')?.value || '').toLowerCase();

  if (!tbody) return;

  const filtered = state.preloved.filter(pre => {
    const matchCat = prelovedCategoryFilter === 'ALL' || pre.category === prelovedCategoryFilter;
    const matchSearch =
      pre.item_name.toLowerCase().includes(search) ||
      (pre.serial_number && pre.serial_number.toLowerCase().includes(search)) ||
      (pre.remark && pre.remark.toLowerCase().includes(search));
    return matchCat && matchSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    emptyState?.classList.remove('hidden');
    return;
  }

  emptyState?.classList.add('hidden');

  tbody.innerHTML = filtered.map(pre => {
    return `
      <tr class="hover:bg-slate-900/50 transition">
        <td class="py-3 px-4">
          <div class="font-bold text-white">${escapeHtml(pre.item_name)}</div>
          <div class="text-[11px] text-teal-400 font-mono">${escapeHtml(pre.item_code || 'PRE-GEN')}</div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            ${pre.category}
          </span>
        </td>
        <td class="py-3 px-4 font-mono text-[11px] text-slate-400">${pre.date_repaired}</td>
        <td class="py-3 px-4 text-center font-mono font-bold text-white">${pre.quantity}</td>
        <td class="py-3 px-4 font-mono text-xs text-slate-300">${escapeHtml(pre.serial_number || '-')}</td>
        <td class="py-3 px-4 text-slate-400 text-xs">${escapeHtml(pre.remark || '-')}</td>
        <td class="py-3 px-4 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onclick="openModalPreloved('${pre.id}')"
              title="Edit Preloved"
              class="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition text-xs border border-slate-700"
            >
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button
              type="button"
              onclick="confirmDeletePreloved('${pre.id}', '${escapeHtml(pre.item_name)}')"
              title="Delete Preloved"
              class="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition text-xs"
            >
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function confirmDeletePreloved(preId, itemName) {
  if (!confirm(`Hapus Preloved hardware "${itemName}"?`)) return;

  if (isLiveSupabase && supabaseClient) {
    await supabaseClient.from('preloved').delete().eq('id', preId);
  }

  state.preloved = state.preloved.filter(p => p.id !== preId);
  persistState();
  showToast('Barang Preloved berhasil dihapus.', 'info');
}

// ==============================================================================
// 15. MONTHLY DATA & REPORTS VIEW
// ==============================================================================
function initMonthlyView() {
  const selector = document.getElementById('monthly-selector');
  if (selector && !selector.value) {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    selector.value = `${y}-${m}`;
  }
}

function handleMonthlyChange() {
  renderMonthlyView();
}

function setMonthlyTab(tabId) {
  currentMonthlyTab = tabId;
  document.querySelectorAll('.monthly-subtab').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.className = 'monthly-subtab px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 text-white';
    } else {
      btn.className = 'monthly-subtab px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-400 hover:text-white';
    }
  });
  renderMonthlyView();
}

function renderMonthlyView() {
  const container = document.getElementById('monthly-container');
  const selector = document.getElementById('monthly-selector');
  if (!container || !selector) return;

  const ym = selector.value || new Date().toISOString().substring(0, 7);

  if (currentMonthlyTab === 'inbound') {
    const txs = state.stockTransactions.filter(t => t.transaction_date && t.transaction_date.startsWith(ym));
    if (txs.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-500">Tidak ada stok masuk pada periode ${ym}.</div>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
          <tr>
            <th class="py-2.5 px-4">Tanggal</th>
            <th class="py-2.5 px-4">Nama Barang</th>
            <th class="py-2.5 px-4">Kategori</th>
            <th class="py-2.5 px-4 text-center">Unit Masuk</th>
            <th class="py-2.5 px-4">Catatan</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/80">
          ${txs.map(t => {
            const item = state.masterItems.find(i => i.id === t.item_id);
            return `
              <tr>
                <td class="py-2.5 px-4 font-mono text-slate-400">${t.transaction_date}</td>
                <td class="py-2.5 px-4 font-bold text-white">${escapeHtml(item?.item_name || '-')}</td>
                <td class="py-2.5 px-4">${item?.category || '-'}</td>
                <td class="py-2.5 px-4 text-center font-mono font-bold text-cyan-400">${t.quantity}</td>
                <td class="py-2.5 px-4 text-slate-400">${escapeHtml(t.remark || '-')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } else if (currentMonthlyTab === 'movements') {
    const movs = state.departmentMovements.filter(m => m.date && m.date.startsWith(ym));
    if (movs.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-500">Tidak ada mutasi departemen pada periode ${ym}.</div>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
          <tr>
            <th class="py-2.5 px-4">Tanggal</th>
            <th class="py-2.5 px-4">Barang</th>
            <th class="py-2.5 px-4">Departemen</th>
            <th class="py-2.5 px-4 text-center">Jenis</th>
            <th class="py-2.5 px-4 text-center">Qty</th>
            <th class="py-2.5 px-4">PIC / Penerima</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/80">
          ${movs.map(m => {
            const item = state.masterItems.find(i => i.id === m.item_id);
            const isTrans = m.type === 'TRANSFER_TO_DEPARTMENT';
            return `
              <tr>
                <td class="py-2.5 px-4 font-mono text-slate-400">${m.date}</td>
                <td class="py-2.5 px-4 font-bold text-white">${escapeHtml(item?.item_name || '-')}</td>
                <td class="py-2.5 px-4">${m.department}</td>
                <td class="py-2.5 px-4 text-center">
                  <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${isTrans ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}">
                    ${isTrans ? 'TRANSFER' : 'RETURN'}
                  </span>
                </td>
                <td class="py-2.5 px-4 text-center font-mono font-bold ${isTrans ? 'text-amber-400' : 'text-emerald-400'}">${m.quantity}</td>
                <td class="py-2.5 px-4 text-slate-300">${escapeHtml(m.recipient_name || '-')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } else if (currentMonthlyTab === 'po') {
    const pos = state.purchaseOrders.filter(p => p.date_order && p.date_order.startsWith(ym));
    if (pos.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-500">Tidak ada purchase order pada periode ${ym}.</div>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
          <tr>
            <th class="py-2.5 px-4">PO Number</th>
            <th class="py-2.5 px-4">Barang</th>
            <th class="py-2.5 px-4">Tgl Order</th>
            <th class="py-2.5 px-4 text-center">Qty</th>
            <th class="py-2.5 px-4">Status</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/80">
          ${pos.map(p => `
            <tr>
              <td class="py-2.5 px-4 font-mono text-slate-400">${p.po_number || '-'}</td>
              <td class="py-2.5 px-4 font-bold text-white">${escapeHtml(p.item_name)}</td>
              <td class="py-2.5 px-4 font-mono text-slate-400">${p.date_order}</td>
              <td class="py-2.5 px-4 text-center font-mono font-bold">${p.quantity}</td>
              <td class="py-2.5 px-4">${p.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (currentMonthlyTab === 'preloved') {
    const pres = state.preloved.filter(p => p.date_repaired && p.date_repaired.startsWith(ym));
    if (pres.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-slate-500">Tidak ada preloved hardware pada periode ${ym}.</div>`;
      return;
    }

    container.innerHTML = `
      <table class="w-full text-left text-xs">
        <thead class="bg-slate-900/90 text-slate-400 uppercase text-[11px] font-semibold border-b border-slate-800">
          <tr>
            <th class="py-2.5 px-4">Kode</th>
            <th class="py-2.5 px-4">Barang Rekondisi</th>
            <th class="py-2.5 px-4">Tgl Selesai</th>
            <th class="py-2.5 px-4 text-center">Qty</th>
            <th class="py-2.5 px-4">Remark</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-800/80">
          ${pres.map(p => `
            <tr>
              <td class="py-2.5 px-4 font-mono text-teal-400">${p.item_code || '-'}</td>
              <td class="py-2.5 px-4 font-bold text-white">${escapeHtml(p.item_name)}</td>
              <td class="py-2.5 px-4 font-mono text-slate-400">${p.date_repaired}</td>
              <td class="py-2.5 px-4 text-center font-mono font-bold">${p.quantity}</td>
              <td class="py-2.5 px-4 text-slate-400">${escapeHtml(p.remark || '-')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }
}

// ==============================================================================
// 16. INDEPENDENT CLIENT-SIDE EXCEL EXPORTS (SHEETJS ZERO-BACKEND)
// ==============================================================================
function getSheetJS() {
  if (!window.XLSX) {
    showToast('Pustaka SheetJS belum termuat. Periksa koneksi internet.', 'error');
    return null;
  }
  return window.XLSX;
}

function exportInventoryExcel() {
  const XLSX = getSheetJS();
  if (!XLSX) return;

  const data = [
    ['HOTEL IT INVENTORY MANAGEMENT - MASTER CATALOG & STOCK REPORT'],
    [`Generated: ${new Date().toLocaleString()} | User: ${currentUser ? currentUser.email : 'System'}`],
    [],
    ['No', 'Item Code', 'Item Name', 'Category', 'Total Inbound', 'Total Transferred', 'Total Returned', 'Available Stock in IT', 'Status', 'Remark']
  ];

  state.masterItems.forEach((item, index) => {
    const { totalInbound, totalTransferred, totalReturned, availableStock } = calculateStockMetrics(item.id);
    const status = availableStock === 0 ? 'OUT OF STOCK' : availableStock <= 2 ? 'LOW STOCK' : 'AVAILABLE';

    data.push([
      index + 1,
      item.item_code || '-',
      item.item_name,
      item.category,
      totalInbound,
      totalTransferred,
      totalReturned,
      availableStock,
      status,
      item.remark || '-'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 40 }, { wch: 18 }, { wch: 14 },
    { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 45 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory Stock');

  const filename = `Hotel_IT_Inventory_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`File "${filename}" berhasil didownload!`, 'success');
}

function exportDepartmentalExcel() {
  const XLSX = getSheetJS();
  if (!XLSX) return;

  const data = [
    ['HOTEL IT INVENTORY - 7 DEPARTMENTS ASSET HOLDINGS REPORT'],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['No', 'Department', 'Item Name', 'Category', 'Held Units', 'Total Received', 'Total Returned', 'Last Recipient / PIC', 'Last Movement Date']
  ];

  let rowCount = 0;
  DEPARTMENTS.forEach(dept => {
    state.masterItems.forEach(item => {
      const { received, returned, held } = calculateDeptItemStock(dept, item.id);
      if (held > 0 || received > 0) {
        rowCount++;
        const lastMov = state.departmentMovements
          .filter(m => m.department === dept && m.item_id === item.id)
          .sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        data.push([
          rowCount,
          dept,
          item.item_name,
          item.category,
          held,
          received,
          returned,
          lastMov?.recipient_name || '-',
          lastMov?.date || '-'
        ]);
      }
    });
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 }, { wch: 20 }, { wch: 40 }, { wch: 18 }, { wch: 14 },
    { wch: 14 }, { wch: 14 }, { wch: 28 }, { wch: 18 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Departmental Assets');

  const filename = `Hotel_IT_Departmental_Assets_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`File "${filename}" berhasil didownload!`, 'success');
}

function exportMotionExcel() {
  const XLSX = getSheetJS();
  if (!XLSX) return;

  const data = [
    ['HOTEL IT INVENTORY - MOTION AUDIT TRAIL LOG'],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['No', 'Date', 'Hardware Item', 'Category', 'Movement Type', 'Department', 'Quantity', 'Recipient / PIC', 'Remark', 'Recorded By']
  ];

  state.departmentMovements.forEach((mov, index) => {
    const item = state.masterItems.find(i => i.id === mov.item_id);
    data.push([
      index + 1,
      mov.date,
      item?.item_name || '(Item deleted)',
      item?.category || '-',
      mov.type === 'TRANSFER_TO_DEPARTMENT' ? 'TRANSFER TO DEPT' : 'RETURN TO IT',
      mov.department,
      mov.quantity,
      mov.recipient_name || '-',
      mov.remark || '-',
      mov.created_by || 'System'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 40 }, { wch: 18 }, { wch: 20 },
    { wch: 20 }, { wch: 12 }, { wch: 26 }, { wch: 35 }, { wch: 20 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Motion Log');

  const filename = `Hotel_IT_MotionLog_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`File "${filename}" berhasil didownload!`, 'success');
}

function exportPurchaseOrdersExcel() {
  const XLSX = getSheetJS();
  if (!XLSX) return;

  const data = [
    ['HOTEL IT PROCUREMENT - PURCHASE ORDERS REPORT'],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['No', 'PO Number', 'Item Name', 'Category', 'Order Date', 'Arrival Date', 'Qty', 'For Use / Allocation', 'Vendor', 'Status', 'Remarks']
  ];

  state.purchaseOrders.forEach((po, index) => {
    data.push([
      index + 1,
      po.po_number || '-',
      po.item_name,
      po.category,
      po.date_order,
      po.date_arrival || '-',
      po.quantity,
      po.for_use,
      po.vendor || '-',
      po.status,
      po.remarks || '-'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 }, { wch: 16 }, { wch: 38 }, { wch: 18 }, { wch: 14 },
    { wch: 14 }, { wch: 8 }, { wch: 30 }, { wch: 24 }, { wch: 16 }, { wch: 35 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Purchase Orders');

  const filename = `Hotel_IT_Purchase_Orders_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`File "${filename}" berhasil didownload!`, 'success');
}

function exportPrelovedExcel() {
  const XLSX = getSheetJS();
  if (!XLSX) return;

  const data = [
    ['HOTEL IT INVENTORY - PRELOVED & REFURBISHED HARDWARE'],
    [`Generated: ${new Date().toLocaleString()}`],
    [],
    ['No', 'Item Code', 'Item Name', 'Category', 'Date Repaired', 'Qty', 'Serial Number', 'Remark / Ex-Location']
  ];

  state.preloved.forEach((pre, index) => {
    data.push([
      index + 1,
      pre.item_code || '-',
      pre.item_name,
      pre.category,
      pre.date_repaired,
      pre.quantity,
      pre.serial_number || '-',
      pre.remark || '-'
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 }, { wch: 14 }, { wch: 40 }, { wch: 18 }, { wch: 14 },
    { wch: 8 }, { wch: 20 }, { wch: 45 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Preloved Items');

  const filename = `Hotel_IT_Preloved_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`File "${filename}" berhasil didownload!`, 'success');
}

function exportSelectedMonthlyExcel() {
  const XLSX = getSheetJS();
  if (!XLSX) return;

  const selector = document.getElementById('monthly-selector');
  const ym = selector?.value || new Date().toISOString().substring(0, 7);

  const wb = XLSX.utils.book_new();

  const inbounds = state.stockTransactions.filter(t => t.transaction_date && t.transaction_date.startsWith(ym));
  const inData = [
    [`HOTEL IT MONTHLY INBOUND STOCK - ${ym}`],
    [],
    ['No', 'Date', 'Item Name', 'Category', 'Quantity In', 'Remark']
  ];
  inbounds.forEach((t, i) => {
    const item = state.masterItems.find(it => it.id === t.item_id);
    inData.push([i + 1, t.transaction_date, item?.item_name || '-', item?.category || '-', t.quantity, t.remark || '-']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(inData), 'Monthly Inbound');

  const movs = state.departmentMovements.filter(m => m.date && m.date.startsWith(ym));
  const movData = [
    [`HOTEL IT MONTHLY DEPARTMENT MOVEMENTS - ${ym}`],
    [],
    ['No', 'Date', 'Item Name', 'Department', 'Type', 'Quantity', 'Recipient / PIC', 'Remark']
  ];
  movs.forEach((m, i) => {
    const item = state.masterItems.find(it => it.id === m.item_id);
    movData.push([i + 1, m.date, item?.item_name || '-', m.department, m.type, m.quantity, m.recipient_name || '-', m.remark || '-']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(movData), 'Monthly Movements');

  const filename = `Hotel_IT_Monthly_Report_${ym}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`Laporan bulanan ${ym} berhasil didownload!`, 'success');
}

function exportFullBackupExcel() {
  const XLSX = getSheetJS();
  if (!XLSX) return;

  const wb = XLSX.utils.book_new();

  const invData = [
    ['HOTEL IT MASTER INVENTORY CATALOG & AVAILABLE STOCK'],
    [`Generated: ${new Date().toISOString()}`],
    [],
    ['No', 'Item Code', 'Item Name', 'Category', 'Total Inbound', 'Transferred to Depts', 'Returned to IT', 'Available in IT Storage', 'Remark']
  ];
  state.masterItems.forEach((item, index) => {
    const m = calculateStockMetrics(item.id);
    invData.push([index + 1, item.item_code || '-', item.item_name, item.category, m.totalInbound, m.totalTransferred, m.totalReturned, m.availableStock, item.remark || '-']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(invData), 'Master Inventory');

  const deptData = [
    ['HOTEL IT 7 DEPARTMENTS ASSET HOLDINGS'],
    [],
    ['No', 'Department', 'Hardware Item', 'Category', 'Current Held Units', 'Total Received', 'Total Returned']
  ];
  let dCount = 0;
  DEPARTMENTS.forEach(dept => {
    state.masterItems.forEach(item => {
      const dm = calculateDeptItemStock(dept, item.id);
      if (dm.held > 0 || dm.received > 0) {
        dCount++;
        deptData.push([dCount, dept, item.item_name, item.category, dm.held, dm.received, dm.returned]);
      }
    });
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(deptData), 'Department Assets');

  const movData = [
    ['HOTEL IT MOTION & AUDIT TRAIL LOG'],
    [],
    ['No', 'Date', 'Hardware Item', 'Movement Type', 'Department', 'Quantity', 'Recipient / PIC', 'Remark']
  ];
  state.departmentMovements.forEach((mov, index) => {
    const item = state.masterItems.find(i => i.id === mov.item_id);
    movData.push([index + 1, mov.date, item?.item_name || '-', mov.type, mov.department, mov.quantity, mov.recipient_name || '-', mov.remark || '-']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(movData), 'Motion Log');

  const poData = [
    ['HOTEL IT PURCHASE ORDERS RECORD'],
    [],
    ['No', 'PO Number', 'Item Name', 'Category', 'Date Order', 'Date Arrival', 'Qty', 'For Use', 'Vendor', 'Status']
  ];
  state.purchaseOrders.forEach((po, index) => {
    poData.push([index + 1, po.po_number || '-', po.item_name, po.category, po.date_order, po.date_arrival || '-', po.quantity, po.for_use, po.vendor || '-', po.status]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(poData), 'Purchase Orders');

  const preData = [
    ['HOTEL IT PRELOVED & REFURBISHED ITEMS'],
    [],
    ['No', 'Code', 'Item Name', 'Category', 'Date Repaired', 'Qty', 'Serial Number', 'Remark']
  ];
  state.preloved.forEach((pre, index) => {
    preData.push([index + 1, pre.item_code || '-', pre.item_name, pre.category, pre.date_repaired, pre.quantity, pre.serial_number || '-', pre.remark || '-']);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(preData), 'Preloved Items');

  const filename = `Hotel_IT_Master_Full_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`Full Master Backup file "${filename}" berhasil didownload!`, 'success');
}

// ==============================================================================
// 17. SUPABASE AUTH & LOGIN WORKFLOW
// ==============================================================================
async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const submitBtn = document.getElementById('btn-login-submit');
  const errorAlert = document.getElementById('login-error-alert');
  const errorMsg = document.getElementById('login-error-msg');

  if (errorAlert) errorAlert.classList.add('hidden');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><span>Signing in...</span>`;
  }

  if (isLiveSupabase && supabaseClient) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      if (data?.user) {
        setCurrentSessionUser({
          id: data.user.id,
          email: data.user.email
        });
        showToast('Login berhasil via Supabase Auth!', 'success');
        return;
      }
    } catch (err) {
      console.warn('Supabase auth failed:', err.message);
      if (errorAlert && errorMsg) {
        errorMsg.textContent = err.message || 'Login failed. Periksa email & password di Supabase.';
        errorAlert.classList.remove('hidden');
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<span>Sign In to Dashboard</span><i class="fa-solid fa-arrow-right text-xs"></i>`;
      }
      return;
    }
  }

  // Offline / Demo fallback authentication
  if (email && password) {
    setCurrentSessionUser({
      id: 'usr-demo-001',
      email: email
    });
    showToast('Signed in successfully (Demo Session)', 'info');
  } else {
    if (errorAlert && errorMsg) {
      errorMsg.textContent = 'Harap isi email dan password.';
      errorAlert.classList.remove('hidden');
    }
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `<span>Sign In to Dashboard</span><i class="fa-solid fa-arrow-right text-xs"></i>`;
    }
  }
}

function handleDirectDemoBypass() {
  setCurrentSessionUser({
    id: 'demo-admin-id',
    email: 'admin@hotel.com'
  });
  showToast('Welcome to Hotel IT Inventory Demo Preview!', 'success');
}

function setCurrentSessionUser(user) {
  currentUser = user;
  localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));

  const emailDisplay = document.getElementById('current-user-email');
  if (emailDisplay) emailDisplay.textContent = user.email;

  updateHeroGreeting();

  document.getElementById('login-view')?.classList.add('hidden');
  document.getElementById('app-shell')?.classList.remove('hidden');

  loadApplicationData();
  navigateTo('dashboard');
}

async function handleLogout() {
  if (isLiveSupabase && supabaseClient) {
    try {
      await supabaseClient.auth.signOut();
    } catch (e) {
      console.warn('Supabase signout:', e);
    }
  }

  currentUser = null;
  localStorage.removeItem(STORAGE_KEYS.AUTH_USER);

  document.getElementById('app-shell')?.classList.add('hidden');
  document.getElementById('login-view')?.classList.remove('hidden');

  showToast('Logged out successfully.', 'info');
}

// ==============================================================================
// 18. SETTINGS & DYNAMIC CREDENTIALS PERSISTENCE
// ==============================================================================
function initSettingsForm() {
  const currentUrl = localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) || DEFAULT_SUPABASE_URL;
  const currentKey = localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) || DEFAULT_SUPABASE_KEY;

  const urlInput = document.getElementById('settings-url');
  const keyInput = document.getElementById('settings-key');
  const configUrl = document.getElementById('config-url');
  const configKey = document.getElementById('config-key');

  if (urlInput) urlInput.value = currentUrl;
  if (keyInput) keyInput.value = currentKey;
  if (configUrl) configUrl.value = currentUrl;
  if (configKey) configKey.value = currentKey;
}

function saveSettingsCredentials() {
  const url = document.getElementById('settings-url')?.value.trim();
  const key = document.getElementById('settings-key')?.value.trim();

  if (!url || !key) {
    showToast('Supabase URL dan Anon Key tidak boleh kosong!', 'error');
    return;
  }

  localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url);
  localStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, key);

  initSupabaseClient();
  loadApplicationData();
  showToast('Kredensial Supabase berhasil disimpan! Menyinkronkan data...', 'success');
}

function saveLoginConfigDrawer() {
  const url = document.getElementById('config-url')?.value.trim();
  const key = document.getElementById('config-key')?.value.trim();

  if (!url || !key) {
    showToast('Supabase URL dan Anon Key harus diisi!', 'error');
    return;
  }

  localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url);
  localStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, key);

  initSupabaseClient();
  showToast('Kredensial Supabase disimpan. Silakan login.', 'success');
}

async function testSupabaseConnection() {
  initSupabaseClient();

  if (!supabaseClient || !isLiveSupabase) {
    showToast('Koneksi Supabase belum aktif atau URL belum valid.', 'error');
    return;
  }

  try {
    const { data, error } = await supabaseClient.from('master_items').select('count', { count: 'exact' });
    if (error) {
      showToast(`Koneksi gagal: ${error.message}`, 'error');
    } else {
      showToast(`Koneksi Supabase Berhasil! Ditemukan ${data ? data.length : 0} records.`, 'success');
    }
  } catch (e) {
    showToast(`Error tes koneksi: ${e.message}`, 'error');
  }
}

function resetToDefaultCredentials() {
  localStorage.removeItem(STORAGE_KEYS.SUPABASE_URL);
  localStorage.removeItem(STORAGE_KEYS.SUPABASE_KEY);
  initSettingsForm();
  initSupabaseClient();
  showToast('Kredensial di-reset ke nilai default.', 'info');
}

function reloadDemoDataSeed() {
  if (confirm('Muat ulang seluruh data demo standar hotel? Data lokal akan diperbarui.')) {
    state = getInitialSeedData();
    persistState();
    showToast('Data demo berhasil di-reset.', 'success');
  }
}

function copySchemaSQL() {
  const sql = `-- HOTEL IT INVENTORY MANAGEMENT - ZERO-RLS SCHEMA
ALTER TABLE public.master_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.department_movements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.preloved DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities DISABLE ROW LEVEL SECURITY;`;

  navigator.clipboard.writeText(sql).then(() => {
    showToast('Ringkasan SQL Schema berhasil disalin ke clipboard!', 'success');
  }).catch(() => {
    showToast('Gagal menyalin, periksa izin clipboard.', 'error');
  });
}

// ==============================================================================
// 19. LIGHTBOX & TOAST UTILITIES
// ==============================================================================
function openLightbox(imgUrl, caption = '') {
  const lightbox = document.getElementById('modal-lightbox');
  const img = document.getElementById('lightbox-img');
  const cap = document.getElementById('lightbox-caption');

  if (img) img.src = imgUrl;
  if (cap) cap.textContent = caption;
  if (lightbox) lightbox.classList.remove('hidden');
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const colors = {
    success: 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40',
    error: 'bg-rose-950/90 text-rose-200 border-rose-500/40',
    info: 'bg-slate-900/95 text-slate-200 border-slate-700'
  };

  const icons = {
    success: 'fa-circle-check text-emerald-400',
    error: 'fa-circle-xmark text-rose-400',
    info: 'fa-circle-info text-cyan-400'
  };

  toast.className = `p-3.5 rounded-2xl border text-xs shadow-2xl backdrop-blur-md flex items-center gap-3 transition-all duration-300 transform translate-y-2 pointer-events-auto ${colors[type] || colors.info}`;
  toast.innerHTML = `
    <i class="fa-solid ${icons[type] || icons.info} text-base flex-shrink-0"></i>
    <span class="flex-1 font-medium">${escapeHtml(message)}</span>
    <button type="button" class="text-slate-400 hover:text-white transition ml-2 text-xs" onclick="this.parentElement.remove()">
      <i class="fa-solid fa-xmark"></i>
    </button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==============================================================================
// 20. EXPOSE GLOBAL FUNCTIONS TO WINDOW FOR INLINE HTML ONCLICK
// ==============================================================================
window.navigateTo = navigateTo;
window.selectDepartmentAndNavigate = selectDepartmentAndNavigate;
window.switchActiveDepartment = switchActiveDepartment;
window.setInvCategoryFilter = setInvCategoryFilter;
window.setDeptCatFilter = setDeptCatFilter;
window.setPrelovedCatFilter = setPrelovedCatFilter;
window.setPOStatusFilter = setPOStatusFilter;
window.setMonthlyTab = setMonthlyTab;
window.handleMonthlyChange = handleMonthlyChange;
window.renderInventoryTable = renderInventoryTable;
window.renderDepartmentalView = renderDepartmentalView;
window.renderMotionTable = renderMotionTable;
window.renderPOTable = renderPOTable;
window.renderPrelovedTable = renderPrelovedTable;
window.renderMonthlyView = renderMonthlyView;

window.openModal = openModal;
window.closeModal = closeModal;
window.openModalInbound = openModalInbound;
window.openModalTransfer = openModalTransfer;
window.openModalReturn = openModalReturn;
window.openModalPO = openModalPO;
window.openModalPreloved = openModalPreloved;
window.openLightbox = openLightbox;

window.updateTransferAvailableStock = updateTransferAvailableStock;
window.updateReturnItemOptions = updateReturnItemOptions;
window.updateReturnAvailableStock = updateReturnAvailableStock;

window.markPOArrived = markPOArrived;
window.confirmDeleteMasterItem = confirmDeleteMasterItem;
window.confirmDeletePO = confirmDeletePO;
window.confirmDeletePreloved = confirmDeletePreloved;

window.handleImageUploadPreview = handleImageUploadPreview;
window.handleImageUrlPreview = handleImageUrlPreview;
window.clearImagePreview = clearImagePreview;

window.exportInventoryExcel = exportInventoryExcel;
window.exportDepartmentalExcel = exportDepartmentalExcel;
window.exportMotionExcel = exportMotionExcel;
window.exportPurchaseOrdersExcel = exportPurchaseOrdersExcel;
window.exportPrelovedExcel = exportPrelovedExcel;
window.exportSelectedMonthlyExcel = exportSelectedMonthlyExcel;
window.exportFullBackupExcel = exportFullBackupExcel;

window.saveSettingsCredentials = saveSettingsCredentials;
window.saveLoginConfigDrawer = saveLoginConfigDrawer;
window.testSupabaseConnection = testSupabaseConnection;
window.resetToDefaultCredentials = resetToDefaultCredentials;
window.reloadDemoDataSeed = reloadDemoDataSeed;
window.copySchemaSQL = copySchemaSQL;

window.toggleMobileSidebar = toggleMobileSidebar;
window.updateHeroGreeting = updateHeroGreeting;
window.getGreetingPrefix = getGreetingPrefix;

// ==============================================================================
// 21. EVENT LISTENERS & APPLICATION BOOTSTRAP
// ==============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initSupabaseClient();
  initSettingsForm();
  initMonthlyView();

  document.getElementById('form-login')?.addEventListener('submit', handleLoginSubmit);
  document.getElementById('btn-quick-demo')?.addEventListener('click', handleDirectDemoBypass);
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

  document.getElementById('form-create-master-item')?.addEventListener('submit', handleCreateMasterItemSubmit);
  document.getElementById('form-inbound')?.addEventListener('submit', handleInboundSubmit);
  document.getElementById('form-transfer')?.addEventListener('submit', handleTransferSubmit);
  document.getElementById('form-return')?.addEventListener('submit', handleReturnSubmit);
  document.getElementById('form-po')?.addEventListener('submit', handlePOSubmit);
  document.getElementById('form-preloved')?.addEventListener('submit', handlePrelovedSubmit);

  const togglePassBtn = document.getElementById('toggle-password');
  if (togglePassBtn) {
    togglePassBtn.addEventListener('click', () => {
      const passInput = document.getElementById('login-password');
      const passIcon = document.getElementById('toggle-password-icon');
      if (passInput && passIcon) {
        if (passInput.type === 'password') {
          passInput.type = 'text';
          passIcon.className = 'fa-solid fa-eye-slash';
        } else {
          passInput.type = 'password';
          passIcon.className = 'fa-solid fa-eye';
        }
      }
    });
  }

  const toggleConfigBtn = document.getElementById('toggle-supabase-config');
  if (toggleConfigBtn) {
    toggleConfigBtn.addEventListener('click', () => {
      const panel = document.getElementById('supabase-config-panel');
      const chevron = document.getElementById('config-chevron');
      if (panel) panel.classList.toggle('hidden');
      if (chevron) chevron.classList.toggle('rotate-180');
    });
  }

  document.getElementById('btn-save-config')?.addEventListener('click', saveLoginConfigDrawer);

  const mobileBtn = document.getElementById('mobile-menu-btn');
  if (mobileBtn) {
    mobileBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleMobileSidebar(true);
    };
  }

  const storedUser = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      setCurrentSessionUser(user);
    } catch (e) {
      document.getElementById('login-view')?.classList.remove('hidden');
    }
  } else {
    document.getElementById('login-view')?.classList.remove('hidden');
  }
});
