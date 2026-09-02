import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { encryptSecret, decryptSecret, maskPrivateKey } from './server/crypto';
import {
  testGoogleSheetsConnection,
  syncExpensesToSheet,
  getSpreadsheetData,
  resolveBackendConfig,
  normalizePrivateKey,
  extractPrivateKey,
  formatGoogleError,
  BackendGoogleSheetsConfig
} from './server/googleSheetsService';

const app = express();
const PORT = 3000;

// Corporate default currency configured via environment secret (Strictly SAR)
const SYSTEM_CURRENCY = process.env.DEFAULT_CURRENCY || process.env.EXPENSE_CURRENCY || 'SAR';

app.use(express.json({ limit: '10mb' }));

// In-memory cache for recent Telegram updates & webhook logs
interface TelegramLog {
  id: string;
  timestamp: string;
  sender: string;
  text: string;
  response: string;
  status: 'received' | 'processed' | 'error';
}

const telegramLogs: TelegramLog[] = [];

// Initialize Gemini Client server-side lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// ------------------- API ROUTES -------------------

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'ExpenseGrid Swiss Direct API Backend',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    googleSheetsApiDirect: true
  });
});

// Telegram Bot Status check
app.get('/api/telegram/status', (req, res) => {
  res.json({
    active: true,
    webhookUrl: `${process.env.APP_URL || 'http://localhost:3000'}/api/telegram/webhook`,
    logsCount: telegramLogs.length,
    recentLogs: telegramLogs.slice(0, 30)
  });
});

