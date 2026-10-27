import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  RotateCcw,
  Building2,
  Calendar,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { DepartmentName, DepartmentAssetItem } from '../lib/types';
import { fetchDepartmentItems, returnAssetToInventory } from '../lib/api';

interface ReturnDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  department: DepartmentName;
  preselectedItemId?: string;
}

export const ReturnDepartmentModal: React.FC<ReturnDepartmentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onToast,
  department,
  preselectedItemId
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItemId || '');
  const [quantity, setQuantity] = useState<number>(1);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [remark, setRemark] = useState('');

  const [deptItems, setDeptItems] = useState<DepartmentAssetItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load items currently in this department
  useEffect(() => {
    if (!isOpen || !department) return;

    if (preselectedItemId) {
      setSelectedItemId(preselectedItemId);
    }

    const loadItems = async () => {
      setIsLoadingItems(true);
      try {
        const res = await fetchDepartmentItems(department);
        // Only items with currentUnits > 0 can be returned
        const available = res.data.filter((i) => i.currentUnits > 0);
        setDeptItems(available);
        if (preselectedItemId && !available.some((i) => i.itemId === preselectedItemId)) {
          setSelectedItemId('');
        }
      } catch (err: any) {
        onToast(err.message || 'Gagal memuat barang di departemen.', 'error');
      } finally {
        setIsLoadingItems(false);
      }
    };

    loadItems();
  }, [isOpen, department, preselectedItemId]);

  const selectedItem = useMemo(() => {
    return deptItems.find((i) => i.itemId === selectedItemId);
  }, [deptItems, selectedItemId]);

  const maxReturnable = selectedItem ? selectedItem.currentUnits : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItemId) {
      onToast('Pilih barang yang ingin dikembalikan ke Inventory.', 'error');
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      onToast('Jumlah unit harus berupa bilangan positif (minimal 1 unit).', 'error');
      return;
    }

    if (qty > maxReturnable) {
      onToast(
        `Jumlah pengembalian melebihi unit di ${department}. Maksimal: ${maxReturnable} unit.`,
        'error'
      );
      return;
    }

    if (!date) {
      onToast('Tanggal pengembalian wajib diisi.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await returnAssetToInventory({
        itemId: selectedItemId,
        department,
        quantity: qty,
        date,
        remark: remark.trim() || undefined
      });

      onToast(res.message || 'Barang berhasil dikembalikan ke Inventory.', 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      onToast(err.message || 'Gagal melakukan pengembalian asset.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-700 via-amber-800 to-slate-900 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/30">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                Kembalikan Asset ke Inventory
              </h3>
              <p className="text-xs text-amber-200">
                Departemen Asal: <span className="font-bold text-white">{department}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-amber-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 1. Item Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-700" />
                <span>Pilih Barang di {department} <span className="text-rose-500">*</span></span>
              </label>
              {selectedItem && (
                <span className="text-xs font-bold text-amber-700">
                  Tersedia di Dept: {maxReturnable} unit
                </span>
              )}
            </div>

            {isLoadingItems ? (
              <div className="flex items-center justify-center p-4 border border-dashed border-slate-200 rounded-xl text-xs text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                <span>Memuat barang di {department}...</span>
              </div>
            ) : deptItems.length === 0 ? (
              <div className="p-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Tidak ada unit barang yang sedang aktif terpasang di departemen {department}.
                </span>
              </div>
            ) : (
              <select
                value={selectedItemId}
                onChange={(e) => {
                  setSelectedItemId(e.target.value);
                  const it = deptItems.find((i) => i.itemId === e.target.value);
                  const max = it ? it.currentUnits : 1;
                  if (quantity > max) setQuantity(Math.max(1, max));
                }}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              >
                <option value="">-- Pilih Barang yang Akan Dikembalikan --</option>
                {deptItems.map((item) => (
                  <option key={item.itemId} value={item.itemId}>
                    {item.itemName} [{item.category}] — Terpasang: {item.currentUnits} unit
                  </option>
                ))}
              </select>
            )}

            {/* Selected item preview */}
            {selectedItem && (
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedItem.photoUrl ? (
                    <img
                      src={selectedItem.photoUrl}
                      alt={selectedItem.itemName}
                      className="w-10 h-10 object-cover rounded-lg border border-amber-300 bg-white"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center font-bold text-xs">
                      IT
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-black text-slate-900">{selectedItem.itemName}</div>
                    <div className="text-[11px] font-semibold text-amber-700">{selectedItem.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                    Unit di {department}
                  </span>
                  <span className="text-sm font-black text-amber-800">
                    {selectedItem.currentUnits} Unit
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 2. Tanggal Pengembalian & Jumlah Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-700" />
                <span>Tanggal Pengembalian <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Jumlah Unit Kembali <span className="text-rose-500">*</span>
                </label>
                {maxReturnable > 0 && (
                  <button
                    type="button"
                    onClick={() => setQuantity(maxReturnable)}
                    className="text-[11px] font-bold text-amber-700 hover:text-amber-900"
                  >
                    Set Max ({maxReturnable})
                  </button>
                )}
              </div>
              <input
                type="number"
                min={1}
                max={maxReturnable > 0 ? maxReturnable : 1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          {/* 3. Remark / Alasan Pengembalian */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Alasan Pengembalian / Remark (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Barang tidak lagi digunakan, dipindahkan kembali ke gudang IT, rusak untuk diservis"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              disabled={isSubmitting || maxReturnable <= 0 || !selectedItemId}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white text-xs font-bold shadow-md shadow-amber-600/20 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengembalikan...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Kembalikan ke Inventory</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
