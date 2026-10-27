import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  TrendingUp,
  Search,
  Filter,
  ArrowRightLeft,
  RotateCcw,
  Building2,
  Calendar,
  FileSpreadsheet,
  Download,
  Loader2,
  AlertCircle,
  RefreshCw,
  Layers,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { DEPARTMENTS, DepartmentName, Category, MovementType, EnrichedMotionRecord } from '../lib/types';
import { fetchMotionAnalytics, downloadMotionExcel } from '../lib/api';
import { formatDate, formatDateTime } from '../lib/inventory-logic';

interface MotionAnalyticsViewProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onViewImage?: (url: string, title: string) => void;
}

export const MotionAnalyticsView: React.FC<MotionAnalyticsViewProps> = ({
  onToast,
  onViewImage
}) => {
  const [records, setRecords] = useState<EnrichedMotionRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState<string>('ALL');
  const [category, setCategory] = useState<string>('ALL');
  const [type, setType] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Summary counts
  const [summary, setSummary] = useState({
    totalMovements: 0,
    totalTransferredUnits: 0,
    totalReturnedUnits: 0
  });

  const loadMotionData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchMotionAnalytics({
        search,
        department,
        category,
        type,
        dateFrom,
        dateTo,
        page: currentPage,
        limit: 50
      });
      setRecords(res.data);
      setTotalRecords(res.total);
      setTotalPages(res.totalPages);
      setSummary(res.summary);
    } catch (err: any) {
      onToast(err.message || 'Gagal memuat log mutasi barang.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [search, department, category, type, dateFrom, dateTo, currentPage, onToast]);

  useEffect(() => {
    loadMotionData();
  }, [loadMotionData]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadMotionExcel({
        department: department !== 'ALL' ? department : undefined
      });
      onToast('File Excel Motion Analytics berhasil diunduh.', 'success');
    } catch (err: any) {
      onToast(err.message || 'Gagal mengekspor mutasi barang.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setDepartment('ALL');
    setCategory('ALL');
    setType('ALL');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BANNER                                      */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Audit Trail & Mutasi Aset</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Motion Analytics — Mutasi Barang Departemen
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Catatan kronologis dan riwayat perpindahan seluruh aset IT antara Inventory pusat dan 7 departemen hotel.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadMotionData}
            disabled={isLoading}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white text-xs font-black shadow-lg shadow-sky-600/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. SUMMARY METRICS CARDS                                  */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Aktivitas Mutasi
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {summary.totalMovements} <span className="text-xs font-normal text-slate-500">Transaksi</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <ArrowRightLeft className="w-3 h-3 text-emerald-600" />
            <span>Unit Ditransfer (+)</span>
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            +{summary.totalTransferredUnits} <span className="text-xs font-normal text-slate-500">Unit</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <RotateCcw className="w-3 h-3 text-amber-600" />
            <span>Unit Dikembalikan (-)</span>
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            -{summary.totalReturnedUnits} <span className="text-xs font-normal text-slate-500">Unit</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Pergerakan Unit
          </span>
          <div className="text-2xl font-black text-sky-700 mt-1">
            {summary.totalTransferredUnits + summary.totalReturnedUnits} <span className="text-xs font-normal text-slate-500">Unit</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. FILTER TOOLBAR                                         */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari barang, staf, atau catatan..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">Semua Departemen</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="PC ITEMS">PC ITEMS</option>
              <option value="NETWORK ITEMS">NETWORK ITEMS</option>
              <option value="CCTV & TV ITEMS">CCTV & TV ITEMS</option>
            </select>
          </div>

          {/* Activity Type Filter */}
          <div>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">Semua Tipe Aktivitas</option>
              <option value="TRANSFER_TO_DEPARTMENT">Transfer ke Dept (+)</option>
              <option value="RETURN_TO_INVENTORY">Kembali ke Inventory (-)</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div>
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 px-3 border border-slate-300 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Reset Filter
            </button>
          </div>
        </div>

        {/* Date Range Row */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 text-xs">
          <span className="font-bold text-slate-500 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Rentang Tanggal:</span>
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700"
            />
            <span className="text-slate-400">s/d</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700"
            />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MOTION RECORDS TABLE                                   */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
            <span>Memuat audit mutasi...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">
              Tidak ada catatan mutasi yang cocok
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Belum ada mutasi yang tercatat untuk filter yang Anda pilih. Lakukan transfer aset ke departemen untuk memulai pencatatan.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Tipe Mutasi</th>
                  <th className="py-3 px-3">Nama Barang & Kategori</th>
                  <th className="py-3 px-3">Departemen</th>
                  <th className="py-3 px-3 text-center">Jumlah Unit</th>
                  <th className="py-3 px-3">Keterangan / Remark</th>
                  <th className="py-3 px-3">Dicatat Oleh</th>
                  <th className="py-3 px-3">Waktu Input</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {records.map((rec) => {
                  const isTransfer = rec.type === 'TRANSFER_TO_DEPARTMENT';

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-sky-50/20 transition-colors"
                    >
                      {/* Tanggal */}
                      <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-900">
                        {formatDate(rec.date)}
                      </td>

                      {/* Tipe Mutasi */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isTransfer ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>TRANSFER KE DEPT</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <RotateCcw className="w-3 h-3" />
                            <span>KEMBALI KE INVENTORY</span>
                          </span>
                        )}
                      </td>

                      {/* Nama Barang & Kategori */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2.5">
                          {rec.photoUrl ? (
                            <div
                              onClick={() => onViewImage && onViewImage(rec.photoUrl!, rec.itemName)}
                              className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shrink-0"
                            >
                              <img
                                src={rec.photoUrl}
                                alt={rec.itemName}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 font-bold flex items-center justify-center shrink-0 text-xs">
                              IT
                            </div>
                          )}
                          <div>
                            <div className="font-black text-slate-900 text-xs">
                              {rec.itemName}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {rec.category}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Departemen */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {rec.department}
                        </span>
                      </td>

                      {/* Jumlah Unit */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-black text-xs ${
                            isTransfer
                              ? 'text-emerald-700 bg-emerald-50'
                              : 'text-amber-700 bg-amber-50'
                          }`}
                        >
                          {isTransfer ? `+${rec.quantity}` : `-${rec.quantity}`} Unit
                        </span>
                      </td>

                      {/* Keterangan */}
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate text-[11px]">
                        {rec.remark || '-'}
                      </td>

                      {/* Dicatat Oleh */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-800 font-semibold">
                        {rec.createdBy}
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-400 text-[10px]">
                        {formatDateTime(rec.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>
              Menampilkan {records.length} dari {totalRecords} mutasi (Halaman {currentPage} dari {totalPages})
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                className="p-1 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-white"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                className="p-1 rounded-lg border border-slate-300 disabled:opacity-40 hover:bg-white"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
