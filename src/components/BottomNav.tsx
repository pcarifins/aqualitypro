import React from 'react';
import {
  Home,
  ClipboardCheck,
  Gauge,
  Activity,
  History,
  BarChart3,
  Settings,
  Tv,
} from 'lucide-react';
import { UserRole } from '../types';
import { getUserPermissions } from '../utils/permissions';

export type TabType =
  | 'home'
  | 'live'
  | 'glt'
  | 'dyno'
  | 'hydraulic'
  | 'history'
  | 'dashboard'
  | 'admin';

interface BottomNavProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
  userRole: UserRole;
  pendingReceivingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  pendingReceivingCount = 0,
}) => {
  const permissions = getUserPermissions({ role: userRole } as any);
  const roleUpper = (userRole || '').toUpperCase();
  const isAdmin = roleUpper === 'ADMIN' || userRole === 'administrator';
  const isPPC = roleUpper === 'PPC';
  const isOperator =
    roleUpper === 'GLT_OPT' ||
    roleUpper === 'DYNO_OPT' ||
    roleUpper === 'TESTBENCH_OPT' ||
    roleUpper === 'OPERATOR' ||
    userRole === 'operator' ||
    roleUpper.includes('OPERATOR') ||
    roleUpper.includes('OPT');

  const isSupervisor = roleUpper === 'SUPERVISOR' || userRole === 'supervisor';
  const isQC = roleUpper === 'QC';
  const isGLTOpt = roleUpper === 'GLT_OPT';
  const isDynoOpt = roleUpper === 'DYNO_OPT';
  const isTestbenchOpt = roleUpper === 'TESTBENCH_OPT';

  const tabs: { id: TabType; label: string; icon: any }[] = [];

  if (isSupervisor) {
    tabs.push({ id: 'home', label: 'Queue', icon: Home });
    tabs.push({ id: 'live', label: 'Live Monitor', icon: Tv });
    tabs.push({ id: 'dashboard', label: 'Performance', icon: BarChart3 });
    tabs.push({ id: 'history', label: 'History', icon: History });
    tabs.push({ id: 'admin', label: 'Settings & Logs', icon: Settings });
  } else if (isPPC) {
    tabs.push({ id: 'home', label: 'Queue', icon: Home });
    tabs.push({ id: 'live', label: 'Live Monitor', icon: Tv });
  } else if (isGLTOpt) {
    tabs.push({ id: 'glt', label: 'GLT', icon: ClipboardCheck });
  } else if (isDynoOpt) {
    tabs.push({ id: 'dyno', label: 'Dynotest', icon: Gauge });
  } else if (isTestbenchOpt) {
    tabs.push({ id: 'hydraulic', label: 'Testbench', icon: Activity });
  } else if (isAdmin) {
    tabs.push({ id: 'home', label: 'Queue', icon: Home });
    tabs.push({ id: 'live', label: 'Live Monitor', icon: Tv });
    tabs.push({ id: 'dashboard', label: 'Performance', icon: BarChart3 });
    tabs.push({ id: 'history', label: 'History', icon: History });
    tabs.push({ id: 'admin', label: 'Admin', icon: Settings });
    tabs.push({ id: 'glt', label: 'GLT', icon: ClipboardCheck });
    tabs.push({ id: 'dyno', label: 'Dyno', icon: Gauge });
    tabs.push({ id: 'hydraulic', label: 'Testbench', icon: Activity });
  } else if (isQC) {
    tabs.push({ id: 'home', label: 'Queue', icon: Home });
    tabs.push({ id: 'live', label: 'Live Monitor', icon: Tv });
    tabs.push({ id: 'dashboard', label: 'Performance', icon: BarChart3 });
    tabs.push({ id: 'history', label: 'History', icon: History });
  } else if (isOperator) {
    if (permissions.canExecuteGLT) tabs.push({ id: 'glt', label: 'GLT', icon: ClipboardCheck });
    if (permissions.canExecuteDynotest) tabs.push({ id: 'dyno', label: 'Dyno', icon: Gauge });
    if (permissions.canExecuteTestbench) tabs.push({ id: 'hydraulic', label: 'Testbench', icon: Activity });
    if (permissions.canViewHistory) tabs.push({ id: 'history', label: 'History', icon: History });
  } else {
    tabs.push({ id: 'home', label: 'Queue', icon: Home });
    tabs.push({ id: 'live', label: 'Live Monitor', icon: Tv });
    if (permissions.canExecuteGLT) tabs.push({ id: 'glt', label: 'GLT', icon: ClipboardCheck });
    if (permissions.canExecuteDynotest) tabs.push({ id: 'dyno', label: 'Dynotest', icon: Gauge });
    if (permissions.canExecuteTestbench) tabs.push({ id: 'hydraulic', label: 'Testbench', icon: Activity });
    if (permissions.canViewHistory) tabs.push({ id: 'history', label: 'History', icon: History });
    if (permissions.canViewAnalytics) tabs.push({ id: 'dashboard', label: 'Performance', icon: BarChart3 });
    if (permissions.canManageMasterData) tabs.push({ id: 'admin', label: 'Settings', icon: Settings });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-2 py-1.5 shadow-lg">
      <div className="max-w-xl mx-auto flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as TabType)}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all relative min-w-[52px] ${
                isActive
                  ? 'text-blue-600 font-bold bg-blue-50 border border-blue-200 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-blue-600' : ''}`} />
                {(tab.id === 'dyno' || tab.id === 'hydraulic') && pendingReceivingCount > 0 && (
                  <span className="absolute -top-1 -right-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-xs">
                    !
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight leading-none font-medium">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
