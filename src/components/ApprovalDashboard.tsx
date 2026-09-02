import React, { useState } from 'react';
import { Expense, ExpenseStatus, AppUser, AppSettings, ApprovalPdfConfig } from '../types';
import { ExpenseMonthlyBarChart } from './ExpenseMonthlyBarChart';
import { ApprovalVoucherModal } from './ApprovalVoucherModal';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  FileSpreadsheet,
  Download,
  Bot,
  MessageSquare,
  FileText,
  UserCheck,
  Building2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Check,
  X,
  Printer,
  Layers,
  Sparkles,
  Receipt,
  FileCheck,
  Lock,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';

export function getExpenseApprovalStage(exp: Expense) {
  if (exp.status === 'approved') {
    return {
      step1: 'approved' as const, // Abdulaziz
      step2: 'approved' as const, // Bulbul Mashrequi
      step3: 'approved' as const, // Nurul Alam (Final Approver)
      currentStep: 3,
      isFullyApproved: true,
      isRejected: false
    };
  }
  if (exp.status === 'rejected') {
    const s1 = exp.step1Approved ? ('approved' as const) : ('rejected' as const);
    const s2 = exp.step1Approved ? (exp.step2Approved ? ('approved' as const) : ('rejected' as const)) : ('locked' as const);
    const s3 = exp.step2Approved ? ('rejected' as const) : ('locked' as const);
    return {
      step1: s1,
      step2: s2,
      step3: s3,
      currentStep: 0,
      isFullyApproved: false,
      isRejected: true
    };
  }

  // Pending status
  const s1Done = !!exp.step1Approved;
  const s2Done = !!exp.step2Approved;

  if (s1Done && s2Done) {
    return {
      step1: 'approved' as const,
      step2: 'approved' as const,
      step3: 'pending' as const, // Unlocked for Final Approval (Nurul Alam)
      currentStep: 3 as const,
      isFullyApproved: false,
      isRejected: false
    };
  } else if (s1Done) {
    return {
      step1: 'approved' as const,
      step2: 'pending' as const, // Unlocked for Step 2 (Bulbul Mashrequi)
      step3: 'locked' as const,  // Locked for Final Approval
      currentStep: 2 as const,
      isFullyApproved: false,
      isRejected: false
    };
  } else {
    return {
      step1: 'pending' as const, // Unlocked for Step 1 (Abdulaziz)
      step2: 'locked' as const,  // Locked
      step3: 'locked' as const,  // Locked for Final Approval
      currentStep: 1 as const,
      isFullyApproved: false,
      isRejected: false
    };
  }
}

interface ApprovalProgressBarProps {
  exp: Expense;
  compact?: boolean;
}