// Telegram API: Get Me / Test Bot Token
app.post('/api/telegram/get-me', async (req, res) => {
  try {
    const { botToken } = req.body;
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(400).json({ ok: false, error: 'Telegram Bot Token is required.' });
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error('[Telegram getMe Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Telegram API: Set Webhook
app.post('/api/telegram/set-webhook', async (req, res) => {
  try {
    const { botToken, webhookUrl, secretToken } = req.body;
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(400).json({ ok: false, error: 'Telegram Bot Token is required.' });
    }
    if (!webhookUrl) {
      return res.status(400).json({ ok: false, error: 'Webhook URL is required.' });
    }

    const payload: Record<string, any> = { url: webhookUrl };
    if (secretToken && secretToken.trim().length > 0) {
      payload.secret_token = secretToken.trim();
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error('[Telegram setWebhook Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Telegram API: Get Webhook Info
app.post('/api/telegram/get-webhook-info', async (req, res) => {
  try {
    const { botToken } = req.body;
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(400).json({ ok: false, error: 'Telegram Bot Token is required.' });
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error('[Telegram getWebhookInfo Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Telegram API: Delete Webhook
app.post('/api/telegram/delete-webhook', async (req, res) => {
  try {
    const { botToken } = req.body;
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(400).json({ ok: false, error: 'Telegram Bot Token is required.' });
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error('[Telegram deleteWebhook Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Telegram API: Sync Commands (setMyCommands)
app.post('/api/telegram/sync-commands', async (req, res) => {
  try {
    const { botToken, commands } = req.body;
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      return res.status(400).json({ ok: false, error: 'Telegram Bot Token is required.' });
    }
    if (!Array.isArray(commands)) {
      return res.status(400).json({ ok: false, error: 'Commands array is required.' });
    }

    // Format commands for Telegram API: strip leading '/', lowercase, max 32 chars
    const tgCommands = commands
      .filter((c: any) => c && c.isEnabled !== false)
      .map((c: any) => {
        const rawCmd = (c.command || '').replace(/^\//, '').trim().toLowerCase().substring(0, 32);
        const rawDesc = (c.description || c.command || 'Execute command').trim().substring(0, 256);
        return {
          command: rawCmd || 'start',
          description: rawDesc || 'Expense Bot Command'
        };
      })
      .filter((c: any) => /^[a-z0-9_]{1,32}$/.test(c.command));

    const response = await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: tgCommands })
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error('[Telegram setMyCommands Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Telegram API: Send Test Message
app.post('/api/telegram/send-test', async (req, res) => {
  try {
    const { botToken, chatId, text } = req.body;
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token || !chatId || !text) {
      return res.status(400).json({ ok: false, error: 'botToken, chatId, and text are required.' });
    }

    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    });
    const data = await response.json();
    res.json(data);
  } catch (err: any) {
    console.error('[Telegram sendMessage Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// In-memory Telegram chat session tracker for 8-step expense flow
interface TelegramChatSession {
  stepIndex: number;
  answers: {
    amount?: number;
    category?: string;
    description?: string;
    totalAmount?: number;
    vatStatus?: string;
    paymentMethod?: string;
    project?: string;
    approvedBy?: string;
    receiptUrl?: string;
    receiptName?: string;
    date?: string;
  };
  sessionExpenses: any[];
  awaitingMoreChoice: boolean;
  lastUpdated: number;
}

const telegramSessions = new Map<string, TelegramChatSession>();

const TG_8_QUESTIONS = [
  {
    step: 0,
    key: 'amount',
    title: '1. How much money was spent or do you want to spend? (SAR)',
    subtitle: 'Enter expense amount in SAR',
    keyboard: [['50 SAR', '100 SAR', '150 SAR'], ['250 SAR', '500 SAR', '1000 SAR']]
  },
  {
    step: 1,
    key: 'category',
    title: '2. Why was this expense incurred or why do you want to incur it?',
    subtitle: 'Select purpose or category',
    keyboard: [
      ['Travel & Transport', 'Client Dining & Meals'],
      ['Office Supplies', 'Software & Cloud Services'],
      ['Hotel & Accommodation', 'Fuel & Vehicle Maintenance'],
      ['Miscellaneous Business']
    ]
  },
  {
    step: 2,
    key: 'description',
    title: '3. Write the description of your expense in detail.',
    subtitle: 'Write detailed business context',
    keyboard: []
  },
  {
    step: 3,
    key: 'vatStatus',
    title: '4. Does this expense include VAT or is it without VAT?',
    subtitle: 'Specify VAT status',
    keyboard: [
      ['With VAT', 'Without VAT']
    ]
  },
  {
    step: 4,
    key: 'paymentMethod',
    title: '5. Will this expense be paid in Cash or Bank transfer?',
    subtitle: 'Select payment mode',
    keyboard: [
      ['Cash', 'Bank Transfer']
    ]
  },
  {
    step: 5,
    key: 'project',
    title: '6. Which project is this expense related to?',
    subtitle: 'Enter project name',
    keyboard: [
      ['Riyadh Metro Project', 'HQ Operations'],
      ['Marketing Campaign', 'General Project']
    ]
  },
  {
    step: 6,
    key: 'approvedBy',
    title: '7. Who approved this expense?',
    subtitle: 'Name or role of approving manager',
    keyboard: [
      ['Finance Manager', 'Faisal Al-Otaibi'],
      ['Project Manager', 'Department Head']
    ]
  },
  {
    step: 7,
    key: 'receiptUrl',
    title: '8. Please send a photo of your invoice / receipt (or click No Receipt / Skip).',
    subtitle: 'Upload receipt image or skip',
    keyboard: [
      ['📸 No Receipt Available / Skip']
    ]
  }
];

// Helper to send message with optional keyboard to Telegram
async function sendTelegramBotReply(chatId: number | string, text: string, keyboard?: string[][], token?: string) {
  const activeToken = token || process.env.TELEGRAM_BOT_TOKEN;
  if (!activeToken || !chatId) return;

  const payload: any = {
    chat_id: chatId,
    text: text
  };

  if (keyboard && keyboard.length > 0) {
    payload.reply_markup = {
      keyboard: keyboard.map((row) => row.map((btn) => ({ text: btn }))),
      resize_keyboard: true,
      one_time_keyboard: true
    };
  } else {
    payload.reply_markup = { remove_keyboard: true };
  }

  try {
    await fetch(`https://api.telegram.org/bot${activeToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.warn('[Telegram Reply Error]:', err);
  }
}

// Telegram Webhook endpoint (handles incoming Telegram bot updates with 9-step flow)
app.post('/api/telegram/webhook', async (req, res) => {
  try {
    const update = req.body;
    console.log('[Telegram Webhook] Incoming update:', JSON.stringify(update));

    const message = update?.message;
    const chatId = message?.chat?.id;
    const rawText = (message?.text || message?.caption || '').trim();
    const sender = message?.from?.first_name || message?.from?.username || 'Telegram User';
    const photos = message?.photo;
    const doc = message?.document;

    if (!chatId) {
      return res.json({ ok: true, note: 'No chat id in update' });
    }

    const sessionKey = String(chatId);
    let session = telegramSessions.get(sessionKey);

    if (!session || Date.now() - session.lastUpdated > 24 * 60 * 60 * 1000) {
      session = {
        stepIndex: 0,
        answers: { date: new Date().toISOString().split('T')[0] },
        sessionExpenses: [],
        awaitingMoreChoice: false,
        lastUpdated: Date.now()
      };
      telegramSessions.set(sessionKey, session);
    }
    session.lastUpdated = Date.now();

    const lower = rawText.toLowerCase();

    // 1. Handle Slash Commands
    if (lower === '/start' || lower.startsWith('/start ') || lower === '/new' || lower === '/expense') {
      session.stepIndex = 0;
      session.answers = { date: new Date().toISOString().split('T')[0] };
      session.sessionExpenses = [];
      session.awaitingMoreChoice = false;

      const q1 = TG_8_QUESTIONS[0];
      const reply = `Welcome ${sender}! 👋 Welcome to ExpenseFlow Saudi Arabia Bot (SAR Only).\n\nSubmit single or multiple expenses by answering 8 standard questions:\n\nExpense #1:\n${q1.title}\n${q1.subtitle}`;
      
      await sendTelegramBotReply(chatId, reply, q1.keyboard);

      telegramLogs.unshift({
        id: `tg_${Date.now()}`,
        timestamp: new Date().toISOString(),
        sender: `${sender} (${chatId})`,
        text: rawText,
        response: reply,
        status: 'processed'
      });
      if (telegramLogs.length > 50) telegramLogs.pop();

      return res.json({ ok: true, result: { text: reply } });
    }

    if (lower === '/status') {
      const reply = `🟢 ExpenseFlow Bot is online.\n• Database: Firebase Firestore\n• Sheets: Google Sheets Synchronized\n• Currency: SAR (Saudi Riyal)\n• Current Flow: 8 Standard Expense Questions`;
      await sendTelegramBotReply(chatId, reply);
      return res.json({ ok: true, result: { text: reply } });
    }

    if (lower === '/help') {
      const reply = `📖 Telegram Bot Commands:\n/start - Start expense submission\n/new - Start fresh 8-question expense flow\n/pdf - View approved PDF vouchers\n/status - System status\n\nYou can submit single or multiple expenses sequentially using 8 standard questions.`;
      await sendTelegramBotReply(chatId, reply);
      return res.json({ ok: true, result: { text: reply } });
    }

    if (lower === '/pdf') {
      const reply = `📄 Official 1-page Expense Approval PDF Vouchers are available on the Expense Approvals Dashboard in the web portal.`;
      await sendTelegramBotReply(chatId, reply);
      return res.json({ ok: true, result: { text: reply } });
    }

    // 2. Handle "Another Expense" decision state
    if (session.awaitingMoreChoice) {
      if (lower.includes('yes') || lower.includes('add') || lower.includes('another')) {
        session.awaitingMoreChoice = false;
        session.stepIndex = 0;
        session.answers = { date: new Date().toISOString().split('T')[0] };

        const nextItemNum = session.sessionExpenses.length + 1;
        const q1 = TG_8_QUESTIONS[0];
        const reply = `➕ Starting Expense #${nextItemNum} in this session:\n\n${q1.title}\n${q1.subtitle}`;
        await sendTelegramBotReply(chatId, reply, q1.keyboard);
        return res.json({ ok: true });
      } else if (lower.includes('no') || lower.includes('done') || lower.includes('finalize')) {
        session.awaitingMoreChoice = false;
        const totalSum = session.sessionExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const count = session.sessionExpenses.length;
        const reply = `🎉 Session Finalized Successfully!\n\n📋 Total Expenses Submitted: ${count}\n💵 Grand Total: ${totalSum.toFixed(2)} SAR\n\nAll items are securely saved in Firebase Firestore and synchronized to Google Sheets. In the Expense Ledger, they are listed as separate entries for individual approval.\n\nType /new anytime to record a new expense.`;
        
        session.sessionExpenses = [];
        await sendTelegramBotReply(chatId, reply, [['/new (Submit New Expense)']]);
        return res.json({ ok: true });
      }
    }

    // 3. Process the 8 Questions Step-by-Step
    const currentQ = TG_8_QUESTIONS[session.stepIndex];
    if (!currentQ) {
      // Fallback: restart flow
      session.stepIndex = 0;
      const q1 = TG_8_QUESTIONS[0];
      await sendTelegramBotReply(chatId, `Expense #1:\n${q1.title}\n${q1.subtitle}`, q1.keyboard);
      return res.json({ ok: true });
    }

    // Q1: Amount
    if (currentQ.key === 'amount') {
      const num = parseFloat(rawText.replace(/[^0-9.]/g, ''));
      const val = isNaN(num) ? 50 : num;
      session.answers.amount = val;
      session.answers.totalAmount = val;
    }
    // Q2: Category / Purpose
    else if (currentQ.key === 'category') {
      session.answers.category = rawText || 'Miscellaneous Business';
    }
    // Q3: Description
    else if (currentQ.key === 'description') {
      session.answers.description = rawText || 'Expense description';
    }
    // Q4: VAT Status
    else if (currentQ.key === 'vatStatus') {
      session.answers.vatStatus = rawText || 'Without VAT';
    }
    // Q5: Payment Method
    else if (currentQ.key === 'paymentMethod') {
      session.answers.paymentMethod = rawText || 'Cash';
    }
    // Q6: Related Project
    else if (currentQ.key === 'project') {
      session.answers.project = rawText || 'General Project';
    }
    // Q7: Approver Name
    else if (currentQ.key === 'approvedBy') {
      session.answers.approvedBy = rawText || 'Finance Manager';
    }
    // Q8: Invoice Photo
    else if (currentQ.key === 'receiptUrl') {
      if (photos && photos.length > 0) {
        const largestPhoto = photos[photos.length - 1];
        session.answers.receiptUrl = `telegram_file_id:${largestPhoto.file_id}`;
        session.answers.receiptName = `Telegram Photo (${largestPhoto.file_id.substring(0, 8)}.jpg)`;
      } else if (doc) {
        session.answers.receiptUrl = `telegram_doc_id:${doc.file_id}`;
        session.answers.receiptName = doc.file_name || 'Telegram Document';
      } else if (rawText && !lower.includes('skip')) {
        session.answers.receiptUrl = rawText;
      }
    }

    const nextIndex = session.stepIndex + 1;

    if (nextIndex < TG_8_QUESTIONS.length) {
      session.stepIndex = nextIndex;
      const nextQ = TG_8_QUESTIONS[nextIndex];
      const itemNum = session.sessionExpenses.length + 1;

      let dynamicKeyboard = nextQ.keyboard;

      const reply = `Expense #${itemNum}:\n${nextQ.title}\n${nextQ.subtitle}`;
      await sendTelegramBotReply(chatId, reply, dynamicKeyboard);

      return res.json({ ok: true, result: { text: reply } });
    } else {
      // Completed all 8 questions -> Finalize this item
      const itemNum = session.sessionExpenses.length + 1;
      const finalAmount = session.answers.amount || session.answers.totalAmount || 50;
      const expId = `EXP-TG-${Math.floor(1000 + Math.random() * 9000)}`;

      const newExpenseRecord = {
        id: expId,
        userName: sender,
        userEmail: `${sender.toLowerCase().replace(/\s+/g, '')}@telegram.user`,
        amount: finalAmount,
        currency: 'SAR',
        category: session.answers.category || 'Miscellaneous Business',
        description: session.answers.description || 'Expense description',
        totalAmount: session.answers.totalAmount || finalAmount,
        vatStatus: session.answers.vatStatus || 'Without VAT',
        paymentMethod: session.answers.paymentMethod || 'Cash',
        project: session.answers.project || 'General Project',
        approvedBy: session.answers.approvedBy || 'Finance Manager',
        receiptUrl: session.answers.receiptUrl || '',
        receiptName: session.answers.receiptName || '',
        date: session.answers.date || new Date().toISOString().split('T')[0],
        status: 'pending',
        submittedVia: 'telegram_bot',
        createdAt: new Date().toISOString()
      };

      // Try Auto-Sync directly to Google Sheets if configured in environment
      if (process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
        try {
          const backendConfig = resolveBackendConfig({
            spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID
          });
          if (backendConfig.serviceAccountEmail) {
            await syncExpensesToSheet(backendConfig, [newExpenseRecord]);
            console.log(`[Telegram Bot] Synced expense ${expId} to Google Sheets`);
          }
        } catch (sheetsErr) {
          console.warn(`[Telegram Bot Sheets Sync Warning]:`, sheetsErr);
        }
      }

      session.sessionExpenses.push(newExpenseRecord);
      session.awaitingMoreChoice = true;
      session.stepIndex = 0;

      const completionReply = `✅ Expense #${itemNum} (${expId}) Saved to Database!\n\n` +
        `💰 Amount: ${newExpenseRecord.amount.toFixed(2)} SAR\n` +
        `📁 Purpose: ${newExpenseRecord.category}\n` +
        `📝 Description: ${newExpenseRecord.description}\n` +
        `🧾 VAT: ${newExpenseRecord.vatStatus}\n` +
        `💳 Payment: ${newExpenseRecord.paymentMethod}\n` +
        `🏢 Project: ${newExpenseRecord.project}\n` +
        `👤 Approver: ${newExpenseRecord.approvedBy}\n` +
        `📸 Receipt: ${newExpenseRecord.receiptUrl ? 'Attached ✅' : 'None'}\n\n` +
        `Do you have another expense to add in this session?`;

      const choiceKeyboard = [
        ['➕ Yes, Add Another Expense'],
        [`✅ No, Finalize Session (${session.sessionExpenses.length} Items)`]
      ];

      await sendTelegramBotReply(chatId, completionReply, choiceKeyboard);

      telegramLogs.unshift({
        id: `tg_${Date.now()}`,
        timestamp: new Date().toISOString(),
        sender: `${sender} (${chatId})`,
        text: `[Completed 8-Question Submission: ${expId} - ${finalAmount} SAR]`,
        response: completionReply,
        status: 'processed'
      });
      if (telegramLogs.length > 50) telegramLogs.pop();

      return res.json({
        ok: true,
        result: {
          expense: newExpenseRecord,
          text: completionReply
        }
      });
    }
  } catch (err: any) {
    console.error('[Telegram Webhook Error]:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Natural Language Expense Parser endpoint (using Gemini API aligned strictly with the 8 questions)
app.post('/api/parse-expense', async (req, res) => {
  try {
    const { input } = req.body;
    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Input text is required' });
    }

    const gemini = getGeminiClient();
    if (!gemini) {
      // Fallback regex parsing if API key is not yet set
      const amountMatch = input.match(/(\d+(\.\d{1,2})?)/);
      const amount = amountMatch ? parseFloat(amountMatch[1]) : 50;

      return res.json({
        parsed: {
          amount: amount,
          category: 'Office & Operations',
          description: input,
          totalAmount: amount,
          vatStatus: 'Without VAT',
          paymentMethod: 'Cash',
          project: 'General Project',
          approvedBy: 'Finance Manager',
          receiptUrl: '',
          currency: SYSTEM_CURRENCY,
          date: new Date().toISOString().split('T')[0]
        },
        source: 'rule_fallback'
      });
    }

    const response = await gemini.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Extract expense details from the following user description strictly matching these 8 questions:
1. amount: (number) How much money was spent or requested in SAR (Q1)
2. category: (string) Why did this expense occur / Purpose / Reason (Q2)
3. description: (string) Detailed description of the expense (Q3)
4. vatStatus: (string) "With VAT" or "Without VAT" (Q4)
5. paymentMethod: (string) "Cash" or "Bank Transfer" (Q5)
6. project: (string) Which project is this related to (Q6, default: "General Project")
7. approvedBy: (string) Who gave approval for this expense (Q7, default: "Finance Manager")
8. receiptUrl: (string) Invoice / receipt image url if present, otherwise "" (Q8)
Also include:
- totalAmount: (number) set same as amount
- currency: strictly "${SYSTEM_CURRENCY}"
- date: YYYY-MM-DD (today if not mentioned)

Return JSON only with these exact keys. No markdown code fences.

User Input: "${input}"`
    });

    const responseText = response.text || '';
    const cleanJsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJsonStr);
    
    // Enforce strict defaults & currency
    parsed.currency = SYSTEM_CURRENCY;
    if (typeof parsed.amount !== 'number') parsed.amount = Number(parsed.amount) || 0;
    if (typeof parsed.totalAmount !== 'number') parsed.totalAmount = parsed.amount;
    if (!parsed.vatStatus) parsed.vatStatus = 'Without VAT';
    if (!parsed.paymentMethod) parsed.paymentMethod = 'Cash';
    if (!parsed.project) parsed.project = 'General Project';
    if (!parsed.approvedBy) parsed.approvedBy = 'Finance Manager';
    if (!parsed.category) parsed.category = 'General Expense';
    if (!parsed.description) parsed.description = input;
    if (!parsed.date) parsed.date = new Date().toISOString().split('T')[0];

    res.json({
      parsed,
      source: 'gemini_ai'
    });
  } catch (err: any) {
    console.error('[Parse Expense API Error]:', err);
    res.status(500).json({
      error: 'Failed to parse expense using AI',
      details: err.message
    });
  }
});

// ------------------- GOOGLE SHEETS DIRECT API v4 ROUTES -------------------

// 1. Encrypt Service Account Private Key for secure Firestore storage
app.post('/api/sheets/encrypt', (req, res) => {
  try {
    const { privateKey, configJson } = req.body;
    let targetKey = privateKey || '';

    // If user provided whole Service Account JSON string
    let extractedEmail = '';
    let extractedProjectId = '';
    if (configJson) {
      try {
        const parsed = JSON.parse(configJson);
        targetKey = parsed.private_key || targetKey;
        extractedEmail = parsed.client_email || '';
        extractedProjectId = parsed.project_id || '';
      } catch {
        // Not valid JSON, ignore
      }
    }

    const normalized = normalizePrivateKey(targetKey);
    if (!normalized || normalized.trim() === '') {
      return res.status(400).json({ error: 'No valid private key provided to encrypt.' });
    }

    const encrypted = encryptSecret(normalized.trim());

    res.json({
      success: true,
      encryptedPrivateKey: encrypted,
      hasEncryptedPrivateKey: true,
      maskedKey: maskPrivateKey(normalized),
      extractedEmail,
      extractedProjectId
    });
  } catch (err: any) {
    console.error('[Encryption API Error]:', err);
    res.status(500).json({ error: err.message });
  }
});

// 1.1. Save Config & Encrypt Private Key
app.post('/api/sheets/save-config', (req, res) => {
  try {
    const { config, privateKey, jsonKey } = req.body;
    let targetKey = privateKey || '';
    let updatedConfig = { ...config };

    if (jsonKey) {
      try {
        const parsed = typeof jsonKey === 'string' ? JSON.parse(jsonKey) : jsonKey;
        if (parsed.project_id) updatedConfig.projectId = parsed.project_id;
        if (parsed.client_email) updatedConfig.serviceAccountEmail = parsed.client_email;
        if (parsed.private_key) targetKey = parsed.private_key;
      } catch (e) {
        // ignore
      }
    }

    if (targetKey && targetKey.trim()) {
      const normalized = normalizePrivateKey(targetKey.trim());
      const encrypted = encryptSecret(normalized);
      updatedConfig.encryptedPrivateKey = encrypted;
      updatedConfig.hasEncryptedPrivateKey = true;
      updatedConfig.serviceAccountPrivateKey = undefined; // Do not store plaintext
    }

    res.json({
      success: true,
      config: updatedConfig,
      hasEncryptedPrivateKey: !!updatedConfig.encryptedPrivateKey
    });
  } catch (err: any) {
    console.error('[Save Config API Error]:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1.2 Check Server Environment Secrets Status
app.get('/api/sheets/env-status', (req, res) => {
  const resolved = resolveBackendConfig();
  res.json({
    hasEnvSpreadsheetId: !!process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
    hasEnvServiceAccountEmail: !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || resolved.serviceAccountEmail),
    hasEnvPrivateKey: !!(process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    hasEnvGemini: !!process.env.GEMINI_API_KEY,
    hasEnvTelegramBot: !!process.env.TELEGRAM_BOT_TOKEN,
    hasEnvCurrency: !!(process.env.DEFAULT_CURRENCY || process.env.EXPENSE_CURRENCY),
    envCurrency: SYSTEM_CURRENCY,
    envSpreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
    envServiceAccountEmail: resolved.serviceAccountEmail || '',
    envProjectId: resolved.projectId || '',
    envSheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || 'Expenses',
    envRange: process.env.GOOGLE_SHEETS_RANGE || 'A:O'
  });
});

// 2. Test Connection to Google Sheets API v4
app.post(['/api/sheets/test', '/api/sheets/test-connection'], async (req, res) => {
  try {
    const { config, privateKey } = req.body;
    const backendConfig = resolveBackendConfig({
      ...config,
      serviceAccountPrivateKey: privateKey || config?.serviceAccountPrivateKey
    });

    const testResult = await testGoogleSheetsConnection(backendConfig);
    res.json(testResult);
  } catch (err: any) {
    const formattedError = formatGoogleError(err, resolveBackendConfig(req.body?.config));
    res.json({ success: false, error: formattedError });
  }
});

// 3. Direct Google Sheets API v4 Sync (Append & Update)
app.post('/api/sheets/sync', async (req, res) => {
  try {
    const { config, expenses } = req.body;
    const backendConfig = resolveBackendConfig(config);
    const key = extractPrivateKey(backendConfig);

    if (!backendConfig.spreadsheetId) {
      return res.json({
        success: false,
        error: 'Spreadsheet ID is required. Please configure your Google Sheets settings.'
      });
    }

    if (!backendConfig.serviceAccountEmail || !key) {
      return res.json({
        success: false,
        error: 'Google Service Account credentials (email and private key) are not configured. Please complete Google Sheets API setup or add them in App Settings.'
      });
    }

    const syncResult = await syncExpensesToSheet(backendConfig, expenses || []);
    res.json(syncResult);
  } catch (err: any) {
    const formattedError = formatGoogleError(err, resolveBackendConfig(req.body?.config));
    res.json({ success: false, error: formattedError });
  }
});

// 4. Fetch Live Spreadsheet Data
app.post('/api/sheets/data', async (req, res) => {
  try {
    const { config, limit } = req.body;
    const backendConfig = resolveBackendConfig(config);

    const dataResult = await getSpreadsheetData(backendConfig, limit || 50);
    res.json(dataResult);
  } catch (err: any) {
    const formattedError = formatGoogleError(err, resolveBackendConfig(req.body?.config));
    res.json({ success: false, error: formattedError });
  }
});

// ------------------- VITE DEV & PRODUCTION SETUP -------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ExpenseGrid Swiss server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

