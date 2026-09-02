import React from 'react';
import { AppUser, LanguageMode } from '../types';
import {
  User,
  Users,
  MessageSquare,
  CheckSquare,
  Bot,
  SlidersHorizontal,
  Sliders,
  FileSpreadsheet,
  Settings,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Globe,
  LogOut,
  LogIn
} from 'lucide-react';

interface HeaderProps {
  currentUser: AppUser | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApprovalCount: number;
  openSettings: () => void;
  openRoleSwitcher: () => void;
  appLanguage: LanguageMode;
  onLanguageChange: (lang: LanguageMode) => void;
  onLoginClick?: () => void;
  onLogoutClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  pendingApprovalCount,
  openSettings,
  openRoleSwitcher,
  appLanguage,
  onLanguageChange,
  onLoginClick,
  onLogoutClick
}) => {
  const isAdmin = currentUser?.role === 'admin';
  const allowedTabIds = isAdmin
    ? ['chat', 'employees', 'statements', 'approvals', 'sheets', 'telegram', 'tg_settings', 'questions']
    : ['chat', 'statements', 'approvals'];

  const allTabs = [
    { id: 'chat', label: 'Chat Entry', icon: MessageSquare, shortLabel: 'Chat' },
    { id: 'employees', label: 'Employee', icon: Users, shortLabel: 'Employee' },
    { id: 'statements', label: 'Statements', icon: FileText, shortLabel: 'Statements' },
    { id: 'approvals', label: 'Approvals', icon: CheckSquare, shortLabel: 'Approvals', badge: pendingApprovalCount },
    { id: 'sheets', label: 'Google Sheets', icon: FileSpreadsheet, shortLabel: 'Sheets' },
    { id: 'telegram', label: 'Telegram Bot', icon: Bot, shortLabel: 'Bot' },
    { id: 'tg_settings', label: 'Telegram Settings', icon: Sliders, shortLabel: 'TG Settings' },
    { id: 'questions', label: 'Bot Flow', icon: SlidersHorizontal, shortLabel: 'Flow' },
  ];

  const visibleTabs = allTabs.filter((t) => allowedTabIds.includes(t.id));


  return (
    <header className="bg-white border-b border-emerald-100 sticky top-0 z-40 shadow-xs">
      {/* Top Emerald Ribbon */}
      <div className="bg-emerald-900 text-emerald-100 px-4 sm:px-6 py-2 text-xs sm:text-sm font-medium flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-white text-sm sm:text-base tracking-tight">ExpenseFlow KSA</span>
          </div>
          <span className="hidden md:inline-block text-emerald-300 text-xs px-2 py-0.5 rounded-full bg-emerald-800/80 border border-emerald-700/50">
            Saudi Arabia • SAR Currency
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Sync Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Firestore & Google Sheets Connected</span>
          </div>

          {/* App-Wide Language Selector */}
          <div className="flex items-center gap-1.5 bg-emerald-800/90 hover:bg-emerald-800 text-white px-2.5 py-1 rounded-xl border border-emerald-700/60 shadow-xs">
            <Globe className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span className="text-xs font-bold text-emerald-200 hidden sm:inline">Lang:</span>
            <select
              value={appLanguage}
              onChange={(e) => onLanguageChange(e.target.value as LanguageMode)}
              className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer"
              title="Select App Default Language"
            >
              <option value="en" className="bg-emerald-900 text-white">🇬🇧 English (Default)</option>
              <option value="bn" className="bg-emerald-900 text-white">🇧🇩 Bengali (বাংলা)</option>
              <option value="ar" className="bg-emerald-900 text-white">🇸🇦 Arabic (العربية)</option>
              <option value="bn_en" className="bg-emerald-900 text-white">🇧🇩+🇬🇧 বাংলা + English</option>
              <option value="ar_en" className="bg-emerald-900 text-white">🇸🇦+🇬🇧 العربية + English</option>
            </select>
          </div>

          {currentUser ? (
            <>
              {/* User Profile / Switcher Button (Clickable only for Admin) */}
              {isAdmin ? (
                <button
                  onClick={openRoleSwitcher}
                  className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border border-emerald-700/60 shadow-xs cursor-pointer"
                  title="Switch User Account (Admin Only)"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {currentUser.displayName.charAt(0)}
                  </div>
                  <span className="max-w-[80px] sm:max-w-none truncate">{currentUser.displayName}</span>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-amber-400 text-emerald-950 font-bold uppercase">
                    {currentUser.role}
                  </span>
                </button>
              ) : (
                <div
                  className="flex items-center gap-2 bg-emerald-900/90 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold border border-emerald-700/40 shadow-xs"
                  title={`Logged in as ${currentUser.displayName}`}
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-xs">
                    {currentUser.displayName.charAt(0)}
                  </div>
                  <span className="max-w-[80px] sm:max-w-none truncate">{currentUser.displayName}</span>
                  <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold uppercase">
                    {currentUser.role}
                  </span>
                </div>
              )}

              {/* Logout Button */}
              {onLogoutClick && (
                <button
                  onClick={onLogoutClick}
                  className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-800 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Logout from account"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-200" />
                  <span className="hidden sm:inline">লগআউট (Logout)</span>
                </button>
              )}
            </>
          ) : onLoginClick ? (
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-emerald-950 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black transition-all shadow-md cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>লগইন (Login)</span>
            </button>
          ) : null}

          {/* Settings Button */}
          <button
            onClick={openSettings}
            className="p-2 rounded-xl bg-emerald-800/70 hover:bg-emerald-700 text-white transition-colors cursor-pointer border border-emerald-700/50"
            title="System Settings"
          >
            <Settings className="w-4 h-4 text-emerald-200" />
          </button>
        </div>
      </div>

      {/* Desktop Navigation & Title Area (Visible on Desktop / Tablet) */}
      <div className="hidden md:flex max-w-7xl mx-auto px-4 sm:px-6 py-3.5 items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-emerald-950 tracking-tight flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-emerald-600 inline-block"></span>
            <span>Expense Management System</span>
          </h1>
          <p className="text-xs text-emerald-700 mt-0.5">
            Submit expenses via interactive Chat or Telegram with real-time Google Sheets & Firestore sync
          </p>
        </div>

        {/* Desktop Tabs */}
        <nav className="flex items-center gap-1.5 bg-emerald-50/80 p-1.5 rounded-2xl border border-emerald-200/70">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-emerald-900 hover:bg-emerald-100/70 hover:text-emerald-950'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-200' : 'text-emerald-600'}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-700 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Top Header & Scrollable Tab Bar */}
      <div className="flex flex-col md:hidden bg-emerald-50/50 border-b border-emerald-100">
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-emerald-950">
              {activeTab === 'chat' && '💬 Expense Chat Assistant'}
              {activeTab === 'employees' && '👥 Employee Directory & Credentials'}
              {activeTab === 'statements' && '📄 Employee Expense Statements'}
              {activeTab === 'approvals' && '📋 Expense Approvals'}
              {activeTab === 'sheets' && '📊 Google Sheets Sync'}
              {activeTab === 'telegram' && '🤖 Telegram Bot Simulator'}
              {activeTab === 'tg_settings' && '⚙️ Telegram Bot Settings'}
              {activeTab === 'questions' && '⚙️ Bot Flow Builder'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {pendingApprovalCount > 0 && (
              <button
                onClick={() => setActiveTab('approvals')}
                className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs"
              >
                <span>{pendingApprovalCount} Pending</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Horizontal Scroll Tab Strip */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar border-t border-emerald-100/70 bg-white">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-200' : 'text-emerald-700'}`} />
                <span>{tab.shortLabel || tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    isActive ? 'bg-amber-400 text-emerald-950' : 'bg-emerald-800 text-white'
                  }`}>
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
