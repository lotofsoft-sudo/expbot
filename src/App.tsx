import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { WebChat } from './components/WebChat';
import { ApprovalDashboard } from './components/ApprovalDashboard';
import { EmployeeStatementView } from './components/EmployeeStatementView';
import { TelegramSimulator } from './components/TelegramSimulator';
import { TelegramBotSettings } from './components/TelegramBotSettings';
import { BotQuestionBuilder } from './components/BotQuestionBuilder';
import { GoogleSheetsView } from './components/GoogleSheetsView';
import { SettingsModal } from './components/SettingsModal';
import { RoleSwitcherModal } from './components/RoleSwitcherModal';

import {
  Expense,
  BotQuestion,
  AppSettings,
  AppUser,
  ExpenseStatus,
  GoogleSheetsConfig,
  SyncLog,
  ApprovalPdfConfig,
  TelegramCommand,
  TelegramBotConfig
} from './types';

import {
  seedInitialDataIfNeeded,
  subscribeExpenses,
  subscribeBotQuestions,
  subscribeAppSettings,
  subscribeGoogleSheetsConfig,
  subscribeSyncLogs,
  subscribeTelegramCommands,
  subscribeTelegramBotConfig,
  subscribeUsers,
  saveExpenseToFirestore,
  updateExpenseStatusInFirestore,
  updateExpenseStepInFirestore,
  updateExpenseSyncStatusInFirestore,
  saveBotQuestionsToFirestore,
  saveAppSettingsToFirestore,
  saveGoogleSheetsConfigToFirestore,
  saveTelegramCommandsToFirestore,
  saveTelegramBotConfigToFirestore,
  saveUserToFirestore,
  addSyncLogToFirestore,
  DEFAULT_SHEETS_CONFIG
} from './lib/firebase';

