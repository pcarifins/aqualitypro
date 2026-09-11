import { ChecksheetStandardProfile } from '../types';

export const INITIAL_STANDARD_PROFILES: ChecksheetStandardProfile[] = [
  // --- ENGINE DYNOTEST PROFILES PER UNIT MODEL ---
  {
    standardProfileId: 'prof-dyno-hd785-7',
    name: 'HD785-7 Engine Dynotest Standard Profile',
    templateId: 'tmpl-dyno-engine-universal',
    componentFamily: 'Engine',
    unitModel: 'HD785-7',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 1200,
    torqueLimits: 'Min 4500 Nm, Max 5200 Nm',
    vibrationThresholds: 'Max 3.5 mm/s',
    notes: 'Komatsu SAA12V140E-3 diesel engine configuration for HD785-7 dump truck.',
    checkingPointStandards: [
      { itemId: 'item-ed-low-idle', itemName: 'Low Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 650, maximumValue: 750, mandatory: true },
      { itemId: 'item-ed-high-idle', itemName: 'High Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 2000, maximumValue: 2150, mandatory: true },
      { itemId: 'item-ed-rated-power', itemName: 'Rated Output Power', unit: 'HP', validationType: 'MINIMUM', minimumValue: 1175, mandatory: true },
      { itemId: 'item-ed-boost-press', itemName: 'Intake Manifold Boost Pressure', unit: 'kPa', validationType: 'MINIMUM', minimumValue: 180, mandatory: true },
      { itemId: 'item-ed-exhaust-temp', itemName: 'Exhaust Gas Temperature Avg', unit: '°C', validationType: 'MAXIMUM', maximumValue: 650, mandatory: true },
      { itemId: 'item-ed-blowby', itemName: 'Crankcase Blow-by Pressure', unit: 'kPa', validationType: 'MAXIMUM', maximumValue: 2.5, mandatory: true },
      { itemId: 'item-ed-oil-press', itemName: 'Engine Oil Pressure (High Idle)', unit: 'kPa', validationType: 'RANGE', minimumValue: 300, maximumValue: 500, mandatory: true },
      { itemId: 'item-ed-water-temp', itemName: 'Coolant Water Temperature', unit: '°C', validationType: 'RANGE', minimumValue: 75, maximumValue: 95, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-dyno-hd465-7',
    name: 'HD465-7 Engine Dynotest Standard Profile',
    templateId: 'tmpl-dyno-engine-universal',
    componentFamily: 'Engine',
    unitModel: 'HD465-7',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 750,
    torqueLimits: 'Min 2800 Nm, Max 3400 Nm',
    vibrationThresholds: 'Max 3.2 mm/s',
    notes: 'Komatsu SAA6D170E-5 diesel engine configuration for HD465-7.',
    checkingPointStandards: [
      { itemId: 'item-ed-low-idle', itemName: 'Low Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 650, maximumValue: 750, mandatory: true },
      { itemId: 'item-ed-high-idle', itemName: 'High Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 2000, maximumValue: 2150, mandatory: true },
      { itemId: 'item-ed-rated-power', itemName: 'Rated Output Power', unit: 'HP', validationType: 'MINIMUM', minimumValue: 715, mandatory: true },
      { itemId: 'item-ed-boost-press', itemName: 'Intake Manifold Boost Pressure', unit: 'kPa', validationType: 'MINIMUM', minimumValue: 160, mandatory: true },
      { itemId: 'item-ed-exhaust-temp', itemName: 'Exhaust Gas Temperature Avg', unit: '°C', validationType: 'MAXIMUM', maximumValue: 620, mandatory: true },
      { itemId: 'item-ed-blowby', itemName: 'Crankcase Blow-by Pressure', unit: 'kPa', validationType: 'MAXIMUM', maximumValue: 2.0, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-dyno-hd465-7r',
    name: 'HD465-7R Engine Dynotest Standard Profile',
    templateId: 'tmpl-dyno-engine-universal',
    componentFamily: 'Engine',
    unitModel: 'HD465-7R',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 750,
    checkingPointStandards: [
      { itemId: 'item-ed-low-idle', itemName: 'Low Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 650, maximumValue: 750, mandatory: true },
      { itemId: 'item-ed-high-idle', itemName: 'High Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 2000, maximumValue: 2150, mandatory: true },
      { itemId: 'item-ed-rated-power', itemName: 'Rated Output Power', unit: 'HP', validationType: 'MINIMUM', minimumValue: 715, mandatory: true },
      { itemId: 'item-ed-exhaust-temp', itemName: 'Exhaust Gas Temperature Avg', unit: '°C', validationType: 'MAXIMUM', maximumValue: 620, mandatory: true },
      { itemId: 'item-ed-blowby', itemName: 'Crankcase Blow-by Pressure', unit: 'kPa', validationType: 'MAXIMUM', maximumValue: 2.0, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-dyno-hd1500-7',
    name: 'HD1500-7 Engine Dynotest Standard Profile',
    templateId: 'tmpl-dyno-engine-universal',
    componentFamily: 'Engine',
    unitModel: 'HD1500-7',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 1500,
    checkingPointStandards: [
      { itemId: 'item-ed-low-idle', itemName: 'Low Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 650, maximumValue: 750, mandatory: true },
      { itemId: 'item-ed-high-idle', itemName: 'High Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 1900, maximumValue: 2050, mandatory: true },
      { itemId: 'item-ed-rated-power', itemName: 'Rated Output Power', unit: 'HP', validationType: 'MINIMUM', minimumValue: 1450, mandatory: true },
      { itemId: 'item-ed-exhaust-temp', itemName: 'Exhaust Gas Temperature Avg', unit: '°C', validationType: 'MAXIMUM', maximumValue: 660, mandatory: true },
      { itemId: 'item-ed-blowby', itemName: 'Crankcase Blow-by Pressure', unit: 'kPa', validationType: 'MAXIMUM', maximumValue: 2.8, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-dyno-d155a-6r',
    name: 'D155A-6R Engine Dynotest Standard Profile',
    templateId: 'tmpl-dyno-engine-universal',
    componentFamily: 'Engine',
    unitModel: 'D155A-6R',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 400,
    checkingPointStandards: [
      { itemId: 'item-ed-low-idle', itemName: 'Low Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 650, maximumValue: 750, mandatory: true },
      { itemId: 'item-ed-high-idle', itemName: 'High Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 1900, maximumValue: 2050, mandatory: true },
      { itemId: 'item-ed-rated-power', itemName: 'Rated Output Power', unit: 'HP', validationType: 'MINIMUM', minimumValue: 350, mandatory: true },
      { itemId: 'item-ed-exhaust-temp', itemName: 'Exhaust Gas Temperature Avg', unit: '°C', validationType: 'MAXIMUM', maximumValue: 600, mandatory: true },
      { itemId: 'item-ed-blowby', itemName: 'Crankcase Blow-by Pressure', unit: 'kPa', validationType: 'MAXIMUM', maximumValue: 2.2, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-dyno-d375a-6r',
    name: 'D375A-6R Engine Dynotest Standard Profile',
    templateId: 'tmpl-dyno-engine-universal',
    componentFamily: 'Engine',
    unitModel: 'D375A-6R',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 650,
    checkingPointStandards: [
      { itemId: 'item-ed-low-idle', itemName: 'Low Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 650, maximumValue: 750, mandatory: true },
      { itemId: 'item-ed-high-idle', itemName: 'High Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 1800, maximumValue: 1950, mandatory: true },
      { itemId: 'item-ed-rated-power', itemName: 'Rated Output Power', unit: 'HP', validationType: 'MINIMUM', minimumValue: 610, mandatory: true },
      { itemId: 'item-ed-exhaust-temp', itemName: 'Exhaust Gas Temperature Avg', unit: '°C', validationType: 'MAXIMUM', maximumValue: 620, mandatory: true },
      { itemId: 'item-ed-blowby', itemName: 'Crankcase Blow-by Pressure', unit: 'kPa', validationType: 'MAXIMUM', maximumValue: 2.0, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-dyno-pc1250sp-8r',
    name: 'PC1250SP-8R Engine Dynotest Standard Profile',
    templateId: 'tmpl-dyno-engine-universal',
    componentFamily: 'Engine',
    unitModel: 'PC1250SP-8R',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 700,
    checkingPointStandards: [
      { itemId: 'item-ed-low-idle', itemName: 'Low Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 650, maximumValue: 750, mandatory: true },
      { itemId: 'item-ed-high-idle', itemName: 'High Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 1800, maximumValue: 1950, mandatory: true },
      { itemId: 'item-ed-rated-power', itemName: 'Rated Output Power', unit: 'HP', validationType: 'MINIMUM', minimumValue: 670, mandatory: true },
      { itemId: 'item-ed-exhaust-temp', itemName: 'Exhaust Gas Temperature Avg', unit: '°C', validationType: 'MAXIMUM', maximumValue: 620, mandatory: true },
      { itemId: 'item-ed-blowby', itemName: 'Crankcase Blow-by Pressure', unit: 'kPa', validationType: 'MAXIMUM', maximumValue: 2.0, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-dyno-pc2000-8',
    name: 'PC2000-8 Engine Dynotest Standard Profile',
    templateId: 'tmpl-dyno-engine-universal',
    componentFamily: 'Engine',
    unitModel: 'PC2000-8',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 1000,
    checkingPointStandards: [
      { itemId: 'item-ed-low-idle', itemName: 'Low Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 650, maximumValue: 750, mandatory: true },
      { itemId: 'item-ed-high-idle', itemName: 'High Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 1800, maximumValue: 1950, mandatory: true },
      { itemId: 'item-ed-rated-power', itemName: 'Rated Output Power', unit: 'HP', validationType: 'MINIMUM', minimumValue: 950, mandatory: true },
      { itemId: 'item-ed-exhaust-temp', itemName: 'Exhaust Gas Temperature Avg', unit: '°C', validationType: 'MAXIMUM', maximumValue: 650, mandatory: true },
      { itemId: 'item-ed-blowby', itemName: 'Crankcase Blow-by Pressure', unit: 'kPa', validationType: 'MAXIMUM', maximumValue: 2.5, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-dyno-pc2000-11r',
    name: 'PC2000-11R Engine Dynotest Standard Profile',
    templateId: 'tmpl-dyno-engine-universal',
    componentFamily: 'Engine',
    unitModel: 'PC2000-11R',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 1100,
    checkingPointStandards: [
      { itemId: 'item-ed-low-idle', itemName: 'Low Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 650, maximumValue: 750, mandatory: true },
      { itemId: 'item-ed-high-idle', itemName: 'High Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 1800, maximumValue: 1950, mandatory: true },
      { itemId: 'item-ed-rated-power', itemName: 'Rated Output Power', unit: 'HP', validationType: 'MINIMUM', minimumValue: 1040, mandatory: true },
      { itemId: 'item-ed-exhaust-temp', itemName: 'Exhaust Gas Temperature Avg', unit: '°C', validationType: 'MAXIMUM', maximumValue: 650, mandatory: true },
      { itemId: 'item-ed-blowby', itemName: 'Crankcase Blow-by Pressure', unit: 'kPa', validationType: 'MAXIMUM', maximumValue: 2.5, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-dyno-generic-engine',
    name: 'Standard Universal Engine Dynotest Profile',
    templateId: 'tmpl-dyno-engine-universal',
    componentFamily: 'Engine',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 550,
    checkingPointStandards: [
      { itemId: 'item-ed-low-idle', itemName: 'Low Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 650, maximumValue: 750, mandatory: true },
      { itemId: 'item-ed-high-idle', itemName: 'High Idle Speed', unit: 'RPM', validationType: 'RANGE', minimumValue: 1900, maximumValue: 2150, mandatory: true },
      { itemId: 'item-ed-rated-power', itemName: 'Rated Output Power', unit: 'HP', validationType: 'MINIMUM', minimumValue: 300, mandatory: true },
      { itemId: 'item-ed-exhaust-temp', itemName: 'Exhaust Gas Temperature Avg', unit: '°C', validationType: 'MAXIMUM', maximumValue: 620, mandatory: true },
      { itemId: 'item-ed-blowby', itemName: 'Crankcase Blow-by Pressure', unit: 'kPa', validationType: 'MAXIMUM', maximumValue: 2.5, mandatory: true },
    ]
  },

  // --- HYDRAULIC PUMP PROFILES ---
  {
    standardProfileId: 'prof-pump-pc1250sp-8r',
    name: 'PC1250SP-8R Hydraulic Pump Standard Profile',
    templateId: 'tmpl-pump-testbench-v2',
    componentFamily: 'Hydraulic Pump',
    unitModel: 'PC1250SP-8R',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 350,
    targetFlowRates: '494 L/min @ 31.4 MPa',
    checkingPointStandards: [
      { itemId: 'item-tb-main-relief', itemName: 'Main Relief Valve Pressure', unit: 'MPa', validationType: 'RANGE', minimumValue: 31.0, maximumValue: 32.5, mandatory: true },
      { itemId: 'item-tb-pump-flow', itemName: 'Main Pump Rated Flow Rate', unit: 'L/min', validationType: 'MINIMUM', minimumValue: 470, mandatory: true },
      { itemId: 'item-tb-case-drain', itemName: 'Case Drain Leakage Flow', unit: 'L/min', validationType: 'MAXIMUM', maximumValue: 18.0, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-pump-pc2000-8',
    name: 'PC2000-8 Hydraulic Pump Standard Profile',
    templateId: 'tmpl-pump-testbench-v2',
    componentFamily: 'Hydraulic Pump',
    unitModel: 'PC2000-8',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 400,
    targetFlowRates: '824 L/min @ 32.0 MPa',
    checkingPointStandards: [
      { itemId: 'item-tb-main-relief', itemName: 'Main Relief Valve Pressure', unit: 'MPa', validationType: 'RANGE', minimumValue: 31.5, maximumValue: 33.0, mandatory: true },
      { itemId: 'item-tb-pump-flow', itemName: 'Main Pump Rated Flow Rate', unit: 'L/min', validationType: 'MINIMUM', minimumValue: 790, mandatory: true },
      { itemId: 'item-tb-case-drain', itemName: 'Case Drain Leakage Flow', unit: 'L/min', validationType: 'MAXIMUM', maximumValue: 24.0, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-pump-generic',
    name: 'Universal Hydraulic Pump Standard Profile',
    templateId: 'tmpl-pump-testbench-v2',
    componentFamily: 'Hydraulic Pump',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 350,
    targetFlowRates: '350 L/min',
    checkingPointStandards: [
      { itemId: 'item-tb-main-relief', itemName: 'Main Relief Valve Pressure', unit: 'MPa', validationType: 'RANGE', minimumValue: 25.0, maximumValue: 35.0, mandatory: true },
      { itemId: 'item-tb-pump-flow', itemName: 'Main Pump Rated Flow Rate', unit: 'L/min', validationType: 'MINIMUM', minimumValue: 150, mandatory: true },
      { itemId: 'item-tb-case-drain', itemName: 'Case Drain Leakage Flow', unit: 'L/min', validationType: 'MAXIMUM', maximumValue: 15.0, mandatory: true },
    ]
  },

  // --- MOTOR PROFILES ---
  {
    standardProfileId: 'prof-motor-generic',
    name: 'Universal Hydraulic Motor Standard Profile',
    templateId: 'tmpl-motor-testbench-v2',
    componentFamily: 'Hydraulic Motor',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-mot-relief-press', itemName: 'Motor Relief Pressure', unit: 'MPa', validationType: 'RANGE', minimumValue: 26.0, maximumValue: 32.0, mandatory: true },
      { itemId: 'item-mot-drain-flow', itemName: 'Case Drain Flow Rate', unit: 'L/min', validationType: 'MAXIMUM', maximumValue: 12.0, mandatory: true },
      { itemId: 'item-mot-brake-hold', itemName: 'Parking Brake Holding Pressure', unit: 'MPa', validationType: 'MINIMUM', minimumValue: 3.5, mandatory: true },
    ]
  },

  // --- TRANSMISSION / TORQFLOW / TORQUE CONVERTER PROFILES ---
  {
    standardProfileId: 'prof-trans-generic',
    name: 'Universal Transmission Standard Profile',
    templateId: 'tmpl-transmission-v2',
    componentFamily: 'Transmission',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-tr-main-press', itemName: 'Transmission Main Relief Pressure', unit: 'MPa', validationType: 'RANGE', minimumValue: 2.2, maximumValue: 3.2, mandatory: true },
      { itemId: 'item-tr-clutch-press', itemName: 'Speed Clutch Operating Pressure', unit: 'MPa', validationType: 'RANGE', minimumValue: 1.8, maximumValue: 2.8, mandatory: true },
      { itemId: 'item-tr-lube-press', itemName: 'Lubrication Oil Pressure', unit: 'kPa', validationType: 'RANGE', minimumValue: 120, maximumValue: 250, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-torqflow-generic',
    name: 'Universal Torqflow Standard Profile',
    templateId: 'tmpl-torqflow-v2',
    componentFamily: 'Torqflow',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-tq-main-relief', itemName: 'Torqflow Main Relief Pressure', unit: 'MPa', validationType: 'RANGE', minimumValue: 1.8, maximumValue: 2.5, mandatory: true },
      { itemId: 'item-tq-mod-press', itemName: 'Modulating Valve Pressure', unit: 'MPa', validationType: 'RANGE', minimumValue: 1.5, maximumValue: 2.2, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-tc-generic',
    name: 'Universal Torque Converter Standard Profile',
    templateId: 'tmpl-tc-perf-v2',
    componentFamily: 'Torque Converter',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-tc-perf', itemName: 'Performance & Stall Verification', validationType: 'NONE', mandatory: true },
    ]
  },

  // --- PTO / POWER MODULE PROFILES ---
  {
    standardProfileId: 'prof-pto-generic',
    name: 'Universal PTO Standard Profile',
    templateId: 'tmpl-pto-testbench-v2',
    componentFamily: 'Power Take Off',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-pto-bearing-temp', itemName: 'Bearing Temperature', unit: '°C', validationType: 'MAXIMUM', maximumValue: 85, mandatory: true },
      { itemId: 'item-pto-lube-press', itemName: 'Lubrication Pressure', unit: 'kPa', validationType: 'MINIMUM', minimumValue: 100, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-power-module-generic',
    name: 'Universal Power Module Standard Profile',
    templateId: 'tmpl-power-module-v2',
    componentFamily: 'Power Module',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-pm-lube-temp', itemName: 'Module Operating Temp', unit: '°C', validationType: 'MAXIMUM', maximumValue: 90, mandatory: true },
    ]
  },

  // --- FINAL DRIVE & AXLE & DIFFERENTIAL PROFILES ---
  {
    standardProfileId: 'prof-final-drive-hd-generic',
    name: 'HD Final Drive & Axle Standard Profile',
    templateId: 'tmpl-axle-fd-hd-v2',
    componentFamily: 'Final Drive HD',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-fd-hub-preload', itemName: 'Hub Bearing Preload / Rolling Resistance', unit: 'Nm', validationType: 'RANGE', minimumValue: 40, maximumValue: 120, mandatory: true },
      { itemId: 'item-fd-seal-leak', itemName: 'Floating Seal Air Leakage Rate', unit: 'kPa/min', validationType: 'MAXIMUM', maximumValue: 10, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-final-drive-gd-generic',
    name: 'GD Final Drive Standard Profile',
    templateId: 'tmpl-final-drive-gd-v2',
    componentFamily: 'Final Drive GD',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-fd-gd-backlash', itemName: 'Reduction Gear Backlash', unit: 'mm', validationType: 'RANGE', minimumValue: 0.15, maximumValue: 0.45, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-final-drive-pc-dz-generic',
    name: 'PC/DZ Final Drive Standard Profile',
    templateId: 'tmpl-final-drive-pc-dz-v2',
    componentFamily: 'Final Drive PC/DZ',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-fd-pc-backlash', itemName: 'Planetary Gear Set Backlash', unit: 'mm', validationType: 'RANGE', minimumValue: 0.20, maximumValue: 0.50, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-diff-generic',
    name: 'Universal Differential Standard Profile',
    templateId: 'tmpl-differential-v2',
    componentFamily: 'Differential',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-diff-backlash', itemName: 'Bevel Pinion & Ring Gear Backlash', unit: 'mm', validationType: 'RANGE', minimumValue: 0.25, maximumValue: 0.40, mandatory: true },
      { itemId: 'item-diff-preload', itemName: 'Pinion Bearing Preload', unit: 'Nm', validationType: 'RANGE', minimumValue: 2.0, maximumValue: 4.5, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-front-axle-generic',
    name: 'Universal Front Axle Standard Profile',
    templateId: 'tmpl-front-axle-v2',
    componentFamily: 'Front Axle',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-fa-kingpin-play', itemName: 'Kingpin Bearing Endplay', unit: 'mm', validationType: 'MAXIMUM', maximumValue: 0.20, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-front-brake-generic',
    name: 'Universal Front Brake Standard Profile',
    templateId: 'tmpl-front-brake-v2',
    componentFamily: 'Front Brake',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    checkingPointStandards: [
      { itemId: 'item-brk-app-press', itemName: 'Brake Application Working Pressure', unit: 'MPa', validationType: 'RANGE', minimumValue: 12.0, maximumValue: 16.0, mandatory: true },
      { itemId: 'item-brk-internal-leak', itemName: 'Piston Internal Leakage Rate', unit: 'mL/min', validationType: 'MAXIMUM', maximumValue: 5.0, mandatory: true },
    ]
  },

  // --- CYLINDER TESTBENCH PROFILES ---
  {
    standardProfileId: 'prof-cyl-pc1250sp-8r',
    name: 'PC1250SP-8R Cylinder Testbench Standard Profile',
    templateId: 'tmpl-cylinder-testbench-v2',
    componentFamily: 'Cylinder',
    unitModel: 'PC1250SP-8R',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 350,
    checkingPointStandards: [
      { itemId: 'item-cyl-proof-press', itemName: 'Proof Pressure Test (Holding 3 min)', unit: 'MPa', validationType: 'RANGE', minimumValue: 34.0, maximumValue: 36.0, mandatory: true },
      { itemId: 'item-cyl-drift-rate', itemName: 'Internal Leakage / Piston Bypass (Drift)', unit: 'mm/5min', validationType: 'MAXIMUM', maximumValue: 1.5, mandatory: true },
      { itemId: 'item-cyl-ext-leak', itemName: 'Rod Seal & Wiper External Leakage', unit: 'mL/min', validationType: 'MAXIMUM', maximumValue: 0, mandatory: true },
    ]
  },
  {
    standardProfileId: 'prof-cyl-generic',
    name: 'Universal Cylinder Testbench Standard Profile',
    templateId: 'tmpl-cylinder-testbench-v2',
    componentFamily: 'Cylinder',
    unitModel: 'ALL',
    revision: 1,
    status: 'ACTIVE',
    effectiveDate: '2026-03-01T00:00:00Z',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    maxAllowableLoad: 300,
    checkingPointStandards: [
      { itemId: 'item-cyl-proof-press', itemName: 'Proof Pressure Test (Holding 3 min)', unit: 'MPa', validationType: 'RANGE', minimumValue: 28.0, maximumValue: 35.0, mandatory: true },
      { itemId: 'item-cyl-drift-rate', itemName: 'Internal Leakage / Piston Bypass (Drift)', unit: 'mm/5min', validationType: 'MAXIMUM', maximumValue: 2.0, mandatory: true },
      { itemId: 'item-cyl-ext-leak', itemName: 'Rod Seal & Wiper External Leakage', unit: 'mL/min', validationType: 'MAXIMUM', maximumValue: 0, mandatory: true },
    ]
  }
];

export function getStandardProfileForProduct(productId: string, unitModel: string, compGroup: string, component: string): string {
  const normUnit = (unitModel || '').toUpperCase().trim();
  const normComp = (component || '').toUpperCase().trim();

  // Engine dynotest profiles
  if (compGroup === 'Engine') {
    if (normUnit === 'HD785-7') return 'prof-dyno-hd785-7';
    if (normUnit === 'HD465-7') return 'prof-dyno-hd465-7';
    if (normUnit === 'HD465-7R') return 'prof-dyno-hd465-7r';
    if (normUnit === 'HD1500-7') return 'prof-dyno-hd1500-7';
    if (normUnit === 'D155A-6R') return 'prof-dyno-d155a-6r';
    if (normUnit === 'D375A-6R') return 'prof-dyno-d375a-6r';
    if (normUnit === 'PC1250SP-8R') return 'prof-dyno-pc1250sp-8r';
    if (normUnit === 'PC2000-8') return 'prof-dyno-pc2000-8';
    if (normUnit === 'PC2000-11R') return 'prof-dyno-pc2000-11r';
    return 'prof-dyno-generic-engine';
  }

  // Cylinder profiles
  if (compGroup === 'Cylinder') {
    if (normUnit === 'PC1250SP-8R') return 'prof-cyl-pc1250sp-8r';
    return 'prof-cyl-generic';
  }

  // PT-PPM Profiles
  if (normComp.includes('PUMP')) {
    if (normUnit === 'PC1250SP-8R') return 'prof-pump-pc1250sp-8r';
    if (normUnit === 'PC2000-8') return 'prof-pump-pc2000-8';
    return 'prof-pump-generic';
  }

  if (normComp.includes('MOTOR') || normComp.includes('MACHINERY')) {
    return 'prof-motor-generic';
  }

  if (normComp.includes('TORQUE CONVERTER')) {
    return 'prof-tc-generic';
  }

  if (normComp.includes('TORQFLOW')) {
    return 'prof-torqflow-generic';
  }

  if (normComp.includes('TRANSMISSION')) {
    return 'prof-trans-generic';
  }

  if (normComp.includes('POWER TAKE OFF')) {
    return 'prof-pto-generic';
  }

  if (normComp.includes('POWER MODULE')) {
    return 'prof-power-module-generic';
  }

  if (normComp.includes('FINAL DRIVE') || normComp.includes('AXLE ASSY')) {
    if (normUnit.startsWith('HD') || normUnit.startsWith('HM')) {
      return 'prof-final-drive-hd-generic';
    }
    if (normUnit.startsWith('GD')) {
      return 'prof-final-drive-gd-generic';
    }
    return 'prof-final-drive-pc-dz-generic';
  }

  if (normComp.includes('DIFFERENTIAL')) {
    return 'prof-diff-generic';
  }

  if (normComp.includes('FRONT AXLE') || (normComp.includes('AXLE ASSY FRONT') && compGroup === 'PT-PPM')) {
    return 'prof-front-axle-generic';
  }

  if (normComp.includes('BRAKE')) {
    return 'prof-front-brake-generic';
  }

  return 'prof-pump-generic';
}
