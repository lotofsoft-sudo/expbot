import React, { useState, useEffect } from 'react';
import {
  TelegramCommand,
  TelegramBotConfig,
  TelegramCommandAction,
  AppSettings,
  AppUser,
  Expense
} from '../types';
import { DEFAULT_TELEGRAM_COMMANDS } from '../data/defaultTelegramCommands';
import {
  Bot,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Send,
  Sparkles,
  Link,
  Shield,
  HelpCircle,
  ExternalLink,
  Settings,
  MessageSquare,
  FileText,
  Sliders,
  Terminal,
  Zap,
  Info,
  Layers,
  ArrowRight,
  Eye,
  EyeOff
} from 'lucide-react';

interface TelegramBotSettingsProps {
  appSettings: AppSettings;
  commands: TelegramCommand[];
  telegramConfig: TelegramBotConfig;
  expenses: Expense[];
  currentUser: AppUser;
  onSaveCommands: (commands: TelegramCommand[]) => Promise<boolean>;
  onSaveTelegramConfig: (config: TelegramBotConfig) => Promise<boolean>;
}

export const TelegramBotSettings: React.FC<TelegramBotSettingsProps> = ({
  appSettings,
  commands,
  telegramConfig,
  expenses,
  currentUser,
  onSaveCommands,
  onSaveTelegramConfig
}) => {
  // Local state for configuration
  const [config, setConfig] = useState<TelegramBotConfig>(telegramConfig);
  const [commandList, setCommandList] = useState<TelegramCommand[]>(
    commands && commands.length > 0 ? commands : DEFAULT_TELEGRAM_COMMANDS
  );

  // Sync state if props change
  useEffect(() => {
    if (commands && commands.length > 0) {
      setCommandList(commands);
    }
  }, [commands]);

  useEffect(() => {
    if (telegramConfig) {
      setConfig((prev) => ({
        ...prev,
        ...telegramConfig,
        webhookUrl:
          telegramConfig.webhookUrl ||
          (typeof window !== 'undefined'
            ? `${window.location.origin}/api/telegram/webhook`
            : prev.webhookUrl)
      }));
    }
  }, [telegramConfig]);

  // UI state
  const [showToken, setShowToken] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // API Action state
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [isSettingWebhook, setIsSettingWebhook] = useState(false);
  const [isCheckingWebhook, setIsCheckingWebhook] = useState(false);
  const [isDeletingWebhook, setIsDeletingWebhook] = useState(false);
  const [isSyncingCommands, setIsSyncingCommands] = useState(false);
  const [apiResponseModal, setApiResponseModal] = useState<{
    title: string;
    type: 'success' | 'error' | 'info';
    data: any;
  } | null>(null);

  // Test Simulator state
  const [testInput, setTestInput] = useState('/start');
  const [testOutput, setTestOutput] = useState<string>('');
  const [testChatId, setTestChatId] = useState<string>('');
  const [isSendingRealTest, setIsSendingRealTest] = useState(false);

  // Command Editor Modal state
  const [editingCommand, setEditingCommand] = useState<TelegramCommand | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [commandFormError, setCommandFormError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Webhook Logs state
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Fetch recent Telegram logs
  const fetchLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      if (data.recentLogs) {
        setLogs(data.recentLogs);
      }
    } catch (err) {
      console.warn('Failed to fetch Telegram logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Helper: Format message with dynamic variables
  const formatReplyTemplate = (template: string): string => {
    const pendingList = expenses.filter((e) => e.status === 'pending');
    const approvedList = expenses.filter((e) => e.status === 'approved');
    const pendingSum = pendingList.reduce((sum, e) => sum + e.amount, 0);
    const approvedSum = approvedList.reduce((sum, e) => sum + e.amount, 0);

    return template
      .replace(/{user_name}/g, currentUser.displayName || 'Employee')
      .replace(/{company_name}/g, appSettings.companyName || 'ExpenseFlow KSA')
      .replace(/{currency}/g, appSettings.defaultCurrency || 'SAR')
      .replace(/{today_date}/g, new Date().toISOString().split('T')[0])
      .replace(/{pending_count}/g, pendingList.length.toString())
      .replace(/{pending_amount}/g, pendingSum.toFixed(2))
      .replace(/{approved_count}/g, approvedList.length.toString())
      .replace(/{approved_amount}/g, approvedSum.toFixed(2));
  };

  // Evaluate test command simulator
  const runTestCommand = (cmdText: string) => {
    const trimmed = cmdText.trim();
    if (!trimmed) {
      setTestOutput('Please type a command like /start, /help, /balance, /pdf');
      return;
    }

    const matched = commandList.find(
      (c) => c.command.toLowerCase() === trimmed.toLowerCase() && c.isEnabled
    );

    if (matched) {
      setTestOutput(formatReplyTemplate(matched.replyText));
    } else if (trimmed.startsWith('/')) {
      setTestOutput(
        `❓ Unknown command: ${trimmed}\n\nType /help to see the list of active commands or add this command in the Command Manager above!`
      );
    } else {
      setTestOutput(
        `🤖 Expense Submission Detected:\n"${trimmed}"\n\n✅ This will be parsed and saved to Firebase Firestore and Google Sheets.`
      );
    }
  };

  useEffect(() => {
    runTestCommand(testInput);
  }, [testInput, commandList, expenses, appSettings]);

  // Copy Webhook URL
  const copyWebhookUrl = () => {
    if (config.webhookUrl) {
      navigator.clipboard.writeText(config.webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    }
  };

  // 1. Test Bot Token (getMe)
  const handleTestToken = async () => {
    if (!config.botToken) {
      setApiResponseModal({
        title: 'Missing Bot Token',
        type: 'error',
        data: 'Please enter your Telegram Bot Token from @BotFather first.'
      });
      return;
    }

    setIsTestingToken(true);
    try {
      const res = await fetch('/api/telegram/get-me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: config.botToken })
      });
      const data = await res.json();

      if (data.ok && data.result) {
        const botName = data.result.first_name || '';
        const botUser = data.result.username || '';
        const updated = {
          ...config,
          botUsername: botUser ? `@${botUser}` : config.botUsername,
          connectionStatus: 'connected' as const,
          lastTestedAt: new Date().toISOString()
        };
        setConfig(updated);
        await onSaveTelegramConfig(updated);

        setApiResponseModal({
          title: '✅ Bot Token Verified Successfully!',
          type: 'success',
          data: {
            Bot_ID: data.result.id,
            Bot_Name: botName,
            Username: `@${botUser}`,
            Can_Join_Groups: data.result.can_join_groups,
            Supports_Inline: data.result.supports_inline_queries
          }
        });
      } else {
        setConfig((prev) => ({ ...prev, connectionStatus: 'error' }));
        setApiResponseModal({
          title: '❌ Verification Failed',
          type: 'error',
          data: data.description || 'Invalid Telegram Bot Token. Please check token from @BotFather.'
        });
      }
    } catch (err: any) {
      setApiResponseModal({
        title: '❌ Network Error',
        type: 'error',
        data: err.message
      });
    } finally {
      setIsTestingToken(false);
    }
  };

  // 2. Set Webhook
  const handleSetWebhook = async () => {
    if (!config.botToken || !config.webhookUrl) {
      setApiResponseModal({
        title: 'Missing Configuration',
        type: 'error',
        data: 'Bot Token and Webhook URL are required to register webhook.'
      });
      return;
    }

    setIsSettingWebhook(true);
    try {
      const res = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.botToken,
          webhookUrl: config.webhookUrl,
          secretToken: config.secretToken
        })
      });
      const data = await res.json();

      if (data.ok) {
        const updated = {
          ...config,
          connectionStatus: 'connected' as const,
          lastWebhookStatus: data.result,
          lastTestedAt: new Date().toISOString()
        };
        setConfig(updated);
        await onSaveTelegramConfig(updated);

        setApiResponseModal({
          title: '🎉 Webhook Registered with Telegram!',
          type: 'success',
          data: {
            Webhook_URL: config.webhookUrl,
            Telegram_Status: data.description || 'Webhook was set successfully',
            Custom_Secret_Enabled: !!config.secretToken
          }
        });
      } else {
        setApiResponseModal({
          title: '❌ Set Webhook Failed',
          type: 'error',
          data: data.description || 'Telegram rejected webhook setup.'
        });
      }
    } catch (err: any) {
      setApiResponseModal({
        title: '❌ Connection Error',
        type: 'error',
        data: err.message
      });
    } finally {
      setIsSettingWebhook(false);
    }
  };

  // 3. Get Webhook Info
  const handleGetWebhookInfo = async () => {
    if (!config.botToken) {
      setApiResponseModal({
        title: 'Missing Bot Token',
        type: 'error',
        data: 'Please enter Bot Token first.'
      });
      return;
    }

    setIsCheckingWebhook(true);
    try {
      const res = await fetch('/api/telegram/get-webhook-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: config.botToken })
      });
      const data = await res.json();

      if (data.ok && data.result) {
        setApiResponseModal({
          title: 'ℹ️ Telegram Webhook Status',
          type: 'info',
          data: {
            Active_Webhook_URL: data.result.url || '(None - Long Polling Mode)',
            Has_Custom_Certificate: data.result.has_custom_certificate,
            Pending_Updates: data.result.pending_update_count,
            Last_Error_Date: data.result.last_error_date
              ? new Date(data.result.last_error_date * 1000).toLocaleString()
              : 'None (Healthy)',
            Last_Error_Message: data.result.last_error_message || 'None (Healthy)',
            Max_Connections: data.result.max_connections || 40
          }
        });
      } else {
        setApiResponseModal({
          title: '❌ Failed to Fetch Webhook Info',
          type: 'error',
          data: data.description || 'Could not fetch status.'
        });
      }
    } catch (err: any) {
      setApiResponseModal({
        title: '❌ Error',
        type: 'error',
        data: err.message
      });
    } finally {
      setIsCheckingWebhook(false);
    }
  };

  // 4. Delete Webhook
  const handleDeleteWebhook = async () => {
    if (!config.botToken) return;
    if (!confirm('Are you sure you want to disconnect the webhook from Telegram?')) return;

    setIsDeletingWebhook(true);
    try {
      const res = await fetch('/api/telegram/delete-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: config.botToken })
      });
      const data = await res.json();

      if (data.ok) {
        const updated = {
          ...config,
          connectionStatus: 'disconnected' as const
        };
        setConfig(updated);
        await onSaveTelegramConfig(updated);

        setApiResponseModal({
          title: '🗑️ Webhook Disconnected',
          type: 'info',
          data: 'Webhook was removed from Telegram. The bot is no longer sending live webhook updates to this URL.'
        });
      } else {
        setApiResponseModal({
          title: '❌ Failed to Delete Webhook',
          type: 'error',
          data: data.description || 'Could not delete webhook.'
        });
      }
    } catch (err: any) {
      setApiResponseModal({
        title: '❌ Error',
        type: 'error',
        data: err.message
      });
    } finally {
      setIsDeletingWebhook(false);
    }
  };

  // 5. Sync Commands to Telegram API (setMyCommands)
  const handleSyncCommandsToTelegram = async () => {
    if (!config.botToken) {
      setApiResponseModal({
        title: 'Missing Bot Token',
        type: 'error',
        data: 'Please enter Bot Token first to sync commands.'
      });
      return;
    }

    setIsSyncingCommands(true);
    try {
      const res = await fetch('/api/telegram/sync-commands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.botToken,
          commands: commandList
        })
      });
      const data = await res.json();

      if (data.ok) {
        setApiResponseModal({
          title: '✨ Commands Registered in Telegram App!',
          type: 'success',
          data: {
            Status: 'Commands published to Telegram menu',
            Synced_Count: commandList.filter((c) => c.isEnabled).length,
            Note: 'When users type "/" in Telegram, these commands will appear in the native menu popover!'
          }
        });
      } else {
        setApiResponseModal({
          title: '❌ Command Sync Failed',
          type: 'error',
          data: data.description || 'Telegram rejected commands list.'
        });
      }
    } catch (err: any) {
      setApiResponseModal({
        title: '❌ Error Syncing Commands',
        type: 'error',
        data: err.message
      });
    } finally {
      setIsSyncingCommands(false);
    }
  };

  // 6. Send Real Test Message to Telegram
  const handleSendRealTestMessage = async () => {
    if (!config.botToken || !testChatId || !testOutput) {
      alert('Please provide Bot Token, Chat ID, and test message.');
      return;
    }

    setIsSendingRealTest(true);
    try {
      const res = await fetch('/api/telegram/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          botToken: config.botToken,
          chatId: testChatId.trim(),
          text: testOutput
        })
      });
      const data = await res.json();

      if (data.ok) {
        alert('✅ Message sent to Telegram Chat successfully!');
      } else {
        alert(`❌ Failed to send message: ${data.description || 'Check Chat ID or token'}`);
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setIsSendingRealTest(false);
    }
  };

  // Save All Configuration
  const handleSaveAllConfig = async () => {
    setIsSaving(true);
    try {
      const configSuccess = await onSaveTelegramConfig(config);
      const commandsSuccess = await onSaveCommands(commandList);

      if (configSuccess && commandsSuccess) {
        setSaveSuccessMsg('Telegram settings and commands saved successfully to Firebase Firestore!');
        setTimeout(() => setSaveSuccessMsg(null), 3500);
      } else {
        alert('Failed to save some settings. Please verify database connection.');
      }
    } catch (err: any) {
      alert(`Save error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Command CRUD Operations
  const handleToggleCommand = (cmdId: string) => {
    setCommandList((prev) =>
      prev.map((c) => (c.id === cmdId ? { ...c, isEnabled: !c.isEnabled } : c))
    );
  };

  const handleDeleteCommand = (cmdId: string) => {
    if (!confirm('Are you sure you want to delete this command?')) return;
    setCommandList((prev) => prev.filter((c) => c.id !== cmdId));
  };

  const handleOpenCreateModal = () => {
    setEditingCommand({
      id: `cmd_custom_${Date.now()}`,
      command: '/',
      description: '',
      action: 'custom_reply',
      replyText: '',
      isEnabled: true,
      isSystem: false,
      order: commandList.length + 1
    });
    setIsCreatingNew(true);
    setCommandFormError(null);
  };

  const handleOpenEditModal = (cmd: TelegramCommand) => {
    setEditingCommand({ ...cmd });
    setIsCreatingNew(false);
    setCommandFormError(null);
  };

  const handleSaveCommandModal = () => {
    if (!editingCommand) return;

    let cleanCmd = editingCommand.command.trim();
    if (!cleanCmd.startsWith('/')) {
      cleanCmd = `/${cleanCmd}`;
    }

    if (cleanCmd.length < 2) {
      setCommandFormError('Command name must start with / and have at least 1 character (e.g. /rules)');
      return;
    }

    if (!editingCommand.description.trim()) {
      setCommandFormError('Please enter a brief description for this command.');
      return;
    }

    if (!editingCommand.replyText.trim()) {
      setCommandFormError('Please enter the reply message that the bot will respond with.');
      return;
    }

    const commandToSave: TelegramCommand = {
      ...editingCommand,
      command: cleanCmd.toLowerCase(),
      updatedAt: new Date().toISOString()
    };

    if (isCreatingNew) {
      setCommandList((prev) => [...prev, commandToSave]);
    } else {
      setCommandList((prev) =>
        prev.map((c) => (c.id === commandToSave.id ? commandToSave : c))
      );
    }

    setEditingCommand(null);
  };

  const handleInsertVariable = (varTag: string) => {
    if (!editingCommand) return;
    setEditingCommand({
      ...editingCommand,
      replyText: `${editingCommand.replyText} ${varTag}`.trim()
    });
  };

  const handleResetDefaultCommands = () => {
    if (
      confirm(
        'Reset all commands to the standard corporate expense bot templates? Custom commands will be reset.'
      )
    ) {
      setCommandList(DEFAULT_TELEGRAM_COMMANDS);
      onSaveCommands(DEFAULT_TELEGRAM_COMMANDS);
    }
  };

  const filteredCommands = commandList.filter(
    (c) =>
      c.command.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.replyText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner & Title */}
      <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/80 border border-emerald-500/30 text-emerald-200 text-xs font-semibold">
              <Bot className="w-3.5 h-3.5" />
              <span>Telegram Bot Integration & Command Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <span>Telegram Bot Settings</span>
              <span className="text-sm font-normal text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-xl border border-emerald-700/50">
                টেলিগ্রাম বট সেটিংস
              </span>
            </h1>
            <p className="text-emerald-200 text-sm max-w-2xl">
              Connect your Telegram Bot with 1-click webhook setup, manage custom bot commands, and configure instant intelligent automated replies for employees.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSaveAllConfig}
              disabled={isSaving}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-5 py-2.5 rounded-2xl font-bold text-sm shadow-md transition-all cursor-pointer hover:shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Check className="w-4 h-4 stroke-[3]" />
              )}
              <span>Save All Settings</span>
            </button>

            <button
              onClick={handleSyncCommandsToTelegram}
              disabled={isSyncingCommands || !config.botToken}
              className="flex items-center gap-2 bg-emerald-700/80 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-semibold text-sm border border-emerald-500/40 transition-all cursor-pointer disabled:opacity-50"
              title="Push commands to Telegram app's native menu"
            >
              {isSyncingCommands ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 text-amber-300" />
              )}
              <span>Sync to Telegram App</span>
            </button>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="mt-6 pt-6 border-t border-emerald-700/60 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2 bg-emerald-950/60 px-3.5 py-1.5 rounded-xl border border-emerald-700/50">
            <span className="text-emerald-300 font-medium">Connection Status:</span>
            {config.connectionStatus === 'connected' ? (
              <span className="flex items-center gap-1.5 text-emerald-300 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Connected
              </span>
            ) : config.connectionStatus === 'error' ? (
              <span className="flex items-center gap-1.5 text-rose-300 font-bold">
                <XCircle className="w-3.5 h-3.5" /> Error
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-300 font-bold">
                <AlertCircle className="w-3.5 h-3.5" /> Untested
              </span>
            )}
          </div>

          {config.botUsername && (
            <div className="flex items-center gap-2 bg-emerald-950/60 px-3.5 py-1.5 rounded-xl border border-emerald-700/50 text-emerald-200">
              <span>Bot Username:</span>
              <span className="font-bold text-white">{config.botUsername}</span>
            </div>
          )}

          <div className="flex items-center gap-2 bg-emerald-950/60 px-3.5 py-1.5 rounded-xl border border-emerald-700/50 text-emerald-200">
            <span>Active Commands:</span>
            <span className="font-bold text-white">
              {commandList.filter((c) => c.isEnabled).length} / {commandList.length}
            </span>
          </div>
        </div>
      </div>

      {/* Success Notification Alert */}
      {saveSuccessMsg && (
        <div className="bg-emerald-100 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span className="font-semibold text-sm">{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: API & Webhook Configuration (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Bot API Credentials & Webhook Setup */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-emerald-950">Telegram API Credentials</h2>
                  <p className="text-xs text-emerald-700">Token & Webhook Integration Settings</p>
                </div>
              </div>
            </div>

            {/* Bot Token Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <span>Telegram Bot Token (HTTP API)</span>
                  <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer font-medium"
                >
                  {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showToken ? 'Hide' : 'Show'}</span>
                </button>
              </div>

              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={config.botToken}
                  onChange={(e) => setConfig({ ...config, botToken: e.target.value })}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                  className="w-full bg-emerald-50/50 border border-emerald-200 rounded-2xl px-4 py-3 text-xs sm:text-sm font-mono text-emerald-950 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all pr-24"
                />
                <button
                  onClick={handleTestToken}
                  disabled={isTestingToken || !config.botToken}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs px-3 py-1.5 rounded-xl font-semibold transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
                >
                  {isTestingToken ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Sparkles className="w-3 h-3" />
                  )}
                  <span>Verify</span>
                </button>
              </div>
              <p className="text-[11px] text-emerald-600">
                Obtained from <span className="font-semibold">@BotFather</span> inside Telegram.
              </p>
            </div>

            {/* Webhook URL Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                <span>Webhook URL (Auto-Generated API Endpoint)</span>
                <span className="text-[10px] text-emerald-600 font-normal">POST /api/telegram/webhook</span>
              </label>

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={config.webhookUrl}
                  onChange={(e) => setConfig({ ...config, webhookUrl: e.target.value })}
                  className="w-full bg-emerald-50/50 border border-emerald-200 rounded-2xl px-4 py-3 text-xs font-mono text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white pr-20"
                />
                <button
                  onClick={copyWebhookUrl}
                  className="absolute right-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {copiedWebhook ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Optional Secret Token */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                <span>Webhook Secret Token (Optional Security Header)</span>
                <span className="text-[10px] text-emerald-600 font-normal">X-Telegram-Bot-Api-Secret-Token</span>
              </label>
              <input
                type="text"
                value={config.secretToken || ''}
                onChange={(e) => setConfig({ ...config, secretToken: e.target.value })}
                placeholder="e.g., custom-secret-token-key-123"
                className="w-full bg-emerald-50/50 border border-emerald-200 rounded-2xl px-4 py-2.5 text-xs font-mono text-emerald-950 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            {/* Webhook Action Buttons Grid */}
            <div className="pt-2 border-t border-emerald-100 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleSetWebhook}
                  disabled={isSettingWebhook || !config.botToken}
                  className="flex items-center justify-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white py-2.5 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSettingWebhook ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Link className="w-3.5 h-3.5" />
                  )}
                  <span>1-Click Set Webhook</span>
                </button>

                <button
                  onClick={handleGetWebhookInfo}
                  disabled={isCheckingWebhook || !config.botToken}
                  className="flex items-center justify-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 py-2.5 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  {isCheckingWebhook ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Info className="w-3.5 h-3.5 text-emerald-700" />
                  )}
                  <span>Check Status</span>
                </button>
              </div>

              <button
                onClick={handleDeleteWebhook}
                disabled={isDeletingWebhook || !config.botToken}
                className="w-full flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 py-2 px-3 rounded-2xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeletingWebhook ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                )}
                <span>Delete Webhook (Disconnect)</span>
              </button>
            </div>
          </div>

          {/* Card 2: Interactive Step-by-Step Telegram Setup Guide */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-3xl p-6 border border-emerald-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">
                📖
              </div>
              <h3 className="text-sm font-bold text-emerald-950">How to Setup Telegram Bot (সহজ গাইড)</h3>
            </div>

            <ol className="space-y-3 text-xs text-emerald-900">
              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold shrink-0 text-[11px]">
                  1
                </span>
                <div>
                  <p className="font-semibold">Open Telegram & find @BotFather</p>
                  <p className="text-emerald-700 text-[11px]">
                    Search for <code className="bg-white px-1.5 py-0.5 rounded text-emerald-900 font-mono">@BotFather</code> and send <code className="bg-white px-1.5 py-0.5 rounded text-emerald-900 font-mono">/newbot</code>.
                  </p>
                </div>
              </li>

              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold shrink-0 text-[11px]">
                  2
                </span>
                <div>
                  <p className="font-semibold">Choose Name & Username</p>
                  <p className="text-emerald-700 text-[11px]">
                    Example: <span className="font-mono">ExpenseFlow Bot</span> &amp; username <span className="font-mono">my_expense_ksa_bot</span>.
                  </p>
                </div>
              </li>

              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold shrink-0 text-[11px]">
                  3
                </span>
                <div>
                  <p className="font-semibold">Copy HTTP API Token</p>
                  <p className="text-emerald-700 text-[11px]">
                    Paste the token above and click <span className="font-semibold">Verify</span>.
                  </p>
                </div>
              </li>

              <li className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-900 flex items-center justify-center font-bold shrink-0 text-[11px]">
                  4
                </span>
                <div>
                  <p className="font-semibold">Click "1-Click Set Webhook"</p>
                  <p className="text-emerald-700 text-[11px]">
                    This connects Telegram directly to this app without needing complex servers.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </div>

        {/* Right Column: Custom Commands Manager & Dynamic Replies (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 3: Telegram Commands List & Manager */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                  <span>Custom Commands & Bot Replies</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    {commandList.length}
                  </span>
                </h2>
                <p className="text-xs text-emerald-700">
                  Manage bot slash commands (/start, /help, /pdf, etc.) and define dynamic replies.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetDefaultCommands}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200 cursor-pointer transition-colors"
                  title="Reset to standard corporate templates"
                >
                  Reset Defaults
                </button>
                <button
                  onClick={handleOpenCreateModal}
                  className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Command</span>
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search commands (e.g. /start, /pdf, balance, rules)..."
                className="w-full bg-emerald-50/40 border border-emerald-200 rounded-2xl px-4 py-2.5 text-xs text-emerald-950 placeholder:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white"
              />
            </div>

            {/* Commands List Cards */}
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {filteredCommands.map((cmd) => {
                return (
                  <div
                    key={cmd.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      cmd.isEnabled
                        ? 'bg-white border-emerald-200 hover:border-emerald-400 shadow-xs'
                        : 'bg-stone-50 border-stone-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-sm text-emerald-900 bg-emerald-100/70 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            {cmd.command}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200/60">
                            {cmd.action === 'custom_reply' && '💬 Custom Reply'}
                            {cmd.action === 'start_expense' && '📝 Expense Entry'}
                            {cmd.action === 'show_pdf_voucher' && '📄 PDF Voucher'}
                            {cmd.action === 'show_summary' && '📊 Expense Summary'}
                            {cmd.action === 'show_categories' && '📁 Categories List'}
                            {cmd.action === 'show_help' && '📖 Help Menu'}
                            {cmd.action === 'show_status' && '🟢 System Status'}
                          </span>
                          {cmd.isSystem && (
                            <span className="text-[10px] text-emerald-600 font-medium">
                              (Default)
                            </span>
                          )}
                        </div>

                        <p className="text-xs font-semibold text-emerald-950 mt-1">{cmd.description}</p>

                        <div className="mt-2 bg-emerald-50/60 rounded-xl p-2.5 border border-emerald-100/80 text-xs text-emerald-900 font-sans whitespace-pre-wrap line-clamp-3">
                          {cmd.replyText}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        {/* Toggle switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleCommand(cmd.id)}
                          className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
                            cmd.isEnabled ? 'bg-emerald-600' : 'bg-stone-300'
                          }`}
                          title={cmd.isEnabled ? 'Enabled' : 'Disabled'}
                        >
                          <span
                            className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-transform ${
                              cmd.isEnabled ? 'left-4.5' : 'left-1'
                            }`}
                          />
                        </button>

                        <div className="flex items-center gap-1 mt-2">
                          <button
                            onClick={() => handleOpenEditModal(cmd)}
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors cursor-pointer"
                            title="Edit Command & Reply"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!cmd.isSystem && (
                            <button
                              onClick={() => handleDeleteCommand(cmd.id)}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                              title="Delete Command"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredCommands.length === 0 && (
                <div className="p-8 text-center bg-emerald-50/40 rounded-2xl border border-dashed border-emerald-200 text-emerald-700 text-xs">
                  No commands found matching "{searchQuery}". Click "+ Add Command" to create a new one.
                </div>
              )}
            </div>
          </div>

          {/* Card 4: Interactive Live Command Tester */}
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-emerald-950">Live Reply Preview & Simulator</h3>
              </div>
              <span className="text-[11px] text-emerald-700">Real-time template rendering</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder="Type a command (e.g. /start, /balance, /rules, /pdf)..."
                  className="flex-1 bg-emerald-50/50 border border-emerald-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-mono text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <button
                  onClick={() => runTestCommand(testInput)}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Test
                </button>
              </div>

              {/* Rendered Bot Response */}
              <div className="bg-emerald-950 text-emerald-100 rounded-2xl p-4 font-sans text-xs sm:text-sm whitespace-pre-wrap shadow-inner border border-emerald-800 min-h-[90px]">
                <div className="text-[10px] text-emerald-400 font-mono mb-2 pb-1 border-b border-emerald-800 flex items-center justify-between">
                  <span>🤖 BOT RESPONSE PREVIEW:</span>
                  <span>Currency: {appSettings.defaultCurrency || 'SAR'}</span>
                </div>
                {testOutput}
              </div>

              {/* Send Real Test Message to Telegram Chat ID */}
              <div className="pt-2 border-t border-emerald-100 flex items-center gap-2">
                <input
                  type="text"
                  value={testChatId}
                  onChange={(e) => setTestChatId(e.target.value)}
                  placeholder="Optional Telegram Chat ID (e.g., 12345678)"
                  className="flex-1 bg-emerald-50/30 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-emerald-950 placeholder:text-emerald-400 focus:outline-none"
                />
                <button
                  onClick={handleSendRealTestMessage}
                  disabled={isSendingRealTest || !config.botToken || !testChatId}
                  className="bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1 shrink-0"
                >
                  {isSendingRealTest ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>Send Live Test</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card 5: Recent Telegram Webhook Activity Logs */}
      <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-emerald-950">Recent Telegram Webhook Activity</h3>
              <p className="text-xs text-emerald-700">Live incoming updates received from Telegram servers</p>
            </div>
          </div>

          <button
            onClick={fetchLogs}
            disabled={isLoadingLogs}
            className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            <span>Refresh Logs</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-emerald-50/80 text-emerald-950 border-b border-emerald-200">
                <th className="py-2.5 px-3 rounded-l-xl font-bold">Timestamp</th>
                <th className="py-2.5 px-3 font-bold">Sender / Chat</th>
                <th className="py-2.5 px-3 font-bold">Received Message</th>
                <th className="py-2.5 px-3 font-bold">Bot Response</th>
                <th className="py-2.5 px-3 rounded-r-xl font-bold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-emerald-50/40 transition-colors">
                  <td className="py-2.5 px-3 text-emerald-700 font-mono text-[11px] whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-emerald-950">{log.sender}</td>
                  <td className="py-2.5 px-3 font-mono text-emerald-900">{log.text}</td>
                  <td className="py-2.5 px-3 text-emerald-800 max-w-xs truncate">{log.response}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}

              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-emerald-600 text-xs italic">
                    No webhook updates received yet. Once your webhook is registered, all incoming messages will appear here!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Edit / Create Command Modal */}
      {editingCommand && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-emerald-100 space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-emerald-950">
                    {isCreatingNew ? 'Add New Telegram Command' : `Edit Command: ${editingCommand.command}`}
                  </h3>
                  <p className="text-xs text-emerald-700">
                    Define the slash command and customized automated response
                  </p>
                </div>
              </div>

              <button
                onClick={() => setEditingCommand(null)}
                className="w-8 h-8 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {commandFormError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 px-3 py-2 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{commandFormError}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              {/* Command Input & Action */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-emerald-950 flex items-center gap-1">
                    <span>Command (e.g. /rules, /balance)</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={editingCommand.command}
                    onChange={(e) => setEditingCommand({ ...editingCommand, command: e.target.value })}
                    placeholder="/mycommand"
                    className="w-full bg-emerald-50/50 border border-emerald-200 rounded-xl px-3.5 py-2.5 font-mono text-xs text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-emerald-950">Action Handler</label>
                  <select
                    value={editingCommand.action}
                    onChange={(e) =>
                      setEditingCommand({
                        ...editingCommand,
                        action: e.target.value as TelegramCommandAction
                      })
                    }
                    className="w-full bg-emerald-50/50 border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  >
                    <option value="custom_reply">💬 Custom Text Reply</option>
                    <option value="start_expense">📝 Start Expense Submission</option>
                    <option value="show_pdf_voucher">📄 Show PDF Approval Voucher</option>
                    <option value="show_summary">📊 Show Expense Balance Summary</option>
                    <option value="show_categories">📁 Show Allowed Categories</option>
                    <option value="show_help">📖 Show Help Guide</option>
                    <option value="show_status">🟢 Show Server Status</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="font-bold text-emerald-950 flex items-center gap-1">
                  <span>Menu Description</span>
                  <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={editingCommand.description}
                  onChange={(e) =>
                    setEditingCommand({ ...editingCommand, description: e.target.value })
                  }
                  placeholder="Short description displayed in Telegram menu"
                  className="w-full bg-emerald-50/50 border border-emerald-200 rounded-xl px-3.5 py-2.5 text-xs text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              {/* Dynamic Variables Chips */}
              <div className="space-y-1.5">
                <label className="font-bold text-emerald-950">Insert Dynamic Variables (ক্লিক করে যোগ করুন):</label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    '{user_name}',
                    '{company_name}',
                    '{currency}',
                    '{today_date}',
                    '{pending_count}',
                    '{pending_amount}',
                    '{approved_count}',
                    '{approved_amount}'
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => handleInsertVariable(tag)}
                      className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-mono text-[11px] border border-emerald-300/70 cursor-pointer transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Reply Template Textarea */}
              <div className="space-y-1.5">
                <label className="font-bold text-emerald-950 flex items-center gap-1">
                  <span>Bot Reply Message Template</span>
                  <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={editingCommand.replyText}
                  onChange={(e) =>
                    setEditingCommand({ ...editingCommand, replyText: e.target.value })
                  }
                  placeholder="Type the message that will be sent back when this command is triggered..."
                  className="w-full bg-emerald-50/50 border border-emerald-200 rounded-xl p-3.5 text-xs font-sans text-emerald-950 focus:ring-2 focus:ring-emerald-600 focus:outline-none leading-relaxed"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-100">
              <button
                type="button"
                onClick={() => setEditingCommand(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-emerald-800 hover:bg-emerald-50 border border-emerald-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCommandModal}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-xs cursor-pointer"
              >
                Save Command
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Telegram API Response Details Modal */}
      {apiResponseModal && (
        <div className="fixed inset-0 bg-emerald-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-emerald-100 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <h3 className="text-sm font-bold text-emerald-950">{apiResponseModal.title}</h3>
              <button
                onClick={() => setApiResponseModal(null)}
                className="w-7 h-7 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-emerald-950 text-emerald-100 p-4 rounded-2xl font-mono text-xs max-h-72 overflow-y-auto whitespace-pre-wrap">
              {typeof apiResponseModal.data === 'string'
                ? apiResponseModal.data
                : JSON.stringify(apiResponseModal.data, null, 2)}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setApiResponseModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
