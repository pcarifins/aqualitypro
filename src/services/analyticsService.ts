import {
  CombinedJORecords,
  FilterParams,
  DashboardStats,
  CompGroup,
  TestResult,
  GLTRecord,
  DynotestRecord,
  HydraulicRecord,
} from '../types';

export interface ComprehensiveAnalyticsResult {
  stats: DashboardStats;
  totalTests: number;
  totalGood: number;
  totalNotGood: number;
  passRatePercent: number;
  engineTestsCount: number;
  ptPpmTestsCount: number;
  cylinderTestsCount: number;
  retestCount: number;
  avgGltLeadTimeMinutes: number;
  avgTestingLeadTimeMinutes: number;
  filteredJOs: CombinedJORecords[];
}

export function computeUnifiedAnalytics(
  records: CombinedJORecords[],
  filters?: FilterParams & {
    component?: string;
    unitModel?: string;
    testType?: 'PROD' | 'RETEST' | 'All';
    operator?: string;
    subGroup?: string;
  }
): ComprehensiveAnalyticsResult {
  // Apply all filter constraints consistently
  const filtered = records.filter((jo) => {
    // 1. JO Number search
    if (filters?.joNumber && filters.joNumber.trim()) {
      const q = filters.joNumber.trim().toUpperCase();
      if (!jo.joNumber.toUpperCase().includes(q)) return false;
    }

    // 2. Comp Group
    if (filters?.compGroup && filters.compGroup !== 'All') {
      if (jo.compGroup !== filters.compGroup) return false;
    }

    // 3. Product Category (legacy compatibility)
    if (filters?.productCategory && filters.productCategory !== 'All') {
      if (jo.productCategory !== filters.productCategory) return false;
    }

    // 4. Unit Model
    if (filters?.unitModel && filters.unitModel !== 'All') {
      if (jo.unitModel !== filters.unitModel) return false;
    }

    // 5. Component
    if (filters?.component && filters.component !== 'All') {
      if (jo.component !== filters.component) return false;
    }

    // 6. Assembly Mechanic
    if (filters?.assemblyMechanic && filters.assemblyMechanic !== 'All') {
      if (jo.assemblyMechanic !== filters.assemblyMechanic) return false;
    }

    // 7. Result Filter
    if (filters?.resultFilter && filters.resultFilter !== 'All') {
      if (filters.resultFilter === 'GOOD' && jo.currentOverallStatus !== 'GOOD') return false;
      if (filters.resultFilter === 'NOT GOOD' && jo.currentOverallStatus !== 'NOT GOOD') return false;
      if (filters.resultFilter === 'Ever NOT GOOD' && !jo.everHadNG) return false;
    }

    // 8. Date filters
    const dateStr = jo.latestRecordDate || '';
    if (filters?.dateFrom && dateStr < filters.dateFrom) return false;
    if (filters?.dateTo && dateStr > filters.dateTo) return false;
    if (filters?.month && filters.month !== 'All') {
      if (!dateStr.startsWith(filters.month)) return false;
    }

    // 9. Operator Filter
    if (filters?.operator && filters.operator !== 'All') {
      const opUpper = filters.operator.toUpperCase();
      const hasGltOp = jo.gltRecords.some((r) => (r.operatorName || '').toUpperCase() === opUpper);
      const hasDynoOp = jo.dynoRecords.some((r) => (r.operatorName || '').toUpperCase() === opUpper);
      const hasHydOp = jo.hydraulicRecords.some((r) => (r.operatorName || '').toUpperCase() === opUpper);
      if (!hasGltOp && !hasDynoOp && !hasHydOp) return false;
    }

    // 10. Process filter
    if (filters?.process && filters.process !== 'All') {
      if (filters.process === 'GLT' && jo.gltRecords.length === 0) return false;
      if (filters.process === 'Dynotest' && jo.dynoRecords.length === 0) return false;
      if (
        (filters.process === 'Hydraulic Test' || filters.process === 'Testbench') &&
        jo.hydraulicRecords.length === 0
      )
        return false;
    }

    return true;
  });

  // Calculate Metrics from filtered records
  let totalGood = 0;
  let totalNotGood = 0;
  let everNGCount = 0;
  let engineTestsCount = 0;
  let ptPpmTestsCount = 0;
  let cylinderTestsCount = 0;
  let retestCount = 0;

  let totalGltLeadTime = 0;
  let gltLeadTimeCount = 0;

  let totalDynoLeadTime = 0;
  let dynoLeadTimeCount = 0;

  let totalHydraulicLeadTime = 0;
  let hydraulicLeadTimeCount = 0;

  const mechanicMap: { [mechanic: string]: { total: number; ng: number } } = {};
  const monthlyMap: {
    [month: string]: {
      total: number;
      ngCount: number;
      gltMinutes: number;
      gltCount: number;
      dynoMinutes: number;
      dynoCount: number;
      hydMinutes: number;
      hydCount: number;
    };
  } = {};

  filtered.forEach((jo) => {
    // Overall status
    if (jo.currentOverallStatus === 'GOOD') totalGood++;
    else totalNotGood++;

    if (jo.everHadNG) everNGCount++;

    // Component group breakdown
    if (jo.compGroup === 'Engine' || jo.productCategory === 'Engine') {
      engineTestsCount++;
    } else if (jo.compGroup === 'Cylinder' || jo.productCategory === 'Cylinder') {
      cylinderTestsCount++;
    } else {
      ptPpmTestsCount++;
    }

    // Retest count (if attemptNumber > 1 on any test)
    const hasRetest =
      jo.gltRecords.some((r) => r.attemptNumber > 1) ||
      jo.dynoRecords.some((r) => r.attemptNumber > 1) ||
      jo.hydraulicRecords.some((r) => r.attemptNumber > 1);
    if (hasRetest) retestCount++;

    // Mechanic stats
    const mech = jo.assemblyMechanic || 'Unknown';
    if (!mechanicMap[mech]) mechanicMap[mech] = { total: 0, ng: 0 };
    mechanicMap[mech].total++;
    if (jo.everHadNG) mechanicMap[mech].ng++;

    // Lead times and Monthly aggregations
    const mKey = jo.latestRecordDate ? jo.latestRecordDate.substring(0, 7) : 'Unknown';
    if (!monthlyMap[mKey]) {
      monthlyMap[mKey] = {
        total: 0,
        ngCount: 0,
        gltMinutes: 0,
        gltCount: 0,
        dynoMinutes: 0,
        dynoCount: 0,
        hydMinutes: 0,
        hydCount: 0,
      };
    }
    monthlyMap[mKey].total++;
    if (jo.everHadNG) monthlyMap[mKey].ngCount++;

    // GLT Lead times
    jo.gltRecords.forEach((g) => {
      // In GLT form, lead time can be submission - incoming
      if (g.incomingTime && g.submissionTime) {
        const diffMin = Math.max(
          0,
          (new Date(g.submissionTime).getTime() - new Date(g.incomingTime).getTime()) / 60000
        );
        if (diffMin > 0 && diffMin < 10000) {
          totalGltLeadTime += diffMin;
          gltLeadTimeCount++;
          monthlyMap[mKey].gltMinutes += diffMin;
          monthlyMap[mKey].gltCount++;
        }
      }
    });

    // Dyno Lead times
    jo.dynoRecords.forEach((d) => {
      if (d.dynoLeadTimeMinutes && d.dynoLeadTimeMinutes > 0) {
        totalDynoLeadTime += d.dynoLeadTimeMinutes;
        dynoLeadTimeCount++;
        monthlyMap[mKey].dynoMinutes += d.dynoLeadTimeMinutes;
        monthlyMap[mKey].dynoCount++;
      }
    });

    // Hydraulic Lead times
    jo.hydraulicRecords.forEach((h) => {
      if (h.hydraulicLeadTimeMinutes && h.hydraulicLeadTimeMinutes > 0) {
        totalHydraulicLeadTime += h.hydraulicLeadTimeMinutes;
        hydraulicLeadTimeCount++;
        monthlyMap[mKey].hydMinutes += h.hydraulicLeadTimeMinutes;
        monthlyMap[mKey].hydCount++;
      }
    });
  });

  const totalTests = filtered.length;
  const passRatePercent = totalTests > 0 ? (totalGood / totalTests) * 100 : 0;
  const ngRatioPercent = totalTests > 0 ? (everNGCount / totalTests) * 100 : 0;

  const avgGltLeadTimeMinutes = gltLeadTimeCount > 0 ? Math.round(totalGltLeadTime / gltLeadTimeCount) : 0;
  const avgDynoLeadTimeMinutes = dynoLeadTimeCount > 0 ? Math.round(totalDynoLeadTime / dynoLeadTimeCount) : 0;
  const avgHydraulicLeadTimeMinutes =
    hydraulicLeadTimeCount > 0 ? Math.round(totalHydraulicLeadTime / hydraulicLeadTimeCount) : 0;

  const avgTestingLeadTimeMinutes =
    dynoLeadTimeCount + hydraulicLeadTimeCount > 0
      ? Math.round((totalDynoLeadTime + totalHydraulicLeadTime) / (dynoLeadTimeCount + hydraulicLeadTimeCount))
      : 0;

  // Monthly trends array sorted by month
  const monthlyTrends = Object.keys(monthlyMap)
    .sort()
    .map((month) => {
      const item = monthlyMap[month];
      return {
        month,
        gltLeadTimeHours: item.gltCount > 0 ? parseFloat((item.gltMinutes / item.gltCount / 60).toFixed(1)) : 0,
        dynoLeadTimeHours: item.dynoCount > 0 ? parseFloat((item.dynoMinutes / item.dynoCount / 60).toFixed(1)) : 0,
        hydraulicLeadTimeHours:
          item.hydCount > 0 ? parseFloat((item.hydMinutes / item.hydCount / 60).toFixed(1)) : 0,
        ngRatioPercent: item.total > 0 ? parseFloat(((item.ngCount / item.total) * 100).toFixed(1)) : 0,
      };
    });

  // Mechanic stats array sorted by total units desc
  const mechanicNGStats = Object.keys(mechanicMap)
    .map((mech) => {
      const info = mechanicMap[mech];
      return {
        mechanicName: mech,
        totalUnits: info.total,
        ngCount: info.ng,
        ngRatio: info.total > 0 ? parseFloat(((info.ng / info.total) * 100).toFixed(1)) : 0,
      };
    })
    .sort((a, b) => b.totalUnits - a.totalUnits);

  const stats: DashboardStats = {
    totalJOTested: totalTests,
    totalGood,
    totalNotGood,
    ngRatioPercent,
    avgGltLeadTimeMinutes,
    avgDynoLeadTimeMinutes,
    avgHydraulicLeadTimeMinutes,
    monthlyTrends,
    mechanicNGStats,
  };

  return {
    stats,
    totalTests,
    totalGood,
    totalNotGood,
    passRatePercent: parseFloat(passRatePercent.toFixed(1)),
    engineTestsCount,
    ptPpmTestsCount,
    cylinderTestsCount,
    retestCount,
    avgGltLeadTimeMinutes,
    avgTestingLeadTimeMinutes,
    filteredJOs: filtered,
  };
}
