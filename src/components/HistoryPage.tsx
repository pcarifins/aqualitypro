import React, { useState, useMemo } from 'react';
import {
  CombinedJORecords,
  ProductCategory,
  ProductModel,
  GLTRecord,
  DynotestRecord,
  HydraulicRecord,
} from '../types';
import {
  Search,
  Filter,
  History as HistoryIcon,
  Download,
  FileSpreadsheet,
  Award,
  Eye,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Calendar as CalendarIcon,
  X,
} from 'lucide-react';
import { formatDate, formatDuration, formatDateTime } from '../utils/formatters';
import { PDFReportModal } from './PDFReportModal';

interface HistoryPageProps {
  historyRecords: CombinedJORecords[];
  productModels: ProductModel[];
  onOpenJODetail: (joNumber: string) => void;
  initialSearchQuery?: string;
  onOpenSheetsModal?: () => void;
}

interface FlattenedHistoryRow {
  id: string;
  testDateIso: string;
  testDateFormatted: string;
  joNumber: string;
  compGroup: string;
  unitModel: string;
  component: string;
  testType: string;
  testingLine: string;
  operator: string;
  startTimeFormatted: string;
  finishTimeFormatted: string;
  actualLeadTimeMinutes: number;
  actualLeadTimeFormatted: string;
  result: 'GOOD' | 'NOT GOOD';
  rawRecord: CombinedJORecords;
  stageRecord?: GLTRecord | DynotestRecord | HydraulicRecord;
}

type SortField =
  | 'testDateIso'
  | 'joNumber'
  | 'compGroup'
  | 'unitModel'
  | 'component'
  | 'testType'
  | 'testingLine'
  | 'operator'
  | 'startTimeFormatted'
  | 'finishTimeFormatted'
  | 'actualLeadTimeMinutes'
  | 'result';

