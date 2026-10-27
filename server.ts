import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import ExcelJS from 'exceljs';
import type {
  InventoryItem,
  PurchaseOrderItem,
  PrelovedItem,
  UserAccount,
  ActivityRecord,
  Category,
  MasterItem,
  StockTransaction,
  InventorySummaryItem,
  MonthlyStockTransaction
} from './src/lib/types';
import {
  isDateRepairedInMonth,
  parseMonthFilter,
  filterInventory,
  sortInventory,
  computeStats,
  MONTH_NAMES,
  formatDate,
  formatDateTime,
  buildInventorySummaries,
  filterInventorySummaries,
  getMonthlyTransactions
} from './src/lib/inventory-logic';
import { filterPurchaseOrders, sortPurchaseOrders, computePOStats } from './src/lib/po-logic';
import { filterPreloved, sortPreloved, computePrelovedStats } from './src/lib/preloved-logic';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// In-memory sessions
const activeSessions = new Map<string, { user: UserAccount; expiresAt: number }>();
const secretTokens = new Set<string>();

interface DBData {
  users: Array<UserAccount & { passwordHash: string }>;
  masterItems: MasterItem[];
  stockTransactions: StockTransaction[];
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrderItem[];
  preloved: PrelovedItem[];
  activities: ActivityRecord[];
}

// Helper to create sample SVG placeholder images
function createSampleSvg(title: string, category: string, color: string): string {
  const shortTitle = title.length > 20 ? title.substring(0, 18) + '...' : title;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="${color}" rx="20"/>
    <rect x="15" y="15" width="370" height="270" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="2" rx="14"/>
    <circle cx="200" cy="115" r="42" fill="rgba(255,255,255,0.1)"/>
    <text x="200" y="125" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="900" fill="#ffffff" text-anchor="middle">IT</text>
    <text x="200" y="188" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#ffffff" text-anchor="middle">${shortTitle}</text>
    <text x="200" y="216" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="12" font-weight="600" fill="rgba(255,255,255,0.75)" text-anchor="middle" letter-spacing="1">${category}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Initialize seed DB
function initDB(): DBData {
  if (fs.existsSync(DB_FILE)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
      if (parsed.users && (parsed.inventory || parsed.masterItems)) {
        if (!parsed.purchaseOrders) parsed.purchaseOrders = [];
        if (!parsed.preloved) parsed.preloved = [];
        if (!parsed.activities) parsed.activities = [];

        // Migrate masterItems and stockTransactions if missing
        if (!parsed.masterItems || !Array.isArray(parsed.masterItems) || parsed.masterItems.length === 0) {
          parsed.masterItems = [];
          parsed.stockTransactions = [];

          for (const inv of parsed.inventory || []) {
            const masterId = inv.id.startsWith('item-') ? inv.id : `item-${inv.id.replace(/^inv-/, '')}`;
            let existingMaster = parsed.masterItems.find((m: any) => m.itemName.toLowerCase() === inv.itemName.toLowerCase());
            if (!existingMaster) {
              existingMaster = {
                id: masterId,
                itemName: inv.itemName,
                category: inv.category,
                remark: inv.remark || null,
                photoUrl: inv.photoUrl || null,
                isActive: true,
                createdAt: inv.createdAt || new Date().toISOString(),
                createdBy: inv.createdBy || 'ITMANAGER',
                updatedAt: inv.updatedAt || inv.createdAt || new Date().toISOString(),
                updatedBy: inv.updatedBy || inv.createdBy || 'ITMANAGER'
              };
              parsed.masterItems.push(existingMaster);
            }

            parsed.stockTransactions.push({
              id: `tx-${inv.id.replace(/^inv-/, '')}`,
              itemId: existingMaster.id,
              transactionDate: inv.dateRepaired ? inv.dateRepaired.split('T')[0] : '2026-10-01',
              quantity: inv.quantity !== undefined ? Math.max(1, parseInt(inv.quantity) || 1) : 1,
              createdAt: inv.createdAt || new Date().toISOString(),
              createdBy: inv.createdBy || 'ITMANAGER'
            });
          }
        }

        if (!parsed.stockTransactions || !Array.isArray(parsed.stockTransactions)) {
          parsed.stockTransactions = [];
        }

        for (const item of parsed.preloved || []) {
          if (item.quantity === undefined) item.quantity = 1;
        }

        // Keep parsed.inventory in sync
        parsed.inventory = buildInventorySummaries(parsed.masterItems, parsed.stockTransactions);
        return parsed;
      }
    } catch (e) {
      console.error('Error reading DB, re-seeding...', e);
    }
  }

  const salt = bcrypt.genSaltSync(10);
  const initialUsers: Array<UserAccount & { passwordHash: string }> = [
    {
      id: 'usr-1',
      username: 'ITMANAGER',
      passwordHash: bcrypt.hashSync('syah123', salt),
      role: 'IT MANAGER',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'usr-2',
      username: 'ITASSIST',
      passwordHash: bcrypt.hashSync('ihsan123', salt),
      role: 'IT ASSIST',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'usr-3',
      username: 'ITTRAINEE',
      passwordHash: bcrypt.hashSync('andi123', salt),
      role: 'IT TRAINEE',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z'
    }
  ];

  const samplePurchaseOrders: PurchaseOrderItem[] = [
    {
      id: 'po-201',
      itemName: 'Patch Cord Cat6 2M (50 pcs)',
      photoUrl: createSampleSvg('Cat6 Patch Cord', 'NETWORK ITEMS', '#0369a1'),
      dateOrder: '2026-10-02',
      dateArrival: '2026-10-06',
      quantity: 50,
      forUse: 'Housekeeping & Guest Rooms AP Replacement',
      remarks: 'Delivered by supplier, stored in IT storage rack',
      status: 'SUDAH DATANG',
      createdAt: '2026-10-02T08:00:00Z',
      createdBy: 'ITASSIST',
      updatedAt: '2026-10-06T11:00:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'po-202',
      itemName: 'Dell Pro Wireless Keyboard & Mouse (10 sets)',
      photoUrl: createSampleSvg('Dell KM Wireless', 'PC ITEMS', '#1e293b'),
      dateOrder: '2026-10-10',
      dateArrival: null,
      quantity: 10,
      forUse: 'Front Office Reception & Sales Office',
      remarks: 'Waiting for delivery from distributor Jakarta',
      status: 'BELUM DATANG',
      createdAt: '2026-10-10T09:30:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-10T09:30:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'po-203',
      itemName: 'Ubiquiti UniFi U6-Lite Access Point (4 units)',
      photoUrl: createSampleSvg('UniFi U6-Lite AP', 'NETWORK ITEMS', '#0284c7'),
      dateOrder: '2026-08-18',
      dateArrival: '2026-08-25',
      quantity: 4,
      forUse: 'Grand Ballroom Wi-Fi Density Upgrade',
      remarks: 'Approved by GM, installed and operational',
      status: 'SUDAH DATANG',
      createdAt: '2026-08-18T14:00:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-08-25T16:00:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'po-204',
      itemName: 'Hikvision 8-Port PoE Gigabit Switch (2 units)',
      photoUrl: createSampleSvg('Hikvision PoE Switch', 'CCTV & TV ITEMS', '#155e75'),
      dateOrder: '2026-10-12',
      dateArrival: null,
      quantity: 2,
      forUse: 'CCTV Parking Area Extension',
      remarks: 'Vendor estimated delivery 3 working days',
      status: 'BELUM DATANG',
      createdAt: '2026-10-12T13:10:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-10-12T13:10:00Z',
      updatedBy: 'ITTRAINEE'
    }
  ];

  const sampleInventory: InventoryItem[] = [
    {
      id: 'inv-101',
      itemName: 'Dell OptiPlex 7090 Micro PC',
      photoUrl: createSampleSvg('Dell OptiPlex 7090', 'PC ITEMS', '#1e293b'),
      category: 'PC ITEMS',
      dateRepaired: '2026-10-05',
      serialNumber: 'SN-DELL-7090-X1',
      remark: 'ex Front Office',
      createdAt: '2026-10-05T08:30:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-08T14:35:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'inv-102',
      itemName: 'HP ProDesk 600 G4 SFF',
      photoUrl: createSampleSvg('HP ProDesk 600', 'PC ITEMS', '#0f172a'),
      category: 'PC ITEMS',
      dateRepaired: '2026-08-14',
      serialNumber: 'CZC8423L12',
      remark: 'ex Room 402',
      createdAt: '2026-08-14T10:15:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-08-14T10:15:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'inv-103',
      itemName: 'Cisco Catalyst 2960-X 48-Port Switch',
      photoUrl: createSampleSvg('Cisco 2960-X Switch', 'NETWORK ITEMS', '#1e3a8a'),
      category: 'NETWORK ITEMS',
      dateRepaired: '2026-08-20',
      serialNumber: 'FCZ2049B3100',
      remark: 'ex Server Room Rack 2',
      createdAt: '2026-08-20T11:00:00Z',
      createdBy: 'ITASSIST',
      updatedAt: '2026-08-20T11:00:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'inv-104',
      itemName: 'Ubiquiti UniFi AP AC Pro',
      photoUrl: createSampleSvg('UniFi AP AC Pro', 'NETWORK ITEMS', '#0284c7'),
      category: 'NETWORK ITEMS',
      dateRepaired: '2026-09-12',
      serialNumber: '18E829F01234',
      remark: 'ex Grand Ballroom',
      createdAt: '2026-09-12T09:40:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-09-15T13:20:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'inv-105',
      itemName: 'Hikvision DS-2CD2143G2-I 4MP Dome CCTV',
      photoUrl: createSampleSvg('Hikvision Dome CCTV', 'CCTV & TV ITEMS', '#155e75'),
      category: 'CCTV & TV ITEMS',
      dateRepaired: '2026-10-08',
      serialNumber: 'HK-DS2143-889',
      remark: 'ex CCTV Parking Lobby',
      createdAt: '2026-10-08T15:20:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-10-08T15:20:00Z',
      updatedBy: 'ITTRAINEE'
    },
    {
      id: 'inv-106',
      itemName: 'Samsung 55" Hospitality 4K UHD TV (HG55AU800)',
      photoUrl: createSampleSvg('Samsung 55 Hospitality TV', 'CCTV & TV ITEMS', '#312e81'),
      category: 'CCTV & TV ITEMS',
      dateRepaired: '2026-08-28',
      serialNumber: '08143CEN100234B',
      remark: 'ex Executive Suite 801',
      createdAt: '2026-08-28T16:00:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-08-28T16:00:00Z',
      updatedBy: 'ITMANAGER'
    }
  ];

  const initialActivities: ActivityRecord[] = [
    {
      id: 'act-1',
      inventoryId: 'inv-101',
      itemName: 'Dell OptiPlex 7090 Micro PC',
      category: 'PC ITEMS',
      action: 'Edited',
      username: 'ITASSIST',
      timestamp: '2026-10-08T14:35:00Z'
    },
    {
      id: 'act-2',
      inventoryId: 'inv-105',
      itemName: 'Hikvision DS-2CD2143G2-I 4MP Dome CCTV',
      category: 'CCTV & TV ITEMS',
      action: 'Added',
      username: 'ITTRAINEE',
      timestamp: '2026-10-08T15:20:00Z'
    },
    {
      id: 'act-3',
      inventoryId: 'inv-104',
      itemName: 'Ubiquiti UniFi AP AC Pro',
      category: 'NETWORK ITEMS',
      action: 'Edited',
      username: 'ITASSIST',
      timestamp: '2026-09-15T13:20:00Z'
    }
  ];

  const samplePreloved: PrelovedItem[] = [
    {
      id: 'prev-301',
      itemName: 'HP ProDesk 400 G6 Micro Desktop (i5/16GB)',
      photoUrl: createSampleSvg('HP ProDesk G6', 'PC ITEMS', '#7c3aed'),
      category: 'PC ITEMS',
      dateRepaired: '2026-10-04',
      serialNumber: 'HP-PD400-9921',
      remark: 'ex Front Desk Backoffice, hard drive wiped & refurbished',
      createdAt: '2026-10-04T10:15:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-04T10:15:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'prev-302',
      itemName: 'Cisco Catalyst 2960-X 24-Port Switch',
      photoUrl: createSampleSvg('Cisco 2960X Switch', 'NETWORK ITEMS', '#6d28d9'),
      category: 'NETWORK ITEMS',
      dateRepaired: '2026-09-18',
      serialNumber: 'FOC1829Z12X',
      remark: 'ex Banquet Hall Rack, fully tested & reset to factory',
      createdAt: '2026-09-18T14:20:00Z',
      createdBy: 'ITASSIST',
      updatedAt: '2026-09-18T14:20:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'prev-303',
      itemName: 'Hikvision DS-2CD2043G0-I 4MP Bullet Camera',
      photoUrl: createSampleSvg('Hikvision Bullet 4MP', 'CCTV & TV ITEMS', '#5b21b6'),
      category: 'CCTV & TV ITEMS',
      dateRepaired: '2026-10-11',
      serialNumber: 'HK-CAM-BULLET-771',
      remark: 'ex Kitchen Service Corridor, cleaned & operational',
      createdAt: '2026-10-11T09:45:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-10-11T09:45:00Z',
      updatedBy: 'ITTRAINEE'
    }
  ];

  const sampleMasterItems: MasterItem[] = sampleInventory.map((inv) => ({
    id: `item-${inv.id.replace(/^inv-/, '')}`,
    itemName: inv.itemName,
    category: inv.category,
    remark: inv.remark || null,
    photoUrl: inv.photoUrl || null,
    isActive: true,
    createdAt: inv.createdAt,
    createdBy: inv.createdBy,
    updatedAt: inv.updatedAt,
    updatedBy: inv.updatedBy
  }));

  const sampleStockTransactions: StockTransaction[] = sampleInventory.map((inv) => ({
    id: `tx-${inv.id.replace(/^inv-/, '')}`,
    itemId: `item-${inv.id.replace(/^inv-/, '')}`,
    transactionDate: inv.dateRepaired ? inv.dateRepaired.split('T')[0] : '2026-10-01',
    quantity: inv.quantity !== undefined ? Math.max(1, inv.quantity) : 1,
    createdAt: inv.createdAt,
    createdBy: inv.createdBy
  }));

  const db: DBData = {
    users: initialUsers,
    masterItems: sampleMasterItems,
    stockTransactions: sampleStockTransactions,
    inventory: buildInventorySummaries(sampleMasterItems, sampleStockTransactions),
    purchaseOrders: samplePurchaseOrders,
    preloved: samplePreloved,
    activities: initialActivities
  };

  const tempPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_FILE);
  return db;
}

