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
} from 'lucide-react';
import { QueueRecord, TestingLine, User } from '../types';
import { EmbeddedTimeline } from './EmbeddedTimeline';
import { formatDateTime } from '../utils/formatters';

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

  const engineLines = useMemo(
    () => testingLines.filter((l) => l.componentGroup === 'Engine'),
    [testingLines]
  );

  const ptCylLines = useMemo(
    () => testingLines.filter((l) => l.componentGroup !== 'Engine'),
    [testingLines]
  );

  // Format Elapsed Time (from start Iso string to now)
  const calculateElapsedString = (startIso?: string) => {
    if (!startIso) return '00:00:00';
    const start = new Date(startIso).getTime();
    if (isNaN(start)) return '00:00:00';

    const diffMs = Math.max(0, currentTime.getTime() - start);
    const totalSecs = Math.floor(diffMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  const calculateElapsedMinutes = (startIso?: string) => {
    if (!startIso) return 0;
    const start = new Date(startIso).getTime();
    if (isNaN(start)) return 0;
    return Math.max(0, (currentTime.getTime() - start) / 60000);
  };

  const calculateEstFinishStr = (startIso: string, stdMinutes: number) => {
    const start = new Date(startIso).getTime();
    if (isNaN(start)) return '--:--';
    const finish = new Date(start + stdMinutes * 60 * 1000);
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
    return `${pad(finish.getHours())}:${pad(finish.getMinutes())}:${pad(finish.getSeconds())}`;
  };

  const renderStationCard = (line: TestingLine) => {
    // 1. Find running JO for this station
    const runningJO = queueRecords.find((q) => {
      if (q.status !== 'ON_PROCESS') return false;
      if (q.testingLineId === line.id) return true;
      // Fallback matching by process and component group
      if (!q.testingLineId) {
        if (line.componentGroup === 'Engine' && q.compGroup === 'Engine') {
          if (line.process === 'GLT' && q.gltStatus !== 'GOOD') return true;
          if (line.process === 'Dynotest' && q.gltStatus === 'GOOD') return true;
        }
        if (line.componentGroup !== 'Engine' && q.compGroup !== 'Engine') {
          if (line.process === 'GLT' && q.gltStatus !== 'GOOD') return true;
          if (line.process === 'Testbench' && q.gltStatus === 'GOOD') return true;
        }
      }
      return false;
    });

    // 2. Find next queued JOs (sorted by priority)
    const nextJOs = queueRecords
      .filter((q) => {
        if (q.status !== 'WAITING') return false;
        if (q.testingLineId === line.id) return true;
        if (!q.testingLineId) {
          if (line.componentGroup === 'Engine' && q.compGroup === 'Engine') return true;
          if (line.componentGroup !== 'Engine' && q.compGroup !== 'Engine') return true;
        }
        return false;
      })
      .sort((a, b) => a.currentPriority - b.currentPriority);

    const nextJO = nextJOs[0];
    const next2JO = nextJOs[1];

    // 3. Determine operational status
    const startTimeIso = runningJO?.gltReceivingTime || runningJO?.receivingTime || runningJO?.createdAt;
    const elapsedMins = calculateElapsedMinutes(startTimeIso);
    const stdMins = line.standardDurationMinutes || 60;
    const isDelayed = runningJO && elapsedMins > stdMins;

    let opStatus: 'IDLE' | 'WAITING' | 'RUNNING' | 'DELAYED' = 'IDLE';
    if (runningJO) {
      opStatus = isDelayed ? 'DELAYED' : 'RUNNING';
    } else if (nextJOs.length > 0) {
      opStatus = 'WAITING';
    }

    return (
      <div
        key={line.id}
        className={`rounded-2xl border p-4 transition-all shadow-xs flex flex-col justify-between ${
          isTvMode
            ? opStatus === 'DELAYED'
              ? 'bg-rose-950/60 border-rose-800 text-slate-100'
              : opStatus === 'RUNNING'
              ? 'bg-amber-950/60 border-amber-700 text-slate-100'
              : 'bg-slate-900 border-slate-800 text-slate-200'
            : opStatus === 'DELAYED'
            ? 'bg-rose-50/70 border-rose-300 text-slate-900'
            : opStatus === 'RUNNING'
            ? 'bg-amber-50/50 border-amber-300 text-slate-900'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div>
          {/* Card Top Header: Station Name & Operational Status */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200/50 mb-3">
            <div className="flex items-center space-x-2">
              <span
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                  line.process === 'GLT'
                    ? 'bg-blue-100 text-blue-800'
                    : line.process === 'Dynotest'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-cyan-100 text-cyan-800'
                }`}
              >
                {line.process}
              </span>
              <h4 className="text-sm font-black tracking-tight">{line.name}</h4>
            </div>

            <span
              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border ${
                opStatus === 'RUNNING'
                  ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
                  : opStatus === 'DELAYED'
                  ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                  : opStatus === 'WAITING'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}
            >
              {opStatus}
            </span>
          </div>

          {/* Current Running JO Section */}
          {runningJO ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Current Test JO
                  </span>
                  <div
                    onClick={() => onSelectJO && onSelectJO(runningJO.joRoNumber)}
                    className="text-base font-black font-mono text-blue-600 hover:underline cursor-pointer"
                  >
                    {runningJO.joRoNumber}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    runningJO.testType === 'RETEST'
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}
                >
                  {runningJO.testType}
                </span>
              </div>

              <div className="text-xs font-bold truncate">
                {runningJO.unitModel} — {runningJO.component}
              </div>

              {runningJO.assemblyMechanic && (
                <div className="text-[11px] text-slate-500 flex items-center space-x-1">
                  <UserIcon className="w-3 h-3 text-slate-400" />
                  <span className="truncate">{runningJO.assemblyMechanic}</span>
                </div>
              )}

              {/* Timing Box */}
              <div className="p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/80 space-y-1.5 font-mono text-xs mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Elapsed:</span>
                  <span className="font-black text-amber-600 text-sm">
                    {calculateElapsedString(startTimeIso)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-200/60">
                  <span>Std: <strong>{stdMins}m</strong></span>
                  <span>Est Finish: <strong>{calculateEstFinishStr(startTimeIso || '', stdMins)}</strong></span>
                </div>

                {/* Timing Status Badge */}
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Timing Status:</span>
                  {isDelayed ? (
                    <span className="text-[10px] font-black text-rose-600 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded">
                      DELAYED +{Math.round(elapsedMins - stdMins)} MIN
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">
                      ON TIME
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-slate-400 text-xs italic bg-slate-50/50 rounded-xl border border-dashed border-slate-200 my-2">
              No test job currently running on this line
            </div>
          )}
        </div>

        {/* Next Queued Jobs Footer */}
        <div className="pt-3 border-t border-slate-200/50 mt-3 text-[11px]">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Next in Queue</span>
            {nextJOs.length > 0 && (
              <span className="font-mono text-blue-600">{nextJOs.length} waiting</span>
            )}
          </div>

          {nextJO ? (
            <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-200/60 space-y-0.5">
              <div className="flex items-center justify-between font-bold text-slate-800">
                <span className="font-mono text-blue-700">#{nextJO.currentPriority} {nextJO.joRoNumber}</span>
                <span className="text-[9px] bg-slate-200 px-1.5 py-0.2 rounded">{nextJO.unitModel}</span>
              </div>
              <div className="text-[10px] text-slate-500 truncate">{nextJO.component}</div>
              {next2JO && (
                <div className="text-[9px] text-slate-400 truncate pt-0.5 border-t border-slate-200/40">
                  Followed by: #{next2JO.currentPriority} {next2JO.joRoNumber}
                </div>
              )}
            </div>
          ) : (
            <span className="text-slate-400 italic text-[10px]">Queue empty</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`min-h-screen p-3 sm:p-5 transition-colors space-y-5 ${
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
            Operational Station Workload, Timer Tracking & Embedded Timeline
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

      {/* 1. ENGINE TESTING MONITORING SECTION (Exactly 4 cards) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-xl">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider">ENGINE TESTING (4 STATIONS)</h3>
            <p className="text-[11px] text-slate-500">Live Engine GLT and Dynotest station status</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {engineLines.map(renderStationCard)}
        </div>
      </div>

      {/* 2. PT / CYLINDER TESTING MONITORING SECTION (Exactly 6 cards) */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-cyan-100 text-cyan-700 rounded-xl">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider">
              POWER TRAIN & CYLINDER TESTING (6 STATIONS)
            </h3>
            <p className="text-[11px] text-slate-500">
              Live Power Train, Cylinder, GLT, and Testbench station status
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ptCylLines.map(renderStationCard)}
        </div>
      </div>

      {/* 3. EMBEDDED TIMELINE SCHEDULE */}
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
