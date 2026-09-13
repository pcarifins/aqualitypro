import {
  User,
  Assembler,
  ProductModel,
  ChecksheetItem,
  ChecksheetTemplate,
  ChecksheetSection,
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
  TestResult,
  QueueRecord,
  TestingLine,
  PDFTestReportRecord,
  QualityCertificateRecord,
  ProductMasterValidationReport,
  TestOverride,
  TemplateRelationship,
  StandardProfile,
} from '../types';

import {
  initialUsers,
  initialAssemblers,
  initialProductModels,
  initialChecksheetTemplates,
  initialChecksheetItems,
  initialGLTRecords,
  initialDynotestRecords,
  initialHydraulicRecords,
  initialTemplateRelationships,
  initialStandardProfiles,
} from './initialData';

import { INITIAL_REQUIRED_PRODUCT_MODELS, getProductModelId } from './productMasterSeed';
import { initialQueueRecords } from './initialQueueData';
import { initialTestingLines } from './initialTestingLines';
import { computeUnifiedAnalytics } from '../services/analyticsService';
import { normalizeString } from '../utils/normalization';
import { findMatchingProduct, getCompatibleTemplates } from '../utils/checksheetResolver';
import { cleansePPCProductData } from '../utils/ppcCleansing';

import {
  saveDocument,
  removeDocument,
  subscribeToCollection,
  logAuditEvent,
  initializeAndMigrateFirestore,
  sanitizeFirestoreValue,
  testFirestoreConnection,
  isQuotaError,
  isFirestoreQuotaExceeded,
  markQuotaExceeded,
} from '../lib/firestoreSync';

import {
  TemplateCleanupService,
  DryRunReport,
  TemplateBackupSnapshot,
  isStarterOrFallbackTemplate,
  TARGET_LEGACY_TEMPLATE_IDS,
  APPROVED_SHARED_TEMPLATE_IDS,
  PROTECTED_CONTINGENCY_TEMPLATE_IDS,
} from '../services/templateCleanupService';

const STORAGE_KEYS = {
  USERS: 'aquality_users_v2',
  ASSEMBLERS: 'aquality_assemblers_v2',
  MODELS: 'aquality_models_v2',
  TEMPLATES: 'aquality_templates_v2',
  CHECKSHEETS: 'aquality_checksheets_v2',
  GLT: 'aquality_glt_v2',
  DYNO: 'aquality_dyno_v2',
  HYDRAULIC: 'aquality_hydraulic_v2',
  QUEUE: 'aquality_queue_v2',
  TESTING_LINES: 'aquality_testing_lines_v2',
  PDF_REPORTS: 'aquality_pdf_reports_v2',
  CERTIFICATES: 'aquality_certificates_v2',
  TEST_OVERRIDES: 'aquality_test_overrides_v2',
  RELATIONSHIPS: 'aquality_relationships_v2',
  STANDARD_PROFILES: 'aquality_standard_profiles_v2',
};

const getStorage = (key: string): string | null => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const setStorage = (key: string, val: string): void => {
  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    localStorage.setItem(key, val);
  }
};

export class DataStore {
  private users: User[] = [];
  private assemblers: Assembler[] = [];
  private models: ProductModel[] = [];
  private templates: ChecksheetTemplate[] = [];
  private checksheets: ChecksheetItem[] = [];
  private gltRecords: GLTRecord[] = [];
  private dynoRecords: DynotestRecord[] = [];
  private hydraulicRecords: HydraulicRecord[] = [];
  private queueRecords: QueueRecord[] = [];
  private testingLines: TestingLine[] = [];
  private pdfReports: PDFTestReportRecord[] = [];
  private certificates: QualityCertificateRecord[] = [];
  private auditLogs: any[] = [];
  private testOverrides: TestOverride[] = [];
  private templateRelationships: TemplateRelationship[] = [];
  private standardProfiles: StandardProfile[] = [];

  private listeners: (() => void)[] = [];
  private isInitialized = false;
  private isInitializedFinished = false;
  private unsubscribeFuncs: (() => void)[] = [];

  constructor() {
    this.loadFromStorageCache();
  }

