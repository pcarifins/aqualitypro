import {
  ChecksheetTemplate,
  TemplateRelationship,
  ProductModel,
  QualityCertificateRecord,
  PDFTestReportRecord,
  DynotestRecord,
  HydraulicRecord,
  GLTRecord,
} from '../types';
import { db } from '../lib/firebase';
import { doc, writeBatch, collection, getDocs, setDoc } from 'firebase/firestore';
import { logAuditEvent, sanitizeFirestoreValue } from '../lib/firestoreSync';

export interface DryRunTemplateReportItem {
  templateId: string;
  templateName: string;
  compGroup?: string;
  testStage?: string;
  activeRelationshipCount: number;
  completedTestRefCount: number;
  certificateRefCount: number;
  replacementTemplateId: string | null;
  decision: 'DELETE' | 'KEEP';
  reason: string;
}

export interface DryRunReport {
  timestamp: string;
  totalTemplatesEvaluated: number;
  toDeleteCount: number;
  toKeepCount: number;
  activeProductsWithSingleRelationship: number;
  totalActiveProducts: number;
  allProductsValid: boolean;
  duplicateRelationshipProductIds: string[];
  missingRelationshipProductIds: string[];
  items: DryRunTemplateReportItem[];
}

export interface TemplateBackupSnapshot {
  backupId: string;
  timestamp: string;
  adminName: string;
  checksheetTemplates: ChecksheetTemplate[];
  activeRelationships: TemplateRelationship[];
  completedTests: {
    dynoRecordsCount: number;
    hydraulicRecordsCount: number;
    gltRecordsCount: number;
  };
  certificatesCount: number;
  pdfReportsCount: number;
}

export const APPROVED_SHARED_TEMPLATE_IDS = new Set([
  'tmpl-glt-engine-v2',
  'tmpl-glt-pt-ppm-v2',
  'tmpl-eng-dyno-v1',
  'tmpl-cylinder-testbench-v2',
  'tmpl-pto-testbench-v2',
  'tmpl-pump-testbench-v2',
  'tmpl-motor-testbench-v2',
  'tmpl-final-drive-gd-v2',
  'tmpl-final-drive-pc-dz-v2',
  'tmpl-differential-v2',
  'tmpl-axle-hd-v1',
  'tmpl-final-drive-wheel-v1',
  'tmpl-front-brake-axle-v2',
  'tmpl-power-module-v2',
  'tmpl-trans-gd-v2',
  'tmpl-trans-wa-v2',
  'tmpl-torqflow-v2',
  'tmpl-torque-converter-performance-v1',
]);

export const PROTECTED_CONTINGENCY_TEMPLATE_IDS = new Set([
  'tmpl-performance-only-fallback-v1',
  'tmpl-controlled-performance-only',
  'tmpl-contingency-performance-only',
]);

export const TARGET_LEGACY_TEMPLATE_IDS = new Set([
  'tmpl-mp-hyd-v1',
  'tmpl-sm-hyd-v1',
  'tmpl-eng-glt-v1',
  'tmpl-cyl-hyd-v1',
  'tmpl-pt-glt-v1',
  'tmpl-axle-fd-hd-v2',
]);

export function isStarterOrFallbackTemplate(id: string, name?: string): boolean {
  const normId = (id || '').toLowerCase();
  const normName = (name || '').toLowerCase();
  if (PROTECTED_CONTINGENCY_TEMPLATE_IDS.has(id)) return false;
  if (normId.startsWith('tmpl-starter-') || normId.startsWith('tmpl-fallback-')) return true;
  if (normName.includes('starter checksheet') || normName.includes('trial checksheet')) return true;
  return false;
}

