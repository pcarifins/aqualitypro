import React, { useState, useEffect } from 'react';
import {
  User,
  Assembler,
  ProductModel,
  ChecksheetTemplate,
  ChecksheetItem,
  GLTRecord,
  DynotestRecord,
  HydraulicRecord,
  CombinedJORecords,
  DashboardStats,
} from './types';
import { apiClient } from './api/client';
import { store } from './data/storageEngine';
import { Navbar } from './components/Navbar';
import { BottomNav, TabType } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { GLTForm } from './components/GLTForm';
import { DynotestForm } from './components/DynotestForm';
import { TestbenchForm } from './components/TestbenchForm';
import { HistoryPage } from './components/HistoryPage';
import { DashboardPage } from './components/DashboardPage';
import { AdminPanel } from './components/AdminPanel';
import { JODetailModal } from './components/JODetailModal';
import { ApkModal } from './components/ApkModal';
import { LoginScreen } from './components/LoginScreen';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { googleSheetsService } from './services/googleSheetsService';
import { getUserPermissions } from './utils/permissions';
import { QueueRecord } from './types';

const AUTH_STORAGE_KEY = 'aquality_auth_user_v2';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showApkModal, setShowApkModal] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assemblers, setAssemblers] = useState<Assembler[]>([]);
  const [templates, setTemplates] = useState<ChecksheetTemplate[]>([]);

  // Authenticated user: null by default if not previously saved in session
  const [authenticatedUser, setAuthenticatedUser] = useState<User | null>(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const [productModels, setProductModels] = useState<ProductModel[]>([]);
  const [checksheets, setChecksheets] = useState<ChecksheetItem[]>([]);
  const [historyRecords, setHistoryRecords] = useState<CombinedJORecords[]>([]);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    totalJOTested: 0,
    totalGood: 0,
    totalNotGood: 0,
    ngRatioPercent: 0,
    avgGltLeadTimeMinutes: 0,
    avgDynoLeadTimeMinutes: 0,
    avgHydraulicLeadTimeMinutes: 0,
    monthlyTrends: [],
    mechanicNGStats: [],
  });

  // Preloaded parameters for deep linking tabs
  const [preloadJONumber, setPreloadJONumber] = useState('');
  const [selectedJODetail, setSelectedJODetail] =
    useState<CombinedJORecords | null>(null);

  // Load initial app data
  const refreshData = async () => {
    const [uList, aList, mList, tList, cList, hList, dStats, qList] = await Promise.all([
      apiClient.getUsers(),
      apiClient.getAssemblers(),
      apiClient.getProductModels(),
      apiClient.getChecksheetTemplates(),
      apiClient.getChecksheetItems(),
      apiClient.getCombinedJOHistory(),
      apiClient.getDashboardStats(),
      apiClient.getQueueRecords(),
    ]);

    setUsers(uList);
    setAssemblers(aList);
    setProductModels(mList);
    setTemplates(tList);
    setChecksheets(cList);
    setHistoryRecords(hList);
    setDashboardStats(dStats);
    setQueueRecords(qList);

    // Keep authenticated user fresh with backend record
    setAuthenticatedUser((prev) => {
      if (!prev) return null;
      const found = uList.find((u) => u.id === prev.id);
      return found || prev;
    });
  };

  useEffect(() => {
    refreshData();

    // Start realtime Firestore sync across all connected devices
    store.initializeRealtimeSync();

    // Subscribe to store updates for instant UI re-renders
    const unsubscribeStore = store.subscribe(() => {
      refreshData();
    });

    return () => {
      unsubscribeStore();
    };
  }, []);

  const handleLoginSuccess = (user: User) => {
    setAuthenticatedUser(user);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    }
    const roleUpper = (user.role || '').toUpperCase();
    if (roleUpper === 'ADMIN' || user.role === 'administrator') {
      setActiveTab('admin');
    } else {
      setActiveTab('home');
    }
  };

  const handleLogout = () => {
    setAuthenticatedUser(null);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setActiveTab('home');
    setPreloadJONumber('');
  };

  const handleSwitchUser = (u: User) => {
    setAuthenticatedUser(u);
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(u));
    }
    const r = (u.role || '').toUpperCase();
    if (r === 'ADMIN' || u.role === 'administrator') {
      setActiveTab('admin');
    } else {
      setActiveTab('home');
    }
  };

  const handleNavigate = (tab: TabType, joToPreload?: string) => {
    if (joToPreload) {
      setPreloadJONumber(joToPreload);
    } else {
      setPreloadJONumber('');
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenJODetail = async (joNumber: string) => {
    const found = historyRecords.find(
      (r) => r.joNumber.toUpperCase() === joNumber.toUpperCase()
    );
    if (found) {
      setSelectedJODetail(found);
    } else {
      const latestHistory = await apiClient.getCombinedJOHistory();
      setHistoryRecords(latestHistory);
      const reFound = latestHistory.find(
        (r) => r.joNumber.toUpperCase() === joNumber.toUpperCase()
      );
      if (reFound) setSelectedJODetail(reFound);
    }
  };

  const handleSaveGLT = async (record: GLTRecord) => {
    await apiClient.saveGLTRecord(record);
    // Background live append to Google Sheets if connected
    try {
      const token = googleSheetsService.getAccessToken();
      const cfg = googleSheetsService.getConfig();
      if (token && cfg.spreadsheetId) {
        googleSheetsService.appendRecord(
          token,
          cfg.spreadsheetId,
          'GLT_Inspection_Log',
          [
            record.id,
            record.joNumber,
            record.unitModel || record.productModel,
            record.component || record.productModel,
            record.productCategory,
            record.customer || '-',
            record.serialNumber || '-',
            record.partNumber || '-',
            record.assemblyMechanic || '-',
            record.operatorName || record.testerName || '-',
            record.testDate,
            record.result,
            record.ngItem || record.leakLocation || '-',
            record.ngDescription || record.leakDescription || '-',
            record.remarks || '-',
            record.submissionTime || new Date().toISOString(),
          ]
        );
      }
    } catch (e) {
      console.warn('Sheets auto-sync notice:', e);
    }
    await refreshData();
    return record;
  };

  const handleSaveDyno = async (record: DynotestRecord) => {
    await apiClient.saveDynoRecord(record);
    // Background live append to Google Sheets if connected
    try {
      const token = googleSheetsService.getAccessToken();
      const cfg = googleSheetsService.getConfig();
      if (token && cfg.spreadsheetId) {
        googleSheetsService.appendRecord(
          token,
          cfg.spreadsheetId,
          'Dynotest_Engine_Log',
          [
            record.id,
            record.joNumber,
            record.compGroup || 'ENGINE',
            record.unitModel || '-',
            record.component || '-',
            record.operatorName,
            record.receivingTime,
            record.dynoLeadTimeMinutes || 0,
            record.result,
            record.powerOutputKw || '-',
            record.torqueNm || '-',
            record.oilTempCelsius || '-',
            record.blowbyKpa || '-',
            record.ngItem || '-',
            record.ngDescription || '-',
            record.remarks || '-',
            record.submissionTime || '',
          ]
        );
      }
    } catch (e) {
      console.warn('Sheets auto-sync notice:', e);
    }
    await refreshData();
    return record;
  };

  const handleSaveHydraulic = async (record: HydraulicRecord) => {
    await apiClient.saveHydraulicRecord(record);
    // Background live append to Google Sheets if connected
    try {
      const token = googleSheetsService.getAccessToken();
      const cfg = googleSheetsService.getConfig();
      if (token && cfg.spreadsheetId) {
        googleSheetsService.appendRecord(
          token,
          cfg.spreadsheetId,
          'Hydraulic_Bench_Log',
          [
            record.id,
            record.joNumber,
            record.compGroup || 'POWER_TRAIN',
            record.unitModel || '-',
            record.component || '-',
            record.operatorName,
            record.receivingTime,
            record.hydraulicLeadTimeMinutes || 0,
            record.result,
            record.mainReliefPressureBar || '-',
            record.flowRateLpm || '-',
            record.internalLeakageMlMin || '-',
            record.oilTemperatureCelsius || '-',
            record.ngItem || '-',
            record.ngDescription || '-',
            record.remarks || '-',
            record.submissionTime || '',
          ]
        );
      }
    } catch (e) {
      console.warn('Sheets auto-sync notice:', e);
    }
    await refreshData();
    return record;
  };


  const handleFormSuccessSubmitted = (joNum: string) => {
    refreshData();
    const roleUpper = (authenticatedUser?.role || '').toUpperCase();
    if (roleUpper === 'SUPERVISOR' || roleUpper === 'QC') {
      handleNavigate('history', joNum);
    } else if (roleUpper === 'ADMIN' || authenticatedUser?.role === 'administrator') {
      handleNavigate('admin');
    } else {
      handleOpenJODetail(joNum);
      handleNavigate('home');
    }
  };

  // If user is not logged in, show Login Screen (Phase 1.1: No auto-login)
  if (!authenticatedUser) {
    return (
      <LoginScreen
        users={users}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  const permissions = getUserPermissions(authenticatedUser);
  const isAdmin = (authenticatedUser.role || '').toUpperCase() === 'ADMIN' || authenticatedUser.role === 'administrator';

  // Count pending receiving JOs
  const pendingDynoCount = historyRecords.filter(
    (r) =>
      r.productCategory === 'Engine' &&
      r.gltRecords.length > 0 &&
      r.gltRecords[r.gltRecords.length - 1].result === 'GOOD' &&
      r.dynoRecords.length === 0
  ).length;

  const pendingHydCount = historyRecords.filter(
    (r) =>
      r.productCategory === 'Power Train Component' &&
      r.gltRecords.length > 0 &&
      r.gltRecords[r.gltRecords.length - 1].result === 'GOOD' &&
      r.hydraulicRecords.length === 0
  ).length;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Application Navbar */}
      <Navbar
        currentUser={authenticatedUser}
        users={users}
        onSwitchUser={handleSwitchUser}
        onLogout={handleLogout}
        onOpenSheetsModal={() => setShowSheetsModal(true)}
      />

      {/* Main View Container */}
      <main className="min-h-[calc(100vh-120px)] max-w-7xl mx-auto px-2 sm:px-4 pt-3 pb-20">
        {/* HOME / QUEUE SCREEN */}
        {activeTab === 'home' && !isAdmin && (
          <HomeScreen
            onNavigate={handleNavigate}
            historyRecords={historyRecords}
            dashboardStats={dashboardStats}
            onOpenJODetail={handleOpenJODetail}
            userRole={authenticatedUser.role}
            currentUserName={authenticatedUser.name}
          />
        )}

        {/* GLT TEST EXECUTION */}
        {activeTab === 'glt' && permissions.canExecuteGLT && (
          <GLTForm
            currentUser={authenticatedUser}
            productModels={productModels}
            getChecksheets={(cat) => apiClient.getChecksheetItems('GLT', cat)}
            onSaveRecord={handleSaveGLT}
            existingGLTRecords={
              preloadJONumber
                ? historyRecords.find(
                    (r) =>
                      r.joNumber.toUpperCase() === preloadJONumber.toUpperCase()
                  )?.gltRecords
                : []
            }
            preloadJONumber={preloadJONumber}
            onSuccessSubmitted={handleFormSuccessSubmitted}
          />
        )}

        {/* DYNOTEST TEST EXECUTION */}
        {activeTab === 'dyno' && permissions.canExecuteDynotest && (
          <DynotestForm
            currentUser={authenticatedUser}
            lookupJO={(jo, stage) => apiClient.lookupJO(jo, stage)}
            getChecksheets={() => apiClient.getChecksheetItems('Dynotest')}
            onSaveRecord={handleSaveDyno}
            preloadJONumber={preloadJONumber}
            onSuccessSubmitted={handleFormSuccessSubmitted}
          />
        )}

        {/* TESTBENCH TEST EXECUTION (PT-PPM & CYLINDER) */}
        {activeTab === 'hydraulic' && permissions.canExecuteTestbench && (
          <TestbenchForm
            currentUser={authenticatedUser}
            lookupJO={(jo, stage) => apiClient.lookupJO(jo, stage)}
            getChecksheets={() => apiClient.getChecksheetItems('Hydraulic Test')}
            onSaveRecord={handleSaveHydraulic}
            preloadJONumber={preloadJONumber}
            onSuccessSubmitted={handleFormSuccessSubmitted}
          />
        )}

        {/* HISTORY PAGE */}
        {activeTab === 'history' && permissions.canViewHistory && (
          <HistoryPage
            historyRecords={historyRecords}
            productModels={productModels}
            onOpenJODetail={handleOpenJODetail}
            initialSearchQuery={preloadJONumber}
            onOpenSheetsModal={() => setShowSheetsModal(true)}
          />
        )}

        {/* ANALYTICS & DASHBOARD PAGE */}
        {activeTab === 'dashboard' && permissions.canViewAnalytics && (
          <DashboardPage
            stats={dashboardStats}
            productModels={productModels}
          />
        )}

        {/* ADMINISTRATOR MASTER DATA & RBAC PANEL */}
        {(activeTab === 'admin' || isAdmin) && permissions.canManageMasterData && (
          <AdminPanel
            currentUser={authenticatedUser}
            users={users}
            assemblers={assemblers}
            productModels={productModels}
            templates={templates}
            checksheets={checksheets}
            onOpenSheetsModal={() => setShowSheetsModal(true)}
            onSaveAssembler={async (asm) => {
              await apiClient.saveAssembler(asm);
              await refreshData();
            }}
            onDeleteAssembler={async (id) => {
              await apiClient.deleteAssembler(id);
              await refreshData();
            }}
            onSaveProductModel={async (model) => {
              await apiClient.saveProductModel(model);
              await refreshData();
            }}
            onDeleteProductModel={async (id) => {
              await apiClient.deleteProductModel(id);
              await refreshData();
            }}
            onSaveTemplate={async (tmpl) => {
              await apiClient.saveChecksheetTemplate(tmpl);
              await refreshData();
            }}
            onActivateTemplate={async (tmplId) => {
              await apiClient.activateChecksheetTemplate(tmplId);
              await refreshData();
            }}
            onCreateRevision={async (tmplId) => {
              const rev = await apiClient.createRevisionChecksheetTemplate(tmplId);
              await refreshData();
              return rev;
            }}
            onDuplicateTemplate={async (tmplId) => {
              const dup = await apiClient.duplicateChecksheetTemplate(tmplId);
              await refreshData();
              return dup;
            }}
            onDeleteTemplate={async (tmplId) => {
              await apiClient.deleteChecksheetTemplate(tmplId);
              await refreshData();
            }}
            onSaveUser={async (u) => {
              await apiClient.saveUser(u);
              await refreshData();
            }}
            onDeleteUser={async (id) => {
              await apiClient.deleteUser(id);
              await refreshData();
            }}
            onChangePassword={async (userId, newPass) => {
              const res = await apiClient.changePassword(userId, newPass);
              await refreshData();
              return res;
            }}
          />
        )}
      </main>

      {/* JO Detail Drawer Modal */}
      {selectedJODetail && (
        <JODetailModal
          joRecord={selectedJODetail}
          onClose={() => setSelectedJODetail(null)}
        />
      )}

      {/* Google Sheets Integration Modal */}
      <GoogleSheetsModal
        isOpen={showSheetsModal}
        onClose={() => setShowSheetsModal(false)}
        historyRecords={historyRecords}
        queueRecords={queueRecords}
      />

      {/* APK / PWA Download Modal */}
      {showApkModal && (
        <ApkModal onClose={() => setShowApkModal(false)} />
      )}

      {/* Android / Mobile Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        userRole={authenticatedUser.role}
        pendingReceivingCount={pendingDynoCount + pendingHydCount}
      />
    </div>
  );
}
