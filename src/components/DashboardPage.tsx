import React, { useState, useEffect } from 'react';
import { DashboardStats, ProductModel, ProductCategory, CompGroup, FilterParams } from '../types';
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
  Layers,
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
  Legend,
} from 'recharts';
import { formatDuration } from '../utils/formatters';
import { apiClient } from '../api/client';

interface DashboardPageProps {
  stats: DashboardStats;
  productModels: ProductModel[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  stats: initialStats,
  productModels,
}) => {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [selectedCompGroup, setSelectedCompGroup] = useState<CompGroup | 'All'>('All');
  const [dateRange, setDateRange] = useState<'all' | '30days' | '90days'>('all');
  const [selectedMechanic, setSelectedMechanic] = useState<string>('All');
  const [selectedStage, setSelectedStage] = useState<'All' | 'GLT' | 'Dynotest' | 'Hydraulic Test'>('All');
  const [isLoading, setIsLoading] = useState(false);

  // List unique mechanics
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

    const res = await apiClient.getDashboardStats(filterParams);
    setStats(res);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFilteredStats();
  }, [selectedCompGroup, dateRange, selectedMechanic, selectedStage]);

  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 pb-28 space-y-6">
      {/* Page Title & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-purple-600/30 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-slate-100 tracking-tight">
              Quality & Lead Time Analytics Dashboard
            </h2>
            <p className="text-xs text-slate-400">
              Cross-station KPI metrics for Engine, Power Train (PT-PPM), and Cylinder
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

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <p className="text-[10px] text-slate-500">Defect rate on initial testing pass</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center space-x-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Avg GLT Lead Time</span>
          </div>
          <div className="text-base font-bold text-amber-300 truncate">
            {formatDuration(stats.avgGltLeadTimeMinutes)}
          </div>
          <p className="text-[10px] text-slate-500">Incoming ➔ Bench Receive</p>
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
          <p className="text-[10px] text-slate-500">Bench Receive ➔ Quality Signoff</p>
        </div>
      </div>

      {/* Monthly Trend Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-1">
          <div>
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-purple-400 shrink-0" />
              <span>Monthly Average Lead Time (Hours) vs NG Ratio (%)</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Longitudinal tracking of test bench cycle duration and first-pass defect rates
            </p>
          </div>
        </div>

        <div className="h-64 w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={stats.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
              <YAxis
                yAxisId="left"
                orientation="left"
                stroke="#94a3b8"
                fontSize={11}
                unit="h"
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#f43f5e"
                fontSize={11}
                unit="%"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar
                yAxisId="left"
                dataKey="gltLeadTimeHours"
                name="GLT Lead Time (h)"
                fill="#f59e0b"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="dynoLeadTimeHours"
                name="Dynotest Lead Time (h)"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="left"
                dataKey="hydraulicLeadTimeHours"
                name="Hydraulic Lead Time (h)"
                fill="#8b5cf6"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ngRatioPercent"
                name="NG Ratio (%)"
                stroke="#f43f5e"
                strokeWidth={3}
                dot={{ r: 4, fill: '#f43f5e' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Assembly Mechanic Quality Ranking Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-1">
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
            <Award className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Assembly Mechanic Quality Performance (PPC & QC Evaluation)</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Ranked by defect frequency on initial bench test
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[550px]">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                <th className="py-2.5 px-3">Mechanic Name</th>
                <th className="py-2.5 px-3">Total Assembled</th>
                <th className="py-2.5 px-3">NG Count</th>
                <th className="py-2.5 px-3">NG Ratio (%)</th>
                <th className="py-2.5 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {stats.mechanicNGStats.map((m) => {
                const isHighNG = m.ngRatio > 20;
                return (
                  <tr key={m.mechanicName} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-bold text-slate-100 flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>{m.mechanicName}</span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {m.totalUnits} units
                    </td>
                    <td className="py-2.5 px-3 font-bold text-rose-400">
                      {m.ngCount} defects
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-md ${
                          isHighNG
                            ? 'bg-rose-950 text-rose-300'
                            : 'bg-emerald-950 text-emerald-300'
                        }`}
                      >
                        {m.ngRatio}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
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