export const HistoryPage: React.FC<HistoryPageProps> = ({
  historyRecords,
  productModels,
  onOpenJODetail,
  initialSearchQuery = '',
  onOpenSheetsModal,
}) => {
  // Search and Date Range Filters
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Dropdown Category & Result Filters
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedResult, setSelectedResult] = useState<string>('All');

  // Column Sorting State (Default sort: newest test first)
  const [sortField, setSortField] = useState<SortField>('testDateIso');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal state for Quality Certificate PDF Report
  const [selectedPdfJO, setSelectedPdfJO] = useState<CombinedJORecords | null>(null);

  // Helper to resolve testing line display name
  const getLineDisplayName = (lineId?: string, defaultName = 'Station'): string => {
    if (!lineId) return defaultName;
    const lower = lineId.toLowerCase();
    if (lower === 'glt-engine') return 'GLT Engine';
    if (lower === 'glt-pt-ppm') return 'GLT PT-PPM';
    if (lower === 'glt-pt-cyl') return 'GLT PT-CYL';
    if (lower === 'dyno-1') return 'Dyno 1';
    if (lower === 'dyno-2') return 'Dyno 2';
    if (lower === 'dyno-3') return 'Dyno 3';
    if (lower === 'tb-1') return 'TB 1';
    if (lower === 'tb-2') return 'TB 2';
    if (lower === 'tb-3') return 'TB 3';
    if (lower === 'tb-4-cyl') return 'TB 4 CYL';
    if (lower === 'mobile-tb') return 'MTB';
    return lineId;
  };

  // Flatten CombinedJORecords into individual test attempts / execution rows
  const allFlattenedRows = useMemo(() => {
    const rows: FlattenedHistoryRow[] = [];

    historyRecords.forEach((jo) => {
      let hasAttempts = false;

      // GLT attempts
      if (jo.gltRecords && jo.gltRecords.length > 0) {
        jo.gltRecords.forEach((g) => {
          hasAttempts = true;
          const dateIso = g.submissionTime || g.incomingTime || g.testDate || jo.latestRecordDate || '';
          const lineName = g.productCategory === 'Engine'
            ? 'GLT Engine'
            : g.productCategory === 'Cylinder'
            ? 'GLT PT-CYL'
            : 'GLT PT-PPM';
          
          const leadTime = g.gltDurationMinutes ||
            (g.incomingTime && g.submissionTime
              ? Math.max(0, Math.round((new Date(g.submissionTime).getTime() - new Date(g.incomingTime).getTime()) / 60000))
              : 0);

          rows.push({
            id: `glt-${g.id || Math.random()}`,
            testDateIso: dateIso,
            testDateFormatted: dateIso ? formatDate(dateIso) : '--',
            joNumber: jo.joNumber,
            compGroup: jo.compGroup || (g.productCategory === 'Engine' ? 'Engine' : g.productCategory === 'Cylinder' ? 'Cylinder' : 'PT-PPM'),
            unitModel: g.unitModel || jo.unitModel || g.productModel || jo.productModel || '--',
            component: g.component || jo.component || jo.productModel || '--',
            testType: g.attemptNumber > 1 ? 'RETEST' : 'PROD',
            testingLine: lineName,
            operator: g.operatorName || g.testerName || jo.assemblyMechanic || '--',
            startTimeFormatted: g.incomingTime ? formatDateTime(g.incomingTime) : '--',
            finishTimeFormatted: g.submissionTime ? formatDateTime(g.submissionTime) : (g.gltCompleteTime ? formatDateTime(g.gltCompleteTime) : '--'),
            actualLeadTimeMinutes: leadTime,
            actualLeadTimeFormatted: leadTime > 0 ? formatDuration(leadTime) : '--',
            result: g.result === 'GOOD' ? 'GOOD' : 'NOT GOOD',
            rawRecord: jo,
            stageRecord: g,
          });
        });
      }

      // Dynotest attempts
      if (jo.dynoRecords && jo.dynoRecords.length > 0) {
        jo.dynoRecords.forEach((d) => {
          hasAttempts = true;
          const dateIso = d.submissionTime || d.receivingTime || jo.latestRecordDate || '';
          const lineName = getLineDisplayName(d.currentTestingLineId || d.testingLineId, 'Dyno 1');
          const leadTime = d.dynoLeadTimeMinutes ||
            (d.receivingTime && d.submissionTime
              ? Math.max(0, Math.round((new Date(d.submissionTime).getTime() - new Date(d.receivingTime).getTime()) / 60000))
              : 0);

          rows.push({
            id: `dyno-${d.id || Math.random()}`,
            testDateIso: dateIso,
            testDateFormatted: dateIso ? formatDate(dateIso) : '--',
            joNumber: jo.joNumber,
            compGroup: 'Engine',
            unitModel: d.unitModel || jo.unitModel || d.productModel || jo.productModel || '--',
            component: d.component || jo.component || jo.productModel || '--',
            testType: d.testType || (d.attemptNumber > 1 ? 'RETEST' : 'PROD'),
            testingLine: lineName,
            operator: d.operatorName || jo.assemblyMechanic || '--',
            startTimeFormatted: d.receivingTime ? formatDateTime(d.receivingTime) : '--',
            finishTimeFormatted: d.submissionTime ? formatDateTime(d.submissionTime) : '--',
            actualLeadTimeMinutes: leadTime,
            actualLeadTimeFormatted: leadTime > 0 ? formatDuration(leadTime) : '--',
            result: d.result === 'GOOD' ? 'GOOD' : 'NOT GOOD',
            rawRecord: jo,
            stageRecord: d,
          });
        });
      }

      // Hydraulic / Testbench attempts
      if (jo.hydraulicRecords && jo.hydraulicRecords.length > 0) {
        jo.hydraulicRecords.forEach((h) => {
          hasAttempts = true;
          const dateIso = h.submissionTime || h.receivingTime || jo.latestRecordDate || '';
          const defaultLineName = (h.compGroup === 'Cylinder' || h.productCategory === 'Cylinder') ? 'TB 4 CYL' : 'TB 1';
          const lineName = getLineDisplayName(h.currentTestingLineId || h.testingLineId, defaultLineName);
          const leadTime = h.hydraulicLeadTimeMinutes ||
            (h.receivingTime && h.submissionTime
              ? Math.max(0, Math.round((new Date(h.submissionTime).getTime() - new Date(h.receivingTime).getTime()) / 60000))
              : 0);

          rows.push({
            id: `hyd-${h.id || Math.random()}`,
            testDateIso: dateIso,
            testDateFormatted: dateIso ? formatDate(dateIso) : '--',
            joNumber: jo.joNumber,
            compGroup: h.compGroup || (h.productCategory === 'Cylinder' ? 'Cylinder' : 'PT-PPM'),
            unitModel: h.unitModel || jo.unitModel || h.productModel || jo.productModel || '--',
            component: h.component || jo.component || jo.productModel || '--',
            testType: h.testType || (h.attemptNumber > 1 ? 'RETEST' : 'PROD'),
            testingLine: lineName,
            operator: h.operatorName || jo.assemblyMechanic || '--',
            startTimeFormatted: h.receivingTime ? formatDateTime(h.receivingTime) : '--',
            finishTimeFormatted: h.submissionTime ? formatDateTime(h.submissionTime) : '--',
            actualLeadTimeMinutes: leadTime,
            actualLeadTimeFormatted: leadTime > 0 ? formatDuration(leadTime) : '--',
            result: h.result === 'GOOD' ? 'GOOD' : 'NOT GOOD',
            rawRecord: jo,
            stageRecord: h,
          });
        });
      }

      // Fallback row if JO record has no sub-attempts
      if (!hasAttempts) {
        const dateIso = jo.latestRecordDate || new Date().toISOString();
        rows.push({
          id: `jo-${jo.joNumber}`,
          testDateIso: dateIso,
          testDateFormatted: dateIso ? formatDate(dateIso) : '--',
          joNumber: jo.joNumber,
          compGroup: jo.compGroup || jo.productCategory || 'Engine',
          unitModel: jo.unitModel || jo.productModel || '--',
          component: jo.component || jo.productModel || '--',
          testType: 'PROD',
          testingLine: jo.compGroup === 'Engine' ? 'Dyno 1' : jo.compGroup === 'Cylinder' ? 'TB 4 CYL' : 'TB 1',
          operator: jo.assemblyMechanic || '--',
          startTimeFormatted: '--',
          finishTimeFormatted: '--',
          actualLeadTimeMinutes: 0,
          actualLeadTimeFormatted: '--',
          result: jo.currentOverallStatus === 'GOOD' ? 'GOOD' : 'NOT GOOD',
          rawRecord: jo,
        });
      }
    });

    return rows;
  }, [historyRecords]);

  // Filtered Rows based on Search, Date Range, Category, Result
  const filteredRows = useMemo(() => {
    return allFlattenedRows.filter((row) => {
      // 1. Search Query (matches JO, Unit Model, Component)
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toUpperCase();
        const joMatch = row.joNumber.toUpperCase().includes(q);
        const modelMatch = row.unitModel.toUpperCase().includes(q);
        const compMatch = row.component.toUpperCase().includes(q);
        if (!joMatch && !modelMatch && !compMatch) {
          return false;
        }
      }

      // 2. Date Filtering (Uses actual testing/completion date)
      if (fromDate || toDate) {
        const rowDateStr = row.testDateIso ? row.testDateIso.split('T')[0] : '';
        if (fromDate && rowDateStr < fromDate) {
          return false;
        }
        if (toDate && rowDateStr > toDate) {
          return false;
        }
      }

      // 3. Category Filter
      if (selectedCategory !== 'All' && row.compGroup !== selectedCategory) {
        return false;
      }

      // 4. Result Filter
      if (selectedResult !== 'All' && row.result !== selectedResult) {
        return false;
      }

      return true;
    });
  }, [allFlattenedRows, searchQuery, fromDate, toDate, selectedCategory, selectedResult]);

  // Sorted Rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'testDateIso') {
        valA = a.testDateIso || '';
        valB = b.testDateIso || '';
      }

      if (typeof valA === 'string') {
        const cmp = valA.localeCompare(valB as string);
        return sortDirection === 'asc' ? cmp : -cmp;
      } else {
        const cmp = (valA || 0) - (valB || 0);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
    });
  }, [filteredRows, sortField, sortDirection]);

  // Column Sort Handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Preset Date Controls
  const setDateFilterToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    setFromDate(todayStr);
    setToDate(todayStr);
  };

  const setDateFilterThisWeek = () => {
    const now = new Date();
    const day = now.getDay();
    const distanceToMon = (day + 6) % 7;
    const monday = new Date(now);
    monday.setDate(now.getDate() - distanceToMon);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    setFromDate(monday.toISOString().split('T')[0]);
    setToDate(sunday.toISOString().split('T')[0]);
  };

  const setDateFilterThisMonth = () => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    setFromDate(firstDay.toISOString().split('T')[0]);
    setToDate(lastDay.toISOString().split('T')[0]);
  };

  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
  };

  // CSV Exports
  const escapeCSV = (field: any): string => {
    if (field === null || field === undefined) return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
  };

  const handleExportCSV = () => {
    const headers = [
      'No.',
      'Test Date',
      'JO Number',
      'Comp Group',
      'Unit Model',
      'Component',
      'Test Type',
      'Testing Line',
      'Operator',
      'Start Time',
      'Finish Time',
      'Lead Time',
      'Result',
    ];

    const rows = sortedRows.map((r, idx) => [
      idx + 1,
      r.testDateFormatted,
      r.joNumber,
      r.compGroup,
      r.unitModel,
      r.component,
      r.testType,
      r.testingLine,
      r.operator,
      r.startTimeFormatted,
      r.finishTimeFormatted,
      r.actualLeadTimeFormatted,
      r.result,
    ]);

    const csvRows = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ];

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Historical_Job_Orders_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 pb-28 space-y-4">
      {/* Page Title & Export Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-black">
            <HistoryIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Historical Job Order & Test Log
            </h2>
            <p className="text-xs text-slate-400">
              Comprehensive log of all completed and past test executions
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-y-2">
          {onOpenSheetsModal && (
            <button
              onClick={onOpenSheetsModal}
              className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/80 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs"
              title="Sync all historical records with Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Google Sheets Sync</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            className="bg-blue-900/60 hover:bg-blue-800/80 text-blue-200 border border-blue-700/80 text-xs font-semibold px-3 py-1.5 rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-blue-300" />
            <span>Export Table CSV</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar: Search, Date Filter Controls, Category & Result */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-blue-400" />
            <span>Search & Calendar Date Filters</span>
          </div>

          {/* Quick Date Range Preset Buttons */}
          <div className="flex items-center space-x-1.5 flex-wrap">
            <button
              type="button"
              onClick={setDateFilterToday}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Today
            </button>
            <button
              type="button"
              onClick={setDateFilterThisWeek}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              This Week
            </button>
            <button
              type="button"
              onClick={setDateFilterThisMonth}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              This Month
            </button>
            {(fromDate || toDate) && (
              <button
                type="button"
                onClick={clearDateFilter}
                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-800 transition-colors flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search JO, Model, Component */}
          <div className="lg:col-span-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Search JO / Model / Component
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search JO, unit model or component..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* From Date Calendar Control */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              From Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* To Date Calendar Control */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              To Date
            </label>
            <div className="relative">
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Comp Group Filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Comp Group
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="All">All Groups</option>
              <option value="Engine">Engine</option>
              <option value="PT-PPM">PT-PPM</option>
              <option value="Cylinder">Cylinder</option>
            </select>
          </div>
        </div>
      </div>

      {/* Counter Bar */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <strong className="text-white">{sortedRows.length}</strong> test records
        </span>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>GOOD ({sortedRows.filter((r) => r.result === 'GOOD').length})</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>NOT GOOD ({sortedRows.filter((r) => r.result === 'NOT GOOD').length})</span>
          </span>
        </div>
      </div>

      {/* COMPACT HISTORICAL TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold text-[10px] uppercase tracking-wider select-none">
                <th className="px-3 py-2.5 w-10 text-center">No.</th>
                
                <th
                  onClick={() => handleSort('testDateIso')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Test Date</span>
                    {sortField === 'testDateIso' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('joNumber')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors font-mono"
                >
                  <div className="flex items-center space-x-1">
                    <span>JO</span>
                    {sortField === 'joNumber' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('compGroup')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Comp Group</span>
                    {sortField === 'compGroup' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('unitModel')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Unit Model</span>
                    {sortField === 'unitModel' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('component')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Component</span>
                    {sortField === 'component' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('testType')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Test Type</span>
                    {sortField === 'testType' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('testingLine')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Testing Line</span>
                    {sortField === 'testingLine' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('operator')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Operator</span>
                    {sortField === 'operator' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('startTimeFormatted')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Start</span>
                    {sortField === 'startTimeFormatted' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('finishTimeFormatted')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Finish</span>
                    {sortField === 'finishTimeFormatted' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('actualLeadTimeMinutes')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Actual Lead Time</span>
                    {sortField === 'actualLeadTimeMinutes' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th
                  onClick={() => handleSort('result')}
                  className="px-3 py-2.5 cursor-pointer hover:text-white transition-colors text-center"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Result</span>
                    {sortField === 'result' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 opacity-40" />
                    )}
                  </div>
                </th>

                <th className="px-3 py-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {sortedRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-8 text-slate-500 text-xs italic">
                    No historical job orders match your filter criteria.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row, idx) => (
                  <tr
                    key={row.id}
                    className="hover:bg-slate-800/50 transition-colors text-slate-200"
                  >
                    <td className="px-3 py-2 text-center text-slate-500 font-mono text-[11px]">
                      {idx + 1}
                    </td>

                    <td className="px-3 py-2 font-mono text-[11px] whitespace-nowrap text-slate-300">
                      {row.testDateFormatted}
                    </td>

                    <td className="px-3 py-2 font-mono font-bold text-blue-400 whitespace-nowrap">
                      {row.joNumber}
                    </td>

                    <td className="px-3 py-2 text-slate-300 font-medium whitespace-nowrap">
                      <span className="bg-slate-950 px-2 py-0.5 rounded text-[10px] border border-slate-800">
                        {row.compGroup}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-slate-300 font-medium whitespace-nowrap">
                      {row.unitModel}
                    </td>

                    <td className="px-3 py-2 text-slate-200 font-semibold truncate max-w-[140px]" title={row.component}>
                      {row.component}
                    </td>

                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                          row.testType === 'RETEST'
                            ? 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                            : 'bg-blue-950 text-blue-300 border border-blue-800'
                        }`}
                      >
                        {row.testType}
                      </span>
                    </td>

                    <td className="px-3 py-2 font-medium text-slate-300 whitespace-nowrap">
                      {row.testingLine}
                    </td>

                    <td className="px-3 py-2 text-slate-300 text-[11px] whitespace-nowrap">
                      {row.operator}
                    </td>

                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {row.startTimeFormatted}
                    </td>

                    <td className="px-3 py-2 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                      {row.finishTimeFormatted}
                    </td>

                    <td className="px-3 py-2 font-mono text-[11px] font-bold text-amber-300 whitespace-nowrap">
                      {row.actualLeadTimeFormatted}
                    </td>

                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          row.result === 'GOOD'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                            : 'bg-rose-950 text-rose-300 border-rose-700'
                        }`}
                      >
                        {row.result}
                      </span>
                    </td>

                    <td className="px-3 py-2 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenJODetail(row.joNumber)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-1.5 rounded-lg transition-colors"
                          title="View JO Details & Audit Log"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-400" />
                        </button>
                        {row.result === 'GOOD' && (
                          <button
                            type="button"
                            onClick={() => setSelectedPdfJO(row.rawRecord)}
                            className="bg-blue-950 hover:bg-blue-900 text-blue-300 border border-blue-800 p-1.5 rounded-lg transition-colors"
                            title="Generate Quality Test Certificate"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-400" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PDF Quality Certificate Modal */}
      {selectedPdfJO && (
        <PDFReportModal
          jo={selectedPdfJO}
          onClose={() => setSelectedPdfJO(null)}
        />
      )}
    </div>
  );
};
