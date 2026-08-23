import { QueueRecord, TestingLine, CompGroup } from '../types';

export interface LineCapacitySummary {
  lineId: string;
  lineName: string;
  process: string;
  componentGroup: CompGroup;
  active: boolean;
  availableHours: number;
  runningCount: number;
  queuedCount: number;
  plannedHours: number;
  remainingHours: number;
  utilizationPercent: number;
}

export interface OverallCapacityStats {
  totalQueueCount: number;
  waitingCount: number;
  onProcessCount: number;
  urgentCount: number;
  retestCount: number;
  totalPlannedHours: number;
  totalAvailableHours: number;
  capacityUtilization: number; // percentage e.g. 75.5
  lineSummaries: LineCapacitySummary[];
}

export interface CalculatedQueueItem extends QueueRecord {
  estimatedDurationHours: number;
  estimatedStartTime: string;
  estimatedFinishTime: string;
  assignedLineName: string;
}

/**
  Gets standard estimated duration in hours for a queue item.
*/
export function getEstimatedDurationHours(item: QueueRecord, lines: TestingLine[]): number {
  if (item.testingLineId) {
    const line = lines.find((l) => l.id === item.testingLineId);
    if (line && line.standardDurationMinutes > 0) {
      return line.standardDurationMinutes / 60;
    }
  }

  // Fallback defaults based on component group / test stage
  if (item.compGroup === 'Engine') {
    return 2.0; // 2 hours standard dyno/glt
  } else if (item.compGroup === 'PT-PPM') {
    return 1.5; // 1.5 hours testbench
  } else {
    return 1.0; // 1 hour cylinder
  }
}

/**
  Calculates overall capacity statistics across all active testing lines and queue items.
*/
export function calculateOverallCapacity(
  queue: QueueRecord[],
  lines: TestingLine[]
): OverallCapacityStats {
  const activeLines = lines.filter((l) => l.active);
  const totalAvailableHours = activeLines.reduce((sum, l) => sum + (l.operatingHoursPerDay || 8), 0);

  const totalQueueCount = queue.length;
  const waitingCount = queue.filter((q) => q.status === 'WAITING').length;
  const onProcessCount = queue.filter((q) => q.status === 'ON_PROCESS').length;
  const urgentCount = queue.filter((q) => q.isUrgentUnassigned).length;
  const retestCount = queue.filter((q) => q.testType === 'RETEST').length;

  let totalPlannedHours = 0;

  const lineSummaries: LineCapacitySummary[] = activeLines.map((line) => {
    // JOs assigned to this line or matching group/process
    const lineJOs = queue.filter(
      (q) =>
        q.testingLineId === line.id ||
        (!q.testingLineId && q.compGroup === line.componentGroup)
    );

    const runningCount = lineJOs.filter((q) => q.status === 'ON_PROCESS').length;
    const queuedCount = lineJOs.filter((q) => q.status === 'WAITING').length;

    const plannedHours = lineJOs.reduce(
      (sum, item) => sum + getEstimatedDurationHours(item, lines),
      0
    );

    totalPlannedHours += plannedHours;

    const availableHours = line.operatingHoursPerDay || 8;
    const remainingHours = Math.max(0, availableHours - plannedHours);
    const utilizationPercent =
      availableHours > 0 ? (plannedHours / availableHours) * 100 : 0;

    return {
      lineId: line.id,
      lineName: line.name,
      process: line.process,
      componentGroup: line.componentGroup,
      active: line.active,
      availableHours,
      runningCount,
      queuedCount,
      plannedHours,
      remainingHours,
      utilizationPercent,
    };
  });

  const capacityUtilization =
    totalAvailableHours > 0 ? (totalPlannedHours / totalAvailableHours) * 100 : 0;

  return {
    totalQueueCount,
    waitingCount,
    onProcessCount,
    urgentCount,
    retestCount,
    totalPlannedHours,
    totalAvailableHours,
    capacityUtilization,
    lineSummaries,
  };
}

/**
  Calculates estimated start and finish times for queue items sequentially.
*/
export function calculateScheduleForQueue(
  queue: QueueRecord[],
  lines: TestingLine[]
): CalculatedQueueItem[] {
  // Sort queue by priority order
  const sortedQueue = [...queue].sort((a, b) => {
    // ON_PROCESS items first, then by priority
    if (a.status === 'ON_PROCESS' && b.status !== 'ON_PROCESS') return -1;
    if (b.status === 'ON_PROCESS' && a.status !== 'ON_PROCESS') return 1;
    return a.currentPriority - b.currentPriority;
  });

  // Keep track of finish times per testing line or compGroup
  const linePointers: Record<string, Date> = {};

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(8, 0, 0, 0); // 8:00 AM shift start

  // Base schedule start time: if now is before 8am, use 8am today; if past 5pm, start 8am tomorrow
  let baseScheduleStart = new Date(now);
  if (now.getHours() < 8) {
    baseScheduleStart = startOfDay;
  } else if (now.getHours() >= 17) {
    baseScheduleStart = new Date(now);
    baseScheduleStart.setDate(baseScheduleStart.getDate() + 1);
    baseScheduleStart.setHours(8, 0, 0, 0);
  }

  return sortedQueue.map((item) => {
    const durationHours = getEstimatedDurationHours(item, lines);
    const lineKey = item.testingLineId || item.compGroup;

    if (!linePointers[lineKey]) {
      linePointers[lineKey] = new Date(baseScheduleStart);
    }

    const startTime = new Date(linePointers[lineKey]);
    const finishTime = new Date(startTime.getTime() + durationHours * 3600 * 1000);

    // Update line pointer for next job in line
    linePointers[lineKey] = new Date(finishTime);

    // Match assigned line name
    let assignedLineName = item.testingLineId
      ? lines.find((l) => l.id === item.testingLineId)?.name || 'Default'
      : `${item.compGroup} Line`;

    return {
      ...item,
      estimatedDurationHours: durationHours,
      estimatedStartTime: formatScheduleTime(startTime),
      estimatedFinishTime: formatScheduleTime(finishTime),
      assignedLineName,
    };
  });
}

function formatScheduleTime(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHours = hours % 12 || 12;
  const timeStr = `${formattedHours}:${minutes} ${ampm}`;

  if (isToday) {
    return timeStr;
  } else {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return `${dayNames[date.getDay()]} ${timeStr}`;
  }
}
