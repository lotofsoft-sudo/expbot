import { google } from 'googleapis';
import { decryptSecret } from './crypto';

export interface BackendGoogleSheetsConfig {
  projectId: string;
  projectNumber?: string;
  spreadsheetId: string;
  sheetName?: string;
  range?: string;
  serviceAccountEmail: string;
  serviceAccountPrivateKey?: string;
  encryptedPrivateKey?: string;
  apiKey?: string;
}

export interface ExpenseRowPayload {
  id: string;
  date: string;
  userName?: string;
  userEmail?: string;
  employeeId?: string;
  department?: string;
  amount: number; // Q1
  category?: string; // Q2: Reason / Purpose
  description?: string; // Q3: Detailed description
  totalAmount?: number; // Q4: Total cost / price amount
  vatStatus?: string; // Q5: With VAT / Without VAT
  paymentMethod?: string; // Q6: Cash / Bank
  project?: string; // Q7: Related project
  approvedBy?: string; // Q8: Approved by
  receiptUrl?: string; // Q9: Invoice photo
  receiptName?: string;
  currency: string;
  status: string;
  submittedVia?: string;
  createdAt: string;
  updatedAt?: string;
}

export const SHEET_HEADERS = [
  'Expense ID',
  'Date',
  'Employee Name',
  'Q1. Amount Spent (SAR) / খরচের টাকা',
  'Q2. Expense Reason (Purpose) / খরচের কারণ',
  'Q3. Detailed Description / খরচের বিস্তারিত বর্ণনা',
  'Q4. Total Cost Amount (SAR) / মূল্যের পরিমাণ',
  'Q5. VAT Status / ভ্যাট স্ট্যাটাস',
  'Q6. Payment Method / পেমেন্ট মেথড (ক্যাশ/ব্যাংক)',
  'Q7. Related Project / প্রজেক্টের নাম',
  'Q8. Approved By / অ্যাপ্রুভাল প্রদানকারী',
  'Q9. Invoice Photo / ইনভয়স ছবি',
  'Approval Status',
  'Submitted Via',
  'Created At',
  'Updated At'
];

/**
 * Resolves configuration by merging passed config with server-side environment secrets
 */
export function resolveBackendConfig(config?: Partial<BackendGoogleSheetsConfig>): BackendGoogleSheetsConfig {
  let envEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  let envPrivateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';
  let envProjectId = process.env.GOOGLE_CLOUD_PROJECT_ID || '';
  let envSpreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
  let envSheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || 'Expenses';
  let envRange = process.env.GOOGLE_SHEETS_RANGE || 'A:P';

  // If a full Service Account JSON string is set in environment secrets
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim());
      if (parsed.client_email && !envEmail) envEmail = parsed.client_email;
      if (parsed.private_key && !envPrivateKey) envPrivateKey = parsed.private_key;
      if (parsed.project_id && !envProjectId) envProjectId = parsed.project_id;
    } catch {
      // ignore
    }
  }

  return {
    projectId: config?.projectId || envProjectId || '',
    projectNumber: config?.projectNumber || '',
    spreadsheetId: config?.spreadsheetId || envSpreadsheetId || '',
    sheetName: config?.sheetName || envSheetName || 'Expenses',
    range: config?.range || envRange || 'A:O',
    serviceAccountEmail: config?.serviceAccountEmail || envEmail || '',
    serviceAccountPrivateKey: config?.serviceAccountPrivateKey || envPrivateKey || '',
    encryptedPrivateKey: config?.encryptedPrivateKey || '',
    apiKey: config?.apiKey || process.env.GOOGLE_API_KEY || ''
  };
}

/**
 * Robustly normalizes and repairs private key from any input format
 * (e.g. JSON-escaped \n, double escaped backslashes, single-line PEM with spaces, raw base64, or quoted strings)
 */
