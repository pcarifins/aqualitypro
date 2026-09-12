import { FinalTestTemplateRelationship } from '../types';
import { ALL_REQUIRED_PRODUCTS, getProductModelId, ProductDefinition } from './productMasterSeed';
import { getStandardProfileForProduct } from './standardProfilesMaster';

export function resolveTemplateIdAndLinesForProduct(p: ProductDefinition): {
  templateId: string;
  templateName: string;
  compatibleLineIds: string[];
  relationshipMode: 'STANDARD' | 'PERFORMANCE_ONLY';
  configurationStatus: 'APPROVED' | 'TEMPORARY_APPROVED';
} {
  const normComp = (p.component || '').toUpperCase().trim();
  const normUnit = (p.unitModel || '').toUpperCase().trim();

  // 1. Engine (23 products) -> Engine Dynotest
  if (p.compGroup === 'Engine') {
    return {
      templateId: 'tmpl-dyno-engine-universal',
      templateName: 'Engine Dynotest',
      compatibleLineIds: ['dyno-1', 'dyno-2', 'dyno-3'],
      relationshipMode: 'STANDARD',
      configurationStatus: 'APPROVED',
    };
  }

  // 2. Cylinder (38 products) -> Cylinder Testbench
  if (p.compGroup === 'Cylinder') {
    return {
      templateId: 'tmpl-cylinder-testbench-v2',
      templateName: 'Cylinder Testbench',
      compatibleLineIds: ['tb-4-cyl'],
      relationshipMode: 'STANDARD',
      configurationStatus: 'APPROVED',
    };
  }

  // 3. PT-PPM (108 products)
  // 3.1 Hydraulic Pumps (11 products)
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
      templateName: 'Hydraulic Pump Testbench',
      compatibleLineIds: ['tb-1'],
      relationshipMode: 'STANDARD',
      configurationStatus: 'APPROVED',
    };
  }

  // 3.2 Hydraulic Motors (13 products)
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
      templateName: 'Hydraulic Motor Testbench',
      compatibleLineIds: ['tb-1'],
      relationshipMode: 'STANDARD',
      configurationStatus: 'APPROVED',
    };
  }

  // 3.3 PTO (4 products)
  if (normComp === 'POWER TAKE OFF' || normComp.includes('POWER TAKE OFF')) {
    return {
      templateId: 'tmpl-pto-testbench-v2',
      templateName: 'PTO Testbench',
      compatibleLineIds: ['tb-2', 'mobile-tb'],
      relationshipMode: 'STANDARD',
      configurationStatus: 'APPROVED',
    };
  }

  // 3.4 Power Module (3 products)
  if (normComp === 'POWER MODULE' || normComp.includes('POWER MODULE')) {
    return {
      templateId: 'tmpl-power-module-v2',
      templateName: 'Power Module Testbench',
      compatibleLineIds: ['tb-2'],
      relationshipMode: 'STANDARD',
      configurationStatus: 'APPROVED',
    };
  }

  // 3.5 Torqflow (9 products)
  if (normComp === 'TORQFLOW ASSY' || normComp.includes('TORQFLOW')) {
    return {
      templateId: 'tmpl-torqflow-v2',
      templateName: 'Torqflow Testbench',
      compatibleLineIds: ['tb-2'],
      relationshipMode: 'STANDARD',
      configurationStatus: 'APPROVED',
    };
  }

  // 3.6 Torque Converter (1 product: WA600-3) -> Controlled Performance Only (part of 23 approved)
  if (normComp === 'TORQUE CONVERTER' || normComp.includes('TORQUE CONVERTER')) {
    return {
      templateId: 'tmpl-controlled-performance-only',
      templateName: 'Controlled Performance Only',
      compatibleLineIds: ['tb-1'],
      relationshipMode: 'PERFORMANCE_ONLY',
      configurationStatus: 'TEMPORARY_APPROVED',
    };
  }

  // 3.7 Transmission (4 products: 3 GD series, 1 WA series, 1 WD series in Perf Only)
  if (normComp === 'TRANSMISSION' || normComp.includes('TRANSMISSION')) {
    if (normUnit.startsWith('GD')) {
      return {
        templateId: 'tmpl-transmission-gd-v2',
        templateName: 'Transmission GD Testbench',
        compatibleLineIds: ['tb-2'],
        relationshipMode: 'STANDARD',
        configurationStatus: 'APPROVED',
      };
    }
    if (normUnit.startsWith('WA')) {
      return {
        templateId: 'tmpl-transmission-wa-v2',
        templateName: 'Transmission WA Testbench',
        compatibleLineIds: ['tb-2'],
        relationshipMode: 'STANDARD',
        configurationStatus: 'APPROVED',
      };
    }
    // Transmission WD600-3 -> Controlled Performance Only
    return {
      templateId: 'tmpl-controlled-performance-only',
      templateName: 'Controlled Performance Only',
      compatibleLineIds: ['tb-2'],
      relationshipMode: 'PERFORMANCE_ONLY',
      configurationStatus: 'TEMPORARY_APPROVED',
    };
  }

  // 3.8 Differential (15 products)
  if (
    normComp === 'DIFFERENTIAL' ||
    normComp === 'DIFFERENTIAL FRONT' ||
    normComp === 'DIFFERENTIAL REAR' ||
    normComp === 'DIFFERENTIAL CENTER' ||
    normComp.includes('DIFFERENTIAL')
  ) {
    return {
      templateId: 'tmpl-differential-v2',
      templateName: 'Differential Testbench',
      compatibleLineIds: ['tb-3', 'mobile-tb'],
      relationshipMode: 'STANDARD',
      configurationStatus: 'APPROVED',
    };
  }

  // 3.9 Front Brake & Front Axle (6 products)
  if (
    normComp === 'FRONT BRAKE LEFT' ||
    normComp === 'FRONT BRAKE RIGHT' ||
    normComp === 'FRONT BRAKE' ||
    normComp === 'WHEEL BRAKE' ||
    normComp === 'BRAKE' ||
    normComp === 'STEERING BRAKE' ||
    normComp === 'STEERING BRAKE LEFT' ||
    normComp === 'STEERING BRAKE RIGHT' ||
    normComp === 'FRONT AXLE' ||
    normComp === 'AXLE ASSY FRONT LEFT' ||
    normComp === 'AXLE ASSY FRONT RIGHT' ||
    normComp.includes('BRAKE') ||
    (normComp.includes('AXLE') && normComp.includes('FRONT'))
  ) {
    return {
      templateId: 'tmpl-front-brake-axle-v2',
      templateName: 'Front Brake and Front Axle Testbench',
      compatibleLineIds: ['tb-1', 'tb-3', 'mobile-tb'],
      relationshipMode: 'STANDARD',
      configurationStatus: 'APPROVED',
    };
  }

  // 3.10 Final Drive and Axle Families
  if (normComp.includes('FINAL DRIVE') || normComp.includes('AXLE')) {
    // Final Drive GD series (3 products)
    if (normUnit.startsWith('GD')) {
      return {
        templateId: 'tmpl-final-drive-gd-v2',
        templateName: 'Final Drive GD Testbench',
        compatibleLineIds: ['tb-3'],
        relationshipMode: 'STANDARD',
        configurationStatus: 'APPROVED',
      };
    }

    // Axle and Final Drive HD series (7 products)
    if (normUnit.startsWith('HD')) {
      return {
        templateId: 'tmpl-axle-fd-hd-v2',
        templateName: 'Axle and Final Drive HD Testbench',
        compatibleLineIds: ['tb-3', 'mobile-tb'],
        relationshipMode: 'STANDARD',
        configurationStatus: 'APPROVED',
      };
    }

    // Final Drive PC and D/DZ series (10 products)
    if (normUnit.startsWith('PC') || normUnit.startsWith('D') || normUnit.startsWith('DZ')) {
      return {
        templateId: 'tmpl-final-drive-pc-dz-v2',
        templateName: 'Final Drive PC–DZ Testbench',
        compatibleLineIds: ['tb-3', 'mobile-tb'],
        relationshipMode: 'STANDARD',
        configurationStatus: 'APPROVED',
      };
    }

    // Final Drive HM, WA, WD series (21 products) -> Controlled Performance Only
    return {
      templateId: 'tmpl-controlled-performance-only',
      templateName: 'Controlled Performance Only',
      compatibleLineIds: ['tb-3', 'mobile-tb'],
      relationshipMode: 'PERFORMANCE_ONLY',
      configurationStatus: 'TEMPORARY_APPROVED',
    };
  }

  // Explicit Fallback to Controlled Performance Only
  return {
    templateId: 'tmpl-controlled-performance-only',
    templateName: 'Controlled Performance Only',
    compatibleLineIds: ['tb-1', 'tb-2', 'tb-3'],
    relationshipMode: 'PERFORMANCE_ONLY',
    configurationStatus: 'TEMPORARY_APPROVED',
  };
}

