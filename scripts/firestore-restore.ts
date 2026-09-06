import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
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

async function runRestore() {
  console.log('=== STARTING FIRESTORE RESTORE ===');
  console.log(`Target Project: ${firebaseConfig.projectId}`);
  console.log('------------------------------------');

  const args = process.argv.slice(2);
  let backupFile = args[0];

  const backupDir = path.resolve(process.cwd(), 'backups');

  if (!backupFile) {
    if (!fs.existsSync(backupDir)) {
      console.error('Error: No backups folder found and no file specified.');
      process.exit(1);
    }
    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.json'));
    if (files.length === 0) {
      console.error('Error: No JSON backup files found in backups/ folder.');
      process.exit(1);
    }
    // Sort to get the latest file
    files.sort();
    backupFile = path.join(backupDir, files[files.length - 1]);
    console.log(`No backup file specified. Auto-selecting the latest backup: ${backupFile}`);
  } else {
    backupFile = path.resolve(process.cwd(), backupFile);
  }

  if (!fs.existsSync(backupFile)) {
    console.error(`Error: File not found at ${backupFile}`);
    process.exit(1);
  }

  console.log(`Loading backup data from: ${backupFile}`);
  const rawData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

  if (!rawData.collections) {
    console.error('Error: Invalid backup format. "collections" property is missing.');
    process.exit(1);
  }

  let restoredCount = 0;
  let skippedCount = 0;

  for (const [colName, docs] of Object.entries(rawData.collections)) {
    console.log(`Restoring collection [${colName}]...`);
    if (!Array.isArray(docs)) {
      console.warn(`Skipping key ${colName} as it is not an array.`);
      continue;
    }

    for (const docData of docs) {
      const docId = docData.id;
      if (!docId) {
        console.warn(`Skipping document without an ID in collection [${colName}]`);
        continue;
      }

      // Safe deep copy to avoid modifying source data
      const cleanedData = { ...docData };
      delete cleanedData.id; // ID is used as key, not inside document

      try {
        const docRef = doc(db, colName, docId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // Document already exists! We will merge missing fields but never overwrite
          await setDoc(docRef, cleanedData, { merge: true });
          skippedCount++;
        } else {
          // Document does not exist, safe to write fully
          await setDoc(docRef, cleanedData);
          restoredCount++;
        }
      } catch (err: any) {
        console.error(`Failed to restore document ${docId} in [${colName}]:`, err.message);
      }
    }
    console.log(`Finished collection [${colName}]`);
  }

  console.log('------------------------------------');
  console.log(`Restoration completed successfully!`);
  console.log(`Total Documents Restored (New): ${restoredCount}`);
  console.log(`Total Documents Merged (Existing preserved): ${skippedCount}`);
  console.log('====================================');
  process.exit(0);
}

runRestore().catch((err) => {
  console.error('Restoration script failed:', err);
  process.exit(1);
});
