import React, { useState, useEffect } from 'react';
import { DashboardStats, ProductModel, CompGroup, FilterParams, CombinedJORecords } from '../types';
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Users,
  AlertTriangle,
  Award,
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { formatDuration } from '../utils/formatters';
import { apiClient } from '../api/client';

// ============================================================================
// SHARED METRIC FUNCTIONS (Strictly aligned with actual Firestore database state)
// ============================================================================

export const getPerformancePeriods = (records: CombinedJORecords[]): string[] => {
  if (!records || records.length === 0) {
    const keys: string[] = [];
    const now = new Date('2026-08-23T02:15:18-07:00');
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      keys.push(`${y}-${m}`);
    }
    return keys;
  }

  const monthSet = new Set<string>();
  records.forEach((r) => {
    const dateStr = r.latestRecordDate;
    if (dateStr && dateStr.length >= 7) {
      monthSet.add(dateStr.substring(0, 7));
    }
  });

  const sortedMonths = Array.from(monthSet).sort();
  if (sortedMonths.length > 0) {
    return sortedMonths.slice(-4);
  }

  const keys: string[] = [];
  const now = new Date('2026-08-23T02:15:18-07:00');
  for (let i = 3; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    keys.push(`${y}-${m}`);
  }
  return keys;
};

export const calculateMonthlyGroupTestingCount = (
  records: CombinedJORecords[],
  group: CompGroup,
  monthKey: string
): number => {
  return records.filter(
    (jo) => jo.compGroup === group && jo.latestRecordDate?.startsWith(monthKey)
  ).length;
};

export const calculateMonthlyGoodCount = (
  records: CombinedJORecords[],
  group: CompGroup,
  monthKey: string
): number => {
  return records.filter(
    (jo) =>
      jo.compGroup === group &&
      jo.latestRecordDate?.startsWith(monthKey) &&
      jo.currentOverallStatus === 'GOOD' &&
      !jo.everHadNG
  ).length;
};

export const calculateMonthlyNgRetestCount = (
  records: CombinedJORecords[],
  group: CompGroup,
  monthKey: string
): number => {
  return records.filter(
    (jo) =>
      jo.compGroup === group &&
      jo.latestRecordDate?.startsWith(monthKey) &&
      (jo.currentOverallStatus === 'NOT GOOD' || jo.everHadNG)
  ).length;
};

export const calculateMonthlyAverageLeadTime = (
  records: CombinedJORecords[],
  group: CompGroup,
  monthKey: string
): number => {
  const groupRecords = records.filter(
    (jo) => jo.compGroup === group && jo.latestRecordDate?.startsWith(monthKey)
  );

  let totalMin = 0;
  let count = 0;

  groupRecords.forEach((jo) => {
    if (group === 'Engine') {
      jo.dynoRecords.forEach((d) => {
        if (d.dynoLeadTimeMinutes && d.dynoLeadTimeMinutes > 0) {
          totalMin += d.dynoLeadTimeMinutes;
          count++;
        }
      });
    } else {
      jo.hydraulicRecords.forEach((h) => {
        if (h.hydraulicLeadTimeMinutes && h.hydraulicLeadTimeMinutes > 0) {
          totalMin += h.hydraulicLeadTimeMinutes;
          count++;
        }
      });
    }
  });

  if (count === 0) return 0;
  const avgHours = totalMin / count / 60;
  return parseFloat(avgHours.toFixed(2));
};

const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const monthIndex = parseInt(month, 10) - 1;
  return `${months[monthIndex]} ${year}`;
};

// ============================================================================
// CUSTOM VALUE CALLOUT BUBBLES
// ============================================================================

