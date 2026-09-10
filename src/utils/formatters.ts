export function formatDuration(minutes?: number): string {
  if (minutes === undefined || minutes === null || isNaN(minutes) || minutes < 0) {
    return '0 mins';
  }

  const mins = Math.round(minutes);
  if (mins === 0) return '0 mins';

  const days = Math.floor(mins / (24 * 60));
  const remainingMinsAfterDays = mins % (24 * 60);
  const hours = Math.floor(remainingMinsAfterDays / 60);
  const remainingMins = remainingMinsAfterDays % 60;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(`${days} day${days > 1 ? 's' : ''}`);
  }
  if (hours > 0) {
    parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  }
  if (remainingMins > 0 || parts.length === 0) {
    parts.push(`${remainingMins} minute${remainingMins > 1 ? 's' : ''}`);
  }

  return parts.join(' ');
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function calculateMinutesBetween(startIso: string, endIso: string): number {
  if (!startIso || !endIso) return 0;
  let start = new Date(startIso);
  let end = new Date(endIso);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

  // Working shift hours: 07:30 to 16:30 (9 hours per working day)
  const shiftStartHour = 7;
  const shiftStartMin = 30;
  const shiftEndHour = 16;
  const shiftEndMin = 30;

  // Set of Holidays in YYYY-MM-DD format (covering 2026/2027)
  const HOLIDAYS = new Set([
    '2026-01-01', // New Year's Day
    '2026-05-01', // Labor Day
    '2026-08-17', // Independence Day
    '2026-12-25', // Christmas
    '2027-01-01',
    '2027-05-01',
    '2027-08-17',
    '2027-12-25',
  ]);

  const isWorkingDay = (date: Date): boolean => {
    const day = date.getDay();
    if (day === 0 || day === 6) return false; // Sunday or Saturday
    const yyyymmdd = date.toISOString().slice(0, 10);
    if (HOLIDAYS.has(yyyymmdd)) return false;
    return true;
  };

  let totalMinutes = 0;
  let current = new Date(start.getTime());
  
  if (current >= end) return 0;

  // Same day check
  const isSameDay = current.toDateString() === end.toDateString();
  if (isSameDay) {
    if (!isWorkingDay(current)) return 0;
    const workStart = new Date(current.getTime());
    workStart.setHours(shiftStartHour, shiftStartMin, 0, 0);
    
    const workEnd = new Date(current.getTime());
    workEnd.setHours(shiftEndHour, shiftEndMin, 0, 0);

    const overlapStart = new Date(Math.max(current.getTime(), workStart.getTime()));
    const overlapEnd = new Date(Math.min(end.getTime(), workEnd.getTime()));

    if (overlapStart < overlapEnd) {
      totalMinutes = Math.round((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
    }
    return totalMinutes;
  }

  // Different days:
  // 1. First Day Overlap
  if (isWorkingDay(current)) {
    const workStart = new Date(current.getTime());
    workStart.setHours(shiftStartHour, shiftStartMin, 0, 0);
    const workEnd = new Date(current.getTime());
    workEnd.setHours(shiftEndHour, shiftEndMin, 0, 0);

    const overlapStart = new Date(Math.max(current.getTime(), workStart.getTime()));
    if (overlapStart < workEnd) {
      totalMinutes += Math.round((workEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
    }
  }

  // 2. Full days in-between: add 540 minutes (9 hours) per working day
  current.setDate(current.getDate() + 1);
  current.setHours(0, 0, 0, 0);
  
  const endDay = new Date(end.getTime());
  endDay.setHours(0, 0, 0, 0);

  while (current < endDay) {
    if (isWorkingDay(current)) {
      totalMinutes += 540;
    }
    current.setDate(current.getDate() + 1);
  }

  // 3. Last Day Overlap
  if (isWorkingDay(end)) {
    const workStart = new Date(end.getTime());
    workStart.setHours(shiftStartHour, shiftStartMin, 0, 0);
    const workEnd = new Date(end.getTime());
    workEnd.setHours(shiftEndHour, shiftEndMin, 0, 0);

    const overlapEnd = new Date(Math.min(end.getTime(), workEnd.getTime()));
    if (workStart < overlapEnd) {
      totalMinutes += Math.round((overlapEnd.getTime() - workStart.getTime()) / (1000 * 60));
    }
  }

  return totalMinutes;
}
