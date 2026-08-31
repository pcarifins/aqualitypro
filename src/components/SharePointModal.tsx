import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  Upload,
  Download,
  Database,
  CloudLightning,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';
import { apiClient } from '../api/client';

interface SharePointModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { name: string; role: string } | null;
  onShowToast?: (msg: string) => void;
  onRefreshData?: () => void;
}

export const SharePointModal: React.FC<SharePointModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast,
  onRefreshData,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [syncReport, setSyncReport] = useState<{
    source?: string;
    spreadsheetId?: string;
    added: number;
    updated: number;
    backupId?: string;
    priority?: {
      added: number;
      updated: number;
      quarantined: { rowNumber?: number; joNumber: string; unitModel: string; component: string; reason: string }[];
    };
    capacity?: {
      sheetFound: boolean;
      updated: number;
      quarantined: any[];
    };
    quarantined?: { joNumber: string; unitModel: string; component: string; reason: string }[];
  } | null>(null);

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStatusMessage(null);
      setSyncReport(null);
      setSelectedFile(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSync = async () => {
    setIsSyncing(true);
    setStatusMessage({
      type: 'info',
      text: 'Downloading and synchronizing public Google Spreadsheet PPC Schedule & Capacity...',
    });
    setSyncReport(null);

    try {
      const actor = currentUser?.name || 'PPC Administrator';
      const result = await apiClient.syncPPCDataSource(actor);
      
      setSyncReport({
        source: result.source || 'GOOGLE_SHEETS',
        spreadsheetId: result.spreadsheetId,
        added: result.priority?.added ?? result.added ?? 0,
        updated: result.priority?.updated ?? result.updated ?? 0,
        backupId: result.backupId,
        priority: result.priority,
        capacity: result.capacity,
        quarantined: result.priority?.quarantined || result.quarantined || [],
      });

      setStatusMessage({
        type: 'success',
        text: `Google Sheets synchronization successful! Added: ${result.priority?.added ?? 0}, Updated: ${result.priority?.updated ?? 0}. Backup ID: ${result.backupId || 'Created'}.`,
      });

      if (onShowToast) {
        onShowToast('Google Sheets PPC Sync Complete!');
      }
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to synchronize with Google Spreadsheet.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setStatusMessage({ type: 'error', text: 'Please select an Excel (.xlsx) file first.' });
      return;
    }

    setIsUploading(true);
    setStatusMessage({
      type: 'info',
      text: `Uploading and validating ${selectedFile.name}...`,
    });
    setSyncReport(null);

    try {
      const actor = currentUser?.name || 'PPC Administrator';
      const result = await apiClient.uploadPPCExcel(selectedFile, actor);

      setSyncReport({
        source: 'EXCEL_UPLOAD',
        added: result.priority?.added ?? 0,
        updated: result.priority?.updated ?? 0,
        backupId: result.backupId,
        priority: result.priority,
        capacity: result.capacity,
        quarantined: result.priority?.quarantined || [],
      });

      setStatusMessage({
        type: 'success',
        text: `Excel upload & sync applied successfully! Added: ${result.priority?.added ?? 0}, Updated: ${result.priority?.updated ?? 0}. Backup ID: ${result.backupId || 'Created'}.`,
      });

      if (onShowToast) {
        onShowToast('Excel file uploaded and synchronized successfully!');
      }
      if (onRefreshData) {
        onRefreshData();
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to upload and apply Excel file.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    window.open('/api/ppc/uat-template', '_blank');
    if (onShowToast) onShowToast('Downloading UAT Excel Template...');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-blue-200" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                PPC Google Sheets & Excel Synchronization
              </h2>
              <p className="text-xs text-blue-100">
                Real-time production priority queue & testing line capacity management
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start space-x-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="leading-relaxed font-medium">{statusMessage.text}</div>
            </div>
          )}

          {/* Google Sheets Sync Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <CloudLightning className="w-4 h-4 text-indigo-600" />
                <span>Public Google Spreadsheet Sync</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                Live Connection Ready
              </span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  Google Sheets PPC Master Source
                </div>
                <div className="text-[11px] text-slate-500 font-mono mt-0.5 truncate max-w-sm">
                  ID: <span className="bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-700">1vO_p2N1cTr0tMRU6ZuPjUjGeyOaW-eA0KF5JLnTigyQ</span>
                </div>
                <div className="text-[10px] text-indigo-600 font-semibold mt-1 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Anonymous Read & Atomic Backup Protected</span>
                </div>
              </div>

              <button
                onClick={handleGoogleSync}
                disabled={isSyncing}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-xs flex items-center space-x-1.5 shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Google Sheet'}</span>
              </button>
            </div>
          </div>

          {/* Excel Upload & Template Download Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <Upload className="w-4 h-4 text-blue-600" />
                <span>Manual Excel Upload & UAT Template</span>
              </span>
              <button
                onClick={handleDownloadTemplate}
                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center space-x-1 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download UAT Template</span>
              </button>
            </div>

            <form onSubmit={handleFileUpload} className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Select PPC & Capacity Excel Workbook (.xlsx)
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="submit"
                  disabled={!selectedFile || isUploading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
                >
                  <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-pulse' : ''}`} />
                  <span>{isUploading ? 'Uploading & Applying...' : 'Upload & Apply Excel Sync'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Sync Report Result Card */}
          {syncReport && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 space-y-3 animate-in slide-in-from-top duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
                  <ClipboardList className="w-4 h-4 text-indigo-600" />
                  <span>Synchronization Summary ({syncReport.source || 'SYNC'})</span>
                </div>
                {syncReport.backupId && (
                  <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded font-bold">
                    Backup: {syncReport.backupId}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">New Jobs Added</span>
                  <span className="text-xl font-black text-blue-600">{syncReport.added}</span>
                </div>
                <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col justify-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Existing Jobs Updated</span>
                  <span className="text-xl font-black text-indigo-600">{syncReport.updated}</span>
                </div>
              </div>

              {/* Capacity updates report if present */}
              {syncReport.capacity?.sheetFound && (
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200 text-xs text-emerald-800 font-medium">
                  Testing Lines Capacity Sheet successfully detected and synchronized ({syncReport.capacity.updated} lines updated).
                </div>
              )}

              {/* Quarantined Records Presentation */}
              {syncReport.quarantined && syncReport.quarantined.length > 0 && (
                <div className="bg-rose-50 rounded-xl p-3.5 border border-rose-200 space-y-2">
                  <div className="flex items-center space-x-1.5 text-rose-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Quarantined Rows Report ({syncReport.quarantined.length})</span>
                  </div>
                  <p className="text-[10px] text-rose-700 leading-relaxed">
                    The following rows were flagged and quarantined because they contain unconfigured, disabled, or inactive products or duplicate JO numbers.
                  </p>
                  
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {syncReport.quarantined.map((item, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-rose-100 text-[10px] text-slate-700 flex flex-col space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">JO: {item.joNumber || 'N/A'}</span>
                          <span className="font-black text-rose-600 uppercase text-[8px] bg-rose-100 px-1.5 py-0.5 rounded">QUARANTINED</span>
                        </div>
                        <div className="font-mono text-slate-500">
                          Product: {item.unitModel || 'Unknown'} / {item.component || 'Unknown'}
                        </div>
                        <div className="text-rose-600 font-medium">
                          Reason: {item.reason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
          <span className="text-[11px] text-slate-500">
            AQuality PRO UAT v1.0 • Secure Read-Only Google Sheet Integration
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
