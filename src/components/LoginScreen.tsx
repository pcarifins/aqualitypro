import React, { useState } from 'react';
import { User } from '../types';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  LogIn,
  Layers,
} from 'lucide-react';

interface LoginScreenProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  users,
  onLoginSuccess,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanUsername = usernameInput.trim().toLowerCase();
    const cleanPassword = passwordInput.trim();

    if (!cleanUsername || !cleanPassword) {
      setErrorMsg('Please enter your Username and Password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      // Find matching user by username or id
      const matched = users.find(
        (u) =>
          u.active &&
          (u.username.toLowerCase() === cleanUsername ||
            u.id.toLowerCase() === cleanUsername)
      );

      if (!matched) {
        setErrorMsg('User not found or inactive. Please contact Administrator.');
        setIsLoading(false);
        return;
      }

      // Check password
      const expectedPassword =
        matched.password ||
        (matched.role === 'ADMIN' || matched.role === 'administrator'
          ? 'admin123'
          : matched.role === 'SUPERVISOR' || matched.role === 'supervisor'
          ? 'super123'
          : matched.role === 'PPC'
          ? 'ppc123'
          : matched.role === 'QC'
          ? 'qc123'
          : 'operator123');

      if (cleanPassword !== expectedPassword) {
        setErrorMsg('Incorrect Password. Please check your credentials.');
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      onLoginSuccess(matched);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Ambience */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full space-y-6 z-10">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-blue-950/80 border border-blue-800/80 px-3 py-1 rounded-full text-blue-300 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span>AQuality PRO Authentication</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            AQuality PRO <span className="text-blue-500">Station</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            Industrial Quality Checksheet & Testing Execution System
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-slate-800/95 border border-slate-700/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-5">
          <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
            <h2 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
              <KeyRound className="w-4 h-4 text-blue-400" />
              <span>Sign In to Your Account</span>
            </h2>
            <div className="flex items-center space-x-1 text-[11px] text-slate-400">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>Role-Based Access</span>
            </div>
          </div>

          {errorMsg && (
            <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3 rounded-xl flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="leading-tight">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Username / User ID
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  placeholder="Enter your username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-blue-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Authorized Roles Guide */}
          <div className="pt-3 border-t border-slate-700/60">
            <div className="text-[11px] font-semibold text-slate-400 mb-2 flex items-center justify-between">
              <span>Authorized System Roles</span>
              <span className="text-[10px] text-slate-500">5 Security Levels</span>
            </div>
            <div className="grid grid-cols-5 gap-1 text-center">
              <div className="p-1.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300">
                <div className="text-[10px] font-bold">ADMIN</div>
              </div>
              <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300">
                <div className="text-[10px] font-bold">SUPERVISOR</div>
              </div>
              <div className="p-1.5 rounded-lg bg-purple-950/40 border border-purple-800/60 text-purple-300">
                <div className="text-[10px] font-bold">PPC</div>
              </div>
              <div className="p-1.5 rounded-lg bg-blue-950/40 border border-blue-800/60 text-blue-300">
                <div className="text-[10px] font-bold">OPERATOR</div>
              </div>
              <div className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-800/60 text-cyan-300">
                <div className="text-[10px] font-bold">QC</div>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 text-center mt-2">
              Assembly Mechanic / Assembler is not a login account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
