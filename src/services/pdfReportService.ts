import { CombinedJORecords, PDFTestReportRecord, QualityCertificateRecord } from '../types';
import { store } from '../data/storageEngine';

export interface PDFReportData {
  reportNumber: string;
  version: number;
  generatedDate: string;
  generatedBy: string;
  joNumber: string;
  compGroup: string;
  subGroup?: string | null;
  unitModel: string;
  component: string;
  testType: 'PROD' | 'RETEST';
  partNumber?: string;
  serialNumber?: string;
  customer?: string;
  assemblyMechanic: string;
  plannedPriority?: number;
  currentPriority?: number;
  priorityRemark?: string;
  // GLT section
  gltDate?: string;
  gltOperator?: string;
  gltResult?: string;
  gltRemarks?: string;
  // Test stage section
  testStage: string;
  testOperator: string;
  testDate?: string;
  checksheetTemplateName: string;
  checksheetRevision: number;
  // Item results
  items: {
    sectionName: string;
    parameterName: string;
    standard: string;
    actual: string;
    unit?: string;
    result: string;
    remark?: string;
  }[];
  // Lead time
  incomingTime?: string;
  testReceivingTime?: string;
  testSubmissionTime?: string;
  gltLeadTimeMinutes?: number;
  testingLeadTimeMinutes?: number;
  // Overall result
  overallResult: string;
}

