import { ProductModel, CompGroup } from '../types';
import { normalizeString } from './normalization';

export interface PPCCleansingResult {
  isMatch: boolean;
  productModelId: string | null;
  canonicalUnitModel: string;
  canonicalComponent: string;
  compGroup: CompGroup;
  cleansingRule:
    | 'EXACT_MATCH'
    | 'NO_NUMBER_STRIPPED'
    | 'MODEL_REVISION_ALIAS'
    | 'UNRESOLVED_ZERO_MATCH'
    | 'UNRESOLVED_MULTIPLE_MATCHES';
  action:
    | 'AUTO_CLEANSE_PRODUCT_IDENTITY'
    | 'LINK_PRODUCT_MASTER'
    | 'PPC_PRODUCT_MATCH_NOT_FOUND'
    | 'PPC_PRODUCT_MATCH_AMBIGUOUS';
  candidateCount: number;
}

export function stripNoSuffix(comp: string): string {
  if (!comp) return '';
  return comp
    .replace(/\bNO\b\.?\s*\d+/gi, '')
    .replace(/\bNO\d+\b/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

export function extractBaseModel(unitModel: string): string {
  if (!unitModel) return '';
  let model = unitModel.trim().toUpperCase();
  // Strip trailing revisions like -6R, -7R, -8R, -11R, R1, M0 if needed when matching base
  model = model.replace(/([A-Z0-9]+-\d+)[R|M][0-9R]*/g, '$1');
  return model;
}

export function cleansePPCProductData(
  rawUnitModel: string,
  rawComponent: string,
  compGroup: CompGroup | string,
  productModels: ProductModel[]
): PPCCleansingResult {
  const normRawUnit = (rawUnitModel || '').trim().toUpperCase();
  const normRawComp = (rawComponent || '').trim().toUpperCase();

  const activeModels = (productModels || []).filter((m) => m.active !== false);

  let candidates = activeModels;
  if (compGroup && compGroup !== 'ALL') {
    const groupMatches = activeModels.filter((m) => m.compGroup === compGroup);
    if (groupMatches.length > 0) candidates = groupMatches;
  }

  // STEP 1: Exact Normalized Match
  const exactMatches = candidates.filter((m) => {
    return (
      normalizeString(m.unitModel) === normalizeString(normRawUnit) &&
      normalizeString(m.component || m.compName) === normalizeString(normRawComp)
    );
  });

  if (exactMatches.length === 1) {
    const match = exactMatches[0];
    return {
      isMatch: true,
      productModelId: match.id,
      canonicalUnitModel: match.unitModel,
      canonicalComponent: match.component || match.compName || normRawComp,
      compGroup: match.compGroup,
      cleansingRule: 'EXACT_MATCH',
      action: 'AUTO_CLEANSE_PRODUCT_IDENTITY',
      candidateCount: 1,
    };
  }

  // STEP 2: Component NO. 1 / NO 1 / NO1 stripped match
  const strippedComp = stripNoSuffix(normRawComp);
  const strippedCompMatches = candidates.filter((m) => {
    const pmComp = stripNoSuffix(m.component || m.compName || '');
    return (
      normalizeString(m.unitModel) === normalizeString(normRawUnit) &&
      normalizeString(pmComp) === normalizeString(strippedComp)
    );
  });

  if (strippedCompMatches.length === 1) {
    const match = strippedCompMatches[0];
    return {
      isMatch: true,
      productModelId: match.id,
      canonicalUnitModel: match.unitModel,
      canonicalComponent: match.component || match.compName || strippedComp,
      compGroup: match.compGroup,
      cleansingRule: 'NO_NUMBER_STRIPPED',
      action: 'AUTO_CLEANSE_PRODUCT_IDENTITY',
      candidateCount: 1,
    };
  }

  // STEP 3: Model Revision / Technical Alias Adjustment (e.g. PC2000-8R -> PC2000-8)
  const baseUnitModel = extractBaseModel(normRawUnit);
  const aliasMatches = candidates.filter((m) => {
    const pmBaseModel = extractBaseModel(m.unitModel);
    const pmComp = stripNoSuffix(m.component || m.compName || '');
    return (
      (normalizeString(m.unitModel) === normalizeString(baseUnitModel) ||
        normalizeString(pmBaseModel) === normalizeString(baseUnitModel)) &&
      (normalizeString(pmComp) === normalizeString(strippedComp) ||
        normalizeString(m.component) === normalizeString(normRawComp))
    );
  });

  if (aliasMatches.length === 1) {
    const match = aliasMatches[0];
    return {
      isMatch: true,
      productModelId: match.id,
      canonicalUnitModel: match.unitModel,
      canonicalComponent: match.component || match.compName || strippedComp,
      compGroup: match.compGroup,
      cleansingRule: 'MODEL_REVISION_ALIAS',
      action: 'AUTO_CLEANSE_PRODUCT_IDENTITY',
      candidateCount: 1,
    };
  }

  if (aliasMatches.length > 1 || strippedCompMatches.length > 1 || exactMatches.length > 1) {
    const totalCount = Math.max(aliasMatches.length, strippedCompMatches.length, exactMatches.length);
    return {
      isMatch: false,
      productModelId: null,
      canonicalUnitModel: normRawUnit,
      canonicalComponent: normRawComp,
      compGroup: (compGroup as CompGroup) || 'Engine',
      cleansingRule: 'UNRESOLVED_MULTIPLE_MATCHES',
      action: 'PPC_PRODUCT_MATCH_AMBIGUOUS',
      candidateCount: totalCount,
    };
  }

  return {
    isMatch: false,
    productModelId: null,
    canonicalUnitModel: normRawUnit,
    canonicalComponent: normRawComp,
    compGroup: (compGroup as CompGroup) || 'Engine',
    cleansingRule: 'UNRESOLVED_ZERO_MATCH',
    action: 'PPC_PRODUCT_MATCH_NOT_FOUND',
    candidateCount: 0,
  };
}
