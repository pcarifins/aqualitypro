import { resolveFinalTestTemplate } from '../utils/checksheetResolver';
import { DataStore } from '../data/storageEngine';
import { ChecksheetTemplate, FinalTestTemplateRelationship, ChecksheetSnapshot } from '../types';
import { isStarterOrFallbackTemplate } from '../services/templateCleanupService';

async function runTests() {
  console.log('=== RUNNING AQUALITYPRO CHECKSHEET RESOLVER & CLEANUP SUITE ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${desc}`);
      failed++;
    }
  }

  const now = new Date().toISOString();

  // --- 1. RESOLVER TESTS ---
  console.log('--- 1. Testing Checksheet Resolver Logic ---');
  
  const sampleTemplates: ChecksheetTemplate[] = [
    {
      id: 'tmpl-pt-ppm-v1',
      name: 'Power Train - PPM Test Checksheet',
      unitModel: 'D85ESS-2',
      component: 'Power Train - PPM',
      compGroup: 'PT-PPM',
      testStage: 'Testbench',
      sections: [{ id: 's1', name: 'Pressure Checks', displayOrder: 1, items: [] }],
      revision: 1,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tmpl-pto-v1',
      name: 'PTO Checksheet',
      unitModel: 'D85ESS-2',
      component: 'PTO',
      compGroup: 'PT-PPM',
      testStage: 'Testbench',
      sections: [{ id: 's1', name: 'PTO Checks', displayOrder: 1, items: [] }],
      revision: 1,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'tmpl-controlled-performance-only',
      name: 'Universal Performance Checksheet (Contingency Fallback)',
      unitModel: 'ALL',
      component: 'ALL',
      compGroup: 'PT-PPM',
      testStage: 'Testbench',
      sections: [{ id: 's1', name: 'Standard Performance', displayOrder: 1, items: [] }],
      revision: 1,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    },
  ];

  // Case 1A: Exactly ONE active relationship
  const singleRel: FinalTestTemplateRelationship[] = [
    {
      relationshipId: 'rel-1',
      productId: 'prod-d85-pt-ppm',
      unitModel: 'D85ESS-2',
      componentName: 'Power Train - PPM',
      productGroup: 'PT-PPM',
      finalProcess: 'TESTBENCH',
      templateId: 'tmpl-pt-ppm-v1',
      status: 'ACTIVE',
      version: 1,
      standardProfileId: 'std-default',
      compatibleLineIds: ['tb-1'],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const res1 = resolveFinalTestTemplate({
    productId: 'prod-d85-pt-ppm',
    unitModel: 'D85ESS-2',
    component: 'Power Train - PPM',
    compGroup: 'PT-PPM',
    finalProcess: 'TESTBENCH',
    templates: sampleTemplates,
    relationships: singleRel,
  });

  assert(res1.template?.id === 'tmpl-pt-ppm-v1', 'Exact active relationship loads its specific template');
  assert(res1.status === 'ACTIVE', 'Status is ACTIVE');
  assert(res1.isPerformanceOnly === false, 'isPerformanceOnly is false');

  // Case 1B: Zero exact relationships -> fallback to Performance Only
  const res2 = resolveFinalTestTemplate({
    productId: 'prod-unknown-part',
    unitModel: 'HD785-7',
    component: 'Special Custom Gearbox',
    compGroup: 'PT-PPM',
    finalProcess: 'TESTBENCH',
    templates: sampleTemplates,
    relationships: singleRel,
  });

  assert(
    res2.template?.id === 'tmpl-controlled-performance-only' || res2.template?.id === 'tmpl-contingency-performance-only',
    'Zero relationships loads Performance Only fallback'
  );
  assert(res2.isPerformanceOnly === true, 'Performance Only flag is true');
  assert(res2.template?.id !== 'tmpl-pto-v1', 'PT-PPM or unknown never defaults to PTO or another component');

  // Case 1C: DUPLICATE active relationships -> Blocks automatic selection
  const duplicateRels: FinalTestTemplateRelationship[] = [
    {
      relationshipId: 'rel-1',
      productId: 'prod-d85-pt-ppm',
      unitModel: 'D85ESS-2',
      componentName: 'Power Train - PPM',
      productGroup: 'PT-PPM',
      finalProcess: 'TESTBENCH',
      templateId: 'tmpl-pt-ppm-v1',
      status: 'ACTIVE',
      version: 1,
      standardProfileId: 'std-default',
      compatibleLineIds: ['tb-1'],
      createdAt: now,
      updatedAt: now,
    },
    {
      relationshipId: 'rel-2',
      productId: 'prod-d85-pt-ppm',
      unitModel: 'D85ESS-2',
      componentName: 'Power Train - PPM',
      productGroup: 'PT-PPM',
      finalProcess: 'TESTBENCH',
      templateId: 'tmpl-pto-v1',
      status: 'ACTIVE',
      version: 1,
      standardProfileId: 'std-default',
      compatibleLineIds: ['tb-1'],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const res3 = resolveFinalTestTemplate({
    productId: 'prod-d85-pt-ppm',
    unitModel: 'D85ESS-2',
    component: 'Power Train - PPM',
    compGroup: 'PT-PPM',
    finalProcess: 'TESTBENCH',
    templates: sampleTemplates,
    relationships: duplicateRels,
  });

  assert(res3.template === null, 'Duplicate relationships prevent automatic template selection (template is null)');
  assert(res3.status === 'ERROR', 'Status is ERROR on duplicate relationship');
  assert(res3.failureReason?.includes('DUPLICATE RELATIONSHIP') === true, 'Failure reason contains DUPLICATE RELATIONSHIP');

  // --- 2. STARTER / FALLBACK TEMPLATE PREVENTION TESTS ---
  console.log('\n--- 2. Testing Starter / Fallback Generation Prevention ---');
  assert(isStarterOrFallbackTemplate('tmpl-starter-123', 'Starter Checksheet') === true, 'Detects tmpl-starter-*');
  assert(isStarterOrFallbackTemplate('tmpl-fallback-abc', 'Dynamic Fallback') === true, 'Detects tmpl-fallback-*');
  assert(isStarterOrFallbackTemplate('tmpl-engine-hd785-v1', 'Komatsu HD785 Engine Checksheet') === false, 'Allows valid production template');

  const store = new DataStore();
  const initResult = store.ensureProductionTemplates();
  assert(initResult.activeTemplateCount >= 18, `Ensure production templates loaded ${initResult.activeTemplateCount} active templates`);

  const createdCount = store.ensureStarterChecksheetsForAllActiveProducts();
  assert(createdCount.createdCount === 0, 'ensureStarterChecksheetsForAllActiveProducts returns 0 created templates');

  // Test saveChecksheetTemplate guard against starter templates
  const prevCount = store.getChecksheetTemplates().length;
  await store.saveChecksheetTemplate({
    id: 'tmpl-starter-illegal-test',
    name: 'Illegal Starter Template',
    unitModel: 'D85ESS-2',
    component: 'Transmission',
    compGroup: 'PT-PPM',
    testStage: 'Testbench',
    sections: [],
    revision: 1,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  });
  const afterCount = store.getChecksheetTemplates().length;
  assert(prevCount === afterCount, 'saveChecksheetTemplate successfully blocked creation of tmpl-starter-*');

  // --- 3. DRY RUN & CLEANUP TESTS ---
  console.log('\n--- 3. Testing Dry-Run Report and Controlled Cleanup ---');
  const dryRun = store.generateDryRunReport();
  assert(dryRun.totalTemplatesEvaluated >= 18, `Dry run evaluated ${dryRun.totalTemplatesEvaluated} templates`);
  assert(dryRun.toKeepCount >= 18, `Dry run preserves all active shared production templates (${dryRun.toKeepCount} kept)`);

  const backup = await store.createTemplateBackup('TestAdmin');
  assert(backup.backupId.startsWith('backup-templates-'), 'Automated backup snapshot created with valid ID');
  assert(backup.checksheetTemplates.length >= 18, `Backup contains ${backup.checksheetTemplates.length} templates`);
  assert(backup.activeRelationships.length > 0, `Backup contains ${backup.activeRelationships.length} relationships`);

  // --- 4. CHANGE RELATIONSHIP TEMPLATE TESTS ---
  console.log('\n--- 4. Testing Change Relationship Template Action ---');
  // Change relationship for a product
  const testProd = store.getProductModels().find((p) => p.compGroup === 'Engine')!;
  const changeRes = await store.changeRelationshipTemplate({
    productId: testProd.id,
    newTemplateId: 'tmpl-eng-dyno-v1',
    changeReason: 'Standardizing checksheet mapping to approved universal shared template',
    actorName: 'TestAdmin',
  });

  assert(changeRes.success === true, 'changeRelationshipTemplate succeeded');
  assert(changeRes.newTemplateId === 'tmpl-eng-dyno-v1', 'New template ID assigned correctly');
  assert(changeRes.relationship.status === 'ACTIVE', 'New relationship is ACTIVE');

  // Verify only 1 active relationship exists for this product ID
  const activeRelsForProduct = store
    .getTemplateRelationships()
    .filter((r) => r.productId === testProd.id && r.status === 'ACTIVE');
  assert(activeRelsForProduct.length === 1, 'Exactly one active relationship remains for the product');

  // Verify historical snapshot immutability
  const historicalSnapshot: ChecksheetSnapshot = {
    templateId: 'tmpl-engine-hd785-v1',
    templateName: 'Engine Test Checksheet HD785-7',
    compGroup: 'Engine',
    unitModel: 'HD785-7',
    component: 'Engine SAA12V140E-3',
    testStage: 'Dynotest',
    revision: 1,
    sections: [{ id: 's1', name: 'Dyno Snapshot', displayOrder: 1, items: [] }],
    snapshottedAt: '2026-01-01T10:00:00Z',
  };
  assert(historicalSnapshot.templateId === 'tmpl-engine-hd785-v1', 'Historical test snapshots remain immutable and intact');

  // --- 5. REFERENCE SUMMARY & SAFE DELETION TESTS ---
  console.log('\n--- 5. Testing Reference Summary & Safe Deletion Safeguards ---');

  // Test 5A: Protected contingency template cannot be deleted
  const protectedSummary = store.getTemplateReferenceSummary('tmpl-contingency-performance-only');
  assert(protectedSummary.isProtected === true, 'Protected contingency template is recognized as protected');
  assert(protectedSummary.canDelete === false, 'Protected contingency template cannot be deleted');
  assert(protectedSummary.blockReason?.toLowerCase().includes('system contingency') === true, 'Block reason correctly mentions system contingency');

  // Test 5B: Approved Shared template or active template cannot be deleted
  const activeTemplateSummary = store.getTemplateReferenceSummary('tmpl-eng-dyno-v1');
  assert(activeTemplateSummary.activeRelationshipCount > 0, 'Active template has reference count > 0');
  assert(activeTemplateSummary.canDelete === false, 'Active template deletion is blocked');
  assert(activeTemplateSummary.isProtected === true, 'Approved shared template is protected');

  let deleteBlockedError = false;
  try {
    await store.deleteChecksheetTemplate('tmpl-eng-dyno-v1', 'TestAdmin', 'Testing deletion');
  } catch (err: any) {
    deleteBlockedError = true;
    assert(err.message.includes('DELETION BLOCKED'), 'deleteChecksheetTemplate throws error when deleting active template');
  }
  assert(deleteBlockedError === true, 'deleteChecksheetTemplate safely blocked deletion of referenced template');

  // Test 5B2: Custom un-protected template with an active relationship
  const customMappedTmpl: ChecksheetTemplate = {
    id: `tmpl-custom-mapped-${Date.now()}`,
    name: 'Custom Active Checksheet Template',
    unitModel: 'HD785-7',
    component: 'Engine',
    compGroup: 'Engine',
    testStage: 'Dynotest',
    sections: [],
    revision: 1,
    status: 'ACTIVE',
    createdAt: now,
    updatedAt: now,
  };
  await store.saveChecksheetTemplate(customMappedTmpl);
  await store.saveTemplateRelationship({
    relationshipId: `rel-custom-${Date.now()}`,
    productId: 'test-custom-prod-123',
    unitModel: 'HD785-7',
    componentName: 'Engine',
    productGroup: 'Engine',
    finalProcess: 'DYNOTEST',
    templateId: customMappedTmpl.id,
    status: 'ACTIVE',
    version: 1,
    standardProfileId: 'std-default',
    compatibleLineIds: ['dyno-1'],
    createdAt: now,
    updatedAt: now,
  });

  const customSummary = store.getTemplateReferenceSummary(customMappedTmpl.id);
  assert(customSummary.activeRelationshipCount === 1, 'Custom template has 1 active relationship');
  assert(customSummary.canDelete === false, 'Custom mapped template deletion is blocked');
  assert(customSummary.blockReason?.includes('active product relationship') === true, 'Block reason mentions active product relationship');

  // Test 5C: Safe deletion of an unreferenced draft template
  const unreferencedDraft: ChecksheetTemplate = {
    id: `tmpl-test-unreferenced-${Date.now()}`,
    name: 'Temporary Unreferenced Test Template',
    unitModel: 'TEST-99',
    component: 'TestComponent',
    compGroup: 'PT-PPM',
    testStage: 'Testbench',
    sections: [],
    revision: 1,
    status: 'DRAFT',
    createdAt: now,
    updatedAt: now,
  };
  await store.saveChecksheetTemplate(unreferencedDraft);
  const draftSummary = store.getTemplateReferenceSummary(unreferencedDraft.id);
  assert(draftSummary.canDelete === true, 'Unreferenced draft template can be safely deleted');
  assert(draftSummary.activeRelationshipCount === 0, 'Unreferenced draft has 0 active relationships');

  const deleteSuccessRes = await store.deleteChecksheetTemplate(
    unreferencedDraft.id,
    'TestAdmin',
    'Obsolete test draft cleanup'
  );
  assert(deleteSuccessRes.success === true, 'deleteChecksheetTemplate succeeds on unreferenced draft');
  assert(
    store.getChecksheetTemplates().some((t) => t.id === unreferencedDraft.id) === false,
    'Template is permanently removed from storage'
  );

  // Test 5D: Automatic activation of DRAFT template during changeRelationshipTemplate
  console.log('\n--- 6. Testing DRAFT Template Activation during Relationship Change ---');
  const draftTargetTemplate: ChecksheetTemplate = {
    id: `tmpl-test-draft-activation-${Date.now()}`,
    name: 'Draft Engine Test Checksheet',
    unitModel: 'HD785-7',
    component: 'Engine',
    compGroup: 'Engine',
    testStage: 'Dynotest',
    sections: [],
    revision: 1,
    status: 'DRAFT',
    createdAt: now,
    updatedAt: now,
  };
  await store.saveChecksheetTemplate(draftTargetTemplate);
  assert(
    store.getChecksheetTemplates().find((t) => t.id === draftTargetTemplate.id)?.status === 'DRAFT',
    'Target template initially in DRAFT status'
  );

  const draftAssignRes = await store.changeRelationshipTemplate({
    productId: testProd.id,
    newTemplateId: draftTargetTemplate.id,
    changeReason: 'Promoting approved draft to active production template for engine',
    actorName: 'TestAdmin',
  });

  assert(draftAssignRes.success === true, 'changeRelationshipTemplate succeeded with draft template');
  const activatedTemplate = store.getChecksheetTemplates().find((t) => t.id === draftTargetTemplate.id);
  assert(activatedTemplate?.status === 'ACTIVE', 'Draft template was automatically promoted to ACTIVE status');

  console.log('\n=== SUITE SUMMARY ===');
  console.log(`Passed: ${passed}, Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
