import React from 'react';
import {
  Plus,
  ArrowRightLeft,
  PackagePlus,
  Boxes,
  ShoppingCart,
  Sparkles,
  Layers,
  Building2
} from 'lucide-react';
import type { InventoryStats, POStats, PrelovedStats, POStatus, Category } from '../lib/types';
import type { NavTab } from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { DashboardStats } from './DashboardStats';
import { POStatusCards } from './POStatusCards';
import { PrelovedStatusCards } from './PrelovedStatusCards';
import { RecentlyEditedSection, UnifiedRecentItem } from './RecentlyEditedSection';

interface DashboardViewProps {
  stats: InventoryStats;
  poStats: POStats;
  prelovedStats: PrelovedStats;
  recentlyEdited?: UnifiedRecentItem[];
  activities?: any[];
  onSelectCategory: (category: Category) => void;
  onSelectPOStatus: (status: POStatus) => void;
  onOpenPOView: () => void;
  onOpenPrelovedView: () => void;
  onSelectItem?: (item: any) => void;
  onViewImage?: (url: string, title: string) => void;
  onOpenAddInventoryModal: () => void;
  onOpenAddPOModal: () => void;
  onOpenAddPrelovedModal: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  onOpenTransferModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  poStats,
  prelovedStats,
  recentlyEdited = [],
  onSelectCategory,
  onSelectPOStatus,
  onOpenPOView,
  onOpenPrelovedView,
  onSelectItem,
  onViewImage,
  onOpenAddInventoryModal,
  onOpenAddPOModal,
  onOpenAddPrelovedModal,
  onNavigateTab,
  onOpenTransferModal
}) => {
  const { user } = useAuth();
  const userRole = user?.role || 'IT TEAM';

  // Role badge styling
  const roleBadgeStyle = {
    'IT MANAGER': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'IT ASSIST': 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    'IT TRAINEE': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  }[userRole] || 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';

  return (
    <div className="space-y-8">
      {/* ======================================================== */}
      {/* 1. HERO WELCOME GREETING BANNER                           */}
      {/* ======================================================== */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(#818cf8_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            {/* Role & System Pill */}
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border ${roleBadgeStyle}`}
              >
                <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
                {userRole}
              </span>
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Hotel IT Department</span>
              </span>
            </div>

            {/* Kalimat Sambutan */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              Hai <span className="text-indigo-300 underline decoration-indigo-500/50 underline-offset-4">{userRole}</span>! 😊
            </h1>
            <p className="text-base sm:text-lg font-bold text-slate-200 mt-1">
              Hotel IT Inventory & Asset Management System
            </p>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 leading-relaxed max-w-xl">
              Kelola katalog master barang, tambah stok unit, alokasikan asset ke 7 departemen operasional, dan pantau mutasi secara real-time.
            </p>
          </div>

          {/* Direct CTA Action Buttons including + Add Departmental Asset */}
          <div className="shrink-0 flex items-center gap-2.5 flex-wrap">
            {/* + Add Departmental Asset Button */}
            <button
              type="button"
              onClick={() => onOpenTransferModal && onOpenTransferModal()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 border border-indigo-400/30"
            >
              <ArrowRightLeft className="w-4 h-4 stroke-[2.5]" />
              <span>+ Add Departmental Asset</span>
            </button>

            {/* + Add Inbound Stock */}
            <button
              type="button"
              onClick={onOpenAddInventoryModal}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm tracking-wide shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>+ Add Inventory</span>
            </button>

            {/* + Create Item */}
            <button
              type="button"
              onClick={() => onNavigateTab && onNavigateTab('create-item')}
              className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs sm:text-sm tracking-wide border border-slate-700 transition-all hover:scale-105 active:scale-95"
            >
              <PackagePlus className="w-4 h-4" />
              <span>Create Item</span>
            </button>

            {/* + PO */}
            <button
              type="button"
              onClick={onOpenAddPOModal}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wide shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>PO</span>
            </button>

            {/* + Preloved */}
            <button
              type="button"
              onClick={onOpenAddPrelovedModal}
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs tracking-wide shadow-md shadow-purple-600/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Preloved</span>
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. 6 STATISTIC CARDS (CLICKABLE & ROUTING TO SECTIONS)    */}
      {/* ======================================================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            RINGKASAN STATISTIK INVENTORY
          </span>
          <span className="text-[11px] font-semibold text-indigo-600 hidden sm:inline">
            Klik kartu untuk langsung menuju dan memfilter data
          </span>
        </div>

        <DashboardStats
          stats={stats}
          onClickMaster={() => onNavigateTab && onNavigateTab('create-item')}
          onClickAvailable={() => onNavigateTab && onNavigateTab('inventory')}
          onClickPC={() => {
            onSelectCategory('PC ITEMS');
            onNavigateTab && onNavigateTab('pc');
          }}
          onClickNetwork={() => {
            onSelectCategory('NETWORK ITEMS');
            onNavigateTab && onNavigateTab('network');
          }}
          onClickCCTV={() => {
            onSelectCategory('CCTV & TV ITEMS');
            onNavigateTab && onNavigateTab('cctv');
          }}
          onClickMonthly={() => onNavigateTab && onNavigateTab('monthly-inventory')}
        />
      </div>

      {/* ======================================================== */}
      {/* 3. INTERACTIVE PURCHASE ORDER STATUS CARDS                */}
      {/* ======================================================== */}
      <POStatusCards
        stats={poStats}
        onSelectStatus={onSelectPOStatus}
        onOpenPOView={onOpenPOView}
      />

      {/* ======================================================== */}
      {/* 4. INTERACTIVE PRELOVED STATUS CARDS                      */}
      {/* ======================================================== */}
      <PrelovedStatusCards
        stats={prelovedStats}
        onOpenPrelovedView={onOpenPrelovedView}
        onSelectCategory={onSelectCategory}
        onOpenAddPrelovedModal={onOpenAddPrelovedModal}
      />

      {/* ======================================================== */}
      {/* 5. RECENTLY EDITED SECTION                                */}
      {/* ======================================================== */}
      {recentlyEdited && recentlyEdited.length > 0 && onSelectItem && onViewImage && (
        <RecentlyEditedSection
          items={recentlyEdited}
          onSelectItem={onSelectItem}
          onViewImage={onViewImage}
        />
      )}
    </div>
  );
};
