import {
  User,
  Assembler,
  ProductModel,
  ChecksheetItem,
  ChecksheetTemplate,
  ChecksheetSnapshot,
  GLTRecord,
  DynotestRecord,
  HydraulicRecord,
  CombinedJORecords,
  FilterParams,
  DashboardStats,
  TestProcess,
  ProductCategory,
  CompGroup,
  QueueRecord,
  PDFTestReportRecord,
  QualityCertificateRecord,
  ProductMasterValidationReport,
} from '../types';

import { store } from '../data/storageEngine';
import { prioritySourceService } from '../services/prioritySourceService';
import { pdfReportService } from '../services/pdfReportService';

const API_BASE = '/api';

export const apiClient = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    try {
      const res = await fetch(`${API_BASE}/users`);
      if (res.ok) return await res.json();
    } catch {}
    return store.getUsers();
  },

  saveUser: async (user: User): Promise<void> => {
    store.saveUser(user);
    try {
      await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(user),
      });
    } catch {}
  },

  deleteUser: async (id: string): Promise<void> => {
    store.deleteUser(id);
    try {
      await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    } catch {}
  },

  changePassword: async (userId: string, newPass: string): Promise<boolean> => {
    const success = store.changeUserPassword(userId, newPass);
    try {
      await fetch(`${API_BASE}/users/${userId}/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPass }),
      });
    } catch {}
    return success;
  },

  // --- ASSEMBLER MASTER ---
  getAssemblers: async (onlyActive = false): Promise<Assembler[]> => {
    try {
      const res = await fetch(`${API_BASE}/assemblers?active=${onlyActive}`);
      if (res.ok) return await res.json();
    } catch {}
    return store.getAssemblers(onlyActive);
  },

  saveAssembler: async (assembler: Assembler): Promise<void> => {
    store.saveAssembler(assembler);
    try {
      await fetch(`${API_BASE}/assemblers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assembler),
      });
    } catch {}
  },

  deleteAssembler: async (id: string): Promise<void> => {
    store.deleteAssembler(id);
    try {
      await fetch(`${API_BASE}/assemblers/${id}`, { method: 'DELETE' });
    } catch {}
  },

  // --- PRODUCT MASTER ---
  getProductModels: async (onlyActive = false): Promise<ProductModel[]> => {
    try {
      const res = await fetch(`${API_BASE}/models?active=${onlyActive}`);
      if (res.ok) return await res.json();
    } catch {}
    return store.getProductModels(onlyActive);
  },

  saveProductModel: async (model: ProductModel): Promise<void> => {
    store.saveProductModel(model);
    try {
      await fetch(`${API_BASE}/models`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(model),
      });
    } catch {}
  },

  deleteProductModel: async (id: string): Promise<void> => {
    store.deleteProductModel(id);
    try {
      await fetch(`${API_BASE}/models/${id}`, { method: 'DELETE' });
    } catch {}
  },

  // --- CHECKSHEET TEMPLATES & MASTER ---
  getChecksheetTemplates: async (filter?: {
    compGroup?: CompGroup;
    unitModel?: string;
    component?: string;
    testStage?: TestProcess;
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  }): Promise<ChecksheetTemplate[]> => {
    try {
      const params = new URLSearchParams(filter as any);
      const res = await fetch(`${API_BASE}/checksheet-templates?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch {}
    return store.getChecksheetTemplates(filter);
  },

  getChecksheetTemplateById: async (id: string): Promise<ChecksheetTemplate | undefined> => {
    try {
      const res = await fetch(`${API_BASE}/checksheet-templates/${id}`);
      if (res.ok) return await res.json();
    } catch {}
    return store.getChecksheetTemplateById(id);
  },

  getActiveTemplate: async (
    compGroup: CompGroup | string,
    unitModel: string,
    component: string,
    testStage: TestProcess
  ): Promise<ChecksheetTemplate | null> => {
    try {
      const params = new URLSearchParams({
        compGroup,
        unitModel,
        component,
        testStage,
      });
      const res = await fetch(`${API_BASE}/checksheet-templates/active?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch {}
    return store.getActiveTemplate(compGroup, unitModel, component, testStage);
  },

  createSnapshotFromTemplate: (template: ChecksheetTemplate): ChecksheetSnapshot => {
    return store.createSnapshotFromTemplate(template);
  },

  saveChecksheetTemplate: async (template: ChecksheetTemplate): Promise<void> => {
    store.saveChecksheetTemplate(template);
    try {
      await fetch(`${API_BASE}/checksheet-templates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template),
      });
    } catch {}
  },

  activateChecksheetTemplate: async (templateId: string): Promise<void> => {
    store.activateChecksheetTemplate(templateId);
    try {
      await fetch(`${API_BASE}/checksheet-templates/${templateId}/activate`, {
        method: 'POST',
      });
    } catch {}
  },

  createRevisionChecksheetTemplate: async (
    templateId: string
  ): Promise<ChecksheetTemplate | null> => {
    const res = store.createRevisionChecksheetTemplate(templateId);
    try {
      await fetch(`${API_BASE}/checksheet-templates/${templateId}/revision`, {
        method: 'POST',
      });
    } catch {}
    return res;
  },

  duplicateChecksheetTemplate: async (
    templateId: string
  ): Promise<ChecksheetTemplate | null> => {
    const res = store.duplicateChecksheetTemplate(templateId);
    try {
      await fetch(`${API_BASE}/checksheet-templates/${templateId}/duplicate`, {
        method: 'POST',
      });
    } catch {}
    return res;
  },

  deleteChecksheetTemplate: async (id: string): Promise<void> => {
    store.deleteChecksheetTemplate(id);
    try {
      await fetch(`${API_BASE}/checksheet-templates/${id}`, { method: 'DELETE' });
    } catch {}
  },

  // Legacy flat checksheets (fallback)
  getChecksheetItems: async (
    process?: TestProcess,
    category?: ProductCategory
  ): Promise<ChecksheetItem[]> => {
    try {
      const params = new URLSearchParams();
      if (process) params.set('process', process);
      if (category) params.set('category', category);
      const res = await fetch(`${API_BASE}/checksheets?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch {}
    return store.getChecksheetItems(process, category);
  },

  saveChecksheetItem: async (item: ChecksheetItem): Promise<void> => {
    store.saveChecksheetItem(item);
    try {
      await fetch(`${API_BASE}/checksheets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
    } catch {}
  },

  deleteChecksheetItem: async (id: string): Promise<void> => {
    store.deleteChecksheetItem(id);
    try {
      await fetch(`${API_BASE}/checksheets/${id}`, { method: 'DELETE' });
    } catch {}
  },

  // --- JO LOOKUP ---
  lookupJO: async (
    joNumber: string,
    stage: 'Dynotest' | 'Hydraulic Test'
  ): Promise<any> => {
    try {
      const res = await fetch(
        `${API_BASE}/jo/lookup?joNumber=${encodeURIComponent(
          joNumber
        )}&stage=${encodeURIComponent(stage)}`
      );
      const data = await res.json();
      if (!res.ok) {
        return { error: data.error || 'Failed to lookup JO' };
      }
      return data;
    } catch {}
    return store.lookupJOForStage(joNumber, stage);
  },

  // --- GLT ---
  saveGLTRecord: async (record: GLTRecord): Promise<GLTRecord> => {
    const saved = store.saveGLTRecord(record);
    try {
      await fetch(`${API_BASE}/records/glt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch {}
    return saved;
  },

  // --- DYNO ---
  saveDynoRecord: async (record: DynotestRecord): Promise<DynotestRecord> => {
    const saved = store.saveDynoRecord(record);
    try {
      await fetch(`${API_BASE}/records/dyno`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch {}
    return saved;
  },

  // --- HYDRAULIC ---
  saveHydraulicRecord: async (
    record: HydraulicRecord
  ): Promise<HydraulicRecord> => {
    const saved = store.saveHydraulicRecord(record);
    try {
      await fetch(`${API_BASE}/records/hydraulic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch {}
    return saved;
  },

  // --- HISTORY ---
  getCombinedJOHistory: async (
    filters: FilterParams = {}
  ): Promise<CombinedJORecords[]> => {
    try {
      const params = new URLSearchParams(filters as any);
      const res = await fetch(`${API_BASE}/records/history?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch {}
    return store.getCombinedJOHistory(filters);
  },

  // --- DASHBOARD ---
  getDashboardStats: async (
    filters: FilterParams = {}
  ): Promise<DashboardStats> => {
    try {
      const params = new URLSearchParams(filters as any);
      const res = await fetch(`${API_BASE}/dashboard/stats?${params.toString()}`);
      if (res.ok) return await res.json();
    } catch {}
    return store.getDashboardStats(filters);
  },

  // --- PRIORITY QUEUE ---
  getQueueRecords: async (compGroup?: CompGroup): Promise<QueueRecord[]> => {
    try {
      const res = await fetch(`${API_BASE}/queue${compGroup ? `?compGroup=${compGroup}` : ''}`);
      if (res.ok) return await res.json();
    } catch {}
    return store.getQueueRecords(compGroup);
  },

  reorderQueue: async (
    compGroup: CompGroup,
    queueRecordId: string,
    newPriority: number,
    changedBy: string,
    remark: string
  ): Promise<boolean> => {
    const success = store.reorderQueue(compGroup, queueRecordId, newPriority, changedBy, remark);
    try {
      await fetch(`${API_BASE}/queue/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ compGroup, queueRecordId, newPriority, changedBy, remark }),
      });
    } catch {}
    return success;
  },

  assignUrgentPriority: async (
    queueRecordId: string,
    priority: number,
    changedBy: string,
    remark: string
  ): Promise<boolean> => {
    const success = store.assignUrgentPriority(queueRecordId, priority, changedBy, remark);
    try {
      await fetch(`${API_BASE}/queue/assign-urgent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueRecordId, priority, changedBy, remark }),
      });
    } catch {}
    return success;
  },

  applyAIRecommendation: async (queueRecordId: string, changedBy: string): Promise<boolean> => {
    const success = store.applyAIRecommendation(queueRecordId, changedBy);
    try {
      await fetch(`${API_BASE}/queue/apply-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queueRecordId, changedBy }),
      });
    } catch {}
    return success;
  },

  syncPPCDataSource: async (currentUser: string): Promise<{ added: number; updated: number }> => {
    return await prioritySourceService.syncWithStore(currentUser);
  },

  // --- PRODUCT MASTER VALIDATION & STARTER TEMPLATES ---
  validateProductMaster: async (): Promise<ProductMasterValidationReport> => {
    return store.validateProductMaster();
  },

  ensureStarterChecksheetsForAllActiveProducts: async (): Promise<{
    createdCount: number;
    alreadyExistingCount: number;
  }> => {
    return store.ensureStarterChecksheetsForAllActiveProducts();
  },

  bulkActivateStarterTemplates: async (): Promise<number> => {
    return store.bulkActivateStarterTemplates();
  },

  // --- PDF REPORTS & CERTIFICATES ---
  getPDFReportsForJO: async (joNumber: string): Promise<PDFTestReportRecord[]> => {
    return store.getPDFReportsForJO(joNumber);
  },

  generatePDFReport: async (jo: CombinedJORecords, user?: string): Promise<PDFTestReportRecord> => {
    return pdfReportService.generateTestReportRecord(jo, user);
  },

  getCertificatesForJO: async (joNumber: string): Promise<QualityCertificateRecord[]> => {
    return store.getCertificatesForJO(joNumber);
  },

  generateQualityCertificate: async (jo: CombinedJORecords, user?: string): Promise<QualityCertificateRecord> => {
    return pdfReportService.generateQualityCertificateRecord(jo, user);
  },

  // --- RESET DATA ---
  resetSeedData: async (): Promise<void> => {
    store.resetToDefault();
    try {
      await fetch(`${API_BASE}/seed/reset`, { method: 'POST' });
    } catch {}
  },
};
