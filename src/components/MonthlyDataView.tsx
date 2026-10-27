import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  ArrowRight,
  ArrowLeft,
  FileSpreadsheet,
  Plus,
  Loader2,
  Search,
  Filter,
  Layers,
  TrendingUp,
  User,
  Trash2,
  AlertCircle
} from 'lucide-react';
import type { MonthlyStockTransaction, Category, InventoryItem } from '../lib/types';
import { fetchStockTransactions, deleteStockTransaction, downloadExcel } from '../lib/api';
import { formatDate, MONTH_NAMES } from '../lib/inventory-logic';

export interface MonthlyDataViewProps {
  allItems?: InventoryItem[];
  onOpenAddModal: () => void;
  onViewItem?: (item: InventoryItem) => void;
  onEditItem?: (item: InventoryItem) => void;
  onDeleteItem?: (item: InventoryItem) => void;
  onViewImage?: (url: string, title: string) => void;
  onExportMonth?: (monthLabel: string) => void;
}

const MONTH_DATA_LIST = [
  { idx: 1, name: 'Januari', engName: 'JANUARY' },
  { idx: 2, name: 'Februari', engName: 'FEBRUARY' },
  { idx: 3, name: 'Maret', engName: 'MARCH' },
  { idx: 4, name: 'April', engName: 'APRIL' },
  { idx: 5, name: 'Mei', engName: 'MAY' },
  { idx: 6, name: 'Juni', engName: 'JUNE' },
  { idx: 7, name: 'Juli', engName: 'JULY' },
  { idx: 8, name: 'Agustus', engName: 'AUGUST' },
  { idx: 9, name: 'September', engName: 'SEPTEMBER' },
  { idx: 10, name: 'Oktober', engName: 'OCTOBER' },
  { idx: 11, name: 'November', engName: 'NOVEMBER' },
  { idx: 12, name: 'Desember', engName: 'DECEMBER' }
];

