import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  User,
  ProductModel,
  ChecksheetItem,
  GLTRecord,
  DynotestRecord,
  HydraulicRecord,
} from '../types';

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

export async function saveDocument<T extends { id: string }>(
  collectionName: string,
  data: T
): Promise<void> {
  try {
    await setDoc(doc(db, collectionName, data.id), data, { merge: true });
  } catch (error) {
    console.error(`Error saving document in ${collectionName}:`, error);
  }
}

export async function removeDocument(
  collectionName: string,
  id: string
): Promise<void> {
  try {
    await deleteDoc(doc(db, collectionName, id));
  } catch (error) {
    console.error(`Error deleting document from ${collectionName}:`, error);
  }
}

export function subscribeToCollection<T>(
  collectionName: string,
  callback: (data: T[]) => void
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
    }
  );
}

export async function testFirestoreConnection(): Promise<{ connected: boolean; message: string; timestamp: string }> {
  try {
    const testDocRef = doc(db, '_connection_test', 'ping');
    const now = new Date().toISOString();
    await setDoc(testDocRef, { timestamp: now, status: 'ok' });
    return {
      connected: true,
      message: 'Cloud Firestore database is online and active.',
      timestamp: now,
    };
  } catch (error: any) {
    console.error('Firestore connection test failed:', error);
    return {
      connected: false,
      message: error?.message || 'Failed to connect to Firestore',
      timestamp: new Date().toISOString(),
    };
  }
}
