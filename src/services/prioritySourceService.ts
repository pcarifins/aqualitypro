import { QueueRecord, CompGroup, UserRole } from '../types';
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
  isUrgent?: boolean;
}

/**
 * Service abstraction for syncing external PPC Spreadsheet / API data
 * Flow: External PPC Spreadsheet/API -> AQuality PRO Queue
 *
 * Rules:
 * - External source may add new records or update metadata.
 * - External source MUST NOT overwrite currentPriority after manual adjustment,
 *   priority history, priority lock (ON_PROCESS), or manual remarks.
 */
export const prioritySourceService = {
  // Simulate fetching from external PPC Google Sheet / Enterprise API
  fetchExternalPPCData: async (): Promise<ExternalPPCItem[]> => {
    // In production, this can call an actual backend /api/ppc/sync endpoint or Google Sheets API
    return [
      {
        joRoNumber: '24109881',
        compGroup: 'Engine',
        unitModel: 'HD785-7',
        component: 'ENGINE ASSY',
        testType: 'RETEST',
        plannedPriority: 1,
        customer: 'PT Freeport Indonesia',
        partNumber: '6217-00-1001',
        serialNumber: 'SN-ENG-8812',
        assemblyMechanic: 'Ardian Hidayat',
        isUrgent: false,
      },
      {
        joRoNumber: '24109882',
        compGroup: 'Engine',
        unitModel: 'PC2000-8R',
        component: 'ENGINE ASSY',
        testType: 'PROD',
        plannedPriority: 2,
        customer: 'PT Kaltim Prima Coal',
        partNumber: '6219-00-2002',
        serialNumber: 'SN-ENG-8813',
        assemblyMechanic: 'Ahmad Baidowi',
        isUrgent: false,
      },
      {
        joRoNumber: '24109883',
        compGroup: 'PT-PPM',
        subGroup: 'PPM',
        unitModel: 'PC1250SP-8R',
        component: 'MAIN PUMP NO 1',
        testType: 'RETEST',
        plannedPriority: 1,
        customer: 'PT Adaro Energy',
        partNumber: '708-2L-00400',
        serialNumber: 'SN-PPM-7711',
        assemblyMechanic: 'Kurniawan',
        isUrgent: true, // Urgent unassigned test
      },
      {
        joRoNumber: '24109884',
        compGroup: 'PT-PPM',
        subGroup: 'PT',
        unitModel: 'HD785-7',
        component: 'TORQFLOW ASSY',
        testType: 'PROD',
        plannedPriority: 2,
        customer: 'PT Berau Coal',
        partNumber: '711-47-00100',
        serialNumber: 'SN-PT-5521',
        assemblyMechanic: 'Sudirman',
        isUrgent: false,
      },
      {
        joRoNumber: '24109885',
        compGroup: 'Cylinder',
        unitModel: 'HD785-7',
        component: 'HOIST CYLINDER',
        testType: 'PROD',
        plannedPriority: 1,
        customer: 'PT Bukit Asam',
        partNumber: '707-13-10200',
        serialNumber: 'SN-CYL-3341',
        assemblyMechanic: 'Ardian Hidayat',
        isUrgent: false,
      },
    ];
  },

  // Sync external items into AQuality PRO store without overwriting manual priority
  syncWithStore: async (currentUser: string): Promise<{ added: number; updated: number }> => {
    const externalItems = await prioritySourceService.fetchExternalPPCData();
    const existingQueue = store.getQueueRecords();

    let added = 0;
    let updated = 0;

    for (const item of externalItems) {
      const existing = existingQueue.find(
        (q) => q.joRoNumber.toUpperCase() === item.joRoNumber.toUpperCase() && q.compGroup === item.compGroup
      );

      if (existing) {
        // Update non-priority metadata only. DO NOT overwrite currentPriority, locked status, or remarks
        store.updateQueueRecord(existing.queueRecordId, {
          customer: item.customer || existing.customer,
          partNumber: item.partNumber || existing.partNumber,
          serialNumber: item.serialNumber || existing.serialNumber,
          assemblyMechanic: item.assemblyMechanic || existing.assemblyMechanic,
          subGroup: item.subGroup || existing.subGroup,
        });
        updated++;
      } else {
        // Calculate planned priority
        const compGroupQueue = existingQueue.filter(
          (q) => q.compGroup === item.compGroup && !q.isUrgentUnassigned && q.status === 'WAITING'
        );
        const nextPriority = item.isUrgent ? 999 : item.plannedPriority || compGroupQueue.length + 1;

        const newRecord: QueueRecord = {
          queueRecordId: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          joRoNumber: item.joRoNumber,
          compGroup: item.compGroup,
          subGroup: item.subGroup || null,
          unitModel: item.unitModel,
          component: item.component,
          testType: item.testType,
          plannedPriority: item.plannedPriority || nextPriority,
          currentPriority: nextPriority,
          isUrgentUnassigned: item.isUrgent || false,
          status: 'WAITING',
          priorityLocked: false,
          customer: item.customer,
          partNumber: item.partNumber,
          serialNumber: item.serialNumber,
          assemblyMechanic: item.assemblyMechanic,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: [
            {
              oldPriority: 0,
              newPriority: nextPriority,
              remark: 'Imported from PPC Data Source',
              changedBy: currentUser,
              changedAt: new Date().toISOString(),
            },
          ],
        };

        if (item.testType === 'RETEST') {
          newRecord.aiRecommendation = {
            suggestedPriority: 1,
            reason: 'High priority Retest item with downstream delivery commitment.',
          };
        }

        store.addQueueRecord(newRecord);
        added++;
      }
    }

    return { added, updated };
  },
};
