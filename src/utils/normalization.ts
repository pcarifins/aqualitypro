export function normalizeString(val: string | undefined | null): string {
  if (!val) return '';
  return val
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .replace(/\bNO\b\.?/g, 'NO')
    .replace(/\./g, '')
    .replace(/-+/g, '-');
}
