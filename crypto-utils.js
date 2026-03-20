const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

function getEncryptionKey() {
    const hex = process.env.TOKEN_ENCRYPTION_KEY;
    if (!hex || hex.length !== 64) {
        throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-char hex string (32 bytes)');
    }
    return Buffer.from(hex, 'hex');
}

function getStateSecret() {
    const hex = process.env.STATE_SECRET;
    if (!hex || hex.length < 32) {
        throw new Error('STATE_SECRET must be at least a 32-char hex string');
    }
    return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    // Format: iv:authTag:ciphertext (all hex)
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
    const key = getEncryptionKey();
    const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final('utf8');
}

function createState(discordUserId) {
    const secret = getStateSecret();
    const timestamp = Date.now().toString();
    const payload = `${discordUserId}.${timestamp}`;
    const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    // Format: payload.hmac (base64url-encoded for URL safety)
    const state = Buffer.from(`${payload}.${hmac}`).toString('base64url');
    return state;
}

function verifyState(state) {
    const secret = getStateSecret();
    const decoded = Buffer.from(state, 'base64url').toString('utf8');
    const parts = decoded.split('.');
    if (parts.length !== 3) {
        return null;
    }
    const [discordUserId, timestamp, hmac] = parts;
    const payload = `${discordUserId}.${timestamp}`;
    const expectedHmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHmac, 'hex'))) {
        return null;
    }

    const age = Date.now() - parseInt(timestamp, 10);
    if (age > STATE_MAX_AGE_MS) {
        return null;
    }

    return discordUserId;
}

function generateCodeVerifier() {
    return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
}

module.exports = { encrypt, decrypt, createState, verifyState, generateCodeVerifier, generateCodeChallenge };
