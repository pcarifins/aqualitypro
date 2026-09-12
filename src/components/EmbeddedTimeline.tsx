import React, { useState, useMemo } from 'react';
import {
  Clock,
  Calendar,
  AlertTriangle,
  Layers,
  ChevronRight,
  Activity,
  CheckCircle2,
  User as UserIcon,
  Play,
  Info,
} from 'lucide-react';
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
  line: TestingLine;
  x: number;
  y: number;
}

export const EmbeddedTimeline: React.FC<EmbeddedTimelineProps> = ({
  queueRecords,
  testingLines,
  onSelectJO,
  isTvMode = false,
}) => {
  const [viewMode, setViewMode] = useState<'TODAY' | 'WEEK'>('TODAY');
  const [hoveredJob, setHoveredJob] = useState<HoveredJobInfo | null>(null);
  const [selectedJobBar, setSelectedJobBar] = useState<QueueRecord | null>(null);

  // Time slots for TODAY (7:00 AM to 7:00 PM - 12 hours)
  const todayHours = useMemo(() => {
    const hours = [];
    for (let h = 7; h <= 19; h++) {
      hours.push(`${h < 10 ? '0' : ''}${h}:00`);
    }
    return hours;
  }, []);

  // 7 Days of Current Week for WEEK View (Monday to Sunday)
  const weekDays = useMemo(() => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, ...
    const distanceToMonday = (currentDay + 6) % 7; // Monday = 0

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

  const engineLines = useMemo(
    () => testingLines.filter((l) => l.componentGroup === 'Engine'),
    [testingLines]
  );

  const ptCylLines = useMemo(
    () => testingLines.filter((l) => l.componentGroup !== 'Engine'),
    [testingLines]
  );

  // Calculate position and width % for a job bar on 7:00 - 19:00 timeline (12 hour span = 720 mins)
  const getBarPosition = (record: QueueRecord, line: TestingLine) => {
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
    if (relativeStart > timelineTotalMinutes) relativeStart = timelineTotalMinutes - 30;

    const leftPercent = (relativeStart / timelineTotalMinutes) * 100;
    const durationMins = line.standardDurationMinutes || 60;
    const widthPercent = Math.min(100 - leftPercent, Math.max(8, (durationMins / timelineTotalMinutes) * 100));

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  const getStatusStyle = (record: QueueRecord, lineStdMinutes: number) => {
    if (record.status === 'FINISH') {
      return 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600';
    }
    if (record.status === 'ON_PROCESS') {
      const receiveTime = new Date(record.gltReceivingTime || record.receivingTime || record.createdAt).getTime();
      const elapsedMins = (Date.now() - receiveTime) / 60000;
      if (elapsedMins > lineStdMinutes) {
        return 'bg-rose-500 text-white border-rose-600 animate-pulse hover:bg-rose-600';
      }
      return 'bg-amber-500 text-white border-amber-600 animate-pulse hover:bg-amber-600';
    }
    if (record.isUrgentUnassigned) {
      return 'bg-purple-600 text-white border-purple-700 hover:bg-purple-700';
    }
    if (record.testType === 'RETEST') {
      return 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700';
    }
    return 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700';
  };

  const getStatusLabel = (record: QueueRecord, lineStdMinutes: number) => {
    if (record.status === 'FINISH') return 'COMPLETE';
    if (record.status === 'ON_PROCESS') {
      const receiveTime = new Date(record.gltReceivingTime || record.receivingTime || record.createdAt).getTime();
      const elapsedMins = (Date.now() - receiveTime) / 60000;
      if (elapsedMins > lineStdMinutes) return 'DELAYED';
      return 'RUNNING';
    }
    if (record.isUrgentUnassigned) return 'URGENT';
    if (record.testType === 'RETEST') return 'RETEST';
    return 'WAITING';
  };

  const handleMouseEnterBar = (
    e: React.MouseEvent,
    record: QueueRecord,
    line: TestingLine
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredJob({
      record,
      line,
      x: rect.left + rect.width / 2,
      y: rect.top,
    });
  };

  const handleMouseLeaveBar = () => {
    setHoveredJob(null);
  };

  // Helper to extract a clean, recognizable component label
  const getCleanCompName = (record: QueueRecord) => {
    if (record.component) return record.component;
    if (record.unitModel) return record.unitModel;
    return record.compGroup;
  };

  // RENDER TODAY ROW (Hourly Gantt)
  const renderTodayLineRow = (line: TestingLine) => {
    const lineJobs = queueRecords.filter((q) => {
      return (q.currentTestingLineId || q.testingLineId) === line.id;
    });

    return (
      <div
        key={line.id}
        className={`flex items-center border-b ${
          isTvMode ? 'border-slate-800' : 'border-slate-100'
        } py-2 hover:bg-slate-500/5 transition-all`}
      >
        {/* Line Label */}
        <div className="w-36 shrink-0 pr-3 flex items-center space-x-2">
          <span
            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
              line.process === 'GLT'
                ? 'bg-blue-100 text-blue-800'
                : line.process === 'Dynotest'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-cyan-100 text-cyan-800'
            }`}
          >
            {line.process}
          </span>
          <span className={`text-xs font-bold truncate ${isTvMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {line.name}
          </span>
        </div>

        {/* Timeline Bar Track */}
        <div className="flex-1 relative h-9 bg-slate-100/60 dark:bg-slate-800/60 rounded-lg overflow-hidden border border-slate-200/60 flex items-center">
          {/* Vertical hour guide lines */}
          <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
            {todayHours.slice(0, 12).map((_, idx) => (
              <div key={idx} className="border-r border-slate-200/40 dark:border-slate-700/40 h-full" />
            ))}
          </div>

          {/* Job Bars - Display JO Number (joRoNumber) */}
          {lineJobs.length === 0 ? (
            <span className="text-[10px] text-slate-400 italic px-3 z-10">No jobs scheduled</span>
          ) : (
            lineJobs.map((record) => {
              const pos = getBarPosition(record, line);
              const statusStyle = getStatusStyle(record, line.standardDurationMinutes);

              return (
                <div
                  key={record.queueRecordId}
                  onMouseEnter={(e) => handleMouseEnterBar(e, record, line)}
                  onMouseLeave={handleMouseLeaveBar}
                  onClick={() => {
                    setSelectedJobBar(record);
                    if (onSelectJO) onSelectJO(record.joRoNumber);
                  }}
                  style={{ left: pos.left, width: pos.width }}
                  className={`absolute h-7 rounded-md px-2 flex items-center justify-center text-[10px] font-bold border shadow-2xs cursor-pointer transition-transform hover:scale-[1.03] z-10 ${statusStyle}`}
                >
                  <span className="truncate font-mono font-black tracking-tight">{record.joRoNumber}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // RENDER WEEK ROW (7 Day Grid)
  const renderWeekLineRow = (line: TestingLine) => {
    // Filter jobs belonging to this line
    const lineJobs = queueRecords.filter((q) => {
      return (q.currentTestingLineId || q.testingLineId) === line.id;
    });

    return (
      <div
        key={line.id}
        className={`flex items-stretch border-b ${
          isTvMode ? 'border-slate-800' : 'border-slate-100'
        } py-2 hover:bg-slate-500/5 transition-all`}
      >
        {/* Line Label */}
        <div className="w-36 shrink-0 pr-3 flex items-center space-x-2">
          <span
            className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
              line.process === 'GLT'
                ? 'bg-blue-100 text-blue-800'
                : line.process === 'Dynotest'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-cyan-100 text-cyan-800'
            }`}
          >
            {line.process}
          </span>
          <span className={`text-xs font-bold truncate ${isTvMode ? 'text-slate-100' : 'text-slate-900'}`}>
            {line.name}
          </span>
        </div>

        {/* 7 Days Grid Track */}
        <div className="flex-1 grid grid-cols-7 gap-1.5 min-h-[44px]">
          {weekDays.map((day, dayIndex) => {
            // Allocate jobs to day based on date string match or index offset
            const dayJobs = lineJobs.filter((job) => {
              const jobDateStr = (job.gltReceivingTime || job.receivingTime || job.createdAt || '').split('T')[0];
              if (jobDateStr === day.fullDateStr) return true;
              // If only date is available or queue item created today, show on today
              if (day.isToday && (!jobDateStr || jobDateStr === new Date().toISOString().split('T')[0])) {
                return true;
              }
              // Distribute subsequent queue items across the week based on priority
              const queueIndex = lineJobs.indexOf(job);
              return Math.floor(queueIndex / 3) === dayIndex;
            });

            return (
              <div
                key={day.fullDateStr}
                className={`rounded-lg p-1.5 flex flex-col justify-start gap-1 border transition-all ${
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
                  <span className="text-[9px] text-slate-400 italic text-center py-2">—</span>
                ) : (
                  dayJobs.map((record) => {
                    const statusStyle = getStatusStyle(record, line.standardDurationMinutes);

                    return (
                      <div
                        key={record.queueRecordId}
                        onMouseEnter={(e) => handleMouseEnterBar(e, record, line)}
                        onMouseLeave={handleMouseLeaveBar}
                        onClick={() => {
                          setSelectedJobBar(record);
                          if (onSelectJO) onSelectJO(record.joRoNumber);
                        }}
                        className={`py-1 px-1.5 rounded-md text-[10px] font-mono font-black text-center truncate border shadow-2xs cursor-pointer transition-transform hover:scale-[1.02] ${statusStyle}`}
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
      className={`rounded-2xl p-4 shadow-sm border transition-all relative ${
        isTvMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}
    >
      {/* Header & Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-xl">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider">Testing Schedule Timeline</h3>
            <p className="text-[11px] text-slate-500">
              {viewMode === 'TODAY'
                ? 'Hourly station progress and component allocation (Hover card for details)'
                : 'Weekly station line schedule across 7 days (Hover component for details)'}
            </p>
          </div>
        </div>

        {/* Today vs Week View Selector */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setViewMode('TODAY')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'TODAY'
                ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            TODAY
          </button>
          <button
            onClick={() => setViewMode('WEEK')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'WEEK'
                ? 'bg-white text-blue-700 shadow-2xs dark:bg-slate-700 dark:text-blue-300'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
            }`}
          >
            WEEK
          </button>
        </div>
      </div>

      {/* Column Scale Header (Hours for Today / Days for Week) */}
      {viewMode === 'TODAY' ? (
        <div className="flex items-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
          <div className="w-36 shrink-0">Station Line</div>
          <div className="flex-1 grid grid-cols-12 text-center font-mono">
            {todayHours.slice(0, 12).map((timeStr) => (
              <div key={timeStr}>{timeStr}</div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex items-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
          <div className="w-36 shrink-0">Station Line</div>
          <div className="flex-1 grid grid-cols-7 gap-1.5 text-center">
            {weekDays.map((day) => (
              <div
                key={day.fullDateStr}
                className={`py-1 rounded-md ${
                  day.isToday ? 'bg-blue-100 text-blue-800 font-black' : 'text-slate-500'
                }`}
              >
                <span>{day.dayName}</span> <span className="font-mono text-[9px] opacity-80">({day.dateStr})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Content */}
      <div className="space-y-4 pt-2 max-h-[500px] overflow-y-auto pr-1">
        {/* Engine Section */}
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 mb-1 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Engine Testing Lines ({engineLines.length})</span>
          </div>
          {engineLines.map(viewMode === 'TODAY' ? renderTodayLineRow : renderWeekLineRow)}
        </div>

        {/* PT / Cylinder Section */}
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-cyan-600 mb-1 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>Power Train & Cylinder Testing Lines ({ptCylLines.length})</span>
          </div>
          {ptCylLines.map(viewMode === 'TODAY' ? renderTodayLineRow : renderWeekLineRow)}
        </div>
      </div>

      {/* Rich Interactive Hover Popover Tooltip */}
      {hoveredJob && (
        <div
          style={{
            position: 'fixed',
            left: `${Math.min(window.innerWidth - 300, Math.max(16, hoveredJob.x - 140))}px`,
            top: `${Math.max(16, hoveredJob.y - 170)}px`,
            zIndex: 9999,
          }}
          className="w-72 bg-slate-900 text-slate-100 rounded-2xl p-3.5 shadow-2xl border border-slate-700 pointer-events-none animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-700 mb-2">
            <span className="font-mono font-black text-amber-400 text-xs">
              {hoveredJob.record.joRoNumber}
            </span>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                hoveredJob.record.status === 'FINISH'
                  ? 'bg-emerald-500 text-white'
                  : hoveredJob.record.status === 'ON_PROCESS'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {getStatusLabel(hoveredJob.record, hoveredJob.line.standardDurationMinutes)}
            </span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="font-bold text-white text-sm truncate">
              {hoveredJob.record.component}
            </div>
            <div className="text-slate-400 text-[11px] flex items-center justify-between">
              <span>Model: <strong className="text-slate-200">{hoveredJob.record.unitModel}</strong></span>
              <span>Type: <strong className="text-slate-200">{hoveredJob.record.testType}</strong></span>
            </div>

            <div className="text-[11px] text-slate-300 pt-1 border-t border-slate-800 flex items-center justify-between">
              <span>Station: <strong className="text-blue-400">{hoveredJob.line.name}</strong></span>
              <span>Priority: <strong className="text-amber-400">#{hoveredJob.record.currentPriority}</strong></span>
            </div>

            {hoveredJob.record.assemblyMechanic && (
              <div className="text-[10px] text-slate-400 flex items-center space-x-1 pt-1">
                <UserIcon className="w-3 h-3 text-slate-500" />
                <span className="truncate">Mechanic: {hoveredJob.record.assemblyMechanic}</span>
              </div>
            )}

            <div className="text-[9px] text-slate-400 text-center pt-1 italic opacity-80">
              Click to view detailed Job Order record
            </div>
          </div>
        </div>
      )}

      {/* Selected Job Bar Details Card */}
      {selectedJobBar && (
        <div className="mt-4 p-3 bg-blue-50/90 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center justify-between text-xs text-blue-900 dark:text-blue-200 animate-in fade-in duration-150">
          <div className="flex items-center space-x-3">
            <span className="font-mono font-black text-blue-800 dark:text-blue-300 bg-white dark:bg-slate-800 px-2 py-1 rounded border border-blue-200 dark:border-blue-700">
              JO: {selectedJobBar.joRoNumber}
            </span>
            <div>
              <strong>{selectedJobBar.unitModel}</strong> — {selectedJobBar.component}
              <span className="text-[11px] text-blue-700 dark:text-blue-300 ml-2">
                (Type: {selectedJobBar.testType} | Priority: #{selectedJobBar.currentPriority})
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedJobBar(null)}
            className="text-blue-500 hover:text-blue-800 dark:text-blue-300 text-xs font-bold px-2 py-0.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900 cursor-pointer"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
