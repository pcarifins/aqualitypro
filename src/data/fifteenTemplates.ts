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
    sections: ChecksheetSection[],
    notes?: string
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
      notes,
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
      'tmpl-glt-engine-v2',
      'GLT Engine Universal Inspection',
      'Engine',
      'GLT',
      (p) => p.compGroup === 'Engine',
      [
        {
          id: 'sec-glt-eng-ins',
          name: 'GLT Engine Inspection',
          displayOrder: 1,
          items: [
            { id: 'glt-eng-fuel', itemName: 'Fuel Leakage Check', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
            { id: 'glt-eng-water', itemName: 'Coolant / Water Leakage Check', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
            { id: 'glt-eng-combustion', itemName: 'Combustion Gas Leakage Check', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
            { id: 'glt-eng-lubrication', itemName: 'Lubrication Oil Leakage Check', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 4, mandatory: true, active: true },
            { id: 'glt-eng-visual', itemName: 'Visual Fastener & Fitting Security', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 5, mandatory: true, active: true },
          ],
        },
      ],
      'Universal GLT checksheet for all Engine Assy products prior to Dynotest.'
    )
  );

  // 1.2 Universal GLT PT-PPM
  templates.push(
    createTemplate(
      'tmpl-glt-pt-ppm-v2',
      'GLT PT-PPM Universal Inspection',
      'PT-PPM',
      'GLT',
      (p) => p.compGroup === 'PT-PPM',
      [
        {
          id: 'sec-glt-ptppm-ins',
          name: 'GLT PT-PPM Inspection',
          displayOrder: 1,
          items: [
            { id: 'glt-ptppm-lubrication', itemName: 'Oil / Lubrication Leakage Check', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
            { id: 'glt-ptppm-housing', itemName: 'Housing & Gasket Sealing Integrity', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
            { id: 'glt-ptppm-plugs', itemName: 'Port Plugs & Threaded Fitting Check', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
            { id: 'glt-ptppm-spline', itemName: 'Shaft & Spline Visual Condition', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 4, mandatory: true, active: true },
          ],
        },
      ],
      'Universal GLT checksheet for all PT-PPM products prior to Testbench.'
    )
  );

  // ==========================================
  // 2. SHARED FINAL-TEST TEMPLATES (15 TEMPLATES)
  // ==========================================

  // 2.1 Engine Dynotest (23 products)
  templates.push(
    createTemplate(
      'tmpl-eng-dyno-v1',
      'Engine Dynotest',
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
      ],
      'Shared Dynotest performance benchmark for all 23 Engine Assy products.'
    )
  );

  // 2.2 Cylinder Testbench (38 products)
  templates.push(
    createTemplate(
      'tmpl-cylinder-testbench-v2',
      'Cylinder Testbench',
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
      ],
      'Shared Testbench checksheet for all 38 Cylinder products (GLT excluded).'
    )
  );

  // 2.3 PTO Testbench (4 products)
  templates.push(
    createTemplate(
      'tmpl-pto-testbench-v2',
      'PTO Testbench',
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
            { id: 'item-pto-noise', itemName: 'Abnormal Noise Check', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
          ],
        },
      ],
      'Shared Testbench checksheet for all 4 Power Take Off products.'
    )
  );

  // 2.4 Hydraulic Pump Testbench (11 products)
  templates.push(
    createTemplate(
      'tmpl-pump-testbench-v2',
      'Hydraulic Pump Testbench',
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
      ],
      'Shared Testbench checksheet for 11 Hydraulic Pump products.'
    )
  );

  // 2.5 Hydraulic Motor Testbench (13 products)
  templates.push(
    createTemplate(
      'tmpl-motor-testbench-v2',
      'Hydraulic Motor Testbench',
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
      ],
      'Shared Testbench checksheet for 13 Hydraulic Motor & Swing Machinery products.'
    )
  );

  // 2.6 Final Drive GD Testbench (3 products)
  templates.push(
    createTemplate(
      'tmpl-final-drive-gd-v2',
      'Final Drive GD Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.compGroup === 'PT-PPM' && p.component.includes('FINAL DRIVE') && p.unitModel.startsWith('GD'),
      [
        {
          id: 'sec-fd-gd-inspect',
          name: 'Reduction Gear & Backlash',
          displayOrder: 1,
          items: [
            { id: 'item-fd-gd-backlash', itemName: 'Reduction Gear Backlash', inputType: 'NUMERIC', unit: 'mm', validation: 'RANGE', minimumValue: 0.15, maximumValue: 0.45, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-fd-gd-oil-leak', itemName: 'Duo-Cone Seal Oil Leakage', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ],
      'Shared Testbench checksheet for 3 Motor Grader Final Drive GD series products.'
    )
  );

  // 2.7 Final Drive PC–DZ Testbench (10 products)
  templates.push(
    createTemplate(
      'tmpl-final-drive-pc-dz-v2',
      'Final Drive PC–DZ Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) =>
        p.compGroup === 'PT-PPM' &&
        (p.component.includes('FINAL DRIVE') || p.component.includes('AXLE')) &&
        (p.unitModel.startsWith('PC') || p.unitModel.startsWith('D') || p.unitModel.startsWith('DZ')),
      [
        {
          id: 'sec-fd-pc-inspect',
          name: 'Planetary Gear & Backlash',
          displayOrder: 1,
          items: [
            { id: 'item-fd-pc-backlash', itemName: 'Planetary Gear Set Backlash', inputType: 'NUMERIC', unit: 'mm', validation: 'RANGE', minimumValue: 0.20, maximumValue: 0.50, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-fd-pc-floating-seal', itemName: 'Floating Seal Air Leakage Rate', inputType: 'NUMERIC', unit: 'kPa/min', validation: 'MAXIMUM', maximumValue: 10, displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ],
      'Shared Testbench checksheet for 10 Final Drive PC and D/DZ series track drive products.'
    )
  );

  // 2.8 Differential Testbench (15 products)
  templates.push(
    createTemplate(
      'tmpl-differential-v2',
      'Differential Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.compGroup === 'PT-PPM' && p.component.includes('DIFFERENTIAL'),
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
      ],
      'Shared Testbench checksheet for 15 Differential Front/Rear/Center products.'
    )
  );

  // 2.9A Axle HD Testbench
  templates.push(
    createTemplate(
      'tmpl-axle-hd-v1',
      'Axle HD Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) =>
        p.compGroup === 'PT-PPM' && p.component.includes('AXLE') && p.unitModel.startsWith('HD') && !p.component.includes('FRONT'),
      [
        {
          id: 'sec-axle-hd-inspect',
          name: 'Bearing Preload & Seal Integrity',
          displayOrder: 1,
          items: [
            { id: 'item-axle-hub-preload', itemName: 'Hub Bearing Preload / Rolling Resistance', inputType: 'NUMERIC', unit: 'Nm', validation: 'RANGE', minimumValue: 40, maximumValue: 120, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-axle-seal-leak', itemName: 'Floating Seal Air Leakage Rate', inputType: 'NUMERIC', unit: 'kPa/min', validation: 'MAXIMUM', maximumValue: 10, displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ],
      'Shared Testbench checksheet for Axle HD series products.'
    )
  );

  // 2.9B Final Drive Wheel Testbench
  templates.push(
    createTemplate(
      'tmpl-final-drive-wheel-v1',
      'Final Drive Wheel Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) =>
        p.compGroup === 'PT-PPM' && p.component.includes('FINAL DRIVE') && (p.unitModel.startsWith('HD') || p.unitModel.startsWith('HM') || p.unitModel.startsWith('WA') || p.unitModel.startsWith('WD')),
      [
        {
          id: 'sec-fd-wheel-inspect',
          name: 'Bearing Preload & Seal Integrity',
          displayOrder: 1,
          items: [
            { id: 'item-fd-wheel-hub-preload', itemName: 'Hub Bearing Preload / Rolling Resistance', inputType: 'NUMERIC', unit: 'Nm', validation: 'RANGE', minimumValue: 40, maximumValue: 120, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-fd-wheel-seal-leak', itemName: 'Floating Seal Air Leakage Rate', inputType: 'NUMERIC', unit: 'kPa/min', validation: 'MAXIMUM', maximumValue: 10, displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ],
      'Shared Testbench checksheet for Final Drive Wheel series products.'
    )
  );

  // 2.10 Front Brake and Front Axle Testbench (6 products)
  templates.push(
    createTemplate(
      'tmpl-front-brake-axle-v2',
      'Front Brake and Front Axle Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) =>
        p.compGroup === 'PT-PPM' &&
        (p.component.includes('BRAKE') || (p.component.includes('AXLE') && p.component.includes('FRONT'))),
      [
        {
          id: 'sec-brk-axle-press',
          name: 'Brake Application & Piston Seal',
          displayOrder: 1,
          items: [
            { id: 'item-brk-app-press', itemName: 'Brake Application Working Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 12.0, maximumValue: 16.0, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-brk-internal-leak', itemName: 'Piston Internal Leakage Rate', inputType: 'NUMERIC', unit: 'mL/min', validation: 'MAXIMUM', maximumValue: 5.0, displayOrder: 2, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-brk-axle-mech',
          name: 'Kingpin & Mechanical Inspection',
          displayOrder: 2,
          items: [
            { id: 'item-fa-kingpin-play', itemName: 'Kingpin Bearing Endplay', inputType: 'NUMERIC', unit: 'mm', validation: 'MAXIMUM', maximumValue: 0.20, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-brk-axle-visual', itemName: 'Seal & Fastener Visual Security', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ],
      'Shared Testbench checksheet for 6 Front Brake, Front Axle, and Steering Brake products.'
    )
  );

  // 2.11 Power Module Testbench (3 products)
  templates.push(
    createTemplate(
      'tmpl-power-module-v2',
      'Power Module Testbench',
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
            { id: 'item-pm-vib', itemName: 'Module Vibration Level', inputType: 'GOOD / NOT GOOD', validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
          ],
        },
      ],
      'Shared Testbench checksheet for all 3 Power Module products.'
    )
  );

  // 2.12 Transmission GD Testbench (3 products)
  templates.push(
    createTemplate(
      'tmpl-trans-gd-v2',
      'Transmission GD/WD Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.compGroup === 'PT-PPM' && p.component === 'TRANSMISSION' && p.unitModel.startsWith('GD'),
      [
        {
          id: 'sec-tr-gd-press',
          name: 'Clutch & Lubrication Pressures',
          displayOrder: 1,
          items: [
            { id: 'item-tr-gd-main-press', itemName: 'Transmission Main Relief Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.2, maximumValue: 3.2, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-tr-gd-clutch-press', itemName: 'Speed Clutch Operating Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 1.8, maximumValue: 2.8, displayOrder: 2, mandatory: true, active: true },
            { id: 'item-tr-gd-lube-press', itemName: 'Lubrication Oil Pressure', inputType: 'NUMERIC', unit: 'kPa', validation: 'RANGE', minimumValue: 120, maximumValue: 250, displayOrder: 3, mandatory: true, active: true },
          ],
        },
      ],
      'Shared Testbench checksheet for 3 Motor Grader Transmission GD series products.'
    )
  );

  // 2.13 Transmission WA Testbench (1 product)
  templates.push(
    createTemplate(
      'tmpl-trans-wa-v2',
      'Transmission WA Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.compGroup === 'PT-PPM' && p.component === 'TRANSMISSION' && p.unitModel.startsWith('WA'),
      [
        {
          id: 'sec-tr-wa-press',
          name: 'Clutch & Lubrication Pressures',
          displayOrder: 1,
          items: [
            { id: 'item-tr-wa-main-press', itemName: 'Transmission Main Relief Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.4, maximumValue: 3.4, displayOrder: 1, mandatory: true, active: true },
            { id: 'item-tr-wa-clutch-press', itemName: 'Speed Clutch Operating Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.0, maximumValue: 3.0, displayOrder: 2, mandatory: true, active: true },
            { id: 'item-tr-wa-lube-press', itemName: 'Lubrication Oil Pressure', inputType: 'NUMERIC', unit: 'kPa', validation: 'RANGE', minimumValue: 150, maximumValue: 280, displayOrder: 3, mandatory: true, active: true },
          ],
        },
      ],
      'Shared Testbench checksheet for Wheel Loader Transmission WA series (WA500-3).'
    )
  );

  // 2.14 Torqflow Testbench (9 products)
  templates.push(
    createTemplate(
      'tmpl-torqflow-v2',
      'Torqflow Testbench',
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
      ],
      'Shared Testbench checksheet for all 9 Torqflow Assy products.'
    )
  );

  // 2.15 Controlled Performance Only (23 products)
  templates.push(
    createTemplate(
      'tmpl-torque-converter-performance-v1',
      'One Performance checking point: GOOD / NOT GOOD',
      'PT-PPM',
      'Hydraulic Test',
      (p) =>
        (p.compGroup === 'PT-PPM' && p.component.includes('FINAL DRIVE') && (p.unitModel.startsWith('HM') || p.unitModel.startsWith('WA') || p.unitModel.startsWith('WD'))) ||
        (p.component === 'TRANSMISSION' && p.unitModel.startsWith('WD')) ||
        (p.component === 'TORQUE CONVERTER' && p.unitModel.startsWith('WA')),
      [
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
      'Controlled Performance-Only template explicitly restricted to the 23 approved products without a validated detailed standard.'
    )
  );

  return templates;
}
