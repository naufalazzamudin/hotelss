import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  Boxes,
  Plus,
  ArrowRightLeft,
  RotateCcw,
  Search,
  ArrowLeft,
  Monitor,
  Network,
  Tv,
  FileSpreadsheet,
  Calendar,
  Layers,
  ChevronRight,
  Loader2,
  AlertCircle,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { DEPARTMENTS, DepartmentName, Category, DepartmentSummary, DepartmentAssetItem } from '../lib/types';
import { fetchDepartments, fetchDepartmentItems, downloadDepartmentExcel } from '../lib/api';
import { formatDate } from '../lib/inventory-logic';

interface DepartmentalAssetViewProps {
  onOpenTransferModal: (dept?: DepartmentName, itemId?: string) => void;
  onOpenReturnModal: (dept: DepartmentName, itemId?: string) => void;
  onViewImage?: (url: string, title: string) => void;
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialDepartment?: DepartmentName;
}

const DEPT_ICONS: Record<DepartmentName, string> = {
  'Front Office': '🏨',
  'House Keeping': '🧹',
  'Engineering': '⚙️',
  'Human Resource': '👥',
  'Food & Beverage': '🍽️',
  'Sales & Marketing': '📈',
  'Accounting': '💰'
};

const DEPT_COLORS: Record<DepartmentName, { border: string; bg: string; badge: string; text: string }> = {
  'Front Office': {
    border: 'hover:border-blue-500',
    bg: 'bg-blue-50/50',
    badge: 'bg-blue-100 text-blue-800',
    text: 'text-blue-600'
  },
  'House Keeping': {
    border: 'hover:border-emerald-500',
    bg: 'bg-emerald-50/50',
    badge: 'bg-emerald-100 text-emerald-800',
    text: 'text-emerald-600'
  },
  'Engineering': {
    border: 'hover:border-amber-500',
    bg: 'bg-amber-50/50',
    badge: 'bg-amber-100 text-amber-800',
    text: 'text-amber-600'
  },
  'Human Resource': {
    border: 'hover:border-purple-500',
    bg: 'bg-purple-50/50',
    badge: 'bg-purple-100 text-purple-800',
    text: 'text-purple-600'
  },
  'Food & Beverage': {
    border: 'hover:border-rose-500',
    bg: 'bg-rose-50/50',
    badge: 'bg-rose-100 text-rose-800',
    text: 'text-rose-600'
  },
  'Sales & Marketing': {
    border: 'hover:border-indigo-500',
    bg: 'bg-indigo-50/50',
    badge: 'bg-indigo-100 text-indigo-800',
    text: 'text-indigo-600'
  },
  'Accounting': {
    border: 'hover:border-teal-500',
    bg: 'bg-teal-50/50',
    badge: 'bg-teal-100 text-teal-800',
    text: 'text-teal-600'
  }
};