export const MonthlyDataView: React.FC<MonthlyDataViewProps> = ({
  onOpenAddModal,
  onExportMonth
}) => {
  const currentYearNow = new Date().getFullYear();
  const currentMonthIdx = new Date().getMonth() + 1;

  // Selected Period
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNow);
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number | null>(currentMonthIdx);

  // Month Inbound Transactions
  const [transactions, setTransactions] = useState<MonthlyStockTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters inside active month
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Load transactions for the active month and year
  const loadMonthTransactions = useCallback(async () => {
    if (selectedMonthIdx === null) return;
    setIsLoading(true);
    setErrorMessage(null);

    const monthStr = `${selectedYear}-${String(selectedMonthIdx).padStart(2, '0')}`;
    try {
      const data = await fetchStockTransactions({
        month: monthStr,
        year: selectedYear,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        search: searchTerm.trim() || undefined
      });
      setTransactions(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal memuat histori transaksi bulanan.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonthIdx, selectedYear, categoryFilter, searchTerm]);

  useEffect(() => {
    loadMonthTransactions();
  }, [loadMonthTransactions]);

  const activeMonth = useMemo(() => {
    if (selectedMonthIdx === null) return null;
    return MONTH_DATA_LIST.find((m) => m.idx === selectedMonthIdx) || null;
  }, [selectedMonthIdx]);

  // Statistics calculation for the month
  const totalUnitsAdded = useMemo(() => {
    return transactions.reduce((acc, t) => acc + (Number(t.quantity) || 0), 0);
  }, [transactions]);

  const totalTransactions = transactions.length;

  const unitsByCategory = useMemo(() => {
    const counts = { pc: 0, network: 0, cctv: 0 };
    for (const t of transactions) {
      const q = Number(t.quantity) || 0;
      if (t.category === 'PC ITEMS') counts.pc += q;
      else if (t.category === 'NETWORK ITEMS') counts.network += q;
      else if (t.category === 'CCTV & TV ITEMS') counts.cctv += q;
    }
    return counts;
  }, [transactions]);

  const handleExportExcel = () => {
    if (!activeMonth) return;
    const monthParam = `${activeMonth.engName} ${selectedYear}`;
    if (onExportMonth) {
      onExportMonth(monthParam);
    } else {
      downloadExcel({
        type: 'monthly',
        month: monthParam,
        category: categoryFilter !== 'All' ? categoryFilter : undefined,
        search: searchTerm.trim() || undefined
      }).catch((err) => alert(err.message));
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    if (!window.confirm('Hapus transaksi penambahan stok ini?')) return;
    try {
      await deleteStockTransaction(txId);
      loadMonthTransactions();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus transaksi.');
    }
  };

  const categoryColor: Record<string, string> = {
    'PC ITEMS': 'text-blue-700 bg-blue-50 border-blue-200',
    'NETWORK ITEMS': 'text-cyan-700 bg-cyan-50 border-cyan-200',
    'CCTV & TV ITEMS': 'text-purple-700 bg-purple-50 border-purple-200'
  };

  // 1. Detailed Month View
  if (selectedMonthIdx !== null && activeMonth) {
    return (
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSelectedMonthIdx(null)}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>SEMUA BULAN</span>
            </button>

            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                DATA PENAMBAHAN STOK: {activeMonth.name.toUpperCase()} {selectedYear}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Histori seluruh transaksi unit masuk pada periode {activeMonth.name} {selectedYear} (berdasarkan tanggal transaksi)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-xs transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>EXPORT EXCEL BULANAN</span>
            </button>

            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ TAMBAH STOK</span>
            </button>
          </div>
        </div>

        {/* Period Selector Tabs (Months of Selected Year) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-2xs flex items-center gap-1 overflow-x-auto">
          {MONTH_DATA_LIST.map((m) => {
            const isActive = m.idx === selectedMonthIdx;
            return (
              <button
                key={m.idx}
                type="button"
                onClick={() => setSelectedMonthIdx(m.idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {m.name}
              </button>
            );
          })}
        </div>

        {/* 4 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Unit Ditambahkan
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-indigo-600">
                {totalUnitsAdded}
              </span>
              <span className="text-xs text-slate-500 font-medium">Unit</span>
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block mt-1">
              {activeMonth.name} {selectedYear}
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Transaksi Masuk
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-slate-800">
                {totalTransactions}
              </span>
              <span className="text-xs text-slate-500 font-medium">Transaksi</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Frekuensi penambahan stok
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              PC Items Masuk
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-blue-600">
                {unitsByCategory.pc}
              </span>
              <span className="text-xs text-slate-500 font-medium">Unit</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              Komputer & perifer
            </span>
          </div>

          <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Network & CCTV Masuk
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-black text-cyan-600">
                {unitsByCategory.network + unitsByCategory.cctv}
              </span>
              <span className="text-xs text-slate-500 font-medium">Unit</span>
            </div>
            <span className="text-[10px] text-slate-500 block mt-1">
              {unitsByCategory.network} Net • {unitsByCategory.cctv} CCTV
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-2xs flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama barang atau catatan transaksi..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full md:w-48 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition"
            >
              <option value="All">Semua Kategori</option>
              <option value="PC ITEMS">PC ITEMS</option>
              <option value="NETWORK ITEMS">NETWORK ITEMS</option>
              <option value="CCTV & TV ITEMS">CCTV & TV ITEMS</option>
            </select>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Transactions Table */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            <p className="text-xs font-medium">Memuat data transaksi penambahan bulanan...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center flex flex-col items-center justify-center shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mb-3">
              <Calendar className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">
              Tidak Ada Penambahan Stok di Bulan {activeMonth.name} {selectedYear}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mb-6">
              {searchTerm || categoryFilter !== 'All'
                ? 'Tidak ada transaksi penambahan yang sesuai dengan pencarian atau filter yang dipilih.'
                : 'Belum ada transaksi stok masuk yang tercatat pada periode ini.'}
            </p>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Tambah Stok Bulan Ini</span>
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 w-36">Tanggal Transaksi</th>
                    <th className="py-3 px-4 min-w-[200px]">Nama Master Barang</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4 text-center">Jumlah Unit Masuk</th>
                    <th className="py-3 px-4">Ditambahkan Oleh</th>
                    <th className="py-3 px-4 min-w-[180px]">Remark Barang</th>
                    <th className="py-3 px-4 w-16 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.map((tx, idx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 whitespace-nowrap">
                        {formatDate(tx.transactionDate)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900 block truncate max-w-xs">
                          {tx.itemName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {tx.itemId}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${categoryColor[tx.category] || 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black border border-emerald-200 shadow-2xs">
                          +{tx.quantity} Unit
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {tx.createdBy}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {tx.remark ? (
                          <span className="text-slate-800 line-clamp-1">{tx.remark}</span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx.id)}
                          title="Hapus transaksi ini"
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50/90 font-bold border-t border-slate-200">
                    <td colSpan={4} className="py-3 px-4 text-right text-slate-700 text-xs">
                      TOTAL PENAMBAHAN BULAN {activeMonth.name.toUpperCase()} {selectedYear}:
                    </td>
                    <td className="py-3 px-4 text-center text-indigo-700 font-extrabold text-sm">
                      +{totalUnitsAdded} Unit
                    </td>
                    <td colSpan={3} className="py-3 px-4 text-slate-500 font-medium italic">
                      Dari total {totalTransactions} transaksi masuk
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 2. Month Selector Grid View (All Months Overview)
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Monthly Operational Archive</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            DATA PENAMBAHAN STOK BULANAN ({selectedYear})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pilih bulan untuk melihat rincian transaksi unit masuk dan mengekspor laporan bulanan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 text-xs font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500 shadow-2xs"
          >
            {[currentYearNow - 1, currentYearNow, currentYearNow + 1].map((yr) => (
              <option key={yr} value={yr}>
                Tahun {yr}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md shadow-indigo-600/20 transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ TAMBAH STOK</span>
          </button>
        </div>
      </div>

      {/* Grid of Months */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {MONTH_DATA_LIST.map((m) => {
          const isCurrent = m.idx === currentMonthIdx && selectedYear === currentYearNow;

          return (
            <div
              key={m.idx}
              onClick={() => setSelectedMonthIdx(m.idx)}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-2xs flex flex-col justify-between ${
                isCurrent
                  ? 'bg-gradient-to-br from-indigo-50/70 to-white border-indigo-200 hover:border-indigo-400 hover:shadow-indigo-500/10'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    BULAN {String(m.idx).padStart(2, '0')}
                  </span>
                  {isCurrent && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-600 text-white shadow-2xs">
                      Bulan Berjalan
                    </span>
                  )}
                </div>

                <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {m.name} {selectedYear}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Lihat seluruh rincian transaksi penambahan unit
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                <span className="text-xs font-bold text-indigo-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                  <span>Buka Data</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {m.engName}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
