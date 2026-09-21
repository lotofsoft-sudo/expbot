import React, { useState, useEffect, useRef } from 'react';
import { Expense, GoogleSheetsConfig, SyncLog, AppSettings } from '../types';
import {
  FileSpreadsheet,
  RefreshCw,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Key,
  Copy,
  Check,
  ExternalLink,
  Table,
  Upload,
  Lock,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  RotateCcw,
  FileCode,
  FileText,
  UploadCloud,
  Trash2,
  HelpCircle,
  FolderOpen,
  Info
} from 'lucide-react';
import {
  saveGoogleSheetsConfigToFirestore,
  addSyncLogToFirestore,
  updateExpenseSyncStatusInFirestore
} from '../lib/firebase';

interface GoogleSheetsViewProps {
  expenses: Expense[];
  appSettings: AppSettings;
  sheetsConfig: GoogleSheetsConfig;
  syncLogs?: SyncLog[];
  onManualSyncSheets: () => Promise<void>;
  onSaveConfig?: (config: GoogleSheetsConfig) => Promise<void>;
  onRefreshConfig?: () => void;
}

export const GoogleSheetsView: React.FC<GoogleSheetsViewProps> = ({
  expenses,
  appSettings,
  sheetsConfig,
  syncLogs = [],
  onManualSyncSheets,
  onSaveConfig,
  onRefreshConfig
}) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Form Fields
  const [projectId, setProjectId] = useState<string>(sheetsConfig.projectId || '');
  const [projectNumber, setProjectNumber] = useState<string>(sheetsConfig.projectNumber || '');
  const [spreadsheetId, setSpreadsheetId] = useState<string>(sheetsConfig.spreadsheetId || '');
  const [sheetName, setSheetName] = useState<string>(sheetsConfig.sheetName || 'Expenses');
  const [range, setRange] = useState<string>(sheetsConfig.range || 'A:O');
  const [serviceAccountEmail, setServiceAccountEmail] = useState<string>(sheetsConfig.serviceAccountEmail || '');
  const [serviceAccountPrivateKey, setServiceAccountPrivateKey] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>(sheetsConfig.apiKey || '');
  const [jsonInput, setJsonInput] = useState<string>('');

  // Uploaded Key State
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [uploadedFileSize, setUploadedFileSize] = useState<string | null>(null);
  const [uploadedKeyInfo, setUploadedKeyInfo] = useState<{
    projectId?: string;
    clientEmail?: string;
    privateKeyId?: string;
    clientId?: string;
    type?: string;
  } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [keyInputMode, setKeyInputMode] = useState<'upload' | 'paste' | 'manual'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI States
  const [isEditingKey, setIsEditingKey] = useState<boolean>(!sheetsConfig.hasEncryptedPrivateKey);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessTick, setSaveSuccessTick] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [copiedEmail, setCopiedEmail] = useState<boolean>(false);
  const [copiedProjectId, setCopiedProjectId] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    spreadsheetTitle?: string;
    availableSheets?: string[];
    canRead?: boolean;
    canWrite?: boolean;
    rowCount?: number;
    error?: string;
    timestamp?: string;
  } | null>(null);

  // Live Sheet data preview from Google Sheets API
  const [liveSheetRows, setLiveSheetRows] = useState<any[][] | null>(null);
  const [isLoadingLiveData, setIsLoadingLiveData] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'grid' | 'config' | 'logs' | 'guide'>('grid');

  // Server Environment Secrets status
  const [envSecretsStatus, setEnvSecretsStatus] = useState<{
    hasEnvSpreadsheetId: boolean;
    hasEnvServiceAccountEmail: boolean;
    hasEnvPrivateKey: boolean;
    hasEnvGemini: boolean;
    hasEnvTelegramBot: boolean;
    hasEnvCurrency?: boolean;
    envCurrency?: string;
    envSpreadsheetId?: string;
    envServiceAccountEmail?: string;
    envProjectId?: string;
  } | null>(null);

  // Sync internal form when sheetsConfig prop changes
  useEffect(() => {
    setProjectId(sheetsConfig.projectId || '');
    setProjectNumber(sheetsConfig.projectNumber || '');
    setSpreadsheetId(sheetsConfig.spreadsheetId || '');
    setSheetName(sheetsConfig.sheetName || 'Expenses');
    setRange(sheetsConfig.range || 'A:O');
    setServiceAccountEmail(sheetsConfig.serviceAccountEmail || '');
    setApiKey(sheetsConfig.apiKey || '');
    if (sheetsConfig.hasEncryptedPrivateKey) {
      setIsEditingKey(false);
    }

    // Check server-side environment secrets
    fetch('/api/sheets/env-status')
      .then(res => res.json())
      .then(data => {
        setEnvSecretsStatus(data);
        // If current fields are empty, populate from server env secrets if available
        if (!sheetsConfig.spreadsheetId && data.envSpreadsheetId) {
          setSpreadsheetId(data.envSpreadsheetId);
        }
        if (!sheetsConfig.serviceAccountEmail && data.envServiceAccountEmail) {
          setServiceAccountEmail(data.envServiceAccountEmail);
        }
        if (!sheetsConfig.projectId && data.envProjectId) {
          setProjectId(data.envProjectId);
        }
      })
      .catch(err => console.warn('Could not fetch server secrets status:', err));
  }, [sheetsConfig]);

  // Extract Spreadsheet ID if a full URL is pasted
  const handleSpreadsheetIdChange = (val: string) => {
    let cleanVal = val.trim();
    if (cleanVal.includes('/spreadsheets/d/')) {
      const match = cleanVal.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (match && match[1]) {
        cleanVal = match[1];
      }
    }
    setSpreadsheetId(cleanVal);
  };

  // One-click Parse of Service Account JSON file/text
  const handleParseJsonCredentials = (rawJson: string, filename?: string, fileSize?: number) => {
    try {
      const parsed = JSON.parse(rawJson);
      
      // Basic validation for Google Service Account Key JSON
      if (!parsed.client_email && !parsed.private_key && !parsed.project_id) {
        throw new Error('This JSON does not appear to be a valid Google Service Account Key.');
      }

      if (parsed.project_id) setProjectId(parsed.project_id);
      if (parsed.client_email) setServiceAccountEmail(parsed.client_email);
      if (parsed.private_key) {
        setServiceAccountPrivateKey(parsed.private_key);
        setIsEditingKey(true);
      }

      setUploadedKeyInfo({
        projectId: parsed.project_id,
        clientEmail: parsed.client_email,
        privateKeyId: parsed.private_key_id,
        clientId: parsed.client_id,
        type: parsed.type || 'service_account'
      });

      if (filename) {
        setUploadedFileName(filename);
      } else {
        setUploadedFileName('service-account-key.json');
      }

      if (fileSize) {
        setUploadedFileSize(`${(fileSize / 1024).toFixed(1)} KB`);
      } else {
        setUploadedFileSize(`${(new Blob([rawJson]).size / 1024).toFixed(1)} KB`);
      }

      setSyncFeedback({
        text: `✓ Service Account JSON Key loaded successfully! (${parsed.client_email || 'Key parsed'})`,
        type: 'success'
      });
      setJsonInput('');
    } catch (e: any) {
      setSyncFeedback({
        text: `Invalid JSON format: ${e.message || 'Please upload a valid Google Service Account JSON file.'}`,
        type: 'error'
      });
    }
  };

  const handleJsonFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleProcessFile(file);
  };

  const handleProcessFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json') && file.type !== 'application/json') {
      setSyncFeedback({
        text: 'Please upload a valid .json file downloaded from Google Cloud Console.',
        type: 'error'
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      if (text) {
        handleParseJsonCredentials(text, file.name, file.size);
      }
    };
    reader.onerror = () => {
      setSyncFeedback({
        text: 'Failed to read the JSON file. Please try again.',
        type: 'error'
      });
    };
    reader.readAsText(file);
  };

  // Drag and Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  // Clear loaded key
  const handleClearKey = () => {
    setUploadedFileName(null);
    setUploadedFileSize(null);
    setUploadedKeyInfo(null);
    setServiceAccountPrivateKey('');
    setIsEditingKey(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSyncFeedback({
      text: 'Loaded key cleared. You can upload a new JSON key file.',
      type: 'info'
    });
  };

  // Copy Service Account Email to clipboard
  const handleCopyEmail = () => {
    if (serviceAccountEmail) {
      navigator.clipboard.writeText(serviceAccountEmail);
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
  };

  // Copy Project ID to clipboard
  const handleCopyProjectId = () => {
    if (projectId) {
      navigator.clipboard.writeText(projectId);
      setCopiedProjectId(true);
      setTimeout(() => setCopiedProjectId(false), 2000);
    }
  };

  // Save Configuration to Firebase Firestore & Encrypt Private Key via Server
  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    setSyncFeedback(null);
    try {
      const trimmedKey = serviceAccountPrivateKey ? serviceAccountPrivateKey.trim() : '';

      const updatedConfig: GoogleSheetsConfig = {
        ...sheetsConfig,
        projectId: projectId.trim() || sheetsConfig.projectId,
        projectNumber: projectNumber.trim() || sheetsConfig.projectNumber,
        spreadsheetId: spreadsheetId.trim() || sheetsConfig.spreadsheetId,
        sheetName: sheetName.trim() || sheetsConfig.sheetName || 'Expenses',
        range: range.trim() || sheetsConfig.range || 'A:O',
        serviceAccountEmail: serviceAccountEmail.trim() || sheetsConfig.serviceAccountEmail,
        serviceAccountPrivateKey: trimmedKey.length > 0 ? trimmedKey : undefined,
        apiKey: apiKey.trim() || sheetsConfig.apiKey,
        updatedAt: new Date().toISOString()
      };

      // Call Firestore helper which encrypts key server-side and writes to Firestore doc
      const saveResult = await saveGoogleSheetsConfigToFirestore(updatedConfig);

      if (saveResult.success) {
        setSaveSuccessTick(true);
        setTimeout(() => setSaveSuccessTick(false), 4500);

        setSyncFeedback({
          text: '✓ গুগল শিট কনফিগারেশন এবং সার্ভিস একাউন্ট কি ফায়ারবেসে সফলভাবে এনক্রিপ্ট ও সেভ হয়েছে! এই ডাটা ক্লাউডে স্থায়ীভাবে সংরক্ষিত (আর কখনো দেওয়া লাগবে না)।',
          type: 'success'
        });

        if (onSaveConfig && saveResult.config) {
          await onSaveConfig(saveResult.config);
        }

        setIsEditingKey(false);
        setServiceAccountPrivateKey('');
      } else {
        setSyncFeedback({
          text: `সেভ হতে ব্যর্থ হয়েছে: ${saveResult.error || 'Unknown server error'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setSyncFeedback({ text: `Failed: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Test Live Google Sheets Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    setSyncFeedback(null);
    try {
      const configToTest: GoogleSheetsConfig = {
        ...sheetsConfig,
        projectId: projectId.trim() || sheetsConfig.projectId,
        spreadsheetId: spreadsheetId.trim() || sheetsConfig.spreadsheetId,
        sheetName: sheetName.trim() || sheetsConfig.sheetName || 'Expenses',
        range: range.trim() || sheetsConfig.range || 'A:O',
        serviceAccountEmail: serviceAccountEmail.trim() || sheetsConfig.serviceAccountEmail,
        apiKey: apiKey.trim() || sheetsConfig.apiKey
      };

      const res = await fetch('/api/sheets/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: configToTest,
          privateKey: isEditingKey && serviceAccountPrivateKey ? serviceAccountPrivateKey.trim() : undefined
        })
      });

      const data = await res.json();
      setTestResult(data);

      if (data.success) {
        setSyncFeedback({
          text: `Google Sheets connection successful! Sheet title: "${data.spreadsheetTitle || 'Expenses'}"`,
          type: 'success'
        });
        // Update connection status in Firestore
        await saveGoogleSheetsConfigToFirestore({
          ...sheetsConfig,
          connectionStatus: 'connected',
          lastTestedAt: new Date().toISOString()
        });
      } else {
        setSyncFeedback({
          text: `Connection error: ${data.error || 'Verify the sheet is shared with the Service Account email with Editor access.'}`,
          type: 'error'
        });
        await saveGoogleSheetsConfigToFirestore({
          ...sheetsConfig,
          connectionStatus: 'error',
          lastTestedAt: new Date().toISOString()
        });
      }
    } catch (err: any) {
      setSyncFeedback({ text: `Connection test failed: ${err.message}`, type: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  // Direct API Sync All Expenses to Google Sheets
  const handleSyncAll = async () => {
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const configToUse: GoogleSheetsConfig = {
        ...sheetsConfig,
        projectId: projectId.trim() || sheetsConfig.projectId,
        spreadsheetId: spreadsheetId.trim() || sheetsConfig.spreadsheetId,
        sheetName: sheetName.trim() || sheetsConfig.sheetName || 'Expenses',
        range: range.trim() || sheetsConfig.range || 'A:O',
        serviceAccountEmail: serviceAccountEmail.trim() || sheetsConfig.serviceAccountEmail,
        apiKey: apiKey.trim() || sheetsConfig.apiKey
      };

      const res = await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: configToUse,
          expenses,
          fullSync: true,
          privateKey: isEditingKey && serviceAccountPrivateKey ? serviceAccountPrivateKey.trim() : undefined
        })
      });

      const data = await res.json();

      if (data.success) {
        const syncedCount = (data.appendedCount || 0) + (data.updatedCount || 0);

        for (const exp of expenses) {
          await updateExpenseSyncStatusInFirestore(exp.id, 'synced');
        }

        await saveGoogleSheetsConfigToFirestore({
          ...sheetsConfig,
          lastSyncAt: new Date().toISOString(),
          totalSynced: (sheetsConfig.totalSynced || 0) + syncedCount,
          connectionStatus: 'connected'
        });

        await addSyncLogToFirestore({
          timestamp: new Date().toISOString(),
          operation: 'batch_sync',
          status: 'success',
          details: `Direct API Sync: ${data.appendedCount || 0} appended, ${data.updatedCount || 0} updated`
        });

        setSyncFeedback({
          text: `Successfully synced ${expenses.length} records to Google Sheets!`,
          type: 'success'
        });

        fetchLiveSheetData();
      } else {
        await addSyncLogToFirestore({
          timestamp: new Date().toISOString(),
          operation: 'batch_sync',
          status: 'failed',
          details: `Sync failed: ${data.error || 'Unknown error'}`,
          error: data.error
        });

        setSyncFeedback({
          text: `Google Sheets API Error: ${data.error || 'Check permissions and credentials.'}`,
          type: 'error'
        });
      }
    } catch (err: any) {
      setSyncFeedback({ text: `Sync error: ${err.message}`, type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch Live Google Spreadsheet Rows
  const fetchLiveSheetData = async () => {
    if (!sheetsConfig.spreadsheetId && !spreadsheetId) return;
    setIsLoadingLiveData(true);
    try {
      const res = await fetch('/api/sheets/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: {
            ...sheetsConfig,
            spreadsheetId: spreadsheetId || sheetsConfig.spreadsheetId,
            sheetName: sheetName || sheetsConfig.sheetName || 'Expenses',
            serviceAccountEmail: serviceAccountEmail || sheetsConfig.serviceAccountEmail
          },
          limit: 100
        })
      });
      const data = await res.json();
      if (data.success && data.rows) {
        setLiveSheetRows(data.rows);
      }
    } catch (e) {
      console.warn('Failed to fetch live sheet data:', e);
    } finally {
      setIsLoadingLiveData(false);
    }
  };

  // Export CSV fallback
  const handleDownloadCsv = () => {
    const headers = [
      'Row',
      'Expense ID',
      'Date',
      'Employee Name',
      'Department',
      'Amount',
      'Currency',
      'Category',
      'Supplier Detail',
      'Description',
      'Status'
    ];

    const rows = expenses.map((e, index) => [
      index + 1,
      e.id,
      e.date,
      `"${e.userName}"`,
      e.department || '',
      e.amount,
      e.currency,
      `"${e.category}"`,
      `"${(e.supplierDetail || '').replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.status
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenses_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isConnected = sheetsConfig.connectionStatus === 'connected';
  const isError = sheetsConfig.connectionStatus === 'error';

  return (
    <div className="space-y-5 sm:space-y-6 font-sans">
      {/* Top Banner Card */}
      <div className="bg-white rounded-2xl border border-emerald-200/90 p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets Integration (Direct API v4)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-950 mt-1">
            Real-time Google Sheets Synchronization
          </h2>
          <p className="text-xs text-emerald-700 mt-0.5">
            Automatically backup and synchronize all expense submissions to your central spreadsheet
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sheetsConfig.spreadsheetId && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${sheetsConfig.spreadsheetId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors border border-emerald-300 shadow-xs"
            >
              <span>Open Spreadsheet</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors border border-emerald-200 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleSyncAll}
            disabled={isSyncing || (!sheetsConfig.spreadsheetId && !spreadsheetId)}
            className={`px-4 py-2 rounded-xl text-white text-xs sm:text-sm font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer ${
              isSyncing
                ? 'bg-emerald-400 cursor-not-allowed'
                : 'bg-emerald-700 hover:bg-emerald-800 active:scale-95'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync All Records'}</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {syncFeedback && (
        <div
          className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
              : 'bg-rose-100 text-rose-900 border border-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncFeedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0" />
            )}
            <span>{syncFeedback.text}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-xs font-bold px-2 py-1 hover:bg-black/10 rounded-md cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Status */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-emerald-700 uppercase">Connection Status</div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isConnected ? 'bg-emerald-500 animate-pulse' : isError ? 'bg-rose-500' : 'bg-neutral-400'
              }`}
            />
            <span className="font-bold text-sm text-emerald-950">
              {isConnected ? 'Connected' : isError ? 'Connection Error' : 'Untested'}
            </span>
          </div>
          <div className="text-[11px] text-emerald-600">
            {sheetsConfig.lastTestedAt
              ? `Tested: ${new Date(sheetsConfig.lastTestedAt).toLocaleTimeString()}`
              : 'Click Test Connection'}
          </div>
        </div>

        {/* Expenses Count */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-emerald-700 uppercase">Total Expense Records</div>
          <div className="font-bold text-xl text-emerald-950">{expenses.length} items</div>
          <div className="text-[11px] text-emerald-700 font-medium">
            {expenses.filter((e) => e.syncedToGoogleSheets).length} Synced •{' '}
            {expenses.filter((e) => !e.syncedToGoogleSheets).length} Pending
          </div>
        </div>

        {/* Target Tab */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-emerald-700 uppercase">Target Sheet Tab</div>
          <div className="font-bold text-sm text-emerald-950 truncate">
            {sheetsConfig.sheetName || sheetName || 'Expenses'}
          </div>
          <div className="text-[11px] text-emerald-600">Range: {sheetsConfig.range || 'A:O'}</div>
        </div>

        {/* Security */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-xs space-y-1">
          <div className="text-xs font-semibold text-emerald-700 uppercase">Security & Encryption</div>
          <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
            <Lock className="w-3.5 h-3.5 text-emerald-600" /> AES-256 Encrypted
          </div>
          <div className="text-[11px] text-emerald-600">Stored in Firestore</div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-emerald-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('grid')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer transition-all ${
            activeTab === 'grid'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-emerald-900 hover:bg-emerald-100/70 border border-emerald-200'
          }`}
        >
          📊 Spreadsheet Records ({expenses.length})
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer transition-all ${
            activeTab === 'config'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-emerald-900 hover:bg-emerald-100/70 border border-emerald-200'
          }`}
        >
          🔑 Google API Configuration
        </button>

        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer transition-all ${
            activeTab === 'logs'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-emerald-900 hover:bg-emerald-100/70 border border-emerald-200'
          }`}
        >
          📜 Sync Logs ({syncLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('guide')}
          className={`px-4 py-2 rounded-xl font-semibold text-xs sm:text-sm cursor-pointer transition-all ${
            activeTab === 'guide'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'bg-white text-emerald-900 hover:bg-emerald-100/70 border border-emerald-200'
          }`}
        >
          💡 Setup Guide
        </button>
      </div>

      {/* Sub-Tab 1: SPREADSHEET ROW GRID */}
      {activeTab === 'grid' && (
        <div className="space-y-4">
          {/* Share Email Callout */}
          {serviceAccountEmail && (
            <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-700 text-emerald-200 flex items-center justify-center font-bold text-sm shrink-0">
                  !
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="font-bold text-emerald-200 block">Google Spreadsheet Sharing Requirement:</span>
                  <span className="text-emerald-100">
                    Share your Google Sheet with this Service Account email with <strong>Editor</strong> permissions:{' '}
                    <code className="text-amber-300 font-mono text-xs">{serviceAccountEmail}</code>
                  </span>
                </div>
              </div>

              <button
                onClick={handleCopyEmail}
                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer self-start md:self-auto shrink-0"
              >
                {copiedEmail ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedEmail ? 'Copied' : 'Copy Email'}</span>
              </button>
            </div>
          )}

          {/* Table */}
          <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-emerald-950">
                <thead className="bg-emerald-50 text-xs font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-200">
                  <tr>
                    <th className="p-3.5 pl-5">#</th>
                    <th className="p-3.5">Expense ID</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Employee</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5">Amount</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 text-right pr-5">Sync Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100 font-medium">
                  {expenses.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-emerald-600">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    expenses.map((exp, idx) => (
                      <tr key={exp.id} className="hover:bg-emerald-50/50 transition-colors">
                        <td className="p-3.5 pl-5 text-emerald-700">{idx + 1}</td>
                        <td className="p-3.5 font-bold text-emerald-900">{exp.id}</td>
                        <td className="p-3.5 text-xs text-emerald-700">{exp.date}</td>
                        <td className="p-3.5 font-semibold">{exp.userName}</td>
                        <td className="p-3.5">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold">
                            {exp.category}
                          </span>
                        </td>
                        <td className="p-3.5 max-w-xs truncate text-xs text-emerald-900">
                          {exp.description}
                        </td>
                        <td className="p-3.5 font-bold">
                          {exp.amount.toFixed(2)} {exp.currency}
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                              exp.status === 'approved'
                                ? 'bg-emerald-100 text-emerald-800'
                                : exp.status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {exp.status === 'approved' ? 'Approved' : exp.status === 'rejected' ? 'Rejected' : 'Pending'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right pr-5">
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Synced
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: CREDENTIALS & CONFIG */}
      {activeTab === 'config' && (
        <div className="space-y-5">
          {/* Permanent Cloud Storage Banner if already configured in Firebase */}
          {sheetsConfig.hasEncryptedPrivateKey && sheetsConfig.serviceAccountEmail && (
            <div className="bg-emerald-50 border border-emerald-300/80 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-emerald-950 text-sm sm:text-base">
                    Firebase Cloud Persistence Active (ফায়ারবেস ক্লাউডে স্থায়ীভাবে সংরক্ষিত)
                  </h4>
                  <span className="bg-emerald-200 text-emerald-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    Saved & Connected
                  </span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  আপনার Google Service Account কি ও স্প্রেডশিট কনফিগারেশন <strong>Firebase Firestore</strong>-এ এনক্রিপ্ট হয়ে স্থায়ীভাবে সেভ রয়েছে। অ্যাপ রিলোড বা যেকোনো ডিভাইস থেকে ওপেন করলেও এই ডাটা <strong>আর কখনো নতুন করে দিতে হবে না</strong>।
                </p>
                <div className="pt-1 flex items-center gap-4 text-xs font-semibold text-emerald-900">
                  <span className="flex items-center gap-1 font-mono">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    {sheetsConfig.serviceAccountEmail}
                  </span>
                  {sheetsConfig.projectId && (
                    <span className="font-mono text-emerald-700">
                      Project: {sheetsConfig.projectId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* App Secrets Environment Integration Banner */}
          {envSecretsStatus && (envSecretsStatus.hasEnvSpreadsheetId || envSecretsStatus.hasEnvPrivateKey || envSecretsStatus.hasEnvServiceAccountEmail) && (
            <div className="bg-teal-50 border border-teal-300 rounded-2xl p-4 sm:p-5 flex items-start gap-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-700 text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-teal-950 text-sm sm:text-base">
                    App Secrets Connected (অ্যাপ সিক্রেট যুক্ত রয়েছে)
                  </h4>
                  <span className="bg-teal-200 text-teal-900 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                    Environment Secrets
                  </span>
                </div>
                <p className="text-xs text-teal-900 leading-relaxed">
                  আপনার ক্লাউড এনভায়রনমেন্ট সিক্রেট থেকে Google Service Account কি ও স্প্রেডশিট আইডি সরাসরি অ্যাপের ব্যাকএন্ডে সংযুক্ত রয়েছে।
                </p>
                <div className="pt-1 flex flex-wrap gap-2 text-[11px] font-mono font-semibold text-teal-900">
                  {envSecretsStatus.hasEnvPrivateKey && (
                    <span className="px-2 py-0.5 bg-teal-100 rounded-md border border-teal-200">✓ GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY</span>
                  )}
                  {envSecretsStatus.hasEnvServiceAccountEmail && (
                    <span className="px-2 py-0.5 bg-teal-100 rounded-md border border-teal-200">✓ GOOGLE_SERVICE_ACCOUNT_EMAIL</span>
                  )}
                  {envSecretsStatus.hasEnvSpreadsheetId && (
                    <span className="px-2 py-0.5 bg-teal-100 rounded-md border border-teal-200">✓ GOOGLE_SHEETS_SPREADSHEET_ID</span>
                  )}
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-950 rounded-md border border-emerald-300 font-bold">✓ DEFAULT_CURRENCY=SAR (Fixed Currency)</span>
                </div>
              </div>
            </div>
          )}

          {/* Main Configuration Card */}
          <div className="bg-white rounded-2xl border border-emerald-200/90 p-5 sm:p-6 space-y-6 shadow-sm">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-100">
              <div>
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-emerald-700" />
                  <h3 className="text-base sm:text-lg font-bold text-emerald-950">
                    Google Service Account & Sheet Configuration (গুগল শিট ও জেসন কি কনফিগারেশন)
                  </h3>
                </div>
                <p className="text-xs text-emerald-700 mt-0.5">
                  গুগল ক্লাউড থেকে ডাউনলোড করা <code className="font-mono bg-emerald-100 text-emerald-900 px-1 rounded">.json</code> ফাইলটি আপলোড করুন। ডাটা স্বয়ংক্রিয়ভাবে ফিল্ডগুলোতে বসে যাবে এবং ফায়ারবেসে সেভ হবে।
                </p>
              </div>

              {/* Quick toggle for JSON Paste */}
              <div className="flex items-center bg-emerald-50 p-1 rounded-xl border border-emerald-200 self-start sm:self-auto text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setKeyInputMode('upload')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    keyInputMode === 'upload'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-emerald-800 hover:text-emerald-950'
                  }`}
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload JSON File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setKeyInputMode('paste')}
                  className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    keyInputMode === 'paste'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'text-emerald-800 hover:text-emerald-950'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Paste JSON Text</span>
                </button>
              </div>
            </div>

            {/* SECTION 1: JSON FILE UPLOAD / DRAG & DROP ZONE */}
            <div className="space-y-4">
              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleJsonFileUpload}
                className="hidden"
                id="google-sheets-json-file-input"
              />

              {keyInputMode === 'upload' ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 sm:p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-emerald-600 bg-emerald-100/60 scale-[1.01]'
                      : uploadedFileName
                      ? 'border-emerald-400 bg-emerald-50/70'
                      : 'border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/70'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-xs">
                      {uploadedFileName ? <ShieldCheck className="w-6 h-6 text-emerald-700" /> : <UploadCloud className="w-6 h-6 text-emerald-700" />}
                    </div>

                    <div className="text-center sm:text-left">
                      {uploadedFileName ? (
                        <div>
                          <div className="flex items-center justify-center sm:justify-start gap-2">
                            <span className="font-bold text-emerald-950 text-sm sm:text-base">
                              {uploadedFileName}
                            </span>
                            <span className="bg-emerald-200 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {uploadedFileSize || 'JSON Key Loaded'}
                            </span>
                          </div>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            ✓ জেসন ফাইলটি প্রসেস হয়েছে এবং নিচের ফিল্ডগুলোতে ডাটা বসে গেছে। পরিবর্তন করতে চাইলে নতুন ফাইল ড্রপ করুন।
                          </p>
                        </div>
                      ) : (
                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-emerald-950">
                            Upload Service Account JSON Key (জেসন কি ফাইল আপলোড করুন)
                          </h4>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            এখানে <strong>.json</strong> ফাইলটি টেনে এনে ড্রপ করুন অথবা ব্রাউজ করতে ক্লিক করুন।
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="sm:ml-auto">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs sm:text-sm font-bold shadow-xs transition-colors">
                        <FolderOpen className="w-4 h-4" />
                        <span>{uploadedFileName ? 'Choose Another JSON' : 'Browse JSON File'}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Paste JSON text area */
                <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <label className="block text-xs font-bold text-emerald-900">
                    Paste Google Service Account JSON Content
                  </label>
                  <textarea
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder={`{\n  "type": "service_account",\n  "project_id": "your-project-id",\n  "private_key": "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n",\n  "client_email": "expense-sync@your-project.iam.gserviceaccount.com"\n}`}
                    rows={5}
                    className="w-full p-3 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-200 text-emerald-950 outline-hidden font-mono text-xs"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-emerald-700">
                      জেসন পেস্ট করে Parse বাটনে ক্লিক করলেই ফিল্ডগুলো পূরণ হবে।
                    </span>
                    <button
                      type="button"
                      onClick={() => handleParseJsonCredentials(jsonInput)}
                      disabled={!jsonInput.trim()}
                      className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Parse & Auto-Fill Fields</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2: SPECIFIC INPUT FIELDS (সুনির্দিষ্ট ফিল্ডসমূহ - সবসময় দৃশ্যমান) */}
            <div className="pt-2 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs sm:text-sm font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-700" />
                  <span>Configured Credentials & Parameters (সুনির্দিষ্ট ফিল্ডসমূহ)</span>
                </h4>
                {uploadedFileName && (
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3 text-emerald-600" />
                    Auto-Filled from JSON
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
                {/* Service Account Email */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-emerald-900">
                      Service Account Client Email (সার্ভিস একাউন্ট ইমেইল) *
                    </label>
                    {serviceAccountEmail && (
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer"
                        title="Copy email to share in Google Sheet"
                      >
                        {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedEmail ? 'Copied!' : 'Copy Email'}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="email"
                    value={serviceAccountEmail}
                    onChange={(e) => setServiceAccountEmail(e.target.value)}
                    placeholder="expense-sync@your-project.iam.gserviceaccount.com"
                    className="w-full p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 focus:bg-white focus:ring-2 focus:ring-emerald-200 text-emerald-950 outline-hidden font-mono"
                  />
                  <p className="text-[11px] text-emerald-600 mt-1">
                    এই ইমেইলটিকে আপনার গুগল শিটে <strong>Editor</strong> পারমিশন দিতে হবে।
                  </p>
                </div>

                {/* Google Cloud Project ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-emerald-900">
                      Google Cloud Project ID (প্রজেক্ট আইডি) *
                    </label>
                    {projectId && (
                      <button
                        type="button"
                        onClick={handleCopyProjectId}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedProjectId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedProjectId ? 'Copied!' : 'Copy ID'}</span>
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    placeholder="alfalak-expense-cloud"
                    className="w-full p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 focus:bg-white focus:ring-2 focus:ring-emerald-200 text-emerald-950 outline-hidden font-mono"
                  />
                  <p className="text-[11px] text-emerald-600 mt-1">
                    JSON আপলোড করলে এটি স্বয়ংক্রিয়ভাবে পূরণ হয়।
                  </p>
                </div>

                {/* Target Google Spreadsheet ID */}
                <div>
                  <label className="block font-bold text-emerald-900 mb-1">
                    Target Spreadsheet ID or Full URL (গুগল শিট আইডি বা লিঙ্ক) *
                  </label>
                  <input
                    type="text"
                    value={spreadsheetId}
                    onChange={(e) => handleSpreadsheetIdChange(e.target.value)}
                    placeholder="1Saudi_ExpenseSheet_2026_SampleID or https://docs.google.com/spreadsheets/d/..."
                    className="w-full p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 focus:bg-white focus:ring-2 focus:ring-emerald-200 text-emerald-950 outline-hidden font-mono"
                  />
                  <p className="text-[11px] text-emerald-600 mt-1">
                    গুগল শিট থেকে পুরো ব্রাউজার URL পেস্ট করলেও ID অটো-এক্সট্র্যাক্ট হয়ে যাবে।
                  </p>
                </div>

                {/* Sheet Tab Name */}
                <div>
                  <label className="block font-bold text-emerald-900 mb-1">
                    Sheet Tab Name (শিটের ট্যাবের নাম) *
                  </label>
                  <input
                    type="text"
                    value={sheetName}
                    onChange={(e) => setSheetName(e.target.value)}
                    placeholder="Expenses"
                    className="w-full p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 focus:bg-white focus:ring-2 focus:ring-emerald-200 text-emerald-950 outline-hidden"
                  />
                  <p className="text-[11px] text-emerald-600 mt-1">
                    আপনার স্প্রেডশিটের নিচের ট্যাবের নাম (ডিফল্ট: <code className="font-mono text-emerald-800">Expenses</code>)।
                  </p>
                </div>

                {/* Service Account Private Key */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Service Account RSA Private Key (PEM format)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {sheetsConfig.hasEncryptedPrivateKey && !isEditingKey && (
                        <span className="text-[11px] text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Encrypted in Firebase
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsEditingKey(!isEditingKey)}
                        className="text-[11px] text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer"
                      >
                        {isEditingKey ? 'Hide Plain Key' : 'Edit / View Key Input'}
                      </button>
                    </div>
                  </div>

                  {isEditingKey ? (
                    <textarea
                      value={serviceAccountPrivateKey}
                      onChange={(e) => setServiceAccountPrivateKey(e.target.value)}
                      placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...&#10;-----END PRIVATE KEY-----"
                      rows={3}
                      className="w-full p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 focus:bg-white focus:ring-2 focus:ring-emerald-200 text-emerald-950 outline-hidden font-mono text-xs"
                    />
                  ) : (
                    <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
                      <div className="flex items-center gap-2">
                        <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-mono text-[11px]">
                          •••••••••••••••••••••••••••••••• [AES-256 Encrypted Private Key Stored in Firebase]
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-700 font-semibold">
                        Permanent Storage Active
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-emerald-600 mt-1">
                    সেভ করার সাথে সাথে এই প্রাইভেট কি-টি AES-256 এনক্রিপ্ট হয়ে ফায়ারবেসে স্থায়ীভাবে সংরক্ষিত থাকবে।
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 3: ACTION BUTTONS & CLOUD PERSISTENCE */}
            <div className="pt-4 border-t border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSaveConfiguration}
                  disabled={isSaving}
                  className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm cursor-pointer shadow-xs transition-all flex items-center gap-2 ${
                    saveSuccessTick
                      ? 'bg-emerald-600 ring-2 ring-emerald-400'
                      : isSaving
                      ? 'bg-emerald-500/80 cursor-not-allowed'
                      : 'bg-emerald-700 hover:bg-emerald-800 active:scale-95'
                  }`}
                >
                  {saveSuccessTick ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white animate-pulse" />
                      <span>✓ Saved to Firebase! (ফায়ারবেসে সেভ হয়েছে)</span>
                    </>
                  ) : isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving to Firebase... (ফায়ারবেসে সেভ হচ্ছে...)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Save & Encrypt to Firebase (সেভ ও এনক্রিপ্ট করুন)</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !spreadsheetId}
                  className="px-5 py-2.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-950 font-bold text-xs sm:text-sm cursor-pointer border border-emerald-300 shadow-xs transition-colors flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 text-emerald-700 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testing Connection...' : 'Test Connection (কানেকশন টেস্ট)'}</span>
                </button>
              </div>

              {serviceAccountEmail && (
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold border border-emerald-200 cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
                >
                  {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-emerald-700" />}
                  <span>{copiedEmail ? 'Email Copied!' : 'Copy Service Email'}</span>
                </button>
              )}
            </div>

            {/* Inline Feedback Banner for Settings Save */}
            {syncFeedback && (
              <div
                className={`p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-xs ${
                  syncFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                    : 'bg-rose-50 text-rose-950 border border-rose-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {syncFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                  <span>{syncFeedback.text}</span>
                </div>
                <button
                  onClick={() => setSyncFeedback(null)}
                  className="text-xs font-bold px-2 py-1 hover:bg-black/10 rounded-md cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Test Result Display */}
            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs sm:text-sm ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                  )}
                  <span>
                    {testResult.success
                      ? 'Google Sheets API Connection Verified! (কানেকশন সফল)'
                      : 'Connection Verification Failed (কানেকশন ব্যর্থ)'}
                  </span>
                </div>
                {testResult.success ? (
                  <p className="text-emerald-800">
                    Successfully connected to spreadsheet: <strong>{testResult.spreadsheetTitle}</strong>. Read and write permissions are verified.
                  </p>
                ) : (
                  <p className="text-rose-800">
                    {testResult.error || 'Please make sure the Google Sheet is shared with the Service Account email with Editor permission.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: SYNC LOGS */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-emerald-200/90 p-5 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-emerald-950">Sync History & Audit Trail</h3>
          {syncLogs.length === 0 ? (
            <div className="p-8 text-center text-xs sm:text-sm text-emerald-600">No sync logs recorded yet.</div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {syncLogs.map((log, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 text-xs flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-emerald-950">{log.operation}</span>
                    <p className="text-emerald-800 mt-0.5">{log.details}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        log.status === 'success' ? 'bg-emerald-200 text-emerald-900' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {log.status}
                    </span>
                    <div className="text-[10px] text-emerald-600 mt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Sub-Tab 4: SETUP GUIDE */}
      {activeTab === 'guide' && (
        <div className="bg-white rounded-2xl border border-emerald-200/90 p-5 sm:p-6 shadow-sm space-y-5 text-xs sm:text-sm text-emerald-950">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-emerald-950">
              How to Get Google Service Account JSON Key (১ মিনিটে গুগল শিট কি পাওয়ার নিয়ম)
            </h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              Follow these simple steps to generate and download the Service Account JSON Key from Google Cloud Console.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <span className="font-bold text-emerald-900 block text-sm">
                Step 1: Download Service Account JSON Key
              </span>
              <ol className="list-decimal pl-4 space-y-1.5 text-emerald-800 text-xs font-medium">
                <li>
                  Open <a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-bold inline-flex items-center gap-1">Google Cloud IAM <ExternalLink className="w-3 h-3 inline" /></a>
                </li>
                <li>Select or create your Project.</li>
                <li>Click on your Service Account (e.g., <code className="font-mono bg-emerald-100 px-1 rounded">expense-sync</code>).</li>
                <li>Go to the <strong>Keys</strong> tab at the top.</li>
                <li>Click <strong>Add Key</strong> &gt; <strong>Create new key</strong>.</li>
                <li>Select <strong>JSON</strong> and click <strong>Create</strong>. A <code className="font-mono bg-emerald-100 px-1 rounded">.json</code> file will automatically download.</li>
              </ol>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
              <span className="font-bold text-emerald-900 block text-sm">
                Step 2: Upload Key & Share Your Sheet
              </span>
              <ol className="list-decimal pl-4 space-y-1.5 text-emerald-800 text-xs font-medium">
                <li>
                  In this app, click <strong>Upload JSON File</strong> in the Google API Configuration tab and drop the downloaded <code className="font-mono bg-emerald-100 px-1 rounded">.json</code> file.
                </li>
                <li>Open your Google Spreadsheet in a new browser tab.</li>
                <li>
                  Click the <strong>Share</strong> button at the top right of your Google Sheet.
                </li>
                <li>
                  Paste the <strong>Service Account Client Email</strong> and select <strong>Editor</strong> permission.
                </li>
                <li>Click <strong>Test Connection</strong> and then <strong>Save Configuration</strong>!</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
