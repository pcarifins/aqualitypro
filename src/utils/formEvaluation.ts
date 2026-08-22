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
      }
    }
  }

  const isComplete = missingItems.length === 0 && specMissingItems.length === 0;

  let status: 'INCOMPLETE' | 'GOOD' | 'NOT GOOD' = 'GOOD';
  let systemRemark = '';

  if (!isComplete) {
    status = 'INCOMPLETE';
    if (specMissingItems.length > 0) {
      systemRemark = `SPECIFICATION NOT CONFIGURED for: ${specMissingItems.map((i) => i.itemName).join(', ')}`;
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
