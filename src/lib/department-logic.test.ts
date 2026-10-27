import test from 'node:test';
import assert from 'node:assert';
import { buildInventorySummaries } from './inventory-logic';
import type { MasterItem, StockTransaction, DepartmentMovement } from './types';

test('Department movement preserves stock invariant', () => {
  const master: MasterItem = {
    id: 'item-test-1',
    itemName: 'Access Point Test',
    category: 'NETWORK ITEMS',
    createdAt: '2026-10-01T00:00:00Z',
    createdBy: 'ITMANAGER',
    updatedAt: '2026-10-01T00:00:00Z',
    updatedBy: 'ITMANAGER'
  };

  const inboundTxs: StockTransaction[] = [
    {
      id: 'tx-1',
      itemId: 'item-test-1',
      transactionDate: '2026-10-01',
      quantity: 10,
      createdAt: '2026-10-01T00:00:00Z',
      createdBy: 'ITMANAGER'
    }
  ];

  // 1. Initial State: 10 inbound, 0 movements -> 10 available
  const initialSummaries = buildInventorySummaries([master], inboundTxs, []);
  assert.strictEqual(initialSummaries[0].totalQuantity, 10);

  // 2. Transfer 4 units to Front Office
  const movements: DepartmentMovement[] = [
    {
      id: 'mov-1',
      itemId: 'item-test-1',
      department: 'Front Office',
      type: 'TRANSFER_TO_DEPARTMENT',
      quantity: 4,
      date: '2026-10-10',
      createdBy: 'ITMANAGER',
      createdAt: '2026-10-10T00:00:00Z'
    }
  ];
  const postTransferSummaries = buildInventorySummaries([master], inboundTxs, movements);
  assert.strictEqual(postTransferSummaries[0].totalQuantity, 6);
  assert.strictEqual(postTransferSummaries[0].totalInboundQuantity, 10);
  assert.strictEqual(postTransferSummaries[0].totalTransferredQuantity, 4);
  assert.strictEqual(postTransferSummaries[0].totalReturnedQuantity, 0);

  // 3. Return 1 unit from Front Office to Inventory
  movements.push({
    id: 'mov-2',
    itemId: 'item-test-1',
    department: 'Front Office',
    type: 'RETURN_TO_INVENTORY',
    quantity: 1,
    date: '2026-10-15',
    createdBy: 'ITMANAGER',
    createdAt: '2026-10-15T00:00:00Z'
  });
  const postReturnSummaries = buildInventorySummaries([master], inboundTxs, movements);
  assert.strictEqual(postReturnSummaries[0].totalQuantity, 7);
  assert.strictEqual(postReturnSummaries[0].totalReturnedQuantity, 1);
});
