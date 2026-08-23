import React, { useState } from 'react';
import { CombinedJORecords } from '../types';
import {
  X,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Wrench,
  FileText,
  AlertTriangle,
  Camera,
  Printer,
  Award,
} from 'lucide-react';
import { formatDateTime, formatDuration } from '../utils/formatters';
import { PDFReportModal } from './PDFReportModal';

interface JODetailModalProps {
  joRecord: CombinedJORecords | null;
  onClose: () => void;
  currentUser?: string;
}

export const JODetailModal: React.FC<JODetailModalProps> = ({
  joRecord,
  onClose,
  currentUser,
}) => {
  const [showPDFModal, setShowPDFModal] = useState(false);

  if (!joRecord) return null;

  const isCurrentGood = joRecord.currentOverallStatus === 'GOOD';

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-2xl w-full p-5 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-white font-mono">
                  {joRecord.joNumber}
                </h2>
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                    isCurrentGood
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-rose-950 text-rose-300 border-rose-700'
                  }`}
                >
                  Overall: {joRecord.currentOverallStatus}
                </span>
                {joRecord.everHadNG && (
                  <span className="bg-amber-950 text-amber-300 border border-amber-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    Retested (Prev NG)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Group: <span className="text-slate-200">{joRecord.compGroup || joRecord.productCategory}</span> • Model:{' '}
                <span className="text-slate-200">{joRecord.unitModel || joRecord.productModel}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white bg-slate-800 p-1.5 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick PDF Report Trigger Banner */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-bold shrink-0">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-200">Official Test Report & Quality Cert</div>
                <div className="text-[10px] text-slate-400">Generate printable ISO/OEM formatted report</div>
              </div>
            </div>

            <button
              onClick={() => setShowPDFModal(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>View Report PDF</span>
            </button>
          </div>

          {/* Responsible Assembly Mechanic Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Wrench className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-slate-400 block text-[10px]">
                  Responsible Assembly Mechanic:
                </span>
                <span className="font-bold text-blue-300 text-sm">
                  {joRecord.assemblyMechanic}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] block">Total Attempts:</span>
              <span className="font-semibold text-slate-200">
                {joRecord.gltRecords.length + joRecord.dynoRecords.length + joRecord.hydraulicRecords.length} Records
              </span>
            </div>
          </div>

          {/* Chronological Test Journey */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Test Record Timeline & Attempts
            </h3>

            {/* GLT ATTEMPTS */}
            {joRecord.gltRecords.map((glt) => {
              const passed = glt.result === 'GOOD';
              return (
                <div
                  key={glt.id}
                  className={`border rounded-xl p-4 text-xs space-y-3 ${
                    passed
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-rose-950/20 border-rose-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 text-[10px]">
                        GLT Attempt #{glt.attemptNumber}
                      </span>
                      <span className="text-slate-400">by {glt.testerName}</span>
                    </div>
                    <span
                      className={`font-black px-2 py-0.5 rounded text-[10px] ${
                        passed
                          ? 'bg-emerald-900/80 text-emerald-300'
                          : 'bg-rose-900/80 text-rose-300'
                      }`}
                    >
                      {glt.result}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Incoming Time:</span>
                      <span className="font-mono">{formatDateTime(glt.incomingTime)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">GLT Completed:</span>
                      <span className="font-mono">{formatDateTime(glt.gltCompleteTime)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Bench Received:</span>
                      <span className="font-mono">{formatDateTime(glt.benchReceiveTime)}</span>
                    </div>
                  </div>

                  {!passed && glt.leakLocation && (
                    <div className="bg-rose-950/60 border border-rose-800 p-2.5 rounded-lg text-rose-200 text-xs space-y-1">
                      <div className="font-bold text-rose-300 flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Leak Identified at: {glt.leakLocation}</span>
                      </div>
                      {glt.leakDescription && (
                        <p className="text-slate-300">{glt.leakDescription}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* DYNOTEST ATTEMPTS */}
            {joRecord.dynoRecords.map((dyno) => {
              const passed = dyno.result === 'GOOD';
              return (
                <div
                  key={dyno.id}
                  className={`border rounded-xl p-4 text-xs space-y-3 ${
                    passed
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-rose-950/20 border-rose-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 text-[10px]">
                        Dyno Attempt #{dyno.attemptNumber}
                      </span>
                      <span className="text-slate-400">by {dyno.operatorName}</span>
                    </div>
                    <span
                      className={`font-black px-2 py-0.5 rounded text-[10px] ${
                        passed
                          ? 'bg-emerald-900/80 text-emerald-300'
                          : 'bg-rose-900/80 text-rose-300'
                      }`}
                    >
                      {dyno.result}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">GLT Lead Time:</span>
                      <span className="font-bold text-amber-300">
                        {formatDuration(dyno.gltLeadTimeMinutes)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Dyno Lead Time:</span>
                      <span className="font-bold text-emerald-300">
                        {formatDuration(dyno.dynoLeadTimeMinutes)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Submission Time:</span>
                      <span className="font-mono">{formatDateTime(dyno.submissionTime)}</span>
                    </div>
                  </div>

                  {!passed && dyno.ngItem && (
                    <div className="bg-rose-950/60 border border-rose-800 p-2.5 rounded-lg text-rose-200 text-xs space-y-1">
                      <div className="font-bold text-rose-300 flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>NG Parameter: {dyno.ngItem}</span>
                      </div>
                      {dyno.ngDescription && (
                        <p className="text-slate-300">{dyno.ngDescription}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* HYDRAULIC ATTEMPTS */}
            {joRecord.hydraulicRecords.map((hyd) => {
              const passed = hyd.result === 'GOOD';
              return (
                <div
                  key={hyd.id}
                  className={`border rounded-xl p-4 text-xs space-y-3 ${
                    passed
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-rose-950/20 border-rose-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800 text-[10px]">
                        Hydraulic Attempt #{hyd.attemptNumber}
                      </span>
                      <span className="text-slate-400">by {hyd.operatorName}</span>
                    </div>
                    <span
                      className={`font-black px-2 py-0.5 rounded text-[10px] ${
                        passed
                          ? 'bg-emerald-900/80 text-emerald-300'
                          : 'bg-rose-900/80 text-rose-300'
                      }`}
                    >
                      {hyd.result}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-300">
                    <div>
                      <span className="text-slate-500 block text-[10px]">GLT Lead Time:</span>
                      <span className="font-bold text-amber-300">
                        {formatDuration(hyd.gltLeadTimeMinutes)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Hydraulic Lead Time:</span>
                      <span className="font-bold text-purple-300">
                        {formatDuration(hyd.hydraulicLeadTimeMinutes)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[10px]">Submission Time:</span>
                      <span className="font-mono">{formatDateTime(hyd.submissionTime)}</span>
                    </div>
                  </div>

                  {!passed && hyd.ngItem && (
                    <div className="bg-rose-950/60 border border-rose-800 p-2.5 rounded-lg text-rose-200 text-xs space-y-1">
                      <div className="font-bold text-rose-300 flex items-center space-x-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>NG Parameter: {hyd.ngItem}</span>
                      </div>
                      {hyd.ngDescription && (
                        <p className="text-slate-300">{hyd.ngDescription}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* PRIORITY CHANGE HISTORY */}
          {joRecord.priorityHistory && joRecord.priorityHistory.length > 0 && (
            <div className="space-y-2 border-t border-slate-850 pt-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>Priority Change History</span>
              </h3>
              <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="px-3 py-2">Date / Time</th>
                        <th className="px-3 py-2 text-center">Old</th>
                        <th className="px-3 py-2 text-center">New</th>
                        <th className="px-3 py-2">Changed By</th>
                        <th className="px-3 py-2">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-medium">
                      {joRecord.priorityHistory.map((hist, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40 text-slate-300">
                          <td className="px-3 py-2 whitespace-nowrap font-mono">
                            {formatDateTime(hist.changedAt)}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-slate-400">
                            {hist.oldPriority}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-blue-400 font-bold">
                            {hist.newPriority}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-slate-200">
                            {hist.changedBy}
                          </td>
                          <td className="px-3 py-2 text-slate-400 italic">
                            {hist.remark || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-colors"
          >
            Close Detail View
          </button>
        </div>
      </div>

      {showPDFModal && (
        <PDFReportModal
          jo={joRecord}
          onClose={() => setShowPDFModal(false)}
          currentUser={currentUser}
        />
      )}
    </>
  );
};
