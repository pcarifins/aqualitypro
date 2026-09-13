import {
  ProductModel,
  ChecksheetTemplate,
  TestProcess,
  FinalTestTemplateRelationship,
  ChecksheetStandardProfile,
  ChecksheetSnapshot,
  ChecksheetSection,
  CompGroup,
} from '../types';
import { normalizeString } from './normalization';
import { ALL_REQUIRED_PRODUCTS, getProductModelId, ProductDefinition } from '../data/productMasterSeed';

export interface ResolutionResult {
  status: 'ACTIVE' | 'CONTINGENCY' | 'NOT_APPLICABLE' | 'MISSING_TEMPLATE' | 'ERROR';
  template: ChecksheetTemplate | null;
  mergedTemplate: ChecksheetTemplate | null;
  relationship: FinalTestTemplateRelationship | null;
  standardProfile: ChecksheetStandardProfile | null;
  isPerformanceOnly: boolean;
  contingencyReason?: string;
  failureReason?: string;
  compatibleLineIds?: string[];
}

/**
 * 1. GLT Template Resolution
 * Universal rules:
 * - Engine -> Universal GLT Engine template
 * - PT-PPM -> Universal GLT PT-PPM template
 * - Cylinder -> NOT_APPLICABLE (Cylinder is completely excluded from GLT)
 * - Prohibits PTO fallback, component name similarity, or first-template guessing
 */
export function resolveGLTTemplate(
  templates: ChecksheetTemplate[],
  compGroup?: string | CompGroup
): ResolutionResult {
  const normGroup = (compGroup || '').trim();

  if (normGroup === 'Cylinder') {
    return {
      status: 'NOT_APPLICABLE',
      template: null,
      mergedTemplate: null,
      relationship: null,
      standardProfile: null,
      isPerformanceOnly: false,
      contingencyReason: 'Cylinder is excluded from the GLT process and proceeds directly to Testbench.',
    };
  }

  if (normGroup === 'Engine') {
    const tmpl = templates.find(
      (t) =>
        t.status === 'ACTIVE' &&
        t.testStage === 'GLT' &&
        (t.id === 'tmpl-glt-engine-v2' ||
          t.id === 'GLT_ENGINE_UNIVERSAL' ||
          (t.compGroup === 'Engine' && (t.name.includes('GLT Engine') || t.name.includes('Engine Universal'))))
    );
    if (tmpl) {
      return {
        status: 'ACTIVE',
        template: tmpl,
        mergedTemplate: tmpl,
        relationship: null,
        standardProfile: null,
        isPerformanceOnly: false,
        compatibleLineIds: ['dyno-1', 'dyno-2', 'dyno-3'],
      };
    }
  }

  if (normGroup === 'PT-PPM') {
    const tmpl = templates.find(
      (t) =>
        t.status === 'ACTIVE' &&
        t.testStage === 'GLT' &&
        (t.id === 'tmpl-glt-pt-ppm-v2' ||
          t.id === 'GLT_PT_PPM_UNIVERSAL' ||
          (t.compGroup === 'PT-PPM' && (t.name.includes('GLT PT-PPM') || t.name.includes('PT-PPM Universal'))))
    );
    if (tmpl) {
      return {
        status: 'ACTIVE',
        template: tmpl,
        mergedTemplate: tmpl,
        relationship: null,
        standardProfile: null,
        isPerformanceOnly: false,
        compatibleLineIds: ['tb-1', 'tb-2', 'tb-3'],
      };
    }
  }

  return {
    status: 'MISSING_TEMPLATE',
    template: null,
    mergedTemplate: null,
    relationship: null,
    standardProfile: null,
    isPerformanceOnly: false,
    failureReason: `No active universal GLT template configured for component group: ${compGroup}`,
  };
}

/**
 * 2. Helper to merge ChecksheetTemplate items with ChecksheetStandardProfile values
 */
