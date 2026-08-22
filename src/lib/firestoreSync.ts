import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  initialUsers,
  initialAssemblers,
  initialProductModels,
  initialChecksheetTemplates,
  initialChecksheetItems,
  initialGLTRecords,
  initialDynotestRecords,
  initialHydraulicRecords,
} from '../data/initialData';
import { INITIAL_REQUIRED_PRODUCT_MODELS } from '../data/productMasterSeed';
import { initialQueueRecords } from '../data/initialQueueData';

export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const items: T[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() } as T);
    });
    return items;
  } catch (error) {
    console.error(`Error fetching collection ${collectionName}:`, error);
    return [];
  }
}

export async function saveDocument<
  T extends { id?: string; queueRecordId?: string; reportId?: string; certificateId?: string }
>(collectionName: string, data: T): Promise<void> {
  const docId = data.id || data.queueRecordId || data.reportId || data.certificateId;
  if (!docId) {
    throw new Error(
      `Cannot save to ${collectionName}: Missing document id, queueRecordId, reportId, or certificateId`
    );
  }
  await setDoc(doc(db, collectionName, docId), data, { merge: true });
}

export async function removeDocument(
  collectionName: string,
  id: string
): Promise<void> {
  await deleteDoc(doc(db, collectionName, id));
}

export function subscribeToCollection<T>(
  collectionName: string,
  callback: (data: T[]) => void,
  onError?: (err: Error) => void
) {
  return onSnapshot(
    collection(db, collectionName),
    (snapshot) => {
      const items: T[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as T);
      });
      callback(items);
    },
    (error) => {
      console.error(`Error subscribing to ${collectionName}:`, error);
      if (onError) onError(error);
    }
  );
}

export async function testFirestoreConnection(): Promise<{
  connected: boolean;
  message: string;
  timestamp: string;
  latencyMs: number;
}> {
  const start = Date.now();
  try {
    const testDocRef = doc(db, '_connection_test', 'ping');
    const now = new Date().toISOString();
    await setDoc(testDocRef, { timestamp: now, status: 'ok' }, { merge: true });
    const elapsed = Date.now() - start;
    return {
      connected: true,
      message: 'Cloud Firestore database is online and actively synchronized.',
      timestamp: now,
      latencyMs: elapsed,
    };
  } catch (error: any) {
    console.error('Firestore connection test failed:', error);
    return {
      connected: false,
      message: error?.message || 'Failed to connect to Firestore',
      timestamp: new Date().toISOString(),
      latencyMs: Date.now() - start,
    };
  }
}

export async function logAuditEvent(event: {
  action: string;
  collectionName: string;
  documentId: string;
  userUid?: string;
  userName?: string;
  userRole?: string;
  details?: string;
  previousValue?: any;
  newValue?: any;
}): Promise<void> {
  try {
    const auditId = `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const auditDoc = {
      id: auditId,
      timestamp: new Date().toISOString(),
      userUid: event.userUid || 'anonymous',
      userName: event.userName || 'System',
      userRole: event.userRole || 'UNKNOWN',
      action: event.action,
      collectionName: event.collectionName,
      documentId: event.documentId,
      details: event.details || '',
      previousValue: event.previousValue || null,
      newValue: event.newValue || null,
    };
    await setDoc(doc(db, 'auditLogs', auditId), auditDoc);
  } catch (err) {
    console.error('Failed to write audit log to Firestore:', err);
  }
}

// Check and perform one-time migration to Firestore
export async function initializeAndMigrateFirestore(): Promise<{
  migrated: boolean;
  message: string;
}> {
  try {
    const migrationDocRef = doc(db, 'systemConfig', 'databaseMigration');
    const migrationSnap = await getDoc(migrationDocRef);

    if (migrationSnap.exists() && migrationSnap.data()?.completed === true) {
      return {
        migrated: false,
        message: 'Firestore database is already initialized and up to date.',
      };
    }

    console.log('Starting one-time migration of local/seed data to Firestore...');

    // 1. Users
    const existingUsers = await fetchCollection<any>('users');
    const existingUserIds = new Set(existingUsers.map((u) => u.id));
    for (const u of initialUsers) {
      if (!existingUserIds.has(u.id)) {
        await saveDocument('users', u);
      }
    }

    // 2. Assemblers
    const existingAssemblers = await fetchCollection<any>('assemblers');
    const existingAssemblerIds = new Set(existingAssemblers.map((a) => a.id));
    for (const a of initialAssemblers) {
      if (!existingAssemblerIds.has(a.id)) {
        await saveDocument('assemblers', a);
      }
    }

    // 3. Product Models (Combine initialProductModels and INITIAL_REQUIRED_PRODUCT_MODELS)
    const existingModels = await fetchCollection<any>('productModels');
    const existingModelIds = new Set(existingModels.map((m) => m.id));
    const allModels = [...initialProductModels, ...INITIAL_REQUIRED_PRODUCT_MODELS];
    for (const m of allModels) {
      if (!existingModelIds.has(m.id)) {
        await saveDocument('productModels', m);
      }
    }

    // 4. Checksheet Templates
    const existingTemplates = await fetchCollection<any>('checksheetTemplates');
    const existingTemplateIds = new Set(existingTemplates.map((t) => t.id));
    for (const t of initialChecksheetTemplates) {
      if (!existingTemplateIds.has(t.id)) {
        await saveDocument('checksheetTemplates', t);
      }
    }

    // 5. Flat Checksheets
    const existingChecksheets = await fetchCollection<any>('checksheets');
    const existingChecksheetIds = new Set(existingChecksheets.map((c) => c.id));
    for (const c of initialChecksheetItems) {
      if (!existingChecksheetIds.has(c.id)) {
        await saveDocument('checksheets', c);
      }
    }

    // 6. Queue Records
    const existingQueue = await fetchCollection<any>('priorityQueue');
    const existingQueueIds = new Set(existingQueue.map((q) => q.queueRecordId));
    for (const q of initialQueueRecords) {
      if (!existingQueueIds.has(q.queueRecordId)) {
        await saveDocument('priorityQueue', q);
      }
    }

    // 7. GLT Records
    const existingGLT = await fetchCollection<any>('gltRecords');
    const existingGLTIds = new Set(existingGLT.map((g) => g.id));
    for (const g of initialGLTRecords) {
      if (!existingGLTIds.has(g.id)) {
        await saveDocument('gltRecords', g);
      }
    }

    // 8. Dyno Records
    const existingDyno = await fetchCollection<any>('dynoRecords');
    const existingDynoIds = new Set(existingDyno.map((d) => d.id));
    for (const d of initialDynotestRecords) {
      if (!existingDynoIds.has(d.id)) {
        await saveDocument('dynoRecords', d);
      }
    }

    // 9. Hydraulic Records
    const existingHyd = await fetchCollection<any>('hydraulicRecords');
    const existingHydIds = new Set(existingHyd.map((h) => h.id));
    for (const h of initialHydraulicRecords) {
      if (!existingHydIds.has(h.id)) {
        await saveDocument('hydraulicRecords', h);
      }
    }

    // Mark migration completed in Firestore
    await setDoc(migrationDocRef, {
      version: 'firestore-first-v1',
      completed: true,
      completedAt: new Date().toISOString(),
      migratedBy: 'auto-migration-engine',
    });

    console.log('One-time Firestore migration successfully completed.');
    return {
      migrated: true,
      message: 'Database migration to Cloud Firestore successfully completed.',
    };
  } catch (error: any) {
    console.error('Migration to Firestore failed:', error);
    return {
      migrated: false,
      message: `Migration failed: ${error?.message || 'Unknown error'}`,
    };
  }
}
