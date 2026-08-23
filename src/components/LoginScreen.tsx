import React, { useState } from 'react';
import { User } from '../types';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  Settings,
} from 'lucide-react';
import engineTestingImg from '../assets/images/engine_testing_1787483698830.jpg';

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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 font-sans">
      {/* Left Side: Sign In Form */}
      <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 py-12 bg-white max-w-xl md:max-w-none w-full md:w-1/2 shadow-xl z-10 border-r border-slate-200">
        <div className="mx-auto w-full max-w-sm space-y-8">
          {/* Branding Header */}
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center shadow-md shadow-blue-200">
              <Settings className="w-6 h-6 shrink-0" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900">
                AQuality <span className="text-blue-600">PRO</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-1">
                Industrial Quality Checksheet & Testing Execution System
              </p>
            </div>
          </div>

          {/* Form Content */}
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-sm font-bold text-slate-800">Sign In to Station</h2>
              <p className="text-xs text-slate-400">Enter your credentials to access your testing line dashboard.</p>
            </div>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-800 text-xs p-3 rounded-xl flex items-start space-x-2 animate-in fade-in duration-150 shadow-2xs">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <p className="leading-tight font-medium">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Username / User ID</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin, supervisor, ppc"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-blue-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-blue-100 flex items-center justify-center space-x-2 disabled:opacity-50 pt-2.5"
              >
                <LogIn className="w-4 h-4" />
                <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
              </button>
            </form>
          </div>

          {/* Footer Support Notice */}
          <div className="pt-6 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 font-medium">
              Authorized personnel only. Having trouble signing in?
            </p>
            <p className="text-[11px] text-blue-600 font-bold hover:underline mt-0.5 cursor-pointer">
              Contact System Administrator
            </p>
          </div>
        </div>
      </div>

      {/* Right Side: Custom Generated Engine Illustration */}
      <div className="hidden md:block md:w-1/2 relative bg-slate-950 overflow-hidden">
        <img
          src={engineTestingImg}
          alt="Heavy duty industrial engine testbed illustration"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-90 transition-opacity duration-300 hover:opacity-100"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-950/30" />

        <div className="absolute bottom-12 left-12 right-12 text-white space-y-2">
          <div className="inline-flex items-center space-x-1.5 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full text-blue-300 text-[10px] font-black uppercase tracking-wider">
            <span>Dynotest & Checksheet Suite</span>
          </div>
          <h3 className="text-lg font-black tracking-tight">Heavy-Duty Engine Performance & Verification</h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
            Calibrated to JIS standards, executing real-time data sync with Firestore and SharePoint business systems.
          </p>
        </div>
      </div>
    </div>
  );
};
