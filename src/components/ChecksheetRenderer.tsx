import React from 'react';
import { CheckCircle2, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { ChecksheetItem, ChecksheetAnswer } from '../types';

export type NormalizedInputType = 'GOOD_NOT_GOOD' | 'NUMERIC' | 'TEXT' | 'YES_NO';

export function normalizeInputType(type?: string): NormalizedInputType {
  if (!type) return 'TEXT';
  const clean = type.toString().toUpperCase().replace(/[^A-Z]/g, '');
  if (clean.includes('GOOD') || clean.includes('NG')) return 'GOOD_NOT_GOOD';
  if (clean.includes('NUM') || clean.includes('NUMBER')) return 'NUMERIC';
  if (clean.includes('YES') || clean.includes('NO')) return 'YES_NO';
  return 'TEXT';
}

export interface NumericEvaluation {
  hasStandard: boolean;
  status: 'PASS' | 'FAIL' | 'RECORDED' | 'EMPTY';
  standardText: string;
}

export function evaluateNumericItem(
  val: string,
  validation?: string,
  min?: number,
  max?: number,
  target?: number,
  tol?: number,
  unit?: string
): NumericEvaluation {
  const cleanUnit = unit ? ` ${unit}` : '';
  const num = parseFloat(val);
  const isFilled = val !== undefined && val !== null && val.trim() !== '' && !isNaN(num);

  if (!validation || validation === 'NONE') {
    return {
      hasStandard: false,
      status: isFilled ? 'RECORDED' : 'EMPTY',
      standardText: '-',
    };
  }

  let stdText = '-';
  let isPass = true;

  if (validation === 'RANGE') {
    stdText = `${min !== undefined ? min : '-'} – ${max !== undefined ? max : '-'}${cleanUnit}`.trim();
    if (isFilled) {
      if (min !== undefined && num < min) isPass = false;
      if (max !== undefined && num > max) isPass = false;
    }
  } else if (validation === 'MINIMUM') {
    stdText = `≥ ${min !== undefined ? min : '-'}${cleanUnit}`.trim();
    if (isFilled && min !== undefined && num < min) isPass = false;
  } else if (validation === 'MAXIMUM') {
    stdText = `≤ ${max !== undefined ? max : '-'}${cleanUnit}`.trim();
    if (isFilled && max !== undefined && num > max) isPass = false;
  } else if (validation === 'TARGET_TOLERANCE') {
    stdText = `${target !== undefined ? target : '-'} ± ${tol !== undefined ? tol : '-'}${cleanUnit}`.trim();
    if (isFilled && target !== undefined && tol !== undefined) {
      const lower = target - tol;
      const upper = target + tol;
      if (num < lower || num > upper) isPass = false;
    }
  }

  if (!isFilled) {
    return { hasStandard: true, status: 'EMPTY', standardText: stdText };
  }

  return {
    hasStandard: true,
    status: isPass ? 'PASS' : 'FAIL',
    standardText: stdText,
  };
}

export interface ChecksheetRendererProps {
  items: ChecksheetItem[];
  answers: Record<string, string>;
  onAnswerChange: (itemId: string, val: string) => void;
  itemRemarks?: Record<string, string>;
  onItemRemarkChange?: (itemId: string, remark: string) => void;
  validationAttempted?: boolean;
}

export const ChecksheetRenderer: React.FC<ChecksheetRendererProps> = ({
  items,
  answers,
  onAnswerChange,
  itemRemarks = {},
  onItemRemarkChange,
  validationAttempted = false,
}) => {
  // Group active items by section
  const activeItems = items.filter((i) => i.active !== false);
  const sections = Array.from(new Set(activeItems.map((i) => i.section || 'General Inspection')));

  return (
    <div className="space-y-4">
      {sections.map((sectionName) => {
        const sectionItems = activeItems.filter((i) => (i.section || 'General Inspection') === sectionName);

        return (
          <div
            key={sectionName}
            className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs"
          >
            {/* Section Header */}
            <div className="bg-slate-50/80 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                {sectionName}
              </h4>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-md">
                {sectionItems.length} {sectionItems.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Section Items */}
            <div className="divide-y divide-slate-100">
              {sectionItems.map((item, index) => {
                const normType = normalizeInputType(item.inputType);
                const currentVal = answers[item.id] || '';
                const currentRemark = itemRemarks[item.id] || '';
                const isMandatory = !!item.mandatory;
                const isMissingMandatory = validationAttempted && isMandatory && currentVal.trim() === '';

                const numEval =
                  normType === 'NUMERIC'
                    ? evaluateNumericItem(
                        currentVal,
                        item.validation,
                        item.minimumValue,
                        item.maximumValue,
                        item.targetValue,
                        item.toleranceValue,
                        item.unit
                      )
                    : null;

                return (
                  <div
                    key={item.id}
                    id={`checksheet-item-${item.id}`}
                    className={`p-3.5 sm:p-4 transition-colors ${
                      isMissingMandatory
                        ? 'bg-rose-50/70 border-l-4 border-l-rose-500'
                        : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                      {/* Left: Item Name, Standard, Mandatory Badge */}
                      <div className="space-y-1 flex-1 pr-2">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-400 font-mono">
                            {(index + 1).toString().padStart(2, '0')}.
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900">
                            {item.itemName}
                          </span>
                          {isMandatory && (
                            <span className="text-rose-500 font-black text-sm" title="Mandatory Field">
                              *
                            </span>
                          )}
                          {isMandatory ? (
                            <span className="text-[10px] bg-rose-50 text-rose-700 font-semibold px-1.5 py-0.5 rounded border border-rose-200">
                              Required
                            </span>
                          ) : (
                            <span className="text-[10px] bg-slate-100 text-slate-500 font-medium px-1.5 py-0.5 rounded">
                              Optional
                            </span>
                          )}
                        </div>

                        {/* Standard Display */}
                        {normType === 'NUMERIC' && numEval && numEval.hasStandard && (
                          <div className="text-[11px] text-slate-500 flex items-center space-x-1 font-mono">
                            <span className="text-slate-400 font-sans">Standard:</span>
                            <span className="font-semibold text-slate-700">{numEval.standardText}</span>
                          </div>
                        )}

                        {item.description && (
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Right: Interactive Input Controls */}
                      <div className="flex items-center space-x-2 shrink-0">
                        {/* 1. GOOD / NOT GOOD TOGGLE */}
                        {normType === 'GOOD_NOT_GOOD' && (
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => onAnswerChange(item.id, 'GOOD')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs border ${
                                currentVal === 'GOOD'
                                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-500/20'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>GOOD</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onAnswerChange(item.id, 'NOT GOOD')}
                              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 shadow-2xs border ${
                                currentVal === 'NOT GOOD'
                                  ? 'bg-rose-600 border-rose-600 text-white shadow-rose-500/20'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              <span>NOT GOOD</span>
                            </button>
                          </div>
                        )}

                        {/* 2. NUMERIC INPUT WITH UNIT & STATUS PILL */}
                        {normType === 'NUMERIC' && (
                          <div className="flex items-center space-x-2">
                            <div className="relative">
                              <input
                                type="number"
                                step="any"
                                placeholder="Actual"
                                value={currentVal}
                                onChange={(e) => onAnswerChange(item.id, e.target.value)}
                                className={`w-28 sm:w-32 bg-white border rounded-lg px-3 py-1.5 text-xs sm:text-sm text-slate-900 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs ${
                                  isMissingMandatory
                                    ? 'border-rose-400 bg-rose-50/50'
                                    : 'border-slate-300'
                                }`}
                              />
                            </div>

                            {item.unit && (
                              <span className="text-xs font-semibold text-slate-500 font-mono min-w-[32px]">
                                {item.unit}
                              </span>
                            )}

                            {/* Evaluation Status */}
                            {numEval && numEval.hasStandard && currentVal.trim() !== '' && (
                              <span
                                className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${
                                  numEval.status === 'PASS'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 animate-pulse'
                                }`}
                              >
                                {numEval.status}
                              </span>
                            )}
                          </div>
                        )}

                        {/* 3. YES / NO TOGGLE */}
                        {normType === 'YES_NO' && (
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => onAnswerChange(item.id, 'YES')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                currentVal === 'YES'
                                  ? 'bg-blue-600 border-blue-600 text-white'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              YES
                            </button>

                            <button
                              type="button"
                              onClick={() => onAnswerChange(item.id, 'NO')}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                currentVal === 'NO'
                                  ? 'bg-rose-600 border-rose-600 text-white'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              NO
                            </button>
                          </div>
                        )}

                        {/* 4. TEXT INPUT */}
                        {normType === 'TEXT' && (
                          <input
                            type="text"
                            placeholder="Inspection observations"
                            value={currentVal}
                            onChange={(e) => onAnswerChange(item.id, e.target.value)}
                            className={`w-44 sm:w-56 bg-white border rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs ${
                              isMissingMandatory
                                ? 'border-rose-400 bg-rose-50/50'
                                : 'border-slate-300'
                            }`}
                          />
                        )}
                      </div>
                    </div>

                    {/* Defect Description Prompt for NOT GOOD item */}
                    {currentVal === 'NOT GOOD' && (
                      <div className="mt-2.5 pt-2 border-t border-rose-100 flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-2">
                        <span className="text-[11px] font-bold text-rose-700 flex items-center space-x-1 shrink-0">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Defect Detail <span className="text-rose-500">*</span>:</span>
                        </span>
                        <input
                          type="text"
                          placeholder="Specify defect observation, visual crack, leakage or measured abnormality..."
                          value={currentRemark}
                          onChange={(e) =>
                            onItemRemarkChange && onItemRemarkChange(item.id, e.target.value)
                          }
                          className="w-full bg-rose-50/40 border border-rose-300 rounded-md px-2.5 py-1 text-xs text-rose-950 placeholder-rose-400 focus:outline-none focus:border-rose-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