const CustomLineLabel = (props: any) => {
  const { x, y, value } = props;
  if (value === undefined || value === null) return null;

  return (
    <g>
      <rect
        x={x - 18}
        y={y - 22}
        width={36}
        height={15}
        rx={7}
        fill="#0f172a"
        stroke="#3b82f6"
        strokeWidth={1.2}
      />
      <text
        x={x}
        y={y - 12}
        fill="#3b82f6"
        fontSize={8}
        fontWeight="bold"
        textAnchor="middle"
      >
        {Number(value).toFixed(1)}
      </text>
    </g>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface DashboardPageProps {
  stats: DashboardStats;
  productModels: ProductModel[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats: initialStats,
  productModels,
}) => {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [historyRecords, setHistoryRecords] = useState<CombinedJORecords[]>([]);
  const [selectedCompGroup, setSelectedCompGroup] = useState<CompGroup | 'All'>('All');
  const [dateRange, setDateRange] = useState<'all' | '30days' | '90days'>('all');
  const [selectedMechanic, setSelectedMechanic] = useState<string>('All');
  const [selectedStage, setSelectedStage] = useState<'All' | 'GLT' | 'Dynotest' | 'Hydraulic Test'>('All');
  
  const [isLoading, setIsLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  const mechanicList = Array.from(
    new Set(stats.mechanicNGStats.map((m) => m.mechanicName).filter(Boolean))
  );

  const fetchFilteredStats = async () => {
    setIsLoading(true);
    const filterParams: FilterParams = {};
    if (selectedCompGroup !== 'All') {
      filterParams.compGroup = selectedCompGroup;
    }
    if (selectedMechanic !== 'All') {
      filterParams.assemblyMechanic = selectedMechanic;
    }
    if (selectedStage !== 'All') {
      filterParams.testProcess = selectedStage as any;
    }

    if (dateRange === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      filterParams.startDate = d.toISOString();
    } else if (dateRange === '90days') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      filterParams.startDate = d.toISOString();
    }

    try {
      const [resStats, resHistory] = await Promise.all([
        apiClient.getDashboardStats(filterParams),
        apiClient.getCombinedJOHistory(filterParams),
      ]);
      setStats(resStats);
      setHistoryRecords(resHistory);
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFilteredStats();
  }, [selectedCompGroup, dateRange, selectedMechanic, selectedStage]);

  // Generate Gemini-powered operational summary
  const generateAiSummary = async () => {
    setIsAiLoading(true);
    try {
      // Build structured, clean payload for AI
      const periods = getPerformancePeriods(historyRecords);
      const groups: CompGroup[] = ['Engine', 'PT-PPM', 'Cylinder'];
      
      const structuredPayload = {
        meta: {
          totalJOTested: stats.totalJOTested,
          totalGood: stats.totalGood,
          totalNotGood: stats.totalNotGood,
          overallNgRatePercent: stats.ngRatioPercent,
          evaluationTime: new Date().toISOString(),
        },
        monthlyMetricsByGroup: groups.reduce((acc, g) => {
          acc[g] = periods.map((p) => ({
            month: p,
            totalTested: calculateMonthlyGroupTestingCount(historyRecords, g, p),
            goodCount: calculateMonthlyGoodCount(historyRecords, g, p),
            ngRetestCount: calculateMonthlyNgRetestCount(historyRecords, g, p),
            avgLeadTimeHours: calculateMonthlyAverageLeadTime(historyRecords, g, p),
          }));
          return acc;
        }, {} as Record<string, any>),
      };

      const response = await fetch('/api/performance-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(structuredPayload),
      });
      const data = await response.json();
      setAiSummary(data.summary || data.fallback || 'Could not generate AI Performance Summary.');
    } catch (err: any) {
      console.error('Gemini API performance summary error:', err);
      setAiSummary('AI Performance Analysis is currently offline. Please configure your API key in workspace settings.');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Helper to construct Recharts compatible data for a specific group
  const buildGroupChartData = (group: CompGroup) => {
    const periods = getPerformancePeriods(historyRecords);
    return periods.map((p) => {
      const goodCount = calculateMonthlyGoodCount(historyRecords, group, p);
      const ngRetestCount = calculateMonthlyNgRetestCount(historyRecords, group, p);
      const avgLeadTimeHours = calculateMonthlyAverageLeadTime(historyRecords, group, p);
      return {
        monthKey: p,
        monthLabel: getMonthLabel(p),
        goodCount,
        ngRetestCount,
        avgLeadTimeHours,
      };
    });
  };

  const renderFormattedSummary = (text: string) => {
    if (!text) return null;
    const sections = text.split(/(?=###\s+)/);
    return (
      <div className="space-y-4 text-xs font-medium text-slate-300 leading-relaxed">
        {sections.map((sec, idx) => {
          const lines = sec.trim().split('\n');
          const headerLine = lines[0];
          const contentLines = lines.slice(1);

          if (headerLine.startsWith('###')) {
            const title = headerLine.replace('###', '').trim();
            return (
              <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-2">
                <h4 className="text-xs font-black text-purple-400 tracking-wider uppercase border-b border-purple-900/30 pb-1.5 flex items-center space-x-1.5">
                  <span>{title}</span>
                </h4>
                <div className="text-slate-300 space-y-1 text-xs font-semibold">
                  {contentLines.map((l, lIdx) => {
                    const trimmed = l.trim();
                    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                      return (
                        <li key={lIdx} className="list-disc list-inside ml-2 py-0.5 text-slate-300">
                          {trimmed.substring(1).trim()}
                        </li>
                      );
                    }
                    return <p key={lIdx} className="py-0.5">{trimmed}</p>;
                  })}
                </div>
              </div>
            );
          }

          return (
            <div key={idx} className="bg-slate-950 border border-slate-800/80 rounded-xl p-4">
              {lines.map((l, lIdx) => <p key={lIdx} className="py-0.5">{l}</p>)}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-28 space-y-6">
      {/* Page Title & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 id="page-title-performance" className="text-base sm:text-lg font-black text-slate-100 tracking-tight uppercase">
              PERFORMANCE
            </h2>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">
              Production test bench Quality, Lead Times, and Supervisor Analytics
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Comp Group
            </label>
            <select
              value={selectedCompGroup}
              onChange={(e) => setSelectedCompGroup(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none focus:border-purple-500 w-full"
            >
              <option value="All">All Groups</option>
              <option value="Engine">Engine</option>
              <option value="PT-PPM">PT-PPM</option>
              <option value="Cylinder">Cylinder</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Time Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none focus:border-purple-500 w-full"
            >
              <option value="all">All Time</option>
              <option value="30days">Last 30 Days</option>
              <option value="90days">Last 90 Days</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Test Stage
            </label>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none focus:border-purple-500 w-full"
            >
              <option value="All">All Stages</option>
              <option value="GLT">GLT Only</option>
              <option value="Dynotest">Dynotest</option>
              <option value="Hydraulic Test">Hydraulic Test</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Mechanic
            </label>
            <select
              value={selectedMechanic}
              onChange={(e) => setSelectedMechanic(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-white rounded-xl px-2.5 py-1.5 font-semibold focus:outline-none focus:border-purple-500 w-full"
            >
              <option value="All">All Mechanics</option>
              {mechanicList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards (Top pane exactly preserved) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <span>Total JO Tested</span>
          </div>
          <div className="text-2xl font-black text-white">
            {stats.totalJOTested}
          </div>
          <div className="text-[10px] text-slate-400 flex items-center space-x-2">
            <span className="text-emerald-400 font-bold">{stats.totalGood} GOOD</span>
            <span>•</span>
            <span className="text-rose-400 font-bold">{stats.totalNotGood} NOT GOOD</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>1st Attempt NG Rate</span>
          </div>
          <div className="text-2xl font-black text-rose-400">
            {stats.ngRatioPercent}%
          </div>
          <p className="text-[10px] text-slate-500 font-semibold">Defect rate on initial testing pass</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Avg GLT Lead Time</span>
          </div>
          <div className="text-base font-bold text-amber-300 truncate">
            {formatDuration(stats.avgGltLeadTimeMinutes)}
          </div>
          <p className="text-[10px] text-slate-500 font-semibold">Incoming ➔ Bench Receive</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Avg Bench Lead Time</span>
          </div>
          <div className="text-base font-bold text-emerald-300 truncate">
            {selectedCompGroup === 'Engine'
              ? formatDuration(stats.avgDynoLeadTimeMinutes)
              : formatDuration(stats.avgHydraulicLeadTimeMinutes)}
          </div>
          <p className="text-[10px] text-slate-500 font-semibold">Bench Receive ➔ Quality Signoff</p>
        </div>
      </div>

      {/* 3 Separate Combo Monthly Trend Charts */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-2 gap-1">
          <div>
            <h3 className="text-xs font-extrabold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-400 shrink-0" />
              <span>TESTING BENCH MONTHLY PERFORMANCE</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">
              Longitudinal tracking of finished volumes (GOOD vs NG) and average cycle times
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {(['Engine', 'PT-PPM', 'Cylinder'] as CompGroup[]).map((group) => {
            const chartData = buildGroupChartData(group);
            const totalGroupTests = chartData.reduce((acc, curr) => acc + curr.goodCount + curr.ngRetestCount, 0);

            return (
              <div
                key={group}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col space-y-3 shadow-md min-w-0"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-100 uppercase tracking-wider">
                    {group.toUpperCase()} PERFORMANCE
                  </h4>
                  <span className="text-[10px] text-slate-400 font-bold bg-slate-950 px-2 py-0.5 rounded-md border border-slate-800">
                    {group === 'Engine' ? 'Dyno Bench' : 'Hydraulic Bench'}
                  </span>
                </div>

                <div className="h-56 w-full min-w-0 relative">
                  {totalGroupTests > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={chartData}
                        margin={{ top: 25, right: 10, left: -25, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="monthLabel" stroke="#64748b" fontSize={9} tickLine={false} />
                        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} allowDecimals={false} />
                        <YAxis yAxisId="right" orientation="right" stroke="#60a5fa" fontSize={9} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            borderColor: '#334155',
                            borderRadius: '12px',
                            fontSize: '11px',
                          }}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="goodCount"
                          stackId="res"
                          name="GOOD"
                          fill="#10b981"
                          barSize={18}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="ngRetestCount"
                          stackId="res"
                          name="NG / RETEST"
                          fill="#f43f5e"
                          barSize={18}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="avgLeadTimeHours"
                          name="Avg Lead Time (h)"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 3, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 1 }}
                          label={<CustomLineLabel />}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center px-4 bg-slate-950/40 rounded-xl border border-slate-800/60">
                      <p className="text-[11px] text-slate-500 font-medium italic">
                        No completed testing data available for this period.
                      </p>
                    </div>
                  )}
                </div>

                {/* Custom Chart Legend */}
                <div className="flex items-center justify-center space-x-3 text-[9px] font-black text-slate-400 bg-slate-950/60 py-1.5 rounded-lg border border-slate-800">
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-emerald-500 rounded-sm" />
                    <span>GOOD</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-rose-500 rounded-sm" />
                    <span>NG/RETEST</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="w-2.5 h-0.5 bg-blue-500" />
                    <span>AVG LEAD TIME (HRS)</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Performance Summary Component (Positioned perfectly below charts) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-xs font-black text-slate-200 uppercase tracking-wider">
              AI Performance Summary (Gemini Powered)
            </h3>
          </div>
          <button
            onClick={generateAiSummary}
            disabled={isAiLoading}
            className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
          >
            {isAiLoading ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                <span>Generating Summary...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiSummary ? 'Refresh AI Summary' : 'Generate AI Summary'}</span>
              </>
            )}
          </button>
        </div>

        {aiSummary ? (
          renderFormattedSummary(aiSummary)
        ) : (
          <div className="text-center py-6 bg-slate-950/40 rounded-xl border border-slate-800/60 flex flex-col items-center justify-center space-y-2">
            <Sparkles className="w-7 h-7 text-slate-600" />
            <p className="text-[11px] text-slate-400 font-bold">
              Click the button above to run Gemini operations analysis over active metrics.
            </p>
          </div>
        )}
      </div>

      {/* Assembly Mechanic Quality Ranking Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-1">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <Award className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Assembly Mechanic Quality Performance (PPC & QC Evaluation)</span>
          </h3>
          <span className="text-[11px] text-slate-400 font-semibold">
            Ranked by defect frequency on initial bench test
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[550px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Mechanic Name</th>
                <th className="py-2.5 px-3">Total Assembled</th>
                <th className="py-2.5 px-3">NG Count</th>
                <th className="py-2.5 px-3">NG Ratio (%)</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-semibold text-slate-200">
              {stats.mechanicNGStats.map((m) => {
                const isHighNG = m.ngRatio > 20;
                return (
                  <tr key={m.mechanicName} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-slate-100 flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>{m.mechanicName}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      {m.totalUnits} units
                    </td>
                    <td className="py-2.5 px-3 font-bold text-rose-400">
                      {m.ngCount} defects
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-md ${
                          isHighNG
                            ? 'bg-rose-950/80 text-rose-300'
                            : 'bg-emerald-950/80 text-emerald-300'
                        }`}
                      >
                        {m.ngRatio}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-bold">
                      {m.ngCount === 0 ? (
                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Zero Defects</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-semibold flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Requires Quality Review</span>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
