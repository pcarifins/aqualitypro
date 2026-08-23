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
  printReportHtml: (reportData: PDFReportData, jo?: CombinedJORecords) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Build the main parameters html
    const itemsHtml = reportData.items
      .map(
        (itm, idx) => `
        <tr style="border-bottom: 1px solid #cbd5e1; font-size: 11px;">
          <td style="padding: 6px 8px; color: #475569; text-align: center; border-right: 1px solid #cbd5e1;">${idx + 1}</td>
          <td style="padding: 6px 8px; font-weight: 700; color: #0f172a; border-right: 1px solid #cbd5e1;">${itm.parameterName}</td>
          <td style="padding: 6px 8px; color: #475569; border-right: 1px solid #cbd5e1;">${itm.sectionName}</td>
          <td style="padding: 6px 8px; color: #334155; font-family: monospace; border-right: 1px solid #cbd5e1;">${itm.standard}</td>
          <td style="padding: 6px 8px; font-weight: 800; color: #0f172a; font-family: monospace; border-right: 1px solid #cbd5e1;">${itm.actual}</td>
          <td style="padding: 6px 8px; font-weight: bold; text-align: center; color: ${itm.result === 'PASS' ? '#166534' : itm.result === 'FAIL' ? '#991b1b' : '#475569'};">${itm.result}</td>
        </tr>
      `
      )
      .join('');

    // Generate trial checksheets section if any completed checksheets are present
    let trialChecklistsHtml = '';
    if (jo) {
      const allTrials = [
        ...jo.gltRecords.map(r => ({ stageName: 'General Leak Test', attempt: r.attemptNumber, operator: r.testerName || r.operatorName, date: r.testDate, answers: r.answers, result: r.result })),
        ...jo.dynoRecords.map(r => ({ stageName: 'Engine Dynamometer Test', attempt: r.attemptNumber, operator: r.operatorName, date: r.submissionTime?.split('T')[0] || r.receivingTime?.split('T')[0], answers: r.answers, result: r.result })),
        ...jo.hydraulicRecords.map(r => ({ stageName: 'Hydraulic Test Bench', attempt: r.attemptNumber, operator: r.operatorName, date: r.submissionTime?.split('T')[0] || r.receivingTime?.split('T')[0], answers: r.answers, result: r.result }))
      ].filter(s => s.answers && s.answers.length > 0);

      if (allTrials.length > 0) {
        trialChecklistsHtml = `
          <div class="page-break" style="margin-top: 30px;">
            <h2 style="font-size: 14px; font-weight: 900; color: #1e3a8a; border-bottom: 2px solid #1e3a8a; padding-bottom: 4px; text-transform: uppercase; margin-bottom: 15px;">
              Completed Trial Checksheets
            </h2>
            ${allTrials.map(trial => {
              const answersHtml = trial.answers!.map((ans, aIdx) => {
                let stdRange = '-';
                if (ans.validationSnapshot && ans.validationSnapshot !== 'NONE') {
                  if (ans.validationSnapshot === 'RANGE') {
                    stdRange = `${ans.minimumSnapshot ?? '-'} – ${ans.maximumSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
                  } else if (ans.validationSnapshot === 'MINIMUM') {
                    stdRange = `Min ${ans.minimumSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
                  } else if (ans.validationSnapshot === 'MAXIMUM') {
                    stdRange = `Max ${ans.maximumSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
                  } else if (ans.validationSnapshot === 'TARGET_TOLERANCE') {
                    stdRange = `${ans.targetSnapshot ?? '-'} ± ${ans.toleranceSnapshot ?? '-'} ${ans.unitSnapshot || ''}`.trim();
                  }
                } else if (ans.inputTypeSnapshot === 'GOOD / NOT GOOD' || ans.inputTypeSnapshot === 'GOOD/NOT GOOD') {
                  stdRange = 'GOOD';
                }

                return `
                  <tr style="border-bottom: 1px solid #e2e8f0; font-size: 10px;">
                    <td style="padding: 5px 8px; border-right: 1px solid #e2e8f0; text-align: center;">${aIdx + 1}</td>
                    <td style="padding: 5px 8px; border-right: 1px solid #e2e8f0; font-weight: 600;">${ans.itemNameSnapshot}</td>
                    <td style="padding: 5px 8px; border-right: 1px solid #e2e8f0; color: #475569;">${ans.sectionSnapshot || 'Main'}</td>
                    <td style="padding: 5px 8px; border-right: 1px solid #e2e8f0; font-family: monospace;">${stdRange}</td>
                    <td style="padding: 5px 8px; border-right: 1px solid #e2e8f0; font-weight: bold; font-family: monospace;">${ans.answer} ${ans.unitSnapshot || ''}</td>
                    <td style="padding: 5px 8px; font-weight: bold; text-align: center; color: ${ans.resultStatus === 'PASS' ? '#166534' : ans.resultStatus === 'FAIL' ? '#991b1b' : '#475569'};">${ans.resultStatus || '-'}</td>
                  </tr>
                `;
              }).join('');

              return `
                <div style="margin-bottom: 25px; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; page-break-inside: avoid;">
                  <div style="background: #f1f5f9; padding: 10px; font-size: 11px; border-bottom: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; font-weight: bold; color: #1e293b;">
                    <span>Stage: ${trial.stageName} (Attempt #${trial.attempt})</span>
                    <span>Operator: ${trial.operator} • Date: ${trial.date} • Result: <span style="color: ${trial.result === 'GOOD' ? '#166534' : '#991b1b'}">${trial.result}</span></span>
                  </div>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr style="background: #f8fafc; font-size: 9px; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; color: #475569;">
                        <th style="padding: 6px 8px; text-align: center; width: 30px; border-right: 1px solid #cbd5e1;">#</th>
                        <th style="padding: 6px 8px; text-align: left; border-right: 1px solid #cbd5e1;">Parameter</th>
                        <th style="padding: 6px 8px; text-align: left; border-right: 1px solid #cbd5e1;">Section</th>
                        <th style="padding: 6px 8px; text-align: left; border-right: 1px solid #cbd5e1;">Reference Limit</th>
                        <th style="padding: 6px 8px; text-align: left; border-right: 1px solid #cbd5e1;">Actual Value</th>
                        <th style="padding: 6px 8px; text-align: center;">Verdict</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${answersHtml}
                    </tbody>
                  </table>
                </div>
              `;
            }).join('')}
          </div>
        `;
      }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Component Test Report - ${reportData.joNumber}</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 15mm 15mm;
          }
          @media print {
            body { background: #fff; color: #000; }
            .no-print { display: none; }
            .page-break { page-break-before: always; }
            tr { page-break-inside: avoid; }
            .signature-block { page-break-inside: avoid; }
          }
          body {
            font-family: Arial, sans-serif;
            color: #0f172a;
            background: #fff;
            margin: 0;
            padding: 0;
            line-height: 1.4;
          }
          .header-table {
            width: 100%;
            border-bottom: 3px double #0f172a;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .header-title {
            font-size: 16px;
            font-weight: 900;
            text-transform: uppercase;
            color: #000;
            margin: 0;
            letter-spacing: 0.5px;
          }
          .header-subtitle {
            font-size: 10px;
            color: #475569;
            margin: 2px 0 0 0;
            font-weight: bold;
          }
          .doc-info {
            text-align: right;
            font-size: 10px;
            color: #475569;
            line-height: 1.3;
          }
          .report-title-banner {
            background: #f1f5f9;
            border: 1px solid #cbd5e1;
            padding: 8px;
            text-align: center;
            margin-bottom: 15px;
          }
          .report-title-banner h1 {
            margin: 0;
            font-size: 14px;
            font-weight: 900;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: #0f172a;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 11px;
          }
          .meta-table td {
            border: 1px solid #cbd5e1;
            padding: 6px 8px;
          }
          .meta-label {
            background: #f8fafc;
            font-weight: 700;
            color: #475569;
            width: 18%;
            text-transform: uppercase;
            font-size: 9px;
          }
          .meta-value {
            color: #0f172a;
            font-weight: 600;
            width: 32%;
          }
          .table-title {
            font-size: 12px;
            font-weight: 900;
            color: #1e3a8a;
            text-transform: uppercase;
            margin: 15px 0 6px 0;
            border-left: 3px solid #1e3a8a;
            padding-left: 6px;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11px;
            margin-bottom: 15px;
          }
          .data-table th {
            background: #0f172a;
            color: #ffffff;
            padding: 6px 8px;
            font-size: 9px;
            text-transform: uppercase;
            font-weight: bold;
            border: 1px solid #0f172a;
          }
          .data-table td {
            border: 1px solid #cbd5e1;
            padding: 5px 8px;
          }
          .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 10px;
            text-transform: uppercase;
          }
          .badge-good {
            background: #dcfce7;
            color: #15803d;
            border: 1px solid #bbf7d0;
          }
          .badge-ng {
            background: #fee2e2;
            color: #b91c1c;
            border: 1px solid #fecaca;
          }
          .signature-section {
            margin-top: 30px;
            width: 100%;
            border-collapse: collapse;
            page-break-inside: avoid;
          }
          .signature-section td {
            width: 33.33%;
            border: 1px solid #cbd5e1;
            text-align: center;
            vertical-align: top;
            padding: 10px;
            background: #f8fafc;
          }
          .signature-title {
            font-size: 9px;
            text-transform: uppercase;
            font-weight: bold;
            color: #475569;
            margin-bottom: 40px;
          }
          .signature-name {
            font-size: 11px;
            font-weight: bold;
            color: #0f172a;
            border-top: 1px solid #cbd5e1;
            padding-top: 4px;
            display: inline-block;
            min-width: 120px;
          }
          .footer-text {
            font-size: 9px;
            color: #64748b;
            text-align: center;
            margin-top: 25px;
            border-top: 1px dashed #cbd5e1;
            padding-top: 8px;
          }
        </style>
      </head>
      <body>
        <!-- Header -->
        <table class="header-table">
          <tr>
            <td style="width: 65%;">
              <div class="header-title">PT KOMATSU REMANUFACTURING ASIA</div>
              <div class="header-subtitle">BALIKPAPAN PLANT — QUALITY ASSURANCE DIVISION</div>
            </td>
            <td class="doc-info">
              <strong>REPORT NO:</strong> ${reportData.reportNumber}<br>
              <strong>DATE:</strong> ${reportData.generatedDate.split('T')[0]}<br>
              <strong>VERSION:</strong> Rev ${reportData.version}
            </td>
          </tr>
        </table>

        <!-- Document Banner -->
        <div class="report-title-banner">
          <h1>Component Test & Quality Inspection Report</h1>
        </div>

        <!-- Meta Grid -->
        <table class="meta-table">
          <tr>
            <td class="meta-label">Job Order (JO)</td>
            <td class="meta-value" style="font-family: monospace; font-size: 12px; color: #1e3a8a;">${reportData.joNumber}</td>
            <td class="meta-label">Date Issued</td>
            <td class="meta-value">${reportData.generatedDate.split('T')[0]}</td>
          </tr>
          <tr>
            <td class="meta-label">Unit Model</td>
            <td class="meta-value">${reportData.unitModel}</td>
            <td class="meta-label">Component</td>
            <td class="meta-value">${reportData.component}</td>
          </tr>
          <tr>
            <td class="meta-label">Part Number</td>
            <td class="meta-value" style="font-family: monospace;">${reportData.partNumber || '-'}</td>
            <td class="meta-label">Serial Number</td>
            <td class="meta-value" style="font-family: monospace;">${reportData.serialNumber || '-'}</td>
          </tr>
          <tr>
            <td class="meta-label">Assembly Mechanic</td>
            <td class="meta-value">${reportData.assemblyMechanic}</td>
            <td class="meta-label">Operator</td>
            <td class="meta-value">${reportData.testOperator}</td>
          </tr>
          <tr>
            <td class="meta-label">Test Stage</td>
            <td class="meta-value" style="font-weight: bold; color: #1e3a8a;">${reportData.testStage}</td>
            <td class="meta-label">Customer</td>
            <td class="meta-value">${reportData.customer || '-'}</td>
          </tr>
        </table>

        <!-- GLT Section -->
        <div class="table-title">1. Leak Test Verification (GLT)</div>
        <table class="meta-table">
          <tr>
            <td class="meta-label" style="width: 18%;">GLT Operator</td>
            <td class="meta-value" style="width: 32%;">${reportData.gltOperator || '-'}</td>
            <td class="meta-label" style="width: 18%;">GLT Date</td>
            <td class="meta-value" style="width: 32%;">${reportData.gltDate || '-'}</td>
          </tr>
          <tr>
            <td class="meta-label">GLT Verdict</td>
            <td class="meta-value">
              <span class="badge ${reportData.gltResult === 'GOOD' ? 'badge-good' : 'badge-ng'}">${reportData.gltResult}</span>
            </td>
            <td class="meta-label">GLT Remarks</td>
            <td class="meta-value">${reportData.gltRemarks || '-'}</td>
          </tr>
        </table>

        <!-- Main Parameter Table -->
        <div class="table-title">2. Final Performance bench parameters</div>
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">No</th>
              <th style="text-align: left; width: 35%;">Parameter / Inspection Item</th>
              <th style="text-align: left; width: 20%;">Section</th>
              <th style="text-align: left; width: 18%;">Standard Limit</th>
              <th style="text-align: left; width: 14%;">Measured Value</th>
              <th style="text-align: center; width: 8%;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <!-- Overall Verdict Summary -->
        <table class="meta-table" style="margin-top: 15px;">
          <tr>
            <td class="meta-label" style="width: 25%; font-size: 10px; background: #f1f5f9; text-align: center; font-weight: bold; text-transform: uppercase;">Final QA Verification Status</td>
            <td class="meta-value" style="width: 75%; padding: 8px;">
              <span class="badge ${reportData.overallResult === 'GOOD' ? 'badge-good' : 'badge-ng'}" style="font-size: 12px; padding: 4px 12px; font-weight: 900;">
                ${reportData.overallResult}
              </span>
              <span style="font-size: 10px; color: #475569; margin-left: 15px; font-weight: 600;">
                GLT Lead Time: ${reportData.gltLeadTimeMinutes ? `${reportData.gltLeadTimeMinutes} min` : '-'} | 
                Bench Testing Lead Time: ${reportData.testingLeadTimeMinutes ? `${reportData.testingLeadTimeMinutes} min` : '-'}
              </span>
            </td>
          </tr>
        </table>

        <!-- Trial Checksheets Section (E3) -->
        ${trialChecklistsHtml}

        <!-- Signature Section -->
        <table class="signature-section">
          <tr>
            <td>
              <div class="signature-title">Tested & Executed By</div>
              <div style="height: 25px;"></div>
              <div class="signature-name">${reportData.testOperator}</div>
              <div style="font-size: 8px; color: #64748b; margin-top: 2px;">BENCH OPERATOR</div>
            </td>
            <td>
              <div class="signature-title">Reviewed & Inspected By</div>
              <div style="height: 25px;"></div>
              <div class="signature-name">Ferry</div>
              <div style="font-size: 8px; color: #64748b; margin-top: 2px;">QC QA LEAD</div>
            </td>
            <td>
              <div class="signature-title">Approved For Signoff</div>
              <div style="height: 25px;"></div>
              <div class="signature-name">Zakaria / Vaiz</div>
              <div style="font-size: 8px; color: #64748b; margin-top: 2px;">PPC & PRODUCTION MANAGER</div>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <div class="footer-text">
          PT Komatsu Remanufacturing Asia • Balikpapan Plant Reman • ISO 9001:2015 certified<br>
          This is an official digitized inspection certificate. Generated via KRA AQualityPRO.
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
