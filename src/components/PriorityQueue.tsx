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
import { isProductCompatibleWithLine } from '../utils/lineQueueService';
import { LineSetupModal } from './LineSetupModal';

const TOP3_PHYSICAL_LINES = [
  { id: 'glt-engine', label: 'GLT Engine', group: 'Engine' },
  { id: 'glt-pt-ppm', label: 'GLT PT-PPM', group: 'PT-PPM' },
  { id: 'dyno-1', label: 'Dyno 1', group: 'Engine' },
  { id: 'dyno-2', label: 'Dyno 2', group: 'Engine' },
  { id: 'dyno-3', label: 'Dyno 3', group: 'Engine' },
  { id: 'tb-1', label: 'TB1', group: 'PT-PPM' },
  { id: 'tb-2', label: 'TB2', group: 'PT-PPM' },
  { id: 'tb-3', label: 'TB3', group: 'PT-PPM' },
  { id: 'mobile-tb', label: 'MTB', group: 'PT-PPM' },
  { id: 'tb-4-cyl', label: 'TB4', group: 'Cylinder' },
];

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

  // Top 3 Priority Swap Modal State
  const [selectedSpvLineId, setSelectedSpvLineId] = useState<string>('glt-engine');
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapTargetRank, setSwapTargetRank] = useState<number>(1);
  const [selectedReplacementJOId, setSelectedReplacementJOId] = useState<string>('');
  const [swapSearchQuery, setSwapSearchQuery] = useState('');
  const [swapError, setSwapError] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

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
      if (a.status === 'ON_PROCESS' && b.status !== 'ON_PROCESS') return -1;
      if (b.status === 'ON_PROCESS' && a.status !== 'ON_PROCESS') return 1;
      if (a.status === 'FINISH' && b.status !== 'FINISH') return 1;
      if (b.status === 'FINISH' && a.status !== 'FINISH') return -1;

      if (a.isTopPriority && !b.isTopPriority) return -1;
      if (!a.isTopPriority && b.isTopPriority) return 1;
      if (a.isTopPriority && b.isTopPriority) {
        return (a.topPriorityRank || 0) - (b.topPriorityRank || 0);
      }

      return a.currentPriority - b.currentPriority;
    });


  // Compute Schedule (Est Start/Finish) for Ranked Queue
  const scheduledRankedQueue = useMemo(() => {
    return calculateScheduleForQueue(rankedQueue, testingLines, testOverrides);
  }, [rankedQueue, testingLines, testOverrides]);

  const selectedSpvLineObj = useMemo(() => {
    return TOP3_PHYSICAL_LINES.find((l) => l.id === selectedSpvLineId) || TOP3_PHYSICAL_LINES[0];
  }, [selectedSpvLineId]);

  const currentlyTestingJOForSelectedLine = useMemo(() => {
    return queueList.find((q) => {
      if (q.status !== 'ON_PROCESS') return false;
      const targetLine = q.currentTestingLineId || q.testingLineId || q.priorityLineId;
      return targetLine === selectedSpvLineId;
    });
  }, [queueList, selectedSpvLineId]);

  const top3WaitingForSelectedLine = useMemo(() => {
    const lineObj = testingLines.find((l) => l.id === selectedSpvLineId) || ({
      id: selectedSpvLineId,
      name: selectedSpvLineObj.label,
      componentGroup: selectedSpvLineObj.group,
      process: selectedSpvLineId.startsWith('glt') ? 'GLT' : selectedSpvLineId.startsWith('dyno') ? 'Dynotest' : 'Testbench',
      active: true,
    } as TestingLine);

    const eligible = queueList.filter((q) => {
      if (q.status === 'ON_PROCESS' || q.status === 'FINISH') return false;
      if (q.isTopPriority && q.priorityLineId && q.priorityLineId !== selectedSpvLineId) {
        return false;
      }
      return isProductCompatibleWithLine(q, lineObj, productModels);
    });

    eligible.sort((a, b) => {
      const aStarred = a.isTopPriority && a.priorityLineId === selectedSpvLineId;
      const bStarred = b.isTopPriority && b.priorityLineId === selectedSpvLineId;
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      if (aStarred && bStarred) return (a.topPriorityRank || 99) - (b.topPriorityRank || 99);
      const prioA = a.currentPriority || a.plannedPriority || 9999;
      const prioB = b.currentPriority || b.plannedPriority || 9999;
      if (prioA !== prioB) return prioA - prioB;
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

    return eligible.slice(0, 3);
  }, [queueList, selectedSpvLineId, testingLines, productModels, selectedSpvLineObj]);

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

  const swapCandidateJOs = useMemo(() => {
    const lineObj = testingLines.find((l) => l.id === selectedSpvLineId) || ({
      id: selectedSpvLineId,
      name: selectedSpvLineObj.label,
      componentGroup: selectedSpvLineObj.group,
      process: selectedSpvLineId.startsWith('glt')
        ? 'GLT'
        : selectedSpvLineId.startsWith('dyno')
        ? 'Dynotest'
        : 'Testbench',
      active: true,
    } as TestingLine);

    return queueList.filter((q) => {
      // Exclude running, finish, or troubleshooting
      if (q.status === 'ON_PROCESS' || q.status === 'FINISH' || (q.status as string) === 'TROUBLESHOOTING') {
        return false;
      }

      // 1. GLT Engine
      if (selectedSpvLineId === 'glt-engine') {
        if (q.compGroup !== 'Engine') return false;
        if (q.testType === 'RETEST') return false;
        if (q.gltStatus === 'GOOD') return false;
      }
      // 2. GLT PT-PPM
      else if (selectedSpvLineId === 'glt-pt-ppm') {
        if (q.compGroup !== 'PT-PPM') return false;
        if (q.testType === 'RETEST') return false;
        if (q.gltStatus === 'GOOD') return false;
      }
      // 3. Dyno 1-3
      else if (selectedSpvLineId.startsWith('dyno-')) {
        if (q.compGroup !== 'Engine') return false;
        if (q.testType !== 'RETEST' && q.gltStatus !== 'GOOD') return false;
      }
      // 4. TB1, TB2, TB3, MTB
      else if (['tb-1', 'tb-2', 'tb-3', 'mobile-tb'].includes(selectedSpvLineId)) {
        if (q.compGroup !== 'PT-PPM') return false;
        if (q.testType !== 'RETEST' && q.gltStatus !== 'GOOD') return false;
      }
      // 5. TB4 (Cylinder)
      else if (selectedSpvLineId === 'tb-4-cyl') {
        if (q.compGroup !== 'Cylinder') return false;
      }

      // Compatibility check
      return isProductCompatibleWithLine(q, lineObj, productModels);
    });
  }, [queueList, selectedSpvLineId, testingLines, productModels, selectedSpvLineObj]);

  const filteredCandidateJOs = useMemo(() => {
    if (!swapSearchQuery.trim()) return swapCandidateJOs;
    const s = swapSearchQuery.trim().toUpperCase();
    return swapCandidateJOs.filter(
      (q) =>
        q.joRoNumber.toUpperCase().includes(s) ||
        q.unitModel.toUpperCase().includes(s) ||
        q.component.toUpperCase().includes(s) ||
        (q.testType || '').toUpperCase().includes(s)
    );
  }, [swapCandidateJOs, swapSearchQuery]);

  const handleToggleStar = async (item: QueueRecord, destProc?: string) => {
    if (!canReorder || item.status === 'ON_PROCESS' || item.status === 'FINISH') return;

    if (item.isTopPriority) {
      await store.updateQueueRecord(item.queueRecordId, {
        isTopPriority: false,
        topPriorityRank: undefined,
        priorityLineId: undefined,
        prioritySelectedBy: undefined,
        prioritySelectedAt: undefined,
        priorityReason: undefined,
      });
      await loadQueue();
      return;
    }

    // Determine target line for this item
    let targetLine = selectedSpvLineId;
    if (item.compGroup === 'Engine') {
      targetLine = item.gltStatus === 'GOOD' || item.testType === 'RETEST' ? 'dyno-1' : 'glt-engine';
    } else if (item.compGroup === 'PT-PPM') {
      targetLine = item.gltStatus === 'GOOD' || item.testType === 'RETEST' ? 'tb-1' : 'glt-pt-ppm';
    } else if (item.compGroup === 'Cylinder') {
      targetLine = 'tb-4-cyl';
    }
    setSelectedSpvLineId(targetLine);
    setSwapTargetRank(1);
    setSelectedReplacementJOId(item.queueRecordId);
    setSwapSearchQuery('');
    setSwapError(null);
    setShowSwapModal(true);
  };

  const handleConfirmSwapPriority = async () => {
    if (!selectedReplacementJOId || isSwapping) return;
    setIsSwapping(true);
    setSwapError(null);

    try {
      const replacementJO = queueList.find((q) => q.queueRecordId === selectedReplacementJOId);
      if (!replacementJO) {
        setSwapError('Selected JO not found');
        setIsSwapping(false);
        return;
      }

      // Current JO occupying slot swapTargetRank for selectedSpvLineId
      const currentSlotJO = queueList.find(
        (q) =>
          q.isTopPriority &&
          q.priorityLineId === selectedSpvLineId &&
          q.topPriorityRank === swapTargetRank &&
          q.status !== 'FINISH'
      );

      // Is replacementJO already in a top 3 slot on selectedSpvLineId?
      const replacementIsTop3OnSameLine =
        replacementJO.isTopPriority &&
        replacementJO.priorityLineId === selectedSpvLineId &&
        replacementJO.topPriorityRank &&
        replacementJO.topPriorityRank !== swapTargetRank;

      if (replacementIsTop3OnSameLine && currentSlotJO) {
        // Swap ranks atomically
        const oldRank = replacementJO.topPriorityRank!;
        await store.updateQueueRecord(replacementJO.queueRecordId, {
          isTopPriority: true,
          topPriorityRank: swapTargetRank,
          priorityLineId: selectedSpvLineId,
          prioritySelectedBy: currentUserName,
          prioritySelectedAt: new Date().toISOString(),
          priorityReason: 'SPV Priority Swap',
        });

        await store.updateQueueRecord(currentSlotJO.queueRecordId, {
          isTopPriority: true,
          topPriorityRank: oldRank,
          priorityLineId: selectedSpvLineId,
          prioritySelectedBy: currentUserName,
          prioritySelectedAt: new Date().toISOString(),
          priorityReason: 'SPV Priority Swap',
        });
      } else {
        // Demote currentSlotJO if exists
        if (currentSlotJO) {
          await store.updateQueueRecord(currentSlotJO.queueRecordId, {
            isTopPriority: false,
            topPriorityRank: undefined,
            priorityLineId: undefined,
            prioritySelectedBy: undefined,
            prioritySelectedAt: undefined,
            priorityReason: undefined,
          });
        }

        // Promote replacementJO
        await store.updateQueueRecord(replacementJO.queueRecordId, {
          isTopPriority: true,
          topPriorityRank: swapTargetRank,
          priorityLineId: selectedSpvLineId,
          prioritySelectedBy: currentUserName,
          prioritySelectedAt: new Date().toISOString(),
          priorityReason: 'SPV Priority Swap',
        });
      }

      await loadQueue();
      setShowSwapModal(false);
      setSelectedReplacementJOId('');
      setSwapSearchQuery('');
    } catch (err: any) {
      setSwapError(err?.message || 'Failed to swap priority');
    } finally {
      setIsSwapping(false);
    }
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
    <div className="space-y-4 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300">
      {/* TOP-3 PRIORITY BY LINE CONTROL CARD FOR SPV */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
              <span>Top-3 Priority by Line</span>
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Select line to view currently testing and top-3 waiting priority queue
            </p>
          </div>

          {/* Line Selection Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {TOP3_PHYSICAL_LINES.map((line) => {
              const isSelected = selectedSpvLineId === line.id;
              return (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => setSelectedSpvLineId(line.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {line.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* CURRENTLY TESTING SECTION */}
        {currentlyTestingJOForSelectedLine ? (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <span className="bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-md flex items-center space-x-1 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                <span>CURRENTLY TESTING</span>
              </span>
              <div>
                <div className="font-mono font-bold text-slate-900 text-xs">
                  JO: {currentlyTestingJOForSelectedLine.joRoNumber}
                </div>
                <div className="text-[11px] font-medium text-slate-600">
                  {currentlyTestingJOForSelectedLine.unitModel} • {currentlyTestingJOForSelectedLine.component}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-700">
              <span className="font-semibold bg-white px-2 py-1 rounded border border-amber-200 text-[10px]">
                {currentlyTestingJOForSelectedLine.testType}
              </span>
              <span className="font-semibold bg-white px-2 py-1 rounded border border-amber-200 text-[10px]">
                {selectedSpvLineObj.label}
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-2.5 text-center text-xs text-slate-400 font-medium">
            CURRENTLY TESTING: No active test running on {selectedSpvLineObj.label}
          </div>
        )}

        {/* NEXT TOP-3 QUEUE */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((rank) => {
            const jo = top3WaitingForSelectedLine[rank - 1];
            return (
              <div
                key={rank}
                className={`p-3.5 rounded-xl border transition-all ${
                  jo
                    ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                    : 'bg-slate-50/30 border-dashed border-slate-200 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                    Priority {rank}
                  </span>
                  {jo && (
                    <span className="text-[10px] font-black px-1.5 py-0.5 rounded border bg-emerald-100 text-emerald-800 border-emerald-200">
                      {jo.testType}
                    </span>
                  )}
                </div>

                {jo ? (
                  <div className="space-y-1">
                    <div className="font-mono font-black text-sm text-blue-900">
                      JO {jo.joRoNumber}
                    </div>
                    <div className="text-xs font-bold text-slate-800 truncate" title={jo.unitModel}>
                      {jo.unitModel}
                    </div>
                    <div className="text-[11px] font-medium text-slate-600 truncate" title={jo.component}>
                      {jo.component}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60 mt-2">
                      <span>Line: <strong className="text-slate-700">{selectedSpvLineObj.label}</strong></span>
                      <span className="font-bold text-indigo-700">
                        {jo.gltStatus === 'GOOD' ? 'GLT READY' : 'WAITING'}
                      </span>
                    </div>
                    {canReorder && (
                      <button
                        type="button"
                        onClick={() => {
                          setSwapTargetRank(rank);
                          setSelectedReplacementJOId('');
                          setSwapSearchQuery('');
                          setSwapError(null);
                          setShowSwapModal(true);
                        }}
                        className="mt-2 w-full text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 py-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <RefreshCw className="w-3 h-3 text-blue-600" />
                        <span>Change</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="py-2 text-center text-xs text-slate-400 font-medium space-y-2">
                    <div>No Priority {rank} JO assigned</div>
                    {canReorder && (
                      <button
                        type="button"
                        onClick={() => {
                          setSwapTargetRank(rank);
                          setSelectedReplacementJOId('');
                          setSwapSearchQuery('');
                          setSwapError(null);
                          setShowSwapModal(true);
                        }}
                        className="w-full text-[11px] font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 py-1 rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Plus className="w-3 h-3 text-blue-600" />
                        <span>Assign Priority #{rank}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPACT SEARCH & FILTER BAR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search JO, Unit, Model..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          {['Engine', 'PT-PPM', 'Cylinder'].map((group) => {
            const isSelected = selectedCompGroup === group;
            return (
              <button
                key={group}
                onClick={() => setSelectedCompGroup(group as CompGroup)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {group}
              </button>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 border-l border-slate-200 pl-4">
          <button
            onClick={handleSyncPPC}
            disabled={isLoading}
            className="flex items-center space-x-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
            title="Sync PPC"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          {canReorder && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Manual JO</span>
            </button>
          )}
        </div>
      </div>

      {syncFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold px-3 py-2 rounded-xl flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{syncFeedback}</span>
        </div>
      )}

      {/* SIMPLE LIST/TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 font-black">Priority / JO</th>
                <th className="py-3 px-4 font-black">Unit Model</th>
                <th className="py-3 px-4 font-black">Component</th>
                <th className="py-3 px-4 font-black">Status</th>
                <th className="py-3 px-4 font-black text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {scheduledRankedQueue.map((item) => {
                const isOnProcess = item.status === 'ON_PROCESS';
                const isFinish = item.status === 'FINISH';
                
                let destinationProcess = 'Testbench';
                if (item.compGroup === 'Engine') {
                  destinationProcess = item.gltStatus === 'GOOD' || item.testType === 'RETEST' ? 'Dynotest' : 'GLT';
                } else if (item.compGroup === 'PT-PPM') {
                  destinationProcess = item.gltStatus === 'GOOD' || item.testType === 'RETEST' ? 'Testbench' : 'GLT';
                }

                return (
                  <tr key={item.queueRecordId} className={`hover:bg-slate-50 transition-colors ${isOnProcess ? 'bg-amber-50/30' : isFinish ? 'bg-emerald-50/20' : ''}`}>
                    <td className="py-3 px-4 whitespace-nowrap flex items-center space-x-3">
                      <button
                        disabled={!canReorder || isOnProcess || isFinish}
                        onClick={() => handleToggleStar(item, destinationProcess)}
                        className={`p-1.5 rounded-lg transition-all ${
                          item.isTopPriority 
                            ? 'bg-amber-100 text-amber-500 hover:bg-amber-200' 
                            : 'bg-slate-100 text-slate-300 hover:text-amber-400 hover:bg-slate-200'
                        } ${(!canReorder || isOnProcess || isFinish) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={item.isTopPriority ? 'Unstar JO' : 'Star as Top 3 Priority'}
                      >
                        <Sparkles className={`w-4 h-4 ${item.isTopPriority ? 'fill-current' : ''}`} />
                      </button>
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded text-xs inline-block w-fit">
                          {item.joRoNumber}
                        </span>
                        <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold tracking-wide">
                          {destinationProcess}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800 whitespace-nowrap">
                      {item.unitModel || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {item.component || '-'}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {isOnProcess ? (
                        <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center space-x-1 w-max">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                          <span>ON PROCESS</span>
                        </span>
                      ) : isFinish ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded-md w-max inline-block">
                          FINISH
                        </span>
                      ) : item.gltStatus === 'GOOD' ? (
                        <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-md w-max inline-block">
                          GLT READY
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded-md w-max inline-block">
                          WAITING
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => onOpenJODetail(item.joRoNumber)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
              {scheduledRankedQueue.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No active JOs match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD MANUAL JO MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center space-x-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Add Manual JO / RO</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            {formError && (
              <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-start space-x-3 text-xs font-medium">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}
            <form onSubmit={handleSaveNewJO} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    JO / RO Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={newJoNumber}
                    onChange={(e) => {
                      setNewJoNumber(e.target.value.toUpperCase());
                      setFormError(null);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600 font-mono font-bold"
                    placeholder="e.g. 24101234"
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

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={eligibleProductModels.length === 0 || isSubmittingJO}
                    className={`text-white text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center space-x-1 cursor-pointer ${
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

      {/* SWAP PRIORITY MODAL */}
      {showSwapModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  Change Priority #{swapTargetRank} — {selectedSpvLineObj.label}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select an eligible JO to assign or swap into Priority #{swapTargetRank}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSwapModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Read-Only Selected Line & Priority Slot */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5 font-semibold">
              <div className="flex justify-between">
                <span className="text-slate-500">Selected Physical Line:</span>
                <span className="text-slate-900 font-bold">{selectedSpvLineObj.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Priority Slot:</span>
                <span className="text-blue-700 font-bold">Priority #{swapTargetRank}</span>
              </div>
            </div>

            {swapError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold px-3 py-2 rounded-xl flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{swapError}</span>
              </div>
            )}

            {/* Search JO */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-700">
                Select Replacement JO *
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search JO, Unit, Component, Test Type..."
                  value={swapSearchQuery}
                  onChange={(e) => setSwapSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-medium focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Searchable Dropdown List */}
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                {filteredCandidateJOs.length > 0 ? (
                  filteredCandidateJOs.map((cand) => {
                    const isSelected = selectedReplacementJOId === cand.queueRecordId;
                    const isCurrentInSlot =
                      cand.isTopPriority &&
                      cand.priorityLineId === selectedSpvLineId &&
                      cand.topPriorityRank === swapTargetRank;

                    return (
                      <button
                        key={cand.queueRecordId}
                        type="button"
                        onClick={() => setSelectedReplacementJOId(cand.queueRecordId)}
                        className={`w-full p-2.5 text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/80 font-bold text-blue-900 border-l-4 border-l-blue-600'
                            : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-2">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-blue-800">{cand.joRoNumber}</span>
                            <span className="text-[10px] font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                              {cand.testType || 'PROD'}
                            </span>
                            {isCurrentInSlot && (
                              <span className="text-[9px] font-bold bg-amber-100 text-amber-800 px-1 py-0.2 rounded">
                                Current Slot
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate mt-0.5">
                            {cand.unitModel} • {cand.component}
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-slate-400 text-xs italic">
                    No eligible JOs match line criteria
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowSwapModal(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!selectedReplacementJOId || isSwapping}
                onClick={handleConfirmSwapPriority}
                className={`px-4 py-2 text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center space-x-1.5 cursor-pointer ${
                  !selectedReplacementJOId || isSwapping
                    ? 'bg-slate-300 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSwapping && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSwapping ? 'Swapping...' : 'Swap Priority'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
