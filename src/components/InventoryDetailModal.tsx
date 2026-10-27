import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Layers,
  User,
  Clock,
  Edit2,
  Trash2,
  Tag,
  ShieldCheck,
  History,
  Plus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import type { InventoryItem, StockTransaction } from '../lib/types';
import { formatDate, formatDateTime } from '../lib/inventory-logic';
import { fetchStockTransactions, deleteStockTransaction } from '../lib/api';

interface InventoryDetailModalProps {
  item: InventoryItem | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (item: InventoryItem) => void;
  onDelete: (item: InventoryItem) => void;
  onViewImage: (url: string, title: string) => void;
  onOpenAddStock?: (item: InventoryItem) => void;
  onTransactionsChanged?: () => void;
}

export const InventoryDetailModal: React.FC<InventoryDetailModalProps> = ({
  item,
  isOpen,
  onClose,
  onEdit,
  onDelete,
  onViewImage,
  onOpenAddStock,
  onTransactionsChanged
}) => {
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [isLoadingTx, setIsLoadingTx] = useState(false);
  const [txError, setTxError] = useState<string | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  const loadTransactions = async (itemId: string) => {
    setIsLoadingTx(true);
    setTxError(null);
    try {
      const txs = await fetchStockTransactions({ itemId });
      setTransactions(txs as unknown as StockTransaction[]);
    } catch (err: any) {
      setTxError(err.message || 'Gagal memuat histori transaksi.');
    } finally {
      setIsLoadingTx(false);
    }
  };

  useEffect(() => {
    if (isOpen && item) {
      // If transactions already populated on item, use them as immediate state
      if (item.transactions && Array.isArray(item.transactions)) {
        setTransactions(item.transactions);
      }
      loadTransactions(item.id);
    } else {
      setTransactions([]);
    }
  }, [isOpen, item?.id]);

  if (!isOpen || !item) return null;

  const totalCalculatedUnits = transactions.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
  const currentTotal = transactions.length > 0 ? totalCalculatedUnits : (item.totalQuantity ?? item.quantity ?? 0);

  const categoryColor = {
    'PC ITEMS': 'bg-blue-50 text-blue-700 border-blue-200',
    'NETWORK ITEMS': 'bg-cyan-50 text-cyan-700 border-cyan-200',
    'CCTV & TV ITEMS': 'bg-purple-50 text-purple-700 border-purple-200'
  }[item.category] || 'bg-slate-50 text-slate-700 border-slate-200';

  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm('Hapus transaksi penambahan stok ini? Total unit akan disesuaikan.')) {
      return;
    }
    setDeletingTxId(txId);
    try {
      await deleteStockTransaction(txId);
      await loadTransactions(item.id);
      if (onTransactionsChanged) onTransactionsChanged();
    } catch (err: any) {
      setTxError(err.message || 'Gagal menghapus transaksi.');
    } finally {
      setDeletingTxId(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${categoryColor}`}>
              {item.category}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ID: {item.id}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail modal"
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Top Info Banner: Photo & Primary Info */}
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div
              className="w-full sm:w-44 h-36 rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0 cursor-pointer group shadow-sm flex items-center justify-center relative"
              onClick={() => onViewImage(item.photoUrl, item.itemName)}
            >
              {item.photoUrl ? (
                <img
                  src={item.photoUrl}
                  alt={item.itemName}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <span className="text-slate-400 text-xs font-bold uppercase">{item.category}</span>
              )}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-semibold">
                Zoom Foto
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <h2 id="detail-modal-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {item.itemName}
              </h2>

              {/* Remark */}
              <div className="mt-2 p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs flex items-start gap-2.5">
                <Tag className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700 block">
                    Remark / Spesifikasi Master
                  </span>
                  <span className="font-medium text-slate-800">
                    {item.remark || <span className="text-slate-400 italic">Tidak ada catatan spesifik.</span>}
                  </span>
                </div>
              </div>

              {/* Quick actions for this item */}
              <div className="flex items-center gap-2 mt-4 flex-wrap">
                {onOpenAddStock && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAddStock(item);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>+ Tambah Stok</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onEdit(item);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Master</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onDelete(item);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus / Arsipkan</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Summary Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Total Unit Tersedia
              </span>
              <span className="text-2xl font-black text-indigo-600 mt-1 block">
                {currentTotal} Unit
              </span>
              <span className="text-[10px] text-slate-500">
                Akumulasi seluruh transaksi stok
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Frekuensi Penambahan
              </span>
              <span className="text-2xl font-black text-slate-800 mt-1 block">
                {transactions.length} Kali
              </span>
              <span className="text-[10px] text-slate-500">
                Jumlah transaksi tercatat
              </span>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Penambahan Terakhir
              </span>
              <span className="text-sm font-black text-slate-800 mt-1 block">
                {item.lastTransactionDate ? formatDate(item.lastTransactionDate) : formatDate(item.dateRepaired)}
              </span>
              <span className="text-[10px] text-slate-500 block truncate">
                Oleh: {item.lastAddedBy || item.createdBy}
                {item.lastTransactionQuantity !== undefined ? ` (+${item.lastTransactionQuantity} unit)` : ''}
              </span>
            </div>
          </div>

          {/* Histori Penambahan Stok Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  Histori Penambahan Stok
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium">
                {transactions.length} Transaksi Terpisah
              </span>
            </div>

            {txError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{txError}</span>
              </div>
            )}

            {isLoadingTx ? (
              <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                <p className="text-xs">Memuat riwayat transaksi...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-center text-xs text-slate-500">
                Belum ada transaksi penambahan unit untuk barang ini.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4 w-12 text-center">No</th>
                      <th className="py-2.5 px-4">Tanggal Transaksi</th>
                      <th className="py-2.5 px-4 text-center">Jumlah Unit</th>
                      <th className="py-2.5 px-4">Ditambahkan Oleh</th>
                      <th className="py-2.5 px-4">Waktu Pencatatan</th>
                      <th className="py-2.5 px-4 w-16 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((tx, idx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-4 text-center text-slate-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {formatDate(tx.transactionDate)}
                        </td>
                        <td className="py-2.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200">
                            +{tx.quantity} unit
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-bold text-slate-700">
                          {tx.createdBy}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                          {formatDateTime(tx.createdAt)}
                        </td>
                        <td className="py-2.5 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteTransaction(tx.id)}
                            disabled={deletingTxId === tx.id}
                            title="Hapus transaksi penambahan ini"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          >
                            {deletingTxId === tx.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50/90 font-bold border-t border-slate-200">
                      <td colSpan={2} className="py-2.5 px-4 text-right text-slate-600">
                        TOTAL UNIT TERSEDIA:
                      </td>
                      <td className="py-2.5 px-4 text-center text-indigo-700 font-extrabold text-sm">
                        {currentTotal} Unit
                      </td>
                      <td colSpan={3} className="py-2.5 px-4 text-slate-400 font-normal italic">
                        {transactions.length} kali penambahan
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Audit trail */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              <span className="font-semibold text-slate-700">Master Item Created: </span>
              {formatDateTime(item.createdAt)} by <strong>{item.createdBy}</strong>
            </div>
            <div>
              <span className="font-semibold text-slate-700">Last Modified: </span>
              {formatDateTime(item.updatedAt)} by <strong>{item.updatedBy}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
