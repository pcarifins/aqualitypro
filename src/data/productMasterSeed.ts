import { ProductModel, CompGroup, ChecksheetTemplate, ChecksheetSection } from '../types';

export interface RequiredProductDefinition {
  compGroup: CompGroup;
  subGroup?: 'PT' | 'PPM' | null;
  unitModel: string;
  component: string;
}

// 6A. ENGINE PRODUCT MASTER (23 items)
export const REQUIRED_ENGINE_PRODUCTS: RequiredProductDefinition[] = [
  { compGroup: 'Engine', subGroup: null, unitModel: 'D155A-6R', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'D375A-5', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'D375A-6R', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'GD705A-5', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'GD825A-2', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'HB365-1', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'HD465-7', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'HD465-7R', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'HD785-7', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'HM400-3', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'HM400-3R', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'PC1250-11R', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'PC1250SP-8R', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'PC2000-8R', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'PC300-8', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'PC300-8M0', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'PC750SE-7', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'PC850-8R1', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'WA600-3', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'WA600-6R', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'WA800-3', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'WA900-8R', component: 'ENGINE ASSY' },
  { compGroup: 'Engine', subGroup: null, unitModel: 'WD600-3', component: 'ENGINE ASSY' },
];

// 6B. PT PRODUCT MASTER (89 items)
export const REQUIRED_PT_PRODUCTS: RequiredProductDefinition[] = [
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'D155A-6R', component: 'FINAL DRIVE LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'D155A-6R', component: 'FINAL DRIVE RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'D155A-6R', component: 'POWER MODULE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'D375A-5', component: 'POWER MODULE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'D375A-6R', component: 'FINAL DRIVE LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'D375A-6R', component: 'FINAL DRIVE RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'D375A-6R', component: 'POWER MODULE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'D375A-6R', component: 'STEERING BRAKE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'GD705A-5', component: 'FINAL DRIVE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'GD705A-5', component: 'TRANSMISSION' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'GD755A-5', component: 'FINAL DRIVE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'GD755A-5', component: 'TRANSMISSION' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'GD825A-2', component: 'FINAL DRIVE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'GD825A-2', component: 'TRANSMISSION' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD1500-7', component: 'AXLE ASSY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD1500-7', component: 'TORQFLOW ASSY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD465-7', component: 'FINAL DRIVE RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD465-7', component: 'TORQFLOW ASSY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD465-7R', component: 'DIFFERENTIAL' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD465-7R', component: 'FINAL DRIVE LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD465-7R', component: 'FINAL DRIVE RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD465-7R', component: 'TORQFLOW ASSY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD785-7', component: 'AXLE ASSY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD785-7', component: 'AXLE ASSY FRONT LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD785-7', component: 'AXLE ASSY FRONT RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD785-7', component: 'DIFFERENTIAL' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD785-7', component: 'FINAL DRIVE LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD785-7', component: 'FINAL DRIVE RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD785-7', component: 'FRONT BRAKE LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD785-7', component: 'FRONT BRAKE RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HD785-7', component: 'TORQFLOW ASSY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-2R', component: 'DIFFERENTIAL CENTER' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-2R', component: 'DIFFERENTIAL FRONT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-2R', component: 'DIFFERENTIAL REAR' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-2R', component: 'FINAL DRIVE CENTER LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-2R', component: 'FINAL DRIVE REAR RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-2R', component: 'TORQFLOW ASSY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-3R', component: 'DIFFERENTIAL CENTER' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-3R', component: 'DIFFERENTIAL FRONT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-3R', component: 'DIFFERENTIAL REAR' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-3R', component: 'FINAL DRIVE CENTER LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-3R', component: 'FINAL DRIVE CENTER RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-3R', component: 'FINAL DRIVE FRONT LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-3R', component: 'FINAL DRIVE FRONT RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-3R', component: 'FINAL DRIVE REAR LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-3R', component: 'FINAL DRIVE REAR RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'HM400-3R', component: 'TORQFLOW ASSY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC1250-11R', component: 'SWING MACHINERY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC1250SP-11R', component: 'POWER TAKE OFF' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC1250SP-11R', component: 'SWING MACHINERY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC1250SP-8R', component: 'FINAL DRIVE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC1250SP-8R', component: 'POWER TAKE OFF' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC1250SP-8R', component: 'SWING MACHINERY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC2000-11R', component: 'FINAL DRIVE LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC2000-8', component: 'FINAL DRIVE LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC2000-8', component: 'FINAL DRIVE RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC2000-8', component: 'POWER TAKE OFF' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC2000-8', component: 'SWING MACHINERY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC400-8', component: 'FINAL DRIVE LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC750SE-7', component: 'FINAL DRIVE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC750SE-7', component: 'POWER TAKE OFF' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'PC750SE-7', component: 'SWING MACHINERY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA500-6R', component: 'FINAL DRIVE FRONT LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA500-6R', component: 'FINAL DRIVE FRONT RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA500-6R', component: 'FINAL DRIVE REAR LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA500-6R', component: 'FINAL DRIVE REAR RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA600-3', component: 'DIFFERENTIAL REAR' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA600-3', component: 'TORQUE CONVERTER' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA600-3', component: 'TRANSMISSION' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA600-6R', component: 'DIFFERENTIAL FRONT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA600-6R', component: 'DIFFERENTIAL REAR' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA600-6R', component: 'FINAL DRIVE FRONT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA600-6R', component: 'FINAL DRIVE FRONT LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA600-6R', component: 'FINAL DRIVE FRONT RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA600-6R', component: 'FINAL DRIVE REAR LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA600-6R', component: 'TORQFLOW ASSY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA800-3', component: 'BRAKE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA800-3', component: 'DIFFERENTIAL FRONT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA800-3', component: 'DIFFERENTIAL REAR' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA800-3', component: 'FINAL DRIVE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA800-3', component: 'TORQFLOW ASSY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA900-8R', component: 'DIFFERENTIAL FRONT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA900-8R', component: 'DIFFERENTIAL REAR' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA900-8R', component: 'FINAL DRIVE FRONT RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA900-8R', component: 'FINAL DRIVE LEFT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA900-8R', component: 'FINAL DRIVE RIGHT' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WA900-8R', component: 'TORQFLOW ASSY' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WD600-3', component: 'FINAL DRIVE' },
  { compGroup: 'PT-PPM', subGroup: 'PT', unitModel: 'WD600-3', component: 'TRANSMISSION' },
];