let dbCache: DBData = initDB();
if (!dbCache.purchaseOrders || dbCache.purchaseOrders.length === 0) {
  // Ensure existing database files receive sample PO data
  dbCache.purchaseOrders = [
    {
      id: 'po-201',
      itemName: 'Patch Cord Cat6 2M (50 pcs)',
      photoUrl: createSampleSvg('Cat6 Patch Cord', 'NETWORK ITEMS', '#0369a1'),
      dateOrder: '2026-10-02',
      dateArrival: '2026-10-06',
      quantity: 50,
      forUse: 'Housekeeping & Guest Rooms AP Replacement',
      remarks: 'Delivered by supplier, stored in IT storage rack',
      status: 'SUDAH DATANG',
      createdAt: '2026-10-02T08:00:00Z',
      createdBy: 'ITASSIST',
      updatedAt: '2026-10-06T11:00:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'po-202',
      itemName: 'Dell Pro Wireless Keyboard & Mouse (10 sets)',
      photoUrl: createSampleSvg('Dell KM Wireless', 'PC ITEMS', '#1e293b'),
      dateOrder: '2026-10-10',
      dateArrival: null,
      quantity: 10,
      forUse: 'Front Office Reception & Sales Office',
      remarks: 'Waiting for delivery from distributor Jakarta',
      status: 'BELUM DATANG',
      createdAt: '2026-10-10T09:30:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-10T09:30:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'po-203',
      itemName: 'Ubiquiti UniFi U6-Lite Access Point (4 units)',
      photoUrl: createSampleSvg('UniFi U6-Lite AP', 'NETWORK ITEMS', '#0284c7'),
      dateOrder: '2026-08-18',
      dateArrival: '2026-08-25',
      quantity: 4,
      forUse: 'Grand Ballroom Wi-Fi Density Upgrade',
      remarks: 'Approved by GM, installed and operational',
      status: 'SUDAH DATANG',
      createdAt: '2026-08-18T14:00:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-08-25T16:00:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'po-204',
      itemName: 'Hikvision 8-Port PoE Gigabit Switch (2 units)',
      photoUrl: createSampleSvg('Hikvision PoE Switch', 'CCTV & TV ITEMS', '#155e75'),
      dateOrder: '2026-10-12',
      dateArrival: null,
      quantity: 2,
      forUse: 'CCTV Parking Area Extension',
      remarks: 'Vendor estimated delivery 3 working days',
      status: 'BELUM DATANG',
      createdAt: '2026-10-12T13:10:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-10-12T13:10:00Z',
      updatedBy: 'ITTRAINEE'
    }
  ];
  saveDB(dbCache);
}

if (!dbCache.preloved || dbCache.preloved.length === 0) {
  dbCache.preloved = [
    {
      id: 'prev-301',
      itemName: 'HP ProDesk 400 G6 Micro Desktop (i5/16GB)',
      photoUrl: createSampleSvg('HP ProDesk G6', 'PC ITEMS', '#7c3aed'),
      category: 'PC ITEMS',
      dateRepaired: '2026-10-04',
      serialNumber: 'HP-PD400-9921',
      remark: 'ex Front Desk Backoffice, hard drive wiped & refurbished',
      createdAt: '2026-10-04T10:15:00Z',
      createdBy: 'ITMANAGER',
      updatedAt: '2026-10-04T10:15:00Z',
      updatedBy: 'ITMANAGER'
    },
    {
      id: 'prev-302',
      itemName: 'Cisco Catalyst 2960-X 24-Port Switch',
      photoUrl: createSampleSvg('Cisco 2960X Switch', 'NETWORK ITEMS', '#6d28d9'),
      category: 'NETWORK ITEMS',
      dateRepaired: '2026-09-18',
      serialNumber: 'FOC1829Z12X',
      remark: 'ex Banquet Hall Rack, fully tested & reset to factory',
      createdAt: '2026-09-18T14:20:00Z',
      createdBy: 'ITASSIST',
      updatedAt: '2026-09-18T14:20:00Z',
      updatedBy: 'ITASSIST'
    },
    {
      id: 'prev-303',
      itemName: 'Hikvision DS-2CD2043G0-I 4MP Bullet Camera',
      photoUrl: createSampleSvg('Hikvision Bullet 4MP', 'CCTV & TV ITEMS', '#5b21b6'),
      category: 'CCTV & TV ITEMS',
      dateRepaired: '2026-10-11',
      serialNumber: 'HK-CAM-BULLET-771',
      remark: 'ex Kitchen Service Corridor, cleaned & operational',
      createdAt: '2026-10-11T09:45:00Z',
      createdBy: 'ITTRAINEE',
      updatedAt: '2026-10-11T09:45:00Z',
      updatedBy: 'ITTRAINEE'
    }
  ];
  saveDB(dbCache);
}


function saveDB(data: DBData) {
  if (!data.masterItems) data.masterItems = [];
  if (!data.stockTransactions) data.stockTransactions = [];
  data.inventory = buildInventorySummaries(data.masterItems, data.stockTransactions);
  dbCache = data;
  const tempPath = `${DB_FILE}.tmp`;
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tempPath, DB_FILE);
}


// Express Middleware

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Static route for uploaded images
app.use('/uploads', express.static(UPLOADS_DIR));

