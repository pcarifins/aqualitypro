import React, { useState } from 'react';
import { Settings, Save, X, RotateCcw, Clock, Layers } from 'lucide-react';
import { TestingLine } from '../types';
import { apiClient } from '../api/client';

interface LineSetupModalProps {
  lines: TestingLine[];
  onClose: () => void;
  onRefresh: () => void;
  currentUserName: string;
}

export const LineSetupModal: React.FC<LineSetupModalProps> = ({
  lines,
  onClose,
  onRefresh,
  currentUserName,
}) => {
  const [editedLines, setEditedLines] = useState<TestingLine[]>([...lines]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleFieldChange = (id: string, field: keyof TestingLine, value: any) => {
    setEditedLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      for (const line of editedLines) {
        await apiClient.saveTestingLine(line, currentUserName);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      onRefresh();
    } catch (err) {
      console.error('Failed to save testing line settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-5 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">
                Testing Line Capacity Parameters Setup
              </h3>
              <p className="text-[11px] text-slate-500">
                Configure standard operating hours and target durations per testing station
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {saveSuccess && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2 rounded-xl">
            Testing line configurations saved successfully!
          </div>
        )}

        <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {editedLines.map((line) => (
              <div
                key={line.id}
                className={`p-3.5 rounded-xl border transition-all text-xs space-y-2.5 ${
                  line.active
                    ? 'bg-white border-slate-200 shadow-2xs'
                    : 'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        line.process === 'GLT'
                          ? 'bg-blue-100 text-blue-800'
                          : line.process === 'Dynotest'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-cyan-100 text-cyan-800'
                      }`}
                    >
                      {line.process}
                    </span>
                    <strong className="text-slate-900 font-bold">{line.name}</strong>
                  </div>

                  <label className="flex items-center space-x-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={line.active}
                      onChange={(e) => handleFieldChange(line.id, 'active', e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-semibold text-slate-600">Active</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Operating Hours / Day
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="24"
                      value={line.operatingHoursPerDay}
                      onChange={(e) =>
                        handleFieldChange(line.id, 'operatingHoursPerDay', parseFloat(e.target.value) || 8)
                      }
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">
                      Std Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      step="5"
                      min="10"
                      max="480"
                      value={line.standardDurationMinutes}
                      onChange={(e) =>
                        handleFieldChange(
                          line.id,
                          'standardDurationMinutes',
                          parseInt(e.target.value, 10) || 60
                        )
                      }
                      className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => setEditedLines([...lines])}
            className="flex items-center space-x-1 text-slate-500 hover:text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Changes</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all flex items-center space-x-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
