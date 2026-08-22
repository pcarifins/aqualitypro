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
  Sparkles,
  Layers,
  LogOut,
  DownloadCloud,
} from 'lucide-react';
import {
  googleSheetsService,
  GoogleSheetsAuthState,
} from '../services/googleSheetsService';
import {
  CombinedJORecords,
  GLTRecord,
  DynotestRecord,
  HydraulicRecord,
  QueueRecord,
} from '../types';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyRecords: CombinedJORecords[];
  queueRecords?: QueueRecord[];
  onShowToast?: (msg: string) => void;
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  historyRecords,
  queueRecords = [],
  onShowToast,
}) => {
  const [config, setConfig] = useState<Partial<GoogleSheetsAuthState>>(
    googleSheetsService.getConfig()
  );
  const [accessToken, setAccessToken] = useState<string | null>(
    googleSheetsService.getAccessToken()
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setConfig(googleSheetsService.getConfig());
      setAccessToken(googleSheetsService.getAccessToken());
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Flatten GLT, Dyno, and Hydraulic records from history
  const gltRecords: GLTRecord[] = [];
  const dynoRecords: DynotestRecord[] = [];
  const hydraulicRecords: HydraulicRecord[] = [];

  historyRecords.forEach((h) => {
    h.gltRecords.forEach((r) => gltRecords.push(r));
    h.dynoRecords.forEach((r) => dynoRecords.push(r));
    h.hydraulicRecords.forEach((r) => hydraulicRecords.push(r));
  });

  const handleConnectGoogle = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const { user, accessToken: token } =
        await googleSheetsService.connectGoogleAccount();
      setAccessToken(token);
      const newCfg = googleSheetsService.getConfig();
      setConfig(newCfg);
      setStatusMessage({
        type: 'success',
        text: `Successfully connected Google Account: ${user.email}`,
      });
      if (onShowToast) onShowToast('Google Account connected successfully!');
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to authenticate with Google.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (
      !window.confirm(
        'Are you sure you want to disconnect your Google account from AQuality PRO?'
      )
    ) {
      return;
    }
    await googleSheetsService.disconnect();
    setAccessToken(null);
    setConfig({});
    setStatusMessage({
      type: 'info',
      text: 'Google account disconnected.',
    });
  };

  const handleCreateNewSpreadsheet = async () => {
    if (!accessToken) {
      setStatusMessage({
        type: 'error',
        text: 'Please connect your Google Account first.',
      });
      return;
    }

    setIsSyncing(true);
    setStatusMessage({
      type: 'info',
      text: 'Creating Master Testing Workbook on Google Drive & formatting tabs...',
    });

    try {
      const result = await googleSheetsService.createMasterSpreadsheet(
        accessToken,
        historyRecords,
        gltRecords,
        dynoRecords,
        hydraulicRecords,
        queueRecords
      );

      const newCfg = googleSheetsService.getConfig();
      setConfig(newCfg);

      setStatusMessage({
        type: 'success',
        text: `Master Spreadsheet created successfully! Populated ${historyRecords.length} JO summaries, ${gltRecords.length} GLT logs, ${dynoRecords.length} Dyno logs, and ${hydraulicRecords.length} Hydraulic logs.`,
      });
      if (onShowToast) onShowToast('Google Sheet created and synchronized!');
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to create spreadsheet.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushLatestData = async () => {
    if (!accessToken || !config.spreadsheetId) {
      setStatusMessage({
        type: 'error',
        text: 'No active Google Spreadsheet connected. Click "Create New Master Sheet" first.',
      });
      return;
    }

    setIsSyncing(true);
    setStatusMessage({
      type: 'info',
      text: 'Overwriting and synchronizing latest records to Google Sheets...',
    });

    try {
      await googleSheetsService.populateAllSheets(
        accessToken,
        config.spreadsheetId,
        historyRecords,
        gltRecords,
        dynoRecords,
        hydraulicRecords,
        queueRecords
      );

      const updatedTime = new Date().toISOString();
      googleSheetsService.saveConfig({ lastSyncTime: updatedTime });
      setConfig({ ...config, lastSyncTime: updatedTime });

      setStatusMessage({
        type: 'success',
        text: `Data synchronization complete! Updated all 5 sheets with current testing logs.`,
      });
      if (onShowToast) onShowToast('Spreadsheet updated successfully!');
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update Google Sheet.',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const isConnected = !!accessToken && !!config.userEmail;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                Google Sheets Integration
              </h2>
              <p className="text-xs text-emerald-100">
                Automated live reporting & multi-tab test data synchronization
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Status feedback message */}
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
              <div className="leading-relaxed">{statusMessage.text}</div>
            </div>
          )}

          {/* Account Authentication Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Google Account Status
              </span>
              {isConnected ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                  Connected
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                  Not Connected
                </span>
              )}
            </div>

            {isConnected ? (
              <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex items-center space-x-3">
                  {config.userPhoto ? (
                    <img
                      src={config.userPhoto}
                      alt="Profile"
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full border border-slate-200 shadow-2xs"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                      {config.userName?.[0] || config.userEmail?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {config.userName || 'Authorized Google User'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {config.userEmail}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDisconnect}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-xs text-slate-600 mb-3 max-w-sm mx-auto">
                  Connect your Google Account to authorize AQuality PRO to create
                  and update Google Sheets on your Google Drive.
                </p>
                <button
                  onClick={handleConnectGoogle}
                  disabled={isLoading}
                  className="inline-flex items-center justify-center space-x-2.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-300 shadow-xs hover:border-slate-400 transition-all"
                >
                  {/* Google G Logo */}
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>
                    {isLoading
                      ? 'Connecting Google Account...'
                      : 'Sign in with Google'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Active Target Spreadsheet Section */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Active Master Spreadsheet
            </span>

            {config.spreadsheetId ? (
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>AQuality PRO Master QC Log</span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      ID: {config.spreadsheetId}
                    </div>
                  </div>

                  {config.spreadsheetUrl && (
                    <a
                      href={config.spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors flex items-center space-x-1"
                    >
                      <span>Open in Google Sheets</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
                  <span>
                    Last Synced:{' '}
                    {config.lastSyncTime
                      ? new Date(config.lastSyncTime).toLocaleString()
                      : 'Never'}
                  </span>
                  <span className="text-emerald-700 font-medium">5 Tabs Active</span>
                </div>
              </div>
            ) : (
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  No Google Spreadsheet created yet for this workstation.
                </p>
                <button
                  onClick={handleCreateNewSpreadsheet}
                  disabled={!isConnected || isSyncing}
                  className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs inline-flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Master Testing Spreadsheet</span>
                </button>
              </div>
            )}
          </div>

          {/* Tab Structure Breakdown */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Automated Workbook Tabs
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50">
                <div className="font-bold text-blue-900">JO_Master_Summary</div>
                <div className="text-[10px] text-blue-700 mt-0.5">
                  {historyRecords.length} Job Orders
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-emerald-200 bg-emerald-50/50">
                <div className="font-bold text-emerald-900">GLT_Inspection_Log</div>
                <div className="text-[10px] text-emerald-700 mt-0.5">
                  {gltRecords.length} Inspections
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-amber-200 bg-amber-50/50">
                <div className="font-bold text-amber-900">Dynotest_Engine_Log</div>
                <div className="text-[10px] text-amber-700 mt-0.5">
                  {dynoRecords.length} Engine Tests
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/50">
                <div className="font-bold text-purple-900">Hydraulic_Bench_Log</div>
                <div className="text-[10px] text-purple-700 mt-0.5">
                  {hydraulicRecords.length} Bench Tests
                </div>
              </div>

              <div className="p-2.5 rounded-lg border border-cyan-200 bg-cyan-50/50 col-span-2 sm:col-span-1">
                <div className="font-bold text-cyan-900">PPC_Priority_Queue</div>
                <div className="text-[10px] text-cyan-700 mt-0.5">
                  {queueRecords.length} Queue Jobs
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-colors"
          >
            Close
          </button>

          <div className="flex items-center space-x-2">
            {config.spreadsheetId && (
              <button
                onClick={handlePushLatestData}
                disabled={!isConnected || isSyncing}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`}
                />
                <span>{isSyncing ? 'Syncing to Sheets...' : 'Sync Now'}</span>
              </button>
            )}

            {!config.spreadsheetId && (
              <button
                onClick={handleCreateNewSpreadsheet}
                disabled={!isConnected || isSyncing}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Master Sheet</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