// Auth token helper
function getAuthenticatedUser(req: Request): UserAccount | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session.user;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized. Please login.' });
    return;
  }
  (req as any).user = user;
  next();
}

// API Routes

// 1. Login
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required.' });
    return;
  }

  const normalizedUser = username.trim().toUpperCase();
  const foundUser = dbCache.users.find(u => u.username.toUpperCase() === normalizedUser);

  if (!foundUser) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const isMatch = bcrypt.compareSync(password, foundUser.passwordHash);
  if (!isMatch) {
    res.status(401).json({ error: 'Invalid username or password.' });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const userProfile: UserAccount = {
    id: foundUser.id,
    username: foundUser.username,
    role: foundUser.role,
    createdAt: foundUser.createdAt,
    updatedAt: foundUser.updatedAt
  };

  // 7 days session
  activeSessions.set(token, {
    user: userProfile,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
  });

  res.json({
    token,
    user: userProfile
  });
});

// 2. Current User
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }
  res.json({ user });
});

// 3. Logout
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '');
    activeSessions.delete(token);
  }
  res.json({ success: true });
});

// 4. Verify Secret Code
const SECRET_CODE = 'INNRATTAN.BJM';

app.post('/api/auth/verify-secret', (req: Request, res: Response) => {
  const { secretCode } = req.body;
  if (!secretCode || secretCode.trim() !== SECRET_CODE) {
    res.status(403).json({ error: 'Invalid secret code. Please try again.' });
    return;
  }

  const secretToken = crypto.randomBytes(24).toString('hex');
  secretTokens.add(secretToken);
  // Auto expire secret token in 30 mins
  setTimeout(() => secretTokens.delete(secretToken), 30 * 60 * 1000);

  res.json({
    success: true,
    secretToken
  });
});

// 5. Get Users List for Edit User & Password
app.get('/api/users', (req: Request, res: Response) => {
  const secretToken = req.headers['x-secret-token'] as string;
  const user = getAuthenticatedUser(req);

  // Accessible either if secret token provided or logged in
  if (!secretToken && !user) {
    res.status(403).json({ error: 'Access denied. Secret code verification required.' });
    return;
  }

  const usersSafe = dbCache.users.map(u => ({
    id: u.id,
    username: u.username,
    role: u.role,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt
  }));

  res.json({ users: usersSafe });
});

// 6. Update User Credentials (Username and/or Password)
app.put('/api/users/:id', (req: Request, res: Response) => {
  const secretToken = req.headers['x-secret-token'] as string;
  if (!secretToken || !secretTokens.has(secretToken)) {
    res.status(403).json({ error: 'Invalid or expired secret session. Please verify secret code again.' });
    return;
  }

  const { id } = req.params;
  const { username, password } = req.body;

  const targetIdx = dbCache.users.findIndex(u => u.id === id);
  if (targetIdx === -1) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  const oldUser = dbCache.users[targetIdx];
  let newUsername = oldUser.username;

  if (username && username.trim() !== '') {
    const trimmed = username.trim().toUpperCase();
    // Check if new username collides with another user
    const collision = dbCache.users.find(u => u.id !== id && u.username.toUpperCase() === trimmed);
    if (collision) {
      res.status(400).json({ error: `Username ${trimmed} is already in use.` });
      return;
    }
    newUsername = trimmed;
  }

  let newHash = oldUser.passwordHash;
  if (password && password.trim() !== '') {
    newHash = bcrypt.hashSync(password.trim(), 10);
  }

  const nowIso = new Date().toISOString();
  dbCache.users[targetIdx] = {
    ...oldUser,
    username: newUsername,
    passwordHash: newHash,
    updatedAt: nowIso
  };

  saveDB(dbCache);

  // Update any active sessions with the new username
  for (const [token, session] of activeSessions.entries()) {
    if (session.user.id === id) {
      session.user.username = newUsername;
      session.user.updatedAt = nowIso;
    }
  }

  res.json({
    message: 'User credentials updated successfully.',
    user: {
      id: oldUser.id,
      username: newUsername,
      role: oldUser.role,
      updatedAt: nowIso
    }
  });
});

// ==========================================
// MASTER ITEM CATALOG ROUTES
// ==========================================

// 7. Get Master Items List
app.get('/api/master-items', requireAuth, (req: Request, res: Response) => {
  const { search, category, status } = req.query as Record<string, string>;
  let items = (dbCache.masterItems || []).filter(item => {
    if (status !== 'all' && item.isActive === false) return false;
    if (category && category !== 'All' && item.category !== category) return false;
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = item.itemName.toLowerCase().includes(q);
      const matchRemark = item.remark ? item.remark.toLowerCase().includes(q) : false;
      if (!matchName && !matchRemark) return false;
    }
    return true;
  });

  const summaries = buildInventorySummaries(items, dbCache.stockTransactions || []);
  res.json({ data: summaries });
});

// 8. Create New Master Item
app.post('/api/master-items', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { itemName, category, remark, photoUrl } = req.body;

  if (!itemName || !itemName.trim()) {
    res.status(400).json({ error: 'Nama barang wajib diisi (Item name is required).' });
    return;
  }
  if (!category || !['PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS'].includes(category)) {
    res.status(400).json({ error: 'Kategori barang harus dipilih (PC ITEMS, NETWORK ITEMS, atau CCTV & TV ITEMS).' });
    return;
  }

  const trimmedName = itemName.trim();
  const isDuplicate = (dbCache.masterItems || []).some(
    m => m.isActive !== false && m.itemName.toLowerCase() === trimmedName.toLowerCase()
  );
  if (isDuplicate) {
    res.status(400).json({ error: `Barang dengan nama "${trimmedName}" sudah ada di katalog master item.` });
    return;
  }

  const nowIso = new Date().toISOString();
  const newItem: MasterItem = {
    id: `item-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    itemName: trimmedName,
    category: category as Category,
    remark: remark && remark.trim() ? remark.trim() : null,
    photoUrl: photoUrl && photoUrl.trim() ? photoUrl.trim() : null,
    isActive: true,
    createdAt: nowIso,
    createdBy: user.username,
    updatedAt: nowIso,
    updatedBy: user.username
  };

  if (!dbCache.masterItems) dbCache.masterItems = [];
  dbCache.masterItems.unshift(newItem);

  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: newItem.id,
    itemName: newItem.itemName,
    category: newItem.category,
    type: 'INVENTORY',
    action: 'Added',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);

  res.status(201).json({
    message: 'Master item berhasil dibuat.',
    data: newItem
  });
});

// 9. Update Master Item
app.put('/api/master-items/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;
  const { itemName, category, remark, photoUrl, isActive } = req.body;

  const idx = (dbCache.masterItems || []).findIndex(m => m.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Master item tidak ditemukan.' });
    return;
  }

  const targetItem = dbCache.masterItems[idx];
  if (itemName && itemName.trim() !== targetItem.itemName) {
    const trimmed = itemName.trim();
    const duplicate = dbCache.masterItems.some(
      m => m.id !== id && m.isActive !== false && m.itemName.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      res.status(400).json({ error: `Barang dengan nama "${trimmed}" sudah ada di katalog master item.` });
      return;
    }
    targetItem.itemName = trimmed;
  }

  if (category && ['PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS'].includes(category)) {
    targetItem.category = category as Category;
  }
  if (remark !== undefined) {
    targetItem.remark = remark && remark.trim() ? remark.trim() : null;
  }
  if (photoUrl !== undefined) {
    targetItem.photoUrl = photoUrl && photoUrl.trim() ? photoUrl.trim() : null;
  }
  if (typeof isActive === 'boolean') {
    targetItem.isActive = isActive;
  }

  const nowIso = new Date().toISOString();
  targetItem.updatedAt = nowIso;
  targetItem.updatedBy = user.username;

  dbCache.masterItems[idx] = targetItem;

  dbCache.activities.unshift({
    id: `act-${Date.now()}`,
    targetId: targetItem.id,
    itemName: targetItem.itemName,
    category: targetItem.category,
    type: 'INVENTORY',
    action: 'Edited',
    username: user.username,
    timestamp: nowIso
  });

  saveDB(dbCache);

  res.json({
    message: 'Master item berhasil diperbarui.',
    data: targetItem
  });
});

// 10. Delete / Archive Master Item
app.delete('/api/master-items/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;

  const idx = (dbCache.masterItems || []).findIndex(m => m.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Master item tidak ditemukan.' });
    return;
  }

  const targetItem = dbCache.masterItems[idx];
  const hasTransactions = (dbCache.stockTransactions || []).some(t => t.itemId === id);

  if (hasTransactions) {
    targetItem.isActive = false;
    targetItem.updatedAt = new Date().toISOString();
    targetItem.updatedBy = user.username;

    dbCache.activities.unshift({
      id: `act-${Date.now()}`,
      targetId: id,
      itemName: targetItem.itemName,
      category: targetItem.category,
      type: 'INVENTORY',
      action: 'Edited',
      username: user.username,
      timestamp: new Date().toISOString()
    });

    saveDB(dbCache);

    res.json({
      message: 'Master item memiliki riwayat penambahan stok, sehingga dinonaktifkan (diarsipkan). Histori stok tetap tersimpan.',
      archived: true
    });
    return;
  }

  dbCache.masterItems = dbCache.masterItems.filter(m => m.id !== id);

  dbCache.activities.unshift({
    id: `act-${Date.now()}`,
    targetId: id,
    itemName: targetItem.itemName,
    category: targetItem.category,
    type: 'INVENTORY',
    action: 'Deleted',
    username: user.username,
    timestamp: new Date().toISOString()
  });

  saveDB(dbCache);

  res.json({
    message: 'Master item berhasil dihapus.',
    archived: false
  });
});

// ==========================================
// STOCK INBOUND TRANSACTIONS ROUTES
// ==========================================

// 11. Get Stock Transactions (for Monthly Data & Item History)
app.get('/api/inventory/transactions', requireAuth, (req: Request, res: Response) => {
  const { itemId, month, year, category, search } = req.query as Record<string, string>;

  let parsedMonth: number | undefined;
  let parsedYear: number | undefined;

  if (month && month !== 'All' && month !== 'ALL') {
    const p = parseMonthFilter(month);
    if (p) {
      parsedMonth = p.month;
      parsedYear = p.year;
    }
  }

  if (year) {
    const y = parseInt(year, 10);
    if (!isNaN(y)) parsedYear = y;
  }

  const masterMap = new Map<string, MasterItem>();
  for (const m of dbCache.masterItems || []) {
    masterMap.set(m.id, m);
  }

  let txList = (dbCache.stockTransactions || []).filter(tx => {
    if (itemId && tx.itemId !== itemId) return false;

    if (parsedMonth && parsedYear) {
      if (!isDateRepairedInMonth(tx.transactionDate, parsedMonth, parsedYear)) {
        return false;
      }
    } else if (parsedYear) {
      const parts = tx.transactionDate.split('-');
      if (parts.length >= 1 && parseInt(parts[0], 10) !== parsedYear) {
        return false;
      }
    }

    const master = masterMap.get(tx.itemId);
    if (category && category !== 'All') {
      if (!master || master.category !== category) return false;
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      const matchName = master ? master.itemName.toLowerCase().includes(q) : false;
      const matchRemark = master && master.remark ? master.remark.toLowerCase().includes(q) : false;
      const matchUser = tx.createdBy.toLowerCase().includes(q);
      if (!matchName && !matchRemark && !matchUser) return false;
    }

    return true;
  });

  txList.sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  const totalUnitsAdded = txList.reduce((sum, t) => sum + (Number(t.quantity) || 0), 0);

  const detailedTxs: MonthlyStockTransaction[] = txList.map(tx => {
    const master = masterMap.get(tx.itemId);
    return {
      id: tx.id,
      itemId: tx.itemId,
      itemName: master ? master.itemName : 'Barang Dihapus',
      category: master ? master.category : ('PC ITEMS' as Category),
      photoUrl: master ? master.photoUrl : null,
      transactionDate: tx.transactionDate,
      quantity: tx.quantity,
      createdBy: tx.createdBy,
      remark: master ? master.remark : null,
      createdAt: tx.createdAt
    };
  });

  res.json({
    data: detailedTxs,
    totalTransactions: detailedTxs.length,
    totalUnitsAdded
  });
});

// 12. Record Inbound Stock (Add Inventory Form)
app.post('/api/inventory/transactions', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { itemId, transactionDate, quantity } = req.body;

  if (!itemId) {
    res.status(400).json({ error: 'Pilih barang dari master item terlebih dahulu.' });
    return;
  }

  const masterItem = (dbCache.masterItems || []).find(m => m.id === itemId);
  if (!masterItem) {
    res.status(404).json({ error: 'Barang tidak ditemukan di katalog master item.' });
    return;
  }

  if (!transactionDate || !transactionDate.trim()) {
    res.status(400).json({ error: 'Tanggal dimasukkan wajib diisi.' });
    return;
  }

  const parsedQty = parseInt(quantity, 10);
  if (isNaN(parsedQty) || parsedQty <= 0) {
    res.status(400).json({ error: 'Jumlah unit harus berupa bilangan bulat positif (minimal 1 unit).' });
    return;
  }

  const nowIso = new Date().toISOString();
  const newTx: StockTransaction = {
    id: `tx-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    itemId: masterItem.id,
    transactionDate: transactionDate.trim(),
    quantity: parsedQty,
    createdAt: nowIso,
    createdBy: user.username
  };

  if (!dbCache.stockTransactions) dbCache.stockTransactions = [];
  dbCache.stockTransactions.unshift(newTx);

  masterItem.updatedAt = nowIso;
  masterItem.updatedBy = user.username;

  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: masterItem.id,
    itemName: `${masterItem.itemName} (+${parsedQty} Unit)`,
    category: masterItem.category,
    type: 'INVENTORY',
    action: 'Added',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);

  res.status(201).json({
    message: `Berhasil menambahkan ${parsedQty} unit untuk ${masterItem.itemName}.`,
    data: newTx,
    item: masterItem
  });
});

