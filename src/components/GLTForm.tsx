import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  ProductCategory,
  ProductModel,
  ChecksheetItem,
  GLTRecord,
  TestResult,
  ChecksheetAnswer,
  Assembler,
  QueueRecord,
  CompGroup,
} from '../types';
import { apiClient } from '../api/client';
import { store } from '../data/storageEngine';
import { ChecksheetRenderer, normalizeInputType, evaluateNumericItem } from './ChecksheetRenderer';
import { evaluateFormResult } from '../utils/formEvaluation';
import {
  Save,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Camera,
  FileCheck2,
  Lock,
  Search,
  ListOrdered,
  ShieldCheck,
} from 'lucide-react';
import { formatDateTime,calculateMinutesBetween, } from '../utils/formatters';
import { filterAssemblersByCompGroup } from '../utils/assemblerFilter';
import { canUserAccessCompGroup } from '../utils/permissions';

interface GLTFormProps {
  currentUser: User;
  productModels: ProductModel[];
  getChecksheets: (category: ProductCategory) => Promise<ChecksheetItem[]>;
  onSaveRecord: (record: GLTRecord) => Promise<GLTRecord>;
  existingGLTRecords?: GLTRecord[];
  preloadJONumber?: string;
  onSuccessSubmitted: (joNumber: string) => void;
}

