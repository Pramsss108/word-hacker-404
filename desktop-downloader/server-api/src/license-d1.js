// ============================================
// LICENSE VALIDATION API - Cloudflare Workers + D1
// Word Hacker 404 - Phase 2: License System
// ============================================

import { handleAdVerification, handleAdMobCallback, handleTokenValidation } from './ads.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Ad verification endpoints
      if (path === '/api/v1/ads/verify' && request.method === 'POST') {
        return handleAdVerification(request, env);
      }

      if (path === '/api/v1/ads/callback' && request.method === 'POST') {
        return handleAdMobCallback(request, env);
      }

      if (path === '/api/v1/download/authorize' && request.method === 'POST') {
        return handleTokenValidation(request, env);
      }
      // Validate License
      if (path === '/api/v1/license/validate' && request.method === 'POST') {
        const { hwid, license_key } = await request.json();
        const user = await env.DB.prepare('SELECT * FROM users WHERE hwid = ? AND license_key = ?')
          .bind(hwid, license_key).first();
        
        if (!user || !user.is_active) {
          return jsonResponse({ valid: false, message: 'Invalid license' }, corsHeaders);
        }

        return jsonResponse({ 
          valid: true, 
          tier: user.tier,
          expires_at: user.expires_at 
        }, corsHeaders);
      }

      // Register New User
      if (path === '/api/v1/license/register' && request.method === 'POST') {
        const { hwid, license_key = 'FREE', tier = 'FREE' } = await request.json();
        
        await env.DB.prepare('INSERT OR REPLACE INTO users (hwid, license_key, tier, created_at, is_active) VALUES (?, ?, ?, ?, 1)')
          .bind(hwid, license_key, tier, Date.now()).run();
        
        await env.DB.prepare('INSERT OR REPLACE INTO quota (hwid, downloads_today, last_reset, total_downloads) VALUES (?, 0, ?, 0)')
          .bind(hwid, Date.now()).run();

        return jsonResponse({ success: true, message: 'Registered successfully' }, corsHeaders);
      }

      // Check Quota
      if (path === '/api/v1/license/quota' && request.method === 'POST') {
        const { hwid } = await request.json();
        
        const user = await env.DB.prepare('SELECT tier FROM users WHERE hwid = ?').bind(hwid).first();
        const quota = await env.DB.prepare('SELECT * FROM quota WHERE hwid = ?').bind(hwid).first();
        
        if (!user || !quota) {
          return jsonResponse({ error: 'User not found' }, corsHeaders, 404);
        }

        // Reset if new day
        const now = Date.now();
        const lastReset = quota.last_reset;
        const dayInMs = 24 * 60 * 60 * 1000;
        let downloadsToday = quota.downloads_today;

        if (now - lastReset > dayInMs) {
          downloadsToday = 0;
          await env.DB.prepare('UPDATE quota SET downloads_today = 0, last_reset = ? WHERE hwid = ?')
            .bind(now, hwid).run();
        }

        const limits = { FREE: 3, PRO: -1, YEARLY: -1 };
        const limit = limits[user.tier] || 3;
        const remaining = limit === -1 ? -1 : Math.max(0, limit - downloadsToday);

        return jsonResponse({
          tier: user.tier,
          downloads_today: downloadsToday,
          limit: limit,
          remaining: remaining,
          can_download: limit === -1 || remaining > 0
        }, corsHeaders);
      }

      // Record Download
      if (path === '/api/v1/license/download' && request.method === 'POST') {
        const { hwid } = await request.json();
        
        await env.DB.prepare('UPDATE quota SET downloads_today = downloads_today + 1, total_downloads = total_downloads + 1 WHERE hwid = ?')
          .bind(hwid).run();

        return jsonResponse({ success: true }, corsHeaders);
      }

      // Health check
      if (path === '/' || path === '/health') {
        return jsonResponse({ 
          service: 'Word Hacker 404 License API',
          version: '2.0.0',
          status: 'operational',
          database: 'D1'
        }, corsHeaders);
      }

      return jsonResponse({ error: 'Not found' }, corsHeaders, 404);

    } catch (error) {
      return jsonResponse({ error: error.message }, corsHeaders, 500);
    }
  }
};

function jsonResponse(data, headers, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' }
  });
}
