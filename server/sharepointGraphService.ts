import * as xlsx from 'xlsx';

export interface DriveItemMetadata {
  driveId: string;
  itemId: string;
  fileName: string;
  webUrl: string;
  lastModifiedDateTime: string;
  downloadUrl?: string;
  accessMode?: 'ANONYMOUS' | 'MICROSOFT_GRAPH';
}

export interface ParsedPPCItem {
  joRoNumber: string;
  compGroup: 'Engine' | 'PT-PPM' | 'Cylinder';
  subGroup?: 'PT' | 'PPM' | null;
  unitModel: string;
  component: string;
  testType: 'PROD' | 'RETEST';
  plannedPriority?: number;
  customer?: string;
  partNumber?: string;
  serialNumber?: string;
  assemblyMechanic?: string;
  targetDate?: string;
  remark?: string;
  isUrgent?: boolean;
  source: 'SHAREPOINT';
}

export const DEFAULT_SHAREPOINT_PPC_URL =
  'https://komatsureman-my.sharepoint.com/:x:/g/personal/zaenal_arifin_kra_co_id/IQDz3PNG4VeeTIN1zHOestrqAXbYpsUG2RAkirMr-uq7nUo?e=RfmFaW';

/**
 * Verify whether binary buffer is a genuine ZIP/XLSX file (PK\x03\x04 signature)
 * and not an HTML login page, JSON error response, or plain text.
 */
export function isValidXlsxBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 100) {
    return false;
  }
  // Check ZIP archive magic bytes (PK..)
  const isZipMagic =
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07);

  if (!isZipMagic) {
    return false;
  }

  // Double check by attempting to parse header with xlsx
  try {
    const wb = xlsx.read(buffer, { type: 'buffer', bookSheets: true });
    return Array.isArray(wb.SheetNames) && wb.SheetNames.length > 0;
  } catch {
    return false;
  }
}

/**
 * Encode a SharePoint sharing URL to Microsoft Graph sharing token format:
 * "u!" + base64url encoded sharing URL without padding
 */
