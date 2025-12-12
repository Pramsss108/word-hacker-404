/**
 * 🛡️ WH404 "God Mode" Worker
 * 
 * This runs on Cloudflare's Edge Network (Free Tier).
 * It acts as the "Brain" of the application.
 * 
 * Features:
 * 1. License Validation (Mocked for now)
 * 2. Video Resolution (Hides yt-dlp logic)
 * 3. Security Checks (Geo-block, Rate Limit)
 */

export default {
  async fetch(request, env, ctx) {
    // 1. CORS Headers (Allow Desktop App)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-License-Key',
    };

    // Handle Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // 2. Route: Activate License
      if (path === '/api/v1/license/activate') {
        return await handleActivation(request, corsHeaders);
      }

      // 3. Route: Resolve Video (The "Secret Sauce")
      if (path === '/api/v1/video/resolve') {
        return await handleResolution(request, corsHeaders);
      }
      
      // 4. Route: Ad Verification (Monetization)
      if (path === '/api/v1/ads/verify') {
        const { handleAdVerification } = await import('./ads.js');
        return await handleAdVerification(request, env);
      }
      
      // 5. Route: Download Authorization (Server-side validation)
      if (path === '/api/v1/download/authorize') {
        const { handleDownloadAuthorization } = await import('./ads.js');
        return await handleDownloadAuthorization(request, env);
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }
  },
};

/**
 * 🔑 Handle License Activation
 * Validates the key against Supabase (Mocked for prototype)
 */
async function handleActivation(request, headers) {
  const body = await request.json();
  const { license_key, hwid } = body;

  if (!license_key || !hwid) {
    throw new Error('Missing license_key or hwid');
  }

  // TODO: Connect to Supabase here
  // const { data, error } = await supabase.from('licenses').select('*').eq('key', license_key);

  // Mock Logic: Keys starting with "WH404-" are valid
  const isValid = license_key.startsWith('WH404-');
  const isPro = license_key.includes('PRO');

  if (!isValid) {
    return new Response(JSON.stringify({ 
      valid: false, 
      message: 'Invalid License Key' 
    }), { headers: { ...headers, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    valid: true,
    tier: isPro ? 'pro' : 'free',
    token: 'signed-jwt-token-placeholder', // This would be a real JWT
    message: 'Activation Successful'
  }), { headers: { ...headers, 'Content-Type': 'application/json' } });
}

/**
 * 🎥 Handle Video Resolution
 * This is where we hide the logic. The client sends a URL, we return the direct link.
 * Note: On Cloudflare Workers, we can't run yt-dlp binary directly.
 * We use this to validate the request and then sign a token for the client to use,
 * OR we call an external API that runs yt-dlp.
 * 
 * For the "Zero Cost" strategy, we use this to GATE the features.
 */
async function handleResolution(request, headers) {
  const body = await request.json();
  const { url, license_key } = body;

  // 1. Validate License again (Stateless)
  if (!license_key || !license_key.startsWith('WH404-')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers });
  }

  // 2. Check Feature Access
  const isPro = license_key.includes('PRO');
  const isPlaylist = url.includes('list=');
  const is4K = body.quality === '2160p';

  // 🔒 The Upsell Logic
  if (isPlaylist && !isPro) {
    return new Response(JSON.stringify({ 
      error: 'UPGRADE_REQUIRED', 
      message: 'Playlist downloading is a Pro feature.' 
    }), { status: 403, headers });
  }

  if (is4K && !isPro) {
    return new Response(JSON.stringify({ 
      error: 'UPGRADE_REQUIRED', 
      message: '4K downloading is a Pro feature.' 
    }), { status: 403, headers });
  }

  // 3. Return Success (Client is allowed to proceed)
  // In a full "God Mode", we would return the direct video URL here.
  // For "Zero Cost", we return a signed approval that the Desktop App checks.
  return new Response(JSON.stringify({
    allowed: true,
    quality: is4K ? '2160p' : '1080p',
    engine_params: {
      // We can inject dynamic args here to control the client's yt-dlp
      concurrent_fragments: isPro ? 16 : 4, // Pro gets faster speeds
      buffer_size: isPro ? '64K' : '16K'
    }
  }), { headers: { ...headers, 'Content-Type': 'application/json' } });
}