const ApprovalProgressBar: React.FC<ApprovalProgressBarProps> = ({ exp, compact }) => {
  const stage = getExpenseApprovalStage(exp);

  return (
    <div className={`flex items-center ${compact ? 'gap-1' : 'gap-1.5'} flex-wrap my-1`}>
      {/* Step 1: Abdulaziz */}
      <div
        className={`flex items-center gap-1 ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
        } rounded-md font-bold border transition-all ${
          stage.step1 === 'approved'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : stage.step1 === 'rejected'
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : 'bg-amber-100 text-amber-950 border-amber-400 font-bold ring-1 ring-amber-300 shadow-xs'
        }`}
        title="Step 1 Approver: Abdulaziz"
      >
        {stage.step1 === 'approved' ? (
          <CheckCircle2 className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-600 shrink-0`} />
        ) : stage.step1 === 'rejected' ? (
          <XCircle className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-rose-600 shrink-0`} />
        ) : (
          <Clock className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-600 shrink-0 animate-pulse`} />
        )}
        <span>1. Abdulaziz</span>
      </div>

      <div className={`h-0.5 ${compact ? 'w-1.5' : 'w-2.5 sm:w-3'} ${stage.step1 === 'approved' ? 'bg-emerald-500' : 'bg-slate-300'}`} />

      {/* Step 2: Bulbul Mashrequi */}
      <div
        className={`flex items-center gap-1 ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
        } rounded-md font-bold border transition-all ${
          stage.step2 === 'approved'
            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
            : stage.step2 === 'rejected'
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : stage.step2 === 'pending'
            ? 'bg-amber-100 text-amber-950 border-amber-400 font-bold ring-1 ring-amber-300 shadow-xs'
            : 'bg-slate-100 text-slate-400 border-slate-200'
        }`}
        title="Step 2 Approver: Bulbul Mashrequi"
      >
        {stage.step2 === 'approved' ? (
          <CheckCircle2 className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-600 shrink-0`} />
        ) : stage.step2 === 'rejected' ? (
          <XCircle className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-rose-600 shrink-0`} />
        ) : stage.step2 === 'pending' ? (
          <Clock className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-600 shrink-0 animate-pulse`} />
        ) : (
          <Lock className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-slate-400 shrink-0`} />
        )}
        <span>2. Bulbul Mashrequi</span>
      </div>

      <div className={`h-0.5 ${compact ? 'w-1.5' : 'w-2.5 sm:w-3'} ${stage.step2 === 'approved' ? 'bg-emerald-500' : 'bg-slate-300'}`} />

      {/* Step 3: Nurul Alam (Final Approver) */}
      <div
        className={`flex items-center gap-1 ${
          compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'
        } rounded-md font-bold border transition-all ${
          stage.step3 === 'approved'
            ? 'bg-emerald-800 text-white border-emerald-900 shadow-xs'
            : stage.step3 === 'rejected'
            ? 'bg-rose-50 text-rose-800 border-rose-300'
            : stage.step3 === 'pending'
            ? 'bg-amber-100 text-amber-950 border-amber-500 font-extrabold ring-2 ring-amber-400 shadow-xs'
            : 'bg-slate-100 text-slate-400 border-slate-200'
        }`}
        title="Step 3 Final Approver: Nurul Alam"
      >
        {stage.step3 === 'approved' ? (
          <CheckCircle2 className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-emerald-300 shrink-0`} />
        ) : stage.step3 === 'rejected' ? (
          <XCircle className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-rose-600 shrink-0`} />
        ) : stage.step3 === 'pending' ? (
          <Clock className={`${compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-amber-700 shrink-0 animate-pulse`} />
        ) : (
          <Lock className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-slate-400 shrink-0`} />
        )}
        <span>3. Nurul Alam (Final)</span>
      </div>
    </div>
  );
};

interface ApprovalDashboardProps {
  expenses: Expense[];
  currentUser: AppUser;
  appSettings: AppSettings;
  onUpdateStatus: (expenseId: string, status: ExpenseStatus, notes: string, stepToApprove?: 1 | 2 | 3) => void;
  onSyncToSheets: (expense: Expense) => void;
  onSavePdfConfig?: (newConfig: ApprovalPdfConfig) => Promise<void>;
}

