// ── Brands ──────────────────────────────────────────────────────────
export const MOCK_BRANDS = [
  {
    id: 'brand-poolar',
    name: 'Poolar',
    initials: 'PO',
    color: '#ff6b35',
    organization: 'Poolar',
    logoUrl: '/poolar-icon.png',
    description: 'Creative brand.',
    hasAssistant: true,
  },
  {
    id: 'brand-1',
    name: 'Acme Studio',
    initials: 'AS',
    color: '#6466ff',
    organization: 'Acme Studio',
    description: 'Creative agency pushing boundaries in visual design.',
    hasAssistant: true,
  },
  {
    id: 'brand-2',
    name: 'Nova Labs',
    initials: 'NL',
    color: '#24ff78',
    organization: 'Nova Labs',
    description: 'Tech startup focused on AI-driven solutions.',
    hasAssistant: false,
  },
];

// ── User Profile ────────────────────────────────────────────────────
export const MOCK_USER = {
  id: 'user-1',
  name: 'Uwe Steffen',
  email: 'uwe@openwonder.io',
  avatarUrl: 'https://i.pravatar.cc/150?u=uwe',
  role: 'Designer',
  isAdmin: true,
};

// ── Generated Images (Imagine) ─────────────────────────────────────
export const MOCK_IMAGES = Array.from({ length: 12 }, (_, i) => ({
  id: `img-${i + 1}`,
  url: `https://picsum.photos/seed/ow${i + 1}/600/600`,
  prompt: [
    'A futuristic cityscape at sunset with neon lights',
    'Abstract geometric patterns in purple and gold',
    'Minimalist product photography on marble surface',
    'Portrait of a character in retro-futuristic style',
    'Aerial view of a tropical island with turquoise water',
    'Organic shapes flowing like liquid metal',
    'Cozy interior with warm lighting and plants',
    'Dramatic mountain landscape with storm clouds',
    'Fashion editorial with vibrant color blocking',
    'Underwater scene with bioluminescent creatures',
    'Urban street photography in black and white',
    'Surreal floating objects in a dream-like space',
  ][i],
  aspectRatio: (['16:9', '1:1', '4:5'] as const)[i % 3],
  liked: i % 3 === 0,
  createdAt: new Date(Date.now() - i * 3600000).toISOString(),
}));

// ── Library Folders ─────────────────────────────────────────────────
export const MOCK_FOLDERS = [
  { id: 'folder-1', name: 'Campaign Assets', count: 24, updatedAt: '2026-02-10', color: '#6466ff' },
  { id: 'folder-2', name: 'Social Media', count: 18, updatedAt: '2026-02-09', color: '#e67e22' },
  { id: 'folder-3', name: 'Product Shots', count: 12, updatedAt: '2026-02-08', color: '#2ecc71' },
  { id: 'folder-4', name: 'Brand Identity', count: 8, updatedAt: '2026-02-07', color: '#e74c3c' },
  { id: 'folder-5', name: 'Testimonials', count: 6, updatedAt: '2026-02-06', color: '#9b59b6' },
];

// ── Library Assets ──────────────────────────────────────────────────
const CREATIVE_MODES = ['imagine', 'product', 'character', 'create'] as const;
const ASPECT_RATIOS_LIB = ['1:1', '4:3', '3:4', '16:9', '9:16'] as const;
const WIDTHS = [400, 600, 400, 800, 400] as const;
const HEIGHTS = [400, 450, 530, 450, 710] as const;
const STYLE_IDS = ['style-1', 'style-2', 'style-3', 'style-4'] as const; // Photography, Illustration, Products, Characters

const PRODUCT_IDS = ['prod-1', 'prod-2', 'prod-3', 'prod-4', 'prod-5', 'prod-6', 'prod-7', 'prod-8'] as const;
const PRODUCT_STYLE_IDS = ['pstyle-1', 'pstyle-2', 'pstyle-3', 'pstyle-4', 'pstyle-5'] as const;
const CHARACTER_IDS = ['char-1', 'char-2', 'char-3', 'char-4', 'char-5', 'char-6'] as const;
const LOCATION_IDS = ['cloc-1', 'cloc-2', 'cloc-3', 'cloc-4', 'cloc-5'] as const;

