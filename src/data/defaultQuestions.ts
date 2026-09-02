import { BotQuestion, AppSettings, AppUser, ApprovalPdfConfig } from '../types';

export const DEFAULT_APPROVAL_PDF_CONFIG: ApprovalPdfConfig = {
  companyName: 'Wafaq Company',
  companySubtitle: 'P.O. Box 2481, Riyadh 12611, Riyadh, KSA. TelFax: 0112319609',
  companyAddress: 'P.O. Box 2481, Riyadh 12611, Riyadh, KSA. TelFax: 0112319609',
  addressLine: 'P.O. Box 2481, Riyadh 12611, Riyadh, KSA. TelFax: 0112319609',
  projectName: 'Head office',
  taxRegistrationNumber: '300192837400003',
  commercialRegistrationNumber: '1010892341',
  logoUrl: '/company_logo.svg',
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
    questionBn: 'How much money was spent or do you want to spend? (SAR)',
    questionEn: 'How much money was spent or do you want to spend? (SAR)',
    questionAr: 'How much money was spent or do you want to spend? (SAR)',
    questionText: '1. How much money was spent or do you want to spend? (SAR)',
    type: 'number',
    required: true,
    placeholder: 'e.g. 250',
    helpText: 'Enter amount in SAR'
  },
  {
    id: 'q2',
    order: 2,
    key: 'category',
    questionBn: 'Why was this expense incurred or why do you want to incur it? (Category / Purpose)',
    questionEn: 'Why was this expense incurred or why do you want to incur it? (Category / Purpose)',
    questionAr: 'Why was this expense incurred or why do you want to incur it? (Category / Purpose)',
    questionText: '2. Why was this expense incurred or why do you want to incur it?',
    type: 'select',
    options: [
      'Travel & Transport',
      'Client Dining & Meals',
      'Office Supplies & Stationery',
      'Software & Cloud Services',
      'Hotel & Accommodation',
      'Fuel & Vehicle Maintenance',
      'Miscellaneous Business'
    ],
    required: true,
    helpText: 'Select purpose or category'
  },
  {
    id: 'q3',
    order: 3,
    key: 'description',
    questionBn: 'Write the description of your expense in detail.',
    questionEn: 'Write the description of your expense. Please write in detail.',
    questionAr: 'Write the description of your expense. Please write in detail.',
    questionText: '3. Write the description of your expense in detail.',
    type: 'text',
    required: true,
    placeholder: 'e.g. Taxi fare to client meeting at King Fahd Road, Riyadh...',
    helpText: 'Provide detailed business context'
  },
  {
    id: 'q5',
    order: 4,
    key: 'vatStatus',
    questionBn: 'Does this expense include VAT or is it without VAT?',
    questionEn: 'Does this expense include VAT or is it without VAT?',
    questionAr: 'Does this expense include VAT or is it without VAT?',
    questionText: '4. Does this expense include VAT or is it without VAT?',
    type: 'select',
    options: [
      'With VAT',
      'Without VAT'
    ],
    required: true,
    helpText: 'Specify VAT tax status'
  },
  {
    id: 'q6',
    order: 5,
    key: 'paymentMethod',
    questionBn: 'Will this expense be paid in Cash or Bank transfer?',
    questionEn: 'Will this expense be paid in Cash or Bank transfer?',
    questionAr: 'Will this expense be paid in Cash or Bank transfer?',
    questionText: '5. Will this expense be paid in Cash or Bank transfer?',
    type: 'select',
    options: [
      'Cash',
      'Bank Transfer'
    ],
    required: true,
    helpText: 'Select payment mode'
  },
  {
    id: 'q7',
    order: 6,
    key: 'project',
    questionBn: 'Which project is this expense related to?',
    questionEn: 'Which project is this expense related to?',
    questionAr: 'Which project is this expense related to?',
    questionText: '6. Which project is this expense related to?',
    type: 'text',
    required: true,
    placeholder: 'e.g. Riyadh Metro Project / HQ Operations / Marketing...',
    helpText: 'Enter related project name'
  },
  {
    id: 'q8',
    order: 7,
    key: 'approvedBy',
    questionBn: 'Who approved this expense?',
    questionEn: 'Who approved this expense?',
    questionAr: 'Who approved this expense?',
    questionText: '7. Who approved this expense?',
    type: 'text',
    required: true,
    placeholder: 'e.g. Faisal Al-Otaibi / Project Manager / Department Head...',
    helpText: 'Name or role of approving manager'
  },
  {
    id: 'q9',
    order: 8,
    key: 'receiptUrl',
    questionBn: 'Please upload a photo of your invoice or receipt.',
    questionEn: 'Please upload a photo of your invoice or receipt.',
    questionAr: 'Please upload a photo of your invoice or receipt.',
    questionText: '8. Please upload a photo of your invoice or receipt.',
    type: 'receipt',
    required: false,
    placeholder: 'Attach receipt image or invoice file',
    helpText: 'Upload image file or take photo'
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
    iqama: '2418920192',
    password: 'TariqPass@2026',
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
    iqama: '2319028371',
    password: 'HarbiPass@2026',
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
    iqama: '2591029384',
    password: 'AhmedPass@2026',
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
    iqama: '2201938475',
    password: 'SaraPass@2026',
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
    iqama: '2109283746',
    password: 'FaisalPass@2026',
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
    iqama: '1009283741',
    password: 'AdminPass@2026',
    department: 'Executive Management',
    designation: 'System Administrator & Director',
    phone: '+966 50 000 9999',
    telegramHandle: '@admin_alfalak_ksa'
  }
];

