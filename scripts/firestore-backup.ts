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
  'auditLogs',
  'templateRelationships',
  'finalTestTemplateRelationships',
  'productChecksheetRelationships',
  'standardProfiles',
];

async function runBackup() {
  console.log('=== STARTING FIRESTORE BACKUP ===');
  console.log(`Target Project: ${firebaseConfig.projectId}`);
  console.log('------------------------------------');

  const backupData: Record<string, any[]> = {};
  let totalDocs = 0;

  for (const colName of COLLECTIONS) {
    try {
      console.log(`Backing up collection [${colName}]...`);
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      
      const docs: any[] = [];
      snapshot.forEach((doc) => {
        docs.push({
          id: doc.id,
          ...doc.data(),
        });
      });

      backupData[colName] = docs;
      totalDocs += docs.length;
      console.log(`Successfully backed up ${docs.length} documents from [${colName}]`);
    } catch (err: any) {
      console.error(`Error backing up collection [${colName}]:`, err.message);
    }
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.resolve(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }

  const backupPath = path.join(backupDir, `firestore-backup-${timestamp}.json`);
  const finalPayload = {
    timestamp: new Date().toISOString(),
    projectId: firebaseConfig.projectId,
    totalDocuments: totalDocs,
    collections: backupData,
  };

  fs.writeFileSync(backupPath, JSON.stringify(finalPayload, null, 2), 'utf8');

  console.log('------------------------------------');
  console.log(`Backup completed successfully!`);
  console.log(`File: ${backupPath}`);
  console.log(`Total Documents Copied: ${totalDocs}`);
  console.log('====================================');
  process.exit(0);
}

runBackup().catch((err) => {
  console.error('Backup script failed:', err);
  process.exit(1);
});