  // Subscribe to changes in DataStore (for React re-renders)
  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l());
  }

  // Initialize Realtime Firestore Synchronization across all connected devices
  public async initializeRealtimeSync(): Promise<void> {
    if (this.isInitialized) return;
    this.isInitialized = true;
    this.isInitializedFinished = false;

    // 1. Connection check
    const conn = await testFirestoreConnection();
    if (!conn.connected) {
      console.warn("Firestore connection check failed. Operating in offline/cached fallback mode: ", conn.message);
      // We will allow the app to initialize with cached local state
      this.isInitializedFinished = true;
      this.notifyListeners();
      return;
    }

    // 2. Perform self-healing master-data audit and recovery
    await initializeAndMigrateFirestore();

    // Set up helper to resolve on first snapshot
    const subscribeAndResolve = <T>(
      collectionName: string,
      callback: (data: T[]) => void
    ): Promise<() => void> => {
      return new Promise((resolve, reject) => {
        let isFirst = true;
        const unsub = subscribeToCollection<T>(
          collectionName,
          (data) => {
            callback(data);
            if (isFirst) {
              isFirst = false;
              resolve(unsub);
            }
          },
          (err) => {
            console.error(`First load of ${collectionName} failed:`, err);
            if (isFirst) {
              isFirst = false;
              reject(err);
            }
          }
        );
      });
    };

    try {
      const results = await Promise.all([
        subscribeAndResolve<User>('users', (data) => {
          if (data && (data.length > 0 || this.isInitializedFinished)) {
            this.users = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<Assembler>('assemblers', (data) => {
          if (data && (data.length > 0 || this.isInitializedFinished)) {
            this.assemblers = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<ProductModel>('productModels', (data) => {
          if (data && (data.length > 0 || this.isInitializedFinished)) {
            this.models = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<ChecksheetTemplate>('checksheetTemplates', (data) => {
          if (data && (data.length > 0 || this.isInitializedFinished)) {
            this.templates = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<ChecksheetItem>('checksheets', (data) => {
          if (data && (data.length > 0 || this.isInitializedFinished)) {
            this.checksheets = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<QueueRecord>('priorityQueue', async (data) => {
          if (data) {
            const mapped = data.map((q) => ({
              ...q,
              queueRecordId: q.queueRecordId || (q as any).id,
            }));
            const updated = await this.ensureTestingLineAssignments(mapped);
            if (!updated) {
              this.queueRecords = mapped;
              this.normalizeQueuePriorities();
              this.saveToStorageCache();
              this.notifyListeners();
            }
          }
        }),
        subscribeAndResolve<TestingLine>('testingLines', (data) => {
          if (data && data.length > 0) {
            this.testingLines = data;
            this.saveToStorageCache();
            this.notifyListeners();
          } else if (data && data.length === 0) {
            this.testingLines = [...initialTestingLines];
            this.testingLines.forEach((tl) => saveDocument('testingLines', tl));
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<GLTRecord>('gltRecords', (data) => {
          if (data) {
            this.gltRecords = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<DynotestRecord>('dynoRecords', (data) => {
          if (data) {
            this.dynoRecords = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<HydraulicRecord>('hydraulicRecords', (data) => {
          if (data) {
            this.hydraulicRecords = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<PDFTestReportRecord>('pdfReports', (data) => {
          if (data) {
            this.pdfReports = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<QualityCertificateRecord>('certificates', (data) => {
          if (data) {
            this.certificates = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<any>('auditLogs', (data) => {
          if (data) {
            this.auditLogs = data;
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<TestOverride>('testOverrides', (data) => {
          if (data) {
            this.testOverrides = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        }),
        subscribeAndResolve<TemplateRelationship>('productChecksheetRelationships', (data) => {
          if (data && data.length > 0) {
            this.templateRelationships = data;
            this.saveToStorageCache();
            this.notifyListeners();
          } else {
            // Fallback to legacy collection if productChecksheetRelationships is not yet populated
            subscribeAndResolve<TemplateRelationship>('templateRelationships', (legacyData) => {
              if (legacyData && legacyData.length > 0) {
                this.templateRelationships = legacyData;
                this.saveToStorageCache();
                this.notifyListeners();
              }
            });
          }
        }),
        subscribeAndResolve<StandardProfile>('standardProfiles', (data) => {
          if (data) {
            this.standardProfiles = data;
            this.saveToStorageCache();
            this.notifyListeners();
          }
        })
      ]);

      this.unsubscribeFuncs = results;
      this.isInitializedFinished = true;
      this.notifyListeners();
    } catch (err) {
      console.error("Error during deterministic realtime sync subscription:", err);
      this.isInitialized = false;
      this.isInitializedFinished = true;
      throw err;
    }
  }

  public getIsInitialized(): boolean {
    return this.isInitialized;
  }

  public getAssemblersCount(): number {
    return this.assemblers.length;
  }

  public getChecksheetTemplatesCount(): number {
    return this.templates.length;
  }

  public getChecksheetsCount(): number {
    return this.checksheets.length;
  }

  public cleanupSync() {
    this.unsubscribeFuncs.forEach((fn) => fn());
    this.unsubscribeFuncs = [];
    this.isInitialized = false;
  }

  private loadFromStorageCache() {
    try {
      const u = getStorage(STORAGE_KEYS.USERS);
      this.users = u ? JSON.parse(u) : [...initialUsers];

      const a = getStorage(STORAGE_KEYS.ASSEMBLERS);
      this.assemblers = a ? JSON.parse(a) : [...initialAssemblers];

      const m = getStorage(STORAGE_KEYS.MODELS);
      this.models = m ? JSON.parse(m) : [...initialProductModels, ...INITIAL_REQUIRED_PRODUCT_MODELS];

      const t = getStorage(STORAGE_KEYS.TEMPLATES);
      const parsedTemplates: ChecksheetTemplate[] = t ? JSON.parse(t) : [...initialChecksheetTemplates];
      // Filter out any legacy starter templates completely
      this.templates = parsedTemplates.filter(
        (tmpl) =>
          !tmpl.id.startsWith('tmpl-starter-') &&
          !tmpl.name.toLowerCase().includes('starter checksheet') &&
          !tmpl.name.toLowerCase().includes('trial checksheet')
      );
      if (this.templates.length === 0) {
        this.templates = [...initialChecksheetTemplates];
      }

      const c = getStorage(STORAGE_KEYS.CHECKSHEETS);
      this.checksheets = c ? JSON.parse(c) : [...initialChecksheetItems];

      const g = getStorage(STORAGE_KEYS.GLT);
      this.gltRecords = g ? JSON.parse(g) : [...initialGLTRecords];

      const d = getStorage(STORAGE_KEYS.DYNO);
      this.dynoRecords = d ? JSON.parse(d) : [...initialDynotestRecords];

      const h = getStorage(STORAGE_KEYS.HYDRAULIC);
      this.hydraulicRecords = h ? JSON.parse(h) : [...initialHydraulicRecords];

      const q = getStorage(STORAGE_KEYS.QUEUE);
      this.queueRecords = q ? JSON.parse(q) : [...initialQueueRecords];

      const tl = getStorage(STORAGE_KEYS.TESTING_LINES);
      this.testingLines = tl ? JSON.parse(tl) : [...initialTestingLines];

      const rep = getStorage(STORAGE_KEYS.PDF_REPORTS);
      this.pdfReports = rep ? JSON.parse(rep) : [];

      const cert = getStorage(STORAGE_KEYS.CERTIFICATES);
      this.certificates = cert ? JSON.parse(cert) : [];

      const ovr = getStorage(STORAGE_KEYS.TEST_OVERRIDES);
      this.testOverrides = ovr ? JSON.parse(ovr) : [];

      const rel = getStorage(STORAGE_KEYS.RELATIONSHIPS);
      this.templateRelationships = rel ? JSON.parse(rel) : [...initialTemplateRelationships];
      if (this.templateRelationships.length === 0) {
        this.templateRelationships = [...initialTemplateRelationships];
      }

      const prof = getStorage(STORAGE_KEYS.STANDARD_PROFILES);
      this.standardProfiles = prof ? JSON.parse(prof) : [...initialStandardProfiles];
      if (this.standardProfiles.length === 0) {
        this.standardProfiles = [...initialStandardProfiles];
      }

      // Guarantee production checksheet architecture (2 GLT + 15 Shared Final + 1 Contingency)
      this.ensureProductionTemplates();
    } catch {
      this.resetToDefault();
    }
  }

  private saveToStorageCache() {
    try {
      setStorage(STORAGE_KEYS.USERS, JSON.stringify(this.users));
      setStorage(STORAGE_KEYS.ASSEMBLERS, JSON.stringify(this.assemblers));
      setStorage(STORAGE_KEYS.MODELS, JSON.stringify(this.models));
      setStorage(STORAGE_KEYS.TEMPLATES, JSON.stringify(this.templates));
      setStorage(STORAGE_KEYS.CHECKSHEETS, JSON.stringify(this.checksheets));
      setStorage(STORAGE_KEYS.GLT, JSON.stringify(this.gltRecords));
      setStorage(STORAGE_KEYS.DYNO, JSON.stringify(this.dynoRecords));
      setStorage(STORAGE_KEYS.HYDRAULIC, JSON.stringify(this.hydraulicRecords));
      setStorage(STORAGE_KEYS.QUEUE, JSON.stringify(this.queueRecords));
      setStorage(STORAGE_KEYS.TESTING_LINES, JSON.stringify(this.testingLines));
      setStorage(STORAGE_KEYS.PDF_REPORTS, JSON.stringify(this.pdfReports));
      setStorage(STORAGE_KEYS.CERTIFICATES, JSON.stringify(this.certificates));
      setStorage(STORAGE_KEYS.TEST_OVERRIDES, JSON.stringify(this.testOverrides));
      setStorage(STORAGE_KEYS.RELATIONSHIPS, JSON.stringify(this.templateRelationships));
      setStorage(STORAGE_KEYS.STANDARD_PROFILES, JSON.stringify(this.standardProfiles));
    } catch {}
  }

  public resetToDefault() {
    this.users = [...initialUsers];
    this.assemblers = [...initialAssemblers];
    this.models = [...initialProductModels, ...INITIAL_REQUIRED_PRODUCT_MODELS];
    this.templates = [...initialChecksheetTemplates];
    this.checksheets = [...initialChecksheetItems];
    this.gltRecords = [...initialGLTRecords];
    this.dynoRecords = [...initialDynotestRecords];
    this.hydraulicRecords = [...initialHydraulicRecords];
    this.queueRecords = [...initialQueueRecords];
    this.testingLines = [...initialTestingLines];
    this.pdfReports = [];
    this.certificates = [];
    this.templateRelationships = [...initialTemplateRelationships];
    this.standardProfiles = [...initialStandardProfiles];
    this.saveToStorageCache();
    this.notifyListeners();
  }

  // ==========================================
  // --- USERS ---
  // ==========================================
  public getUsers(): User[] {
    return this.users;
  }

  public getUserById(id: string): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  public async saveUser(user: User, actorName = 'Admin'): Promise<void> {
    const idx = this.users.findIndex((u) => u.id === user.id);
    const isNew = idx < 0;
    const prev = isNew ? null : this.users[idx];

    if (idx >= 0) {
      this.users[idx] = { ...this.users[idx], ...user };
    } else {
      this.users.push(user);
    }
    this.saveToStorageCache();

    await saveDocument('users', user);
    await logAuditEvent({
      action: isNew ? 'CREATE_USER' : 'UPDATE_USER',
      collectionName: 'users',
      documentId: user.id,
      userName: actorName,
      details: `${isNew ? 'Created' : 'Updated'} user ${user.username} (${user.role})`,
      previousValue: prev,
      newValue: user,
    });
    this.notifyListeners();
  }

  public async deleteUser(id: string, actorName = 'Admin'): Promise<void> {
    const target = this.users.find((u) => u.id === id);
    this.users = this.users.filter((u) => u.id !== id);
    this.saveToStorageCache();

    await removeDocument('users', id);
    if (target) {
      await logAuditEvent({
        action: 'DELETE_USER',
        collectionName: 'users',
        documentId: id,
        userName: actorName,
        details: `Deleted user ${target.username}`,
        previousValue: target,
      });
    }
    this.notifyListeners();
  }

  public async changeUserPassword(userId: string, newPass: string, actorName = 'Admin'): Promise<boolean> {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.password = newPass;
      this.saveToStorageCache();
      await saveDocument('users', user);
      await logAuditEvent({
        action: 'CHANGE_PASSWORD',
        collectionName: 'users',
        documentId: userId,
        userName: actorName,
        details: `Changed password for user ${user.username}`,
      });
      this.notifyListeners();
      return true;
    }
    return false;
  }

  // ==========================================
  // --- ASSEMBLERS ---
  // ==========================================
  public getAssemblers(onlyActive = false): Assembler[] {
    if (onlyActive) {
      return this.assemblers.filter((a) => a.active);
    }
    return this.assemblers;
  }

  public async saveAssembler(assembler: Assembler, actorName = 'Admin'): Promise<void> {
    const idx = this.assemblers.findIndex((a) => a.id === assembler.id);
    const isNew = idx < 0;
    if (idx >= 0) {
      this.assemblers[idx] = assembler;
    } else {
      this.assemblers.push(assembler);
    }
    this.saveToStorageCache();

    await saveDocument('assemblers', assembler);
    await logAuditEvent({
      action: isNew ? 'CREATE_ASSEMBLER' : 'UPDATE_ASSEMBLER',
      collectionName: 'assemblers',
      documentId: assembler.id,
      userName: actorName,
      details: `${isNew ? 'Created' : 'Updated'} assembler ${assembler.name}`,
      newValue: assembler,
    });
    this.notifyListeners();
  }

  public async deleteAssembler(id: string, actorName = 'Admin'): Promise<void> {
    const target = this.assemblers.find((a) => a.id === id);
    this.assemblers = this.assemblers.filter((a) => a.id !== id);
    this.saveToStorageCache();

    await removeDocument('assemblers', id);
    if (target) {
      await logAuditEvent({
        action: 'DELETE_ASSEMBLER',
        collectionName: 'assemblers',
        documentId: id,
        userName: actorName,
        details: `Deleted assembler ${target.name}`,
        previousValue: target,
      });
    }
    this.notifyListeners();
  }

  // ==========================================
  // --- PRODUCT MASTER ---
  // ==========================================
  public getProductModels(onlyActive = false): ProductModel[] {
    if (onlyActive) {
      return this.models.filter((m) => m.active);
    }
    return this.models;
  }

  public async saveProductModel(model: ProductModel, actorName = 'Admin'): Promise<void> {
    const idx = this.models.findIndex((m) => m.id === model.id);
    const previousValue = idx >= 0 ? this.models[idx] : null;

    // FIRESTORE FIRST
    await saveDocument(
      'productModels',
      model
    );

    const isNew = idx < 0;
    if (idx >= 0) {
      this.models[idx] = model;
    } else {
      this.models.push(model);
    }
    this.saveToStorageCache();

    await saveDocument('productModels', model);
    await logAuditEvent({
      action: isNew ? 'CREATE_PRODUCT_MODEL' : 'UPDATE_PRODUCT_MODEL',
      collectionName: 'productModels',
      documentId: model.id,
      userName: actorName,
      details: `${isNew ? 'Created' : 'Updated'} model ${model.unitModel} / ${model.component}`,
      newValue: model,
    });
    this.notifyListeners();
  }

  public async deleteProductModel(id: string, actorName = 'Admin'): Promise<void> {
    const target = this.models.find((m) => m.id === id);
    this.models = this.models.filter((m) => m.id !== id);
    this.saveToStorageCache();

    await removeDocument('productModels', id);
    if (target) {
      await logAuditEvent({
        action: 'DELETE_PRODUCT_MODEL',
        collectionName: 'productModels',
        documentId: id,
        userName: actorName,
        details: `Deleted model ${target.unitModel} / ${target.component}`,
        previousValue: target,
      });
    }
    this.notifyListeners();
  }

  public validateProductMaster(): ProductMasterValidationReport {
    let engineCount = 0;
    let ptCount = 0;
    let ppmCount = 0;
    let cylinderCount = 0;

    this.models.forEach((m) => {
      if (!m.active) return;
      if (m.compGroup === 'Engine') {
        engineCount++;
      } else if (m.compGroup === 'PT-PPM') {
        if (m.subGroup === 'PPM' || m.component.toUpperCase().includes('PUMP') || m.component.toUpperCase().includes('VALVE')) {
          ppmCount++;
        } else {
          ptCount++;
        }
      } else if (m.compGroup === 'Cylinder') {
        cylinderCount++;
      }
    });

    const totalActive = engineCount + ptCount + ppmCount + cylinderCount;
    const missingRequired = Math.max(0, 169 - totalActive);

    return {
      totalRequired: 169,
      totalConfigured: totalActive,
      engineCount,
      ptCount,
      ppmCount,
      cylinderCount,
      missingRequired,
      isValid: missingRequired === 0,
      details: {
        engineRequired: 23,
        ptRequired: 89,
        ppmRequired: 19,
        cylinderRequired: 38,
      },
    };
  }

  public ensureProductionTemplates(): {
    activeTemplateCount: number;
    purgedStarterCount: number;
  } {
    const prevCount = this.templates.length;
    // Purge all starter/trial/fallback templates completely
    this.templates = this.templates.filter(
      (tmpl) => !isStarterOrFallbackTemplate(tmpl.id, tmpl.name)
    );

    // Ensure all 18 production templates exist and are ACTIVE
    initialChecksheetTemplates.forEach((defTmpl) => {
      const idx = this.templates.findIndex((t) => t.id === defTmpl.id);
      if (idx >= 0) {
        this.templates[idx] = { ...defTmpl, status: 'ACTIVE' };
      } else {
        this.templates.push({ ...defTmpl, status: 'ACTIVE' });
      }
    });

    const purgedStarterCount = prevCount - this.templates.length;
    this.saveToStorageCache();
    this.notifyListeners();
    return { activeTemplateCount: this.templates.length, purgedStarterCount };
  }

  public ensureStarterChecksheetsForAllActiveProducts(): {
    createdCount: number;
    alreadyExistingCount: number;
  } {
    const res = this.ensureProductionTemplates();
    return { createdCount: 0, alreadyExistingCount: res.activeTemplateCount };
  }

  public bulkActivateStarterTemplates(): number {
    const res = this.ensureProductionTemplates();
    return res.activeTemplateCount;
  }

  // ==========================================
  // --- CHECKSHEET TEMPLATES ---
  // ==========================================
  public getChecksheetTemplates(filter?: {
    compGroup?: CompGroup;
    unitModel?: string;
    component?: string;
    testStage?: TestProcess;
    status?: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  }): ChecksheetTemplate[] {
    let list = [...this.templates];
    if (filter) {
      if (filter.compGroup) list = list.filter((t) => t.compGroup === filter.compGroup);
      if (filter.unitModel && filter.unitModel !== 'ALL') {
        list = list.filter((t) => t.unitModel === filter.unitModel || t.unitModel === 'ALL');
      }
      if (filter.component) {
        list = list.filter((t) => t.component.toLowerCase() === filter.component?.toLowerCase());
      }
      if (filter.testStage) list = list.filter((t) => t.testStage === filter.testStage);
      if (filter.status) list = list.filter((t) => t.status === filter.status);
    }
    return list;
  }

  public getChecksheetTemplateById(id: string): ChecksheetTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  public getActiveTemplate(
    compGroup: CompGroup | string,
    unitModel: string,
    component: string,
    testStage: TestProcess
  ): ChecksheetTemplate | null {
    const product = findMatchingProduct(this.models, component, unitModel);
    if (!product) return null;

    const compatibles = getCompatibleTemplates(this.templates, product, testStage, this.getTemplateRelationships());
    return compatibles.length > 0 ? compatibles[0] : null;
  }

  public createSnapshotFromTemplate(template: ChecksheetTemplate): ChecksheetSnapshot {
    return {
      templateId: template.id,
      templateName: template.name,
      revision: template.revision,
      compGroup: template.compGroup,
      unitModel: template.unitModel,
      component: template.component,
      testStage: template.testStage,
      snapshottedAt: new Date().toISOString(),
      sections: template.sections
        .map((sec) => ({
          id: sec.id,
          name: sec.name,
          displayOrder: sec.displayOrder,
          items: sec.items
            .filter((item) => item.active)
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((item) => ({
              id: item.id,
              itemName: item.itemName,
              inputType: item.inputType,
              unit: item.unit,
              validation: item.validation || 'NONE',
              minimumValue: item.minimumValue,
              maximumValue: item.maximumValue,
              targetValue: item.targetValue,
              toleranceValue: item.toleranceValue,
              displayOrder: item.displayOrder,
              mandatory: item.mandatory,
            })),
        }))
        .filter((sec) => sec.items.length > 0)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    };
  }

  public async saveChecksheetTemplate(template: ChecksheetTemplate, actorName = 'Admin'): Promise<void> {
    if (isStarterOrFallbackTemplate(template.id, template.name)) {
      console.warn(`[storageEngine] Blocked attempt to create or save starter/fallback template: ${template.id}`);
      return;
    }

    if (!template.productMasterId && template.component && template.unitModel) {
      const matched = findMatchingProduct(this.models, template.component, template.unitModel);
      if (matched) {
        template.productMasterId = matched.id;
      }
    }

    const idx = this.templates.findIndex((t) => t.id === template.id);
    template.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      this.templates[idx] = template;
    } else {
      this.templates.push(template);
    }
    this.saveToStorageCache();

    await saveDocument('checksheetTemplates', template);
    await logAuditEvent({
      action: idx >= 0 ? 'UPDATE_CHECKSHEET_TEMPLATE' : 'CREATE_CHECKSHEET_TEMPLATE',
      collectionName: 'checksheetTemplates',
      documentId: template.id,
      userName: actorName,
      details: `Saved template ${template.name}`,
      newValue: template,
    });
    this.notifyListeners();
  }

  public async activateChecksheetTemplate(templateId: string, actorName = 'Admin'): Promise<void> {
    const target = this.templates.find((t) => t.id === templateId);
    if (!target) return;

    this.templates.forEach((t) => {
      if (
        t.id !== templateId &&
        t.component.toLowerCase() === target.component.toLowerCase() &&
        t.unitModel.toUpperCase() === target.unitModel.toUpperCase() &&
        t.testStage === target.testStage &&
        t.status === 'ACTIVE'
      ) {
        t.status = 'ARCHIVED';
        t.updatedAt = new Date().toISOString();
        saveDocument('checksheetTemplates', t);
      }
    });

    target.status = 'ACTIVE';
    target.activatedAt = new Date().toISOString();
    target.updatedAt = new Date().toISOString();

    this.saveToStorageCache();
    await saveDocument('checksheetTemplates', target);
    await logAuditEvent({
      action: 'ACTIVATE_CHECKSHEET_TEMPLATE',
      collectionName: 'checksheetTemplates',
      documentId: templateId,
      userName: actorName,
      details: `Activated template ${target.name}`,
    });
    this.notifyListeners();
  }

  public async createRevisionChecksheetTemplate(templateId: string, actorName = 'Admin'): Promise<ChecksheetTemplate | null> {
    const source = this.templates.find((t) => t.id === templateId);
    if (!source) return null;

    const newRev = (source.revision || 1) + 1;
    const newTemplate: ChecksheetTemplate = {
      ...JSON.parse(JSON.stringify(source)),
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `${source.name.replace(/ \(Rev \d+\)$/, '')} (Rev ${newRev})`,
      revision: newRev,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activatedAt: undefined,
    };

    this.templates.push(newTemplate);
    this.saveToStorageCache();

    await saveDocument('checksheetTemplates', newTemplate);
    await logAuditEvent({
      action: 'REVISE_CHECKSHEET_TEMPLATE',
      collectionName: 'checksheetTemplates',
      documentId: newTemplate.id,
      userName: actorName,
      details: `Created revision ${newRev} for ${source.name}`,
    });
    this.notifyListeners();
    return newTemplate;
  }

  public async duplicateChecksheetTemplate(templateId: string, actorName = 'Admin'): Promise<ChecksheetTemplate | null> {
    const source = this.templates.find((t) => t.id === templateId);
    if (!source) return null;

    const newTemplate: ChecksheetTemplate = {
      ...JSON.parse(JSON.stringify(source)),
      id: `tmpl-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: `${source.name} (Copy)`,
      revision: 1,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      activatedAt: undefined,
    };

    this.templates.push(newTemplate);
    this.saveToStorageCache();

    await saveDocument('checksheetTemplates', newTemplate);
    this.notifyListeners();
    return newTemplate;
  }

  public getTemplateReferenceSummary(templateId: string): {
    templateId: string;
    templateName: string;
    compGroup?: string;
    testStage?: string;
    revision?: number;
    status?: string;
    activeRelationshipCount: number;
    activeRelationshipDetails: string[];
    completedTestRefCount: number;
    certificateRefCount: number;
    isProtected: boolean;
    canDelete: boolean;
    blockReason?: string;
  } {
    const target = this.templates.find((t) => t.id === templateId);
    const templateName = target?.name || templateId;

    // Active relationships
    const activeRels = this.templateRelationships.filter(
      (r) => r.status === 'ACTIVE' && r.templateId === templateId
    );
    const activeRelationshipCount = activeRels.length;
    const activeRelationshipDetails = activeRels.map(
      (r) => `${r.productId} (${r.unitModel} - ${r.componentName || r.component || 'Component'})`
    );

    // Completed tests
    let completedTestRefCount = 0;
    const checkTest = (tId?: string, snapTId?: string) => {
      if (tId === templateId || snapTId === templateId) {
        completedTestRefCount++;
      }
    };
    this.dynoRecords.forEach((r: any) => checkTest(r.templateId, r.checksheetSnapshot?.templateId));
    this.hydraulicRecords.forEach((r: any) => checkTest(r.templateId, r.checksheetSnapshot?.templateId));
    this.gltRecords.forEach((r: any) => checkTest(r.templateId, r.checksheetSnapshot?.templateId));

    // Certificates & PDF Reports
    let certificateRefCount = 0;
    const checkCert = (tId?: string, snapTId?: string) => {
      if (tId === templateId || snapTId === templateId) {
        certificateRefCount++;
      }
    };
    this.certificates.forEach((c: any) => checkCert(c.templateId, c.checksheetSnapshot?.templateId));
    this.pdfReports.forEach((p: any) => checkCert(p.templateId, p.checksheetSnapshot?.templateId));

    // Protected / Fallback check
    const isProtected =
      PROTECTED_CONTINGENCY_TEMPLATE_IDS.has(templateId) ||
      APPROVED_SHARED_TEMPLATE_IDS.has(templateId) ||
      templateId === 'tmpl-torque-converter-performance-v1' ||
      target?.isContingency === true;

    let canDelete = true;
    let blockReason = '';

    if (isProtected) {
      canDelete = false;
      blockReason = 'Protected template: Approved shared production or system contingency templates cannot be deleted.';
    } else if (activeRelationshipCount > 0) {
      canDelete = false;
      blockReason = `Cannot delete: Template is currently mapped to ${activeRelationshipCount} active product relationship(s). Reassign products before deleting.`;
    } else if (completedTestRefCount > 0) {
      canDelete = false;
      blockReason = `Cannot delete: Template is referenced by ${completedTestRefCount} historical completed test record(s). Preserving for QA audit integrity.`;
    } else if (certificateRefCount > 0) {
      canDelete = false;
      blockReason = `Cannot delete: Template is referenced by ${certificateRefCount} quality certificate/report(s).`;
    }

    return {
      templateId,
      templateName,
      compGroup: target?.compGroup,
      testStage: target?.testStage,
      revision: target?.revision,
      status: target?.status,
      activeRelationshipCount,
      activeRelationshipDetails,
      completedTestRefCount,
      certificateRefCount,
      isProtected,
      canDelete,
      blockReason: blockReason || undefined,
    };
  }

  public async deleteChecksheetTemplate(
    templateId: string,
    actorName = 'Admin',
    reason = 'Admin deletion of unreferenced template'
  ): Promise<{ success: boolean; message: string }> {
    if (!templateId) {
      throw new Error('[DELETION BLOCKED] Template ID is required for deletion.');
    }

    const summary = this.getTemplateReferenceSummary(templateId);
    if (!summary.canDelete) {
      throw new Error(`[DELETION BLOCKED] ${summary.blockReason || 'Template cannot be deleted due to active or historical references.'}`);
    }

    const target = this.templates.find((t) => t.id === templateId);
    if (!target) {
      throw new Error(`Template [${templateId}] not found.`);
    }

    // Atomic delete from Firestore
    try {
      const { doc, writeBatch } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const batch = writeBatch(db);
      const tmplDocRef = doc(db, 'checksheetTemplates', templateId);
      batch.delete(tmplDocRef);

      const auditId = `audit-tmpl-delete-${Date.now()}-${templateId}`;
      const auditDocRef = doc(db, 'auditLogs', auditId);
      const auditData = {
        id: auditId,
        action: 'DELETE_CHECKSHEET_TEMPLATE',
        collectionName: 'checksheetTemplates',
        documentId: templateId,
        userName: actorName,
        userRole: 'ADMIN',
        timestamp: new Date().toISOString(),
        details: `Permanently deleted checksheet template ${templateId} (${target.name}). Reason: ${reason}. Active refs: 0, Completed test refs: 0, Cert refs: 0.`,
        previousValue: { id: target.id, name: target.name, compGroup: target.compGroup, revision: target.revision },
        newValue: { status: 'DELETED', deletedAt: new Date().toISOString(), reason },
      };
      batch.set(auditDocRef, sanitizeFirestoreValue(auditData));

      await batch.commit();
      this.auditLogs.unshift(auditData);
    } catch (err) {
      console.warn('[storageEngine] Firestore batch delete failed, falling back to direct removal:', err);
      await removeDocument('checksheetTemplates', templateId);
      await logAuditEvent({
        action: 'DELETE_CHECKSHEET_TEMPLATE',
        collectionName: 'checksheetTemplates',
        documentId: templateId,
        userName: actorName,
        details: `Deleted checksheet template ${target.name}. Reason: ${reason}`,
      });
    }

    this.templates = this.templates.filter((t) => t.id !== templateId);
    this.saveToStorageCache();
    this.notifyListeners();

    return {
      success: true,
      message: `Template [${target.id}] was permanently deleted.`,
    };
  }

  // Flat checksheets
  public getChecksheetItems(process?: TestProcess, category?: ProductCategory): ChecksheetItem[] {
    let items = [...this.checksheets];
    if (process) items = items.filter((i) => i.process === process);
    if (category) {
      const catKey = category === 'Engine' ? 'Engine' : 'Power Train';
      items = items.filter((i) => i.productCategory === 'Both' || i.productCategory === catKey);
    }
    return items.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public async saveChecksheetItem(item: ChecksheetItem): Promise<void> {
    const idx = this.checksheets.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      this.checksheets[idx] = item;
    } else {
      this.checksheets.push(item);
    }
    this.saveToStorageCache();
    await saveDocument('checksheets', item);
    this.notifyListeners();
  }

  public async deleteChecksheetItem(id: string): Promise<void> {
    this.checksheets = this.checksheets.filter((c) => c.id !== id);
    this.saveToStorageCache();
    await removeDocument('checksheets', id);
    this.notifyListeners();
  }

  // ==========================================
  // --- RECORDS: GLT ---
  // ==========================================
  public getGLTRecords(): GLTRecord[] {
    return this.gltRecords;
  }

  public async saveGLTRecord(record: GLTRecord): Promise<GLTRecord> {
    const existingForJO = this.gltRecords.filter(
      (r) => r.joNumber.toUpperCase() === record.joNumber.toUpperCase()
    );

    const recordToPersist: GLTRecord = {
      ...record,
      attemptNumber: record.attemptNumber || existingForJO.length + 1,
    };

    // 1. Firestore FIRST
    await saveDocument('gltRecords', recordToPersist);

    // 2. Only update local cache after Firestore succeeds
    const idx = this.gltRecords.findIndex(
      (r) => r.id === recordToPersist.id
    );

    if (idx >= 0) {
      this.gltRecords[idx] = recordToPersist;
    } else {
      this.gltRecords.push(recordToPersist);
    }

    this.saveToStorageCache();

    await logAuditEvent({
      action: 'SUBMIT_GLT_RECORD',
      collectionName: 'gltRecords',
      documentId: recordToPersist.id,
      userName: recordToPersist.operatorName || 'GLT Operator',
      details: `Submitted GLT for JO ${recordToPersist.joNumber} with result ${recordToPersist.result}`,
      newValue: recordToPersist,
    });

    this.notifyListeners();
    return recordToPersist;
  }

  // ==========================================
  // --- RECORDS: DYNO ---
  // ==========================================
  public getDynoRecords(): DynotestRecord[] {
    return this.dynoRecords;
  }

  public async saveDynoRecord(
    record: DynotestRecord
  ): Promise<DynotestRecord> {

    const existingForJO = this.dynoRecords.filter(
      (r) => r.joNumber.toUpperCase() === record.joNumber.toUpperCase()
    );

    const recordToPersist: DynotestRecord = {
      ...record,
      attemptNumber: record.attemptNumber || existingForJO.length + 1,
    };

    // FIRESTORE FIRST
    await saveDocument('dynoRecords', recordToPersist);

    const idx = this.dynoRecords.findIndex(
      (r) => r.id === recordToPersist.id
    );

    if (idx >= 0) {
      this.dynoRecords[idx] = recordToPersist;
    } else {
      this.dynoRecords.push(recordToPersist);
    }

    this.saveToStorageCache();

    await logAuditEvent({
      action: 'SUBMIT_DYNO_RECORD',
      collectionName: 'dynoRecords',
      documentId: recordToPersist.id,
      userName: recordToPersist.operatorName || 'Dyno Operator',
      details: `Submitted Dynotest for JO ${recordToPersist.joNumber} with result ${recordToPersist.result}`,
      newValue: recordToPersist,
    });

    // IMPORTANT:
    // DO NOT call finishQueueRecord here.

    this.notifyListeners();
    return recordToPersist;
  }

  // ==========================================
  // --- RECORDS: HYDRAULIC / TESTBENCH ---
  // ==========================================
  public getHydraulicRecords(): HydraulicRecord[] {
    return this.hydraulicRecords;
  }

  public async saveHydraulicRecord(
    record: HydraulicRecord
  ): Promise<HydraulicRecord> {

    const existingForJO = this.hydraulicRecords.filter(
      (r) => r.joNumber.toUpperCase() === record.joNumber.toUpperCase()
    );

    const recordToPersist: HydraulicRecord = {
      ...record,
      attemptNumber: record.attemptNumber || existingForJO.length + 1,
    };

    // FIRESTORE FIRST
    await saveDocument('hydraulicRecords', recordToPersist);

    const idx = this.hydraulicRecords.findIndex(
      (r) => r.id === recordToPersist.id
    );

    if (idx >= 0) {
      this.hydraulicRecords[idx] = recordToPersist;
    } else {
      this.hydraulicRecords.push(recordToPersist);
    }

    this.saveToStorageCache();

    await logAuditEvent({
      action: 'SUBMIT_TESTBENCH_RECORD',
      collectionName: 'hydraulicRecords',
      documentId: recordToPersist.id,
      userName: recordToPersist.operatorName || 'Testbench Operator',
      details: `Submitted Hydraulic Testbench for JO ${recordToPersist.joNumber} with result ${recordToPersist.result}`,
      newValue: recordToPersist,
    });

    // IMPORTANT:
    // DO NOT call finishQueueRecord here.

    this.notifyListeners();
    return recordToPersist;
  }

  // ==========================================
  // --- JO LOOKUP ---
  // ==========================================
  public lookupJOForStage(joNumber: string, targetStage: 'Dynotest' | 'Hydraulic Test') {
    const rawClean = joNumber.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
    const matchJO = (jo: string) => jo.replace(/[^0-9a-zA-Z]/g, '').toUpperCase() === rawClean;

    const glts = this.gltRecords
      .filter((r) => matchJO(r.joNumber) && r.status === 'Submitted')
      .sort((a, b) => a.attemptNumber - b.attemptNumber);

    const existingDyno = this.dynoRecords.filter((d) => matchJO(d.joNumber));
    const existingHyd = this.hydraulicRecords.filter((h) => matchJO(h.joNumber));

    const queueRec = this.queueRecords.find(
      (q) => q.joRoNumber.toUpperCase() === rawClean
    );

    let latestGLT = glts.length > 0 ? glts[glts.length - 1] : null;
    let isEngine = false;
    let compGroup: CompGroup = 'PT-PPM';
    let unitModel = '';
    let component = '';
    let productCategory: ProductCategory = 'Power Train Component';
    let productModel = '';
    let assemblyMechanic = '';
    let latestGLTResult = '';
    let gltIncomingTime = '';
    let gltSubmissionTime = '';

    if (latestGLT) {
      isEngine =
        latestGLT.compGroup === 'Engine' ||
        latestGLT.productCategory === 'Engine' ||
        latestGLT.productModel.toLowerCase().includes('engine') ||
        latestGLT.productModel.toLowerCase().includes('saa');
      compGroup = latestGLT.compGroup || (isEngine ? 'Engine' : 'PT-PPM');
      unitModel = latestGLT.unitModel || '';
      component = latestGLT.component || '';
      productCategory = latestGLT.productCategory;
      productModel = latestGLT.productModel;
      assemblyMechanic = latestGLT.assemblyMechanic;
      latestGLTResult = latestGLT.result;
      gltIncomingTime = latestGLT.incomingTime;
      gltSubmissionTime = latestGLT.submissionTime;
    } else if (queueRec) {
      compGroup = queueRec.compGroup;
      isEngine = compGroup === 'Engine';
      unitModel = queueRec.unitModel;
      component = queueRec.component;
      productCategory = compGroup === 'Engine' ? 'Engine' : compGroup === 'Cylinder' ? 'Cylinder' : 'Power Train Component';
      productModel = `${unitModel}/${component}`;
      assemblyMechanic = queueRec.assemblyMechanic || '';
    } else {
      const prev = existingDyno[0] || existingHyd[0];
      if (prev) {
        compGroup = prev.compGroup || 'PT-PPM';
        isEngine = compGroup === 'Engine';
        unitModel = prev.unitModel || '';
        component = prev.component || '';
        productCategory = prev.productCategory || 'Power Train Component';
        productModel = prev.productModel || `${unitModel}/${component}`;
        assemblyMechanic = prev.assemblyMechanic || '';
      } else {
        return null;
      }
    }

    if (targetStage === 'Dynotest' && !isEngine) {
      return { error: 'JO is a Power Train or Cylinder Component. Dynotest is only for Engines.' };
    }
    if (targetStage === 'Hydraulic Test' && isEngine) {
      return { error: 'JO is an Engine. Hydraulic Test is only for Power Train & Cylinder Components.' };
    }

    // Lead Time: Fix Actual Lead Time calculation (First Start -> Final PASS)
    const sortedGlts = [...glts].sort((a, b) => a.attemptNumber - b.attemptNumber);
    const oldestGlt = sortedGlts[0];
    let firstStartIso = oldestGlt ? (oldestGlt.incomingTime || oldestGlt.submissionTime) : '';

    if (!firstStartIso) {
      const bRecords = [...existingDyno, ...existingHyd].sort(
        (a, b) => new Date(a.receivingTime).getTime() - new Date(b.receivingTime).getTime()
      );
      if (bRecords.length > 0) {
        firstStartIso = bRecords[0].receivingTime;
      } else if (queueRec) {
        firstStartIso = queueRec.gltReceivingTime || queueRec.createdAt;
      }
    }

    return {
      joNumber: latestGLT ? latestGLT.joNumber : (queueRec ? queueRec.joRoNumber : (existingDyno[0] || existingHyd[0]).joNumber),
      compGroup,
      unitModel,
      component,
      productCategory,
      productModel,
      assemblyMechanic,
      latestGLTResult,
      gltIncomingTime,
      gltSubmissionTime,
      firstStartIso,
      gltAttempts: glts.length,
      existingDynoAttempts: existingDyno.length,
      latestDynoRecord: existingDyno[existingDyno.length - 1] || null,
      existingHydAttempts: existingHyd.length,
      latestHydRecord: existingHyd[existingHyd.length - 1] || null,
    };
  }

  // ==========================================
  // --- COMBINED HISTORY ---
  // ==========================================
  public getCombinedJOHistory(filters: FilterParams = {}): CombinedJORecords[] {
    const joMap = new Map<
      string,
      {
        joNumber: string;
        compGroup?: CompGroup;
        unitModel?: string;
        component?: string;
        productCategory: ProductCategory;
        productModel: string;
        assemblyMechanic: string;
        glts: GLTRecord[];
        dynos: DynotestRecord[];
        hyds: HydraulicRecord[];
      }
    >();

    this.gltRecords.forEach((g) => {
      const key = g.joNumber.toUpperCase();
      if (!joMap.has(key)) {
        joMap.set(key, {
          joNumber: g.joNumber,
          compGroup: g.compGroup,
          unitModel: g.unitModel,
          component: g.component,
          productCategory: g.productCategory,
          productModel: g.productModel,
          assemblyMechanic: g.assemblyMechanic,
          glts: [],
          dynos: [],
          hyds: [],
        });
      }
      joMap.get(key)!.glts.push(g);
    });

    this.dynoRecords.forEach((d) => {
      const key = d.joNumber.toUpperCase();
      if (joMap.has(key)) joMap.get(key)!.dynos.push(d);
    });

    this.hydraulicRecords.forEach((h) => {
      const key = h.joNumber.toUpperCase();
      if (joMap.has(key)) joMap.get(key)!.hyds.push(h);
    });

    const result: CombinedJORecords[] = [];

    joMap.forEach((entry) => {
      entry.glts.sort((a, b) => a.attemptNumber - b.attemptNumber);
      entry.dynos.sort((a, b) => a.attemptNumber - b.attemptNumber);
      entry.hyds.sort((a, b) => a.attemptNumber - b.attemptNumber);

      const gltNG = entry.glts.some((r) => r.result === 'NOT GOOD');
      const dynoNG = entry.dynos.some((r) => r.result === 'NOT GOOD');
      const hydNG = entry.hyds.some((r) => r.result === 'NOT GOOD');
      const everHadNG = gltNG || dynoNG || hydNG;

      let latestStageResult: TestResult = 'GOOD';
      const isEngine =
        entry.compGroup === 'Engine' ||
        entry.productCategory === 'Engine' ||
        entry.productModel.toLowerCase().includes('engine') ||
        entry.productModel.toLowerCase().includes('saa');

      if (isEngine) {
        if (entry.dynos.length > 0) {
          latestStageResult = entry.dynos[entry.dynos.length - 1].result;
        } else if (entry.glts.length > 0) {
          latestStageResult = entry.glts[entry.glts.length - 1].result;
        }
      } else {
        if (entry.hyds.length > 0) {
          latestStageResult = entry.hyds[entry.hyds.length - 1].result;
        } else if (entry.glts.length > 0) {
          latestStageResult = entry.glts[entry.glts.length - 1].result;
        }
      }

      let latestDate = '';
      if (entry.glts.length > 0) {
        latestDate =
          entry.glts[entry.glts.length - 1].testDate ||
          entry.glts[entry.glts.length - 1].incomingTime;
      }

      const queueRec = this.queueRecords.find(
        (q) => q.joRoNumber.toUpperCase() === entry.joNumber.toUpperCase()
      );

      const item: CombinedJORecords = {
        joNumber: entry.joNumber,
        compGroup: entry.compGroup,
        unitModel: entry.unitModel,
        component: entry.component,
        productCategory: entry.productCategory,
        productModel: entry.productModel,
        assemblyMechanic: entry.assemblyMechanic,
        currentOverallStatus: latestStageResult,
        everHadNG,
        gltRecords: entry.glts,
        dynoRecords: entry.dynos,
        hydraulicRecords: entry.hyds,
        latestRecordDate: latestDate,
        priorityHistory: queueRec?.history || [],
      };

      if (filters.joNumber && !entry.joNumber.toUpperCase().includes(filters.joNumber.toUpperCase())) return;
      if (filters.compGroup && filters.compGroup !== 'All' && entry.compGroup !== filters.compGroup) return;
      if (filters.productCategory && filters.productCategory !== 'All' && entry.productCategory !== filters.productCategory) return;
      if (filters.productModel && filters.productModel !== 'All' && entry.productModel !== filters.productModel) return;
      if (filters.assemblyMechanic && filters.assemblyMechanic !== 'All' && entry.assemblyMechanic !== filters.assemblyMechanic) return;

      if (filters.resultFilter && filters.resultFilter !== 'All') {
        if (filters.resultFilter === 'GOOD' && latestStageResult !== 'GOOD') return;
        if (filters.resultFilter === 'NOT GOOD' && latestStageResult !== 'NOT GOOD') return;
        if (filters.resultFilter === 'Ever NOT GOOD' && !everHadNG) return;
      }

      result.push(item);
    });

    return result.sort((a, b) => b.joNumber.localeCompare(a.joNumber));
  }

  public getDashboardStats(filters: FilterParams = {}): DashboardStats {
    const combined = this.getCombinedJOHistory();
    const analytics = computeUnifiedAnalytics(combined, filters);
    return analytics.stats;
  }

  // ==========================================
  // --- PRIORITY QUEUE ---
  // ==========================================
  public getQueueRecords(compGroup?: CompGroup): QueueRecord[] {
    let list = [...this.queueRecords];
    if (compGroup) {
      list = list.filter((q) => q.compGroup === compGroup);
    }
    return list.sort((a, b) => {
      if (a.isUrgentUnassigned && !b.isUrgentUnassigned) return -1;
      if (!a.isUrgentUnassigned && b.isUrgentUnassigned) return 1;
      return (a.currentPriority || 999) - (b.currentPriority || 999);
    });
  }

  public async normalizeQueuePriorities(compGroup?: CompGroup): Promise<void> {
    const groups: CompGroup[] = compGroup ? [compGroup] : ['Engine', 'PT-PPM', 'Cylinder'];
    const { writeBatch, doc } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');

    const batch = writeBatch(db);
    let hasChanges = false;

    for (const grp of groups) {
      const activeRanked = this.queueRecords
        .filter(
          (q) =>
            q.compGroup === grp &&
            !q.isUrgentUnassigned &&
            q.status !== 'FINISH'
        )
        .sort((a, b) => {
          if (a.status === 'ON_PROCESS' && b.status !== 'ON_PROCESS') return -1;
          if (b.status === 'ON_PROCESS' && a.status !== 'ON_PROCESS') return 1;

          const aPrio = a.currentPriority || 999;
          const bPrio = b.currentPriority || 999;
          if (aPrio !== bPrio) return aPrio - bPrio;

          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      for (let i = 0; i < activeRanked.length; i++) {
        const item = activeRanked[i];
        const newPrio = i + 1;
        if (item.currentPriority !== newPrio || item.plannedPriority !== newPrio) {
          item.currentPriority = newPrio;
          item.plannedPriority = newPrio;
          item.updatedAt = new Date().toISOString();

          const docRef = doc(db, 'priorityQueue', item.queueRecordId);
          batch.set(docRef, sanitizeFirestoreValue(item), { merge: true });
          hasChanges = true;
        }
      }
    }

    if (hasChanges && !isFirestoreQuotaExceeded()) {
      try {
        await batch.commit();
      } catch (err) {
        if (isQuotaError(err)) {
          markQuotaExceeded(err);
          console.warn('[storageEngine] Priorities normalized in local cache; remote commit deferred due to quota limit.');
        } else {
          console.error("Error committing normalized priorities to Firestore:", err);
        }
      }
    }
    this.saveToStorageCache();
    this.notifyListeners();
  }

  public async ensureTestingLineAssignments(records: QueueRecord[]): Promise<boolean> {
    let hasUpdated = false;
    const { writeBatch, doc } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    const { removeDocument } = await import('../lib/firestoreSync');
    const batch = writeBatch(db);
    
    // 1. DEDUPLICATION: Safely remove duplicate active queue records for the same (joRoNumber + current required process)
    const activeMap = new Map<string, QueueRecord[]>();
    for (const q of records) {
      if (q.status !== 'FINISH') {
        const stage = q.compGroup !== 'Cylinder' && q.gltStatus !== 'GOOD' && q.testType !== 'RETEST' ? 'GLT' : (q.compGroup === 'Engine' ? 'DYNOTEST' : 'TESTBENCH');
        const key = `${q.joRoNumber.trim().toUpperCase()}_${stage}`;
        if (!activeMap.has(key)) activeMap.set(key, []);
        activeMap.get(key)!.push(q);
      }
    }

    for (const [key, dups] of activeMap.entries()) {
      if (dups.length > 1) {
        // Sort to find canonical: ON_PROCESS > newest valid record with assigned compatible line > newest updatedAt
        dups.sort((a, b) => {
          if (a.status === 'ON_PROCESS' && b.status !== 'ON_PROCESS') return -1;
          if (b.status === 'ON_PROCESS' && a.status !== 'ON_PROCESS') return 1;
          if (a.gltStatus === 'GOOD' && b.gltStatus !== 'GOOD') return -1;
          if (b.gltStatus === 'GOOD' && a.gltStatus !== 'GOOD') return 1;
          const aHasLine = Boolean(a.currentTestingLineId || a.assignedLineId);
          const bHasLine = Boolean(b.currentTestingLineId || b.assignedLineId);
          if (aHasLine && !bHasLine) return -1;
          if (!aHasLine && bHasLine) return 1;
          return (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || '');
        });

        // Keep dups[0], remove others & log audit
        for (let i = 1; i < dups.length; i++) {
          const dupToRemove = dups[i];
          try {
            await removeDocument('priorityQueue', dupToRemove.queueRecordId);
            const rIdx = records.findIndex(r => r.queueRecordId === dupToRemove.queueRecordId);
            if (rIdx >= 0) records.splice(rIdx, 1);
            hasUpdated = true;

            await logAuditEvent({
              action: 'DUPLICATE_CLEANUP_RESOLVED',
              collectionName: 'priorityQueue',
              documentId: dupToRemove.queueRecordId,
              userName: 'System Cleanup',
              details: `Resolved and archived duplicate queue record for JO ${dupToRemove.joRoNumber} (${key})`,
              previousValue: dupToRemove,
              newValue: { preservedRecordId: dups[0].queueRecordId },
            });
          } catch (err) {
            console.error('Failed to remove duplicate queue record:', err);
          }
        }
      }
    }

    // 2. PPC DATA CLEANSING, LINE ASSIGNMENTS AND CANONICAL FIELD SYNC
    for (const q of records) {
      let canonicalLineId = q.assignedLineId || q.currentTestingLineId || q.testingLineId;
      let schedulingWarning: string | undefined = undefined;
      let currentStage: string = 'GLT';

      // Store raw PPC values if not present
      const rawUnit = q.rawUnitModel || q.unitModel;
      const rawComp = q.rawComponent || q.component;
      q.rawUnitModel = rawUnit;
      q.rawComponent = rawComp;

      // Run deterministic PPC Data Cleansing
      const cleanseRes = cleansePPCProductData(rawUnit, rawComp, q.compGroup, this.models);
      const prevProductModelId = q.productModelId;

      if (cleanseRes.isMatch) {
        q.unitModel = cleanseRes.canonicalUnitModel;
        q.component = cleanseRes.canonicalComponent;
        q.productModelId = cleanseRes.productModelId!;
        q.productMasterId = cleanseRes.productModelId!;
        q.isPerformanceOnlyContingency = false;
      } else {
        q.isPerformanceOnlyContingency = true;
      }

      // Audit log only if cleansing result or identity changed and not logged yet
      if (!q.cleansingLoggedAt || prevProductModelId !== q.productModelId) {
        q.cleansingLoggedAt = new Date().toISOString();
        try {
          await logAuditEvent({
            action: cleanseRes.action,
            collectionName: 'priorityQueue',
            documentId: q.queueRecordId,
            userName: 'System Cleansing Engine',
            details: `PPC Cleansing [${cleanseRes.cleansingRule}]: Raw [${rawUnit} / ${rawComp}] -> Canonical [${q.unitModel} / ${q.component}]`,
            previousValue: { rawUnitModel: rawUnit, rawComponent: rawComp, productModelId: prevProductModelId || null },
            newValue: {
              jo: q.joRoNumber,
              rawUnitModel: rawUnit,
              rawComponent: rawComp,
              canonicalUnitModel: q.unitModel,
              canonicalComponent: q.component,
              productId: q.productModelId || null,
              cleansingRule: cleanseRes.cleansingRule,
              timestamp: q.cleansingLoggedAt,
            },
          });
        } catch (err) {
          console.error('Failed to log cleansing audit event:', err);
        }
      }

      // Match product master
      const product = this.models.find(m => 
        (q.productMasterId && m.id === q.productMasterId) ||
        m.id === q.productModelId || 
        (normalizeString(m.unitModel) === normalizeString(q.unitModel) && 
         normalizeString(m.component) === normalizeString(q.component))
      );
      if (product && !q.productMasterId) {
        q.productMasterId = product.id;
      }

      // 1. If GLT is not GOOD and not RETEST, it must be on GLT line first (Cylinder is excluded from GLT)
      if (q.compGroup !== 'Cylinder' && q.gltStatus !== 'GOOD' && q.testType !== 'RETEST') {
        const gltLine = q.compGroup === 'Engine' ? 'glt-engine' : 'glt-pt-ppm';
        if (canonicalLineId !== gltLine) {
          canonicalLineId = gltLine;
        }
        currentStage = 'GLT';
      } else {
        currentStage = q.compGroup === 'Engine' ? 'DYNOTEST' : 'TESTBENCH';

        // 2. GLT is GOOD or Retest. Auto-schedule based on compatibility!
        const testStage = q.compGroup === 'Engine' ? 'Dynotest' : 'Testbench';
        const template = this.getActiveTemplate(q.compGroup, q.unitModel, q.component, testStage);
        const durationMinutes = (product?.standardTestDurationMinutes || 120) + 
                                (product?.setupTimeMinutes || 30);

        // Find active compatible lines for this process stage
        const activeLines = this.testingLines.filter(line => 
          line.active && 
          line.process.toUpperCase() === testStage.toUpperCase()
        );

        if (activeLines.length > 0) {
          // Technical matching logic
          const compatibleCandidates = activeLines.filter(line => {
            if (line.maximumPower && product?.nominalPower && product.nominalPower > line.maximumPower) {
              return false;
            }
            if (line.maximumTorque && product?.nominalTorque && product.nominalTorque > line.maximumTorque) {
              return false;
            }
            if (line.maximumRPM && product?.nominalRPM && product.nominalRPM > line.maximumRPM) {
              return false;
            }
            return true;
          });

          if (compatibleCandidates.length > 0) {
            const candidatesWithCapacity = compatibleCandidates.filter(line => {
              const parseTimeToMinutes = (tStr: string | undefined): number => {
                if (!tStr) return 0;
                const parts = tStr.split(':');
                return parseInt(parts[0]) * 60 + parseInt(parts[1]);
              };
              const startMins = parseTimeToMinutes(line.shiftStart || '08:00');
              const endMins = parseTimeToMinutes(line.shiftEnd || '17:00');
              const totalShiftMins = endMins - startMins - (line.breakMinutes || 0);

              const assignedLoad = records
                .filter(item => (item.assignedLineId || item.currentTestingLineId) === line.id && item.status !== 'FINISH' && item.queueRecordId !== q.queueRecordId)
                .reduce((sum, item) => {
                  const itemProd = this.models.find(m => m.id === item.productModelId || (normalizeString(m.unitModel) === normalizeString(item.unitModel) && normalizeString(m.component) === normalizeString(item.component)));
                  const itemDur = (itemProd?.standardTestDurationMinutes || 120) + (itemProd?.setupTimeMinutes || 30);
                  return sum + itemDur;
                }, 0);

              const remainingCapacity = totalShiftMins - assignedLoad;
              return durationMinutes <= remainingCapacity;
            });

            if (candidatesWithCapacity.length > 0) {
              let leastBusyLine = candidatesWithCapacity[0];
              let minAssigned = Infinity;

              for (const line of candidatesWithCapacity) {
                const assignedLoad = records
                  .filter(item => (item.assignedLineId || item.currentTestingLineId) === line.id && item.status !== 'FINISH' && item.queueRecordId !== q.queueRecordId)
                  .reduce((sum, item) => {
                    const itemProd = this.models.find(m => m.id === item.productModelId || (normalizeString(m.unitModel) === normalizeString(item.unitModel) && normalizeString(m.component) === normalizeString(item.component)));
                    const itemDur = (itemProd?.standardTestDurationMinutes || 120) + (itemProd?.setupTimeMinutes || 30);
                    return sum + itemDur;
                  }, 0);

                if (assignedLoad < minAssigned) {
                  minAssigned = assignedLoad;
                  leastBusyLine = line;
                }
              }
              if (!canonicalLineId || canonicalLineId.startsWith('glt-')) {
                canonicalLineId = leastBusyLine.id;
              }
              schedulingWarning = undefined;
            } else {
              let leastBusyLine = compatibleCandidates[0];
              let minAssigned = Infinity;

              for (const line of compatibleCandidates) {
                const assignedLoad = records
                  .filter(item => (item.assignedLineId || item.currentTestingLineId) === line.id && item.status !== 'FINISH' && item.queueRecordId !== q.queueRecordId)
                  .reduce((sum, item) => {
                    const itemProd = this.models.find(m => m.id === item.productModelId || (normalizeString(m.unitModel) === normalizeString(item.unitModel) && normalizeString(m.component) === normalizeString(item.component)));
                    const itemDur = (itemProd?.standardTestDurationMinutes || 120) + (itemProd?.setupTimeMinutes || 30);
                    return sum + itemDur;
                  }, 0);

                if (assignedLoad < minAssigned) {
                  minAssigned = assignedLoad;
                  leastBusyLine = line;
                }
              }
              if (!canonicalLineId || canonicalLineId.startsWith('glt-')) {
                canonicalLineId = leastBusyLine.id;
              }
              schedulingWarning = `No compatible line has remaining shift capacity for today (${durationMinutes} mins required). Queued on ${leastBusyLine.name} for the next shift.`;
            }
          } else {
            if (!canonicalLineId || canonicalLineId.startsWith('glt-')) {
              canonicalLineId = activeLines[0].id;
            }
            schedulingWarning = `WARNING: Technical parameters exceed active limits. Forced onto ${activeLines[0].name}.`;
          }
        }
      }
      
      const lineObj = this.testingLines.find(l => l.id === canonicalLineId);
      const lineName = lineObj ? lineObj.name : canonicalLineId;
      const rank = q.topPriorityRank || q.currentPriority || 999;

      // If there's a change in fields, sync them
      if (
        q.currentTestingLineId !== canonicalLineId ||
        q.testingLineId !== canonicalLineId ||
        q.assignedLineId !== canonicalLineId ||
        q.assignedLineName !== lineName ||
        q.currentStage !== currentStage ||
        q.priorityRank !== rank ||
        q.schedulingWarning !== schedulingWarning
      ) {
        q.currentTestingLineId = canonicalLineId;
        q.testingLineId = canonicalLineId;
        q.assignedLineId = canonicalLineId;
        q.assignedLineName = lineName;
        q.currentStage = currentStage;
        q.priorityRank = rank;
        q.schedulingWarning = schedulingWarning;
        q.updatedAt = new Date().toISOString();
        
        try {
          const docRef = doc(db, 'priorityQueue', q.queueRecordId);
          batch.set(docRef, sanitizeFirestoreValue(q), { merge: true });
          hasUpdated = true;
        } catch (e) {
          console.error("Error batching line update:", e);
        }
      }
    }
    
    if (hasUpdated && !isFirestoreQuotaExceeded()) {
      try {
        await batch.commit();
      } catch (e) {
        if (isQuotaError(e)) {
          markQuotaExceeded(e);
          console.warn('[storageEngine] Line assignments updated in local cache; remote commit deferred due to quota limit.');
        } else {
          console.error("Error committing batch line updates:", e);
        }
      }
    }
    return hasUpdated;
  }

  public async addQueueRecord(record: QueueRecord, actorName = 'PPC'): Promise<void> {
    // Assign canonical line before saving
    let canonicalLineId = record.currentTestingLineId || record.testingLineId;
    if (record.compGroup !== 'Cylinder' && record.gltStatus !== 'GOOD' && record.testType !== 'RETEST') {
      canonicalLineId = record.compGroup === 'Engine' ? 'glt-engine' : 'glt-pt-ppm';
    } else {
      if (!canonicalLineId || canonicalLineId === 'glt-engine' || canonicalLineId === 'glt-pt-ppm') {
        if (record.compGroup === 'Engine') {
          canonicalLineId = 'dyno-1';
        } else if (record.compGroup === 'Cylinder') {
          canonicalLineId = 'tb-4-cyl';
        } else {
          canonicalLineId = 'tb-1';
        }
      }
    }
    record.currentTestingLineId = canonicalLineId;
    record.testingLineId = canonicalLineId;

    // FIRESTORE FIRST
    await saveDocument('priorityQueue', record);

    const existingIdx = this.queueRecords.findIndex(
      (q) => q.queueRecordId === record.queueRecordId
    );
    if (existingIdx >= 0) {
      this.queueRecords[existingIdx] = record;
    } else {
      this.queueRecords.push(record);
    }

    await this.normalizeQueuePriorities(record.compGroup);
    await this.ensureTestingLineAssignments(this.queueRecords);

    await logAuditEvent({
      action: 'ADD_QUEUE_RECORD',
      collectionName: 'priorityQueue',
      documentId: record.queueRecordId,
      userName: actorName,
      details: `Added JO ${record.joRoNumber} to Priority Queue (${record.compGroup})`,
      newValue: record,
    });

    this.saveToStorageCache();
    this.notifyListeners();
  }

  public async updateQueueRecord(
    queueRecordId: string,
    updates: Partial<QueueRecord>
  ): Promise<void> {
    const idx = this.queueRecords.findIndex((q) => q.queueRecordId === queueRecordId);
    if (idx < 0) {
      throw new Error(`Queue record not found: ${queueRecordId}`);
    }

    // Determine canonical line if being updated or if status/gltStatus changed
    const mergedRecord = { ...this.queueRecords[idx], ...updates };
    let canonicalLineId = updates.currentTestingLineId || updates.testingLineId || mergedRecord.currentTestingLineId || mergedRecord.testingLineId;

    if (mergedRecord.compGroup !== 'Cylinder' && mergedRecord.gltStatus !== 'GOOD' && mergedRecord.testType !== 'RETEST') {
      const gltLine = mergedRecord.compGroup === 'Engine' ? 'glt-engine' : 'glt-pt-ppm';
      if (canonicalLineId !== gltLine) {
        canonicalLineId = gltLine;
      }
    } else {
      if (!canonicalLineId || canonicalLineId === 'glt-engine' || canonicalLineId === 'glt-pt-ppm') {
        if (mergedRecord.compGroup === 'Engine') {
          canonicalLineId = 'dyno-1';
        } else if (mergedRecord.compGroup === 'Cylinder') {
          canonicalLineId = 'tb-4-cyl';
        } else {
          canonicalLineId = 'tb-1';
        }
      }
    }

    let currentStage = mergedRecord.compGroup !== 'Cylinder' && mergedRecord.gltStatus !== 'GOOD' && mergedRecord.testType !== 'RETEST' ? 'GLT' : (mergedRecord.compGroup === 'Engine' ? 'DYNOTEST' : 'TESTBENCH');
    const lineObj = this.testingLines.find(l => l.id === canonicalLineId);

    updates.currentTestingLineId = canonicalLineId;
    updates.testingLineId = canonicalLineId;
    updates.assignedLineId = canonicalLineId;
    updates.assignedLineName = lineObj ? lineObj.name : canonicalLineId;
    updates.currentStage = currentStage;
    updates.priorityRank = updates.topPriorityRank || mergedRecord.topPriorityRank || updates.currentPriority || mergedRecord.currentPriority;

    const updatedRecord: QueueRecord = {
      ...this.queueRecords[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // FIRESTORE FIRST
    await saveDocument('priorityQueue', updatedRecord);

    // Then local cache
    this.queueRecords[idx] = updatedRecord;

    this.saveToStorageCache();
    this.notifyListeners();
  }

  public async updateQueueRecordByJONumber(
    joNumber: string,
    updates: Partial<QueueRecord>
  ): Promise<void> {
    const target = this.queueRecords.find(
      (q) => q.joRoNumber.toUpperCase() === joNumber.toUpperCase()
    );
    if (target) {
      await this.updateQueueRecord(target.queueRecordId, updates);
    }
  }

  public async reorderQueue(
    compGroup: CompGroup,
    queueRecordId: string,
    newPriority: number,
    changedBy: string,
    remark: string
  ): Promise<boolean> {
    const target = this.queueRecords.find((q) => q.queueRecordId === queueRecordId);
    if (!target) return false;
    if (target.priorityLocked || target.status === 'ON_PROCESS') return false;

    const oldPriority = target.currentPriority;

    const groupItems = this.queueRecords
      .filter(
        (q) =>
          q.compGroup === compGroup &&
          !q.isUrgentUnassigned &&
          q.status === 'WAITING' &&
          q.queueRecordId !== queueRecordId
      )
      .sort((a, b) => a.currentPriority - b.currentPriority);

    const clampedPos = Math.max(0, Math.min(newPriority - 1, groupItems.length));
    groupItems.splice(clampedPos, 0, target);

    for (let index = 0; index < groupItems.length; index++) {
      const item = groupItems[index];
      item.currentPriority = index + 1;
      item.updatedAt = new Date().toISOString();
      await saveDocument('priorityQueue', item);
    }

    target.history.push({
      oldPriority,
      newPriority: target.currentPriority,
      remark: remark || 'Priority adjusted in Queue',
      changedBy,
      changedAt: new Date().toISOString(),
    });

    await saveDocument('priorityQueue', target);
    this.saveToStorageCache();

    await this.normalizeQueuePriorities(compGroup);

    await logAuditEvent({
      action: 'REORDER_QUEUE',
      collectionName: 'priorityQueue',
      documentId: target.queueRecordId,
      userName: changedBy,
      details: `Reordered JO ${target.joRoNumber} from priority ${oldPriority} to ${target.currentPriority}`,
    });

    this.notifyListeners();
    return true;
  }

  public async assignUrgentPriority(
    queueRecordId: string,
    priority: number,
    changedBy: string,
    remark: string
  ): Promise<boolean> {
    const target = this.queueRecords.find((q) => q.queueRecordId === queueRecordId);
    if (!target) return false;

    target.isUrgentUnassigned = false;
    target.plannedPriority = priority;
    target.currentPriority = priority;
    target.updatedAt = new Date().toISOString();

    target.history.push({
      oldPriority: 0,
      newPriority: priority,
      remark: remark || 'Urgent job manually prioritized into active queue',
      changedBy,
      changedAt: new Date().toISOString(),
    });

    await this.reorderQueue(target.compGroup, queueRecordId, priority, changedBy, remark);
    return true;
  }

  public async lockQueueOnTestStart(joNumber: string, compGroup?: CompGroup): Promise<void> {
    const target = this.queueRecords.find(
      (q) => q.joRoNumber.toUpperCase() === joNumber.toUpperCase() && (!compGroup || q.compGroup === compGroup)
    );
    if (target) {
      target.status = 'ON_PROCESS';
      target.priorityLocked = true;
      target.updatedAt = new Date().toISOString();
      this.saveToStorageCache();
      await saveDocument('priorityQueue', target);
      this.notifyListeners();
    }
  }

  public async finishQueueRecord(joNumber: string): Promise<void> {
    const target = this.queueRecords.find((q) => q.joRoNumber.toUpperCase() === joNumber.toUpperCase());
    if (target) {
      target.status = 'FINISH';
      target.updatedAt = new Date().toISOString();
      await saveDocument('priorityQueue', target);
      this.saveToStorageCache();
      await this.normalizeQueuePriorities(target.compGroup);
      this.notifyListeners();
    }
  }

  public async applyAIRecommendation(queueRecordId: string, changedBy: string): Promise<boolean> {
    const target = this.queueRecords.find((q) => q.queueRecordId === queueRecordId);
    if (!target || !target.aiRecommendation) return false;

    const suggested = target.aiRecommendation.suggestedPriority;
    const remark = `Applied AI Recommendation: ${target.aiRecommendation.reason}`;

    if (target.isUrgentUnassigned) {
      return this.assignUrgentPriority(queueRecordId, suggested, changedBy, remark);
    } else {
      return this.reorderQueue(target.compGroup, queueRecordId, suggested, changedBy, remark);
    }
  }

  // ==========================================
  // --- REPORTS & CERTIFICATES ---
  // ==========================================
  public getPDFReportsForJO(joNumber: string): PDFTestReportRecord[] {
    return this.pdfReports
      .filter((r) => r.joNumber.toUpperCase() === joNumber.toUpperCase())
      .sort((a, b) => b.version - a.version);
  }

  public async savePDFTestReportRecord(record: PDFTestReportRecord): Promise<void> {
    this.pdfReports.push(record);
    this.saveToStorageCache();
    await saveDocument('pdfReports', record);
    await logAuditEvent({
      action: 'GENERATE_PDF_REPORT',
      collectionName: 'pdfReports',
      documentId: record.reportId,
      userName: record.generatedBy || 'QC',
      details: `Generated PDF report v${record.version} for JO ${record.joNumber}`,
    });
    this.notifyListeners();
  }

  public getCertificatesForJO(joNumber: string): QualityCertificateRecord[] {
    return this.certificates
      .filter((c) => c.joNumber.toUpperCase() === joNumber.toUpperCase())
      .sort((a, b) => b.version - a.version);
  }

  public async saveQualityCertificateRecord(record: QualityCertificateRecord): Promise<void> {
    this.certificates.push(record);
    this.saveToStorageCache();
    await saveDocument('certificates', record);
    await logAuditEvent({
      action: 'GENERATE_CERTIFICATE',
      collectionName: 'certificates',
      documentId: record.certificateId,
      userName: record.issuedBy || record.generatedBy || 'QC',
      details: `Issued Quality Certificate ${record.certificateNumber || record.certNumber || record.certificateId} for JO ${record.joNumber}`,
    });
    this.notifyListeners();
  }

  // ==========================================
  // --- TESTING LINES CONFIGURATION ---
  // ==========================================
  public getTestingLines(onlyActive = false): TestingLine[] {
    let lines = [...this.testingLines];
    if (lines.length === 0) {
      lines = [...initialTestingLines];
    }
    if (onlyActive) {
      lines = lines.filter((l) => l.active);
    }
    return lines.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public async saveTestingLine(line: TestingLine, actorName = 'Admin'): Promise<void> {
    await saveDocument('testingLines', line);
    const idx = this.testingLines.findIndex((l) => l.id === line.id);
    if (idx >= 0) {
      this.testingLines[idx] = line;
    } else {
      this.testingLines.push(line);
    }
    this.saveToStorageCache();
    await logAuditEvent({
      action: 'OPERATING_HOURS_UPDATED',
      collectionName: 'testingLines',
      documentId: line.id,
      userName: actorName,
      details: `Updated operating hours for ${line.name}: Days=${line.operatingDays?.join(',') || 'None'}, Time=${line.startTime || 'None'}-${line.endTime || 'None'}, Break=${line.breakMinutes || 0}m, Net=${line.netOperatingMinutes || 0}m`,
    });
    this.notifyListeners();
  }

  public async deleteTestingLine(id: string): Promise<void> {
    await removeDocument('testingLines', id);
    this.testingLines = this.testingLines.filter((l) => l.id !== id);
    this.saveToStorageCache();
    this.notifyListeners();
  }

  public getAuditLogs(): any[] {
    return [...this.auditLogs].sort((a, b) => {
      return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
    });
  }

  public getTestOverrides(): TestOverride[] {
    return this.testOverrides || [];
  }

  public async saveTestOverride(override: TestOverride, actorName = 'Supervisor'): Promise<void> {
    const isNew = !this.testOverrides.some((o) => o.id === override.id);
    await saveDocument('testOverrides', override);
    const idx = this.testOverrides.findIndex((o) => o.id === override.id);
    if (idx >= 0) {
      this.testOverrides[idx] = override;
    } else {
      this.testOverrides.push(override);
    }
    this.saveToStorageCache();

    await logAuditEvent({
      action: isNew ? 'TEST_OVERRIDE_CREATED' : 'TEST_OVERRIDE_UPDATED',
      collectionName: 'testOverrides',
      documentId: override.id,
      userName: actorName,
      details: `${isNew ? 'Created' : 'Updated'} test planning override for JO ${override.joRoNumber} on Line ${override.testingLineId}: ${override.overrideDuration} min (Standard: ${override.defaultDuration} min). Reason: ${override.reason}`,
    });

    this.notifyListeners();
  }

  public async deleteTestOverride(id: string, actorName = 'Supervisor'): Promise<void> {
    const override = this.testOverrides.find((o) => o.id === id);
    if (override) {
      await removeDocument('testOverrides', id);
      this.testOverrides = this.testOverrides.filter((o) => o.id !== id);
      this.saveToStorageCache();

      await logAuditEvent({
        action: 'TEST_OVERRIDE_DISABLED',
        collectionName: 'testOverrides',
        documentId: id,
        userName: actorName,
        details: `Disabled/Removed test planning override for JO ${override.joRoNumber} on Line ${override.testingLineId}`,
      });
      this.notifyListeners();
    }
  }

  // --- TEMPLATE RELATIONSHIPS & PRODUCT CHECKSHEET RELATIONSHIPS ---
  public getTemplateRelationships(): TemplateRelationship[] {
    return this.templateRelationships || [];
  }

  public getProductChecksheetRelationships(): TemplateRelationship[] {
    return this.templateRelationships || [];
  }

  public async saveTemplateRelationship(rel: TemplateRelationship, actorName = 'Admin'): Promise<void> {
    const isNew = !this.templateRelationships.some((r) => r.relationshipId === rel.relationshipId);
    await saveDocument('productChecksheetRelationships', rel);
    await saveDocument('templateRelationships', rel);
    await saveDocument('finalTestTemplateRelationships', rel);
    const idx = this.templateRelationships.findIndex((r) => r.relationshipId === rel.relationshipId);
    if (idx >= 0) {
      this.templateRelationships[idx] = rel;
    } else {
      this.templateRelationships.push(rel);
    }
    this.saveToStorageCache();

    await logAuditEvent({
      action: isNew ? 'RELATIONSHIP_CREATED' : 'RELATIONSHIP_UPDATED',
      collectionName: 'productChecksheetRelationships',
      documentId: rel.relationshipId,
      userName: actorName,
      details: `${isNew ? 'Created' : 'Updated'} relationship matching template ${rel.templateId} to component ${rel.componentName} on ${rel.unitModel}`,
    });
    this.notifyListeners();
  }

  public async saveProductChecksheetRelationship(rel: TemplateRelationship, actorName = 'Admin'): Promise<void> {
    return this.saveTemplateRelationship(rel, actorName);
  }

  public async deleteTemplateRelationship(id: string, actorName = 'Admin'): Promise<void> {
    await removeDocument('productChecksheetRelationships', id);
    await removeDocument('templateRelationships', id);
    await removeDocument('finalTestTemplateRelationships', id);
    this.templateRelationships = this.templateRelationships.filter((r) => r.relationshipId !== id);
    this.saveToStorageCache();

    await logAuditEvent({
      action: 'RELATIONSHIP_DELETED',
      collectionName: 'productChecksheetRelationships',
      documentId: id,
      userName: actorName,
      details: `Deleted template relationship ID: ${id}`,
    });
    this.notifyListeners();
  }

  public async deleteProductChecksheetRelationship(id: string, actorName = 'Admin'): Promise<void> {
    return this.deleteTemplateRelationship(id, actorName);
  }

  // --- STANDARD PROFILES ---
  public getStandardProfiles(): StandardProfile[] {
    return this.standardProfiles || [];
  }

  public async saveStandardProfile(prof: StandardProfile, actorName = 'Admin'): Promise<void> {
    const isNew = !this.standardProfiles.some((p) => p.profileId === prof.profileId);
    await saveDocument('standardProfiles', prof);
    await saveDocument('checksheetStandardProfiles', prof);
    const idx = this.standardProfiles.findIndex((p) => p.profileId === prof.profileId);
    if (idx >= 0) {
      this.standardProfiles[idx] = prof;
    } else {
      this.standardProfiles.push(prof);
    }
    this.saveToStorageCache();

    await logAuditEvent({
      action: isNew ? 'PROFILE_CREATED' : 'PROFILE_UPDATED',
      collectionName: 'standardProfiles',
      documentId: prof.profileId,
      userName: actorName,
      details: `${isNew ? 'Created' : 'Updated'} standard test profile ${prof.name}`,
    });
    this.notifyListeners();
  }

  public async deleteStandardProfile(id: string, actorName = 'Admin'): Promise<void> {
    await removeDocument('standardProfiles', id);
    await removeDocument('checksheetStandardProfiles', id);
    this.standardProfiles = this.standardProfiles.filter((p) => p.profileId !== id);
    this.saveToStorageCache();

    await logAuditEvent({
      action: 'PROFILE_DELETED',
      collectionName: 'standardProfiles',
      documentId: id,
      userName: actorName,
      details: `Deleted standard profile ID: ${id}`,
    });
    this.notifyListeners();
  }

  // --- TEMPLATE CLEANUP & DRY-RUN AUDIT ---
  public async createTemplateBackup(actorName = 'Admin'): Promise<TemplateBackupSnapshot> {
    return TemplateCleanupService.createBackup({
      templates: this.templates,
      relationships: this.templateRelationships,
      dynoRecords: this.dynoRecords,
      hydraulicRecords: this.hydraulicRecords,
      gltRecords: this.gltRecords,
      certificates: this.certificates,
      pdfReports: this.pdfReports,
      adminName: actorName,
    });
  }

  public generateDryRunReport(): DryRunReport {
    return TemplateCleanupService.generateDryRunReport({
      templates: this.templates,
      relationships: this.templateRelationships,
      productModels: this.models,
      dynoRecords: this.dynoRecords,
      hydraulicRecords: this.hydraulicRecords,
      gltRecords: this.gltRecords,
      certificates: this.certificates,
      pdfReports: this.pdfReports,
    });
  }

  public async executeControlledCleanup(actorName = 'Admin'): Promise<{
    deletedTemplateIds: string[];
    skippedTemplateIds: { id: string; reason: string }[];
    auditLogsGenerated: number;
  }> {
    // 1. First create an authoritative backup
    await this.createTemplateBackup(actorName);

    // 2. Generate dry run report
    const dryRun = this.generateDryRunReport();

    // 3. Execute controlled cleanup
    const result = await TemplateCleanupService.executeControlledCleanup({
      dryRunReport: dryRun,
      adminName: actorName,
    });

    // 4. Update local memory state
    if (result.deletedTemplateIds.length > 0) {
      const deletedSet = new Set(result.deletedTemplateIds);
      this.templates = this.templates.filter((t) => !deletedSet.has(t.id));
      this.saveToStorageCache();
      this.notifyListeners();
    }

    return result;
  }

  // --- CHANGE RELATIONSHIP TEMPLATE ---
  public async changeRelationshipTemplate(params: {
    productId: string;
    newTemplateId: string;
    changeReason: string;
    actorName?: string;
  }): Promise<{
    success: boolean;
    previousTemplateId: string;
    newTemplateId: string;
    relationship: TemplateRelationship;
    activatedTargetTemplate: boolean;
  }> {
    const { productId, newTemplateId, changeReason, actorName = 'Admin QC' } = params;

    // 1. Validate Product ID, testing stage and selected Template ID
    if (!productId || !newTemplateId || !changeReason?.trim()) {
      throw new Error('Product ID, replacement Template ID, and Change Reason are required.');
    }

    // Find Target Template
    const targetTmpl = this.templates.find((t) => t.id === newTemplateId);
    if (!targetTmpl) {
      throw new Error(`Target template [${newTemplateId}] does not exist.`);
    }
    if (targetTmpl.status === 'ARCHIVED') {
      throw new Error(`Target template [${newTemplateId}] is ARCHIVED and cannot be assigned.`);
    }

    // Fallback / Contingency check
    if (
      PROTECTED_CONTINGENCY_TEMPLATE_IDS.has(targetTmpl.id) ||
      targetTmpl.id === 'tmpl-torque-converter-performance-v1' ||
      isStarterOrFallbackTemplate(targetTmpl.id, targetTmpl.name)
    ) {
      throw new Error('Cannot manually assign emergency fallback or starter templates.');
    }

    // Find product in Product Master
    const prod = this.models.find(
      (m) =>
        m.id === productId ||
        getProductModelId(m as any) === productId ||
        `${m.unitModel}-${m.component}`.toUpperCase() === productId.toUpperCase()
    );
    if (!prod) {
      throw new Error(`Product [${productId}] not found in Product Master.`);
    }

    // Determine testing stage and verify component group compatibility
    const requiredProcess: 'DYNOTEST' | 'TESTBENCH' = prod.compGroup === 'Engine' ? 'DYNOTEST' : 'TESTBENCH';
    if (prod.compGroup === 'Engine' && targetTmpl.compGroup !== 'Engine') {
      throw new Error(`Engine product requires an Engine checksheet template.`);
    }
    if (prod.compGroup !== 'Engine' && targetTmpl.compGroup === 'Engine') {
      throw new Error(`Non-Engine product cannot use an Engine checksheet template.`);
    }

    // 2. Activate the selected template if it is still DRAFT
    let activatedTargetTemplate = false;
    const wasDraft = targetTmpl.status === 'DRAFT';
    if (wasDraft) {
      targetTmpl.status = 'ACTIVE';
      targetTmpl.activatedAt = new Date().toISOString();
      activatedTargetTemplate = true;
    }
    targetTmpl.updatedAt = new Date().toISOString();

    // Find all current active relationships for this productId and stage
    const existingRels = this.templateRelationships.filter(
      (r) => r.productId === prod.id || r.productId === productId
    );
    const activeRelsForStage = existingRels.filter(
      (r) =>
        r.status === 'ACTIVE' &&
        ((r.finalProcess && r.finalProcess.toUpperCase() === requiredProcess) ||
         (r.testingProcess && r.testingProcess.toUpperCase() === requiredProcess))
    );

    const prevTemplateId = activeRelsForStage.length > 0 ? activeRelsForStage[0].templateId : 'NONE';
    const oldTemplateIds = Array.from(new Set(activeRelsForStage.map((r) => r.templateId).filter(Boolean)));

    // 3. Remove that Product ID only from other active final relationships and old templates' compatibleProductIds
    const changedTemplates: ChecksheetTemplate[] = [];

    // Update old templates' compatibleProductIds without affecting other products
    for (const oldTId of oldTemplateIds) {
      if (oldTId !== targetTmpl.id) {
        const oldTmpl = this.templates.find((t) => t.id === oldTId);
        if (oldTmpl && oldTmpl.compatibleProductIds) {
          const prevList = [...oldTmpl.compatibleProductIds];
          oldTmpl.compatibleProductIds = oldTmpl.compatibleProductIds.filter(
            (pid) => pid !== prod.id && pid !== productId
          );
          if (prevList.length !== oldTmpl.compatibleProductIds.length) {
            oldTmpl.updatedAt = new Date().toISOString();
            changedTemplates.push(oldTmpl);
          }
        }
      }
    }

    // 4. Add the Product ID to the selected shared template relationship and update template's compatibleProductIds
    if (!targetTmpl.compatibleProductIds) {
      targetTmpl.compatibleProductIds = [];
    }
    if (!targetTmpl.compatibleProductIds.includes(prod.id)) {
      targetTmpl.compatibleProductIds.push(prod.id);
    }
    changedTemplates.push(targetTmpl);

    // 5 & 6. Deactivate old active relationships for this product + stage, ensuring exactly one active final relationship remains
    const updatedRelsToSave: TemplateRelationship[] = [];

    for (const rel of activeRelsForStage) {
      if (rel.templateId !== targetTmpl.id) {
        rel.status = 'INACTIVE';
        rel.updatedAt = new Date().toISOString();
        updatedRelsToSave.push(rel);
      }
    }

    // Target relationship setup
    let targetRel = existingRels.find(
      (r) =>
        r.templateId === targetTmpl.id &&
        ((r.finalProcess && r.finalProcess.toUpperCase() === requiredProcess) ||
         (r.testingProcess && r.testingProcess.toUpperCase() === requiredProcess))
    );

    if (targetRel) {
      targetRel.status = 'ACTIVE';
      targetRel.templateName = targetTmpl.name;
      targetRel.productId = prod.id;
      targetRel.unitModel = prod.unitModel;
      targetRel.componentName = prod.component;
      targetRel.productGroup = prod.compGroup;
      targetRel.finalProcess = requiredProcess;
      targetRel.version = (targetRel.version || 1) + 1;
      targetRel.updatedAt = new Date().toISOString();
      updatedRelsToSave.push(targetRel);
    } else {
      const relId = `rel-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      targetRel = {
        id: relId,
        relationshipId: relId,
        productId: prod.id,
        unitModel: prod.unitModel,
        componentName: prod.component,
        productGroup: prod.compGroup,
        finalProcess: requiredProcess,
        templateId: targetTmpl.id,
        templateName: targetTmpl.name,
        standardProfileId: (prod as any).standardProfileId || 'std-default',
        compatibleLineIds: prod.compGroup === 'Engine' ? ['dyno-1', 'dyno-2', 'dyno-3'] : ['tb-1', 'tb-2', 'tb-3'],
        status: 'ACTIVE',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.templateRelationships.push(targetRel);
      updatedRelsToSave.push(targetRel);
    }

    // 7. Atomic Write via Firestore WriteBatch
    const auditId = `audit-rel-change-${Date.now()}-${prod.id}`;
    const auditData = {
      id: auditId,
      action: 'RELATIONSHIP_TEMPLATE_CHANGED',
      collectionName: 'templateRelationships',
      documentId: targetRel.relationshipId,
      userName: actorName,
      userRole: 'ADMIN',
      timestamp: new Date().toISOString(),
      productId: prod.id,
      oldTemplateId: prevTemplateId,
      newTemplateId: targetTmpl.id,
      testingStage: requiredProcess,
      changedBy: actorName,
      changeReason,
      changedDate: new Date().toISOString(),
      activatedTargetTemplate,
      details: `Changed template for Product [${prod.id}] (${prod.unitModel} - ${prod.component}) for stage [${requiredProcess}]. Previous: [${prevTemplateId}] -> New: [${targetTmpl.id}] (${targetTmpl.name}). Target template activated: ${activatedTargetTemplate ? 'YES' : 'NO'}. Reason: ${changeReason}`,
      previousValue: { templateId: prevTemplateId },
      newValue: { templateId: targetTmpl.id, templateName: targetTmpl.name, reason: changeReason, activated: activatedTargetTemplate },
    };

    try {
      const { writeBatch, doc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const batch = writeBatch(db);

      // Write changed templates
      for (const tmpl of changedTemplates) {
        const tmplRef = doc(db, 'checksheetTemplates', tmpl.id);
        batch.set(tmplRef, sanitizeFirestoreValue(tmpl), { merge: true });
      }

      // Write updated relationships across all relationship collections
      for (const rel of updatedRelsToSave) {
        const rId = rel.relationshipId || rel.id || `rel-${Date.now()}`;
        const rel1 = doc(db, 'templateRelationships', rId);
        const rel2 = doc(db, 'productChecksheetRelationships', rId);
        const rel3 = doc(db, 'finalTestTemplateRelationships', rId);
        const sanitizedRel = sanitizeFirestoreValue(rel);
        batch.set(rel1, sanitizedRel, { merge: true });
        batch.set(rel2, sanitizedRel, { merge: true });
        batch.set(rel3, sanitizedRel, { merge: true });
      }

      // Write audit log
      const auditDocRef = doc(db, 'auditLogs', auditId);
      batch.set(auditDocRef, sanitizeFirestoreValue(auditData));

      // Await atomic Firestore write
      await batch.commit();
      this.auditLogs.unshift(auditData);
    } catch (err) {
      console.warn('[storageEngine] Firestore batch write failed, fallback saving individual documents:', err);
      for (const tmpl of changedTemplates) {
        await saveDocument('checksheetTemplates', tmpl);
      }
      for (const rel of updatedRelsToSave) {
        await saveDocument('templateRelationships', rel);
        await saveDocument('productChecksheetRelationships', rel);
        await saveDocument('finalTestTemplateRelationships', rel);
      }
      await logAuditEvent(auditData);
      this.auditLogs.unshift(auditData);
    }

    // 8. Update in-memory state and cache
    this.saveToStorageCache();
    this.notifyListeners();

    return {
      success: true,
      previousTemplateId: prevTemplateId,
      newTemplateId: targetTmpl.id,
      relationship: targetRel,
      activatedTargetTemplate,
    };
  }
}

export const store = new DataStore();
