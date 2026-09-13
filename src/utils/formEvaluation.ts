import { ChecksheetItem } from '../types';
import { normalizeInputType, evaluateNumericItem } from '../components/ChecksheetRenderer';

export interface FormEvaluationResult {
  status: 'INCOMPLETE' | 'GOOD' | 'NOT GOOD';
  isComplete: boolean;
  missingItems: ChecksheetItem[];
  failedItems: { item: ChecksheetItem; reason: string }[];
  specMissingItems: ChecksheetItem[];
  systemRemark: string;
}

export function evaluateFormResult(
  checksheetItems: ChecksheetItem[],
  answers: Record<string, string>,
  itemRemarks: Record<string, string> = {}
): FormEvaluationResult {
  const activeItems = checksheetItems.filter((i) => i.active !== false);
  const missingItems: ChecksheetItem[] = [];
  const failedItems: { item: ChecksheetItem; reason: string }[] = [];
  const specMissingItems: ChecksheetItem[] = [];

  for (const item of activeItems) {
    const val = answers[item.id] ? answers[item.id].trim() : '';
    const norm = normalizeInputType(item.inputType);

    // Mandatory check: if item is mandatory and val is empty
    if (item.mandatory !== false && (!val || val === '')) {
      missingItems.push(item);
      continue;
    }

    if (!val) continue;

    if (norm === 'GOOD_NOT_GOOD') {
      if (val === 'NOT GOOD') {
        failedItems.push({
          item,
          reason: itemRemarks[item.id] || 'Marked NOT GOOD',
        });
      }
    } else if (norm === 'YES_NO') {
      if (val === 'NO') {
        failedItems.push({
          item,
          reason: itemRemarks[item.id] || 'Marked NO',
        });
      }
    } else if (norm === 'NUMERIC') {
      const numEval = evaluateNumericItem(
        val,
        item.validation,
        item.minimumValue,
        item.maximumValue,
        item.targetValue,
        item.toleranceValue,
        item.unit
      );

      if (!numEval.hasStandard && item.validation && item.validation !== 'NONE') {
        specMissingItems.push(item);
      } else if (numEval.status === 'FAIL') {
        failedItems.push({
          item,
          reason: `Measured ${val}${item.unit ? ' ' + item.unit : ''} outside standard (${numEval.standardText})`,
        });
      } else if (!item.validation || item.validation === 'NONE') {
        // Numeric item with NO range standard needs manual GOOD/NOT GOOD selection
        const rawJudgment = answers[item.id + '_judgment'] ? answers[item.id + '_judgment'].trim() : '';
        let judgment = rawJudgment;
        if (rawJudgment === 'GOOD') judgment = 'PASS';
        if (rawJudgment === 'NOT GOOD' || rawJudgment === 'NG') judgment = 'FAIL';

        if (item.mandatory !== false && (!judgment || (judgment !== 'PASS' && judgment !== 'FAIL' && judgment !== 'NA'))) {
          missingItems.push(item);
        } else if (judgment === 'FAIL') {
          failedItems.push({
            item,
            reason: itemRemarks[item.id] || `Measured ${val}${item.unit ? ' ' + item.unit : ''} and manually judged NOT GOOD`,
          });
        }
      }
    }
  }

  const hasActiveItems = activeItems.length > 0;
  const isComplete = hasActiveItems && missingItems.length === 0 && specMissingItems.length === 0;

  let status: 'INCOMPLETE' | 'GOOD' | 'NOT GOOD' = 'GOOD';
  let systemRemark = '';

  if (!isComplete) {
    status = 'INCOMPLETE';
    if (specMissingItems.length > 0) {
      systemRemark = `SPECIFICATION NOT CONFIGURED for: ${specMissingItems.map((i) => i.itemName).join(', ')}`;
    } else if (!hasActiveItems) {
      systemRemark = `Checksheet is not available. Contact Administrator.`;
    } else {
      systemRemark = `${missingItems.length} mandatory item(s) incomplete. Please complete all checklist parameters.`;
    }
  } else if (failedItems.length > 0) {
    status = 'NOT GOOD';
    const failedNames = failedItems.map((f) => f.item.itemName).join(', ');
    systemRemark = `Hasil testing NOT GOOD karena ${failedNames} tidak memenuhi standard.`;
  } else {
    status = 'GOOD';
    systemRemark = 'Seluruh item pemeriksaan dan performance checklist memenuhi standard. Hasil testing GOOD.';
  }

  return {
    status,
    isComplete,
    missingItems,
    failedItems,
    specMissingItems,
    systemRemark,
  };
}

