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
  TestingLine,
} from './types';
import { apiClient } from './api/client';
import { store } from './data/storageEngine';
import { Navbar } from './components/Navbar';
import { BottomNav, TabType } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { LiveDashboard } from './components/LiveDashboard';
import { GLTForm } from './components/GLTForm';
import { DynotestForm } from './components/DynotestForm';
import { TestbenchForm } from './components/TestbenchForm';
import { HistoryPage } from './components/HistoryPage';
import { DashboardPage } from './components/DashboardPage';
import { AdminPanel } from './components/AdminPanel';
import { JODetailModal } from './components/JODetailModal';
import { ApkModal } from './components/ApkModal';
import { LoginScreen } from './components/LoginScreen';
import { SharePointModal } from './components/SharePointModal';
import { getUserPermissions } from './utils/permissions';
import { QueueRecord } from './types';

const AUTH_STORAGE_KEY = 'aquality_auth_user_v2';

function getDefaultTabForUser(user: User | null): TabType {
  if (!user) return 'home';
  const roleUpper = (user.role || '').toUpperCase();
  if (roleUpper === 'ADMIN' || user.role === 'administrator') return 'admin';
  if (roleUpper === 'GLT_OPT') return 'glt';
  if (roleUpper === 'DYNO_OPT') return 'dyno';
  if (roleUpper === 'TESTBENCH_OPT') return 'hydraulic';
  const isOperator =
    roleUpper.includes('OPERATOR') ||
    roleUpper.includes('OPT') ||
    user.role === 'operator';
  if (isOperator) {
    const perms = getUserPermissions(user);
    if (perms.canExecuteGLT) return 'glt';
    if (perms.canExecuteDynotest) return 'dyno';
    if (perms.canExecuteTestbench) return 'hydraulic';
  }
  return 'home';
}

export default function App() {
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

  const [activeTab, setActiveTab] = useState<TabType>(() => getDefaultTabForUser(authenticatedUser));
  const [showApkModal, setShowApkModal] = useState(false);
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [queueRecords, setQueueRecords] = useState<QueueRecord[]>([]);
  const [testingLines, setTestingLines] = useState<TestingLine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assemblers, setAssemblers] = useState<Assembler[]>([]);
  const [templates, setTemplates] = useState<ChecksheetTemplate[]>([]);

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
    const [uList, aList, mList, tList, cList, hList, dStats, qList, tLines] = await Promise.all([
      apiClient.getUsers(),
      apiClient.getAssemblers(),
      apiClient.getProductModels(),
      apiClient.getChecksheetTemplates(),
      apiClient.getChecksheetItems(),
      apiClient.getCombinedJOHistory(),
      apiClient.getDashboardStats(),
      apiClient.getQueueRecords(),
      apiClient.getTestingLines(),
    ]);

    setUsers(uList);
    setAssemblers(aList);
    setProductModels(mList);
    setTemplates(tList);
    setChecksheets(cList);
    setHistoryRecords(hList);
    setDashboardStats(dStats);
    setQueueRecords(qList);
    setTestingLines(tLines);

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
    setActiveTab(getDefaultTabForUser(user));
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
    setActiveTab(getDefaultTabForUser(u));
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
    await refreshData();
    return record;
  };

  const handleSaveDyno = async (record: DynotestRecord) => {
    await apiClient.saveDynoRecord(record);
    await refreshData();
    return record;
  };

  const handleSaveHydraulic = async (record: HydraulicRecord) => {
    await apiClient.saveHydraulicRecord(record);
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
      const targetTab = getDefaultTabForUser(authenticatedUser);
      handleNavigate(targetTab);
    }
  };

  // Enforce Home access restriction and route protection for all users
  useEffect(() => {
    if (authenticatedUser) {
      const perms = getUserPermissions(authenticatedUser);
      const roleUpper = (authenticatedUser.role || '').toUpperCase();
      const isOperator =
        (roleUpper.includes('OPERATOR') ||
          roleUpper.includes('OPT') ||
          roleUpper === 'GLT_OPT' ||
          roleUpper === 'DYNO_OPT' ||
          roleUpper === 'TESTBENCH_OPT') &&
        roleUpper !== 'ADMIN' &&
        authenticatedUser.role !== 'administrator' &&
        roleUpper !== 'SUPERVISOR' &&
        authenticatedUser.role !== 'supervisor' &&
        roleUpper !== 'PPC' &&
        roleUpper !== 'QC';

      let isAllowed = true;

      if (activeTab === 'admin' && !perms.canManageMasterData) {
        isAllowed = false;
      } else if (activeTab === 'dashboard' && !perms.canViewAnalytics) {
        isAllowed = false;
      } else if (activeTab === 'history' && !perms.canViewHistory) {
        isAllowed = false;
      } else if (activeTab === 'glt' && !perms.canExecuteGLT) {
        isAllowed = false;
      } else if (activeTab === 'dyno' && !perms.canExecuteDynotest) {
        isAllowed = false;
      } else if (activeTab === 'hydraulic' && !perms.canExecuteTestbench) {
        isAllowed = false;
      } else if (activeTab === 'home' && isOperator) {
        isAllowed = false;
      }

      if (!isAllowed) {
        const fallback = getDefaultTabForUser(authenticatedUser);
        if (fallback !== activeTab) {
          setActiveTab(fallback);
        }
      }
    }
  }, [authenticatedUser, activeTab]);

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
        {activeTab === 'home' && (
          <HomeScreen
            onNavigate={handleNavigate}
            historyRecords={historyRecords}
            dashboardStats={dashboardStats}
            onOpenJODetail={handleOpenJODetail}
            userRole={authenticatedUser.role}
            currentUserName={authenticatedUser.name}
          />
        )}

        {/* LIVE DASHBOARD TESTING MONITORING & TIMELINE */}
        {activeTab === 'live' && (
          <LiveDashboard
            queueRecords={queueRecords}
            testingLines={testingLines}
            currentUser={authenticatedUser}
            onSelectJO={handleOpenJODetail}
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
        {activeTab === 'admin' && permissions.canManageMasterData && (
          <AdminPanel
            currentUser={authenticatedUser}
            users={users}
            assemblers={assemblers}
            productModels={productModels}
            templates={templates}
            testingLines={testingLines}
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

      {/* SharePoint Integration Modal */}
      <SharePointModal
        isOpen={showSheetsModal}
        onClose={() => setShowSheetsModal(false)}
        currentUser={authenticatedUser}
        onShowToast={(msg) => alert(msg)}
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
