import { signInWithPopup, signOut, GoogleAuthProvider, User as FirebaseUser } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { CombinedJORecords, GLTRecord, DynotestRecord, HydraulicRecord, QueueRecord } from '../types';

export interface GoogleSheetsAuthState {
  isConnected: boolean;
  accessToken: string | null;
  userEmail: string | null;
  userName: string | null;
  userPhoto: string | null;
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  lastSyncTime: string | null;
}

const STORAGE_SHEETS_CONFIG = 'aquality_google_sheets_config_v1';

// In-memory token cache (following security guidelines)
let cachedAccessToken: string | null = null;

export const googleSheetsService = {
  // Get current saved configuration (non-secret metadata)
  getConfig: (): Partial<GoogleSheetsAuthState> => {
    try {
      const saved = localStorage.getItem(STORAGE_SHEETS_CONFIG);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Ignore storage errors
    }
    return {};
  },

  saveConfig: (config: Partial<GoogleSheetsAuthState>) => {
    try {
      const current = googleSheetsService.getConfig();
      const updated = { ...current, ...config };
      // NEVER store access token in localStorage
      delete updated.accessToken;
      localStorage.setItem(STORAGE_SHEETS_CONFIG, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save sheets config:', e);
    }
  },

  getAccessToken: (): string | null => {
    return cachedAccessToken;
  },

  setAccessToken: (token: string | null) => {
    cachedAccessToken = token;
  },

  // Authenticate user with Google OAuth using Firebase popup
  connectGoogleAccount: async (): Promise<{
    user: FirebaseUser;
    accessToken: string;
  }> => {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Google OAuth succeeded but no access token was returned.');
      }

      cachedAccessToken = credential.accessToken;

      googleSheetsService.saveConfig({
        isConnected: true,
        userEmail: result.user.email,
        userName: result.user.displayName,
        userPhoto: result.user.photoURL,
      });

      return {
        user: result.user,
        accessToken: cachedAccessToken,
      };
    } catch (error: any) {
      console.error('Google Sheets sign-in error:', error);
      throw error;
    }
  },

  // Disconnect Google account
  disconnect: async () => {
    try {
      await signOut(auth);
    } catch {}
    cachedAccessToken = null;
    try {
      localStorage.removeItem(STORAGE_SHEETS_CONFIG);
    } catch {}
  },

  // Create a brand new formatted Google Spreadsheet
  createMasterSpreadsheet: async (
    token: string,
    history: CombinedJORecords[],
    gltRecords: GLTRecord[],
    dynoRecords: DynotestRecord[],
    hydraulicRecords: HydraulicRecord[],
    queueRecords: QueueRecord[]
  ): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
    const timestamp = new Date().toISOString().split('T')[0];
    const title = `AQuality PRO - Testing & QC Master Log (${timestamp})`;

    // 1. Create Spreadsheet with sheets
    const createPayload = {
      properties: {
        title,
        locale: 'en_US',
        autoRecalc: 'ON_CHANGE',
      },
      sheets: [
        { properties: { title: 'JO_Master_Summary', tabColor: { red: 0.1, green: 0.3, blue: 0.8 } } },
        { properties: { title: 'GLT_Inspection_Log', tabColor: { red: 0.1, green: 0.6, blue: 0.3 } } },
        { properties: { title: 'Dynotest_Engine_Log', tabColor: { red: 0.8, green: 0.4, blue: 0.1 } } },
        { properties: { title: 'Hydraulic_Bench_Log', tabColor: { red: 0.6, green: 0.1, blue: 0.8 } } },
        { properties: { title: 'PPC_Priority_Queue', tabColor: { red: 0.2, green: 0.5, blue: 0.7 } } },
      ],
    };

    const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createPayload),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || 'Failed to create Google Spreadsheet');
    }

    const createdSheet = await res.json();
    const spreadsheetId = createdSheet.spreadsheetId;
    const spreadsheetUrl = createdSheet.spreadsheetUrl;

    // 2. Populate sheets with headers & initial data
    await googleSheetsService.populateAllSheets(
      token,
      spreadsheetId,
      history,
      gltRecords,
      dynoRecords,
      hydraulicRecords,
      queueRecords
    );

    googleSheetsService.saveConfig({
      spreadsheetId,
      spreadsheetUrl,
      lastSyncTime: new Date().toISOString(),
    });

    return { spreadsheetId, spreadsheetUrl };
  },

  // Populate all sheets in spreadsheet
  populateAllSheets: async (
    token: string,
    spreadsheetId: string,
    history: CombinedJORecords[],
    gltRecords: GLTRecord[],
    dynoRecords: DynotestRecord[],
    hydraulicRecords: HydraulicRecord[],
    queueRecords: QueueRecord[]
  ) => {
    // 1. JO Master Summary
    const joHeaders = [
      'JO / RO Number',
      'Unit Model',
      'Component',
      'Comp Group',
      'Customer',
      'Serial Number',
      'Part Number',
      'Assembly Mechanic',
      'Overall Status',
      'Latest Stage',
      'Latest Test Date',
      'GLT Count',
      'Dyno Count',
      'Hydraulic Count',
      'Sync Timestamp',
    ];

    const joRows = history.map((j) => [
      j.joNumber,
      j.unitModel || j.productModel,
      j.component || j.productModel,
      j.compGroup || j.productCategory,
      j.customer || 'Internal',
      j.serialNumber || '-',
      j.partNumber || '-',
      j.assemblyMechanic || '-',
      j.currentOverallStatus,
      j.latestStage,
      j.latestRecordDate || '',
      j.gltRecords.length,
      j.dynoRecords.length,
      j.hydraulicRecords.length,
      new Date().toISOString(),
    ]);

    // 2. GLT Log
    const gltHeaders = [
      'Record ID',
      'JO Number',
      'Unit Model',
      'Component',
      'Product Category',
      'Customer',
      'Serial Number',
      'Part Number',
      'Assembly Mechanic',
      'Inspector / Operator',
      'Inspection Date',
      'Result',
      'NG Item / Defect',
      'NG Description',
      'Remarks',
      'Submission Time',
    ];

    const gltRows = gltRecords.map((r) => [
      r.id,
      r.joNumber,
      r.unitModel || r.productModel,
      r.component || r.productModel,
      r.productCategory,
      r.customer || '-',
      r.serialNumber || '-',
      r.partNumber || '-',
      r.assemblyMechanic || '-',
      r.operatorName || r.testerName || '-',
      r.testDate,
      r.result,
      r.ngItem || r.leakLocation || '-',
      r.ngDescription || r.leakDescription || '-',
      r.remarks || '-',
      r.submissionTime || '',
    ]);

    // 3. Dynotest Log
    const dynoHeaders = [
      'Record ID',
      'JO Number',
      'Comp Group',
      'Unit Model',
      'Component',
      'Operator',
      'Receiving Time',
      'Lead Time (Mins)',
      'Result',
      'Power Output (kW)',
      'Peak Torque (Nm)',
      'Oil Temp (°C)',
      'Blowby (kPa)',
      'NG Item',
      'NG Description',
      'Remarks',
      'Submission Time',
    ];

    const dynoRows = dynoRecords.map((r) => [
      r.id,
      r.joNumber,
      r.compGroup || 'ENGINE',
      r.unitModel || '-',
      r.component || '-',
      r.operatorName,
      r.receivingTime,
      r.dynoLeadTimeMinutes || 0,
      r.result,
      r.powerOutputKw || '-',
      r.torqueNm || '-',
      r.oilTempCelsius || '-',
      r.blowbyKpa || '-',
      r.ngItem || '-',
      r.ngDescription || '-',
      r.remarks || '-',
      r.submissionTime || '',
    ]);

    // 4. Hydraulic Log
    const hydHeaders = [
      'Record ID',
      'JO Number',
      'Comp Group',
      'Unit Model',
      'Component',
      'Operator',
      'Receiving Time',
      'Lead Time (Mins)',
      'Result',
      'Main Relief Pressure (bar)',
      'Flow Rate (L/min)',
      'Internal Leak (mL/min)',
      'Oil Temperature (°C)',
      'NG Item',
      'NG Description',
      'Remarks',
      'Submission Time',
    ];

    const hydRows = hydraulicRecords.map((r) => [
      r.id,
      r.joNumber,
      r.compGroup || 'POWER_TRAIN',
      r.unitModel || '-',
      r.component || '-',
      r.operatorName,
      r.receivingTime,
      r.hydraulicLeadTimeMinutes || 0,
      r.result,
      r.mainReliefPressureBar || '-',
      r.flowRateLpm || '-',
      r.internalLeakageMlMin || '-',
      r.oilTemperatureCelsius || '-',
      r.ngItem || '-',
      r.ngDescription || '-',
      r.remarks || '-',
      r.submissionTime || '',
    ]);

    // 5. PPC Queue Log
    const queueHeaders = [
      'Queue ID',
      'JO / RO Number',
      'Comp Group',
      'Sub Group',
      'Unit Model',
      'Component',
      'Customer',
      'Current Priority',
      'Planned Priority',
      'Status',
      'Test Type',
      'Is Urgent',
      'Updated At',
    ];

    const queueRows = queueRecords.map((q) => [
      q.queueRecordId,
      q.joRoNumber,
      q.compGroup,
      q.subGroup || '-',
      q.unitModel,
      q.component,
      q.customer || 'Internal',
      q.currentPriority,
      q.plannedPriority,
      q.status,
      q.testType,
      q.isUrgentUnassigned ? 'YES' : 'NO',
      q.updatedAt,
    ]);

    // Batch update values
    const valueRanges = [
      { range: 'JO_Master_Summary!A1', values: [joHeaders, ...joRows] },
      { range: 'GLT_Inspection_Log!A1', values: [gltHeaders, ...gltRows] },
      { range: 'Dynotest_Engine_Log!A1', values: [dynoHeaders, ...dynoRows] },
      { range: 'Hydraulic_Bench_Log!A1', values: [hydHeaders, ...hydRows] },
      { range: 'PPC_Priority_Queue!A1', values: [queueHeaders, ...queueRows] },
    ];

    const updateRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: valueRanges,
        }),
      }
    );

    if (!updateRes.ok) {
      const err = await updateRes.json();
      throw new Error(err.error?.message || 'Failed to populate sheet data');
    }
  },

  // Append a single GLT, Dyno, or Hydraulic record live into Google Sheet
  appendRecord: async (
    token: string,
    spreadsheetId: string,
    sheetName: string,
    row: (string | number | boolean)[]
  ) => {
    try {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            values: [row],
          }),
        }
      );
    } catch (e) {
      console.warn(`Failed to live append to sheet ${sheetName}:`, e);
    }
  },

  // Read data from a Google Sheet range
  readRange: async (token: string, spreadsheetId: string, range: string) => {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(
        range
      )}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) {
      throw new Error('Failed to read Google Sheet data');
    }
    return res.json();
  },
};
