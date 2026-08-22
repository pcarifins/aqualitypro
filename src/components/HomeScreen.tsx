import React, { useState } from 'react';
import {
  ClipboardCheck,
  Gauge,
  Activity,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Sparkles,
  AlertCircle,
  ListOrdered,
  LayoutDashboard,
} from 'lucide-react';
import { CombinedJORecords, DashboardStats, CompGroup, UserRole } from '../types';
import { formatDuration, formatDate } from '../utils/formatters';
import { PriorityQueue } from './PriorityQueue';

interface HomeScreenProps {
  onNavigate: (tab: any, joToPreload?: string) => void;
  historyRecords: CombinedJORecords[];
  dashboardStats: DashboardStats;
  onOpenJODetail: (joNumber: string) => void;
  userRole?: UserRole | string;
  currentUserName?: string;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigate,
  historyRecords,
  dashboardStats,
  onOpenJODetail,
  userRole = 'OPERATOR',
  currentUserName = 'Operator',
}) => {
  const roleUpper = (userRole || '').toUpperCase();
  const isPPC = roleUpper === 'PPC';

  const [activeView, setActiveView] = useState<'QUEUE' | 'OVERVIEW'>('QUEUE');
  const [searchQuery, setSearchQuery] = useState('');

  // Find JOs that passed GLT but haven't been received in Dyno/Testbench
  const pendingDyno = historyRecords.filter(
    (r) =>
      r.productCategory === 'Engine' &&
      r.gltRecords.length > 0 &&
      r.gltRecords[r.gltRecords.length - 1].result === 'GOOD' &&
      r.dynoRecords.length === 0
  );

  const pendingTestbench = historyRecords.filter(
    (r) =>
      r.productCategory === 'Power Train Component' &&
      r.gltRecords.length > 0 &&
      r.gltRecords[r.gltRecords.length - 1].result === 'GOOD' &&
      r.hydraulicRecords.length === 0
  );

  // Today's stats calculation
  const todayStr = new Date().toISOString().split('T')[0];
  let todayCompletedCount = 0;
  let todayNGCount = 0;

  historyRecords.forEach((jo) => {
    jo.gltRecords.forEach((rec) => {
      if (rec.testDate === todayStr || rec.incomingTime?.startsWith(todayStr)) {
        todayCompletedCount++;
        if (rec.result === 'NOT GOOD') todayNGCount++;
      }
    });
    jo.dynoRecords.forEach((rec) => {
      if (rec.receivingTime?.startsWith(todayStr) || rec.submissionTime?.startsWith(todayStr)) {
        todayCompletedCount++;
        if (rec.result === 'NOT GOOD') todayNGCount++;
      }
    });
    jo.hydraulicRecords.forEach((rec) => {
      if (rec.receivingTime?.startsWith(todayStr) || rec.submissionTime?.startsWith(todayStr)) {
        todayCompletedCount++;
        if (rec.result === 'NOT GOOD') todayNGCount++;
      }
    });
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (roleUpper === 'SUPERVISOR' || roleUpper === 'ADMIN' || userRole === 'administrator') {
        onNavigate('history', searchQuery.trim());
      } else {
        onOpenJODetail(searchQuery.trim());
      }
    }
  };

  const handleStartTestFromQueue = (
    joNumber: string,
    compGroup: CompGroup,
    testType?: 'PROD' | 'RETEST',
    gltStatus?: string
  ) => {
    if (testType === 'RETEST') {
      if (compGroup === 'Engine') {
        onNavigate('dyno', joNumber);
      } else {
        onNavigate('hydraulic', joNumber);
      }
    } else {
      if (gltStatus === 'GOOD') {
        if (compGroup === 'Engine') {
          onNavigate('dyno', joNumber);
        } else {
          onNavigate('hydraulic', joNumber);
        }
      } else {
        onNavigate('glt', joNumber);
      }
    }
  };

  return (
    <div className="space-y-5 pb-20 max-w-6xl mx-auto px-2 sm:px-4 pt-2">
      {/* Top Banner with Mode Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>AQuality PRO • Operations Station</span>
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">
              {activeView === 'QUEUE' ? 'PPC Priority Testing Queue' : 'Station Overview & Quick Actions'}
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-xl leading-relaxed">
              {activeView === 'QUEUE'
                ? 'Authorized sequence of jobs for Engine (Dynotest) and PT-PPM / Cylinder (Testbench).'
                : 'Digital quality checksheet & lead time tracking replacing manual paper logs.'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* View switcher tabs */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center space-x-1 border border-slate-700">
              <button
                onClick={() => setActiveView('QUEUE')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  activeView === 'QUEUE'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>Priority Queue</span>
              </button>

              <button
                onClick={() => setActiveView('OVERVIEW')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  activeView === 'OVERVIEW'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Overview & Actions</span>
              </button>
            </div>

            {/* Quick Search */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex items-center bg-white border border-slate-300 rounded-xl p-1 shadow-2xs focus-within:ring-2 focus-within:ring-blue-500 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-slate-400 ml-2.5" />
              <input
                type="text"
                placeholder="Search JO..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-xs text-slate-900 placeholder-slate-400 focus:outline-none px-2.5 py-1.5 w-28 sm:w-36 font-mono uppercase font-semibold"
              />
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all"
              >
                Go
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Main View Mode */}
      {activeView === 'QUEUE' ? (
        /* PRIORITY QUEUE COMPONENT */
        <PriorityQueue
          currentUserRole={userRole}
          currentUserName={currentUserName}
          onOpenJODetail={onOpenJODetail}
          onStartTest={handleStartTestFromQueue}
        />
      ) : (
        /* OVERVIEW MODE */
        <div className="space-y-6">
          {/* Quick Action Floor Tiles */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
              Test Execution Quick Actions
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              <button
                onClick={() => onNavigate('glt')}
                className="bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 rounded-2xl p-4.5 text-left transition-all group shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-bold shadow-2xs">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                    GLT Inspection (PROD)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Visual & leak inspection before testing bench
                  </p>
                </div>
              </button>

              <button
                onClick={() => onNavigate('dyno')}
                className="bg-white hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-2xl p-4.5 text-left transition-all group shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-bold shadow-2xs">
                    <Gauge className="w-5 h-5" />
                  </div>
                  {pendingDyno.length > 0 && (
                    <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 shadow-2xs">
                      {pendingDyno.length} Ready
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Dynotest (Engine)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Engine dyno load testing & lead time
                  </p>
                </div>
              </button>

              <button
                onClick={() => onNavigate('hydraulic')}
                className="bg-white hover:bg-cyan-50/50 border border-slate-200 hover:border-cyan-300 rounded-2xl p-4.5 text-left transition-all group shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center font-bold shadow-2xs">
                    <Activity className="w-5 h-5" />
                  </div>
                  {pendingTestbench.length > 0 && (
                    <span className="bg-cyan-50 text-cyan-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-200 shadow-2xs">
                      {pendingTestbench.length} Ready
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 group-hover:text-cyan-700 transition-colors">
                    Testbench (PT-PPM & Cylinder)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hydraulic pump, motor, valve & cylinder bench
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Today's Operational KPIs */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1">
              Today's Overview
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
                <div className="text-[11px] font-medium text-slate-600 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Tests Logged Today</span>
                </div>
                <div className="text-xl font-black text-slate-900 mt-2 font-mono">
                  {todayCompletedCount}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Logged submissions</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
                <div className="text-[11px] font-medium text-slate-600 flex items-center space-x-1.5">
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                  <span>NOT GOOD Today</span>
                </div>
                <div className="text-xl font-black text-rose-600 mt-2 font-mono">
                  {todayNGCount}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Defect submissions</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex flex-col justify-between shadow-xs">
                <div className="text-[11px] font-medium text-slate-600 flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Avg GLT Lead Time</span>
                </div>
                <div className="text-sm font-bold text-amber-600 mt-2 truncate font-mono">
                  {formatDuration(dashboardStats.avgGltLeadTimeMinutes)}
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">Average transfer duration</p>
              </div>
            </div>
          </div>

          {/* Ready for Test Bench Receiving Queue */}
          {(pendingDyno.length > 0 || pendingTestbench.length > 0) && (
            <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-2">
                <h3 className="text-xs font-bold text-amber-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Pending Test Bench Receiving ({pendingDyno.length + pendingTestbench.length})</span>
                </h3>
                <span className="text-[11px] text-amber-700 font-medium">
                  GLT Passed → Waiting to Receive
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto">
                {pendingDyno.map((jo) => (
                  <div
                    key={jo.joNumber}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-amber-200/80 text-xs shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 flex items-center space-x-2 flex-wrap sm:flex-nowrap gap-y-1">
                        <span className="font-mono text-xs text-slate-900 whitespace-nowrap font-extrabold">{jo.joNumber}</span>
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap shrink-0 font-semibold">
                          Engine
                        </span>
                        <span className="text-slate-500 font-normal truncate">
                          {jo.productModel}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5 truncate">
                        Mechanic: <span className="text-slate-700 font-medium">{jo.assemblyMechanic}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigate('dyno', jo.joNumber)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 shrink-0 whitespace-nowrap"
                    >
                      <span>Receive @ Dyno</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {pendingTestbench.map((jo) => (
                  <div
                    key={jo.joNumber}
                    className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white border border-amber-200/80 text-xs shadow-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-slate-900 flex items-center space-x-2 flex-wrap sm:flex-nowrap gap-y-1">
                        <span className="font-mono text-xs text-slate-900 whitespace-nowrap font-extrabold">{jo.joNumber}</span>
                        <span className="bg-cyan-100 text-cyan-800 border border-cyan-200 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap shrink-0 font-semibold">
                          {jo.compGroup || 'PT-PPM'}
                        </span>
                        <span className="text-slate-500 font-normal truncate">
                          {jo.productModel}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px] mt-0.5 truncate">
                        Mechanic: <span className="text-slate-700 font-medium">{jo.assemblyMechanic}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => onNavigate('hydraulic', jo.joNumber)}
                      className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-[11px] px-2.5 py-1.5 rounded-lg transition-colors flex items-center space-x-1 shrink-0 whitespace-nowrap"
                    >
                      <span>Receive @ Testbench</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
