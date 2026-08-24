import React, { useState, useEffect, useMemo } from 'react';
import {
  ListOrdered,
  AlertTriangle,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  Info,
  Check,
  X,
  History,
  Gauge,
  Calendar,
} from 'lucide-react';
import { QueueRecord, CompGroup, UserRole, ProductModel, TestingLine, TestOverride } from '../types';
import { apiClient } from '../api/client';
import { store } from '../data/storageEngine';
import { calculateOverallCapacity, calculateScheduleForQueue } from '../utils/capacityCalculator';
import { CapacityKPICards } from './CapacityKPICards';
import { TestingLinesCapacitySection } from './TestingLinesCapacitySection';
import { LineSetupModal } from './LineSetupModal';

interface PriorityQueueProps {
  currentUserRole: UserRole | string;
  currentUserName: string;
  onOpenJODetail: (joNumber: string) => void;
  onStartTest?: (joNumber: string, compGroup: CompGroup) => void;
}

export const PriorityQueue: React.FC<PriorityQueueProps> = ({
  currentUserRole,
  currentUserName,
  onOpenJODetail,
  onStartTest,
}) => {
  const [selectedCompGroup, setSelectedCompGroup] = useState<CompGroup>('Engine');
  const [queueList, setQueueList] = useState<QueueRecord[]>([]);
  const [productModels, setProductModels] = useState<ProductModel[]>([]);
  const [testingLines, setTestingLines] = useState<TestingLine[]>([]);
  const [testOverrides, setTestOverrides] = useState<TestOverride[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingJO, setIsSubmittingJO] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReorderModal, setShowReorderModal] = useState(false);
  const [showUrgentModal, setShowUrgentModal] = useState(false);
  const [showLineSetupModal, setShowLineSetupModal] = useState(false);
  const [selectedQueueItem, setSelectedQueueItem] = useState<QueueRecord | null>(null);
  const [targetPriority, setTargetPriority] = useState<number>(1);
  const [reorderRemark, setReorderRemark] = useState('');
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // New JO Form State
  const [newJoNumber, setNewJoNumber] = useState('');
  const [newUnitModel, setNewUnitModel] = useState('');
  const [newComponent, setNewComponent] = useState('');
  const [selectedProductModelId, setSelectedProductModelId] = useState('');
  const [newSubGroup, setNewSubGroup] = useState<'PT' | 'PPM' | ''>('');
  const [newTestType, setNewTestType] = useState<'PROD' | 'RETEST'>('PROD');
  const [newPlannedPriority, setNewPlannedPriority] = useState<number>(1);
  const [newCustomer, setNewCustomer] = useState('');
  const [newPartNumber, setNewPartNumber] = useState('');
  const [newSerialNumber, setNewSerialNumber] = useState('');
  const [newMechanic, setNewMechanic] = useState('');
  const [newIsUrgent, setNewIsUrgent] = useState(false);

  // SharePoint Integration state
  const [sharepointStatus, setSharepointStatus] = useState<any>(null);
  const [showSharepointPreviewModal, setShowSharepointPreviewModal] = useState(false);
  const [sharepointPreviewData, setSharepointPreviewData] = useState<any>(null);
  const [showWorkbookEditorModal, setShowWorkbookEditorModal] = useState(false);
  const [workbookRows, setWorkbookRows] = useState<any[]>([]);
  const [isPopulatingDummy, setIsPopulatingDummy] = useState(false);
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [showEditRowModal, setShowEditRowModal] = useState(false);
  const [isSyncingCommit, setIsSyncingCommit] = useState(false);

  const loadSharepointStatus = async () => {
    try {
      const { sharepointService } = await import('../services/sharepointService');
      const status = await sharepointService.getStatus();
      setSharepointStatus(status);
    } catch (e) {
      console.error('Failed to load SharePoint status:', e);
    }
  };

  const handleManageUatWorkbook = async () => {
    try {
      const { sharepointService } = await import('../services/sharepointService');
      const status = await sharepointService.getStatus();
      const rows = await fetch('/api/sharepoint/preview').then(r => r.json());
      setWorkbookRows(rows.items || []);
      setShowWorkbookEditorModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRepopulateDummy = async () => {
    try {
      setIsPopulatingDummy(true);
      const { sharepointService } = await import('../services/sharepointService');
      await sharepointService.populateDummy();
      await loadSharepointStatus();
      setSyncFeedback('UAT Dummy Data populated with 15 valid Product Master rows!');
      setTimeout(() => setSyncFeedback(null), 5000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsPopulatingDummy(false);
    }
  };

  const handleSaveWorkbookRow = async (updatedRow: any) => {
    try {
      const { sharepointService } = await import('../services/sharepointService');
      await sharepointService.updateWorkbookRow(updatedRow);
      const previewRes = await sharepointService.getPreview();
      setWorkbookRows(previewRes.items || []);
      await loadSharepointStatus();
    } catch (e) {
      console.error(e);
    }
  };

  const roleUpper = (currentUserRole || '').toUpperCase();
  const canReorder = roleUpper === 'PPC' || roleUpper === 'SUPERVISOR' || roleUpper === 'ADMIN';

  const loadQueue = async () => {
    setIsLoading(true);
    const records = await apiClient.getQueueRecords();
    setQueueList(records);
    setIsLoading(false);
  };

  const loadProductModels = async () => {
    const models = await apiClient.getProductModels(true);
    setProductModels(models || []);
  };

  const loadTestingLines = async () => {
    const lines = await apiClient.getTestingLines();
    setTestingLines(lines || []);
  };

  const loadTestOverrides = async () => {
    const overrides = await apiClient.getTestOverrides();
    setTestOverrides(overrides || []);
  };

  useEffect(() => {
    loadQueue();
    loadProductModels();
    loadTestingLines();
    loadTestOverrides();
    loadSharepointStatus();

    const unsubscribe = store.subscribe(() => {
      loadQueue();
      loadTestingLines();
      loadTestOverrides();
      loadSharepointStatus();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Compute Overall Capacity & Line Statistics
  const overallCapacityStats = useMemo(() => {
    return calculateOverallCapacity(queueList, testingLines, testOverrides);
  }, [queueList, testingLines, testOverrides]);

  const handleAssignTestingLine = async (queueRecordId: string, testingLineId: string) => {
    try {
      const { store } = await import('../data/storageEngine');
      await store.updateQueueRecord(queueRecordId, { testingLineId });
      await loadQueue();
    } catch (err) {
      console.error('Failed to update testing line assignment:', err);
    }
  };

  // Filter Product Models by selected Queue / CompGroup
  const eligibleProductModels = useMemo(() => {
    return productModels.filter((m) => {
      if (m.active === false) return false;
      if (m.compGroup === selectedCompGroup) return true;
      if (selectedCompGroup === 'Engine' && (m.category === 'Engine' || m.modelName?.toLowerCase().includes('engine'))) return true;
      if (
        selectedCompGroup === 'PT-PPM' &&
        (m.category === 'Power Train' || m.category === 'PPM' || m.category === 'PT-PPM' || m.category === 'Power Train Component')
      )
        return true;
      if (selectedCompGroup === 'Cylinder' && m.category === 'Cylinder') return true;
      return false;
    });
  }, [productModels, selectedCompGroup]);

  // Unique Unit Models for dropdown
  const availableUnitModels = useMemo(() => {
    return Array.from(
      new Set(eligibleProductModels.map((m) => m.unitModel.trim().toUpperCase()))
    ).sort();
  }, [eligibleProductModels]);

  // Dependent Component options based on selected Unit Model
  const availableComponents = useMemo(() => {
    if (!newUnitModel) return [];
    return Array.from(
      new Set(
        eligibleProductModels
          .filter((m) => m.unitModel.trim().toUpperCase() === newUnitModel.trim().toUpperCase())
          .map((m) => (m.component || m.compName || '').trim().toUpperCase())
          .filter(Boolean)
      )
    ).sort();
  }, [eligibleProductModels, newUnitModel]);

  // Filter queue by Comp Group & Search
  const filteredGroupQueue = queueList.filter((q) => {
    if (q.compGroup !== selectedCompGroup) return false;
    if (searchQuery.trim()) {
      const s = searchQuery.trim().toUpperCase();
      const matchJO = q.joRoNumber.toUpperCase().includes(s);
      const matchUnit = q.unitModel.toUpperCase().includes(s);
      const matchComp = q.component.toUpperCase().includes(s);
      const matchCust = q.customer?.toUpperCase().includes(s) || false;
      if (!matchJO && !matchUnit && !matchComp && !matchCust) return false;
    }
    return true;
  });

  const urgentUnassigned = filteredGroupQueue.filter((q) => q.isUrgentUnassigned && q.status === 'WAITING');
  const rankedQueue = filteredGroupQueue
    .filter((q) => !q.isUrgentUnassigned)
    .sort((a, b) => {
      // ON_PROCESS jobs first, then WAITING by priority, then FINISH
      if (a.status === 'ON_PROCESS' && b.status !== 'ON_PROCESS') return -1;
      if (b.status === 'ON_PROCESS' && a.status !== 'ON_PROCESS') return 1;
      if (a.status === 'FINISH' && b.status !== 'FINISH') return 1;
      if (b.status === 'FINISH' && a.status !== 'FINISH') return -1;
      return a.currentPriority - b.currentPriority;
    });

  // Compute Schedule (Est Start/Finish) for Ranked Queue
  const scheduledRankedQueue = useMemo(() => {
    return calculateScheduleForQueue(rankedQueue, testingLines, testOverrides);
  }, [rankedQueue, testingLines, testOverrides]);

  const handleSyncPPC = async () => {
    try {
      setIsLoading(true);
      const { sharepointService } = await import('../services/sharepointService');
      const preview = await sharepointService.getPreview();
      setSharepointPreviewData(preview);
      setShowSharepointPreviewModal(true);
      await loadSharepointStatus();
    } catch (err: any) {
      setSyncFeedback(`Error loading SharePoint Excel: ${err?.message || err}`);
      setTimeout(() => setSyncFeedback(null), 6000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveUp = (item: QueueRecord) => {
    if (!canReorder || item.priorityLocked || item.status === 'ON_PROCESS') return;
    if (item.currentPriority <= 1) return;
    setSelectedQueueItem(item);
    setTargetPriority(item.currentPriority - 1);
    setReorderRemark(`Promoted priority from ${item.currentPriority} to ${item.currentPriority - 1}`);
    setShowReorderModal(true);
  };

  const handleMoveDown = (item: QueueRecord) => {
    if (!canReorder || item.priorityLocked || item.status === 'ON_PROCESS') return;
    setSelectedQueueItem(item);
    setTargetPriority(item.currentPriority + 1);
    setReorderRemark(`Deprioritized from ${item.currentPriority} to ${item.currentPriority + 1}`);
    setShowReorderModal(true);
  };

  const handleConfirmReorder = async () => {
    if (!selectedQueueItem || !reorderRemark.trim()) return;
    await apiClient.reorderQueue(
      selectedQueueItem.compGroup,
      selectedQueueItem.queueRecordId,
      targetPriority,
      currentUserName,
      reorderRemark.trim()
    );
    setShowReorderModal(false);
    setSelectedQueueItem(null);
    setReorderRemark('');
    await loadQueue();
  };

  const handleOpenAssignUrgent = (item: QueueRecord) => {
    setSelectedQueueItem(item);
    setTargetPriority(1);
    setReorderRemark('Urgent breakdown job prioritized for testing');
    setShowUrgentModal(true);
  };

  const handleConfirmAssignUrgent = async () => {
    if (!selectedQueueItem || !reorderRemark.trim()) return;
    await apiClient.assignUrgentPriority(
      selectedQueueItem.queueRecordId,
      targetPriority,
      currentUserName,
      reorderRemark.trim()
    );
    setShowUrgentModal(false);
    setSelectedQueueItem(null);
    setReorderRemark('');
    await loadQueue();
  };

  const handleApplyAI = async (item: QueueRecord) => {
    if (!canReorder) return;
    await apiClient.applyAIRecommendation(item.queueRecordId, currentUserName);
    await loadQueue();
  };

  const handleSaveNewJO = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanJo = newJoNumber.trim().toUpperCase();
    if (!cleanJo) {
      setFormError('Please enter a valid JO / RO Number.');
      return;
    }
    if (!newUnitModel) {
      setFormError('Please select a Unit Model from Product Master.');
      return;
    }
    if (!newComponent) {
      setFormError('Please select a Component from Product Master.');
      return;
    }

    // Check duplicate active JO (STEP 28)
    const activeExists = queueList.some(
      (q) => q.status !== 'FINISH' && q.joRoNumber.trim().toUpperCase() === cleanJo
    );
    if (activeExists) {
      setFormError('JO / RO Number already exists in the active queue.');
      return;
    }

    // Normal JO priority = highest active ranked priority + 1 (STEP 19)
    const activeRankedInGroup = queueList.filter(
      (q) =>
        q.compGroup === selectedCompGroup &&
        !q.isUrgentUnassigned &&
        (q.status === 'WAITING' || q.status === 'ON_PROCESS')
    );
    const maxPrio = activeRankedInGroup.reduce(
      (max, q) => Math.max(max, q.currentPriority || 0),
      0
    );
    const nextPrio = maxPrio + 1;
    const assignedPriority = newIsUrgent ? 999 : nextPrio;

    const newRecord: QueueRecord = {
      queueRecordId: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      joRoNumber: cleanJo,
      compGroup: selectedCompGroup,
      productModelId: selectedProductModelId || undefined,
      subGroup: selectedCompGroup === 'PT-PPM' ? newSubGroup || null : null,
      unitModel: newUnitModel.trim().toUpperCase(),
      component: newComponent.trim().toUpperCase(),
      testType: newTestType,
      plannedPriority: assignedPriority,
      currentPriority: assignedPriority,
      isUrgentUnassigned: newIsUrgent,
      status: 'WAITING',
      priorityLocked: false,
      customer: newCustomer.trim() || 'Internal Stock',
      partNumber: newPartNumber.trim(),
      serialNumber: newSerialNumber.trim(),
      assemblyMechanic: newMechanic.trim() || 'Unassigned',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      history: [
        {
          oldPriority: 0,
          newPriority: assignedPriority,
          remark: `Manually added to queue by ${currentUserName}`,
          changedBy: currentUserName,
          changedAt: new Date().toISOString(),
        },
      ],
    };

    if (newTestType === 'RETEST') {
      newRecord.aiRecommendation = {
        suggestedPriority: 1,
        reason: 'Retest inspection required before release.',
      };
    }

    try {
      setIsSubmittingJO(true);
      const { store } = await import('../data/storageEngine');
      await store.addQueueRecord(newRecord, currentUserName);

      setShowAddModal(false);
      setNewJoNumber('');
      setNewUnitModel('');
      setNewComponent('');
      setSelectedProductModelId('');
      setNewCustomer('');
      setNewPartNumber('');
      setNewSerialNumber('');
      setNewMechanic('');
      setNewIsUrgent(false);
      setFormError(null);
      await loadQueue();
    } catch (err: any) {
      setFormError(`Failed to save JO to Firestore: ${err?.message || 'Network error'}`);
    } finally {
      setIsSubmittingJO(false);
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-6xl mx-auto px-2 sm:px-4 pt-3">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider mb-1">
            <ListOrdered className="w-4 h-4 text-blue-400" />
            <span>Production Planning & Control</span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            PRIORITY & CAPACITY
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Testing Queue Planning & Capacity Management for Engine, Power Train (PT-PPM), and Cylinder.
            {canReorder
              ? ' You have authority to adjust priorities, allocate lines, and schedule urgent jobs.'
              : ' Read-only view for testing station operators.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSyncPPC}
            disabled={isLoading}
            className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Sync PPC Source</span>
          </button>

          {canReorder && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Manual JO</span>
            </button>
          )}
        </div>
      </div>

      {syncFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* SharePoint PPC Integration Status Panel */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
              <RefreshCw className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold tracking-wider text-blue-600 uppercase">SharePoint Integration</span>
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  sharepointStatus?.graphConfigured 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {sharepointStatus?.graphConfigured ? 'LIVE GRAPH (CONNECTED)' : 'UAT SIMULATOR (ACTIVE)'}
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-800 mt-0.5 flex items-center space-x-1.5">
                <span>Priority Testing - PPC.xlsx</span>
              </h3>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleSyncPPC}
              className="px-3.5 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-blue-500 transition-all flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sync Now (Preview)</span>
            </button>
            <button
              onClick={handleManageUatWorkbook}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
            >
              <span>Edit Simulated Excel</span>
            </button>
            <button
              onClick={handleRepopulateDummy}
              disabled={isPopulatingDummy}
              className="px-3.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition-all border border-amber-200 disabled:opacity-50"
            >
              {isPopulatingDummy ? 'Generating...' : 'Reset 15 UAT Rows'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <div className="bg-slate-50 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">Total Excel Rows</span>
            <span className="text-lg font-extrabold text-slate-800">{sharepointStatus?.rowsCount ?? 0}</span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">Last Synced</span>
            <span className="text-xs font-semibold text-slate-800 truncate block mt-1">
              {sharepointStatus?.lastSyncTime ? new Date(sharepointStatus.lastSyncTime).toLocaleTimeString() : 'Never'}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">Last Excel Update</span>
            <span className="text-xs font-semibold text-slate-800 truncate block mt-1">
              {sharepointStatus?.lastFileModified ? new Date(sharepointStatus.lastFileModified).toLocaleDateString() : 'Unknown'}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">Sync Logs</span>
            <span className="text-xs font-semibold text-slate-800 truncate block mt-1">
              {sharepointStatus?.lastLog ? `${sharepointStatus.lastLog.rowsNew} Add, ${sharepointStatus.lastLog.rowsUpdated} Upd` : 'None'}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-medium uppercase font-sans">Sync Conflicts</span>
            <span className={`text-lg font-extrabold block ${sharepointStatus?.lastLog?.rowsConflict > 0 ? 'text-red-500' : 'text-slate-800'}`}>
              {sharepointStatus?.lastLog?.rowsConflict ?? 0}
            </span>
          </div>
          <div className="bg-slate-50 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 block font-medium uppercase">UAT Connection</span>
            <span className="text-xs font-bold text-green-600 block mt-1">CONNECTED</span>
          </div>
        </div>
      </div>

      {/* TOP KPI CARDS */}
      <CapacityKPICards stats={overallCapacityStats} />

      {/* TESTING LINES CAPACITY SECTION */}
      <TestingLinesCapacitySection
        summaries={overallCapacityStats.lineSummaries}
        onOpenSetup={() => setShowLineSetupModal(true)}
        canConfigure={canReorder}
      />

      {/* Component Group Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white border border-slate-200 rounded-2xl p-2 shadow-xs">
        <div className="flex space-x-1">
          {(['Engine', 'PT-PPM', 'Cylinder'] as CompGroup[]).map((group) => {
            const count = queueList.filter((q) => q.compGroup === group && q.status !== 'FINISH').length;
            const isSelected = selectedCompGroup === group;
            return (
              <button
                key={group}
                onClick={() => setSelectedCompGroup(group)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{group}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Filter */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Filter queue (JO, Unit, Model)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>
      </div>

      {/* 1. URGENT - UNASSIGNED JO SECTION */}
      {urgentUnassigned.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-200 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-rose-200/80 pb-2">
            <div className="flex items-center space-x-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
              <h3 className="text-xs font-black text-rose-900 uppercase tracking-wider">
                URGENT — UNASSIGNED JO ({urgentUnassigned.length})
              </h3>
            </div>
            <span className="text-[11px] text-rose-700 font-medium">
              Requires PPC / Supervisor Priority Allocation
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {urgentUnassigned.map((item) => (
              <div
                key={item.queueRecordId}
                className="bg-white border border-rose-300 rounded-xl p-3.5 shadow-xs flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-md uppercase">
                        URGENT
                      </span>
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {item.testType}
                      </span>
                      <span className="text-xs font-mono font-bold text-blue-900">
                        {item.joRoNumber}
                      </span>
                    </div>
                    <div className="text-xs font-black text-slate-900">
                      {item.unitModel} — {item.component}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Customer: {item.customer || '-'} | S/N: {item.serialNumber || '-'}
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenJODetail(item.joRoNumber)}
                    className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg transition-all"
                    title="View JO Details"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>

                {item.aiRecommendation && (
                  <div className="mt-2.5 bg-blue-50/80 border border-blue-200 rounded-lg p-2 flex items-center justify-between text-[11px]">
                    <div className="flex items-center space-x-1.5 text-blue-900">
                      <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>
                        AI Suggestion: <strong>Priority {item.aiRecommendation.suggestedPriority}</strong> ({item.aiRecommendation.reason})
                      </span>
                    </div>
                    {canReorder && (
                      <button
                        onClick={() => handleApplyAI(item)}
                        className="ml-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-md transition-all shrink-0"
                      >
                        Apply
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 italic">
                    Not yet sequenced into testing queue
                  </span>
                  {canReorder ? (
                    <button
                      onClick={() => handleOpenAssignUrgent(item)}
                      className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-xs"
                    >
                      Assign Priority
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-semibold">
                      Waiting for PPC
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. RANKED PRIORITY QUEUE CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {selectedCompGroup} Active Test Queue ({scheduledRankedQueue.length})
          </h3>
          <span className="text-[11px] text-slate-400">
            Ordered by Sequence Priority & Schedule Estimate
          </span>
        </div>

        {scheduledRankedQueue.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400 text-xs">
            No active test jobs in {selectedCompGroup} queue.
          </div>
        ) : (
          <div className="space-y-2.5">
            {scheduledRankedQueue.map((item, idx) => {
              const isOnProcess = item.status === 'ON_PROCESS';
              const isFinish = item.status === 'FINISH';

              const activeLinesForGroup = testingLines.filter(
                (l) => l.active && (l.componentGroup === selectedCompGroup || !l.componentGroup)
              );

              return (
                <div
                  key={item.queueRecordId}
                  className={`bg-white border rounded-2xl p-4 transition-all shadow-xs hover:border-slate-300 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ${
                    isOnProcess
                      ? 'border-amber-400 bg-amber-50/20'
                      : isFinish
                      ? 'border-emerald-200 bg-emerald-50/10 opacity-75'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-start md:items-center space-x-3.5 flex-1 min-w-0">
                    {/* Priority Badge */}
                    <div
                      className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center font-black shrink-0 ${
                        isOnProcess
                          ? 'bg-amber-500 text-white shadow-xs'
                          : isFinish
                          ? 'bg-emerald-600 text-white'
                          : item.currentPriority === 1
                          ? 'bg-blue-600 text-white shadow-xs'
                          : item.currentPriority === 2
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <span className="text-[9px] uppercase tracking-tighter leading-none">
                        {isOnProcess ? 'TEST' : isFinish ? 'DONE' : 'PRIO'}
                      </span>
                      <span className="text-sm leading-tight">
                        {isOnProcess ? '⚡' : isFinish ? '✓' : item.currentPriority}
                      </span>
                    </div>

                    {/* Main Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                            item.testType === 'RETEST'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {item.testType}
                        </span>

                        {isOnProcess && (
                          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                            <span>ON PROCESS (LOCKED)</span>
                          </span>
                        )}

                        <span className="text-xs font-mono font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">
                          JO {item.joRoNumber}
                        </span>

                        {item.priorityLocked && !isOnProcess && (
                          <span className="text-[10px] text-slate-400 flex items-center space-x-0.5">
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Locked</span>
                          </span>
                        )}
                      </div>

                      <div className="text-sm font-black text-slate-900 truncate">
                        {item.unitModel} — {item.component}
                      </div>

                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Cust: <strong className="text-slate-700">{item.customer || '-'}</strong></span>
                        <span>Mechanic: <strong className="text-slate-700">{item.assemblyMechanic || '-'}</strong></span>
                        {item.partNumber && <span>P/N: <strong className="font-mono text-slate-700">{item.partNumber}</strong></span>}
                        {item.serialNumber && <span>S/N: <strong className="font-mono text-slate-700">{item.serialNumber}</strong></span>}
                      </div>

                      {/* Line Assignment & Schedule Timings */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        {/* Testing Line Selector */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Line:</span>
                          {canReorder && !isOnProcess && !isFinish ? (
                            <select
                              value={item.testingLineId || ''}
                              onChange={(e) => handleAssignTestingLine(item.queueRecordId, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg px-2 py-0.5 focus:outline-none focus:border-blue-500"
                            >
                              <option value="">Auto Line Allocation</option>
                              {activeLinesForGroup.map((line) => (
                                <option key={line.id} value={line.id}>
                                  {line.name} ({line.process})
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              {item.assignedLineName}
                            </span>
                          )}
                        </div>

                        {/* Estimated Timings */}
                        {!isFinish && (
                          <div className="flex items-center space-x-3 text-[11px] font-mono text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                            <span>Duration: <strong className="text-slate-900">{item.estimatedDurationHours}h</strong></span>
                            <span className="text-slate-300">|</span>
                            <span>Est Start: <strong className="text-blue-700">{item.estimatedStartTime}</strong></span>
                            <span className="text-slate-300">|</span>
                            <span>Est Finish: <strong className="text-purple-700">{item.estimatedFinishTime}</strong></span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions & Sequence Controls */}
                  <div className="flex items-center justify-between lg:justify-end gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* Up/Down Reorder Controls (PPC / Supervisor / Admin only) */}
                    {canReorder && !item.priorityLocked && !isOnProcess && !isFinish && (
                      <div className="flex items-center space-x-1 mr-1">
                        <button
                          onClick={() => handleMoveUp(item)}
                          disabled={item.currentPriority <= 1}
                          className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 disabled:opacity-30 rounded-lg transition-all"
                          title="Move Priority Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(item)}
                          className="w-7 h-7 flex items-center justify-center bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-all"
                          title="Move Priority Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* History Audit Button */}
                    <button
                      onClick={() => {
                        setSelectedQueueItem(item);
                        setShowHistoryModal(true);
                      }}
                      className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-xl transition-all text-xs flex items-center space-x-1"
                      title="View Priority Audit History"
                    >
                      <History className="w-3.5 h-3.5" />
                    </button>

                    {/* Open JO Detail Button */}
                    <button
                      onClick={() => onOpenJODetail(item.joRoNumber)}
                      className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all border border-slate-200 flex items-center space-x-1"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* REORDER REMARK MODAL */}
      {showReorderModal && selectedQueueItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <SlidersHorizontal className="w-4 h-4 text-blue-600" />
                <span>Adjust Priority Sequence</span>
              </h3>
              <button
                onClick={() => setShowReorderModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
              <div>
                JO Number: <strong className="font-mono text-blue-900">{selectedQueueItem.joRoNumber}</strong>
              </div>
              <div>
                Component: <strong>{selectedQueueItem.unitModel} — {selectedQueueItem.component}</strong>
              </div>
              <div className="flex items-center space-x-2 mt-2 pt-2 border-t border-slate-200">
                <span>Current Priority: <strong>{selectedQueueItem.currentPriority}</strong></span>
                <span>➔</span>
                <span className="text-blue-600">New Target Priority: <strong>{targetPriority}</strong></span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Priority Position (1..N) *
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={targetPriority}
                onChange={(e) => setTargetPriority(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Change Remark / Reason (Required for Audit) *
              </label>
              <textarea
                rows={3}
                placeholder="State the reason for priority adjustment (e.g. customer delivery escalation, part readiness)..."
                value={reorderRemark}
                onChange={(e) => setReorderRemark(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-medium"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReorderModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReorder}
                disabled={!reorderRemark.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs"
              >
                Confirm Priority Adjustment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN URGENT JOB MODAL */}
      {showUrgentModal && selectedQueueItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-rose-900 flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Assign Urgent JO to Active Queue</span>
              </h3>
              <button
                onClick={() => setShowUrgentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs space-y-1">
              <div>
                JO Number: <strong className="font-mono text-rose-900">{selectedQueueItem.joRoNumber}</strong>
              </div>
              <div>
                Component: <strong>{selectedQueueItem.unitModel} — {selectedQueueItem.component}</strong>
              </div>
              <div>
                Test Type: <strong>{selectedQueueItem.testType}</strong> | Customer: <strong>{selectedQueueItem.customer || '-'}</strong>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sequence Priority to Assign (e.g. 1 for immediate next test) *
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={targetPriority}
                onChange={(e) => setTargetPriority(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Priority Assignment Remark (Required) *
              </label>
              <textarea
                rows={3}
                placeholder="Reason for prioritizing this urgent job..."
                value={reorderRemark}
                onChange={(e) => setReorderRemark(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600 font-medium"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowUrgentModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignUrgent}
                disabled={!reorderRemark.trim()}
                className="bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs"
              >
                Prioritize Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRIORITY AUDIT HISTORY MODAL */}
      {showHistoryModal && selectedQueueItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <History className="w-4 h-4 text-blue-600" />
                <span>Priority Audit Trail — JO {selectedQueueItem.joRoNumber}</span>
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {selectedQueueItem.history && selectedQueueItem.history.length > 0 ? (
                selectedQueueItem.history.map((h, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>Priority Change: {h.oldPriority} ➔ {h.newPriority}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(h.changedAt).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-slate-600 font-medium italic">
                      "{h.remark}"
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Authorized by: <strong>{h.changedBy}</strong>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-xs text-slate-400">
                  No priority changes logged yet.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowHistoryModal(false)}
                className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MANUAL JO MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-900 flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Add Test JO to {selectedCompGroup} Queue</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewJO} className="space-y-3">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {eligibleProductModels.length === 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-semibold flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    No eligible Product Model configured for <strong>{selectedCompGroup}</strong>. Please configure Product Master first.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    JO / RO Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 24109901"
                    value={newJoNumber}
                    onChange={(e) => {
                      setNewJoNumber(e.target.value);
                      setFormError(null);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Test Type *
                  </label>
                  <select
                    value={newTestType}
                    onChange={(e) => setNewTestType(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold"
                  >
                    <option value="PROD">PROD (Standard)</option>
                    <option value="RETEST">RETEST (Defect Re-verification)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Unit Model *
                  </label>
                  <select
                    required
                    disabled={eligibleProductModels.length === 0}
                    value={newUnitModel}
                    onChange={(e) => {
                      setNewUnitModel(e.target.value);
                      setNewComponent('');
                      setSelectedProductModelId('');
                      setFormError(null);
                    }}
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold bg-white ${
                      eligibleProductModels.length === 0 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="">-- Select Unit Model --</option>
                    {availableUnitModels.map((um) => (
                      <option key={um} value={um}>
                        {um}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Component Name *
                  </label>
                  <select
                    required
                    disabled={!newUnitModel || eligibleProductModels.length === 0}
                    value={newComponent}
                    onChange={(e) => {
                      const comp = e.target.value;
                      setNewComponent(comp);
                      setFormError(null);
                      const match = eligibleProductModels.find(
                        (m) =>
                          m.unitModel.trim().toUpperCase() === newUnitModel.trim().toUpperCase() &&
                          (m.component || m.compName || '').trim().toUpperCase() === comp.trim().toUpperCase()
                      );
                      if (match) {
                        setSelectedProductModelId(match.id);
                      }
                    }}
                    className={`w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold bg-white ${
                      !newUnitModel || eligibleProductModels.length === 0
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : ''
                    }`}
                  >
                    <option value="">
                      {!newUnitModel ? 'Select Unit Model First' : '-- Select Component --'}
                    </option>
                    {availableComponents.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedCompGroup === 'PT-PPM' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Sub Group (PT vs PPM)
                  </label>
                  <select
                    value={newSubGroup}
                    onChange={(e) => setNewSubGroup(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-bold"
                  >
                    <option value="">Unspecified</option>
                    <option value="PT">PT (Power Train: Transmission, Torqflow, Motor)</option>
                    <option value="PPM">PPM (Pumps & Valves)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Customer
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PT Freeport, PT KPC"
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Assembly Mechanic
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ardian Hidayat"
                    value={newMechanic}
                    onChange={(e) => setNewMechanic(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-bold text-rose-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newIsUrgent}
                    onChange={(e) => setNewIsUrgent(e.target.checked)}
                    className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                  />
                  <span>Mark as URGENT — UNASSIGNED</span>
                </label>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={eligibleProductModels.length === 0 || isSubmittingJO}
                    className={`text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center space-x-1 ${
                      eligibleProductModels.length === 0 || isSubmittingJO
                        ? 'bg-slate-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {isSubmittingJO && <RefreshCw className="w-3 h-3 animate-spin mr-1" />}
                    <span>{isSubmittingJO ? 'Saving...' : 'Save to Queue'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LINE CAPACITY SETUP MODAL */}
      {showLineSetupModal && (
        <LineSetupModal
          lines={testingLines}
          onClose={() => setShowLineSetupModal(false)}
          onRefresh={loadTestingLines}
          currentUserName={currentUserName}
        />
      )}

      {/* 1. SHAREPOINT PPC SYNC PREVIEW MODAL */}
      {showSharepointPreviewModal && sharepointPreviewData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  SHAREPOINT PPC SYNC PREVIEW
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Priority Testing - PPC.xlsx &bull; Table PPC_PRIORITY_MASTER
                </p>
              </div>
              <button 
                onClick={() => setShowSharepointPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Statistics Dashboard */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Total Rows</span>
                <span className="text-lg font-black text-slate-800">{sharepointPreviewData.totalRows}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-blue-500 block font-bold uppercase">New Items</span>
                <span className="text-lg font-black text-blue-600">{sharepointPreviewData.newCount}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-emerald-500 block font-bold uppercase font-sans">Updates</span>
                <span className="text-lg font-black text-emerald-600">{sharepointPreviewData.updateCount}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-bold uppercase">Unchanged</span>
                <span className="text-lg font-black text-slate-600">{sharepointPreviewData.unchangedCount}</span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-red-500 block font-bold uppercase">Conflicts</span>
                <span className={`text-lg font-black ${sharepointPreviewData.conflictCount > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                  {sharepointPreviewData.conflictCount}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-amber-500 block font-bold uppercase">Invalid Rows</span>
                <span className={`text-lg font-black ${sharepointPreviewData.invalidCount > 0 ? 'text-amber-600' : 'text-slate-600'}`}>
                  {sharepointPreviewData.invalidCount}
                </span>
              </div>
            </div>

            {/* List and Table */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Prio</th>
                      <th className="px-4 py-3">JO/RO</th>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3">Product Combination</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Testing Line</th>
                      <th className="px-4 py-3">Urgent</th>
                      <th className="px-4 py-3">Sync Action</th>
                      <th className="px-4 py-3">Status Message</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-700">
                    {sharepointPreviewData.items.map((row: any, idx: number) => {
                      let badgeColor = 'bg-slate-100 text-slate-700';
                      if (row.action === 'NEW') badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200';
                      if (row.action === 'UPDATE') badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
                      if (row.action === 'CONFLICT') badgeColor = 'bg-red-50 text-red-700 border border-red-200';
                      if (row.action === 'INVALID') badgeColor = 'bg-amber-50 text-amber-700 border border-amber-200';

                      return (
                        <tr key={idx} className={row.action === 'CONFLICT' || row.action === 'INVALID' ? 'bg-slate-50/50' : ''}>
                          <td className="px-4 py-3 font-bold">{row.priorityPpc || '-'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.joRoNumber}</td>
                          <td className="px-4 py-3">{row.compGroup}</td>
                          <td className="px-4 py-3">
                            <div className="font-bold">{row.unitModel}</div>
                            <div className="text-[10px] text-slate-400">{row.component}</div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              row.testType === 'RETEST' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {row.testType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold">{row.testingLineId || 'Auto'}</td>
                          <td className="px-4 py-3 font-bold">{row.urgent === 'YES' || row.urgent === true ? 'YES' : 'NO'}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>
                              {row.action}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {row.action === 'CONFLICT' && (
                              <span className="text-red-600 font-bold flex items-center space-x-1">
                                <AlertTriangle className="w-3.5 h-3.5 mr-1 text-red-500" />
                                <span>{row.validationMessage}</span>
                              </span>
                            )}
                            {row.action === 'INVALID' && (
                              <span className="text-amber-600 font-bold flex items-center space-x-1">
                                <X className="w-3.5 h-3.5 mr-1 text-amber-500" />
                                <span>{row.validationMessage}</span>
                              </span>
                            )}
                            {row.action !== 'CONFLICT' && row.action !== 'INVALID' && (
                              <span className="text-slate-500">{row.validationMessage}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between rounded-b-2xl">
              <span className="text-xs font-semibold text-slate-500">
                Only <strong className="text-green-600">{sharepointPreviewData.totalRows - sharepointPreviewData.conflictCount - sharepointPreviewData.invalidCount} valid rows</strong> will be synced. Conflicts and Invalids will be skipped to preserve locks and operational safety.
              </span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowSharepointPreviewModal(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  disabled={isSyncingCommit || (sharepointPreviewData.totalRows - sharepointPreviewData.conflictCount - sharepointPreviewData.invalidCount) === 0}
                  onClick={async () => {
                    try {
                      setIsSyncingCommit(true);
                      const { sharepointService } = await import('../services/sharepointService');
                      await sharepointService.commitSync(sharepointPreviewData.items, currentUserName);
                      setShowSharepointPreviewModal(false);
                      setSyncFeedback('SharePoint PPC Excel Sync committed successfully!');
                      await loadQueue();
                      await loadSharepointStatus();
                      setTimeout(() => setSyncFeedback(null), 5000);
                    } catch (e: any) {
                      alert(`Commit failed: ${e.message}`);
                    } finally {
                      setIsSyncingCommit(false);
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500 transition-all shadow-sm flex items-center space-x-1"
                >
                  {isSyncingCommit && <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1" />}
                  <span>Import Valid Rows</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. SIMULATED EXCEL WORKBOOK EDITOR (UAT SANDBOX) */}
      {showWorkbookEditorModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-5xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-800">
                  MANAGE SIMULATED SHAREPOINT EXCEL WORKBOOK
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Interactive UAT sandbox allows editing individual rows to trigger different sync conflicts!
                </p>
              </div>
              <button 
                onClick={() => setShowWorkbookEditorModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="min-w-full divide-y divide-slate-100 text-left">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Prio</th>
                      <th className="px-4 py-3">JO/RO</th>
                      <th className="px-4 py-3">Group</th>
                      <th className="px-4 py-3">Unit Model</th>
                      <th className="px-4 py-3">Component</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3">Line</th>
                      <th className="px-4 py-3">Urgent</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Mechanic</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100 text-xs text-slate-700">
                    {workbookRows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-bold">{row.priorityPpc}</td>
                        <td className="px-4 py-3 font-mono font-bold text-slate-900">{row.joRoNumber}</td>
                        <td className="px-4 py-3">{row.compGroup}</td>
                        <td className="px-4 py-3 font-bold">{row.unitModel}</td>
                        <td className="px-4 py-3">{row.component}</td>
                        <td className="px-4 py-3 font-bold text-blue-600">{row.testType}</td>
                        <td className="px-4 py-3 font-mono font-bold">{row.testingLineId || '-'}</td>
                        <td className="px-4 py-3 font-bold">{row.urgent === 'YES' || row.urgent === true ? 'YES' : 'NO'}</td>
                        <td className="px-4 py-3 truncate max-w-[120px]">{row.customer}</td>
                        <td className="px-4 py-3">{row.assemblyMechanic}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => {
                              setEditingRow(row);
                              setShowEditRowModal(true);
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-800 rounded hover:bg-blue-50 font-bold"
                          >
                            Edit Row
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end rounded-b-2xl">
              <button
                onClick={() => setShowWorkbookEditorModal(false)}
                className="px-5 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl hover:bg-slate-700 transition-all shadow-xs"
              >
                Close Workbook Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. SIMULATED ROW EDITOR MODAL */}
      {showEditRowModal && editingRow && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h4 className="text-sm font-black text-slate-800 mb-4 uppercase">
              Edit Simulated Excel Row (JO {editingRow.joRoNumber})
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Priority PPC</label>
                  <input
                    type="number"
                    value={editingRow.priorityPpc}
                    onChange={(e) => setEditingRow({ ...editingRow, priorityPpc: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Test Type</label>
                  <select
                    value={editingRow.testType}
                    onChange={(e) => setEditingRow({ ...editingRow, testType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none bg-white font-bold"
                  >
                    <option value="PROD">PROD</option>
                    <option value="RETEST">RETEST</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit Model</label>
                  <input
                    type="text"
                    value={editingRow.unitModel}
                    onChange={(e) => setEditingRow({ ...editingRow, unitModel: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Component</label>
                  <input
                    type="text"
                    value={editingRow.component}
                    onChange={(e) => setEditingRow({ ...editingRow, component: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Testing Line ID</label>
                  <input
                    type="text"
                    value={editingRow.testingLineId}
                    onChange={(e) => setEditingRow({ ...editingRow, testingLineId: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Urgent (YES/NO)</label>
                  <select
                    value={editingRow.urgent}
                    onChange={(e) => setEditingRow({ ...editingRow, urgent: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none bg-white font-bold"
                  >
                    <option value="YES">YES</option>
                    <option value="NO">NO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Customer</label>
                <input
                  type="text"
                  value={editingRow.customer}
                  onChange={(e) => setEditingRow({ ...editingRow, customer: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditRowModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleSaveWorkbookRow(editingRow);
                    setShowEditRowModal(false);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-500"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