// 13. Update Stock Transaction
app.put('/api/inventory/transactions/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;
  const { transactionDate, quantity } = req.body;

  const idx = (dbCache.stockTransactions || []).findIndex(t => t.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    return;
  }

  const tx = dbCache.stockTransactions[idx];
  if (transactionDate) {
    tx.transactionDate = transactionDate.trim();
  }
  if (quantity !== undefined) {
    const q = parseInt(quantity, 10);
    if (isNaN(q) || q <= 0) {
      res.status(400).json({ error: 'Jumlah unit harus berupa bilangan bulat positif.' });
      return;
    }
    tx.quantity = q;
  }

  saveDB(dbCache);

  res.json({
    message: 'Transaksi stok berhasil diperbarui.',
    data: tx
  });
});

// 14. Delete Stock Transaction
app.delete('/api/inventory/transactions/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;

  const idx = (dbCache.stockTransactions || []).findIndex(t => t.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Transaksi tidak ditemukan.' });
    return;
  }

  const tx = dbCache.stockTransactions[idx];
  dbCache.stockTransactions = dbCache.stockTransactions.filter(t => t.id !== id);

  saveDB(dbCache);

  res.json({
    message: 'Transaksi penambahan unit berhasil dihapus.',
    data: tx
  });
});

// ==========================================
// UNIFIED INVENTORY SUMMARY & COMPATIBILITY
// ==========================================

// 15. Get Inventory Summary List (One row per Master Item with total stock)
app.get('/api/inventory', requireAuth, (req: Request, res: Response) => {
  const {
    search,
    category,
    month,
    user,
    dateFrom,
    dateTo,
    sortBy,
    page = '1',
    limit = '50'
  } = req.query as Record<string, string>;

  const summaries = buildInventorySummaries(dbCache.masterItems || [], dbCache.stockTransactions || []);

  let filtered = filterInventorySummaries(summaries, {
    search,
    category,
    month,
    user,
    dateFrom,
    dateTo
  });

  const sorted = sortInventory(filtered, sortBy as any || 'updated-newest');

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const total = sorted.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = sorted.slice(startIndex, startIndex + limitNum);

  res.json({
    data: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1
  });
});

// 16. Get Recently Edited Items (Both Inventory & Purchase Orders & Preloved)
app.get('/api/inventory/recently-edited', requireAuth, (req: Request, res: Response) => {
  const allRecent: any[] = [];

  const summaries = buildInventorySummaries(dbCache.masterItems || [], dbCache.stockTransactions || []);

  for (const inv of summaries) {
    allRecent.push({
      id: inv.id,
      itemName: inv.itemName,
      photoUrl: inv.photoUrl,
      categoryOrStatus: inv.category,
      itemType: 'INVENTORY' as const,
      dateRef: inv.lastTransactionDate || inv.dateRepaired,
      dateRefLabel: 'Stok Masuk',
      serialOrQty: `${inv.totalQuantity} Unit (${inv.transactionCount}x penambahan)`,
      createdBy: inv.createdBy,
      updatedBy: inv.updatedBy,
      createdAt: inv.createdAt,
      updatedAt: inv.updatedAt,
      rawItem: inv
    });
  }

  for (const po of dbCache.purchaseOrders || []) {
    allRecent.push({
      id: po.id,
      itemName: po.itemName,
      photoUrl: po.photoUrl,
      categoryOrStatus: po.status,
      itemType: 'PURCHASE ORDER' as const,
      dateRef: po.dateOrder,
      dateRefLabel: 'Tanggal order',
      serialOrQty: `${po.quantity} Unit • ${po.forUse}`,
      createdBy: po.createdBy,
      updatedBy: po.updatedBy,
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
      rawItem: po
    });
  }

  for (const prev of dbCache.preloved || []) {
    allRecent.push({
      id: prev.id,
      itemName: prev.itemName,
      photoUrl: prev.photoUrl,
      categoryOrStatus: prev.category,
      itemType: 'PRELOVED' as const,
      dateRef: prev.dateRepaired,
      dateRefLabel: 'Tanggal dibereskan',
      serialOrQty: `${prev.quantity ?? 1} Unit${prev.serialNumber ? ` • SN: ${prev.serialNumber}` : ''}`,
      createdBy: prev.createdBy,
      updatedBy: prev.updatedBy,
      createdAt: prev.createdAt,
      updatedAt: prev.updatedAt,
      rawItem: prev
    });
  }

  allRecent.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json({ data: allRecent.slice(0, 10) });
});

// 17. Get Dashboard Stats
app.get('/api/inventory/stats', requireAuth, (req: Request, res: Response) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  let pcCount = 0;
  let networkCount = 0;
  let cctvCount = 0;

  const activeMasters = (dbCache.masterItems || []).filter(m => m.isActive !== false);
  for (const m of activeMasters) {
    if (m.category === 'PC ITEMS') pcCount++;
    else if (m.category === 'NETWORK ITEMS') networkCount++;
    else if (m.category === 'CCTV & TV ITEMS') cctvCount++;
  }

  const activeIds = new Set(activeMasters.map(m => m.id));
  let totalUnits = 0;
  let addedThisMonth = 0;

  for (const tx of dbCache.stockTransactions || []) {
    if (activeIds.has(tx.itemId)) {
      totalUnits += (Number(tx.quantity) || 0);
    }
    if (isDateRepairedInMonth(tx.transactionDate, currentMonth, currentYear)) {
      addedThisMonth += (Number(tx.quantity) || 0);
    }
  }

  res.json({
    total: activeMasters.length,
    totalUnits,
    pcCount,
    networkCount,
    cctvCount,
    addedThisMonth
  });
});

// 18. Get Recent Activities
app.get('/api/inventory/recent-activity', requireAuth, (req: Request, res: Response) => {
  const sorted = [...dbCache.activities].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
  res.json({ data: sorted.slice(0, 15) });
});

