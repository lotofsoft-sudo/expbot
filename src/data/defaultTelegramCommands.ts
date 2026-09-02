import { TelegramCommand } from '../types';

export const DEFAULT_TELEGRAM_COMMANDS: TelegramCommand[] = [
  {
    id: 'cmd_start',
    command: '/start',
    description: 'Start conversation & see employee welcome message',
    action: 'start_expense',
    replyText: `👋 Welcome {user_name} to {company_name} Expense Assistant (KSA)! 🇸🇦

You can submit your expenses directly in SAR (Saudi Riyal).
• To record an expense: Send amount & description (e.g., "150 SAR Taxi to Olaya Riyadh")
• To download approved vouchers: Type /pdf
• To see today's status: Type /status
• For help: Type /help

How can I help you today?`,
    isEnabled: true,
    isSystem: true,
    order: 1,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cmd_help',
    command: '/help',
    description: 'Display all available commands and user guide',
    action: 'show_help',
    replyText: `📖 {company_name} - Telegram Bot User Guide:

🔹 /start - Restart bot session & view welcome menu
🔹 /expense - Enter a new expense step-by-step
🔹 /pdf - View & download approved 1-page PDF vouchers
🔹 /balance - Check your total pending & approved expenses
🔹 /categories - View list of approved corporate expense categories
🔹 /status - Check system connectivity (Firestore & Sheets)
🔹 /rules - View corporate reimbursement rules

💡 Quick Submission: Just type your expense in one sentence:
"85 SAR Business Lunch at Al Nakheel" or "120 SAR Fuel"`,
    isEnabled: true,
    isSystem: true,
    order: 2,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cmd_pdf',
    command: '/pdf',
    description: 'Fetch and download 1-page official PDF Approval Vouchers',
    action: 'show_pdf_voucher',
    replyText: `📄 Approved Expense Vouchers:
Here are your recently approved expenses ready for voucher download. Click below to view the official 1-page corporate approval PDF with signature blocks and VAT numbers:`,
    isEnabled: true,
    isSystem: true,
    order: 3,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cmd_expense',
    command: '/expense',
    description: 'Submit an expense entry',
    action: 'start_expense',
    replyText: `📝 Please send your expense amount in SAR along with a short business reason.
Example: "120 SAR Office stationery from Jarir Bookstore"`,
    isEnabled: true,
    isSystem: true,
    order: 4,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cmd_balance',
    command: '/balance',
    description: 'View current pending & approved expense balance',
    action: 'show_summary',
    replyText: `📊 Expense Summary for {user_name}:
• Pending Approvals: {pending_count} items ({pending_amount} {currency})
• Approved Items: {approved_count} items ({approved_amount} {currency})
• Today's Date: {today_date}

All approved items are automatically synced to Google Sheets and saved in Firestore.`,
    isEnabled: true,
    isSystem: false,
    order: 5,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cmd_categories',
    command: '/categories',
    description: 'List allowable expense categories',
    action: 'show_categories',
    replyText: `📁 Approved Expense Categories (KSA Corporate Policy):

1. 🚕 Travel & Transportation (Uber, Careem, Taxi, Metro, Fuel)
2. 🍽️ Client Dining & Meals (Business lunches, meeting refreshments)
3. 📦 Office Supplies & Stationery (Jarir, Amazon, printing)
4. 💻 Software, Cloud & Subscriptions (SaaS, licenses)
5. 🏨 Lodging & Hotel (Business travel accommodation)
6. 🌐 Telecom & Internet (Mobile bills, data packages)
7. 📄 Miscellaneous Business Expenses

Note: VAT invoices (ZATCA compliant) should be retained for amounts exceeding 100 SAR.`,
    isEnabled: true,
    isSystem: false,
    order: 6,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cmd_status',
    command: '/status',
    description: 'Check bot and database synchronization status',
    action: 'show_status',
    replyText: `🟢 System Operational Status:
• Bot Service: Online & Active
• Database: Firebase Firestore Connected
• Sync Engine: Google Sheets Direct API Connected
• Company: {company_name}
• Base Currency: {currency}
• Timestamp: {today_date}`,
    isEnabled: true,
    isSystem: false,
    order: 7,
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cmd_rules',
    command: '/rules',
    description: 'View expense reimbursement policy & rules',
    action: 'custom_reply',
    replyText: `📋 {company_name} Expense Reimbursement Rules:

1. All expense receipts must clearly state the vendor name, date, and SAR amount.
2. Expenses above 500 SAR require prior managerial approval.
3. Submissions must be made within 30 days of the transaction.
4. Official 1-page PDF vouchers can be generated using /pdf after manager sign-off.`,
    isEnabled: true,
    isSystem: false,
    order: 8,
    updatedAt: new Date().toISOString()
  }
];