export function mergeTemplateWithStandardProfile(
  template: ChecksheetTemplate,
  profile: ChecksheetStandardProfile | null | undefined
): ChecksheetTemplate {
  if (!profile || !profile.checkingPointStandards || profile.checkingPointStandards.length === 0) {
    return template;
  }

  const standardsMap = new Map(profile.checkingPointStandards.map((s) => [s.itemId, s]));

  const mergedSections: ChecksheetSection[] = template.sections.map((section) => ({
    ...section,
    items: section.items.map((item) => {
      const std = standardsMap.get(item.id);
      if (!std) return item;

      return {
        ...item,
        unit: std.unit !== undefined ? std.unit : item.unit,
        validation: (std.validationType as any) || item.validation,
        minimumValue: std.minimumValue !== undefined ? std.minimumValue : item.minimumValue,
        maximumValue: std.maximumValue !== undefined ? std.maximumValue : item.maximumValue,
        targetValue: std.targetValue !== undefined ? (std.targetValue as any) : item.targetValue,
        toleranceValue: std.toleranceValue !== undefined ? (std.toleranceValue as any) : item.toleranceValue,
        mandatory: std.mandatory !== undefined ? std.mandatory : item.mandatory,
      };
    }),
  }));

  return {
    ...template,
    sections: mergedSections,
  };
}

/**
 * 3. Final-Test Resolution
 * Resolution sequence:
 * 1. Read Product ID from JO.
 * 2. Confirm authoritative Product Master record.
 * 3. Determine Dynotest or Testbench.
 * 4. Look up ACTIVE relationship for Product ID + Final Process.
 * 5. If found, load exact template and standard profile, merge values.
 * 6. If no active relationship found or template missing:
 *    - Trigger contingency mode with Performance-Only template.
 *    - Never substitute PTO or unrelated component.
 */
