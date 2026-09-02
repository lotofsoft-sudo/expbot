import React, { useState } from 'react';
import { AppSettings } from '../types';
import {
  Settings,
  Bot,
  FileSpreadsheet,
  Database,
  Save,
  CheckCircle2,
  Key,
  Globe,
  DollarSign,
  Building2,
  RotateCcw,
  Sparkles
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  appSettings: AppSettings;
  onSaveSettings: (settings: AppSettings) => Promise<void>;
  onResetData: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  appSettings,
  onSaveSettings,
  onResetData
}) => {
  const [formData, setFormData] = useState<AppSettings>({ ...appSettings });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      await onSaveSettings(formData);
      setSaveMessage('Settings saved successfully!');
      setTimeout(() => {
        setSaveMessage(null);
        onClose();
      }, 1200);
    } catch (err: any) {
      setSaveMessage('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl border border-emerald-200 max-w-2xl w-full p-6 sm:p-7 space-y-6 shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-700 text-white flex items-center justify-center shadow-xs">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-emerald-950">
                System Settings & Configuration
              </h2>
              <p className="text-xs text-emerald-700 mt-0.5">
                Telegram bot, Google Sheets, and general system settings
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center cursor-pointer"
          >
            ✕
          </button>
        </div>

        {saveMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5 text-xs sm:text-sm">
          {/* Section 1: Telegram Bot Integration */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-3">
            <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2 border-b border-emerald-200/60 pb-2">
              <Bot className="w-4 h-4 text-emerald-700" />
              <span>Telegram Bot Credentials</span>
            </h3>

            <div>
              <label className="block font-bold text-emerald-900 mb-1">Telegram Bot API Token</label>
              <input
                type="text"
                value={formData.telegramBotToken || ''}
                onChange={(e) => setFormData({ ...formData, telegramBotToken: e.target.value })}
                placeholder="7123456789:AAH..."
                className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-200 outline-hidden font-mono text-emerald-950"
              />
            </div>
          </div>

          {/* Section 2: General App Preferences */}
          <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-3">
            <h3 className="font-bold text-sm text-emerald-950 flex items-center gap-2 border-b border-emerald-200/60 pb-2">
              <Globe className="w-4 h-4 text-emerald-700" />
              <span>General Preferences & Currency</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-emerald-900">Currency Standard</label>
                  <span className="text-[10px] bg-emerald-100 text-emerald-900 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                    Secret: SAR Only
                  </span>
                </div>
                <select
                  value="SAR"
                  disabled
                  className="w-full p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-300 text-emerald-950 font-bold cursor-not-allowed"
                >
                  <option value="SAR">SAR (Saudi Riyal - 🇸🇦 ر.س)</option>
                </select>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Corporate expense currency is strictly locked to <strong>SAR</strong> via Environment Secret.
                </p>
              </div>

              <div>
                <label className="block font-bold text-emerald-900 mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  value={formData.companyName || 'Al-Falak Enterprises KSA'}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 focus:ring-2 focus:ring-emerald-200 outline-hidden text-emerald-950"
                />
              </div>

              <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="autoSync"
                  checked={formData.autoSyncToSheets}
                  onChange={(e) => setFormData({ ...formData, autoSyncToSheets: e.target.checked })}
                  className="w-4 h-4 text-emerald-700 rounded-md border-emerald-300 focus:ring-emerald-400"
                />
                <label htmlFor="autoSync" className="font-semibold text-emerald-900 text-xs sm:text-sm cursor-pointer">
                  Automatically sync every new expense to Google Sheets
                </label>
              </div>
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-emerald-100">
            <button
              type="button"
              onClick={onResetData}
              className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors cursor-pointer border border-rose-200"
            >
              Reset Sample Data
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 font-semibold text-xs sm:text-sm cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
