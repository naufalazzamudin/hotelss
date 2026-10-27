import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Search,
  Calendar,
  Layers,
  Loader2,
  AlertCircle,
  Plus,
  Check,
  ChevronDown,
  PackagePlus,
  ArrowRight
} from 'lucide-react';
import type { InventoryItem, MasterItem, Category } from '../lib/types';
import { fetchMasterItems, recordStockInbound, updateInventory } from '../lib/api';

interface AddEditInventoryModalProps {
  isOpen: boolean;
  itemToEdit?: InventoryItem | null;
  initialCategory?: Category;
  initialMasterItemId?: string;
  onClose: () => void;
  onSuccess: (item: any, isEdit: boolean) => void;
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
  onOpenCreateMasterItem?: () => void;
}

export const AddEditInventoryModal: React.FC<AddEditInventoryModalProps> = ({
  isOpen,
  itemToEdit,
  initialCategory,
  initialMasterItemId,
  onClose,
  onSuccess,
  onToast,
  onOpenCreateMasterItem
}) => {
  const getTodayDate = () => new Date().toISOString().split('T')[0];

  // Master items state
  const [masterItems, setMasterItems] = useState<MasterItem[]>([]);
  const [isLoadingMasters, setIsLoadingMasters] = useState(false);
  const [masterError, setMasterError] = useState<string | null>(null);

  // Form Fields - Strictly 3 Fields
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(getTodayDate());
  const [quantity, setQuantity] = useState<number>(1);

  // Dropdown UI states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load active master items when modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingMasters(true);
    setMasterError(null);

    fetchMasterItems({ status: 'active' })
      .then((items) => {
        if (!isMounted) return;
        setMasterItems(items);

        // Preselection logic
        if (initialMasterItemId && items.some(i => i.id === initialMasterItemId)) {
          setSelectedItemId(initialMasterItemId);
        } else if (itemToEdit && items.some(i => i.id === itemToEdit.id)) {
          setSelectedItemId(itemToEdit.id);
        } else if (!selectedItemId && items.length > 0) {
          // If category was specified, pick first in category
          if (initialCategory) {
            const match = items.find(i => i.category === initialCategory);
            if (match) setSelectedItemId(match.id);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setMasterError(err.message || 'Gagal memuat katalog barang.');
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingMasters(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, initialMasterItemId, itemToEdit, initialCategory]);

  // Reset or initialize fields
  useEffect(() => {
    if (isOpen) {
      setTransactionDate(getTodayDate());
      setQuantity(1);
      setFormError(null);
      setIsDropdownOpen(false);
      setItemSearch('');
      if (initialCategory) {
        setCategoryFilter(initialCategory);
      } else {
        setCategoryFilter('All');
      }
    }
  }, [isOpen, initialCategory]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter master items for dropdown
  const filteredMasters = useMemo(() => {
    return masterItems.filter((item) => {
      // Must be active
      if (item.isActive === false) return false;
      // Category filter
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      // Search term
      if (itemSearch.trim()) {
        const query = itemSearch.toLowerCase();
        const nameMatch = item.itemName.toLowerCase().includes(query);
        const remarkMatch = item.remark ? item.remark.toLowerCase().includes(query) : false;
        return nameMatch || remarkMatch;
      }
      return true;
    });
  }, [masterItems, categoryFilter, itemSearch]);

  const selectedMasterItem = useMemo(() => {
    return masterItems.find((m) => m.id === selectedItemId);
  }, [masterItems, selectedItemId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent duplicate submission

    // Validation
    if (!selectedItemId) {
      setFormError('Silakan pilih barang terlebih dahulu.');
      return;
    }
    if (!transactionDate || !transactionDate.trim()) {
      setFormError('Tanggal Dimasukkan wajib diisi.');
      return;
    }
    const parsedQty = parseInt(String(quantity), 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setFormError('Jumlah unit harus berupa bilangan bulat positif (minimal 1 unit).');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await recordStockInbound({
        itemId: selectedItemId,
        transactionDate: transactionDate.trim(),
        quantity: parsedQty
      });

      onToast(`Berhasil menambahkan ${parsedQty} unit stok ${selectedMasterItem?.itemName || ''}!`, 'success');
      onSuccess(res.data, false);
      onClose();
    } catch (err: any) {
      setFormError(err.message || 'Gagal menyimpan transaksi penambahan stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div>
            <h2 className="text-lg font-bold text-white tracking-wide">
              Add Inventory (Inbound Stock)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Catat penambahan jumlah unit dari master item yang terdaftar
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Strictly 3 Fields */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {formError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2.5 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {masterError && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start gap-2.5 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{masterError}</span>
            </div>
          )}

          {/* FIELD 1: PILIH BARANG (Searchable Dropdown) */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                1. Pilih Barang <span className="text-rose-400">*</span>
              </label>
              {onOpenCreateMasterItem && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenCreateMasterItem();
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium transition"
                >
                  <Plus className="w-3 h-3" />
                  <span>Buat Item Baru</span>
                </button>
              )}
            </div>

            {/* Dropdown Toggle Button */}
            <div
              onClick={() => !isLoadingMasters && setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full px-3.5 py-2.5 bg-slate-800/90 border rounded-xl cursor-pointer flex items-center justify-between transition ${
                isDropdownOpen ? 'border-indigo-500 ring-2 ring-indigo-500/30' : 'border-slate-700 hover:border-slate-600'
              } ${isLoadingMasters ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              {isLoadingMasters ? (
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>Memuat katalog master barang...</span>
                </div>
              ) : selectedMasterItem ? (
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center">
                    {selectedMasterItem.photoUrl ? (
                      <img
                        src={selectedMasterItem.photoUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-indigo-300">
                        {selectedMasterItem.category.slice(0, 2)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-bold text-white block truncate">
                      {selectedMasterItem.itemName}
                    </span>
                    <span className="text-[10px] text-indigo-400 block font-medium">
                      {selectedMasterItem.category}
                    </span>
                  </div>
                </div>
              ) : (
                <span className="text-slate-400 text-xs">
                  -- Pilih Master Barang dari Katalog --
                </span>
              )}
              <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Popover */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-30 overflow-hidden animate-in fade-in duration-150">
                {/* Search Input & Category Filter inside dropdown */}
                <div className="p-2.5 border-b border-slate-700/80 bg-slate-800/95 space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={itemSearch}
                      onChange={(e) => setItemSearch(e.target.value)}
                      placeholder="Ketik untuk mencari nama barang..."
                      autoFocus
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex gap-1 overflow-x-auto pb-1 text-[10px]">
                    {['All', 'PC ITEMS', 'NETWORK ITEMS', 'CCTV & TV ITEMS'].map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2 py-0.5 rounded-md whitespace-nowrap transition ${
                          categoryFilter === cat
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {cat === 'All' ? 'Semua' : cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* List items */}
                <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
                  {masterItems.length === 0 ? (
                    <div className="p-4 text-center">
                      <p className="text-xs text-amber-300 mb-2">
                        Belum ada master item di katalog.
                      </p>
                      {onOpenCreateMasterItem && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDropdownOpen(false);
                            onClose();
                            onOpenCreateMasterItem();
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
                        >
                          <PackagePlus className="w-3.5 h-3.5" />
                          <span>Buat Item Melalui Create Item</span>
                        </button>
                      )}
                    </div>
                  ) : filteredMasters.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Tidak ada barang yang cocok dengan "{itemSearch}"
                    </div>
                  ) : (
                    filteredMasters.map((m) => {
                      const isSelected = m.id === selectedItemId;
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedItemId(m.id);
                            setIsDropdownOpen(false);
                            setFormError(null);
                          }}
                          className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'hover:bg-slate-700/70 text-slate-200'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-md bg-slate-900 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center">
                              {m.photoUrl ? (
                                <img
                                  src={m.photoUrl}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span className="text-[10px] font-bold text-slate-400">
                                  {m.category.slice(0, 2)}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="text-xs font-bold block truncate">
                                {m.itemName}
                              </span>
                              <span
                                className={`text-[10px] block ${
                                  isSelected ? 'text-indigo-200' : 'text-slate-400'
                                }`}
                              >
                                {m.category} {m.remark ? `• ${m.remark}` : ''}
                              </span>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 shrink-0 text-white ml-2" />}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Selected item details preview pill */}
            {selectedMasterItem && (
              <div className="mt-2 p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl flex items-center gap-3">
                <div className="text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Remark Master: </span>
                  {selectedMasterItem.remark || <span className="italic">Tidak ada remark.</span>}
                </div>
              </div>
            )}
          </div>

          {/* FIELD 2: TANGGAL DIMASUKKAN (Date Picker, Wajib) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              2. Tanggal Dimasukkan <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* FIELD 3: JUMLAH UNIT (Bilangan Bulat Positif, Wajib) */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              3. Jumlah Unit <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Layers className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  setQuantity(isNaN(val) ? 1 : Math.max(1, val));
                }}
                required
                placeholder="1"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Masukkan total unit fisik yang masuk pada transaksi penambahan ini (minimal 1 unit).
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedItemId}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold tracking-wide shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Simpan Penambahan Stok</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
