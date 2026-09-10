import { ProductModel, ChecksheetTemplate, TestProcess } from '../types';
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
  testStage: TestProcess
): ChecksheetTemplate[] {
  const normProductComp = normalizeString(product.component);
  const normProductUnit = normalizeString(product.unitModel);

  return templates.filter((t) => {
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
}
