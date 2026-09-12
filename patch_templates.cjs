const fs = require('fs');
let content = fs.readFileSync('src/data/fifteenTemplates.ts', 'utf-8');

// Engine
content = content.replace("'tmpl-dyno-engine-universal',", "'tmpl-eng-dyno-v1',");

// Transmission GD
content = content.replace("'tmpl-transmission-gd-v2',", "'tmpl-trans-gd-v2',");
content = content.replace("'Transmission GD Testbench',", "'Transmission GD/WD Testbench',");

// Transmission WA
content = content.replace("'tmpl-transmission-wa-v2',", "'tmpl-trans-wa-v2',");

// Torque Converter (Controlled Performance Only -> Torque Converter)
content = content.replace("'tmpl-controlled-performance-only',", "'tmpl-torque-converter-performance-v1',");
content = content.replace("'Controlled Performance Only',", "'One Performance checking point: GOOD / NOT GOOD',");

// Axle and Final Drive HD split
const axleFdText = `  // 2.9 Axle and Final Drive HD Testbench (7 products)
  templates.push(
    createTemplate(
      'tmpl-axle-fd-hd-v2',
      'Axle and Final Drive HD Testbench',
      'PT-PPM',
      'Hydraulic Test',
      (p) =>
        p.compGroup === 'PT-PPM' &&
        (p.component.includes('FINAL DRIVE') || p.component.includes('AXLE')) &&
        p.unitModel.startsWith('HD'),
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
      ],
      'Shared Testbench checksheet for 7 Axle Assy and Final Drive HD series products.'
    )
  );`;

const newAxleFdText = `  // 2.9A Axle HD Testbench
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
  );`;

content = content.replace(axleFdText, newAxleFdText);

fs.writeFileSync('src/data/fifteenTemplates.ts', content);
