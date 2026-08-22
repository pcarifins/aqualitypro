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
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (isNaN(start) || isNaN(end) || end < start) return 0;
  return Math.round((end - start) / (1000 * 60));
}
