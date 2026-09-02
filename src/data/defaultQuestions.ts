import { BotQuestion, AppSettings, AppUser, ApprovalPdfConfig } from '../types';

export const DEFAULT_APPROVAL_PDF_CONFIG: ApprovalPdfConfig = {
  companyName: 'Wafaq Company',
  companySubtitle: 'P.O. Box 2481, Riyadh 12611, Riyadh, KSA. TelFax: 0112319609',
  companyAddress: 'P.O. Box 2481, Riyadh 12611, Riyadh, KSA. TelFax: 0112319609',
  addressLine: 'P.O. Box 2481, Riyadh 12611, Riyadh, KSA. TelFax: 0112319609',
  projectName: 'Head office',
  taxRegistrationNumber: '300192837400003',
  commercialRegistrationNumber: '1010892341',
  logoUrl: '',
  voucherTitle: 'EXPENSE APPROVAL VOUCHER & MPR',
  currency: 'SAR',
  preparedByName: 'Fazley Elahi Azim',
  preparedByTitle: 'Prepared  By',
  checkedByAccountDeptList: [
    { name: 'Mr. Javeed Hikady', checked: true },
    { name: 'Mr. Fazley Elahi Azim', checked: true },
    { name: 'Mr. Shaheed Pathan', checked: true }
  ],
  verifiedByName: 'Mohammad Iftekhairul Alam',
  verifiedByTitle: 'Verified By',
  approvedByName: 'Nurul Alam',
  approvedBy1Name: 'Nurul Alam',
  approvedByTitle: 'Approved By',
  requestedByName: 'Mr Abdul Gaffar',
  approvedBy2Name: 'Bulbul Mashrequi',
  approvedBy3Name: 'Abdulaziz',
  mprNoPrefix: 'MPR',
  approvalTermsNote: 'Checked and certified for official settlement and accounting ledger posting.'
};

