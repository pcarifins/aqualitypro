import * as xlsx from 'xlsx';
import * as crypto from 'crypto';
import { store } from '../src/data/storageEngine';

const DEFAULT_SPREADSHEET_ID = "1vO_p2N1cTr0tMRU6ZuPjUjGeyOaW-eA0KF5JLnTigyQ";

export async function createBackupSnapshot(source: string, currentUser: string, sourceHash: string): Promise<string> {
  const backupId = `backup-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const snapshot = {
    backupId,
    source,
    sourceHash,
    timestamp: new Date().toISOString(),
    user: currentUser || 'System',
    priorityQueue: store.getQueueRecords(),
    testingLines: store.getTestingLines(false),
  };

  try {
    // Store in global store or local cache if available
    (global as any).__kra_backups = (global as any).__kra_backups || {};
    (global as any).__kra_backups[backupId] = snapshot;
  } catch (err) {
    console.warn("Failed to store backup snapshot:", err);
  }

  return backupId;
}

export async function downloadGoogleSpreadsheetBuffer(spreadsheetId?: string): Promise<Buffer> {
  const sheetId = spreadsheetId || process.env.PPC_GOOGLE_SPREADSHEET_ID || DEFAULT_SPREADSHEET_ID;
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(exportUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AQualityProGoogleSync/1.0',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, text/html',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error(`Google Sheets export failed with HTTP status ${res.status} ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Validate response is not HTML error/login page
    const textHead = buffer.toString('utf8', 0, Math.min(buffer.length, 600)).trim().toLowerCase();
    if (textHead.startsWith('<!doctype') || textHead.startsWith('<html') || textHead.includes('<title>google sheets') || textHead.includes('accounts.google.com') || textHead.includes('access denied')) {
      throw new Error("Google Sheets returned an HTML login, error, or access-denied page instead of an XLSX workbook. Ensure the sheet sharing permissions are set to 'Anyone with the link can view'.");
    }

    // Verify ZIP/XLSX binary signature (PK\x03\x04)
    if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4B || buffer[2] !== 0x03 || buffer[3] !== 0x04) {
      throw new Error("Downloaded Google Spreadsheet does not have a valid Excel/ZIP binary signature.");
    }

    return buffer;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') {
      throw new Error("Google Sheets export request timed out after 15 seconds.");
    }
    throw err;
  }
}