export function compileReportDataFromJORecord(
  jo: CombinedJORecords,
  version = 1,
  generatedBy = 'Quality System'
): PDFReportData {
  // Extract latest test stage (Dyno or Hydraulic or GLT)
  const isEngine = jo.compGroup === 'Engine' || jo.productCategory === 'Engine';
  const latestDyno = jo.dynoRecords.length > 0 ? jo.dynoRecords[jo.dynoRecords.length - 1] : null;
  const latestHyd = jo.hydraulicRecords.length > 0 ? jo.hydraulicRecords[jo.hydraulicRecords.length - 1] : null;
  const latestGLT = jo.gltRecords.length > 0 ? jo.gltRecords[jo.gltRecords.length - 1] : null;

  const testStage = isEngine
    ? latestDyno
      ? 'Dynotest'
      : 'GLT'
    : latestHyd
    ? 'Testbench Test'
    : 'GLT';

  const testRecord = isEngine ? latestDyno || latestGLT : latestHyd || latestGLT;
  const snapshot = testRecord?.snapshot || latestGLT?.snapshot;

  // Build items list from checksheet answers or snapshot
  const items: PDFReportData['items'] = [];

  if (testRecord?.answers && testRecord.answers.length > 0) {
    testRecord.answers.forEach((ans) => {
      let stdStr = '-';
      let resStr = '-';

      if (ans.validationSnapshot && ans.validationSnapshot !== 'NONE') {
        if (ans.validationSnapshot === 'RANGE') {
          stdStr = `${ans.minimumSnapshot ?? '-'} – ${ans.maximumSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
        } else if (ans.validationSnapshot === 'MINIMUM') {
          stdStr = `Min ${ans.minimumSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
        } else if (ans.validationSnapshot === 'MAXIMUM') {
          stdStr = `Max ${ans.maximumSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
        } else if (ans.validationSnapshot === 'TARGET_TOLERANCE') {
          stdStr = `${ans.targetSnapshot ?? '-'} ± ${ans.toleranceSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
        }

        if (ans.resultStatus === 'PASS') resStr = 'PASS';
        else if (ans.resultStatus === 'FAIL') resStr = 'FAIL';
        else resStr = '-';
      } else if (ans.inputTypeSnapshot === 'GOOD / NOT GOOD' || ans.inputTypeSnapshot === 'GOOD/NOT GOOD') {
        stdStr = 'GOOD';
        resStr = ans.answer === 'GOOD' ? 'PASS' : ans.answer === 'NOT GOOD' ? 'FAIL' : '-';
      } else {
        stdStr = '-';
        resStr = '-';
      }

      items.push({
        sectionName: ans.sectionSnapshot || 'Inspection',
        parameterName: ans.itemNameSnapshot || 'Parameter',
        standard: stdStr,
        actual: ans.answer ? `${ans.answer} ${ans.unitSnapshot || ''}`.trim() : '-',
        unit: ans.unitSnapshot,
        result: resStr,
      });
    });
  } else if (snapshot) {
    snapshot.sections.forEach((sec) => {
      sec.items.forEach((itm) => {
        let stdStr = '-';
        if (itm.validation && itm.validation !== 'NONE') {
          if (itm.validation === 'RANGE') stdStr = `${itm.minimumValue} – ${itm.maximumValue} ${itm.unit || ''}`.trim();
          else if (itm.validation === 'MINIMUM') stdStr = `Min ${itm.minimumValue} ${itm.unit || ''}`.trim();
          else if (itm.validation === 'MAXIMUM') stdStr = `Max ${itm.maximumValue} ${itm.unit || ''}`.trim();
          else if (itm.validation === 'TARGET_TOLERANCE') stdStr = `${itm.targetValue} ± ${itm.toleranceValue} ${itm.unit || ''}`.trim();
        } else if (itm.inputType === 'GOOD / NOT GOOD' || itm.inputType === 'GOOD/NOT GOOD') {
          stdStr = 'GOOD';
        }

        items.push({
          sectionName: sec.name,
          parameterName: itm.itemName,
          standard: stdStr,
          actual: 'Recorded',
          unit: itm.unit,
          result: '-',
        });
      });
    });
  }

  const reportNumber = `TR-${jo.joNumber}-${version.toString().padStart(2, '0')}`;

  return {
    reportNumber,
    version,
    generatedDate: new Date().toISOString(),
    generatedBy,
    joNumber: jo.joNumber,
    compGroup: jo.compGroup || (isEngine ? 'Engine' : 'PT-PPM'),
    unitModel: jo.unitModel || jo.productModel.split('/')[0]?.trim() || '-',
    component: jo.component || jo.productModel.split('/')[1]?.trim() || '-',
    testType: (testRecord?.attemptNumber || 1) > 1 ? 'RETEST' : 'PROD',
    partNumber: latestGLT?.partNumber || '-',
    serialNumber: latestGLT?.serialNumber || '-',
    customer: latestGLT?.customer || 'Internal Remanufacturing Stock',
    assemblyMechanic: jo.assemblyMechanic || latestGLT?.assemblyMechanic || 'Assembler',
    gltDate: latestGLT?.testDate || latestGLT?.incomingTime?.split('T')[0],
    gltOperator: latestGLT?.operatorName,
    gltResult: latestGLT?.result || 'GOOD',
    gltRemarks: latestGLT?.remarks || '-',
    testStage,
    testOperator: testRecord?.operatorName || 'Operator',
    testDate: (testRecord as any)?.submissionTime?.split('T')[0] || new Date().toISOString().split('T')[0],
    checksheetTemplateName: snapshot?.templateName || `${jo.component || 'Component'} Quality Checksheet`,
    checksheetRevision: snapshot?.revision || 1,
    items,
    incomingTime: latestGLT?.incomingTime,
    testReceivingTime: (testRecord as any)?.receivingTime,
    testSubmissionTime: (testRecord as any)?.submissionTime,
    gltLeadTimeMinutes: (testRecord as any)?.gltLeadTimeMinutes,
    testingLeadTimeMinutes:
      (latestDyno?.dynoLeadTimeMinutes || 0) + (latestHyd?.hydraulicLeadTimeMinutes || 0) || undefined,
    overallResult: jo.currentOverallStatus || 'GOOD',
  };
}

export const pdfReportService = {
  // Generate and register new PDF Test Report record
  generateTestReportRecord: (jo: CombinedJORecords, user = 'Operator'): PDFTestReportRecord => {
    const existingReports = store.getPDFReportsForJO(jo.joNumber);
    const nextVersion = existingReports.length + 1;
    const reportData = compileReportDataFromJORecord(jo, nextVersion, user);

    const reportRecord: PDFTestReportRecord = {
      reportId: `rep-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      testRecordId: `test-${jo.joNumber}-${nextVersion}`,
      joNumber: jo.joNumber,
      version: nextVersion,
      reportNumber: reportData.reportNumber,
      generatedAt: reportData.generatedDate,
      generatedBy: user,
      dataSnapshot: reportData,
    };

    store.savePDFTestReportRecord(reportRecord);
    return reportRecord;
  },

  // Generate and register Quality Certificate
  generateQualityCertificateRecord: (jo: CombinedJORecords, user = 'Quality Lead'): QualityCertificateRecord => {
    const existingCerts = store.getCertificatesForJO(jo.joNumber);
    const nextVersion = existingCerts.length + 1;

    const certRecord: QualityCertificateRecord = {
      certificateId: `cert-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      testRecordId: `test-${jo.joNumber}`,
      joNumber: jo.joNumber,
      version: nextVersion,
      certificateNumber: `QC-CERT-${jo.joNumber}-${nextVersion.toString().padStart(2, '0')}`,
      generatedAt: new Date().toISOString(),
      generatedBy: user,
    };

    store.saveQualityCertificateRecord(certRecord);
    return certRecord;
  },

  // Print/Download PDF report via browser print driver
  printReportHtml: (reportData: PDFReportData) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = reportData.items
      .map(
        (itm, idx) => `
        <tr style="border-bottom: 1px solid #e2e8f0; font-size: 11px;">
          <td style="padding: 6px 8px; color: #64748b;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 600; color: #1e293b;">${itm.parameterName}</td>
          <td style="padding: 6px 8px; color: #475569;">${itm.sectionName}</td>
          <td style="padding: 6px 8px; color: #334155; font-family: monospace;">${itm.standard}</td>
          <td style="padding: 6px 8px; font-weight: bold; color: #0f172a; font-family: monospace;">${itm.actual}</td>
          <td style="padding: 6px 8px; font-weight: bold; color: ${itm.result === 'PASS' ? '#15803d' : itm.result === 'FAIL' ? '#b91c1c' : '#64748b'};">${itm.result}</td>
        </tr>
      `
      )
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>AQualityPRO_TestReport_${reportData.joNumber}.pdf</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #fff; margin: 0; padding: 10px; }
          .header { border-bottom: 2px solid #1e3a8a; padding-bottom: 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 18px; font-weight: 900; color: #1e3a8a; margin: 0; text-transform: uppercase; }
          .subtitle { font-size: 11px; color: #475569; margin: 2px 0 0; }
          .meta-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; margin-bottom: 14px; background: #f8fafc; font-size: 11px; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
          .label { color: #64748b; font-size: 10px; text-transform: uppercase; font-weight: bold; }
          .value { font-weight: 600; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #1e3a8a; color: #fff; text-align: left; padding: 6px 8px; font-size: 10px; text-transform: uppercase; }
          .footer { margin-top: 24px; border-top: 1px solid #cbd5e1; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
          .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; }
          .badge-good { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
          .badge-ng { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div style="font-size: 12px; font-weight: bold; color: #1e3a8a; letter-spacing: 0.5px;">PT KOMATSU REMANUFACTURING ASIA</div>
            <h1 class="title">AQuality PRO — Test Execution Report</h1>
            <p class="subtitle">Official Quality Verification & Component Testing Documentation</p>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; font-weight: 800; color: #1e3a8a; font-family: monospace;">${reportData.reportNumber}</div>
            <div style="font-size: 10px; color: #64748b;">Report Version ${reportData.version}</div>
            <div style="font-size: 10px; color: #64748b;">Date: ${reportData.generatedDate.split('T')[0]}</div>
          </div>
        </div>

        <div class="meta-box">
          <div class="grid-3">
            <div>
              <div class="label">Job Order (JO / RO)</div>
              <div class="value" style="font-size: 13px; font-family: monospace; color: #1e3a8a;">${reportData.joNumber}</div>
            </div>
            <div>
              <div class="label">Component Group</div>
              <div class="value">${reportData.compGroup} ${reportData.subGroup ? `(${reportData.subGroup})` : ''}</div>
            </div>
            <div>
              <div class="label">Test Type</div>
              <div class="value"><span class="badge ${reportData.testType === 'RETEST' ? 'badge-ng' : 'badge-good'}">${reportData.testType}</span></div>
            </div>
            <div>
              <div class="label">Unit Model</div>
              <div class="value">${reportData.unitModel}</div>
            </div>
            <div>
              <div class="label">Component Name</div>
              <div class="value">${reportData.component}</div>
            </div>
            <div>
              <div class="label">Assembly Mechanic</div>
              <div class="value">${reportData.assemblyMechanic}</div>
            </div>
            <div>
              <div class="label">Part Number</div>
              <div class="value">${reportData.partNumber || '-'}</div>
            </div>
            <div>
              <div class="label">Serial Number</div>
              <div class="value">${reportData.serialNumber || '-'}</div>
            </div>
            <div>
              <div class="label">Customer</div>
              <div class="value">${reportData.customer || '-'}</div>
            </div>
          </div>
        </div>

        <div class="meta-box">
          <div class="grid-3">
            <div>
              <div class="label">GLT Inspection Date</div>
              <div class="value">${reportData.gltDate || '-'}</div>
            </div>
            <div>
              <div class="label">GLT Operator</div>
              <div class="value">${reportData.gltOperator || '-'}</div>
            </div>
            <div>
              <div class="label">GLT Result</div>
              <div class="value"><span class="badge ${reportData.gltResult === 'GOOD' ? 'badge-good' : 'badge-ng'}">${reportData.gltResult}</span></div>
            </div>
            <div>
              <div class="label">Test Stage Executed</div>
              <div class="value">${reportData.testStage}</div>
            </div>
            <div>
              <div class="label">Test Bench Operator</div>
              <div class="value">${reportData.testOperator}</div>
            </div>
            <div>
              <div class="label">Checksheet Template & Rev</div>
              <div class="value">${reportData.checksheetTemplateName} (Rev.${reportData.checksheetRevision})</div>
            </div>
          </div>
        </div>

        <div style="margin-top: 14px;">
          <div style="font-size: 12px; font-weight: bold; color: #1e3a8a; text-transform: uppercase;">Checksheet Measurement & Inspection Results</div>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Parameter / Inspection Item</th>
                <th>Section</th>
                <th>Standard</th>
                <th>Actual Value</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 14px;" class="meta-box">
          <div class="grid-2">
            <div>
              <div class="label">Final Quality Verdict</div>
              <div style="margin-top: 4px;">
                <span class="badge ${reportData.overallResult === 'GOOD' ? 'badge-good' : 'badge-ng'}" style="font-size: 13px; padding: 4px 12px;">
                  ${reportData.overallResult}
                </span>
              </div>
            </div>
            <div>
              <div class="label">Lead Time Summary</div>
              <div class="value" style="font-size: 11px; margin-top: 4px;">
                GLT Lead Time: ${reportData.gltLeadTimeMinutes ? `${reportData.gltLeadTimeMinutes} min` : '-'} | 
                Testing Lead Time: ${reportData.testingLeadTimeMinutes ? `${reportData.testingLeadTimeMinutes} min` : '-'}
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div>
            <div>Generated by: <strong>${reportData.generatedBy}</strong></div>
            <div>AQuality PRO Digitized Quality Verification System</div>
          </div>
          <div style="text-align: right;">
            <div>PT Komatsu Remanufacturing Asia</div>
            <div>Balikpapan Plant - QA & Testing Division</div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  },
};
