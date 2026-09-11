import { ALL_REQUIRED_PRODUCTS, getProductModelId } from './src/data/productMasterSeed';
import { getFifteenTemplates } from './src/data/fifteenTemplates';
import { INITIAL_TEMPLATE_RELATIONSHIPS } from './src/data/relationshipsMaster';
import { INITIAL_STANDARD_PROFILES } from './src/data/standardProfilesMaster';
import { resolveFinalTestTemplate, resolveGLTTemplate } from './src/utils/checksheetResolver';
import { initialProductModels } from './src/data/initialData';

console.log('=== RUNNING PRODUCTION CHECKSHEET ARCHITECTURE VALIDATION ===\n');

// 1. Check Product Count
console.log(`1. Total Authoritative Products: ${ALL_REQUIRED_PRODUCTS.length}`);
if (ALL_REQUIRED_PRODUCTS.length !== 169) {
  console.error(`FAIL: Expected 169 products, got ${ALL_REQUIRED_PRODUCTS.length}`);
  process.exit(1);
} else {
  console.log('  PASS: Exactly 169 authoritative products found.');
}

// 2. Check Relationships Count
console.log(`\n2. Initial Template Relationships Count: ${INITIAL_TEMPLATE_RELATIONSHIPS.length}`);
if (INITIAL_TEMPLATE_RELATIONSHIPS.length !== 169) {
  console.error(`FAIL: Expected 169 relationships, got ${INITIAL_TEMPLATE_RELATIONSHIPS.length}`);
  process.exit(1);
} else {
  console.log('  PASS: Exactly 169 template relationships configured.');
}

// 3. Check Templates
const templates = getFifteenTemplates(initialProductModels);
console.log(`\n3. Total Templates in Registry: ${templates.length}`);
const gltTemplates = templates.filter(t => t.testStage === 'GLT');
const finalTemplates = templates.filter(t => t.testStage !== 'GLT' && t.id !== 'tmpl-contingency-performance-only');
const contingencyTemplates = templates.filter(t => t.id === 'tmpl-contingency-performance-only');

console.log(`  - Universal GLT Templates: ${gltTemplates.length} (Expected: 2)`);
console.log(`  - Shared Final-Test Templates: ${finalTemplates.length} (Expected: 15)`);
console.log(`  - Contingency Template: ${contingencyTemplates.length} (Expected: 1)`);

if (gltTemplates.length !== 2 || finalTemplates.length !== 15 || contingencyTemplates.length !== 1) {
  console.error('FAIL: Template counts do not match specification.');
  process.exit(1);
} else {
  console.log('  PASS: Template registry structure matches specification.');
}

// 4. Test Resolution for each of 169 products
console.log('\n4. Resolving all 169 Authoritative Products...');
let resolvedCount = 0;
let contingencyCount = 0;
let missingCount = 0;
let gltEngineCount = 0;
let gltPtPpmCount = 0;
let gltCylinderExcludedCount = 0;

for (const prod of ALL_REQUIRED_PRODUCTS) {
  const pId = getProductModelId(prod);
  // Check Final Test Resolution
  const finalRes = resolveFinalTestTemplate({
    productId: pId,
    compGroup: prod.compGroup,
    unitModel: prod.unitModel,
    component: prod.component,
    templates,
    relationships: INITIAL_TEMPLATE_RELATIONSHIPS,
    standardProfiles: INITIAL_STANDARD_PROFILES,
  });

  if (finalRes.status === 'ACTIVE' && finalRes.template) {
    resolvedCount++;
  } else if (finalRes.status === 'CONTINGENCY') {
    contingencyCount++;
    console.error(`  FAIL CONTINGENCY: ${pId} (${prod.compGroup} / ${prod.unitModel} / ${prod.component}) fell back to contingency!`);
  } else {
    missingCount++;
    console.error(`  FAIL MISSING: ${pId} (${prod.compGroup} / ${prod.unitModel} / ${prod.component}) status: ${finalRes.status}`);
  }

  // Check GLT Resolution
  const gltRes = resolveGLTTemplate(templates, prod.compGroup);
  if (prod.compGroup === 'Engine') {
    if (gltRes.status === 'ACTIVE' && (gltRes.template?.id === 'GLT_ENGINE_UNIVERSAL' || gltRes.template?.id === 'tmpl-glt-engine-v2')) {
      gltEngineCount++;
    } else {
      console.error(`  FAIL GLT ENGINE: ${pId}`);
    }
  } else if (prod.compGroup === 'PT-PPM') {
    if (gltRes.status === 'ACTIVE' && (gltRes.template?.id === 'GLT_PT_PPM_UNIVERSAL' || gltRes.template?.id === 'tmpl-glt-pt-ppm-v2')) {
      gltPtPpmCount++;
    } else {
      console.error(`  FAIL GLT PT-PPM: ${pId}`);
    }
  } else if (prod.compGroup === 'Cylinder') {
    if (gltRes.status === 'NOT_APPLICABLE') {
      gltCylinderExcludedCount++;
    } else {
      console.error(`  FAIL GLT CYLINDER: ${pId} was not excluded from GLT!`);
    }
  }
}

console.log(`\nResults:`);
console.log(`  - Active Final-Test Resolved: ${resolvedCount} / 169`);
console.log(`  - Contingency Count: ${contingencyCount} (Must be 0 for authoritative master)`);
console.log(`  - Missing Count: ${missingCount} (Must be 0)`);
console.log(`  - Engine GLT Universal Matches: ${gltEngineCount}`);
console.log(`  - PT-PPM GLT Universal Matches: ${gltPtPpmCount}`);
console.log(`  - Cylinder GLT Exclusions: ${gltCylinderExcludedCount}`);

if (resolvedCount === 169 && contingencyCount === 0 && missingCount === 0) {
  console.log('\n=== ALL 169 PRODUCTS SUCCESSFULLY VALIDATED (100% PRODUCTION READY) ===');
} else {
  console.error('\n=== VALIDATION FAILED ===');
  process.exit(1);
}