export const DEFAULT_BOT_QUESTIONS: BotQuestion[] = [
  {
    id: 'q1',
    order: 1,
    key: 'amount',
    questionBn: 'আপনার কত টাকা খরচ হয়েছে অথবা আপনি কত টাকা খরচ করতে চাচ্ছেন?',
    questionEn: 'How much money was spent or do you want to spend? (SAR)',
    questionAr: 'كم المبلغ الذي تم إنفاقه أو ترغب في إنفاقه؟ (بالريال السعودي)',
    questionText: '১. আপনার কত টাকা খরচ হয়েছে অথবা আপনি কত টাকা খরচ করতে চাচ্ছেন? / How much money was spent or do you want to spend? (SAR)',
    type: 'number',
    required: true,
    placeholder: 'e.g. 250',
    helpText: 'Enter amount in SAR (সৌদি রিয়ালে টাকার পরিমাণ লিখুন)'
  },
  {
    id: 'q2',
    order: 2,
    key: 'category',
    questionBn: 'এই খরচটি কেন হয়েছে অথবা আপনি এই খরচটি কেন করতে চাচ্ছেন?',
    questionEn: 'Why was this expense incurred or why do you want to incur it? (Category / Purpose)',
    questionAr: 'ما هو سبب هذا المصروف أو لماذا تريد إنفاقه؟ (الفئة / الغرض)',
    questionText: '২. এই খরচটি কেন হয়েছে অথবা আপনি এই খরচটি কেন করতে চাচ্ছেন? / Why was this expense incurred or why do you want to incur it?',
    type: 'select',
    options: [
      'Travel & Transport / যাতায়াত / سفر ومواصلات',
      'Client Dining & Meals / খাবার ও আপ্যায়ন / طعام وضيافة',
      'Office Supplies & Stationery / অফিস সামগ্রী / أدوات مكتبية',
      'Software & Cloud Services / সফটওয়্যার ও ক্লাউড / برمجيات وسحابية',
      'Hotel & Accommodation / হোটেল ও আবাসন / فندق وإقامة',
      'Fuel & Vehicle Maintenance / জ্বালানি ও গাড়ি মেরামত / وقود وصيانة',
      'Miscellaneous Business / অন্যান্য ব্যবসায়িক খরচ / نثريات أعمال'
    ],
    required: true,
    helpText: 'Select purpose or category (খরচের কারণ বা ক্যাটাগরি)'
  },
  {
    id: 'q3',
    order: 3,
    key: 'description',
    questionBn: 'আপনার খরচের বর্ণনা লিখুন । বিস্তারিতভাবে লিখুন ।',
    questionEn: 'Write the description of your expense. Please write in detail.',
    questionAr: 'اكتب وصف المصروف بالتفصيل.',
    questionText: '৩. আপনার খরচের বর্ণনা লিখুন । বিস্তারিতভাবে লিখুন । / Write the description of your expense in detail.',
    type: 'text',
    required: true,
    placeholder: 'e.g. Taxi fare to client meeting at King Fahd Road, Riyadh...',
    helpText: 'Provide detailed business context (খরচের বিস্তারিত বিবরণ লিখুন)'
  },
  {
    id: 'q4',
    order: 4,
    key: 'totalAmount',
    questionBn: 'আপনার খরচের মূল্য পরিমাণ কত, টাকার পরিমাণ কত?',
    questionEn: 'What is the total value / cost amount of your expense?',
    questionAr: 'ما هو إجمالي قيمة المصروف أو المبلغ؟',
    questionText: '৪. আপনার খরচের মূল্য পরিমাণ কত, টাকার পরিমাণ কত? / What is the total value / cost amount of your expense?',
    type: 'number',
    required: true,
    placeholder: 'e.g. 250',
    helpText: 'Confirm exact total cost in SAR (খরচের সর্বমোট মূল্য নিশ্চিত করুন)'
  },
  {
    id: 'q5',
    order: 5,
    key: 'vatStatus',
    questionBn: 'এই খরচটিতে কি কোনো ভ্যাট আছে নাকি উইদাউট ভ্যাট?',
    questionEn: 'Does this expense include VAT or is it without VAT?',
    questionAr: 'هل هذا المصروف يشمل ضريبة القيمة المضافة أم بدون ضريبة؟',
    questionText: '৫. এই খরচটিতে কি কোনো ভ্যাট আছে নাকি উইদাউট ভ্যাট? / Does this expense include VAT or is it without VAT?',
    type: 'select',
    options: [
      'With VAT (ভ্যাট সহ / شامل الضريبة)',
      'Without VAT (উইদাউট ভ্যাট / بدون ضريبة)'
    ],
    required: true,
    helpText: 'Specify VAT tax status (ভ্যাট প্রযোজ্য কিনা)'
  },
  {
    id: 'q6',
    order: 6,
    key: 'paymentMethod',
    questionBn: 'এই খরচটি কি ক্যাশে হবে নাকি ব্যাংকে হবে?',
    questionEn: 'Will this expense be paid in Cash or Bank transfer?',
    questionAr: 'هل سيكون هذا المصروف نقداً (كاش) أم تحويل بنكي؟',
    questionText: '৬. এই খরচটি কি ক্যাশে হবে নাকি ব্যাংকে হবে? / Will this expense be paid in Cash or Bank transfer?',
    type: 'select',
    options: [
      'Cash (ক্যাশ / نقداً)',
      'Bank Transfer (ব্যাংক ট্রান্সফার / تحويل بنكي)'
    ],
    required: true,
    helpText: 'Select payment mode (ক্যাশ নাকি ব্যাংক পেমেন্ট)'
  },
  {
    id: 'q7',
    order: 7,
    key: 'project',
    questionBn: 'এই খরচটি কোন প্রজেক্ট রিলেটেড?',
    questionEn: 'Which project is this expense related to?',
    questionAr: 'ما هو المشروع المتعلق بهذا المصروف؟',
    questionText: '৭. এই খরচটি কোন প্রজেক্ট রিলেটেড? / Which project is this expense related to?',
    type: 'text',
    required: true,
    placeholder: 'e.g. Riyadh Metro Project / HQ Operations / Marketing...',
    helpText: 'Enter related project name (প্রজেক্টের নাম লিখুন)'
  },
  {
    id: 'q8',
    order: 8,
    key: 'approvedBy',
    questionBn: 'আপনার এই খরচটির অ্যাপ্রুভাল কে দিয়েছে?',
    questionEn: 'Who approved this expense?',
    questionAr: 'من الذي وافق على هذا المصروف؟',
    questionText: '৮. আপনার এই খরচটির অ্যাপ্রুভাল কে দিয়েছে? / Who approved this expense?',
    type: 'text',
    required: true,
    placeholder: 'e.g. Faisal Al-Otaibi / Project Manager / Department Head...',
    helpText: 'Name or role of approving manager (অনুমোদনকারীর নাম লিখুন)'
  },
  {
    id: 'q9',
    order: 9,
    key: 'receiptUrl',
    questionBn: 'আপনার ইনভয়সটির ছবি দিন ।',
    questionEn: 'Please provide / upload a photo of your invoice or receipt.',
    questionAr: 'يرجى إرفاق صورة الفاتورة أو الإيصال.',
    questionText: '৯. আপনার ইনভয়সটির ছবি দিন । / Please upload a photo of your invoice or receipt.',
    type: 'receipt',
    required: false,
    placeholder: 'Attach receipt image or invoice file',
    helpText: 'Upload image file or take photo (ইনভয়েসের ছবি দিন)'
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  telegramBotToken: '',
  telegramWebhookUrl: '',
  googleSheetId: '1Saudi_ExpenseSheet_2026_SampleID',
  googleApiKey: '',
  autoSyncToSheets: true,
  defaultCurrency: 'SAR',
  companyName: 'Al-Falak Enterprises KSA',
  approvalPdfConfig: DEFAULT_APPROVAL_PDF_CONFIG
};

export const INITIAL_USERS: AppUser[] = [
  {
    uid: 'emp-101',
    email: 'tariq.mansoor@alfalak.sa',
    displayName: 'Tariq Al-Mansoor',
    role: 'employee',
    employeeId: 'KSA-4021',
    department: 'Sales & Field Operations (Riyadh)',
    designation: 'Senior Sales Executive',
    phone: '+966 50 123 4567',
    telegramHandle: '@tariq_mansoor_ksa'
  },
  {
    uid: 'emp-102',
    email: 'mohammad.harbi@alfalak.sa',
    displayName: 'Mohammad Al-Harbi',
    role: 'employee',
    employeeId: 'KSA-4022',
    department: 'Logistics & Supply Chain',
    designation: 'Logistics Officer',
    phone: '+966 55 987 6543',
    telegramHandle: '@mohammad_harbi_ksa'
  },
  {
    uid: 'emp-103',
    email: 'ahmed.ghamdi@alfalak.sa',
    displayName: 'Ahmed Al-Ghamdi',
    role: 'employee',
    employeeId: 'KSA-4023',
    department: 'Site Engineering & Projects',
    designation: 'Project Site Engineer',
    phone: '+966 54 222 3344',
    telegramHandle: '@ahmed_site_eng'
  },
  {
    uid: 'emp-104',
    email: 'sara.shehri@alfalak.sa',
    displayName: 'Sara Al-Shehri',
    role: 'employee',
    employeeId: 'KSA-4024',
    department: 'Marketing & Client Relations',
    designation: 'Marketing Lead',
    phone: '+966 56 777 8899',
    telegramHandle: '@sara_marketing_ksa'
  },
  {
    uid: 'appr-201',
    email: 'faisal.otaibi@alfalak.sa',
    displayName: 'Faisal Al-Otaibi',
    role: 'approver',
    employeeId: 'KSA-1082',
    department: 'Finance & Accounts (Jeddah)',
    designation: 'Finance & Approvals Manager',
    phone: '+966 50 555 1122',
    telegramHandle: '@faisal_finance_mgr'
  },
  {
    uid: 'admin-301',
    email: 'lotofsoft@gmail.com',
    displayName: 'Admin User',
    role: 'admin',
    employeeId: 'KSA-0001',
    department: 'Executive Management',
    designation: 'System Administrator & Director',
    phone: '+966 50 000 9999',
    telegramHandle: '@admin_alfalak_ksa'
  }
];

