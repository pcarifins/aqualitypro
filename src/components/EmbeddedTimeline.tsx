import React, { useState, useMemo } from 'react';
import { Clock, Calendar, AlertTriangle, Layers, ChevronRight, Activity, CheckCircle2 } from 'lucide-react';
import { QueueRecord, TestingLine } from '../types';
import { formatDateTime } from '../utils/formatters';

interface EmbeddedTimelineProps {
  queueRecords: QueueRecord[];
  testingLines: TestingLine[];
  onSelectJO?: (joNumber: string) => void;
  isTvMode?: boolean;
}

export const EmbeddedTimeline: React.FC<EmbeddedTimelineProps> = ({
  queueRecords,
  testingLines,
  onSelectJO,
  isTvMode = false,
}) => {
  const [viewMode, setViewMode] = useState<'TODAY' | 'WEEK'>('TODAY');
  const [selectedJobBar, setSelectedJobBar] = useState<QueueRecord | null>(null);

  // Time slots for TODAY (7:00 AM to 7:00 PM - 12 hours)
  const todayHours = useMemo(() => {
    const hours = [];
    for (let h = 7; h <= 19; h++) {
      hours.push(`${h < 10 ? '0' : ''}${h}:00`);
    }
    return hours;
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
    let startTime = record.gltReceivingTime || record.receivingTime || record.createdAt;
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
    const widthPercent = Math.min(100 - leftPercent, Math.max(5, (durationMins / timelineTotalMinutes) * 100));

    return {
      left: `${leftPercent}%`,
      width: `${widthPercent}%`,
    };
  };

  const getStatusStyle = (record: QueueRecord, lineStdMinutes: number) => {
    if (record.status === 'FINISH') {
      return 'bg-emerald-500 text-white border-emerald-600';
    }
    if (record.status === 'ON_PROCESS') {
      const receiveTime = new Date(record.gltReceivingTime || record.receivingTime || record.createdAt).getTime();
      const elapsedMins = (Date.now() - receiveTime) / 60000;
      if (elapsedMins > lineStdMinutes) {
        return 'bg-rose-500 text-white border-rose-600 animate-pulse';
      }
      return 'bg-amber-500 text-white border-amber-600 animate-pulse';
    }
    if (record.isUrgentUnassigned) {
      return 'bg-purple-600 text-white border-purple-700';
    }
    if (record.testType === 'RETEST') {
      return 'bg-indigo-600 text-white border-indigo-700';
    }
    return 'bg-blue-600 text-white border-blue-700';
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

  const renderLineRow = (line: TestingLine) => {
    // Find JOs matching this line
    const lineJobs = queueRecords.filter((q) => {
      if (q.testingLineId === line.id) return true;
      if (!q.testingLineId) {
        // Fallback match by component group and process
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
        <div className="flex-1 relative h-9 bg-slate-100/50 rounded-lg overflow-hidden border border-slate-200/50 flex items-center">
          {/* Vertical hour guide lines */}
          <div className="absolute inset-0 grid grid-cols-12 pointer-events-none">
            {todayHours.slice(0, 12).map((_, idx) => (
              <div key={idx} className="border-r border-slate-200/40 h-full" />
            ))}
          </div>

          {/* Job Bars */}
          {lineJobs.length === 0 ? (
            <span className="text-[10px] text-slate-400 italic px-3 z-10">No jobs scheduled</span>
          ) : (
            lineJobs.map((record) => {
              const pos = getBarPosition(record, line);
              const statusStyle = getStatusStyle(record, line.standardDurationMinutes);
              const statusLabel = getStatusLabel(record, line.standardDurationMinutes);

              return (
                <div
                  key={record.queueRecordId}
                  onClick={() => {
                    setSelectedJobBar(record);
                    if (onSelectJO) onSelectJO(record.joRoNumber);
                  }}
                  style={{ left: pos.left, width: pos.width }}
                  className={`absolute h-7 rounded-md px-2 flex items-center justify-between text-[10px] font-bold border shadow-2xs cursor-pointer transition-transform hover:scale-[1.02] z-10 ${statusStyle}`}
                  title={`JO: ${record.joRoNumber} | ${record.unitModel} - ${record.component} (${statusLabel})`}
                >
                  <span className="truncate font-mono font-black">{record.joRoNumber}</span>
                  <span className="text-[9px] opacity-90 hidden sm:inline uppercase tracking-tighter">
                    {statusLabel}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`rounded-2xl p-4 shadow-sm border transition-all ${
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
            <p className="text-[11px] text-slate-500">Live Gantt-style station allocation and progress bars</p>
          </div>
        </div>

        {/* Today vs Week View Selector */}
        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setViewMode('TODAY')}
            className={`px-3 py-1 rounded-lg transition-all ${
              viewMode === 'TODAY'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            TODAY
          </button>
          <button
            onClick={() => setViewMode('WEEK')}
            className={`px-3 py-1 rounded-lg transition-all ${
              viewMode === 'WEEK'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            WEEK
          </button>
        </div>
      </div>

      {/* Hour Scale Header */}
      <div className="flex items-center py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
        <div className="w-36 shrink-0">Station Line</div>
        <div className="flex-1 grid grid-cols-12 text-center font-mono">
          {todayHours.slice(0, 12).map((timeStr) => (
            <div key={timeStr}>{timeStr}</div>
          ))}
        </div>
      </div>

      {/* Timeline Content */}
      <div className="space-y-4 pt-2 max-h-[500px] overflow-y-auto pr-1">
        {/* Engine Section */}
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-blue-600 mb-1 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Engine Testing Lines ({engineLines.length})</span>
          </div>
          {engineLines.map(renderLineRow)}
        </div>

        {/* PT / Cylinder Section */}
        <div>
          <div className="text-[10px] font-black uppercase tracking-wider text-cyan-600 mb-1 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>Power Train & Cylinder Testing Lines ({ptCylLines.length})</span>
          </div>
          {ptCylLines.map(renderLineRow)}
        </div>
      </div>

      {/* Selected Job Bar Details Popover / Modal */}
      {selectedJobBar && (
        <div className="mt-4 p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900 animate-in fade-in duration-150">
          <div className="flex items-center space-x-3">
            <span className="font-mono font-black text-blue-800 bg-white px-2 py-1 rounded border border-blue-200">
              JO: {selectedJobBar.joRoNumber}
            </span>
            <div>
              <strong>{selectedJobBar.unitModel}</strong> — {selectedJobBar.component}
              <span className="text-[11px] text-blue-700 ml-2">
                (Type: {selectedJobBar.testType} | Priority: #{selectedJobBar.currentPriority})
              </span>
            </div>
          </div>
          <button
            onClick={() => setSelectedJobBar(null)}
            className="text-blue-500 hover:text-blue-800 text-xs font-bold px-2 py-0.5 rounded hover:bg-blue-100"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
};
