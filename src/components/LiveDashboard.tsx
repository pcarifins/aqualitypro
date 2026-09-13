import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  Tv,
  Clock,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronRight,
  ListOrdered,
  Gauge,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { QueueRecord, TestingLine, User } from '../types';
import { EmbeddedTimeline } from './EmbeddedTimeline';
import { formatDateTime } from '../utils/formatters';
import { calculateOverallCapacity } from '../utils/capacityCalculator';

interface LiveDashboardProps {
  queueRecords: QueueRecord[];
  testingLines: TestingLine[];
  currentUser?: User;
  onSelectJO?: (joNumber: string) => void;
}

export const LiveDashboard: React.FC<LiveDashboardProps> = ({
  queueRecords,
  testingLines,
  currentUser,
  onSelectJO,
}) => {
  const [isTvMode, setIsTvMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Ticking timer effect every 1 second to update live elapsed time and clock
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const orderedLines = useMemo(() => {
    const row1Ids = ['glt-engine', 'dyno-1', 'dyno-2', 'dyno-3', 'tb-4-cyl'];
    const row2Ids = ['glt-pt-ppm', 'tb-1', 'tb-2', 'tb-3', 'mobile-tb'];
    const allIds = [...row1Ids, ...row2Ids];

    return allIds
      .map((id) => testingLines.find((l) => l.id === id))
      .filter((l): l is TestingLine => Boolean(l));
  }, [testingLines]);

  const renderStationCard = (line: TestingLine) => {
    // 1. Find running JO for this station
    const runningJO = queueRecords.find((q) => {
      if (q.status !== 'ON_PROCESS') return false;
      const assigned = q.assignedLineId || q.currentTestingLineId || q.testingLineId;
      return assigned === line.id;
    });

    // 2. Find Priority 1 next waiting JO
    const waitingJOs = queueRecords.filter((q) => {
      if (q.status !== 'WAITING') return false;
      const assigned = q.assignedLineId || q.currentTestingLineId || q.testingLineId || q.priorityLineId;
      return assigned === line.id;
    });

    // Sort waiting JOs to find Priority 1
    waitingJOs.sort((a, b) => {
      const aTop = a.isTopPriority && (a.assignedLineId || a.priorityLineId) === line.id;
      const bTop = b.isTopPriority && (b.assignedLineId || b.priorityLineId) === line.id;
      if (aTop && !bTop) return -1;
      if (!aTop && bTop) return 1;
      if (aTop && bTop) return (a.topPriorityRank || 99) - (b.topPriorityRank || 99);
      return (a.currentPriority || 999) - (b.currentPriority || 999);
    });

    const nextJO = waitingJOs[0];

    // 3. Determine operational status: RUNNING / WAITING / IDLE / OFF
    let opStatus: 'RUNNING' | 'WAITING' | 'IDLE' | 'OFF' = 'IDLE';
    if (runningJO) {
      opStatus = 'RUNNING';
    } else if (line.active === false) {
      opStatus = 'OFF';
    } else if (waitingJOs.length > 0) {
      opStatus = 'WAITING';
    }

    // 4. Progress calculation for running JO
    let progressPct = 0;
    let progressColorBg = 'bg-[#059669]';
    let progressColorText = 'text-emerald-700 dark:text-emerald-400';

    if (runningJO) {
      const startIso = runningJO.receivingTime || runningJO.gltReceivingTime || runningJO.updatedAt || runningJO.createdAt;
      const startMs = new Date(startIso).getTime();
      const elapsedMins = !isNaN(startMs) ? Math.max(0, (currentTime.getTime() - startMs) / 60000) : 0;
      const stdMins = line.standardDurationMinutes || 120;
      progressPct = Math.round((elapsedMins / stdMins) * 100);

      if (progressPct >= 100) {
        progressColorBg = 'bg-[#DC2626]';
        progressColorText = 'text-rose-700 dark:text-rose-400';
      } else if (progressPct >= 80) {
        progressColorBg = 'bg-[#D97706]';
        progressColorText = 'text-amber-700 dark:text-amber-400';
      }
    }

    return (
      <div
        key={line.id}
        className={`rounded-xl border p-2.5 flex flex-col justify-between h-48 transition-all shadow-xs ${
          isTvMode
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Header: Process badge, Line name, Line status */}
        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center space-x-1 min-w-0">
            <span
              className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
                line.process === 'GLT'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                  : line.process === 'Dynotest'
                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                  : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
              }`}
            >
              {line.process}
            </span>
            <h4 className="text-xs font-black tracking-tight truncate">{line.name}</h4>
          </div>

          <span
            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded shrink-0 ${
              opStatus === 'RUNNING'
                ? 'bg-[#059669] text-white animate-pulse'
                : opStatus === 'WAITING'
                ? 'bg-[#D97706] text-white'
                : opStatus === 'OFF'
                ? 'bg-[#DC2626] text-white'
                : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {opStatus}
          </span>
        </div>

        {/* Card Body */}
        <div className="flex-1 flex flex-col justify-between py-1.5 space-y-1">
          {runningJO ? (
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-1">
                <span
                  onClick={() => onSelectJO && onSelectJO(runningJO.joRoNumber)}
                  className="text-xs font-black font-mono text-blue-600 dark:text-blue-400 hover:underline cursor-pointer truncate"
                  title={runningJO.joRoNumber}
                >
                  {runningJO.joRoNumber}
                </span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                    runningJO.testType === 'RETEST'
                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  }`}
                >
                  {runningJO.testType || 'PROD'}
                </span>
              </div>

              <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate" title={runningJO.unitModel}>
                {runningJO.unitModel}
              </div>

              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate" title={runningJO.component}>
                {runningJO.component}
              </div>

              {/* Progress Bar & Percentage */}
              <div className="pt-1 space-y-0.5">
                <div className="flex items-center justify-between text-[10px] font-black">
                  <span className="text-slate-500">Progress</span>
                  <span className={progressColorText}>{progressPct}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${progressColorBg}`}
                    style={{ width: `${Math.min(progressPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center text-slate-400 dark:text-slate-500 text-xs italic">
              No test currently running
            </div>
          )}
        </div>

        {/* Card Footer: Next JO */}
        <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] font-bold text-slate-600 dark:text-slate-400">
          <span>
            {nextJO ? (
              <span className="text-blue-600 dark:text-blue-400 font-mono font-bold">
                Next: JO {nextJO.joRoNumber}
              </span>
            ) : (
              <span className="text-slate-400 italic">Next: No waiting JO</span>
            )}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen p-3 sm:p-5 transition-colors space-y-4 ${
        isTvMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      {/* Top Header Controls */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 shadow-xs ${
          isTvMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div>
          <div className="flex items-center space-x-2 text-blue-500 text-xs font-bold uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4 text-blue-500 animate-pulse" />
            <span>Realtime Testing Station Overview</span>
          </div>
          <h2 className="text-xl font-black tracking-tight uppercase">LIVE TESTING MONITORING</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational Station Workload, Line Status & Embedded Timeline
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Live Clock Display */}
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>

          {/* TV Mode Toggle Button */}
          <button
            onClick={() => setIsTvMode(!isTvMode)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all shadow-2xs ${
              isTvMode
                ? 'bg-amber-500 text-slate-950 border-amber-400 hover:bg-amber-400'
                : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>{isTvMode ? 'Exit TV Mode' : 'TV Mode'}</span>
          </button>
        </div>
      </div>

      {/* 10 TESTING CARDS IN 2 ROWS OF 5 (Desktop Grid) */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {orderedLines.map(renderStationCard)}
        </div>
      </div>

      {/* EMBEDDED TIMELINE SCHEDULE */}
      <div className="pt-2">
        <EmbeddedTimeline
          queueRecords={queueRecords}
          testingLines={testingLines}
          onSelectJO={onSelectJO}
          isTvMode={isTvMode}
        />
      </div>
    </div>
  );
};
