import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  FileSpreadsheet,
  Download,
  Loader2,
  AlertCircle,
  Building2,
  ArrowRightLeft,
  RotateCcw
} from 'lucide-react';
import { DEPARTMENTS, DepartmentName, EnrichedMotionRecord } from '../lib/types';
import { fetchMotionAnalytics, downloadMotionExcel } from '../lib/api';
import { formatDate, formatDateTime } from '../lib/inventory-logic';

interface MonthlyMotionViewProps {
  onToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onViewImage?: (url: string, title: string) => void;
}

const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' }
];

export const MonthlyMotionView: React.FC<MonthlyMotionViewProps> = ({
  onToast,
  onViewImage
}) => {
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [selectedDept, setSelectedDept] = useState<string>('ALL');

  const [records, setRecords] = useState<EnrichedMotionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [summary, setSummary] = useState({
    totalMovements: 0,
    totalTransferredUnits: 0,
    totalReturnedUnits: 0
  });

  const monthStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`;
  const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
  const dateFrom = `${monthStr}-01`;
  const dateTo = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchMotionAnalytics({
        dateFrom,
        dateTo,
        department: selectedDept !== 'ALL' ? selectedDept : undefined,
        limit: 200
      });
      setRecords(res.data);
      setSummary(res.summary);
    } catch (err: any) {
      onToast(err.message || 'Gagal memuat rekap bulanan mutasi.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, selectedDept, onToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadMotionExcel({
        department: selectedDept !== 'ALL' ? selectedDept : undefined,
        month: selectedMonth,
        year: selectedYear
      });
      onToast('File Excel rekap mutasi bulanan berhasil diunduh.', 'success');
    } catch (err: any) {
      onToast(err.message || 'Gagal mengekspor mutasi bulanan.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const monthLabel = useMemo(() => {
    const m = MONTHS.find((m) => m.value === selectedMonth);
    return m ? m.label : `Bulan ${selectedMonth}`;
  }, [selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sky-400 text-xs font-bold uppercase tracking-wider mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Rekap Bulanan Mutasi Aset</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Monthly Motion Analytics — {monthLabel} {selectedYear}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Seluruh transaksi penambahan dan pengembalian unit antara inventory dan departemen hotel pada periode {monthLabel} {selectedYear}.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || records.length === 0}
          className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 text-white text-xs font-black shadow-lg shadow-sky-600/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          <span>Export Excel Mutasi Bulanan</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Month */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-600" />
              <span>Bulan</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Tahun
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-600" />
              <span>Filter Departemen</span>
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">Semua Departemen</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Mutasi Periode Ini
          </span>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {records.length} <span className="text-xs font-normal text-slate-500">Transaksi</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Total Unit Ditransfer (+)</span>
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            +{summary.totalTransferredUnits} <span className="text-xs font-normal text-slate-500">Unit</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>Total Unit Dikembalikan (-)</span>
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            -{summary.totalReturnedUnits} <span className="text-xs font-normal text-slate-500">Unit</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
            <span>Memuat audit mutasi {monthLabel}...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">
              Tidak ada riwayat mutasi pada {monthLabel} {selectedYear}
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Belum ada mutasi perpindahan barang yang dicatat pada bulan ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Tipe Mutasi</th>
                  <th className="py-3 px-3">Nama Barang</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3">Departemen</th>
                  <th className="py-3 px-3 text-center">Jumlah Unit</th>
                  <th className="py-3 px-3">Keterangan</th>
                  <th className="py-3 px-3">Dicatat Oleh</th>
                  <th className="py-3 px-3">Waktu Input</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {records.map((rec) => {
                  const isTransfer = rec.type === 'TRANSFER_TO_DEPARTMENT';

                  return (
                    <tr key={rec.id} className="hover:bg-sky-50/20 transition-colors">
                      <td className="py-3 px-3 whitespace-nowrap font-bold text-slate-900">
                        {formatDate(rec.date)}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {isTransfer ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ArrowRightLeft className="w-3 h-3" />
                            <span>TRANSFER KE DEPT</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <RotateCcw className="w-3 h-3" />
                            <span>KEMBALI KE INVENTORY</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-black text-slate-900 text-xs">
                        {rec.itemName}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {rec.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-block px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                          {rec.department}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-black text-xs ${
                            isTransfer ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'
                          }`}
                        >
                          {isTransfer ? `+${rec.quantity}` : `-${rec.quantity}`} Unit
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate text-[11px]">
                        {rec.remark || '-'}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-slate-800 font-semibold">
                        {rec.createdBy}
                      </td>
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
      </div>
    </div>
  );
};
