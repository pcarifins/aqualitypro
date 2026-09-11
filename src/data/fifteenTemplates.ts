import { ChecksheetTemplate, ProductModel, ChecksheetSection, TestProcess } from '../types';

export function getFifteenTemplates(allProducts: ProductModel[]): ChecksheetTemplate[] {
  const templates: ChecksheetTemplate[] = [];
  const nowStr = '2026-03-01T00:00:00.000Z';

  const createTemplate = (
    id: string,
    name: string,
    compGroup: 'Engine' | 'PT-PPM' | 'Cylinder',
    testStage: TestProcess,
    filterProducts: (p: ProductModel) => boolean,
    sections: ChecksheetSection[]
  ): ChecksheetTemplate => {
    const matchedProducts = allProducts.filter(filterProducts);
    const compatibleProductIds = matchedProducts.map((p) => p.id);
    const firstProd = matchedProducts[0];
    const unitModel = firstProd ? firstProd.unitModel : 'ALL';
    const component = firstProd ? firstProd.component : 'ALL';
    const productMasterId = firstProd ? firstProd.id : undefined;

    return {
      id,
      name,
      compGroup,
      unitModel,
      component,
      productMasterId,
      compatibleProductIds,
      testStage,
      revision: 1,
      status: 'ACTIVE',
      sections,
      createdAt: nowStr,
      updatedAt: nowStr,
      activatedAt: nowStr,
    };
  };

  // ==========================================
  // 1. UNIVERSAL GLT TEMPLATES (2 TEMPLATES)
  // ==========================================

  // 1.1 Universal GLT Engine
  templates.push(
    createTemplate(
      'GLT_ENGINE_UNIVERSAL',
      'GLT Engine Universal',
      'Engine',
      'GLT',
      (p) => p.compGroup === 'Engine',
      [
        {
          id: 'sec-glt-eng-ins',
          name: 'GLT Engine Inspection',
          displayOrder: 1,
          items: [
            { id: 'glt-eng-fuel', itemName: 'Fuel Leakage Check', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
            { id: 'glt-eng-water', itemName: 'Coolant / Water Leakage Check', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
            { id: 'glt-eng-combustion', itemName: 'Combustion Gas Leakage Check', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
            { id: 'glt-eng-lubrication', itemName: 'Lubrication Oil Leakage Check', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 4, mandatory: true, active: true },
            { id: 'glt-eng-visual', itemName: 'Visual Fastener & Fitting Security', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 5, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 1.2 Universal GLT PT-PPM
  templates.push(
    createTemplate(
      'GLT_PT_PPM_UNIVERSAL',
      'GLT PT-PPM Universal',
      'PT-PPM',
      'GLT',
      (p) => p.compGroup === 'PT-PPM',
      [
        {
          id: 'sec-glt-ptppm-ins',
          name: 'GLT PT-PPM Inspection',
          displayOrder: 1,
          items: [
            { id: 'glt-ptppm-lubrication', itemName: 'Oil / Lubrication Leakage Check', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
            { id: 'glt-ptppm-housing', itemName: 'Housing & Gasket Sealing Integrity', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
            { id: 'glt-ptppm-plugs', itemName: 'Port Plugs & Threaded Fitting Check', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
            { id: 'glt-ptppm-spline', itemName: 'Shaft & Spline Visual Condition', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 4, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // ==========================================
  // 2. SHARED FINAL-TEST TEMPLATES (15 TEMPLATES)
  // ==========================================

  // 2.1 Engine Dynotest Universal
  templates.push(
    createTemplate(
      'tmpl-dyno-engine-universal',
      'Engine Dynotest Performance Benchmark',
      'Engine',
      'Dynotest',
      (p) => p.compGroup === 'Engine',
      [
        {
          id: 'sec-ed-speed',
          name: 'Speed & Output Performance',
          displayOrder: 1,
          items: [
            { id: 'item-ed-low-idle', itemName: 'Low Idle Speed', inputType: 'NUMERIC', unit: 'RPM', validation: 'RANGE', minimumValue: 650, maximumValue: 750, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-ed-high-idle', itemName: 'High Idle Speed', inputType: 'NUMERIC', unit: 'RPM', validation: 'RANGE', minimumValue: 2000, maximumValue: 2150, displayOrder: 2, mandatory: true, active: true },
            { id: 'item-ed-rated-power', itemName: 'Rated Output Power', inputType: 'NUMERIC', unit: 'HP', validation: 'MINIMUM', minimumValue: 300, displayOrder: 3, mandatory: true, active: true },
            { id: 'item-ed-boost-press', itemName: 'Intake Manifold Boost Pressure', inputType: 'NUMERIC', unit: 'kPa', validation: 'MINIMUM', minimumValue: 150, displayOrder: 4, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-ed-thermal',
          name: 'Thermal & Pressures',
          displayOrder: 2,
          items: [
            { id: 'item-ed-exhaust-temp', itemName: 'Exhaust Gas Temperature Avg', inputType: 'NUMERIC', unit: '°C', validation: 'MAXIMUM', maximumValue: 650, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-ed-blowby', itemName: 'Crankcase Blow-by Pressure', inputType: 'NUMERIC', unit: 'kPa', validation: 'MAXIMUM', maximumValue: 2.5, displayOrder: 2, mandatory: true, active: true },
            { id: 'item-ed-oil-press', itemName: 'Engine Oil Pressure (High Idle)', inputType: 'NUMERIC', unit: 'kPa', validation: 'RANGE', minimumValue: 300, maximumValue: 500, displayOrder: 3, mandatory: true, active: true },
            { id: 'item-ed-water-temp', itemName: 'Coolant Water Temperature', inputType: 'NUMERIC', unit: '°C', validation: 'RANGE', minimumValue: 75, maximumValue: 95, displayOrder: 4, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.2 Hydraulic Pump Testbench
  templates.push(
    createTemplate(
      'tmpl-pump-testbench-v2',
      'Pump Testbench Dynamic Performance',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.compGroup === 'PT-PPM' && p.component.includes('PUMP'),
      [
        {
          id: 'sec-tb-pump-press',
          name: 'Pressure & Flow Dynamics',
          displayOrder: 1,
          items: [
            { id: 'item-tb-main-relief', itemName: 'Main Relief Valve Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 25.0, maximumValue: 35.0, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-tb-pump-flow', itemName: 'Main Pump Rated Flow Rate', inputType: 'NUMERIC', unit: 'L/min', validation: 'MINIMUM', minimumValue: 150, displayOrder: 2, mandatory: true, active: true },
            { id: 'item-tb-case-drain', itemName: 'Case Drain Leakage Flow', inputType: 'NUMERIC', unit: 'L/min', validation: 'MAXIMUM', maximumValue: 18.0, displayOrder: 3, mandatory: true, active: true },
            { id: 'item-tb-noise', itemName: 'Operational Noise Level', inputType: 'NUMERIC', unit: 'dB', validation: 'MAXIMUM', maximumValue: 85, displayOrder: 4, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.3 Hydraulic Motor Testbench
  templates.push(
    createTemplate(
      'tmpl-motor-testbench-v2',
      'Motor Testbench Dynamic Performance',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.compGroup === 'PT-PPM' && (p.component.includes('MOTOR') || p.component.includes('MACHINERY')),
      [
        {
          id: 'sec-mot-press',
          name: 'Operating Pressure & Brake Holding',
          displayOrder: 1,
          items: [
            { id: 'item-mot-relief-press', itemName: 'Motor Relief Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 26.0, maximumValue: 32.0, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-mot-drain-flow', itemName: 'Case Drain Flow Rate', inputType: 'NUMERIC', unit: 'L/min', validation: 'MAXIMUM', maximumValue: 12.0, displayOrder: 2, mandatory: true, active: true },
            { id: 'item-mot-brake-hold', itemName: 'Parking Brake Holding Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'MINIMUM', minimumValue: 3.5, displayOrder: 3, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.4 Torque Converter Performance Testbench
  templates.push(
    createTemplate(
      'tmpl-tc-perf-v2',
      'Torque Converter Performance Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component === 'TORQUE CONVERTER',
      [
        {
          id: 'sec-tc-perf',
          name: 'Performance Verification',
          displayOrder: 1,
          items: [
            { id: 'item-tc-perf', itemName: 'Performance Verification (Stall / Output)', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
            { id: 'item-tc-leakage', itemName: 'External Oil Leakage', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.5 Torqflow Testbench
  templates.push(
    createTemplate(
      'tmpl-torqflow-v2',
      'Torqflow Transmission Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component === 'TORQFLOW ASSY',
      [
        {
          id: 'sec-tf-press',
          name: 'Oil Pressure Control',
          displayOrder: 1,
          items: [
            { id: 'item-tq-main-relief', itemName: 'Torqflow Main Relief Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 1.8, maximumValue: 2.5, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-tq-mod-press', itemName: 'Modulating Valve Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 1.5, maximumValue: 2.2, displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.6 Transmission Multi-Range Testbench
  templates.push(
    createTemplate(
      'tmpl-transmission-v2',
      'Transmission Multi-Range Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component === 'TRANSMISSION',
      [
        {
          id: 'sec-tr-press',
          name: 'Clutch & Lubrication Pressures',
          displayOrder: 1,
          items: [
            { id: 'item-tr-main-press', itemName: 'Transmission Main Relief Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.2, maximumValue: 3.2, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-tr-clutch-press', itemName: 'Speed Clutch Operating Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 1.8, maximumValue: 2.8, displayOrder: 2, mandatory: true, active: true },
            { id: 'item-tr-lube-press', itemName: 'Lubrication Oil Pressure', inputType: 'NUMERIC', unit: 'kPa', validation: 'RANGE', minimumValue: 120, maximumValue: 250, displayOrder: 3, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.7 Power Take Off (PTO) Testbench
  templates.push(
    createTemplate(
      'tmpl-pto-testbench-v2',
      'Power Take Off (PTO) Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component === 'POWER TAKE OFF',
      [
        {
          id: 'sec-pto-func',
          name: 'Functional & Thermal Inspection',
          displayOrder: 1,
          items: [
            { id: 'item-pto-bearing-temp', itemName: 'Bearing Temperature', inputType: 'NUMERIC', unit: '°C', validation: 'MAXIMUM', maximumValue: 85, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-pto-lube-press', itemName: 'Lubrication Pressure', inputType: 'NUMERIC', unit: 'kPa', validation: 'MINIMUM', minimumValue: 100, displayOrder: 2, mandatory: true, active: true },
            { id: 'item-pto-noise', itemName: 'Abnormal Noise Check', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.8 Power Module Testbench
  templates.push(
    createTemplate(
      'tmpl-power-module-v2',
      'Power Module Drive Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component === 'POWER MODULE',
      [
        {
          id: 'sec-pm-inspect',
          name: 'Operational Inspection',
          displayOrder: 1,
          items: [
            { id: 'item-pm-lube-temp', itemName: 'Module Operating Temp', inputType: 'NUMERIC', unit: '°C', validation: 'MAXIMUM', maximumValue: 90, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-pm-vib', itemName: 'Module Vibration Level', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.9 Final Drive HD & Rigid Axle Testbench
  templates.push(
    createTemplate(
      'tmpl-axle-fd-hd-v2',
      'Final Drive HD & Rigid Axle Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component.includes('FINAL DRIVE') && (p.unitModel.startsWith('HD') || p.unitModel.startsWith('HM')),
      [
        {
          id: 'sec-fd-hd-inspect',
          name: 'Bearing Preload & Seal Integrity',
          displayOrder: 1,
          items: [
            { id: 'item-fd-hub-preload', itemName: 'Hub Bearing Preload / Rolling Resistance', inputType: 'NUMERIC', unit: 'Nm', validation: 'RANGE', minimumValue: 40, maximumValue: 120, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-fd-seal-leak', itemName: 'Floating Seal Air Leakage Rate', inputType: 'NUMERIC', unit: 'kPa/min', validation: 'MAXIMUM', maximumValue: 10, displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.10 Final Drive Motor Grader (GD) Testbench
  templates.push(
    createTemplate(
      'tmpl-final-drive-gd-v2',
      'Final Drive Motor Grader (GD) Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component.includes('FINAL DRIVE') && p.unitModel.startsWith('GD'),
      [
        {
          id: 'sec-fd-gd-inspect',
          name: 'Reduction Gear & Backlash',
          displayOrder: 1,
          items: [
            { id: 'item-fd-gd-backlash', itemName: 'Reduction Gear Backlash', inputType: 'NUMERIC', unit: 'mm', validation: 'RANGE', minimumValue: 0.15, maximumValue: 0.45, displayOrder: 1, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.11 Final Drive PC/DZ Track Drive Testbench
  templates.push(
    createTemplate(
      'tmpl-final-drive-pc-dz-v2',
      'Final Drive PC/DZ Track Drive Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component.includes('FINAL DRIVE') && !p.unitModel.startsWith('HD') && !p.unitModel.startsWith('GD'),
      [
        {
          id: 'sec-fd-pc-inspect',
          name: 'Planetary Gear & Backlash',
          displayOrder: 1,
          items: [
            { id: 'item-fd-pc-backlash', itemName: 'Planetary Gear Set Backlash', inputType: 'NUMERIC', unit: 'mm', validation: 'RANGE', minimumValue: 0.20, maximumValue: 0.50, displayOrder: 1, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.12 Differential & Bevel Gear Testbench
  templates.push(
    createTemplate(
      'tmpl-differential-v2',
      'Differential & Bevel Gear Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component.includes('DIFFERENTIAL'),
      [
        {
          id: 'sec-diff-inspect',
          name: 'Pinion & Ring Gear Backlash',
          displayOrder: 1,
          items: [
            { id: 'item-diff-backlash', itemName: 'Bevel Pinion & Ring Gear Backlash', inputType: 'NUMERIC', unit: 'mm', validation: 'RANGE', minimumValue: 0.25, maximumValue: 0.40, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-diff-preload', itemName: 'Pinion Bearing Preload', inputType: 'NUMERIC', unit: 'Nm', validation: 'RANGE', minimumValue: 2.0, maximumValue: 4.5, displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.13 Front Axle Oscillation & Steering Testbench
  templates.push(
    createTemplate(
      'tmpl-front-axle-v2',
      'Front Axle Oscillation & Steering Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component.includes('FRONT AXLE') || p.component.includes('AXLE ASSY FRONT'),
      [
        {
          id: 'sec-fa-inspect',
          name: 'Kingpin & Alignment',
          displayOrder: 1,
          items: [
            { id: 'item-fa-kingpin-play', itemName: 'Kingpin Bearing Endplay', inputType: 'NUMERIC', unit: 'mm', validation: 'MAXIMUM', maximumValue: 0.20, displayOrder: 1, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.14 Brake Assembly Pressure & Actuation Testbench
  templates.push(
    createTemplate(
      'tmpl-front-brake-v2',
      'Brake Assembly Pressure & Actuation Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component.includes('BRAKE'),
      [
        {
          id: 'sec-brk-inspect',
          name: 'Brake Application & Piston Seal',
          displayOrder: 1,
          items: [
            { id: 'item-brk-app-press', itemName: 'Brake Application Working Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 12.0, maximumValue: 16.0, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-brk-internal-leak', itemName: 'Piston Internal Leakage Rate', inputType: 'NUMERIC', unit: 'mL/min', validation: 'MAXIMUM', maximumValue: 5.0, displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 2.15 Cylinder Testbench Quality Standard (Cylinder Final Test)
  templates.push(
    createTemplate(
      'tmpl-cylinder-testbench-v2',
      'Cylinder Testbench Quality Standard',
      'Cylinder',
      'Hydraulic Test',
      (p) => p.compGroup === 'Cylinder',
      [
        {
          id: 'sec-cyl-leak',
          name: 'Proof Pressure & Leakage Inspection',
          displayOrder: 1,
          items: [
            { id: 'item-cyl-proof-press', itemName: 'Proof Pressure Test (Holding 3 min)', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 28.0, maximumValue: 35.0, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-cyl-drift-rate', itemName: 'Internal Leakage / Piston Bypass (Drift)', inputType: 'NUMERIC', unit: 'mm/5min', validation: 'MAXIMUM', maximumValue: 2.0, displayOrder: 2, mandatory: true, active: true },
            { id: 'item-cyl-ext-leak', itemName: 'Rod Seal & Wiper External Leakage', inputType: 'NUMERIC', unit: 'mL/min', validation: 'MAXIMUM', maximumValue: 0, displayOrder: 3, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // ==========================================
  // 3. CONTINGENCY PROTECTED TEMPLATE
  // ==========================================
  templates.push({
    id: 'tmpl-contingency-performance-only',
    name: 'Performance-Only Contingency Testbench',
    compGroup: 'PT-PPM',
    unitModel: 'ALL',
    component: 'ALL',
    testStage: 'Hydraulic Test',
    revision: 1,
    status: 'ACTIVE',
    notes: 'Protected fallback template for unconfigured products. Evaluates functional performance only.',
    sections: [
      {
        id: 'sec-contingency-perf',
        name: 'Performance Evaluation',
        displayOrder: 1,
        items: [
          {
            id: 'item-contingency-performance',
            itemName: 'Performance Verification',
            inputType: 'GOOD/NOT GOOD',
            validation: 'NONE',
            displayOrder: 1,
            mandatory: true,
            active: true,
          },
        ],
      },
    ],
    createdAt: nowStr,
    updatedAt: nowStr,
    activatedAt: nowStr,
  });

  return templates;
}