// 19. Get Single Inventory Item with History
app.get('/api/inventory/:id', requireAuth, (req: Request, res: Response) => {
  const summaries = buildInventorySummaries(dbCache.masterItems || [], dbCache.stockTransactions || []);
  const item = summaries.find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Inventory item not found.' });
    return;
  }
  res.json({ data: item });
});

// 20. Backward-compatible Add Inventory endpoint
app.post('/api/inventory', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { itemId, itemName, photoUrl, category, dateRepaired, transactionDate, quantity, remark } = req.body;

  // Case A: Adding stock to existing master item
  if (itemId) {
    const master = (dbCache.masterItems || []).find(m => m.id === itemId);
    if (!master) {
      res.status(404).json({ error: 'Master item tidak ditemukan.' });
      return;
    }
    const targetDate = (transactionDate || dateRepaired || new Date().toISOString().split('T')[0]).trim();
    const parsedQty = Math.max(1, parseInt(quantity) || 1);
    const nowIso = new Date().toISOString();

    const newTx: StockTransaction = {
      id: `tx-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      itemId: master.id,
      transactionDate: targetDate,
      quantity: parsedQty,
      createdAt: nowIso,
      createdBy: user.username
    };
    if (!dbCache.stockTransactions) dbCache.stockTransactions = [];
    dbCache.stockTransactions.unshift(newTx);

    master.updatedAt = nowIso;
    master.updatedBy = user.username;

    dbCache.activities.unshift({
      id: `act-${Date.now()}`,
      targetId: master.id,
      itemName: `${master.itemName} (+${parsedQty} Unit)`,
      category: master.category,
      type: 'INVENTORY',
      action: 'Added',
      username: user.username,
      timestamp: nowIso
    });

    saveDB(dbCache);
    const updatedSummary = buildInventorySummaries([master], dbCache.stockTransactions)[0];
    res.status(201).json({ message: 'Stok unit berhasil ditambahkan.', data: updatedSummary });
    return;
  }

  // Case B: Direct creation of master item and initial stock transaction
  if (!itemName || !itemName.trim()) {
    res.status(400).json({ error: 'Nama barang wajib diisi.' });
    return;
  }
  if (!category || !['PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS'].includes(category)) {
    res.status(400).json({ error: 'Kategori barang harus dipilih.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const masterId = `item-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const newMaster: MasterItem = {
    id: masterId,
    itemName: itemName.trim(),
    category: category as Category,
    remark: remark && remark.trim() ? remark.trim() : null,
    photoUrl: photoUrl && photoUrl.trim() ? photoUrl.trim() : null,
    isActive: true,
    createdAt: nowIso,
    createdBy: user.username,
    updatedAt: nowIso,
    updatedBy: user.username
  };

  if (!dbCache.masterItems) dbCache.masterItems = [];
  dbCache.masterItems.unshift(newMaster);

  const parsedQty = quantity !== undefined ? Math.max(1, parseInt(quantity) || 1) : 1;
  const targetDate = (transactionDate || dateRepaired || nowIso.split('T')[0]).trim();
  const initialTx: StockTransaction = {
    id: `tx-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    itemId: masterId,
    transactionDate: targetDate,
    quantity: parsedQty,
    createdAt: nowIso,
    createdBy: user.username
  };

  if (!dbCache.stockTransactions) dbCache.stockTransactions = [];
  dbCache.stockTransactions.unshift(initialTx);

  dbCache.activities.unshift({
    id: `act-${Date.now()}`,
    targetId: masterId,
    itemName: newMaster.itemName,
    category: newMaster.category,
    type: 'INVENTORY',
    action: 'Added',
    username: user.username,
    timestamp: nowIso
  });

  saveDB(dbCache);

  const summary = buildInventorySummaries([newMaster], dbCache.stockTransactions)[0];
  res.status(201).json({ message: 'Barang berhasil ditambahkan.', data: summary });
});

// 21. Backward-compatible Update Inventory Item
app.put('/api/inventory/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;
  const { itemName, photoUrl, category, remark, isActive } = req.body;

  const master = (dbCache.masterItems || []).find(m => m.id === id);
  if (!master) {
    res.status(404).json({ error: 'Inventory item not found.' });
    return;
  }

  if (itemName && itemName.trim()) master.itemName = itemName.trim();
  if (category && ['PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS'].includes(category)) master.category = category as Category;
  if (remark !== undefined) master.remark = remark && remark.trim() ? remark.trim() : null;
  if (photoUrl !== undefined) master.photoUrl = photoUrl && photoUrl.trim() ? photoUrl.trim() : null;
  if (typeof isActive === 'boolean') master.isActive = isActive;

  const nowIso = new Date().toISOString();
  master.updatedAt = nowIso;
  master.updatedBy = user.username;

  dbCache.activities.unshift({
    id: `act-${Date.now()}`,
    targetId: master.id,
    itemName: master.itemName,
    category: master.category,
    type: 'INVENTORY',
    action: 'Edited',
    username: user.username,
    timestamp: nowIso
  });

  saveDB(dbCache);

  const updatedSummary = buildInventorySummaries([master], dbCache.stockTransactions)[0];
  res.json({ message: 'Inventory item updated successfully.', data: updatedSummary });
});

// 22. Backward-compatible Delete Inventory
app.delete('/api/inventory/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;

  const master = (dbCache.masterItems || []).find(m => m.id === id);
  if (!master) {
    res.status(404).json({ error: 'Inventory item not found.' });
    return;
  }

  const hasTxs = (dbCache.stockTransactions || []).some(t => t.itemId === id);
  if (hasTxs) {
    master.isActive = false;
    master.updatedAt = new Date().toISOString();
    master.updatedBy = user.username;
    saveDB(dbCache);
    res.json({ message: 'Barang diarsipkan karena memiliki riwayat stok.' });
    return;
  }

  dbCache.masterItems = dbCache.masterItems.filter(m => m.id !== id);
  saveDB(dbCache);
  res.json({ message: 'Inventory item deleted successfully.' });
});


// 15. Upload Photo (Base64 or binary)
app.post('/api/upload', requireAuth, (req: Request, res: Response) => {
  try {
    const { imageBase64, filename } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: 'Image data is required.' });
      return;
    }

    const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1].toLowerCase();
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(mime)) {
        res.status(400).json({ error: 'Only JPG, PNG, and WebP images are allowed.' });
        return;
      }
      ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(imageBase64, 'base64');
    }

    // Limit to 10MB
    if (buffer.length > 10 * 1024 * 1024) {
      res.status(400).json({ error: 'Image size exceeds 10MB limit.' });
      return;
    }

    const uniqueName = `upload-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);
    fs.writeFileSync(filePath, buffer);

    res.json({
      url: `/uploads/${uniqueName}`
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to upload image. Please try again.' });
  }
});

// ========================
// PURCHASE ORDER ROUTES
// ========================

// 16. Get Purchase Orders with filter & pagination
app.get('/api/po', requireAuth, (req: Request, res: Response) => {
  const {
    search,
    status,
    month,
    user,
    dateFrom,
    dateTo,
    sortBy,
    page = '1',
    limit = '50'
  } = req.query as Record<string, string>;

  const filtered = filterPurchaseOrders(dbCache.purchaseOrders || [], {
    search,
    status: status as any,
    month,
    user,
    dateFrom,
    dateTo,
    sortBy: sortBy as any
  });

  const sorted = sortPurchaseOrders(filtered, (sortBy as any) || 'updated-newest');

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const total = sorted.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = sorted.slice(startIndex, startIndex + limitNum);

  res.json({
    data: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1
  });
});

// 17. Get Purchase Order Stats
app.get('/api/po/stats', requireAuth, (req: Request, res: Response) => {
  const stats = computePOStats(dbCache.purchaseOrders || [], new Date());
  res.json(stats);
});

// 18. Get Single Purchase Order
app.get('/api/po/:id', requireAuth, (req: Request, res: Response) => {
  const item = (dbCache.purchaseOrders || []).find((p) => p.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Purchase Order item not found.' });
    return;
  }
  res.json({ data: item });
});

// 19. Add Purchase Order
app.post('/api/po', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { itemName, photoUrl, dateOrder, dateArrival, quantity, forUse, remarks, status } = req.body;

  if (!itemName || !itemName.trim()) {
    res.status(400).json({ error: 'Item name is required.' });
    return;
  }
  if (!dateOrder || !dateOrder.trim()) {
    res.status(400).json({ error: 'Date order is required.' });
    return;
  }
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    res.status(400).json({ error: 'Quantity must be at least 1 unit.' });
    return;
  }
  if (!status || !['BELUM DATANG', 'SUDAH DATANG'].includes(status)) {
    res.status(400).json({ error: 'Status must be BELUM DATANG or SUDAH DATANG.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const newPO: PurchaseOrderItem = {
    id: `po-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    itemName: itemName.trim(),
    photoUrl: photoUrl && photoUrl.trim() ? photoUrl.trim() : createSampleSvg(itemName.trim(), 'PO ITEMS', '#0284c7'),
    dateOrder: dateOrder.trim(),
    dateArrival: dateArrival && dateArrival.trim() ? dateArrival.trim() : null,
    quantity: qty,
    forUse: forUse && forUse.trim() ? forUse.trim() : 'IT Department',
    remarks: remarks && remarks.trim() ? remarks.trim() : null,
    status,
    createdAt: nowIso,
    createdBy: user.username,
    updatedAt: nowIso,
    updatedBy: user.username
  };

  if (!dbCache.purchaseOrders) {
    dbCache.purchaseOrders = [];
  }
  dbCache.purchaseOrders.unshift(newPO);

  // Add activity log
  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: newPO.id,
    itemName: newPO.itemName,
    category: 'PURCHASE ORDER',
    type: 'PURCHASE ORDER',
    action: 'Added',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);

  res.status(201).json({
    message: 'Purchase Order added successfully.',
    data: newPO
  });
});

// 20. Update Purchase Order
app.put('/api/po/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;
  const { itemName, photoUrl, dateOrder, dateArrival, quantity, forUse, remarks, status } = req.body;

  const idx = (dbCache.purchaseOrders || []).findIndex((p) => p.id === id);
  if (idx === -1) {
    res.status(404).json({ error: 'Purchase Order not found.' });
    return;
  }

  const existing = dbCache.purchaseOrders[idx];

  if (!itemName || !itemName.trim()) {
    res.status(400).json({ error: 'Item name is required.' });
    return;
  }
  if (!dateOrder || !dateOrder.trim()) {
    res.status(400).json({ error: 'Date order is required.' });
    return;
  }
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    res.status(400).json({ error: 'Quantity must be at least 1 unit.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const updatedPO: PurchaseOrderItem = {
    ...existing,
    itemName: itemName.trim(),
    photoUrl: photoUrl && photoUrl.trim() ? photoUrl.trim() : existing.photoUrl,
    dateOrder: dateOrder.trim(),
    dateArrival: dateArrival && dateArrival.trim() ? dateArrival.trim() : null,
    quantity: qty,
    forUse: forUse && forUse.trim() ? forUse.trim() : existing.forUse,
    remarks: remarks !== undefined ? (remarks && remarks.trim() ? remarks.trim() : null) : existing.remarks,
    status: status && ['BELUM DATANG', 'SUDAH DATANG'].includes(status) ? status : existing.status,
    updatedAt: nowIso,
    updatedBy: user.username
  };

  dbCache.purchaseOrders[idx] = updatedPO;

  // Add activity log
  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: updatedPO.id,
    itemName: updatedPO.itemName,
    category: 'PURCHASE ORDER',
    type: 'PURCHASE ORDER',
    action: 'Edited',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);

  res.json({
    message: 'Purchase Order updated successfully.',
    data: updatedPO
  });
});

// 21. Delete Purchase Order
app.delete('/api/po/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;

  const item = (dbCache.purchaseOrders || []).find((p) => p.id === id);
  if (!item) {
    res.status(404).json({ error: 'Purchase Order not found.' });
    return;
  }

  dbCache.purchaseOrders = (dbCache.purchaseOrders || []).filter((p) => p.id !== id);

  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: id,
    itemName: item.itemName,
    category: 'PURCHASE ORDER',
    type: 'PURCHASE ORDER',
    action: 'Deleted',
    username: user.username,
    timestamp: new Date().toISOString()
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);

  res.json({ message: 'Purchase Order deleted successfully.' });
});


// 22. Export Purchase Orders to Excel
app.get('/api/export/excel-po', requireAuth, async (req: Request, res: Response) => {
  try {
    const { month, status, user, search } = req.query as Record<string, string>;

    const itemsToExport = sortPurchaseOrders(
      filterPurchaseOrders(dbCache.purchaseOrders || [], {
        month,
        status: status as any,
        user,
        search
      }),
      'order-newest'
    );

    const monthParsed = parseMonthFilter(month);
    const monthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]} ${monthParsed.year}` : 'ALL MONTHS';
    const worksheetTitle = monthParsed ? `PO_${MONTH_NAMES[monthParsed.month - 1]}` : 'PURCHASE_ORDERS';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hotel IT Department';
    workbook.lastModifiedBy = ((req as any).user as UserAccount).username;
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet(worksheetTitle, {
      pageSetup: { orientation: 'landscape', fitToPage: true },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
    });

    // Title Row 1
    sheet.mergeCells('A1:L1');
    const titleCell1 = sheet.getCell('A1');
    titleCell1.value = 'HOTEL IT - PURCHASE ORDER DATA';
    titleCell1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }
    };
    sheet.getRow(1).height = 36;

    // Subtitle Row 2
    sheet.mergeCells('A2:L2');
    const titleCell2 = sheet.getCell('A2');
    titleCell2.value = `DATA BULAN ${monthName.toUpperCase()}`;
    titleCell2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    sheet.getRow(2).height = 28;

    // Spacing Row 3
    sheet.getRow(3).height = 10;

    // Table Header Row 4
    const headers = [
      'No',
      'Foto',
      'Item Name',
      'Tanggal Order',
      'Tanggal Kedatangan',
      'Jumlah Unit',
      'For Use',
      'Remarks',
      'Status',
      'Added By',
      'Last Edited By',
      'Last Updated'
    ];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 30;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0284C7' }
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF38BDF8' } },
        right: { style: 'thin', color: { argb: 'FF38BDF8' } }
      };
    });

    // Column widths
    sheet.columns = [
      { key: 'no', width: 6 },
      { key: 'photo', width: 14 },
      { key: 'name', width: 32 },
      { key: 'dateOrder', width: 18 },
      { key: 'dateArrival', width: 20 },
      { key: 'qty', width: 14 },
      { key: 'forUse', width: 26 },
      { key: 'remarks', width: 30 },
      { key: 'status', width: 18 },
      { key: 'addedBy', width: 16 },
      { key: 'editedBy', width: 16 },
      { key: 'lastUpdated', width: 22 }
    ];

    sheet.autoFilter = 'A4:L4';

    let currentRowIdx = 5;
    for (let i = 0; i < itemsToExport.length; i++) {
      const po = itemsToExport[i];
      const row = sheet.getRow(currentRowIdx);
      row.height = 65;

      row.getCell(1).value = i + 1;
      row.getCell(2).value = '';
      row.getCell(3).value = po.itemName;
      row.getCell(4).value = formatDate(po.dateOrder);
      row.getCell(5).value = po.dateArrival ? formatDate(po.dateArrival) : 'Menunggu kedatangan';
      row.getCell(6).value = `${po.quantity} Unit`;
      row.getCell(7).value = po.forUse;
      row.getCell(8).value = po.remarks || '-';
      row.getCell(9).value = po.status;
      row.getCell(10).value = po.createdBy;
      row.getCell(11).value = po.updatedBy;
      row.getCell(12).value = formatDateTime(po.updatedAt);

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };

      // Highlight status
      if (po.status === 'SUDAH DATANG') {
        row.getCell(9).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF065F46' } };
      } else {
        row.getCell(9).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF9A3412' } };
      }

      const bgColor = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
      for (let c = 1; c <= 12; c++) {
        const cell = row.getCell(c);
        if (c !== 9) {
          cell.font = { name: 'Arial', size: 9 };
        }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }

      // Try embedding image
      try {
        let imgBuffer: Buffer | null = null;
        let imgExt: 'png' | 'jpeg' = 'png';

        if (po.photoUrl && po.photoUrl.startsWith('data:image/')) {
          const match = po.photoUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
          if (match) {
            imgExt = match[1].includes('jpeg') || match[1].includes('jpg') ? 'jpeg' : 'png';
            imgBuffer = Buffer.from(match[2], 'base64');
          }
        } else if (po.photoUrl && po.photoUrl.startsWith('/uploads/')) {
          const diskPath = path.join(DATA_DIR, po.photoUrl);
          if (fs.existsSync(diskPath)) {
            imgBuffer = fs.readFileSync(diskPath);
            imgExt = diskPath.endsWith('.jpg') || diskPath.endsWith('.jpeg') ? 'jpeg' : 'png';
          }
        }

        if (imgBuffer && (imgExt === 'png' || imgExt === 'jpeg')) {
          const imageId = workbook.addImage({
            buffer: imgBuffer as any,
            extension: imgExt
          });
          sheet.addImage(imageId, {
            tl: { col: 1.15, row: currentRowIdx - 1 + 0.1 },
            ext: { width: 68, height: 55 }
          });
        }
      } catch (err) {
        console.warn('Could not embed image for PO item', po.id, err);
      }

      currentRowIdx++;
    }

    const safeMonthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]}_${monthParsed.year}` : 'ALL_MONTHS';
    const downloadFileName = `HOTEL_IT_PURCHASE_ORDER_${safeMonthName}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('PO Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate Purchase Order Excel file.' });
  }
});