// 6C. PPM PRODUCT MASTER (19 items)
export const REQUIRED_PPM_PRODUCTS: RequiredProductDefinition[] = [
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC1250SP-11R', component: 'MAIN PUMP NO 1' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC1250SP-11R', component: 'MAIN PUMP NO 2' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC1250SP-11R', component: 'SWING MOTOR' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC1250SP-11R', component: 'TRAVEL MOTOR' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC1250SP-8R', component: 'MAIN PUMP NO 1' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC1250SP-8R', component: 'MAIN PUMP NO 2' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC1250SP-8R', component: 'SWING MOTOR' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC1250SP-8R', component: 'SWING PUMP' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC1250SP-8R', component: 'TRAVEL MOTOR' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC2000-8', component: 'FAN PUMP' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC2000-8', component: 'SWING MOTOR' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC2000-8', component: 'TRAVEL MOTOR' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC750SE-7', component: 'MAIN PUMP NO 1' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC750SE-7', component: 'MAIN PUMP NO 2' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC750SE-7', component: 'SWING MOTOR' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'PC750SE-7', component: 'TRAVEL MOTOR' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'WA800-3', component: 'LOADER PUMP' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'WA800-3', component: 'STEERING PUMP' },
  { compGroup: 'PT-PPM', subGroup: 'PPM', unitModel: 'WA800-3', component: 'SWITCH PUMP' },
];