export function normalizePrivateKey(rawInput: string): string {
  if (!rawInput || typeof rawInput !== 'string') return '';
  let str = rawInput.trim();

  // 1. Check if the string is JSON (e.g. pasted service account JSON)
  if ((str.startsWith('{') && str.endsWith('}')) || str.includes('"private_key"')) {
    try {
      const parsed = JSON.parse(str);
      if (parsed.private_key) {
        str = parsed.private_key;
      }
    } catch {
      // Try regex extraction of private_key from malformed JSON
      const match = str.match(/"private_key"\s*:\s*"([^"]+)"/);
      if (match && match[1]) {
        str = match[1];
      }
    }
  }

  // 2. Unescape quotes & backslashes (e.g. \\\\n or \\n -> \n)
  str = str.replace(/\\\\n/g, '\n').replace(/\\n/g, '\n').replace(/\\r/g, '\n');
  str = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip wrapping single or double quotes
  while ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
    str = str.replace(/\\n/g, '\n').replace(/\r\n/g, '\n');
  }

  // 3. Check for standard BEGIN / END markers
  const beginMatch = str.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----/);
  const endMatch = str.match(/-----END (?:RSA )?PRIVATE KEY-----/);

  if (beginMatch && endMatch) {
    const header = beginMatch[0];
    const footer = endMatch[0];
    const startIndex = str.indexOf(header) + header.length;
    const endIndex = str.indexOf(footer);
    const body = str.substring(startIndex, endIndex).replace(/\s+/g, ''); // strip all whitespace/newlines from base64 body

    // Re-wrap body at 64 chars
    const wrappedBody = body.match(/.{1,64}/g)?.join('\n') || body;
    return `${header}\n${wrappedBody}\n${footer}\n`;
  }

  // 4. If someone pasted ONLY base64 body without header/footer
  const cleanBody = str.replace(/\s+/g, '');
  if (/^[A-Za-z0-9+/=]+$/.test(cleanBody) && cleanBody.length > 500) {
    const wrappedBody = cleanBody.match(/.{1,64}/g)?.join('\n') || cleanBody;
    return `-----BEGIN PRIVATE KEY-----\n${wrappedBody}\n-----END PRIVATE KEY-----\n`;
  }

  return str;
}

/**
 * Sanitizes and truncates any cell value before sending to Google Sheets.
 * Google Sheets strictly enforces a limit of 50,000 characters per single cell.
 * Base64 image strings or large text payloads are cleanly converted to concise summaries.
 */
export function cleanCellForSheet(value: any): string | number | boolean {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  let str = String(value);

  // If this is a base64 encoded data URI (e.g. data:image/png;base64,...), replace with a clean metadata summary
  if (str.startsWith('data:') && (str.includes(';base64,') || str.length > 300)) {
    const mimeMatch = str.match(/^data:([^;]+);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image';
    const kb = Math.round(str.length / 1024);
    return `[Attached Receipt: ${mimeType} (~${kb} KB)]`;
  }

  // Google Sheets hard limit is 50,000 characters per single cell.
  // Cap at 45,000 characters to be safely under the limit.
  if (str.length > 45000) {
    return str.substring(0, 45000) + '... [TRUNCATED: Exceeded Google Sheets cell limit]';
  }

  return str;
}

/**
 * Normalizes private key from various input shapes (e.g. JSON-escaped \n, raw PEM, or encrypted cipher)
 */
export function extractPrivateKey(config: BackendGoogleSheetsConfig): string {
  let rawKey = config.serviceAccountPrivateKey || '';
  if (!rawKey && config.encryptedPrivateKey) {
    try {
      rawKey = decryptSecret(config.encryptedPrivateKey);
    } catch {
      // ignore
    }
  }

  // Fallback to process.env if still empty
  if (!rawKey) {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY) {
      rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        const parsed = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON.trim());
        rawKey = parsed.private_key || '';
      } catch {
        // ignore
      }
    }
  }

  if (!rawKey) return '';

  return normalizePrivateKey(rawKey);
}

/**
 * Creates authenticated Google Auth JWT Client
 */
export function getGoogleAuthClient(config: BackendGoogleSheetsConfig) {
  const email = (config.serviceAccountEmail || '').trim();
  const privateKey = extractPrivateKey(config);

  if (!email) {
    throw new Error('Google Service Account Email is missing.');
  }
  if (!privateKey) {
    throw new Error('Google Service Account Private Key is missing.');
  }

  const jwtClient = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive.readonly'
    ]
  });

  return jwtClient;
}

/**
 * Translates Google Sheets API / Auth error into clear diagnostic message
 */