export const ApprovalDashboard: React.FC<ApprovalDashboardProps> = ({
  expenses,
  currentUser,
  appSettings,
  onUpdateStatus,
  onSyncToSheets,
  onSavePdfConfig
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [approverNotesInput, setApproverNotesInput] = useState<string>('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modal State for Approval Voucher / PDF
  const [pdfModalOpen, setPdfModalOpen] = useState<boolean>(false);
  const [expensesForPdf, setExpensesForPdf] = useState<Expense[]>([]);

  // Metrics calculations
  const totalSubmitted = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingCount = expenses.filter((e) => e.status === 'pending').length;
  const approvedTotal = expenses
    .filter((e) => e.status === 'approved')
    .reduce((acc, curr) => acc + curr.amount, 0);
  const rejectedCount = expenses.filter((e) => e.status === 'rejected').length;

  const filteredExpenses = expenses.filter((e) => {
    const matchesStatus = filterStatus === 'all' || e.status === filterStatus;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesStatus;

    const matchesSearch =
      e.userName.toLowerCase().includes(query) ||
      (e.employeeId && e.employeeId.toLowerCase().includes(query)) ||
      (e.userEmail && e.userEmail.toLowerCase().includes(query)) ||
      (e.description && e.description.toLowerCase().includes(query)) ||
      (e.category && e.category.toLowerCase().includes(query)) ||
      (e.project && e.project.toLowerCase().includes(query)) ||
      (e.id && e.id.toLowerCase().includes(query)) ||
      (e.batchId && e.batchId.toLowerCase().includes(query));
    return matchesStatus && matchesSearch;
  });

  const handleStepAction = (expenseId: string, status: ExpenseStatus, stepToApprove?: 1 | 2 | 3) => {
    onUpdateStatus(expenseId, status, approverNotesInput, stepToApprove);
    setApproverNotesInput('');
  };

  // Open PDF Voucher for a single expense
  const handleOpenSinglePdf = (exp: Expense) => {
    setExpensesForPdf([exp]);
    setPdfModalOpen(true);
  };

  // Open PDF Voucher for all items in a multi-item batch session
  const handleOpenBatchPdf = (batchId: string) => {
    const batchItems = expenses.filter((e) => e.batchId === batchId && e.status === 'approved');
    if (batchItems.length > 0) {
      setExpensesForPdf(batchItems);
      setPdfModalOpen(true);
    } else {
      // If none approved yet, open all in batch
      const allBatch = expenses.filter((e) => e.batchId === batchId);
      setExpensesForPdf(allBatch);
      setPdfModalOpen(true);
    }
  };

  // Open combined PDF for selected checkboxes
  const handleOpenSelectedPdf = () => {
    const selected = expenses.filter((e) => selectedExpenseIds.includes(e.id));
    if (selected.length > 0) {
      setExpensesForPdf(selected);
      setPdfModalOpen(true);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedExpenseIds.length === filteredExpenses.length) {
      setSelectedExpenseIds([]);
    } else {
      setSelectedExpenseIds(filteredExpenses.map((e) => e.id));
    }
  };

  const handleToggleSelectExpense = (id: string) => {
    if (selectedExpenseIds.includes(id)) {
      setSelectedExpenseIds((prev) => prev.filter((item) => item !== id));
    } else {
      setSelectedExpenseIds((prev) => [...prev, id]);
    }
  };

  const handleDownloadCsv = () => {
    const headers = [
      'Expense ID',
      'Batch ID',
      'Date',
      'User',
      'Department',
      'Category',
      'Amount',
      'Currency',
      'Description',
      'Status',
      'Approved By'
    ];
    const rows = filteredExpenses.map((exp) => [
      exp.id,
      exp.batchId || '',
      exp.date,
      exp.userName,
      exp.department || '',
      exp.category,
      exp.amount,
      exp.currency,
      `"${(exp.description || '').replace(/"/g, '""')}"`,
      exp.status,
      exp.approvedBy || ''
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expense_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedTotal = expenses
    .filter((e) => selectedExpenseIds.includes(e.id))
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-5 sm:space-y-6 font-sans">
      {/* Soothing Multi-Shade Green Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Spent */}
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-emerald-700">
          <div className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">
            Total Expenses in Ledger
          </div>
          <div className="text-xl sm:text-3xl font-black text-white mt-1">
            {totalSubmitted.toFixed(2)} <span className="text-xs sm:text-sm font-semibold text-emerald-200">SAR</span>
          </div>
          <div className="text-xs text-emerald-300/80 mt-1 font-medium">
            Total {expenses.length} records recorded
          </div>
        </div>

        {/* Card 2: Pending Approvals */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-amber-200">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide flex items-center justify-between">
            <span>Pending Approvals</span>
            {pendingCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>}
          </div>
          <div className="text-xl sm:text-3xl font-black text-amber-600 mt-1">
            {pendingCount} <span className="text-xs sm:text-sm font-semibold text-amber-700">items</span>
          </div>
          <div className="text-xs text-amber-800/70 mt-1 font-medium">
            Ready for manager authorization
          </div>
        </div>

        {/* Card 3: Approved Total */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-emerald-200">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            Approved & Verified Total
          </div>
          <div className="text-xl sm:text-3xl font-black text-emerald-700 mt-1">
            {approvedTotal.toFixed(2)} <span className="text-xs sm:text-sm font-semibold text-emerald-600">SAR</span>
          </div>
          <div className="text-xs text-emerald-700/80 mt-1 font-medium">
            Ready for PDF voucher generation
          </div>
        </div>

        {/* Card 4: Rejected */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-emerald-100">
          <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wide">
            Rejected Requests
          </div>
          <div className="text-xl sm:text-3xl font-black text-emerald-950 mt-1">
            {rejectedCount} <span className="text-xs sm:text-sm font-semibold text-emerald-700">items</span>
          </div>
          <div className="text-xs text-emerald-600 mt-1 font-medium">
            Non-compliant claims
          </div>
        </div>
      </div>

      {/* Monthly Category & Status Expense Analytics Chart */}
      <ExpenseMonthlyBarChart expenses={expenses} />

      {/* Batch Selection Action Bar (Appears when items are selected) */}
      {selectedExpenseIds.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-900 to-emerald-800 text-white p-4 rounded-2xl border border-emerald-700 shadow-lg flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-emerald-200 flex items-center justify-center font-bold">
              {selectedExpenseIds.length}
            </div>
            <div>
              <div className="font-bold text-sm text-white">
                {selectedExpenseIds.length} expense{selectedExpenseIds.length > 1 ? 's' : ''} selected
              </div>
              <div className="text-xs text-emerald-300">
                Combined Sum: <span className="font-bold text-white">{selectedTotal.toFixed(2)} SAR</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenSelectedPdf}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>Generate Combined Approval PDF ({selectedExpenseIds.length} items)</span>
            </button>
            <button
              onClick={() => setSelectedExpenseIds([])}
              className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-emerald-200 text-xs font-semibold cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Control Bar: Search & Filter Tabs */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-emerald-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ledger by employee, category, voucher ID, batch ID..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 text-xs sm:text-sm font-medium text-emerald-950 outline-hidden transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 bg-emerald-50 p-1 rounded-xl border border-emerald-200/80">
            {[
              { id: 'all', label: 'All Ledger' },
              { id: 'pending', label: 'Pending', count: pendingCount },
              { id: 'approved', label: 'Approved' },
              { id: 'rejected', label: 'Rejected' }
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                  filterStatus === st.id
                    ? 'bg-emerald-700 text-white shadow-xs'
                    : 'text-emerald-900 hover:bg-emerald-100/70'
                }`}
              >
                {st.label} {st.count !== undefined && st.count > 0 && `(${st.count})`}
              </button>
            ))}
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-300/70 shadow-xs"
          >
            <Download className="w-4 h-4 text-emerald-700" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Mobile Card List View (< md screens) */}
      <div className="block md:hidden space-y-3">
        {filteredExpenses.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-emerald-200 text-center text-emerald-700 text-sm font-medium">
            No expense records found in ledger.
          </div>
        ) : (
          filteredExpenses.map((exp) => {
            const stage = getExpenseApprovalStage(exp);
            return (
              <div
                key={exp.id}
                className="bg-white p-4 rounded-2xl border border-emerald-200/90 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedExpenseIds.includes(exp.id)}
                      onChange={() => handleToggleSelectExpense(exp.id)}
                      className="w-4 h-4 text-emerald-700 rounded-md border-emerald-300 focus:ring-emerald-400"
                    />
                    <span className="font-bold text-emerald-950 text-xs sm:text-sm">{exp.id}</span>
                    {exp.batchId && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                        Batch #{exp.batchIndex || 1}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                      stage.isFullyApproved
                        ? 'bg-emerald-100 text-emerald-800'
                        : stage.isRejected
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-900 font-bold'
                    }`}
                  >
                    {stage.isFullyApproved
                      ? '✓ Fully Approved'
                      : stage.isRejected
                      ? 'Rejected'
                      : `Pending Step ${stage.currentStep}`}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-bold text-emerald-950 text-sm sm:text-base">{exp.userName}</div>
                    <div className="text-xs text-emerald-700 font-medium mt-0.5">
                      {exp.department || 'General'} • <span className="font-semibold text-emerald-900">{exp.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-lg text-emerald-900">
                      {exp.amount.toFixed(2)} <span className="text-xs font-semibold">{exp.currency}</span>
                    </div>
                    <span className="text-[11px] text-emerald-600 font-medium">{exp.date}</span>
                  </div>
                </div>

                {/* 3-Step Progress Bar in Mobile Card */}
                <div className="bg-emerald-50/50 p-2 rounded-xl border border-emerald-100">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-800 mb-1">
                    Approval Progress Sequence:
                  </div>
                  <ApprovalProgressBar exp={exp} compact />
                </div>

                {exp.description && (
                  <p className="text-xs text-emerald-900 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                    {exp.description}
                  </p>
                )}

                {/* Action Buttons: Hierarchical Sequence */}
                <div className="flex flex-col gap-2 pt-2 border-t border-emerald-100">
                  <div className="flex items-center justify-between gap-2">
                    {exp.receiptUrl && (
                      <button
                        onClick={() => setPreviewImage(exp.receiptUrl || null)}
                        className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-semibold text-xs"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Receipt</span>
                      </button>
                    )}

                    {stage.isFullyApproved ? (
                      <button
                        onClick={() => handleOpenSinglePdf(exp)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs cursor-pointer ml-auto"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>📄 Approval PDF</span>
                      </button>
                    ) : stage.isRejected ? (
                      <span className="text-xs text-rose-600 font-semibold ml-auto">Rejected</span>
                    ) : stage.currentStep === 1 ? (
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => handleStepAction(exp.id, 'pending', 1)}
                          className="py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve Step 1 (Abdulaziz)
                        </button>
                        <button
                          onClick={() => handleStepAction(exp.id, 'rejected')}
                          className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : stage.currentStep === 2 ? (
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => handleStepAction(exp.id, 'pending', 2)}
                          className="py-1.5 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" /> Approve Step 2 (Bulbul)
                        </button>
                        <button
                          onClick={() => handleStepAction(exp.id, 'rejected')}
                          className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => handleStepAction(exp.id, 'approved', 3)}
                          className="py-1.5 px-3 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-black text-xs flex items-center gap-1 shadow-md cursor-pointer ring-2 ring-emerald-400"
                        >
                          <ShieldCheck className="w-4 h-4 text-emerald-300" /> Final Approve (Nurul Alam)
                        </button>
                        <button
                          onClick={() => handleStepAction(exp.id, 'rejected')}
                          className="py-1.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>

                  {!stage.isFullyApproved && !stage.isRejected && stage.currentStep < 3 && (
                    <div className="text-[10px] text-amber-800 bg-amber-50 p-1.5 rounded-lg border border-amber-200 flex items-center gap-1 justify-center">
                      <Lock className="w-3 h-3 text-amber-600 shrink-0" />
                      <span>
                        Final Approval (Nurul Alam) is <strong>locked</strong> until preceding steps complete.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Rich Table View (>= md screens) */}
      <div className="hidden md:block bg-white rounded-2xl border border-emerald-200/90 shadow-sm overflow-hidden">
        <div className="p-4 bg-emerald-900 text-white font-semibold text-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-bold tracking-wide">Expense Ledger & 3-Step Approval Workflow</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-800 text-emerald-200 font-semibold">
              {filteredExpenses.length} entries
            </span>
          </div>

          <div className="text-xs text-emerald-200 flex items-center gap-2">
            <span>Approval Sequence: <strong>1. Abdulaziz</strong> ➔ <strong>2. Bulbul Mashrequi</strong> ➔ <strong>3. Nurul Alam (Final)</strong></span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-emerald-950">
            <thead className="bg-emerald-50 text-[11px] font-bold text-emerald-800 uppercase tracking-wider border-b border-emerald-200">
              <tr>
                <th className="p-3 pl-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredExpenses.length > 0 &&
                      selectedExpenseIds.length === filteredExpenses.length
                    }
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-emerald-700 rounded-md border-emerald-300 focus:ring-emerald-400 cursor-pointer"
                    title="Select All"
                  />
                </th>
                <th className="p-3">Voucher ID & Date</th>
                <th className="p-3">Employee / Claimant</th>
                <th className="p-3">Category & Purpose</th>
                <th className="p-3">Amount (SAR)</th>
                <th className="p-3">Approval Progress Bar</th>
                <th className="p-3">Receipt</th>
                <th className="p-3 text-right pr-5">Action & Approval Stage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100 font-medium">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-emerald-600 text-sm">
                    No expense records found in ledger.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const stage = getExpenseApprovalStage(exp);
                  return (
                    <tr
                      key={exp.id}
                      className={`hover:bg-emerald-50/50 transition-colors ${
                        selectedExpenseIds.includes(exp.id) ? 'bg-emerald-50/70' : ''
                      }`}
                    >
                      <td className="p-3 pl-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedExpenseIds.includes(exp.id)}
                          onChange={() => handleToggleSelectExpense(exp.id)}
                          className="w-4 h-4 text-emerald-700 rounded-md border-emerald-300 focus:ring-emerald-400 cursor-pointer"
                        />
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-emerald-950 font-mono text-xs">{exp.id}</div>
                        <div className="text-[11px] text-emerald-600 mt-0.5">{exp.date}</div>
                        {exp.batchId && (
                          <button
                            onClick={() => handleOpenBatchPdf(exp.batchId!)}
                            className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200 px-1.5 py-0.5 rounded-md font-semibold mt-1 transition-colors cursor-pointer"
                            title="View all expenses from this batch session"
                          >
                            <Layers className="w-2.5 h-2.5" />
                            <span>Batch #{exp.batchIndex || 1} of {exp.batchTotalCount || 1}</span>
                          </button>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-emerald-950">{exp.userName}</div>
                        <div className="text-[11px] text-emerald-700">
                          {exp.employeeId ? `ID: ${exp.employeeId} • ` : ''}
                          {exp.department || 'General'}
                        </div>
                      </td>

                      <td className="p-3 max-w-xs">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold mb-1">
                          {exp.category}
                        </span>
                        <div className="text-xs text-emerald-900 line-clamp-2 leading-snug">
                          {exp.description}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="font-bold text-base text-emerald-950 font-mono">
                          {exp.amount.toFixed(2)}
                        </span>{' '}
                        <span className="text-xs font-semibold text-emerald-700">{exp.currency}</span>
                      </td>

                      {/* Visual 3-Step Progress Bar Column */}
                      <td className="p-3">
                        <ApprovalProgressBar exp={exp} />
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {exp.receiptUrl ? (
                          <button
                            onClick={() => setPreviewImage(exp.receiptUrl || null)}
                            className="flex items-center gap-1 text-emerald-700 hover:text-emerald-900 text-xs font-semibold cursor-pointer underline"
                          >
                            <ImageIcon className="w-4 h-4" />
                            <span>View</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-normal">N/A</span>
                        )}
                      </td>

                      {/* PDF Voucher Button / Approver Actions */}
                      <td className="p-3 text-right pr-5 whitespace-nowrap">
                        {stage.isFullyApproved ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenSinglePdf(exp)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                              title="View and Print 1-Page Approval PDF Voucher"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>📄 Approval PDF</span>
                            </button>
                          </div>
                        ) : stage.isRejected ? (
                          <span className="text-xs text-rose-600 font-semibold">
                            Rejected
                          </span>
                        ) : stage.currentStep === 1 ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStepAction(exp.id, 'pending', 1)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                title="Approve Step 1: Abdulaziz"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve Step 1 (Abdulaziz)
                              </button>
                              <button
                                onClick={() => handleStepAction(exp.id, 'rejected')}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                            <div className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-amber-600" />
                              <span>Final Approval (Nurul Alam) locked</span>
                            </div>
                          </div>
                        ) : stage.currentStep === 2 ? (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleStepAction(exp.id, 'pending', 2)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                                title="Approve Step 2: Bulbul Mashrequi"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve Step 2 (Bulbul)
                              </button>
                              <button
                                onClick={() => handleStepAction(exp.id, 'rejected')}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                            <div className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5 text-amber-600" />
                              <span>Final Approval (Nurul Alam) locked</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleStepAction(exp.id, 'approved', 3)}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-black transition-all shadow-md cursor-pointer flex items-center gap-1.5 ring-2 ring-emerald-400"
                              title="Final Approval: Nurul Alam"
                            >
                              <ShieldCheck className="w-4 h-4 text-emerald-300" /> Final Approve (Nurul Alam)
                            </button>
                            <button
                              onClick={() => handleStepAction(exp.id, 'rejected')}
                              className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1"
                            >
                              <X className="w-3.5 h-3.5" /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-4 space-y-4 shadow-2xl border border-emerald-200">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <h4 className="font-bold text-emerald-950 text-sm">Attached Receipt Preview</h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto flex items-center justify-center bg-emerald-50/50 rounded-xl p-2">
              <img
                src={previewImage}
                alt="Receipt Attachment"
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Approval Voucher Modal (Single Page A4 Corporate PDF Format) */}
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
