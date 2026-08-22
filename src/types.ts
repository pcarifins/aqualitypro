export type UserRole =
  | 'ADMIN'
  | 'SUPERVISOR'
  | 'PPC'
  | 'GLT_OPT'
  | 'DYNO_OPT'
  | 'TESTBENCH_OPT'
  | 'OPERATOR'
  | 'QC'
  | 'administrator'
  | 'supervisor'
  | 'operator';

export type JobGroup = 'PPC' | 'QC Testing' | 'Supervisor' | 'Admin' | 'Operator' | 'QC' | 'GLT Opt' | 'Dyno Opt' | 'Testbench Opt';

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  jobGroup?: string;
  jobStatus?: string;
  section?: string;
  employeeId?: string;
  mustChangePassword?: boolean;
  active: boolean;
  allowedCompGroups?: CompGroup[];
}

// Assembler Master (Assembly Mechanic is NOT a login role)
export interface Assembler {
  id: string;
  name: string;
  employeeId?: string;
  nrp?: string;
  section?: string;
  jobGroup?: string;
  assignedCompGroups?: CompGroup[];
  active: boolean;
  createdAt?: string;
}

// Primary Component Groups for AQuality PRO
export type CompGroup = 'Engine' | 'PT-PPM' | 'Cylinder';
export type SubGroup = 'PT' | 'PPM' | null;
export type ProductCategory = 'Engine' | 'Power Train' | 'PPM' | 'Cylinder' | 'PT-PPM' | 'Power Train Component';
export type TestProcess = 'GLT' | 'Dynotest' | 'Hydraulic Test' | 'Testbench';
export type TestResult = 'GOOD' | 'NOT GOOD';
export type RecordStatus = 'Draft' | 'Submitted';

// Trial Input Types
export type TrialInputType =
  | 'GOOD/NOT GOOD'
  | 'NUMERIC'
  | 'TEXT'
  | 'YES/NO'
  | 'GOOD / NOT GOOD'
  | 'Numeric'
  | 'Text'
  | 'Yes / No';

export type NumericValidationType =
  | 'NONE'
  | 'RANGE'
  | 'MINIMUM'
  | 'MAXIMUM'
  | 'TARGET_TOLERANCE';

export interface ProductModel {
  id: string;
  compGroup: CompGroup;
  subGroup?: SubGroup;
  category?: ProductCategory; // for backward compatibility
  unitModel: string;
  component: string; // e.g. "MAIN PUMP", "SWING MOTOR", "TRAVEL MOTOR", "Engine Assembly"
  compName?: string;
  compModel?: string;
  modelName: string;
  code?: string;
  active: boolean;
}

export interface ProductMasterValidationReport {
  totalRequired?: number;
  totalConfigured?: number;
  totalCount?: number;
  engineCount: number;
  ptCount?: number;
  ppmCount?: number;
  ptPpmCount?: number;
  cylinderCount: number;
  missingRequired?: number;
  missingRequirements?: string[];
  isValid: boolean;
  details?: {
    engineRequired: number;
    ptRequired: number;
    ppmRequired: number;
    cylinderRequired: number;
  };
}

// Master Checksheet Item
export interface ChecksheetItem {
  id: string;
  templateId?: string;
  process?: TestProcess;
  productCategory?: 'Engine' | 'Power Train' | 'Both' | 'PT-PPM' | 'Cylinder';
  section?: string;
  itemName: string;
  description?: string;
  inputType: TrialInputType;
  unit?: string;
  validation?: NumericValidationType;
  minimumValue?: number;
  maximumValue?: number;
  targetValue?: number;
  toleranceValue?: number;
  options?: string[]; // For Dropdown
  displayOrder: number;
  mandatory: boolean;
  active: boolean;
}

export type ChecksheetTemplateItem = ChecksheetItem;

// Master Checksheet Section
export interface ChecksheetSection {
  id: string;
  name: string;
  displayOrder: number;
  items: ChecksheetItem[];
}

