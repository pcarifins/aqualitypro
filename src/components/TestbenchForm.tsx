import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  ChecksheetItem,
  HydraulicRecord,
  TestResult,
  ChecksheetAnswer,
  QueueRecord,
  CompGroup,
  ProductModel,
  ChecksheetTemplate,
} from '../types';
import { apiClient } from '../api/client';
import { store } from '../data/storageEngine';
import { ChecksheetRenderer, normalizeInputType, evaluateNumericItem } from './ChecksheetRenderer';
import { evaluateFormResult, validateSubmitReadiness } from '../utils/formEvaluation';
import { findMatchingProduct, getCompatibleTemplates, resolveFinalTestTemplate, findContingencyTemplate } from '../utils/checksheetResolver';
import {
  Search,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Camera,
  Save,
  Send,
  Lock,
  ListOrdered,
  ShieldCheck,
} from 'lucide-react';
import {
  formatDateTime,
  formatDuration,
  calculateMinutesBetween,
} from '../utils/formatters';
import { AITroubleshootingCard } from './AITroubleshootingCard';
import { Top3QueueCards } from './Top3QueueCards';

interface TestbenchFormProps {
  currentUser: User;
  productModels: ProductModel[];
  checksheetTemplates: ChecksheetTemplate[];
  lookupJO: (joNumber: string, stage: 'Hydraulic Test') => Promise<any>;
  getChecksheets: (process: 'Hydraulic Test') => Promise<ChecksheetItem[]>;
  onSaveRecord: (record: HydraulicRecord) => Promise<HydraulicRecord>;
  preloadJONumber?: string;
  onSuccessSubmitted: (joNumber: string) => void;
}