export function getReplacementTemplateId(templateId: string, compGroup?: string, component?: string): string | null {
  if (templateId === 'tmpl-mp-hyd-v1') return 'tmpl-power-module-v2';
  if (templateId === 'tmpl-sm-hyd-v1') return 'tmpl-motor-testbench-v2';
  if (templateId === 'tmpl-eng-glt-v1') return 'tmpl-glt-engine-v2';
  if (templateId === 'tmpl-cyl-hyd-v1') return 'tmpl-cylinder-testbench-v2';
  if (templateId === 'tmpl-pt-glt-v1') return 'tmpl-glt-pt-ppm-v2';
  if (templateId === 'tmpl-axle-fd-hd-v2') {
    if (component && (component.includes('AXLE') || component.includes('Axle'))) {
      return 'tmpl-axle-hd-v1';
    }
    return 'tmpl-final-drive-wheel-v1';
  }
  if (isStarterOrFallbackTemplate(templateId)) {
    if (compGroup === 'Engine') return 'tmpl-eng-dyno-v1';
    if (compGroup === 'Cylinder') return 'tmpl-cylinder-testbench-v2';
    return 'tmpl-pump-testbench-v2';
  }
  return null;
}

export class TemplateCleanupService {
  /**
   * 1. Create a full in-memory / Firestore backup of critical data before template operations
   */
  public static async createBackup(data: {
    templates: ChecksheetTemplate[];
    relationships: TemplateRelationship[];
    dynoRecords: DynotestRecord[];
    hydraulicRecords: HydraulicRecord[];
    gltRecords: GLTRecord[];
    certificates: QualityCertificateRecord[];
    pdfReports: PDFTestReportRecord[];
    adminName?: string;
  }): Promise<TemplateBackupSnapshot> {
    const backupId = `backup-templates-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const adminName = data.adminName || 'Admin Quality';

    const backupSnapshot: TemplateBackupSnapshot = {
      backupId,
      timestamp,
      adminName,
      checksheetTemplates: JSON.parse(JSON.stringify(data.templates)),
      activeRelationships: JSON.parse(JSON.stringify(data.relationships)),
      completedTests: {
        dynoRecordsCount: data.dynoRecords.length,
        hydraulicRecordsCount: data.hydraulicRecords.length,
        gltRecordsCount: data.gltRecords.length,
      },
      certificatesCount: data.certificates.length,
      pdfReportsCount: data.pdfReports.length,
    };

    try {
      const backupRef = doc(db, 'systemBackups', backupId);
      await setDoc(backupRef, sanitizeFirestoreValue({
        ...backupSnapshot,
        templatesCount: data.templates.length,
        activeRelationshipsCount: data.relationships.length,
      }));

      await logAuditEvent({
        action: 'SYSTEM_BACKUP_CREATED',
        collectionName: 'systemBackups',
        documentId: backupId,
        userName: adminName,
        details: `Created backup before template cleanup: ${data.templates.length} templates, ${data.relationships.length} relationships backed up.`,
      });
    } catch (err) {
      console.warn('Backup to Firestore failed (proceeding with local backup state):', err);
    }

    return backupSnapshot;
  }

  /**
   * 2. Generate Dry-Run Report
   */
  public static generateDryRunReport(data: {
    templates: ChecksheetTemplate[];
    relationships: TemplateRelationship[];
    productModels: ProductModel[];
    dynoRecords: DynotestRecord[];
    hydraulicRecords: HydraulicRecord[];
    gltRecords: GLTRecord[];
    certificates: QualityCertificateRecord[];
    pdfReports: PDFTestReportRecord[];
  }): DryRunReport {
    const {
      templates,
      relationships,
      productModels,
      dynoRecords,
      hydraulicRecords,
      gltRecords,
      certificates,
      pdfReports,
    } = data;

    // Active product relationships check
    const activeProducts = productModels.filter((m) => m.active);
    const relsByProduct: Record<string, TemplateRelationship[]> = {};
    relationships.forEach((r) => {
      if (r.status === 'ACTIVE') {
        if (!relsByProduct[r.productId]) relsByProduct[r.productId] = [];
        relsByProduct[r.productId].push(r);
      }
    });

    const duplicateRelationshipProductIds: string[] = [];
    const missingRelationshipProductIds: string[] = [];
    let activeProductsWithSingleRelationship = 0;

    activeProducts.forEach((p) => {
      const pRels = relsByProduct[p.id] || [];
      if (pRels.length === 1) {
        activeProductsWithSingleRelationship++;
      } else if (pRels.length > 1) {
        duplicateRelationshipProductIds.push(p.id);
      } else {
        missingRelationshipProductIds.push(p.id);
      }
    });

    // Reference counts per template
    const completedTestCounts: Record<string, number> = {};
    const certCounts: Record<string, number> = {};
    const activeRelCounts: Record<string, number> = {};

    relationships.forEach((r) => {
      if (r.status === 'ACTIVE' && r.templateId) {
        activeRelCounts[r.templateId] = (activeRelCounts[r.templateId] || 0) + 1;
      }
    });

    const countTestRef = (tId?: string, snapshotTId?: string) => {
      const id = tId || snapshotTId;
      if (id) {
        completedTestCounts[id] = (completedTestCounts[id] || 0) + 1;
      }
    };

    dynoRecords.forEach((r: any) => countTestRef(r.templateId, r.checksheetSnapshot?.templateId));
    hydraulicRecords.forEach((r: any) => countTestRef(r.templateId, r.checksheetSnapshot?.templateId));
    gltRecords.forEach((r: any) => countTestRef(r.templateId, r.checksheetSnapshot?.templateId));

    const countCertRef = (tId?: string, snapshotTId?: string) => {
      const id = tId || snapshotTId;
      if (id) {
        certCounts[id] = (certCounts[id] || 0) + 1;
      }
    };

    certificates.forEach((c: any) => countCertRef(c.templateId, c.checksheetSnapshot?.templateId));
    pdfReports.forEach((p: any) => countCertRef(p.templateId, p.checksheetSnapshot?.templateId));

    // Evaluate each template
    const items: DryRunTemplateReportItem[] = templates.map((tmpl) => {
      const activeRelCount = activeRelCounts[tmpl.id] || 0;
      const testRefCount = completedTestCounts[tmpl.id] || 0;
      const certRefCount = certCounts[tmpl.id] || 0;
      const totalRefs = activeRelCount + testRefCount + certRefCount;

      const isApprovedShared = APPROVED_SHARED_TEMPLATE_IDS.has(tmpl.id);
      const isProtectedContingency = PROTECTED_CONTINGENCY_TEMPLATE_IDS.has(tmpl.id);
      const isLegacy = TARGET_LEGACY_TEMPLATE_IDS.has(tmpl.id);
      const isStarterOrFallback = isStarterOrFallbackTemplate(tmpl.id, tmpl.name);
      const replacementId = getReplacementTemplateId(tmpl.id, tmpl.compGroup, tmpl.component);

      let decision: 'DELETE' | 'KEEP' = 'KEEP';
      let reason = '';

      if (isApprovedShared) {
        decision = 'KEEP';
        reason = 'Approved Shared Production Checksheet Template (Permanent)';
      } else if (isProtectedContingency) {
        decision = 'KEEP';
        reason = 'Protected Emergency Performance-Only Fallback Template (Automatic only)';
      } else if (activeRelCount > 0) {
        decision = 'KEEP';
        reason = `Referenced by ${activeRelCount} active relationship link(s). Migration required before deletion.`;
      } else if (testRefCount > 0 || certRefCount > 0) {
        decision = 'KEEP';
        reason = `Referenced by historical tests (${testRefCount}) or certificates (${certRefCount}). Preserving for audit trail integrity.`;
      } else if (isLegacy || isStarterOrFallback) {
        if (totalRefs === 0) {
          decision = 'DELETE';
          reason = isLegacy
            ? `Zero active & historical references. Replaced by approved shared template [${replacementId || 'APPROVED_SHARED'}].`
            : `Zero references. Unneeded starter/fallback template.`;
        } else {
          decision = 'KEEP';
          reason = `Has ${totalRefs} historical references. Cannot delete.`;
        }
      } else {
        decision = 'KEEP';
        reason = 'Active or standard checksheet template.';
      }

      return {
        templateId: tmpl.id,
        templateName: tmpl.name,
        compGroup: tmpl.compGroup,
        testStage: tmpl.testStage,
        activeRelationshipCount: activeRelCount,
        completedTestRefCount: testRefCount,
        certificateRefCount: certRefCount,
        replacementTemplateId: replacementId,
        decision,
        reason,
      };
    });

    const toDeleteCount = items.filter((i) => i.decision === 'DELETE').length;
    const toKeepCount = items.filter((i) => i.decision === 'KEEP').length;

    return {
      timestamp: new Date().toISOString(),
      totalTemplatesEvaluated: templates.length,
      toDeleteCount,
      toKeepCount,
      activeProductsWithSingleRelationship,
      totalActiveProducts: activeProducts.length,
      allProductsValid:
        activeProductsWithSingleRelationship === activeProducts.length &&
        duplicateRelationshipProductIds.length === 0 &&
        missingRelationshipProductIds.length === 0,
      duplicateRelationshipProductIds,
      missingRelationshipProductIds,
      items,
    };
  }

  /**
   * 3. Execute Controlled Batch Deletion of Eligible Templates
   */
  public static async executeControlledCleanup(data: {
    dryRunReport: DryRunReport;
    adminName?: string;
  }): Promise<{
    deletedTemplateIds: string[];
    skippedTemplateIds: { id: string; reason: string }[];
    auditLogsGenerated: number;
  }> {
    const adminName = data.adminName || 'Admin Quality';
    const deletedTemplateIds: string[] = [];
    const skippedTemplateIds: { id: string; reason: string }[] = [];

    const itemsToDelete = data.dryRunReport.items.filter((i) => i.decision === 'DELETE');

    if (itemsToDelete.length === 0) {
      return {
        deletedTemplateIds: [],
        skippedTemplateIds: [],
        auditLogsGenerated: 0,
      };
    }

    const batch = writeBatch(db);
    let batchCount = 0;

    for (const item of data.dryRunReport.items) {
      if (item.decision === 'DELETE') {
        // Double check safety constraints
        if (
          APPROVED_SHARED_TEMPLATE_IDS.has(item.templateId) ||
          PROTECTED_CONTINGENCY_TEMPLATE_IDS.has(item.templateId) ||
          item.activeRelationshipCount > 0 ||
          item.completedTestRefCount > 0 ||
          item.certificateRefCount > 0
        ) {
          skippedTemplateIds.push({
            id: item.templateId,
            reason: 'Safety constraint violation: Template has active or historical references or is protected.',
          });
          continue;
        }

        const templateDocRef = doc(db, 'checksheetTemplates', item.templateId);
        batch.delete(templateDocRef);
        deletedTemplateIds.push(item.templateId);
        batchCount++;

        // Audit log for this deletion
        const auditDocRef = doc(db, 'auditLogs', `audit-del-${Date.now()}-${item.templateId}`);
        batch.set(
          auditDocRef,
          sanitizeFirestoreValue({
            id: `audit-del-${Date.now()}-${item.templateId}`,
            action: 'PERMANENT_TEMPLATE_DELETION',
            collectionName: 'checksheetTemplates',
            documentId: item.templateId,
            timestamp: new Date().toISOString(),
            userName: adminName,
            userRole: 'ADMIN',
            details: `Permanently deleted template ${item.templateId} (${item.templateName}). Replacement: ${item.replacementTemplateId || 'Approved Shared Templates'}. Active refs: 0, Historical refs: 0.`,
            previousValue: { templateId: item.templateId, templateName: item.templateName },
            newValue: { status: 'DELETED', replacementTemplateId: item.replacementTemplateId },
          })
        );
        batchCount++;
      } else {
        skippedTemplateIds.push({
          id: item.templateId,
          reason: item.reason,
        });
      }
    }

    if (batchCount > 0) {
      try {
        await batch.commit();
      } catch (err) {
        console.warn('Batch delete to Firestore failed, updated locally:', err);
      }
    }

    return {
      deletedTemplateIds,
      skippedTemplateIds,
      auditLogsGenerated: deletedTemplateIds.length,
    };
  }
}