// Master Checksheet Template (Hierarchy: Comp Group -> Unit -> Component -> Test Stage -> Template -> Section -> Item)
export interface ChecksheetTemplate {
  id: string;
  name: string;
  compGroup: CompGroup;
  unitModel: string; // Specific unit e.g. "PC200-8", "PC400-8", "HD785-7", or "ALL"
  component: string; // Specific component e.g. "MAIN PUMP", "SWING MOTOR", "Engine Assembly"
  productMasterId?: string; // Direct link to ProductModel ID
  testStage: TestProcess;
  revision: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  sections: ChecksheetSection[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  activatedAt?: string;
}

// Queue Record Data Model
export interface PriorityChangeHistory {
  oldPriority: number;
  newPriority: number;
  remark: string;
  changedBy: string;
  changedAt: string;
}

export interface AIRecommendation {
  suggestedPriority: number;
  reason: string;
}

export interface QueueRecord {
  queueRecordId: string; // Internal unique ID
  joRoNumber: string; // Business identifier e.g. "24100812"
  compGroup: CompGroup;
  subGroup?: SubGroup;
  unitModel: string;
  component: string;
  productMasterId?: string;
  productModelId?: string;
  testType: 'PROD' | 'RETEST';
  plannedPriority: number;
  currentPriority: number;
  isUrgentUnassigned?: boolean;
  status: 'WAITING' | 'ON_PROCESS' | 'FINISH';
  gltStatus?: 'GOOD' | 'NOT_GOOD' | 'PENDING';
  gltReceivingTime?: string;
  priorityLocked: boolean; // true when test starts (ON_PROCESS)
  remark?: string;
  customer?: string;
  partNumber?: string;
  serialNumber?: string;
  assemblyMechanic?: string;
  createdAt: string;
  updatedAt: string;
  history: PriorityChangeHistory[];
  aiRecommendation?: AIRecommendation;
}

// PDF Test Report Record Versioning
export interface PDFTestReportRecord {
  reportId: string;
  testRecordId: string;
  joNumber: string;
  version: number;
  reportNumber: string;
  generatedAt: string;
  generatedBy: string;
  dataSnapshot: any;
}

export interface QualityCertificateRecord {
  certificateId: string;
  testRecordId: string;
  joNumber: string;
  version: number;
  certificateNumber: string;
  certNumber?: string; // Alias
  generatedAt: string;
  issuedAt?: string; // Alias
  generatedBy: string;
  issuedBy?: string; // Alias
}

// Immutable Snapshot captured at test start/submission
export interface ChecksheetSnapshot {
  templateId: string;
  templateName: string;
  revision: number;
  compGroup: string;
  unitModel: string;
  component: string;
  testStage: TestProcess;
  sections: {
    id: string;
    name: string;
    displayOrder: number;
    items: {
      id: string;
      itemName: string;
      inputType: TrialInputType;
      unit?: string;
      validation: NumericValidationType;
      minimumValue?: number;
      maximumValue?: number;
      targetValue?: number;
      toleranceValue?: number;
      displayOrder: number;
      mandatory: boolean;
    }[];
  }[];
  snapshottedAt: string;
}

export interface ChecksheetAnswer {
  id: string;
  recordType?: TestProcess;
  recordId?: string;
  checksheetItemId?: string;
  itemId?: string;
  itemNameSnapshot: string;
  sectionSnapshot: string;
  inputTypeSnapshot: TrialInputType;
  unitSnapshot?: string;
  validationSnapshot?: NumericValidationType;
  minimumSnapshot?: number;
  maximumSnapshot?: number;
  targetSnapshot?: number;
  toleranceSnapshot?: number;
  answer: string;
  resultStatus?: 'PASS' | 'FAIL' | 'NA' | 'NONE';
}

export interface Attachment {
  id: string;
  recordType: TestProcess;
  recordId: string;
  fileUrl: string;
  fileName?: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface GLTRecord {
  id: string;
  joNumber: string;
  compGroup?: CompGroup;
  unitModel?: string;
  component?: string;
  productCategory: ProductCategory;
  productModel: string;
  partNumber?: string;
  serialNumber?: string;
  customer?: string;
  assemblyMechanic: string;
  operatorId: string;
  operatorName: string;
  testerName?: string; // Alias for operatorName
  incomingTime: string; // ISO String
  submissionTime?: string; // ISO String
  gltCompleteTime?: string; // Alias
  benchReceiveTime?: string; // Alias
  testDate: string; // YYYY-MM-DD
  attemptNumber: number;
  result: TestResult;
  ngItem?: string;
  ngDescription?: string;
  leakLocation?: string; // Alias for ngItem
  leakDescription?: string; // Alias for ngDescription
  remarks?: string;
  gltPressure?: number;
  gltDurationMinutes?: number;
  status: RecordStatus;
  answers?: ChecksheetAnswer[];
  snapshot?: ChecksheetSnapshot;
  photoUrl?: string;
  attachments?: Attachment[];
}

export interface DynotestRecord {
  id: string;
  joNumber: string;
  compGroup?: CompGroup;
  subGroup?: SubGroup;
  unitModel?: string;
  component?: string;
  productModel?: string;
  productCategory?: ProductCategory;
  assemblyMechanic?: string;
  testType?: 'PROD' | 'RETEST';
  operatorId: string;
  operatorName: string;
  receivingTime: string; // ISO String (when "Receive at Dynotest" clicked)
  submissionTime?: string; // ISO String (when final submitted)
  attemptNumber: number;
  result: TestResult;
  ngItem?: string;
  ngDescription?: string;
  remarks?: string;
  powerOutputKw?: number;
  torqueNm?: number;
  oilTempCelsius?: number;
  blowbyKpa?: number;
  status: RecordStatus;
  gltLeadTimeMinutes?: number; // Calculated: receivingTime - gltIncomingTime
  dynoLeadTimeMinutes?: number; // Calculated: submissionTime - receivingTime
  answers?: ChecksheetAnswer[];
  snapshot?: ChecksheetSnapshot;
  photoUrl?: string;
  attachments?: Attachment[];
}

export interface HydraulicRecord {
  id: string;
  joNumber: string;
  compGroup?: CompGroup;
  subGroup?: SubGroup;
  unitModel?: string;
  component?: string;
  productModel?: string;
  productCategory?: ProductCategory;
  assemblyMechanic?: string;
  testType?: 'PROD' | 'RETEST';
  operatorId: string;
  operatorName: string;
  receivingTime: string; // ISO String (when "Receive at Hydraulic Test" clicked)
  submissionTime?: string; // ISO String (when final submitted)
  attemptNumber: number;
  result: TestResult;
  ngItem?: string;
  ngDescription?: string;
  remarks?: string;
  mainReliefPressureBar?: number;
  flowRateLpm?: number;
  internalLeakageMlMin?: number;
  oilTemperatureCelsius?: number;
  status: RecordStatus;
  gltLeadTimeMinutes?: number; // Calculated: receivingTime - gltIncomingTime
  hydraulicLeadTimeMinutes?: number; // Calculated: submissionTime - receivingTime
  answers?: ChecksheetAnswer[];
  snapshot?: ChecksheetSnapshot;
  photoUrl?: string;
  attachments?: Attachment[];
}

export interface CombinedJORecords {
  joNumber: string;
  compGroup?: CompGroup;
  unitModel?: string;
  component?: string;
  componentName?: string; // Alias for component
  productCategory: ProductCategory;
  productModel: string;
  customer?: string;
  serialNumber?: string;
  partNumber?: string;
  latestStage?: string;
  assemblyMechanic: string;
  currentOverallStatus: TestResult;
  everHadNG: boolean;
  gltRecords: GLTRecord[];
  dynoRecords: DynotestRecord[];
  hydraulicRecords: HydraulicRecord[];
  latestRecordDate: string;
}

export interface FilterParams {
  joNumber?: string;
  dateFrom?: string;
  dateTo?: string;
  startDate?: string;
  endDate?: string;
  month?: string;
  compGroup?: CompGroup | 'All';
  productCategory?: ProductCategory | 'All';
  productModel?: string | 'All';
  assemblyMechanic?: string | 'All';
  process?: TestProcess | 'All';
  testProcess?: TestProcess | 'All';
  resultFilter?: 'All' | 'GOOD' | 'NOT GOOD' | 'Ever NOT GOOD';
}

export interface DashboardStats {
  totalJOTested: number;
  totalGood: number;
  totalNotGood: number;
  ngRatioPercent: number; // NG ratio on first attempt
  avgGltLeadTimeMinutes: number;
  avgDynoLeadTimeMinutes: number;
  avgHydraulicLeadTimeMinutes: number;
  monthlyTrends: {
    month: string; // e.g. "2026-03", "Mar 2026"
    gltLeadTimeHours: number;
    dynoLeadTimeHours: number;
    hydraulicLeadTimeHours: number;
    ngRatioPercent: number;
  }[];
  mechanicNGStats: {
    mechanicName: string;
    totalUnits: number;
    ngCount: number;
    ngRatio: number;
  }[];
}