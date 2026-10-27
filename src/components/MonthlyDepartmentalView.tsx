import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar,
  Building2,
  FileSpreadsheet,
  Download,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Boxes,
  ArrowRightLeft,
  RotateCcw
} from 'lucide-react';
import { DEPARTMENTS, DepartmentName, MonthlyDepartmentalReportItem } from '../lib/types';
import { fetchMonthlyDepartmental, downloadDepartmentExcel } from '../lib/api';

interface MonthlyDepartmentalViewProps {
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

export const MonthlyDepartmentalView: React.FC<MonthlyDepartmentalViewProps> = ({
  onToast,
  onViewImage
}) => {
  const [selectedDept, setSelectedDept] = useState<DepartmentName>('Front Office');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());

  const [items, setItems] = useState<MonthlyDepartmentalReportItem[]>([]);
  const [totalReceived, setTotalReceived] = useState(0);
  const [totalReturned, setTotalReturned] = useState(0);
  const [totalClosing, setTotalClosing] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetchMonthlyDepartmental(selectedDept, selectedMonth, selectedYear);
      setItems(res.data);
      setTotalReceived(res.totalReceived);
      setTotalReturned(res.totalReturned);
      setTotalClosing(res.totalClosing);
    } catch (err: any) {
      onToast(err.message || 'Gagal memuat rekap bulanan departemen.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedDept, selectedMonth, selectedYear, onToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await downloadDepartmentExcel({
        department: selectedDept,
        month: selectedMonth,
        year: selectedYear
      });
      onToast('Laporan bulanan Excel berhasil diunduh.', 'success');
    } catch (err: any) {
      onToast(err.message || 'Gagal mengekspor data bulanan.', 'error');
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
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Calendar className="w-4 h-4" />
            <span>Rekap Bulanan Departemen</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Monthly Departmental Asset: {selectedDept}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Laporan mutasi masuk, pengembalian, dan saldo historis akhir bulan ({monthLabel} {selectedYear}) untuk departemen {selectedDept}.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting || items.length === 0}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white text-xs font-black shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          <span>Export Excel Bulanan</span>
        </button>
      </div>

      {/* Filter Selector Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Department Select */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Departemen</span>
            </label>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value as DepartmentName)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Month Select */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              <span>Bulan</span>
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Select */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
              Tahun
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {[2024, 2025, 2026, 2027, 2028].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
            <span>Unit Masuk Bulan Ini</span>
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            +{totalReceived} <span className="text-xs font-normal text-slate-500">Unit</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
            <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
            <span>Unit Dikembalikan Bulan Ini</span>
          </span>
          <div className="text-2xl font-black text-amber-600 mt-1">
            -{totalReturned} <span className="text-xs font-normal text-slate-500">Unit</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Saldo Akhir Bulan ({monthLabel})
          </span>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            {totalClosing} <span className="text-xs font-normal text-slate-500">Unit Terpasang</span>
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Menghitung saldo dan laporan bulanan...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-700">
              Tidak ada data mutasi atau saldo di {selectedDept} pada {monthLabel} {selectedYear}
            </div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Tidak ada riwayat transfer atau saldo aktif pada akhir periode bulan yang dipilih.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-3">No</th>
                  <th className="py-3 px-3">Barang & Foto</th>
                  <th className="py-3 px-3">Kategori</th>
                  <th className="py-3 px-3 text-center">Masuk Bulan Ini</th>
                  <th className="py-3 px-3 text-center">Kembali Bulan Ini</th>
                  <th className="py-3 px-3 text-center font-black">Saldo Akhir Bulan</th>
                  <th className="py-3 px-3">Remark Master</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {items.map((item, idx) => (
                  <tr key={item.itemId} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="py-3 px-3 text-slate-400 font-bold">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        {item.photoUrl ? (
                          <div
                            onClick={() => onViewImage && onViewImage(item.photoUrl!, item.itemName)}
                            className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 cursor-pointer shrink-0"
                          >
                            <img
                              src={item.photoUrl}
                              alt={item.itemName}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0 text-xs">
                            IT
                          </div>
                        )}
                        <div>
                          <div className="font-black text-slate-900 text-xs">{item.itemName}</div>
                          <span className="text-[10px] text-slate-400">ID: {item.itemId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-700">
                      {item.unitsReceivedThisMonth > 0 ? `+${item.unitsReceivedThisMonth}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-amber-700">
                      {item.unitsReturnedThisMonth > 0 ? `-${item.unitsReturnedThisMonth}` : '-'}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${
                          item.closingBalance > 0
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {item.closingBalance} Unit
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate text-[11px]">
                      {item.masterRemark || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 font-black text-slate-900 border-t-2 border-slate-300">
                  <td colSpan={3} className="py-3 px-3 text-right">
                    TOTAL KESELURUHAN:
                  </td>
                  <td className="py-3 px-3 text-center text-emerald-700 font-black">
                    +{totalReceived}
                  </td>
                  <td className="py-3 px-3 text-center text-amber-700 font-black">
                    -{totalReturned}
                  </td>
                  <td className="py-3 px-3 text-center text-indigo-700 font-black text-sm">
                    {totalClosing} Unit
                  </td>
                  <td className="py-3 px-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
