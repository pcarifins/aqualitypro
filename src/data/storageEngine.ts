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
  PDFTestReportRecord,
  QualityCertificateRecord,
  ProductMasterValidationReport,
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
import { computeUnifiedAnalytics } from '../services/analyticsService';

import { calculateMinutesBetween } from '../utils/formatters';
import {
  saveDocument,
  removeDocument,
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
  PDF_REPORTS: 'aquality_pdf_reports_v2',
  CERTIFICATES: 'aquality_certificates_v2',
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

// Internal memory store with LocalStorage persistence & Firestore Sync support
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
  private pdfReports: PDFTestReportRecord[] = [];
  private certificates: QualityCertificateRecord[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      // 1. Users
      const u = getStorage(STORAGE_KEYS.USERS);
      const parsedUsers: User[] = u ? JSON.parse(u) : [...initialUsers];
      const existingUsernames = new Set(parsedUsers.map((usr) => usr.username.toLowerCase()));

      initialUsers.forEach((initUser) => {
        if (!existingUsernames.has(initUser.username.toLowerCase())) {
          parsedUsers.push(initUser);
        }
      });
      this.users = parsedUsers;

      // 2. Assemblers
      const a = getStorage(STORAGE_KEYS.ASSEMBLERS);
      this.assemblers = a ? JSON.parse(a) : [...initialAssemblers];

      // 3. Product Models - Idempotent merge with all 169 required models
      const m = getStorage(STORAGE_KEYS.MODELS);
      let parsedModels: ProductModel[] = m ? JSON.parse(m) : [...initialProductModels];

      const modelKeySet = new Set(
        parsedModels.map(
          (mod) =>
            `${mod.compGroup || mod.category}_${(mod.subGroup || '')}_${mod.unitModel.trim().toUpperCase()}_${mod.component.trim().toUpperCase()}`
        )
      );

      INITIAL_REQUIRED_PRODUCT_MODELS.forEach((reqModel) => {
        const key = `${reqModel.compGroup}_${(reqModel.subGroup || '')}_${reqModel.unitModel.trim().toUpperCase()}_${reqModel.component.trim().toUpperCase()}`;
        if (!modelKeySet.has(key)) {
          parsedModels.push(reqModel);
          modelKeySet.add(key);
        }
      });

      this.models = parsedModels;

      // 4. Checksheet Templates
      const t = getStorage(STORAGE_KEYS.TEMPLATES);
      this.templates = t ? JSON.parse(t) : [...initialChecksheetTemplates];

      // Ensure starter checksheets exist for all active products
      this.ensureStarterChecksheetsForAllActiveProducts();

      // Flat items backward compatibility
      const c = getStorage(STORAGE_KEYS.CHECKSHEETS);
      this.checksheets = c ? JSON.parse(c) : [...initialChecksheetItems];

      // Records
      const g = getStorage(STORAGE_KEYS.GLT);
      this.gltRecords = g ? JSON.parse(g) : [...initialGLTRecords];

      const d = getStorage(STORAGE_KEYS.DYNO);
      this.dynoRecords = d ? JSON.parse(d) : [...initialDynotestRecords];

      const h = getStorage(STORAGE_KEYS.HYDRAULIC);
      this.hydraulicRecords = h ? JSON.parse(h) : [...initialHydraulicRecords];

      // Queue Records
      const q = getStorage(STORAGE_KEYS.QUEUE);
      this.queueRecords = q ? JSON.parse(q) : [...initialQueueRecords];

      // PDF Reports
      const rep = getStorage(STORAGE_KEYS.PDF_REPORTS);
      this.pdfReports = rep ? JSON.parse(rep) : [];

      // Certificates
      const cert = getStorage(STORAGE_KEYS.CERTIFICATES);
      this.certificates = cert ? JSON.parse(cert) : [];
    } catch {
      this.resetToDefault();
    }
  }

  public saveToStorage() {
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
      setStorage(STORAGE_KEYS.PDF_REPORTS, JSON.stringify(this.pdfReports));
      setStorage(STORAGE_KEYS.CERTIFICATES, JSON.stringify(this.certificates));
    } catch {
      // Ignore storage limit errors
    }
  }

  public exportFullDatabase() {
    return {
      appName: 'AQuality PRO System',
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      users: this.users,
      assemblers: this.assemblers,
      models: this.models,
      templates: this.templates,
      checksheets: this.checksheets,
      gltRecords: this.gltRecords,
      dynoRecords: this.dynoRecords,
      hydraulicRecords: this.hydraulicRecords,
      queueRecords: this.queueRecords,
      pdfReports: this.pdfReports,
      certificates: this.certificates,
    };
  }

  public importFullDatabase(data: any) {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid database format.');
    }
    if (Array.isArray(data.users)) this.users = data.users;
    if (Array.isArray(data.assemblers)) this.assemblers = data.assemblers;
    if (Array.isArray(data.models)) this.models = data.models;
    if (Array.isArray(data.templates)) this.templates = data.templates;
    if (Array.isArray(data.checksheets)) this.checksheets = data.checksheets;
    if (Array.isArray(data.gltRecords)) this.gltRecords = data.gltRecords;
    if (Array.isArray(data.dynoRecords)) this.dynoRecords = data.dynoRecords;
    if (Array.isArray(data.hydraulicRecords)) this.hydraulicRecords = data.hydraulicRecords;
    if (Array.isArray(data.queueRecords)) this.queueRecords = data.queueRecords;
    if (Array.isArray(data.pdfReports)) this.pdfReports = data.pdfReports;
    if (Array.isArray(data.certificates)) this.certificates = data.certificates;
    this.saveToStorage();
  }

  public resetToDefault() {
    this.users = [...initialUsers];
    this.assemblers = [...initialAssemblers];
    this.models = [...initialProductModels, ...INITIAL_REQUIRED_PRODUCT_MODELS];
    this.templates = [...initialChecksheetTemplates];
    this.ensureStarterChecksheetsForAllActiveProducts();
    this.checksheets = [...initialChecksheetItems];
    this.gltRecords = [...initialGLTRecords];
    this.dynoRecords = [...initialDynotestRecords];
    this.hydraulicRecords = [...initialHydraulicRecords];
    this.queueRecords = [...initialQueueRecords];
    this.pdfReports = [];
    this.certificates = [];
    this.saveToStorage();
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

  public saveUser(user: User) {
    const idx = this.users.findIndex((u) => u.id === user.id);
    if (idx >= 0) {
      this.users[idx] = { ...this.users[idx], ...user };
    } else {
      this.users.push(user);
    }
    this.saveToStorage();
    saveDocument('users', user);
  }

  public deleteUser(id: string) {
    this.users = this.users.filter((u) => u.id !== id);
    this.saveToStorage();
    removeDocument('users', id);
  }

  public changeUserPassword(userId: string, newPass: string): boolean {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.password = newPass;
      this.saveToStorage();
      saveDocument('users', user);
      return true;
    }
    return false;
  }

  // ==========================================
  // --- ASSEMBLER MASTER (Assembly Mechanic is NOT login user) ---
  // ==========================================
  public getAssemblers(onlyActive = false): Assembler[] {
    if (onlyActive) {
      return this.assemblers.filter((a) => a.active);
    }
    return this.assemblers;
  }

  public saveAssembler(assembler: Assembler) {
    const idx = this.assemblers.findIndex((a) => a.id === assembler.id);
    if (idx >= 0) {
      this.assemblers[idx] = assembler;
    } else {
      this.assemblers.push(assembler);
    }
    this.saveToStorage();
    saveDocument('assemblers', assembler);
  }

  public deleteAssembler(id: string) {
    this.assemblers = this.assemblers.filter((a) => a.id !== id);
    this.saveToStorage();
    removeDocument('assemblers', id);
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

  public saveProductModel(model: ProductModel) {
    const idx = this.models.findIndex((m) => m.id === model.id);
    if (idx >= 0) {
      this.models[idx] = model;
    } else {
      this.models.push(model);
    }
    this.saveToStorage();
    saveDocument('productModels', model);
  }

  public deleteProductModel(id: string) {
    this.models = this.models.filter((m) => m.id !== id);
    this.saveToStorage();
    removeDocument('productModels', id);
  }

  // Validate that all 169 Product Master requirements are met
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

  // Ensure every active product model has at least a starter checksheet template
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
          : model.compGroup === 'Cylinder'
          ? 'Hydraulic Test'
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
                {
                  id: `itm-vis-3-${model.id}`,
                  itemName: 'Port Plugs & Seal Orientation Check',
                  inputType: 'GOOD / NOT GOOD',
                  validation: 'NONE',
                  displayOrder: 3,
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
                  itemName: 'Operating Oil Temperature',
                  inputType: 'NUMERIC',
                  unit: '°C',
                  validation: 'RANGE',
                  minimumValue: 45,
                  maximumValue: 65,
                  displayOrder: 1,
                  active: true,
                  mandatory: true,
                },
                {
                  id: `itm-perf-2-${model.id}`,
                  itemName: 'Main Circuit Relief Pressure',
                  inputType: 'NUMERIC',
                  unit: 'bar',
                  validation: 'RANGE',
                  minimumValue: 180,
                  maximumValue: 240,
                  displayOrder: 2,
                  active: true,
                  mandatory: true,
                },
                {
                  id: `itm-perf-3-${model.id}`,
                  itemName: 'Internal / External Leakage Check',
                  inputType: 'GOOD / NOT GOOD',
                  validation: 'NONE',
                  displayOrder: 3,
                  active: true,
                  mandatory: true,
                },
              ],
            },
            {
              id: `sec-sign-${model.id}`,
              name: 'Final Quality Sign-off',
              displayOrder: 3,
              items: [
                {
                  id: `itm-sign-1-${model.id}`,
                  itemName: 'No Abnormal Vibration or Noise',
                  inputType: 'GOOD / NOT GOOD',
                  validation: 'NONE',
                  displayOrder: 1,
                  active: true,
                  mandatory: true,
                },
                {
                  id: `itm-sign-2-${model.id}`,
                  itemName: 'Final Cosmetic & Paint Condition',
                  inputType: 'GOOD / NOT GOOD',
                  validation: 'NONE',
                  displayOrder: 2,
                  active: true,
                  mandatory: true,
                },
              ],
            },
          ],
        };
        this.templates.push(starterTemplate);
      } else {
        alreadyExistingCount++;
      }
    });

    return { createdCount, alreadyExistingCount };
  }

  // Bulk activate all starter templates that don't have an active counterpart
  public bulkActivateStarterTemplates(): number {
    let activatedCount = 0;
    this.templates.forEach((t) => {
      if (t.status === 'DRAFT') {
        const hasActive = this.templates.some(
          (other) =>
            other.id !== t.id &&
            other.compGroup === t.compGroup &&
            other.component.toLowerCase() === t.component.toLowerCase() &&
            other.unitModel === t.unitModel &&
            other.status === 'ACTIVE'
        );
        if (!hasActive) {
          t.status = 'ACTIVE';
          t.activatedAt = new Date().toISOString();
          t.updatedAt = new Date().toISOString();
          activatedCount++;
        }
      }
    });
    if (activatedCount > 0) {
      this.saveToStorage();
    }
    return activatedCount;
  }

  // ==========================================
  // --- CHECKSHEET MASTER (Hierarchy: Comp Group -> Unit -> Component -> Test Stage -> Template -> Section -> Item) ---
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
      if (filter.compGroup) {
        list = list.filter((t) => t.compGroup === filter.compGroup);
      }
      if (filter.unitModel && filter.unitModel !== 'ALL') {
        list = list.filter((t) => t.unitModel === filter.unitModel || t.unitModel === 'ALL');
      }
      if (filter.component) {
        list = list.filter(
          (t) => t.component.toLowerCase() === filter.component?.toLowerCase()
        );
      }
      if (filter.testStage) {
        list = list.filter((t) => t.testStage === filter.testStage);
      }
      if (filter.status) {
        list = list.filter((t) => t.status === filter.status);
      }
    }
    return list;
  }

  public getChecksheetTemplateById(id: string): ChecksheetTemplate | undefined {
    return this.templates.find((t) => t.id === id);
  }

  // Find active template for test execution (e.g. MAIN PUMP vs SWING MOTOR vs Engine Assembly)
  public getActiveTemplate(
    compGroup: CompGroup | string,
    unitModel: string,
    component: string,
    testStage: TestProcess
  ): ChecksheetTemplate | null {
    const compKey = (component || '').trim().toLowerCase();
    const unitKey = (unitModel || '').trim().toUpperCase();

    // 1. Try exact unit + component match
    const exactMatch = this.templates.find(
      (t) =>
        t.status === 'ACTIVE' &&
        t.testStage === testStage &&
        t.component.trim().toLowerCase() === compKey &&
        t.unitModel.trim().toUpperCase() === unitKey
    );
    if (exactMatch) return exactMatch;

    // 2. Try component match with unitModel = 'ALL'
    const allUnitMatch = this.templates.find(
      (t) =>
        t.status === 'ACTIVE' &&
        t.testStage === testStage &&
        t.component.trim().toLowerCase() === compKey &&
        (t.unitModel === 'ALL' || !t.unitModel)
    );
    if (allUnitMatch) return allUnitMatch;

    // 3. Fallback: match by compGroup & testStage if component is generic
    const compGroupMatch = this.templates.find(
      (t) =>
        t.status === 'ACTIVE' &&
        t.testStage === testStage &&
        (t.compGroup === compGroup ||
          (compGroup.includes('Engine') && t.compGroup === 'Engine') ||
          (compGroup.includes('PT') && t.compGroup === 'PT-PPM') ||
          (compGroup.includes('Power Train') && t.compGroup === 'PT-PPM') ||
          (compGroup.includes('Cylinder') && t.compGroup === 'Cylinder'))
    );
    return compGroupMatch || null;
  }

  // Create immutable snapshot from template
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
            .filter((item) => item.active) // only include active items in new tests
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

  public saveChecksheetTemplate(template: ChecksheetTemplate) {
    const idx = this.templates.findIndex((t) => t.id === template.id);
    template.updatedAt = new Date().toISOString();
    if (idx >= 0) {
      this.templates[idx] = template;
    } else {
      this.templates.push(template);
    }
    this.saveToStorage();
    saveDocument('checksheetTemplates', template);
  }

  public activateChecksheetTemplate(templateId: string) {
    const target = this.templates.find((t) => t.id === templateId);
    if (!target) return;

    // Archive or de-activate other templates with the same compGroup, unitModel, component, testStage
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
      }
    });

    target.status = 'ACTIVE';
    target.activatedAt = new Date().toISOString();
    target.updatedAt = new Date().toISOString();

    this.saveToStorage();
    saveDocument('checksheetTemplates', target);
  }

  public createRevisionChecksheetTemplate(templateId: string): ChecksheetTemplate | null {
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
    this.saveToStorage();
    saveDocument('checksheetTemplates', newTemplate);
    return newTemplate;
  }

  public duplicateChecksheetTemplate(templateId: string): ChecksheetTemplate | null {
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
    this.saveToStorage();
    saveDocument('checksheetTemplates', newTemplate);
    return newTemplate;
  }

  public deleteChecksheetTemplate(templateId: string) {
    this.templates = this.templates.filter((t) => t.id !== templateId);
    this.saveToStorage();
    removeDocument('checksheetTemplates', templateId);
  }

  // Backward-compatible flat checksheet methods
  public getChecksheetItems(
    process?: TestProcess,
    category?: ProductCategory
  ): ChecksheetItem[] {
    let items = [...this.checksheets];
    if (process) {
      items = items.filter((i) => i.process === process);
    }
    if (category) {
      const catKey = category === 'Engine' ? 'Engine' : 'Power Train';
      items = items.filter(
        (i) => i.productCategory === 'Both' || i.productCategory === catKey
      );
    }
    return items.sort((a, b) => a.displayOrder - b.displayOrder);
  }

  public saveChecksheetItem(item: ChecksheetItem) {
    const idx = this.checksheets.findIndex((c) => c.id === item.id);
    if (idx >= 0) {
      this.checksheets[idx] = item;
    } else {
      this.checksheets.push(item);
    }
    this.saveToStorage();
  }

  public deleteChecksheetItem(id: string) {
    this.checksheets = this.checksheets.filter((c) => c.id !== id);
    this.saveToStorage();
  }

  // ==========================================
  // --- RECORDS: GLT ---
  // ==========================================
  public getGLTRecords(): GLTRecord[] {
    return this.gltRecords;
  }

  public saveGLTRecord(record: GLTRecord): GLTRecord {
    const existingForJO = this.gltRecords.filter(
      (r) => r.joNumber.toUpperCase() === record.joNumber.toUpperCase()
    );

    const idx = this.gltRecords.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      this.gltRecords[idx] = record;
    } else {
      if (!record.attemptNumber) {
        record.attemptNumber = existingForJO.length + 1;
      }
      this.gltRecords.push(record);
    }
    this.saveToStorage();
    saveDocument('gltRecords', record);
    return record;
  }

  // ==========================================
  // --- RECORDS: DYNO ---
  // ==========================================
  public getDynoRecords(): DynotestRecord[] {
    return this.dynoRecords;
  }

  public saveDynoRecord(record: DynotestRecord): DynotestRecord {
    const existingForJO = this.dynoRecords.filter(
      (r) => r.joNumber.toUpperCase() === record.joNumber.toUpperCase()
    );

    const idx = this.dynoRecords.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      this.dynoRecords[idx] = record;
    } else {
      if (!record.attemptNumber) {
        record.attemptNumber = existingForJO.length + 1;
      }
      this.dynoRecords.push(record);
    }
    this.saveToStorage();
    saveDocument('dynoRecords', record);
    return record;
  }

  // ==========================================
  // --- RECORDS: HYDRAULIC ---
  // ==========================================
  public getHydraulicRecords(): HydraulicRecord[] {
    return this.hydraulicRecords;
  }

  public saveHydraulicRecord(record: HydraulicRecord): HydraulicRecord {
    const existingForJO = this.hydraulicRecords.filter(
      (r) => r.joNumber.toUpperCase() === record.joNumber.toUpperCase()
    );

    const idx = this.hydraulicRecords.findIndex((r) => r.id === record.id);
    if (idx >= 0) {
      this.hydraulicRecords[idx] = record;
    } else {
      if (!record.attemptNumber) {
        record.attemptNumber = existingForJO.length + 1;
      }
      this.hydraulicRecords.push(record);
    }
    this.saveToStorage();
    saveDocument('hydraulicRecords', record);
    return record;
  }

  // ==========================================
  // --- JO SEARCH & LOOKUP ---
  // ==========================================
  public lookupJOForStage(joNumber: string, targetStage: 'Dynotest' | 'Hydraulic Test') {
    const rawClean = joNumber.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
    const matchJO = (jo: string) => jo.replace(/[^0-9a-zA-Z]/g, '').toUpperCase() === rawClean;

    const glts = this.gltRecords
      .filter((r) => matchJO(r.joNumber) && r.status === 'Submitted')
      .sort((a, b) => a.attemptNumber - b.attemptNumber);

    if (glts.length === 0) {
      return null;
    }

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
  // --- COMBINED JO HISTORY LIST ---
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
      if (joMap.has(key)) {
        joMap.get(key)!.dynos.push(d);
      }
    });

    this.hydraulicRecords.forEach((h) => {
      const key = h.joNumber.toUpperCase();
      if (joMap.has(key)) {
        joMap.get(key)!.hyds.push(h);
      }
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
      };

      if (filters.joNumber && !entry.joNumber.toUpperCase().includes(filters.joNumber.toUpperCase())) {
        return;
      }
      if (filters.compGroup && filters.compGroup !== 'All' && entry.compGroup !== filters.compGroup) {
        return;
      }
      if (
        filters.productCategory &&
        filters.productCategory !== 'All' &&
        entry.productCategory !== filters.productCategory
      ) {
        return;
      }
      if (
        filters.productModel &&
        filters.productModel !== 'All' &&
        entry.productModel !== filters.productModel
      ) {
        return;
      }
      if (
        filters.assemblyMechanic &&
        filters.assemblyMechanic !== 'All' &&
        entry.assemblyMechanic !== filters.assemblyMechanic
      ) {
        return;
      }

      if (filters.resultFilter && filters.resultFilter !== 'All') {
        if (filters.resultFilter === 'GOOD' && latestStageResult !== 'GOOD') return;
        if (filters.resultFilter === 'NOT GOOD' && latestStageResult !== 'NOT GOOD') return;
        if (filters.resultFilter === 'Ever NOT GOOD' && !everHadNG) return;
      }

      result.push(item);
    });

    return result.sort((a, b) => b.joNumber.localeCompare(a.joNumber));
  }

  // ==========================================
  // --- DASHBOARD CALCULATIONS (Unified Analytics Service) ---
  // ==========================================
  public getDashboardStats(filters: FilterParams = {}): DashboardStats {
    const combined = this.getCombinedJOHistory();
    const analytics = computeUnifiedAnalytics(combined, filters);
    return analytics.stats;
  }

  // ==========================================
  // --- PRIORITY QUEUE SYSTEM ---
  // ==========================================
  public getQueueRecords(compGroup?: CompGroup): QueueRecord[] {
    let list = [...this.queueRecords];
    if (compGroup) {
      list = list.filter((q) => q.compGroup === compGroup);
    }
    return list.sort((a, b) => {
      // Urgent unassigned always shown at top or separated
      if (a.isUrgentUnassigned && !b.isUrgentUnassigned) return -1;
      if (!a.isUrgentUnassigned && b.isUrgentUnassigned) return 1;
      return (a.currentPriority || 999) - (b.currentPriority || 999);
    });
  }

  public addQueueRecord(record: QueueRecord) {
    this.queueRecords.push(record);
    this.saveToStorage();
  }

  public updateQueueRecord(queueRecordId: string, updates: Partial<QueueRecord>) {
    const idx = this.queueRecords.findIndex((q) => q.queueRecordId === queueRecordId);
    if (idx >= 0) {
      this.queueRecords[idx] = {
        ...this.queueRecords[idx],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      this.saveToStorage();
    }
  }

  // Reorder queue with permission check, priority lock check, auto-renumbering, and history audit
  public reorderQueue(
    compGroup: CompGroup,
    queueRecordId: string,
    newPriority: number,
    changedBy: string,
    remark: string
  ): boolean {
    const target = this.queueRecords.find((q) => q.queueRecordId === queueRecordId);
    if (!target) return false;
    if (target.priorityLocked || target.status === 'ON_PROCESS') return false; // Cannot reorder ON_PROCESS job

    const oldPriority = target.currentPriority;

    // Get active waiting items in this compGroup
    const groupItems = this.queueRecords
      .filter((q) => q.compGroup === compGroup && !q.isUrgentUnassigned && q.status === 'WAITING' && q.queueRecordId !== queueRecordId)
      .sort((a, b) => a.currentPriority - b.currentPriority);

    // Insert target at target position
    const clampedPos = Math.max(0, Math.min(newPriority - 1, groupItems.length));
    groupItems.splice(clampedPos, 0, target);

    // Renumber priorities 1..N
    groupItems.forEach((item, index) => {
      const p = index + 1;
      item.currentPriority = p;
      item.updatedAt = new Date().toISOString();
    });

    target.history.push({
      oldPriority,
      newPriority: target.currentPriority,
      remark: remark || 'Priority adjusted in Queue',
      changedBy,
      changedAt: new Date().toISOString(),
    });

    this.saveToStorage();
    return true;
  }

  // Assign urgent job to normal queue
  public assignUrgentPriority(
    queueRecordId: string,
    priority: number,
    changedBy: string,
    remark: string
  ): boolean {
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

    // Re-index remaining group items
    this.reorderQueue(target.compGroup, queueRecordId, priority, changedBy, remark);
    this.saveToStorage();
    return true;
  }

  // When test starts (GLT, Dyno, or Testbench): lock priority & set ON_PROCESS
  public lockQueueOnTestStart(joNumber: string, compGroup?: CompGroup) {
    const target = this.queueRecords.find(
      (q) => q.joRoNumber.toUpperCase() === joNumber.toUpperCase() && (!compGroup || q.compGroup === compGroup)
    );
    if (target) {
      target.status = 'ON_PROCESS';
      target.priorityLocked = true;
      target.updatedAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  // When test is completed: set FINISH
  public finishQueueRecord(joNumber: string) {
    const target = this.queueRecords.find((q) => q.joRoNumber.toUpperCase() === joNumber.toUpperCase());
    if (target) {
      target.status = 'FINISH';
      target.updatedAt = new Date().toISOString();
      this.saveToStorage();
    }
  }

  // Apply AI Recommendation
  public applyAIRecommendation(queueRecordId: string, changedBy: string): boolean {
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
  // --- PDF TEST REPORT & CERTIFICATE STORE ---
  // ==========================================
  public getPDFReportsForJO(joNumber: string): PDFTestReportRecord[] {
    return this.pdfReports
      .filter((r) => r.joNumber.toUpperCase() === joNumber.toUpperCase())
      .sort((a, b) => b.version - a.version);
  }

  public savePDFTestReportRecord(record: PDFTestReportRecord) {
    this.pdfReports.push(record);
    this.saveToStorage();
  }

  public getCertificatesForJO(joNumber: string): QualityCertificateRecord[] {
    return this.certificates
      .filter((c) => c.joNumber.toUpperCase() === joNumber.toUpperCase())
      .sort((a, b) => b.version - a.version);
  }

  public saveQualityCertificateRecord(record: QualityCertificateRecord) {
    this.certificates.push(record);
    this.saveToStorage();
  }
}

export const store = new DataStore();