import { DEFAULT_BOT_QUESTIONS, DEFAULT_SETTINGS, INITIAL_USERS } from './data/defaultQuestions';
import { DEFAULT_TELEGRAM_COMMANDS } from './data/defaultTelegramCommands';
import { MessageSquare, CheckSquare, FileSpreadsheet, Bot, SlidersHorizontal, Sliders, FileText } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<AppUser>(INITIAL_USERS[0]);
  const [users, setUsers] = useState<AppUser[]>(INITIAL_USERS);
  const [activeTab, setActiveTab] = useState<string>('chat');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [botQuestions, setBotQuestions] = useState<BotQuestion[]>(DEFAULT_BOT_QUESTIONS);
  const [telegramCommands, setTelegramCommands] = useState<TelegramCommand[]>(DEFAULT_TELEGRAM_COMMANDS);
  const [telegramConfig, setTelegramConfig] = useState<TelegramBotConfig>({
    botToken: '',
    webhookUrl: '',
    connectionStatus: 'untested'
  });
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>(DEFAULT_SHEETS_CONFIG);
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([]);

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isRoleSwitcherOpen, setIsRoleSwitcherOpen] = useState<boolean>(false);

  // Initialize Firebase Firestore seed & real-time subscriptions
  useEffect(() => {
    seedInitialDataIfNeeded();

    const unsubUsers = subscribeUsers((userList) => {
      if (userList && userList.length > 0) {
        setUsers(userList);
        // keep currentUser in sync if updated
        const found = userList.find((u) => u.uid === currentUser.uid);
        if (found) {
          setCurrentUser(found);
        }
      }
    });

    const unsubExp = subscribeExpenses((data) => {
      setExpenses(data);
    });

    const unsubQuestions = subscribeBotQuestions((qs) => {
      setBotQuestions(qs);
    });

    const unsubSettings = subscribeAppSettings((st) => {
      setAppSettings(st);
    });

    const unsubSheets = subscribeGoogleSheetsConfig((cfg) => {
      setSheetsConfig(cfg);
    });

    const unsubLogs = subscribeSyncLogs((logs) => {
      setSyncLogs(logs);
    });

    const unsubCommands = subscribeTelegramCommands((cmds) => {
      if (cmds && cmds.length > 0) {
        setTelegramCommands(cmds);
      }
    });

    const unsubTgConfig = subscribeTelegramBotConfig((cfg) => {
      if (cfg) {
        setTelegramConfig(cfg);
      }
    });

    return () => {
      unsubUsers();
      unsubExp();
      unsubQuestions();
      unsubSettings();
      unsubSheets();
      unsubLogs();
      unsubCommands();
      unsubTgConfig();
    };
  }, []);

  // Handle New Expense Submission from Chat / Telegram
  const handleExpenseSubmitted = async (newExpense: Expense) => {
    // 1. Save to Firestore
    await saveExpenseToFirestore(newExpense);

    // 2. Direct Sync to Google Sheets API v4
    if (appSettings.autoSyncToSheets && sheetsConfig.spreadsheetId) {
      try {
        const res = await fetch('/api/sheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            config: sheetsConfig,
            expenses: [newExpense]
          })
        });
        const data = await res.json();
        if (data.success) {
          await updateExpenseSyncStatusInFirestore(newExpense.id, 'synced');
          await addSyncLogToFirestore({
            timestamp: new Date().toISOString(),
            operation: 'auto_sync',
            expenseId: newExpense.id,
            status: 'success',
            details: `Auto-synced ${newExpense.id} to Google Sheets (${sheetsConfig.sheetName})`
          });
        } else {
          await updateExpenseSyncStatusInFirestore(newExpense.id, 'failed', data.error);
          await addSyncLogToFirestore({
            timestamp: new Date().toISOString(),
            operation: 'auto_sync',
            expenseId: newExpense.id,
            status: 'failed',
            details: `Auto-sync failed: ${data.error}`,
            error: data.error
          });
        }
      } catch (err: any) {
        console.warn('Google Sheets background sync error:', err);
        await updateExpenseSyncStatusInFirestore(newExpense.id, 'failed', err.message);
      }
    }
  };

  // Handle Expense Status Change (Approve / Reject)
  const handleUpdateStatus = async (
    expenseId: string,
    status: ExpenseStatus,
    notes: string,
    stepToApprove?: 1 | 2 | 3
  ) => {
    if (stepToApprove) {
      await updateExpenseStepInFirestore(
        expenseId,
        stepToApprove,
        status === 'rejected' ? 'reject' : 'approve',
        currentUser.displayName,
        notes
      );
    } else {
      await updateExpenseStatusInFirestore(expenseId, status, currentUser.displayName, notes);
    }

    // Auto-update status in Google Sheets if configured
    if (sheetsConfig.spreadsheetId && sheetsConfig.serviceAccountEmail) {
      const targetExp = expenses.find((e) => e.id === expenseId);
      if (targetExp) {
        const isFinalApproved = status === 'approved' || stepToApprove === 3;
        const updatedExp: Expense = {
          ...targetExp,
          status: isFinalApproved ? 'approved' : 'pending',
          approvedBy: isFinalApproved ? 'Nurul Alam' : currentUser.displayName,
          approvedAt: new Date().toISOString(),
          approverNotes: notes,
          step1Approved: stepToApprove === 1 || targetExp.step1Approved,
          step2Approved: stepToApprove === 2 || targetExp.step2Approved,
          step3Approved: stepToApprove === 3 || targetExp.step3Approved
        };
        try {
          await fetch('/api/sheets/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              config: sheetsConfig,
              expenses: [updatedExp]
            })
          });
          await updateExpenseSyncStatusInFirestore(expenseId, 'synced');
        } catch (e) {
          console.warn('Google Sheets status sync error:', e);
        }
      }
    }
  };

  // Manual Trigger to sync all expenses to Google Sheets via Direct API
  const handleManualSyncSheets = async () => {
    try {
      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: sheetsConfig,
          expenses
        })
      });
      const data = await res.json();
      if (data.success) {
        for (const exp of expenses) {
          await updateExpenseSyncStatusInFirestore(exp.id, 'synced');
        }
        await addSyncLogToFirestore({
          timestamp: new Date().toISOString(),
          operation: 'batch_sync',
          status: 'success',
          details: `Manual batch sync completed: ${expenses.length} records processed.`
        });
      } else {
        await addSyncLogToFirestore({
          timestamp: new Date().toISOString(),
          operation: 'batch_sync',
          status: 'failed',
          details: `Manual batch sync failed: ${data.error}`,
          error: data.error
        });
      }
    } catch (err: any) {
      console.error('Manual sync error:', err);
    }
  };

  // Handle PDF Template Config Save
  const handleSavePdfConfig = async (newConfig: ApprovalPdfConfig) => {
    const updatedSettings: AppSettings = {
      ...appSettings,
      approvalPdfConfig: newConfig
    };
    await saveAppSettingsToFirestore(updatedSettings);
  };

  // Handle Bot Questions Save
  const handleSaveQuestions = async (updatedQuestions: BotQuestion[]) => {
    await saveBotQuestionsToFirestore(updatedQuestions);
  };

  // Handle Settings Save
  const handleSaveSettings = async (updatedSettings: AppSettings) => {
    await saveAppSettingsToFirestore(updatedSettings);
  };

  // Handle Google Sheets Config Save
  const handleSaveSheetsConfig = async (updatedConfig: GoogleSheetsConfig) => {
    setSheetsConfig(updatedConfig);
  };

  // Handle Telegram Commands Save
  const handleSaveTelegramCommands = async (updatedCommands: TelegramCommand[]) => {
    return await saveTelegramCommandsToFirestore(updatedCommands);
  };

  // Handle Telegram Bot Config Save
  const handleSaveTelegramConfig = async (updatedConfig: TelegramBotConfig) => {
    return await saveTelegramBotConfigToFirestore(updatedConfig);
  };

  // Handle User / Employee Save
  const handleSaveUser = async (userToSave: AppUser) => {
    const success = await saveUserToFirestore(userToSave);
    if (success) {
      setUsers((prev) => {
        const existingIdx = prev.findIndex((u) => u.uid === userToSave.uid);
        if (existingIdx >= 0) {
          const next = [...prev];
          next[existingIdx] = userToSave;
          return next;
        }
        return [...prev, userToSave];
      });
    }
    return success;
  };

  // Reset Demo Data
  const handleResetDemoData = async () => {
    localStorage.clear();
    await saveBotQuestionsToFirestore(DEFAULT_BOT_QUESTIONS);
    await saveAppSettingsToFirestore(DEFAULT_SETTINGS);
    await saveTelegramCommandsToFirestore(DEFAULT_TELEGRAM_COMMANDS);
    window.location.reload();
  };

  const pendingCount = expenses.filter((e) => e.status === 'pending').length;

  const mobileNavItems = [
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'statements', label: 'Statements', icon: FileText },
    { id: 'approvals', label: 'Approvals', icon: CheckSquare, badge: pendingCount },
    { id: 'sheets', label: 'Sheets', icon: FileSpreadsheet },
    { id: 'telegram', label: 'Telegram', icon: Bot },
    { id: 'tg_settings', label: 'TG Settings', icon: Sliders },
    { id: 'questions', label: 'Flow', icon: SlidersHorizontal }
  ];

  return (
    <div className="min-h-screen bg-[#f4f9f5] text-emerald-950 font-sans flex flex-col justify-between selection:bg-emerald-200 selection:text-emerald-950 pb-16 md:pb-0">
      <div>
        {/* Header Component */}
        <Header
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingApprovalCount={pendingCount}
          openSettings={() => setIsSettingsOpen(true)}
          openRoleSwitcher={() => setIsRoleSwitcherOpen(true)}
        />

        {/* Main Content Area */}
        <main className="max-w-7xl mx-auto p-3 sm:p-5 lg:p-7 space-y-5">
          {activeTab === 'chat' && (
            <WebChat
              currentUser={currentUser}
              botQuestions={botQuestions}
              appSettings={appSettings}
              onExpenseSubmitted={handleExpenseSubmitted}
              recentExpenses={expenses}
              onSavePdfConfig={handleSavePdfConfig}
            />
          )}

          {activeTab === 'statements' && (
            <EmployeeStatementView
              expenses={expenses}
              users={users}
              currentUser={currentUser}
              appSettings={appSettings}
              onSaveUser={handleSaveUser}
              onSelectCurrentUser={(selectedUser) => setCurrentUser(selectedUser)}
              onSavePdfConfig={handleSavePdfConfig}
            />
          )}

          {activeTab === 'approvals' && (
            <ApprovalDashboard
              expenses={expenses}
              currentUser={currentUser}
              appSettings={appSettings}
              onUpdateStatus={handleUpdateStatus}
              onSyncToSheets={handleManualSyncSheets}
              onSavePdfConfig={handleSavePdfConfig}
            />
          )}

          {activeTab === 'telegram' && (
            <TelegramSimulator
              appSettings={appSettings}
              currentUser={currentUser}
              botQuestions={botQuestions}
              telegramCommands={telegramCommands}
              onExpenseSubmitted={handleExpenseSubmitted}
              recentExpenses={expenses}
              onSavePdfConfig={handleSavePdfConfig}
            />
          )}

          {activeTab === 'tg_settings' && (
            <TelegramBotSettings
              appSettings={appSettings}
              commands={telegramCommands}
              telegramConfig={telegramConfig}
              expenses={expenses}
              currentUser={currentUser}
              onSaveCommands={handleSaveTelegramCommands}
              onSaveTelegramConfig={handleSaveTelegramConfig}
            />
          )}

          {activeTab === 'questions' && (
            <BotQuestionBuilder
              questions={botQuestions}
              onSaveQuestions={handleSaveQuestions}
              onResetDefaults={() => handleSaveQuestions(DEFAULT_BOT_QUESTIONS)}
            />
          )}

          {activeTab === 'sheets' && (
            <GoogleSheetsView
              expenses={expenses}
              appSettings={appSettings}
              sheetsConfig={sheetsConfig}
              syncLogs={syncLogs}
              onManualSyncSheets={handleManualSyncSheets}
              onSaveConfig={handleSaveSheetsConfig}
            />
          )}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-emerald-200/90 z-40 px-2 py-1.5 shadow-lg flex items-center justify-around">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all cursor-pointer relative min-h-[44px] ${
                isActive
                  ? 'text-emerald-800 font-bold bg-emerald-100/80 scale-105'
                  : 'text-emerald-900/70 hover:text-emerald-950 font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-800 stroke-[2.5]' : 'text-emerald-700'}`} />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-0.5 whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modern Soothing Green Desktop Footer */}
      <footer className="hidden md:block bg-white border-t border-emerald-200 mt-12 py-5 px-6 font-sans text-xs text-emerald-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-emerald-950 font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
            <span>ExpenseFlow — Smart Expense Management (Saudi Arabia • SAR)</span>
          </div>

          <div className="text-emerald-700 font-medium text-xs text-center md:text-right">
            Firebase Firestore • Google Sheets Direct API • Telegram Bot • Gemini AI Powered
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        appSettings={appSettings}
        onSaveSettings={handleSaveSettings}
        onResetData={handleResetDemoData}
      />

      {/* Role Switcher Modal */}
      <RoleSwitcherModal
        isOpen={isRoleSwitcherOpen}
        onClose={() => setIsRoleSwitcherOpen(false)}
        currentUser={currentUser}
        users={users}
        onSelectUser={setCurrentUser}
        onSaveUser={handleSaveUser}
      />
    </div>
  );
}
