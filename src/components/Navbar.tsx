import React, { useState, useEffect } from 'react';
import { User } from '../types';
import {
  ShieldCheck,
  User as UserIcon,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  Database,
  WifiOff,
  LogOut,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  users: User[];
  onSwitchUser?: (user: User) => void;
  onLogout: () => void;
  onResetData: () => void;
  onOpenDriveModal?: () => void;
  onOpenApkModal?: () => void;
  onOpenSheetsModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  onResetData,
  onOpenSheetsModal,
}) => {
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getRoleBadgeStyle = (role: string) => {
    const r = role.toUpperCase();
    if (r.includes('ADMIN')) return 'bg-amber-100 text-amber-800 border-amber-300';
    if (r.includes('SUPERVISOR')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (r.includes('PPC')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (r.includes('GLT')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (r.includes('DYNO')) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (r.includes('TESTBENCH') || r.includes('HYDRAULIC')) return 'bg-cyan-100 text-cyan-800 border-cyan-300';
    return 'bg-slate-100 text-slate-800 border-slate-300';
  };

  return (
    <>
      <header className="bg-white/95 backdrop-blur-md text-slate-800 sticky top-0 z-30 border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between">
          {/* Brand & App Title */}
          <div className="flex items-center space-x-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-blue-600 font-black text-base sm:text-lg tracking-tight">
                  AQuality PRO
                </span>
                <span className="text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200">
                  Trial Ready
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500 hidden sm:block">
                Industrial Quality Testing & Checksheet System
              </p>
            </div>
          </div>

          {/* Right Action Icons & Profile */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Online Status */}
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs ${
                isOnline
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-amber-300 bg-amber-50 text-amber-900'
              }`}
            >
              {isOnline ? (
                <>
                  <Database className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="hidden sm:inline text-[11px]">DB Sync</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-600" />
                  <span className="hidden sm:inline text-[11px]">Offline</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                </>
              )}
            </div>

            {/* Google Sheets Sync Modal Trigger */}
            {onOpenSheetsModal && (
              <button
                onClick={onOpenSheetsModal}
                className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 text-xs font-semibold shadow-2xs transition-all"
                title="Google Sheets Sync"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline text-[11px]">Sheets</span>
              </button>
            )}

            {/* User Profile Card Button */}
            <button
              onClick={() => setShowAccountModal(true)}
              className="flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 transition-all shadow-2xs"
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs border ${getRoleBadgeStyle(
                  currentUser.role
                )}`}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden xs:block">
                <div className="font-bold text-slate-900 truncate max-w-[120px] text-xs leading-tight">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-500 font-semibold uppercase">
                  {currentUser.role}
                </div>
              </div>
            </button>

            {/* Reset Sample Data Button */}
            <button
              onClick={() => setShowResetConfirm(true)}
              className="p-1.5 sm:p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all"
              title="Reset Sample Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Account Info Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <UserIcon className="w-4 h-4 text-blue-600" />
                <span>User Account Profile</span>
              </h3>
              <button
                onClick={() => setShowAccountModal(false)}
                className="text-slate-400 hover:text-slate-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center space-x-3 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-black border ${getRoleBadgeStyle(
                  currentUser.role
                )}`}
              >
                {currentUser.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-slate-900 truncate">{currentUser.name}</h4>
                <div className="text-xs text-slate-500 font-mono">@{currentUser.username}</div>
                <div className="mt-1">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${getRoleBadgeStyle(
                      currentUser.role
                    )}`}
                  >
                    {currentUser.role}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl space-y-1.5 border border-slate-100">
              <div className="flex justify-between">
                <span className="text-slate-400">Department:</span>
                <span className="font-semibold text-slate-700">Testing & Quality Operations</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Access Scope:</span>
                <span className="font-semibold text-slate-700 uppercase">{currentUser.role} Standard</span>
              </div>
            </div>

            <div className="pt-2 flex flex-col space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowAccountModal(false);
                  onLogout();
                }}
                className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors shadow-2xs"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out of Session</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Data Confirmation */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-2xl max-w-md w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-base">Reset Master & Sample Data?</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action will reset the local database to factory trial default records. All sample queue
              items, checksheets, and test records will be restored.
            </p>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onResetData();
                  setShowResetConfirm(false);
                }}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