export const TestbenchForm: React.FC<TestbenchFormProps> = ({
  currentUser,
  productModels,
  checksheetTemplates,
  lookupJO,
  getChecksheets,
  onSaveRecord,
  preloadJONumber = '',
  onSuccessSubmitted,
}) => {
  // Queue & Selection
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [isLockedFromQueue, setIsLockedFromQueue] = useState(false);

  // General & Product Info
  const [joNumber, setJoNumber] = useState(preloadJONumber || '');
  const [compGroup, setCompGroup] = useState<CompGroup>('PT-PPM');
  const [subGroup, setSubGroup] = useState<'PT' | 'PPM' | null>(null);
  const [unitModel, setUnitModel] = useState('');
  const [component, setComponent] = useState('');
  const [productModel, setProductModel] = useState('');
  const [testType, setTestType] = useState<'PROD' | 'RETEST'>('PROD');
  const [assemblyMechanic, setAssemblyMechanic] = useState('');
  const [plannedPriority, setPlannedPriority] = useState<number | undefined>(undefined);
  const [currentPriority, setCurrentPriority] = useState<number | undefined>(undefined);
  const [gltIncomingTime, setGltIncomingTime] = useState<string | null>(null);
  const [firstStartIso, setFirstStartIso] = useState<string | null>(null);
  const [latestGLTResult, setLatestGLTResult] = useState<string | null>(null);

  // Form State
  const [receivingTime, setReceivingTime] = useState<string | null>(null);
  const [checksheetItems, setChecksheetItems] = useState<ChecksheetItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [itemRemarks, setItemRemarks] = useState<Record<string, string>>({});
  const [finalResult, setFinalResult] = useState<TestResult>('GOOD');
  const [ngItem, setNgItem] = useState('');
  const [ngDescription, setNgDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attemptNumber, setAttemptNumber] = useState(1);

  // Form Controls
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Line Selection & Operator Access
  const userUpper = (currentUser?.name || '').toUpperCase();
  const userRoleUpper = (currentUser?.role || '').toUpperCase();

  let defaultTb = 'tb-1';
  if (userUpper.includes('RUDI')) defaultTb = 'tb-1';
  else if (userUpper.includes('AGUNG')) defaultTb = 'tb-2';
  else if (userUpper.includes('YANTO')) defaultTb = 'tb-3';
  else if (userUpper.includes('WENDY')) defaultTb = 'mobile-tb';
  else if (userUpper.includes('NIRWAN')) defaultTb = 'tb-4-cyl';

  const [selectedTbLineId, setSelectedTbLineId] = useState<string>(defaultTb);

  const isUnlimitedTbAccess =
    userRoleUpper === 'SUPERVISOR' ||
    userRoleUpper === 'ADMIN' ||
    userRoleUpper === 'PPC';

  const isTbLineAllowed = (lineId: string) => {
    if (isUnlimitedTbAccess) return true;
    if (userUpper.includes('RUDI') && lineId === 'tb-1') return true;
    if (userUpper.includes('AGUNG') && lineId === 'tb-2') return true;
    if (userUpper.includes('YANTO') && lineId === 'tb-3') return true;
    if (userUpper.includes('WENDY') && lineId === 'mobile-tb') return true;
    if (userUpper.includes('NIRWAN') && lineId === 'tb-4-cyl') return true;
    return false;
  };

  const currentlyTestingTbJO = useMemo(() => {
    return queueRecords.find((q) => {
      if (q.status !== 'ON_PROCESS') return false;
      const lineId = q.currentTestingLineId || q.testingLineId || q.priorityLineId;
      return lineId === selectedTbLineId;
    });
  }, [queueRecords, selectedTbLineId]);

  const top3WaitingTbJOs = useMemo(() => {
    const eligible = queueRecords.filter((q) => {
      if (q.status === 'ON_PROCESS' || q.status === 'FINISH') return false;
      if (selectedTbLineId === 'tb-4-cyl') {
        if (q.compGroup !== 'Cylinder') return false;
      } else {
        if (q.compGroup !== 'PT-PPM') return false;
        if (q.testType === 'PROD' && q.gltStatus !== 'GOOD') return false;
      }
      if (q.isTopPriority && q.priorityLineId && q.priorityLineId !== selectedTbLineId) return false;
      return true;
    });

    eligible.sort((a, b) => {
      const aStarred = a.isTopPriority && a.priorityLineId === selectedTbLineId;
      const bStarred = b.isTopPriority && b.priorityLineId === selectedTbLineId;
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      if (aStarred && bStarred) return (a.topPriorityRank || 99) - (b.topPriorityRank || 99);
      const prioA = a.currentPriority || a.plannedPriority || 9999;
      const prioB = b.currentPriority || b.plannedPriority || 9999;
      if (prioA !== prioB) return prioA - prioB;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    return eligible.slice(0, 3);
  }, [queueRecords, selectedTbLineId]);

  // Load Queue for PT-PPM and Cylinder
  useEffect(() => {
    apiClient.getQueueRecords().then((qList) => {
      const eligible = qList.filter((q) => {
        if (q.compGroup === 'Engine') return false;
        if (q.status === 'FINISH') return false;
        if (q.testType === 'RETEST') return true;
        // Cylinder is excluded from GLT and is eligible directly for Testbench
        if (q.compGroup === 'Cylinder') return true;
        return q.gltStatus === 'GOOD';
      });
      setQueueRecords(eligible);
    });
  }, []);

  // Load checksheet items based on component / unitModel / productModels / checksheetTemplates
  useEffect(() => {
    if (!component || !unitModel) {
      getChecksheets('Hydraulic Test').then((items) => setChecksheetItems(items));
      return;
    }

    const product = findMatchingProduct(productModels, component, unitModel);
    let activeTemplates: ChecksheetTemplate[] = [];

    if (product) {
      activeTemplates = getCompatibleTemplates(checksheetTemplates, product, 'Testbench', store.getTemplateRelationships(), store.getStandardProfiles());
    }

    let matchedTmpl: ChecksheetTemplate | null = activeTemplates.length > 0 ? activeTemplates[0] : null;

    if (!matchedTmpl) {
      const res = resolveFinalTestTemplate({
        productId: product?.id,
        compGroup: compGroup || 'PT-PPM',
        unitModel,
        component,
        finalProcess: 'TESTBENCH',
        templates: checksheetTemplates,
        relationships: store.getTemplateRelationships(),
        standardProfiles: store.getStandardProfiles(),
      });
      matchedTmpl = res.mergedTemplate || findContingencyTemplate(checksheetTemplates);
    }

    if (matchedTmpl && matchedTmpl.sections) {
      const items: ChecksheetItem[] = [];
      matchedTmpl.sections.forEach((sec) => {
        sec.items.forEach((item) => {
          items.push({
            ...item,
            section: sec.name,
            templateId: matchedTmpl!.id,
            process: 'Testbench',
          });
        });
      });
      setChecksheetItems(items);
    } else {
      getChecksheets('Hydraulic Test').then((items) => setChecksheetItems(items));
    }
  }, [component, unitModel, productModels, checksheetTemplates]);

  useEffect(() => {
    if (preloadJONumber) {
      handleSelectJOFromQueue(preloadJONumber);
    }
  }, [preloadJONumber]);

  const handleSelectQueueItem = (qId: string) => {
    setSelectedQueueId(qId);
    setValidationError(null);

    const record = queueRecords.find((q) => q.queueRecordId === qId);
    if (!record) return;

    setJoNumber(record.joRoNumber);
    setCompGroup(record.compGroup);
    setSubGroup(record.subGroup || null);
    setUnitModel(record.unitModel);
    setComponent(record.component);
    setProductModel(record.productModelId || `${record.unitModel} / ${record.component}`);
    setTestType(record.testType);
    setPlannedPriority(record.plannedPriority);
    setCurrentPriority(record.currentPriority);
    setAssemblyMechanic(record.assemblyMechanic || 'Assembler');
    setAttemptNumber(record.testType === 'RETEST' ? 2 : 1);
    setLatestGLTResult(record.gltStatus || null);
    if (record.receivingTime) {
      setReceivingTime(record.receivingTime);
    }

    setIsLockedFromQueue(true);

    if (record.testType === 'PROD') {
      lookupJO(record.joRoNumber, 'Hydraulic Test').then((res) => {
        if (res && res.gltIncomingTime) {
          setGltIncomingTime(res.gltIncomingTime);
        }
        if (res && res.firstStartIso) {
          setFirstStartIso(res.firstStartIso);
        }
      });
    } else {
      setGltIncomingTime(null);
      lookupJO(record.joRoNumber, 'Hydraulic Test').then((res) => {
        if (res && res.firstStartIso) {
          setFirstStartIso(res.firstStartIso);
        }
      });
    }
  };

  const handleSelectJOFromQueue = (joNum: string) => {
    const clean = joNum.trim().toUpperCase();
    const foundInQueue = queueRecords.find((q) => q.joRoNumber.toUpperCase() === clean);
    if (foundInQueue) {
      handleSelectQueueItem(foundInQueue.queueRecordId);
    } else {
      setJoNumber(clean);
      setIsLockedFromQueue(false);
      lookupJO(clean, 'Hydraulic Test').then((res) => {
        if (res && !res.error) {
          setCompGroup(res.compGroup || 'PT-PPM');
          setUnitModel(res.unitModel || '');
          setComponent(res.component || '');
          setProductModel(res.productModel || '');
          setAssemblyMechanic(res.assemblyMechanic || '');
          setGltIncomingTime(res.gltIncomingTime || null);
          setLatestGLTResult(res.latestGLTResult || null);
          setFirstStartIso(res.firstStartIso || null);
        } else {
          setLatestGLTResult(null);
          setFirstStartIso(null);
        }
      });
    }
  };

  const handleReceiveAtTestbench = async () => {
    const requiresGLT = compGroup === 'PT-PPM' && testType === 'PROD';
    if (requiresGLT) {
      if (!latestGLTResult) {
        setValidationError('This Job Order has no completed GLT inspection record. PROD PT-PPM Job Orders must first pass GLT with a GOOD result before entering this stage.');
        return;
      }
      if (latestGLTResult !== 'GOOD') {
        setValidationError(`The GLT result for this Job Order is ${latestGLTResult}. A PROD PT-PPM Job Order must successfully pass GLT with a GOOD result before entering this stage.`);
        return;
      }
    }
    const nowIso = new Date().toISOString();
    try {
      const targetQ =
        selectedQueueId ||
        queueRecords.find(
          (q) =>
            q.joRoNumber.toUpperCase() ===
            joNumber.trim().toUpperCase()
        )?.queueRecordId;

      if (targetQ) {
        await store.updateQueueRecord(targetQ, {
          receivingTime: nowIso,
          status: 'ON_PROCESS',
          priorityLocked: true,
          currentTestingLineId: selectedTbLineId,
          testingLineId: selectedTbLineId,
        });
      } else if (joNumber) {
        await store.updateQueueRecordByJONumber(joNumber, {
          receivingTime: nowIso,
          status: 'ON_PROCESS',
          priorityLocked: true,
          currentTestingLineId: selectedTbLineId,
          testingLineId: selectedTbLineId,
        });
      }
      setReceivingTime(nowIso);
      setValidationError(null);
      setToastMessage('Received at Testbench! Testing timer started.');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error: any) {
      console.error('Failed to update receiving time in queue:', error);
      setValidationError(`Failed to receive JO: ${error?.message || 'Firestore update error'}`);
    }
  };

  const handleAnswerChange = (itemId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [itemId]: val }));
  };

  const handleItemRemarkChange = (itemId: string, remark: string) => {
    setItemRemarks((prev) => ({ ...prev, [itemId]: remark }));
  };

  const isRetest = testType === 'RETEST';
  const gltLeadTimeMinutes =
    !isRetest && receivingTime && gltIncomingTime
      ? calculateMinutesBetween(gltIncomingTime, receivingTime)
      : undefined;

  const currentSubmissionTime = new Date().toISOString();
  const hydraulicLeadTimeMinutes = receivingTime
    ? calculateMinutesBetween(receivingTime, currentSubmissionTime)
    : undefined;

  const checkAnyItemFailed = (): boolean => {
    const activeItems = checksheetItems.filter((i) => i.active !== false);
    for (const item of activeItems) {
      const val = answers[item.id] || '';
      const norm = normalizeInputType(item.inputType);

      if (norm === 'GOOD_NOT_GOOD' && val === 'NOT GOOD') return true;
      if (norm === 'YES_NO' && val === 'NO' && item.mandatory) return true;
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
        if (numEval.hasStandard && numEval.status === 'FAIL') return true;
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

    const readiness = validateSubmitReadiness({
      joNumber,
      selectedQueueId,
      productModel,
      checksheetItems,
      answers,
      itemRemarks,
      testStage: 'Testbench',
      testType,
      compGroup,
      receivingTime,
      assemblyMechanic,
      latestGLTResult,
      isAlreadySubmitted: false,
    });

    if (!readiness.ready) {
      setValidationError(readiness.message);
      if (readiness.firstInvalidItemId) {
        const elem = document.getElementById(`checksheet-item-${readiness.firstInvalidItemId}`);
        if (elem) elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return false;
    }

    if (systemEval.status === 'NOT GOOD' && !ngItem.trim()) {
      setNgItem(systemEval.failedItems.map((f) => f.item.itemName).join(', ') || 'Testbench Parameter Failure');
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
        if (!item.validation || item.validation === 'NONE') {
          const rawJudgment = answers[item.id + '_judgment'] || '';
          const judgment = rawJudgment === 'GOOD' ? 'PASS' : (rawJudgment === 'NOT GOOD' || rawJudgment === 'NG') ? 'FAIL' : rawJudgment;
          resStatus = judgment === 'FAIL' ? 'FAIL' : judgment === 'PASS' ? 'PASS' : 'NA';
        } else {
          const numEval = evaluateNumericItem(
            userVal,
            item.validation,
            item.minimumValue,
            item.maximumValue,
            item.targetValue,
            item.toleranceValue,
            item.unit
          );
          if (!numEval.hasStandard) resStatus = 'NA';
          else if (numEval.status === 'FAIL') resStatus = 'FAIL';
          else if (numEval.status === 'PASS') resStatus = 'PASS';
          else resStatus = 'NA';
        }
      } else if (norm === 'GOOD_NOT_GOOD') {
        resStatus = userVal === 'NOT GOOD' ? 'FAIL' : userVal === 'GOOD' ? 'PASS' : 'NA';
      } else if (norm === 'YES_NO') {
        resStatus = userVal === 'NO' ? 'FAIL' : userVal === 'YES' ? 'PASS' : 'NA';
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

  const handleSaveDraft = async () => {
    if (!joNumber.trim()) {
      setValidationError('Please select a JO to save a draft.');
      return;
    }

    const answerSnapshots = buildAnswerSnapshots();
    const subTime = new Date().toISOString();
    const calculatedHydLeadTime = receivingTime
      ? calculateMinutesBetween(firstStartIso || gltIncomingTime || receivingTime, subTime)
      : undefined;

    const draftRecord: HydraulicRecord = {
      id: `hyd-draft-${Date.now()}`,
      joNumber: joNumber.trim().toUpperCase(),
      productCategory: 'Power Train Component',
      productModel: productModel || `${unitModel} / ${component}` || 'PT Component',
      compGroup,
      subGroup,
      unitModel,
      component,
      assemblyMechanic: assemblyMechanic || 'Assembler',
      testType,
      operatorName: currentUser.name,
      operatorId: currentUser.id,
      receivingTime: receivingTime || new Date().toISOString(),
      submissionTime: subTime,
      gltLeadTimeMinutes,
      hydraulicLeadTimeMinutes: calculatedHydLeadTime,
      result: finalResult,
      status: 'Draft',
      attemptNumber,
      answers: answerSnapshots,
      ngItem: finalResult === 'NOT GOOD' ? ngItem : undefined,
      ngDescription: finalResult === 'NOT GOOD' ? ngDescription : undefined,
      photoUrl: photoUrl || undefined,
      remarks,
    };

    await onSaveRecord(draftRecord);
    setToastMessage('Testbench Draft saved successfully.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenConfirm = () => {
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const handleFinalSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setValidationError(null);

    // Revalidate inside confirmation modal before Firestore write
    if (!validateForm()) {
      setIsSubmitting(false);
      setShowConfirmModal(false);
      return;
    }

    try {
      const submissionTime = new Date().toISOString();
      const finalLeadMinutes = receivingTime
        ? calculateMinutesBetween(firstStartIso || gltIncomingTime || receivingTime, submissionTime)
        : 0;

      const answerSnapshots = buildAnswerSnapshots();

      const submissionId = `hyd_${joNumber.trim().toUpperCase()}_${attemptNumber}`;

      const recordToSave: HydraulicRecord = {
        id: submissionId,
        joNumber: joNumber.trim().toUpperCase(),
        productCategory: 'Power Train Component',
        productModel: productModel || `${unitModel} / ${component}` || 'PT Component',
        compGroup,
        subGroup,
        unitModel,
        component,
        assemblyMechanic,
        testType,
        operatorName: currentUser.name,
        operatorId: currentUser.id,
        receivingTime: receivingTime!,
        submissionTime,
        gltLeadTimeMinutes,
        hydraulicLeadTimeMinutes: finalLeadMinutes,
        result: finalResult,
        status: 'Submitted',
        attemptNumber,
        answers: answerSnapshots,
        ngItem: finalResult === 'NOT GOOD' ? ngItem : undefined,
        ngDescription: finalResult === 'NOT GOOD' ? ngDescription : undefined,
        photoUrl: photoUrl || undefined,
        remarks,
      };

      await onSaveRecord(recordToSave);

      // Update Queue record
      const targetQ =
        selectedQueueId ||
        queueRecords.find((q) => q.joRoNumber.toUpperCase() === joNumber.trim().toUpperCase())
          ?.queueRecordId;

      if (targetQ) {
        await store.updateQueueRecord(targetQ, {
          status: finalResult === 'GOOD' ? 'FINISH' : 'WAITING',
        });
      }

      setShowConfirmModal(false);
      onSuccessSubmitted(joNumber);
    } catch (error: any) {
      console.error('Failed to submit Testbench record:', error);
      setValidationError(`Testbench Submission Failed: ${error?.message || 'Firestore write error'}`);
      setShowConfirmModal(false);
    } finally {
      setIsSubmitting(false);
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
          <div className="flex items-center space-x-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Activity className="w-4 h-4" />
            <span>Operational Testing • Step 2 (PT-PPM & Cylinder)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
            Testbench Functional Bench Execution
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Testing hydraulic pumps, motors, valves, cylinders, transmissions & torqflow units.
          </p>
        </div>

        <div className="flex items-center space-x-3 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 shrink-0">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400">Operator</div>
            <div className="text-xs font-bold text-cyan-300">{currentUser.name}</div>
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

      {/* SECTION 1: JO SELECTION FROM PRIORITY QUEUE */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
            <ListOrdered className="w-4 h-4 text-cyan-600" />
            <span>1. Authorized Component Priority Queue (PT-PPM & Cylinder)</span>
          </h3>

          {/* Testbench Line Selection Buttons */}
          <div className="flex items-center space-x-1.5 flex-wrap">
            {[
              { id: 'tb-1', label: 'TB1' },
              { id: 'tb-2', label: 'TB2' },
              { id: 'tb-3', label: 'TB3' },
              { id: 'mobile-tb', label: 'MTB' },
              { id: 'tb-4-cyl', label: 'TB4' },
            ].map((line) => {
              const isSelected = selectedTbLineId === line.id;
              const isAllowed = isTbLineAllowed(line.id);
              return (
                <button
                  key={line.id}
                  type="button"
                  disabled={!isAllowed}
                  onClick={() => setSelectedTbLineId(line.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-600 text-white shadow-xs'
                      : isAllowed
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-100'
                  }`}
                  title={!isAllowed ? 'Assigned to designated operator' : `Select ${line.label}`}
                >
                  {line.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* CURRENTLY TESTING CARD */}
        {currentlyTestingTbJO && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center space-x-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>CURRENTLY TESTING</span>
              </span>
              <div>
                <div className="font-mono font-bold text-slate-900 text-xs">
                  JO: {currentlyTestingTbJO.joRoNumber}
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  {currentlyTestingTbJO.unitModel} • {currentlyTestingTbJO.component}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleSelectQueueItem(currentlyTestingTbJO.queueRecordId)}
              className="text-xs font-bold text-amber-900 bg-amber-200 hover:bg-amber-300 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              Resume Testing
            </button>
          </div>
        )}

        {/* Priority JO Selector */}
        <Top3QueueCards
          cards={top3WaitingTbJOs}
          selectedJONumber={joNumber}
          selectedQueueId={selectedQueueId}
          onSelectCard={(rec) => handleSelectQueueItem(rec.queueRecordId)}
          emptyMessage={`No uncompleted jobs waiting on ${selectedTbLineId.toUpperCase()}.`}
          accentColor="cyan"
        />

        {/* Locked / Auto-filled Specification Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              JO Number {isLockedFromQueue && <Lock className="w-3 h-3 text-slate-400 inline ml-1" />}
            </label>
            <input
              type="text"
              value={joNumber}
              onChange={(e) => setJoNumber(e.target.value.toUpperCase())}
              readOnly={isLockedFromQueue}
              className="w-full bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Comp Group</label>
            <input
              type="text"
              value={compGroup + (subGroup ? ` (${subGroup})` : '')}
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
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Component</label>
            <input
              type="text"
              value={component || '-'}
              readOnly
              className="w-full bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Test Type</label>
            <span
              className={`inline-flex items-center px-2.5 py-1.5 rounded-xl text-xs font-bold ${
                isRetest
                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                  : 'bg-cyan-100 text-cyan-800 border border-cyan-300'
              }`}
            >
              {isRetest ? 'RETEST (Direct Testing)' : 'PROD (Cycle 1)'}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Assembly Mechanic</label>
            <input
              type="text"
              value={assemblyMechanic || '-'}
              readOnly
              className="w-full bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-3 py-2 text-xs font-semibold"
            />
          </div>
        </div>

        {/* Receive at Testbench Button & Lead Time Calculation */}
        <div className="pt-2 border-t border-slate-100">
          {!receivingTime ? (
            <button
              type="button"
              onClick={handleReceiveAtTestbench}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-xl text-xs sm:text-sm flex items-center justify-center space-x-2 shadow-md transition-all"
            >
              <Clock className="w-4 h-4" />
              <span>Click to "Receive at Testbench" (Start Lead-Time Timer)</span>
            </button>
          ) : (
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 text-cyan-800 font-semibold w-full">
                <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                <span>
                  Received at: <strong className="font-mono">{formatDateTime(receivingTime)}</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2, 3, & SUBMIT: GATED UNTIL JO IS SELECTED */}
      {!joNumber.trim() ? (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center mx-auto">
            <ListOrdered className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-800">Select an Authorized Component JO to Start Testbench</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Please select a ready PT-PPM or Cylinder Job Order from the Priority Queue above to unlock performance parameters and testing measurements.
          </p>
        </div>
      ) : checksheetItems.filter((i) => i.active !== false).length === 0 ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-rose-900">FATAL: Testing Blocked - No Valid Template Relationship Resolved</h4>
          <p className="text-xs text-rose-800 max-w-lg mx-auto leading-relaxed">
            Checksheet is not available. Contact Administrator.
          </p>
        </div>
      ) : !receivingTime ? (
        <div className="bg-blue-50 border-2 border-dashed border-blue-200 rounded-2xl p-7 text-center space-y-3">
          <Clock className="w-8 h-8 text-blue-600 mx-auto" />

          <h3 className="text-sm font-bold text-slate-800">
            JO Selected — Waiting for Testbench Receiving
          </h3>

          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Click "Receive at Testbench" above to record
            the actual Testbench starting time and unlock
            the inspection checklist.
          </p>

          <div className="text-[11px] font-bold text-blue-700">
            Inspection Checklist Locked
          </div>
        </div>
      ) : (

        <>
          {/* SECTION 2: DYNAMIC TESTBENCH CHECKSHEET */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                2. Testbench Performance Checklist
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
              3. System Evaluated Testbench Result
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
                  <ShieldCheck className="w-4 h-4 text-cyan-600" />
                  <span className="text-[11px] font-black uppercase tracking-wider opacity-80">
                    System Generated Testbench Quality Result
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
                    <option value="Main Relief Valve Pressure Low / High">
                      Main Relief Valve Pressure Low / High
                    </option>
                    <option value="Internal Leakage Exceeds Specification">
                      Internal Leakage Exceeds Specification
                    </option>
                    <option value="Abnormal Vibration / Cavitation Noise">
                      Abnormal Vibration / Cavitation Noise
                    </option>
                    <option value="Shaft Seal / Flange Oil Leakage">Shaft Seal / Flange Oil Leakage</option>
                    <option value="Cylinder Drift / Piston Seal Bypass">
                      Cylinder Drift / Piston Seal Bypass
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    NG Description & Root Cause Details
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Describe failure details, measured values, or visual defect..."
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

                {/* AI Troubleshooting Suggestion */}
                <AITroubleshootingCard
                  process="Hydraulic Testbench Test"
                  unitModel={unitModel}
                  component={component}
                  ngItem={ngItem}
                  ngDescription={ngDescription}
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Additional Operator Remarks (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Pump flow curve and pressure relief within normal Komatsu OEM tolerances."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div className="pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleOpenConfirm}
                disabled={isSubmitting}
                className={`w-full py-3.5 px-5 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 shadow-md transition-all ${
                  isSubmitting
                    ? 'bg-slate-400 text-slate-500 cursor-not-allowed shadow-none'
                    : systemEval.status === 'GOOD' || !systemEval.isComplete
                    ? 'bg-cyan-600 hover:bg-cyan-700 text-white'
                    : 'bg-rose-600 hover:bg-rose-700 text-white'
                }`}
              >
                <Send className="w-5 h-5" />

                <span>
                  {isSubmitting
                    ? 'SUBMITTING...'
                    : 'SUBMIT TESTBENCH RESULT'}
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
                Confirm Testbench Submission
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
                <span className="text-slate-500 font-sans">Receiving Time:</span>
                <span className="font-semibold text-slate-800">{formatDateTime(receivingTime || '')}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200">
                <span className="text-slate-500 font-sans">Final Result:</span>
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
                disabled={isSubmitting}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold shadow-md text-white transition-colors ${
                  isSubmitting ? 'bg-slate-400 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-700'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
