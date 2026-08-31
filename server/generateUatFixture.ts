import * as xlsx from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

export function generateUatWorkbook(): Buffer {
  const wb = xlsx.utils.book_new();

  // 1. Priority Testing Sheet
  const priorityData = [
    [
      "JO / RO Number", "Component Group", "Sub Group", "Unit Model", "Component", 
      "Test Type", "Planned Priority", "Customer", "Part Number", "Serial Number", 
      "Assembly Mechanic", "Urgent", "Target Date", "Remark"
    ],
    ["UAT26082801", "Engine", "PT", "HD785-7", "ENGINE ASSY", "PROD", 1, "UAT INTERNAL - DO NOT SHIP", "6217-00-1001", "SN-UAT-ENG-01", "Ardian Hidayat", false, "2026-08-30", "UAT Test Engine 1"],
    ["UAT26082802", "Engine", "PT", "PC2000-8R", "ENGINE ASSY", "RETEST", 2, "UAT INTERNAL - DO NOT SHIP", "6219-00-2002", "SN-UAT-ENG-02", "Ahmad Fauzi", false, "2026-08-30", "UAT Test Engine Retest"],
    ["UAT26082803", "PT-PPM", "PT", "HD785-7", "TORQFLOW ASSY", "PROD", 3, "UAT INTERNAL - DO NOT SHIP", "1M-5500", "SN-UAT-PT-01", "Budi Santoso", false, "2026-08-31", "UAT Test PT"],
    ["UAT26082804", "PT-PPM", "PPM", "PC1250SP-8R", "MAIN PUMP NO 1", "PROD", 999, "UAT INTERNAL - DO NOT SHIP", "708-2L-00400", "SN-UAT-PPM-01", "Kurniawan", true, "2026-08-29", "Urgent UAT Pump"],
    ["UAT26082805", "PT-PPM", "PT", "D375A-6R", "FINAL DRIVE LEFT", "PROD", 4, "UAT INTERNAL - DO NOT SHIP", "195-27-12345", "SN-UAT-FD-01", "Suroso", false, "2026-09-01", "UAT Final Drive"],
    ["UAT26082806", "PT-PPM", "PPM", "PC1250SP-8R", "SWING MOTOR", "PROD", 5, "UAT INTERNAL - DO NOT SHIP", "706-7K-98765", "SN-UAT-SM-01", "Joko Widodo", false, "2026-09-01", "UAT Swing Motor"],
    ["UAT26082807", "Cylinder", "PT", "HD785-7", "HOIST CYLINDER", "PROD", 6, "UAT INTERNAL - DO NOT SHIP", "561-82-11111", "SN-UAT-HC-01", "Eko Prasetyo", false, "2026-09-02", "UAT Hoist Cylinder"],
    ["UAT26082808", "Cylinder", "PT", "PC1250SP-8R", "ARM CYLINDER", "RETEST", 7, "UAT INTERNAL - DO NOT SHIP", "707-82-22222", "SN-UAT-AC-02", "Agus Setiawan", false, "2026-09-02", "UAT Arm Cylinder Retest"],
    ["UAT26082809", "Engine", "PT", "HD785-7", "ENGINE ASSY", "PROD", 8, "UAT INTERNAL - DO NOT SHIP", "6217-00-1002", "SN-UAT-ENG-03", "Rahmat Hidayat", false, "2026-09-03", "UAT Engine 3"]
  ];
  const wsPriority = xlsx.utils.aoa_to_sheet(priorityData);
  xlsx.utils.book_append_sheet(wb, wsPriority, "Priority Testing");

  // 2. Capacity Sheet
  const capacityData = [
    [
      "Line ID", "Line Name", "Process", "Component Group", "Active", 
      "Operating Days", "Start Time", "End Time", "Break Minutes", 
      "Operating Hours Per Day", "Standard Duration Minutes", "Daily Target", "Display Order"
    ],
    ["glt-engine", "GLT Engine Line", "GLT", "Engine", true, "Monday,Tuesday,Wednesday,Thursday,Friday", "08:00", "17:00", 60, 8, 180, 4, 1],
    ["dyno-1", "Dynotest Cell 1", "Dynotest", "Engine", true, "Monday,Tuesday,Wednesday,Thursday,Friday", "08:00", "17:00", 60, 8, 240, 3, 2],
    ["dyno-2", "Dynotest Cell 2", "Dynotest", "Engine", true, "Monday,Tuesday,Wednesday,Thursday,Friday", "08:00", "17:00", 60, 8, 240, 3, 3],
    ["tb-1", "Testbench Hydraulic 1", "Testbench", "PT-PPM", true, "Monday,Tuesday,Wednesday,Thursday,Friday", "08:00", "17:00", 60, 8, 120, 6, 4]
  ];
  const wsCapacity = xlsx.utils.aoa_to_sheet(capacityData);
  xlsx.utils.book_append_sheet(wb, wsCapacity, "Capacity");

  // 3. Negative Tests Sheet
  const negativeData = [
    ["JO Number", "Unit Model", "Component", "Reason / Error Test Case"],
    ["", "HD785-7", "ENGINE ASSY", "Missing JO Number"],
    ["NEG001", "INVALID-MODEL", "ENGINE ASSY", "Unconfigured Product Master"],
    ["NEG002", "HD785-7", "UNKNOWN-COMP", "Unconfigured Component"],
    ["UAT26082801", "HD785-7", "ENGINE ASSY", "Duplicate JO Number in batch"]
  ];
  const wsNegative = xlsx.utils.aoa_to_sheet(negativeData);
  xlsx.utils.book_append_sheet(wb, wsNegative, "Negative Tests");

  // 4. UAT Guide Sheet
  const guideData = [
    ["Step", "Workflow Action", "Expected Result"],
    [1, "Login to AQualityPro", "Successful authentication and automatic background PPC sync."],
    [2, "Verify Priority Queue", "View UAT JOs imported from spreadsheet with correct priorities."],
    [3, "Execute GLT", "Select UAT JO, fill checksheet, save GOOD/NOT GOOD result."],
    [4, "Execute Dynotest", "Process eligible engine JO through Dynotest checksheet."],
    [5, "Execute Testbench", "Process hydraulic component JO through Testbench checksheet."],
    [6, "History & Reports", "Verify test results, audit logs, PDF reports, and certificates."]
  ];
  const wsGuide = xlsx.utils.aoa_to_sheet(guideData);
  xlsx.utils.book_append_sheet(wb, wsGuide, "UAT Guide");

  const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return buf;
}

export function saveUatFixtureFile() {
  const dir = path.join(process.cwd(), 'test-fixtures');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, 'AQualityPro_UAT_PPC_Capacity.xlsx');
  const buf = generateUatWorkbook();
  fs.writeFileSync(filePath, buf);
}
