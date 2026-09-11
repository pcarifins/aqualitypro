import { FinalTestTemplateRelationship } from '../types';
import { ALL_REQUIRED_PRODUCTS, getProductModelId, ProductDefinition } from './productMasterSeed';
import { getStandardProfileForProduct } from './standardProfilesMaster';

export function resolveTemplateIdAndLinesForProduct(p: ProductDefinition): {
  templateId: string;
  templateName: string;
  compatibleLineIds: string[];
} {
  const normComp = (p.component || '').toUpperCase().trim();
  const normUnit = (p.unitModel || '').toUpperCase().trim();

  // 1. Engine
  if (p.compGroup === 'Engine') {
    return {
      templateId: 'tmpl-dyno-engine-universal',
      templateName: 'Engine Dynotest Performance Benchmark',
      compatibleLineIds: ['dyno-1', 'dyno-2', 'dyno-3'],
    };
  }

  // 2. Cylinder
  if (p.compGroup === 'Cylinder') {
    return {
      templateId: 'tmpl-cylinder-testbench-v2',
      templateName: 'Cylinder Testbench Quality Standard',
      compatibleLineIds: ['tb-4-cyl'],
    };
  }

  // 3. PT-PPM Families
  // A. Pumps
  if (
    normComp.includes('PUMP') ||
    normComp === 'FAN PUMP' ||
    normComp === 'MAIN PUMP' ||
    normComp === 'MAIN PUMP NO 1' ||
    normComp === 'MAIN PUMP NO 2' ||
    normComp === 'SWING PUMP' ||
    normComp === 'LOADER PUMP' ||
    normComp === 'STEERING PUMP' ||
    normComp === 'SWITCH PUMP' ||
    normComp === 'PISTON PUMP' ||
    normComp === 'HYDRAULIC PUMP'
  ) {
    return {
      templateId: 'tmpl-pump-testbench-v2',
      templateName: 'Pump Testbench Dynamic Performance',
      compatibleLineIds: ['tb-1'],
    };
  }

  // B. Motors
  if (
    normComp.includes('MOTOR') ||
    normComp.includes('MACHINERY') ||
    normComp === 'SWING MOTOR' ||
    normComp === 'TRAVEL MOTOR' ||
    normComp === 'HYDRAULIC MOTOR' ||
    normComp === 'SWING MACHINERY'
  ) {
    return {
      templateId: 'tmpl-motor-testbench-v2',
      templateName: 'Motor Testbench Dynamic Performance',
      compatibleLineIds: ['tb-1'],
    };
  }

  // C. Torque Converter
  if (normComp === 'TORQUE CONVERTER' || normComp.includes('TORQUE CONVERTER')) {
    return {
      templateId: 'tmpl-tc-perf-v2',
      templateName: 'Torque Converter Performance Testbench',
      compatibleLineIds: ['tb-1'],
    };
  }

  // D. Torqflow
  if (normComp === 'TORQFLOW ASSY' || normComp.includes('TORQFLOW')) {
    return {
      templateId: 'tmpl-torqflow-v2',
      templateName: 'Torqflow Transmission Testbench',
      compatibleLineIds: ['tb-2'],
    };
  }

  // E. Transmission
  if (normComp === 'TRANSMISSION' || normComp.includes('TRANSMISSION')) {
    return {
      templateId: 'tmpl-transmission-v2',
      templateName: 'Transmission Multi-Range Testbench',
      compatibleLineIds: ['tb-2'],
    };
  }

  // F. PTO
  if (normComp === 'POWER TAKE OFF' || normComp.includes('POWER TAKE OFF')) {
    return {
      templateId: 'tmpl-pto-testbench-v2',
      templateName: 'Power Take Off (PTO) Testbench',
      compatibleLineIds: ['tb-2', 'mobile-tb'],
    };
  }

  // G. Power Module
  if (normComp === 'POWER MODULE' || normComp.includes('POWER MODULE')) {
    return {
      templateId: 'tmpl-power-module-v2',
      templateName: 'Power Module Drive Testbench',
      compatibleLineIds: ['tb-2'],
    };
  }

  // H. Final Drive HD & Axle
  if (
    normComp.includes('FINAL DRIVE') &&
    (normUnit.startsWith('HD') || normUnit.startsWith('HM'))
  ) {
    return {
      templateId: 'tmpl-axle-fd-hd-v2',
      templateName: 'Final Drive HD & Rigid Axle Testbench',
      compatibleLineIds: ['tb-3', 'mobile-tb'],
    };
  }

  // I. Final Drive GD
  if (normComp.includes('FINAL DRIVE') && normUnit.startsWith('GD')) {
    return {
      templateId: 'tmpl-final-drive-gd-v2',
      templateName: 'Final Drive Motor Grader (GD) Testbench',
      compatibleLineIds: ['tb-3'],
    };
  }

  // J. Final Drive PC / DZ
  if (
    normComp.includes('FINAL DRIVE') ||
    (normComp.includes('AXLE') && !normComp.includes('FRONT'))
  ) {
    return {
      templateId: 'tmpl-final-drive-pc-dz-v2',
      templateName: 'Final Drive PC/DZ Track Drive Testbench',
      compatibleLineIds: ['tb-3', 'mobile-tb'],
    };
  }

  // K. Differential
  if (
    normComp === 'DIFFERENTIAL' ||
    normComp === 'DIFFERENTIAL FRONT' ||
    normComp === 'DIFFERENTIAL REAR' ||
    normComp === 'DIFFERENTIAL CENTER' ||
    normComp.includes('DIFFERENTIAL')
  ) {
    return {
      templateId: 'tmpl-differential-v2',
      templateName: 'Differential & Bevel Gear Testbench',
      compatibleLineIds: ['tb-3', 'mobile-tb'],
    };
  }

  // L. Front Axle
  if (
    normComp === 'FRONT AXLE' ||
    normComp === 'AXLE ASSY FRONT LEFT' ||
    normComp === 'AXLE ASSY FRONT RIGHT' ||
    normComp.includes('FRONT AXLE') ||
    normComp.includes('AXLE ASSY FRONT')
  ) {
    return {
      templateId: 'tmpl-front-axle-v2',
      templateName: 'Front Axle Oscillation & Steering Testbench',
      compatibleLineIds: ['tb-3', 'mobile-tb'],
    };
  }

  // M. Front Brake & Wheel Brake
  if (
    normComp === 'FRONT BRAKE LEFT' ||
    normComp === 'FRONT BRAKE RIGHT' ||
    normComp === 'FRONT BRAKE' ||
    normComp === 'WHEEL BRAKE' ||
    normComp === 'BRAKE' ||
    normComp === 'STEERING BRAKE' ||
    normComp.includes('BRAKE')
  ) {
    return {
      templateId: 'tmpl-front-brake-v2',
      templateName: 'Brake Assembly Pressure & Actuation Testbench',
      compatibleLineIds: ['tb-1', 'mobile-tb'],
    };
  }

  // Safe fallback for unclassified PT-PPM components (never PTO)
  return {
    templateId: 'tmpl-contingency-performance-only',
    templateName: 'Performance-Only Contingency Testbench',
    compatibleLineIds: ['tb-1', 'tb-2', 'tb-3'],
  };
}