export type SubmitReadinessCode =
  | 'READY'
  | 'NO_JO'
  | 'NO_QUEUE_RECORD'
  | 'NO_PRODUCT'
  | 'NO_TEMPLATE'
  | 'RECEIVE_REQUIRED'
  | 'GLT_REQUIRED'
  | 'MECHANIC_REQUIRED'
  | 'MANDATORY_INCOMPLETE'
  | 'SPECIFICATION_MISSING'
  | 'NG_REMARK_REQUIRED'
  | 'ALREADY_SUBMITTED';

export interface SubmitReadiness {
  ready: boolean;
  code: SubmitReadinessCode;
  message: string;
  firstInvalidItemId?: string;
}

export interface SubmitReadinessParams {
  joNumber: string;
  selectedQueueId: string;
  productModel?: string | null;
  checksheetItems: ChecksheetItem[];
  answers: Record<string, string>;
  itemRemarks: Record<string, string>;
  testStage: 'GLT' | 'Dynotest' | 'Testbench' | 'Hydraulic Test';
  testType: 'PROD' | 'RETEST';
  compGroup?: string;
  receivingTime?: string | null;
  assemblyMechanic?: string | null;
  latestGLTResult?: string | null;
  isAlreadySubmitted?: boolean;
}

export function validateSubmitReadiness(params: SubmitReadinessParams): SubmitReadiness {
  const {
    joNumber,
    selectedQueueId,
    productModel,
    checksheetItems,
    answers,
    itemRemarks,
    testStage,
    testType,
    compGroup,
    receivingTime,
    assemblyMechanic,
    latestGLTResult,
    isAlreadySubmitted = false,
  } = params;

  // 1. JO number exists
  if (!joNumber || !joNumber.trim()) {
    return {
      ready: false,
      code: 'NO_JO',
      message: 'Job Order number is missing or invalid.',
    };
  }

  // 2. Selected queueRecordId exists (optional if manual entry is allowed, but must have at least one)
  if (!selectedQueueId && !joNumber.trim()) {
    return {
      ready: false,
      code: 'NO_QUEUE_RECORD',
      message: 'No priority queue record selected. Please select a Job Order from the Queue.',
    };
  }

  // 3. Product ID and correct template are resolved
  if (!productModel) {
    return {
      ready: false,
      code: 'NO_PRODUCT',
      message: 'Product model could not be resolved for this Job Order.',
    };
  }

  const activeItems = checksheetItems.filter((i) => i.active !== false);
  const hasActiveItems = activeItems.length > 0;
  if (!hasActiveItems) {
    return {
      ready: false,
      code: 'NO_TEMPLATE',
      message: 'Checksheet is not available. Contact Administrator.',
    };
  }

  // 4. Correct workflow prerequisite is satisfied
  if (testStage === 'Dynotest' && compGroup === 'Engine' && testType === 'PROD') {
    if (!latestGLTResult) {
      return {
        ready: false,
        code: 'GLT_REQUIRED',
        message: 'This Job Order has no completed GLT inspection record. PROD Job Orders must first pass GLT with a GOOD result before entering this stage.',
      };
    }
    if (latestGLTResult !== 'GOOD') {
      return {
        ready: false,
        code: 'GLT_REQUIRED',
        message: `The GLT result for this Job Order is ${latestGLTResult}. A PROD Job Order must successfully pass GLT with a GOOD result before entering this stage.`,
      };
    }
  }

  if ((testStage === 'Testbench' || testStage === 'Hydraulic Test') && compGroup === 'PT-PPM' && testType === 'PROD') {
    if (!latestGLTResult) {
      return {
        ready: false,
        code: 'GLT_REQUIRED',
        message: 'This Job Order has no completed GLT inspection record. PROD PT-PPM Job Orders must first pass GLT with a GOOD result before entering this stage.',
      };
    }
    if (latestGLTResult !== 'GOOD') {
      return {
        ready: false,
        code: 'GLT_REQUIRED',
        message: `The GLT result for this Job Order is ${latestGLTResult}. A PROD PT-PPM Job Order must successfully pass GLT with a GOOD result before entering this stage.`,
      };
    }
  }

  // 5. Receive action has completed successfully
  if (!receivingTime) {
    return {
      ready: false,
      code: 'RECEIVE_REQUIRED',
      message: 'Receive action is required before submission. Please receive the JO and start the test first.',
    };
  }

  // 6. Assembly mechanic is available where required
  if (testStage !== 'GLT' && (!assemblyMechanic || !assemblyMechanic.trim() || assemblyMechanic === 'Assembler')) {
    return {
      ready: false,
      code: 'MECHANIC_REQUIRED',
      message: 'Assembly Mechanic is required. Please select or input the Assembly Mechanic.',
    };
  }

  // 7. Active mandatory checksheet items are completed & 8. Numeric values configuration
  const evalResult = evaluateFormResult(checksheetItems, answers, itemRemarks);
  if (!evalResult.isComplete) {
    if (evalResult.specMissingItems.length > 0) {
      return {
        ready: false,
        code: 'SPECIFICATION_MISSING',
        message: `SPECIFICATION NOT CONFIGURED for ${evalResult.specMissingItems.map((i) => i.itemName).join(', ')}. Cannot submit.`,
      };
    } else {
      const firstMissing = evalResult.missingItems[0];
      return {
        ready: false,
        code: 'MANDATORY_INCOMPLETE',
        message: `Please complete all ${evalResult.missingItems.length} mandatory checksheet items before submitting.`,
        firstInvalidItemId: firstMissing ? firstMissing.id : undefined,
      };
    }
  }

  // 9. NOT GOOD items have remarks
  const ngItemsWithoutRemark = activeItems.filter((i) => {
    const val = answers[i.id];
    const norm = normalizeInputType(i.inputType);
    let isNG = false;
    if (norm === 'GOOD_NOT_GOOD' && val === 'NOT GOOD') isNG = true;
    if (norm === 'YES_NO' && val === 'NO' && i.mandatory) isNG = true;
    if (norm === 'NUMERIC') {
      if (!i.validation || i.validation === 'NONE') {
        const rawJudgment = answers[i.id + '_judgment'] || '';
        if (rawJudgment === 'NOT GOOD' || rawJudgment === 'NG') isNG = true;
      } else {
        const numEval = evaluateNumericItem(
          val || '',
          i.validation,
          i.minimumValue,
          i.maximumValue,
          i.targetValue,
          i.toleranceValue,
          i.unit
        );
        if (numEval.status === 'FAIL') isNG = true;
      }
    }
    return isNG && (!itemRemarks[i.id] || !itemRemarks[i.id].trim());
  });

  if (ngItemsWithoutRemark.length > 0) {
    return {
      ready: false,
      code: 'NG_REMARK_REQUIRED',
      message: `Please provide defect description for all items marked NOT GOOD.`,
      firstInvalidItemId: ngItemsWithoutRemark[0].id,
    };
  }

  // 10. Submission is not already saved
  if (isAlreadySubmitted) {
    return {
      ready: false,
      code: 'ALREADY_SUBMITTED',
      message: 'This test result has already been submitted and cannot be sent again.',
    };
  }

  return {
    ready: true,
    code: 'READY',
    message: 'Form validation passed. Ready to submit.',
  };
}
