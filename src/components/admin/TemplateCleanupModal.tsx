import React, { useState, useEffect } from 'react';
import { store } from '../../data/storageEngine';
import { DryRunReport } from '../../services/templateCleanupService';
import { User } from '../../types';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Database,
  Info,
} from 'lucide-react';

interface TemplateCleanupModalProps {
  currentUser?: User;
  onClose: () => void;
  onCleanupComplete?: (message: string) => void;
}

export const TemplateCleanupModal: React.FC<TemplateCleanupModalProps> = ({
  onClose,
}) => {
  const [report, setReport] = useState<DryRunReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterDecision, setFilterDecision] = useState<'ALL' | 'DELETE' | 'KEEP'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadReport = () => {
    setIsLoading(true);
    try {
      const rep = store.generateDryRunReport();
      setReport(rep);
    } catch (err) {
      console.error('Failed to generate dry run report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  const filteredItems = (report?.items || []).filter((item) => {
    if (filterDecision !== 'ALL' && item.decision !== filterDecision) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.templateId.toLowerCase().includes(q) ||
        item.templateName.toLowerCase().includes(q) ||
        (item.replacementTemplateId && item.replacementTemplateId.toLowerCase().includes(q)) ||
        item.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shadow-xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Checksheet Template Cleanup Audit (Read-Only)</h3>
              <p className="text-xs text-slate-500">
                Audit and inspect template reference integrity across active relationships, historical tests, and certificates
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Read-Only Informational Notice */}
        <div className="mx-6 mt-4 p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-start space-x-2.5 text-xs text-blue-900">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Controlled Template Deletion Policy:</span> This audit view is strictly read-only for traceability and verification. Permanent deletion of individual zero-reference templates is managed exclusively by authorized Quality Admins inside the <strong>Checksheet Templates</strong> master tab with explicit safety validations.
          </div>
        </div>

        {/* Summary Stat Cards */}
        {report && (
          <div className="p-6 bg-slate-50/50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Templates</span>
              <div className="text-xl font-black text-slate-800 mt-0.5">{report.totalTemplatesEvaluated}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600 block">Keep (Active / Historical)</span>
              <div className="text-xl font-black text-emerald-700 mt-0.5">{report.toKeepCount}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs">
              <span className="text-[10px] uppercase font-bold text-amber-600 block">Zero-Reference Templates</span>
              <div className="text-xl font-black text-amber-700 mt-0.5">{report.toDeleteCount}</div>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs">
              <span className="text-[10px] uppercase font-bold text-blue-600 block">1:1 Product Mappings</span>
              <div className="text-xl font-black text-blue-700 mt-0.5">
                {report.activeProductsWithSingleRelationship} / {report.totalActiveProducts}
              </div>
            </div>
          </div>
        )}

        {/* Filter and Search Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setFilterDecision('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterDecision === 'ALL' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({report?.items.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterDecision('DELETE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterDecision === 'DELETE' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Zero References ({report?.toDeleteCount || 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterDecision('KEEP')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                filterDecision === 'KEEP' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Keep ({report?.toKeepCount || 0})
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search template ID or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-64 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={loadReport}
              title="Refresh Report"
              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Dry Run Report Table */}
        <div className="flex-1 overflow-y-auto p-6">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                <th className="pb-2.5">Template ID & Name</th>
                <th className="pb-2.5 text-center">Active Mappings</th>
                <th className="pb-2.5 text-center">Completed Tests</th>
                <th className="pb-2.5 text-center">Certificates</th>
                <th className="pb-2.5">Replacement Template</th>
                <th className="pb-2.5 text-right">Audit Recommendation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                    No templates match your search/filter criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.templateId} className="hover:bg-slate-50/70">
                    <td className="py-3 pr-2">
                      <div className="font-bold text-slate-900">{item.templateName}</div>
                      <div className="font-mono text-[10px] text-slate-500">{item.templateId}</div>
                    </td>
                    <td className="py-3 text-center font-bold text-slate-700">
                      {item.activeRelationshipCount}
                    </td>
                    <td className="py-3 text-center font-bold text-slate-700">
                      {item.completedTestRefCount}
                    </td>
                    <td className="py-3 text-center font-bold text-slate-700">
                      {item.certificateRefCount}
                    </td>
                    <td className="py-3 pr-2 font-mono text-[10px] text-slate-600">
                      {item.replacementTemplateId ? (
                        <span className="text-blue-700 font-semibold">{item.replacementTemplateId}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.decision === 'DELETE'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {item.decision === 'DELETE' ? 'ELIGIBLE FOR REVIEW' : 'KEEP / PROTECTED'}
                      </span>
                      <div className="text-[9px] text-slate-400 mt-0.5 max-w-[220px] ml-auto truncate" title={item.reason}>
                        {item.reason}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center space-x-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Audit report loaded live from storage engine and Firestore collections.</span>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close Audit
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

