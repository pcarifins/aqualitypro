import { QueueRecord, TestingLine, ProductModel } from '../types';

/**
 * Checks if a JO is workflow-ready for a specific testing line process.
 * Rules:
 * - Status must not be 'FINISH'.
 * - GLT lines: Must be PROD (not RETEST), not Cylinder, and not already completed GLT (gltStatus !== 'GOOD').
 * - Dynotest lines: Must be Engine, and must be RETEST OR have completed GLT with GOOD status.
 * - Testbench lines:
 *   - Cylinder line (TB 4 CYL): Must be Cylinder (ready immediately, GLT bypassed).
 *   - PT-PPM lines (TB 1, 2, 3, MOBILE TB): Must be PT-PPM, and must be RETEST OR have completed GLT with GOOD status.
 */
export function isJobWorkflowReadyForLine(record: QueueRecord, line: TestingLine): boolean {
  if (record.status === 'FINISH') {
    return false;
  }

  const lineProcess = (line.process || '').toUpperCase();
  const isRetest = record.testType === 'RETEST';
  const isGLTGood = record.gltStatus === 'GOOD';

  if (lineProcess === 'GLT') {
    // Cylinder never goes through GLT
    if (record.compGroup === 'Cylinder') return false;
    // Retests bypass GLT
    if (isRetest) return false;
    // Already passed GLT
    if (isGLTGood) return false;
    // Match component group
    if (line.componentGroup && record.compGroup !== line.componentGroup) {
      return false;
    }
    return true;
  }

  if (lineProcess === 'DYNOTEST') {
    // Engine only
    if (record.compGroup !== 'Engine') return false;
    // Workflow-ready: Retest or GLT is GOOD
    return isRetest || isGLTGood;
  }

  if (lineProcess === 'TESTBENCH') {
    // Check Cylinder line
    if (line.id === 'tb-4-cyl' || line.componentGroup === 'Cylinder') {
      return record.compGroup === 'Cylinder';
    }

    // Check PT-PPM lines (TB 1, TB 2, TB 3, MOBILE TB)
    if (record.compGroup === 'Cylinder') return false;
    if (record.compGroup !== 'PT-PPM') return false;

    // Workflow-ready: Retest or GLT is GOOD
    return isRetest || isGLTGood;
  }

  return false;
}

/**
 * Checks if a JO is technically compatible with a specific testing line.
 * Evaluates nominal power, torque, and RPM against line technical limits.
 */
export function isProductCompatibleWithLine(
  record: QueueRecord,
  line: TestingLine,
  productModels: ProductModel[] = []
): boolean {
  // Basic group / process match
  if (!isJobWorkflowReadyForLine(record, line)) {
    return false;
  }

  // If the record was explicitly assigned / locked to a specific line by Admin / Supervisor,
  // honor that line assignment
  const assignedLineId = record.currentTestingLineId || record.testingLineId;
  if (assignedLineId && assignedLineId === line.id) {
    return true;
  }

  // Find product model for technical limits
  const product = productModels.find(
    (m) =>
      m.id === record.productModelId ||
      (m.unitModel.trim().toUpperCase() === record.unitModel.trim().toUpperCase() &&
        (m.component || m.compName || '').trim().toUpperCase() === record.component.trim().toUpperCase())
  );

  if (product) {
    if (line.maximumPower && product.nominalPower && product.nominalPower > line.maximumPower) {
      return false;
    }
    if (line.maximumTorque && product.nominalTorque && product.nominalTorque > line.maximumTorque) {
      return false;
    }
    if (line.maximumRPM && product.nominalRPM && product.nominalRPM > line.maximumRPM) {
      return false;
    }
  }

  return true;
}

/**
 * Calculates the Top 3 Queue for a specific testing line.
 * Rules:
 * 1. Use PPC spreadsheet row order as priority sequence (plannedPriority / currentPriority / createdAt).
 * 2. Filter only workflow-ready JOs.
 * 3. Filter only products compatible with the testing line.
 * 4. Show a maximum of 3 JOs for each active line.
 * 5. Do not assign an incompatible JO merely because a line is empty.
 * 6. Do not duplicate one JO across multiple confirmed assignments.
 */
export function getTop3QueueForLine(
  line: TestingLine,
  allRecords: QueueRecord[],
  productModels: ProductModel[] = [],
  assignedJONumbers: Set<string> = new Set()
): QueueRecord[] {
  if (!line.active) {
    return [];
  }

  // Filter candidates
  const eligible = allRecords.filter((record) => {
    // Exclude if already assigned to another confirmed line assignment in the same batch
    if (assignedJONumbers.has(record.joRoNumber.toUpperCase())) {
      const canonicalLineId = record.currentTestingLineId || record.testingLineId;
      if (canonicalLineId !== line.id) {
        return false;
      }
    }

    return isProductCompatibleWithLine(record, line, productModels);
  });

  // Sort by priority sequence (PPC row order is stored in plannedPriority / currentPriority)
  // Only WAITING items
  eligible.sort((a, b) => {
    const aStarredThisLine = a.isTopPriority && a.priorityLineId === line.id;
    const bStarredThisLine = b.isTopPriority && b.priorityLineId === line.id;

    if (aStarredThisLine && !bStarredThisLine) return -1;
    if (!aStarredThisLine && bStarredThisLine) return 1;

    if (aStarredThisLine && bStarredThisLine) {
      return (a.topPriorityRank || 99) - (b.topPriorityRank || 99);
    }

    const prioA = a.currentPriority || a.plannedPriority || 9999;
    const prioB = b.currentPriority || b.plannedPriority || 9999;
    if (prioA !== prioB) return prioA - prioB;

    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });

  // Return only WAITING items for top 3 next queue
  return eligible.filter((q) => q.status !== 'ON_PROCESS' && q.status !== 'FINISH').slice(0, 3);
}

/**
 * Returns currently testing (ON_PROCESS) JO for a specific line if any.
 */
export function getCurrentlyTestingForLine(line: TestingLine, allRecords: QueueRecord[]): QueueRecord | undefined {
  return allRecords.find((record) => {
    if (record.status !== 'ON_PROCESS') return false;
    const targetLine = record.currentTestingLineId || record.testingLineId || record.priorityLineId;
    return targetLine === line.id;
  });
}

/**
 * Computes Top 3 Queue for all active testing lines without duplication.
 */
export function getTop3QueueForAllLines(
  lines: TestingLine[],
  allRecords: QueueRecord[],
  productModels: ProductModel[] = []
): Record<string, QueueRecord[]> {
  const result: Record<string, QueueRecord[]> = {};
  const assignedJONumbers = new Set<string>();

  // Sort lines by displayOrder
  const sortedLines = [...lines].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

  for (const line of sortedLines) {
    const top3 = getTop3QueueForLine(line, allRecords, productModels, assignedJONumbers);
    result[line.id] = top3;
    top3.forEach((rec) => assignedJONumbers.add(rec.joRoNumber.toUpperCase()));
  }

  return result;
}