export function resolveFinalTestTemplate(params: {
  productId?: string;
  compGroup?: string | CompGroup;
  unitModel?: string;
  component?: string;
  finalProcess?: 'DYNOTEST' | 'TESTBENCH' | 'Dynotest' | 'Testbench' | 'Hydraulic Test';
  templates: ChecksheetTemplate[];
  relationships: FinalTestTemplateRelationship[];
  standardProfiles?: ChecksheetStandardProfile[];
}): ResolutionResult {
  const {
    productId,
    compGroup,
    unitModel,
    component,
    finalProcess,
    templates = [],
    relationships = [],
    standardProfiles = [],
  } = params;

  // 1. Determine process
  const rawProcess = finalProcess ? finalProcess.toUpperCase() : compGroup === 'Engine' ? 'DYNOTEST' : 'TESTBENCH';
  const targetProcess: 'DYNOTEST' | 'TESTBENCH' =
    rawProcess === 'DYNOTEST' || rawProcess === 'ENGINE' ? 'DYNOTEST' : 'TESTBENCH';

  // 2. Identify authoritative Product ID
  let targetProductId = productId;

  if (!targetProductId && (component || unitModel)) {
    const normComp = normalizeString(component);
    const normUnit = normalizeString(unitModel);
    const matchedAuth = ALL_REQUIRED_PRODUCTS.find(
      (p) => normalizeString(p.component) === normComp && normalizeString(p.unitModel) === normUnit
    );
    if (matchedAuth) {
      targetProductId = getProductModelId(matchedAuth);
    }
  }

  // 3. Lookup ACTIVE relationships (Check for exact Product ID + Process match)
  let activeRels: FinalTestTemplateRelationship[] = [];

  if (targetProductId && relationships && relationships.length > 0) {
    activeRels = relationships.filter(
      (r) =>
        r.status === 'ACTIVE' &&
        r.productId === targetProductId &&
        ((r.finalProcess && r.finalProcess.toUpperCase() === targetProcess) ||
         (r.testingProcess && r.testingProcess.toUpperCase() === targetProcess))
    );
  }

  // Behavior 3: More than one active relationship
  // → Show DUPLICATE RELATIONSHIP
  // → Do not select any template automatically
  if (activeRels.length > 1) {
    return {
      status: 'ERROR',
      template: null,
      mergedTemplate: null,
      relationship: null,
      standardProfile: null,
      isPerformanceOnly: false,
      contingencyReason: 'DUPLICATE RELATIONSHIP: More than one active final relationship exists for Product ID.',
      failureReason: `DUPLICATE RELATIONSHIP: Found ${activeRels.length} active relationships for Product ID [${targetProductId}] and process [${targetProcess}]. Exactly one relationship is permitted.`,
    };
  }

  // Behavior 1: One exact active Product ID relationship
  // → Load that relationship’s template
  if (activeRels.length === 1) {
    const activeRel = activeRels[0];
    const template = templates.find((t) => t.id === activeRel.templateId && t.status === 'ACTIVE');

    if (!template) {
      // Configured template missing or inactive: trigger contingency mode
      const contingencyTemplate = findContingencyTemplate(templates);
      return {
        status: 'CONTINGENCY',
        template: contingencyTemplate,
        mergedTemplate: contingencyTemplate,
        relationship: activeRel,
        standardProfile: null,
        isPerformanceOnly: true,
        contingencyReason: `Configured template [${activeRel.templateId}] is missing or inactive. Falling back to Performance-Only contingency mode.`,
        failureReason: `Template ${activeRel.templateId} not found in active templates.`,
        compatibleLineIds: activeRel.compatibleLineIds,
      };
    }

    const standardProfile =
      standardProfiles.find(
        (sp) => (sp.standardProfileId === activeRel.standardProfileId || sp.profileId === activeRel.standardProfileId) && sp.status === 'ACTIVE'
      ) || null;

    const mergedTemplate = mergeTemplateWithStandardProfile(template, standardProfile);

    const isMissingProfile =
      Boolean(activeRel.standardProfileId &&
      activeRel.standardProfileId !== 'std-default' &&
      !standardProfile &&
      activeRel.relationshipMode !== 'PERFORMANCE_ONLY' &&
      activeRel.templateId !== 'tmpl-controlled-performance-only' &&
      activeRel.templateId !== 'tmpl-contingency-performance-only' &&
      activeRel.templateId !== 'tmpl-torque-converter-performance-v1');

    const isPerformanceOnly =
      activeRel.relationshipMode === 'PERFORMANCE_ONLY' ||
      activeRel.templateId === 'tmpl-controlled-performance-only' ||
      activeRel.templateId === 'tmpl-contingency-performance-only' ||
      activeRel.templateId === 'tmpl-torque-converter-performance-v1' ||
      isMissingProfile;

    return {
      status: isMissingProfile ? 'CONTINGENCY' : 'ACTIVE',
      template,
      mergedTemplate: isMissingProfile ? findContingencyTemplate(templates) : mergedTemplate,
      relationship: activeRel,
      standardProfile,
      isPerformanceOnly,
      compatibleLineIds: activeRel.compatibleLineIds,
      contingencyReason: isMissingProfile 
        ? 'STANDARD PROFILE NOT CONFIGURED'
        : isPerformanceOnly
        ? 'Product is operating under Controlled Performance-Only checksheet (detailed standard profile pending validation).'
        : undefined,
    };
  }

  // Behavior 2: Zero exact relationships
  // → Load Performance Only fallback
  // → Never select first active template
  // → Never use another component’s template as fallback (e.g. PT-PPM must never default to PTO)
  const contingencyTemplate = findContingencyTemplate(templates);
  const failReason = targetProductId
    ? `No active final-test relationship configured for Product ID [${targetProductId}] and process [${targetProcess}].`
    : `Unconfigured product: Component [${component || 'UNKNOWN'}], Unit Model [${unitModel || 'UNKNOWN'}] has no active final-test relationship.`;

  return {
    status: 'CONTINGENCY',
    template: contingencyTemplate,
    mergedTemplate: contingencyTemplate,
    relationship: null,
    standardProfile: null,
    isPerformanceOnly: true,
    contingencyReason: `Product is not yet configured with an active final-test checksheet relationship. Running in Performance-Only contingency mode.`,
    failureReason: failReason,
    compatibleLineIds: targetProcess === 'DYNOTEST' ? ['dyno-1', 'dyno-2', 'dyno-3'] : ['tb-1', 'tb-2', 'tb-3'],
  };
}

/**
 * 4. Find contingency template
 */
