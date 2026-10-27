/**
 * ==============================================================================
 * HOTEL IT INVENTORY MANAGEMENT - DATA MIGRATION SCRIPT
 * Migrates data from local data/db.json into Supabase PostgreSQL & Auth.
 * ==============================================================================
 * Usage:
 *   npx tsx scripts/migrate-data.ts
 *
 * Requirements:
 *   SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env or environment variables.
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('\n❌ ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided.');
  console.error('Please configure them in your .env file:');
  console.error('  SUPABASE_URL=https://your-project.supabase.co');
  console.error('  SUPABASE_SERVICE_ROLE_KEY=eyJh...\n');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DB_FILE = path.resolve(process.cwd(), 'data', 'db.json');

if (!fs.existsSync(DB_FILE)) {
  console.error(`\n❌ ERROR: Source database file not found at ${DB_FILE}\n`);
  process.exit(1);
}

interface RawUser {
  id: string;
  username: string;
  passwordHash: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface RawDB {
  users: RawUser[];
  inventory: any[];
  purchaseOrders: any[];
  preloved: any[];
  activities: any[];
}

const defaultPasswords: Record<string, string> = {
  ITMANAGER: 'syah',
  ITASSIST: 'ihsan',
  ITTRAINEE: 'andi'
};

async function runMigration() {
  console.log('\n🚀 Starting Hotel IT Data Migration to Supabase...');
  console.log(`Connecting to Supabase: ${SUPABASE_URL}`);

  const rawData: RawDB = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  console.log(`Loaded source data:`);
  console.log(`  - Users: ${rawData.users?.length || 0}`);
  console.log(`  - Inventory items: ${rawData.inventory?.length || 0}`);
  console.log(`  - Purchase orders: ${rawData.purchaseOrders?.length || 0}`);
  console.log(`  - Preloved items: ${rawData.preloved?.length || 0}`);
  console.log(`  - Activities: ${rawData.activities?.length || 0}`);

  // 1. Migrate Users & Profiles
  console.log('\n📦 Step 1: Migrating Users & Profiles...');
  const userMap = new Map<string, string>(); // username -> auth user UUID

  for (const user of rawData.users || []) {
    const email = `${user.username.toLowerCase()}@hotel-it.internal`;
    const tempPassword = defaultPasswords[user.username] || 'HotelIT@2026!';

    console.log(`  Creating Auth user: ${user.username} (${email})...`);

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let authUserId: string | null = null;
    const existing = existingUsers?.users?.find(u => u.email === email);

    if (existing) {
      authUserId = existing.id;
      console.log(`    ℹ️ User ${email} already exists in Auth (ID: ${authUserId}).`);
    } else {
      const { data: newAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          username: user.username,
          role: user.role
        }
      });

      if (authError || !newAuth.user) {
        console.error(`    ❌ Failed to create auth user ${user.username}:`, authError?.message);
        continue;
      }
      authUserId = newAuth.user.id;
      console.log(`    ✅ Created Auth user (ID: ${authUserId}).`);
    }

    userMap.set(user.username, authUserId);

    // Upsert into public.profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUserId,
        username: user.username,
        role: user.role,
        created_at: user.createdAt || new Date().toISOString(),
        updated_at: user.updatedAt || new Date().toISOString()
      }, { onConflict: 'id' });

    if (profileError) {
      console.error(`    ❌ Failed to upsert profile for ${user.username}:`, profileError.message);
    } else {
      console.log(`    ✅ Profile created/updated for ${user.username}.`);
    }
  }

  // 2. Migrate Inventory
  console.log('\n📦 Step 2: Migrating Inventory...');
  if (rawData.inventory && rawData.inventory.length > 0) {
    const inventoryRows = rawData.inventory.map(item => ({
      id: item.id,
      item_name: item.itemName,
      photo_url: item.photoUrl,
      category: item.category,
      date_repaired: item.dateRepaired,
      quantity: item.quantity ?? 1,
      serial_number: item.serialNumber || null,
      remark: item.remark || null,
      created_at: item.createdAt || new Date().toISOString(),
      created_by: item.createdBy || 'ITMANAGER',
      updated_at: item.updatedAt || new Date().toISOString(),
      updated_by: item.updatedBy || 'ITMANAGER'
    }));

    const { error: invError } = await supabaseAdmin
      .from('inventory')
      .upsert(inventoryRows, { onConflict: 'id' });

    if (invError) {
      console.error('  ❌ Error inserting inventory:', invError.message);
    } else {
      console.log(`  ✅ Successfully migrated ${inventoryRows.length} inventory items.`);
    }
  }

  // 3. Migrate Purchase Orders
  console.log('\n📦 Step 3: Migrating Purchase Orders...');
  if (rawData.purchaseOrders && rawData.purchaseOrders.length > 0) {
    const poRows = rawData.purchaseOrders.map(po => ({
      id: po.id,
      item_name: po.itemName,
      photo_url: po.photoUrl,
      date_order: po.dateOrder,
      date_arrival: po.dateArrival || null,
      quantity: po.quantity ?? 1,
      for_use: po.forUse,
      remarks: po.remarks || null,
      status: po.status,
      created_at: po.createdAt || new Date().toISOString(),
      created_by: po.createdBy || 'ITMANAGER',
      updated_at: po.updatedAt || new Date().toISOString(),
      updated_by: po.updatedBy || 'ITMANAGER'
    }));

    const { error: poError } = await supabaseAdmin
      .from('purchase_orders')
      .upsert(poRows, { onConflict: 'id' });

    if (poError) {
      console.error('  ❌ Error inserting purchase orders:', poError.message);
    } else {
      console.log(`  ✅ Successfully migrated ${poRows.length} purchase orders.`);
    }
  }

  // 4. Migrate Preloved
  console.log('\n📦 Step 4: Migrating Preloved Items...');
  if (rawData.preloved && rawData.preloved.length > 0) {
    const prelovedRows = rawData.preloved.map(item => ({
      id: item.id,
      item_name: item.itemName,
      photo_url: item.photoUrl,
      category: item.category,
      date_repaired: item.dateRepaired,
      quantity: item.quantity ?? 1,
      serial_number: item.serialNumber || null,
      remark: item.remark || null,
      created_at: item.createdAt || new Date().toISOString(),
      created_by: item.createdBy || 'ITMANAGER',
      updated_at: item.updatedAt || new Date().toISOString(),
      updated_by: item.updatedBy || 'ITMANAGER'
    }));

    const { error: prevError } = await supabaseAdmin
      .from('preloved')
      .upsert(prelovedRows, { onConflict: 'id' });

    if (prevError) {
      console.error('  ❌ Error inserting preloved items:', prevError.message);
    } else {
      console.log(`  ✅ Successfully migrated ${prelovedRows.length} preloved items.`);
    }
  }

  // 5. Migrate Activities
  console.log('\n📦 Step 5: Migrating Activities...');
  if (rawData.activities && rawData.activities.length > 0) {
    const activityRows = rawData.activities.map(act => ({
      id: act.id,
      item_name: act.itemName,
      category: act.category,
      action: act.action,
      username: act.username,
      timestamp: act.timestamp || new Date().toISOString(),
      target_id: act.targetId || act.inventoryId || null,
      type: act.type || 'INVENTORY'
    }));

    const { error: actError } = await supabaseAdmin
      .from('activities')
      .upsert(activityRows, { onConflict: 'id' });

    if (actError) {
      console.error('  ❌ Error inserting activities:', actError.message);
    } else {
      console.log(`  ✅ Successfully migrated ${activityRows.length} activity records.`);
    }
  }

  console.log('\n🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  console.log('You can now log in using:');
  console.log('  - ITMANAGER / syah');
  console.log('  - ITASSIST  / ihsan');
  console.log('  - ITTRAINEE / andi');
  console.log('Or use their corresponding mapped emails (e.g. itmanager@hotel-it.internal).\n');
}

runMigration().catch(err => {
  console.error('\n❌ Fatal migration error:', err);
  process.exit(1);
});