/** Named campaign collections (library sidebar + filtering). */
export const MOCK_LIBRARY_COLLECTIONS = [
  { id: 'collection-summer-campaign', name: 'Summer Campaign' },
  { id: 'collection-product-release-march', name: 'Product Release March' },
] as const;

export const MOCK_LIBRARY_ASSETS = Array.from({ length: 24 }, (_, i) => {
  const arIdx = i % ASPECT_RATIOS_LIB.length;
  const styleId = STYLE_IDS[i % STYLE_IDS.length];
  const libraryCollectionId =
    MOCK_LIBRARY_COLLECTIONS[i % MOCK_LIBRARY_COLLECTIONS.length].id;
  const base = {
    id: `asset-${i + 1}`,
    url: `https://picsum.photos/seed/lib${i + 1}/${WIDTHS[arIdx]}/${HEIGHTS[arIdx]}`,
    name: [
      'Hero Campaign Shot', 'Social Banner', 'Product Close-up', 'Character Portrait',
      'Ad Variation A', 'Brand Pattern', 'Lifestyle Scene', 'Studio Product',
      'Team Photo', 'Event Banner', 'Icon Set Preview', 'Video Thumbnail',
      'Instagram Reel', 'Newsletter Header', 'Website Hero', 'App Screenshot',
      'Packaging Design', 'Logo Exploration', 'Color Palette', 'Typography Sample',
      'Mood Board', 'Storyboard Frame', 'Print Ad', 'Billboard Mockup',
    ][i],
    type: 'image' as const,
    folderId: MOCK_FOLDERS[i % MOCK_FOLDERS.length].id,
    styleId,
    liked: i % 4 === 0,
    creativeMode: CREATIVE_MODES[i % CREATIVE_MODES.length],
    aspectRatio: ASPECT_RATIOS_LIB[arIdx],
    createdAt: new Date(
      Date.now() - Math.floor(i / 4) * 86400000 - (i % 4) * 7200000
    ).toISOString(),
    libraryCollectionId,
  };
  if (styleId === 'style-3') {
    return {
      ...base,
      productId: PRODUCT_IDS[i % PRODUCT_IDS.length],
      productStyleId: PRODUCT_STYLE_IDS[i % PRODUCT_STYLE_IDS.length],
    };
  }
  if (styleId === 'style-4') {
    return {
      ...base,
      characterId: CHARACTER_IDS[i % CHARACTER_IDS.length],
      locationId: LOCATION_IDS[i % LOCATION_IDS.length],
    };
  }
  return base;
});

// ── Chat Messages ───────────────────────────────────────────────────
export const MOCK_CHAT_MESSAGES = [
  {
    id: 'msg-1',
    role: 'assistant' as const,
    content:
      'Hello! I\'m your brand assistant. I can help you create on-brand content, generate images, or answer questions about your brand guidelines. What would you like to work on?',
    timestamp: '2026-02-11T09:00:00Z',
  },
  {
    id: 'msg-2',
    role: 'user' as const,
    content: 'Can you generate a hero image for our new campaign? It should feel premium and modern.',
    timestamp: '2026-02-11T09:01:00Z',
  },
  {
    id: 'msg-3',
    role: 'assistant' as const,
    content:
      'I\'d be happy to help with that! Based on your brand guidelines, I\'d suggest a clean composition with your primary color palette. Should I go with a photographic style or more illustrative? And do you have a preferred aspect ratio?',
    timestamp: '2026-02-11T09:01:30Z',
  },
  {
    id: 'msg-4',
    role: 'user' as const,
    content: 'Photographic, 16:9 please.',
    timestamp: '2026-02-11T09:02:00Z',
  },
  {
    id: 'msg-5',
    role: 'assistant' as const,
    content:
      'Got it! I\'m generating a premium photographic hero image in 16:9 for your campaign. This will take just a moment...',
    timestamp: '2026-02-11T09:02:15Z',
  },
];