// 23. Export to Excel (Master Catalog or Monthly Inbound Transactions)
app.get('/api/export/excel', requireAuth, async (req: Request, res: Response) => {
  try {
    const { type, month, category, user, search } = req.query as Record<string, string>;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hotel IT Department';
    workbook.lastModifiedBy = ((req as any).user as UserAccount).username;
    workbook.created = new Date();
    workbook.modified = new Date();

    const isMonthlyExport = type === 'monthly' || (month && month.trim() !== '' && type !== 'master');

    if (isMonthlyExport) {
      // B. Export Monthly Inventory Inbound Transactions
      const monthParsed = parseMonthFilter(month) || {
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear()
      };
      const monthName = `${MONTH_NAMES[monthParsed.month - 1]} ${monthParsed.year}`;
      const worksheetTitle = `INBOUND_${MONTH_NAMES[monthParsed.month - 1]}_${monthParsed.year}`.slice(0, 31);

      const monthlyTxList = getMonthlyTransactions(
        dbCache.masterItems || [],
        dbCache.stockTransactions || [],
        monthParsed.month,
        monthParsed.year,
        category,
        search
      );

      // Filter by user if specified
      const filteredTxList = user && user.trim()
        ? monthlyTxList.filter(t => t.createdBy.toLowerCase() === user.trim().toLowerCase())
        : monthlyTxList;

      const sheet = workbook.addWorksheet(worksheetTitle, {
        pageSetup: { orientation: 'landscape', fitToPage: true },
        views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
      });

      // Title Row 1
      sheet.mergeCells('A1:G1');
      const titleCell1 = sheet.getCell('A1');
      titleCell1.value = 'HOTEL IT INVENTORY - LAPORAN PENAMBAHAN STOK BULANAN';
      titleCell1.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell1.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF0F172A' }
      };
      sheet.getRow(1).height = 34;

      // Subtitle Row 2
      sheet.mergeCells('A2:G2');
      const titleCell2 = sheet.getCell('A2');
      titleCell2.value = `PERIODE: ${monthName.toUpperCase()}`;
      titleCell2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
      titleCell2.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E293B' }
      };
      sheet.getRow(2).height = 26;

      sheet.getRow(3).height = 10;

      // Header Row 4
      const headers = [
        'No',
        'Tanggal Transaksi',
        'Nama Barang',
        'Kategori',
        'Jumlah Unit Ditambahkan',
        'Pengguna (Added By)',
        'Remark Barang'
      ];
      const headerRow = sheet.getRow(4);
      headerRow.values = headers;
      headerRow.height = 28;

      headerRow.eachCell((cell) => {
        cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF334155' }
        };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF0F172A' } },
          bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
          left: { style: 'thin', color: { argb: 'FF475569' } },
          right: { style: 'thin', color: { argb: 'FF475569' } }
        };
      });

      sheet.columns = [
        { key: 'no', width: 6 },
        { key: 'txDate', width: 20 },
        { key: 'itemName', width: 34 },
        { key: 'category', width: 22 },
        { key: 'qty', width: 22 },
        { key: 'addedBy', width: 22 },
        { key: 'remark', width: 30 }
      ];

      sheet.autoFilter = 'A4:G4';

      let totalUnitsAdded = 0;
      let currentRowIdx = 5;

      for (let i = 0; i < filteredTxList.length; i++) {
        const tx = filteredTxList[i];
        totalUnitsAdded += tx.quantity;
        const row = sheet.getRow(currentRowIdx);
        row.height = 24;

        row.getCell(1).value = i + 1;
        row.getCell(2).value = formatDate(tx.transactionDate);
        row.getCell(3).value = tx.itemName;
        row.getCell(4).value = tx.category;
        row.getCell(5).value = tx.quantity;
        row.getCell(6).value = tx.createdBy;
        row.getCell(7).value = tx.remark || '-';

        row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
        row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
        row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };

        const bgColor = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
        for (let c = 1; c <= 7; c++) {
          const cell = row.getCell(c);
          cell.font = { name: 'Arial', size: 9 };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        }
        currentRowIdx++;
      }

      // Summary Total Row
      const summaryRow = sheet.getRow(currentRowIdx);
      summaryRow.height = 26;
      summaryRow.getCell(1).value = 'TOTAL';
      sheet.mergeCells(`A${currentRowIdx}:D${currentRowIdx}`);
      summaryRow.getCell(1).font = { name: 'Arial', size: 10, bold: true };
      summaryRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      summaryRow.getCell(5).value = totalUnitsAdded;
      summaryRow.getCell(5).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0284C7' } };
      summaryRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      summaryRow.getCell(6).value = `${filteredTxList.length} Transaksi`;
      summaryRow.getCell(6).font = { name: 'Arial', size: 9, italic: true };
      summaryRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };

      for (let c = 1; c <= 7; c++) {
        const cell = summaryRow.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
        cell.border = {
          top: { style: 'medium', color: { argb: 'FFCBD5E1' } },
          bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } }
        };
      }

      const safeMonthName = `${MONTH_NAMES[monthParsed.month - 1]}_${monthParsed.year}`;
      const downloadFileName = `HOTEL_IT_MONTHLY_INBOUND_${safeMonthName}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
      await workbook.xlsx.write(res);
      res.end();
      return;
    }

    // A. Export Master Item Catalog Summary
    const summaries = buildInventorySummaries(dbCache.masterItems || [], dbCache.stockTransactions || []);
    const filteredSummaries = filterInventorySummaries(summaries, {
      category,
      search,
      month
    });

    const itemsToExport = sortInventory(filteredSummaries, 'date-newest');

    const worksheetTitle = 'MASTER_INVENTORY';
    const sheet = workbook.addWorksheet(worksheetTitle, {
      pageSetup: { orientation: 'landscape', fitToPage: true },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
    });

    // Title Row 1
    sheet.mergeCells('A1:J1');
    const titleCell1 = sheet.getCell('A1');
    titleCell1.value = 'HOTEL IT INVENTORY - MASTER ITEM CATALOG';
    titleCell1.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F172A' }
    };
    sheet.getRow(1).height = 34;

    // Subtitle Row 2
    sheet.mergeCells('A2:J2');
    const titleCell2 = sheet.getCell('A2');
    titleCell2.value = `RINGKASAN MASTER ITEM & STATUS STOK (${itemsToExport.length} ITEM)`;
    titleCell2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' }
    };
    sheet.getRow(2).height = 26;

    sheet.getRow(3).height = 10;

    // Table Header Row 4
    const headers = [
      'No',
      'Foto',
      'Nama Barang',
      'Kategori',
      'Remark',
      'Total Unit Tersedia',
      'Jumlah Transaksi',
      'Penambahan Terakhir',
      'Ditambahkan Terakhir Oleh',
      'Unit Transaksi Terakhir'
    ];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 30;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF334155' }
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF475569' } },
        right: { style: 'thin', color: { argb: 'FF475569' } }
      };
    });

    sheet.columns = [
      { key: 'no', width: 6 },
      { key: 'photo', width: 14 },
      { key: 'name', width: 34 },
      { key: 'category', width: 22 },
      { key: 'remark', width: 28 },
      { key: 'totalQuantity', width: 18 },
      { key: 'transactionCount', width: 18 },
      { key: 'lastDate', width: 20 },
      { key: 'lastUser', width: 24 },
      { key: 'lastQty', width: 20 }
    ];

    sheet.autoFilter = 'A4:J4';

    let currentRowIdx = 5;
    for (let i = 0; i < itemsToExport.length; i++) {
      const item = itemsToExport[i];
      const row = sheet.getRow(currentRowIdx);
      row.height = 60;

      row.getCell(1).value = i + 1;
      row.getCell(2).value = '';
      row.getCell(3).value = item.itemName;
      row.getCell(4).value = item.category;
      row.getCell(5).value = item.remark || '-';
      row.getCell(6).value = item.totalQuantity ?? item.quantity ?? 0;
      row.getCell(7).value = `${item.transactionCount ?? 1}x`;
      row.getCell(8).value = formatDate(item.lastTransactionDate || item.dateRepaired);
      row.getCell(9).value = item.lastAddedBy || item.createdBy || '-';
      row.getCell(10).value = item.lastTransactionQuantity !== undefined ? `${item.lastTransactionQuantity} Unit` : '-';

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };

      const bgColor = i % 2 === 0 ? 'FFF8FAFC' : 'FFFFFFFF';
      for (let c = 1; c <= 10; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 9 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }

      // Try embedding image
      if (item.photoUrl) {
        try {
          let imgBuffer: Buffer | null = null;
          let imgExt: 'png' | 'jpeg' = 'png';

          if (item.photoUrl.startsWith('data:image/')) {
            const match = item.photoUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
            if (match) {
              imgExt = match[1].includes('jpeg') || match[1].includes('jpg') ? 'jpeg' : 'png';
              imgBuffer = Buffer.from(match[2], 'base64');
            }
          } else if (item.photoUrl.startsWith('/uploads/')) {
            const diskPath = path.join(DATA_DIR, item.photoUrl);
            if (fs.existsSync(diskPath)) {
              imgBuffer = fs.readFileSync(diskPath);
              imgExt = diskPath.endsWith('.jpg') || diskPath.endsWith('.jpeg') ? 'jpeg' : 'png';
            }
          }

          if (imgBuffer && (imgExt === 'png' || imgExt === 'jpeg')) {
            const imageId = workbook.addImage({
              buffer: imgBuffer as any,
              extension: imgExt
            });
            sheet.addImage(imageId, {
              tl: { col: 1.15, row: currentRowIdx - 1 + 0.1 },
              ext: { width: 68, height: 50 }
            });
          }
        } catch (err) {
          console.warn('Could not embed image for item', item.id, err);
        }
      }

      currentRowIdx++;
    }

    const downloadFileName = 'HOTEL_IT_MASTER_INVENTORY.xlsx';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate Excel file.' });
  }
});

// ==========================================
// PRELOVED MANAGEMENT ROUTES
// ==========================================

// 24. Get Preloved List with filters
app.get('/api/preloved', requireAuth, (req: Request, res: Response) => {
  const {
    search,
    category,
    month,
    user,
    dateFrom,
    dateTo,
    sortBy,
    page = '1',
    limit = '50'
  } = req.query as Record<string, string>;

  const filtered = filterPreloved(dbCache.preloved || [], {
    search,
    category,
    month,
    user,
    dateFrom,
    dateTo
  });

  const sorted = sortPreloved(filtered, (sortBy as any) || 'updated-newest');

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 50;
  const total = sorted.length;
  const startIndex = (pageNum - 1) * limitNum;
  const paginated = sorted.slice(startIndex, startIndex + limitNum);

  res.json({
    data: paginated,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1
  });
});

// 25. Get Preloved Stats
app.get('/api/preloved/stats', requireAuth, (req: Request, res: Response) => {
  const stats = computePrelovedStats(dbCache.preloved || [], new Date());
  res.json(stats);
});

// 26. Get Single Preloved Item
app.get('/api/preloved/:id', requireAuth, (req: Request, res: Response) => {
  const item = (dbCache.preloved || []).find(i => i.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Preloved item not found.' });
    return;
  }
  res.json({ data: item });
});

// 27. Add New Preloved Item
app.post('/api/preloved', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { itemName, photoUrl, category, dateRepaired, serialNumber, remark, quantity } = req.body;

  if (!itemName || !itemName.trim()) {
    res.status(400).json({ error: 'Item name is required.' });
    return;
  }
  if (!photoUrl || !photoUrl.trim()) {
    res.status(400).json({ error: 'Photo is required for new preloved items.' });
    return;
  }
  if (!category || !['PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS'].includes(category)) {
    res.status(400).json({ error: 'Category must be PC ITEMS, NETWORK ITEMS, or CCTV & TV ITEMS.' });
    return;
  }
  if (!dateRepaired || !dateRepaired.trim()) {
    res.status(400).json({ error: 'Date repaired is required.' });
    return;
  }

  const nowIso = new Date().toISOString();
  const newPrev: PrelovedItem = {
    id: `prev-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    itemName: itemName.trim(),
    photoUrl: photoUrl.trim(),
    category,
    dateRepaired: dateRepaired.trim(),
    quantity: quantity !== undefined ? Math.max(1, parseInt(quantity) || 1) : 1,
    serialNumber: serialNumber && serialNumber.trim() ? serialNumber.trim() : null,
    remark: remark && remark.trim() ? remark.trim() : null,
    createdAt: nowIso,
    createdBy: user.username,
    updatedAt: nowIso,
    updatedBy: user.username
  };

  if (!dbCache.preloved) {
    dbCache.preloved = [];
  }
  dbCache.preloved.unshift(newPrev);

  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: newPrev.id,
    itemName: newPrev.itemName,
    category: newPrev.category,
    type: 'PRELOVED',
    action: 'Added',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);

  res.status(201).json({
    message: 'Preloved item created successfully.',
    data: newPrev
  });
});

