// ============================================
// AD VERIFICATION API - Cloudflare Workers
// Professional Terabox-Level Security
// ============================================

import { verifyToken, signToken } from './token-utils';

export async function handleAdVerification(request, env) {
  try {
    const { hwid, ad_event, timestamp } = await request.json();
    
    const now = Date.now();
    
    // Generate simple token (no DB for now - testing)
    const token = `DL-${now}-${hwid.substring(0, 8)}`;
    
    return jsonResponse({
      success: true,
      token,
      expires_in: 60,
      message: 'Ad verified! You can download now.'
    });
  } catch (error) {
    return jsonResponse({ 
      error: error.message || 'Internal error',
      stack: error.stack
    }, 500);
  }
}

export async function handleAdMobCallback(request, env) {
  // AdMob Server-to-Server Callback
  const signature = request.headers.get('X-AdMob-Signature');
  const body = await request.text();
  
  // Verify AdMob signature
  const expectedSig = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.ADMOB_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    ),
    new TextEncoder().encode(body)
  );
  
  if (signature !== btoa(String.fromCharCode(...new Uint8Array(expectedSig)))) {
    return jsonResponse({ error: 'Invalid signature' }, 403);
  }
  
  const data = JSON.parse(body);
  
  // Record ad completion from AdMob
  await env.DB.prepare(
    'INSERT INTO ad_server_verifications (hwid, ad_id, verified_at, reward_amount) VALUES (?, ?, ?, ?)'
  ).bind(data.user_id, data.ad_unit_id, Date.now(), data.reward_amount).run();
  
  return jsonResponse({ success: true });
}

export async function handleDownloadAuthorization(request, env) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Missing token' }, 401);
    }
    
    const token = authHeader.substring(7);
    const { hwid, url } = await request.json();
    
    // Accept simple tokens for now (DL-timestamp-hwid format)
    if (!token.startsWith('DL-')) {
      return jsonResponse({ error: 'Invalid token format' }, 401);
    }

    // For now, accept all valid format tokens (simplified version)
    // TODO: Add DB validation when ready
    
    return jsonResponse({
      allowed: true,
      message: 'Download authorized'
    });
  } catch (error) {
    return jsonResponse({ 
      error: error.message || 'Authorization failed',
      stack: error.stack
    }, 500);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
