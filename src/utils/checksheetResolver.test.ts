import {
  resolveFinalTestTemplate,
  resolveGLTTemplate,
  findContingencyTemplate,
  getCompatibleTemplates,
  createChecksheetSnapshot,
} from './checksheetResolver';
import { ChecksheetTemplate, FinalTestTemplateRelationship, ChecksheetStandardProfile, ProductModel } from '../types';

// Mock active templates for testing
const mockTemplates: ChecksheetTemplate[] = [
  {
    id: 'tmpl-glt-engine-v2',
    name: 'GLT Engine Universal Inspection',
    compGroup: 'Engine',
    unitModel: 'ALL',
    component: 'ALL',
    testStage: 'GLT',
    revision: 1,
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec-glt-eng',
        name: 'GLT Engine Inspection',
        displayOrder: 1,
        items: [{ id: 'item-glt-eng-leak', itemName: 'Leakage Check', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 1, mandatory: true, active: true }],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-glt-pt-ppm-v2',
    name: 'GLT PT-PPM Universal Inspection',
    compGroup: 'PT-PPM',
    unitModel: 'ALL',
    component: 'ALL',
    testStage: 'GLT',
    revision: 1,
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec-glt-pt',
        name: 'GLT PT-PPM Inspection',
        displayOrder: 1,
        items: [{ id: 'item-glt-pt-leak', itemName: 'Leakage Check', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 1, mandatory: true, active: true }],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-eng-dyno-v1',
    name: 'Engine Dynotest',
    compGroup: 'Engine',
    unitModel: 'D155A-6R',
    component: 'ENGINE ASSY',
    testStage: 'Dynotest',
    revision: 1,
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec-eng-dyno',
        name: 'Engine Performance',
        displayOrder: 1,
        items: [
          { id: 'item-eng-power', itemName: 'Power Output', inputType: 'NUMERIC', unit: 'kW', validation: 'MINIMUM', minimumValue: 200, displayOrder: 1, mandatory: true, active: true },
          { id: 'item-eng-torque', itemName: 'Rated Torque', inputType: 'NUMERIC', unit: 'Nm', validation: 'MINIMUM', minimumValue: 1200, displayOrder: 2, mandatory: true, active: true },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-pto-testbench-v2',
    name: 'PTO Testbench',
    compGroup: 'PT-PPM',
    unitModel: 'HD785-7',
    component: 'POWER TAKE OFF',
    testStage: 'Hydraulic Test',
    revision: 1,
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec-pto',
        name: 'PTO Function Check',
        displayOrder: 1,
        items: [{ id: 'item-pto-temp', itemName: 'Bearing Temp', inputType: 'NUMERIC', unit: '°C', validation: 'MAXIMUM', maximumValue: 85, displayOrder: 1, mandatory: true, active: true }],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-pump-testbench-v2',
    name: 'Hydraulic Pump Testbench',
    compGroup: 'PT-PPM',
    unitModel: 'PC200-8',
    component: 'MAIN PUMP',
    testStage: 'Hydraulic Test',
    revision: 1,
    status: 'ACTIVE',
    sections: [
      {
        id: 'sec-pump',
        name: 'Pump Discharge Performance',
        displayOrder: 1,
        items: [{ id: 'item-pump-press', itemName: 'Discharge Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 30, maximumValue: 38, displayOrder: 1, mandatory: true, active: true }],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'tmpl-torque-converter-performance-v1',
    name: 'One Performance checking point: GOOD / NOT GOOD',
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
          { id: 'item-controlled-performance', itemName: 'Performance', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const mockStandardProfiles: ChecksheetStandardProfile[] = [
  {
    standardProfileId: 'prof-pump-pc200-8',
    profileId: 'prof-pump-pc200-8',
    name: 'Main Pump PC200-8 Standard Profile',
    templateId: 'tmpl-pump-testbench-v2',
    componentFamily: 'PUMP',
    unitModel: 'PC200-8',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    checkingPointStandards: [
      {
        itemId: 'item-pump-press',
        itemName: 'Discharge Pressure',
        unit: 'MPa',
        validationType: 'RANGE',
        minimumValue: 32,
        maximumValue: 37.5,
        targetValue: 35,
        mandatory: true,
      },
    ],
  },
];

describe('Checksheet Resolver Logic', () => {
  // Test 1: EXACT ACTIVE RELATIONSHIP
  test('1. Exact active Product ID relationship loads that relationship’s template with standard profile', () => {
    const relationships: FinalTestTemplateRelationship[] = [
      {
        relationshipId: 'rel-pump-pc200-8',
        productId: 'pm-ptppm-ppm-pc2008-mainpump',
        compGroup: 'PT-PPM',
        unitModel: 'PC200-8',
        component: 'MAIN PUMP',
        componentName: 'MAIN PUMP',
        productGroup: 'PT-PPM',
        finalProcess: 'TESTBENCH',
        templateId: 'tmpl-pump-testbench-v2',
        standardProfileId: 'prof-pump-pc200-8',
        compatibleLineIds: ['tb-1'],
        relationshipMode: 'STANDARD',
        status: 'ACTIVE',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = resolveFinalTestTemplate({
      productId: 'pm-ptppm-ppm-pc2008-mainpump',
      compGroup: 'PT-PPM',
      unitModel: 'PC200-8',
      component: 'MAIN PUMP',
      finalProcess: 'TESTBENCH',
      templates: mockTemplates,
      relationships,
      standardProfiles: mockStandardProfiles,
    });

    if (result.status !== 'ACTIVE') throw new Error(`Expected status ACTIVE, got ${result.status}`);
    if (!result.template || result.template.id !== 'tmpl-pump-testbench-v2') {
      throw new Error(`Expected template tmpl-pump-testbench-v2, got ${result.template?.id}`);
    }
    if (!result.mergedTemplate) throw new Error('Expected mergedTemplate to be present');
    if (result.isPerformanceOnly !== false) throw new Error('Expected isPerformanceOnly to be false');
    
    // Check standard profile merge
    const mergedItem = result.mergedTemplate.sections[0].items[0];
    if (mergedItem.minimumValue !== 32 || mergedItem.maximumValue !== 37.5) {
      throw new Error(`Expected merged standards 32..37.5, got min=${mergedItem.minimumValue}, max=${mergedItem.maximumValue}`);
    }
  });

  // Test 2: ZERO EXACT RELATIONSHIPS (MISSING / UNCONFIGURED)
  test('2. Zero exact relationships loads Performance Only fallback and NEVER defaults to PTO or first template', () => {
    const relationships: FinalTestTemplateRelationship[] = []; // No relationships

    const result = resolveFinalTestTemplate({
      productId: 'pm-ptppm-unconfigured-component',
      compGroup: 'PT-PPM',
      unitModel: 'WA470-6',
      component: 'TRANSMISSION',
      finalProcess: 'TESTBENCH',
      templates: mockTemplates,
      relationships,
      standardProfiles: mockStandardProfiles,
    });

    if (result.status !== 'CONTINGENCY') throw new Error(`Expected status CONTINGENCY, got ${result.status}`);
    if (!result.template || (result.template.id !== 'tmpl-torque-converter-performance-v1' && result.template.id !== 'tmpl-controlled-performance-only')) {
      throw new Error(`Expected Performance Only template fallback, got ${result.template?.id}`);
    }
    // Strict verification: Must NEVER load PTO template or another component's template
    if (result.template.id === ('tmpl-pto-testbench-v2' as string)) {
      throw new Error('FAILED: Resolver defaulted to PTO template!');
    }
    // Strict verification: Must NOT load first template in list
    if (result.template.id === mockTemplates[0].id) {
      throw new Error('FAILED: Resolver picked the first active template!');
    }
    if (result.isPerformanceOnly !== true) throw new Error('Expected isPerformanceOnly to be true');
    if (!result.contingencyReason) throw new Error('Expected contingencyReason to be populated');
  });

  // Test 3: DUPLICATE ACTIVE RELATIONSHIPS
  test('3. More than one active relationship returns DUPLICATE RELATIONSHIP error and selects NO template automatically', () => {
    const relationships: FinalTestTemplateRelationship[] = [
      {
        relationshipId: 'rel-duplicate-1',
        productId: 'pm-ptppm-duplicate-item',
        compGroup: 'PT-PPM',
        unitModel: 'PC200-8',
        component: 'MAIN PUMP',
        componentName: 'MAIN PUMP',
        productGroup: 'PT-PPM',
        finalProcess: 'TESTBENCH',
        templateId: 'tmpl-pump-testbench-v2',
        standardProfileId: 'prof-pump-pc200-8',
        compatibleLineIds: ['tb-1'],
        relationshipMode: 'STANDARD',
        status: 'ACTIVE',
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        relationshipId: 'rel-duplicate-2',
        productId: 'pm-ptppm-duplicate-item',
        compGroup: 'PT-PPM',
        unitModel: 'PC200-8',
        component: 'MAIN PUMP',
        componentName: 'MAIN PUMP',
        productGroup: 'PT-PPM',
        finalProcess: 'TESTBENCH',
        templateId: 'tmpl-torque-converter-performance-v1',
        standardProfileId: 'prof-pump-pc200-8',
        compatibleLineIds: ['tb-1'],
        relationshipMode: 'PERFORMANCE_ONLY',
        status: 'ACTIVE',
        version: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const result = resolveFinalTestTemplate({
      productId: 'pm-ptppm-duplicate-item',
      compGroup: 'PT-PPM',
      unitModel: 'PC200-8',
      component: 'MAIN PUMP',
      finalProcess: 'TESTBENCH',
      templates: mockTemplates,
      relationships,
      standardProfiles: mockStandardProfiles,
    });

    if (result.status !== 'ERROR') throw new Error(`Expected status ERROR, got ${result.status}`);
    if (result.template !== null) throw new Error(`Expected template null, got ${result.template}`);
    if (result.mergedTemplate !== null) throw new Error(`Expected mergedTemplate null, got ${result.mergedTemplate}`);
    if (!result.failureReason?.includes('DUPLICATE RELATIONSHIP')) {
      throw new Error(`Expected failureReason to mention DUPLICATE RELATIONSHIP, got ${result.failureReason}`);
    }

    // Verify helper getCompatibleTemplates also returns empty array
    const product: ProductModel = {
      id: 'pm-ptppm-duplicate-item',
      compGroup: 'PT-PPM',
      unitModel: 'PC200-8',
      component: 'MAIN PUMP',
      modelName: 'PC200-8 MAIN PUMP',
      active: true,
      standardTestDurationMinutes: 120,
    };
    const compatibles = getCompatibleTemplates(mockTemplates, product, 'Hydraulic Test', relationships, mockStandardProfiles);
    if (compatibles.length !== 0) {
      throw new Error(`Expected 0 compatible templates for duplicate relationship, got ${compatibles.length}`);
    }
  });

  // Test 4: GLT RESOLUTION RULES
  test('4. GLT Universal resolution for Engine, PT-PPM and Cylinder exclusion', () => {
    const engineGLT = resolveGLTTemplate(mockTemplates, 'Engine');
    if (engineGLT.status !== 'ACTIVE' || engineGLT.template?.id !== 'tmpl-glt-engine-v2') {
      throw new Error('GLT Engine resolution failed');
    }

    const ptppmGLT = resolveGLTTemplate(mockTemplates, 'PT-PPM');
    if (ptppmGLT.status !== 'ACTIVE' || ptppmGLT.template?.id !== 'tmpl-glt-pt-ppm-v2') {
      throw new Error('GLT PT-PPM resolution failed');
    }

    const cylGLT = resolveGLTTemplate(mockTemplates, 'Cylinder');
    if (cylGLT.status !== 'NOT_APPLICABLE' || cylGLT.template !== null) {
      throw new Error('GLT Cylinder should be NOT_APPLICABLE');
    }
  });
});

function describe(name: string, fn: () => void) {
  console.log(`\n=== TEST SUITE: ${name} ===`);
  fn();
}

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
  } catch (err: any) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
    process.exit(1);
  }
}
