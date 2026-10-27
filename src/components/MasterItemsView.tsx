import React, { useState, useEffect } from 'react';
import {
  PackagePlus,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Archive,
  RefreshCw,
  Loader2,
  AlertCircle,
  Tag,
  Calendar,
  User,
  ArrowRight
} from 'lucide-react';
import type { MasterItem, Category } from '../lib/types';
import { fetchMasterItems, deleteMasterItem } from '../lib/api';
import { CreateMasterItemModal } from './CreateMasterItemModal';

interface MasterItemsViewProps {
  onAddStockForItem?: (item: MasterItem) => void;
}

export const MasterItemsView: React.FC<MasterItemsViewProps> = ({ onAddStockForItem }) => {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('active');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MasterItem | null>(null);

  // Delete / Archive confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<MasterItem | null>(null);

  const loadMasterItems = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchMasterItems({
        search: searchTerm,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        status: statusFilter
      });
      setItems(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memuat katalog master barang.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMasterItems();
  }, [categoryFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadMasterItems();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: MasterItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteModal) return;
    setDeletingId(confirmDeleteModal.id);
    try {
      await deleteMasterItem(confirmDeleteModal.id);
      setConfirmDeleteModal(null);
      await loadMasterItems();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menghapus atau mengarsipkan barang.');
    } finally {
      setDeletingId(null);
    }
  };

  // Stats calculation
  const totalItems = items.length;
  const activeCount = items.filter(i => i.isActive !== false).length;
  const pcCount = items.filter(i => i.category === 'PC ITEMS').length;
  const netCount = items.filter(i => i.category === 'NETWORK ITEMS').length;
  const cctvCount = items.filter(i => i.category === 'CCTV & TV ITEMS').length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <PackagePlus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-wide">
                KATALOG MASTER BARANG
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola master item katalog IT (nama, kategori, remark, dan foto). Stok unit dicatat terpisah via Add Inventory.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadMasterItems}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-indigo-600/20 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>CREATE ITEM</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Master Item
          </span>
          <span className="text-2xl font-black text-white mt-1 block">
            {totalItems}
          </span>
          <span className="text-[10px] text-emerald-400 font-medium">
            {activeCount} Aktif di Katalog
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            PC Items
          </span>
          <span className="text-2xl font-black text-blue-400 mt-1 block">
            {pcCount}
          </span>
          <span className="text-[10px] text-slate-500">Hardware & Komputer</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Network Items
          </span>
          <span className="text-2xl font-black text-cyan-400 mt-1 block">
            {netCount}
          </span>
          <span className="text-[10px] text-slate-500">Router, Switch, AP</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            CCTV & TV Items
          </span>
          <span className="text-2xl font-black text-purple-400 mt-1 block">
            {cctvCount}
          </span>
          <span className="text-[10px] text-slate-500">Kamera & Monitor Display</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama barang atau remark master item..."
            className="w-full pl-9 pr-4 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full md:w-44 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="All">Semua Kategori</option>
            <option value="PC ITEMS">PC ITEMS</option>
            <option value="NETWORK ITEMS">NETWORK ITEMS</option>
            <option value="CCTV & TV ITEMS">CCTV & TV ITEMS</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full md:w-36 px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="active">Item Aktif</option>
            <option value="archived">Item Diarsipkan</option>
            <option value="all">Semua Status</option>
          </select>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Master Items Content */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs font-medium">Memuat katalog master barang...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
            <PackagePlus className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-white mb-1">
            Belum Ada Master Item Ditemukan
          </h3>
          <p className="text-xs text-slate-400 max-w-md mb-6">
            {searchTerm || categoryFilter !== 'All'
              ? 'Tidak ada barang yang cocok dengan kriteria pencarian atau filter yang dipilih.'
              : 'Mulai dengan menambahkan master barang baru ke katalog. Setiap barang master nantinya dapat ditambah stoknya.'}
          </p>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold tracking-wide shadow-md shadow-indigo-600/20 transition"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create First Master Item</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const isInactive = item.isActive === false;

            return (
              <div
                key={item.id}
                className={`bg-slate-900 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-slate-700 shadow-md ${
                  isInactive
                    ? 'border-slate-800/60 opacity-75 bg-slate-900/60'
                    : 'border-slate-800 hover:shadow-indigo-500/5'
                }`}
              >
                <div>
                  {/* Top Header */}
                  <div className="flex items-start gap-3.5 mb-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-700/80 overflow-hidden shrink-0 flex items-center justify-center">
                      {item.photoUrl ? (
                        <img
                          src={item.photoUrl}
                          alt={item.itemName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-indigo-400 font-bold text-xs uppercase">
                          {item.category.slice(0, 3)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            item.category === 'PC ITEMS'
                              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                              : item.category === 'NETWORK ITEMS'
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20'
                              : 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                          }`}
                        >
                          {item.category}
                        </span>
                        {isInactive && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/20">
                            Diarsipkan
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-white truncate title" title={item.itemName}>
                        {item.itemName}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5 truncate">
                        ID: {item.id}
                      </p>
                    </div>
                  </div>

                  {/* Remark */}
                  <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-800/80 mb-3 min-h-[52px]">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Remark / Spesifikasi
                    </span>
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {item.remark || <span className="text-slate-500 italic">Tidak ada catatan spesifik.</span>}
                    </p>
                  </div>

                  {/* Audit metadata */}
                  <div className="space-y-1 text-[11px] text-slate-400 mb-4 px-1">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Dibuat oleh: <strong className="text-slate-300">{item.createdBy}</strong></span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        Didaftarkan: {new Date(item.createdAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                      title="Edit Master Item"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteModal(item)}
                      className="p-2 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
                      title={isInactive ? 'Hapus Permanen' : 'Arsipkan / Hapus'}
                    >
                      {isInactive ? <Trash2 className="w-3.5 h-3.5" /> : <Archive className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {onAddStockForItem && !isInactive && (
                    <button
                      type="button"
                      onClick={() => onAddStockForItem(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition"
                    >
                      <span>+ Tambah Stok</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <CreateMasterItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingItem={editingItem}
        onSuccess={() => {
          loadMasterItems();
        }}
      />

      {/* Delete / Archive Confirmation Dialog */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <span>Arsipkan atau Hapus Master Item?</span>
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Anda memilih item <strong>"{confirmDeleteModal.itemName}"</strong>.
              Jika barang ini sudah pernah memiliki riwayat penambahan stok, sistem akan mengarsipkannya secara aman agar transaksi masa lalu tetap utuh.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(null)}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={Boolean(deletingId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition flex items-center gap-2"
              >
                {deletingId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Konfirmasi</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
