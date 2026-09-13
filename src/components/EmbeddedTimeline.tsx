import React, { useState, useMemo } from 'react';
import { Clock, Info, User as UserIcon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { QueueRecord, TestingLine } from '../types';
import { formatDateTime } from '../utils/formatters';

interface EmbeddedTimelineProps {
  queueRecords: QueueRecord[];
  testingLines: TestingLine[];
  onSelectJO?: (joNumber: string) => void;
  isTvMode?: boolean;
}

interface HoveredJobInfo {
  record: QueueRecord;
  lineName: string;
  process: string;
  x: number;
  y: number;
  startTime: string;
  finishTime: string;
  statusLabel: string;
}

interface LineConfig {
  id: string;
  name: string;
  process: 'GLT' | 'Dynotest' | 'Testbench';
  compGroup: 'Engine' | 'PT-PPM' | 'Cylinder';
  standardDurationMinutes: number;
}

const GROUP1_DEFS: LineConfig[] = [
  { id: 'glt-engine', name: 'GLT Engine', process: 'GLT', compGroup: 'Engine', standardDurationMinutes: 45 },
  { id: 'dyno-1', name: 'Dyno 1', process: 'Dynotest', compGroup: 'Engine', standardDurationMinutes: 180 },
  { id: 'dyno-2', name: 'Dyno 2', process: 'Dynotest', compGroup: 'Engine', standardDurationMinutes: 180 },
  { id: 'dyno-3', name: 'Dyno 3', process: 'Dynotest', compGroup: 'Engine', standardDurationMinutes: 180 },
  { id: 'tb-4-cyl', name: 'Testbench 4', process: 'Testbench', compGroup: 'Cylinder', standardDurationMinutes: 120 },
];

const GROUP2_DEFS: LineConfig[] = [
  { id: 'glt-pt-ppm', name: 'GLT PT-PPM', process: 'GLT', compGroup: 'PT-PPM', standardDurationMinutes: 45 },
  { id: 'tb-1', name: 'TB1', process: 'Testbench', compGroup: 'PT-PPM', standardDurationMinutes: 120 },
  { id: 'tb-2', name: 'TB2', process: 'Testbench', compGroup: 'PT-PPM', standardDurationMinutes: 120 },
  { id: 'tb-3', name: 'TB3', process: 'Testbench', compGroup: 'PT-PPM', standardDurationMinutes: 120 },
  { id: 'mobile-tb', name: 'MTB', process: 'Testbench', compGroup: 'PT-PPM', standardDurationMinutes: 90 },
];

export const EmbeddedTimeline: React.FC<EmbeddedTimelineProps> = ({
  queueRecords,
  testingLines,
  onSelectJO,
  isTvMode = false,
}) => {
  const [viewMode, setViewMode] = useState<'TODAY' | 'WEEK'>('TODAY');
  const [hoveredJob, setHoveredJob] = useState<HoveredJobInfo | null>(null);

  // Time slots for TODAY (07:00 to 19:00 - 12 hours)
  const todayHours = useMemo(() => {
    const hours = [];
    for (let h = 7; h <= 19; h++) {
      hours.push(`${h < 10 ? '0' : ''}${h}:00`);
    }
    return hours;
  }, []);

  // 7 Days of Current Week (Monday to Sunday)
  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay();
    const distanceToMonday = (currentDay + 6) % 7;

    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    const days = [];
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      days.push({
        date: d,
        dayName: dayNames[i],
        dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
        fullDateStr: d.toISOString().split('T')[0],
        isToday,
      });
    }
    return days;
  }, []);

  // Merge runtime testingLines config with standard definitions
  const group1Lines = useMemo(() => {
    return GROUP1_DEFS.map((def) => {
      const live = testingLines.find((l) => l.id.toLowerCase() === def.id.toLowerCase());
      return {
        ...def,
        name: live?.name || def.name,
        standardDurationMinutes: live?.standardDurationMinutes || def.standardDurationMinutes,
      };
    });
  }, [testingLines]);

  const group2Lines = useMemo(() => {
    return GROUP2_DEFS.map((def) => {
      const live = testingLines.find((l) => l.id.toLowerCase() === def.id.toLowerCase());
      return {
        ...def,
        name: live?.name || def.name,
        standardDurationMinutes: live?.standardDurationMinutes || def.standardDurationMinutes,
      };
    });
  }, [testingLines]);

  // Calculate position and width % for a job bar on 07:00 - 19:00 timeline (12 hour span = 720 mins)
  const getBarPosition = (record: QueueRecord, lineStdMinutes: number) => {
    const startTime = record.gltReceivingTime || record.receivingTime || record.createdAt;
    let startDate = new Date(startTime);
    if (isNaN(startDate.getTime())) {
      startDate = new Date();
    }

    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const timelineStartMinutes = 7 * 60; // 07:00 = 420 mins
    const timelineTotalMinutes = 12 * 60; // 12 hours = 720 mins

    let relativeStart = startMinutes - timelineStartMinutes;
    if (relativeStart < 0) relativeStart = 0;
    if (relativeStart > timelineTotalMinutes - 20) relativeStart = timelineTotalMinutes - 40;

    const leftPercent = (relativeStart / timelineTotalMinutes) * 100;
    const durationMins = lineStdMinutes || 60;
    const widthPercent = Math.min(
      100 - leftPercent,
      Math.max(7, (durationMins / timelineTotalMinutes) * 100)
    );

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  // Color coding by process & status override
  const getStatusStyle = (record: QueueRecord, process: 'GLT' | 'Dynotest' | 'Testbench', stdMinutes: number) => {
    if (record.status === 'FINISH') {
      return 'bg-[#64748B] border-slate-700 text-slate-100 hover:bg-slate-500';
    }
    if (record.status === 'ON_PROCESS') {
      const receiveTime = new Date(record.gltReceivingTime || record.receivingTime || record.createdAt).getTime();
      const elapsedMins = (Date.now() - receiveTime) / 60000;
      if (elapsedMins > stdMinutes) {
        return 'bg-[#DC2626] text-white border-rose-400 font-extrabold ring-2 ring-rose-400/60 animate-pulse hover:bg-rose-500';
      }
      return 'bg-[#059669] text-white border-emerald-400 font-extrabold ring-2 ring-emerald-400/60 animate-pulse hover:bg-emerald-500';
    }

    // WAITING / PLANNED: Use process-specific colors
    if (process === 'GLT') {
      return 'bg-[#2563EB] text-white border-blue-700 hover:bg-blue-500';
    }
    if (process === 'Dynotest') {
      return 'bg-[#7C3AED] text-white border-purple-700 hover:bg-purple-500';
    }
    // Testbench
    return 'bg-[#0891B2] text-white border-cyan-700 hover:bg-cyan-500';
  };

  const getStatusLabel = (record: QueueRecord, stdMinutes: number) => {
    if (record.status === 'FINISH') return 'COMPLETE';
    if (record.status === 'ON_PROCESS') {
      const receiveTime = new Date(record.gltReceivingTime || record.receivingTime || record.createdAt).getTime();
      const elapsedMins = (Date.now() - receiveTime) / 60000;
      if (elapsedMins > stdMinutes) return 'DELAYED';
      return 'RUNNING';
    }
    return 'WAITING';
  };

  const handleMouseEnterBar = (
    e: React.MouseEvent,
    record: QueueRecord,
    line: LineConfig
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const startTimeStr = record.gltReceivingTime || record.receivingTime || record.createdAt;
    const startObj = new Date(startTimeStr);
    const startFormatted = !isNaN(startObj.getTime())
      ? startObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '08:00';
    
    const finishObj = new Date(startObj.getTime() + (line.standardDurationMinutes || 60) * 60000);
    const finishFormatted = !isNaN(finishObj.getTime())
      ? finishObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '09:00';

    setHoveredJob({
      record,
      lineName: line.name,
      process: line.process,
      x: Math.min(window.innerWidth - 180, Math.max(10, rect.left + rect.width / 2)),
      y: Math.max(10, rect.top - 120),
      startTime: startFormatted,
      finishTime: finishFormatted,
      statusLabel: getStatusLabel(record, line.standardDurationMinutes),
    });
  };

  const handleMouseLeaveBar = () => {
    setHoveredJob(null);
  };

  // Render a Single Line Row in Today View
  const renderTodayLineRow = (line: LineConfig) => {
    const lineJobs = queueRecords.filter((q) => {
      const activeLineId = (q.currentTestingLineId || q.testingLineId || '').toLowerCase();
      if (activeLineId) {
        return activeLineId === line.id.toLowerCase();
      }
      // Fallback matching logic
      if (line.compGroup === 'Engine' && q.compGroup === 'Engine') {
        if (line.process === 'GLT') return true;
        if (line.id === 'dyno-1') return true;
      }
      if (line.compGroup === 'Cylinder' && q.compGroup === 'Cylinder') {
        if (line.id === 'tb-4-cyl') return true;
      }
      if (line.compGroup === 'PT-PPM' && q.compGroup === 'PT-PPM') {
        if (line.process === 'GLT' && line.id === 'glt-pt-ppm') return true;
        if (line.id === 'tb-1') return true;
      }
      return false;
    });

    return (
      <div
        key={line.id}
        className={`flex items-center border-b ${
          isTvMode ? 'border-slate-800' : 'border-slate-100'
        } py-1 hover:bg-slate-500/5 transition-all h-7`}
      >
        {/* Line Station Label */}
        <div className="w-28 shrink-0 pr-2 flex items-center space-x-1.5">
          <span
            className={`text-[8px] font-black uppercase px-1 py-0.2 rounded shrink-0 ${
              line.process === 'GLT'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : line.process === 'Dynotest'
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-cyan-100 text-cyan-800 border border-cyan-200'
            }`}
          >
            {line.process}
          </span>
          <span
            className={`text-xs font-bold truncate ${
              isTvMode ? 'text-slate-100' : 'text-slate-800'
            }`}
            title={line.name}
          >
            {line.name}
          </span>
        </div>

        {/* Timeline Bar Track */}
        <div className="flex-1 relative h-6 bg-slate-100/60 dark:bg-slate-800/60 rounded-md overflow-hidden border border-slate-200/60 flex items-center">
          {/* Hour Guide Grid Lines */}
          <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
            {todayHours.slice(0, 12).map((_, idx) => (
              <div key={idx} className="border-r border-slate-200/40 dark:border-slate-700/40 h-full" />
            ))}
          </div>

          {/* Job Bars */}
          {lineJobs.length === 0 ? (
            <span className="text-[9px] text-slate-400 italic px-2 z-10 select-none">No active JO</span>
          ) : (
            lineJobs.map((record) => {
              const pos = getBarPosition(record, line.standardDurationMinutes);
              const statusStyle = getStatusStyle(record, line.process, line.standardDurationMinutes);

              return (
                <div
                  key={record.queueRecordId}
                  onMouseEnter={(e) => handleMouseEnterBar(e, record, line)}
                  onMouseLeave={handleMouseLeaveBar}
                  onClick={() => {
                    if (onSelectJO) onSelectJO(record.joRoNumber);
                  }}
                  style={{ left: pos.left, width: pos.width }}
                  className={`absolute h-5 rounded px-1.5 flex items-center justify-center text-[10px] font-bold border shadow-2xs cursor-pointer transition-transform hover:scale-[1.02] z-10 ${statusStyle}`}
                >
                  <span className="truncate font-mono font-black tracking-tight text-white drop-shadow-xs">
                    {record.joRoNumber}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // Render a Single Line Row in Week View
  const renderWeekLineRow = (line: LineConfig) => {
    const lineJobs = queueRecords.filter((q) => {
      const activeLineId = (q.currentTestingLineId || q.testingLineId || '').toLowerCase();
      if (activeLineId) {
        return activeLineId === line.id.toLowerCase();
      }
      return false;
    });

    return (
      <div
        key={line.id}
        className={`flex items-stretch border-b ${
          isTvMode ? 'border-slate-800' : 'border-slate-100'
        } py-1 hover:bg-slate-500/5 transition-all`}
      >
        <div className="w-28 shrink-0 pr-2 flex items-center space-x-1.5">
          <span
            className={`text-[8px] font-black uppercase px-1 py-0.2 rounded shrink-0 ${
              line.process === 'GLT'
                ? 'bg-blue-100 text-blue-800'
                : line.process === 'Dynotest'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-cyan-100 text-cyan-800'
            }`}
          >
            {line.process}
          </span>
          <span className={`text-xs font-bold truncate ${isTvMode ? 'text-slate-100' : 'text-slate-800'}`}>
            {line.name}
          </span>
        </div>

        <div className="flex-1 grid grid-cols-7 gap-1 min-h-[26px]">
          {weekDays.map((day, dayIndex) => {
            const dayJobs = lineJobs.filter((job) => {
              const jobDateStr = (job.gltReceivingTime || job.receivingTime || job.createdAt || '').split('T')[0];
              if (jobDateStr === day.fullDateStr) return true;
              if (day.isToday && (!jobDateStr || jobDateStr === new Date().toISOString().split('T')[0])) {
                return true;
              }
              const queueIndex = lineJobs.indexOf(job);
              return Math.floor(queueIndex / 3) === dayIndex;
            });

            return (
              <div
                key={day.fullDateStr}
                className={`rounded p-1 flex flex-col justify-start gap-1 border transition-all ${
                  day.isToday
                    ? isTvMode
                      ? 'bg-blue-950/40 border-blue-700/60'
                      : 'bg-blue-50/70 border-blue-200'
                    : isTvMode
                    ? 'bg-slate-800/40 border-slate-700/40'
                    : 'bg-slate-50/70 border-slate-200/60'
                }`}
              >
                {dayJobs.length === 0 ? (
                  <span className="text-[8px] text-slate-400 italic text-center py-0.5">—</span>
                ) : (
                  dayJobs.map((record) => {
                    const statusStyle = getStatusStyle(record, line.process, line.standardDurationMinutes);
                    return (
                      <div
                        key={record.queueRecordId}
                        onMouseEnter={(e) => handleMouseEnterBar(e, record, line)}
                        onMouseLeave={handleMouseLeaveBar}
                        onClick={() => {
                          if (onSelectJO) onSelectJO(record.joRoNumber);
                        }}
                        className={`py-0.5 px-1 rounded text-[9px] font-mono font-black text-center truncate border cursor-pointer ${statusStyle}`}
                      >
                        {record.joRoNumber}
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`rounded-2xl p-3 shadow-xs border transition-all relative ${
        isTvMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Timeline Header & Controls */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1 bg-blue-100 text-blue-700 rounded-lg">
            <Clock className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider">Testing Schedule Timeline</h3>
            <p className="text-[10px] text-slate-500">
              10 Active Line Stations (All fit on single screen view)
            </p>
          </div>
        </div>

        {/* Legend Indicator */}
        <div className="flex items-center space-x-2 text-[10px] font-bold">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-slate-600">GLT</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-purple-600" />
            <span className="text-slate-600">Dynotest</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-cyan-600" />
            <span className="text-slate-600">Testbench</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-600" />
            <span className="text-slate-600">Running</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-600" />
            <span className="text-slate-600">Delayed</span>
          </span>
        </div>

        {/* Today vs Week View Selector */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-bold">
          <button
            onClick={() => setViewMode('TODAY')}
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              viewMode === 'TODAY'
                ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            TODAY
          </button>
          <button
            onClick={() => setViewMode('WEEK')}
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
              viewMode === 'WEEK'
                ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            WEEK
          </button>
        </div>
      </div>

      {/* Hourly Column Grid Header */}
      {viewMode === 'TODAY' ? (
        <div className="flex items-center py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
          <div className="w-28 shrink-0">Station Line</div>
          <div className="flex-1 grid grid-cols-12 text-center font-mono">
            {todayHours.slice(0, 12).map((timeStr) => (
              <div key={timeStr}>{timeStr}</div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center py-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
          <div className="w-28 shrink-0">Station Line</div>
          <div className="flex-1 grid grid-cols-7 gap-1 text-center">
            {weekDays.map((day) => (
              <div key={day.fullDateStr} className={day.isToday ? 'text-blue-600 font-black' : ''}>
                {day.dayName} ({day.dateStr})
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TIMELINE GROUPS CONTAINER */}
      <div className="space-y-2 mt-1">
        {/* GROUP 1: ENGINE & CYLINDER TESTING LINES */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-700 bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 flex items-center justify-between">
            <span>ENGINE & CYLINDER TESTING LINES</span>
            <span className="text-[9px] font-normal text-blue-600">5 Lines (GLT Engine, Dyno 1-3, TB4)</span>
          </div>
          {group1Lines.map((line) =>
            viewMode === 'TODAY' ? renderTodayLineRow(line) : renderWeekLineRow(line)
          )}
        </div>

        {/* GROUP 2: POWER TRAIN & PPM TESTING LINES */}
        <div className="space-y-0.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-purple-700 bg-purple-50/80 px-2 py-0.5 rounded border border-purple-100 flex items-center justify-between">
            <span>POWER TRAIN & PPM TESTING LINES</span>
            <span className="text-[9px] font-normal text-purple-600">5 Lines (GLT PT-PPM, TB1-3, MTB)</span>
          </div>
          {group2Lines.map((line) =>
            viewMode === 'TODAY' ? renderTodayLineRow(line) : renderWeekLineRow(line)
          )}
        </div>
      </div>

      {/* HOVER TOOLTIP CARD */}
      {hoveredJob && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredJob.x}px`,
            top: `${hoveredJob.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="z-50 bg-slate-900 text-white p-3 rounded-xl shadow-2xl border border-slate-700 max-w-xs text-xs pointer-events-none space-y-1.5 animate-in fade-in duration-150"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-2">
            <span className="font-mono font-black text-blue-400 text-sm">{hoveredJob.record.joRoNumber}</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
              {hoveredJob.statusLabel}
            </span>
          </div>

          <div className="space-y-1 text-[11px] text-slate-300">
            <div>
              <span className="text-slate-400">Station:</span>{' '}
              <strong className="text-white">{hoveredJob.lineName}</strong> ({hoveredJob.process})
            </div>
            <div>
              <span className="text-slate-400">Unit Model:</span>{' '}
              <strong className="text-slate-100">{hoveredJob.record.unitModel}</strong>
            </div>
            <div>
              <span className="text-slate-400">Component:</span>{' '}
              <strong className="text-slate-100">{hoveredJob.record.component}</strong>
            </div>
            <div className="pt-1 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Start: <strong className="text-slate-200">{hoveredJob.startTime}</strong></span>
              <span>Finish: <strong className="text-slate-200">{hoveredJob.finishTime}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