// 6D. CYLINDER PRODUCT MASTER (38 items)
export const REQUIRED_CYLINDER_PRODUCTS: RequiredProductDefinition[] = [
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'D155A-6R', component: 'BLADE LIFT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'D155A-6R', component: 'BLADE TILT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'D155A-6R', component: 'RIPPER LIFT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'D155A-6R', component: 'RIPPER TILT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'D375A-6R', component: 'BLADE LIFT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'D375A-6R', component: 'BLADE TILT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'D375A-6R', component: 'RIPPER LIFT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'D375A-6R', component: 'RIPPER TILT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'GD825A-2', component: 'ARTICULATE CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'GD825A-2', component: 'BLADE LIFT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'GD825A-2', component: 'BLADE SIDE SHIFT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'GD825A-2', component: 'DRAWBAR SIDE SHIFT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'GD825A-2', component: 'LEANING CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'GD825A-2', component: 'POWER TILT CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'GD825A-2', component: 'RIPPER CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'GD825A-2', component: 'STEERING CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD465-7R', component: 'FRONT SUSPENSION' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD465-7R', component: 'FRONT SUSPENSION CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD465-7R', component: 'HOIST CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD465-7R', component: 'REAR SUSPENSION' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD465-7R', component: 'STEERING CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD785-7', component: 'AXLE ASSY FRONT LEFT' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD785-7', component: 'AXLE ASSY FRONT RIGHT' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD785-7', component: 'FRONT SUSPENSION' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD785-7', component: 'HOIST CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD785-7', component: 'REAR SUSPENSION' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD785-7', component: 'REAR SUSPENSION CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'HD785-7', component: 'STEERING CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'PC1250SP-8R', component: 'ARM CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'PC1250SP-8R', component: 'BOOM CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'PC1250SP-8R', component: 'BUCKET CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'PC2000-8R', component: 'ARM CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'PC2000-8R', component: 'BUCKET CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'PC3400-11M0', component: 'ARM CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'PC3400-11M0', component: 'BUCKET CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'PC850-8R1', component: 'ARM CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'PC850-8R1', component: 'BOOM CYLINDER' },
  { compGroup: 'Cylinder', subGroup: null, unitModel: 'PC850-8R1', component: 'BUCKET CYLINDER' },
];

export const ALL_REQUIRED_PRODUCTS: RequiredProductDefinition[] = [
  ...REQUIRED_ENGINE_PRODUCTS,
  ...REQUIRED_PT_PRODUCTS,
  ...REQUIRED_PPM_PRODUCTS,
  ...REQUIRED_CYLINDER_PRODUCTS,
];

// Helper to generate deterministic ID
export function getProductModelId(def: RequiredProductDefinition): string {
  const grp = def.compGroup.toLowerCase().replace(/[^a-z0-9]/g, '');
  const sub = def.subGroup ? `-${def.subGroup.toLowerCase()}` : '';
  const unit = def.unitModel.toLowerCase().replace(/[^a-z0-9]/g, '');
  const comp = def.component.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `pm-${grp}${sub}-${unit}-${comp}`;
}

export function buildProductModelEntity(def: RequiredProductDefinition): ProductModel {
  const id = getProductModelId(def);
  const displayName = `[${def.unitModel}] ${def.component}`;
  return {
    id,
    compGroup: def.compGroup,
    subGroup: def.subGroup || null,
    category: def.compGroup === 'Engine' ? 'Engine' : def.compGroup === 'Cylinder' ? 'Cylinder' : 'Power Train Component',
    unitModel: def.unitModel,
    component: def.component,
    modelName: displayName,
    code: `${def.unitModel}/${def.component}`,
    active: true,
  };
}

export const INITIAL_REQUIRED_PRODUCT_MODELS: ProductModel[] = ALL_REQUIRED_PRODUCTS.map(buildProductModelEntity);

export interface ProductMasterValidationReport {
  engineCount: number;
  engineTarget: number;
  ptCount: number;
  ptTarget: number;
  ppmCount: number;
  ppmTarget: number;
  cylinderCount: number;
  cylinderTarget: number;
  totalRequiredFound: number;
  totalRequiredTarget: number;
  missingRequiredCount: number;
  additionalCount: number;
  missingProducts: RequiredProductDefinition[];
}

