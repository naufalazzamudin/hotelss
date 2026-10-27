import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { Header } from './components/Header';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { PurchaseOrderView } from './components/PurchaseOrderView';
import { PrelovedView } from './components/PrelovedView';
import { MonthlyDataView } from './components/MonthlyDataView';
import { MonthlyPOView } from './components/MonthlyPOView';
import { MonthlyPrelovedView } from './components/MonthlyPrelovedView';
import { ExportDataView } from './components/ExportDataView';
import { ExportPOView } from './components/ExportPOView';
import { ExportPrelovedView } from './components/ExportPrelovedView';
import { UserManagementView } from './components/UserManagementView';
import { SettingsView } from './components/SettingsView';
import { MasterItemsView } from './components/MasterItemsView';
import { CreateMasterItemModal } from './components/CreateMasterItemModal';
import { AddEditInventoryModal } from './components/AddEditInventoryModal';
import { AddEditPOModal } from './components/AddEditPOModal';
import { AddEditPrelovedModal } from './components/AddEditPrelovedModal';
import { InventoryDetailModal } from './components/InventoryDetailModal';
import { PODetailModal } from './components/PODetailModal';
import { PrelovedDetailModal } from './components/PrelovedDetailModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ImageViewerModal } from './components/ImageViewerModal';
import { SecretCodeModal } from './components/SecretCodeModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { DepartmentalAssetView } from './components/DepartmentalAssetView';
import { MotionAnalyticsView } from './components/MotionAnalyticsView';
import { MonthlyDepartmentalView } from './components/MonthlyDepartmentalView';
import { MonthlyMotionView } from './components/MonthlyMotionView';
import { TransferDepartmentModal } from './components/TransferDepartmentModal';
import { ReturnDepartmentModal } from './components/ReturnDepartmentModal';
import type {
  InventoryItem,
  MasterItem,
  PurchaseOrderItem,
  PrelovedItem,
  InventoryStats,
  POStats,
  PrelovedStats,
  ActivityRecord,
  FilterOptions,
  POFilterOptions,
  POStatus,
  Category,
  DepartmentName
} from './lib/types';
import type { UnifiedRecentItem } from './components/RecentlyEditedSection';
import {
  fetchInventory,
  fetchPurchaseOrders,
  fetchPreloved,
  fetchRecentlyEdited,
  fetchStats,
  fetchPOStats,
  fetchPrelovedStats,
  fetchRecentActivity,
  deleteInventory,
  deletePurchaseOrder,
  deletePreloved,
  downloadExcel,
  downloadPOExcel,
  downloadPrelovedExcel,
  getStoredSecretToken
} from './lib/api';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading, logout } = useAuth();

  // Navigation
  const [currentTab, setCurrentTab] = useState<NavTab>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showUserManagementFromLogin, setShowUserManagementFromLogin] = useState(false);

  // Inventory Data
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [inventoryFilters, setInventoryFilters] = useState<FilterOptions>({});
  const [invCurrentPage, setInvCurrentPage] = useState(1);
  const [invTotalPages, setInvTotalPages] = useState(1);

  // Purchase Order Data
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);
  const [poTotal, setPoTotal] = useState(0);
  const [isLoadingPO, setIsLoadingPO] = useState(false);
  const [poFilters, setPoFilters] = useState<POFilterOptions>({});
  const [poCurrentPage, setPoCurrentPage] = useState(1);
  const [poTotalPages, setPoTotalPages] = useState(1);

  // Preloved Data
  const [prelovedItems, setPrelovedItems] = useState<PrelovedItem[]>([]);
  const [prelovedTotal, setPrelovedTotal] = useState(0);
  const [isLoadingPreloved, setIsLoadingPreloved] = useState(false);
  const [prelovedFilters, setPrelovedFilters] = useState<FilterOptions>({});
  const [prelovedCurrentPage, setPrelovedCurrentPage] = useState(1);
  const [prelovedTotalPages, setPrelovedTotalPages] = useState(1);

  // Dashboard Stats & Activities
  const [recentlyEdited, setRecentlyEdited] = useState<UnifiedRecentItem[]>([]);
  const [invStats, setInvStats] = useState<InventoryStats>({
    total: 0,
    pcCount: 0,
    networkCount: 0,
    cctvCount: 0,
    addedThisMonth: 0
  });
  const [poStats, setPoStats] = useState<POStats>({
    total: 0,
    pendingCount: 0,
    arrivedCount: 0,
    orderedThisMonth: 0
  });
  const [prelovedStats, setPrelovedStats] = useState<PrelovedStats>({
    total: 0,
    pcCount: 0,
    networkCount: 0,
    cctvCount: 0,
    addedThisMonth: 0
  });
  const [activities, setActivities] = useState<ActivityRecord[]>([]);

  // Modals - Inventory & Master Items
  const [isAddEditInvOpen, setIsAddEditInvOpen] = useState(false);
  const [invToEdit, setInvToEdit] = useState<InventoryItem | null>(null);
  const [initialCategoryForAdd, setInitialCategoryForAdd] = useState<Category | undefined>(undefined);
  const [initialMasterItemIdForAdd, setInitialMasterItemIdForAdd] = useState<string | undefined>(undefined);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
  const [masterItemToEdit, setMasterItemToEdit] = useState<MasterItem | null>(null);
  const [detailInv, setDetailInv] = useState<InventoryItem | null>(null);
  const [invToDelete, setInvToDelete] = useState<InventoryItem | null>(null);

  // Modals - Purchase Order
  const [isAddEditPOOpen, setIsAddEditPOOpen] = useState(false);
  const [poToEdit, setPoToEdit] = useState<PurchaseOrderItem | null>(null);
  const [detailPO, setDetailPO] = useState<PurchaseOrderItem | null>(null);
  const [poToDelete, setPoToDelete] = useState<PurchaseOrderItem | null>(null);

  // Modals - Preloved
  const [isAddEditPrelovedOpen, setIsAddEditPrelovedOpen] = useState(false);
  const [prelovedToEdit, setPrelovedToEdit] = useState<PrelovedItem | null>(null);
  const [initialCategoryForPrelovedAdd, setInitialCategoryForPrelovedAdd] = useState<Category | undefined>(undefined);
  const [detailPreloved, setDetailPreloved] = useState<PrelovedItem | null>(null);
  const [prelovedToDelete, setPrelovedToDelete] = useState<PrelovedItem | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string } | null>(null);

  // Modals - Department Asset Transfer & Return
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferPreselectedDept, setTransferPreselectedDept] = useState<DepartmentName | undefined>(undefined);
  const [transferPreselectedItemId, setTransferPreselectedItemId] = useState<string | undefined>(undefined);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnDept, setReturnDept] = useState<DepartmentName>('Front Office');
  const [returnPreselectedItemId, setReturnPreselectedItemId] = useState<string | undefined>(undefined);

  // Secret code modal for in-app User Management tab
  const [isSecretModalOpenForTab, setIsSecretModalOpenForTab] = useState(false);

  // Toast notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Refresh Dashboard stats & activity
  const refreshDashboardData = useCallback(async () => {
    try {
      const [iStats, pStats, prStats, recentData, actsData] = await Promise.all([
        fetchStats(),
        fetchPOStats(),
        fetchPrelovedStats(),
        fetchRecentlyEdited(),
        fetchRecentActivity()
      ]);
      setInvStats(iStats);
      setPoStats(pStats);
      setPrelovedStats(prStats);
      setRecentlyEdited(recentData as any);
      setActivities(actsData);
    } catch (err) {
      console.error('Error refreshing dashboard data:', err);
    }
  }, []);

  // Fetch Inventory items
  const loadInventoryItems = useCallback(async () => {
    setIsLoadingInventory(true);
    try {
      const res = await fetchInventory(inventoryFilters, invCurrentPage, 50);
      setInventoryItems(res.data);
      setInventoryTotal(res.total);
      setInvTotalPages(res.totalPages);
    } catch (err: any) {
      addToast(err.message || 'Failed to load inventory.', 'error');
    } finally {
      setIsLoadingInventory(false);
    }
  }, [inventoryFilters, invCurrentPage]);

  // Fetch Purchase Orders
  const loadPOItems = useCallback(async () => {
    setIsLoadingPO(true);
    try {
      const res = await fetchPurchaseOrders(poFilters, poCurrentPage, 50);
      setPoItems(res.data);
      setPoTotal(res.total);
      setPoTotalPages(res.totalPages);
    } catch (err: any) {
      addToast(err.message || 'Failed to load purchase orders.', 'error');
    } finally {
      setIsLoadingPO(false);
    }
  }, [poFilters, poCurrentPage]);

  // Fetch Preloved items
  const loadPrelovedItems = useCallback(async () => {
    setIsLoadingPreloved(true);
    try {
      const res = await fetchPreloved(prelovedFilters, prelovedCurrentPage, 50);
      setPrelovedItems(res.data);
      setPrelovedTotal(res.total);
      setPrelovedTotalPages(res.totalPages);
    } catch (err: any) {
      addToast(err.message || 'Failed to load preloved items.', 'error');
    } finally {
      setIsLoadingPreloved(false);
    }
  }, [prelovedFilters, prelovedCurrentPage]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshDashboardData();
      loadInventoryItems();
      loadPOItems();
      loadPrelovedItems();
    }
  }, [isAuthenticated, refreshDashboardData, loadInventoryItems, loadPOItems, loadPrelovedItems]);

  // Navigation tab switching
  const handleSelectTab = (tab: NavTab) => {
    if (tab === 'users') {
      const hasSecretToken = getStoredSecretToken();
      if (!hasSecretToken) {
        setIsSecretModalOpenForTab(true);
        return;
      }
    }

    if (tab === 'pc') {
      setInventoryFilters({ category: 'PC ITEMS' });
      setCurrentTab('inventory');
    } else if (tab === 'network') {
      setInventoryFilters({ category: 'NETWORK ITEMS' });
      setCurrentTab('inventory');
    } else if (tab === 'cctv') {
      setInventoryFilters({ category: 'CCTV & TV ITEMS' });
      setCurrentTab('inventory');
    } else {
      setCurrentTab(tab);
    }
  };

  // Status card clicks from dashboard
  const handleSelectPOStatus = (status: POStatus) => {
    setPoFilters({ status });
    setPoCurrentPage(1);
    setCurrentTab('po');
  };

  // Inventory & Master Handlers
  const handleOpenAddInventory = (presetCategory?: Category) => {
    setInvToEdit(null);
    setInitialMasterItemIdForAdd(undefined);
    setInitialCategoryForAdd(presetCategory);
    setIsAddEditInvOpen(true);
  };

  const handleOpenAddStockForItem = (item: { id: string }) => {
    setInvToEdit(null);
    setInitialMasterItemIdForAdd(item.id);
    setIsAddEditInvOpen(true);
  };

  const handleOpenEditMaster = (item: any) => {
    setMasterItemToEdit({
      id: item.id,
      itemName: item.itemName,
      category: item.category,
      remark: item.remark || null,
      photoUrl: item.photoUrl || null,
      isActive: item.isActive !== false,
      createdAt: item.createdAt || new Date().toISOString(),
      createdBy: item.createdBy || 'IT',
      updatedAt: item.updatedAt || new Date().toISOString(),
      updatedBy: item.updatedBy || 'IT'
    });
    setIsMasterModalOpen(true);
  };

  const handleInventorySuccess = (_item?: InventoryItem, _isEdit?: boolean) => {
    refreshDashboardData();
    loadInventoryItems();
  };

  const handleMasterSuccess = () => {
    refreshDashboardData();
    loadInventoryItems();
    addToast('Master item berhasil diperbarui.', 'success');
  };

  const handleDeleteInventory = async () => {
    if (!invToDelete) return;
    setIsDeleting(true);
    try {
      await deleteInventory(invToDelete.id);
      addToast('Inventory item deleted successfully.', 'success');
      setInvToDelete(null);
      refreshDashboardData();
      loadInventoryItems();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete inventory item.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Purchase Order Handlers
  const handleOpenAddPO = () => {
    setPoToEdit(null);
    setIsAddEditPOOpen(true);
  };

  const handleOpenEditPO = (po: PurchaseOrderItem) => {
    setPoToEdit(po);
    setIsAddEditPOOpen(true);
  };

  const handlePOSuccess = (_po?: PurchaseOrderItem, _isEdit?: boolean) => {
    refreshDashboardData();
    loadPOItems();
  };

  const handleDeletePO = async () => {
    if (!poToDelete) return;
    setIsDeleting(true);
    try {
      await deletePurchaseOrder(poToDelete.id);
      addToast('Purchase Order deleted successfully.', 'success');
      setPoToDelete(null);
      refreshDashboardData();
      loadPOItems();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete Purchase Order.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Preloved Handlers
  const handleOpenAddPreloved = (presetCategory?: Category) => {
    setPrelovedToEdit(null);
    setInitialCategoryForPrelovedAdd(presetCategory);
    setIsAddEditPrelovedOpen(true);
  };

  const handleOpenEditPreloved = (item: PrelovedItem) => {
    setPrelovedToEdit(item);
    setIsAddEditPrelovedOpen(true);
  };

  const handlePrelovedSuccess = (_item?: PrelovedItem, _isEdit?: boolean) => {
    refreshDashboardData();
    loadPrelovedItems();
  };

  const handleDeletePreloved = async () => {
    if (!prelovedToDelete) return;
    setIsDeleting(true);
    try {
      await deletePreloved(prelovedToDelete.id);
      addToast('Preloved item deleted successfully.', 'success');
      setPrelovedToDelete(null);
      refreshDashboardData();
      loadPrelovedItems();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete Preloved item.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Recently Edited click handler: routes to appropriate detail modal
  const handleSelectRecentItem = (recent: UnifiedRecentItem) => {
    if (recent.itemType === 'PURCHASE ORDER') {
      setDetailPO(recent.rawItem);
    } else if (recent.itemType === 'PRELOVED') {
      setDetailPreloved(recent.rawItem);
    } else {
      setDetailInv(recent.rawItem);
    }
  };

  // Initial Auth Loading Screen
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
        <p className="text-sm font-semibold tracking-wider text-slate-400 uppercase">
          HOTEL IT INVENTORY & PO
        </p>
      </div>
    );
  }

  // Not logged in
  if (!isAuthenticated) {
    if (showUserManagementFromLogin) {
      return (
        <div className="min-h-screen bg-slate-50 py-10 px-4">
          <UserManagementView
            isLoggedIn={false}
            onBack={() => setShowUserManagementFromLogin(false)}
            onToast={addToast}
          />
          <ToastContainer toasts={toasts} onDismiss={removeToast} />
        </div>
      );
    }

    return (
      <>
        <LoginPage
          onOpenUserManagement={() => setShowUserManagementFromLogin(true)}
          onToast={addToast}
        />
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={handleSelectTab}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenAddModal={() => handleOpenAddInventory()}
      />

      {/* Main Body */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onLogout={logout}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* 1. Dashboard View */}
          {currentTab === 'dashboard' && (
            <DashboardView
              stats={invStats}
              poStats={poStats}
              prelovedStats={prelovedStats}
              recentlyEdited={recentlyEdited}
              activities={activities}
              onSelectCategory={(cat) => {
                setInventoryFilters({ category: cat });
                setCurrentTab('inventory');
              }}
              onSelectPOStatus={handleSelectPOStatus}
              onOpenPOView={() => {
                setPoFilters({ status: 'ALL' });
                setCurrentTab('po');
              }}
              onOpenPrelovedView={() => {
                setPrelovedFilters({});
                setCurrentTab('preloved');
              }}
              onSelectItem={handleSelectRecentItem}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
              onOpenAddInventoryModal={() => handleOpenAddInventory()}
              onOpenAddPOModal={handleOpenAddPO}
              onOpenAddPrelovedModal={() => handleOpenAddPreloved()}
              onNavigateTab={handleSelectTab}
              onOpenTransferModal={() => {
                setTransferPreselectedDept(undefined);
                setTransferPreselectedItemId(undefined);
                setIsTransferModalOpen(true);
              }}
            />
          )}

          {/* 2. Inventory Management */}
          {currentTab === 'inventory' && (
            <InventoryView
              items={inventoryItems}
              total={inventoryTotal}
              isLoading={isLoadingInventory}
              filters={inventoryFilters}
              onUpdateFilters={(f) => {
                setInventoryFilters(f);
                setInvCurrentPage(1);
              }}
              onResetFilters={() => {
                setInventoryFilters({});
                setInvCurrentPage(1);
              }}
              currentPage={invCurrentPage}
              totalPages={invTotalPages}
              onPageChange={setInvCurrentPage}
              onOpenAddModal={() => handleOpenAddInventory(inventoryFilters.category as Category)}
              onViewItem={(item) => setDetailInv(item)}
              onEditItem={handleOpenEditMaster}
              onDeleteItem={(item) => setInvToDelete(item)}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
              onOpenAddStockForItem={handleOpenAddStockForItem}
              onExportCurrentView={async () => {
                try {
                  await downloadExcel(inventoryFilters);
                  addToast('Inventory spreadsheet exported successfully.', 'success');
                } catch (err: any) {
                  addToast(err.message || 'Export failed.', 'error');
                }
              }}
            />
          )}

          {/* 2b. Master Item Catalog (Create Item subpage) */}
          {currentTab === 'create-item' && (
            <MasterItemsView
              onAddStockForItem={(item) => handleOpenAddStockForItem(item)}
            />
          )}

          {/* 2c. Departmental Asset Management */}
          {currentTab === 'departmental-asset' && (
            <DepartmentalAssetView
              onOpenTransferModal={(dept, itemId) => {
                setTransferPreselectedDept(dept);
                setTransferPreselectedItemId(itemId);
                setIsTransferModalOpen(true);
              }}
              onOpenReturnModal={(dept, itemId) => {
                setReturnDept(dept);
                setReturnPreselectedItemId(itemId);
                setIsReturnModalOpen(true);
              }}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
              onToast={addToast}
            />
          )}

          {/* 2d. Motion Analytics */}
          {currentTab === 'motion-analytics' && (
            <MotionAnalyticsView
              onToast={addToast}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
            />
          )}

          {/* 3. Purchase Order Management */}
          {currentTab === 'po' && (
            <PurchaseOrderView
              items={poItems}
              total={poTotal}
              isLoading={isLoadingPO}
              filters={poFilters}
              onUpdateFilters={(f) => {
                setPoFilters(f);
                setPoCurrentPage(1);
              }}
              onResetFilters={() => {
                setPoFilters({});
                setPoCurrentPage(1);
              }}
              currentPage={poCurrentPage}
              totalPages={poTotalPages}
              onPageChange={setPoCurrentPage}
              onOpenAddModal={handleOpenAddPO}
              onViewItem={(po) => setDetailPO(po)}
              onEditItem={handleOpenEditPO}
              onDeleteItem={(po) => setPoToDelete(po)}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
              onExportCurrentView={async () => {
                try {
                  await downloadPOExcel(poFilters);
                  addToast('Purchase Order spreadsheet exported successfully.', 'success');
                } catch (err: any) {
                  addToast(err.message || 'Export failed.', 'error');
                }
              }}
            />
          )}

          {/* 3b. Preloved Management */}
          {currentTab === 'preloved' && (
            <PrelovedView
              items={prelovedItems}
              total={prelovedTotal}
              isLoading={isLoadingPreloved}
              filters={prelovedFilters}
              onUpdateFilters={(f) => {
                setPrelovedFilters(f);
                setPrelovedCurrentPage(1);
              }}
              onResetFilters={() => {
                setPrelovedFilters({});
                setPrelovedCurrentPage(1);
              }}
              currentPage={prelovedCurrentPage}
              totalPages={prelovedTotalPages}
              onPageChange={setPrelovedCurrentPage}
              onOpenAddModal={() => handleOpenAddPreloved(prelovedFilters.category as Category)}
              onViewItem={(item) => setDetailPreloved(item)}
              onEditItem={handleOpenEditPreloved}
              onDeleteItem={(item) => setPrelovedToDelete(item)}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
              onExportCurrentView={async () => {
                try {
                  await downloadPrelovedExcel(prelovedFilters);
                  addToast('Preloved spreadsheet exported successfully.', 'success');
                } catch (err: any) {
                  addToast(err.message || 'Export failed.', 'error');
                }
              }}
            />
          )}

          {/* 4. Monthly Data Inventory */}
          {currentTab === 'monthly-inventory' && (
            <MonthlyDataView
              allItems={inventoryItems}
              onOpenAddModal={() => handleOpenAddInventory()}
              onViewItem={(item) => setDetailInv(item)}
              onEditItem={handleOpenEditMaster}
              onDeleteItem={(item) => setInvToDelete(item)}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
              onExportMonth={async (m) => {
                try {
                  await downloadExcel({ month: m });
                  addToast(`Exported ${m} successfully.`, 'success');
                } catch (err: any) {
                  addToast(err.message || 'Export failed.', 'error');
                }
              }}
            />
          )}

          {/* 5. Monthly Data Purchase Order */}
          {currentTab === 'monthly-po' && (
            <MonthlyPOView
              allPOs={poItems}
              onOpenAddModal={handleOpenAddPO}
              onViewItem={(po) => setDetailPO(po)}
              onEditItem={handleOpenEditPO}
              onDeleteItem={(po) => setPoToDelete(po)}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
              onExportMonth={async (m) => {
                try {
                  await downloadPOExcel({ month: m });
                  addToast(`Exported PO ${m} successfully.`, 'success');
                } catch (err: any) {
                  addToast(err.message || 'Export failed.', 'error');
                }
              }}
            />
          )}

          {/* 5b. Monthly Data Preloved */}
          {currentTab === 'monthly-preloved' && (
            <MonthlyPrelovedView
              allPreloved={prelovedItems}
              onOpenAddModal={() => handleOpenAddPreloved()}
              onViewItem={(item) => setDetailPreloved(item)}
              onEditItem={handleOpenEditPreloved}
              onDeleteItem={(item) => setPrelovedToDelete(item)}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
              onExportMonth={async (m) => {
                try {
                  await downloadPrelovedExcel({ month: m });
                  addToast(`Exported Preloved ${m} successfully.`, 'success');
                } catch (err: any) {
                  addToast(err.message || 'Export failed.', 'error');
                }
              }}
            />
          )}

          {/* 5c. Monthly Departmental Asset */}
          {currentTab === 'monthly-departmental' && (
            <MonthlyDepartmentalView
              onToast={addToast}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
            />
          )}

          {/* 5d. Monthly Motion Analytics */}
          {currentTab === 'monthly-motion' && (
            <MonthlyMotionView
              onToast={addToast}
              onViewImage={(url, title) => setPreviewImage({ url, title })}
            />
          )}

          {/* 6. Export Data Inventory */}
          {currentTab === 'export-inventory' && (
            <ExportDataView onToast={addToast} />
          )}

          {/* 6b. Export Departmental Asset */}
          {currentTab === 'export-departmental' && (
            <ExportDataView defaultType="department" onToast={addToast} />
          )}

          {/* 6c. Export Motion Analytics */}
          {currentTab === 'export-motion' && (
            <ExportDataView defaultType="motion" onToast={addToast} />
          )}

          {/* 7. Export Data Purchase Order */}
          {currentTab === 'export-po' && (
            <ExportPOView onToast={addToast} />
          )}

          {/* 7b. Export Data Preloved */}
          {currentTab === 'export-preloved' && (
            <ExportPrelovedView onToast={addToast} />
          )}

          {/* 8. User Management */}
          {currentTab === 'users' && (
            <UserManagementView
              isLoggedIn={true}
              onBack={() => setCurrentTab('dashboard')}
              onToast={addToast}
            />
          )}

          {/* 9. Settings */}
          {currentTab === 'settings' && (
            <SettingsView
              onLogout={logout}
              onToast={addToast}
              onOpenUserManagement={() => {
                const hasSecretToken = getStoredSecretToken();
                if (!hasSecretToken) {
                  setIsSecretModalOpenForTab(true);
                } else {
                  setCurrentTab('users');
                }
              }}
            />
          )}
        </main>
      </div>

      {/* Modals - Master Items */}
      <CreateMasterItemModal
        isOpen={isMasterModalOpen}
        editingItem={masterItemToEdit}
        onClose={() => {
          setIsMasterModalOpen(false);
          setMasterItemToEdit(null);
        }}
        onSuccess={handleMasterSuccess}
      />

      {/* Modals - Inventory (Add Stock) */}
      <AddEditInventoryModal
        isOpen={isAddEditInvOpen}
        itemToEdit={invToEdit}
        initialCategory={initialCategoryForAdd}
        initialMasterItemId={initialMasterItemIdForAdd}
        onClose={() => {
          setIsAddEditInvOpen(false);
          setInitialMasterItemIdForAdd(undefined);
        }}
        onSuccess={handleInventorySuccess}
        onToast={addToast}
        onOpenCreateMasterItem={() => setCurrentTab('create-item')}
      />

      <InventoryDetailModal
        isOpen={!!detailInv}
        item={detailInv}
        onClose={() => setDetailInv(null)}
        onEdit={handleOpenEditMaster}
        onDelete={(item) => setInvToDelete(item)}
        onViewImage={(url, title) => setPreviewImage({ url, title })}
        onOpenAddStock={handleOpenAddStockForItem}
        onTransactionsChanged={() => {
          refreshDashboardData();
          loadInventoryItems();
        }}
      />

      {/* Modals - Purchase Order */}
      <AddEditPOModal
        isOpen={isAddEditPOOpen}
        itemToEdit={poToEdit}
        onClose={() => setIsAddEditPOOpen(false)}
        onSuccess={handlePOSuccess}
        onToast={addToast}
      />

      <PODetailModal
        isOpen={!!detailPO}
        item={detailPO}
        onClose={() => setDetailPO(null)}
        onEdit={handleOpenEditPO}
        onDelete={(po) => setPoToDelete(po)}
        onViewImage={(url, title) => setPreviewImage({ url, title })}
      />

      {/* Modals - Preloved */}
      <AddEditPrelovedModal
        isOpen={isAddEditPrelovedOpen}
        itemToEdit={prelovedToEdit}
        initialCategory={initialCategoryForPrelovedAdd}
        onClose={() => setIsAddEditPrelovedOpen(false)}
        onSuccess={handlePrelovedSuccess}
        onToast={addToast}
      />

      <PrelovedDetailModal
        isOpen={!!detailPreloved}
        item={detailPreloved}
        onClose={() => setDetailPreloved(null)}
        onEdit={handleOpenEditPreloved}
        onDelete={(item) => setPrelovedToDelete(item)}
        onViewImage={(url, title) => setPreviewImage({ url, title })}
      />

      {/* Delete Confirmation Modals */}
      <DeleteConfirmModal
        isOpen={!!invToDelete}
        itemName={invToDelete?.itemName}
        onCancel={() => setInvToDelete(null)}
        onConfirm={handleDeleteInventory}
        isDeleting={isDeleting}
      />

      <DeleteConfirmModal
        isOpen={!!poToDelete}
        itemName={poToDelete?.itemName}
        onCancel={() => setPoToDelete(null)}
        onConfirm={handleDeletePO}
        isDeleting={isDeleting}
      />

      <DeleteConfirmModal
        isOpen={!!prelovedToDelete}
        itemName={prelovedToDelete?.itemName}
        onCancel={() => setPrelovedToDelete(null)}
        onConfirm={handleDeletePreloved}
        isDeleting={isDeleting}
      />

      {/* Full-size Image Viewer */}
      <ImageViewerModal
        imageUrl={previewImage?.url || null}
        title={previewImage?.title}
        onClose={() => setPreviewImage(null)}
      />

      {/* Secret code modal for User Management sidebar tab */}
      <SecretCodeModal
        isOpen={isSecretModalOpenForTab}
        onClose={() => setIsSecretModalOpenForTab(false)}
        onSuccess={() => {
          setIsSecretModalOpenForTab(false);
          setCurrentTab('users');
        }}
      />

      {/* Transfer to Department Modal */}
      <TransferDepartmentModal
        isOpen={isTransferModalOpen}
        preselectedDepartment={transferPreselectedDept}
        preselectedItemId={transferPreselectedItemId}
        onClose={() => {
          setIsTransferModalOpen(false);
          setTransferPreselectedDept(undefined);
          setTransferPreselectedItemId(undefined);
        }}
        onSuccess={() => {
          refreshDashboardData();
          loadInventoryItems();
        }}
        onToast={addToast}
      />

      {/* Return from Department to Inventory Modal */}
      <ReturnDepartmentModal
        isOpen={isReturnModalOpen}
        department={returnDept}
        preselectedItemId={returnPreselectedItemId}
        onClose={() => {
          setIsReturnModalOpen(false);
          setReturnPreselectedItemId(undefined);
        }}
        onSuccess={() => {
          refreshDashboardData();
          loadInventoryItems();
        }}
        onToast={addToast}
      />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
