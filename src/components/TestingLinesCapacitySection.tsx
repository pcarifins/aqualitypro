import React from 'react';
import { Layers, Settings, Clock, Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LineCapacitySummary } from '../utils/capacityCalculator';

interface TestingLinesCapacitySectionProps {
  summaries: LineCapacitySummary[];
  onOpenSetup: () => void;
  canConfigure: boolean;
}

export const TestingLinesCapacitySection: React.FC<TestingLinesCapacitySectionProps> = ({
  summaries,
  onOpenSetup,
  canConfigure,
}) => {
  const engineLines = summaries.filter((s) => s.componentGroup === 'Engine');
  const ptCylLines = summaries.filter((s) => s.componentGroup !== 'Engine');

  const renderLineCard = (line: LineCapacitySummary) => {
    const isOverloaded = line.utilizationPercent > 100;
    const isHigh = line.utilizationPercent >= 85 && !isOverloaded;

    return (
      <div
        key={line.lineId}
        className="bg-white border border-slate-200 rounded-2xl p-3.5 shadow-2xs space-y-2 hover:border-slate-300 transition-all"
      >
        <div className="flex items-center justify-between">
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
            <span className="text-xs font-black text-slate-900">{line.lineName}</span>
          </div>

          <div className="flex items-center space-x-1 font-mono text-[11px] font-bold">
            <span className={isOverloaded ? 'text-rose-600' : isHigh ? 'text-amber-600' : 'text-emerald-600'}>
              {line.utilizationPercent.toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${
              isOverloaded
                ? 'bg-rose-500'
                : isHigh
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(100, line.utilizationPercent)}%` }}
          />
        </div>

        <div className="grid grid-cols-3 gap-1 pt-1 text-[10px] text-slate-500 border-t border-slate-100">
          <div>
            Workload: <strong className="text-slate-800 font-mono">{line.plannedHours.toFixed(1)}h</strong>
          </div>
          <div>
            Capacity: <strong className="text-slate-800 font-mono">{line.availableHours.toFixed(1)}h</strong>
          </div>
          <div>
            Rem: <strong className="text-slate-800 font-mono">{line.remainingHours.toFixed(1)}h</strong>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
          <span className="flex items-center space-x-1">
            <Activity className="w-3 h-3 text-amber-500" />
            <span>{line.runningCount} Active</span>
          </span>
          <span className="flex items-center space-x-1">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{line.queuedCount} Waiting</span>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4 shadow-xs">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-100 text-blue-700 rounded-xl">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Testing Lines Capacity Status
            </h3>
            <p className="text-[11px] text-slate-500">
              Live station workload distribution & available operating hours
            </p>
          </div>
        </div>

        {canConfigure && (
          <button
            onClick={onOpenSetup}
            className="flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-all shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Line Setup</span>
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Engine Group */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Engine Testing Lines ({engineLines.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {engineLines.map(renderLineCard)}
          </div>
        </div>

        {/* PT / Cylinder Group */}
        <div>
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-cyan-500" />
            <span>Power Train & Cylinder Testing Lines ({ptCylLines.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {ptCylLines.map(renderLineCard)}
          </div>
        </div>
      </div>
    </div>
  );
};