export function buildAuthoritativeRelationships(): FinalTestTemplateRelationship[] {
  const relationships: FinalTestTemplateRelationship[] = [];

  for (const p of ALL_REQUIRED_PRODUCTS) {
    const productId = getProductModelId(p);
    const finalProcess: 'DYNOTEST' | 'TESTBENCH' =
      p.compGroup === 'Engine' ? 'DYNOTEST' : 'TESTBENCH';

    const { templateId, templateName, compatibleLineIds, relationshipMode, configurationStatus } =
      resolveTemplateIdAndLinesForProduct(p);

    const standardProfileId = getStandardProfileForProduct(
      productId,
      p.unitModel,
      p.compGroup,
      p.component
    );

    const relId = `rel-${productId}-${finalProcess.toLowerCase()}`;

    relationships.push({
      id: relId,
      relationshipId: relId,
      productId,
      component: p.component,
      componentName: p.component,
      unitModel: p.unitModel,
      compGroup: p.compGroup,
      productGroup: p.compGroup,
      subGroup: p.subGroup || null,
      testingProcess: finalProcess,
      finalProcess,
      templateId,
      templateName,
      standardProfileId,
      compatibleLineIds,
      relationshipMode,
      configurationStatus,
      active: true,
      status: 'ACTIVE',
      revision: 1,
      version: 1,
      effectiveDate: '2026-03-01T00:00:00Z',
      approvedBy: 'Quality Engineering System',
      approvedDate: '2026-03-01T00:00:00Z',
      approvedAt: '2026-03-01T00:00:00Z',
      createdBy: 'Quality Engineering System',
      createdAt: '2026-03-01T00:00:00Z',
      updatedBy: 'Quality Engineering System',
      updatedAt: '2026-03-01T00:00:00Z',
    });
  }

  return relationships;
}

export const INITIAL_TEMPLATE_RELATIONSHIPS: FinalTestTemplateRelationship[] =
  buildAuthoritativeRelationships();