// 28. Update Preloved Item
app.put('/api/preloved/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;
  const { itemName, photoUrl, category, dateRepaired, serialNumber, remark, quantity } = req.body;

  const prevIdx = (dbCache.preloved || []).findIndex(i => i.id === id);
  if (prevIdx === -1) {
    res.status(404).json({ error: 'Preloved item not found.' });
    return;
  }

  const oldItem = dbCache.preloved[prevIdx];
  const nowIso = new Date().toISOString();

  const updatedItem: PrelovedItem = {
    ...oldItem,
    itemName: itemName !== undefined ? itemName.trim() : oldItem.itemName,
    photoUrl: photoUrl !== undefined ? photoUrl.trim() : oldItem.photoUrl,
    category: category !== undefined ? category : oldItem.category,
    dateRepaired: dateRepaired !== undefined ? dateRepaired.trim() : oldItem.dateRepaired,
    quantity: quantity !== undefined ? Math.max(1, parseInt(quantity) || 1) : (oldItem.quantity || 1),
    serialNumber: serialNumber !== undefined ? (serialNumber.trim() || null) : oldItem.serialNumber,
    remark: remark !== undefined ? (remark.trim() || null) : oldItem.remark,
    updatedAt: nowIso,
    updatedBy: user.username
  };

  dbCache.preloved[prevIdx] = updatedItem;

  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: updatedItem.id,
    itemName: updatedItem.itemName,
    category: updatedItem.category,
    type: 'PRELOVED',
    action: 'Edited',
    username: user.username,
    timestamp: nowIso
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);

  res.json({
    message: 'Preloved item updated successfully.',
    data: updatedItem
  });
});