export function buildAuthoritativeRelationships(): FinalTestTemplateRelationship[] {
  const relationships: FinalTestTemplateRelationship[] = [];

  for (const p of ALL_REQUIRED_PRODUCTS) {
    const productId = getProductModelId(p);
    const finalProcess: 'DYNOTEST' | 'TESTBENCH' =
      p.compGroup === 'Engine' ? 'DYNOTEST' : 'TESTBENCH';

    const { templateId, templateName, compatibleLineIds } =
      resolveTemplateIdAndLinesForProduct(p);

    const standardProfileId = getStandardProfileForProduct(
      productId,
      p.unitModel,
      p.compGroup,
      p.component
    );

    const relId = `rel-${productId}-${finalProcess.toLowerCase()}`;

    relationships.push({
      relationshipId: relId,
      productId,
      componentName: p.component,
      unitModel: p.unitModel,
      productGroup: p.compGroup,
      subGroup: p.subGroup,
      finalProcess,
      templateId,
      templateName,
      standardProfileId,
      compatibleLineIds,
      status: 'ACTIVE',
      version: 1,
      effectiveDate: '2026-03-01T00:00:00Z',
      approvedBy: 'Quality Engineering System',
      approvedDate: '2026-03-01T00:00:00Z',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-01T00:00:00Z',
    });
  }

  return relationships;
}

export const INITIAL_TEMPLATE_RELATIONSHIPS: FinalTestTemplateRelationship[] =
  buildAuthoritativeRelationships();
