import React, { useState, useEffect, useRef } from 'react';
import { AppSettings, Expense, AppUser, BotQuestion, ApprovalPdfConfig, TelegramCommand } from '../types';
import { DEFAULT_TELEGRAM_COMMANDS } from '../data/defaultTelegramCommands';
import { ApprovalVoucherModal } from './ApprovalVoucherModal';
import {
  Bot,
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Smartphone,
  RefreshCw,
  Terminal,
  Paperclip,
  Check,
  Sparkles,
  FileText,
  FileCheck,
  Layers,
  Camera,
  Image as ImageIcon,
  RotateCcw,
  PlusCircle,
  Building2,
  Calendar,
  CreditCard,
  UserCheck,
  HelpCircle
} from 'lucide-react';

interface TelegramSimulatorProps {
  appSettings: AppSettings;
  currentUser: AppUser;
  botQuestions: BotQuestion[];
  telegramCommands?: TelegramCommand[];
  onExpenseSubmitted: (expense: Expense) => void;
  recentExpenses?: Expense[];
  onSavePdfConfig?: (newConfig: ApprovalPdfConfig) => Promise<void>;
}

interface TelegramMsg {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
  expenseSummary?: Partial<Expense>;
  pdfExpenseTarget?: Expense;
  pdfExpensesBatch?: Expense[];
  receiptPreview?: string;
}

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({
  appSettings,
  currentUser,
  botQuestions,
  telegramCommands = DEFAULT_TELEGRAM_COMMANDS,
  onExpenseSubmitted,
  recentExpenses = [],
  onSavePdfConfig
}) => {
  // Sort and ensure 9 questions
  const sortedQuestions = [...botQuestions].sort((a, b) => a.order - b.order);

  // Active conversational state
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [draftExpense, setDraftExpense] = useState<Partial<Expense>>({
    currency: 'SAR',
    date: new Date().toISOString().split('T')[0]
  });

  // Multi-item batch session
  const [sessionExpenses, setSessionExpenses] = useState<Expense[]>([]);
  const [awaitingMoreChoice, setAwaitingMoreChoice] = useState<boolean>(false);

  // Messages in Telegram feed
  const [tgMessages, setTgMessages] = useState<TelegramMsg[]>([
    {
      id: 'tg_welcome',
      sender: 'bot',
      text: `🤖 <b>ExpenseFlow Telegram Bot (Saudi Arabia)</b>\nস্বাগতম ${currentUser.displayName}! নির্ধারিত ৯টি প্রশ্নের মাধ্যমে একক বা একসাথে একাধিক খরচ জমা দিন।\n\n📌 <b>Commands:</b>\n• <code>/new</code> বা <code>/start</code> - নতুন খরচ শুরু করুন\n• <code>/pdf</code> - অ্যাপ্রুভড পিডিএফ ভাউচার ডাউনলোড করুন\n• <code>/status</code> - সিস্টেম স্ট্যাটাস`,
      time: '10:00'
    },
    {
      id: 'tg_q1_init',
      sender: 'bot',
      text: `<b>Expense #1 (প্রশ্ন ১/৯):</b>\n${sortedQuestions[0]?.questionBn || 'আপনার কত টাকা খরচ হয়েছে অথবা আপনি কত টাকা খরচ করতে চাচ্ছেন?'}\n<i>${sortedQuestions[0]?.questionEn || 'How much money was spent or do you want to spend? (SAR)'}</i>`,
      time: '10:00'
    }
  ]);

  const [inputVal, setInputVal] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedWebhook, setCopiedWebhook] = useState<boolean>(false);
  const [logs, setLogs] = useState<any[]>([]);

  // Image upload
  const fileInputRef = useRef<HTMLInputElement>(null);

  // PDF modal state
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);
  const [expensesForPdf, setExpensesForPdf] = useState<Expense[]>([]);

  const tgEndRef = useRef<HTMLDivElement>(null);
  const webhookUrl = `${window.location.origin}/api/telegram/webhook`;

  useEffect(() => {
    tgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tgMessages]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      const data = await res.json();
      if (data.recentLogs) {
        setLogs(data.recentLogs);
      }
    } catch (err) {
      // quiet catch
    }
  };

  const getQuestionText = (q: BotQuestion, itemNum: number, qNum: number) => {
    const qBn = q.questionBn || q.questionText || '';
    const qEn = q.questionEn || '';
    return `<b>Expense #${itemNum} (প্রশ্ন ${qNum}/৯):</b>\n${qBn}\n<i>${qEn}</i>`;
  };

  const handleStartFreshSession = () => {
    setCurrentStepIndex(0);
    setDraftExpense({
      currency: 'SAR',
      date: new Date().toISOString().split('T')[0]
    });
    setSessionExpenses([]);
    setAwaitingMoreChoice(false);

    const firstQ = sortedQuestions[0];
    const welcomeMsg = `🔄 <b>নতুন খরচ সেশন শুরু হয়েছে!</b>\n\n${getQuestionText(firstQ, 1, 1)}`;

    setTgMessages((prev) => [
      ...prev,
      {
        id: `bot_tg_${Date.now()}`,
        sender: 'bot',
        text: welcomeMsg,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      processCurrentQuestionAnswer(base64, file.name, base64);
    };
    reader.readAsDataURL(file);
  };

  const processCurrentQuestionAnswer = (rawAnswer: string, receiptName?: string, receiptPreview?: string) => {
    const answer = rawAnswer.trim();
    if (!answer && currentStepIndex !== 8) return;

    // Post user response to chat
    const displayAnswerText = currentStepIndex === 8 && receiptPreview
      ? `📸 [Attached Invoice: ${receiptName || 'receipt.jpg'}]`
      : answer;

    const userMsg: TelegramMsg = {
      id: `usr_tg_${Date.now()}`,
      sender: 'user',
      text: displayAnswerText,
      receiptPreview: receiptPreview,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setTgMessages((prev) => [...prev, userMsg]);
    setInputVal('');

    const currentQ = sortedQuestions[currentStepIndex];
    if (!currentQ) return;

    const updatedDraft = { ...draftExpense };

    // Process answer according to current question
    if (currentQ.key === 'amount') {
      const num = parseFloat(answer.replace(/[^0-9.]/g, ''));
      const val = isNaN(num) ? 50 : num;
      updatedDraft.amount = val;
      updatedDraft.totalAmount = val;
    } else if (currentQ.key === 'category') {
      updatedDraft.category = answer;
    } else if (currentQ.key === 'description') {
      updatedDraft.description = answer;
    } else if (currentQ.key === 'totalAmount') {
      const num = parseFloat(answer.replace(/[^0-9.]/g, ''));
      const val = isNaN(num) ? (updatedDraft.amount || 50) : num;
      updatedDraft.totalAmount = val;
    } else if (currentQ.key === 'vatStatus') {
      updatedDraft.vatStatus = answer;
    } else if (currentQ.key === 'paymentMethod') {
      updatedDraft.paymentMethod = answer;
    } else if (currentQ.key === 'project') {
      updatedDraft.project = answer;
    } else if (currentQ.key === 'approvedBy') {
      updatedDraft.approvedBy = answer;
    } else if (currentQ.key === 'receiptUrl') {
      if (receiptPreview) {
        updatedDraft.receiptUrl = receiptPreview;
        updatedDraft.receiptName = receiptName || 'Invoice Photo';
      } else if (answer && !answer.toLowerCase().includes('skip') && !answer.toLowerCase().includes('নেই') && !answer.toLowerCase().includes('না')) {
        updatedDraft.receiptUrl = answer;
        updatedDraft.receiptName = 'Attached Receipt';
      }
    }

    setDraftExpense(updatedDraft);

    const nextIndex = currentStepIndex + 1;
    const currentItemNumber = sessionExpenses.length + 1;

    if (nextIndex < sortedQuestions.length) {
      // Proceed to next question
      setCurrentStepIndex(nextIndex);
      const nextQ = sortedQuestions[nextIndex];
      const nextQPrompt = getQuestionText(nextQ, currentItemNumber, nextIndex + 1);

      setIsSimulating(true);
      setTimeout(() => {
        setIsSimulating(false);
        setTgMessages((prev) => [
          ...prev,
          {
            id: `bot_tg_${Date.now()}`,
            sender: 'bot',
            text: nextQPrompt,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }, 250);
    } else {
      // Completed all 9 questions -> Record Expense
      setIsSimulating(true);
      setTimeout(() => {
        setIsSimulating(false);

        const expAmount = updatedDraft.amount || updatedDraft.totalAmount || 50;
        const finalExpense: Expense = {
          id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
          userId: currentUser.uid || 'usr-tg',
          userName: currentUser.displayName || 'Telegram Employee',
          userEmail: currentUser.email || 'employee@alfalak.sa',
          employeeId: currentUser.employeeId || 'KSA-4021',
          department: currentUser.department || 'Operations',
          amount: expAmount,
          currency: 'SAR',
          category: updatedDraft.category || 'Miscellaneous Business',
          description: updatedDraft.description || 'Expense description',
          totalAmount: updatedDraft.totalAmount || expAmount,
          vatStatus: updatedDraft.vatStatus || 'Without VAT (উইদাউট ভ্যাট)',
          paymentMethod: updatedDraft.paymentMethod || 'Cash (ক্যাশ)',
          project: updatedDraft.project || 'General Project',
          approvedBy: updatedDraft.approvedBy || 'Finance Manager',
          receiptUrl: updatedDraft.receiptUrl || '',
          receiptName: updatedDraft.receiptName || '',
          date: updatedDraft.date || new Date().toISOString().split('T')[0],
          status: 'pending',
          submittedVia: 'telegram_bot',
          syncedToGoogleSheets: false,
          createdAt: new Date().toISOString()
        };

        // Save into Firestore & App State
        onExpenseSubmitted(finalExpense);

        const updatedSessionList = [...sessionExpenses, finalExpense];
        setSessionExpenses(updatedSessionList);
        setAwaitingMoreChoice(true);
        setCurrentStepIndex(0);
        setDraftExpense({
          currency: 'SAR',
          date: new Date().toISOString().split('T')[0]
        });

        const confirmMsg =
          `✅ <b>Expense #${updatedSessionList.length} (${finalExpense.id}) ডাটাবেজে সংরক্ষণ করা হয়েছে!</b>\n\n` +
          `💰 <b>টাকার পরিমাণ:</b> ${finalExpense.amount.toFixed(2)} SAR\n` +
          `📁 <b>খরচের কারণ:</b> ${finalExpense.category}\n` +
          `📝 <b>বর্ণনা:</b> ${finalExpense.description}\n` +
          `💵 <b>মোট মূল্য:</b> ${finalExpense.totalAmount.toFixed(2)} SAR\n` +
          `🧾 <b>ভ্যাট স্ট্যাটাস:</b> ${finalExpense.vatStatus}\n` +
          `💳 <b>পেমেন্ট মেথড:</b> ${finalExpense.paymentMethod}\n` +
          `🏢 <b>প্রজেক্ট:</b> ${finalExpense.project}\n` +
          `👤 <b>অ্যাপ্রুভাল প্রদানকারী:</b> ${finalExpense.approvedBy}\n` +
          `📸 <b>ইনভয়েস:</b> ${finalExpense.receiptUrl ? 'সংযুক্ত করা হয়েছে ✅' : 'সংযুক্ত করা হয়নি'}\n\n` +
          `❓ <b>Do you have another expense to add in this session? (আপনার কি আরও কোনো খরচ আছে?)</b>`;

        setTgMessages((prev) => [
          ...prev,
          {
            id: `bot_tg_${Date.now()}`,
            sender: 'bot',
            text: confirmMsg,
            expenseSummary: finalExpense,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        fetchLogs();
      }, 350);
    }
  };

  const handleSendTelegram = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputVal).trim();
    if (!text) return;

    // Handle Slash Commands
    const lower = text.toLowerCase();

    if (lower === '/start' || lower.startsWith('/start ') || lower === '/new') {
      handleStartFreshSession();
      setInputVal('');
      return;
    }

    if (lower === '/status') {
      setInputVal('');
      const pendingList = recentExpenses.filter((e) => e.status === 'pending');
      const approvedList = recentExpenses.filter((e) => e.status === 'approved');
      setTgMessages((prev) => [
        ...prev,
        {
          id: `usr_tg_${Date.now()}`,
          sender: 'user',
          text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: `bot_tg_${Date.now()}`,
          sender: 'bot',
          text: `🟢 <b>ExpenseFlow Telegram Bot Status:</b>\n• Database: Firestore Synced\n• Currency: SAR (Saudi Riyal)\n• Pending Items: ${pendingList.length}\n• Approved Items: ${approvedList.length}\n• Flow: 9-Question Sequential Verification`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return;
    }

    if (lower === '/pdf' || lower === '/approvals') {
      setInputVal('');
      const approvedList = recentExpenses.filter((e) => e.status === 'approved');
      setTgMessages((prev) => [
        ...prev,
        {
          id: `usr_tg_${Date.now()}`,
          sender: 'user',
          text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        {
          id: `bot_tg_${Date.now()}`,
          sender: 'bot',
          text: approvedList.length > 0
            ? `📄 <b>Found ${approvedList.length} Approved Expense Voucher(s) for ${currentUser.displayName}:</b>\nClick below to download/print the official 1-page PDF voucher:`
            : `📄 <b>Approved Expense PDFs:</b>\nNo approved expenses found yet. Once a manager approves an expense in the Ledger, you can download its official PDF voucher here.`,
          pdfExpenseTarget: approvedList[0],
          pdfExpensesBatch: approvedList.length > 1 ? approvedList : undefined,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
      return;
    }

    // Handle "Another Expense" decision state ('yes' vs 'no')
    if (awaitingMoreChoice) {
      if (lower.includes('yes') || lower.includes('হ্যাঁ') || lower.includes('add') || lower.includes('আরেকটি')) {
        setAwaitingMoreChoice(false);
        setCurrentStepIndex(0);
        setDraftExpense({
          currency: 'SAR',
          date: new Date().toISOString().split('T')[0]
        });

        const nextItemNum = sessionExpenses.length + 1;
        const firstQ = sortedQuestions[0];
        const nextPrompt = `➕ <b>Starting Expense #${nextItemNum} in this session:</b>\n\n${getQuestionText(firstQ, nextItemNum, 1)}`;

        setTgMessages((prev) => [
          ...prev,
          {
            id: `usr_tg_${Date.now()}`,
            sender: 'user',
            text: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          {
            id: `bot_tg_${Date.now()}`,
            sender: 'bot',
            text: nextPrompt,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setInputVal('');
        return;
      } else if (lower.includes('no') || lower.includes('done') || lower.includes('না') || lower.includes('finalize') || lower.includes('সম্পন্ন')) {
        setAwaitingMoreChoice(false);
        const totalSum = sessionExpenses.reduce((s, e) => s + e.amount, 0);
        const count = sessionExpenses.length;

        setTgMessages((prev) => [
          ...prev,
          {
            id: `usr_tg_${Date.now()}`,
            sender: 'user',
            text: text,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          },
          {
            id: `bot_tg_${Date.now()}`,
            sender: 'bot',
            text: `🎉 <b>Session Finalized Successfully!</b>\n\n📋 <b>মোট জমা দেওয়া খরচ:</b> ${count} টি\n💵 <b>সর্বমোট টাকার পরিমাণ:</b> ${totalSum.toFixed(2)} SAR\n\nসবগুলো আইটেম ফায়ারবেস ও গুগল শিটে সেইভ করা হয়েছে। প্রতিটি খরচ আলাদা রেকর্ড হিসেবে লেজারে অ্যাপ্রুভালের জন্য প্রস্তুত।\n\nনতুন খরচ এন্ট্রি করতে <code>/new</code> লিখুন।`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setInputVal('');
        setSessionExpenses([]);
        return;
      }
    }

    // Process as answer to the active question
    processCurrentQuestionAnswer(text);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  const activeQuestion = sortedQuestions[currentStepIndex];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start font-sans">
      {/* Left Column: Telegram Mobile Phone Mockup */}
      <div className="lg:col-span-7 flex flex-col items-center">
        <div className="w-full max-w-md bg-white rounded-3xl border-2 border-emerald-400 shadow-xl overflow-hidden flex flex-col justify-between min-h-[640px]">
          {/* Phone Top Header / Telegram App Bar */}
          <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white p-3.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-600 border border-emerald-400/40 text-white flex items-center justify-center font-bold shadow-inner">
                <Bot className="w-5 h-5 text-emerald-100" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm sm:text-base leading-tight">ExpenseFlow Bot</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                </div>
                <span className="text-[11px] text-emerald-200 block">bot • 9-Question Expense Flow (SAR)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleStartFreshSession}
                className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 text-emerald-200 text-xs flex items-center gap-1 transition-colors cursor-pointer"
                title="Start new 9-step submission"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold hidden sm:inline">Reset / New</span>
              </button>
            </div>
          </div>

          {/* Telegram Step Progress Bar */}
          <div className="bg-emerald-50 px-4 py-2 border-b border-emerald-200 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-1.5 font-bold">
              <span className="w-5 h-5 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[10px]">
                {awaitingMoreChoice ? '✓' : currentStepIndex + 1}
              </span>
              <span>
                {awaitingMoreChoice
                  ? 'Session Follow-up (পরবর্তী পদক্ষেপ)'
                  : `Question ${currentStepIndex + 1} of 9: ${activeQuestion?.key || 'amount'}`}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {[...Array(9)].map((_, idx) => (
                <span
                  key={idx}
                  className={`w-2.5 h-1.5 rounded-full transition-all ${
                    idx < currentStepIndex || awaitingMoreChoice
                      ? 'bg-emerald-600'
                      : idx === currentStepIndex
                      ? 'bg-emerald-400 w-4'
                      : 'bg-emerald-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Telegram Messages Canvas */}
          <div className="p-4 overflow-y-auto space-y-3.5 max-h-[380px] min-h-[340px] bg-[#f0f9f4]">
            {tgMessages.map((msg) => {
              const isBot = msg.sender === 'bot';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isBot ? 'items-start' : 'items-end'} animate-in fade-in duration-150`}
                >
                  <div
                    className={`p-3.5 rounded-2xl text-xs sm:text-sm max-w-[90%] leading-relaxed shadow-xs ${
                      isBot
                        ? 'bg-white text-emerald-950 border border-emerald-200/90 rounded-tl-xs'
                        : 'bg-emerald-700 text-white font-medium rounded-tr-xs'
                    }`}
                  >
                    <div
                      className="whitespace-pre-line"
                      dangerouslySetInnerHTML={{ __html: msg.text }}
                    />

                    {/* Receipt Image Preview in Chat */}
                    {msg.receiptPreview && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-emerald-300 max-w-[200px]">
                        <img
                          src={msg.receiptPreview}
                          alt="Receipt preview"
                          className="w-full h-auto object-cover max-h-36"
                        />
                      </div>
                    )}

                    {/* PDF Trigger Button inside Telegram if /pdf requested */}
                    {msg.pdfExpenseTarget && (
                      <div className="mt-2.5 pt-2 border-t border-emerald-100 flex flex-col gap-1.5">
                        <button
                          onClick={() => {
                            setExpensesForPdf([msg.pdfExpenseTarget!]);
                            setPdfModalOpen(true);
                          }}
                          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                          <span>📄 Download Approval PDF (#{msg.pdfExpenseTarget.id})</span>
                        </button>

                        {msg.pdfExpensesBatch && (
                          <button
                            onClick={() => {
                              setExpensesForPdf(msg.pdfExpensesBatch!);
                              setPdfModalOpen(true);
                            }}
                            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-xs border border-emerald-300 cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>Download All Approved in One PDF ({msg.pdfExpensesBatch.length} Items)</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div
                      className={`text-[10px] mt-1.5 text-right ${
                        isBot ? 'text-emerald-600 font-mono' : 'text-emerald-200 font-mono'
                      }`}
                    >
                      {msg.time}
                    </div>
                  </div>
                </div>
              );
            })}
            {isSimulating && (
              <div className="flex items-center gap-2 p-2.5 rounded-2xl bg-white border border-emerald-200 text-emerald-700 text-xs w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                <span>Telegram Bot is writing...</span>
              </div>
            )}
            <div ref={tgEndRef} />
          </div>

          {/* Interactive Telegram Quick Reply Keyboard (Changes per Question) */}
          <div className="p-2.5 bg-emerald-100/70 border-t border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mb-1.5 px-1">
              Telegram Quick Keyboard (ক্লিক করে উত্তর দিন):
            </span>

            {awaitingMoreChoice ? (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSendTelegram('➕ Yes, Add Another Expense')}
                  className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>হ্যাঁ, আরেকটি যোগ করুন</span>
                </button>
                <button
                  onClick={() => handleSendTelegram('✅ No, Finalize Session')}
                  className="p-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>না, সমাপ্ত করুন</span>
                </button>
              </div>
            ) : currentStepIndex === 0 ? (
              /* Q1: Amount Presets */
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['50 SAR', '100 SAR', '150 SAR', '250 SAR', '500 SAR', '1000 SAR'].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleSendTelegram(amt)}
                    className="px-3 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold shrink-0 shadow-xs cursor-pointer"
                  >
                    {amt}
                  </button>
                ))}
              </div>
            ) : currentStepIndex === 1 ? (
              /* Q2: Purpose / Category Options */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
                {(activeQuestion?.options || [
                  'Travel & Transport / যাতায়াত',
                  'Client Dining & Meals / খাবার ও আপ্যায়ন',
                  'Office Supplies / অফিস সামগ্রী',
                  'Software & Cloud / সফটওয়্যার',
                  'Fuel & Maintenance / জ্বালানি',
                  'Hotel & Lodging / হোটেল ও আবাসন'
                ]).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => handleSendTelegram(opt)}
                    className="p-1.5 text-left rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-[11px] font-semibold truncate shadow-xs cursor-pointer"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : currentStepIndex === 3 ? (
              /* Q4: Confirm Total Amount */
              <div className="flex gap-2">
                <button
                  onClick={() => handleSendTelegram(`${draftExpense.amount || 50} SAR`)}
                  className="flex-1 p-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-xs cursor-pointer text-center"
                >
                  Confirm: {draftExpense.amount || 50} SAR
                </button>
              </div>
            ) : currentStepIndex === 4 ? (
              /* Q5: VAT Status Options */
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSendTelegram('With VAT (ভ্যাট সহ / شامل الضريبة)')}
                  className="p-2 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold text-center shadow-xs cursor-pointer"
                >
                  ভ্যাট সহ (With VAT)
                </button>
                <button
                  onClick={() => handleSendTelegram('Without VAT (উইদাউট ভ্যাট / بدون ضريبة)')}
                  className="p-2 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold text-center shadow-xs cursor-pointer"
                >
                  উইদাউট ভ্যাট (Without VAT)
                </button>
              </div>
            ) : currentStepIndex === 5 ? (
              /* Q6: Payment Method Options */
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleSendTelegram('Cash (ক্যাশ / نقداً)')}
                  className="p-2 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold text-center shadow-xs cursor-pointer"
                >
                  💵 Cash (ক্যাশ)
                </button>
                <button
                  onClick={() => handleSendTelegram('Bank Transfer (ব্যাংক ট্রান্সফার / تحويل بنكي)')}
                  className="p-2 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold text-center shadow-xs cursor-pointer"
                >
                  🏦 Bank (ব্যাংক)
                </button>
              </div>
            ) : currentStepIndex === 6 ? (
              /* Q7: Project Suggestions */
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['Riyadh Metro Project', 'HQ Operations', 'Marketing Campaign', 'General Project'].map((proj) => (
                  <button
                    key={proj}
                    onClick={() => handleSendTelegram(proj)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-[11px] font-semibold shrink-0 shadow-xs cursor-pointer"
                  >
                    {proj}
                  </button>
                ))}
              </div>
            ) : currentStepIndex === 7 ? (
              /* Q8: Approver Suggestions */
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['Finance Manager', 'Faisal Al-Otaibi', 'Project Manager', 'Department Head'].map((appr) => (
                  <button
                    key={appr}
                    onClick={() => handleSendTelegram(appr)}
                    className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-[11px] font-semibold shrink-0 shadow-xs cursor-pointer"
                  >
                    {appr}
                  </button>
                ))}
              </div>
            ) : currentStepIndex === 8 ? (
              /* Q9: Photo Upload & Skip */
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>📸 ছবি সংযুক্ত করুন (Upload)</span>
                </button>
                <button
                  onClick={() => handleSendTelegram('Skip (রসিদ নেই)')}
                  className="p-2 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold text-center shadow-xs cursor-pointer"
                >
                  Skip / রসিদ নেই
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5 overflow-x-auto">
                {['/start', '/new', '/pdf', '/status'].map((cmd) => (
                  <button
                    key={cmd}
                    onClick={() => handleSendTelegram(cmd)}
                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold cursor-pointer"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hidden File Input for Receipt Upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Telegram Input Bar */}
          <div className="p-3 bg-white border-t border-emerald-200 flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 cursor-pointer"
              title="Attach invoice image"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSendTelegram();
                }
              }}
              placeholder={
                awaitingMoreChoice
                  ? "Type 'yes' or 'no'..."
                  : `Type answer for Question ${currentStepIndex + 1}...`
              }
              className="flex-1 rounded-xl bg-emerald-50/70 border border-emerald-200 px-3.5 py-2 text-xs sm:text-sm text-emerald-950 focus:bg-white focus:ring-2 focus:ring-emerald-400 outline-hidden"
            />

            <button
              onClick={() => handleSendTelegram()}
              className="p-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Right Column: Live Draft Summary & Webhook Info */}
      <div className="lg:col-span-5 space-y-5">
        {/* Live Draft Progress Card */}
        <div className="bg-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
            <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Live 9-Question Draft (বর্তমান ড্রাফট)</span>
            </h4>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
              {currentStepIndex} of 9 Completed
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-emerald-50">
              <span className="text-emerald-700 font-medium">১. খরচের টাকা (Amount):</span>
              <span className="font-bold text-emerald-950">{draftExpense.amount ? `${draftExpense.amount} SAR` : '---'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-50">
              <span className="text-emerald-700 font-medium">২. খরচের কারণ (Purpose):</span>
              <span className="font-bold text-emerald-950 truncate max-w-[180px]">{draftExpense.category || '---'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-50">
              <span className="text-emerald-700 font-medium">৩. বিস্তারিত বর্ণনা (Details):</span>
              <span className="font-bold text-emerald-950 truncate max-w-[180px]">{draftExpense.description || '---'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-50">
              <span className="text-emerald-700 font-medium">৪. মোট মূল্য (Total SAR):</span>
              <span className="font-bold text-emerald-950">{draftExpense.totalAmount ? `${draftExpense.totalAmount} SAR` : '---'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-50">
              <span className="text-emerald-700 font-medium">৫. ভ্যাট স্ট্যাটাস (VAT):</span>
              <span className="font-bold text-emerald-950">{draftExpense.vatStatus || '---'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-50">
              <span className="text-emerald-700 font-medium">৬. পেমেন্ট মেথড (Payment):</span>
              <span className="font-bold text-emerald-950">{draftExpense.paymentMethod || '---'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-50">
              <span className="text-emerald-700 font-medium">৭. প্রজেক্টের নাম (Project):</span>
              <span className="font-bold text-emerald-950">{draftExpense.project || '---'}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-emerald-50">
              <span className="text-emerald-700 font-medium">৮. অনুমোদনকারী (Approver):</span>
              <span className="font-bold text-emerald-950">{draftExpense.approvedBy || '---'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-emerald-700 font-medium">৯. ইনভয়েস ছবি (Invoice):</span>
              <span className="font-bold text-emerald-950">
                {draftExpense.receiptUrl ? 'সংযুক্ত ✅' : 'সংযুক্ত নেই'}
              </span>
            </div>
          </div>
        </div>

        {/* Webhook Connection & Cloud Setup */}
        <div className="bg-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs space-y-3.5">
          <div>
            <h4 className="font-bold text-sm text-emerald-950">Real Telegram Bot Webhook</h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              Connect your actual Telegram Bot Token from @BotFather
            </p>
          </div>

          {/* Webhook Box */}
          <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 space-y-1.5">
            <span className="text-xs font-bold text-emerald-900 block">Telegram Webhook Endpoint</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 p-2 rounded-lg bg-white border border-emerald-200 text-[11px] font-mono text-emerald-950 select-all"
              />
              <button
                onClick={handleCopyWebhook}
                className="px-3 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
              >
                {copiedWebhook ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedWebhook ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          <div className="text-xs text-emerald-800 space-y-1">
            <div className="font-bold text-emerald-950">Telegram এ বট যেভাবে কাজ করে:</div>
            <p>
              মোবাইল বা ডেস্কটপ টেলিগ্রাম অ্যাপ থেকে ইউজার বটকে মেসেজ দিলে বট স্বয়ংক্রিয়ভাবে এই ৯টি প্রশ্ন ক্রমান্বয়ে জিজ্ঞেস করবে এবং কাস্টম কিবোর্ড প্রদর্শন করবে।
            </p>
          </div>
        </div>

        {/* Live Webhook Logs */}
        <div className="bg-white rounded-2xl border border-emerald-200/90 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-emerald-950 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-700" />
              <span>Live Telegram Bot Activity Logs</span>
            </h4>
            <button
              onClick={fetchLogs}
              className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 cursor-pointer"
              title="Refresh logs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-4 text-center text-xs text-emerald-600 bg-emerald-50/50 rounded-xl">
              No incoming Telegram messages yet.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-[180px] overflow-y-auto font-mono text-[11px]">
              {logs.slice(0, 8).map((log, idx) => (
                <div key={idx} className="p-2 rounded-lg bg-emerald-50/70 border border-emerald-100 text-emerald-950">
                  <span className="text-emerald-600">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                  <span className="font-bold text-emerald-900">{log.text || log.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Approval Voucher Modal */}
      <ApprovalVoucherModal
        isOpen={pdfModalOpen}
        onClose={() => setPdfModalOpen(false)}
        expenses={expensesForPdf}
        appSettings={appSettings}
        onSavePdfConfig={onSavePdfConfig}
      />
    </div>
  );
};
