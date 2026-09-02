import React, { useState, useMemo } from 'react';
import { Expense } from '../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  BarChart3,
  Calendar,
  Layers,
  Columns3,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface ExpenseMonthlyBarChartProps {
  expenses: Expense[];
}

interface CategoryMonthlyData {
  category: string;
  approved: number;
  pending: number;
  rejected: number;
  total: number;
  count: number;
}

export const ExpenseMonthlyBarChart: React.FC<ExpenseMonthlyBarChartProps> = ({ expenses }) => {
  // Current month in YYYY-MM format
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }, []);

  // Available months list extracted from expenses data + current month
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    monthsSet.add(currentMonthKey);
    expenses.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        monthsSet.add(e.date.slice(0, 7));
      }
    });
    return Array.from(monthsSet).sort().reverse();
  }, [expenses, currentMonthKey]);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [chartType, setChartType] = useState<'stacked' | 'grouped'>('stacked');

  // Format month name for display (e.g., "September 2026")
  const formatMonthDisplay = (monthStr: string) => {
    if (monthStr === 'all') return 'All Time';
    const [year, month] = monthStr.split('-');
    if (!year || !month) return monthStr;
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  // Filter expenses for selected month
  const filteredMonthlyExpenses = useMemo(() => {
    if (selectedMonth === 'all') return expenses;
    return expenses.filter((e) => e.date && e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Aggregate expenses by category and status
  const chartData: CategoryMonthlyData[] = useMemo(() => {
    const map = new Map<string, { approved: number; pending: number; rejected: number; count: number }>();

    filteredMonthlyExpenses.forEach((exp) => {
      const cat = exp.category?.trim() || 'Uncategorized';
      if (!map.has(cat)) {
        map.set(cat, { approved: 0, pending: 0, rejected: 0, count: 0 });
      }
      const item = map.get(cat)!;
      item.count += 1;
      if (exp.status === 'approved') {
        item.approved += exp.amount;
      } else if (exp.status === 'rejected') {
        item.rejected += exp.amount;
      } else {
        item.pending += exp.amount;
      }
    });

    const result: CategoryMonthlyData[] = Array.from(map.entries()).map(([category, vals]) => {
      const total = vals.approved + vals.pending + vals.rejected;
      return {
        category,
        approved: Number(vals.approved.toFixed(2)),
        pending: Number(vals.pending.toFixed(2)),
        rejected: Number(vals.rejected.toFixed(2)),
        total: Number(total.toFixed(2)),
        count: vals.count
      };
    });

    // Sort categories by total expense descending
    return result.sort((a, b) => b.total - a.total);
  }, [filteredMonthlyExpenses]);

  // Month totals
  const monthTotals = useMemo(() => {
    const approved = filteredMonthlyExpenses
      .filter((e) => e.status === 'approved')
      .reduce((sum, e) => sum + e.amount, 0);
    const pending = filteredMonthlyExpenses
      .filter((e) => e.status === 'pending')
      .reduce((sum, e) => sum + e.amount, 0);
    const rejected = filteredMonthlyExpenses
      .filter((e) => e.status === 'rejected')
      .reduce((sum, e) => sum + e.amount, 0);
    const total = approved + pending + rejected;

    return {
      total: total.toFixed(2),
      approved: approved.toFixed(2),
      pending: pending.toFixed(2),
      rejected: rejected.toFixed(2),
      count: filteredMonthlyExpenses.length
    };
  }, [filteredMonthlyExpenses]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload as CategoryMonthlyData;
      return (
        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xl text-xs space-y-2 max-w-xs">
          <div className="font-bold text-emerald-950 border-b border-emerald-100 pb-1 text-sm">
            {label}
          </div>
          <div className="space-y-1 font-medium">
            <div className="flex items-center justify-between gap-4 text-emerald-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                Approved:
              </span>
              <span className="font-bold text-emerald-950">{data.approved.toFixed(2)} SAR</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-amber-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Pending:
              </span>
              <span className="font-bold text-amber-950">{data.pending.toFixed(2)} SAR</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-rose-700">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                Rejected:
              </span>
              <span className="font-bold text-rose-950">{data.rejected.toFixed(2)} SAR</span>
            </div>
            <div className="pt-1.5 border-t border-emerald-100 flex items-center justify-between font-bold text-emerald-950">
              <span>Category Total:</span>
              <span>{data.total.toFixed(2)} SAR ({data.count} items)</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-sm p-4 sm:p-6 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-emerald-100 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wide">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            <span>Monthly Expenses by Category & Status</span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold text-emerald-950 mt-0.5 flex items-center gap-2">
            <span>{formatMonthDisplay(selectedMonth)}</span>
            {selectedMonth === currentMonthKey && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Current Month
              </span>
            )}
          </h3>
          <p className="text-xs text-emerald-700 mt-0.5">
            Visual breakdown of approved, pending, and rejected expenditures in SAR
          </p>
        </div>

        {/* Month Selector & View Type Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Month Dropdown */}
          <div className="flex items-center gap-1.5 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-emerald-700" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-emerald-950 outline-hidden cursor-pointer"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>
                  {formatMonthDisplay(m)} {m === currentMonthKey ? '(Current)' : ''}
                </option>
              ))}
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Chart Style Toggle (Stacked vs Grouped) */}
          <div className="flex items-center bg-emerald-50 p-0.5 rounded-xl border border-emerald-200 text-xs font-semibold">
            <button
              onClick={() => setChartType('stacked')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartType === 'stacked'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-100'
              }`}
              title="Stacked Bars (Total composition per category)"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Stacked</span>
            </button>
            <button
              onClick={() => setChartType('grouped')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                chartType === 'grouped'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-800 hover:bg-emerald-100'
              }`}
              title="Grouped Bars (Side-by-side comparison)"
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Grouped</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mini Summary Chips for the Selected Month */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        <div className="bg-emerald-50/70 p-2.5 sm:p-3 rounded-xl border border-emerald-100">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase">Month Total</div>
          <div className="text-base sm:text-lg font-black text-emerald-950 mt-0.5">
            {monthTotals.total} <span className="text-xs font-normal">SAR</span>
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">
            {monthTotals.count} entries
          </div>
        </div>

        <div className="bg-emerald-50/70 p-2.5 sm:p-3 rounded-xl border border-emerald-100">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Approved</span>
          </div>
          <div className="text-base sm:text-lg font-black text-emerald-700 mt-0.5">
            {monthTotals.approved} <span className="text-xs font-normal">SAR</span>
          </div>
        </div>

        <div className="bg-amber-50/70 p-2.5 sm:p-3 rounded-xl border border-amber-200/80">
          <div className="text-[11px] font-semibold text-amber-800 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Pending</span>
          </div>
          <div className="text-base sm:text-lg font-black text-amber-700 mt-0.5">
            {monthTotals.pending} <span className="text-xs font-normal">SAR</span>
          </div>
        </div>

        <div className="bg-rose-50/70 p-2.5 sm:p-3 rounded-xl border border-rose-100">
          <div className="text-[11px] font-semibold text-rose-800 uppercase flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" />
            <span>Rejected</span>
          </div>
          <div className="text-base sm:text-lg font-black text-rose-700 mt-0.5">
            {monthTotals.rejected} <span className="text-xs font-normal">SAR</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas or Empty State */}
      {chartData.length === 0 ? (
        <div className="p-10 text-center text-emerald-700 bg-emerald-50/40 rounded-xl border border-dashed border-emerald-200">
          <p className="text-sm font-medium">No expense records found for {formatMonthDisplay(selectedMonth)}.</p>
          <p className="text-xs text-emerald-600 mt-1">
            Select another month or submit a new expense through the Chat or Telegram bot.
          </p>
        </div>
      ) : (
        <div className="w-full h-72 sm:h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 25 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="category"
                stroke="#065f46"
                tick={{ fontSize: 11, fill: '#065f46', fontWeight: 500 }}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={40}
              />
              <YAxis
                stroke="#065f46"
                tick={{ fontSize: 11, fill: '#065f46' }}
                tickFormatter={(val) => `${val}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                iconType="circle"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '12px' }}
                formatter={(value) => (
                  <span className="font-semibold text-emerald-950 capitalize">{value}</span>
                )}
              />
              <Bar
                dataKey="approved"
                name="Approved"
                stackId={chartType === 'stacked' ? 'a' : undefined}
                fill="#059669"
                radius={chartType === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              />
              <Bar
                dataKey="pending"
                name="Pending"
                stackId={chartType === 'stacked' ? 'a' : undefined}
                fill="#d97706"
                radius={chartType === 'stacked' ? [0, 0, 0, 0] : [4, 4, 0, 0]}
              />
              <Bar
                dataKey="rejected"
                name="Rejected"
                stackId={chartType === 'stacked' ? 'a' : undefined}
                fill="#e11d48"
                radius={chartType === 'stacked' ? [4, 4, 0, 0] : [4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