export async function processWorkbookBuffer(buffer: Buffer, sourceName: string, currentUser?: string): Promise<any> {
  const sourceHash = crypto.createHash('sha256').update(buffer).digest('hex');

  let workbook: xlsx.WorkBook;
  try {
    workbook = xlsx.read(buffer, { type: 'buffer' });
  } catch (err: any) {
    throw new Error(`Failed to parse workbook: ${err.message || 'invalid file format'}`);
  }

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error("Workbook contains no worksheets.");
  }

  // 1. Priority Testing Sheet Selection
  const priorityPreferred = ['Priority Testing', 'PPC_Schedule', 'PPC Schedule', 'PPC Priority', 'Priority', 'Sheet1'];
  let prioritySheetName = sheetNames[0];
  for (const pref of priorityPreferred) {
    const found = sheetNames.find(s => s.trim().toLowerCase() === pref.toLowerCase());
    if (found) {
      prioritySheetName = found;
      break;
    }
  }

  const priorityWs = workbook.Sheets[prioritySheetName];
  const priorityRows: any[] = xlsx.utils.sheet_to_json(priorityWs, { header: 1, defval: '' });

  if (priorityRows.length < 2) {
    throw new Error(`Priority worksheet '${prioritySheetName}' contains no data rows.`);
  }

  const headerRowIndex = priorityRows.findIndex(r => r && r.some((c: any) => c !== ''));
  if (headerRowIndex === -1) {
    throw new Error("Could not locate header row in priority worksheet.");
  }

  const rawHeaders = priorityRows[headerRowIndex].map((h: any) => String(h || '').trim());
  const findColIndex = (aliases: string[]) => {
    return rawHeaders.findIndex(h => {
      const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
      return aliases.some(alias => cleanH === alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
    });
  };

  const idxJo = findColIndex(['joNumber', 'jonumber', 'jo / ro number', 'jo/ro number', 'job order', 'no jo', 'no. jo', 'no.jo', 'jo', 'ro number', 'ro']);
  const idxModel = findColIndex(['unitModel', 'unitmodel', 'unit model', 'model unit', 'unit', 'model']);
  const idxComp = findColIndex(['component', 'componentname', 'component name', 'nama komponen', 'comp', 'part name']);
  const idxPriority = findColIndex(['plannedPriority', 'planned priority', 'priority', 'ppc priority']);
  const idxCustomer = findColIndex(['customer', 'nama pelanggan', 'pelanggan', 'cust', 'client']);
  const idxMechanic = findColIndex(['assemblyMechanic', 'assembly mechanic', 'mechanic', 'assembler']);
  const idxPartNo = findColIndex(['partNumber', 'part number', 'part no', 'part number/part no']);
  const idxSerialNo = findColIndex(['serialNumber', 'serial number', 'serial no', 's/n']);
  const idxUrgent = findColIndex(['isUrgent', 'urgent', 'is urgent']);
  const idxCompGroup = findColIndex(['compGroup', 'component group', 'comp group', 'group', 'category']);
  const idxSubGroup = findColIndex(['subGroup', 'sub group', 'subgroup']);
  const idxTestType = findColIndex(['testType', 'test type', 'testing type']);
  const idxRemark = findColIndex(['remark', 'remarks', 'notes']);

  if (idxJo === -1 || idxModel === -1 || idxComp === -1) {
    throw new Error(`Required columns (JO Number, Unit Model, Component) not found in worksheet '${prioritySheetName}'. Headers found: ${rawHeaders.join(', ')}`);
  }

  const backupId = await createBackupSnapshot(sourceName, currentUser || 'System', sourceHash);

  const activeModels = store.getProductModels(true);
  const currentQueue = store.getQueueRecords();

  const quarantined: any[] = [];
  let addedCount = 0;
  let updatedCount = 0;
  let unchangedCount = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let validRowsCount = 0;

  const seenJoNumbers = new Set<string>();

  for (let i = headerRowIndex + 1; i < priorityRows.length; i++) {
    const row = priorityRows[i];
    if (!row || row.every((c: any) => c === '')) {
      skippedCount++;
      continue;
    }

    const joNumber = String(row[idxJo] || '').trim();
    const unitModel = String(row[idxModel] || '').trim();
    const component = String(row[idxComp] || '').trim();

    if (!joNumber || !unitModel || !component) {
      quarantined.push({
        rowNumber: i + 1,
        joNumber: joNumber || undefined,
        unitModel: unitModel || undefined,
        component: component || undefined,
        reason: 'Missing mandatory JO Number, Unit Model, or Component',
      });
      continue;
    }

    const upperJo = joNumber.toUpperCase();
    if (seenJoNumbers.has(upperJo)) {
      duplicateCount++;
      quarantined.push({
        rowNumber: i + 1,
        joNumber,
        unitModel,
        component,
        reason: `Duplicate JO/RO number '${joNumber}' in spreadsheet`,
      });
      continue;
    }
    seenJoNumbers.add(upperJo);

    const isValidProduct = activeModels.some(
      (m) =>
        m.unitModel.trim().toUpperCase() === unitModel.toUpperCase() &&
        m.component.trim().toUpperCase() === component.toUpperCase() &&
        m.active === true
    );

    if (!isValidProduct) {
      quarantined.push({
        rowNumber: i + 1,
        joNumber,
        unitModel,
        component,
        reason: 'Unit Model or Component is inactive or not configured in Product Master',
      });
      continue;
    }

    validRowsCount++;

    const rawPriority = idxPriority >= 0 ? row[idxPriority] : 1;
    const parsedPriority = parseInt(rawPriority, 10);
    const plannedPriority = isNaN(parsedPriority) ? 1 : Math.max(0, parsedPriority);

    const rawUrgent = idxUrgent >= 0 ? String(row[idxUrgent]).trim().toLowerCase() : '';
    const isUrgent = rawUrgent === 'true' || rawUrgent === 'yes' || rawUrgent === '1' || rawUrgent === 'urgent';

    const customer = idxCustomer >= 0 ? String(row[idxCustomer] || '').trim() : 'Internal Stock';
    const assemblyMechanic = idxMechanic >= 0 ? String(row[idxMechanic] || '').trim() : 'Unassigned';
    const partNumber = idxPartNo >= 0 ? String(row[idxPartNo] || '').trim() : '';
    const serialNumber = idxSerialNo >= 0 ? String(row[idxSerialNo] || '').trim() : '';
    const rowRemark = idxRemark >= 0 ? String(row[idxRemark] || '').trim() : '';
    const rawTestType = idxTestType >= 0 ? String(row[idxTestType] || '').trim().toUpperCase() : 'PROD';
    const testType = rawTestType === 'RETEST' ? 'RETEST' : 'PROD';

    const existing = currentQueue.find(
      (q) => q.joRoNumber.toUpperCase() === upperJo && q.status !== 'FINISH'
    );

    if (existing) {
      let hasDiff = false;
      const updates: any = {};

      if (customer && existing.customer !== customer) {
        updates.customer = customer;
        hasDiff = true;
      }
      if (serialNumber && existing.serialNumber !== serialNumber) {
        updates.serialNumber = serialNumber;
        hasDiff = true;
      }
      if (partNumber && existing.partNumber !== partNumber) {
        updates.partNumber = partNumber;
        hasDiff = true;
      }
      if (assemblyMechanic && existing.assemblyMechanic !== assemblyMechanic) {
        updates.assemblyMechanic = assemblyMechanic;
        hasDiff = true;
      }

      if (hasDiff) {
        await store.updateQueueRecord(existing.queueRecordId, updates);
        updatedCount++;
      } else {
        unchangedCount++;
      }
    } else {
      const matchingModel = activeModels.find(
        (m) =>
          m.unitModel.trim().toUpperCase() === unitModel.toUpperCase() &&
          m.component.trim().toUpperCase() === component.toUpperCase()
      );
      const compGroup = idxCompGroup >= 0 && row[idxCompGroup] ? String(row[idxCompGroup]).trim() : (matchingModel ? matchingModel.compGroup : 'PT-PPM');
      const subGroup = idxSubGroup >= 0 && row[idxSubGroup] ? String(row[idxSubGroup]).trim() : (matchingModel && matchingModel.subGroup ? matchingModel.subGroup : null);

      const newRecord: any = {
        queueRecordId: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        joRoNumber: joNumber,
        compGroup,
        subGroup,
        unitModel,
        component,
        testType,
        plannedPriority: isUrgent ? 999 : plannedPriority,
        currentPriority: isUrgent ? 999 : plannedPriority,
        isUrgentUnassigned: isUrgent,
        status: 'WAITING',
        priorityLocked: false,
        customer: customer || 'Internal Stock',
        partNumber: partNumber || '',
        serialNumber: serialNumber || '',
        assemblyMechanic: assemblyMechanic || 'Unassigned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [
          {
            oldPriority: 0,
            newPriority: isUrgent ? 999 : plannedPriority,
            remark: rowRemark || `Imported from ${sourceName}`,
            changedBy: currentUser || sourceName,
            changedAt: new Date().toISOString(),
          },
        ],
      };

      await store.addQueueRecord(newRecord, currentUser || sourceName);
      addedCount++;
    }
  }

  await store.normalizeQueuePriorities();

  // 2. Optional Capacity Sheet Synchronization
  const capacityPreferred = ['Capacity', 'Testing Lines', 'TestingLines', 'Line Capacity', 'Testing Capacity'];
  let capacitySheetFound = false;
  let capacitySheetName = '';
  let capValidCount = 0;
  let capUpdatedCount = 0;
  const capQuarantined: any[] = [];

  for (const capPref of capacityPreferred) {
    const found = sheetNames.find(s => s.trim().toLowerCase() === capPref.toLowerCase());
    if (found) {
      capacitySheetName = found;
      capacitySheetFound = true;
      break;
    }
  }

  if (capacitySheetFound && capacitySheetName) {
    const capWs = workbook.Sheets[capacitySheetName];
    const capRows: any[] = xlsx.utils.sheet_to_json(capWs, { header: 1, defval: '' });
    if (capRows.length >= 2) {
      const capHeaderIdx = capRows.findIndex(r => r && r.some((c: any) => c !== ''));
      if (capHeaderIdx !== -1) {
        const capHeaders = capRows[capHeaderIdx].map((h: any) => String(h || '').trim());
        const findCapCol = (aliases: string[]) => {
          return capHeaders.findIndex(h => {
            const cleanH = h.toLowerCase().replace(/[^a-z0-9]/g, '');
            return aliases.some(alias => cleanH === alias.toLowerCase().replace(/[^a-z0-9]/g, ''));
          });
        };

        const idxLineId = findCapCol(['lineid', 'id', 'line id']);
        const idxLineName = findCapCol(['linename', 'name', 'line name']);
        const idxProcess = findCapCol(['process', 'stage']);
        const idxCapGroup = findCapCol(['compgroup', 'componentgroup', 'group']);
        const idxActive = findCapCol(['active', 'isactive']);
        const idxDays = findCapCol(['operatingdays', 'days']);
        const idxStart = findCapCol(['starttime', 'start']);
        const idxEnd = findCapCol(['endtime', 'end']);
        const idxBreak = findCapCol(['breakminutes', 'break']);
        const idxDuration = findCapCol(['standarddurationminutes', 'duration']);
        const idxTarget = findCapCol(['dailytarget', 'target']);
        const idxOrder = findCapCol(['displayorder', 'order']);

        if (idxLineId >= 0) {
          const existingLines = store.getTestingLines(false);
          for (let r = capHeaderIdx + 1; r < capRows.length; r++) {
            const row = capRows[r];
            if (!row || row.every((c: any) => c === '')) continue;
            const lineId = String(row[idxLineId] || '').trim();
            if (!lineId) continue;

            const existingLine = existingLines.find(l => l.id.toLowerCase() === lineId.toLowerCase());
            if (!existingLine) {
              capQuarantined.push({
                rowNumber: r + 1,
                lineId,
                reason: 'Testing Line ID not found in system configuration',
              });
              continue;
            }

            capValidCount++;
            const name = idxLineName >= 0 && row[idxLineName] ? String(row[idxLineName]).trim() : existingLine.name;
            const process = idxProcess >= 0 && row[idxProcess] ? String(row[idxProcess]).trim() as any : existingLine.process;
            const componentGroup = idxCapGroup >= 0 && row[idxCapGroup] ? String(row[idxCapGroup]).trim() as any : existingLine.componentGroup;
            const active = idxActive >= 0 ? String(row[idxActive]).trim().toLowerCase() !== 'false' && String(row[idxActive]).trim() !== '0' : existingLine.active;
            const operatingDays = idxDays >= 0 && row[idxDays] ? String(row[idxDays]).split(',').map(s => s.trim()) : existingLine.operatingDays;
            const startTime = idxStart >= 0 && row[idxStart] ? String(row[idxStart]).trim() : existingLine.startTime;
            const endTime = idxEnd >= 0 && row[idxEnd] ? String(row[idxEnd]).trim() : existingLine.endTime;
            const breakMinutes = idxBreak >= 0 ? parseInt(row[idxBreak], 10) || existingLine.breakMinutes : existingLine.breakMinutes;
            const standardDurationMinutes = idxDuration >= 0 ? parseInt(row[idxDuration], 10) || existingLine.standardDurationMinutes : existingLine.standardDurationMinutes;
            const dailyTarget = idxTarget >= 0 ? parseInt(row[idxTarget], 10) || existingLine.dailyTarget : existingLine.dailyTarget;
            const displayOrder = idxOrder >= 0 ? parseInt(row[idxOrder], 10) || existingLine.displayOrder : existingLine.displayOrder;

            const [sh, sm] = startTime.split(':').map(Number);
            const [eh, em] = endTime.split(':').map(Number);
            const grossMinutes = ((eh * 60) + em) - ((sh * 60) + sm);
            const netOperatingMinutes = Math.max(0, grossMinutes - breakMinutes);

            const updatedLine = {
              ...existingLine,
              name,
              process,
              componentGroup,
              active,
              operatingDays,
              startTime,
              endTime,
              breakMinutes,
              netOperatingMinutes,
              standardDurationMinutes,
              dailyTarget,
              displayOrder,
            };

            await store.saveTestingLine(updatedLine, currentUser || sourceName);
            capUpdatedCount++;
          }
        }
      }
    }
  }

  return {
    success: true,
    source: "GOOGLE_SHEETS" as const,
    spreadsheetId: DEFAULT_SPREADSHEET_ID,
    workbookHash: sourceHash,
    prioritySheetName,
    capacitySheetName: capacitySheetFound ? capacitySheetName : undefined,
    backupId,
    priority: {
      totalRows: priorityRows.length - headerRowIndex - 1,
      validRows: validRowsCount,
      added: addedCount,
      updated: updatedCount,
      unchanged: unchangedCount,
      skipped: skippedCount,
      duplicateRows: duplicateCount,
      quarantined,
    },
    capacity: {
      sheetFound: capacitySheetFound,
      totalRows: capacitySheetFound ? 10 : 0,
      validRows: capValidCount,
      updated: capUpdatedCount,
      unchanged: 0,
      skipped: 0,
      quarantined: capQuarantined,
    },
    syncedAt: new Date().toISOString(),
  };
}

export async function syncGoogleSheetsPPC(currentUser?: string): Promise<any> {
  const buffer = await downloadGoogleSpreadsheetBuffer();
  return await processWorkbookBuffer(buffer, "Google Sheets PPC Sync", currentUser);
}