// ── Dashboard Stats ─────────────────────────────────────────────────
export const MOCK_DASHBOARD_STATS = [
  { label: 'Images Generated', value: '1,284', change: '+12%', trend: 'up' as const },
  { label: 'Videos Created', value: '156', change: '+8%', trend: 'up' as const },
  { label: 'Library Assets', value: '342', change: '+24', trend: 'up' as const },
  { label: 'Ad Variations', value: '89', change: '+5', trend: 'up' as const },
];

// ── Recent Activity ─────────────────────────────────────────────────
export const MOCK_ACTIVITY = [
  { id: 'act-1', action: 'Generated 4 images', context: 'Imagine', time: '2 min ago' },
  { id: 'act-2', action: 'Created folder "Q1 Launch"', context: 'Library', time: '15 min ago' },
  { id: 'act-3', action: 'Generated product shot', context: 'Product', time: '1 hour ago' },
  { id: 'act-4', action: 'Created testimonial video', context: 'Character', time: '2 hours ago' },
  { id: 'act-5', action: 'Published 3 ad variations', context: 'Create', time: '3 hours ago' },
  { id: 'act-6', action: 'Saved 5 images to library', context: 'Library', time: '5 hours ago' },
];

// ── Brand Styles ───────────────────────────────────────────────────
export interface BrandStyle {
  id: string;
  name: string;
  description: string;
  image: string;
  previews: string[];
  isImageStyle?: boolean;
}

export const MOCK_BRAND_STYLES: BrandStyle[] = [
  {
    id: 'style-1',
    name: 'Photography',
    description: 'Warm, personal, lifestyle-oriented visuals',
    image: 'https://picsum.photos/seed/style-human/200/200',
    previews: [
      'https://picsum.photos/seed/style-human-1/400/300',
      'https://picsum.photos/seed/style-human-2/400/300',
      'https://picsum.photos/seed/style-human-3/400/300',
    ],
    isImageStyle: true,
  },
  {
    id: 'style-2',
    name: 'Illustration',
    description: 'Technical, precise, product-focused visuals',
    image: 'https://picsum.photos/seed/style-machine/200/200',
    previews: [
      'https://picsum.photos/seed/style-machine-1/400/300',
      'https://picsum.photos/seed/style-machine-2/400/300',
      'https://picsum.photos/seed/style-machine-3/400/300',
    ],
    isImageStyle: true,
  },
  {
    id: 'style-3',
    name: 'Products',
    description: 'Product-focused visuals, packshots and merchandise',
    image: 'https://picsum.photos/seed/style-products/200/200',
    previews: [
      'https://picsum.photos/seed/style-products-1/400/300',
      'https://picsum.photos/seed/style-products-2/400/300',
      'https://picsum.photos/seed/style-products-3/400/300',
    ],
    isImageStyle: false,
  },
  {
    id: 'style-4',
    name: 'Characters',
    description: 'Character portraits, testimonials and spokesperson visuals',
    image: 'https://picsum.photos/seed/style-characters/200/200',
    previews: [
      'https://picsum.photos/seed/style-characters-1/400/300',
      'https://picsum.photos/seed/style-characters-2/400/300',
      'https://picsum.photos/seed/style-characters-3/400/300',
    ],
    isImageStyle: false,
  },
];

/** Brand styles shown as image-style options in chat (Imagine/Create). Excludes e.g. Products. */
export const MOCK_IMAGE_STYLES = MOCK_BRAND_STYLES.filter((s) => s.isImageStyle !== false);

