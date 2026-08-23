import React from 'react';
import {
  ListOrdered,
  Clock,
  Activity,
  AlertTriangle,
  RotateCcw,
  Gauge,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import { OverallCapacityStats } from '../utils/capacityCalculator';

interface CapacityKPICardsProps {
  stats: OverallCapacityStats;
}

export const CapacityKPICards: React.FC<CapacityKPICardsProps> = ({ stats }) => {
  const getUtilizationBadgeColor = (percent: number) => {
    if (percent > 100) return 'bg-rose-50 border-rose-200 text-rose-700';
    if (percent >= 85) return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
      {/* 1. TOTAL QUEUE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col justify-between transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Total Queue</span>
          <ListOrdered className="w-3.5 h-3.5 text-blue-600" />
        </div>
        <div className="mt-2 text-xl font-black text-slate-900 font-mono">
          {stats.totalQueueCount}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">Active JO Records</p>
      </div>

      {/* 2. WAITING */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col justify-between transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Waiting</span>
          <Clock className="w-3.5 h-3.5 text-slate-600" />
        </div>
        <div className="mt-2 text-xl font-black text-slate-800 font-mono">
          {stats.waitingCount}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">Queued to start</p>
      </div>

      {/* 3. ON PROCESS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col justify-between transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-extrabold uppercase tracking-wider">On Process</span>
          <Activity className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
        </div>
        <div className="mt-2 text-xl font-black text-amber-600 font-mono">
          {stats.onProcessCount}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">Currently testing</p>
      </div>

      {/* 4. URGENT */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col justify-between transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Urgent</span>
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
        </div>
        <div className="mt-2 text-xl font-black text-rose-600 font-mono">
          {stats.urgentCount}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">Unassigned breakdown</p>
      </div>

      {/* 5. RETEST */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col justify-between transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Retest</span>
          <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
        </div>
        <div className="mt-2 text-xl font-black text-indigo-600 font-mono">
          {stats.retestCount}
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">Re-inspection required</p>
      </div>

      {/* 6. CAPACITY UTILIZATION */}
      <div
        className={`border rounded-2xl p-3 shadow-2xs flex flex-col justify-between transition-all ${getUtilizationBadgeColor(
          stats.capacityUtilization
        )}`}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Capacity Util</span>
          <Gauge className="w-3.5 h-3.5" />
        </div>
        <div className="mt-2 text-xl font-black font-mono">
          {stats.capacityUtilization.toFixed(1)}%
        </div>
        <p className="text-[10px] opacity-80 mt-0.5 truncate">Target Load Factor</p>
      </div>

      {/* 7. PLANNED HOURS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col justify-between transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Planned Hrs</span>
          <Calendar className="w-3.5 h-3.5 text-blue-500" />
        </div>
        <div className="mt-2 text-xl font-black text-blue-700 font-mono">
          {stats.totalPlannedHours.toFixed(1)}<span className="text-xs font-normal">h</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">Total workload</p>
      </div>

      {/* 8. AVAILABLE HOURS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-2xs flex flex-col justify-between transition-all hover:border-slate-300">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-[10px] font-extrabold uppercase tracking-wider">Available Hrs</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
        </div>
        <div className="mt-2 text-xl font-black text-emerald-700 font-mono">
          {stats.totalAvailableHours.toFixed(1)}<span className="text-xs font-normal">h</span>
        </div>
        <p className="text-[10px] text-slate-400 mt-0.5 truncate">Daily operating shift</p>
      </div>
    </div>
  );
};
