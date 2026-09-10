import { ProductModel, ChecksheetTemplate, TestProcess, TemplateRelationship } from '../types';
import { normalizeString } from './normalization';

export function findMatchingProduct(
  productModels: ProductModel[],
  componentName: string | undefined,
  unitModel: string | undefined
): ProductModel | null {
  const normalizedComponent = normalizeString(componentName);
  const normalizedUnit = normalizeString(unitModel);

  if (!normalizedComponent || !normalizedUnit) return null;

  // Try to find an active matching product model first
  const activeMatch = productModels.find(
    (m) =>
      m.active &&
      normalizeString(m.component) === normalizedComponent &&
      normalizeString(m.unitModel) === normalizedUnit
  );
  if (activeMatch) return activeMatch;

  // Fallback to any matching product model (even inactive)
  const anyMatch = productModels.find(
    (m) =>
      normalizeString(m.component) === normalizedComponent &&
      normalizeString(m.unitModel) === normalizedUnit
  );
  return anyMatch || null;
}

export function getCompatibleTemplates(
  templates: ChecksheetTemplate[],
  product: ProductModel,
  testStage: TestProcess,
  templateRelationships: TemplateRelationship[] = []
): ChecksheetTemplate[] {
  const normProductComp = normalizeString(product.component);
  const normProductUnit = normalizeString(product.unitModel);

  // 1. Try Explicit Relationship model first
  if (templateRelationships && templateRelationships.length > 0) {
    const matchedRel = templateRelationships.find((r) => {
      if (r.status !== 'ACTIVE') return false;
      const fp = r.finalProcess.toUpperCase();
      const ts = testStage.toUpperCase();
      const isStageMatch =
        fp === ts ||
        (ts === 'HYDRAULIC TEST' && fp === 'TESTBENCH') ||
        (ts === 'TESTBENCH' && fp === 'HYDRAULIC TEST');
      if (!isStageMatch) return false;

      // Exact product ID match
      if (r.productId === product.id) return true;

      // Component & Unit match
      const normRelComp = normalizeString(r.componentName);
      const normRelUnit = normalizeString(r.unitModel);
      return normRelComp === normProductComp && normRelUnit === normProductUnit;
    });

    if (matchedRel) {
      const template = templates.find((t) => t.id === matchedRel.templateId && t.status === 'ACTIVE');
      if (template) {
        return [template];
      }
    }
  }

  // 2. Direct exact or compatibility checks in existing templates
  const matched = templates.filter((t) => {
    // 4. The checksheet is active.
    if (t.status !== 'ACTIVE') return false;

    // 5. The checksheet belongs to the requested testing stage.
    const isStageMatch =
      t.testStage === testStage ||
      (testStage === 'Hydraulic Test' && t.testStage === 'Testbench') ||
      (testStage === 'Testbench' && t.testStage === 'Hydraulic Test');
    if (!isStageMatch) return false;

    // 6. Any existing product-group, component-group, or subgroup restrictions also match.
    if (t.compGroup && t.compGroup !== product.compGroup) return false;

    // Match compatibility:
    // Priority 1A: compatibleProductIds array direct link
    if (t.compatibleProductIds && t.compatibleProductIds.includes(product.id)) {
      return true;
    }

    // Priority 1: stable productMasterId
    if (t.productMasterId && t.productMasterId === product.id) {
      return true;
    }

    // Priority 2: exact component and unit model combination
    const normTemplateComp = normalizeString(t.component);
    const normTemplateUnit = normalizeString(t.unitModel);

    if (normTemplateComp === normProductComp && normTemplateUnit === normProductUnit) {
      return true;
    }

    // Legacy "ALL" check if there is an exact name match but unit model is 'ALL'
    if (normTemplateComp === normProductComp && (t.unitModel === 'ALL' || !t.unitModel)) {
      return true;
    }

    return false;
  });

  if (matched.length > 0) return matched;

  // 3. Contingency Matching
  // Look for any active contingency checksheet template matching this stage and component group
  const contingencyTemplates = templates.filter((t) => {
    if (t.status !== 'ACTIVE') return false;
    const isStageMatch =
      t.testStage === testStage ||
      (testStage === 'Hydraulic Test' && t.testStage === 'Testbench') ||
      (testStage === 'Testbench' && t.testStage === 'Hydraulic Test');
    if (!isStageMatch) return false;

    const isContingencyFlag = t.isContingency === true ||
      t.name.toLowerCase().includes('contingency') ||
      t.name.toLowerCase().includes('performance-only') ||
      t.name.toLowerCase().includes('performance only');

    return isContingencyFlag && t.compGroup === product.compGroup;
  });

  if (contingencyTemplates.length > 0) {
    return [contingencyTemplates[0]];
  }

  // Refuse to load any checksheet, fail loudly, block progression by returning empty
  return [];
}
