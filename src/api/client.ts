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
  TestingLine,
  PDFTestReportRecord,
  QualityCertificateRecord,
  ProductMasterValidationReport,
} from '../types';

import { store } from '../data/storageEngine';
import { prioritySourceService } from '../services/prioritySourceService';
import { pdfReportService } from '../services/pdfReportService';

export const apiClient = {
  // --- USERS ---
  getUsers: async (): Promise<User[]> => {
    return store.getUsers();
  },

  saveUser: async (user: User): Promise<void> => {
    return store.saveUser(user);
  },

  deleteUser: async (id: string): Promise<void> => {
    return store.deleteUser(id);
  },

  changePassword: async (userId: string, newPass: string): Promise<boolean> => {
    return store.changeUserPassword(userId, newPass);
  },

  // --- ASSEMBLER MASTER ---
  getAssemblers: async (onlyActive = false): Promise<Assembler[]> => {
    return store.getAssemblers(onlyActive);
  },

  saveAssembler: async (assembler: Assembler): Promise<void> => {
    return store.saveAssembler(assembler);
  },

  deleteAssembler: async (id: string): Promise<void> => {
    return store.deleteAssembler(id);
  },

  // --- PRODUCT MASTER ---
  getProductModels: async (onlyActive = false): Promise<ProductModel[]> => {
    return store.getProductModels(onlyActive);
  },

  saveProductModel: async (model: ProductModel): Promise<void> => {
    return store.saveProductModel(model);
  },

  deleteProductModel: async (id: string): Promise<void> => {
    return store.deleteProductModel(id);
  },

  // --- CHECKSHEET TEMPLATES & MASTER ---
  getChecksheetTemplates: async (filter?: {
    compGroup?: CompGroup;
    unitModel?: string;
    component?: string;
    testStage?: TestProcess;
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  }): Promise<ChecksheetTemplate[]> => {
    return store.getChecksheetTemplates(filter);
  },

  getChecksheetTemplateById: async (id: string): Promise<ChecksheetTemplate | undefined> => {
    return store.getChecksheetTemplateById(id);
  },

  getActiveTemplate: async (
    compGroup: CompGroup | string,
    unitModel: string,
    component: string,
    testStage: TestProcess
  ): Promise<ChecksheetTemplate | null> => {
    return store.getActiveTemplate(compGroup, unitModel, component, testStage);
  },

  createSnapshotFromTemplate: (template: ChecksheetTemplate): ChecksheetSnapshot => {
    return store.createSnapshotFromTemplate(template);
  },

  saveChecksheetTemplate: async (template: ChecksheetTemplate): Promise<void> => {
    return store.saveChecksheetTemplate(template);
  },

  activateChecksheetTemplate: async (templateId: string): Promise<void> => {
    return store.activateChecksheetTemplate(templateId);
  },

  createRevisionChecksheetTemplate: async (
    templateId: string
  ): Promise<ChecksheetTemplate | null> => {
    return store.createRevisionChecksheetTemplate(templateId);
  },

  duplicateChecksheetTemplate: async (
    templateId: string
  ): Promise<ChecksheetTemplate | null> => {
    return store.duplicateChecksheetTemplate(templateId);
  },

  deleteChecksheetTemplate: async (id: string): Promise<void> => {
    return store.deleteChecksheetTemplate(id);
  },

  // Legacy flat checksheets
  getChecksheetItems: async (
    process?: TestProcess,
    category?: ProductCategory
  ): Promise<ChecksheetItem[]> => {
    return store.getChecksheetItems(process, category);
  },

  saveChecksheetItem: async (item: ChecksheetItem): Promise<void> => {
    return store.saveChecksheetItem(item);
  },

  deleteChecksheetItem: async (id: string): Promise<void> => {
    return store.deleteChecksheetItem(id);
  },

  // --- JO LOOKUP ---
  lookupJO: async (
    joNumber: string,
    stage: 'Dynotest' | 'Hydraulic Test'
  ): Promise<any> => {
    return store.lookupJOForStage(joNumber, stage);
  },

  // --- GLT ---
  saveGLTRecord: async (record: GLTRecord): Promise<GLTRecord> => {
    return store.saveGLTRecord(record);
  },

  // --- DYNO ---
  saveDynoRecord: async (record: DynotestRecord): Promise<DynotestRecord> => {
    return store.saveDynoRecord(record);
  },

  // --- HYDRAULIC ---
  saveHydraulicRecord: async (
    record: HydraulicRecord
  ): Promise<HydraulicRecord> => {
    return store.saveHydraulicRecord(record);
  },

  // --- HISTORY ---
  getCombinedJOHistory: async (
    filters: FilterParams = {}
  ): Promise<CombinedJORecords[]> => {
    return store.getCombinedJOHistory(filters);
  },

  // --- DASHBOARD ---
  getDashboardStats: async (
    filters: FilterParams = {}
  ): Promise<DashboardStats> => {
    return store.getDashboardStats(filters);
  },

  // --- PRIORITY QUEUE ---
  getQueueRecords: async (compGroup?: CompGroup): Promise<QueueRecord[]> => {
    return store.getQueueRecords(compGroup);
  },

  reorderQueue: async (
    compGroup: CompGroup,
    queueRecordId: string,
    newPriority: number,
    changedBy: string,
    remark: string
  ): Promise<boolean> => {
    return store.reorderQueue(compGroup, queueRecordId, newPriority, changedBy, remark);
  },

  assignUrgentPriority: async (
    queueRecordId: string,
    priority: number,
    changedBy: string,
    remark: string
  ): Promise<boolean> => {
    return store.assignUrgentPriority(queueRecordId, priority, changedBy, remark);
  },

  applyAIRecommendation: async (queueRecordId: string, changedBy: string): Promise<boolean> => {
    return store.applyAIRecommendation(queueRecordId, changedBy);
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

  // --- TESTING LINES ---
  getTestingLines: async (onlyActive = false): Promise<TestingLine[]> => {
    return store.getTestingLines(onlyActive);
  },

  saveTestingLine: async (line: TestingLine, actorName = 'Admin'): Promise<void> => {
    return store.saveTestingLine(line, actorName);
  },

  deleteTestingLine: async (id: string): Promise<void> => {
    return store.deleteTestingLine(id);
  },

  // --- RESET DATA ---
  resetSeedData: async (): Promise<void> => {
    return store.resetToDefault();
  },
};
