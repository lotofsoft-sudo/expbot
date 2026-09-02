import React, { useState, useEffect, useRef } from 'react';
import { BotQuestion, ChatMessage, Expense, AppUser, AppSettings, ApprovalPdfConfig, LanguageMode } from '../types';
import { compressImageFile } from '../lib/imageUtils';
import { ApprovalVoucherModal } from './ApprovalVoucherModal';
import {
  Send,
  Bot,
  User,
  Paperclip,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  Camera,
  FileText,
  DollarSign,
  Calendar,
  Tag,
  Check,
  AlertCircle,
  HelpCircle,
  FileSpreadsheet,
  Database,
  ArrowRight,
  PlusCircle,
  Layers,
  FileCheck,
  Languages,
  ShieldCheck,
  Building,
  CreditCard
} from 'lucide-react';

interface WebChatProps {
  currentUser: AppUser;
  botQuestions: BotQuestion[];
  appSettings: AppSettings;
  onExpenseSubmitted: (expense: Expense) => void;
  recentExpenses: Expense[];
  onSavePdfConfig?: (newConfig: ApprovalPdfConfig) => Promise<void>;
  appLanguage?: LanguageMode;
  onLanguageChange?: (lang: LanguageMode) => void;
}

export const WebChat: React.FC<WebChatProps> = ({
  currentUser,
  botQuestions,
  appSettings,
  onExpenseSubmitted,
  recentExpenses,
  onSavePdfConfig,
  appLanguage = 'en',
  onLanguageChange
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentAnswers, setCurrentAnswers] = useState<Partial<Expense>>({
    currency: 'SAR',
    date: new Date().toISOString().split('T')[0]
  });
  const [inputVal, setInputVal] = useState<string>('');
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [receiptFile, setReceiptFile] = useState<{ url: string; name: string } | null>(null);
  const [isAiMode, setIsAiMode] = useState<boolean>(false);
  const [langMode, setLangMode] = useState<LanguageMode>(appLanguage || 'en');

  // Sync langMode when parent appLanguage changes
  useEffect(() => {
    if (appLanguage && appLanguage !== langMode) {
      setLangMode(appLanguage);
      startNewExpenseFlow(appLanguage);
    }
  }, [appLanguage]);

  // Multi-Expense Batch Session Tracking
  const [sessionExpenses, setSessionExpenses] = useState<Expense[]>([]);
  const [isAwaitingAnotherExpenseChoice, setIsAwaitingAnotherExpenseChoice] = useState<boolean>(false);
  const [pendingCurrentExpense, setPendingCurrentExpense] = useState<Expense | null>(null);

  // PDF Voucher Preview Modal
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);
  const [pdfExpenses, setPdfExpenses] = useState<Expense[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const getQuestionDisplay = (q: BotQuestion, mode: LanguageMode): string => {
    if (!q) return '';
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

  const getWelcomeText = (mode: LanguageMode): string => {
    return `Welcome ${currentUser.displayName}! 👋 Welcome to Smart Expense Bot (Saudi Arabia • SAR).\n\nYou can submit a single expense or multiple expenses in one session. Please answer the 8 standard questions below.`;
  };

  // Initialize chat flow when component mounts or bot questions change
  useEffect(() => {
    if (botQuestions.length > 0 && messages.length === 0) {
      startNewExpenseFlow(langMode);
    }
  }, [botQuestions]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiProcessing]);

  const startNewExpenseFlow = (mode = langMode) => {
    setCurrentStepIndex(0);
    setCurrentAnswers({
      currency: 'SAR',
      date: new Date().toISOString().split('T')[0]
    });
    setReceiptFile(null);
    setSessionExpenses([]);
    setIsAwaitingAnotherExpenseChoice(false);
    setPendingCurrentExpense(null);

    const firstQuestion = botQuestions[0];
    const initialMsgs: ChatMessage[] = [
      {
        id: 'msg_welcome',
        sender: 'bot',
        text: getWelcomeText(mode),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    if (firstQuestion) {
      initialMsgs.push({
        id: `msg_q_${firstQuestion.id}`,
        sender: 'bot',
        text: `Expense #1: ${getQuestionDisplay(firstQuestion, mode)}`,
        options: firstQuestion.options,
        fieldKey: firstQuestion.key,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    setMessages(initialMsgs);
  };

  const startNextExpenseInSession = (accumulatedList: Expense[], mode = langMode) => {
    setCurrentStepIndex(0);
    setCurrentAnswers({
      currency: 'SAR',
      date: new Date().toISOString().split('T')[0]
    });
    setReceiptFile(null);
    setIsAwaitingAnotherExpenseChoice(false);
    setPendingCurrentExpense(null);

    const nextItemNumber = accumulatedList.length + 1;
    const firstQuestion = botQuestions[0];

    const nextMsgs: ChatMessage[] = [
      {
        id: `msg_next_item_intro_${Date.now()}`,
        sender: 'bot',
        text: `➕ Starting Expense #${nextItemNumber} in this session.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];

    if (firstQuestion) {
      nextMsgs.push({
        id: `msg_q_${firstQuestion.id}_${Date.now()}`,
        sender: 'bot',
        text: `Expense #${nextItemNumber}: ${getQuestionDisplay(firstQuestion, mode)}`,
        options: firstQuestion.options,
        fieldKey: firstQuestion.key,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }

    setMessages((prev) => [...prev, ...nextMsgs]);
  };

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputVal.trim();
    if (!text && !receiptFile) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: text || (receiptFile ? `[Attached Invoice: ${receiptFile.name}]` : ''),
      receiptData: receiptFile || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');

    // Handle "Another Expense" decision state
    if (isAwaitingAnotherExpenseChoice) {
      const lower = text.toLowerCase();
      if (lower.includes('yes') || lower.includes('add another')) {
        startNextExpenseInSession(sessionExpenses);
      } else if (lower.includes('no') || lower.includes('submit') || lower.includes('finalize') || lower.includes('done')) {
        finalizeBatchSession(sessionExpenses);
      } else {
        setIsAwaitingAnotherExpenseChoice(false);
        if (isAiMode || (text.length > 10 && text.includes(' '))) {
          handleAiNaturalParse(text);
        } else {
          startNextExpenseInSession(sessionExpenses);
        }
      }
      return;
    }

    // If AI Mode or user pastes a full sentence
    if (isAiMode || (currentStepIndex === 0 && text.length > 20 && text.includes(' '))) {
      handleAiNaturalParse(text);
      return;
    }

    // Standard manual step processing for 9 questions
    const currentQ = botQuestions[currentStepIndex];
    if (!currentQ) return;

    const updatedAnswers = { ...currentAnswers };

    // Q1: Amount
    if (currentQ.key === 'amount') {
      const num = parseFloat(text.replace(/[^0-9.]/g, ''));
      const val = isNaN(num) ? 0 : num;
      updatedAnswers.amount = val;
      if (!updatedAnswers.totalAmount) updatedAnswers.totalAmount = val;
    }
    // Q2: Category / Purpose
    else if (currentQ.key === 'category') {
      updatedAnswers.category = text;
    }
    // Q3: Description
    else if (currentQ.key === 'description') {
      updatedAnswers.description = text;
    }
    // Q4: Total Value / Amount Confirmation
    else if (currentQ.key === 'totalAmount') {
      const num = parseFloat(text.replace(/[^0-9.]/g, ''));
      const val = isNaN(num) ? (updatedAnswers.amount || 0) : num;
      updatedAnswers.totalAmount = val;
      if (!updatedAnswers.amount) updatedAnswers.amount = val;
    }
    // Q5: VAT Status
    else if (currentQ.key === 'vatStatus') {
      updatedAnswers.vatStatus = text;
    }
    // Q6: Payment Method (Cash or Bank)
    else if (currentQ.key === 'paymentMethod') {
      updatedAnswers.paymentMethod = text;
    }
    // Q7: Project
    else if (currentQ.key === 'project') {
      updatedAnswers.project = text;
    }
    // Q8: Approver Name
    else if (currentQ.key === 'approvedBy') {
      updatedAnswers.approvedBy = text;
    }
    // Q9: Receipt File / Photo
    else if (currentQ.key === 'receiptUrl') {
      if (receiptFile) {
        updatedAnswers.receiptUrl = receiptFile.url;
        updatedAnswers.receiptName = receiptFile.name;
      } else if (text && !text.toLowerCase().includes('skip') && !text.toLowerCase().includes('না') && !text.toLowerCase().includes('নেই')) {
        updatedAnswers.receiptUrl = text;
      }
    } else {
      // Fallback
      (updatedAnswers as any)[currentQ.key] = text;
    }

    setCurrentAnswers(updatedAnswers);

    const nextIndex = currentStepIndex + 1;

    if (nextIndex < botQuestions.length) {
      setCurrentStepIndex(nextIndex);
      const nextQ = botQuestions[nextIndex];
      const itemNum = sessionExpenses.length + 1;
      
      // Default quick options if question is receipt upload
      const options = nextQ.type === 'receipt'
        ? (receiptFile ? ['📸 Invoice Attached / ছবি দিয়েছি ✅', 'Skip / রসিদ নেই'] : ['📸 Attach Invoice Photo (ছবি আপলোড)', 'No Receipt Available / রসিদ নেই'])
        : nextQ.options;

      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_q_${nextQ.id}_${Date.now()}`,
            sender: 'bot',
            text: `Expense #${itemNum}: ${getQuestionDisplay(nextQ, langMode)}`,
            options,
            fieldKey: nextQ.key,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, 350);
    } else {
      // All 9 questions answered -> complete current item
      completeCurrentItemAndAskMore(updatedAnswers);
    }
  };

  const handleAiNaturalParse = async (text: string) => {
    setIsAiProcessing(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `msg_ai_proc_${Date.now()}`,
        sender: 'system',
        text: 'Analyzing expense details with Gemini AI...',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    try {
      const res = await fetch('/api/parse-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: text })
      });
      const data = await res.json();

      setIsAiProcessing(false);

      if (data.parsed) {
        const parsed = data.parsed;
        const fullExpense: Partial<Expense> = {
          amount: parsed.amount || 0,
          currency: 'SAR',
          category: parsed.category || 'Miscellaneous Business',
          description: parsed.description || text,
          totalAmount: parsed.amount || 0,
          vatStatus: parsed.vatStatus || 'Without VAT',
          paymentMethod: parsed.paymentMethod || 'Cash',
          project: parsed.project || 'General Project',
          approvedBy: currentUser.displayName,
          date: parsed.date || new Date().toISOString().split('T')[0],
          receiptUrl: receiptFile?.url,
          receiptName: receiptFile?.name
        };

        setCurrentAnswers(fullExpense);

        setMessages((prev) => [
          ...prev,
          {
            id: `msg_ai_confirm_${Date.now()}`,
            sender: 'bot',
            text: `Extracted Expense Details (Expense #${sessionExpenses.length + 1}):\n💰 Amount: ${fullExpense.amount} SAR\n📁 Category: ${fullExpense.category}\n📝 Description: ${fullExpense.description}\n🏢 Project: ${fullExpense.project}\n💳 Payment: ${fullExpense.paymentMethod}\n\nPlease confirm if details are correct:`,
            options: ['Confirm Item & Continue ✅', 'Start Over 🔄'],
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err) {
      setIsAiProcessing(false);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_ai_err_${Date.now()}`,
          sender: 'bot',
          text: "Could not auto-parse. Let's proceed step-by-step with the 8 questions.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  };

  const completeCurrentItemAndAskMore = (expenseData: Partial<Expense>) => {
    const finalAmount = expenseData.amount || expenseData.totalAmount || 0;
    const newExpense: Expense = {
      id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
      userId: currentUser.uid,
      userName: currentUser.displayName,
      userEmail: currentUser.email,
      department: currentUser.department,
      employeeId: currentUser.employeeId,
      amount: finalAmount,
      currency: 'SAR',
      category: expenseData.category || 'Miscellaneous Business',
      description: expenseData.description || 'Expense description',
      totalAmount: expenseData.totalAmount || finalAmount,
      vatStatus: expenseData.vatStatus || 'Without VAT',
      paymentMethod: expenseData.paymentMethod || 'Cash',
      project: expenseData.project || 'General Project',
      approvedBy: expenseData.approvedBy || currentUser.displayName,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      status: 'pending',
      submittedVia: 'web_chat',
      receiptUrl: expenseData.receiptUrl || receiptFile?.url,
      receiptName: expenseData.receiptName || receiptFile?.name,
      syncedToGoogleSheets: appSettings.autoSyncToSheets,
      createdAt: new Date().toISOString()
    };

    // 1. Immediately Save to Firestore & Google Sheets!
    onExpenseSubmitted(newExpense);

    // 2. Track in current session list
    const updatedSession = [...sessionExpenses, newExpense];
    setSessionExpenses(updatedSession);
    setPendingCurrentExpense(newExpense);
    setIsAwaitingAnotherExpenseChoice(true);

    const itemNumber = updatedSession.length;

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_item_recorded_${Date.now()}`,
          sender: 'bot',
          text: `✅ Expense #${itemNumber} (${newExpense.id}) saved to Firebase Database!\n\n💰 Amount: ${newExpense.amount.toFixed(2)} SAR\n📁 Purpose: ${newExpense.category}\n📝 Details: ${newExpense.description}\n🏢 Project: ${newExpense.project}\n💳 Payment: ${newExpense.paymentMethod}\n👤 Approver: ${newExpense.approvedBy}\n🧾 Receipt: ${newExpense.receiptUrl ? 'Attached' : 'None'}\n\nDo you have another expense to add in this session?`,
          submittedExpense: newExpense,
          options: [
            '➕ Yes, Add Another Expense',
            `✅ No, Finalize Session (${updatedSession.length} Expense${updatedSession.length > 1 ? 's' : ''})`
          ],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 400);
  };

  const finalizeBatchSession = (allExpensesInSession: Expense[]) => {
    setIsAwaitingAnotherExpenseChoice(false);
    setPendingCurrentExpense(null);

    const listToFinalize = allExpensesInSession.length > 0 ? allExpensesInSession : (pendingCurrentExpense ? [pendingCurrentExpense] : []);
    if (listToFinalize.length === 0) return;

    const isBatch = listToFinalize.length > 1;
    const batchId = isBatch
      ? `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`
      : undefined;

    const totalSum = listToFinalize.reduce((sum, e) => sum + e.amount, 0);

    const finalizedList: Expense[] = listToFinalize.map((exp, idx) => ({
      ...exp,
      batchId,
      batchIndex: isBatch ? idx + 1 : undefined,
      batchTotalCount: isBatch ? listToFinalize.length : undefined
    }));

    if (isBatch) {
      finalizedList.forEach((exp) => {
        onExpenseSubmitted(exp);
      });
    }

    setSessionExpenses([]);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `msg_final_batch_${Date.now()}`,
          sender: 'bot',
          text: isBatch
            ? `🎉 Batch Session Submitted & Saved Successfully!\n\n📋 Total ${finalizedList.length} expenses recorded (Batch ID: ${batchId})\n💵 Grand Total: ${totalSum.toFixed(2)} SAR\n\nAll items are safely stored in Firebase Firestore and synced to Google Sheets. In the Ledger, they are listed as individual entries with separate approvals.`
            : `🎉 Expense #${finalizedList[0].id} saved successfully in Firebase!\nAmount: ${finalizedList[0].amount.toFixed(2)} SAR\nStored in Firestore database and synced to Google Sheets.`,
          submittedExpensesBatch: finalizedList,
          submittedExpense: finalizedList[0],
          options: ['Record Another Expense ➕', 'View Combined Approval Voucher 📄'],
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }, 400);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedUrl = await compressImageFile(file, 1024, 1024, 0.75);
        setReceiptFile({
          url: compressedUrl,
          name: file.name
        });
      } catch (err) {
        console.warn('Image compression fallback:', err);
        const reader = new FileReader();
        reader.onloadend = () => {
          setReceiptFile({
            url: reader.result as string,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleQuickOptionClick = (option: string, sourceMsg?: ChatMessage) => {
    if (option.includes('Confirm Item') || option.includes('Confirm & Continue')) {
      completeCurrentItemAndAskMore(currentAnswers);
    } else if (option.includes('Add Another') || option.includes('আরেকটি')) {
      startNextExpenseInSession(sessionExpenses);
    } else if (option.includes('Finalize') || option.includes('Save All') || option.includes('Finalize Session')) {
      finalizeBatchSession(sessionExpenses);
    } else if (option.includes('Start Over') || option.includes('Record Another')) {
      startNewExpenseFlow();
    } else if (option.includes('View Combined Approval Voucher') || option.includes('Approval Voucher')) {
      let targetList: Expense[] = [];

      if (sourceMsg?.submittedExpensesBatch && sourceMsg.submittedExpensesBatch.length > 0) {
        targetList = sourceMsg.submittedExpensesBatch;
      } else if (sourceMsg?.submittedExpense) {
        targetList = [sourceMsg.submittedExpense];
      } else {
        // Look back through chat history for the latest finalized session
        const lastBatchMsg = [...messages].reverse().find((m) => m.submittedExpensesBatch && m.submittedExpensesBatch.length > 0);
        if (lastBatchMsg?.submittedExpensesBatch && lastBatchMsg.submittedExpensesBatch.length > 0) {
          targetList = lastBatchMsg.submittedExpensesBatch;
        } else {
          const lastSingleMsg = [...messages].reverse().find((m) => m.submittedExpense);
          if (lastSingleMsg?.submittedExpense) {
            targetList = [lastSingleMsg.submittedExpense];
          } else if (pendingCurrentExpense) {
            targetList = [pendingCurrentExpense];
          } else if (recentExpenses.length > 0) {
            targetList = [recentExpenses[0]];
          }
        }
      }

      setPdfExpenses(targetList);
      setPdfModalOpen(true);
    } else {
      handleSendMessage(option);
    }
  };

  const handleLanguageSwitch = (mode: LanguageMode) => {
    setLangMode(mode);
    if (onLanguageChange) {
      onLanguageChange(mode);
    }
    startNewExpenseFlow(mode);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start font-sans">
      {/* Main Chat Assistant Column */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-emerald-200/80 shadow-sm overflow-hidden flex flex-col justify-between min-h-[580px] sm:min-h-[640px]">
        {/* Chat Header with Language Selector */}
        <div className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 text-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-700 text-emerald-100 flex items-center justify-center font-bold shadow-xs">
              <Bot className="w-6 h-6 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base sm:text-lg text-white">ExpenseBot (Saudi Arabia)</h3>
                <span className="bg-emerald-500/20 text-emerald-200 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30">
                  SAR Only
                </span>
              </div>
              <p className="text-xs text-emerald-200">8-Step Standard Expense Question Flow</p>
            </div>
          </div>

          {/* Language Switcher in Header */}
          <div className="flex items-center gap-1.5 self-end sm:self-center">
            <Languages className="w-4 h-4 text-emerald-300 mr-1" />
            {[
              { id: 'en', label: '🇬🇧 EN' },
              { id: 'bn', label: '🇧🇩 বাংলা' },
              { id: 'ar', label: '🇸🇦 عربي' },
              { id: 'bn_en', label: '🇧🇩+🇬🇧' },
              { id: 'ar_en', label: '🇸🇦+🇬🇧' }
            ].map((l) => (
              <button
                key={l.id}
                onClick={() => handleLanguageSwitch(l.id as LanguageMode)}
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  langMode === l.id
                    ? 'bg-amber-400 text-emerald-950 font-black shadow-xs'
                    : 'bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200'
                }`}
                title={`Switch bot questions to ${l.id}`}
              >
                {l.label}
              </button>
            ))}

            <button
              onClick={() => startNewExpenseFlow()}
              className="ml-1 p-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-emerald-200 hover:text-white transition-colors cursor-pointer"
              title="Reset / Start Over"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[55vh] sm:max-h-[480px] min-h-[340px] bg-[#f8fcf9]">
          {messages.map((msg) => {
            const isBot = msg.sender === 'bot';
            const isSystem = msg.sender === 'system';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-3">
                  <div className="bg-emerald-100/90 text-emerald-900 text-xs sm:text-sm font-medium px-4 py-2 rounded-full flex items-center gap-2 border border-emerald-200 shadow-xs">
                    <Sparkles className="w-4 h-4 text-emerald-700 animate-spin" />
                    <span>{msg.text}</span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} animate-in fade-in duration-200`}
              >
                <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-[85%]">
                  {isBot && (
                    <div className="w-7 h-7 rounded-lg bg-emerald-700 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                      <Bot className="w-4 h-4 text-emerald-200" />
                    </div>
                  )}

                  <div>
                    {/* Message Bubble */}
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl text-sm sm:text-base leading-relaxed break-words shadow-xs ${
                        isBot
                          ? 'bg-white text-emerald-950 border border-emerald-200/90'
                          : 'bg-emerald-700 text-white font-medium'
                      }`}
                    >
                      <p className="whitespace-pre-line">{msg.text}</p>

                      {/* Receipt File Attachment Preview */}
                      {msg.receiptData && (
                        <div className="mt-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-700 shrink-0" />
                          <span className="font-semibold truncate">{msg.receiptData.name}</span>
                        </div>
                      )}

                      {/* Batch Finalized Box */}
                      {msg.submittedExpensesBatch && (
                        <div className="mt-3 p-4 bg-emerald-50/90 rounded-xl border border-emerald-300 text-xs sm:text-sm text-emerald-950 space-y-2.5">
                          <div className="font-bold text-emerald-900 flex items-center justify-between border-b border-emerald-200 pb-2">
                            <span className="flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-emerald-700" />
                              <span>Batch Session ({msg.submittedExpensesBatch.length} Items)</span>
                            </span>
                            <button
                              onClick={() => {
                                setPdfExpenses(msg.submittedExpensesBatch!);
                                setPdfModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>View Combined PDF</span>
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {msg.submittedExpensesBatch.map((item, idx) => (
                              <div
                                key={item.id || idx}
                                className="p-2 bg-white rounded-lg border border-emerald-100 flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="font-bold text-emerald-950">#{idx + 1}. {item.category}</span>
                                  <div className="text-[11px] text-slate-600 line-clamp-1">{item.description}</div>
                                </div>
                                <span className="font-bold text-emerald-900 font-mono">
                                  {item.amount.toFixed(2)} SAR
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className={`text-[11px] text-emerald-600 mt-1 px-1 ${isBot ? 'text-left' : 'text-right'}`}>
                      {msg.timestamp}
                    </div>

                    {/* Quick Choice Option Pills */}
                    {msg.options && msg.options.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {msg.options.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => handleQuickOptionClick(opt, msg)}
                            className={`px-3.5 py-2 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-xs active:scale-95 ${
                              opt.includes('Yes') || opt.includes('Add Another')
                                ? 'bg-emerald-700 hover:bg-emerald-800 text-white border-emerald-800 font-bold'
                                : opt.includes('Finalize') || opt.includes('Save All')
                                ? 'bg-amber-400 hover:bg-amber-300 text-emerald-950 border-amber-500 font-bold'
                                : 'bg-emerald-100 hover:bg-emerald-700 hover:text-white text-emerald-900 border-emerald-300/80'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>

        {/* Selected Attachment Notice Bar */}
        {receiptFile && (
          <div className="px-4 py-2 bg-emerald-100/90 border-t border-emerald-200 flex items-center justify-between text-xs sm:text-sm font-semibold text-emerald-900">
            <span className="flex items-center gap-2 truncate pr-2">
              <Paperclip className="w-4 h-4 text-emerald-700 shrink-0" />
              <span className="truncate">Attached Invoice: {receiptFile.name}</span>
            </span>
            <button
              onClick={() => setReceiptFile(null)}
              className="text-rose-600 font-bold hover:underline cursor-pointer shrink-0 ml-2"
            >
              Remove
            </button>
          </div>
        )}

        {/* Chat Input Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-emerald-200">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            {/* Camera / Invoice Upload Button */}
            <label
              htmlFor="receipt-upload"
              className="p-2.5 sm:p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer flex items-center justify-center transition-colors min-h-[44px] min-w-[44px] shrink-0"
              title="Attach Invoice Image (ইনভয়েসের ছবি আপলোড)"
            >
              <Camera className="w-5 h-5 text-emerald-700" />
              <input
                id="receipt-upload"
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={handleFileUpload}
              />
            </label>

            {/* Input Text Box */}
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={
                isAwaitingAnotherExpenseChoice
                  ? "Type 'yes' to add another, or 'no' to finalize..."
                  : botQuestions[currentStepIndex]?.placeholder || 'Type your answer here...'
              }
              className="flex-1 rounded-xl bg-emerald-50/60 border border-emerald-200 focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-200 text-sm sm:text-base font-medium text-emerald-950 p-3 outline-hidden transition-all min-h-[44px]"
            />

            {/* Send Button */}
            <button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white px-4 sm:px-5 py-3 rounded-xl text-sm sm:text-base font-bold transition-all cursor-pointer flex items-center justify-center gap-2 min-h-[44px] shadow-sm shrink-0"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Flow Indicator */}
          <div className="mt-2.5 px-1 flex items-center justify-between text-xs text-emerald-700">
            <span className="font-semibold">
              Expense #{sessionExpenses.length + 1} • Question{' '}
              {Math.min(currentStepIndex + 1, botQuestions.length)} of {botQuestions.length}:{' '}
              <strong className="text-emerald-900 font-mono">
                {botQuestions[currentStepIndex]?.key || 'Completed'}
              </strong>
            </span>
            <span className="hidden sm:inline text-emerald-600">
              Active User: <strong>{currentUser.displayName}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Live Overview & Detailed Draft */}
      <div className="lg:col-span-4 space-y-5 font-sans">
        {/* Live Draft Card with all 9 Fields */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-950">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Active 9-Question Expense Draft</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
              Item #{sessionExpenses.length + 1}
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Q1 & Q4: Amount */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-bold">1. Amount</span>
                <span className="text-base font-bold text-emerald-950 font-mono">
                  {currentAnswers.amount ? Number(currentAnswers.amount).toFixed(2) : '0.00'} SAR
                </span>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-bold">4. Total Value</span>
                <span className="text-base font-bold text-emerald-950 font-mono">
                  {currentAnswers.totalAmount ? Number(currentAnswers.totalAmount).toFixed(2) : '0.00'} SAR
                </span>
              </div>
            </div>

            {/* Q2: Purpose / Category */}
            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-700 block font-bold">2. Purpose / Category</span>
              <span className="text-xs font-semibold text-emerald-950 truncate block">
                {currentAnswers.category || '— Awaiting Selection'}
              </span>
            </div>

            {/* Q3: Detailed Description */}
            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-700 block font-bold">3. Description</span>
              <span className="text-xs font-medium text-emerald-900 line-clamp-2">
                {currentAnswers.description || '— Awaiting Input'}
              </span>
            </div>

            {/* Q5 & Q6: VAT & Payment Method */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-bold">5. VAT Status</span>
                <span className="text-xs font-semibold text-emerald-950 truncate block">
                  {currentAnswers.vatStatus || '—'}
                </span>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-bold">6. Payment Mode</span>
                <span className="text-xs font-semibold text-emerald-950 truncate block">
                  {currentAnswers.paymentMethod || '—'}
                </span>
              </div>
            </div>

            {/* Q7 & Q8: Project & Approver */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-bold">7. Project</span>
                <span className="text-xs font-semibold text-emerald-950 truncate block">
                  {currentAnswers.project || '—'}
                </span>
              </div>
              <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-bold">8. Approver</span>
                <span className="text-xs font-semibold text-emerald-950 truncate block">
                  {currentAnswers.approvedBy || '—'}
                </span>
              </div>
            </div>

            {/* Q9: Receipt File */}
            <div className="bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-emerald-700 block font-bold">8. Invoice Photo</span>
                <span className="text-xs font-semibold text-emerald-950 truncate block">
                  {receiptFile?.name || (currentAnswers.receiptUrl ? 'Image Attached' : 'None')}
                </span>
              </div>
              {receiptFile && <Check className="w-4 h-4 text-emerald-600" />}
            </div>
          </div>
        </div>

        {/* Queued Session Items Card */}
        {sessionExpenses.length > 0 && (
          <div className="bg-white rounded-2xl border border-emerald-300 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
              <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-700" />
                <span>Queued in this Session</span>
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {sessionExpenses.length} items
              </span>
            </div>

            <div className="space-y-2">
              {sessionExpenses.map((itm, i) => (
                <div key={i} className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-emerald-900">#{i + 1}. {itm.category}</span>
                    <div className="text-[11px] text-emerald-700 truncate max-w-[180px]">{itm.description}</div>
                  </div>
                  <span className="font-bold text-emerald-950 font-mono">{itm.amount.toFixed(2)} SAR</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Submissions Card */}
        <div className="bg-white rounded-2xl border border-emerald-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-3 mb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-emerald-950">
              <span>Recent Submissions</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                {recentExpenses.length}
              </span>
            </div>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="p-6 text-center text-xs sm:text-sm text-emerald-600/80 font-medium">
              No expenses recorded yet.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {recentExpenses.slice(0, 5).map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 bg-emerald-50/50 hover:bg-emerald-50 rounded-xl border border-emerald-100/90 flex items-center justify-between text-xs sm:text-sm transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                      <span>{exp.id}</span>
                      <span className="text-emerald-400">•</span>
                      <span className="text-emerald-700 truncate font-semibold">{exp.category}</span>
                    </div>
                    <div className="text-emerald-800 truncate text-xs mt-0.5">{exp.description}</div>
                    <div className="text-[11px] text-emerald-600 mt-1 font-medium">
                      {exp.project || 'General'} • {exp.paymentMethod || 'Cash'} • {exp.date}
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1 shrink-0">
                    <span className="font-bold text-sm text-emerald-950">
                      {exp.amount.toFixed(2)} SAR
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        exp.status === 'approved'
                          ? 'bg-emerald-600 text-white'
                          : exp.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {exp.status === 'approved' ? 'Approved' : exp.status === 'rejected' ? 'Rejected' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF Approval Voucher Modal */}
      <ApprovalVoucherModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        expenses={pdfExpenses}
        appSettings={appSettings}
        onSavePdfConfig={onSavePdfConfig}
      />
    </div>
  );
};
