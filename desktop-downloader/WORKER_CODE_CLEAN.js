// ============================================
// COPY EVERYTHING FROM LINE 8 TO LINE 176
// (Select all this code and Ctrl+C)
// ============================================

// Universal Downloader Proxy - By Word Hacker 404
// Works with ALL platforms: Instagram, YouTube, Facebook, TikTok, Twitter, Reddit, etc.

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');
    
    if (request.method === 'OPTIONS') {
      return handleCORS();
    }
    
    if (!targetUrl) {
      return new Response(
        'Universal Proxy Active!\n\nUsage: /?url=YOUR_VIDEO_URL\n\nSupported: Instagram, YouTube, Facebook, TikTok, Twitter, Reddit, Vimeo, and 1000+ more sites', 
        { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        }
      );
    }
    
    console.log('Proxying:', targetUrl);
    
    const platform = detectPlatform(targetUrl);
    console.log('Detected platform:', platform);
    
    try {
      const response = await fetch(targetUrl, {
        headers: getPlatformHeaders(platform, targetUrl),
        cf: {
          cacheTtl: 300,
          cacheEverything: false,
          mirage: false,
          polish: 'off'
        }
      });
      
      console.log('Response status:', response.status);
      
      const newHeaders = new Headers(response.headers);
      newHeaders.set('Access-Control-Allow-Origin', '*');
      newHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      newHeaders.set('Access-Control-Allow-Headers', '*');
      newHeaders.set('Access-Control-Max-Age', '86400');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders
      });
      
    } catch (error) {
      console.error('Proxy error:', error);
      return new Response('Proxy Error: ' + error.message, { 
        status: 500,
        headers: { 
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};

function handleCORS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'Access-Control-Max-Age': '86400',
    }
  });
}

function detectPlatform(url) {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes('instagram.com') || urlLower.includes('cdninstagram.com')) return 'instagram';
  if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') || urlLower.includes('googlevideo.com')) return 'youtube';
  if (urlLower.includes('facebook.com') || urlLower.includes('fb.watch') || urlLower.includes('fbcdn.net')) return 'facebook';
  if (urlLower.includes('tiktok.com') || urlLower.includes('tiktokcdn.com')) return 'tiktok';
  if (urlLower.includes('twitter.com') || urlLower.includes('x.com') || urlLower.includes('twimg.com')) return 'twitter';
  if (urlLower.includes('reddit.com') || urlLower.includes('redd.it')) return 'reddit';
  if (urlLower.includes('vimeo.com')) return 'vimeo';
  if (urlLower.includes('dailymotion.com')) return 'dailymotion';
  if (urlLower.includes('twitch.tv')) return 'twitch';
  if (urlLower.includes('soundcloud.com')) return 'soundcloud';
  
  return 'generic';
}

function getPlatformHeaders(platform, targetUrl) {
  const baseHeaders = {
    'User-Agent': randomUserAgent(),
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
  };
  
  const platformHeaders = {
    instagram: {
      'Referer': 'https://www.instagram.com/',
      'Origin': 'https://www.instagram.com',
      'X-Instagram-AJAX': '1',
      'X-Requested-With': 'XMLHttpRequest',
    },
    youtube: {
      'Referer': 'https://www.youtube.com/',
      'Origin': 'https://www.youtube.com',
    },
    facebook: {
      'Referer': 'https://www.facebook.com/',
      'Origin': 'https://www.facebook.com',
      'Sec-Fetch-Dest': 'video',
      'Sec-Fetch-Mode': 'cors',
    },
    tiktok: {
      'Referer': 'https://www.tiktok.com/',
      'Origin': 'https://www.tiktok.com',
    },
    twitter: {
      'Referer': 'https://twitter.com/',
      'Origin': 'https://twitter.com',
    },
    reddit: {
      'Referer': 'https://www.reddit.com/',
    },
    vimeo: {
      'Referer': 'https://vimeo.com/',
    },
    generic: {}
  };
  
  return {
    ...baseHeaders,
    ...(platformHeaders[platform] || {})
  };
}

function randomUserAgent() {
  const agents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 13; SM-S911B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Safari/605.1.15',
    'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/112.0',
    'Mozilla/5.0 (iPad; CPU OS 16_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.4 Mobile/15E148 Safari/604.1',
  ];
  
  return agents[Math.floor(Math.random() * agents.length)];
}

// ============================================
// STOP COPYING HERE - LINE 176
// ============================================
