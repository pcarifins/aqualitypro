import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  testFirestoreConnection,
  saveDocument,
  removeDocument,
  subscribeToCollection,
} from '../lib/firestoreSync';
import {
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Zap,
  Server,
  Activity,
  UserCheck,
  Globe,
  Radio,
  Send,
  Trash2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { firebaseConfig } from '../lib/firebase';

interface DatabaseSyncTestProps {
  currentUser: User;
}

export const DatabaseSyncTest: React.FC<DatabaseSyncTestProps> = ({ currentUser }) => {
  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    message: string;
    timestamp: string;
    latencyMs: number;
  } | null>(null);

  const [isTestingPing, setIsTestingPing] = useState(false);
  const [syncTestDoc, setSyncTestDoc] = useState<any>(null);
  const [isSendingSync, setIsSendingSync] = useState(false);
  const [lastLiveMessage, setLastLiveMessage] = useState<string | null>(null);

  // Diagnostic State Metrics
  const [lastSnapshotTime, setLastSnapshotTime] = useState<string | null>(null);
  const [lastSuccessfulWrite, setLastSuccessfulWrite] = useState<string | null>(null);
  const [pendingWrite, setPendingWrite] = useState<boolean>(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);

  // Ping connection on load
  const handlePingTest = async () => {
    setIsTestingPing(true);
    const res = await testFirestoreConnection();
    setConnectionStatus(res);
    setIsTestingPing(false);
  };

  useEffect(() => {
    handlePingTest();

    // Subscribe to test collection for cross-device real-time sync verification
    const unsub = subscribeToCollection<any>('_sync_test', (items) => {
      const nowStr = new Date().toLocaleTimeString();
      setLastSnapshotTime(nowStr);

      const found = items.find((i) => i.id === 'device_test');
      if (found) {
        setSyncTestDoc(found);
        setLastLiveMessage(`Snapshot received at ${nowStr}: code='${found.code}', status='${found.status}'`);
      } else {
        setSyncTestDoc(null);
        setLastLiveMessage(`Snapshot received at ${nowStr}: No active UAT sync test record.`);
      }
    });

    return () => unsub();
  }, []);

  const handleInitiateSyncTest = async () => {
    setIsSendingSync(true);
    setPendingWrite(true);
    setLastSyncError(null);
    try {
      const testData = {
        id: 'device_test',
        code: 'SYNC-UAT-001',
        initiatedBy: currentUser.name,
        userRole: currentUser.role,
        status: 'TEST_INITIATED',
        timestamp: new Date().toISOString(),
        deviceOrigin: navigator.userAgent.substring(0, 40),
      };
      await saveDocument('_sync_test', testData);
      setLastSuccessfulWrite(new Date().toLocaleTimeString());
    } catch (err: any) {
      const msg = err?.message || 'Sync write failed';
      setLastSyncError(msg);
      alert(`Sync test failed: ${msg}`);
    } finally {
      setIsSendingSync(false);
      setPendingWrite(false);
    }
  };

  const handleSimulateDeviceBUpdate = async () => {
    setIsSendingSync(true);
    setPendingWrite(true);
    setLastSyncError(null);
    try {
      const testData = {
        id: 'device_test',
        code: 'SYNC-UAT-001',
        updatedBy: `${currentUser.name} (Terminal Device B)`,
        status: 'UPDATED_DEVICE_B',
        timestamp: new Date().toISOString(),
        deviceOrigin: 'Secondary Operational Terminal (Device B)',
      };
      await saveDocument('_sync_test', testData);
      setLastSuccessfulWrite(new Date().toLocaleTimeString());
    } catch (err: any) {
      const msg = err?.message || 'Device B update failed';
      setLastSyncError(msg);
      alert(`Device B simulation failed: ${msg}`);
    } finally {
      setIsSendingSync(false);
      setPendingWrite(false);
    }
  };

  const handleDeleteSyncTestDoc = async () => {
    setIsSendingSync(true);
    setPendingWrite(true);
    setLastSyncError(null);
    try {
      await removeDocument('_sync_test', 'device_test');
      setSyncTestDoc(null);
      setLastSuccessfulWrite(new Date().toLocaleTimeString());
    } catch (err: any) {
      const msg = err?.message || 'Deletion failed';
      setLastSyncError(msg);
      alert(`Delete UAT test record failed: ${msg}`);
    } finally {
      setIsSendingSync(false);
      setPendingWrite(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Database className="w-4 h-4" />
            <span>Database Synchronization & Multi-Device Diagnostics</span>
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Cloud Firestore Single Source of Truth Status
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Realtime synchronization diagnostic panel across all operational terminals and browser sessions.
          </p>
        </div>

        <button
          onClick={handlePingTest}
          disabled={isTestingPing}
          className="self-start sm:self-center px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center space-x-2 transition-colors shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isTestingPing ? 'animate-spin' : ''}`} />
          <span>{isTestingPing ? 'Pinging Database...' : 'Ping Connection'}</span>
        </button>
      </div>

      {/* Grid Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        {/* Project ID */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
            <Server className="w-3.5 h-3.5 text-blue-500" />
            <span>Firebase Project ID</span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-800 truncate" title={firebaseConfig.projectId}>
            {firebaseConfig.projectId || 'inductive-palisade-0f6jr'}
          </div>
        </div>

        {/* Database ID */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>Firestore Database ID</span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-800 truncate" title={firebaseConfig.firestoreDatabaseId}>
            {firebaseConfig.firestoreDatabaseId || '(default)'}
          </div>
        </div>

        {/* Connection Status */}
        <div className={`border rounded-xl p-3.5 space-y-1 ${
          connectionStatus?.connected
            ? 'bg-emerald-50/70 border-emerald-200'
            : 'bg-rose-50/70 border-rose-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-slate-600 text-[10px] uppercase font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Connection Status</span>
            </div>
            {connectionStatus?.connected ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
          </div>
          <div className="text-xs font-bold text-slate-900">
            {connectionStatus?.connected ? 'ACTIVE & ONLINE' : 'DISCONNECTED'}
            {connectionStatus?.latencyMs !== undefined && (
              <span className="text-[10px] text-slate-500 font-normal ml-1">
                ({connectionStatus.latencyMs} ms)
              </span>
            )}
          </div>
        </div>

        {/* User Session */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
          <div className="flex items-center space-x-1.5 text-slate-500 text-[10px] uppercase font-bold">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active Tester Session</span>
          </div>
          <div className="text-xs font-bold text-slate-800 truncate">
            {currentUser.name} ({currentUser.role})
          </div>
        </div>
      </div>

      {/* Sync Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-0.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1">
            <Clock className="w-3 h-3 text-blue-500" />
            <span>Last Snapshot</span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-800">
            {lastSnapshotTime || 'Waiting...'}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-0.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            <span>Last Successful Write</span>
          </div>
          <div className="text-xs font-mono font-bold text-slate-800">
            {lastSuccessfulWrite || 'None in current session'}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-0.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1">
            <Activity className="w-3 h-3 text-amber-500" />
            <span>Pending Write Status</span>
          </div>
          <div className={`text-xs font-mono font-bold ${pendingWrite ? 'text-amber-600 animate-pulse' : 'text-slate-700'}`}>
            {pendingWrite ? 'WRITE IN PROGRESS...' : 'IDLE (All writes confirmed)'}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-0.5">
          <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center space-x-1">
            <AlertCircle className="w-3 h-3 text-rose-500" />
            <span>Last Sync Error</span>
          </div>
          <div className={`text-xs font-mono font-bold truncate ${lastSyncError ? 'text-rose-600' : 'text-emerald-600'}`}>
            {lastSyncError || 'None (0 errors)'}
          </div>
        </div>
      </div>

      {/* Realtime Listener Status */}
      <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 shadow-inner">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Realtime Listener (onSnapshot Engine)
            </span>
          </div>
          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold rounded">
            ACTIVE & SUBSCRIBED
          </span>
        </div>

        <div className="text-xs text-slate-300 flex items-center space-x-2 font-mono">
          <Activity className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            {lastLiveMessage || 'Listening for live database changes across all registered operational collections...'}
          </span>
        </div>
      </div>

      {/* Interactive Sync Verification Tool */}
      <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Cross-Device Real-Time Sync Test Tool (UAT)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Verify that document updates written on one terminal appear instantly on all connected devices without page refresh.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleInitiateSyncTest}
            disabled={isSendingSync}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-xs transition-all disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Initiate Sync Test (Write SYNC-UAT-001)</span>
          </button>

          <button
            onClick={handleSimulateDeviceBUpdate}
            disabled={isSendingSync || !syncTestDoc}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl flex items-center space-x-2 shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Simulate Device B Update (UPDATED_DEVICE_B)</span>
          </button>

          <button
            onClick={handleDeleteSyncTestDoc}
            disabled={isSendingSync || !syncTestDoc}
            className="px-4 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 hover:border-rose-200 text-xs font-bold rounded-xl flex items-center space-x-2 transition-all disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Temporary UAT Record</span>
          </button>
        </div>

        {/* Live Test Document Display */}
        {syncTestDoc ? (
          <div className="bg-white border border-blue-200 rounded-xl p-3.5 text-xs font-mono space-y-1.5 shadow-2xs">
            <div className="text-[10px] font-sans font-bold text-blue-700 uppercase">
              Current Live Document (_sync_test/device_test)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800 text-[11px]">
              <div>
                <span className="text-slate-400">Code:</span>{' '}
                <span className="font-bold">{syncTestDoc.code}</span>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>{' '}
                <span className={`font-black px-1.5 py-0.5 rounded ${
                  syncTestDoc.status === 'UPDATED_DEVICE_B'
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-blue-100 text-blue-800 border border-blue-200'
                }`}>
                  {syncTestDoc.status}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Updated / Initiated By:</span>{' '}
                <span className="font-semibold">{syncTestDoc.updatedBy || syncTestDoc.initiatedBy || '-'}</span>
              </div>
              <div>
                <span className="text-slate-400">Timestamp:</span>{' '}
                <span className="text-slate-600">{syncTestDoc.timestamp}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-500 font-mono">
            No temporary UAT test record currently active. Click "Initiate Sync Test" to create SYNC-UAT-001.
          </div>
        )}
      </div>
    </div>
  );
};
