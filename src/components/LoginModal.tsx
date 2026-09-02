import React, { useState } from 'react';
import { AppUser } from '../types';
import { LogIn, Key, ShieldCheck, Check, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  users: AppUser[];
  currentUser: AppUser | null;
  onLogin: (user: AppUser) => void;
  isForcedLogin?: boolean; // If true, cannot close without logging in
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUser,
  onLogin,
  isForcedLogin = false
}) => {
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleCredentialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanInput = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanInput) {
      setErrorMsg('ইউজার আইডি, ইমেইল অথবা ইকামা নম্বর প্রদান করুন (Please enter Employee ID, Email or Iqama)');
      return;
    }

    // Find matching user by email, employeeId, or iqama
    const foundUser = users.find(
      (u) =>
        u.email.toLowerCase() === cleanInput ||
        u.employeeId.toLowerCase() === cleanInput ||
        (u.iqama && u.iqama.toLowerCase() === cleanInput)
    );

    if (!foundUser) {
      setErrorMsg('কোনো এমপ্লয়ি অ্যাকাউন্ট পাওয়া যায়নি (Employee account not found)');
      return;
    }

    // Check password requirement
    if (foundUser.password) {
      if (!cleanPass) {
        setErrorMsg('পাসওয়ার্ড দিন (Please enter password)');
        return;
      }
      if (foundUser.password !== cleanPass) {
        setErrorMsg('পাসওয়ার্ড ভুল হয়েছে, অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন (Incorrect password)');
        return;
      }
    }

    // Success login
    setSuccessMsg(`স্বাগতম, ${foundUser.displayName}! (Logged in successfully)`);
    setTimeout(() => {
      onLogin(foundUser);
      if (onClose && !isForcedLogin) onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans animate-fadeIn">
      <div className="bg-white rounded-3xl border border-emerald-200 max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
        
        {/* Company Logo Banner */}
        <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
          <div className="flex flex-col items-start gap-1 w-full">
            <div className="bg-emerald-50/80 rounded-2xl p-3 border border-emerald-100 w-full flex items-center justify-center">
              <img
                src="/company_logo.svg"
                alt="WAFAQ Company Logo"
                className="h-14 sm:h-16 max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="flex items-center justify-between w-full pt-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-900 text-white flex items-center justify-center font-extrabold shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wide block">
                    ExpenseFlow KSA • Auth Center
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-emerald-950">
                    লগইন করুন (App Login)
                  </h2>
                </div>
              </div>

              {!isForcedLogin && onClose && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Success Banner */}
        {successMsg && (
          <div className="bg-emerald-800 text-white p-3.5 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-md animate-bounce">
            <Check className="w-5 h-5 text-emerald-300 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Banner */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ID & PASSWORD LOGIN FORM */}
        <form onSubmit={handleCredentialSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-emerald-900 block">
              ইউজার আইডি / ইমেইল / ইকামা (Employee ID, Email, or Iqama) *
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. KSA-0001, lotofsoft@gmail.com, or 1009283741"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full bg-emerald-50/60 border border-emerald-300 rounded-xl px-3.5 py-2.5 text-emerald-950 font-bold text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-emerald-900 block">
              লগইন পাসওয়ার্ড (Password)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="e.g. AdminPass@2026"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-emerald-50/60 border border-emerald-300 rounded-xl px-3.5 py-2.5 text-emerald-950 font-mono text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700 hover:text-emerald-950 cursor-pointer p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-sm py-3 rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4 text-emerald-300" />
            <span>সাইন ইন করুন (Sign In)</span>
          </button>
        </form>

        {/* Footer Info */}
        <div className="border-t border-emerald-100 pt-3 text-center text-[11px] text-emerald-700">
          <span>🔒 Secured Cloud Expense System • Al-Falak Enterprise KSA</span>
        </div>
      </div>
    </div>
  );
};