export function encodeSharingUrl(url: string): string {
  const base64 = Buffer.from(url.trim(), 'utf-8').toString('base64');
  const base64Url = base64
    .replace(/=/g, '')
    .replace(/\//g, '_')
    .replace(/\+/g, '-');
  return `u!${base64Url}`;
}

/**
 * Attempt server-side anonymous direct fetch from SharePoint sharing URL
 */
export async function tryAnonymousSharePointDownload(
  sharingUrl: string
): Promise<{ buffer: Buffer; fileName: string } | null> {
  const cleanUrl = sharingUrl.trim();
  const urlVariations = [
    cleanUrl.includes('?') ? `${cleanUrl}&download=1` : `${cleanUrl}?download=1`,
    cleanUrl,
  ];

  for (const target of urlVariations) {
    try {
      const res = await fetch(target, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/octet-stream, */*',
        },
        redirect: 'follow',
      });

      if (!res.ok) {
        continue;
      }

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/html') || contentType.includes('application/json')) {
        // Redirected to login page or error HTML
        continue;
      }

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (isValidXlsxBuffer(buf)) {
        return {
          buffer: buf,
          fileName: 'Priority Testing - PPC.xlsx',
        };
      }
    } catch {
      // Continue to next variation
    }
  }

  return null;
}

/**
 * Acquire Microsoft Graph OAuth2 Access Token using client credentials
 */
export async function getMicrosoftGraphAccessToken(): Promise<string> {
  const tenantId = process.env.MICROSOFT_TENANT_ID;
  const clientId = process.env.MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error(
      'SHAREPOINT AUTHENTICATION REQUIRED: Missing Microsoft Azure AD credentials (MICROSOFT_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET).'
    );
  }

  const tokenEndpoint = `https://login.microsoftonline.com/${encodeURIComponent(tenantId)}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('client_secret', clientSecret);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('grant_type', 'client_credentials');

  const response = await fetch(tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SHAREPOINT AUTHENTICATION REQUIRED: Azure AD Token Request Failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.access_token) {
    throw new Error('SHAREPOINT AUTHENTICATION REQUIRED: No access_token returned from Microsoft identity endpoint.');
  }

  return data.access_token;
}

/**
 * Resolve SharePoint sharing URL using /shares/{encodedSharingUrl}/driveItem
 */
export async function resolveSharePointDriveItem(
  sharingUrl?: string,
  accessToken?: string
): Promise<{ metadata: DriveItemMetadata; encodedSharingUrl: string }> {
  const targetUrl = sharingUrl || process.env.SHAREPOINT_PPC_FILE_URL || DEFAULT_SHAREPOINT_PPC_URL;
  const encodedSharingUrl = encodeSharingUrl(targetUrl);

  const graphUrl = `https://graph.microsoft.com/v1.0/shares/${encodedSharingUrl}/driveItem`;
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(graphUrl, { headers });

  if (!res.ok) {
    const errText = await res.text();
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `SHAREPOINT AUTHENTICATION REQUIRED: Microsoft Graph rejected request (${res.status}): ${errText}`
      );
    }
    throw new Error(`SHAREPOINT AUTHENTICATION REQUIRED: Microsoft Graph driveItem resolution failed (${res.status}): ${errText}`);
  }

  const item = await res.json();
  const metadata: DriveItemMetadata = {
    driveId: item.parentReference?.driveId || '',
    itemId: item.id || '',
    fileName: item.name || 'Priority Testing - PPC.xlsx',
    webUrl: item.webUrl || targetUrl,
    lastModifiedDateTime: item.lastModifiedDateTime || new Date().toISOString(),
    downloadUrl: item['@microsoft.graph.downloadUrl'],
    accessMode: 'MICROSOFT_GRAPH',
  };

  return { metadata, encodedSharingUrl };
}

/**
 * Download Priority Testing - PPC.xlsx from Microsoft Graph and return binary buffer
 */
export async function downloadSharePointExcel(
  metadata: DriveItemMetadata,
  encodedSharingUrl: string,
  accessToken?: string
): Promise<Buffer> {
  // Option 1: Direct pre-authenticated download URL if provided by Graph
  if (metadata.downloadUrl) {
    const dlRes = await fetch(metadata.downloadUrl);
    if (dlRes.ok) {
      const arrayBuffer = await dlRes.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      if (isValidXlsxBuffer(buf)) {
        return buf;
      }
    }
  }

  // Option 2: Download via driveItem content API
  const contentUrl =
    metadata.driveId && metadata.itemId
      ? `https://graph.microsoft.com/v1.0/drives/${metadata.driveId}/items/${metadata.itemId}/content`
      : `https://graph.microsoft.com/v1.0/shares/${encodedSharingUrl}/driveItem/content`;

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const res = await fetch(contentUrl, { headers, redirect: 'follow' });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`SHAREPOINT AUTHENTICATION REQUIRED: Failed to download Excel content (${res.status}): ${errText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buf = Buffer.from(arrayBuffer);
  if (!isValidXlsxBuffer(buf)) {
    throw new Error(
      'SHAREPOINT AUTHENTICATION REQUIRED: Response is not a valid Excel (.xlsx) file.'
    );
  }
  return buf;
}

/**
 * Robustly find value in row by testing various case-insensitive column keys and alias names
 */
function findRowValue(row: Record<string, any>, aliases: string[]): any {
  const rowKeys = Object.keys(row);
  for (const alias of aliases) {
    const cleanAlias = alias.toLowerCase().replace(/[\s_\-\/\.]/g, '');
    for (const key of rowKeys) {
      const cleanKey = key.toLowerCase().replace(/[\s_\-\/\.]/g, '');
      if (cleanKey === cleanAlias && row[key] !== undefined && row[key] !== null) {
        return row[key];
      }
    }
  }
  return undefined;
}

/**
 * Parse Excel Buffer and map rows into ParsedPPCItem[] structure
 */
export function parseExcelWorkbook(buffer: Buffer): {
  sheetName: string;
  totalRows: number;
  items: ParsedPPCItem[];
} {
  if (!isValidXlsxBuffer(buffer)) {
    throw new Error(
      'SHAREPOINT AUTHENTICATION REQUIRED: The retrieved data is not a valid Excel (.xlsx) workbook.'
    );
  }

  const workbook = xlsx.read(buffer, { type: 'buffer' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('SHAREPOINT AUTHENTICATION REQUIRED: Excel workbook contains no readable worksheets.');
  }

  // Prioritize PPC_Schedule, Priority Testing, or the first sheet
  let selectedSheetName = workbook.SheetNames[0];
  const preferredNames = [
    'PPC_Schedule',
    'PPC Schedule',
    'Priority Testing',
    'PriorityTesting',
    'Schedule',
    'Sheet1',
  ];
  for (const pref of preferredNames) {
    const match = workbook.SheetNames.find(
      (s) => s.trim().toLowerCase() === pref.toLowerCase()
    );
    if (match) {
      selectedSheetName = match;
      break;
    }
  }

  const worksheet = workbook.Sheets[selectedSheetName];
  if (!worksheet) {
    throw new Error(`Could not access worksheet '${selectedSheetName}'.`);
  }

  const rawRows = xlsx.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
  const items: ParsedPPCItem[] = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];

    // Detect JO / RO Number
    const rawJo = findRowValue(row, [
      'joNumber',
      'joRoNumber',
      'jo_ro_number',
      'JO Number',
      'JO / RO Number',
      'JO/RO Number',
      'JO_RO',
      'Job Order',
      'No JO',
      'No. JO',
      'No.JO',
      'JO',
      'RO Number',
      'RO',
    ]);

    const joRoNumber = rawJo ? String(rawJo).trim().toUpperCase() : '';
    if (!joRoNumber || joRoNumber.length < 2) {
      // Skip empty or header-like rows
      continue;
    }

    // Detect Unit Model
    const rawUnit = findRowValue(row, [
      'unitModel',
      'unit_model',
      'Unit Model',
      'UnitModel',
      'Model Unit',
      'Unit',
      'Model',
    ]);
    const unitModel = rawUnit ? String(rawUnit).trim().toUpperCase() : '';

    // Detect Component
    const rawComp = findRowValue(row, [
      'component',
      'componentName',
      'Component',
      'Component Name',
      'Nama Komponen',
      'Comp',
      'Part Name',
    ]);
    const component = rawComp ? String(rawComp).trim().toUpperCase() : '';

    // Detect Customer
    const rawCustomer = findRowValue(row, [
      'customer',
      'Customer',
      'Nama Pelanggan',
      'Pelanggan',
      'Cust',
      'Client',
    ]);
    const customer = rawCustomer ? String(rawCustomer).trim() : 'Internal Stock';

    // Detect Part Number
    const rawPartNo = findRowValue(row, [
      'partNumber',
      'part_number',
      'Part Number',
      'PartNumber',
      'Part No',
      'Part No.',
      'P/N',
      'No Part',
      'Part',
    ]);
    const partNumber = rawPartNo ? String(rawPartNo).trim() : '';

    // Detect Serial Number
    const rawSerialNo = findRowValue(row, [
      'serialNumber',
      'serial_number',
      'Serial Number',
      'SerialNumber',
      'Serial No',
      'Serial No.',
      'S/N',
      'No Serial',
      'SN',
    ]);
    const serialNumber = rawSerialNo ? String(rawSerialNo).trim() : '';

    // Detect Assembly Mechanic
    const rawMechanic = findRowValue(row, [
      'assemblyMechanic',
      'assembly_mechanic',
      'Assembly Mechanic',
      'AssemblyMechanic',
      'Mechanic',
      'Mekanik',
      'Assembler',
      'Teknisi',
    ]);
    const assemblyMechanic = rawMechanic ? String(rawMechanic).trim() : 'Unassigned';

    // Detect Target Date
    const rawTargetDate = findRowValue(row, [
      'targetDate',
      'target_date',
      'Target Date',
      'TargetDate',
      'Due Date',
      'DueDate',
      'Target',
      'Tanggal Target',
      'Delivery Date',
    ]);
    const targetDate = rawTargetDate ? String(rawTargetDate).trim() : undefined;

    // Detect Remark
    const rawRemark = findRowValue(row, [
      'remark',
      'Remark',
      'Catatan',
      'Notes',
      'Keterangan',
      'Comments',
    ]);
    const remark = rawRemark ? String(rawRemark).trim() : undefined;

    // Detect Planned Priority / Priority PPC
    const rawPriority = findRowValue(row, [
      'plannedPriority',
      'planned_priority',
      'Priority PPC',
      'PriorityPPC',
      'Planned Priority',
      'PlannedPriority',
      'Priority',
      'Prio',
      'Urutan',
      'Plan Priority',
      'Sequence',
    ]);
    let plannedPriority: number | undefined = undefined;
    if (rawPriority !== undefined && rawPriority !== '') {
      const parsed = parseInt(String(rawPriority).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        plannedPriority = parsed;
      }
    }

    // Detect Is Urgent
    const rawUrgent = findRowValue(row, [
      'isUrgent',
      'is_urgent',
      'Is Urgent',
      'IsUrgent',
      'Urgent',
      'Urgent?',
      'Status Urgent',
    ]);
    let isUrgent = false;
    if (rawUrgent !== undefined && rawUrgent !== '') {
      const strVal = String(rawUrgent).trim().toLowerCase();
      isUrgent =
        strVal === 'true' ||
        strVal === 'yes' ||
        strVal === 'y' ||
        strVal === '1' ||
        strVal === 'urgent' ||
        rawUrgent === true ||
        rawUrgent === 1;
    }

    // Detect Test Type (PROD vs RETEST)
    const rawTestType = findRowValue(row, [
      'testType',
      'test_type',
      'Test Type',
      'TestType',
      'Tipe Test',
      'Type',
    ]);
    let testType: 'PROD' | 'RETEST' = 'PROD';
    if (rawTestType) {
      const strType = String(rawTestType).trim().toUpperCase();
      if (strType.includes('RETEST') || strType.includes('RE-TEST')) {
        testType = 'RETEST';
      }
    }

    // Detect or Infer CompGroup (Engine, PT-PPM, Cylinder)
    const rawGroup = findRowValue(row, [
      'compGroup',
      'comp_group',
      'Component Group',
      'Comp Group',
      'CompGroup',
      'Group',
      'Category',
      'Kategori',
    ]);

    let compGroup: 'Engine' | 'PT-PPM' | 'Cylinder' = 'Engine';
    if (rawGroup) {
      const groupStr = String(rawGroup).trim().toUpperCase();
      if (groupStr.includes('ENGINE')) {
        compGroup = 'Engine';
      } else if (groupStr.includes('CYLINDER') || groupStr.includes('CYL')) {
        compGroup = 'Cylinder';
      } else if (
        groupStr.includes('PT') ||
        groupStr.includes('PPM') ||
        groupStr.includes('POWER TRAIN') ||
        groupStr.includes('POWERTRAIN')
      ) {
        compGroup = 'PT-PPM';
      }
    } else {
      // Infer from component name
      const compUpper = component.toUpperCase();
      if (compUpper.includes('ENGINE')) {
        compGroup = 'Engine';
      } else if (compUpper.includes('CYLINDER') || compUpper.includes('HOIST') || compUpper.includes('STEERING CYL')) {
        compGroup = 'Cylinder';
      } else if (
        compUpper.includes('PUMP') ||
        compUpper.includes('TORQFLOW') ||
        compUpper.includes('TRANSMISSION') ||
        compUpper.includes('MOTOR') ||
        compUpper.includes('VALVE')
      ) {
        compGroup = 'PT-PPM';
      }
    }

    // Detect SubGroup (PT vs PPM)
    let subGroup: 'PT' | 'PPM' | null = null;
    if (compGroup === 'PT-PPM') {
      const rawSubGroup = findRowValue(row, ['subGroup', 'Sub Group', 'SubGroup', 'Sub-Group']);
      if (rawSubGroup) {
        const sg = String(rawSubGroup).trim().toUpperCase();
        if (sg === 'PT' || sg === 'PPM') {
          subGroup = sg as 'PT' | 'PPM';
        }
      }
      if (!subGroup) {
        const compUpper = component.toUpperCase();
        if (compUpper.includes('PUMP') || compUpper.includes('MOTOR') || compUpper.includes('VALVE')) {
          subGroup = 'PPM';
        } else if (compUpper.includes('TORQFLOW') || compUpper.includes('TRANSMISSION')) {
          subGroup = 'PT';
        }
      }
    }

    items.push({
      joRoNumber,
      compGroup,
      subGroup,
      unitModel,
      component,
      testType,
      plannedPriority: plannedPriority !== undefined ? plannedPriority : idx + 1,
      customer,
      partNumber,
      serialNumber,
      assemblyMechanic,
      targetDate,
      remark,
      isUrgent,
      source: 'SHAREPOINT',
    });
  }

  return {
    sheetName: selectedSheetName,
    totalRows: items.length,
    items,
  };
}

/**
 * Server-Side Retrieval Pipeline:
 * 1. Attempt anonymous direct read of the sharing URL
 * 2. If anonymous direct read fails, attempt Microsoft Graph authentication
 * 3. If both fail, throw "SHAREPOINT AUTHENTICATION REQUIRED"
 * 4. Parse binary Excel workbook into normalized PPC items
 */
export async function fetchRealSharePointPPCData(): Promise<{
  success: boolean;
  metadata: DriveItemMetadata;
  sheetName: string;
  rowsRead: number;
  items: ParsedPPCItem[];
}> {
  const sharingUrl = process.env.SHAREPOINT_PPC_FILE_URL || DEFAULT_SHAREPOINT_PPC_URL;

  // 1. First attempt anonymous read-only access
  try {
    const anonymousResult = await tryAnonymousSharePointDownload(sharingUrl);
    if (anonymousResult && isValidXlsxBuffer(anonymousResult.buffer)) {
      const { sheetName, totalRows, items } = parseExcelWorkbook(anonymousResult.buffer);
      return {
        success: true,
        metadata: {
          driveId: 'anonymous',
          itemId: 'anonymous-item',
          fileName: anonymousResult.fileName,
          webUrl: sharingUrl,
          lastModifiedDateTime: new Date().toISOString(),
          accessMode: 'ANONYMOUS',
        },
        sheetName,
        rowsRead: totalRows,
        items,
      };
    }
  } catch (anonErr: any) {
    console.warn('[SharePoint] Anonymous access attempt non-fatal notice:', anonErr.message);
  }

  // 2. Second attempt via Microsoft Graph with Azure AD credentials if configured
  const hasCredentials =
    !!process.env.MICROSOFT_TENANT_ID &&
    !!process.env.MICROSOFT_CLIENT_ID &&
    !!process.env.MICROSOFT_CLIENT_SECRET;

  if (!hasCredentials) {
    throw new Error(
      'SHAREPOINT AUTHENTICATION REQUIRED: SharePoint sharing URL requires Microsoft authentication to access binary XLSX data.'
    );
  }

  let token: string;
  try {
    token = await getMicrosoftGraphAccessToken();
  } catch (authErr: any) {
    throw new Error(
      `SHAREPOINT AUTHENTICATION REQUIRED: ${authErr.message || 'Failed to authenticate with Microsoft identity'}`
    );
  }

  const { metadata, encodedSharingUrl } = await resolveSharePointDriveItem(sharingUrl, token);
  const buffer = await downloadSharePointExcel(metadata, encodedSharingUrl, token);
  const { sheetName, totalRows, items } = parseExcelWorkbook(buffer);

  return {
    success: true,
    metadata,
    sheetName,
    rowsRead: totalRows,
    items,
  };
}