export const DepartmentalAssetView: React.FC<DepartmentalAssetViewProps> = ({
  onOpenTransferModal,
  onOpenReturnModal,
  onViewImage,
  onToast,
  initialDepartment
}) => {
  const [selectedDept, setSelectedDept] = useState<DepartmentName | null>(initialDepartment || null);
  const [departments, setDepartments] = useState<DepartmentSummary[]>([]);
  const [isLoadingSummaries, setIsLoadingSummaries] = useState(false);

  // Department detail state
  const [deptItems, setDeptItems] = useState<DepartmentAssetItem[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [activeCategoryTab, setActiveCategoryTab] = useState<'ALL' | Category>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Load 7 departments summaries
  const loadSummaries = async () => {
    setIsLoadingSummaries(true);
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (err: any) {
      onToast(err.message || 'Gagal memuat ringkasan departemen.', 'error');
    } finally {
      setIsLoadingSummaries(false);
    }
  };

  useEffect(() => {
    loadSummaries();
  }, []);

  // Load items for selected department
  const loadDeptItems = async (deptName: DepartmentName) => {
    setIsLoadingDetail(true);
    try {
      const res = await fetchDepartmentItems(deptName);
      setDeptItems(res.data);
    } catch (err: any) {
      onToast(err.message || `Gagal memuat aset untuk departemen ${deptName}.`, 'error');
    } finally {
      setIsLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (selectedDept) {
      loadDeptItems(selectedDept);
    }
  }, [selectedDept]);

  // Filtered department items
  const filteredDeptItems = useMemo(() => {
    return deptItems.filter((item) => {
      if (activeCategoryTab !== 'ALL' && item.category !== activeCategoryTab) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = item.itemName.toLowerCase().includes(q);
        const matchRemark = (item.masterRemark || '').toLowerCase().includes(q);
        if (!matchName && !matchRemark) return false;
      }
      return true;
    });
  }, [deptItems, activeCategoryTab, searchQuery]);

  // Total stats for active department
  const currentDeptStats = useMemo(() => {
    const totalUnits = deptItems.reduce((s, i) => s + i.currentUnits, 0);
    const totalJenis = deptItems.filter((i) => i.currentUnits > 0).length;
    const totalReceived = deptItems.reduce((s, i) => s + i.totalReceived, 0);
    const totalReturned = deptItems.reduce((s, i) => s + i.totalReturned, 0);
    return { totalUnits, totalJenis, totalReceived, totalReturned };
  }, [deptItems]);

  const handleExportExcel = async (deptName?: DepartmentName) => {
    setIsExporting(true);
    try {
      await downloadDepartmentExcel({ department: deptName || selectedDept || undefined });
      onToast('File Excel Departemen berhasil diunduh.', 'success');
    } catch (err: any) {
      onToast(err.message || 'Gagal mengekspor data departemen.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. TOP HEADER BANNER                                      */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Hotel IT Asset Tracking</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {selectedDept ? `Asset Departemen: ${selectedDept}` : 'Departmental Asset Management'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {selectedDept
              ? `Manajemen dan monitoring unit perangkat IT yang sedang beroperasi di ${selectedDept}.`
              : 'Pemantauan alokasi dan sebaran unit aset IT pada 7 departemen operasional hotel.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {selectedDept && (
            <button
              type="button"
              onClick={() => {
                setSelectedDept(null);
                loadSummaries();
              }}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 border border-slate-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Semua Departemen</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onOpenTransferModal(selectedDept || undefined)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black shadow-lg shadow-indigo-600/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>+ Add Departmental Asset</span>
          </button>

          {selectedDept && (
            <button
              type="button"
              onClick={() => onOpenReturnModal(selectedDept)}
              className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-black shadow-lg shadow-amber-600/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Return to Inventory</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleExportExcel(selectedDept || undefined)}
            disabled={isExporting}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Download Excel Report"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span className="hidden sm:inline">Export Excel</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. MAIN VIEW: 7 DEPARTMENTS CARDS                         */}
      {/* ======================================================== */}
      {!selectedDept ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-slate-800 tracking-tight">
                7 Departemen Operasional Hotel
              </h2>
              <p className="text-xs text-slate-500">
                Pilih departemen untuk melihat detail inventaris perangkat, histori mutasi, dan transfer unit.
              </p>
            </div>
            {isLoadingSummaries && (
              <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Memperbarui data...</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DEPARTMENTS.map((deptName) => {
              const summary = departments.find((d) => d.name === deptName) || {
                name: deptName,
                totalJenis: 0,
                totalUnits: 0
              };
              const colors = DEPT_COLORS[deptName];
              const icon = DEPT_ICONS[deptName];

              return (
                <div
                  key={deptName}
                  onClick={() => setSelectedDept(deptName)}
                  className={`group bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between ${colors.border} hover:-translate-y-0.5`}
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-2xl">{icon}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${colors.badge}`}
                      >
                        {deptName}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 group-hover:text-indigo-600 transition-colors mb-1">
                      {deptName}
                    </h3>
                    <p className="text-xs text-slate-400">
                      Departemen Operasional
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-100">
                      <div className="bg-slate-50 rounded-xl p-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Total Unit
                        </span>
                        <span className="text-lg font-black text-slate-900">
                          {summary.totalUnits} <span className="text-xs font-normal text-slate-500">Unit</span>
                        </span>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2.5">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Jenis Barang
                        </span>
                        <span className="text-lg font-black text-slate-900">
                          {summary.totalJenis} <span className="text-xs font-normal text-slate-500">Jenis</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-indigo-600 group-hover:text-indigo-700">
                    <span>Lihat Detail Perangkat</span>
                    <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* 3. DEPARTMENT DETAIL VIEW                                 */
        /* ======================================================== */
        <div className="space-y-6">
          {/* Summary Badges for active department */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Unit Terpasang
              </span>
              <div className="text-2xl font-black text-indigo-700 mt-1">
                {currentDeptStats.totalUnits} <span className="text-xs font-normal text-slate-500">Unit</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Jenis Barang Aktif
              </span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {currentDeptStats.totalJenis} <span className="text-xs font-normal text-slate-500">Jenis</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Pernah Diterima
              </span>
              <div className="text-2xl font-black text-emerald-700 mt-1">
                {currentDeptStats.totalReceived} <span className="text-xs font-normal text-slate-500">Unit</span>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Dikembalikan
              </span>
              <div className="text-2xl font-black text-amber-700 mt-1">
                {currentDeptStats.totalReturned} <span className="text-xs font-normal text-slate-500">Unit</span>
              </div>
            </div>
          </div>

          {/* Category Tabs & Search Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Category tabs */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    activeCategoryTab === 'ALL'
                      ? 'bg-white text-indigo-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  SEMUA ITEM
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('PC ITEMS')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeCategoryTab === 'PC ITEMS'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>PC ITEM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('NETWORK ITEMS')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeCategoryTab === 'NETWORK ITEMS'
                      ? 'bg-white text-cyan-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>NETWORK ITEM</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategoryTab('CCTV & TV ITEMS')}
                  className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeCategoryTab === 'CCTV & TV ITEMS'
                      ? 'bg-white text-purple-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>CCTV & TV ITEM</span>
                </button>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari barang / remark..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Items Table / Cards */}
            {isLoadingDetail ? (
              <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span>Memuat data aset {selectedDept}...</span>
              </div>
            ) : filteredDeptItems.length === 0 ? (
              <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <div className="text-sm font-bold text-slate-700">
                  Belum ada unit terpasang di {selectedDept}
                </div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                  Klik tombol "+ Add Departmental Asset" di atas untuk mentransfer perangkat dari Inventory ke departemen ini.
                </p>
                <button
                  type="button"
                  onClick={() => onOpenTransferModal(selectedDept)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Transfer Barang Sekarang</span>
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                      <th className="py-3 px-3">Barang & Foto</th>
                      <th className="py-3 px-3">Kategori</th>
                      <th className="py-3 px-3 text-center">Unit di Dept</th>
                      <th className="py-3 px-3 text-center">Total Diterima</th>
                      <th className="py-3 px-3 text-center">Total Kembali</th>
                      <th className="py-3 px-3">Transfer Terakhir</th>
                      <th className="py-3 px-3">Remark Master</th>
                      <th className="py-3 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredDeptItems.map((item) => (
                      <tr
                        key={item.itemId}
                        className="hover:bg-indigo-50/30 transition-colors"
                      >
                        {/* Foto & Nama Barang */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            {item.photoUrl ? (
                              <div
                                onClick={() => onViewImage && onViewImage(item.photoUrl!, item.itemName)}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity bg-slate-100 shrink-0"
                              >
                                <img
                                  src={item.photoUrl}
                                  alt={item.itemName}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                                IT
                              </div>
                            )}
                            <div>
                              <div className="font-black text-slate-900 text-sm">
                                {item.itemName}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                ID: {item.itemId}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Kategori */}
                        <td className="py-3 px-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              item.category === 'PC ITEMS'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : item.category === 'NETWORK ITEMS'
                                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {item.category}
                          </span>
                        </td>

                        {/* Current Units in Dept */}
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg font-black text-sm ${
                              item.currentUnits > 0
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            {item.currentUnits} Unit
                          </span>
                        </td>

                        {/* Total Received */}
                        <td className="py-3 px-3 text-center font-bold text-emerald-700">
                          {item.totalReceived}
                        </td>

                        {/* Total Returned */}
                        <td className="py-3 px-3 text-center font-bold text-amber-700">
                          {item.totalReturned}
                        </td>

                        {/* Last Transfer */}
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {item.lastTransferDate ? (
                            <div>
                              <div className="font-semibold text-slate-800">
                                {formatDate(item.lastTransferDate)}
                              </div>
                              {item.lastTransferBy && (
                                <div className="text-[10px] text-slate-400">
                                  Oleh: {item.lastTransferBy}
                                </div>
                              )}
                            </div>
                          ) : (
                            '-'
                          )}
                        </td>

                        {/* Master Remark */}
                        <td className="py-3 px-3 text-slate-500 max-w-xs truncate text-[11px]">
                          {item.masterRemark || '-'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenTransferModal(selectedDept, item.itemId)}
                              title="Transfer unit tambahan ke dept ini"
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span className="hidden md:inline">Tambah</span>
                            </button>

                            {item.currentUnits > 0 && (
                              <button
                                type="button"
                                onClick={() => onOpenReturnModal(selectedDept, item.itemId)}
                                title="Kembalikan unit ke Inventory"
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span className="hidden md:inline">Kembalikan</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