// ── Product Styles ─────────────────────────────────────────────────
export const MOCK_PRODUCT_STYLES = [
  {
    id: 'pstyle-1',
    name: 'Studio shot',
    description: 'Clean studio lighting, neutral background, crisp detail',
    image: 'https://picsum.photos/seed/pstyle-studio/200/200',
    previews: [
      'https://picsum.photos/seed/pstyle-studio-1/400/300',
      'https://picsum.photos/seed/pstyle-studio-2/400/300',
    ],
  },
  {
    id: 'pstyle-2',
    name: 'Outside shot',
    description: 'Natural light, outdoor setting, environmental context',
    image: 'https://picsum.photos/seed/pstyle-outside/200/200',
    previews: [
      'https://picsum.photos/seed/pstyle-outside-1/400/300',
      'https://picsum.photos/seed/pstyle-outside-2/400/300',
    ],
  },
  {
    id: 'pstyle-3',
    name: 'Lifestyle',
    description: 'In-use context, real-world setting, human interaction',
    image: 'https://picsum.photos/seed/pstyle-lifestyle/200/200',
    previews: [
      'https://picsum.photos/seed/pstyle-lifestyle-1/400/300',
      'https://picsum.photos/seed/pstyle-lifestyle-2/400/300',
    ],
  },
  {
    id: 'pstyle-4',
    name: 'Flat lay',
    description: 'Top-down composition, arranged with props',
    image: 'https://picsum.photos/seed/pstyle-flatlay/200/200',
    previews: [
      'https://picsum.photos/seed/pstyle-flatlay-1/400/300',
      'https://picsum.photos/seed/pstyle-flatlay-2/400/300',
    ],
  },
  {
    id: 'pstyle-5',
    name: 'Close-up detail',
    description: 'Macro focus, texture and material emphasis',
    image: 'https://picsum.photos/seed/pstyle-closeup/200/200',
    previews: [
      'https://picsum.photos/seed/pstyle-closeup-1/400/300',
      'https://picsum.photos/seed/pstyle-closeup-2/400/300',
    ],
  },
];

/** Library sidebar: same three product-style rows as HistorySidebar (Studio / Outside / Lifestyle). */
export const LIBRARY_SIDEBAR_PRODUCT_STYLES = MOCK_PRODUCT_STYLES.slice(0, 3);

/** Library sidebar "All" under Brand Styles — union of image styles + sidebar product styles. */
export const LIBRARY_BRAND_STYLES_ALL_ID = 'library-brand-styles-all';

export function isLibraryAssetInBrandStylesSidebar(
  asset: (typeof MOCK_LIBRARY_ASSETS)[number]
): boolean {
  const brandImageIds = new Set(MOCK_IMAGE_STYLES.map((s) => s.id));
  const brandProductIds = new Set(LIBRARY_SIDEBAR_PRODUCT_STYLES.map((s) => s.id));
  if (brandImageIds.has(asset.styleId)) return true;
  if (
    asset.styleId === 'style-3' &&
    'productStyleId' in asset &&
    asset.productStyleId &&
    brandProductIds.has(asset.productStyleId)
  ) {
    return true;
  }
  return false;
}

// ── Character Locations ─────────────────────────────────────────────
export const MOCK_CHARACTER_LOCATIONS = [
  {
    id: 'cloc-1',
    name: 'Office',
    description: 'Professional office setting, desk, meeting room',
    image: 'https://picsum.photos/seed/cloc-office/200/200',
    previews: [
      'https://picsum.photos/seed/cloc-office-1/400/300',
      'https://picsum.photos/seed/cloc-office-2/400/300',
    ],
  },
  {
    id: 'cloc-2',
    name: 'Studio',
    description: 'Clean studio backdrop, controlled lighting',
    image: 'https://picsum.photos/seed/cloc-studio/200/200',
    previews: [
      'https://picsum.photos/seed/cloc-studio-1/400/300',
      'https://picsum.photos/seed/cloc-studio-2/400/300',
    ],
  },
  {
    id: 'cloc-3',
    name: 'Outdoor',
    description: 'Natural light, outdoor setting, environmental context',
    image: 'https://picsum.photos/seed/cloc-outdoor/200/200',
    previews: [
      'https://picsum.photos/seed/cloc-outdoor-1/400/300',
      'https://picsum.photos/seed/cloc-outdoor-2/400/300',
    ],
  },
  {
    id: 'cloc-4',
    name: 'Coffee Shop',
    description: 'Casual café setting, warm atmosphere',
    image: 'https://picsum.photos/seed/cloc-coffee/200/200',
    previews: [
      'https://picsum.photos/seed/cloc-coffee-1/400/300',
      'https://picsum.photos/seed/cloc-coffee-2/400/300',
    ],
  },
  {
    id: 'cloc-5',
    name: 'Interview',
    description: 'Interview-style setup, testimonial or talking head',
    image: 'https://picsum.photos/seed/cloc-interview/200/200',
    previews: [
      'https://picsum.photos/seed/cloc-interview-1/400/300',
      'https://picsum.photos/seed/cloc-interview-2/400/300',
    ],
  },
];

