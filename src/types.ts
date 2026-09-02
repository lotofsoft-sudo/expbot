export type UserRole = 'employee' | 'approver' | 'admin';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  employeeId: string;
  department: string;
  designation?: string;
  phone?: string;
  telegramHandle?: string;
  iqama?: string;
  password?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type StatementPeriodType = 'weekly' | 'monthly' | 'yearly' | 'custom' | 'all';

export type ExpenseStatus = 'pending' | 'approved' | 'rejected';
export type SubmissionChannel = 'web_chat' | 'telegram_bot' | 'manual_form';
export type SyncStatus = 'synced' | 'pending' | 'failed';

export interface Expense {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  employeeId?: string;
  department?: string;
  employeeDesignation?: string;
  batchId?: string; // Grouping ID for multi-expense submission session
  batchIndex?: number; // 1-based index in the session batch
  batchTotalCount?: number; // Total items submitted together in this session
  amount: number; // Q1: Amount spent or requested
  currency: string; // Strictly SAR
  category: string; // Q2: Reason / Purpose / Category
  description: string; // Q3: Detailed description
  totalAmount?: number; // Q4: Total cost / price amount confirmation
  vatStatus?: string; // Q5: "With VAT" | "Without VAT"
  paymentMethod?: string; // Q6: "Cash" | "Bank Transfer"
  project?: string; // Q7: Project related
  approvedBy?: string; // Q8: Approver name / role
  receiptUrl?: string; // Q9: Invoice / receipt photo
  receiptName?: string;
  date: string; // YYYY-MM-DD
  taxAmount?: number;
  vatNumber?: string;
  status: ExpenseStatus;
  approvalStep?: number; // 0=Pending Step 1, 1=Abdulaziz Approved, 2=Bulbul Approved, 3=Nurul Alam Approved
  step1Approved?: boolean; // Step 1: Abdulaziz
  step2Approved?: boolean; // Step 2: Bulbul Mashrequi
  step3Approved?: boolean; // Step 3: Nurul Alam (Final Approver)
  step1ApprovedAt?: string;
  step2ApprovedAt?: string;
  step3ApprovedAt?: string;
  submittedVia: SubmissionChannel;
  approverNotes?: string;
  approvedAt?: string;
  syncedToGoogleSheets: boolean;
  syncStatus?: SyncStatus;
  lastSyncAt?: string;
  syncError?: string;
  retryCount?: number;
  googleSheetRow?: number;
  createdAt: string; // ISO String
  updatedAt?: string;
}

export interface ApprovalPdfConfig {
  companyName: string;
  companySubtitle: string;
  companyAddress: string;
  projectName?: string;
  addressLine?: string;
  taxRegistrationNumber?: string;
  commercialRegistrationNumber?: string;
  logoUrl?: string;
  voucherTitle: string;
  currency: string;
  preparedByName?: string;
  preparedByTitle?: string;
  checkedByAccountDeptList?: Array<{ name: string; checked: boolean }>;
  verifiedByName: string;
  verifiedByTitle?: string;
  approvedByName?: string;
  approvedBy1Name?: string;
  approvedByTitle?: string;
  requestedByName?: string;
  approvedBy2Name?: string;
  approvedBy3Name?: string;
  mprNoPrefix?: string;
  approvalTermsNote: string;
}

export type QuestionType = 'number' | 'text' | 'select' | 'receipt' | 'date';
export type LanguageMode = 'bn_en' | 'ar_en' | 'bn' | 'en' | 'ar';

export interface BotQuestion {
  id: string;
  order: number;
  key: string;
  questionText: string; // Active or combined display prompt
  questionBn?: string;  // Bengali text
  questionEn?: string;  // English text
  questionAr?: string;  // Arabic text
  type: QuestionType;
  options?: string[];
  required: boolean;
  placeholder?: string;
  helpText?: string;
}

export interface GoogleSheetsConfig {
  projectId: string;
  projectNumber?: string;
  spreadsheetId: string;
  sheetName: string;
  range: string;
  serviceAccountEmail: string;
  serviceAccountPrivateKey?: string; // Plaintext when input by user, masked in UI
  encryptedPrivateKey?: string; // Stored securely on server/Firebase
  hasEncryptedPrivateKey?: boolean;
  apiKey?: string;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'untested';
  lastTestedAt?: string;
  lastSyncAt?: string;
  totalSynced?: number;
  lastError?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TelegramBotConfig {
  botToken: string;
  botUsername?: string;
  webhookUrl: string;
  secretToken?: string;
  autoSyncExpenses: boolean;
  welcomeMessage?: string;
  helpMessage?: string;
  notifyApproverOnNewExpense?: boolean;
  approverChatId?: string;
  connectionStatus?: 'connected' | 'disconnected' | 'error' | 'untested';
  lastTestedAt?: string;
  lastWebhookStatus?: any;
  lastError?: string;
}

export type TelegramCommandAction =
  | 'custom_reply'
  | 'start_expense'
  | 'show_pdf_voucher'
  | 'show_summary'
  | 'show_categories'
  | 'show_help'
  | 'show_status';

export interface TelegramCommand {
  id: string;
  command: string; // e.g. "/start", "/help", "/pdf", "/balance", "/rules"
  description: string; // Short description for Telegram menu
  action: TelegramCommandAction;
  replyText: string; // Customizable response template
  isEnabled: boolean;
  isSystem?: boolean;
  order?: number;
  updatedAt?: string;
}

export interface AppSettings {
  telegramBotToken: string;
  telegramWebhookUrl: string;
  autoSyncToSheets: boolean;
  defaultCurrency: string;
  companyName: string;
  approvalPdfConfig?: ApprovalPdfConfig;
  googleSheetsConfig?: GoogleSheetsConfig;
  telegramBotConfig?: TelegramBotConfig;
  // Legacy aliases mapped automatically
  googleSheetId?: string;
  googleApiKey?: string;
}

export interface SyncLog {
  id: string;
  timestamp: string;
  operation:
    | 'append'
    | 'update'
    | 'read'
    | 'test_connection'
    | 'connection_test'
    | 'batch_sync'
    | 'auto_sync'
    | 'single_sync';
  expenseId?: string;
  status: 'success' | 'failed' | 'pending';
  details: string;
  error?: string;
  retryCount?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user' | 'system';
  text: string;
  timestamp: string;
  options?: string[];
  fieldKey?: string;
  receiptData?: {
    url: string;
    name: string;
  };
  submittedExpense?: Expense;
  submittedExpensesBatch?: Expense[];
}

