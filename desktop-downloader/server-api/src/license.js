// ============================================
// LICENSE VALIDATION API - Cloudflare Workers
// Word Hacker 404 - Premium Monetization System
// ============================================

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route: Validate License Key
    if (path === '/api/v1/license/validate' && request.method === 'POST') {
      return handleValidateLicense(request, env, corsHeaders);
    }

    // Route: Register New License
    if (path === '/api/v1/license/register' && request.method === 'POST') {
      return handleRegisterLicense(request, env, corsHeaders);
    }

    // Route: Check Usage Quota
    if (path === '/api/v1/license/quota' && request.method === 'POST') {
      return handleCheckQuota(request, env, corsHeaders);
    }

    // Route: Record Download (Decrement Quota)
    if (path === '/api/v1/license/download' && request.method === 'POST') {
      return handleRecordDownload(request, env, corsHeaders);
    }

    return new Response('Word Hacker 404 License API v1.0', {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
    });
  }
};

// ============================================
// VALIDATE LICENSE KEY
// ============================================
async function handleValidateLicense(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { license_key, hwid } = body;

    if (!license_key || !hwid) {
      return jsonResponse({ error: 'Missing license_key or hwid' }, 400, corsHeaders);
    }

    // Fetch license from KV storage
    const licenseData = await env.LICENSES.get(license_key, { type: 'json' });

    if (!licenseData) {
      return jsonResponse({
        valid: false,
        error: 'Invalid license key',
        tier: 'free'
      }, 200, corsHeaders);
    }

    // Check if license is expired
    const now = Date.now();
    if (licenseData.expires_at && now > licenseData.expires_at) {
      return jsonResponse({
        valid: false,
        error: 'License expired',
        tier: 'free',
        expired_at: new Date(licenseData.expires_at).toISOString()
      }, 200, corsHeaders);
    }

    // Check HWID binding (prevent license sharing)
    if (licenseData.hwid && licenseData.hwid !== hwid) {
      return jsonResponse({
        valid: false,
        error: 'License bound to different device',
        tier: 'free'
      }, 200, corsHeaders);
    }

    // Bind HWID if not already bound
    if (!licenseData.hwid) {
      licenseData.hwid = hwid;
      await env.LICENSES.put(license_key, JSON.stringify(licenseData));
    }

    // License is valid
    return jsonResponse({
      valid: true,
      tier: licenseData.tier, // 'free', 'pro', 'ultra'
      quota_remaining: licenseData.quota_remaining,
      quota_resets_at: licenseData.quota_resets_at,
      features: getTierFeatures(licenseData.tier)
    }, 200, corsHeaders);

  } catch (error) {
    return jsonResponse({
      error: 'Server error: ' + error.message,
      valid: false,
      tier: 'free'
    }, 500, corsHeaders);
  }
}

// ============================================
// REGISTER NEW LICENSE (Stripe webhook)
// ============================================
async function handleRegisterLicense(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { license_key, tier, email, payment_id } = body;

    // Verify admin secret (only Stripe webhook can call this)
    const adminSecret = request.headers.get('X-Admin-Secret');
    if (adminSecret !== env.ADMIN_SECRET) {
      return jsonResponse({ error: 'Unauthorized' }, 401, corsHeaders);
    }

    const now = Date.now();
    const expiresAt = now + (30 * 24 * 60 * 60 * 1000); // 30 days

    const licenseData = {
      license_key,
      tier, // 'pro' or 'ultra'
      email,
      payment_id,
      created_at: now,
      expires_at: expiresAt,
      hwid: null, // Will be bound on first use
      quota_remaining: tier === 'free' ? 5 : -1, // -1 = unlimited
      quota_resets_at: now + (24 * 60 * 60 * 1000), // Reset daily for free tier
    };

    await env.LICENSES.put(license_key, JSON.stringify(licenseData));

    return jsonResponse({
      success: true,
      license_key,
      tier,
      expires_at: new Date(expiresAt).toISOString()
    }, 200, corsHeaders);

  } catch (error) {
    return jsonResponse({ error: 'Server error: ' + error.message }, 500, corsHeaders);
  }
}

