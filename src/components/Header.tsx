import React from 'react';
import { AppUser } from '../types';
import {
  User,
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
  FileText
} from 'lucide-react';

interface HeaderProps {
  currentUser: AppUser;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pendingApprovalCount: number;
  openSettings: () => void;
  openRoleSwitcher: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  pendingApprovalCount,
  openSettings,
  openRoleSwitcher
}) => {
  const tabs = [
    { id: 'chat', label: 'Chat Entry', icon: MessageSquare, shortLabel: 'Chat' },
    { id: 'statements', label: 'Statements', icon: FileText, shortLabel: 'Statements' },
    { id: 'approvals', label: 'Approvals', icon: CheckSquare, shortLabel: 'Approvals', badge: pendingApprovalCount },
    { id: 'sheets', label: 'Google Sheets', icon: FileSpreadsheet, shortLabel: 'Sheets' },
    { id: 'telegram', label: 'Telegram Bot', icon: Bot, shortLabel: 'Bot' },
    { id: 'tg_settings', label: 'Telegram Settings', icon: Sliders, shortLabel: 'TG Settings' },
    { id: 'questions', label: 'Bot Flow', icon: SlidersHorizontal, shortLabel: 'Flow' },
  ];

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

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Live Sync Indicator */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-200">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Firestore & Google Sheets Connected</span>
          </div>

          {/* User Profile Switcher Button */}
          <button
            onClick={openRoleSwitcher}
            className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border border-emerald-700/60 shadow-xs cursor-pointer"
            title="Switch User Role"
          >
            <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
              {currentUser.displayName.charAt(0)}
            </div>
            <span className="max-w-[100px] sm:max-w-none truncate">{currentUser.displayName}</span>
            <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-md bg-emerald-500 text-emerald-950 font-bold uppercase">
              {currentUser.role}
            </span>
          </button>

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
          {tabs.map((tab) => {
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

      {/* Mobile Top Header */}
      <div className="flex md:hidden px-4 py-2.5 bg-emerald-50/50 border-b border-emerald-100 items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-emerald-900">
            {activeTab === 'chat' && '💬 Expense Chat Assistant'}
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
              className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs"
            >
              <span>{pendingApprovalCount} Pending</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
