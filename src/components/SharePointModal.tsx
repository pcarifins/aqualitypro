import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Plus,
  AlertCircle,
  X,
  Database,
  ArrowUpRight,
  LogOut,
  FolderLock,
  CloudLightning,
  ShieldCheck,
  ClipboardList
} from 'lucide-react';
import { sharepointService, SharePointAuthState } from '../services/sharepointService';
import { QueueRecord } from '../types';

interface SharePointModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: { name: string; role: string } | null;
  onShowToast?: (msg: string) => void;
}

export const SharePointModal: React.FC<SharePointModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onShowToast,
}) => {
  const [config, setConfig] = useState<SharePointAuthState>(sharepointService.getConfig());
  const [emailInput, setEmailInput] = useState('ppc.admin@komatsu.co.id');
  const [nameInput, setNameInput] = useState('PPC Administrator');
  const [showAuthFields, setShowAuthFields] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  const [syncReport, setSyncReport] = useState<{
    added: number;
    updated: number;
    quarantined: { joNumber: string; unitModel: string; component: string; reason: string }[];
  } | null>(null);

  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(sharepointService.getConfig());
      setStatusMessage(null);
      setSyncReport(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setStatusMessage(null);
    try {
      const activeCfg = await sharepointService.connectSharepointAccount(emailInput, nameInput);
      setConfig(activeCfg);
      setShowAuthFields(false);
      setStatusMessage({
        type: 'success',
        text: `Connected to Azure AD: ${activeCfg.userEmail}`,
      });
      if (onShowToast) onShowToast('SharePoint Account connected successfully!');
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'OAuth Connection to SharePoint failed.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect Microsoft SharePoint / OneDrive?')) {
      return;
    }
    await sharepointService.disconnect();
    setConfig(sharepointService.getConfig());
    setSyncReport(null);
    setStatusMessage({
      type: 'info',
      text: 'SharePoint / OneDrive disconnected.',
    });
    if (onShowToast) onShowToast('Disconnected from SharePoint.');
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setStatusMessage({
      type: 'info',
      text: 'Accessing OneDrive Business API and fetching PPC_Schedule workbook...',
    });
    setSyncReport(null);

    try {
      const actor = currentUser?.name || 'PPC Administrator';
      const result = await sharepointService.syncWithStore(actor);
      
      setSyncReport({
        added: result.added,
        updated: result.updated,
        quarantined: result.quarantined,
      });

      setStatusMessage({
        type: 'success',
        text: 'SharePoint sync completed! Calculated differences and updated queue.',
      });

      if (onShowToast) {
        onShowToast(`Sync Complete! Added: ${result.added}, Updated: ${result.updated}`);
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to sync with SharePoint.',
      });
    } finally {
      setIsSyncing(false);
    }
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
                Microsoft SharePoint / OneDrive Excel Sync
              </h2>
              <p className="text-xs text-blue-100">
                Secure enterprise spreadsheet sync with Product Master verification
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

          {/* Connection Section */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Enterprise Login Credentials
              </span>
              {config.isConnected ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
                  Authenticated
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                  No Connection
                </span>
              )}
            </div>

            {config.isConnected ? (
              <div className="flex items-center justify-between bg-white p-3.5 rounded-lg border border-slate-200">
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {config.userName || 'Authorized User'}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                    {config.userEmail}
                  </div>
                  <div className="text-[10px] text-indigo-600 font-semibold mt-1 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Azure AD Token: Server-Secured</span>
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-lg border border-slate-200 space-y-3">
                {!showAuthFields ? (
                  <div className="text-center py-2">
                    <p className="text-xs text-slate-600 mb-3 max-w-sm mx-auto">
                      Authorise AQuality PRO to securely connect to your organization's SharePoint / OneDrive for Business environment.
                    </p>
                    <button
                      onClick={() => setShowAuthFields(true)}
                      className="inline-flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all"
                    >
                      <span>Sign in with Microsoft Business</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleConnect} className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                          Enterprise Email
                        </label>
                        <input
                          type="email"
                          required
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setShowAuthFields(false)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isConnecting}
                        className="px-3 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-1"
                      >
                        {isConnecting ? 'Authorizing...' : 'Authorize Client'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Workbook Config */}
          {config.isConnected && (
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Target OneDrive Business Excel Sheet
              </span>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <FolderLock className="w-4 h-4 text-blue-600" />
                      <span>{config.siteName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-1">
                      File Path: <span className="bg-slate-100 px-1 py-0.5 rounded font-bold">{config.workbookPath}</span>
                    </div>
                  </div>

                  <div className="text-[10px] bg-slate-100 px-2.5 py-1 rounded-md text-slate-600 font-bold border border-slate-200">
                    Table: PPC_Schedule
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <span>
                    Last Synced:{' '}
                    {config.lastSyncTime
                      ? new Date(config.lastSyncTime).toLocaleString()
                      : 'Never'}
                  </span>
                  <span className="text-indigo-700 font-bold flex items-center space-x-1">
                    <CloudLightning className="w-3.5 h-3.5" />
                    <span>Real-time Sync Active</span>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Sync Report Result Card */}
          {syncReport && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 space-y-3 animate-in slide-in-from-top duration-200">
              <div className="flex items-center space-x-2 font-bold text-slate-800 text-xs uppercase tracking-wider">
                <ClipboardList className="w-4 h-4 text-indigo-600" />
                <span>SharePoint Synchronization Summary</span>
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

              {/* B4 & B6 Quarantined Records Presentation */}
              {syncReport.quarantined.length > 0 && (
                <div className="bg-rose-50 rounded-xl p-3.5 border border-rose-200 space-y-2">
                  <div className="flex items-center space-x-1.5 text-rose-800 font-bold text-xs">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Quarantined Rows Report ({syncReport.quarantined.length})</span>
                  </div>
                  <p className="text-[10px] text-rose-700 leading-relaxed">
                    The following rows from SharePoint were flagged and quarantined. They were NOT imported into the active queue because they contain unconfigured, disabled, or inactive products.
                  </p>
                  
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {syncReport.quarantined.map((item, idx) => (
                      <div key={idx} className="bg-white p-2.5 rounded-lg border border-rose-100 text-[10px] text-slate-700 flex flex-col space-y-1 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">JO: {item.joNumber}</span>
                          <span className="font-black text-rose-600 uppercase text-[8px] bg-rose-100 px-1.5 py-0.5 rounded">QUARANTINED</span>
                        </div>
                        <div className="font-mono text-slate-500">
                          Product: {item.unitModel} / {item.component}
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
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>

          {config.isConnected && (
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing...' : 'Sync Workbook Now'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
