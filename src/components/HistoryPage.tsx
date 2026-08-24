import React, { useState } from 'react';
import {
  CombinedJORecords,
  FilterParams,
  ProductCategory,
  ProductModel,
  TestResult,
  TestProcess,
} from '../types';
import {
  Search,
  Filter,
  History as HistoryIcon,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  AlertTriangle,
  ArrowRight,
  User,
  Wrench,
  FileSpreadsheet,
} from 'lucide-react';
import { formatDate, formatDuration } from '../utils/formatters';

interface HistoryPageProps {
  historyRecords: CombinedJORecords[];
  productModels: ProductModel[];
  onOpenJODetail: (joNumber: string) => void;
  initialSearchQuery?: string;
  onOpenSheetsModal?: () => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({
  historyRecords,
  productModels,
  onOpenJODetail,
  initialSearchQuery = '',
  onOpenSheetsModal,
}) => {
  const [joSearch, setJoSearch] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<
    ProductCategory | 'All'
  >('All');
  const [selectedModel, setSelectedModel] = useState<string>('All');
  const [selectedMechanic, setSelectedMechanic] = useState<string>('All');
  const [selectedResult, setSelectedResult] = useState<
    'All' | 'GOOD' | 'NOT GOOD' | 'Ever NOT GOOD'
  >('All');

  // Extract unique mechanic names for filter
  const mechanics = Array.from(
    new Set(historyRecords.map((r) => r.assemblyMechanic).filter(Boolean))
  );

  // Filter records locally
  const filteredRecords = historyRecords.filter((rec) => {
    if (
      joSearch.trim() &&
      !rec.joNumber.toUpperCase().includes(joSearch.trim().toUpperCase())
    ) {
      return false;
    }
    if (selectedCategory !== 'All' && rec.productCategory !== selectedCategory) {
      return false;
    }
    if (selectedModel !== 'All' && rec.productModel !== selectedModel) {
      return false;
    }
    if (selectedMechanic !== 'All' && rec.assemblyMechanic !== selectedMechanic) {
      return false;
    }

    if (selectedResult === 'GOOD' && rec.currentOverallStatus !== 'GOOD') {
      return false;
    }
    if (selectedResult === 'NOT GOOD' && rec.currentOverallStatus !== 'NOT GOOD') {
      return false;
    }
    if (selectedResult === 'Ever NOT GOOD' && !rec.everHadNG) {
      return false;
    }

    return true;
  });

  const escapeCSV = (field: any): string => {
    if (field === null || field === undefined) return '""';
    const str = String(field).replace(/"/g, '""');
    return `"${str}"`;
  };

  const handleExportSummaryCSV = () => {
    const headers = [
      'JO Number',
      'Category',
      'Model',
      'Assembly Mechanic',
      'Current Status',
      'Ever Had NG',
      'GLT Attempts',
      'Bench Test Attempts',
      'Bench Lead Time (Minutes)',
      'Latest Test Date',
      'Latest Defect NG Item',
      'Latest Remarks',
    ];

    const rows = filteredRecords.map((r) => {
      const latestDyno = r.dynoRecords[r.dynoRecords.length - 1];
      const latestHyd = r.hydraulicRecords[r.hydraulicRecords.length - 1];
      const benchTime = latestDyno
        ? latestDyno.dynoLeadTimeMinutes ?? ''
        : latestHyd
        ? latestHyd.hydraulicLeadTimeMinutes ?? ''
        : '';

      const latestNg = latestDyno?.ngItem || latestHyd?.ngItem || r.gltRecords[r.gltRecords.length - 1]?.ngItem || '';
      const latestRemarks = latestDyno?.remarks || latestHyd?.remarks || r.gltRecords[r.gltRecords.length - 1]?.remarks || '';

      return [
        r.joNumber,
        r.productCategory,
        r.productModel,
        r.assemblyMechanic,
        r.currentOverallStatus,
        r.everHadNG ? 'Yes' : 'No',
        r.gltRecords.length,
        r.dynoRecords.length + r.hydraulicRecords.length,
        benchTime,
        formatDate(r.latestRecordDate),
        latestNg,
        latestRemarks,
      ];
    });

    const csvRows = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ];

    // Prepend UTF-8 BOM for Microsoft Excel compatibility
    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `KRA_JO_Summary_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportDetailedCSV = () => {
    const headers = [
      'JO Number',
      'Category',
      'Model',
      'Assembly Mechanic',
      'Process',
      'Attempt #',
      'Operator / Tester',
      'Submission / Date',
      'Result',
      'Lead Time (Mins)',
      'NG Item',
      'NG Description',
      'Remarks',
    ];

    const rows: string[][] = [];

    filteredRecords.forEach((r) => {
      // GLT Records
      r.gltRecords.forEach((g) => {
        rows.push([
          r.joNumber,
          r.productCategory,
          r.productModel,
          r.assemblyMechanic,
          'GLT',
          String(g.attemptNumber),
          g.operatorName || '',
          g.submissionTime ? formatDate(g.submissionTime) : g.testDate || '',
          g.result,
          '',
          g.ngItem || '',
          g.ngDescription || '',
          g.remarks || '',
        ]);
      });

      // Dynotest Records
      r.dynoRecords.forEach((d) => {
        rows.push([
          r.joNumber,
          r.productCategory,
          r.productModel,
          r.assemblyMechanic,
          'Dynotest',
          String(d.attemptNumber),
          d.operatorName || '',
          d.submissionTime ? formatDate(d.submissionTime) : '',
          d.result,
          d.dynoLeadTimeMinutes ? String(d.dynoLeadTimeMinutes) : '',
          d.ngItem || '',
          d.ngDescription || '',
          d.remarks || '',
        ]);
      });

      // Hydraulic Records
      r.hydraulicRecords.forEach((h) => {
        rows.push([
          r.joNumber,
          r.productCategory,
          r.productModel,
          r.assemblyMechanic,
          'Hydraulic Test',
          String(h.attemptNumber),
          h.operatorName || '',
          h.submissionTime ? formatDate(h.submissionTime) : '',
          h.result,
          h.hydraulicLeadTimeMinutes ? String(h.hydraulicLeadTimeMinutes) : '',
          h.ngItem || '',
          h.ngDescription || '',
          h.remarks || '',
        ]);
      });
    });

    const csvRows = [
      headers.map(escapeCSV).join(','),
      ...rows.map((row) => row.map(escapeCSV).join(',')),
    ];

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `KRA_Detailed_Test_Attempts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-4 pb-28 space-y-5">
      {/* Page Title */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 border border-blue-500/40 flex items-center justify-center font-black">
            <HistoryIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">
              Test Record History & Traceability
            </h2>
            <p className="text-xs text-slate-400">
              All GLT, Dynotest, and Hydraulic test submissions preserved without overwriting
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto flex-wrap gap-y-2">
          {onOpenSheetsModal && (
            <button
              onClick={onOpenSheetsModal}
              className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/80 text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs"
              title="Sync all historical records with Google Sheets"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" />
              <span>Google Sheets Sync</span>
            </button>
          )}
          <button
            onClick={handleExportSummaryCSV}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Export filtered JO summary list to CSV/Excel"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Export JO Summary</span>
          </button>
          <button
            onClick={handleExportDetailedCSV}
            className="bg-blue-900/60 hover:bg-blue-900/80 text-blue-200 border border-blue-700/80 text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-1.5 transition-colors shadow-xs"
            title="Export all individual GLT/Dynotest/Hydraulic test attempt logs to CSV/Excel"
          >
            <Download className="w-3.5 h-3.5 text-blue-300" />
            <span>Export Detailed Submissions</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 pb-2">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Filter Historical Records</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {/* JO Search */}
          <div className="md:col-span-1">
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
              JO Number
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search JO..."
                value={joSearch}
                onChange={(e) => setJoSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) =>
                setSelectedCategory(e.target.value as ProductCategory | 'All')
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Categories</option>
              <option value="Engine">Engine</option>
              <option value="Power Train Component">Power Train Component</option>
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
              Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Product Models</option>
              {productModels.map((m) => (
                <option key={m.id} value={m.modelName}>
                  {m.modelName}
                </option>
              ))}
            </select>
          </div>

          {/* Assembly Mechanic */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
              Assembly Mechanic
            </label>
            <select
              value={selectedMechanic}
              onChange={(e) => setSelectedMechanic(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="All">All Mechanics</option>
              {mechanics.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Result Filter */}
          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">
              Test Result
            </label>
            <select
              value={selectedResult}
              onChange={(e) =>
                setSelectedResult(e.target.value as any)
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-semibold"
            >
              <option value="All">All Results</option>
              <option value="GOOD">Currently GOOD</option>
              <option value="NOT GOOD">Currently NOT GOOD</option>
              <option value="Ever NOT GOOD">Ever Had NOT GOOD (Retested)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Record Counter & Result List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Showing <strong className="text-white">{filteredRecords.length}</strong> of{' '}
            {historyRecords.length} Job Orders
          </span>

          <div className="flex items-center space-x-3 text-[11px]">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>GOOD</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <span>NOT GOOD</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Ever NG</span>
            </span>
          </div>
        </div>

        {filteredRecords.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-slate-400 text-xs">
            No test records match your filter criteria.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredRecords.map((jo) => {
              const isGood = jo.currentOverallStatus === 'GOOD';

              // Latest test attempt lead times
              const latestDyno = jo.dynoRecords[jo.dynoRecords.length - 1];
              const latestHyd = jo.hydraulicRecords[jo.hydraulicRecords.length - 1];
              const latestGLT = jo.gltRecords[jo.gltRecords.length - 1];

              return (
                <div
                  key={jo.joNumber}
                  onClick={() => onOpenJODetail(jo.joNumber)}
                  className="bg-slate-900 hover:bg-slate-800/80 border border-slate-800 rounded-xl p-4 text-xs transition-all cursor-pointer space-y-3 shadow-xs group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`w-3 h-3 rounded-full shrink-0 ${
                          isGood ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                      />
                      <div className="font-bold text-white font-mono text-sm whitespace-nowrap group-hover:text-blue-300 transition-colors">
                        {jo.joNumber}
                      </div>
                      <span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium border border-slate-800">
                        {jo.productCategory}
                      </span>
                      <span className="text-slate-400 font-normal">
                        {jo.productModel}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {jo.everHadNG && (
                        <span className="bg-amber-950/80 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-800">
                          Ever NG (Retest)
                        </span>
                      )}

                      <span
                        className={`font-black text-[11px] px-2.5 py-0.5 rounded-full border ${
                          isGood
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-700/80'
                            : 'bg-rose-950 text-rose-300 border-rose-700/80'
                        }`}
                      >
                        {jo.currentOverallStatus}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-slate-300 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Assembly Mechanic:
                      </span>
                      <span className="font-bold text-blue-300 flex items-center space-x-1 mt-0.5">
                        <Wrench className="w-3 h-3" />
                        <span>{jo.assemblyMechanic}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        GLT Attempts:
                      </span>
                      <span className="font-semibold text-slate-200 mt-0.5 block">
                        {jo.gltRecords.length} Submission(s)
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px]">
                        Test Bench Lead Time:
                      </span>
                      <span className="font-bold text-amber-300 mt-0.5 block">
                        {latestDyno
                          ? formatDuration(latestDyno.dynoLeadTimeMinutes)
                          : latestHyd
                          ? formatDuration(latestHyd.hydraulicLeadTimeMinutes)
                          : 'Awaiting Bench'}
                      </span>
                    </div>

                    <div className="text-right sm:text-left">
                      <span className="text-slate-500 block text-[10px]">
                        Latest Test Date:
                      </span>
                      <span className="font-mono text-slate-200 mt-0.5 block">
                        {formatDate(jo.latestRecordDate)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
