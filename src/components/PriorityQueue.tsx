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
  Play,
} from 'lucide-react';
import { QueueRecord, CompGroup, UserRole, ProductModel, TestingLine, TestOverride } from '../types';
import { apiClient } from '../api/client';
import { store } from '../data/storageEngine';
import { calculateOverallCapacity, calculateScheduleForQueue } from '../utils/capacityCalculator';
import { LineSetupModal } from './LineSetupModal';

interface PriorityQueueProps {
  currentUserRole: UserRole | string;
  currentUserName: string;
  onOpenJODetail: (joNumber: string) => void;
  onStartTest?: (joNumber: string, compGroup: CompGroup, testType?: 'PROD' | 'RETEST', gltStatus?: string) => void;
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
  const [assemblersList, setAssemblersList] = useState<any[]>([]);

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

  const loadAssemblers = async () => {
    try {
      const asms = await apiClient.getAssemblers(true);
      setAssemblersList(asms || []);
    } catch (err) {
      console.error('Failed to load assemblers:', err);
    }
  };

  useEffect(() => {
    loadQueue();
    loadProductModels();
    loadTestingLines();
    loadTestOverrides();
    loadAssemblers();

    const unsubscribe = store.subscribe(() => {
      loadQueue();
      loadTestingLines();
      loadTestOverrides();
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

  const handleAssignMechanic = async (queueRecordId: string, assemblyMechanic: string) => {
    try {
      const { store } = await import('../data/storageEngine');
      await store.updateQueueRecord(queueRecordId, { assemblyMechanic });
      await loadQueue();
    } catch (err) {
      console.error('Failed to update assembly mechanic:', err);
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
      if (!matchJO && !matchUnit && !matchComp) return false;
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
    setIsLoading(true);
    const res = await apiClient.syncPPCDataSource(currentUserName);
    setSyncFeedback(`PPC Sync completed: ${res.added} new jobs added, ${res.updated} updated.`);
    await loadQueue();
    setTimeout(() => setSyncFeedback(null), 5000);
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
      {syncFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* PPC PRIORITY TESTING QUEUE CARD */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-4">
        {/* Card Header with Add Manual JO Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900 tracking-tight uppercase">
                PPC Priority Testing Queue
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">
                Active sequencing & test execution queue for Engine, Power Train (PT-PPM), and Cylinder
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleSyncPPC}
              disabled={isLoading}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Sync</span>
            </button>

            {canReorder && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Manual JO</span>
              </button>
            )}
          </div>
        </div>

        {/* Component Group Tabs & Search */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex space-x-1">
            {(['Engine', 'PT-PPM', 'Cylinder'] as CompGroup[]).map((group) => {
              const count = queueList.filter((q) => q.compGroup === group && q.status !== 'FINISH').length;
              const isSelected = selectedCompGroup === group;
              return (
                <button
                  key={group}
                  onClick={() => setSelectedCompGroup(group)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
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
      </div>

      {/* RANKED PRIORITY QUEUE CARDS */}
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
        ) : selectedCompGroup === 'Engine' ? (
          /* Requirement 5: Engine Active Test Queue simplified into a compact table */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">JO</th>
                    <th className="py-3 px-4">Unit Model</th>
                    <th className="py-3 px-4">Comp Name</th>
                    <th className="py-3 px-4">Test Type</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scheduledRankedQueue.map((item) => {
                    const isOnProcess = item.status === 'ON_PROCESS';
                    const isFinish = item.status === 'FINISH';

                    return (
                      <tr
                        key={item.queueRecordId}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isOnProcess
                            ? 'bg-amber-50/30'
                            : isFinish
                            ? 'bg-emerald-50/20 opacity-80'
                            : ''
                        }`}
                      >
                        {/* JO */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg text-xs">
                              {item.joRoNumber}
                            </span>
                            {item.priorityLocked && (
                              <span title="Priority Locked">
                                <Lock className="w-3.5 h-3.5 text-slate-400" />
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Unit Model */}
                        <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                          {item.unitModel || '-'}
                        </td>

                        {/* Comp Name */}
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {item.component || '-'}
                        </td>

                        {/* Test Type */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-md inline-block ${
                              item.testType === 'RETEST'
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {item.testType || 'PROD'}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {isOnProcess ? (
                            <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                              <span>ON PROCESS</span>
                            </span>
                          ) : isFinish ? (
                            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              FINISH
                            </span>
                          ) : item.gltStatus === 'GOOD' ? (
                            <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              GLT READY
                            </span>
                          ) : (
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              WAITING
                            </span>
                          )}
                        </td>

                        {/* Action */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {canReorder && !item.priorityLocked && !isOnProcess && !isFinish && (
                              <div className="flex items-center space-x-0.5 mr-1">
                                <button
                                  onClick={() => handleMoveUp(item)}
                                  disabled={item.currentPriority <= 1}
                                  className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 disabled:opacity-30 rounded transition-all cursor-pointer"
                                  title="Move Priority Up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleMoveDown(item)}
                                  className="w-6 h-6 flex items-center justify-center bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded transition-all cursor-pointer"
                                  title="Move Priority Down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            )}

                            <button
                              onClick={() => {
                                setSelectedQueueItem(item);
                                setShowHistoryModal(true);
                              }}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-md transition-all cursor-pointer"
                              title="Audit History"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => onOpenJODetail(item.joRoNumber)}
                              className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all border border-slate-200 cursor-pointer"
                              title="View JO Details"
                            >
                              Detail
                            </button>

                            {onStartTest && !isFinish && (
                              <button
                                onClick={() => onStartTest(item.joRoNumber, item.compGroup, item.testType, item.gltStatus)}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 shadow-2xs cursor-pointer ${
                                  isOnProcess
                                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                                title={isOnProcess ? 'Resume Session' : 'Start Test'}
                              >
                                <Play className="w-3 h-3 fill-current" />
                                <span>{isOnProcess ? 'Resume' : 'Start'}</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {scheduledRankedQueue.map((item, idx) => {
              const isOnProcess = item.status === 'ON_PROCESS';
              const isFinish = item.status === 'FINISH';

              const activeLinesForGroup = testingLines.filter(
                (l) => l.active && (l.componentGroup === selectedCompGroup || !l.componentGroup)
              );

              const filteredLines = item.compGroup === 'Cylinder' || item.testType === 'RETEST' || item.gltStatus === 'GOOD'
                ? activeLinesForGroup.filter((l) => l.process !== 'GLT')
                : activeLinesForGroup.filter((l) => l.process === 'GLT');

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

                      {item.schedulingWarning && (
                        <div className="mt-1 bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-medium px-2 py-1 rounded-md flex items-center space-x-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>{item.schedulingWarning}</span>
                        </div>
                      )}

                      <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                        <span>Mechanic: <strong className="text-slate-700">{item.assemblyMechanic || '-'}</strong></span>
                      </div>

                      {/* Line Assignment & Schedule Timings */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                        {/* Testing Line Selector */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Line:</span>
                          {!isOnProcess && !isFinish ? (
                            <select
                              value={item.testingLineId || ''}
                              onChange={(e) => handleAssignTestingLine(item.queueRecordId, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg px-2 py-0.5 focus:outline-none focus:border-blue-500"
                            >
                              <option value="">Auto Line Allocation</option>
                              {filteredLines.map((line) => (
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

                        {/* Assembly Mechanic Selector */}
                        <div className="flex items-center space-x-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Mechanic:</span>
                          {!isOnProcess && !isFinish ? (
                            <select
                              value={item.assemblyMechanic || ''}
                              onChange={(e) => handleAssignMechanic(item.queueRecordId, e.target.value)}
                              className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-bold rounded-lg px-2 py-0.5 focus:outline-none focus:border-blue-500 max-w-[150px] truncate"
                            >
                              <option value="">-- Choose Mechanic --</option>
                              {assemblersList
                                .filter((a) => (a.section || '').toUpperCase() === (item.compGroup || '').toUpperCase() || (item.compGroup === 'PT-PPM' && ((a.section || '').toUpperCase() === 'PT' || (a.section || '').toUpperCase() === 'PPM')))
                                .map((a) => (
                                  <option key={a.id} value={a.name}>
                                    {a.name}
                                  </option>
                                ))
                              }
                              <option disabled>──────────</option>
                              {assemblersList
                                .filter((a) => !((a.section || '').toUpperCase() === (item.compGroup || '').toUpperCase() || (item.compGroup === 'PT-PPM' && ((a.section || '').toUpperCase() === 'PT' || (a.section || '').toUpperCase() === 'PPM'))))
                                .map((a) => (
                                  <option key={a.id} value={a.name}>
                                    {a.name}
                                  </option>
                                ))
                              }
                            </select>
                          ) : (
                            <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              {item.assemblyMechanic || 'Unassigned'}
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
                      className="bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold px-3 py-1.5 rounded-xl transition-all border border-slate-200 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Detail</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Direct Test Execution Action */}
                    {onStartTest && !isFinish && (
                      <button
                        onClick={() => onStartTest(item.joRoNumber, item.compGroup, item.testType, item.gltStatus)}
                        className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer ${
                          isOnProcess
                            ? 'bg-amber-600 hover:bg-amber-700 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                        }`}
                        title={isOnProcess ? 'Resume Active Testing Session' : 'Start Testing Now'}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>{isOnProcess ? 'Resume' : 'Start Test'}</span>
                      </button>
                    )}
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
                Test Type: <strong>{selectedQueueItem.testType}</strong>
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

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Assembly Mechanic
                  </label>
                  <select
                    value={newMechanic}
                    onChange={(e) => setNewMechanic(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-blue-600 font-semibold"
                  >
                    <option value="">-- Choose Mechanic --</option>
                    {assemblersList
                      .filter((a) => !selectedCompGroup || (a.section || '').toUpperCase() === selectedCompGroup.toUpperCase() || (selectedCompGroup === 'PT-PPM' && ((a.section || '').toUpperCase() === 'PT' || (a.section || '').toUpperCase() === 'PPM')))
                      .map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name} ({a.section || 'Mechanic'})
                        </option>
                      ))
                    }
                    <option disabled>──────────</option>
                    {assemblersList
                      .filter((a) => !(!selectedCompGroup || (a.section || '').toUpperCase() === selectedCompGroup.toUpperCase() || (selectedCompGroup === 'PT-PPM' && ((a.section || '').toUpperCase() === 'PT' || (a.section || '').toUpperCase() === 'PPM'))))
                      .map((a) => (
                        <option key={a.id} value={a.name}>
                          {a.name} ({a.section || 'Mechanic'})
                        </option>
                      ))
                    }
                  </select>
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
    </div>
  );
};
