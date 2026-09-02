import crypto from 'crypto';

// Server-side encryption key derived from environment secret or a secure system fallback
const SERVER_SECRET = process.env.ENCRYPTION_SECRET || process.env.AI_STUDIO_APPLET_ID || 'helvetia-swiss-secure-sheets-encryption-key-2026';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const KEY = crypto.createHash('sha256').update(SERVER_SECRET).digest();

/**
 * Encrypts a plaintext string (such as a Service Account private key)
 * Output format: iv:authTag:ciphertext (all hex encoded)
 */
export function encryptSecret(plainText: string): string {
  if (!plainText || plainText.trim() === '') return '';
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (err: any) {
    console.error('[Crypto Encryption Error]:', err.message);
    throw new Error('Failed to securely encrypt sensitive credentials');
  }
}

/**
 * Decrypts a cipher text string
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText || cipherText.trim() === '') return '';
  // If it's not encrypted format (doesn't have 2 colons), return as-is if it's already a raw PEM key
  const parts = cipherText.split(':');
  if (parts.length !== 3) {
    return cipherText;
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err: any) {
    console.error('[Crypto Decryption Error]:', err.message);
    // If decryption fails, it might be raw text fallback
    return cipherText;
  }
}

/**
 * Masks a private key for safe UI display
 */
export function maskPrivateKey(key?: string): string {
  if (!key || key.trim() === '') return '';
  return '•••••••••••••••••••••••••••••••• [Protected & Encrypted in Firestore]';
}
