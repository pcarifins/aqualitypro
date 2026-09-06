import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Load config
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
if (!fs.existsSync(configPath)) {
  console.error('Error: firebase-applet-config.json not found at project root.');
  process.exit(1);
}

const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const app = initializeApp(firebaseConfig);
const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

const COLLECTIONS = [
  'users',
  'assemblers',
  'productModels',
  'checksheetTemplates',
  'checksheets',
  'testingLines',
  'priorityQueue',
  'gltRecords',
  'dynoRecords',
  'hydraulicRecords',
  'pdfReports',
  'certificates',
  'testOverrides',
];

async function runAudit() {
  console.log('=== FIRESTORE DATA AUDIT ===');
  console.log(`Project ID: ${firebaseConfig.projectId}`);
  console.log(`Database ID: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);
  console.log('------------------------------------');

  let totalDocuments = 0;
  for (const colName of COLLECTIONS) {
    try {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      const count = snapshot.size;
      totalDocuments += count;
      console.log(`Collection [${colName}]: ${count} documents`);
    } catch (err: any) {
      console.error(`Collection [${colName}]: FAILED to read (${err.message})`);
    }
  }

  console.log('------------------------------------');
  console.log(`Audit Completed. Total verified documents across master data: ${totalDocuments}`);
  process.exit(0);
}

runAudit().catch((err) => {
  console.error('Audit script failed:', err);
  process.exit(1);
});
