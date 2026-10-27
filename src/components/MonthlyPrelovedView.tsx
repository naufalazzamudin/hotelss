import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Calendar, ArrowRight, ArrowLeft, FileSpreadsheet, Plus, Sparkles, Loader2 } from 'lucide-react';
import type { PrelovedItem, FilterOptions } from '../lib/types';
import { fetchPreloved } from '../lib/api';
import { PrelovedView } from './PrelovedView';

interface MonthlyPrelovedViewProps {
  allPreloved?: PrelovedItem[];
  onOpenAddModal: () => void;
  onViewItem: (item: PrelovedItem) => void;
  onEditItem: (item: PrelovedItem) => void;
  onDeleteItem: (item: PrelovedItem) => void;
  onViewImage: (url: string, title: string) => void;
  onExportMonth: (monthLabel: string) => void;
}

const INDONESIAN_MONTHS = [
  { idx: 1, name: 'JANUARI 2026', engName: 'JANUARY 2026' },
  { idx: 2, name: 'FEBRUARI 2026', engName: 'FEBRUARY 2026' },
  { idx: 3, name: 'MARET 2026', engName: 'MARCH 2026' },
  { idx: 4, name: 'APRIL 2026', engName: 'APRIL 2026' },
  { idx: 5, name: 'MEI 2026', engName: 'MAY 2026' },
  { idx: 6, name: 'JUNI 2026', engName: 'JUNE 2026' },
  { idx: 7, name: 'JULI 2026', engName: 'JULY 2026' },
  { idx: 8, name: 'AGUSTUS 2026', engName: 'AUGUST 2026' },
  { idx: 9, name: 'SEPTEMBER 2026', engName: 'SEPTEMBER 2026' },
  { idx: 10, name: 'OKTOBER 2026', engName: 'OCTOBER 2026' },
  { idx: 11, name: 'NOVEMBER 2026', engName: 'NOVEMBER 2026' },
  { idx: 12, name: 'DESEMBER 2026', engName: 'DECEMBER 2026' }
];

export const MonthlyPrelovedView: React.FC<MonthlyPrelovedViewProps> = ({
  onOpenAddModal,
  onViewItem,
  onEditItem,
  onDeleteItem,
  onViewImage,
  onExportMonth
}) => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  const [monthItems, setMonthItems] = useState<PrelovedItem[]>([]);
  const [totalMonthCount, setTotalMonthCount] = useState<number>(0);
  const [isLoadingMonth, setIsLoadingMonth] = useState(false);
  const [monthFilters, setMonthFilters] = useState<FilterOptions>({});
  const [page, setPage] = useState(1);

  const activeMonthObj = useMemo(() => {
    return selectedMonthIndex !== null
      ? INDONESIAN_MONTHS.find(m => m.idx === selectedMonthIndex) || null
      : null;
  }, [selectedMonthIndex]);

  const activeEngMonth = activeMonthObj ? activeMonthObj.engName : null;

  const loadMonthData = useCallback(async (engMonthName: string, filters: FilterOptions) => {
    setIsLoadingMonth(true);
    try {
      const res = await fetchPreloved({
        ...filters,
        month: engMonthName
      }, 1, 100);
      setMonthItems(res.data);
      setTotalMonthCount(res.total);
    } catch (err) {
      console.error('Failed to load preloved month items', err);
    } finally {
      setIsLoadingMonth(false);
    }
  }, []);

  useEffect(() => {
    if (activeEngMonth) {
      loadMonthData(activeEngMonth, monthFilters);
    }
  }, [activeEngMonth, monthFilters, loadMonthData]);

  if (selectedMonthIndex !== null && activeMonthObj && activeEngMonth) {
    return (
      <div className="space-y-4">
        {/* Navigation back to month list */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setSelectedMonthIndex(null);
              setMonthFilters({});
              setPage(1);
            }}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>SEMUA BULAN</span>
          </button>

          <button
            type="button"
            onClick={() => onExportMonth(activeEngMonth)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>EXPORT EXCEL {activeEngMonth}</span>
          </button>
        </div>

        <PrelovedView
          items={monthItems}
          total={totalMonthCount}
          isLoading={isLoadingMonth}
          filters={{ ...monthFilters, month: activeEngMonth }}
          onUpdateFilters={(f) => setMonthFilters(f)}
          onResetFilters={() => setMonthFilters({})}
          currentPage={page}
          totalPages={1}
          onPageChange={setPage}
          onOpenAddModal={onOpenAddModal}
          onViewItem={onViewItem}
          onEditItem={onEditItem}
          onDeleteItem={async (item) => {
            await onDeleteItem(item);
            loadMonthData(activeEngMonth, monthFilters);
          }}
          onViewImage={onViewImage}
          onExportCurrentView={() => onExportMonth(activeEngMonth)}
          pageTitle={`PRELOVED BULAN ${activeMonthObj.name}`}
          pageSubtitle={`Daftar barang preloved / rekondisi yang dibereskan selama ${activeMonthObj.name} (filtered by dateRepaired)`}
        />
      </div>
    );
  }

  // Month Selection Grid
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-wider mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Arsip Bulanan Rekondisi</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          DATA BULANAN PRELOVED (2026)
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Pilih bulan kalender operasional untuk melihat data preloved yang dibereskan pada bulan tersebut
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {INDONESIAN_MONTHS.map((m) => {
          const isCurrentMonth = m.idx === 10; // Current operational month (October 2026)

          return (
            <div
              key={m.idx}
              onClick={() => {
                setSelectedMonthIndex(m.idx);
                setMonthFilters({});
                setPage(1);
              }}
              className={`p-5 rounded-2xl border transition-all cursor-pointer group shadow-2xs flex flex-col justify-between ${
                isCurrentMonth
                  ? 'bg-gradient-to-br from-purple-50/70 to-white border-purple-200 hover:border-purple-400 hover:shadow-purple-500/10'
                  : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-md'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    BULAN {String(m.idx).padStart(2, '0')}
                  </span>
                  {isCurrentMonth && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-600 text-white shadow-2xs">
                      Bulan Berjalan
                    </span>
                  )}
                </div>

                <h3 className="text-base font-black text-slate-900 group-hover:text-purple-600 transition-colors">
                  {m.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Arsip barang preloved dan rekondisi
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-4">
                <span className="text-xs font-bold text-purple-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
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
