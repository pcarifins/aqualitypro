import React, { useState } from 'react';
import { User } from '../types';
import {
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertCircle,
  LogIn,
  Sliders,
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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-800 font-sans antialiased">
      
      {/* LEFT PANEL: Elegant Login Form Container */}
      <div className="w-full md:w-[45%] lg:w-[40%] bg-white flex flex-col justify-between p-8 sm:p-12 lg:p-16 border-r border-slate-100 shadow-sm z-10 relative">
        
        {/* Branding Header */}
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-slate-900 uppercase">
              AQUALITY <span className="text-blue-600">PRO</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Industrial Testing Execution Suite
            </p>
          </div>
        </div>

        {/* Central Sign-In Block */}
        <div className="my-auto py-12 max-w-sm w-full mx-auto space-y-8">
          <div className="space-y-2">
            <h2 className="text-2xl font-serif text-slate-900 tracking-tight">
              Sign in to Station
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Access localized testing queues, parameter validation, and live monitoring checklists.
            </p>
          </div>

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-100 text-rose-900 text-xs p-3.5 rounded-xl flex items-start space-x-2.5 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed font-semibold">{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Username / Operator ID
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. admin, qc, supervisor, ppc"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all font-semibold"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-xl pl-10 pr-11 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 transition-all font-semibold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 pt-2.5"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Authenticating...' : 'Secure Sign In'}</span>
            </button>
          </form>
        </div>

        {/* Footer Support Notice */}
        <div className="text-center md:text-left space-y-1 pt-6 border-t border-slate-50">
          <p className="text-[11px] text-slate-400 font-medium">
            Authorized personnel & certified test operators only.
          </p>
          <p className="text-[11px] text-blue-600 font-bold hover:underline cursor-pointer">
            Contact System Administrator for credentials assistance
          </p>
        </div>
      </div>

      {/* RIGHT PANEL: High-contrast Engine Testing Illustration View */}
      <div className="hidden md:block md:flex-1 relative bg-slate-950 overflow-hidden">
        <img
          src={engineTestingImg}
          alt="Attachment 2: Custom Heavy Duty Engine Testbed Illustration"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover opacity-85 transition-opacity duration-500 hover:opacity-90"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/10 to-slate-950/20" />

        {/* Floating Minimalist Info Plate */}
        <div className="absolute bottom-12 left-12 max-w-md bg-slate-900/90 backdrop-blur-md border border-slate-800 p-6 rounded-2xl space-y-3 shadow-2xl text-white">
          <span className="inline-flex items-center space-x-1.5 bg-blue-500/20 border border-blue-400/20 px-3 py-1 rounded-full text-blue-400 text-[10px] font-black uppercase tracking-wider">
            <span>Attachment 2: Dynotest & Checksheet Suite</span>
          </span>
          <h3 className="text-lg font-serif tracking-tight text-white leading-snug">
            Heavy-Duty Engine Performance & Hydraulic System Verification
          </h3>
          <p className="text-[11px] text-slate-300 leading-relaxed font-medium">
            Strictly synchronized in real-time. Calibrated to rigorous standards, processing automatic quality checks, AI trouble diagnostics, and SharePoint integrations.
          </p>
        </div>
      </div>
    </div>
  );
};
