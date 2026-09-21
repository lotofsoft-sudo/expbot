import React, { useState, useEffect } from 'react';
import { BotQuestion, QuestionType, LanguageMode } from '../types';
import { DEFAULT_BOT_QUESTIONS } from '../data/defaultQuestions';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Save,
  Sliders,
  CheckCircle2,
  HelpCircle,
  Eye,
  RotateCcw,
  Languages,
  Sparkles,
  Layers,
  FileCheck,
  Check,
  Edit3
} from 'lucide-react';

interface CategoryOptionsEditorProps {
  options: string[];
  onChangeOptions: (newOptions: string[]) => void;
  questionKey?: string;
}

const CategoryOptionsEditor: React.FC<CategoryOptionsEditorProps> = ({
  options = [],
  onChangeOptions,
  questionKey
}) => {
  const [newOptionInput, setNewOptionInput] = useState<string>('');
  const [showBulkInput, setShowBulkInput] = useState<boolean>(false);

  const handleAddOption = (textToAdd?: string) => {
    const val = (textToAdd || newOptionInput).trim();
    if (!val) return;
    if (options.includes(val)) return;
    onChangeOptions([...options, val]);
    if (!textToAdd) setNewOptionInput('');
  };

  const handleEditOption = (index: number, val: string) => {
    const updated = [...options];
    updated[index] = val;
    onChangeOptions(updated);
  };

  const handleDeleteOption = (index: number) => {
    const updated = options.filter((_, i) => i !== index);
    onChangeOptions(updated);
  };

  const handleMoveOption = (index: number, dir: 'up' | 'down') => {
    if ((dir === 'up' && index === 0) || (dir === 'down' && index === options.length - 1)) return;
    const targetIdx = dir === 'up' ? index - 1 : index + 1;
    const updated = [...options];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    onChangeOptions(updated);
  };

  const presetCategories = [
    'Equipment Rental / ইকুইপমেন্ট ভাড়া',
    'Marketing & Advertising / মার্কেটিং ও বিজ্ঞাপন',
    'Office Rent & Utilities / অফিস ভাড়া ও তথ্যপ্রযুক্তি',
    'Government & License Fees / সরকারি ও লাইসেন্স ফি',
    'Consultancy & Professional Fees / আইনি ও পেশাদার ফি',
    'Maintenance & Repairs / মেরামত ও মেকানিক্যাল'
  ];

  return (
    <div className="sm:col-span-2 space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-emerald-300 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-100 pb-3">
        <div>
          <h4 className="font-bold text-sm sm:text-base text-emerald-950 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-700" />
            <span>{questionKey === 'category' ? 'Category Options Manager (ক্যাটাগরি কাস্টমাইজেশন)' : 'Quick Selection Options'}</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
              {options.length} {questionKey === 'category' ? 'Categories' : 'Options'}
            </span>
          </h4>
          <p className="text-xs text-emerald-700 mt-0.5">
            বট ফ্লো-তে কর্মচারীর সামনে এই ক্যাটাগরিগুলো কুইক বাটন হিসেবে দেখাবে। নতুন যোগ, এডিট বা রিমুভ করুন।
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowBulkInput(!showBulkInput)}
          className="text-xs font-bold text-emerald-800 hover:text-emerald-950 underline cursor-pointer self-start sm:self-auto"
        >
          {showBulkInput ? '← Visual Category List' : '⚡ Comma-separated Text Mode'}
        </button>
      </div>

      {/* Bulk Comma Separated Mode */}
      {showBulkInput ? (
        <div className="space-y-1.5 pt-1">
          <label className="block text-xs font-bold text-emerald-900">
            Comma Separated Values (কমা দিয়ে লেখা তালিকা):
          </label>
          <textarea
            rows={3}
            value={options.join(', ')}
            onChange={(e) =>
              onChangeOptions(
                e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
              )
            }
            placeholder="Category 1, Category 2, Category 3..."
            className="w-full p-2.5 rounded-xl border border-emerald-200 text-xs sm:text-sm font-mono text-emerald-950 focus:ring-2 focus:ring-emerald-300 focus:outline-hidden"
          />
        </div>
      ) : (
        /* Visual Category Manager List */
        <div className="space-y-2.5 pt-1">
          {options.length === 0 ? (
            <div className="p-4 text-center text-xs sm:text-sm text-slate-500 bg-emerald-50/50 rounded-xl border border-dashed border-emerald-200">
              No categories configured yet. Type a category name below to add one!
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {options.map((opt, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 hover:border-emerald-300 transition-all shadow-2xs"
                >
                  <span className="w-7 h-7 rounded-lg bg-emerald-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>

                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleEditOption(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-200 font-bold text-xs sm:text-sm text-emerald-950 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleMoveOption(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 disabled:opacity-30 border border-emerald-200 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveOption(idx, 'down')}
                      disabled={idx === options.length - 1}
                      className="p-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-800 disabled:opacity-30 border border-emerald-200 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteOption(idx)}
                      className="px-2 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 cursor-pointer ml-1"
                      title="Delete / Remove Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add New Category Input */}
          <div className="pt-3 border-t border-emerald-100 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newOptionInput}
                onChange={(e) => setNewOptionInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddOption();
                  }
                }}
                placeholder="Type new category name (e.g. Equipment Rental / ইকুইপমেন্ট ভাড়া)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-white border border-emerald-300 font-semibold text-xs sm:text-sm text-emerald-950 focus:ring-2 focus:ring-emerald-400 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => handleAddOption()}
                className="px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Category</span>
              </button>
            </div>

            {/* Quick Presets for Category */}
            {questionKey === 'category' && (
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-bold text-emerald-900">Quick Add Common Business Categories:</span>
                <div className="flex flex-wrap gap-1.5">
                  {presetCategories.map((preset, i) => {
                    const isAdded = options.includes(preset);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => !isAdded && handleAddOption(preset)}
                        disabled={isAdded}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 opacity-60 cursor-default'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-200 hover:border-emerald-300'
                        }`}
                      >
                        {isAdded ? `✓ ${preset.split(' / ')[0]}` : `+ ${preset}`}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface BotQuestionBuilderProps {
  questions: BotQuestion[];
  onSaveQuestions: (updated: BotQuestion[]) => void;
  onResetDefaults: () => void;
  appLanguage?: LanguageMode;
  onLanguageChange?: (lang: LanguageMode) => void;
}

export const BotQuestionBuilder: React.FC<BotQuestionBuilderProps> = ({
  questions,
  onSaveQuestions,
  onResetDefaults,
  appLanguage = 'en',
  onLanguageChange
}) => {
  const [questionList, setQuestionList] = useState<BotQuestion[]>(questions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [selectedLangMode, setSelectedLangMode] = useState<LanguageMode>(appLanguage || 'en');

  // Sync state if questions prop changes externally (e.g. Firestore sync)
  useEffect(() => {
    if (questions && questions.length > 0) {
      setQuestionList(questions);
    }
  }, [questions]);

  // Format question text based on active language mode
  const getDisplayQuestionText = (q: BotQuestion, mode: LanguageMode): string => {
    const num = q.order;
    if (mode === 'en') {
      return `${num}. ${q.questionEn || q.questionText}`;
    }
    if (mode === 'bn') {
      return `${num}. ${q.questionBn || q.questionText}`;
    }
    if (mode === 'ar') {
      return `${num}. ${q.questionAr || q.questionText}`;
    }
    if (mode === 'bn_en') {
      const bn = q.questionBn || q.questionText;
      const en = q.questionEn || '';
      return en ? `${num}. ${bn} / ${en}` : `${num}. ${bn}`;
    }
    if (mode === 'ar_en') {
      const ar = q.questionAr || q.questionText;
      const en = q.questionEn || '';
      return en ? `${num}. ${ar} / ${en}` : `${num}. ${ar}`;
    }
    return q.questionText;
  };

  useEffect(() => {
    if (appLanguage && appLanguage !== selectedLangMode) {
      setSelectedLangMode(appLanguage);
      handleLanguageModeChange(appLanguage as LanguageMode);
    }
  }, [appLanguage]);

  const handleLanguageModeChange = (mode: LanguageMode) => {
    setSelectedLangMode(mode);
    if (onLanguageChange) {
      onLanguageChange(mode);
    }
    // Update questionText to match chosen format
    const updated = questionList.map((q) => ({
      ...q,
      questionText: getDisplayQuestionText(q, mode)
    }));
    setQuestionList(updated);
  };

  const handleAddQuestion = () => {
    const newOrder = questionList.length + 1;
    const newQ: BotQuestion = {
      id: `q_custom_${Date.now()}`,
      order: newOrder,
      key: `custom_${newOrder}`,
      questionBn: 'নতুন খরচের তথ্য লিখুন',
      questionEn: 'Enter additional expense detail',
      questionAr: 'أدخل تفاصيل إضافية للمصروف',
      questionText: `${newOrder}. নতুন খরচের তথ্য লিখুন / Enter additional expense detail`,
      type: 'text',
      required: true,
      placeholder: 'Type answer...'
    };
    const updated = [...questionList, newQ];
    setQuestionList(updated);
    setEditingId(newQ.id);
  };

  const handleUpdateQuestion = (id: string, updates: Partial<BotQuestion>) => {
    const updated = questionList.map((q) => {
      if (q.id === id) {
        const merged = { ...q, ...updates };
        // If individual language text updated, keep questionText synced with active format
        if (updates.questionBn || updates.questionEn || updates.questionAr) {
          merged.questionText = getDisplayQuestionText(merged, selectedLangMode);
        }
        return merged;
      }
      return q;
    });
    setQuestionList(updated);
    onSaveQuestions(updated);
  };

  const handleDeleteQuestion = (id: string) => {
    const updated = questionList
      .filter((q) => q.id !== id)
      .map((q, idx) => ({
        ...q,
        order: idx + 1,
        questionText: getDisplayQuestionText({ ...q, order: idx + 1 }, selectedLangMode)
      }));
    setQuestionList(updated);
    onSaveQuestions(updated);
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === questionList.length - 1)
    ) {
      return;
    }

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...questionList];
    const temp = reordered[index];
    reordered[index] = reordered[targetIdx];
    reordered[targetIdx] = temp;

    const updated = reordered.map((q, idx) => ({
      ...q,
      order: idx + 1,
      questionText: getDisplayQuestionText({ ...q, order: idx + 1 }, selectedLangMode)
    }));
    setQuestionList(updated);
    onSaveQuestions(updated);
  };

  const handleSave = () => {
    onSaveQuestions(questionList);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleResetToStrictDefaults = () => {
    setQuestionList(DEFAULT_BOT_QUESTIONS);
    onResetDefaults();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="space-y-5 sm:space-y-6 font-sans">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-emerald-200/90 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <span>Bot Question Sequence & Multilingual Flow</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-emerald-950 mt-1">
            Expense Bot Questions (৮টি নির্ধারিত প্রশ্ন ও ক্রম)
          </h2>
          <p className="text-xs text-emerald-700 mt-0.5">
            Web Chat Bot ও Telegram Bot উভয়েই কর্মচারীকে এই প্রশ্নগুলো ক্রমান্বয়ে করবে। যেকোনো প্রশ্ন এডিট বা নতুন প্রশ্ন যোগ করা যাবে।
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const catQ = questionList.find((q) => q.key === 'category') || questionList[1];
              if (catQ) {
                setEditingId(catQ.id);
                setTimeout(() => {
                  const el = document.getElementById(`q_card_${catQ.id}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 active:scale-95 text-emerald-950 font-bold text-xs sm:text-sm flex items-center gap-1.5 transition-all border border-amber-500 cursor-pointer shadow-xs"
            title="Edit expense category options"
          >
            <Layers className="w-4 h-4 text-emerald-950" />
            <span>🏷️ Edit Categories (ক্যাটাগরি সমূহ)</span>
          </button>

          <button
            onClick={handleResetToStrictDefaults}
            className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors border border-emerald-200 cursor-pointer shadow-xs"
            title="Reset to standard default questions"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset 8 Questions (ডিফল্ট প্রশ্ন)</span>
          </button>

          <button
            onClick={handleAddQuestion}
            className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-colors border border-emerald-300 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Question (নতুন প্রশ্ন)</span>
          </button>

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Save All Questions (সংরক্ষণ করুন)</span>
          </button>
        </div>
      </div>

      {/* Language Selector Bar */}
      <div className="bg-emerald-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Languages className="w-5 h-5 text-emerald-300 shrink-0" />
          <div>
            <h4 className="font-bold text-sm sm:text-base text-white">Bot Language Display Format</h4>
            <p className="text-xs text-emerald-200">
              বটের প্রশ্ন দেখানোর ভাষা ফরম্যাট নির্বাচন করুন (বাংলা+English / Arabic+English / Individual)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'en', label: '🇬🇧 English Only (Default)' },
            { id: 'bn', label: '🇧🇩 বাংলা Only' },
            { id: 'ar', label: '🇸🇦 العربية Only' },
            { id: 'bn_en', label: '🇧🇩 + 🇬🇧 বাংলা + English' },
            { id: 'ar_en', label: '🇸🇦 + 🇬🇧 العربية + English' }
          ].map((lang) => (
            <button
              key={lang.id}
              onClick={() => handleLanguageModeChange(lang.id as LanguageMode)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                selectedLangMode === lang.id
                  ? 'bg-amber-400 text-emerald-950 border-amber-300 shadow-xs'
                  : 'bg-emerald-800/80 hover:bg-emerald-800 text-emerald-100 border-emerald-700'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Save Success Banner */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-700" />
          <span>Bot questions configuration saved successfully to Firebase Firestore!</span>
        </div>
      )}

      {/* Question Cards List */}
      <div className="space-y-3">
        {questionList.map((q, idx) => {
          const isEditing = editingId === q.id;

          return (
            <div
              key={q.id}
              id={`q_card_${q.id}`}
              className="bg-white rounded-2xl border border-emerald-200/90 p-4 sm:p-5 shadow-xs transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                    {idx + 1}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm sm:text-base text-emerald-950 leading-snug">
                      {q.questionText}
                    </h3>
                    
                    {/* Multilingual sub-previews */}
                    <div className="flex flex-wrap gap-2 text-[11px] text-emerald-800 pt-0.5">
                      {q.questionBn && (
                        <span className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                          🇧🇩 বাংলা: {q.questionBn}
                        </span>
                      )}
                      {q.questionAr && (
                        <span className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                          🇸🇦 العربية: {q.questionAr}
                        </span>
                      )}
                      {q.questionEn && (
                        <span className="bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-medium">
                          🇬🇧 En: {q.questionEn}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-emerald-700 flex items-center gap-2 pt-1">
                      <span>Field Key: <strong className="text-emerald-900 font-mono">{q.key}</strong></span>
                      <span>•</span>
                      <span>Input Type: <strong className="text-emerald-900 capitalize">{q.type}</strong></span>
                      <span>•</span>
                      <span className={q.required ? 'text-emerald-700 font-semibold' : 'text-slate-500'}>
                        {q.required ? 'Required *' : 'Optional'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleMove(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(idx, 'down')}
                    disabled={idx === questionList.length - 1}
                    className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingId(isEditing ? null : q.id)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold cursor-pointer ml-1"
                  >
                    {isEditing ? 'Close' : 'Edit (এডিট)'}
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 cursor-pointer"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Comprehensive Multilingual Editing Form */}
              {isEditing && (
                <div className="pt-4 border-t border-emerald-100 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs sm:text-sm bg-emerald-50/40 p-4 rounded-xl">
                  {/* Bengali Prompt */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-emerald-900 mb-1">
                      🇧🇩 বাংলা প্রশ্ন (Bengali Prompt) *
                    </label>
                    <input
                      type="text"
                      value={q.questionBn || ''}
                      onChange={(e) => handleUpdateQuestion(q.id, { questionBn: e.target.value })}
                      placeholder="যেমন: আপনার কত টাকা খরচ হয়েছে?"
                      className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-950 font-medium outline-hidden focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  {/* English Prompt */}
                  <div>
                    <label className="block font-bold text-emerald-900 mb-1">
                      🇬🇧 English Prompt *
                    </label>
                    <input
                      type="text"
                      value={q.questionEn || ''}
                      onChange={(e) => handleUpdateQuestion(q.id, { questionEn: e.target.value })}
                      placeholder="e.g. How much money was spent or do you want to spend? (SAR)"
                      className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-950 font-medium outline-hidden focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  {/* Arabic Prompt */}
                  <div>
                    <label className="block font-bold text-emerald-900 mb-1">
                      🇸🇦 العربية (Arabic Prompt)
                    </label>
                    <input
                      type="text"
                      value={q.questionAr || ''}
                      onChange={(e) => handleUpdateQuestion(q.id, { questionAr: e.target.value })}
                      placeholder="مثال: كم المبلغ الذي تم إنفاقه؟"
                      className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-950 font-medium outline-hidden focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  {/* Active Display Prompt (Custom) */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-emerald-900 mb-1">
                      Active Bot Display Prompt (বট সরাসরি যে টেক্সট দেখাবে)
                    </label>
                    <input
                      type="text"
                      value={q.questionText}
                      onChange={(e) => handleUpdateQuestion(q.id, { questionText: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-950 font-semibold outline-hidden focus:ring-2 focus:ring-emerald-200"
                    />
                  </div>

                  {/* Target Field */}
                  <div>
                    <label className="block font-bold text-emerald-900 mb-1">Target Expense Field</label>
                    <select
                      value={q.key}
                      onChange={(e) => handleUpdateQuestion(q.id, { key: e.target.value })}
                      className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-950 font-bold outline-hidden"
                    >
                      <option value="amount">amount (Q1: খরচ / Requested Amount)</option>
                      <option value="category">category (Q2: খরচের কারণ / Purpose)</option>
                      <option value="description">description (Q3: বিস্তারিত বিবরণ / Description)</option>
                      <option value="totalAmount">totalAmount (Q4: মূল্যের পরিমাণ / Cost Confirmation)</option>
                      <option value="vatStatus">vatStatus (Q5: ভ্যাট সহ নাকি উইদাউট ভ্যাট / VAT)</option>
                      <option value="paymentMethod">paymentMethod (Q6: ক্যাশ নাকি ব্যাংক / Payment Mode)</option>
                      <option value="project">project (Q7: প্রজেক্টের নাম / Project)</option>
                      <option value="approvedBy">approvedBy (Q8: অনুমোদনকারীর নাম / Approver)</option>
                      <option value="receiptUrl">receiptUrl (Q9: ইনভয়েসের ছবি / Receipt Image)</option>
                      <option value="date">date (Expense Date)</option>
                      <option value="custom">custom (Custom Field)</option>
                    </select>
                  </div>

                  {/* Input Type */}
                  <div>
                    <label className="block font-bold text-emerald-900 mb-1">Input Response Type</label>
                    <select
                      value={q.type}
                      onChange={(e) => handleUpdateQuestion(q.id, { type: e.target.value as QuestionType })}
                      className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-950 font-bold outline-hidden"
                    >
                      <option value="number">Number (সংখ্যার ইনপুট)</option>
                      <option value="text">Text (লেখা ইনপুট)</option>
                      <option value="select">Select / Multiple Choice (অপশন নির্বাচন)</option>
                      <option value="receipt">Receipt File / Camera Photo (ইনভয়েসের ছবি)</option>
                      <option value="date">Date Picker (তারিখ)</option>
                    </select>
                  </div>

                  {/* Placeholder */}
                  <div>
                    <label className="block font-bold text-emerald-900 mb-1">Placeholder Text</label>
                    <input
                      type="text"
                      value={q.placeholder || ''}
                      onChange={(e) => handleUpdateQuestion(q.id, { placeholder: e.target.value })}
                      placeholder="e.g. 250 SAR"
                      className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-950 font-medium outline-hidden"
                    />
                  </div>

                  {/* Help text */}
                  <div>
                    <label className="block font-bold text-emerald-900 mb-1">Help Hint Text</label>
                    <input
                      type="text"
                      value={q.helpText || ''}
                      onChange={(e) => handleUpdateQuestion(q.id, { helpText: e.target.value })}
                      placeholder="e.g. Enter amount in SAR"
                      className="w-full p-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-950 font-medium outline-hidden"
                    />
                  </div>

                  {/* Options if select or category question */}
                  {(q.type === 'select' || q.key === 'category' || (q.options && q.options.length > 0)) && (
                    <CategoryOptionsEditor
                      options={q.options || []}
                      onChangeOptions={(newOpts) => handleUpdateQuestion(q.id, { options: newOpts })}
                      questionKey={q.key}
                    />
                  )}

                  <div className="sm:col-span-2 flex items-center justify-between pt-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-emerald-900">
                      <input
                        type="checkbox"
                        checked={q.required}
                        onChange={(e) => handleUpdateQuestion(q.id, { required: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                      />
                      <span>Required question (এই প্রশ্নের উত্তর দেওয়া বাধ্যতামূলক)</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs cursor-pointer shadow-xs"
                    >
                      Done Editing (সম্পন্ন)
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
