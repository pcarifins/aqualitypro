import React, { useState } from 'react';
import {
  X,
  Printer,
  FileCheck,
  Award,
  Download,
  CheckCircle2,
  AlertCircle,
  Calendar,
  User,
  ShieldCheck,
  Sparkles,
  QrCode,
} from 'lucide-react';
import { CombinedJORecords, PDFTestReportRecord } from '../types';
import { pdfReportService } from '../services/pdfReportService';

interface PDFReportModalProps {
  jo: CombinedJORecords;
  onClose: () => void;
  currentUser?: string;
}

export const PDFReportModal: React.FC<PDFReportModalProps> = ({ jo, onClose, currentUser }) => {
  const [reportRecord] = useState<PDFTestReportRecord>(() =>
    pdfReportService.generateTestReportRecord(jo, currentUser)
  );

  const handlePrint = () => {
    pdfReportService.printReportHtml(reportRecord.dataSnapshot, jo);
  };

  const isPassed = jo.currentOverallStatus === 'GOOD';
  const componentName = jo.component || jo.productModel.split('/')[1]?.trim() || jo.productModel;
  const unitModel = jo.unitModel || jo.productModel.split('/')[0]?.trim() || 'Unit Model';

  const latestGLT = jo.gltRecords[jo.gltRecords.length - 1];
  const latestDyno = jo.dynoRecords[jo.dynoRecords.length - 1];
  const latestHyd = jo.hydraulicRecords[jo.hydraulicRecords.length - 1];

  const allTrials = [
    ...jo.gltRecords.map(r => ({ stageName: 'General Leak Test', attempt: r.attemptNumber, operator: r.testerName || r.operatorName, date: r.testDate, answers: r.answers, result: r.result })),
    ...jo.dynoRecords.map(r => ({ stageName: 'Engine Dynamometer Test', attempt: r.attemptNumber, operator: r.operatorName, date: r.submissionTime?.split('T')[0] || r.receivingTime?.split('T')[0], answers: r.answers, result: r.result })),
    ...jo.hydraulicRecords.map(r => ({ stageName: 'Hydraulic Test Bench', attempt: r.attemptNumber, operator: r.operatorName, date: r.submissionTime?.split('T')[0] || r.receivingTime?.split('T')[0], answers: r.answers, result: r.result }))
  ].filter(s => s.answers && s.answers.length > 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-slate-900">
                  Document Preview & Official PDF
                </h3>
                <span className="text-xs font-mono font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                  JO {jo.joNumber}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {unitModel} — {componentName} | Comp Group: {jo.compGroup || jo.productCategory}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Document Preview */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70">
          {/* TEST REPORT PREVIEW */}
          <div className="bg-white rounded-xl shadow-lg border border-slate-300 p-8 max-w-3xl mx-auto space-y-6 text-slate-800 font-sans text-xs">
              {/* Document Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
                <div>
                  <div className="text-[10px] font-black tracking-wider text-blue-900 uppercase">
                    PT KOMATSU REMANUFACTURING ASIA — BALIKPAPAN PLANT
                  </div>
                  <h1 className="text-xl font-black text-slate-900 uppercase mt-0.5">
                    Component Test & Quality Inspection Report
                  </h1>
                  <p className="text-slate-500 text-[11px]">
                    Quality Assurance & Final Functional Bench Verification
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono font-black text-sm text-blue-900">
                    {reportRecord.reportNumber}
                  </div>
                  <div className="text-slate-500 text-[10px]">
                    Version {reportRecord.version} • {new Date(reportRecord.generatedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Status Ribbon */}
              <div
                className={`p-3 rounded-lg flex items-center justify-between font-bold ${
                  isPassed
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    : 'bg-rose-100 text-rose-900 border border-rose-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  {isPassed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-rose-600" />
                  )}
                  <span>OVERALL QUALITY ASSESSMENT VERDICT</span>
                </div>
                <span className="text-xs font-black uppercase px-3 py-1 bg-white rounded-md shadow-2xs font-mono">
                  {jo.currentOverallStatus}
                </span>
              </div>

              {/* JO Master Information */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-1.5">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Job Order (JO / RO):</span>
                    <strong className="font-mono text-slate-900">{jo.joNumber}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Unit Model:</span>
                    <strong className="text-slate-900">{unitModel}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Component:</span>
                    <strong className="text-slate-900">{componentName}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer:</span>
                    <strong className="text-slate-900">{jo.customer || latestGLT?.customer || 'Internal Stock'}</strong>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Serial Number:</span>
                    <strong className="font-mono text-slate-900">{jo.serialNumber || latestGLT?.serialNumber || 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Part Number:</span>
                    <strong className="font-mono text-slate-900">{jo.partNumber || latestGLT?.partNumber || 'N/A'}</strong>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-1">
                    <span className="text-slate-500">Assembly Mechanic:</span>
                    <strong className="text-slate-900">{jo.assemblyMechanic || '-'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Comp Group:</span>
                    <strong className="text-blue-900">{jo.compGroup || jo.productCategory}</strong>
                  </div>
                </div>
              </div>

              {/* GLT Pre-Test Section */}
              {latestGLT && (
                <div className="space-y-2">
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>1. General Leak Test (GLT) Inspection</span>
                    <span className={`font-mono text-[10px] font-bold ${latestGLT.result === 'GOOD' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {latestGLT.result}
                    </span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Inspection Date:</span>
                      <strong>{latestGLT.testDate || latestGLT.incomingTime?.split('T')[0]}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Inspector Name:</span>
                      <strong>{latestGLT.operatorName || latestGLT.testerName || 'Tester'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">GLT Status:</span>
                      <strong className={latestGLT.result === 'GOOD' ? 'text-emerald-700' : 'text-rose-700'}>
                        {latestGLT.result} {latestGLT.ngItem ? `(${latestGLT.ngItem})` : ''}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Dynotest Section */}
              {latestDyno && (
                <div className="space-y-2">
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>2. Engine Dynamometer Performance Test</span>
                    <span className={`font-mono text-[10px] font-bold ${latestDyno.result === 'GOOD' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {latestDyno.result}
                    </span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Operator:</span>
                      <strong>{latestDyno.operatorName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Lead Time:</span>
                      <strong>{latestDyno.dynoLeadTimeMinutes ? `${latestDyno.dynoLeadTimeMinutes} min` : '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Result Verdict:</span>
                      <strong className={latestDyno.result === 'GOOD' ? 'text-emerald-700' : 'text-rose-700'}>
                        {latestDyno.result}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Hydraulic Test Section */}
              {latestHyd && (
                <div className="space-y-2">
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                    <span>2. Hydraulic & Power Train Test Bench</span>
                    <span className={`font-mono text-[10px] font-bold ${latestHyd.result === 'GOOD' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {latestHyd.result}
                    </span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-500 block">Bench Operator:</span>
                      <strong>{latestHyd.operatorName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Hydraulic Lead Time:</span>
                      <strong>{latestHyd.hydraulicLeadTimeMinutes ? `${latestHyd.hydraulicLeadTimeMinutes} min` : '-'}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Result Verdict:</span>
                      <strong className={latestHyd.result === 'GOOD' ? 'text-emerald-700' : 'text-rose-700'}>
                        {latestHyd.result}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Trial Checksheets Section (E3) */}
              {allTrials.length > 0 && (
                <div className="space-y-4 pt-6 border-t border-slate-200">
                  <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
                    3. Completed Trial Checksheets
                  </h3>
                  {allTrials.map((trial, tIdx) => (
                    <div key={tIdx} className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex flex-wrap items-center justify-between font-bold text-slate-700 gap-2">
                        <span>Stage: {trial.stageName} (Attempt #{trial.attempt})</span>
                        <div className="flex items-center space-x-3 text-[11px]">
                          <span>Operator: <span className="font-medium text-slate-600">{trial.operator}</span></span>
                          <span>•</span>
                          <span>Date: <span className="font-medium text-slate-600">{trial.date}</span></span>
                          <span>•</span>
                          <span className={trial.result === 'GOOD' ? 'text-emerald-700' : 'text-rose-700'}>{trial.result}</span>
                        </div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-100/60 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                              <th className="px-3 py-1.5 text-center w-10">#</th>
                              <th className="px-3 py-1.5">Parameter</th>
                              <th className="px-3 py-1.5">Section</th>
                              <th className="px-3 py-1.5">Reference Limit</th>
                              <th className="px-3 py-1.5">Actual Value</th>
                              <th className="px-3 py-1.5 text-center w-16">Verdict</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {trial.answers!.map((ans, aIdx) => {
                              let stdRange = '-';
                              if (ans.validationSnapshot && ans.validationSnapshot !== 'NONE') {
                                if (ans.validationSnapshot === 'RANGE') {
                                  stdRange = `${ans.minimumSnapshot ?? '-'} – ${ans.maximumSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
                                } else if (ans.validationSnapshot === 'MINIMUM') {
                                  stdRange = `Min ${ans.minimumSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
                                } else if (ans.validationSnapshot === 'MAXIMUM') {
                                  stdRange = `Max ${ans.maximumSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
                                } else if (ans.validationSnapshot === 'TARGET_TOLERANCE') {
                                  stdRange = `${ans.targetSnapshot ?? '-'} ± ${ans.toleranceSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
                                }
                              } else if (ans.inputTypeSnapshot === 'GOOD / NOT GOOD' || ans.inputTypeSnapshot === 'GOOD/NOT GOOD') {
                                stdRange = 'GOOD';
                              }

                              return (
                                <tr key={ans.id} className="hover:bg-slate-50/50 text-[11px] text-slate-700">
                                  <td className="px-3 py-1.5 text-center text-slate-400 font-medium">{aIdx + 1}</td>
                                  <td className="px-3 py-1.5 font-semibold text-slate-900">{ans.itemNameSnapshot}</td>
                                  <td className="px-3 py-1.5 text-slate-500">{ans.sectionSnapshot || 'Main'}</td>
                                  <td className="px-3 py-1.5 font-mono text-slate-600">{stdRange}</td>
                                  <td className="px-3 py-1.5 font-bold font-mono text-slate-900">{ans.answer} {ans.unitSnapshot || ''}</td>
                                  <td className="px-3 py-1.5 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                      ans.resultStatus === 'PASS' 
                                        ? 'bg-emerald-100 text-emerald-800' 
                                        : ans.resultStatus === 'FAIL' 
                                        ? 'bg-rose-100 text-rose-800' 
                                        : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {ans.resultStatus || '-'}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Signatures & Approvals */}
              <div className="pt-6 border-t-2 border-slate-200 grid grid-cols-3 gap-4 text-center">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-6">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Tested By</span>
                  <div className="font-bold text-slate-900 border-t border-slate-300 pt-1 text-xs">
                    {currentUser || 'Operator Signature'}
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-6">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">QC Inspector</span>
                  <div className="font-bold text-slate-900 border-t border-slate-300 pt-1 text-xs">
                    Ferry (QC Lead)
                  </div>
                </div>

                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-6">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">PPC & QA Manager</span>
                  <div className="font-bold text-slate-900 border-t border-slate-300 pt-1 text-xs">
                    Zakaria / Vaiz
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 shrink-0 bg-slate-50 rounded-b-2xl">
          <div className="text-xs text-slate-500">
            Official ISO/OEM Document Format • Print ready
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Close
            </button>

            <button
              onClick={handlePrint}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center space-x-2"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