export function validateProductMasterList(models: ProductModel[]): ProductMasterValidationReport {
  let engineCount = 0;
  let ptCount = 0;
  let ppmCount = 0;
  let cylinderCount = 0;

  const missingProducts: RequiredProductDefinition[] = [];

  for (const req of ALL_REQUIRED_PRODUCTS) {
    const found = models.find(
      (m) =>
        m.compGroup === req.compGroup &&
        m.unitModel.trim().toUpperCase() === req.unitModel.trim().toUpperCase() &&
        m.component.trim().toUpperCase() === req.component.trim().toUpperCase() &&
        (req.subGroup ? m.subGroup === req.subGroup : true)
    );

    if (found) {
      if (req.compGroup === 'Engine') engineCount++;
      else if (req.compGroup === 'PT-PPM' && req.subGroup === 'PT') ptCount++;
      else if (req.compGroup === 'PT-PPM' && req.subGroup === 'PPM') ppmCount++;
      else if (req.compGroup === 'Cylinder') cylinderCount++;
    } else {
      missingProducts.push(req);
    }
  }

  const totalRequiredFound = engineCount + ptCount + ppmCount + cylinderCount;
  const totalRequiredTarget = 169;
  const missingRequiredCount = missingProducts.length;
  const additionalCount = Math.max(0, models.length - totalRequiredFound);

  return {
    engineCount,
    engineTarget: 23,
    ptCount,
    ptTarget: 89,
    ppmCount,
    ppmTarget: 19,
    cylinderCount,
    cylinderTarget: 38,
    totalRequiredFound,
    totalRequiredTarget,
    missingRequiredCount,
    additionalCount,
    missingProducts,
  };
}

// 10. GENERATE STARTER CHECKSHEET TEMPLATE FOR A PRODUCT
export function createStarterChecksheetForProduct(product: ProductModel): ChecksheetTemplate {
  const stage = product.compGroup === 'Engine' ? 'GLT' : 'Hydraulic Test';
  return {
    id: `tmpl-${product.id}`,
    name: `${product.component} Trial Checksheet`,
    compGroup: product.compGroup,
    unitModel: product.unitModel,
    component: product.component,
    productMasterId: product.id,
    testStage: stage as any,
    revision: 1,
    status: 'DRAFT',
    sections: [
      {
        id: `sec-${product.id}-1`,
        name: 'SECTION 1 — GENERAL INSPECTION',
        displayOrder: 1,
        items: [
          {
            id: `itm-${product.id}-1-1`,
            itemName: 'Visual Condition',
            inputType: 'GOOD / NOT GOOD',
            validation: 'NONE',
            displayOrder: 1,
            mandatory: true,
            active: true,
          },
          {
            id: `itm-${product.id}-1-2`,
            itemName: 'Leakage / Abnormal Condition',
            inputType: 'GOOD / NOT GOOD',
            validation: 'NONE',
            displayOrder: 2,
            mandatory: true,
            active: true,
          },
        ],
      },
      {
        id: `sec-${product.id}-2`,
        name: 'SECTION 2 — FUNCTIONAL CHECK',
        displayOrder: 2,
        items: [
          {
            id: `itm-${product.id}-2-1`,
            itemName: 'Functional Check',
            inputType: 'GOOD / NOT GOOD',
            validation: 'NONE',
            displayOrder: 1,
            mandatory: true,
            active: true,
          },
        ],
      },
      {
        id: `sec-${product.id}-3`,
        name: 'SECTION 3 — MEASUREMENT',
        displayOrder: 3,
        items: [
          {
            id: `itm-${product.id}-3-1`,
            itemName: 'Measurement 1',
            inputType: 'Numeric',
            validation: 'NONE',
            displayOrder: 1,
            mandatory: false,
            active: true,
          },
          {
            id: `itm-${product.id}-3-2`,
            itemName: 'Measurement 2',
            inputType: 'Numeric',
            validation: 'NONE',
            displayOrder: 2,
            mandatory: false,
            active: true,
          },
        ],
      },
      {
        id: `sec-${product.id}-4`,
        name: 'SECTION 4 — REMARK',
        displayOrder: 4,
        items: [
          {
            id: `itm-${product.id}-4-1`,
            itemName: 'Inspection Remark',
            inputType: 'Text',
            validation: 'NONE',
            displayOrder: 1,
            mandatory: false,
            active: true,
          },
        ],
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
