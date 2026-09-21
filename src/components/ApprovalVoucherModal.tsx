import React, { useState, useEffect } from 'react';
import { Expense, ApprovalPdfConfig, AppSettings } from '../types';
import { DEFAULT_APPROVAL_PDF_CONFIG } from '../data/defaultQuestions';
import { generateApprovalVoucherPdf } from '../lib/pdfService';
import {
  Printer,
  X,
  Edit3,
  Save,
  Download,
  RotateCcw,
  Check,
  FileText,
  Loader2
} from 'lucide-react';


export function sanitizeEnglishTextForPdf(input: string | undefined | null): string {
  if (!input) return '';
  let text = String(input);

  const dictionary: Array<[RegExp, string]> = [
    [/ভ্যাট\s*সহ/gi, 'With VAT'],
    [/উইদাউট\s*ভ্যাট/gi, 'Without VAT'],
    [/ভ্যাট\s*ছাড়া/gi, 'Without VAT'],
    [/ভ্যাট/gi, 'VAT'],
    [/ক্যাশ/gi, 'Cash'],
    [/ব্যাংক\s*ট্রান্সফার/gi, 'Bank Transfer'],
    [/ব্যাংক/gi, 'Bank'],
    [/ক্রেডিট\s*কার্ড/gi, 'Credit Card'],
    [/অপেক্ষমান/gi, 'Pending'],
    [/অনুমোদিত/gi, 'Approved'],
    [/বাতিল/gi, 'Rejected'],
    [/ছবি\s*দিয়েছি/gi, 'Receipt Attached'],
    [/রসিদ\s*নেই/gi, 'No Receipt'],
    [/রসিদ/gi, 'Receipt'],
    [/ছবি/gi, 'Photo'],
    [/টাকা/gi, 'SAR'],
    [/যাতায়াত\s*ও\s*পরিবহন/gi, 'Travel & Transport'],
    [/ক্লায়েন্ট\s*ডাইনিং\s*ও\s*খাবার/gi, 'Client Dining & Meals'],
    [/ক্লায়েন্ট\s*ডাইনিং/gi, 'Client Dining'],
    [/অফিস\s*সাপ্লাই\s*ও\s*স্টেশনারি/gi, 'Office Supplies & Stationery'],
    [/অফিস\s*সাপ্লাই/gi, 'Office Supplies'],
    [/সফটওয়্যার\s*ও\s*ক্লাউড/gi, 'Software & Cloud Services'],
    [/হোটেল\s*ও\s*বাসস্থান/gi, 'Hotel & Accommodation'],
    [/ফুয়েল\s*ও\s*গাড়ি\s*মেরামত/gi, 'Fuel & Vehicle Maintenance'],
    [/অন্যান্য\s*ব্যবসায়িক\s*খরচ/gi, 'Miscellaneous Business'],
    [/অন্যান্য/gi, 'Miscellaneous'],
    [/হ্যাঁ/gi, 'Yes'],
    [/না/gi, 'No']
  ];

  for (const [regex, replacement] of dictionary) {
    text = text.replace(regex, replacement);
  }

  // Remove any remaining Bengali Unicode characters
  text = text.replace(/[\u0980-\u09FF]+/g, '').trim();

  return text;
}

export function formatCategoryBilingual(input: string | undefined | null): string {
  if (!input) return '';
  const text = String(input).trim();
  const lower = text.toLowerCase();

  // 1. Travel & Transport
  if (
    lower.includes('travel') ||
    lower.includes('transport') ||
    lower.includes('যাতায়াত') ||
    lower.includes('পরিবহন') ||
    lower.includes('النقل') ||
    lower.includes('المواصلات')
  ) {
    return 'Travel & Transport / النقل والمواصلات';
  }

  // 2. Client Dining & Meals
  if (
    lower.includes('dining') ||
    lower.includes('meals') ||
    lower.includes('ডাইনিং') ||
    lower.includes('খাবার') ||
    lower.includes('الوجبات') ||
    lower.includes('الضيافة')
  ) {
    return 'Client Dining & Meals / الوجبات والضيافة';
  }

  // 3. Office Supplies & Stationery
  if (
    lower.includes('supplies') ||
    lower.includes('stationery') ||
    lower.includes('স্টেশনারি') ||
    lower.includes('সাপ্লাই') ||
    lower.includes('المكتبية') ||
    lower.includes('المستلزمات')
  ) {
    return 'Office Supplies & Stationery / المستلزمات المكتبية';
  }

  // 4. Software & Cloud Services
  if (
    lower.includes('software') ||
    lower.includes('cloud') ||
    lower.includes('সফটওয়্যার') ||
    lower.includes('ক্লাউড') ||
    lower.includes('السحابية') ||
    lower.includes('البرامج')
  ) {
    return 'Software & Cloud Services / البرامج والخدمات السحابية';
  }

  // 5. Hotel & Accommodation
  if (
    lower.includes('hotel') ||
    lower.includes('accommodation') ||
    lower.includes('হোটেল') ||
    lower.includes('বাসস্থান') ||
    lower.includes('الإقامة') ||
    lower.includes('الفنادق')
  ) {
    return 'Hotel & Accommodation / الفنادق والإقامة';
  }

  // 6. Fuel & Vehicle Maintenance
  if (
    lower.includes('fuel') ||
    lower.includes('vehicle') ||
    lower.includes('maintenance') ||
    lower.includes('ফুয়েল') ||
    lower.includes('গাড়ি') ||
    lower.includes('الوقود') ||
    lower.includes('المركبات')
  ) {
    return 'Fuel & Vehicle Maintenance / الوقود وصيانة المركبات';
  }

  // 7. Miscellaneous Business
  if (
    lower.includes('miscellaneous') ||
    lower.includes('অন্যান্য') ||
    lower.includes('متنوعة')
  ) {
    return 'Miscellaneous Business / مصاريف أعمال متنوعة';
  }

  // Fallback: Sanitize text to keep English & Arabic, removing Bengali
  return sanitizeEnglishTextForPdf(text);
}