// ============================================
// CHECK USAGE QUOTA
// ============================================
async function handleCheckQuota(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { license_key } = body;

    if (!license_key) {
      return jsonResponse({
        quota_remaining: 5, // Free tier default
        quota_resets_at: Date.now() + (24 * 60 * 60 * 1000),
        tier: 'free'
      }, 200, corsHeaders);
    }

    const licenseData = await env.LICENSES.get(license_key, { type: 'json' });

    if (!licenseData) {
      return jsonResponse({
        quota_remaining: 5,
        quota_resets_at: Date.now() + (24 * 60 * 60 * 1000),
        tier: 'free'
      }, 200, corsHeaders);
    }

    // Reset daily quota if needed (for free tier)
    const now = Date.now();
    if (licenseData.tier === 'free' && now > licenseData.quota_resets_at) {
      licenseData.quota_remaining = 5;
      licenseData.quota_resets_at = now + (24 * 60 * 60 * 1000);
      await env.LICENSES.put(license_key, JSON.stringify(licenseData));
    }

    return jsonResponse({
      quota_remaining: licenseData.quota_remaining,
      quota_resets_at: licenseData.quota_resets_at,
      tier: licenseData.tier
    }, 200, corsHeaders);

  } catch (error) {
    return jsonResponse({ error: 'Server error: ' + error.message }, 500, corsHeaders);
  }
}

// ============================================
// RECORD DOWNLOAD (Decrement Quota)
// ============================================
async function handleRecordDownload(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const { license_key, url, platform } = body;

    // Free users: decrement quota
    if (!license_key || license_key === 'FREE') {
      return jsonResponse({
        success: true,
        quota_remaining: 4, // Mock response
        tier: 'free'
      }, 200, corsHeaders);
    }

    const licenseData = await env.LICENSES.get(license_key, { type: 'json' });

    if (!licenseData) {
      return jsonResponse({ error: 'Invalid license key' }, 400, corsHeaders);
    }

    // Pro/Ultra users: unlimited downloads
    if (licenseData.tier === 'pro' || licenseData.tier === 'ultra') {
      // Record analytics (optional)
      await recordAnalytics(env, license_key, url, platform);

      return jsonResponse({
        success: true,
        quota_remaining: -1, // Unlimited
        tier: licenseData.tier
      }, 200, corsHeaders);
    }

    // Free tier: decrement quota
    if (licenseData.quota_remaining > 0) {
      licenseData.quota_remaining -= 1;
      await env.LICENSES.put(license_key, JSON.stringify(licenseData));

      return jsonResponse({
        success: true,
        quota_remaining: licenseData.quota_remaining,
        tier: 'free'
      }, 200, corsHeaders);
    } else {
      return jsonResponse({
        success: false,
        error: 'Daily quota exceeded. Upgrade to Pro for unlimited downloads.',
        quota_remaining: 0,
        tier: 'free'
      }, 403, corsHeaders);
    }

  } catch (error) {
    return jsonResponse({ error: 'Server error: ' + error.message }, 500, corsHeaders);
  }
}

// ============================================
// HELPER: Get Tier Features
// ============================================
function getTierFeatures(tier) {
  const features = {
    free: {
      downloads_per_day: 5,
      max_quality: '720p',
      methods: ['yt-dlp'],
      priority_support: false,
      batch_download: false,
    },
    pro: {
      downloads_per_day: -1, // Unlimited
      max_quality: '1080p',
      methods: ['yt-dlp', 'oembed', 'cloudflare'],
      priority_support: true,
      batch_download: false,
    },
    ultra: {
      downloads_per_day: -1, // Unlimited
      max_quality: '4K',
      methods: ['yt-dlp', 'oembed', 'cloudflare', 'premium-proxy'],
      priority_support: true,
      batch_download: true,
    }
  };

  return features[tier] || features.free;
}

// ============================================
// HELPER: Record Analytics
// ============================================
async function recordAnalytics(env, license_key, url, platform) {
  try {
    const analyticsKey = `analytics:${license_key}:${Date.now()}`;
    await env.ANALYTICS.put(analyticsKey, JSON.stringify({
      license_key,
      url,
      platform,
      timestamp: Date.now()
    }), { expirationTtl: 2592000 }); // 30 days
  } catch (e) {
    console.error('Analytics error:', e);
  }
}

// ============================================
// HELPER: JSON Response
// ============================================
function jsonResponse(data, status, corsHeaders) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  });
}
