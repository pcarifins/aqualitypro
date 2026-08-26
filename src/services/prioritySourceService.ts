import { QueueRecord, CompGroup } from '../types';
import { store } from '../data/storageEngine';

export interface ExternalPPCItem {
  joRoNumber: string;
  compGroup: CompGroup;
  subGroup?: 'PT' | 'PPM' | null;
  unitModel: string;
  component: string;
  testType: 'PROD' | 'RETEST';
  plannedPriority?: number;
  customer?: string;
  partNumber?: string;
  serialNumber?: string;
  assemblyMechanic?: string;
  targetDate?: string;
  remark?: string;
  isUrgent?: boolean;
  source?: 'SHAREPOINT';
}

export interface PPCSyncResult {
  success: boolean;
  added: number;
  updated: number;
  unchanged?: number;
  invalid?: number;
  conflict?: number;
  quarantined?: Array<{
    joNumber?: string;
    unitModel?: string;
    component?: string;
    reason: string;
  }>;
  fileName?: string;
  rowsRead?: number;
  sheetName?: string;
  error?: string;
}

/**
 * Service abstraction for syncing external PPC SharePoint Excel data
 * Flow: Priority Testing - PPC.xlsx -> SharePoint -> Sync PPC -> Existing Queue logic
 *
 * Rules:
 * - Real Excel reading only; no dummy mock records fallback.
 * - Product Master validation gating.
 * - Non-destructive DIFF + UPSERT: Only update permitted planning metadata on matching JOs.
 * - Operational & execution data protection: never overwrite running status, timestamps, or test parameters.
 * - Duplicate JO prevention across Manual JO and SharePoint JOs.
 */
export const prioritySourceService = {
  // Fetch real external PPC Excel data from SharePoint server endpoint
  fetchExternalPPCData: async (): Promise<ExternalPPCItem[]> => {
    const res = await fetch('/api/sharepoint/ppc-data');
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to fetch SharePoint Excel data (${res.status})`);
    }
    const data = await res.json();
    if (!data.success) {
      throw new Error(data.error || 'Failed to fetch SharePoint Excel data');
    }
    return data.items || [];
  },

  // Sync external items into Firestore Queue with full DIFF + UPSERT
  syncWithStore: async (currentUser: string): Promise<PPCSyncResult> => {
    const res = await fetch('/api/sharepoint/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentUser }),
    });

    const result = await res.json().catch(() => ({}));
    if (!res.ok || !result.success) {
      throw new Error(
        result.error || `SharePoint sync failed with status ${res.status}`
      );
    }

    return {
      success: true,
      added: result.added || 0,
      updated: result.updated || 0,
      unchanged: result.unchanged || 0,
      invalid: result.invalid || 0,
      conflict: result.conflict || 0,
      quarantined: result.quarantined || [],
      fileName: result.fileName || 'Priority Testing - PPC.xlsx',
      rowsRead: result.rowsRead || 0,
      sheetName: result.sheetName || 'PPC_Schedule',
    };
  },
};