interface ApprovalVoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  appSettings: AppSettings;
  onSavePdfConfig?: (newConfig: ApprovalPdfConfig) => Promise<void>;
  customTitle?: string;
  defaultPeriodLabel?: string;
}

export const ApprovalVoucherModal: React.FC<ApprovalVoucherModalProps> = ({
  isOpen,
  onClose,
  expenses,
  appSettings,
  onSavePdfConfig,
  defaultPeriodLabel
}) => {
  const baseConfig = appSettings.approvalPdfConfig || DEFAULT_APPROVAL_PDF_CONFIG;

  const primaryExpense = expenses[0] || ({} as Partial<Expense>);
  const totalAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  const todayStr = new Date().toISOString().split('T')[0];
  const reqDateStr = new Date(Date.now() + 4 * 86400000).toISOString().split('T')[0];
  const currentMonthName = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });

  // Editable fields with exact Excel initial values
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  const [projectName, setProjectName] = useState<string>(
    primaryExpense.project || baseConfig.projectName || 'Head office'
  );
  const [mprNo, setMprNo] = useState<string>(
    primaryExpense.batchId
      ? `MPR-${primaryExpense.batchId.slice(-6).toUpperCase()}`
      : primaryExpense.id
      ? `MPR-${primaryExpense.id.slice(-6).toUpperCase()}`
      : ''
  );
  const [companyName, setCompanyName] = useState<string>(baseConfig.companyName || 'Wafaq Company');
  const [dateRequest, setDateRequest] = useState<string>(primaryExpense.date || todayStr);
  const [paymentMonth, setPaymentMonth] = useState<string>(defaultPeriodLabel || currentMonthName);
  const [requiredDate, setRequiredDate] = useState<string>(primaryExpense.date || todayStr);
  const [expansesBy, setExpansesBy] = useState<string>(
    primaryExpense.userName
      ? `${primaryExpense.userName}${primaryExpense.employeeId ? ` (${primaryExpense.employeeId})` : ''}`
      : ''
  );
  const [companyAddress, setCompanyAddress] = useState<string>(
    baseConfig.companyAddress || 'P.O. Box 2481, Riyadh 12611, Riyadh, KSA. TelFax: 0112319609'
  );

  // Fixed Signatories
  const [preparedBy, setPreparedBy] = useState<string>(baseConfig.preparedByName || 'Fazley Elahi Azim');
  const [verifiedBy, setVerifiedBy] = useState<string>(baseConfig.verifiedByName || 'Mohammad Iftekhairul Alam');
  // Final approver: Nurul Alam
  const [approvedBy1, setApprovedBy1] = useState<string>(
    baseConfig.approvedBy1Name || baseConfig.approvedByName || 'Nurul Alam'
  );
  // Second approver: Bulbul Mashrequi
  const [approvedBy2, setApprovedBy2] = useState<string>(
    baseConfig.approvedBy2Name || 'Bulbul Mashrequi'
  );
  // Third approver: Abdulaziz
  const [approvedBy3, setApprovedBy3] = useState<string>(
    baseConfig.approvedBy3Name || 'Abdulaziz'
  );
  // Requested by = Employee who submitted/inputted the expense (primaryExpense.userName)
  const [requestedBy, setRequestedBy] = useState<string>(
    primaryExpense.userName || baseConfig.requestedByName || 'Mr Abdul Gaffar'
  );

  const [accountDeptCheckers, setAccountDeptCheckers] = useState<Array<{ name: string; checked: boolean }>>(
    baseConfig.checkedByAccountDeptList || [
      { name: 'Mr. Javeed Hikady', checked: false },
      { name: 'Mr. Fazley Elahi Azim', checked: false },
      { name: 'Mr. Shaheed Pathan', checked: false }
    ]
  );

  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sync state whenever expenses prop changes
  useEffect(() => {
    if (expenses && expenses.length > 0) {
      const pExp = expenses[0];
      setProjectName(pExp.project || baseConfig.projectName || 'Head office');
      setMprNo(
        expenses.length > 1
          ? `MPR-COMBINED-${expenses.length}`
          : pExp.batchId
          ? `MPR-${pExp.batchId.slice(-6).toUpperCase()}`
          : pExp.id
          ? `MPR-${pExp.id.slice(-6).toUpperCase()}`
          : ''
      );
      setCompanyName(baseConfig.companyName || 'Wafaq Company');
      setDateRequest(pExp.date || todayStr);
      setPaymentMonth(defaultPeriodLabel || currentMonthName);
      setRequiredDate(pExp.date || todayStr);
      setExpansesBy(
        pExp.userName
          ? `${pExp.userName}${pExp.employeeId ? ` (${pExp.employeeId})` : ''}`
          : ''
      );
      setCompanyAddress(
        baseConfig.companyAddress || 'P.O. Box 2481, Riyadh 12611, Riyadh, KSA. TelFax: 0112319609'
      );
      setPreparedBy(baseConfig.preparedByName || 'Fazley Elahi Azim');
      setVerifiedBy(baseConfig.verifiedByName || 'Mohammad Iftekhairul Alam');
      setApprovedBy1(baseConfig.approvedBy1Name || baseConfig.approvedByName || 'Nurul Alam');
      setApprovedBy2(baseConfig.approvedBy2Name || 'Bulbul Mashrequi');
      setApprovedBy3(baseConfig.approvedBy3Name || 'Abdulaziz');
      setRequestedBy(pExp.userName || baseConfig.requestedByName || 'Mr Abdul Gaffar');
      if (baseConfig.checkedByAccountDeptList) {
        setAccountDeptCheckers(baseConfig.checkedByAccountDeptList);
      }
    }
  }, [expenses, appSettings, defaultPeriodLabel]);

  if (!isOpen || expenses.length === 0) return null;

  const handleToggleChecker = (index: number) => {
    setAccountDeptCheckers((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, checked: !item.checked } : item))
    );
  };

  const handleCheckerNameChange = (index: number, newName: string) => {
    setAccountDeptCheckers((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, name: newName } : item))
    );
  };

  const handleResetDefaults = () => {
    setProjectName('Head office');
    setMprNo('');
    setCompanyName('Wafaq Company');
    setDateRequest(primaryExpense.date || todayStr);
    setPaymentMonth(currentMonthName);
    setRequiredDate(primaryExpense.date || todayStr);
    setExpansesBy(primaryExpense.userName || '');
    setCompanyAddress('P.O. Box 2481, Riyadh 12611, Riyadh, KSA. TelFax: 0112319609');
    setPreparedBy('Fazley Elahi Azim');
    setVerifiedBy('Mohammad Iftekhairul Alam');
    setApprovedBy1('Nurul Alam');
    setApprovedBy2('Bulbul Mashrequi');
    setApprovedBy3('Abdulaziz');
    setRequestedBy(primaryExpense.userName || 'Mr Abdul Gaffar');
    setAccountDeptCheckers([
      { name: 'Mr. Javeed Hikady', checked: false },
      { name: 'Mr. Fazley Elahi Azim', checked: false },
      { name: 'Mr. Shaheed Pathan', checked: false }
    ]);
  };

  const handleSaveAsDefaultTemplate = async () => {
    if (!onSavePdfConfig) return;
    setIsSaving(true);
    try {
      const updatedConfig: ApprovalPdfConfig = {
        ...baseConfig,
        companyName,
        companyAddress,
        companySubtitle: companyAddress,
        projectName,
        preparedByName: preparedBy,
        verifiedByName: verifiedBy,
        approvedBy1Name: approvedBy1,
        approvedByName: approvedBy1,
        requestedByName: requestedBy,
        approvedBy2Name: approvedBy2,
        approvedBy3Name: approvedBy3,
        checkedByAccountDeptList: accountDeptCheckers
      };
      await onSavePdfConfig(updatedConfig);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to save template:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    try {
      const container = document.getElementById('excel-landscape-container');
      if (container) {
        const printWindow = window.open('', '_blank', 'width=1200,height=800');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <title>Approval Voucher - ${mprNo || 'Print'}</title>
                <style>
                  @page { size: landscape; margin: 4mm; }
                  body { margin: 0; padding: 12px; font-family: Calibri, Arial, sans-serif; background: #ffffff; color: #000000; }
                  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
                  img { max-height: 95px; width: 100%; max-width: 380px; object-fit: contain; margin: 0 auto; display: block; }
                  @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  }
                </style>
              </head>
              <body>
                ${container.outerHTML}
                <script>
                  setTimeout(function() {
                    window.focus();
                    window.print();
                  }, 300);
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
          return;
        }
      }
      window.print();
    } catch (err) {
      console.warn('Direct print window pop-up blocked or failed, falling back to PDF download:', err);
      handleDownloadPdf();
    }
  };

  const handleDownloadPdf = async () => {
    try {
      await generateApprovalVoucherPdf('excel-landscape-container', {
        filename: `Approval_Voucher_${mprNo || 'MPR'}.pdf`,
        marginMm: 5,
        onProgress: (isGenerating) => setIsGeneratingPdf(isGenerating)
      });
    } catch (err) {
      console.error('Failed to download PDF:', err);
      // Fallback to window print
      window.print();
    }
  };

  const handleDownloadCsv = () => {
    const csvRows: string[][] = [];
    csvRows.push(['', ' PROJECT', sanitizeEnglishTextForPdf(projectName), '', '', 'MPR No', mprNo, sanitizeEnglishTextForPdf(companyAddress)]);
    csvRows.push(['', 'Company', sanitizeEnglishTextForPdf(companyName), '', '', 'Date Request', dateRequest]);
    csvRows.push(['', 'Payment  Month', sanitizeEnglishTextForPdf(paymentMonth), '', '', 'Required date', requiredDate]);
    csvRows.push(['', 'Expanses By', sanitizeEnglishTextForPdf(expansesBy), '', '', '', '']);
    csvRows.push(['', '', '', '', '', '', '', '']);
    csvRows.push(['', 'Inv.No', 'Description', '', 'Quantity', 'Price ', ' Amount', 'Remarks']);

    expenses.forEach((exp, idx) => {
      const invNum = String(idx + 1).padStart(2, '0');
      const cat = formatCategoryBilingual(exp.category);
      const descText = sanitizeEnglishTextForPdf(exp.description);
      const desc = `${cat ? `[${cat}] ` : ''}${descText}`;
      const remarks = [
        sanitizeEnglishTextForPdf(exp.vatStatus),
        sanitizeEnglishTextForPdf(exp.paymentMethod),
        exp.project ? `Proj: ${sanitizeEnglishTextForPdf(exp.project)}` : ''
      ]
        .filter(Boolean)
        .join(' | ');

      csvRows.push([
        '',
        invNum,
        desc,
        '',
        '1',
        exp.amount ? exp.amount.toFixed(2) : '',
        exp.amount ? exp.amount.toFixed(2) : '',
        remarks
      ]);
    });

    csvRows.push(['', 'Total Amount', '', '', '', '', totalAmount.toFixed(2), '']);
    csvRows.push(['', '', '', '', '', '', '', '']);

    const chk1 = accountDeptCheckers[0]
      ? `        ${accountDeptCheckers[0].checked ? '☑' : '□'} ${sanitizeEnglishTextForPdf(accountDeptCheckers[0].name)}`
      : '        □ Mr. Javeed Hikady';
    const chk2 = accountDeptCheckers[1]
      ? `            ${accountDeptCheckers[1].checked ? '☑' : '□'} ${sanitizeEnglishTextForPdf(accountDeptCheckers[1].name)}`
      : '            □ Mr. Fazley Elahi Azim';
    const chk3 = accountDeptCheckers[2]
      ? `           ${accountDeptCheckers[2].checked ? '☑' : '□'} ${sanitizeEnglishTextForPdf(accountDeptCheckers[2].name)}`
      : '           □ Mr. Shaheed Pathan';

    csvRows.push([
      '',
      `Prepared  By         : ${sanitizeEnglishTextForPdf(preparedBy)}`,
      '',
      '',
      '',
      '',
      '',
      '                                      Checked by Account Dept.'
    ]);
    csvRows.push(['', 'Name & Sign', '', '', '', '', '', chk1]);
    csvRows.push(['', '', '', '', '', '', '', '']);
    csvRows.push([
      '',
      `Verified By :       ${sanitizeEnglishTextForPdf(verifiedBy)}`,
      '',
      '',
      `Final Approver : ${sanitizeEnglishTextForPdf(approvedBy1)}`,
      '',
      '',
      chk2
    ]);
    csvRows.push(['', 'Name & Sign', '', '', '', '', '', '']);
    csvRows.push(['', '', '', '', '', '', '', chk3]);
    csvRows.push([
      '',
      'Requested  by ',
      sanitizeEnglishTextForPdf(requestedBy),
      '',
      `2nd Approver : ${sanitizeEnglishTextForPdf(approvedBy2)}`,
      `3rd Approver : ${sanitizeEnglishTextForPdf(approvedBy3)}`,
      '',
      ''
    ]);
    csvRows.push(['', 'Name & Sign', '', '', '', '', '', '']);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      csvRows
        .map((row) =>
          row
            .map((cell) => {
              const str = String(cell || '');
              if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
              }
              return str;
            })
            .join(',')
        )
        .join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Approval_Sheet_${mprNo || 'MPR'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-slate-900/85 backdrop-blur-xs flex flex-col items-center justify-start p-2 sm:p-6 print:p-0 print:bg-white print:static print:block">
      {/* Landscape Print CSS Injection */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 0mm;
          }
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          #excel-landscape-container {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 auto !important;
            padding: 4mm 6mm !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* Floating Action Bar */}
      <div className="w-full max-w-[1180px] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-3 no-print bg-slate-900 text-white p-3.5 rounded-xl shadow-xl border border-slate-700">
        <div className="flex items-center justify-between gap-2">
          <div className="font-bold text-xs sm:text-sm text-emerald-400 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Google Sheet Approval Template (Landscape A4)</span>
          </div>
          <button
            onClick={onClose}
            className="sm:hidden w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              isEditing ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-600'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Done Editing' : 'Edit Details'}</span>
          </button>

          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isGeneratingPdf ? 'Generating PDF...' : '📥 Download PDF'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>🖨️ Print</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-600 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={onClose}
            className="hidden sm:flex w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Form Editor Panel */}
      {isEditing && (
        <div className="w-full max-w-[1180px] bg-white p-4 rounded-xl border border-slate-300 shadow-xl mb-4 no-print text-xs space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="font-bold text-slate-800 text-sm">
              ✏️ Edit Names and Information Before Printing or Downloading PDF
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetDefaults}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={handleSaveAsDefaultTemplate}
                disabled={isSaving}
                className="flex items-center gap-1 px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
              >
                <Save className="w-3 h-3" />
                <span>{isSaving ? 'Saving...' : 'Save as Default'}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">PROJECT</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Company</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">MPR No</label>
              <input
                type="text"
                value={mprNo}
                onChange={(e) => setMprNo(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded font-semibold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Date Request</label>
              <input
                type="text"
                value={dateRequest}
                onChange={(e) => {
                  setDateRequest(e.target.value);
                  setRequiredDate(e.target.value);
                }}
                className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Payment Month</label>
              <input
                type="text"
                value={paymentMonth}
                onChange={(e) => setPaymentMonth(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div>
              <label className="block text-slate-600 font-semibold mb-0.5">Required date</label>
              <input
                type="text"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-slate-600 font-semibold mb-0.5">Expanses By</label>
              <input
                type="text"
                value={expansesBy}
                onChange={(e) => setExpansesBy(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded font-semibold text-slate-900"
              />
            </div>
            <div className="col-span-4">
              <label className="block text-slate-600 font-semibold mb-0.5">Company Address</label>
              <input
                type="text"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                className="w-full p-1.5 border border-slate-300 rounded text-slate-900"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200">
            <span className="font-bold text-slate-700 block mb-1.5">Approver & Signatory Names:</span>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">Prepared By</label>
                <input
                  type="text"
                  value={preparedBy}
                  onChange={(e) => setPreparedBy(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">Verified By</label>
                <input
                  type="text"
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">Final Approver</label>
                <input
                  type="text"
                  value={approvedBy1}
                  onChange={(e) => setApprovedBy1(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">Second Approver</label>
                <input
                  type="text"
                  value={approvedBy2}
                  onChange={(e) => setApprovedBy2(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">Third Approver</label>
                <input
                  type="text"
                  value={approvedBy3}
                  onChange={(e) => setApprovedBy3(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-slate-900"
                />
              </div>
              <div>
                <label className="block text-slate-500 text-[11px] mb-0.5">Requested by</label>
                <input
                  type="text"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className="w-full p-1.5 border border-slate-300 rounded font-semibold text-slate-900"
                />
              </div>
            </div>

            <div className="mt-2.5 flex items-center gap-4 flex-wrap bg-slate-50 p-2 rounded-lg border">
              <span className="font-semibold text-slate-700">Checked by Account Dept:</span>
              {accountDeptCheckers.map((chk, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={chk.checked}
                    onChange={() => handleToggleChecker(idx)}
                    className="cursor-pointer"
                  />
                  <input
                    type="text"
                    value={chk.name}
                    onChange={(e) => handleCheckerNameChange(idx, e.target.value)}
                    className="p-1 border border-slate-300 rounded text-xs font-medium w-36"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 
        ---------------- EXACT GOOGLE SHEET EXCEL SPREADSHEET REPLICA ---------------- 
        Widths & Heights correspond exactly to the Google Sheet (A4 Landscape):
        Cols:
          Col A: 25px
          Col B: 130px
          Col C: 340px
          Col D: 70px
          Col E: 80px
          Col F: 135px
          Col G: 145px
          Col H: 450px
      */}
      <div
        id="excel-landscape-container"
        className="bg-white text-black p-4 sm:p-6 shadow-2xl rounded-none border border-slate-400 overflow-x-auto select-text font-['Calibri',sans-serif]"
        style={{
          width: '1180px',
          minWidth: '1180px',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'Calibri, Arial, sans-serif'
        }}
      >
        <table
          className="border-collapse"
          style={{
            width: '1130px',
            tableLayout: 'fixed',
            border: '2px solid #000000',
            fontFamily: 'Calibri, Arial, sans-serif'
          }}
        >
          {/* Exact Column Width Allocations */}
          <colgroup><col style={{ width: '130px' }} /><col style={{ width: '340px' }} /><col style={{ width: '70px' }} /><col style={{ width: '80px' }} /><col style={{ width: '135px' }} /><col style={{ width: '145px' }} /><col style={{ width: '230px' }} /></colgroup>

          <tbody>
            {/* ---------------- ROW 3 (PROJECT | MPR No | Logo & Address) ---------------- */}
            <tr style={{ height: '35px' }}>
              <td
                style={{
                  borderLeft: '2px solid #000000',
                  borderTop: '2px solid #000000',
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  padding: '2px 6px',
                  verticalAlign: 'middle',
                  whiteSpace: 'pre'
                }}
              >
                {' '}PROJECT
              </td>
              <td
                colSpan={3}
                style={{
                  borderTop: '2px solid #000000',
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  padding: '2px 8px',
                  verticalAlign: 'middle'
                }}
              >
                {sanitizeEnglishTextForPdf(projectName)}
              </td>
              <td
                style={{
                  borderTop: '2px solid #000000',
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  padding: '2px 6px',
                  verticalAlign: 'middle',
                  textAlign: 'center'
                }}
              >
                MPR No
              </td>
              <td
                style={{
                  borderTop: '2px solid #000000',
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  padding: '2px 8px',
                  verticalAlign: 'middle',
                  textAlign: 'center'
                }}
              >
                {mprNo}
              </td>
              {/* Merged H3:H6 (Contains Logo and Address) */}
              <td
                rowSpan={4}
                style={{
                  borderTop: '2px solid #000000',
                  borderRight: '2px solid #000000',
                  borderBottom: '1px solid #000000',
                  padding: '8px 12px',
                  verticalAlign: 'middle',
                  textAlign: 'center',
                  background: '#ffffff'
                }}
              >
                <div className="flex flex-col items-center justify-center space-y-1.5 py-1">
                  <img
                    src={baseConfig.logoUrl || '/company_logo.svg'}
                    alt="WAFAQ Company Logo"
                    className="max-h-24 sm:max-h-28 w-full max-w-[380px] object-contain mx-auto transition-transform duration-200 hover:scale-[1.02]"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (!img.src.includes('company_logo.svg')) {
                        img.src = '/company_logo.svg';
                      }
                    }}
                  />
                  <div
                    style={{
                      fontSize: '8.5pt',
                      fontFamily: 'Calibri, Arial, sans-serif',
                      color: '#000000',
                      lineHeight: '1.25',
                      textAlign: 'center',
                      marginTop: '4px'
                    }}
                  >
                    {sanitizeEnglishTextForPdf(companyAddress)}
                  </div>
                </div>
              </td>
            </tr>

            {/* ---------------- ROW 4 (Company | Date Request) ---------------- */}
            <tr style={{ height: '42px' }}>
              <td
                style={{
                  borderLeft: '2px solid #000000',
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  padding: '2px 6px',
                  verticalAlign: 'middle'
                }}
              >
                Company
              </td>
              <td
                colSpan={3}
                style={{
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  padding: '2px 8px',
                  verticalAlign: 'middle'
                }}
              >
                {sanitizeEnglishTextForPdf(companyName)}
              </td>
              <td
                style={{
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  padding: '2px 6px',
                  verticalAlign: 'middle',
                  textAlign: 'center'
                }}
              >
                Date Request
              </td>
              <td
                style={{
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontSize: '11pt',
                  padding: '2px 8px',
                  verticalAlign: 'middle',
                  textAlign: 'center'
                }}
              >
                {dateRequest}
              </td>
            </tr>

            {/* ---------------- ROW 5 (Payment Month | Required date) ---------------- */}
            <tr style={{ height: '36px' }}>
              <td
                style={{
                  borderLeft: '2px solid #000000',
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  padding: '2px 6px',
                  verticalAlign: 'middle'
                }}
              >
                Payment  Month
              </td>
              <td
                colSpan={3}
                style={{
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'normal',
                  fontSize: '11pt',
                  padding: '2px 8px',
                  verticalAlign: 'middle'
                }}
              >
                {sanitizeEnglishTextForPdf(paymentMonth)}
              </td>
              <td
                style={{
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  padding: '2px 6px',
                  verticalAlign: 'middle',
                  textAlign: 'center'
                }}
              >
                Required date
              </td>
              <td
                style={{
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontSize: '11pt',
                  padding: '2px 8px',
                  verticalAlign: 'middle',
                  textAlign: 'center'
                }}
              >
                {requiredDate}
              </td>
            </tr>

            {/* ---------------- ROW 6 (Expanses By) ---------------- */}
            <tr style={{ height: '36px' }}>
              <td
                style={{
                  borderLeft: '2px solid #000000',
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  padding: '2px 6px',
                  verticalAlign: 'middle'
                }}
              >
                Expanses By
              </td>
              <td
                colSpan={5}
                style={{
                  borderRight: '1px solid #000000',
                  borderBottom: '1px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  padding: '2px 8px',
                  verticalAlign: 'middle'
                }}
              >
                {sanitizeEnglishTextForPdf(expansesBy)}
              </td>
            </tr>

            {/* ---------------- ROW 7 (Empty separator line) ---------------- */}
            <tr style={{ height: '14px' }}>
              <td
                colSpan={7}
                style={{
                  borderLeft: '2px solid #000000',
                  borderRight: '2px solid #000000',
                  borderBottom: '1px solid #000000',
                  padding: 0
                }}
              ></td>
            </tr>

            {/* ---------------- ROW 8 (Table Headers) ---------------- */}
            <tr style={{ height: '28px' }}>
              <td
                style={{
                  borderLeft: '2px solid #000000',
                  borderRight: '1px solid #000000',
                  borderBottom: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '12pt',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  padding: '4px'
                }}
              >
                Inv.No
              </td>
              <td
                colSpan={2}
                style={{
                  borderRight: '1px solid #000000',
                  borderBottom: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '12pt',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  padding: '4px'
                }}
              >
                Description
              </td>
              <td
                style={{
                  borderRight: '1px solid #000000',
                  borderBottom: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '12pt',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  padding: '4px'
                }}
              >
                Quantity
              </td>
              <td
                style={{
                  borderRight: '1px solid #000000',
                  borderBottom: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '12pt',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  padding: '4px'
                }}
              >
                Price 
              </td>
              <td
                style={{
                  borderRight: '1px solid #000000',
                  borderBottom: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '12pt',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  padding: '4px'
                }}
              >
                {' '}Amount
              </td>
              <td
                style={{
                  borderRight: '2px solid #000000',
                  borderBottom: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '12pt',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  padding: '4px'
                }}
              >
                Remarks
              </td>
            </tr>

            {/* ---------------- ROW 9 (Data Items) ---------------- */}
            {expenses.map((exp, idx) => {
              const invNum = String(idx + 1).padStart(2, '0');
              const cat = formatCategoryBilingual(exp.category);
              const desc = sanitizeEnglishTextForPdf(exp.description);
              const vat = sanitizeEnglishTextForPdf(exp.vatStatus);
              const pay = sanitizeEnglishTextForPdf(exp.paymentMethod);
              const proj = sanitizeEnglishTextForPdf(exp.project);

              const remarksText = [
                vat,
                pay,
                proj ? `Proj: ${proj}` : ''
              ]
                .filter(Boolean)
                .join(' | ');

              return (
                <tr key={exp.id || idx} style={{ height: '52px' }}>
                  <td
                    style={{
                      borderLeft: '2px solid #000000',
                      borderRight: '1px solid #000000',
                      borderBottom: '1px solid #000000',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: '14pt',
                      fontFamily: 'Calibri, Arial, sans-serif'
                    }}
                  >
                    {invNum}
                  </td>
                  <td
                    colSpan={2}
                    style={{
                      borderRight: '1px solid #000000',
                      borderBottom: '1px solid #000000',
                      textAlign: 'left',
                      verticalAlign: 'middle',
                      padding: '4px 10px',
                      fontSize: '13pt',
                      fontWeight: 'bold',
                      fontFamily: 'Calibri, Arial, sans-serif'
                    }}
                  >
                    {cat ? `${cat}` : ''}
                    {desc ? (cat ? ` - ${desc}` : desc) : ''}
                  </td>
                  <td
                    style={{
                      borderRight: '1px solid #000000',
                      borderBottom: '1px solid #000000',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: '13pt'
                    }}
                  >
                    1
                  </td>
                  <td
                    style={{
                      borderRight: '1px solid #000000',
                      borderBottom: '1px solid #000000',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: '13pt'
                    }}
                  >
                    {exp.amount ? exp.amount.toFixed(2) : ''}
                  </td>
                  <td
                    style={{
                      borderRight: '1px solid #000000',
                      borderBottom: '1px solid #000000',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: '13pt',
                      fontWeight: 'bold'
                    }}
                  >
                    {exp.amount ? exp.amount.toFixed(2) : ''}
                  </td>
                  <td
                    style={{
                      borderRight: '2px solid #000000',
                      borderBottom: '1px solid #000000',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      fontSize: '11pt',
                      padding: '4px'
                    }}
                  >
                    {remarksText}
                  </td>
                </tr>
              );
            })}

            {/* If only 1 or 2 items, fill empty row matching template */}
            {expenses.length === 1 && (
              <tr style={{ height: '35px' }}>
                <td style={{ borderLeft: '2px solid #000000', borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}></td>
                <td colSpan={2} style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}></td>
                <td style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}></td>
                <td style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}></td>
                <td style={{ borderRight: '1px solid #000000', borderBottom: '1px solid #000000' }}></td>
                <td style={{ borderRight: '2px solid #000000', borderBottom: '1px solid #000000' }}></td>
              </tr>
            )}

            {/* ---------------- ROW 10 (Total Amount) ---------------- */}
            <tr style={{ height: '30px' }}>
              <td
                colSpan={4}
                style={{
                  borderLeft: '2px solid #000000',
                  borderTop: '2px solid #000000',
                  borderRight: '2px solid #000000',
                  borderBottom: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '13pt',
                  textAlign: 'center',
                  verticalAlign: 'middle'
                }}
              >
                Total Amount
              </td>
              <td
                style={{
                  borderTop: '2px solid #000000',
                  borderRight: '2px solid #000000',
                  borderBottom: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '13pt',
                  textAlign: 'center',
                  verticalAlign: 'middle'
                }}
              >
              </td>
              <td
                style={{
                  borderTop: '2px solid #000000',
                  borderRight: '2px solid #000000',
                  borderBottom: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '13pt',
                  textAlign: 'center',
                  verticalAlign: 'middle'
                }}
              >
                {totalAmount.toFixed(2)}
              </td>
              <td
                style={{
                  borderTop: '2px solid #000000',
                  borderRight: '2px solid #000000',
                  borderBottom: '2px solid #000000'
                }}
              ></td>
            </tr>

            {/* ---------------- ROW 11 (Empty row) ---------------- */}
            <tr style={{ height: '9px' }}>
              <td
                colSpan={7}
                style={{
                  borderLeft: '2px solid #000000',
                  borderRight: '2px solid #000000',
                  padding: 0
                }}
              ></td>
            </tr>

            {/* ---------------- ROW 12 (Prepared By | Checked by Account Dept.) ---------------- */}
            <tr style={{ height: '58px' }}>
              <td
                colSpan={2}
                style={{
                  borderLeft: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  verticalAlign: 'middle',
                  padding: '2px 8px',
                  whiteSpace: 'pre'
                }}
              >
                Prepared  By         : {sanitizeEnglishTextForPdf(preparedBy)}
              </td>
              <td colSpan={4} style={{ verticalAlign: 'middle' }}></td>
              <td
                style={{
                  borderRight: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  verticalAlign: 'middle',
                  textAlign: 'right',
                  padding: '2px 12px'
                }}
              >
                Checked by Account Dept.
              </td>
            </tr>

            {/* ---------------- ROW 13 (Name & Sign | Checkbox 1: Mr. Javeed Hikady) ---------------- */}
            <tr style={{ height: '32px' }}>
              <td
                style={{
                  borderLeft: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  verticalAlign: 'middle',
                  padding: '2px 8px'
                }}
              >
                Name & Sign
              </td>
              <td colSpan={5}></td>
              <td
                style={{
                  borderRight: '2px solid #000000',
                  fontSize: '11pt',
                  fontFamily: 'Arial, sans-serif',
                  verticalAlign: 'middle',
                  textAlign: 'left',
                  paddingLeft: '32px'
                }}
              >
                {accountDeptCheckers[0]?.checked ? '☑' : '□'} {sanitizeEnglishTextForPdf(accountDeptCheckers[0]?.name) || 'Mr. Javeed Hikady'}
              </td>
            </tr>

            {/* ---------------- ROW 14 (Blank Signature space) ---------------- */}
            <tr style={{ height: '48px' }}>
              <td style={{ borderLeft: '2px solid #000000' }}></td>
              <td colSpan={5}></td>
              <td style={{ borderRight: '2px solid #000000' }}></td>
            </tr>

            {/* ---------------- ROW 15 (Verified By | Approved By 1 | Checkbox 2: Mr. Fazley Elahi Azim) ---------------- */}
            <tr style={{ height: '28px' }}>
              <td
                colSpan={2}
                style={{
                  borderLeft: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  verticalAlign: 'middle',
                  padding: '2px 8px',
                  whiteSpace: 'pre'
                }}
              >
                Verified By :       {sanitizeEnglishTextForPdf(verifiedBy)}
              </td>
              <td colSpan={1}></td>
              <td
                colSpan={3}
                style={{
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  verticalAlign: 'middle',
                  padding: '2px 6px',
                  whiteSpace: 'pre'
                }}
              >
                Final Approver : {sanitizeEnglishTextForPdf(approvedBy1)}
              </td>
              <td
                style={{
                  borderRight: '2px solid #000000',
                  fontSize: '11pt',
                  fontFamily: 'Arial, sans-serif',
                  verticalAlign: 'middle',
                  textAlign: 'left',
                  paddingLeft: '32px'
                }}
              >
                {accountDeptCheckers[1]?.checked ? '☑' : '□'} {sanitizeEnglishTextForPdf(accountDeptCheckers[1]?.name) || 'Mr. Fazley Elahi Azim'}
              </td>
            </tr>

            {/* ---------------- ROW 16 (Name & Sign) ---------------- */}
            <tr style={{ height: '22px' }}>
              <td
                style={{
                  borderLeft: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  verticalAlign: 'middle',
                  padding: '2px 8px'
                }}
              >
                Name & Sign
              </td>
              <td colSpan={6} style={{ borderRight: '2px solid #000000' }}></td>
            </tr>

            {/* ---------------- ROW 17 (Blank Signature space | Checkbox 3: Mr. Shaheed Pathan) ---------------- */}
            <tr style={{ height: '65px' }}>
              <td style={{ borderLeft: '2px solid #000000' }}></td>
              <td colSpan={5}></td>
              <td
                style={{
                  borderRight: '2px solid #000000',
                  fontSize: '11pt',
                  fontFamily: 'Arial, sans-serif',
                  verticalAlign: 'middle',
                  textAlign: 'left',
                  paddingLeft: '32px'
                }}
              >
                {accountDeptCheckers[2]?.checked ? '☑' : '□'} {sanitizeEnglishTextForPdf(accountDeptCheckers[2]?.name) || 'Mr. Shaheed Pathan'}
              </td>
            </tr>

            {/* ---------------- ROW 18 (Requested by | Approved By 2: User-selected Approver) ---------------- */}
            <tr style={{ height: '38px' }}>
              <td
                style={{
                  borderLeft: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  verticalAlign: 'middle',
                  padding: '2px 8px'
                }}
              >
                Requested  by 
              </td>
              <td
                colSpan={2}
                style={{
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  verticalAlign: 'middle',
                  padding: '2px 8px'
                }}
              >
                {sanitizeEnglishTextForPdf(requestedBy)}
              </td>
              <td
                colSpan={2}
                style={{
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  verticalAlign: 'middle',
                  textAlign: 'left',
                  padding: '2px 8px'
                }}
              >
                2nd Approver : {sanitizeEnglishTextForPdf(approvedBy2)}
              </td>
              <td
                style={{
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  verticalAlign: 'middle',
                  textAlign: 'left',
                  padding: '2px 8px'
                }}
              >
                3rd Approver : {sanitizeEnglishTextForPdf(approvedBy3)}
              </td>
              <td style={{ borderRight: '2px solid #000000' }}></td>
            </tr>

            {/* ---------------- ROW 19 (Name & Sign) ---------------- */}
            <tr style={{ height: '32px' }}>
              <td
                style={{
                  borderLeft: '2px solid #000000',
                  fontWeight: 'bold',
                  fontSize: '11pt',
                  verticalAlign: 'middle',
                  padding: '2px 8px'
                }}
              >
                Name & Sign
              </td>
              <td colSpan={6} style={{ borderRight: '2px solid #000000' }}></td>
            </tr>

            {/* ---------------- ROW 20 (Bottom border closing row) ---------------- */}
            <tr style={{ height: '12px' }}>
              <td
                colSpan={7}
                style={{
                  borderLeft: '2px solid #000000',
                  borderRight: '2px solid #000000',
                  borderBottom: '2px solid #000000',
                  padding: 0
                }}
              ></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

