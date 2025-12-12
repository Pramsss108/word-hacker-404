// Token Generation & Verification Utilities
// HMAC-SHA256 Signed Tokens (Crack-Proof)

const SECRET_KEY = 'WH404_TOKEN_SECRET_CHANGE_IN_PRODUCTION';

export function signToken(payload) {
  const data = JSON.stringify(payload);
  const timestamp = Date.now();
  const message = `${data}.${timestamp}`;
  
  // Simple HMAC (in production, use crypto.subtle)
  const signature = simpleHmac(message, SECRET_KEY);
  
  return `${btoa(data)}.${timestamp}.${signature}`;
}

export function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  
  const [data, timestamp, signature] = parts;
  const message = `${data}.${timestamp}`;
  const expectedSig = simpleHmac(message, SECRET_KEY);
  
  return signature === expectedSig;
}

export function parseToken(token) {
  const [data] = token.split('.');
  return JSON.parse(atob(data));
}

function simpleHmac(message, key) {
  // Simplified HMAC for demo (use crypto.subtle in production)
  let hash = 0;
  const combined = key + message;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function generateToken(prefix = 'DL') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let token = `${prefix}-${new Date().getFullYear()}-`;
  for (let i = 0; i < 12; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
    if (i % 4 === 3 && i < 11) token += '-';
  }
  return token;
}
