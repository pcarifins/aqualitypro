import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  getFirestore,
  memoryLocalCache,
  setLogLevel,
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export { firebaseConfig };

setLogLevel('error');

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Correctly specify firestoreDatabaseId if configured
export const db = (function () {
  try {
    if (firebaseConfig.firestoreDatabaseId) {
      return initializeFirestore(app, {
        localCache: memoryLocalCache(),
        ignoreUndefinedProperties: true,
      }, firebaseConfig.firestoreDatabaseId);
    } else {
      return initializeFirestore(app, {
        localCache: memoryLocalCache(),
        ignoreUndefinedProperties: true,
      });
    }
  } catch {
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
})();

export const auth = getAuth(app);

// Workspace OAuth Provider (Google Sheets & Drive integration)
export const googleAuthProvider = new GoogleAuthProvider();
googleAuthProvider.addScope('https://www.googleapis.com/auth/spreadsheets');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.file');
googleAuthProvider.addScope('https://www.googleapis.com/auth/drive.readonly');
googleAuthProvider.setCustomParameters({
  prompt: 'select_account',
});
