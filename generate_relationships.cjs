const fs = require('fs');
const products = JSON.parse(fs.readFileSync('products.json', 'utf-8'));

const mappings = {};

for (const p of products) {
  const normComp = (p.component || '').toUpperCase().trim();
  const normUnit = (p.unitModel || '').toUpperCase().trim();
  const id = (p.compGroup + '-' + p.unitModel + '-' + p.component).replace(/[^a-zA-Z0-9-]/g, '-').toUpperCase();
  
  let templateId = 'tmpl-controlled-performance-only';
  let templateName = 'Controlled Performance Only';
  let compatibleLineIds = [];
  
  if (p.compGroup === 'Engine') {
    templateId = 'tmpl-eng-dyno-v1';
    templateName = 'Engine Dynotest';
    compatibleLineIds = ['dyno-1', 'dyno-2', 'dyno-3'];
  } else if (p.compGroup === 'Cylinder') {
    templateId = 'tmpl-cylinder-testbench-v2';
    templateName = 'Cylinder Testbench';
    compatibleLineIds = ['tb-4-cyl'];
  } else if (p.compGroup === 'PT-PPM') {
    if (normComp.includes('PUMP') || normComp === 'FAN PUMP' || normComp === 'MAIN PUMP' || normComp === 'MAIN PUMP NO 1' || normComp === 'MAIN PUMP NO 2' || normComp === 'SWING PUMP' || normComp === 'LOADER PUMP' || normComp === 'STEERING PUMP' || normComp === 'SWITCH PUMP' || normComp === 'PISTON PUMP' || normComp === 'HYDRAULIC PUMP') {
      templateId = 'tmpl-pump-testbench-v2';
      templateName = 'Hydraulic Pump Testbench';
      compatibleLineIds = ['tb-1'];
    } else if (normComp.includes('MOTOR') || normComp.includes('MACHINERY') || normComp === 'SWING MOTOR' || normComp === 'TRAVEL MOTOR' || normComp === 'HYDRAULIC MOTOR' || normComp === 'SWING MACHINERY') {
      templateId = 'tmpl-motor-testbench-v2';
      templateName = 'Hydraulic Motor Testbench';
      compatibleLineIds = ['tb-1'];
    } else if (normComp === 'POWER TAKE OFF' || normComp.includes('POWER TAKE OFF')) {
      templateId = 'tmpl-pto-testbench-v2';
      templateName = 'PTO Testbench';
      compatibleLineIds = ['tb-2', 'mobile-tb'];
    } else if (normComp === 'POWER MODULE' || normComp.includes('POWER MODULE')) {
      templateId = 'tmpl-power-module-v2';
      templateName = 'Power Module Testbench';
      compatibleLineIds = ['tb-2'];
    } else if (normComp === 'TORQFLOW ASSY' || normComp.includes('TORQFLOW')) {
      templateId = 'tmpl-torqflow-v2';
      templateName = 'Torqflow Testbench';
      compatibleLineIds = ['tb-2'];
    } else if (normComp === 'TORQUE CONVERTER' || normComp.includes('TORQUE CONVERTER')) {
      templateId = 'tmpl-torque-converter-performance-v1';
      templateName = 'One Performance checking point: GOOD / NOT GOOD';
      compatibleLineIds = ['tb-1'];
    } else if (normComp === 'TRANSMISSION' || normComp.includes('TRANSMISSION')) {
      if (normUnit.startsWith('GD') || normUnit.startsWith('WD')) {
        templateId = 'tmpl-trans-gd-v2';
        templateName = 'Transmission GD/WD Testbench';
        compatibleLineIds = ['tb-2'];
      } else if (normUnit.startsWith('WA')) {
        templateId = 'tmpl-trans-wa-v2';
        templateName = 'Transmission WA Testbench';
        compatibleLineIds = ['tb-2'];
      }
    } else if (normComp === 'DIFFERENTIAL' || normComp === 'DIFFERENTIAL FRONT' || normComp === 'DIFFERENTIAL REAR' || normComp === 'DIFFERENTIAL CENTER' || normComp.includes('DIFFERENTIAL')) {
      templateId = 'tmpl-differential-v2';
      templateName = 'Differential Testbench';
      compatibleLineIds = ['tb-3', 'mobile-tb'];
    } else if (normComp === 'FRONT BRAKE LEFT' || normComp === 'FRONT BRAKE RIGHT' || normComp === 'FRONT BRAKE' || normComp === 'WHEEL BRAKE' || normComp === 'BRAKE' || normComp === 'STEERING BRAKE' || normComp === 'STEERING BRAKE LEFT' || normComp === 'STEERING BRAKE RIGHT' || normComp === 'FRONT AXLE' || normComp === 'AXLE ASSY FRONT LEFT' || normComp === 'AXLE ASSY FRONT RIGHT' || normComp.includes('BRAKE') || (normComp.includes('AXLE') && normComp.includes('FRONT'))) {
      templateId = 'tmpl-front-brake-axle-v2';
      templateName = 'Front Brake and Front Axle Testbench';
      compatibleLineIds = ['tb-1', 'tb-3', 'mobile-tb'];
    } else if (normComp.includes('FINAL DRIVE') || normComp.includes('AXLE')) {
      if (normUnit.startsWith('GD')) {
        templateId = 'tmpl-final-drive-gd-v2';
        templateName = 'Final Drive GD Testbench';
        compatibleLineIds = ['tb-3'];
      } else if (normUnit.startsWith('PC') || normUnit.startsWith('D') || normUnit.startsWith('DZ')) {
        templateId = 'tmpl-final-drive-pc-dz-v2';
        templateName = 'Final Drive PC/Dozer Testbench';
        compatibleLineIds = ['tb-3', 'mobile-tb'];
      } else if (normUnit.startsWith('HD') && normComp.includes('AXLE')) {
        templateId = 'tmpl-axle-hd-v1';
        templateName = 'Axle HD Testbench';
        compatibleLineIds = ['tb-3', 'mobile-tb'];
      } else if (normUnit.startsWith('HD') || normUnit.startsWith('HM') || normUnit.startsWith('WA') || normUnit.startsWith('WD')) {
        templateId = 'tmpl-final-drive-wheel-v1';
        templateName = 'Final Drive Wheel Testbench';
        compatibleLineIds = ['tb-3', 'mobile-tb'];
      }
    }
  }
  
  mappings[id] = { templateId, templateName, compatibleLineIds };
}

fs.writeFileSync('mappings.json', JSON.stringify(mappings, null, 2));
