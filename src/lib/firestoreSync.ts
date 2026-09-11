import {
  collection,
  getDocs,
  getDoc,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from './firebase';
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
import { initialTestingLines } from '../data/initialTestingLines';
import { INITIAL_STANDARD_PROFILES } from '../data/standardProfilesMaster';
import { INITIAL_TEMPLATE_RELATIONSHIPS } from '../data/relationshipsMaster';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function sanitizeFirestoreValue(value: any): any {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeFirestoreValue(item))
      .filter((item) => item !== undefined);
  }

  if (typeof value === 'object') {
    const cleaned: Record<string, any> = {};

    Object.entries(value).forEach(([key, val]) => {
      const cleanedValue = sanitizeFirestoreValue(val);

      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    });

    return cleaned;
  }

  return value;
}

export async function fetchCollection<T>(collectionName: string): Promise<T[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const items: T[] = [];
    querySnapshot.forEach((docSnap) => {
      items.push({ id: docSnap.id, ...docSnap.data() } as T);
    });
    return items;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionName);
  }
}

export async function saveDocument<
  T extends { id?: string; queueRecordId?: string; reportId?: string; certificateId?: string; profileId?: string; relationshipId?: string }
>(collectionName: string, data: T): Promise<void> {
  const docId = data.id || data.queueRecordId || data.reportId || data.certificateId || data.profileId || data.relationshipId;
  if (!docId) {
    throw new Error(
      `Cannot save to ${collectionName}: Missing document id, queueRecordId, reportId, or certificateId`
    );
  }
  const cleanData = sanitizeFirestoreValue(data);
  try {
    await setDoc(doc(db, collectionName, docId), cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

export async function removeDocument(
  collectionName: string,
  id: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${id}`);
  }
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
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, collectionName);
      }
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
    const auditDoc = sanitizeFirestoreValue({
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
    });
    await setDoc(doc(db, 'auditLogs', auditId), auditDoc);
  } catch (err) {
    console.error('Failed to write audit log to Firestore:', err);
  }
}

// Perform self-healing idempotent audit and restoration of all required Firestore master data
export async function initializeAndMigrateFirestore(): Promise<{
  migrated: boolean;
  message: string;
}> {
  try {
    console.log('Auditing Firestore master data collections...');
    let restoredCount = 0;

    // 1. Users
    const existingUsers = await fetchCollection<any>('users');
    const existingUserIds = new Set(existingUsers.map((u) => u.id));
    for (const u of initialUsers) {
      if (!existingUserIds.has(u.id)) {
        console.log(`Restoring missing initial user: ${u.username}`);
        await saveDocument('users', u);
        restoredCount++;
      }
    }

    // 2. Assemblers
    const existingAssemblers = await fetchCollection<any>('assemblers');
    const existingAssemblerIds = new Set(existingAssemblers.map((a) => a.id));
    for (const a of initialAssemblers) {
      if (!existingAssemblerIds.has(a.id)) {
        console.log(`Restoring missing initial assembler: ${a.name}`);
        await saveDocument('assemblers', a);
        restoredCount++;
      }
    }

    // 3. Product Models (Combine initialProductModels and INITIAL_REQUIRED_PRODUCT_MODELS)
    const existingModels = await fetchCollection<any>('productModels');
    const existingModelIds = new Set(existingModels.map((m) => m.id));
    const allModels = [...initialProductModels, ...INITIAL_REQUIRED_PRODUCT_MODELS];
    for (const m of allModels) {
      if (!existingModelIds.has(m.id)) {
        console.log(`Restoring missing required product model: ${m.modelName}`);
        await saveDocument('productModels', m);
        restoredCount++;
      }
    }

    // 4. Checksheet Templates
    const existingTemplates = await fetchCollection<any>('checksheetTemplates');
    const existingTemplateIds = new Set(existingTemplates.map((t) => t.id));
    for (const t of initialChecksheetTemplates) {
      if (!existingTemplateIds.has(t.id)) {
        console.log(`Restoring missing checksheet template: ${t.name}`);
        await saveDocument('checksheetTemplates', t);
        restoredCount++;
      }
    }

    // 5. Flat Checksheets
    const existingChecksheets = await fetchCollection<any>('checksheets');
    const existingChecksheetIds = new Set(existingChecksheets.map((c) => c.id));
    for (const c of initialChecksheetItems) {
      if (!existingChecksheetIds.has(c.id)) {
        console.log(`Restoring missing checksheet item: ${c.itemName}`);
        await saveDocument('checksheets', c);
        restoredCount++;
      }
    }

    // 6. Queue Records
    const existingQueue = await fetchCollection<any>('priorityQueue');
    const existingQueueIds = new Set(existingQueue.map((q) => q.queueRecordId || (q as any).id));
    for (const q of initialQueueRecords) {
      const qId = q.queueRecordId || (q as any).id;
      if (!existingQueueIds.has(qId)) {
        console.log(`Restoring missing queue record: ${q.joRoNumber}`);
        await saveDocument('priorityQueue', q);
        restoredCount++;
      }
    }

    // 7. Testing Lines
    const existingTestingLines = await fetchCollection<any>('testingLines');
    const existingTestingLineIds = new Set(existingTestingLines.map((tl) => tl.id));
    for (const tl of initialTestingLines) {
      if (!existingTestingLineIds.has(tl.id)) {
        console.log(`Restoring missing testing line: ${tl.name}`);
        await saveDocument('testingLines', tl);
        restoredCount++;
      }
    }

    // 8. GLT Records
    const existingGLT = await fetchCollection<any>('gltRecords');
    const existingGLTIds = new Set(existingGLT.map((g) => g.id));
    for (const g of initialGLTRecords) {
      if (!existingGLTIds.has(g.id)) {
        console.log(`Restoring missing GLT record: ${g.joNumber}`);
        await saveDocument('gltRecords', g);
        restoredCount++;
      }
    }

    // 9. Dyno Records
    const existingDyno = await fetchCollection<any>('dynoRecords');
    const existingDynoIds = new Set(existingDyno.map((d) => d.id));
    for (const d of initialDynotestRecords) {
      if (!existingDynoIds.has(d.id)) {
        console.log(`Restoring missing Dyno record: ${d.joNumber}`);
        await saveDocument('dynoRecords', d);
        restoredCount++;
      }
    }

    // 10. Hydraulic Records
    const existingHyd = await fetchCollection<any>('hydraulicRecords');
    const existingHydIds = new Set(existingHyd.map((h) => h.id));
    for (const h of initialHydraulicRecords) {
      if (!existingHydIds.has(h.id)) {
        console.log(`Restoring missing hydraulic record: ${h.joNumber}`);
        await saveDocument('hydraulicRecords', h);
        restoredCount++;
      }
    }

    // 11. Standard Profiles
    const existingProfiles = await fetchCollection<any>('standardProfiles');
    const existingProfileIds = new Set(existingProfiles.map((p) => p.standardProfileId || p.profileId || p.id));
    for (const p of INITIAL_STANDARD_PROFILES) {
      const pId = p.standardProfileId || p.profileId || p.id;
      if (!existingProfileIds.has(pId)) {
        console.log(`Restoring missing standard profile: ${p.name}`);
        await saveDocument('standardProfiles', p);
        await saveDocument('checksheetStandardProfiles', p);
        restoredCount++;
      }
    }

    // 12. Template Relationships (All 169 authoritative products)
    const existingRelationships = await fetchCollection<any>('templateRelationships');
    const existingRelationshipIds = new Set(existingRelationships.map((r) => r.relationshipId || r.id));
    for (const r of INITIAL_TEMPLATE_RELATIONSHIPS) {
      const rId = r.relationshipId || r.id;
      if (!existingRelationshipIds.has(rId)) {
        console.log(`Restoring missing template relationship: ${r.relationshipId}`);
        await saveDocument('templateRelationships', r);
        await saveDocument('finalTestTemplateRelationships', r);
        restoredCount++;
      }
    }

    // Mark migration completed / audited in Firestore
    const migrationDocRef = doc(db, 'systemConfig', 'databaseMigration');
    await setDoc(migrationDocRef, {
      version: 'firestore-relationships-architecture-v1',
      completed: true,
      completedAt: new Date().toISOString(),
      migratedBy: 'idempotent-relationship-architecture-sync-engine',
      totalActiveRelationships: INITIAL_TEMPLATE_RELATIONSHIPS.length,
      lastAuditRestoredCount: restoredCount,
    });

    console.log(`Idempotent Firestore audit/migration completed. Restored ${restoredCount} records.`);
    return {
      migrated: restoredCount > 0,
      message: `Database audited. Restored ${restoredCount} missing records.`,
    };
  } catch (error: any) {
    console.error('Audit and migration to Firestore failed:', error);
    return {
      migrated: false,
      message: `Audit/migration failed: ${error?.message || 'Unknown error'}`,
    };
  }
}