// 29. Delete Preloved Item
app.delete('/api/preloved/:id', requireAuth, (req: Request, res: Response) => {
  const user = (req as any).user as UserAccount;
  const { id } = req.params;

  const item = (dbCache.preloved || []).find(i => i.id === id);
  if (!item) {
    res.status(404).json({ error: 'Preloved item not found.' });
    return;
  }

  dbCache.preloved = (dbCache.preloved || []).filter(i => i.id !== id);

  const activity: ActivityRecord = {
    id: `act-${Date.now()}`,
    targetId: id,
    itemName: item.itemName,
    category: item.category,
    type: 'PRELOVED',
    action: 'Deleted',
    username: user.username,
    timestamp: new Date().toISOString()
  };
  dbCache.activities.unshift(activity);

  saveDB(dbCache);

  res.json({ message: 'Preloved item deleted successfully.' });
});

// 30. Export Preloved to Excel
app.get('/api/export/excel-preloved', requireAuth, async (req: Request, res: Response) => {
  try {
    const { month, category, user, search } = req.query as Record<string, string>;

    const itemsToExport = sortPreloved(
      filterPreloved(dbCache.preloved || [], {
        month,
        category,
        user,
        search
      }),
      'date-newest'
    );

    const monthParsed = parseMonthFilter(month);
    const monthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]} ${monthParsed.year}` : 'ALL MONTHS';
    const worksheetTitle = monthParsed ? `PRELOVED_${MONTH_NAMES[monthParsed.month - 1]}` : 'PRELOVED_DATABASE';

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hotel IT Department';
    workbook.lastModifiedBy = ((req as any).user as UserAccount).username;
    workbook.created = new Date();
    workbook.modified = new Date();

    const sheet = workbook.addWorksheet(worksheetTitle, {
      pageSetup: { orientation: 'landscape', fitToPage: true },
      views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
    });

    // Title Row 1
    sheet.mergeCells('A1:K1');
    const titleCell1 = sheet.getCell('A1');
    titleCell1.value = 'HOTEL IT - PRELOVED DATABASE';
    titleCell1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell1.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell1.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E1B4B' }
    };
    sheet.getRow(1).height = 36;

    // Subtitle Row 2
    sheet.mergeCells('A2:K2');
    const titleCell2 = sheet.getCell('A2');
    titleCell2.value = `DATA BULAN ${monthName.toUpperCase()}${category && category !== 'All' ? ` • KATEGORI: ${category}` : ''}`;
    titleCell2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell2.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell2.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF312E81' }
    };
    sheet.getRow(2).height = 28;

    // Spacing Row 3
    sheet.getRow(3).height = 10;

    // Table Header Row 4
    const headers = [
      'No',
      'Foto',
      'Item Name',
      'Category',
      'Tanggal Dibereskan',
      'Jumlah Unit',
      'Serial Number',
      'Remark',
      'Added By',
      'Last Edited By',
      'Last Updated'
    ];
    const headerRow = sheet.getRow(4);
    headerRow.values = headers;
    headerRow.height = 30;

    headerRow.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF7C3AED' }
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF4338CA' } },
        bottom: { style: 'medium', color: { argb: 'FF4338CA' } },
        left: { style: 'thin', color: { argb: 'FFC4B5FD' } },
        right: { style: 'thin', color: { argb: 'FFC4B5FD' } }
      };
    });

    // Column widths
    sheet.columns = [
      { key: 'no', width: 6 },
      { key: 'photo', width: 14 },
      { key: 'name', width: 32 },
      { key: 'category', width: 22 },
      { key: 'dateRepaired', width: 20 },
      { key: 'quantity', width: 14 },
      { key: 'sn', width: 20 },
      { key: 'remark', width: 26 },
      { key: 'addedBy', width: 16 },
      { key: 'editedBy', width: 16 },
      { key: 'lastUpdated', width: 22 }
    ];

    sheet.autoFilter = 'A4:K4';

    let currentRowIdx = 5;
    for (let i = 0; i < itemsToExport.length; i++) {
      const item = itemsToExport[i];
      const row = sheet.getRow(currentRowIdx);
      row.height = 65;

      row.getCell(1).value = i + 1;
      row.getCell(2).value = '';
      row.getCell(3).value = item.itemName;
      row.getCell(4).value = item.category;
      row.getCell(5).value = formatDate(item.dateRepaired);
      row.getCell(6).value = item.quantity ?? 1;
      row.getCell(7).value = item.serialNumber || '-';
      row.getCell(8).value = item.remark || '-';
      row.getCell(9).value = item.createdBy;
      row.getCell(10).value = item.updatedBy;
      row.getCell(11).value = formatDateTime(item.updatedAt);

      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(11).alignment = { horizontal: 'center', vertical: 'middle' };

      const bgColor = i % 2 === 0 ? 'FFF5F3FF' : 'FFFFFFFF';
      for (let c = 1; c <= 11; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Arial', size: 9 };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: bgColor }
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      }

      // Embed photo
      try {
        let imgBuffer: Buffer | null = null;
        let imgExt: 'png' | 'jpeg' = 'png';

        if (item.photoUrl && item.photoUrl.startsWith('data:image/')) {
          const match = item.photoUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
          if (match) {
            imgExt = match[1].includes('jpeg') || match[1].includes('jpg') ? 'jpeg' : 'png';
            imgBuffer = Buffer.from(match[2], 'base64');
          }
        } else if (item.photoUrl && item.photoUrl.startsWith('/uploads/')) {
          const diskPath = path.join(DATA_DIR, item.photoUrl);
          if (fs.existsSync(diskPath)) {
            imgBuffer = fs.readFileSync(diskPath);
            imgExt = diskPath.endsWith('.jpg') || diskPath.endsWith('.jpeg') ? 'jpeg' : 'png';
          }
        }

        if (imgBuffer && (imgExt === 'png' || imgExt === 'jpeg')) {
          const imageId = workbook.addImage({
            buffer: imgBuffer as any,
            extension: imgExt
          });
          sheet.addImage(imageId, {
            tl: { col: 1.15, row: currentRowIdx - 1 + 0.1 },
            ext: { width: 68, height: 55 }
          });
        }
      } catch (err) {
        console.warn('Could not embed image for Preloved item', item.id, err);
      }

      currentRowIdx++;
    }

    const safeMonthName = monthParsed ? `${MONTH_NAMES[monthParsed.month - 1]}_${monthParsed.year}` : 'ALL_MONTHS';
    const downloadFileName = `HOTEL_IT_PRELOVED_${safeMonthName}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Preloved Excel export error:', error);
    res.status(500).json({ error: 'Failed to generate Preloved Excel file.' });
  }
});

// ==========================================
// SYSTEM & DEVOPS HEALTH CHECK ENDPOINTS
// ==========================================

// Health check endpoint for uptime monitoring, Docker, Render, Railway, Kubernetes, VPS
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    nodeVersion: process.version,
    environment: process.env.NODE_ENV || 'development',
    port: PORT,
    stats: {
      users: dbCache.users.length,
      inventory: dbCache.inventory.length,
      purchaseOrders: (dbCache.purchaseOrders || []).length,
      preloved: (dbCache.preloved || []).length,
      activities: (dbCache.activities || []).length
    }
  });
});

// Setup Vite development or production static server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
