import React, { useState, useEffect } from 'react';
import {
  User,
  ChecksheetItem,
  HydraulicRecord,
  TestResult,
  ChecksheetAnswer,
} from '../types';
import {
  Search,
  SlidersHorizontal,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Send,
} from 'lucide-react';
import {
  formatDateTime,
  formatDuration,
  calculateMinutesBetween,
} from '../utils/formatters';

interface HydraulicTestFormProps {
  currentUser: User;
  lookupJO: (joNumber: string, stage: 'Hydraulic Test') => Promise<any>;
  getChecksheets: (process: 'Hydraulic Test') => Promise<ChecksheetItem[]>;
  onSaveRecord: (record: HydraulicRecord) => Promise<HydraulicRecord>;
  preloadJONumber?: string;
  onSuccessSubmitted: (joNumber: string) => void;
}

export const HydraulicTestForm: React.FC<HydraulicTestFormProps> = ({
  currentUser,
  lookupJO,
  getChecksheets,
  onSaveRecord,
  preloadJONumber = '',
  onSuccessSubmitted,
}) => {
  const [searchJO, setSearchJO] = useState(preloadJONumber || '');
  const [lookupData, setLookupData] = useState<any>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Form State
  const [receivingTime, setReceivingTime] = useState<string | null>(null);
  const [checksheetItems, setChecksheetItems] = useState<ChecksheetItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finalResult, setFinalResult] = useState<TestResult>('GOOD');
  const [ngItem, setNgItem] = useState('');
  const [ngDescription, setNgDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [remarks, setRemarks] = useState('');

  // Controls
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    getChecksheets('Hydraulic Test').then((items) => setChecksheetItems(items));
  }, []);

  useEffect(() => {
    if (preloadJONumber) {
      handleSearch(preloadJONumber);
    }
  }, [preloadJONumber]);

  const handleSearch = async (targetJO: string) => {
    if (!targetJO.trim()) return;
    setLookupError(null);
    const res = await lookupJO(targetJO.trim(), 'Hydraulic Test');
    if (res && res.error) {
      setLookupError(res.error);
      setLookupData(null);
    } else if (res) {
      setLookupData(res);

      if (res.latestHydRecord && res.latestHydRecord.receivingTime) {
        setReceivingTime(res.latestHydRecord.receivingTime);
      } else {
        setReceivingTime(null);
      }
    }
  };

  const handleReceiveAtHydraulic = () => {
    const nowIso = new Date().toISOString();
    setReceivingTime(nowIso);
    setToastMessage('Received at Hydraulic Test Bench! GLT Lead Time calculated.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAnswerChange = (itemId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [itemId]: val }));
  };

  const gltLeadTimeMinutes =
    receivingTime && lookupData?.gltIncomingTime
      ? calculateMinutesBetween(lookupData.gltIncomingTime, receivingTime)
      : undefined;

  const currentSubmissionTime = new Date().toISOString();
  const hydraulicLeadTimeMinutes = receivingTime
    ? calculateMinutesBetween(receivingTime, currentSubmissionTime)
    : undefined;

  const validateForm = (): boolean => {
    if (!lookupData) {
      setValidationError('Please search and select a valid Power Train JO Number first.');
      return false;
    }
    if (!receivingTime) {
      setValidationError('Receive at Hydraulic Test');
      return false;
    }

    const mandatoryMissing = checksheetItems.filter(
      (item) => item.mandatory && (!answers[item.id] || answers[item.id].trim() === '')
    );

    if (mandatoryMissing.length > 0) {
      setValidationError(
        `Please complete all ${mandatoryMissing.length} mandatory Hydraulic checksheet items.`
      );
      return false;
    }

    if (finalResult === 'NOT GOOD' && !ngItem.trim()) {
      setValidationError('Please select or specify the NG Item.');
      return false;
    }

    setValidationError(null);
    return true;
  };

  const buildAnswerSnapshots = (): ChecksheetAnswer[] => {
    return checksheetItems.map((item) => {
      const userVal = answers[item.id] || '';
      let resStatus: 'PASS' | 'FAIL' | 'NA' = 'PASS';

      if (item.inputType === 'Numeric' && userVal !== '') {
        const numVal = parseFloat(userVal);
        if (!isNaN(numVal)) {
          if (
            (item.minimumValue !== undefined && numVal < item.minimumValue) ||
            (item.maximumValue !== undefined && numVal > item.maximumValue)
          ) {
            resStatus = 'FAIL';
          }
        }
      } else if (item.inputType === 'GOOD / NOT GOOD' && userVal === 'NOT GOOD') {
        resStatus = 'FAIL';
      }

      return {
        id: `ans-${item.id}-${Date.now()}`,
        recordType: 'Hydraulic Test',
        recordId: '',
        checksheetItemId: item.id,
        itemNameSnapshot: item.itemName,
        sectionSnapshot: item.section,
        inputTypeSnapshot: item.inputType,
        unitSnapshot: item.unit,
        minimumSnapshot: item.minimumValue,
        maximumSnapshot: item.maximumValue,
        answer: userVal,
        resultStatus: resStatus,
      };
    });
  };

  const handleFinalSubmit = async () => {
    const submissionTime = new Date().toISOString();
    const finalHydMinutes = receivingTime
      ? calculateMinutesBetween(receivingTime, submissionTime)
      : 0;

    const attemptNumber = (lookupData.existingHydAttempts || 0) + 1;

    const record: HydraulicRecord = {
      id: `hyd-${Date.now()}`,
      joNumber: lookupData.joNumber,
      operatorId: currentUser.id,
      operatorName: currentUser.name,
      receivingTime: receivingTime!,
      submissionTime,
      attemptNumber,
      result: finalResult,
      ngItem: finalResult === 'NOT GOOD' ? ngItem : undefined,
      ngDescription: finalResult === 'NOT GOOD' ? ngDescription : undefined,
      remarks,
      status: 'Submitted',
      gltLeadTimeMinutes,
      hydraulicLeadTimeMinutes: finalHydMinutes,
      answers: buildAnswerSnapshots(),
      attachments: photoUrl
        ? [
            {
              id: `att-${Date.now()}`,
              recordType: 'Hydraulic Test',
              recordId: '',
              fileUrl: photoUrl,
              uploadedBy: currentUser.name,
              uploadedAt: new Date().toISOString(),
            },
          ]
        : [],
    };

    await onSaveRecord(record);
    setShowConfirmModal(false);
    onSuccessSubmitted(lookupData.joNumber);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 pb-28 space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black">
            <SlidersHorizontal className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100 flex items-center space-x-2">
              <span>Hydraulic Test Form</span>
              <span className="bg-purple-950 text-purple-300 text-[10px] font-bold px-2 py-0.5 rounded border border-purple-800">
                Power Train Component Only
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Test transmission, steering valves, and final drives under hydraulic load
            </p>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs px-4 py-3 rounded-xl flex items-center space-x-2 shadow-lg">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {validationError && (
        <div className="bg-rose-950/80 border border-rose-700 text-rose-200 text-xs px-4 py-3 rounded-xl flex items-center space-x-2 shadow-lg">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* JO Search Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
          1. JO Number Lookup
        </h3>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(searchJO);
          }}
          className="flex items-center space-x-2"
        >
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Enter Power Train JO Number (e.g. 20262001)..."
              value={searchJO}
              onChange={(e) => setSearchJO(e.target.value.replace(/[^0-9]/g, ''))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono font-bold tracking-wider"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
          >
            Lookup JO
          </button>
        </form>

        {lookupError && (
          <div className="bg-rose-950/60 border border-rose-800 text-rose-300 text-xs p-3 rounded-lg flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{lookupError}</span>
          </div>
        )}

        {/* Display GLT Info */}
        {lookupData && (
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="font-bold text-slate-100 flex items-center space-x-2">
                <span>{lookupData.joNumber}</span>
                <span className="bg-purple-900/40 text-purple-300 px-2 py-0.5 rounded text-[10px]">
                  {lookupData.productCategory}
                </span>
                <span className="text-slate-400 font-normal">
                  {lookupData.productModel}
                </span>
              </div>
              <span className="bg-emerald-900/60 text-emerald-300 font-bold px-2 py-0.5 rounded text-[10px]">
                GLT {lookupData.latestGLTResult}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300">
              <div>
                <span className="text-slate-500 block text-[10px]">
                  Assembly Mechanic:
                </span>
                <span className="font-bold text-blue-300">
                  {lookupData.assemblyMechanic}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">
                  GLT Incoming Time:
                </span>
                <span className="font-mono text-slate-200">
                  {formatDateTime(lookupData.gltIncomingTime)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px]">
                  Hydraulic Attempts:
                </span>
                <span className="font-semibold text-slate-200">
                  #{lookupData.existingHydAttempts + 1}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Receiving Action & Lead Time */}
      {lookupData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              2. Receiving & GLT Lead Time
            </h3>
            {receivingTime ? (
              <span className="text-xs font-bold text-purple-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Received @ Bench</span>
              </span>
            ) : (
              <span className="text-xs font-bold text-amber-400">
                Action Required
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs text-slate-300 font-medium">
                Hydraulic Test Receiving Time:
              </div>
              <div className="text-sm font-mono font-bold text-white mt-0.5">
                {receivingTime ? formatDateTime(receivingTime) : 'Not Received Yet'}
              </div>
            </div>

            {!receivingTime ? (
              <button
                type="button"
                onClick={handleReceiveAtHydraulic}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-lg flex items-center justify-center space-x-2"
              >
                <Clock className="w-4 h-4" />
                <span>Receive at Hydraulic Test</span>
              </button>
            ) : (
              <div className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs space-y-1">
                <div className="text-slate-400 text-[10px]">
                  Calculated GLT Lead Time:
                </div>
                <div className="font-bold text-amber-300">
                  {formatDuration(gltLeadTimeMinutes)}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dynamic Hydraulic Checksheet */}
      {lookupData && receivingTime && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            3. Hydraulic Test Checksheet Parameters
          </h3>

          <div className="divide-y divide-slate-800/60">
            {checksheetItems.map((item) => {
              const val = answers[item.id] || '';
              let isOutOfBounds = false;

              if (
                item.inputType === 'Numeric' &&
                val.trim() !== '' &&
                !isNaN(Number(val))
              ) {
                const num = Number(val);
                if (
                  (item.minimumValue !== undefined && num < item.minimumValue) ||
                  (item.maximumValue !== undefined && num > item.maximumValue)
                ) {
                  isOutOfBounds = true;
                }
              }

              return (
                <div
                  key={item.id}
                  className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2"
                >
                  <div className="space-y-0.5 max-w-md">
                    <div className="text-xs font-semibold text-slate-100 flex items-center space-x-1.5">
                      <span>{item.itemName}</span>
                      {item.mandatory && (
                        <span className="text-rose-400 font-bold">*</span>
                      )}
                    </div>
                    {(item.minimumValue !== undefined ||
                      item.maximumValue !== undefined) && (
                      <div className="text-[11px] text-slate-400">
                        Standard:{' '}
                        <span className="text-purple-300 font-mono">
                          {item.minimumValue ?? 'Min'} - {item.maximumValue ?? 'Max'}{' '}
                          {item.unit}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {item.inputType === 'Numeric' && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          step="any"
                          placeholder="Measured value"
                          value={val}
                          onChange={(e) =>
                            handleAnswerChange(item.id, e.target.value)
                          }
                          className={`bg-slate-950 border rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none w-32 font-mono ${
                            isOutOfBounds
                              ? 'border-rose-500 bg-rose-950/40 text-rose-200'
                              : 'border-slate-700 focus:border-purple-500'
                          }`}
                        />
                        {item.unit && (
                          <span className="text-xs text-slate-400 font-mono">
                            {item.unit}
                          </span>
                        )}
                        {isOutOfBounds && (
                          <span className="text-[10px] font-bold text-rose-400 bg-rose-900/60 px-1.5 py-0.5 rounded">
                            Out of spec
                          </span>
                        )}
                      </div>
                    )}

                    {item.inputType === 'GOOD / NOT GOOD' && (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(item.id, 'GOOD')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            val === 'GOOD'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          GOOD
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAnswerChange(item.id, 'NOT GOOD')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            val === 'NOT GOOD'
                              ? 'bg-rose-600 text-white shadow-sm'
                              : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          NOT GOOD
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Final Hydraulic Result Selection */}
      {lookupData && receivingTime && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
            4. Final Hydraulic Test Result Confirmation
          </h3>

          <div className="flex items-center space-x-4">
            <button
              type="button"
              onClick={() => setFinalResult('GOOD')}
              className={`flex-1 py-3 px-4 rounded-xl border font-black text-sm flex items-center justify-center space-x-2 transition-all ${
                finalResult === 'GOOD'
                  ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg ring-2 ring-emerald-500/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>GOOD</span>
            </button>

            <button
              type="button"
              onClick={() => setFinalResult('NOT GOOD')}
              className={`flex-1 py-3 px-4 rounded-xl border font-black text-sm flex items-center justify-center space-x-2 transition-all ${
                finalResult === 'NOT GOOD'
                  ? 'bg-rose-600 border-rose-500 text-white shadow-lg ring-2 ring-rose-500/50'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <XCircle className="w-5 h-5" />
              <span>NOT GOOD (NG)</span>
            </button>
          </div>

          {finalResult === 'NOT GOOD' && (
            <div className="bg-rose-950/40 border border-rose-800/80 rounded-xl p-4 space-y-3">
              <div className="flex items-center space-x-2 text-rose-400 text-xs font-bold uppercase">
                <AlertTriangle className="w-4 h-4" />
                <span>Hydraulic Test Defect Details</span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">
                  NG Item / Parameter <span className="text-rose-400">*</span>
                </label>
                <select
                  value={ngItem}
                  onChange={(e) => setNgItem(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                >
                  <option value="">-- Select Defect Parameter --</option>
                  {checksheetItems.map((i) => (
                    <option key={i.id} value={i.itemName}>
                      {i.itemName}
                    </option>
                  ))}
                  <option value="Severe Internal Leakage / Pressure Drop">
                    Severe Internal Leakage / Pressure Drop
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-200 mb-1">
                  NG Description
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe failure details during hydraulic bench testing..."
                  value={ngDescription}
                  onChange={(e) => setNgDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    setPhotoUrl(
                      'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'
                    )
                  }
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-2"
                >
                  <Camera className="w-4 h-4 text-rose-400" />
                  <span>Attach Inspection Photo</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Hydraulic Test Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Pressures holding nominal at 80°C. Cleared for dispatch."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Area */}
      {lookupData && receivingTime && (
        <div className="fixed bottom-14 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-3 z-20">
          <div className="max-w-4xl mx-auto flex items-center justify-end">
            <button
              type="button"
              onClick={() => {
                if (validateForm()) {
                  setShowConfirmModal(true);
                }
              }}
              className="w-full sm:w-auto py-2.5 px-6 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-lg transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Submit Hydraulic Test Record</span>
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-100 text-base">
                Confirm Hydraulic Test Submission
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">JO Number:</span>
                <span className="font-bold text-white font-mono">{lookupData.joNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assembly Mechanic:</span>
                <span className="font-bold text-blue-300">{lookupData.assemblyMechanic}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">GLT Lead Time:</span>
                <span className="font-semibold text-amber-300">{formatDuration(gltLeadTimeMinutes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Hydraulic Lead Time:</span>
                <span className="font-semibold text-purple-300">{formatDuration(hydraulicLeadTimeMinutes)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800">
                <span className="text-slate-400">Final Result:</span>
                <span
                  className={`font-black px-2 py-0.5 rounded ${
                    finalResult === 'GOOD'
                      ? 'bg-emerald-900/80 text-emerald-300'
                      : 'bg-rose-900/80 text-rose-300'
                  }`}
                >
                  {finalResult}
                </span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Edit
              </button>
              <button
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