export function findContingencyTemplate(templates: ChecksheetTemplate[] = []): ChecksheetTemplate {
  const list = templates || [];
  const found = list.find(
    (t) =>
      t.status === 'ACTIVE' &&
      (t.id === 'tmpl-controlled-performance-only' ||
        t.id === 'tmpl-contingency-performance-only' ||
        t.id === 'tmpl-torque-converter-performance-v1' ||
        t.name.toLowerCase().includes('contingency') ||
        t.name.toLowerCase().includes('performance-only') ||
        t.name.toLowerCase().includes('performance only'))
  );

  if (found) return found;

  // Fallback minimal performance-only template (never another component's template like PTO)
  return {
    id: 'tmpl-controlled-performance-only',
    name: 'Controlled Performance Only',
    compGroup: 'PT-PPM',
    unitModel: 'ALL',
    component: 'ALL',
    testStage: 'Hydraulic Test',
    revision: 1,
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec-controlled-perf',
        name: 'Performance Evaluation',
        displayOrder: 1,
        items: [
          {
            id: 'item-controlled-performance',
            itemName: 'Performance',
            inputType: 'GOOD / NOT GOOD',
            validation: 'NONE',
            displayOrder: 1,
            mandatory: true,
            active: true,
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 5. Create immutable ChecksheetSnapshot
 */
export function createChecksheetSnapshot(
  template: ChecksheetTemplate,
  relationship?: FinalTestTemplateRelationship | null,
  standardProfile?: ChecksheetStandardProfile | null,
  productInfo?: { compGroup?: string; unitModel?: string; component?: string; testStage?: TestProcess }
): ChecksheetSnapshot {
  const compGroup = productInfo?.compGroup || template.compGroup || 'PT-PPM';
  const unitModel = productInfo?.unitModel || template.unitModel || 'ALL';
  const component = productInfo?.component || template.component || 'ALL';
  const testStage = productInfo?.testStage || template.testStage || 'Hydraulic Test';

  const standardValues: Record<string, any> = {};
  if (standardProfile?.checkingPointStandards) {
    for (const std of standardProfile.checkingPointStandards) {
      standardValues[std.itemId] = {
        unit: std.unit,
        validation: std.validationType,
        min: std.minimumValue,
        max: std.maximumValue,
        target: std.targetValue,
        tol: std.toleranceValue,
      };
    }
  }

  return {
    relationshipId: relationship?.relationshipId,
    relationshipVersion: relationship?.version,
    templateId: template.id,
    templateName: template.name,
    revision: template.revision,
    standardProfileId: standardProfile?.standardProfileId || standardProfile?.profileId,
    standardProfileRevision: standardProfile?.revision,
    compGroup,
    unitModel,
    component,
    testStage,
    sections: template.sections.map((sec) => ({
      id: sec.id,
      name: sec.name,
      displayOrder: sec.displayOrder,
      items: sec.items.map((it) => ({
        id: it.id,
        itemName: it.itemName,
        inputType: it.inputType,
        unit: it.unit,
        validation: it.validation,
        minimumValue: it.minimumValue,
        maximumValue: it.maximumValue,
        targetValue: it.targetValue,
        toleranceValue: it.toleranceValue,
        displayOrder: it.displayOrder,
        mandatory: it.mandatory,
      })),
    })),
    standardValues,
    calculationProfileVersion: standardProfile?.revision || 1,
    snapshottedAt: new Date().toISOString(),
  };
}

/**
 * Compatibility helper: findMatchingProduct
 */
export function findMatchingProduct(
  productModels: ProductModel[],
  componentName: string | undefined,
  unitModel: string | undefined
): ProductModel | null {
  const normalizedComponent = normalizeString(componentName);
  const normalizedUnit = normalizeString(unitModel);

  if (!normalizedComponent || !normalizedUnit) return null;

  const activeMatch = productModels.find(
    (m) =>
      m.active &&
      normalizeString(m.component) === normalizedComponent &&
      normalizeString(m.unitModel) === normalizedUnit
  );
  if (activeMatch) return activeMatch;

  const anyMatch = productModels.find(
    (m) =>
      normalizeString(m.component) === normalizedComponent &&
      normalizeString(m.unitModel) === normalizedUnit
  );
  return anyMatch || null;
}

/**
 * Compatibility helper: getCompatibleTemplates
 */
export function getCompatibleTemplates(
  templates: ChecksheetTemplate[],
  product: ProductModel,
  testStage: TestProcess,
  templateRelationships: FinalTestTemplateRelationship[] = [],
  standardProfiles: ChecksheetStandardProfile[] = []
): ChecksheetTemplate[] {
  if (testStage === 'GLT') {
    const gltRes = resolveGLTTemplate(templates, product.compGroup);
    return gltRes.mergedTemplate ? [gltRes.mergedTemplate] : [];
  }

  const finalProcess: 'DYNOTEST' | 'TESTBENCH' =
    testStage === 'Dynotest' || product.compGroup === 'Engine' ? 'DYNOTEST' : 'TESTBENCH';

  const res = resolveFinalTestTemplate({
    productId: product.id,
    compGroup: product.compGroup,
    unitModel: product.unitModel,
    component: product.component,
    finalProcess,
    templates,
    relationships: templateRelationships,
    standardProfiles,
  });

  if (res.mergedTemplate) {
    return [res.mergedTemplate];
  }

  return [];
}
