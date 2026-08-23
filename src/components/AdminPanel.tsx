import React, { useState, useEffect, useMemo } from 'react';
import {
  User,
  Assembler,
  ProductModel,
  ChecksheetTemplate,
  ChecksheetItem,
  TestingLine,
  TestOverride,
} from '../types';
import {
  Settings,
  Users,
  Wrench,
  Layers,
  Database,
  FileSpreadsheet,
  Activity,
  Clock,
  Sliders,
  FileText,
  Trash2,
  PlusCircle,
  Calendar,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';

import { AssemblerMasterTab } from './admin/AssemblerMasterTab';
import { ProductMasterTab } from './admin/ProductMasterTab';
import { ChecksheetMasterTab } from './admin/ChecksheetMasterTab';
import { UserMasterTab } from './admin/UserMasterTab';
import { DatabaseSyncTest } from './DatabaseSyncTest';
import { apiClient } from '../api/client';
import { store } from '../data/storageEngine';

interface AdminPanelProps {
  currentUser: User;
  users: User[];
  assemblers: Assembler[];
  productModels: ProductModel[];
  templates: ChecksheetTemplate[];
  checksheets?: ChecksheetItem[];
  testingLines: TestingLine[];
  onOpenSheetsModal?: () => void;
  onSaveAssembler: (assembler: Assembler) => Promise<void>;
  onDeleteAssembler: (id: string) => Promise<void>;
  onSaveProductModel: (model: ProductModel) => Promise<void>;
  onDeleteProductModel: (id: string) => Promise<void>;
  onSaveTemplate: (template: ChecksheetTemplate) => Promise<void>;
  onActivateTemplate: (templateId: string) => Promise<void>;
  onCreateRevision: (templateId: string) => Promise<ChecksheetTemplate | null>;
  onDuplicateTemplate: (templateId: string) => Promise<ChecksheetTemplate | null>;
  onDeleteTemplate: (templateId: string) => Promise<void>;
  onSaveUser: (user: User) => Promise<void>;
  onDeleteUser: (id: string) => Promise<void>;
  onChangePassword: (userId: string, newPass: string) => Promise<boolean>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  users,
  assemblers,
  productModels,
  templates,
  testingLines,
  onOpenSheetsModal,
  onSaveAssembler,
  onDeleteAssembler,
  onSaveProductModel,
  onDeleteProductModel,
  onSaveTemplate,
  onActivateTemplate,
  onCreateRevision,
  onDuplicateTemplate,
  onDeleteTemplate,
  onSaveUser,
  onDeleteUser,
  onChangePassword,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'checksheet'
    | 'product'
    | 'assembler'
    | 'users'
    | 'sync'
    | 'testingLines'
    | 'operatingHours'
    | 'testOverride'
    | 'auditLogs'
  >('testingLines');

  // Real-time local state for Test Overrides and Audit Logs
  const [testOverrides, setTestOverrides] = useState<TestOverride[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Form State for Test Override
  const [ovrJoNumber, setOvrJoNumber] = useState('');
  const [ovrLineId, setOvrLineId] = useState('');
  const [ovrDuration, setOvrDuration] = useState(60);
  const [ovrReason, setOvrReason] = useState('');

  // Selected testing line for Operating Hours edit
  const [selectedLineId, setSelectedLineId] = useState<string>('');
  const [ohDays, setOhDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  const [ohStart, setOhStart] = useState('08:00');
  const [ohEnd, setOhEnd] = useState('17:00');
  const [ohBreak, setOhBreak] = useState(60);

  // Search filter states
  const [overrideSearch, setOverrideSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');

  // Sync testOverrides and auditLogs from global reactive store
  const loadConfigData = async () => {
    const [ovrs, logs] = await Promise.all([
      apiClient.getTestOverrides(),
      apiClient.getAuditLogs(),
    ]);
    setTestOverrides(ovrs || []);
    setAuditLogs(logs || []);
  };

  useEffect(() => {
    loadConfigData();
    const unsubscribe = store.subscribe(() => {
      loadConfigData();
    });
    return () => unsubscribe();
  }, []);

  // When selectedLineId changes, prefill Operating Hours fields
  useEffect(() => {
    if (selectedLineId) {
      const line = testingLines.find((l) => l.id === selectedLineId);
      if (line) {
        setOhDays(line.operatingDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
        setOhStart(line.startTime || '08:00');
        setOhEnd(line.endTime || '17:00');
        setOhBreak(line.breakMinutes || 60);
      }
    } else if (testingLines.length > 0) {
      setSelectedLineId(testingLines[0].id);
    }
  }, [selectedLineId, testingLines]);

  // Dynamic Net Operating Hours Calculation
  const calculatedNetHours = useMemo(() => {
    if (!ohStart || !ohEnd) return 0;
    const [sH, sM] = ohStart.split(':').map(Number);
    const [eH, eM] = ohEnd.split(':').map(Number);
    if (isNaN(sH) || isNaN(eH)) return 0;
    const totalMins = (eH * 60 + (eM || 0)) - (sH * 60 + (sM || 0));
    return Math.max(0, totalMins - ohBreak) / 60;
  }, [ohStart, ohEnd, ohBreak]);

  // Handle Save Testing Line settings
  const handleSaveLineSettings = async (line: TestingLine, field: keyof TestingLine, value: any) => {
    try {
      const updatedLine = { ...line, [field]: value, updatedAt: new Date().toISOString() };
      await apiClient.saveTestingLine(updatedLine, currentUser.name);
      showTemporarySuccess('Testing Line updated successfully');
    } catch (err: any) {
      setActionError(err.message || 'Failed to update line settings');
    }
  };

  // Handle Save Operating Hours
  const handleSaveOperatingHours = async () => {
    if (!selectedLineId) return;
    setIsActionLoading(true);
    setActionError(null);
    try {
      const line = testingLines.find((l) => l.id === selectedLineId);
      if (!line) throw new Error('Testing Line not found');

      const updatedLine: TestingLine = {
        ...line,
        operatingDays: ohDays,
        startTime: ohStart,
        endTime: ohEnd,
        breakMinutes: ohBreak,
        netOperatingMinutes: calculatedNetHours * 60,
        operatingHoursPerDay: calculatedNetHours,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.name,
      };

      await apiClient.saveTestingLine(updatedLine, currentUser.name);
      showTemporarySuccess(`Operating Hours saved for ${line.name}`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to save operating hours');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Handle Save Test Override
  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ovrJoNumber || !ovrLineId) {
      setActionError('Please specify both a JO/RO number and a Testing Line.');
      return;
    }
    setIsActionLoading(true);
    setActionError(null);
    try {
      const line = testingLines.find((l) => l.id === ovrLineId);
      if (!line) throw new Error('Testing Line not found');

      const newOverride: TestOverride = {
        id: `override-${Date.now()}`,
        joRoNumber: ovrJoNumber.trim().toUpperCase(),
        testingLineId: ovrLineId,
        process: line.process,
        defaultDuration: line.standardDurationMinutes || 60,
        overrideDuration: ovrDuration,
        reason: ovrReason.trim() || 'Custom operational requirement',
        active: true,
        changedBy: currentUser.name,
        changedAt: new Date().toISOString(),
      };

      await apiClient.saveTestOverride(newOverride, currentUser.name);
      showTemporarySuccess(`Planning Override created for JO ${newOverride.joRoNumber}`);
      setOvrJoNumber('');
      setOvrReason('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to create override');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Disable / Remove Override
  const handleDisableOverride = async (id: string) => {
    setIsActionLoading(true);
    setActionError(null);
    try {
      await apiClient.deleteTestOverride(id, currentUser.name);
      showTemporarySuccess('Override removed and logged');
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove override');
    } finally {
      setIsActionLoading(false);
    }
  };

  const showTemporarySuccess = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  // Filtered lists
  const filteredOverrides = useMemo(() => {
    return testOverrides.filter((o) => {
      if (!overrideSearch) return true;
      const s = overrideSearch.toUpperCase();
      return (
        o.joRoNumber.toUpperCase().includes(s) ||
        o.testingLineId.toUpperCase().includes(s) ||
        o.reason.toUpperCase().includes(s)
      );
    });
  }, [testOverrides, overrideSearch]);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((l) => {
      if (!auditSearch) return true;
      const s = auditSearch.toUpperCase();
      return (
        (l.action || '').toUpperCase().includes(s) ||
        (l.userName || '').toUpperCase().includes(s) ||
        (l.details || '').toUpperCase().includes(s)
      );
    });
  }, [auditLogs, auditSearch]);

  const roleUpper = (currentUser.role || '').toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || currentUser.role === 'administrator';

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const renderAuditLogs = () => {
    return (
      <div className="space-y-4">
        <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">Live System Audit Logs</h3>
            <p className="text-xs text-slate-500">Chronological history of operational updates and database changes across lines</p>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
            <input
              type="text"
              placeholder="Search events, users, logs..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              className="w-full sm:w-[250px] px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase sticky top-0 z-10 shadow-3xs">
                  <th className="px-3 py-2">Timestamp</th>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">User / Operator</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-slate-400 font-medium">
                      No audit events recorded matching filter
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isOvr = (log.action || '').startsWith('TEST_OVERRIDE');
                    const isHrs = log.action === 'OPERATING_HOURS_UPDATED';
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2.5 font-mono text-slate-400 text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-black tracking-tight px-2 py-0.5 rounded-full ${
                              isOvr
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : isHrs
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-bold text-slate-700 whitespace-nowrap">
                          {log.userName}{' '}
                          <span className="text-[10px] font-bold text-slate-400 uppercase">({log.userRole || 'Admin'})</span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600 font-medium">{log.details}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-12 font-sans selection:bg-blue-600 selection:text-white">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">
              Settings & Operational Logs
            </h1>
            <p className="text-xs text-slate-500">
              Manage shift hours, standard duration overrides, and view live system audit history
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenSheetsModal && (
            <button
              type="button"
              onClick={onOpenSheetsModal}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors shrink-0 shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Google Sheets Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Feedback alerts */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-3 rounded-xl flex items-center space-x-2 animate-in fade-in duration-150 shadow-2xs">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs font-semibold px-4 py-3 rounded-xl flex items-center space-x-2 animate-in fade-in duration-150 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Navigation Sub-sections */}
      <div className="space-y-4">
        {/* Section 1: System Configuration */}
        <div className="space-y-2">
          <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block">
            System Configuration
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('testingLines')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'testingLines'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>1. Testing Lines</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('operatingHours')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'operatingHours'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>2. Operating Hours</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('testOverride')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'testOverride'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>3. Test Override</span>
            </button>
          </div>
        </div>

        {/* Section 2: Master Data Management */}
        {isAdmin && (
          <div className="space-y-2">
            <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase block">
              Master Data & RBAC
            </span>
            <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3">
              <button
                type="button"
                onClick={() => setActiveTab('checksheet')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'checksheet'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Checksheet Templates</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('product')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'product'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Product Master</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('assembler')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'assembler'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Assemblers</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('users')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'users'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Users & RBAC</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('sync')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'sync'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span>Sync Test</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Render Active Tab Panels */}
      <div className="space-y-6">
        {['testingLines', 'operatingHours', 'testOverride'].includes(activeTab) ? (
          <>
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs animate-in fade-in duration-150">
              {/* TAB 1: TESTING LINES */}
              {activeTab === 'testingLines' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900">1. Testing Line Parameters Setup</h3>
                    <p className="text-xs text-slate-500">Configure core standard planning durations and targets for each testing line</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {testingLines.map((line) => (
                      <div
                        key={line.id}
                        className={`p-4 rounded-xl border space-y-3 transition-all ${
                          line.active ? 'bg-white border-slate-200 shadow-2xs' : 'bg-slate-50 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-black uppercase bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-sm mr-2">
                              {line.process}
                            </span>
                            <strong className="text-xs font-black text-slate-800">{line.name}</strong>
                          </div>

                          <label className="flex items-center space-x-1.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={line.active}
                              onChange={(e) => handleSaveLineSettings(line, 'active', e.target.checked)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                            />
                            <span className="text-xs font-bold text-slate-600">Active</span>
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Standard Duration (Min)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="600"
                              value={line.standardDurationMinutes}
                              onChange={(e) =>
                                handleSaveLineSettings(line, 'standardDurationMinutes', parseInt(e.target.value) || 60)
                              }
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                              Daily Target (Units)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="100"
                              value={line.dailyTarget || 4}
                              onChange={(e) =>
                                handleSaveLineSettings(line, 'dailyTarget', parseInt(e.target.value) || 4)
                              }
                              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: OPERATING HOURS */}
              {activeTab === 'operatingHours' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900">2. Operating Hours Configuration</h3>
                    <p className="text-xs text-slate-500">Configure custom daily start/end times and break parameters per testing line</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left Selector */}
                    <div className="lg:col-span-1 space-y-2">
                      <label className="block text-xs font-bold text-slate-700">Select Testing Line</label>
                      <div className="space-y-1.5">
                        {testingLines.map((line) => (
                          <button
                            key={line.id}
                            type="button"
                            onClick={() => setSelectedLineId(line.id)}
                            className={`w-full text-left p-3 rounded-xl border text-xs font-bold flex items-center justify-between transition-all ${
                              selectedLineId === line.id
                                ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span>{line.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {line.startTime || '08:00'} - {line.endTime || '17:00'}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right Settings Form */}
                    <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center space-x-1.5">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span>Configuring Shift for: {testingLines.find((l) => l.id === selectedLineId)?.name}</span>
                      </h4>

                      {/* Operating Days */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-700">Operating Days</label>
                        <div className="flex flex-wrap gap-1.5">
                          {daysOfWeek.map((day) => {
                            const isSelected = ohDays.includes(day);
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setOhDays(ohDays.filter((d) => d !== day));
                                  } else {
                                    setOhDays([...ohDays, day]);
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                  isSelected
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Times */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Shift Start Time</label>
                          <input
                            type="time"
                            value={ohStart}
                            onChange={(e) => setOhStart(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Shift End Time</label>
                          <input
                            type="time"
                            value={ohEnd}
                            onChange={(e) => setOhEnd(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Break Duration (Min)</label>
                          <input
                            type="number"
                            min="0"
                            max="240"
                            step="10"
                            value={ohBreak}
                            onChange={(e) => setOhBreak(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      {/* Calculation Stats Card */}
                      <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-500 uppercase block leading-none mb-1">
                            Calculated Available Shift Time
                          </span>
                          <strong className="text-xs text-blue-950 font-black">
                            {ohStart} to {ohEnd} less {ohBreak}m breaks
                          </strong>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block leading-none mb-1">
                            Net Operating Hours
                          </span>
                          <strong className="text-sm text-blue-700 font-black font-mono">
                            {calculatedNetHours.toFixed(1)} Hrs / Day
                          </strong>
                        </div>
                      </div>

                      {/* Save Operating Hours Button */}
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleSaveOperatingHours}
                          disabled={isActionLoading || ohDays.length === 0}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 shadow-sm transition-all"
                        >
                          <Check className="w-4 h-4" />
                          <span>{isActionLoading ? 'Saving...' : 'Save Operating Hours'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TEST OVERRIDE */}
              {activeTab === 'testOverride' && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900">3. Test Planning Duration Override</h3>
                    <p className="text-xs text-slate-500">Temporarily override standard test durations for specific JOs (applies purely to capacity planning & schedule queues)</p>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Form Side */}
                    <div className="lg:col-span-1 bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <form onSubmit={handleCreateOverride} className="space-y-3.5">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center space-x-1.5 mb-2">
                          <PlusCircle className="w-4 h-4 text-blue-600" />
                          <span>Create Overriding Planning</span>
                        </h4>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">JO/RO Number</label>
                          <input
                            type="text"
                            placeholder="e.g. 241009883"
                            value={ovrJoNumber}
                            onChange={(e) => setOvrJoNumber(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold uppercase tracking-tight focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Testing Line</label>
                          <select
                            value={ovrLineId}
                            onChange={(e) => setOvrLineId(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">-- Choose Line --</option>
                            {testingLines.filter((l) => l.active).map((line) => (
                              <option key={line.id} value={line.id}>
                                {line.name} ({line.process})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Override Duration (Minutes)</label>
                          <input
                            type="number"
                            min="5"
                            max="1440"
                            step="5"
                            value={ovrDuration}
                            onChange={(e) => setOvrDuration(parseInt(e.target.value) || 60)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Override</label>
                          <textarea
                            placeholder="e.g. Prototype test with custom validation procedures"
                            value={ovrReason}
                            onChange={(e) => setOvrReason(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <button
                          type="submit"
                          disabled={isActionLoading}
                          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 shadow-sm transition-all pt-2.5"
                        >
                          <span>{isActionLoading ? 'Saving...' : 'Activate Override'}</span>
                        </button>
                      </form>
                    </div>

                    {/* Table / List Side */}
                    <div className="lg:col-span-2 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">
                          Active Duration Overrides ({filteredOverrides.length})
                        </h4>
                        <input
                          type="text"
                          placeholder="Search overrides..."
                          value={overrideSearch}
                          onChange={(e) => setOverrideSearch(e.target.value)}
                          className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-blue-500 max-w-[200px]"
                        />
                      </div>

                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase">
                                <th className="px-3 py-2">JO/RO</th>
                                <th className="px-3 py-2">Line</th>
                                <th className="px-3 py-2 text-center">Std / Overridden</th>
                                <th className="px-3 py-2">Reason</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {filteredOverrides.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-3 py-8 text-center text-slate-400 font-medium">
                                    No active planning overrides configured
                                  </td>
                                </tr>
                              ) : (
                                filteredOverrides.map((ovr) => (
                                  <tr key={ovr.id} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2.5 font-bold text-slate-900 tracking-tight">{ovr.joRoNumber}</td>
                                    <td className="px-3 py-2.5 font-semibold text-slate-600">
                                      {testingLines.find((l) => l.id === ovr.testingLineId)?.name || ovr.testingLineId}
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-mono font-semibold">
                                      <span className="line-through text-slate-400 mr-1.5">{ovr.defaultDuration}m</span>
                                      <span className="text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-md">{ovr.overrideDuration}m</span>
                                    </td>
                                    <td className="px-3 py-2.5 text-slate-500 max-w-[180px] truncate" title={ovr.reason}>
                                      {ovr.reason}
                                    </td>
                                    <td className="px-3 py-2.5 text-right">
                                      <button
                                        type="button"
                                        onClick={() => handleDisableOverride(ovr.id)}
                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                                        title="Disable Override"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Always render audit logs directly below active operational tabs */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs animate-in fade-in duration-150">
              {renderAuditLogs()}
            </div>
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs animate-in fade-in duration-150">
            {/* ORIGINAL MASTER DATA TABS */}
            {activeTab === 'checksheet' && isAdmin && (
              <ChecksheetMasterTab
                templates={templates}
                onSaveTemplate={onSaveTemplate}
                onActivateTemplate={onActivateTemplate}
                onCreateRevision={onCreateRevision}
                onDuplicateTemplate={onDuplicateTemplate}
                onDeleteTemplate={onDeleteTemplate}
              />
            )}

            {activeTab === 'product' && isAdmin && (
              <ProductMasterTab
                productModels={productModels}
                onSaveProductModel={onSaveProductModel}
                onDeleteProductModel={onDeleteProductModel}
              />
            )}

            {activeTab === 'assembler' && isAdmin && (
              <AssemblerMasterTab
                assemblers={assemblers}
                onSaveAssembler={onSaveAssembler}
                onDeleteAssembler={onDeleteAssembler}
              />
            )}

            {activeTab === 'users' && isAdmin && (
              <UserMasterTab
                users={users}
                onSaveUser={onSaveUser}
                onDeleteUser={onDeleteUser}
                onChangePassword={onChangePassword}
              />
            )}

            {activeTab === 'sync' && isAdmin && (
              <DatabaseSyncTest currentUser={currentUser} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};