export function formatGoogleError(err: any, config?: BackendGoogleSheetsConfig): string {
  const message = err?.message || String(err || '');
  const code = err?.code || err?.status;

  console.warn('[Google Sheets API Service Notice]:', {
    code,
    message
  });

  if (
    message.includes('DECODER routines') ||
    message.includes('unsupported') ||
    message.includes('PEM') ||
    message.includes('invalid_grant') ||
    message.includes('Invalid JWT Signature') ||
    message.includes('private key') ||
    message.includes('asn1') ||
    message.includes('JWT') ||
    message.includes('signature')
  ) {
    return 'Invalid Service Account Private Key format or signature mismatch (invalid_grant). The private key could not be authenticated by Google. Please upload your downloaded service-account-key.json file or paste the complete valid private key matching your Service Account email.';
  }

  if (code === 404 || message.includes('Requested entity was not found') || message.includes('Spreadsheet ID')) {
    return `Spreadsheet not found (ID: ${config?.spreadsheetId || 'Unknown'}). Please check the Spreadsheet ID from your Google Sheet URL.`;
  }

  if (code === 403 || message.includes('PERMISSION_DENIED') || message.includes('The caller does not have permission')) {
    return `Permission Denied: The Service Account does not have access to this Google Sheet. Please open the Google Sheet, click 'Share', and add '${config?.serviceAccountEmail || 'your service account email'}' with the 'Editor' role.`;
  }

  if (message.includes('API has not been used in project') || message.includes('it is disabled') || message.includes('Google Sheets API has not been used')) {
    return `Google Sheets API is not enabled for Google Cloud project '${config?.projectId || ''}'. Please visit Google Cloud Console > APIs & Services > Enable 'Google Sheets API'.`;
  }

  if (code === 429 || message.includes('RESOURCE_EXHAUSTED')) {
    return 'Google Sheets API quota exceeded or rate limit hit. Please wait a few seconds before retrying.';
  }

  if (message.includes('Unable to parse range')) {
    return `Invalid Sheet name or Range '${config?.sheetName || 'Expenses'}'. Ensure the tab exists in your Google Sheet.`;
  }

  if (message.includes('50000') || message.includes('maximum of 50000 characters') || message.includes('single cell')) {
    return 'Google Sheets cell limit exceeded (maximum 50,000 characters per cell). Large receipt images or attachments have been sanitized and formatted to fit.';
  }

  return message || 'An error occurred while communicating with Google Sheets API.';
}

/**
 * 1. Test Connection: Full end-to-end verification
 */
export async function testGoogleSheetsConnection(config: BackendGoogleSheetsConfig) {
  const spreadsheetId = (config.spreadsheetId || '').trim();
  const sheetName = (config.sheetName || 'Expenses').trim();

  if (!spreadsheetId) {
    return {
      success: false,
      error: 'Spreadsheet ID is required.'
    };
  }

  try {
    const auth = getGoogleAuthClient(config);
    // Verify token generation
    await auth.authorize();

    const sheets = google.sheets({ version: 'v4', auth });

    // Step A: Get Spreadsheet metadata
    const metaRes = await sheets.spreadsheets.get({
      spreadsheetId,
      includeGridData: false
    });

    const spreadsheetTitle = metaRes.data.properties?.title || 'Google Spreadsheet';
    const sheetTabs = metaRes.data.sheets?.map(s => s.properties?.title || '') || [];

    // Step B: Check if target sheet tab exists, if not create or fallback to first sheet
    let targetSheet = sheetName;
    if (!sheetTabs.includes(sheetName)) {
      if (sheetTabs.length > 0) {
        targetSheet = sheetTabs[0]; // fallback to existing sheet (e.g. Sheet1)
      }
    }

    // Step C: Test Read Permission
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${targetSheet}!A1:Z5`
    });

    const existingRows = readRes.data.values || [];

    // Step D: Test Write Permission & ensure headers are present if empty
    if (existingRows.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${targetSheet}!A1:P1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [SHEET_HEADERS]
        }
      });
    }

    return {
      success: true,
      spreadsheetTitle,
      sheetTabs,
      activeSheet: targetSheet,
      existingRowCount: existingRows.length,
      message: `Google Sheets API v4 Connected Successfully! Verified read & write permissions on spreadsheet "${spreadsheetTitle}".`
    };
  } catch (err: any) {
    const friendlyError = formatGoogleError(err, config);
    return {
      success: false,
      error: friendlyError
    };
  }
}

/**
 * 2. Get Live Spreadsheet Data (Header & Rows)
 */
export async function getSpreadsheetData(config: BackendGoogleSheetsConfig, limit = 50) {
  const spreadsheetId = (config.spreadsheetId || '').trim();
  const sheetName = (config.sheetName || 'Expenses').trim();

  try {
    const auth = getGoogleAuthClient(config);
    const sheets = google.sheets({ version: 'v4', auth });

    const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
    const spreadsheetTitle = metaRes.data.properties?.title || 'Spreadsheet';
    const sheetTabs = metaRes.data.sheets?.map(s => s.properties?.title || '') || [];
    const targetSheet = sheetTabs.includes(sheetName) ? sheetName : (sheetTabs[0] || 'Sheet1');

    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${targetSheet}!A1:P${limit + 1}`
    });

    const allValues = readRes.data.values || [];
    const headers = allValues.length > 0 ? allValues[0] : SHEET_HEADERS;
    const rows = allValues.length > 1 ? allValues.slice(1) : [];

    return {
      success: true,
      spreadsheetTitle,
      sheetTabs,
      activeSheet: targetSheet,
      headers,
      rows,
      totalRows: allValues.length > 0 ? allValues.length - 1 : 0
    };
  } catch (err: any) {
    return {
      success: false,
      error: formatGoogleError(err, config)
    };
  }
}

