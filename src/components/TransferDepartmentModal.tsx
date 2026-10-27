import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  ArrowRightLeft,
  Search,
  Building2,
  Calendar,
  Layers,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { DEPARTMENTS, DepartmentName, Category, InventoryItem } from '../lib/types';
import { fetchInventory, transferAssetToDepartment } from '../lib/api';

interface TransferDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  preselectedDepartment?: DepartmentName;
  preselectedItemId?: string;
}

export const TransferDepartmentModal: React.FC<TransferDepartmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onToast,
  preselectedDepartment,
  preselectedItemId
}) => {
  const [department, setDepartment] = useState<DepartmentName>(
    preselectedDepartment || 'Front Office'
  );
  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItemId || '');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [remark, setRemark] = useState('');

  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load inventory items when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (preselectedDepartment) {
      setDepartment(preselectedDepartment);
    }
    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId);
    }

    const loadItems = async () => {
      setIsLoadingItems(true);
      try {
        const res = await fetchInventory({ limit: 100 } as any);
        setAvailableItems(res.data);
      } catch (err: any) {
        onToast(err.message || 'Gagal memuat daftar barang inventory.', 'error');
      } finally {
        setIsLoadingItems(false);
      }
    };

    loadItems();
  }, [isOpen, preselectedDepartment, preselectedItemId]);

  // Filter items based on category and search
  const filteredItems = useMemo(() => {
    return availableItems.filter((item) => {
      if (item.isActive === false) return false;
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.itemName.toLowerCase().includes(q);
        const matchRemark = (item.remark || '').toLowerCase().includes(q);
        if (!matchName && !matchRemark) return false;
      }
      return true;
    });
  }, [availableItems, categoryFilter, searchQuery]);

  const selectedItem = useMemo(() => {
    return availableItems.find((i) => i.id === selectedItemId);
  }, [availableItems, selectedItemId]);

  const availableStock = selectedItem
    ? selectedItem.totalQuantity !== undefined
      ? selectedItem.totalQuantity
      : (selectedItem.quantity ?? 0)
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItemId) {
      onToast('Pilih barang yang ingin ditransfer ke departemen.', 'error');
      return;
    }

    if (!department) {
      onToast('Pilih departemen tujuan transfer.', 'error');
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      onToast('Jumlah unit harus berupa bilangan positif (minimal 1 unit).', 'error');
      return;
    }

    if (qty > availableStock) {
      onToast(
        `Stok inventory tidak mencukupi. Tersedia di Inventory: ${availableStock} unit.`,
        'error'
      );
      return;
    }

    if (!date) {
      onToast('Tanggal transfer wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await transferAssetToDepartment({
        itemId: selectedItemId,
        department,
        quantity: qty,
        date,
        remark: remark.trim() || undefined
      });

      onToast(res.message || `Berhasil mentransfer barang ke ${department}.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      onToast(err.message || 'Gagal melakukan transfer asset.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Transfer Asset ke Departemen
              </h3>
              <p className="text-xs text-indigo-200">
                Keluarkan barang dari Inventory dan pasang di Departemen Hotel
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-indigo-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 1. Target Department */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Departemen Tujuan <span className="text-rose-500">*</span></span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value as DepartmentName)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Choose Item from Inventory (Searchable & Category Filter) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Pilih Barang Inventory <span className="text-rose-500">*</span></span>
              </label>
              {selectedItem && (
                <span className="text-xs font-bold text-indigo-600">
                  Tersedia: {availableStock} unit
                </span>
              )}
            </div>

            {/* Category Filter Pills & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama barang..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">Semua Kategori</option>
                <option value="PC ITEMS">PC ITEMS</option>
                <option value="NETWORK ITEMS">NETWORK ITEMS</option>
                <option value="CCTV & TV ITEMS">CCTV & TV ITEMS</option>
              </select>
            </div>

            {/* Select Dropdown */}
            {isLoadingItems ? (
              <div className="flex items-center justify-center p-4 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Memuat master inventory...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl">
                Tidak ada barang yang cocok dengan pencarian atau filter kategori.
              </div>
            ) : (
              <select
                value={selectedItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value);
                  const it = availableItems.find((i) => i.id === e.target.value);
                  const st = it ? (it.totalQuantity ?? it.quantity ?? 1) : 1;
                  if (quantity > st) setQuantity(Math.max(1, st));
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">-- Pilih Barang untuk Ditransfer --</option>
                {filteredItems.map((item) => {
                  const stock = item.totalQuantity !== undefined ? item.totalQuantity : (item.quantity ?? 0);
                  return (
                    <option key={item.id} value={item.id} disabled={stock <= 0}>
                      {item.itemName} [{item.category}] — Stok: {stock} unit {stock <= 0 ? '(HABIS)' : ''}
                    </option>
                  );
                })}
              </select>
            )}

            {/* Selected item card preview */}
            {selectedItem && (
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedItem.photoUrl ? (
                    <img
                      src={selectedItem.photoUrl}
                      alt={selectedItem.itemName}
                      className="w-10 h-10 object-cover rounded-lg border border-indigo-200 bg-white"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      IT
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-black text-slate-900">{selectedItem.itemName}</div>
                    <div className="text-[11px] font-semibold text-indigo-600">{selectedItem.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Stok Tersedia
                  </span>
                  <span className={`text-sm font-black ${availableStock > 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {availableStock} Unit
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 3. Tanggal Transfer & Jumlah Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tanggal Transfer <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Jumlah Unit <span className="text-rose-500">*</span>
                </label>
                {availableStock > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(availableStock)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800"
                  >
                    Set Max ({availableStock})
                  </button>
                )}
              </div>
              <input
                type="number"
                min={1}
                max={availableStock > 0 ? availableStock : 1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* 4. Remark / Keterangan Transaksi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Keterangan Penempatan / Remark (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Meja Kasir Front Desk 1, Penggantian Switch Rusak, dsb."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableStock <= 0 || !selectedItemId}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mentransfer...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Transfer ke {department}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
