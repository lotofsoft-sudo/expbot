import React, { useState, useMemo } from 'react';
import { Expense, AppUser, AppSettings, StatementPeriodType, ExpenseStatus, ApprovalPdfConfig } from '../types';
import { ApprovalVoucherModal } from './ApprovalVoucherModal';
import {
  Calendar,
  User,
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  CreditCard,
  Receipt,
  Layers,
  ChevronRight,
  TrendingUp,
  UserPlus,
  Edit2,
  DollarSign,
  Briefcase,
  Mail,
  Phone,
  Image as ImageIcon,
  ExternalLink,
  ChevronLeft,
  ChevronDown
} from 'lucide-react';

interface EmployeeStatementViewProps {
  expenses: Expense[];
  users: AppUser[];
  currentUser: AppUser;
  appSettings: AppSettings;
  onSaveUser: (user: AppUser) => Promise<boolean>;
  onSelectCurrentUser?: (user: AppUser) => void;
  onSavePdfConfig?: (newConfig: ApprovalPdfConfig) => Promise<void>;
}

export const EmployeeStatementView: React.FC<EmployeeStatementViewProps> = ({
  expenses,
  users,
  currentUser,
  appSettings,
  onSaveUser,
  onSelectCurrentUser,
  onSavePdfConfig
}) => {
  // Selected Employee (defaults to currentUser if employee, or first employee)
  const [selectedUserId, setSelectedUserId] = useState<string>(currentUser.uid);
  
  // Period filter mode: weekly, monthly, yearly, custom, all
  const [periodType, setPeriodType] = useState<StatementPeriodType>('monthly');
  
  // Dates for filters
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12
  
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedWeekOffset, setSelectedWeekOffset] = useState<number>(0); // 0 = this week, -1 = last week, etc.
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(today.getTime() - 86400000 * 30).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(today.toISOString().split('T')[0]);

  // Search & Status filters within statement
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [receiptModalImage, setReceiptModalImage] = useState<string | null>(null);

  // Add / Edit Employee Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [userNameInput, setUserNameInput] = useState<string>('');
  const [userEmailInput, setUserEmailInput] = useState<string>('');
  const [userEmployeeIdInput, setUserEmployeeIdInput] = useState<string>('');
  const [userDeptInput, setUserDeptInput] = useState<string>('');
  const [userDesignationInput, setUserDesignationInput] = useState<string>('');
  const [userPhoneInput, setUserPhoneInput] = useState<string>('');
  const [userRoleInput, setUserRoleInput] = useState<'employee' | 'approver' | 'admin'>('employee');

  // Print / PDF Statement Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [pdfExpenses, setPdfExpenses] = useState<Expense[]>([]);

  const isAdmin = currentUser.role === 'admin';

  // Selectable users based on role permission
  const selectableUsers = useMemo(() => {
    if (isAdmin) return users;
    const self = users.filter((u) => u.uid === currentUser.uid || u.email.toLowerCase() === currentUser.email.toLowerCase());
    return self.length > 0 ? self : [currentUser];
  }, [users, currentUser, isAdmin]);

  // The active employee object
  const activeEmployee = useMemo(() => {
    return selectableUsers.find((u) => u.uid === selectedUserId) || selectableUsers[0] || currentUser;
  }, [selectableUsers, selectedUserId, currentUser]);

  // Compute start and end date for current selected period
  const { periodStart, periodEnd, periodLabelBn, periodLabelEn } = useMemo(() => {
    if (periodType === 'weekly') {
      // Calculate week start (Sunday or Monday) with offset
      const d = new Date();
      const day = d.getDay(); // 0 = Sunday
      const diffToSunday = d.getDate() - day + selectedWeekOffset * 7;
      const weekStart = new Date(d.setDate(diffToSunday));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const startStr = weekStart.toISOString().split('T')[0];
      const endStr = weekEnd.toISOString().split('T')[0];

      let labelBn = 'চলতি সপ্তাহ';
      let labelEn = 'This Week';
      if (selectedWeekOffset === -1) {
        labelBn = 'গত সপ্তাহ';
        labelEn = 'Last Week';
      } else if (selectedWeekOffset < -1) {
        labelBn = `${Math.abs(selectedWeekOffset)} সপ্তাহ পূর্বে`;
        labelEn = `${Math.abs(selectedWeekOffset)} Weeks Ago`;
      }

      return {
        periodStart: startStr,
        periodEnd: endStr,
        periodLabelBn: `${labelBn} (${startStr} থেকে ${endStr})`,
        periodLabelEn: `${labelEn} (${startStr} to ${endStr})`
      };
    } else if (periodType === 'monthly') {
      const monthStr = String(selectedMonth).padStart(2, '0');
      const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
      const startStr = `${selectedYear}-${monthStr}-01`;
      const endStr = `${selectedYear}-${monthStr}-${String(lastDay).padStart(2, '0')}`;

      const monthNamesBn = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
      ];
      const monthNamesEn = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];

      return {
        periodStart: startStr,
        periodEnd: endStr,
        periodLabelBn: `${monthNamesBn[selectedMonth - 1]} ${selectedYear}`,
        periodLabelEn: `${monthNamesEn[selectedMonth - 1]} ${selectedYear}`
      };
    } else if (periodType === 'yearly') {
      const startStr = `${selectedYear}-01-01`;
      const endStr = `${selectedYear}-12-31`;
      return {
        periodStart: startStr,
        periodEnd: endStr,
        periodLabelBn: `বাৎসরিক স্টেটমেন্ট ${selectedYear}`,
        periodLabelEn: `Yearly Statement ${selectedYear}`
      };
    } else if (periodType === 'custom') {
      return {
        periodStart: customStartDate,
        periodEnd: customEndDate,
        periodLabelBn: `${customStartDate} থেকে ${customEndDate}`,
        periodLabelEn: `${customStartDate} to ${customEndDate}`
      };
    } else {
      return {
        periodStart: '1970-01-01',
        periodEnd: '2099-12-31',
        periodLabelBn: 'সকল সময়ের স্টেটমেন্ট',
        periodLabelEn: 'All-Time Statement'
      };
    }
  }, [periodType, selectedYear, selectedMonth, selectedWeekOffset, customStartDate, customEndDate]);

  // Filter expenses strictly by active Employee (matches by employeeId, userId, or userEmail)
  const employeeAllExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchEmpId =
        activeEmployee.employeeId && e.employeeId && e.employeeId.toLowerCase() === activeEmployee.employeeId.toLowerCase();
      const matchUserId = e.userId === activeEmployee.uid;
      const matchEmail =
        e.userEmail && activeEmployee.email && e.userEmail.toLowerCase() === activeEmployee.email.toLowerCase();
      const matchName =
        e.userName && activeEmployee.displayName && e.userName.toLowerCase() === activeEmployee.displayName.toLowerCase();

      return matchEmpId || matchUserId || matchEmail || matchName;
    });
  }, [expenses, activeEmployee]);

  // Filter by Date Period
  const periodExpenses = useMemo(() => {
    return employeeAllExpenses.filter((e) => {
      const expDate = e.date || (e.createdAt ? e.createdAt.split('T')[0] : '');
      if (!expDate) return false;
      return expDate >= periodStart && expDate <= periodEnd;
    });
  }, [employeeAllExpenses, periodStart, periodEnd]);

  // Filter by Search and Status within current period
  const displayExpenses = useMemo(() => {
    return periodExpenses.filter((e) => {
      const matchStatus = statusFilter === 'all' || e.status === statusFilter;
      const query = searchQuery.toLowerCase().trim();
      if (!query) return matchStatus;

      const matchSearch =
        (e.id && e.id.toLowerCase().includes(query)) ||
        (e.category && e.category.toLowerCase().includes(query)) ||
        (e.description && e.description.toLowerCase().includes(query)) ||
        (e.project && e.project.toLowerCase().includes(query)) ||
        (e.paymentMethod && e.paymentMethod.toLowerCase().includes(query)) ||
        (e.vatStatus && e.vatStatus.toLowerCase().includes(query)) ||
        (e.approvedBy && e.approvedBy.toLowerCase().includes(query));

      return matchStatus && matchSearch;
    });
  }, [periodExpenses, statusFilter, searchQuery]);

  // Financial Metrics for this period
  const totalAmount = useMemo(() => {
    return periodExpenses.reduce((sum, e) => sum + (e.amount || e.totalAmount || 0), 0);
  }, [periodExpenses]);

  const approvedExpenses = useMemo(() => {
    return periodExpenses.filter((e) => e.status === 'approved');
  }, [periodExpenses]);

  const approvedTotal = useMemo(() => {
    return approvedExpenses.reduce((sum, e) => sum + (e.amount || e.totalAmount || 0), 0);
  }, [approvedExpenses]);

  const pendingExpenses = useMemo(() => {
    return periodExpenses.filter((e) => e.status === 'pending');
  }, [periodExpenses]);

  const pendingTotal = useMemo(() => {
    return pendingExpenses.reduce((sum, e) => sum + (e.amount || e.totalAmount || 0), 0);
  }, [pendingExpenses]);

  const rejectedExpenses = useMemo(() => {
    return periodExpenses.filter((e) => e.status === 'rejected');
  }, [periodExpenses]);

  const rejectedTotal = useMemo(() => {
    return rejectedExpenses.reduce((sum, e) => sum + (e.amount || e.totalAmount || 0), 0);
  }, [rejectedExpenses]);

  // VAT & Payment Method breakdowns
  const withVatTotal = useMemo(() => {
    return periodExpenses
      .filter((e) => (e.vatStatus || '').toLowerCase().includes('with vat') || (e.vatStatus || '').toLowerCase().includes('ভ্যাট সহ'))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [periodExpenses]);

  const withoutVatTotal = totalAmount - withVatTotal;

  const cashTotal = useMemo(() => {
    return periodExpenses
      .filter((e) => (e.paymentMethod || '').toLowerCase().includes('cash') || (e.paymentMethod || '').toLowerCase().includes('ক্যাশ'))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [periodExpenses]);

  const bankTotal = useMemo(() => {
    return periodExpenses
      .filter((e) => (e.paymentMethod || '').toLowerCase().includes('bank') || (e.paymentMethod || '').toLowerCase().includes('ব্যাংক'))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [periodExpenses]);

  // Category breakdown for charts/progress
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of periodExpenses) {
      const cat = e.category || 'General Expense';
      map[cat] = (map[cat] || 0) + (e.amount || 0);
    }
    return Object.entries(map)
      .map(([name, sum]) => ({
        name,
        amount: sum,
        percentage: totalAmount > 0 ? (sum / totalAmount) * 100 : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [periodExpenses, totalAmount]);

  // Open User Modal for Add / Edit
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserNameInput('');
    setUserEmailInput('');
    setUserEmployeeIdInput(`KSA-${Math.floor(4020 + users.length + 1)}`);
    setUserDeptInput('Sales & Field Operations');
    setUserDesignationInput('Field Executive');
    setUserPhoneInput('+966 50 ');
    setUserRoleInput('employee');
    setIsUserModalOpen(true);
  };

  const handleOpenEditUser = (u: AppUser) => {
    setEditingUser(u);
    setUserNameInput(u.displayName);
    setUserEmailInput(u.email);
    setUserEmployeeIdInput(u.employeeId);
    setUserDeptInput(u.department);
    setUserDesignationInput(u.designation || '');
    setUserPhoneInput(u.phone || '');
    setUserRoleInput(u.role);
    setIsUserModalOpen(true);
  };

  const handleSaveUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNameInput.trim() || !userEmployeeIdInput.trim()) return;

    const userToSave: AppUser = {
      uid: editingUser ? editingUser.uid : `usr_${Date.now()}`,
      displayName: userNameInput.trim(),
      email: userEmailInput.trim() || `${userNameInput.toLowerCase().replace(/\s+/g, '.')}@alfalak.sa`,
      employeeId: userEmployeeIdInput.trim(),
      department: userDeptInput.trim() || 'General Operations',
      designation: userDesignationInput.trim(),
      phone: userPhoneInput.trim(),
      role: userRoleInput,
      telegramHandle: editingUser?.telegramHandle || `@${userNameInput.toLowerCase().replace(/\s+/g, '_')}`
    };

    await onSaveUser(userToSave);
    setSelectedUserId(userToSave.uid);
    setIsUserModalOpen(false);
  };

  // Export CSV of Statement
  const handleExportStatementCsv = () => {
    const headers = [
      'Expense ID',
      'Date',
      'Employee Name',
      'Employee ID',
      'Department',
      'Category (Q2)',
      'Description (Q3)',
      'Amount (SAR - Q1/Q4)',
      'VAT Status (Q5)',
      'Payment Method (Q6)',
      'Project (Q7)',
      'Approved By (Q8)',
      'Approval Status',
      'Submission Channel'
    ];

    const rows = displayExpenses.map((e) => [
      e.id,
      e.date,
      `"${activeEmployee.displayName.replace(/"/g, '""')}"`,
      `"${activeEmployee.employeeId}"`,
      `"${activeEmployee.department.replace(/"/g, '""')}"`,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      (e.amount || 0).toFixed(2),
      `"${(e.vatStatus || '').replace(/"/g, '""')}"`,
      `"${(e.paymentMethod || '').replace(/"/g, '""')}"`,
      `"${(e.project || '').replace(/"/g, '""')}"`,
      `"${(e.approvedBy || '').replace(/"/g, '""')}"`,
      e.status,
      e.submittedVia
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Employee_Statement_${activeEmployee.employeeId}_${periodType}_${periodStart}_to_${periodEnd}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Toggle selection for a single expense
  const handleToggleSelectExpense = (id: string) => {
    setSelectedExpenseIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Toggle selection for all currently visible approved expenses
  const handleToggleSelectAllApproved = () => {
    const approvedIds = displayExpenses.filter((e) => e.status === 'approved').map((e) => e.id);
    if (approvedIds.length === 0) return;

    const areAllApprovedSelected = approvedIds.every((id) => selectedExpenseIds.includes(id));
    if (areAllApprovedSelected) {
      setSelectedExpenseIds((prev) => prev.filter((id) => !approvedIds.includes(id)));
    } else {
      setSelectedExpenseIds((prev) => Array.from(new Set([...prev, ...approvedIds])));
    }
  };

  // Generate PDF for selected expenses (or all approved expenses if none explicitly selected)
  const handleOpenSelectedPdf = (overrideExpenses?: Expense[]) => {
    if (overrideExpenses && overrideExpenses.length > 0) {
      setPdfExpenses(overrideExpenses);
      setIsPrintModalOpen(true);
      return;
    }

    const selected = displayExpenses.filter((e) => selectedExpenseIds.includes(e.id));
    if (selected.length > 0) {
      setPdfExpenses(selected);
    } else {
      // Default to approved expenses or all display expenses
      const approved = displayExpenses.filter((e) => e.status === 'approved');
      setPdfExpenses(approved.length > 0 ? approved : displayExpenses);
    }
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner: Employee Selection & Profile Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Employee Info Header */}
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-800 to-emerald-950 text-white flex items-center justify-center font-bold text-xl sm:text-2xl shadow-md border-2 border-emerald-500/40 shrink-0">
              {activeEmployee.displayName.charAt(0)}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-tight">
                  {activeEmployee.displayName}
                </h2>
                <span className="bg-emerald-800 text-emerald-100 font-mono font-bold text-xs px-2.5 py-0.5 rounded-lg border border-emerald-700">
                  আইডি: {activeEmployee.employeeId}
                </span>
                <span className="bg-emerald-100 text-emerald-800 font-bold text-xs px-2.5 py-0.5 rounded-lg uppercase">
                  {activeEmployee.role}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-emerald-800 flex flex-wrap items-center gap-x-4 gap-y-1 font-medium">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  {activeEmployee.department}
                </span>
                {activeEmployee.designation && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                    {activeEmployee.designation}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-emerald-600" />
                  {activeEmployee.email}
                </span>
                {activeEmployee.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" />
                    {activeEmployee.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons & Employee Switcher Dropdown */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2 lg:pt-0 border-t lg:border-t-0 border-emerald-100">
            {/* Employee Selector Dropdown */}
            {isAdmin ? (
              <div className="relative min-w-[200px] sm:min-w-[230px]">
                <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block mb-1">
                  এমপ্লয়ি নির্বাচন করুন (Select Employee):
                </label>
                <div className="relative">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-300 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer appearance-none shadow-xs"
                  >
                    {selectableUsers.map((u) => (
                      <option key={u.uid} value={u.uid}>
                        {u.displayName} ({u.employeeId}) — {u.department}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-emerald-700 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50/80 px-3 py-2 rounded-xl border border-emerald-200">
                <span className="text-[10px] font-bold uppercase text-emerald-700 block">আপনার স্টেটমেন্ট (Your Statement)</span>
                <span className="text-xs font-bold text-emerald-950">{activeEmployee.displayName} ({activeEmployee.employeeId})</span>
              </div>
            )}

            {/* Edit / Add Employee buttons */}
            <div className="flex items-end gap-2 self-end">
              <button
                onClick={() => handleOpenEditUser(activeEmployee)}
                className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Edit Employee Information"
              >
                <Edit2 className="w-3.5 h-3.5 text-emerald-700" />
                <span className="hidden sm:inline">এডিট</span>
              </button>

              {isAdmin && (
                <button
                  onClick={handleOpenAddUser}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5 text-emerald-300" />
                  <span>নতুন এমপ্লয়ি</span>
                </button>
              )}

              {isAdmin && onSelectCurrentUser && currentUser.uid !== activeEmployee.uid && (
                <button
                  onClick={() => onSelectCurrentUser(activeEmployee)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                  title="Make this user active for submitting new expenses"
                >
                  স্যুইচ
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Employee Pills Carousel (Admin Only) */}
        {isAdmin && selectableUsers.length > 1 && (
          <div className="mt-4 pt-3 border-t border-emerald-100 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <span className="text-[11px] font-bold text-emerald-800 whitespace-nowrap">
              কুইক সুইচ:
            </span>
            {selectableUsers.map((u) => {
              const isSelected = u.uid === selectedUserId;
              return (
                <button
                  key={u.uid}
                  onClick={() => setSelectedUserId(u.uid)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100/80 text-emerald-900 border border-emerald-200/80'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>{u.displayName}</span>
                  <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-emerald-200 text-emerald-800'}`}>
                    {u.employeeId}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Statement Period Tabs & Controls */}
      <div className="bg-white rounded-3xl p-5 border border-emerald-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Main Statement Period Selector Tabs */}
          <div>
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider mb-1.5">
              স্টেটমেন্টের সময়কাল নির্বাচন করুন (Statement Period):
            </div>
            <div className="flex flex-wrap items-center gap-1.5 bg-emerald-50/90 p-1.5 rounded-2xl border border-emerald-200">
              <button
                onClick={() => setPeriodType('weekly')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  periodType === 'weekly'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>উইকলি (Weekly)</span>
              </button>

              <button
                onClick={() => setPeriodType('monthly')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  periodType === 'monthly'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>মান্থলি (Monthly)</span>
              </button>

              <button
                onClick={() => setPeriodType('yearly')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  periodType === 'yearly'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>ইয়ারলি (Yearly)</span>
              </button>

              <button
                onClick={() => setPeriodType('custom')}
                className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  periodType === 'custom'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>কাস্টম (Custom)</span>
              </button>

              <button
                onClick={() => setPeriodType('all')}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  periodType === 'all'
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'text-emerald-900 hover:bg-emerald-100'
                }`}
              >
                <span>সব সময় (All-Time)</span>
              </button>
            </div>
          </div>

          {/* Export & Print Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-end">
            <button
              onClick={() => handleOpenSelectedPdf()}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-200" />
              <span>
                {selectedExpenseIds.length > 0
                  ? `জেনারেট পিডিএফ (${selectedExpenseIds.length}টি)`
                  : 'প্রিন্ট / PDF ভাউচার'}
              </span>
            </button>

            <button
              onClick={handleExportStatementCsv}
              className="bg-white hover:bg-emerald-50 text-emerald-900 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>CSV এক্সপোর্ট</span>
            </button>
          </div>
        </div>

        {/* Dynamic Period Sub-Controls */}
        <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-100 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          {/* Weekly Controls */}
          {periodType === 'weekly' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-emerald-900">সপ্তাহ নির্বাচন:</span>
              <button
                onClick={() => setSelectedWeekOffset(0)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                  selectedWeekOffset === 0
                    ? 'bg-emerald-800 text-white'
                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                চলতি সপ্তাহ (This Week)
              </button>
              <button
                onClick={() => setSelectedWeekOffset(-1)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs cursor-pointer ${
                  selectedWeekOffset === -1
                    ? 'bg-emerald-800 text-white'
                    : 'bg-white text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
                }`}
              >
                গত সপ্তাহ (Last Week)
              </button>
              <button
                onClick={() => setSelectedWeekOffset((prev) => prev - 1)}
                className="p-1 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 cursor-pointer"
                title="Previous Week"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedWeekOffset((prev) => Math.min(0, prev + 1))}
                disabled={selectedWeekOffset >= 0}
                className="p-1 rounded-lg bg-white border border-emerald-200 hover:bg-emerald-100 text-emerald-800 cursor-pointer disabled:opacity-40"
                title="Next Week"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <span className="font-semibold text-emerald-950 bg-white px-3 py-1 rounded-lg border border-emerald-200 text-xs">
                তারিখ: {periodStart} থেকে {periodEnd}
              </span>
            </div>
          )}

          {/* Monthly Controls */}
          {periodType === 'monthly' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-emerald-900">মাস ও বছর:</span>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="bg-white border border-emerald-300 font-bold text-emerald-950 px-3 py-1.5 rounded-xl text-xs sm:text-sm cursor-pointer shadow-2xs"
              >
                <option value={1}>জানুয়ারি (January)</option>
                <option value={2}>ফেব্রুয়ারি (February)</option>
                <option value={3}>মার্চ (March)</option>
                <option value={4}>এপ্রিল (April)</option>
                <option value={5}>মে (May)</option>
                <option value={6}>জুন (June)</option>
                <option value={7}>জুলাই (July)</option>
                <option value={8}>আগস্ট (August)</option>
                <option value={9}>সেপ্টেম্বর (September)</option>
                <option value={10}>অক্টোবর (October)</option>
                <option value={11}>নভেম্বর (November)</option>
                <option value={12}>ডিসেম্বর (December)</option>
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-emerald-300 font-bold text-emerald-950 px-3 py-1.5 rounded-xl text-xs sm:text-sm cursor-pointer shadow-2xs"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>

              <span className="font-semibold text-emerald-950 bg-white px-3 py-1 rounded-lg border border-emerald-200 text-xs">
                তারিখ সীমা: {periodStart} থেকে {periodEnd}
              </span>
            </div>
          )}

          {/* Yearly Controls */}
          {periodType === 'yearly' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-emerald-900">বছর নির্বাচন:</span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-emerald-300 font-bold text-emerald-950 px-3 py-1.5 rounded-xl text-xs sm:text-sm cursor-pointer shadow-2xs"
              >
                <option value={2024}>2024 (সম্পূর্ণ বছর)</option>
                <option value={2025}>2025 (সম্পূর্ণ বছর)</option>
                <option value={2026}>2026 (চলতি বছর)</option>
                <option value={2027}>2027</option>
              </select>
              <span className="font-semibold text-emerald-950 bg-white px-3 py-1 rounded-lg border border-emerald-200 text-xs">
                ১২ মাসের বাৎসরিক হিসাব ({selectedYear})
              </span>
            </div>
          )}

          {/* Custom Controls */}
          {periodType === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-emerald-900">কাস্টম তারিখ:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-emerald-300 font-bold text-emerald-950 px-2.5 py-1 rounded-xl text-xs"
              />
              <span className="text-emerald-700 font-bold">থেকে</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-emerald-300 font-bold text-emerald-950 px-2.5 py-1 rounded-xl text-xs"
              />
            </div>
          )}

          {periodType === 'all' && (
            <div className="text-emerald-900 font-bold">
              এই এমপ্লয়ির শুরু থেকে আজ পর্যন্ত সর্বমোট সকল খরচ প্রদর্শিত হচ্ছে।
            </div>
          )}

          {/* Statement Active Indicator */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-bold bg-emerald-100/80 px-3 py-1 rounded-xl border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            <span>স্টেটমেন্ট রেডি: {periodLabelBn}</span>
          </div>
        </div>
      </div>

      {/* Statement Financial Metrics (KPIs for this employee in selected period) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Spent */}
        <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 text-white p-4 sm:p-5 rounded-3xl shadow-sm border border-emerald-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
              মোট খরচ (Total Spent)
            </span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            {totalAmount.toFixed(2)}{' '}
            <span className="text-xs sm:text-sm font-semibold text-emerald-300">SAR</span>
          </div>
          <div className="text-[11px] text-emerald-300/80 mt-1 font-medium flex items-center justify-between">
            <span>{periodExpenses.length} টি রেকর্ড</span>
            <span>{periodLabelEn}</span>
          </div>
        </div>

        {/* Card 2: Approved Amount */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-emerald-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
              অনুমোদিত (Approved)
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 mt-1">
            {approvedTotal.toFixed(2)}{' '}
            <span className="text-xs sm:text-sm font-semibold text-emerald-600">SAR</span>
          </div>
          <div className="text-[11px] text-emerald-700 mt-1 font-medium flex items-center justify-between">
            <span>{approvedExpenses.length} টি অনুমোদিত</span>
            <span>
              {totalAmount > 0 ? ((approvedTotal / totalAmount) * 100).toFixed(0) : 0}% অনুমোদিত
            </span>
          </div>
        </div>

        {/* Card 3: Pending Review */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-amber-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
              অপেক্ষমান (Pending)
            </span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
            {pendingTotal.toFixed(2)}{' '}
            <span className="text-xs sm:text-sm font-semibold text-amber-700">SAR</span>
          </div>
          <div className="text-[11px] text-amber-800 mt-1 font-medium flex items-center justify-between">
            <span>{pendingExpenses.length} টি পেন্ডিং</span>
            <span>অ্যাপ্রুভাল প্রসেসিংয়ে আছে</span>
          </div>
        </div>

        {/* Card 4: Rejected / Breakdown */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl shadow-sm border border-emerald-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wide">
              ভ্যাট ও পেমেন্ট সামারি
            </span>
            <CreditCard className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="mt-1 space-y-1 text-xs">
            <div className="flex items-center justify-between font-semibold text-emerald-950">
              <span>ভ্যাট সহ (With VAT):</span>
              <span className="font-bold text-emerald-800">{withVatTotal.toFixed(2)} SAR</span>
            </div>
            <div className="flex items-center justify-between text-emerald-800 font-medium">
              <span>উইদাউট ভ্যাট:</span>
              <span>{withoutVatTotal.toFixed(2)} SAR</span>
            </div>
            <div className="flex items-center justify-between text-emerald-700 text-[11px] border-t border-emerald-100 pt-1">
              <span>ক্যাশ: {cashTotal.toFixed(2)} SAR</span>
              <span>ব্যাংক: {bankTotal.toFixed(2)} SAR</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Spending Breakdown Visual Bars */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-emerald-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="font-bold text-base sm:text-lg text-emerald-950">
                খাতভিত্তিক খরচের বিশ্লেষণ (Category Breakdown)
              </h3>
              <p className="text-xs text-emerald-700">
                {activeEmployee.displayName} ({activeEmployee.employeeId}) এর নির্বাচিত সময়ের খরচের বণ্টন
              </p>
            </div>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
              সর্বমোট {categoryBreakdown.length} টি ক্যাটাগরি
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {categoryBreakdown.map((cat, idx) => (
              <div key={idx} className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-100 space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-emerald-950">
                  <span className="truncate pr-2">{cat.name}</span>
                  <span className="font-mono text-emerald-900 shrink-0">
                    {cat.amount.toFixed(2)} SAR ({cat.percentage.toFixed(1)}%)
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-emerald-200/70 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-emerald-700 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(5, cat.percentage))}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Itemized Detailed Statement Ledger Table */}
      <div className="bg-white rounded-3xl border border-emerald-200 shadow-sm overflow-hidden">
        {/* Table Header Controls */}
        <div className="p-4 sm:p-5 border-b border-emerald-100 bg-emerald-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-emerald-950 text-base sm:text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-700" />
              <span>আইটেমাইজড স্টেটমেন্ট লেজার (Itemized Statement)</span>
            </h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              এমপ্লয়ি: {activeEmployee.displayName} • আইডি: {activeEmployee.employeeId} • সময়কাল: {periodLabelBn}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="বিবরণ, খাত, প্রজেক্ট খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-emerald-200 rounded-xl pl-8 pr-3 py-1.5 text-xs text-emerald-950 placeholder-emerald-800/50 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-2xs"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-emerald-200 shadow-2xs">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  statusFilter === 'all'
                    ? 'bg-emerald-800 text-white'
                    : 'text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                সকল ({periodExpenses.length})
              </button>
              <button
                onClick={() => setStatusFilter('approved')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  statusFilter === 'approved'
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-900 hover:bg-emerald-50'
                }`}
              >
                অনুমোদিত ({approvedExpenses.length})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  statusFilter === 'pending'
                    ? 'bg-amber-500 text-white'
                    : 'text-amber-900 hover:bg-amber-50'
                }`}
              >
                পেন্ডিং ({pendingExpenses.length})
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm font-sans border-collapse">
            <thead>
              <tr className="bg-emerald-900 text-emerald-100 text-[11px] font-bold uppercase tracking-wider">
                <th className="py-3 px-3 text-center w-10">
                  <input
                    type="checkbox"
                    title="অনুমোদিত খরচগুলো সিলেক্ট করুন"
                    checked={
                      displayExpenses.filter((e) => e.status === 'approved').length > 0 &&
                      displayExpenses
                        .filter((e) => e.status === 'approved')
                        .every((e) => selectedExpenseIds.includes(e.id))
                    }
                    onChange={handleToggleSelectAllApproved}
                    className="w-4 h-4 rounded border-emerald-400 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">তারিখ</th>
                <th className="py-3 px-3">ভাউচার আইডি</th>
                <th className="py-3 px-3">খাত / কারণ (Q2)</th>
                <th className="py-3 px-4">বিস্তারিত বর্ণনা (Q3)</th>
                <th className="py-3 px-3">প্রজেক্ট (Q7)</th>
                <th className="py-3 px-3">ভ্যাট (Q5)</th>
                <th className="py-3 px-3">পেমেন্ট (Q6)</th>
                <th className="py-3 px-3">অনুমোদনকারী (Q8)</th>
                <th className="py-3 px-3 text-center">রসিদ (Q9)</th>
                <th className="py-3 px-3 text-center">স্ট্যাটাস</th>
                <th className="py-3 px-4 text-right">পরিমাণ (SAR)</th>
                <th className="py-3 px-3 text-center">পিডিএফ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-100">
              {displayExpenses.length === 0 ? (
                <tr>
                  <td colSpan={13} className="text-center py-10 text-emerald-800 bg-emerald-50/30 font-medium">
                    এই নির্বাচিত সময়ের মধ্যে {activeEmployee.displayName} ({activeEmployee.employeeId}) এর কোনো খরচের রেকর্ড পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                displayExpenses.map((exp) => {
                  const isSelected = selectedExpenseIds.includes(exp.id);
                  return (
                    <tr
                      key={exp.id}
                      className={`transition-colors text-emerald-950 font-normal ${
                        isSelected ? 'bg-emerald-100/70 font-medium' : 'hover:bg-emerald-50/60'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectExpense(exp.id)}
                          className="w-4 h-4 rounded border-emerald-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 font-mono text-xs text-emerald-900 whitespace-nowrap">
                        {exp.date}
                      </td>

                      {/* Expense ID */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-xs bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md border border-emerald-200">
                          {exp.id}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-3 font-semibold text-emerald-900 max-w-[140px] truncate">
                        {exp.category}
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 max-w-[220px]">
                        <p className="line-clamp-2 text-emerald-950 text-xs">{exp.description}</p>
                      </td>

                      {/* Project */}
                      <td className="py-3.5 px-3 text-emerald-800 text-xs whitespace-nowrap">
                        {exp.project || 'General'}
                      </td>

                      {/* VAT Status */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            (exp.vatStatus || '').toLowerCase().includes('with vat') ||
                            (exp.vatStatus || '').toLowerCase().includes('সহ')
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {exp.vatStatus || 'Without VAT'}
                        </span>
                      </td>

                      {/* Payment Method */}
                      <td className="py-3.5 px-3 text-xs text-emerald-800 whitespace-nowrap">
                        {exp.paymentMethod || 'Cash'}
                      </td>

                      {/* Approved By */}
                      <td className="py-3.5 px-3 text-xs text-emerald-800 whitespace-nowrap">
                        {exp.approvedBy || '—'}
                      </td>

                      {/* Receipt */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {exp.receiptUrl ? (
                          <button
                            onClick={() => setReceiptModalImage(exp.receiptUrl || null)}
                            className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                            <span>ছবি</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-emerald-700/60">—</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {exp.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 bg-emerald-600 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>অনুমোদিত</span>
                          </span>
                        )}
                        {exp.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
                            <Clock className="w-3 h-3" />
                            <span>পেন্ডিং</span>
                          </span>
                        )}
                        {exp.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 bg-rose-600 text-white px-2 py-0.5 rounded-full text-[11px] font-bold">
                            <XCircle className="w-3 h-3" />
                            <span>বাতিল</span>
                          </span>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 text-right font-black text-sm text-emerald-950 whitespace-nowrap">
                        {(exp.amount || exp.totalAmount || 0).toFixed(2)}{' '}
                        <span className="text-[10px] font-semibold text-emerald-700">SAR</span>
                      </td>

                      {/* PDF Single Voucher */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenSelectedPdf([exp])}
                          className="inline-flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-2 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          title="এই খরচের PDF ভাউচার দেখুন"
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-700" />
                          <span>PDF</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Totals */}
            {displayExpenses.length > 0 && (
              <tfoot>
                <tr className="bg-emerald-100/80 font-black text-emerald-950 border-t-2 border-emerald-300">
                  <td colSpan={11} className="py-3.5 px-4 text-right text-xs uppercase tracking-wide">
                    সর্বমোট নির্বাচিত খরচ ({periodLabelBn}):
                  </td>
                  <td className="py-3.5 px-4 text-right text-base text-emerald-950 whitespace-nowrap">
                    {displayExpenses
                      .reduce((sum, e) => sum + (e.amount || e.totalAmount || 0), 0)
                      .toFixed(2)}{' '}
                    <span className="text-xs font-semibold text-emerald-700">SAR</span>
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Floating Selection Bar for Generating Combined PDF */}
      {selectedExpenseIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-emerald-950 text-white p-4 rounded-2xl shadow-2xl flex flex-wrap items-center justify-between gap-4 border border-emerald-600/60 max-w-2xl w-[92%] sm:w-auto animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white font-mono font-bold flex items-center justify-center text-sm shadow-inner shrink-0">
              {selectedExpenseIds.length}
            </div>
            <div>
              <span className="font-bold text-sm block">
                {selectedExpenseIds.length}টি এক্সপেন্স সিলেক্ট করা হয়েছে
              </span>
              <span className="text-xs text-emerald-300">
                মোট যোগফল:{' '}
                {displayExpenses
                  .filter((e) => selectedExpenseIds.includes(e.id))
                  .reduce((sum, e) => sum + (e.amount || e.totalAmount || 0), 0)
                  .toFixed(2)}{' '}
                SAR
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedExpenseIds([])}
              className="px-3 py-2 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-emerald-200 text-xs font-bold transition-colors cursor-pointer"
            >
              নির্বাচন মুছুন
            </button>
            <button
              onClick={() => handleOpenSelectedPdf()}
              className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-emerald-950 text-xs font-extrabold flex items-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4 text-emerald-950" />
              <span>একত্রে জেনারেট পিডিএফ ({selectedExpenseIds.length}টি)</span>
            </button>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-emerald-200 max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
              <div>
                <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide block">
                  {editingUser ? 'এমপ্লয়ি তথ্য আপডেট' : 'নতুন এমপ্লয়ি রেজিস্ট্রেশন'}
                </span>
                <h3 className="text-xl font-bold text-emerald-950">
                  {editingUser ? `Edit ${editingUser.displayName}` : 'Add New Employee'}
                </h3>
              </div>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveUserSubmit} className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Employee Name */}
                <div className="space-y-1">
                  <label className="font-bold text-emerald-900 block">
                    এমপ্লয়ির পূর্ণ নাম (Full Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tariq Al-Mansoor"
                    value={userNameInput}
                    onChange={(e) => setUserNameInput(e.target.value)}
                    className="w-full bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Unique Employee ID */}
                <div className="space-y-1">
                  <label className="font-bold text-emerald-900 block">
                    এমপ্লয়ি আইডি (Unique ID) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. KSA-4021"
                    value={userEmployeeIdInput}
                    onChange={(e) => setUserEmployeeIdInput(e.target.value)}
                    className="w-full bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <label className="font-bold text-emerald-900 block">
                    ইমেইল ঠিকানা (Email)
                  </label>
                  <input
                    type="email"
                    placeholder="employee@alfalak.sa"
                    value={userEmailInput}
                    onChange={(e) => setUserEmailInput(e.target.value)}
                    className="w-full bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="font-bold text-emerald-900 block">
                    মোবাইল নম্বর (Phone)
                  </label>
                  <input
                    type="text"
                    placeholder="+966 50 123 4567"
                    value={userPhoneInput}
                    onChange={(e) => setUserPhoneInput(e.target.value)}
                    className="w-full bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Department */}
                <div className="space-y-1">
                  <label className="font-bold text-emerald-900 block">
                    ডিপার্টমেন্ট (Department)
                  </label>
                  <input
                    type="text"
                    placeholder="Sales & Field Operations"
                    value={userDeptInput}
                    onChange={(e) => setUserDeptInput(e.target.value)}
                    className="w-full bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Designation */}
                <div className="space-y-1">
                  <label className="font-bold text-emerald-900 block">
                    পদবী (Designation)
                  </label>
                  <input
                    type="text"
                    placeholder="Senior Sales Executive"
                    value={userDesignationInput}
                    onChange={(e) => setUserDesignationInput(e.target.value)}
                    className="w-full bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Role */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-emerald-900 block">
                    রোল / অনুমতি (Role)
                  </label>
                  <select
                    value={userRoleInput}
                    onChange={(e) => setUserRoleInput(e.target.value as any)}
                    className="w-full bg-emerald-50/60 border border-emerald-200 rounded-xl px-3 py-2 text-emerald-950 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="employee">Employee (খরচ দাখিলকারী)</option>
                    <option value="approver">Approver / Manager (অনুমোদনকারী)</option>
                    <option value="admin">Admin (সার্বিক নিয়ন্ত্রক)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-emerald-100">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-emerald-800 font-bold hover:bg-emerald-50 border border-emerald-200 cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold shadow-md cursor-pointer"
                >
                  {editingUser ? 'Update Employee' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Official Exact Google Sheet Approval Voucher / PDF Modal */}
      <ApprovalVoucherModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        expenses={
          pdfExpenses.length > 0
            ? pdfExpenses
            : periodExpenses.length > 0
            ? periodExpenses
            : expenses.filter((e) => e.userId === activeEmployee.uid)
        }
        appSettings={appSettings}
        onSavePdfConfig={onSavePdfConfig}
        defaultPeriodLabel={periodLabelBn}
      />

      {/* Receipt Photo Modal */}
      {receiptModalImage && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-4 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-2">
              <h4 className="font-bold text-emerald-950 text-sm">Invoice / Receipt Photo</h4>
              <button
                onClick={() => setReceiptModalImage(null)}
                className="w-7 h-7 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden max-h-[70vh] flex items-center justify-center bg-black/5">
              <img
                src={receiptModalImage}
                alt="Receipt Voucher"
                className="max-h-[65vh] w-auto object-contain rounded-xl"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
