import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { CombinedJORecords, User } from '../types';
import {
  compileQualityCertificateData,
  pdfReportService,
  getKomatsuRemanLogoSvg,
  QualityCertificateData,
} from '../services/pdfReportService';
import { store } from '../data/storageEngine';

interface PDFReportModalProps {
  jo: CombinedJORecords;
  onClose: () => void;
  currentUser?: string;
  authenticatedUser?: User | null;
}

export const PDFReportModal: React.FC<PDFReportModalProps> = ({
  jo,
  onClose,
  currentUser,
  authenticatedUser,
}) => {
  // Resolve current authenticated user and role
  const resolvedUser: User | null = useMemo(() => {
    if (authenticatedUser) return authenticatedUser;
    try {
      const raw = sessionStorage.getItem('aquality_auth_user_v2');
      if (raw) return JSON.parse(raw);
    } catch {
      // fallback
    }
    if (currentUser) {
      return {
        id: 'usr-curr',
        name: currentUser,
        username: currentUser,
        role: 'SUPERVISOR',
        active: true,
      };
    }
    return null;
  }, [authenticatedUser, currentUser]);

  const userRole = (resolvedUser?.role || '').toUpperCase();
  const canApprove =
    userRole === 'SUPERVISOR' ||
    userRole === 'ADMIN' ||
    userRole === 'ADMINISTRATOR';

  // Check if an approved certificate already exists for this JO
  const existingCerts = useMemo(() => {
    return store.getCertificatesForJO(jo.joNumber);
  }, [jo.joNumber]);

  const latestApprovedCert = existingCerts.find(
    (c) => c.supervisorVerification && c.supervisorVerification.approved
  );

  const [isApproved, setIsApproved] = useState<boolean>(Boolean(latestApprovedCert));
  const [supervisorInfo, setSupervisorInfo] = useState<{
    name: string;
    timestamp: string;
    role: string;
  }>(() => {
    if (latestApprovedCert?.supervisorVerification) {
      return {
        name: latestApprovedCert.supervisorVerification.name,
        timestamp: latestApprovedCert.supervisorVerification.timestamp,
        role: latestApprovedCert.supervisorVerification.role || 'SUPERVISOR',
      };
    }
    return {
      name: resolvedUser?.name || resolvedUser?.username || 'Quality Supervisor',
      timestamp: new Date().toISOString(),
      role: resolvedUser?.role || 'SUPERVISOR',
    };
  });

  const [currentVersion] = useState<number>(() => {
    if (latestApprovedCert) return latestApprovedCert.version;
    return existingCerts.length + 1;
  });

  // Compile certificate data
  const certData: QualityCertificateData = useMemo(() => {
    return compileQualityCertificateData(jo, currentVersion, {
      name: supervisorInfo.name,
      timestamp: supervisorInfo.timestamp,
      role: supervisorInfo.role,
      approved: isApproved,
    });
  }, [jo, currentVersion, supervisorInfo, isApproved]);

  const isOverallGood = jo.currentOverallStatus === 'GOOD';

  // Handle Approve, Stamp & Print
  const handleApproveStampPrint = () => {
    if (!isOverallGood) {
      alert('Certificate cannot be issued for NOT GOOD test results.');
      return;
    }

    if (!canApprove) {
      alert('Only SUPERVISOR and ADMIN roles may approve and issue the certificate.');
      return;
    }

    const approvalTimestamp = new Date().toISOString();
    const approverName = resolvedUser?.name || resolvedUser?.username || 'Quality Supervisor';
    const approverRole = resolvedUser?.role || 'SUPERVISOR';

    setSupervisorInfo({
      name: approverName,
      timestamp: approvalTimestamp,
      role: approverRole,
    });
    setIsApproved(true);

    // Save immutable Quality Certificate Record with operator & supervisor stamp info
    const savedCert = pdfReportService.generateQualityCertificateRecord(
      jo,
      {
        name: approverName,
        role: approverRole,
      },
      certData.operatorVerification.name
    );

    // Also register PDF test report snapshot
    pdfReportService.generateTestReportRecord(jo, approverName, true);

    // Trigger instant print
    if (savedCert.dataSnapshot) {
      pdfReportService.printCertificateHtml(savedCert.dataSnapshot);
    } else {
      const approvedCertData: QualityCertificateData = {
        ...certData,
        supervisorVerification: {
          name: approverName,
          timestamp: approvalTimestamp,
          role: approverRole,
          approved: true,
        },
      };
      pdfReportService.printCertificateHtml(approvedCertData);
    }
  };

  // Handle direct print if already approved
  const handleDirectPrint = () => {
    pdfReportService.printCertificateHtml(certData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 shrink-0 bg-slate-50 rounded-t-2xl">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-[#00188F] text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Product Quality Test Certificate
                </h3>
                <span className="text-[11px] font-mono font-bold bg-blue-100 text-blue-900 px-2 py-0.5 rounded-md border border-blue-200">
                  {certData.certificateNumber}
                </span>
                {isApproved ? (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    APPROVED & ISSUED
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    PENDING APPROVAL
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                PT Komatsu Remanufacturing Asia • Quality Assurance Department (ISO 9001:2015)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-200 transition-all"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PERMISSION / STATUS WARNING BAR */}
        {!isOverallGood ? (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-2.5 flex items-center justify-between text-xs text-rose-800 shrink-0">
            <div className="flex items-center space-x-2 font-bold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                Final Result is NOT GOOD. Quality Certificate cannot be issued until re-test passes.
              </span>
            </div>
            <span className="font-mono font-black text-rose-900 bg-rose-200/60 px-2 py-0.5 rounded text-[11px]">
              RE-TEST REQUIRED
            </span>
          </div>
        ) : !isApproved && !canApprove ? (
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center space-x-2 text-xs text-amber-800 shrink-0 font-medium">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Pending Supervisor Approval. Your current role (
              <strong className="uppercase">{userRole || 'Operator'}</strong>) cannot issue
              certificates. Please notify an authorized Supervisor or Admin.
            </span>
          </div>
        ) : null}

        {/* MODAL BODY: EXACT ONE-PAGE A4 PREVIEW */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 flex justify-center">
          <div className="bg-white rounded-lg shadow-xl border border-slate-300 w-full max-w-[210mm] p-6 sm:p-8 text-slate-900 font-sans text-xs flex flex-col justify-between">
            {/* 1. HEADER */}
            <div>
              <div className="flex justify-between items-center border-b-2 border-slate-900 pb-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="border border-slate-300 rounded p-1 bg-white shrink-0"
                    dangerouslySetInnerHTML={{ __html: getKomatsuRemanLogoSvg(150, 42) }}
                  />
                  <div>
                    <div className="text-sm font-black text-[#00188F] tracking-wide">
                      {certData.companyName}
                    </div>
                    <div className="text-[9.5px] text-slate-600 leading-tight">
                      {certData.companyAddress}
                    </div>
                    <div className="text-[9.5px] font-bold text-blue-900 mt-0.5">
                      {certData.department} • {certData.subDepartment}
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[8px] font-black uppercase text-slate-400 tracking-wider">
                    CERTIFICATE NO.
                  </div>
                  <div className="text-sm font-black font-mono text-slate-900 tracking-tight">
                    {certData.certificateNumber}
                  </div>
                  <div className="text-[10px] text-slate-600 mt-0.5">
                    Date: <strong>{certData.issueDate}</strong> • <strong>{certData.revision}</strong>
                  </div>
                </div>
              </div>

              {/* 2. DOCUMENT TITLE */}
              <div className="text-center mb-3">
                <h1 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-wider">
                  SERTIFIKAT UJI KUALITAS PRODUK
                </h1>
                <div className="text-[10px] font-bold text-blue-900 uppercase mt-0.5">
                  PRODUCT QUALITY TEST CERTIFICATE ({certData.conclusionStage})
                </div>
              </div>

              {/* 3. SECTION 1: PRODUCT INFORMATION */}
              <div className="mb-3">
                <div className="bg-[#0f2b5c] text-white text-[9.5px] font-bold px-3 py-1 rounded-t flex justify-between items-center uppercase tracking-wide">
                  <span>1. INFORMASI PRODUK / PRODUCT INFORMATION</span>
                  <span className="font-mono text-[9px] font-normal">{certData.testBench}</span>
                </div>
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 bg-slate-50 text-slate-600 font-bold px-2 py-1 w-1/4">
                        Nama Produk / Product Name:
                      </td>
                      <td className="border border-slate-300 font-bold text-blue-950 px-2 py-1 w-1/4">
                        {certData.productName}
                      </td>
                      <td className="border border-slate-300 bg-slate-50 text-slate-600 font-bold px-2 py-1 w-1/4">
                        Job Order No (JO):
                      </td>
                      <td className="border border-slate-300 font-mono font-bold text-blue-950 px-2 py-1 w-1/4">
                        {certData.joNumber}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 bg-slate-50 text-slate-600 font-bold px-2 py-1">
                        Tipe / Model:
                      </td>
                      <td className="border border-slate-300 font-semibold px-2 py-1">
                        {certData.unitModel}
                      </td>
                      <td className="border border-slate-300 bg-slate-50 text-slate-600 font-bold px-2 py-1">
                        Serial Number:
                      </td>
                      <td className="border border-slate-300 font-mono font-semibold px-2 py-1">
                        {certData.serialNumber}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 bg-slate-50 text-slate-600 font-bold px-2 py-1">
                        Comp. Part Number:
                      </td>
                      <td className="border border-slate-300 font-mono font-semibold px-2 py-1">
                        {certData.partNumber}
                      </td>
                      <td className="border border-slate-300 bg-slate-50 text-slate-600 font-bold px-2 py-1">
                        Machine Model:
                      </td>
                      <td className="border border-slate-300 font-semibold px-2 py-1">
                        {certData.machineModel}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 bg-slate-50 text-slate-600 font-bold px-2 py-1">
                        Dyno / Test Bench:
                      </td>
                      <td className="border border-slate-300 font-semibold px-2 py-1">
                        {certData.testBench}
                      </td>
                      <td className="border border-slate-300 bg-slate-50 text-slate-600 font-bold px-2 py-1">
                        Tanggal Pengujian / Test Date:
                      </td>
                      <td className="border border-slate-300 font-mono font-semibold px-2 py-1">
                        {certData.testDate}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 bg-slate-50 text-slate-600 font-bold px-2 py-1">
                        Assembly Mechanic:
                      </td>
                      <td className="border border-slate-300 font-semibold px-2 py-1">
                        {certData.assemblyMechanic}
                      </td>
                      <td className="border border-slate-300 bg-slate-50 text-slate-600 font-bold px-2 py-1">
                        Test Type / Attempt:
                      </td>
                      <td className="border border-slate-300 font-semibold px-2 py-1">
                        {certData.testType}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 bg-slate-50 text-slate-600 font-bold px-2 py-1">
                        Checksheet Template:
                      </td>
                      <td className="border border-slate-300 px-2 py-1" colSpan={3}>
                        <span className="font-semibold">{certData.checksheetTemplateName}</span>
                        <span className="text-slate-500 ml-2">
                          (Revision {certData.checksheetRevision})
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* GLT SUB-BAR: Display ONLY when GLT record exists and NOT Cylinder */}
                {certData.hasGLT && (
                  <div className="bg-slate-50 border border-slate-300 rounded-b p-1.5 px-2.5 flex items-center justify-between text-[9.5px]">
                    <div>
                      <strong className="text-blue-900 uppercase">Leak Test (GLT) Verification:</strong>
                      <span className="text-slate-600 ml-2">
                        Tested by: <strong>{certData.gltOperator}</strong> • Date:{' '}
                        <strong>{certData.gltDate}</strong>
                      </span>
                      {certData.gltActualLineOff && (
                        <span className="text-slate-600 ml-2">
                          • Line Off: <strong>{certData.gltActualLineOff}</strong>
                        </span>
                      )}
                    </div>
                    <span
                      className={`font-mono font-black px-2 py-0.5 rounded text-[9px] ${
                        certData.gltResult === 'GOOD'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      GLT {certData.gltResult}
                    </span>
                  </div>
                )}
              </div>

              {/* 4. SECTION 2: PERFORMANCE TEST RESULTS */}
              <div className="mb-3">
                <div className="bg-[#0f2b5c] text-white text-[9.5px] font-bold px-3 py-1 rounded-t flex justify-between items-center uppercase tracking-wide">
                  <span>2. HASIL PENGUJIAN PERFORMA / PERFORMANCE TEST RESULTS</span>
                  <span className="text-[9px] font-normal">
                    Total: {certData.totalEvaluated} Parameters Evaluated
                  </span>
                </div>
                <table className="w-full border-collapse border border-slate-300 text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 uppercase font-bold text-[9px]">
                      <th className="border border-slate-300 px-2 py-1 text-center w-8">NO</th>
                      <th className="border border-slate-300 px-2 py-1 text-left">
                        PARAMETER UJI / TEST PARAMETER
                      </th>
                      <th className="border border-slate-300 px-2 py-1 text-left">
                        SPESIFIKASI STANDAR / SPECIFICATION
                      </th>
                      <th className="border border-slate-300 px-2 py-1 text-center w-14">UNIT</th>
                      <th className="border border-slate-300 px-2 py-1 text-left">
                        HASIL UJI AKTUAL / ACTUAL RESULT
                      </th>
                      <th className="border border-slate-300 px-2 py-1 text-center w-16">STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {certData.items.map((itm) => (
                      <tr key={itm.no} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="border border-slate-300 px-2 py-1 text-center font-bold text-slate-500 text-[9.5px]">
                          {itm.no}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 font-bold text-slate-900 text-[9.5px]">
                          {itm.parameter}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 font-mono text-slate-700 text-[9.5px]">
                          {itm.standard}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-center text-slate-500 text-[9px]">
                          {itm.unit}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 font-mono font-bold text-slate-900 text-[9.5px]">
                          {itm.actual}
                        </td>
                        <td className="border border-slate-300 px-2 py-1 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[8.5px] font-black tracking-wider ${
                              itm.status === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-100 text-rose-800 border border-rose-300'
                            }`}
                          >
                            {itm.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 5. SECTION 3: FINAL CONCLUSION */}
              <div
                className={`border rounded-md p-3 mb-3 flex items-center justify-between gap-4 ${
                  certData.conclusionResult === 'GOOD'
                    ? 'bg-emerald-50/80 border-emerald-300'
                    : 'bg-rose-50/80 border-rose-300'
                }`}
              >
                <div>
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
                    3. KESIMPULAN UJI MUTU / QUALITY CONCLUSION
                  </div>
                  <div className="text-[10px] text-slate-800 font-medium mt-0.5 leading-snug">
                    {certData.conclusionText}
                  </div>
                </div>
                <div className="shrink-0">
                  <span
                    className={`inline-block px-3 py-1.5 rounded text-xs font-black tracking-wide border ${
                      certData.conclusionResult === 'GOOD'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                        : 'bg-rose-100 text-rose-800 border-rose-400'
                    }`}
                  >
                    {certData.conclusionStatusLabel}
                  </span>
                </div>
              </div>

              {/* 6. SECTION 4: ELECTRONIC STAMP-STYLE VERIFICATION BLOCKS */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Operator Verification Stamp Block */}
                <div className="border-1.5 border-blue-600 rounded-lg p-3 bg-blue-50/40 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[8.5px] font-black uppercase tracking-wider text-blue-700">
                        VERIFIED — TEST OPERATOR
                      </div>
                      <div className="text-xs font-black text-slate-900 mt-1">
                        {certData.operatorVerification.name}
                      </div>
                      <div className="text-[9px] text-slate-500">
                        KRA Bench Operator • Final Functional Testing
                      </div>
                      <div className="text-[9px] font-mono text-slate-700 mt-1">
                        Date/Time:{' '}
                        <strong>
                          {certData.operatorVerification.timestamp.replace('T', ' ').substring(0, 19)}
                        </strong>
                      </div>
                    </div>

                    <div className="w-12 h-12 rounded-full border-2 border-blue-600 border-dashed flex flex-col items-center justify-center bg-blue-100 text-blue-900 text-center shrink-0">
                      <span className="text-[6.5px] font-black leading-none">KRA QC</span>
                      <span className="text-[8px] font-black leading-tight text-blue-700">VERIFIED</span>
                      <span className="text-[6px] font-bold leading-none">E-STAMP</span>
                    </div>
                  </div>
                </div>

                {/* Supervisor Verification Stamp Block */}
                {isApproved ? (
                  <div className="border-1.5 border-emerald-600 rounded-lg p-3 bg-emerald-50/40 relative">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-[8.5px] font-black uppercase tracking-wider text-emerald-700">
                          APPROVED — SUPERVISOR
                        </div>
                        <div className="text-xs font-black text-slate-900 mt-1">
                          {certData.supervisorVerification.name}
                        </div>
                        <div className="text-[9px] text-emerald-700 font-semibold">
                          Quality Assurance Supervisor • Electronic Authorization
                        </div>
                        <div className="text-[9px] font-mono text-slate-700 mt-1">
                          Date/Time:{' '}
                          <strong>
                            {certData.supervisorVerification.timestamp.replace('T', ' ').substring(0, 19)}
                          </strong>
                        </div>
                      </div>

                      <div className="w-12 h-12 rounded-full border-2 border-emerald-600 flex flex-col items-center justify-center bg-emerald-100 text-emerald-900 text-center shrink-0">
                        <span className="text-[6.5px] font-black leading-none">KRA QA</span>
                        <span className="text-[8px] font-black leading-tight text-emerald-700">APPROVED</span>
                        <span className="text-[6px] font-bold leading-none">CERTIFIED</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-1.5 border-dashed border-amber-500 rounded-lg p-3 bg-amber-50/50 flex flex-col items-center justify-center text-center">
                    <div className="text-[9px] font-black uppercase tracking-wider text-amber-700">
                      SUPERVISOR APPROVAL STATUS
                    </div>
                    <div className="text-xs font-black text-amber-900 my-1 bg-amber-100 border border-amber-300 px-3 py-0.5 rounded tracking-wide">
                      PENDING SUPERVISOR APPROVAL
                    </div>
                    <div className="text-[8.5px] text-amber-800">
                      Awaiting electronic authorization by authorized SPV or Admin
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 7. FOOTER */}
            <div className="border-t border-slate-300 pt-2 flex justify-between items-center text-[8.5px] text-slate-500">
              <div>PT Komatsu Remanufacturing Asia - Quality Assurance Department</div>
              <div>{certData.formCode}</div>
              <div>Halaman 1 dari 1 / Page 1 of 1</div>
            </div>
          </div>
        </div>

        {/* MODAL FOOTER / ACTIONS */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 shrink-0 bg-slate-50 rounded-b-2xl">
          <div className="text-xs text-slate-600">
            {isApproved ? (
              <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                Certificate Approved & Signed by {certData.supervisorVerification.name}
              </span>
            ) : (
              <span className="text-slate-500">
                Official Komatsu Reman A4 Single-Page Quality Test Certificate Format
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Close
            </button>

            {/* If overall NOT GOOD: Block issuance */}
            {!isOverallGood ? (
              <button
                disabled
                className="bg-slate-300 text-slate-500 cursor-not-allowed px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
                title="NOT GOOD results cannot produce a quality certificate"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>Certificate Blocked (NOT GOOD)</span>
              </button>
            ) : isApproved ? (
              /* Already Approved -> Print Certificate */
              <button
                onClick={handleDirectPrint}
                className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Certificate</span>
              </button>
            ) : canApprove ? (
              /* Not yet approved & User is SPV/Admin -> "Approve, Stamp & Print" (Objective 14) */
              <button
                onClick={handleApproveStampPrint}
                className="bg-[#00188F] hover:bg-blue-800 active:bg-blue-900 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Approve, Stamp & Print</span>
              </button>
            ) : (
              /* Not yet approved & User is NOT SPV/Admin -> Disabled */
              <button
                disabled
                className="bg-slate-300 text-slate-500 cursor-not-allowed px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2"
                title="Only SUPERVISOR and ADMIN roles may approve and issue the certificate"
              >
                <Lock className="w-4 h-4" />
                <span>Pending Supervisor Approval</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
