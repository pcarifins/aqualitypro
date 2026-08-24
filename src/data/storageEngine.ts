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
  TestResult,
  QueueRecord,
  TestingLine,
  PDFTestReportRecord,
  QualityCertificateRecord,
  ProductMasterValidationReport,
  TestOverride,
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
} from './initialData';

import { INITIAL_REQUIRED_PRODUCT_MODELS } from './productMasterSeed';
import { initialQueueRecords } from './initialQueueData';
import { initialTestingLines } from './initialTestingLines';
import { computeUnifiedAnalytics } from '../services/analyticsService';

import {
  saveDocument,
  removeDocument,
  subscribeToCollection,
  logAuditEvent,
  initializeAndMigrateFirestore,
  sanitizeFirestoreValue,
} from '../lib/firestoreSync';

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

class DataStore {
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

  private listeners: (() => void)[] = [];
  private isInitialized = false;
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

    // 1. One-time migration if needed
    await initializeAndMigrateFirestore();

    // 2. Set up realtime listeners for all collections
    const unSubUsers = subscribeToCollection<User>('users', (data) => {
      if (data) {
        this.users = data;
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    const unSubAssemblers = subscribeToCollection<Assembler>('assemblers', (data) => {
      if (data) {
        this.assemblers = data;
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    const unSubModels = subscribeToCollection<ProductModel>('productModels', (data) => {
      if (data) {
        this.models = data;
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    const unSubTemplates = subscribeToCollection<ChecksheetTemplate>('checksheetTemplates', (data) => {
      if (data) {
        this.templates = data;
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    const unSubChecksheets = subscribeToCollection<ChecksheetItem>('checksheets', (data) => {
      if (data) {
        this.checksheets = data;
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    const unSubQueue = subscribeToCollection<QueueRecord>('priorityQueue', async (data) => {
      if (data) {
        // preserve field fallback
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
    });

    const unSubTestingLines = subscribeToCollection<TestingLine>('testingLines', (data) => {
      if (data && data.length > 0) {
        this.testingLines = data;
        this.saveToStorageCache();
        this.notifyListeners();
      } else if (data && data.length === 0) {
        // seed testing lines to firestore if empty
        this.testingLines = [...initialTestingLines];
        this.testingLines.forEach((tl) => saveDocument('testingLines', tl));
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    const unSubGLT = subscribeToCollection<GLTRecord>('gltRecords', (data) => {
      if (data) {
        this.gltRecords = data;
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    const unSubDyno = subscribeToCollection<DynotestRecord>('dynoRecords', (data) => {
      if (data) {
        this.dynoRecords = data;
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    const unSubHydraulic = subscribeToCollection<HydraulicRecord>('hydraulicRecords', (data) => {
      if (data) {
        this.hydraulicRecords = data;
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    const unSubReports = subscribeToCollection<PDFTestReportRecord>('pdfReports', (data) => {
      if (data) {
        this.pdfReports = data;
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    const unSubCertificates = subscribeToCollection<QualityCertificateRecord>('certificates', (data) => {
      if (data) {
        this.certificates = data;
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    const unSubAudit = subscribeToCollection<any>('auditLogs', (data) => {
      if (data) {
        this.auditLogs = data;
        this.notifyListeners();
      }
    });

    const unSubOverrides = subscribeToCollection<TestOverride>('testOverrides', (data) => {
      if (data) {
        this.testOverrides = data;
        this.saveToStorageCache();
        this.notifyListeners();
      }
    });

    this.unsubscribeFuncs = [
      unSubUsers,
      unSubAssemblers,
      unSubModels,
      unSubTemplates,
      unSubChecksheets,
      unSubQueue,
      unSubTestingLines,
      unSubGLT,
      unSubDyno,
      unSubHydraulic,
      unSubReports,
      unSubCertificates,
      unSubAudit,
      unSubOverrides,
    ];
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
      this.templates = t ? JSON.parse(t) : [...initialChecksheetTemplates];

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

  public ensureStarterChecksheetsForAllActiveProducts(): {
    createdCount: number;
    alreadyExistingCount: number;
  } {
    let createdCount = 0;
    let alreadyExistingCount = 0;

    this.models.forEach((model) => {
      if (!model.active) return;

      const testStage: TestProcess =
        model.compGroup === 'Engine'
          ? 'Dynotest'
          : 'Hydraulic Test';

      const existing = this.templates.find(
        (t) =>
          t.compGroup === model.compGroup &&
          t.component.toLowerCase() === model.component.toLowerCase() &&
          (t.unitModel === model.unitModel || t.unitModel === 'ALL')
      );

      if (!existing) {
        createdCount++;
        const starterTemplate: ChecksheetTemplate = {
          id: `tmpl-starter-${model.id}`,
          name: `${model.unitModel} / ${model.component} Starter Checksheet`,
          compGroup: model.compGroup,
          productMasterId: model.id,
          unitModel: model.unitModel,
          component: model.component,
          testStage,
          revision: 1,
          status: 'DRAFT',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          sections: [
            {
              id: `sec-vis-${model.id}`,
              name: 'Visual & Pre-Test Inspection',
              displayOrder: 1,
              items: [
                {
                  id: `itm-vis-1-${model.id}`,
                  itemName: 'Cleanliness & Foreign Object Inspection',
                  inputType: 'GOOD / NOT GOOD',
                  validation: 'NONE',
                  displayOrder: 1,
                  active: true,
                  mandatory: true,
                },
                {
                  id: `itm-vis-2-${model.id}`,
                  itemName: 'Fasteners & Bolt Torque Verification',
                  inputType: 'GOOD / NOT GOOD',
                  validation: 'NONE',
                  displayOrder: 2,
                  active: true,
                  mandatory: true,
                },
              ],
            },
            {
              id: `sec-perf-${model.id}`,
              name: 'Operating & Performance Parameters',
              displayOrder: 2,
              items: [
                {
                  id: `itm-perf-1-${model.id}`,
                  itemName: 'Operating Pressure / Load Check',
                  inputType: 'NUMERIC',
                  unit: model.compGroup === 'Engine' ? 'kW' : 'bar',
                  validation: 'RANGE',
                  minimumValue: model.compGroup === 'Engine' ? 100 : 150,
                  maximumValue: model.compGroup === 'Engine' ? 500 : 350,
                  displayOrder: 1,
                  active: true,
                  mandatory: true,
                },
              ],
            },
          ],
        };
        this.templates.push(starterTemplate);
        saveDocument('checksheetTemplates', starterTemplate);
      } else {
        alreadyExistingCount++;
      }
    });

    this.saveToStorageCache();
    this.notifyListeners();
    return { createdCount, alreadyExistingCount };
  }

  public bulkActivateStarterTemplates(): number {
    let activatedCount = 0;
    this.templates.forEach((t) => {
      if (t.status === 'DRAFT') {
        t.status = 'ACTIVE';
        t.activatedAt = new Date().toISOString();
        t.updatedAt = new Date().toISOString();
        saveDocument('checksheetTemplates', t);
        activatedCount++;
      }
    });
    if (activatedCount > 0) {
      this.saveToStorageCache();
      this.notifyListeners();
    }
    return activatedCount;
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
    const compKey = (component || '').trim().toLowerCase();
    const unitKey = (unitModel || '').trim().toUpperCase();

    const exactMatch = this.templates.find(
      (t) =>
        t.status === 'ACTIVE' &&
        t.testStage === testStage &&
        t.component.trim().toLowerCase() === compKey &&
        t.unitModel.trim().toUpperCase() === unitKey
    );
    if (exactMatch) return exactMatch;

    const allUnitMatch = this.templates.find(
      (t) =>
        t.status === 'ACTIVE' &&
        t.testStage === testStage &&
        t.component.trim().toLowerCase() === compKey &&
        (t.unitModel === 'ALL' || !t.unitModel)
    );
    if (allUnitMatch) return allUnitMatch;

    const compGroupMatch = this.templates.find(
      (t) =>
        t.status === 'ACTIVE' &&
        t.testStage === testStage &&
        (t.compGroup === compGroup ||
          (compGroup.includes('Engine') && t.compGroup === 'Engine') ||
          (compGroup.includes('PT') && t.compGroup === 'PT-PPM') ||
          (compGroup.includes('Cylinder') && t.compGroup === 'Cylinder'))
    );
    return compGroupMatch || null;
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

  public async deleteChecksheetTemplate(templateId: string, actorName = 'Admin'): Promise<void> {
    const target = this.templates.find((t) => t.id === templateId);
    this.templates = this.templates.filter((t) => t.id !== templateId);
    this.saveToStorageCache();

    await removeDocument('checksheetTemplates', templateId);
    if (target) {
      await logAuditEvent({
        action: 'DELETE_CHECKSHEET_TEMPLATE',
        collectionName: 'checksheetTemplates',
        documentId: templateId,
        userName: actorName,
        details: `Deleted template ${target.name}`,
      });
    }
    this.notifyListeners();
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

    if (glts.length === 0) return null;

    const latestGLT = glts[glts.length - 1];
    const isEngine =
      latestGLT.compGroup === 'Engine' ||
      latestGLT.productCategory === 'Engine' ||
      latestGLT.productModel.toLowerCase().includes('engine') ||
      latestGLT.productModel.toLowerCase().includes('saa');

    if (targetStage === 'Dynotest' && !isEngine) {
      return { error: 'JO is a Power Train or Cylinder Component. Dynotest is only for Engines.' };
    }
    if (targetStage === 'Hydraulic Test' && isEngine) {
      return { error: 'JO is an Engine. Hydraulic Test is only for Power Train & Cylinder Components.' };
    }

    const existingDyno = this.dynoRecords.filter((d) => matchJO(d.joNumber));
    const existingHyd = this.hydraulicRecords.filter((h) => matchJO(h.joNumber));

    return {
      joNumber: latestGLT.joNumber,
      compGroup: latestGLT.compGroup || (isEngine ? 'Engine' : 'PT-PPM'),
      unitModel: latestGLT.unitModel || '',
      component: latestGLT.component || '',
      productCategory: latestGLT.productCategory,
      productModel: latestGLT.productModel,
      assemblyMechanic: latestGLT.assemblyMechanic,
      latestGLTResult: latestGLT.result,
      gltIncomingTime: latestGLT.incomingTime,
      gltSubmissionTime: latestGLT.submissionTime,
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

    if (hasChanges) {
      await batch.commit();
    }
    this.saveToStorageCache();
    this.notifyListeners();
  }

  public async ensureTestingLineAssignments(records: QueueRecord[]): Promise<boolean> {
    let hasUpdated = false;
    const { writeBatch, doc } = await import('firebase/firestore');
    const { db } = await import('../lib/firebase');
    const batch = writeBatch(db);
    
    for (const q of records) {
      // Determine canonical line based on gltStatus and compGroup
      let canonicalLineId = q.currentTestingLineId || q.testingLineId;
      
      if (q.gltStatus !== 'GOOD') {
        const gltLine = q.compGroup === 'Engine' ? 'glt-engine' : 'glt-pt-cyl';
        if (canonicalLineId !== gltLine) {
          canonicalLineId = gltLine;
        }
      } else {
        // If gltStatus is 'GOOD', but currently assigned line is a GLT line or missing
        if (!canonicalLineId || canonicalLineId === 'glt-engine' || canonicalLineId === 'glt-pt-cyl') {
          if (q.compGroup === 'Engine') {
            canonicalLineId = 'dyno-1';
          } else if (q.compGroup === 'Cylinder') {
            canonicalLineId = 'tb-4-cyl';
          } else {
            canonicalLineId = 'tb-1'; // PT-PPM
          }
        }
      }
      
      // If there's a missing or mismatched canonical line ID
      if (q.currentTestingLineId !== canonicalLineId || q.testingLineId !== canonicalLineId) {
        q.currentTestingLineId = canonicalLineId;
        q.testingLineId = canonicalLineId;
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
    
    if (hasUpdated) {
      try {
        await batch.commit();
      } catch (e) {
        console.error("Error committing batch line updates:", e);
      }
    }
    return hasUpdated;
  }

  public async addQueueRecord(record: QueueRecord, actorName = 'PPC'): Promise<void> {
    // Assign canonical line before saving
    let canonicalLineId = record.currentTestingLineId || record.testingLineId;
    if (record.gltStatus !== 'GOOD') {
      canonicalLineId = record.compGroup === 'Engine' ? 'glt-engine' : 'glt-pt-cyl';
    } else {
      if (!canonicalLineId || canonicalLineId === 'glt-engine' || canonicalLineId === 'glt-pt-cyl') {
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

    if (mergedRecord.gltStatus !== 'GOOD') {
      const gltLine = mergedRecord.compGroup === 'Engine' ? 'glt-engine' : 'glt-pt-cyl';
      if (canonicalLineId !== gltLine) {
        canonicalLineId = gltLine;
      }
    } else {
      if (!canonicalLineId || canonicalLineId === 'glt-engine' || canonicalLineId === 'glt-pt-cyl') {
        if (mergedRecord.compGroup === 'Engine') {
          canonicalLineId = 'dyno-1';
        } else if (mergedRecord.compGroup === 'Cylinder') {
          canonicalLineId = 'tb-4-cyl';
        } else {
          canonicalLineId = 'tb-1';
        }
      }
    }

    updates.currentTestingLineId = canonicalLineId;
    updates.testingLineId = canonicalLineId;

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
}

export const store = new DataStore();