// ── Product Mock ────────────────────────────────────────────────────
export const MOCK_PRODUCTS = [
  { id: 'prod-1', name: 'Wireless Headphones', category: 'Electronics', image: 'https://picsum.photos/seed/prod1/400/400' },
  { id: 'prod-2', name: 'Smart Watch', category: 'Electronics', image: 'https://picsum.photos/seed/prod2/400/400' },
  { id: 'prod-3', name: 'Running Shoes', category: 'Footwear', image: 'https://picsum.photos/seed/prod3/400/400' },
  { id: 'prod-4', name: 'Toothpaste Premium', category: 'Health', image: 'https://picsum.photos/seed/prod4/400/400' },
  { id: 'prod-5', name: 'Organic Face Cream', category: 'Beauty', image: 'https://picsum.photos/seed/prod5/400/400' },
  { id: 'prod-6', name: 'Leather Backpack', category: 'Accessories', image: 'https://picsum.photos/seed/prod6/400/400' },
  { id: 'prod-7', name: 'Coffee Maker Pro', category: 'Home', image: 'https://picsum.photos/seed/prod7/400/400' },
  { id: 'prod-8', name: 'Yoga Mat Deluxe', category: 'Fitness', image: 'https://picsum.photos/seed/prod8/400/400' },
];

// ── Character / Testimonial Mock ────────────────────────────────────
export const MOCK_CHARACTERS = [
  { id: 'char-1', name: 'Sarah Chen', role: 'Tech Founder', image: 'https://i.pravatar.cc/150?u=sarah' },
  { id: 'char-2', name: 'Marcus Johnson', role: 'Creative Director', image: 'https://i.pravatar.cc/150?u=marcus' },
  { id: 'char-3', name: 'Elena Rodriguez', role: 'Brand Manager', image: 'https://i.pravatar.cc/150?u=elena' },
  { id: 'char-4', name: 'Karen Mitchell', role: 'CEO', image: 'https://i.pravatar.cc/150?u=karen' },
  { id: 'char-5', name: 'Michael Park', role: 'Designer', image: 'https://i.pravatar.cc/150?u=michael' },
  { id: 'char-6', name: 'James Wilson', role: 'Engineer', image: 'https://i.pravatar.cc/150?u=james' },
];

// ── Ad Templates (Create) ───────────────────────────────────────────
export const MOCK_AD_TEMPLATES = [
  { id: 'tpl-1', name: 'Instagram Story', dimensions: '1080 x 1920', image: 'https://picsum.photos/seed/tpl1/270/480' },
  { id: 'tpl-2', name: 'Facebook Post', dimensions: '1200 x 628', image: 'https://picsum.photos/seed/tpl2/600/314' },
  { id: 'tpl-3', name: 'Banner Ad', dimensions: '728 x 90', image: 'https://picsum.photos/seed/tpl3/728/90' },
  { id: 'tpl-4', name: 'Square Post', dimensions: '1080 x 1080', image: 'https://picsum.photos/seed/tpl4/400/400' },
  { id: 'tpl-5', name: 'LinkedIn Cover', dimensions: '1584 x 396', image: 'https://picsum.photos/seed/tpl5/792/198' },
  { id: 'tpl-6', name: 'YouTube Thumbnail', dimensions: '1280 x 720', image: 'https://picsum.photos/seed/tpl6/640/360' },
];

// ── Multi-market regions (Create / Market Adaption mode) ─────────
export const MOCK_MARKETS = [
  { id: 'south-africa', label: 'South Africa' },
  { id: 'asia', label: 'Asia' },
  { id: 'australia', label: 'Australia' },
  { id: 'south-america', label: 'South America' },
] as const;
