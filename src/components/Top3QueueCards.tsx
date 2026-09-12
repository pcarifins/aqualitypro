import React from 'react';
import { QueueRecord } from '../types';
import { CheckCircle2, Layers } from 'lucide-react';

interface Top3QueueCardsProps {
  cards: QueueRecord[];
  selectedQueueId?: string;
  selectedJONumber?: string;
  onSelectCard: (record: QueueRecord) => void;
  accentColor?: 'blue' | 'emerald' | 'cyan';
  emptyMessage?: string;
}

export const Top3QueueCards: React.FC<Top3QueueCardsProps> = ({
  cards,
  selectedQueueId,
  selectedJONumber,
  onSelectCard,
  accentColor = 'blue',
  emptyMessage = 'No eligible JO in queue',
}) => {
  if (!cards || cards.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
        <div className="text-xs font-bold text-slate-700">{emptyMessage}</div>
        <p className="text-[11px] text-slate-400 mt-1">
          No workflow-ready and compatible jobs are currently available for this testing line.
        </p>
      </div>
    );
  }

  const getBorderColor = (isSelected: boolean) => {
    if (!isSelected) return 'border-slate-200 hover:border-slate-300 bg-white';
    if (accentColor === 'emerald') return 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500';
    if (accentColor === 'cyan') return 'border-cyan-500 bg-cyan-50/50 ring-2 ring-cyan-500';
    return 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500';
  };

  const getBadgeColor = (isSelected: boolean) => {
    if (!isSelected) return 'bg-slate-100 text-slate-700 border-slate-200';
    if (accentColor === 'emerald') return 'bg-emerald-600 text-white border-emerald-600';
    if (accentColor === 'cyan') return 'bg-cyan-600 text-white border-cyan-600';
    return 'bg-blue-600 text-white border-blue-600';
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
          <Layers className="w-3.5 h-3.5 text-slate-500" />
          <span>Top 3 Queue for this Line (Click to Select)</span>
        </span>
        <span className="text-[11px] text-slate-400 font-medium">
          {cards.length} {cards.length === 1 ? 'Job' : 'Jobs'} Eligible
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {cards.map((card, index) => {
          const isSelected =
            (selectedQueueId && card.queueRecordId === selectedQueueId) ||
            (selectedJONumber && card.joRoNumber.toUpperCase() === selectedJONumber.toUpperCase());

          const isRetest = card.testType === 'RETEST';

          return (
            <button
              key={card.queueRecordId}
              type="button"
              onClick={() => onSelectCard(card)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative shadow-2xs focus:outline-none focus:ring-2 focus:ring-offset-1 flex flex-col justify-between min-h-[100px] ${getBorderColor(
                isSelected
              )}`}
              tabIndex={0}
              aria-pressed={isSelected}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCard(card);
                }
              }}
            >
              <div>
                {/* Header: Sequence Position & Test Type */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${getBadgeColor(isSelected)}`}>
                    #{index + 1} in Queue
                  </span>
                  <span
                    className={`text-[10px] font-black px-1.5 py-0.5 rounded border ${
                      isRetest
                        ? 'bg-rose-100 text-rose-800 border-rose-200'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {card.testType}
                  </span>
                </div>

                {/* JO Number */}
                <div className="font-mono font-black text-sm text-slate-900 tracking-tight flex items-center space-x-1">
                  <span>JO {card.joRoNumber}</span>
                  {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 inline shrink-0" />}
                </div>

                {/* Unit Model & Comp Name */}
                <div className="mt-1 text-xs font-bold text-slate-800 truncate" title={card.unitModel}>
                  {card.unitModel}
                </div>
                <div className="text-[11px] text-slate-500 font-medium truncate" title={card.component}>
                  {card.component}
                </div>
              </div>

              {card.status === 'ON_PROCESS' && (
                <div className="mt-2 pt-1 border-t border-slate-100/80 text-[10px] font-bold text-amber-600 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  <span>ON PROCESS</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
