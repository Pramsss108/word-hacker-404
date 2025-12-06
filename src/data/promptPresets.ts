export const INDUSTRIES = {
  tech: { label: 'Technology & SaaS', keywords: 'tech startup branding, circuit patterns, digital connection, modern, sleek, innovation' },
  food: { label: 'Food & Beverage', keywords: 'organic shapes, appetizing, restaurant branding, fresh, bold flavors, hospitality' },
  sports: { label: 'Sports & Esports', keywords: 'aggressive, dynamic movement, mascot, team emblem, jersey style, athletic' },
  fashion: { label: 'Fashion & Apparel', keywords: 'elegant, luxury, streetwear, fabric texture, haute couture, trendy' },
  realestate: { label: 'Real Estate', keywords: 'architectural, structure, home, stability, trust, building silhouette' },
  gaming: { label: 'Gaming & Streamer', keywords: 'neon, avatar, fantasy, sci-fi, twitch emote style, high energy' },
  medical: { label: 'Medical & Health', keywords: 'clean, sterile, cross, heart, dna, professional, trustworthy, blue and white' },
  crypto: { label: 'Crypto & Web3', keywords: 'blockchain, nodes, futuristic, decentralized, token, metallic gradients' },
  legal: { label: 'Legal & Finance', keywords: 'scales, pillars, serif fonts, traditional, authoritative, gold and black' },
  music: { label: 'Music & Entertainment', keywords: 'sound waves, rhythm, vinyl, concert, artistic, expressive' },
  nature: { label: 'Eco & Nature', keywords: 'leaves, sustainability, earth tones, organic, recycling, growth' },
  automotive: { label: 'Automotive', keywords: 'speed, metallic, chrome, horsepower, silhouette, racing' }
};

export const STYLES = {
  minimal: { label: 'Minimalist', keywords: 'flat design, negative space, clean lines, Paul Rand style, less is more, reductionist' },
  geometric: { label: 'Geometric', keywords: 'sacred geometry, mathematical shapes, bauhaus style, sharp angles, grid-based' },
  vintage: { label: 'Vintage / Retro', keywords: 'distressed texture, 70s style, badge, rubber hose animation style, muted colors' },
  cyberpunk: { label: 'Cyberpunk', keywords: 'glitch aesthetic, neon accents, futuristic, techwear style, hud element, high contrast' },
  handdrawn: { label: 'Hand Drawn', keywords: 'sketchy, organic lines, doodle style, rough edges, artistic, pen and ink' },
  isometric: { label: '3D Isometric', keywords: 'isometric view, 3d vector, blocky, dimension, architectural, engineering' },
  abstract: { label: 'Abstract', keywords: 'fluid shapes, conceptual, avant-garde, non-representational, artistic interpretation' },
  corporate: { label: 'Corporate Professional', keywords: 'trustworthy, solid, sans-serif, balanced, fortune 500 style' },
  luxury: { label: 'Luxury & High-End', keywords: 'serif, gold foil texture, elegant, sophisticated, premium, crest' },
  popart: { label: 'Pop Art', keywords: 'halftone dots, comic book style, bold outlines, vibrant colors, roy lichtenstein' }
};

export const ASSET_TYPES = {
  logo: { label: 'Logo / Brand Mark', keywords: 'vector logo, logomark, brand identity, scalable' },
  logotype: { label: 'Logotype / Wordmark', keywords: 'typography logo, custom lettering, wordmark, font-based logo, clean typography' },
  icon: { label: 'App Icon / UI', keywords: 'app icon, ui element, rounded corners, ios style, material design' },
  favicon: { label: 'Favicon (Web)', keywords: 'favicon, 16x16 pixel perfect, simplified shape, high visibility at small sizes' },
  mascot: { label: 'Mascot / Character', keywords: 'character design, mascot, expressive face, full body, personality' },
  badge: { label: 'Badge / Emblem', keywords: 'circular badge, patch style, embroidery ready, crest, shield' },
  sticker: { label: 'Sticker / Decal', keywords: 'die-cut sticker, white border, vinyl decal, sticker art' },
  tshirt: { label: 'T-Shirt Design', keywords: 't-shirt graphic, screen print ready, merchandise, apparel design' },
  pattern: { label: 'Seamless Pattern', keywords: 'seamless pattern, tiling background, wallpaper, textile design' },
  social: { label: 'Social Media Avatar', keywords: 'profile picture, circular crop safe, personal branding, avatar' },
  esports: { label: 'Esports Team Logo', keywords: 'aggressive animal mascot, shield background, bold outlines, vector sport logo' }
};

export const COLOR_PALETTES = {
  monochrome: { label: 'Monochrome (B&W)', colors: ['#000000', '#ffffff'], keywords: 'black and white, monochrome, high contrast, ink style' },
  cyberpunk: { label: 'Neon Cyberpunk', colors: ['#0aff6a', '#ff00ff', '#00ffff', '#1a1a1a'], keywords: 'neon green, hot pink, cyan, dark background, glowing' },
  sunset: { label: 'Sunset Gradient', colors: ['#ff7e5f', '#feb47b', '#765285'], keywords: 'warm gradient, orange to purple, sunset vibes, dusk' },
  ocean: { label: 'Deep Ocean', colors: ['#006994', '#003366', '#48d1cc'], keywords: 'deep blue, teal, aquatic tones, cool colors' },
  forest: { label: 'Forest & Earth', colors: ['#228b22', '#8b4513', '#f0e68c'], keywords: 'earth tones, forest green, brown, natural palette' },
  corporate: { label: 'Trust Blue', colors: ['#0056b3', '#00a8e8', '#ffffff', '#333333'], keywords: 'professional blue, white, dark grey, corporate identity' },
  luxury: { label: 'Gold & Black', colors: ['#d4af37', '#000000', '#1a1a1a'], keywords: 'gold foil, matte black, premium, luxury, metallic' },
  pastel: { label: 'Soft Pastels', colors: ['#ffb3ba', '#baffc9', '#bae1ff', '#ffffba'], keywords: 'pastel colors, soft, baby blue, mint green, gentle' },
  retro: { label: 'Retro 80s', colors: ['#ff0055', '#ffcc00', '#00ddff'], keywords: 'synthwave, 80s retro, vibrant, miami vice style' },
  grayscale: { label: 'Grayscale', colors: ['#333333', '#666666', '#999999', '#cccccc'], keywords: 'shades of gray, neutral, sophisticated, silver' }
};

export const COMPOSITIONS = {
  centered: { label: 'Centered (Default)', keywords: 'centered composition, symmetrical balance, focal point' },
  golden: { label: 'Golden Ratio', keywords: 'golden ratio composition, fibonacci spiral, perfect proportions' },
  minimal: { label: 'Isolated', keywords: 'isolated on white, no background elements, standalone object' },
  dynamic: { label: 'Dynamic Action', keywords: 'action pose, motion blur lines, dynamic angle, perspective' }
};

export const MOODS = {
  professional: { label: 'Professional', keywords: 'trustworthy, serious, established' },
  playful: { label: 'Playful', keywords: 'fun, whimsical, cute, friendly' },
  aggressive: { label: 'Aggressive', keywords: 'bold, fierce, strong, dominant' },
  calm: { label: 'Calm', keywords: 'peaceful, zen, soft, relaxing' },
  innovative: { label: 'Innovative', keywords: 'cutting-edge, modern, disruptive' }
};

export const TECH_SPECS = 'white background, svg style, vector file, adobe illustrator, 8k resolution, no photorealistic, no shading, flat color';