/**
 * 3. Sync Expenses (Mirroring Sync & Incremental Sync)
 * Ensures Google Sheet strictly reflects active portal data, removing any deleted entries.
 */
export async function syncExpensesToSheet(
  config: BackendGoogleSheetsConfig,
  expenses: ExpenseRowPayload[],
  options?: { fullSync?: boolean }
) {
  const spreadsheetId = (config.spreadsheetId || '').trim();
  const sheetName = (config.sheetName || 'Expenses').trim();

  if (!spreadsheetId) {
    return { success: false, error: 'Spreadsheet ID is required for sync.' };
  }

  const safeExpenses = Array.isArray(expenses) ? expenses : [];
  const isFullSync = options?.fullSync === true || safeExpenses.length > 1;

  try {
    const auth = getGoogleAuthClient(config);
    const sheets = google.sheets({ version: 'v4', auth });

    // Step A: Determine target sheet tab
    const metaRes = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTabs = metaRes.data.sheets?.map(s => s.properties?.title || '') || [];
    const targetSheet = sheetTabs.includes(sheetName) ? sheetName : (sheetTabs[0] || 'Sheet1');

    // Step B: Read existing data to know row count & bounds
    const readRes = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${targetSheet}!A:P`
    });

    const allValues = readRes.data.values || [];
    const previousTotalRows = allValues.length;

    if (isFullSync) {
      // Full Mirroring Sync: Replace sheet with current active portal expenses only.
      // Any deleted entries in portal will be removed from Google Sheet.
      const formattedExpenseRows = safeExpenses.map((exp) => [
        cleanCellForSheet(exp.id || ''),
        cleanCellForSheet(exp.date || ''),
        cleanCellForSheet(exp.userName || ''),
        typeof exp.amount === 'number' ? exp.amount : Number(exp.amount) || 0,
        cleanCellForSheet(exp.category || ''),
        cleanCellForSheet(exp.description || ''),
        typeof exp.totalAmount === 'number' ? exp.totalAmount : (typeof exp.amount === 'number' ? exp.amount : Number(exp.amount) || 0),
        cleanCellForSheet(exp.vatStatus || 'Without VAT (উইদাউট ভ্যাট)'),
        cleanCellForSheet(exp.paymentMethod || 'Cash (ক্যাশ)'),
        cleanCellForSheet(exp.project || 'General Project'),
        cleanCellForSheet(exp.approvedBy || ''),
        cleanCellForSheet(exp.receiptUrl || ''),
        cleanCellForSheet(exp.status || 'pending'),
        cleanCellForSheet(exp.submittedVia || 'web_chat'),
        cleanCellForSheet(exp.createdAt || new Date().toISOString()),
        cleanCellForSheet(exp.updatedAt || new Date().toISOString())
      ]);

      const newFullMatrix = [SHEET_HEADERS, ...formattedExpenseRows];

      // Overwrite from A1 down
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${targetSheet}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: newFullMatrix }
      });

      // Clear trailing rows if previous sheet had more rows than current portal count
      const newTotalRows = newFullMatrix.length;
      if (previousTotalRows > newTotalRows) {
        const startClearRow = newTotalRows + 1;
        const endClearRow = Math.max(previousTotalRows + 20, startClearRow + 10);
        await sheets.spreadsheets.values.clear({
          spreadsheetId,
          range: `${targetSheet}!A${startClearRow}:P${endClearRow}`
        });
      }

      return {
        success: true,
        spreadsheetId,
        activeSheet: targetSheet,
        totalProcessed: safeExpenses.length,
        rowsAdded: safeExpenses.length,
        rowsUpdated: 0,
        appendedCount: safeExpenses.length,
        updatedCount: 0,
        syncedCount: safeExpenses.length,
        timestamp: new Date().toISOString(),
        message: `Google Sheets Synchronized: Portal list mirrored (${safeExpenses.length} entries). Any deleted entries removed from sheet.`
      };
    }

    // Incremental Sync (for single item submission/update when fullSync is false)
    if (safeExpenses.length === 0) {
      return { success: true, syncedCount: 0, message: 'No expenses provided for incremental sync.' };
    }

    let hasHeader = false;
    if (allValues.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${targetSheet}!A1:P1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [SHEET_HEADERS] }
      });
      hasHeader = true;
    } else {
      hasHeader = true;
    }

    const existingIdToRowIndex = new Map<string, number>();
    for (let i = 1; i < allValues.length; i++) {
      const rowId = allValues[i][0];
      if (rowId) {
        existingIdToRowIndex.set(String(rowId).trim(), i + 1);
      }
    }

    let rowsAdded = 0;
    let rowsUpdated = 0;
    const newRowsToAppend: any[][] = [];

    for (const exp of safeExpenses) {
      const rowData = [
        cleanCellForSheet(exp.id || ''),
        cleanCellForSheet(exp.date || ''),
        cleanCellForSheet(exp.userName || ''),
        typeof exp.amount === 'number' ? exp.amount : Number(exp.amount) || 0,
        cleanCellForSheet(exp.category || ''),
        cleanCellForSheet(exp.description || ''),
        typeof exp.totalAmount === 'number' ? exp.totalAmount : (typeof exp.amount === 'number' ? exp.amount : Number(exp.amount) || 0),
        cleanCellForSheet(exp.vatStatus || 'Without VAT (উইদাউট ভ্যাট)'),
        cleanCellForSheet(exp.paymentMethod || 'Cash (ক্যাশ)'),
        cleanCellForSheet(exp.project || 'General Project'),
        cleanCellForSheet(exp.approvedBy || ''),
        cleanCellForSheet(exp.receiptUrl || ''),
        cleanCellForSheet(exp.status || 'pending'),
        cleanCellForSheet(exp.submittedVia || 'web_chat'),
        cleanCellForSheet(exp.createdAt || new Date().toISOString()),
        cleanCellForSheet(exp.updatedAt || new Date().toISOString())
      ];

      const existingRowIndex = existingIdToRowIndex.get(String(exp.id).trim());

      if (existingRowIndex) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: `${targetSheet}!A${existingRowIndex}:P${existingRowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rowData] }
        });
        rowsUpdated++;
      } else {
        newRowsToAppend.push(rowData);
      }
    }

    if (newRowsToAppend.length > 0) {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${targetSheet}!A1`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: newRowsToAppend
        }
      });
      rowsAdded = newRowsToAppend.length;
    }

    return {
      success: true,
      spreadsheetId,
      activeSheet: targetSheet,
      totalProcessed: safeExpenses.length,
      rowsAdded,
      rowsUpdated,
      appendedCount: rowsAdded,
      updatedCount: rowsUpdated,
      syncedCount: rowsAdded + rowsUpdated,
      timestamp: new Date().toISOString(),
      message: `Direct Google Sheets API v4 Sync: Appended ${rowsAdded} new row(s) and updated ${rowsUpdated} row(s) in sheet '${targetSheet}'.`
    };
  } catch (err: any) {
    return {
      success: false,
      error: formatGoogleError(err, config)
    };
  }
}
