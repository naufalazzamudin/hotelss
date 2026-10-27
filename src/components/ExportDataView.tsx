import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  CheckCircle,
  PackagePlus,
  Calendar,
  Building2,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { MONTH_NAMES } from '../lib/inventory-logic';
import { DEPARTMENTS, DepartmentName } from '../lib/types';
import { downloadExcel, downloadDepartmentExcel, downloadMotionExcel } from '../lib/api';

interface ExportDataViewProps {
  onToast: (text: string, type: 'success' | 'error' | 'info') => void;
  defaultType?: 'master' | 'monthly' | 'department' | 'motion';
}

export const ExportDataView: React.FC<ExportDataViewProps> = ({ onToast, defaultType = 'master' }) => {
  const [exportType, setExportType] = useState<'master' | 'monthly' | 'department' | 'motion'>(defaultType);
  const [selectedMonth, setSelectedMonth] = useState('OCTOBER 2026');
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(10);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (exportType === 'master') {
        await downloadExcel({
          type: 'master',
          category: selectedCategory !== 'All' ? selectedCategory : undefined
        });
        onToast('Berhasil mengekspor Master Item Catalog!', 'success');
      } else if (exportType === 'monthly') {
        await downloadExcel({
          type: 'monthly',
          month: selectedMonth,
          category: selectedCategory !== 'All' ? selectedCategory : undefined
        });
        onToast(`Berhasil mengekspor transaksi stok ${selectedMonth}!`, 'success');
      } else if (exportType === 'department') {
        await downloadDepartmentExcel({
          department: selectedDept !== 'ALL' ? selectedDept : undefined
        });
        onToast('Berhasil mengekspor Laporan Asset Departemen!', 'success');
      } else if (exportType === 'motion') {
        await downloadMotionExcel({
          department: selectedDept !== 'ALL' ? selectedDept : undefined
        });
        onToast('Berhasil mengekspor Audit Log Mutasi Barang (Motion Analytics)!', 'success');
      }
    } catch (err: any) {
      onToast(err.message || 'Gagal mengekspor file Excel.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-1">
          <FileSpreadsheet className="w-4 h-4" />
          <span>Report Generation & Archiving</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          EXPORT DATA INVENTORY TO EXCEL (.XLSX)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Generate laporan profesional Excel untuk katalog barang, stok inbound bulanan, asset 7 departemen, dan audit mutasi
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-2xs space-y-6">
        {/* Export Type Selector (4 Options) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">
            Pilih Jenis Laporan Excel
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1. Master Item Catalog */}
            <button
              type="button"
              onClick={() => setExportType('master')}
              className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                exportType === 'master'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  exportType === 'master' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <PackagePlus className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  1. Master Item Catalog
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  1 baris per barang: Nama, Kategori, Remark, Total Stok Tersedia, Transaksi, dan Foto Tersemat.
                </div>
              </div>
            </button>

            {/* 2. Monthly Inbound Stock */}
            <button
              type="button"
              onClick={() => setExportType('monthly')}
              className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                exportType === 'monthly'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  exportType === 'monthly' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  2. Monthly Inbound Stock
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Daftar transaksi penambahan unit pada bulan yang dipilih: Tanggal, Barang, Kategori, Qty, User.
                </div>
              </div>
            </button>

            {/* 3. Departmental Asset */}
            <button
              type="button"
              onClick={() => setExportType('department')}
              className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                exportType === 'department'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  exportType === 'department' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  3. Departmental Asset Report
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Sebaran aset terpasang di 7 departemen hotel, unit aktif, total diterima, total dikembalikan.
                </div>
              </div>
            </button>

            {/* 4. Motion Analytics */}
            <button
              type="button"
              onClick={() => setExportType('motion')}
              className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                exportType === 'motion'
                  ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  exportType === 'motion' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 text-sm">
                  4. Motion Analytics (Audit Mutasi)
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Seluruh log audit transfer ke departemen & pengembalian ke inventory dengan timestamp.
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic Filter Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-slate-100">
          {/* Monthly filter */}
          {exportType === 'monthly' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilih Periode Bulan
              </label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold bg-white text-slate-800"
              >
                {MONTH_NAMES.map((m) => (
                  <option key={m} value={`${m} 2026`}>
                    {m} 2026
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Department selector for department & motion export */}
          {(exportType === 'department' || exportType === 'motion') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pilih Departemen
              </label>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold bg-white text-slate-800"
              >
                <option value="ALL">Semua 7 Departemen</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Master Scope */}
          {exportType === 'master' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Cakupan Data
              </label>
              <div className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-700">
                Semua Master Item Aktif di Katalog
              </div>
            </div>
          )}

          {/* Category Filter for master and monthly */}
          {(exportType === 'master' || exportType === 'monthly') && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Filter Kategori (Opsional)
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm font-semibold bg-white text-slate-800"
              >
                <option value="All">Semua Kategori</option>
                <option value="PC ITEMS">PC ITEMS</option>
                <option value="NETWORK ITEMS">NETWORK ITEMS</option>
                <option value="CCTV & TV ITEMS">CCTV & TV ITEMS</option>
              </select>
            </div>
          )}
        </div>

        {/* Feature Highlights Card */}
        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 space-y-3">
          <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Spesifikasi File Excel yang Dihasilkan</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>
                {exportType === 'master' && 'Format Master: 1 baris per barang dengan stok inventory on-hand real-time.'}
                {exportType === 'monthly' && 'Format Bulanan: Riwayat transaksi inbound unit pada bulan kalender.'}
                {exportType === 'department' && 'Format Departemen: Ringkasan aset terpasang, unit masuk & kembali per departemen.'}
                {exportType === 'motion' && 'Format Mutasi: Log kronologis lengkap pergerakan transfer dan pengembalian unit.'}
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-500 font-bold">•</span>
              <span>
                <strong>Tabel Profesional:</strong> Header beku (freeze pane), styling korporat, baris zebra, dan total otomatis.
              </span>
            </div>
          </div>
        </div>

        {/* Export Button */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm tracking-wide shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>MEMBUAT FILE EXCEL...</span>
              </>
            ) : (
              <>
                <Download className="w-5 h-5" />
                <span>DOWNLOAD FILE EXCEL</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