export const GLTForm: React.FC<GLTFormProps> = ({
  currentUser,
  productModels,
  getChecksheets,
  onSaveRecord,
  existingGLTRecords = [],
  preloadJONumber = '',
  onSuccessSubmitted,
}) => {
  // Queue Selection & Single Source of Truth
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');

  // Primary Form Fields
  const [joNumber, setJoNumber] = useState(preloadJONumber || '');
  const [compGroup, setCompGroup] = useState<CompGroup>('Engine');
  const [subGroup, setSubGroup] = useState<'PT' | 'PPM' | null>(null);
  const [unitModel, setUnitModel] = useState('');
  const [component, setComponent] = useState('');
  const [productCategory, setProductCategory] = useState<ProductCategory>('Engine');
  const [productModel, setProductModel] = useState('');
  const [testType, setTestType] = useState<'PROD'>('PROD');
  const [plannedPriority, setPlannedPriority] = useState<number | undefined>(undefined);
  const [currentPriority, setCurrentPriority] = useState<number | undefined>(undefined);

  const [partNumber, setPartNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [customer, setCustomer] = useState('');
  const [assemblyMechanic, setAssemblyMechanic] = useState('');
  const [assemblersList, setAssemblersList] = useState<Assembler[]>([]);
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');

  // GLT receiving / lead-time start
  const [receivingTime, setReceivingTime] = useState<string>('');

  // Checksheet State
  const [checksheetItems, setChecksheetItems] = useState<ChecksheetItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [itemRemarks, setItemRemarks] = useState<Record<string, string>>({});

  // Result & Defect Identification
  const [finalResult, setFinalResult] = useState<TestResult>('GOOD');
  const [ngItem, setNgItem] = useState('');
  const [ngDescription, setNgDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string>('');

  // Form Flow Controls
  const [attemptNumber, setAttemptNumber] = useState<number>(1);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [isLockedFromQueue, setIsLockedFromQueue] = useState(false);

  // Load Queue & Assemblers
  useEffect(() => {
    apiClient.getQueueRecords().then((qList) => {
      // Filter: PROD only, priority assigned, GLT not completed, active, and matching operator role/allowedCompGroups
      const gltEligible = qList.filter(
        (q) =>
          q.testType === 'PROD' &&
          !q.isUrgentUnassigned &&
          q.gltStatus !== 'GOOD' &&
          q.status !== 'FINISH' &&
          canUserAccessCompGroup(currentUser, q.compGroup)
      );
      setQueueRecords(gltEligible);
    });

    apiClient.getAssemblers(true).then((asms) => {
      setAssemblersList(asms);
    });
  }, [currentUser]);

  // Pre-select or lookup if preloadJONumber is passed
  useEffect(() => {
    if (preloadJONumber) {
      handleSelectJOFromQueue(preloadJONumber);
    }
  }, [preloadJONumber]);

  // Load checksheet items based on category / compGroup
  useEffect(() => {
    getChecksheets(productCategory).then((items) => {
      setChecksheetItems(items);
    });
  }, [productCategory]);

  const handleSelectQueueItem = (qId: string) => {
    setSelectedQueueId(qId);
    setValidationError(null);

    const record = queueRecords.find((q) => q.queueRecordId === qId);
    if (!record) return;

    setAnswers({});
    setItemRemarks({});
    setNgItem('');
    setNgDescription('');
    setRemarks('');
    setPhotoUrl('');

    setJoNumber(record.joRoNumber);
    setCompGroup(record.compGroup);
    setSubGroup(record.subGroup || null);
    setUnitModel(record.unitModel);
    setComponent(record.component);
    setProductCategory(record.compGroup === 'Engine' ? 'Engine' : 'Power Train Component');
    setProductModel(record.productModelId || `${record.unitModel} / ${record.component}`);
    setTestType('PROD');
    setPlannedPriority(record.plannedPriority);
    setCurrentPriority(record.currentPriority);
    setCustomer(record.customer || '');
    setPartNumber(record.partNumber || '');
    setSerialNumber(record.serialNumber || '');
    setReceivingTime(record.gltReceivingTime || '');

    if (record.assemblyMechanic) {
      setAssemblyMechanic(record.assemblyMechanic);
    }

    setIsLockedFromQueue(true);
  };

  const handleSelectJOFromQueue = (joNum: string) => {
    const clean = joNum.trim().toUpperCase();
    const foundInQueue = queueRecords.find((q) => q.joRoNumber.toUpperCase() === clean);
    if (foundInQueue) {
      handleSelectQueueItem(foundInQueue.queueRecordId);
    } else {
      setJoNumber(clean);
      setIsLockedFromQueue(false);
    }
  };

  const handleReceiveAtGLT = async () => {
    try {
      if (!joNumber.trim()) {
        setValidationError(
          'Please select an authorized JO before receiving at GLT.'
        );
        return;
      }

      const targetQ =
        selectedQueueId ||
        queueRecords.find(
          (q) =>
            q.joRoNumber.toUpperCase() ===
            joNumber.trim().toUpperCase()
        )?.queueRecordId;

      if (!targetQ) {
        setValidationError(
          'Queue record not found. Cannot start GLT lead-time.'
        );
        return;
      }

      const nowIso = new Date().toISOString();

      // FIRESTORE FIRST
      await store.updateQueueRecord(targetQ, {
        gltReceivingTime: nowIso,
        status: 'ON_PROCESS',
        priorityLocked: true,
      });

      // Local UI only after Firestore succeeds
      setReceivingTime(nowIso);

      setValidationError(null);

      setToastMessage(
        'Received at GLT! GLT lead-time timer started.'
      );

      setTimeout(
        () => setToastMessage(null),
        3000
      );
    } catch (error: any) {
      console.error(
        'Failed to receive at GLT:',
        error
      );

      setValidationError(
        `Failed to start GLT: ${
          error?.message ||
          'Firestore update failed'
        }`
      );
    }
  };

  const handleAnswerChange = (itemId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [itemId]: val }));
  };

  const handleItemRemarkChange = (itemId: string, remark: string) => {
    setItemRemarks((prev) => ({ ...prev, [itemId]: remark }));
  };

  // Check if any active rendered item failed
  const checkAnyItemFailed = (): boolean => {
    const activeItems = checksheetItems.filter((i) => i.active !== false);

    for (const item of activeItems) {
      const val = answers[item.id] || '';
      const norm = normalizeInputType(item.inputType);

      if (norm === 'GOOD_NOT_GOOD' && val === 'NOT GOOD') {
        return true;
      }
      if (norm === 'YES_NO' && val === 'NO' && item.mandatory) {
        return true;
      }
      if (norm === 'NUMERIC') {
        const numEval = evaluateNumericItem(
          val,
          item.validation,
          item.minimumValue,
          item.maximumValue,
          item.targetValue,
          item.toleranceValue,
          item.unit
        );
        if (numEval.hasStandard && numEval.status === 'FAIL') {
          return true;
        }
      }
    }
    return false;
  };

  // System Automatic Result Evaluation
  const systemEval = useMemo(() => {
    return evaluateFormResult(checksheetItems, answers, itemRemarks);
  }, [checksheetItems, answers, itemRemarks]);

  // Keep finalResult in sync with automatic evaluation
  useEffect(() => {
    if (systemEval.status === 'GOOD') {
      setFinalResult('GOOD');
    } else if (systemEval.status === 'NOT GOOD') {
      setFinalResult('NOT GOOD');
      if (systemEval.failedItems.length > 0 && !ngItem) {
        setNgItem(systemEval.failedItems.map((f) => f.item.itemName).join(', '));
      }
    }
  }, [systemEval]);

  const validateForm = (): boolean => {
    setValidationAttempted(true);

    if (!joNumber.trim()) {
      setValidationError('Please select or enter a valid JO Number.');
      return false;
    }
    if (!receivingTime) {
      setValidationError(
        'Please click "Receive at GLT" before starting or submitting the inspection.'
      );
      return false;
    }
    if (!assemblyMechanic.trim()) {
      setValidationError('Assembly Mechanic Name is required.');
      return false;
    }

    if (!systemEval.isComplete) {
      if (systemEval.specMissingItems.length > 0) {
        setValidationError(
          `SPECIFICATION NOT CONFIGURED for ${systemEval.specMissingItems.map((i) => i.itemName).join(', ')}. Cannot submit.`
        );
      } else {
        setValidationError(
          `Please complete all ${systemEval.missingItems.length} mandatory checksheet items before submitting.`
        );
        const firstMissingId = `checksheet-item-${systemEval.missingItems[0].id}`;
        const elem = document.getElementById(firstMissingId);
        if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }

    // Check if any defect remark is missing for NOT GOOD items
    const ngItemsWithoutRemark = checksheetItems.filter(
      (i) => answers[i.id] === 'NOT GOOD' && (!itemRemarks[i.id] || itemRemarks[i.id].trim() === '')
    );
    if (ngItemsWithoutRemark.length > 0) {
      setValidationError('Please provide defect description for all items marked NOT GOOD.');
      return false;
    }

    if (systemEval.status === 'NOT GOOD' && !ngItem.trim()) {
      setNgItem(systemEval.failedItems.map((f) => f.item.itemName).join(', ') || 'Inspection Parameter Failure');
    }

    setValidationError(null);
    return true;
  };

  const buildAnswerSnapshots = (): ChecksheetAnswer[] => {
    return checksheetItems.map((item) => {
      const userVal = answers[item.id] || '';
      const norm = normalizeInputType(item.inputType);
      let resStatus: 'PASS' | 'FAIL' | 'NA' = 'PASS';

      if (norm === 'NUMERIC') {
        const numEval = evaluateNumericItem(
          userVal,
          item.validation,
          item.minimumValue,
          item.maximumValue,
          item.targetValue,
          item.toleranceValue,
          item.unit
        );
        if (!numEval.hasStandard) {
          resStatus = 'NA';
        } else if (numEval.status === 'FAIL') {
          resStatus = 'FAIL';
        } else if (numEval.status === 'PASS') {
          resStatus = 'PASS';
        } else {
          resStatus = 'NA';
        }
      } else if (norm === 'GOOD_NOT_GOOD') {
        resStatus = userVal === 'NOT GOOD' ? 'FAIL' : userVal === 'GOOD' ? 'PASS' : 'NA';
      } else if (norm === 'YES_NO') {
        resStatus = userVal === 'NO' ? 'FAIL' : userVal === 'YES' ? 'PASS' : 'NA';
      }

      return {
        id: `ans-${item.id}-${Date.now()}`,
        recordType: 'GLT',
        recordId: '',
        checksheetItemId: item.id,
        itemNameSnapshot: item.itemName,
        sectionSnapshot: item.section,
        inputTypeSnapshot: item.inputType,
        unitSnapshot: item.unit,
        validationSnapshot: item.validation || 'NONE',
        minimumSnapshot: item.minimumValue,
        maximumSnapshot: item.maximumValue,
        targetSnapshot: item.targetValue,
        toleranceSnapshot: item.toleranceValue,
        answer: userVal,
        resultStatus: resStatus,
        remark: itemRemarks[item.id] || undefined,
      };
    });
  };

  // Save Draft (No mandatory validation required)
  const handleSaveDraft = async () => {
    if (!joNumber.trim()) {
      setValidationError('Please select or enter a JO Number to save a draft.');
      return;
    }
    if (!receivingTime) {
      setValidationError(
        'Receive at GLT first before saving inspection progress.'
      );
      return;
    }
    const answerSnapshots = buildAnswerSnapshots();
    const draftRecord: GLTRecord = {
      id: `glt-draft-${Date.now()}`,
      joNumber: joNumber.trim().toUpperCase(),
      productCategory,
      productModel: productModel || `${unitModel} / ${component}` || 'Standard Model',
      compGroup,
      unitModel,
      component,
      partNumber,
      serialNumber,
      customer,
      assemblyMechanic: assemblyMechanic || 'Assembler',
      testDate,
      result: finalResult,
      status: 'Draft',
      attemptNumber,
      answers: answerSnapshots,
      ngItem: finalResult === 'NOT GOOD' ? ngItem : undefined,
      ngDescription: finalResult === 'NOT GOOD' ? ngDescription : undefined,
      photoUrl: photoUrl || undefined,
      remarks,
      operatorName: currentUser.name,
      operatorId: currentUser.id,
      incomingTime:receivingTime,
      submissionTime: new Date().toISOString(),
    };

    await onSaveRecord(draftRecord);
    setToastMessage('GLT Draft saved successfully. You may continue anytime.');
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleOpenConfirm = () => {
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const handleFinalSubmit = async () => {
    try {
      const answerSnapshots = buildAnswerSnapshots();
      const submissionTime = new Date().toISOString();

      const finalGltLeadTimeMinutes = calculateMinutesBetween(receivingTime, submissionTime);

      const recordToSave: GLTRecord = {
        id: `glt-${Date.now()}`,
        joNumber: joNumber.trim().toUpperCase(),
        productCategory,
        productModel: productModel || `${unitModel} / ${component}` || 'Standard Model',
        compGroup,
        unitModel,
        component,
        partNumber,
        serialNumber,
        customer,
        assemblyMechanic,
        testDate,
        result: finalResult,
        status: 'Submitted',
        attemptNumber,
        answers: answerSnapshots,
        ngItem: finalResult === 'NOT GOOD' ? ngItem : undefined,
        ngDescription: finalResult === 'NOT GOOD' ? ngDescription : undefined,
        photoUrl: photoUrl || undefined,
        remarks,
        operatorName: currentUser.name,
        operatorId: currentUser.id,
        incomingTime:receivingTime,
        submissionTime,
        gltDurationMinutes:finalGltLeadTimeMinutes,
      };

      await onSaveRecord(recordToSave);

      // Update Queue record status if attached
      const targetQ =
        selectedQueueId ||
        queueRecords.find((q) => q.joRoNumber.toUpperCase() === joNumber.trim().toUpperCase())
          ?.queueRecordId;

      if (targetQ) {
        await store.updateQueueRecord(targetQ, {
          gltStatus: finalResult === 'GOOD' ? 'GOOD' : 'NOT_GOOD',
          status: finalResult === 'GOOD' ? 'ON_PROCESS' : 'WAITING',
        });
      }

      setShowConfirmModal(false);
      onSuccessSubmitted(joNumber);
    } catch (error: any) {
      console.error('Failed to submit GLT record:', error);
      setValidationError(`Submission Failed: ${error?.message || 'Firestore write error'}`);
      setShowConfirmModal(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-4 space-y-6 pb-28">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-16 right-4 z-50 bg-emerald-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center space-x-2 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-white" />
          <span className="text-xs sm:text-sm font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Clock className="w-4 h-4" />
            <span>Operational Quality Checksheet • Step 1</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
            GLT Quality Inspection Form (PROD)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Standard visual, leak test, and assembly compliance before Dynotest or Testbench.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Operator</div>
            <div className="text-xs font-bold text-blue-300">{currentUser.name}</div>
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      {validationError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 rounded-xl p-3.5 flex items-start space-x-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div className="text-xs font-semibold">{validationError}</div>
        </div>
      )}

      {/* SECTION 1: JO SELECTION FROM PRIORITY QUEUE (Single Source of Truth) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <ListOrdered className="w-4 h-4 text-blue-600" />
            <span>1. Authorized JO Priority Queue (PROD Only)</span>
          </h3>
          <span className="text-[11px] font-semibold text-slate-500 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
            {queueRecords.length} Ready in Queue
          </span>
        </div>

        {/* Priority JO Selector */}
        {queueRecords.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-xs font-bold text-slate-700">No JO Available for GLT</div>
            <p className="text-[11px] text-slate-500 mt-1">
              No uncompleted PROD jobs are currently waiting in the Priority Queue.
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select JO from Priority Queue <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedQueueId}
              onChange={(e) => handleSelectQueueItem(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono"
            >
              <option value="">-- Select Authorized JO from Queue --</option>
              {queueRecords.map((q) => (
                <option key={q.queueRecordId} value={q.queueRecordId}>
                  Priority {q.currentPriority || q.plannedPriority || '-'} | JO {q.joRoNumber} |{' '}
                  {q.unitModel} | {q.component} | PROD
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Note: Retest jobs bypass GLT and go directly to Dynotest / Testbench.
            </p>
          </div>
        )}

        {/* Locked / Auto-filled Specification Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              JO Number {isLockedFromQueue && <Lock className="w-3 h-3 text-slate-400 inline ml-1" />}
            </label>
            <input
              type="text"
              placeholder="e.g. 24109882"
              value={joNumber}
              onChange={(e) => setJoNumber(e.target.value.toUpperCase())}
              readOnly={isLockedFromQueue}
              className={`w-full border rounded-xl px-3 py-2 text-xs font-mono font-bold ${
                isLockedFromQueue
                  ? 'bg-slate-100 border-slate-200 text-slate-800'
                  : 'bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-blue-500'
              }`}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Comp Group</label>
            <input
              type="text"
              value={compGroup}
              readOnly
              className="w-full bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit Model</label>
            <input
              type="text"
              value={unitModel || '-'}
              readOnly
              className="w-full bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Component Name</label>
            <input
              type="text"
              value={component || '-'}
              readOnly
              className="w-full bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Test Type</label>
            <input
              type="text"
              value="PROD (First Assembly Cycle)"
              readOnly
              className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-3 py-2 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Assembly Mechanic <span className="text-rose-500">*</span>
            </label>
            {assemblersList.length > 0 ? (
              <select
                value={assemblyMechanic}
                onChange={(e) => setAssemblyMechanic(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Assembly Mechanic ({compGroup}) --</option>
                {filterAssemblersByCompGroup(assemblersList, compGroup).map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.name} ({a.section || a.jobGroup || 'Mechanic'})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="Mechanic name"
                value={assemblyMechanic}
                onChange={(e) => setAssemblyMechanic(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-900 rounded-xl px-3 py-2 text-xs font-semibold"
              />
            )}
          </div>
        </div>
        {/* Receive at GLT / Start Lead-Time */}
        {joNumber.trim() && (
          <div className="pt-3 border-t border-slate-100">
            {!receivingTime ? (
              <button
                type="button"
                onClick={handleReceiveAtGLT}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md transition-all"
              >
                <Clock className="w-4 h-4" />

                <span>
                  Click to "Receive at GLT"
                  (Start Lead-Time Timer)
                </span>
              </button>
            ) : (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2 text-blue-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />

                  <span>
                    Received at:{' '}
                    <strong className="font-mono">
                      {formatDateTime(
                        receivingTime
                      )}
                    </strong>
                  </span>
                </div>

                <span className="text-blue-700 font-bold">
                  GLT TIMER RUNNING
                </span>
              </div>
            )}
          </div>
        )}
      </div>



      {/* GATING: Check if JO is selected */}
      {!joNumber.trim() ? (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-6 text-center space-y-2.5 my-4 shadow-xs">
          <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Select JO first to start GLT inspection.</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Please choose an authorized Job Order from the Priority Queue above to load the appropriate inspection checklist, parameters, and submission controls.
          </p>
        </div>
      ) : !receivingTime ? (
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl p-7 text-center space-y-3">
          <Clock className="w-8 h-8 text-blue-600 mx-auto" />

          <h3 className="text-sm font-bold text-slate-800">
            JO Selected — Waiting for GLT Receiving
          </h3>

          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Receive at GLT" above to record
            the actual GLT starting time and unlock
            the inspection checklist.
          </p>

          <div className="text-[11px] font-bold text-blue-700">
            Inspection Checklist Locked
          </div>
        </div>
      ) : (
        <>
          {/* SECTION 2: DYNAMIC CHECKSHEET ITEMS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                2. GLT Quality Inspection Checklist
              </h3>
              <span className="text-[11px] font-bold text-slate-500">
                {checksheetItems.filter((i) => i.active !== false).length} Parameters
              </span>
            </div>

            <ChecksheetRenderer
              items={checksheetItems}
              answers={answers}
              onAnswerChange={handleAnswerChange}
              itemRemarks={itemRemarks}
              onItemRemarkChange={handleItemRemarkChange}
              validationAttempted={validationAttempted}
            />
          </div>

          {/* SECTION 3: SYSTEM EVALUATED RESULT (READ-ONLY) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              3. System Evaluated GLT Result
            </h3>

            {/* Read-Only Compact Result Banner */}
            <div
              className={`border rounded-2xl p-4 space-y-3 transition-all ${
                systemEval.status === 'GOOD'
                  ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                  : systemEval.status === 'NOT GOOD'
                  ? 'bg-rose-50/80 border-rose-300 text-rose-950'
                  : 'bg-amber-50/80 border-amber-300 text-amber-950'
              }`}
            >
              <div className="flex items-center justify-between border-b border-black/10 pb-2">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span className="text-[11px] font-black uppercase tracking-wider opacity-80">
                    System Generated Quality Result
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/90 border border-black/10">
                  READ-ONLY
                </span>
              </div>

              <div className="flex items-center space-x-3">
                {systemEval.status === 'GOOD' ? (
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : systemEval.status === 'NOT GOOD' ? (
                  <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <XCircle className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs font-black text-lg">
                    !
                  </div>
                )}

                <div>
                  <div className="text-base sm:text-lg font-black tracking-tight">
                    {systemEval.status === 'GOOD'
                      ? '✓ GOOD'
                      : systemEval.status === 'NOT GOOD'
                      ? '✕ NOT GOOD'
                      : 'INCOMPLETE CHECKLIST'}
                  </div>
                  <div className="text-xs font-semibold opacity-90 mt-0.5 leading-snug">
                    {systemEval.systemRemark}
                  </div>
                </div>
              </div>

              {/* Failed Items List */}
              {systemEval.status === 'NOT GOOD' && systemEval.failedItems.length > 0 && (
                <div className="bg-white/90 border border-rose-200 rounded-xl p-3 text-xs space-y-1">
                  <div className="font-bold text-rose-800 uppercase text-[10px] tracking-wider">
                    Failed Inspection Items ({systemEval.failedItems.length})
                  </div>
                  <ul className="space-y-1 text-slate-800 font-medium">
                    {systemEval.failedItems.map((f, idx) => (
                      <li key={idx} className="flex items-start space-x-1.5">
                        <span className="text-rose-600 font-bold">•</span>
                        <span>
                          <strong>{f.item.itemName}</strong>: {f.reason}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Defect Identification Details if NOT GOOD */}
            {systemEval.status === 'NOT GOOD' && (
              <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center space-x-2 text-rose-800 text-xs font-bold uppercase">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Defect Identification Details</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NG Defect Parameter <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={ngItem}
                    onChange={(e) => setNgItem(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-rose-500"
                  >
                    <option value="">-- Select Defect Parameter --</option>
                    {checksheetItems.map((i) => (
                      <option key={i.id} value={i.itemName}>
                        [{i.section}] {i.itemName}
                      </option>
                    ))}
                    <option value="Visual Surface Crack or Porosity">Visual Surface Crack or Porosity</option>
                    <option value="Flange Leakage Under Pressure">Flange Leakage Under Pressure</option>
                    <option value="Missing or Damaged O-Ring">Missing or Damaged O-Ring</option>
                    <option value="Other Assembly Defect">Other Assembly Defect</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NG Description & Root Cause Details
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Provide failure root cause, observed leak rates, or visual defect notes..."
                    value={ngDescription}
                    onChange={(e) => setNgDescription(e.target.value)}
                    className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Attach Defect Photo (Optional)
                  </label>
                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoUrl(
                          'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=400&q=80'
                        )
                      }
                      className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-2xs"
                    >
                      <Camera className="w-4 h-4 text-rose-500" />
                      <span>Attach Inspection Photo</span>
                    </button>
                    {photoUrl && (
                      <span className="text-xs text-emerald-600 font-semibold flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Photo Attached</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional Operator Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Unit cleaned and prepped for testing."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleOpenConfirm}
                disabled={!systemEval.isComplete}
                className={`w-full py-3.5 px-5 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 shadow-md transition-all ${
                  !systemEval.isComplete
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : systemEval.status === 'GOOD'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <FileCheck2 className="w-5 h-5" />

                <span>
                  {!systemEval.isComplete
                    ? 'COMPLETE CHECKLIST TO SUBMIT'
                    : 'SUBMIT GLT RESULT'}
                </span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-base">
                Confirm GLT Record Submission
              </h3>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">JO Number:</span>
                <span className="font-bold text-slate-900">{joNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Comp Group:</span>
                <span className="font-semibold text-slate-800">{compGroup}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Unit / Component:</span>
                <span className="font-semibold text-slate-800">{unitModel} / {component}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Assembly Mechanic:</span>
                <span className="font-bold text-blue-700">{assemblyMechanic}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-sans">Final GLT Result:</span>
                <span
                  className={`font-black px-2 py-0.5 rounded text-xs ${
                    finalResult === 'GOOD'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {finalResult}
                </span>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300"
              >
                Edit Form
              </button>
              <button
                onClick={handleFinalSubmit}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md"
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
