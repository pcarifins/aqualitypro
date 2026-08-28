import * as xlsx from 'xlsx';
import { store } from '../src/data/storageEngine';

export async function syncSharePointPPC(currentUser?: string) {
  const fileUrl = process.env.SHAREPOINT_PPC_FILE_URL || "https://komatsureman-my.sharepoint.com/:x:/g/personal/zaenal_arifin_kra_co_id/IQDz3PNG4VeeTIN1zHOestrqAXbYpsUG2RAkirMr-uq7nUo?e=rdNBDq";
  
  if (!fileUrl) {
    throw new Error("SHAREPOINT_PPC_FILE_URL is not configured.");
  }

  // 1. Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(fileUrl);
  } catch {
    throw new Error("Invalid SharePoint URL format.");
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error("SharePoint URL must use HTTPS.");
  }

  if (!parsedUrl.hostname.endsWith('komatsureman-my.sharepoint.com') && !parsedUrl.hostname.endsWith('sharepoint.com')) {
    throw new Error("SharePoint URL hostname is unauthorized.");
  }

  // Append download=1 properly
  const downloadUrl = new URL(fileUrl);
  if (!downloadUrl.searchParams.has('download')) {
    downloadUrl.searchParams.set('download', '1');
  }

  // 2. Fetch with cookie jar redirect preservation & finite redirect limit
  let currentUrl = downloadUrl.toString();
  const cookies = new Map<string, string>();
  let responseBuffer: Buffer | null = null;
  const maxRedirects = 10;
  let redirectCount = 0;

  while (redirectCount < maxRedirects) {
    const cookieHeader = Array.from(cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const res = await fetch(currentUrl, {
      method: 'GET',
      headers: {
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AQualityProSync/1.0',
        'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, text/html,application/xhtml+xml',
      },
      redirect: 'manual',
    });

    // Capture Set-Cookie
    const setCookieHeader = res.headers.get('set-cookie');
    if (setCookieHeader) {
      setCookieHeader.split(',').forEach((cookieStr) => {
        const parts = cookieStr.split(';')[0].split('=');
        if (parts.length >= 2) {
          cookies.set(parts[0].trim(), parts.slice(1).join('=').trim());
        }
      });
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) {
        throw new Error(`Redirect with status ${res.status} missing Location header.`);
      }
      const nextUrl = new URL(location, currentUrl);
      if (nextUrl.protocol !== 'https:' || (!nextUrl.hostname.endsWith('sharepoint.com') && !nextUrl.hostname.endsWith('microsoftonline.com'))) {
        throw new Error(`Redirect to unauthorized domain: ${nextUrl.hostname}`);
      }
      currentUrl = nextUrl.toString();
      redirectCount++;
      continue;
    }

    if (!res.ok) {
      throw new Error(`SharePoint download failed with HTTP status ${res.status} ${res.statusText}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    responseBuffer = Buffer.from(arrayBuffer);
    break;
  }

  if (!responseBuffer) {
    throw new Error("SharePoint download resulted in empty response or redirect loop limit exceeded.");
  }

  // Check if response is HTML/Error page instead of XLSX
  const textHead = responseBuffer.toString('utf8', 0, Math.min(responseBuffer.length, 500)).trim().toLowerCase();
  if (textHead.startsWith('<!doctype') || textHead.startsWith('<html') || textHead.includes('<title>sign in') || textHead.includes('access denied')) {
    throw new Error("SharePoint returned an HTML authentication or access-denied page instead of an Excel workbook.");
  }

  // Verify XLSX binary signature (ZIP header: PK\x03\x04)
  if (responseBuffer.length < 4 || responseBuffer[0] !== 0x50 || responseBuffer[1] !== 0x4B || responseBuffer[2] !== 0x03 || responseBuffer[3] !== 0x04) {
    throw new Error("Downloaded file does not have a valid Excel/ZIP binary signature.");
  }

  // Parse workbook
  let workbook: xlsx.WorkBook;
  try {
    workbook = xlsx.read(responseBuffer, { type: 'buffer' });
  } catch (err: any) {
    throw new Error(`Failed to parse workbook: ${err.message || 'invalid file format'}`);
  }

  const sheetNames = workbook.SheetNames || [];
  if (sheetNames.length === 0) {
    throw new Error("Workbook contains no worksheets.");
  }

  // Worksheet selection priority
  const preferredNames = ['Priority Testing', 'PPC_Schedule', 'PPC Schedule', 'PriorityTesting', 'Schedule', 'Sheet1'];
  let selectedSheetName = sheetNames[0];
  for (const pref of preferredNames) {
    const found = sheetNames.find(s => s.trim().toLowerCase() === pref.toLowerCase());
    if (found) {
      selectedSheetName = found;
      break;
    }
  }

  const worksheet = workbook.Sheets[selectedSheetName];
  const rows: any[] = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (rows.length < 2) {
    throw new Error(`Worksheet '${selectedSheetName}' contains no data rows.`);
  }

  // Header recognition
  const headerRowIndex = rows.findIndex(r => r && r.some((c: any) => c !== ''));
  if (headerRowIndex === -1) {
    throw new Error("Could not locate header row in worksheet.");
  }

  const rawHeaders = rows[headerRowIndex].map((h: any) => String(h || '').trim());
  
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

  if (idxJo === -1 || idxModel === -1 || idxComp === -1) {
    throw new Error(`Required columns (JO Number, Unit Model, Component) not found in worksheet '${selectedSheetName}'. Headers found: ${rawHeaders.join(', ')}`);
  }

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

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
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
        reason: `Duplicate JO/RO number '${joNumber}' in workbook`,
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
      const compGroup = matchingModel ? matchingModel.compGroup : 'PT-PPM';
      const subGroup = matchingModel && matchingModel.subGroup ? matchingModel.subGroup : null;

      const newRecord: any = {
        queueRecordId: `qr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        joRoNumber: joNumber,
        compGroup,
        subGroup,
        unitModel,
        component,
        testType: 'PROD',
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
            remark: 'Imported from SharePoint Excel PPC Schedule',
            changedBy: currentUser || 'SharePoint Sync',
            changedAt: new Date().toISOString(),
          },
        ],
      };

      await store.addQueueRecord(newRecord, currentUser || 'SharePoint Sync');
      addedCount++;
    }
  }

  await store.normalizeQueuePriorities();

  return {
    success: true,
    source: "SharePoint" as const,
    workbookName: "Priority Testing - PPC.xlsx",
    sheetName: selectedSheetName,
    totalRows: rows.length - headerRowIndex - 1,
    validRows: validRowsCount,
    added: addedCount,
    updated: updatedCount,
    unchanged: unchangedCount,
    skipped: skippedCount,
    duplicateRows: duplicateCount,
    quarantined,
    syncedAt: new Date().toISOString(),
  };
}
