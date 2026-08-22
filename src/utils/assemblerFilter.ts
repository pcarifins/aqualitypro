import { Assembler, CompGroup } from '../types';

export function filterAssemblersByCompGroup(
  assemblers: Assembler[],
  compGroup?: CompGroup | string
): Assembler[] {
  const activeList = assemblers.filter((a) => a.active !== false);
  if (!compGroup) return activeList;

  const targetGroup = compGroup.trim();

  return activeList.filter((a) => {
    // 1. Direct array assignment match
    if (a.assignedCompGroups && Array.isArray(a.assignedCompGroups) && a.assignedCompGroups.length > 0) {
      return a.assignedCompGroups.includes(targetGroup as CompGroup);
    }

    // 2. Section and JobGroup fallback heuristics
    const section = (a.section || '').toUpperCase();
    const jobGroup = (a.jobGroup || '').toUpperCase();

    if (targetGroup === 'Engine') {
      return section.includes('ENG') || jobGroup.includes('ENG');
    }

    if (targetGroup === 'PT-PPM') {
      return (
        section.includes('PT') ||
        section.includes('PPM') ||
        jobGroup.includes('PT') ||
        jobGroup.includes('PPM')
      );
    }

    if (targetGroup === 'Cylinder') {
      return (
        section.includes('CYL') ||
        section.includes('PT') ||
        jobGroup.includes('CYL') ||
        jobGroup.includes('PT')
      );
    }

    return true;
  });
}
