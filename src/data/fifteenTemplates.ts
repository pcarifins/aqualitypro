import { ChecksheetTemplate, ProductModel, ChecksheetSection, ChecksheetItem, TestProcess } from '../types';

export function getFifteenTemplates(allProducts: ProductModel[]): ChecksheetTemplate[] {
  const templates: ChecksheetTemplate[] = [];

  const nowStr = new Date().toISOString();

  // Helper to create template
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
    
    // Use first matched product to populate legacy fields, or fallback
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

  // 1. A. GLT ENGINE
  templates.push(
    createTemplate(
      'tmpl-glt-engine-v2',
      'GLT Engine',
      'Engine',
      'GLT',
      (p) => p.compGroup === 'Engine' && p.component === 'ENGINE ASSY',
      [
        {
          id: 'sec-glt-eng-ins',
          name: 'GLT Inspection',
          displayOrder: 1,
          items: [
            {
              id: 'glt-eng-fuel',
              itemName: 'Fuel',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'glt-eng-water',
              itemName: 'Water',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'glt-eng-combustion',
              itemName: 'Combustion',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
            {
              id: 'glt-eng-lubrication',
              itemName: 'Lubrication',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 4,
              mandatory: true,
              active: true,
            },
          ],
        },
      ]
    )
  );

  // 2. B. GLT PT-PPM
  templates.push(
    createTemplate(
      'tmpl-glt-pt-ppm-v2',
      'GLT PT-PPM',
      'PT-PPM',
      'GLT',
      (p) => p.compGroup === 'PT-PPM' && (p.subGroup === 'PT' || p.subGroup === 'PPM'),
      [
        {
          id: 'sec-glt-ptppm-lub',
          name: 'Lubrication Inspection',
          displayOrder: 1,
          items: [
            {
              id: 'glt-ptppm-lubrication',
              itemName: 'Lubrication',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
          ],
        },
      ]
    )
  );

  // 3. C. PTO TESTBENCH
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
          name: 'Functional Inspection',
          displayOrder: 1,
          items: [
            {
              id: 'pto-lubrication',
              itemName: 'Lubrication',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'pto-noise',
              itemName: 'Abnormal Noise',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'pto-leakage',
              itemName: 'Leakage',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
          ],
        },
      ]
    )
  );

  // 4. D. CYLINDER TESTBENCH
  templates.push(
    createTemplate(
      'tmpl-cylinder-testbench-v2',
      'Hydraulic Cylinder Testbench',
      'Cylinder',
      'Hydraulic Test',
      (p) => p.compGroup === 'Cylinder',
      [
        {
          id: 'sec-cyl-leak',
          name: 'Leakage Inspection',
          displayOrder: 1,
          items: [
            {
              id: 'cyl-ext-leak',
              itemName: 'External Leak',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'cyl-int-leak',
              itemName: 'Internal Leak',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-cyl-press-up',
          name: 'Pressure Power Up',
          displayOrder: 2,
          items: [
            {
              id: 'cyl-press-up-1',
              itemName: 'Pressure Power Up 1',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'cyl-press-up-2',
              itemName: 'Pressure Power Up 2',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'cyl-press-up-3',
              itemName: 'Pressure Power Up 3',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-cyl-press-down',
          name: 'Pressure Power Down',
          displayOrder: 3,
          items: [
            {
              id: 'cyl-press-down-1',
              itemName: 'Pressure Power Down 1',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'cyl-press-down-2',
              itemName: 'Pressure Power Down 2',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'cyl-press-down-3',
              itemName: 'Pressure Power Down 3',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
          ],
        },
      ]
    )
  );

  // 5. E. PUMP TESTBENCH
  templates.push(
    createTemplate(
      'tmpl-pump-testbench-v2',
      'Hydraulic Pump Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => ['MAIN PUMP NO 1', 'MAIN PUMP NO 2', 'SWING PUMP', 'FAN PUMP', 'LOADER PUMP', 'STEERING PUMP', 'SWITCH PUMP'].includes(p.component),
      [
        {
          id: 'sec-pmp-front',
          name: 'Front Pump',
          displayOrder: 1,
          items: [
            {
              id: 'pmp-f-flow-max',
              itemName: 'Flow Rate Max',
              inputType: 'NUMERIC',
              unit: 'L/min',
              validation: 'RANGE',
              minimumValue: 155,
              maximumValue: 160,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-f-flow-min',
              itemName: 'Flow Rate Min',
              inputType: 'NUMERIC',
              unit: 'L/min',
              validation: 'RANGE',
              minimumValue: 17,
              maximumValue: 22,
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-f-nc-press-max',
              itemName: 'NC Output Pressure Max',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'MINIMUM',
              minimumValue: 20,
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-f-nc-press-min',
              itemName: 'NC Output Pressure Min',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'TARGET_TOLERANCE',
              targetValue: 0,
              toleranceValue: 0,
              displayOrder: 4,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-f-drive-press',
              itemName: 'Drive Pressure',
              inputType: 'NUMERIC',
              validation: 'NONE',
              displayOrder: 5,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-f-load-press',
              itemName: 'Load Pressure',
              inputType: 'NUMERIC',
              validation: 'NONE',
              displayOrder: 6,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-f-temp',
              itemName: 'Temperature',
              inputType: 'NUMERIC',
              unit: '°C',
              validation: 'TARGET_TOLERANCE',
              targetValue: 50,
              toleranceValue: 5,
              displayOrder: 7,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-pmp-rear',
          name: 'Rear Pump',
          displayOrder: 2,
          items: [
            {
              id: 'pmp-r-flow-max',
              itemName: 'Flow Rate Max',
              inputType: 'NUMERIC',
              unit: 'L/min',
              validation: 'RANGE',
              minimumValue: 155,
              maximumValue: 160,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-r-flow-min',
              itemName: 'Flow Rate Min',
              inputType: 'NUMERIC',
              unit: 'L/min',
              validation: 'RANGE',
              minimumValue: 17,
              maximumValue: 22,
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-r-nc-press-max',
              itemName: 'NC Output Pressure Max',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'MINIMUM',
              minimumValue: 20,
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-r-nc-press-min',
              itemName: 'NC Output Pressure Min',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'TARGET_TOLERANCE',
              targetValue: 0,
              toleranceValue: 0,
              displayOrder: 4,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-r-drive-press',
              itemName: 'Drive Pressure',
              inputType: 'NUMERIC',
              validation: 'NONE',
              displayOrder: 5,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-r-load-press',
              itemName: 'Load Pressure',
              inputType: 'NUMERIC',
              validation: 'NONE',
              displayOrder: 6,
              mandatory: true,
              active: true,
            },
            {
              id: 'pmp-r-temp',
              itemName: 'Temperature',
              inputType: 'NUMERIC',
              unit: '°C',
              validation: 'TARGET_TOLERANCE',
              targetValue: 50,
              toleranceValue: 5,
              displayOrder: 7,
              mandatory: true,
              active: true,
            },
          ],
        },
      ]
    )
  );

  // 6. F. MOTOR TESTBENCH
  templates.push(
    createTemplate(
      'tmpl-motor-testbench-v2',
      'Hydraulic Motor Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => ['SWING MOTOR', 'TRAVEL MOTOR'].includes(p.component),
      [
        {
          id: 'sec-mtr-speed-press',
          name: 'Speed and Pressure',
          displayOrder: 1,
          items: [
            {
              id: 'mtr-rpm',
              itemName: 'RPM',
              inputType: 'NUMERIC',
              unit: 'rpm',
              validation: 'TARGET_TOLERANCE',
              targetValue: 450,
              toleranceValue: 10,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'mtr-pa-press',
              itemName: 'PA Safety Valve Pressure',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'TARGET_TOLERANCE',
              targetValue: 337.2,
              toleranceValue: 3.5,
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'mtr-pb-press',
              itemName: 'PB Safety Valve Pressure',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'TARGET_TOLERANCE',
              targetValue: 337.2,
              toleranceValue: 3.5,
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
            {
              id: 'mtr-brake-release',
              itemName: 'Brake Release Pressure',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'TARGET_TOLERANCE',
              targetValue: 15,
              toleranceValue: 2,
              displayOrder: 4,
              mandatory: true,
              active: true,
            },
            {
              id: 'mtr-temp',
              itemName: 'Oil Temperature',
              inputType: 'NUMERIC',
              unit: '°C',
              validation: 'TARGET_TOLERANCE',
              targetValue: 50,
              toleranceValue: 5,
              displayOrder: 5,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-mtr-noise-leak',
          name: 'Noise and Leakage',
          displayOrder: 2,
          items: [
            {
              id: 'mtr-noise',
              itemName: 'Abnormal Noise',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'mtr-leakage',
              itemName: 'Leakage',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
          ],
        },
      ]
    )
  );

  // 7. G. FINAL DRIVE GD
  templates.push(
    createTemplate(
      'tmpl-final-drive-gd-v2',
      'Final Drive GD Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component.includes('FINAL DRIVE') && p.unitModel.startsWith('GD'),
      [
        {
          id: 'sec-fdgd-rot-press',
          name: 'Rotation and Pressure',
          displayOrder: 1,
          items: [
            {
              id: 'fd-gd-rpm',
              itemName: 'RPM',
              inputType: 'NUMERIC',
              unit: 'rpm',
              validation: 'RANGE',
              minimumValue: 200,
              maximumValue: 500,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'fd-gd-diff-press',
              itemName: 'Diff Lock Pressure',
              inputType: 'NUMERIC',
              unit: 'MPa',
              validation: 'NONE',
              targetValue: 2.5,
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-fdgd-noise-leak',
          name: 'Noise and Leakage',
          displayOrder: 2,
          items: [
            {
              id: 'fd-gd-noise',
              itemName: 'Abnormal Noise',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'fd-gd-leakage',
              itemName: 'Leakage',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
          ],
        },
      ]
    )
  );

  // 8. H. FINAL DRIVE PC–DZ
  templates.push(
    createTemplate(
      'tmpl-final-drive-pc-dz-v2',
      'Final Drive PC-DZ Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) =>
        p.component.includes('FINAL DRIVE') &&
        (p.unitModel.startsWith('PC') || p.unitModel.startsWith('D')) &&
        !p.unitModel.startsWith('GD') &&
        !p.unitModel.startsWith('HD') &&
        !p.unitModel.startsWith('HM') &&
        !p.unitModel.startsWith('WA') &&
        !p.unitModel.startsWith('WD'),
      [
        {
          id: 'sec-fdpcdz-rot',
          name: 'Rotation Test',
          displayOrder: 1,
          items: [
            {
              id: 'fd-pcdz-rpm-1',
              itemName: 'RPM I',
              inputType: 'NUMERIC',
              unit: 'rpm',
              validation: 'NONE',
              targetValue: 100,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'fd-pcdz-rpm-2',
              itemName: 'RPM II',
              inputType: 'NUMERIC',
              unit: 'rpm',
              validation: 'NONE',
              targetValue: 200,
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-fdpcdz-noise-leak',
          name: 'Noise and Leakage',
          displayOrder: 2,
          items: [
            {
              id: 'fd-pcdz-noise',
              itemName: 'Abnormal Noise',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'fd-pcdz-leakage',
              itemName: 'Leakage',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
          ],
        },
      ]
    )
  );

  // 9. I. DIFFERENTIAL TESTBENCH
  templates.push(
    createTemplate(
      'tmpl-differential-v2',
      'Differential Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => ['DIFFERENTIAL', 'DIFFERENTIAL FRONT', 'DIFFERENTIAL REAR', 'DIFFERENTIAL CENTER'].includes(p.component),
      [
        {
          id: 'sec-diff-rot-sensor',
          name: 'Rotation and Sensor',
          displayOrder: 1,
          items: [
            {
              id: 'diff-rpm',
              itemName: 'RPM',
              inputType: 'NUMERIC',
              unit: 'rpm',
              validation: 'RANGE',
              minimumValue: 300,
              maximumValue: 400,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'diff-sensor-lh-cw',
              itemName: 'Output Speed Sensor LH CW',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'diff-sensor-lh-ccw',
              itemName: 'Output Speed Sensor LH CCW',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
            {
              id: 'diff-sensor-rh-cw',
              itemName: 'Output Speed Sensor RH CW',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 4,
              mandatory: true,
              active: true,
            },
            {
              id: 'diff-sensor-rh-ccw',
              itemName: 'Output Speed Sensor RH CCW',
              inputType: 'GOOD/NOT GOOD',
              validation: 'NONE',
              displayOrder: 5,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-diff-temp-press',
          name: 'Temperature and Pressure',
          displayOrder: 2,
          items: [
            {
              id: 'diff-temp',
              itemName: 'Temperature',
              inputType: 'NUMERIC',
              unit: '°C',
              validation: 'RANGE',
              minimumValue: 45,
              maximumValue: 55,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'diff-lock-press',
              itemName: 'Diff Lock Pressure',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'TARGET_TOLERANCE',
              targetValue: 10,
              toleranceValue: 5,
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-diff-noise-leak',
          name: 'Noise and Leakage',
          displayOrder: 3,
          items: [
            {
              id: 'diff-noise',
              itemName: 'Abnormal Noise',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'diff-leakage',
              itemName: 'Leakage',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
          ],
        },
      ]
    )
  );

  // 10. J. AXLE & FINAL DRIVE HD
  templates.push(
    createTemplate(
      'tmpl-axle-fd-hd-v2',
      'Axle and Final Drive HD Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) =>
        p.unitModel.startsWith('HD') &&
        ['AXLE ASSY', 'FINAL DRIVE LEFT', 'FINAL DRIVE RIGHT'].includes(p.component) &&
        !['AXLE ASSY FRONT LEFT', 'AXLE ASSY FRONT RIGHT', 'FRONT BRAKE LEFT', 'FRONT BRAKE RIGHT'].includes(p.component),
      [
        {
          id: 'sec-hdaxle-press',
          name: 'Brake Pressure',
          displayOrder: 1,
          items: [
            {
              id: 'hd-axle-pb-rel-set',
              itemName: 'Parking Brake Release Pressure – Set',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'RANGE',
              minimumValue: 85,
              maximumValue: 100,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'hd-axle-pb-rel-drop',
              itemName: 'Parking Brake Release Pressure – Drop',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'MAXIMUM',
              maximumValue: 8,
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'hd-axle-sb-rel-set',
              itemName: 'Service Brake Release Pressure – Set',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'RANGE',
              minimumValue: 93,
              maximumValue: 107,
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
            {
              id: 'hd-axle-sb-rel-drop',
              itemName: 'Service Brake Release Pressure – Drop',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'MAXIMUM',
              maximumValue: 6,
              displayOrder: 4,
              mandatory: true,
              active: true,
            },
            {
              id: 'hd-axle-cooling-press',
              itemName: 'Brake Cooling Pressure',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'RANGE',
              minimumValue: 1,
              maximumValue: 6,
              displayOrder: 5,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-hdaxle-drag-temp',
          name: 'Drag Torque and Temperature',
          displayOrder: 2,
          items: [
            {
              id: 'hd-axle-drag',
              itemName: 'Drag Torque',
              inputType: 'NUMERIC',
              unit: 'Nm',
              validation: 'RANGE',
              minimumValue: 196,
              maximumValue: 637,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'hd-axle-temp',
              itemName: 'Temperature',
              inputType: 'NUMERIC',
              unit: '°C',
              validation: 'RANGE',
              minimumValue: 50,
              maximumValue: 55,
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-hdaxle-noise-leak',
          name: 'Noise and Leakage',
          displayOrder: 3,
          items: [
            {
              id: 'hd-axle-noise',
              itemName: 'Abnormal Noise',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'hd-axle-leakage',
              itemName: 'Leakage',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
          ],
        },
      ]
    )
  );

  // 11. K. FRONT BRAKE & FRONT AXLE
  templates.push(
    createTemplate(
      'tmpl-front-brake-axle-v2',
      'Front Brake and Front Axle Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => ['FRONT BRAKE LEFT', 'FRONT BRAKE RIGHT', 'AXLE ASSY FRONT LEFT', 'AXLE ASSY FRONT RIGHT'].includes(p.component),
      [
        {
          id: 'sec-fb-press',
          name: 'Brake Pressure',
          displayOrder: 1,
          items: [
            {
              id: 'fb-pb-rel-set',
              itemName: 'Parking Brake Release Pressure – Set',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'RANGE',
              minimumValue: 85,
              maximumValue: 100,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'fb-pb-rel-drop',
              itemName: 'Parking Brake Release Pressure – Drop',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'MAXIMUM',
              maximumValue: 8,
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'fb-sb-rel-set',
              itemName: 'Service Brake Release Pressure – Set',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'RANGE',
              minimumValue: 93,
              maximumValue: 107,
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
            {
              id: 'fb-sb-rel-drop',
              itemName: 'Service Brake Release Pressure – Drop',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'MAXIMUM',
              maximumValue: 6,
              displayOrder: 4,
              mandatory: true,
              active: true,
            },
            {
              id: 'fb-cooling-press',
              itemName: 'Brake Cooling Pressure',
              inputType: 'NUMERIC',
              unit: 'kg/cm²',
              validation: 'TARGET_TOLERANCE',
              targetValue: 5,
              toleranceValue: 1,
              displayOrder: 5,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-fb-drag',
          name: 'Drag Torque',
          displayOrder: 2,
          items: [
            {
              id: 'front-brake-drag-torque-cw-1',
              itemName: 'Drag Torque CW 30±5 rpm',
              inputType: 'NUMERIC',
              unit: 'Nm',
              validation: 'RANGE',
              minimumValue: 196,
              maximumValue: 637,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'front-brake-drag-torque-ccw-1',
              itemName: 'Drag Torque CCW 75±5 rpm',
              inputType: 'NUMERIC',
              unit: 'Nm',
              validation: 'RANGE',
              minimumValue: 196,
              maximumValue: 735,
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'front-brake-drag-torque-cw-2',
              itemName: 'Drag Torque CW 30±5 rpm',
              inputType: 'NUMERIC',
              unit: 'Nm',
              validation: 'RANGE',
              minimumValue: 196,
              maximumValue: 637,
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
            {
              id: 'front-brake-drag-torque-ccw-2',
              itemName: 'Drag Torque CCW 75±5 rpm',
              inputType: 'NUMERIC',
              unit: 'Nm',
              validation: 'RANGE',
              minimumValue: 196,
              maximumValue: 735,
              displayOrder: 4,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-fb-temp-noise',
          name: 'Temperature, Noise and Leakage',
          displayOrder: 3,
          items: [
            {
              id: 'fb-temp',
              itemName: 'Temperature',
              inputType: 'NUMERIC',
              unit: '°C',
              validation: 'RANGE',
              minimumValue: 50,
              maximumValue: 55,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'fb-noise',
              itemName: 'Abnormal Noise',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'fb-leakage',
              itemName: 'Leakage',
              inputType: 'Dropdown',
              options: ['YES', 'NO'],
              validation: 'NONE',
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
          ],
        },
      ]
    )
  );

  // 12. L. POWER MODULE – ALL SERIES
  templates.push(
    createTemplate(
      'tmpl-power-module-v2',
      'Power Module All Series',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component === 'POWER MODULE',
      [
        {
          id: 'sec-pm-speed-press',
          name: 'Speed and Pressure',
          displayOrder: 1,
          items: [
            {
              id: 'pm-main-relief',
              itemName: 'Main Relief Pressure',
              inputType: 'NUMERIC',
              unit: 'MPa',
              validation: 'RANGE',
              minimumValue: 28.7,
              maximumValue: 31.7,
              displayOrder: 1,
              mandatory: true,
              active: true,
            },
            {
              id: 'pm-shaft-speed',
              itemName: 'Output Shaft Speed',
              inputType: 'NUMERIC',
              unit: 'rpm',
              validation: 'RANGE',
              minimumValue: 760,
              maximumValue: 845,
              displayOrder: 2,
              mandatory: true,
              active: true,
            },
            {
              id: 'pm-tc-in-press',
              itemName: 'Torque Converter Input Pressure',
              inputType: 'NUMERIC',
              unit: 'MPa',
              validation: 'RANGE',
              minimumValue: 0.39,
              maximumValue: 0.59,
              displayOrder: 3,
              mandatory: true,
              active: true,
            },
            {
              id: 'pm-tc-out-press',
              itemName: 'Torque Converter Output Pressure',
              inputType: 'NUMERIC',
              unit: 'MPa',
              validation: 'RANGE',
              minimumValue: 0.05,
              maximumValue: 0.49,
              displayOrder: 4,
              mandatory: true,
              active: true,
            },
            {
              id: 'pm-tm-lub-press',
              itemName: 'Transmission Lubrication Pressure',
              inputType: 'NUMERIC',
              unit: 'MPa',
              validation: 'RANGE',
              minimumValue: 0,
              maximumValue: 0.1,
              displayOrder: 5,
              mandatory: true,
              active: true,
            },
            {
              id: 'pm-steer-lub-press',
              itemName: 'Steering Lubrication Pressure',
              inputType: 'NUMERIC',
              unit: 'MPa',
              validation: 'RANGE',
              minimumValue: 0.02,
              maximumValue: 0.12,
              displayOrder: 6,
              mandatory: true,
              active: true,
            },
          ],
        },
        {
          id: 'sec-pm-clutch-act',
          name: 'Clutch Activation',
          displayOrder: 2,
          items: [
            { id: 'pm-clutch-f', itemName: 'F', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
            { id: 'pm-clutch-r', itemName: 'R', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
            { id: 'pm-clutch-1st', itemName: '1st', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
            { id: 'pm-clutch-2nd', itemName: '2nd', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 4, mandatory: true, active: true },
            { id: 'pm-clutch-3rd', itemName: '3rd', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 5, mandatory: true, active: true },
            { id: 'pm-clutch-lu', itemName: 'Lock Up', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 6, mandatory: true, active: true },
            { id: 'pm-clutch-stator', itemName: 'Stator', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 7, mandatory: true, active: true },
            { id: 'pm-clutch-lbrake', itemName: 'Left Brake', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 8, mandatory: true, active: true },
            { id: 'pm-clutch-rbrake', itemName: 'Right Brake', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 9, mandatory: true, active: true },
            { id: 'pm-clutch-lclutch', itemName: 'Left Clutch', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 10, mandatory: true, active: true },
            { id: 'pm-clutch-rclutch', itemName: 'Right Clutch', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 11, mandatory: true, active: true },
            { id: 'pm-clutch-sbpv-prevention', itemName: 'Sudden Brake Prevention Valve', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 12, mandatory: true, active: true },
            { id: 'pm-clutch-sbpv-privation', itemName: 'Sudden Brake Privation Valve', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 13, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-pm-fill-press',
          name: 'Fill Time and Pressure',
          displayOrder: 3,
          items: [
            { id: 'pm-fill-f-time', itemName: 'F: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.2, maximumValue: 0.6, displayOrder: 1, mandatory: true, active: true },
            { id: 'pm-fill-f-press', itemName: 'F: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.01, maximumValue: 2.40, displayOrder: 2, mandatory: true, active: true },
            { id: 'pm-fill-r-time', itemName: 'R: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.2, maximumValue: 0.7, displayOrder: 3, mandatory: true, active: true },
            { id: 'pm-fill-r-press', itemName: 'R: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.01, maximumValue: 2.40, displayOrder: 4, mandatory: true, active: true },
            { id: 'pm-fill-1st-time', itemName: '1st: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.2, maximumValue: 0.7, displayOrder: 5, mandatory: true, active: true },
            { id: 'pm-fill-1st-press', itemName: '1st: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.01, maximumValue: 2.40, displayOrder: 6, mandatory: true, active: true },
            { id: 'pm-fill-2nd-time', itemName: '2nd: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.2, maximumValue: 0.6, displayOrder: 7, mandatory: true, active: true },
            { id: 'pm-fill-2nd-press', itemName: '2nd: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.01, maximumValue: 2.40, displayOrder: 8, mandatory: true, active: true },
            { id: 'pm-fill-3rd-time', itemName: '3rd: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.2, maximumValue: 0.8, displayOrder: 9, mandatory: true, active: true },
            { id: 'pm-fill-3rd-press', itemName: '3rd: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.01, maximumValue: 2.40, displayOrder: 10, mandatory: true, active: true },
            { id: 'pm-fill-lu', itemName: 'Lock Up Fill Data', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 11, mandatory: true, active: true },
            { id: 'pm-fill-stator', itemName: 'Stator Fill Data', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 12, mandatory: true, active: true },
            { id: 'pm-press-lbrake', itemName: 'Left Brake: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.53, maximumValue: 2.92, displayOrder: 13, mandatory: true, active: true },
            { id: 'pm-press-rbrake', itemName: 'Right Brake: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.25, maximumValue: 2.83, displayOrder: 14, mandatory: true, active: true },
            { id: 'pm-press-lclutch', itemName: 'Left Clutch: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.53, maximumValue: 2.92, displayOrder: 15, mandatory: true, active: true },
            { id: 'pm-press-rclutch', itemName: 'Right Clutch: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 2.58, maximumValue: 2.97, displayOrder: 16, mandatory: true, active: true },
            { id: 'pm-press-sbpv-prevention', itemName: 'Sudden Brake Prevention Valve: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 0, maximumValue: 0.2, displayOrder: 17, mandatory: true, active: true },
            { id: 'pm-press-sbpv-privation', itemName: 'Sudden Brake Privation Valve: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 1.18, maximumValue: 1.57, displayOrder: 18, mandatory: true, active: true },
            { id: 'pm-press-parking-1', itemName: 'Parking 1: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 0, maximumValue: 0.2, displayOrder: 19, mandatory: true, active: true },
            { id: 'pm-press-parking-2', itemName: 'Parking 2: Pressure', inputType: 'NUMERIC', unit: 'MPa', validation: 'RANGE', minimumValue: 0, maximumValue: 0.2, displayOrder: 20, mandatory: true, active: true },
            { id: 'pm-error-code', itemName: 'Error Code', inputType: 'TEXT', validation: 'NONE', displayOrder: 21, mandatory: false, active: true },
          ],
        },
        {
          id: 'sec-pm-leak-noise',
          name: 'Leakage and Noise',
          displayOrder: 4,
          items: [
            { id: 'pm-leak-coupling', itemName: 'Leakage Coupling', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
            { id: 'pm-leak-pto', itemName: 'Leakage PTO', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
            { id: 'pm-leak-tc', itemName: 'Leakage TC', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
            { id: 'pm-leak-trans', itemName: 'Leakage Transmission', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 4, mandatory: true, active: true },
            { id: 'pm-leak-ctrl', itemName: 'Leakage Control Valve', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 5, mandatory: true, active: true },
            { id: 'pm-vib', itemName: 'Abnormal Vibration', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 6, mandatory: true, active: true },
            { id: 'pm-noise', itemName: 'Abnormal Noise', inputType: 'NUMERIC', unit: 'dB', validation: 'MAXIMUM', maximumValue: 105, displayOrder: 7, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 13. M. TRANSMISSION GD
  templates.push(
    createTemplate(
      'tmpl-trans-gd-v2',
      'Transmission GD Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component === 'TRANSMISSION' && p.unitModel.startsWith('GD'),
      [
        {
          id: 'sec-trgd-rel',
          name: 'Oil Pressure – Inching Spool Release',
          displayOrder: 1,
          items: [
            { id: 'tr-gd-r-p1', itemName: 'Main Pressure P1', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 27, maximumValue: 31, displayOrder: 1, mandatory: true, active: true },
            { id: 'tr-gd-r-p4', itemName: 'Inching Pressure P4', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 0.5, maximumValue: 1.3, displayOrder: 2, mandatory: true, active: true },
            { id: 'tr-gd-r-p8', itemName: 'Oil Cooler Bypass P8', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'TARGET_TOLERANCE', targetValue: 5, toleranceValue: 1, displayOrder: 3, mandatory: true, active: true },
            { id: 'tr-gd-r-p9', itemName: 'Lubricating Pressure P9', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'TARGET_TOLERANCE', targetValue: 0.5, toleranceValue: 0.2, displayOrder: 4, mandatory: true, active: true },
            { id: 'tr-gd-r-p11', itemName: 'Priority Pressure P11', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 12, maximumValue: 31, displayOrder: 5, mandatory: true, active: true },
            { id: 'tr-gd-r-pilot', itemName: 'Pilot Reducing Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'TARGET_TOLERANCE', targetValue: 11, toleranceValue: 1, displayOrder: 6, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-trgd-ins',
          name: 'Oil Pressure – Inching Spool Inside',
          displayOrder: 2,
          items: [
            { id: 'tr-gd-i-p1', itemName: 'Main Pressure P1', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 27, maximumValue: 31, displayOrder: 1, mandatory: true, active: true },
            { id: 'tr-gd-i-p4', itemName: 'Inching Pressure P4', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 27, maximumValue: 31, displayOrder: 2, mandatory: true, active: true },
            { id: 'tr-gd-i-p8', itemName: 'Oil Cooler Bypass P8', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'TARGET_TOLERANCE', targetValue: 5, toleranceValue: 1, displayOrder: 3, mandatory: true, active: true },
            { id: 'tr-gd-i-p9', itemName: 'Lubricating Pressure P9', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'TARGET_TOLERANCE', targetValue: 0.5, toleranceValue: 0.2, displayOrder: 4, mandatory: true, active: true },
            { id: 'tr-gd-i-p11', itemName: 'Priority Pressure P11', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 12, maximumValue: 31, displayOrder: 5, mandatory: true, active: true },
            { id: 'tr-gd-i-pilot', itemName: 'Pilot Reducing Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'TARGET_TOLERANCE', targetValue: 11, toleranceValue: 1, displayOrder: 6, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-trgd-clutch',
          name: 'Clutch Condition – Run In',
          displayOrder: 3,
          items: [
            { id: 'tr-gd-clutch-f1', itemName: 'F1', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
            { id: 'tr-gd-clutch-f2', itemName: 'F2', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
            { id: 'tr-gd-clutch-f3', itemName: 'F3', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
            { id: 'tr-gd-clutch-f4', itemName: 'F4', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 4, mandatory: true, active: true },
            { id: 'tr-gd-clutch-f5', itemName: 'F5', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 5, mandatory: true, active: true },
            { id: 'tr-gd-clutch-f6', itemName: 'F6', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 6, mandatory: true, active: true },
            { id: 'tr-gd-clutch-f7', itemName: 'F7', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 7, mandatory: true, active: true },
            { id: 'tr-gd-clutch-f8', itemName: 'F8', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 8, mandatory: true, active: true },
            { id: 'tr-gd-clutch-r1', itemName: 'R1', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 9, mandatory: true, active: true },
            { id: 'tr-gd-clutch-r2', itemName: 'R2', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 10, mandatory: true, active: true },
            { id: 'tr-gd-clutch-r3', itemName: 'R3', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 11, mandatory: true, active: true },
            { id: 'tr-gd-clutch-r4', itemName: 'R4', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 12, mandatory: true, active: true },
            { id: 'tr-gd-clutch-r5', itemName: 'R5', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 13, mandatory: true, active: true },
            { id: 'tr-gd-clutch-r6', itemName: 'R6', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 14, mandatory: true, active: true },
            { id: 'tr-gd-clutch-r7', itemName: 'R7', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 15, mandatory: true, active: true },
            { id: 'tr-gd-clutch-r8', itemName: 'R8', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 16, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-trgd-mod',
          name: 'Modulating Time',
          displayOrder: 4,
          items: [
            { id: 'tr-gd-mod-f', itemName: 'F', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 1, mandatory: true, active: true },
            { id: 'tr-gd-mod-r', itemName: 'R', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 2, mandatory: true, active: true },
            { id: 'tr-gd-mod-h', itemName: 'H', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 3, mandatory: true, active: true },
            { id: 'tr-gd-mod-l', itemName: 'L', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 4, mandatory: true, active: true },
            { id: 'tr-gd-mod-1', itemName: '1', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 5, mandatory: true, active: true },
            { id: 'tr-gd-mod-2', itemName: '2', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 6, mandatory: true, active: true },
            { id: 'tr-gd-mod-3', itemName: '3', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 7, mandatory: true, active: true },
            { id: 'tr-gd-mod-4', itemName: '4', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 8, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-trgd-inch-f',
          name: 'Inching Pressure F Clutch',
          displayOrder: 5,
          items: [
            { id: 'tr-gd-inch-f-s0', itemName: 'Stroke 0 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 27, maximumValue: 34, displayOrder: 1, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s15', itemName: 'Stroke 1.5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 27, maximumValue: 34, displayOrder: 2, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s3', itemName: 'Stroke 3 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 25, maximumValue: 34, displayOrder: 3, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s35', itemName: 'Stroke 3.5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 4, maximumValue: 34, displayOrder: 4, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s4', itemName: 'Stroke 4 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.9, maximumValue: 34, displayOrder: 5, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s45', itemName: 'Stroke 4.5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.8, maximumValue: 34, displayOrder: 6, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s5', itemName: 'Stroke 5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.6, maximumValue: 34, displayOrder: 7, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s55', itemName: 'Stroke 5.5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.5, maximumValue: 34, displayOrder: 8, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s6', itemName: 'Stroke 6 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.4, maximumValue: 34, displayOrder: 9, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s7', itemName: 'Stroke 7 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.2, maximumValue: 34, displayOrder: 10, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s8', itemName: 'Stroke 8 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 2.9, maximumValue: 34, displayOrder: 11, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s20', itemName: 'Stroke 20 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 0.5, maximumValue: 34, displayOrder: 12, mandatory: true, active: true },
            { id: 'tr-gd-inch-f-s235', itemName: 'Stroke 23.5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 0.5, maximumValue: 34, displayOrder: 13, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-trgd-inch-r',
          name: 'Inching Pressure R Clutch',
          displayOrder: 6,
          items: [
            { id: 'tr-gd-inch-r-s0', itemName: 'Stroke 0 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 27, maximumValue: 34, displayOrder: 1, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s15', itemName: 'Stroke 1.5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 27, maximumValue: 34, displayOrder: 2, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s3', itemName: 'Stroke 3 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 25, maximumValue: 34, displayOrder: 3, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s35', itemName: 'Stroke 3.5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 4, maximumValue: 34, displayOrder: 4, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s4', itemName: 'Stroke 4 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.9, maximumValue: 34, displayOrder: 5, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s45', itemName: 'Stroke 4.5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.8, maximumValue: 34, displayOrder: 6, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s5', itemName: 'Stroke 5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.6, maximumValue: 34, displayOrder: 7, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s55', itemName: 'Stroke 5.5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.5, maximumValue: 34, displayOrder: 8, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s6', itemName: 'Stroke 6 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.4, maximumValue: 34, displayOrder: 9, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s7', itemName: 'Stroke 7 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 3.2, maximumValue: 34, displayOrder: 10, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s8', itemName: 'Stroke 8 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 2.9, maximumValue: 34, displayOrder: 11, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s20', itemName: 'Stroke 20 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 0.5, maximumValue: 34, displayOrder: 12, mandatory: true, active: true },
            { id: 'tr-gd-inch-r-s235', itemName: 'Stroke 23.5 mm', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 0.5, maximumValue: 34, displayOrder: 13, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-trgd-leak-noise',
          name: 'Leakage and Noise',
          displayOrder: 7,
          items: [
            { id: 'tr-gd-leak-coupling', itemName: 'Leakage Coupling', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
            { id: 'tr-gd-leak-pto', itemName: 'Leakage PTO', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
            { id: 'tr-gd-leak-tc', itemName: 'Leakage TC', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
            { id: 'tr-gd-leak-trans', itemName: 'Leakage Transmission', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 4, mandatory: true, active: true },
            { id: 'tr-gd-leak-ctrl', itemName: 'Leakage Control Valve', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 5, mandatory: true, active: true },
            { id: 'tr-gd-vib', itemName: 'Abnormal Vibration', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 6, mandatory: true, active: true },
            { id: 'tr-gd-noise', itemName: 'Abnormal Noise', inputType: 'NUMERIC', unit: 'dB', validation: 'MAXIMUM', maximumValue: 103, displayOrder: 7, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 14. N. TRANSMISSION WA
  templates.push(
    createTemplate(
      'tmpl-trans-wa-v2',
      'Transmission WA Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) => p.component === 'TRANSMISSION' && p.unitModel.startsWith('WA'),
      [
        {
          id: 'sec-trwa-press',
          name: 'Oil Pressure',
          displayOrder: 1,
          items: [
            { id: 'tr-wa-main', itemName: 'Main Relief Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 27, maximumValue: 30, displayOrder: 1, mandatory: true, active: true },
            { id: 'tr-wa-reduce', itemName: 'Reducing Valve', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 19, maximumValue: 22, displayOrder: 2, mandatory: true, active: true },
            { id: 'tr-wa-tc', itemName: 'T/C Relief', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 7, maximumValue: 9, displayOrder: 3, mandatory: true, active: true },
            { id: 'tr-wa-mod', itemName: 'Modulating Valve', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 27, maximumValue: 30, displayOrder: 4, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-trwa-mod',
          name: 'Modulating Time',
          displayOrder: 2,
          items: [
            { id: 'tr-wa-mod-1', itemName: '1', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 1, mandatory: true, active: true },
            { id: 'tr-wa-mod-2', itemName: '2', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 2, mandatory: true, active: true },
            { id: 'tr-wa-mod-3', itemName: '3', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 3, mandatory: true, active: true },
            { id: 'tr-wa-mod-4', itemName: '4', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 4, mandatory: true, active: true },
            { id: 'tr-wa-mod-f', itemName: 'Forward', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 5, mandatory: true, active: true },
            { id: 'tr-wa-mod-r', itemName: 'Reverse', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.5, maximumValue: 0.8, displayOrder: 6, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  // 15. O. TORQFLOW
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
          name: 'Oil Pressure',
          displayOrder: 1,
          items: [
            { id: 'tf-press-main', itemName: 'Main Relief', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 32, maximumValue: 36, displayOrder: 1, mandatory: true, active: true },
            { id: 'tf-press-outlet', itemName: 'T/C Outlet', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 4, maximumValue: 6, displayOrder: 2, mandatory: true, active: true },
            { id: 'tf-press-dev-lu', itemName: 'Deviation Lock Up Off/On', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 0.1, maximumValue: 0.8, displayOrder: 3, mandatory: true, active: true },
            { id: 'tf-press-dev-lub', itemName: 'Deviation Lubrication Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 0.1, maximumValue: 0.5, displayOrder: 4, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-tf-speed',
          name: 'T/M Speed',
          displayOrder: 2,
          items: [
            { id: 'tf-speed-f1', itemName: 'F1', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
            { id: 'tf-speed-f2', itemName: 'F2', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
            { id: 'tf-speed-f3', itemName: 'F3', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
            { id: 'tf-speed-f4', itemName: 'F4', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 4, mandatory: true, active: true },
            { id: 'tf-speed-f5', itemName: 'F5', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 5, mandatory: true, active: true },
            { id: 'tf-speed-f6', itemName: 'F6', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 6, mandatory: true, active: true },
            { id: 'tf-speed-f7', itemName: 'F7', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 7, mandatory: true, active: true },
            { id: 'tf-speed-r1', itemName: 'R1', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 8, mandatory: true, active: true },
            { id: 'tf-speed-r2', itemName: 'R2', inputType: 'GOOD/NOT GOOD', validation: 'NONE', displayOrder: 9, mandatory: true, active: true },
          ],
        },
        {
          id: 'sec-tf-fill-press',
          name: 'Fill Time and Pressure',
          displayOrder: 3,
          items: [
            { id: 'tf-fill-l-time', itemName: 'L: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.2, maximumValue: 0.8, displayOrder: 1, mandatory: true, active: true },
            { id: 'tf-fill-l-press', itemName: 'L: Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 20, maximumValue: 24, displayOrder: 2, mandatory: true, active: true },
            { id: 'tf-fill-r-time', itemName: 'R: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.4, maximumValue: 1.8, displayOrder: 3, mandatory: true, active: true },
            { id: 'tf-fill-r-press', itemName: 'R: Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 21, maximumValue: 25, displayOrder: 4, mandatory: true, active: true },
            { id: 'tf-fill-1st-time', itemName: '1st: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.2, maximumValue: 0.8, displayOrder: 5, mandatory: true, active: true },
            { id: 'tf-fill-1st-press', itemName: '1st: Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 20, maximumValue: 24, displayOrder: 6, mandatory: true, active: true },
            { id: 'tf-fill-2nd-time', itemName: '2nd: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.2, maximumValue: 0.8, displayOrder: 7, mandatory: true, active: true },
            { id: 'tf-fill-2nd-press', itemName: '2nd: Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 20, maximumValue: 24, displayOrder: 8, mandatory: true, active: true },
            { id: 'tf-fill-3rd-time', itemName: '3rd: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.2, maximumValue: 0.8, displayOrder: 9, mandatory: true, active: true },
            { id: 'tf-fill-3rd-press', itemName: '3rd: Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 21, maximumValue: 25, displayOrder: 10, mandatory: true, active: true },
            { id: 'tf-fill-4th-time', itemName: '4th: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.2, maximumValue: 0.8, displayOrder: 11, mandatory: true, active: true },
            { id: 'tf-fill-4th-press', itemName: '4th: Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 19.5, maximumValue: 23.5, displayOrder: 12, mandatory: true, active: true },
            { id: 'tf-fill-h-time', itemName: 'H: Fill Time', inputType: 'NUMERIC', unit: 'second', validation: 'RANGE', minimumValue: 0.2, maximumValue: 0.7, displayOrder: 13, mandatory: true, active: true },
            { id: 'tf-fill-h-press', itemName: 'H: Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 21, maximumValue: 25, displayOrder: 14, mandatory: true, active: true },
            { id: 'tf-fill-lu-press', itemName: 'Lock Up: Pressure', inputType: 'NUMERIC', unit: 'kg/cm²', validation: 'RANGE', minimumValue: 20.5, maximumValue: 24.5, displayOrder: 15, mandatory: true, active: true },
            { id: 'tf-error-code', itemName: 'Error Code', inputType: 'TEXT', validation: 'NONE', displayOrder: 16, mandatory: false, active: true },
          ],
        },
        {
          id: 'sec-tf-leak-noise',
          name: 'Leakage and Noise',
          displayOrder: 4,
          items: [
            { id: 'tf-leak-coupling', itemName: 'Leakage Coupling', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 1, mandatory: true, active: true },
            { id: 'tf-leak-pto', itemName: 'Leakage PTO', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 2, mandatory: true, active: true },
            { id: 'tf-leak-tc', itemName: 'Leakage TC', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 3, mandatory: true, active: true },
            { id: 'tf-leak-trans', itemName: 'Leakage Transmission', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 4, mandatory: true, active: true },
            { id: 'tf-leak-ctrl', itemName: 'Leakage Control Valve', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 5, mandatory: true, active: true },
            { id: 'tf-vib', itemName: 'Abnormal Vibration', inputType: 'Dropdown', options: ['YES', 'NO'], validation: 'NONE', displayOrder: 6, mandatory: true, active: true },
            { id: 'tf-noise', itemName: 'Abnormal Noise', inputType: 'NUMERIC', unit: 'dB', validation: 'MAXIMUM', maximumValue: 95, displayOrder: 7, mandatory: true, active: true },
          ],
        },
      ]
    )
  );

  return templates;
}
