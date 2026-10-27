import React from 'react';
import { Boxes, Monitor, Network, Tv, CalendarPlus, ChevronRight } from 'lucide-react';
import type { InventoryStats } from '../lib/types';

interface DashboardStatsProps {
  stats: InventoryStats;
  onClickMaster?: () => void;
  onClickAvailable?: () => void;
  onClickPC?: () => void;
  onClickNetwork?: () => void;
  onClickCCTV?: () => void;
  onClickMonthly?: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  stats,
  onClickMaster,
  onClickAvailable,
  onClickPC,
  onClickNetwork,
  onClickCCTV,
  onClickMonthly
}) => {
  const statItems = [
    {
      id: 'master',
      label: 'MASTER ITEMS',
      value: `${stats.total} Jenis`,
      subtext: 'Katalog Barang Master',
      icon: Boxes,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      hoverBorder: 'hover:border-indigo-500 hover:ring-2 hover:ring-indigo-500/20',
      onClick: onClickMaster
    },
    {
      id: 'available',
      label: 'TOTAL UNIT TERSEDIA',
      value: `${stats.totalUnits ?? stats.total} Unit`,
      subtext: 'Stok On-Hand Inventory',
      icon: Boxes,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
      hoverBorder: 'hover:border-emerald-500 hover:ring-2 hover:ring-emerald-500/20',
      onClick: onClickAvailable
    },
    {
      id: 'pc',
      label: 'PC ITEMS',
      value: `${stats.pcCount} Jenis`,
      subtext: 'Komputer & Peripheral',
      icon: Monitor,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
      hoverBorder: 'hover:border-blue-500 hover:ring-2 hover:ring-blue-500/20',
      onClick: onClickPC
    },
    {
      id: 'network',
      label: 'NETWORK ITEMS',
      value: `${stats.networkCount} Jenis`,
      subtext: 'Jaringan & Switch',
      icon: Network,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50 border-cyan-100',
      hoverBorder: 'hover:border-cyan-500 hover:ring-2 hover:ring-cyan-500/20',
      onClick: onClickNetwork
    },
    {
      id: 'cctv',
      label: 'CCTV & TV',
      value: `${stats.cctvCount} Jenis`,
      subtext: 'Surveillance & Display',
      icon: Tv,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-100',
      hoverBorder: 'hover:border-purple-500 hover:ring-2 hover:ring-purple-500/20',
      onClick: onClickCCTV
    },
    {
      id: 'monthly',
      label: 'MASUK BULAN INI',
      value: `+${stats.addedThisMonth} Unit`,
      subtext: 'Inbound Bulan Ini',
      icon: CalendarPlus,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
      hoverBorder: 'hover:border-amber-500 hover:ring-2 hover:ring-amber-500/20',
      onClick: onClickMonthly
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {statItems.map((s) => {
        const Icon = s.icon;
        return (
          <div
            key={s.id}
            onClick={s.onClick}
            role="button"
            tabIndex={0}
            className={`group bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between ${s.hoverBorder} hover:-translate-y-0.5`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">
                  {s.label}
                </span>
                <div className={`p-1.5 rounded-lg border ${s.bg} ${s.color} transition-transform group-hover:scale-110`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {s.value}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 group-hover:text-slate-600 font-semibold">
              <span className="truncate">{s.subtext}</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 text-slate-300 group-hover:text-slate-600 shrink-0" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
