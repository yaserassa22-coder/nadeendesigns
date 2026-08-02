import type { Dress, GalleryItem } from "@/types";

const now = new Date().toISOString();

export const SEED_DRESSES: Dress[] = [
  {
    id: "royal-lace",
    name_ar: "״³״×״§† ״²״§ …„ƒ ״¨״§„״¯״§†״×„ ״§„״§״®״±",
    description_ar:
      "״¬…״¹ ‡״°״§ ״§„״³״×״§† ״¨† ״§„״®״§…״© ״§„ƒ„״§״³ƒ״© ˆ״§„״±‚ ״§„״¹״µ״± ״¨״×״µ…… …„ƒ ״§״®״± …†״­ ״§„״¹״±ˆ״³ ״¥״·„״§„״© ״§״³״×״«†״§״¦״©.",
    category: "wedding",
    price: 22000,
    rental_price: null,
    size: "M",
    color: "״£ˆ ˆ״§״×",
    style: "״¯״§†״×„ ״§״®״±",
    is_featured: true,
    is_available: true,
    images: ["/hero.webp", "/hero.jpg"],
    created_at: now,
    updated_at: now,
  },
  {
    id: "1",
    name_ar: "״³״×״§† ״§„״£…״±״© ״§„״°‡״¨",
    description_ar:
      "״³״×״§† ״²״§ ״§״®״± ״¨״×״µ…… ״£…״±״© …״¹ ״×״·״±״² ״°‡״¨ ״¯ˆ ˆ״×†ˆ״±״© ˆ״§״³״¹״© …† ״§„״×ulle ״§„״§״®״±. …״«״§„ „„״¹״±ˆ״³ ״§„״× ״×״­„… ״¨״¥״·„״§„״© …„ƒ״©.",
    category: "wedding",
    price: 18500,
    rental_price: null,
    size: "M",
    color: "״¹״§״¬",
    style: "״£…״±",
    is_featured: true,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
      "https://images.unsplash.com/photo-1594552072234-2f0a8a4b8c8e?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "2",
    name_ar: "״³״×״§† …ermaid ״§„״£†״§‚״©",
    description_ar:
      "״×״µ…… mermaid ״£†‚ „״× ״­ˆ„ ״§„״¬״³… ״¨״§†״³״§״¨״© …״¹ ״°„ ״¯״±״§…. ‚…״§״´ ״³atin ״§״®״± …״¹ ״×״§״µ„ ״¯״§†״×„ ״±‚‚״©.",
    category: "wedding",
    price: 15200,
    rental_price: null,
    size: "S",
    color: "״£״¨״¶",
    style: "״­ˆ״±״© ״§„״¨״­״±",
    is_featured: true,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "3",
    name_ar: "״³״×״§† ״¨ˆ‡ˆ ״§„״±omantic",
    description_ar:
      "״³״×״§† ״¨ˆ‡ˆ ״±ˆ…״§†״³ ״¨״£ƒ…״§… ״·ˆ„״© ״´״§״© ˆ״×״·״±״²״§״× floral delicate. …״«״§„ „„״£״¹״±״§״³  ״§„‡ˆ״§״¡ ״§„״·„‚.",
    category: "wedding",
    price: 12800,
    rental_price: null,
    size: "M",
    color: "״¹״§״¬",
    style: "״¨ˆ‡…",
    is_featured: true,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1522653216850-4f4c69d89f2d?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "4",
    name_ar: "״³״×״§† ƒ„״§״³ƒ A-Line",
    description_ar:
      "״×״µ…… ƒ„״§״³ƒ A-Line ״®״§„״¯ …״¹ ״®״· ״¹†‚ ״¨״³״· ˆ״¸‡״± …״×ˆ״­. ״£†״§‚״© ״®״§„״¯״© ״×†״§״³״¨ ״¬…״¹ ״£†ˆ״§״¹ ״§„״¬״³….",
    category: "wedding",
    price: 11500,
    rental_price: null,
    size: "L",
    color: "״£״¨״¶",
    style: "‚״µ״© A (‚״µ״© ״­״± A)",
    is_featured: false,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "5",
    name_ar: "״³״×״§† ״¥״¬״§״± ג€” Crystal Dream",
    description_ar:
      "״³״×״§† ״²״§ „„״¥״¬״§״± …״²† ״¨ƒristals „״§…״¹״©. …״×ˆ״± „„״¥״¬״§״± „״×״±״© …״­״¯ˆ״¯״© …״¹ ״®״¯…״© ״×†״¸ …״¬״§†״©.",
    category: "rental",
    price: null,
    rental_price: 3500,
    size: "M",
    color: "״£״¨״¶",
    style: "״§״®״±",
    is_featured: true,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "6",
    name_ar: "״³״×״§† ״¥״¬״§״± ג€” Vintage Lace",
    description_ar:
      "״³״×״§† vintage „„״¥״¬״§״± ״¨״×״µ…… ״¯״§†״×„ ƒ„״§״³ƒ …״¹ ״£ƒ…״§… ״·ˆ„״©. ‚״·״¹״© †״§״¯״±״© …† …״¬…ˆ״¹״×†״§ ״§„״­״µ״±״©.",
    category: "rental",
    price: null,
    rental_price: 2800,
    size: "S",
    color: "״¹״§״¬",
    style: "״¯״§†״×„ ״§״®״±",
    is_featured: false,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1591604466107-be97fe5837df?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "nouf-1",
    name_ar: "״³״×״§† †ˆ ג€” ״¥״·„״§„״© ״°‡״¨״©",
    description_ar:
      "״³״×״§† †ˆ ״§״®״± ״¨״×״§״µ„ ״¯‚‚״© ˆ„…״³״© ״£†‚״©״ …״µ…… „…†״­ ״§„״¹״±ˆ״³ ״­״¶ˆ״±‹״§ ״§״³״×״«†״§״¦‹״§  ˆ…‡״§ ״§„……״².",
    category: "nouf_dresses",
    price: 16500,
    rental_price: null,
    size: "M",
    color: "״¹״§״¬",
    style: "״§״®״±",
    is_featured: true,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "11",
    name_ar: "״×״µ…… ״®״§״µ ג€” ״¥״·„״§„״© …„ƒ״©",
    description_ar:
      "״®״¯…״© ״×״µ…… ״³״×״§† ״®״§״µ ״¨״§„ƒ״§…„ ״­״³״¨ ״°ˆ‚ƒ ˆ…‚״§״³״§״×ƒ. ״×״´…„ ״§״³״×״´״§״±״©״ ״±״³… ״£ˆ„״ ˆ״×״µ„ ״¯ˆ ״§״®״±.",
    category: "custom_design",
    price: 25000,
    rental_price: null,
    size: "…״®״µ״µ",
    color: "״¹״§״¬",
    style: "…„ƒ",
    is_featured: true,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1594552072234-2f0a8a4b8c8e?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "12",
    name_ar: "״×״µ…… ״®״§״µ ג€” „…״³״© ״¹״µ״±״©",
    description_ar:
      "״³״×״§† …״®״µ״µ ״¨״®״·ˆ״· ״­״¯״«״© ˆ״×״§״µ„ ״¯‚‚״©. †״¹…„ …״¹ƒ ״®״·ˆ״© ״¨״®״·ˆ״© „״µ†״§״¹״© ‚״·״¹״© ״±״¯״©.",
    category: "custom_design",
    price: 22000,
    rental_price: null,
    size: "…״®״µ״µ",
    color: "״£״¨״¶",
    style: "״×״µ…… …״®״µ״µ",
    is_featured: false,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
];

export const SEED_GALLERY: GalleryItem[] = [
  {
    id: "g1",
    title_ar: "״¬„״³״© ״×״µˆ״± ג€” ״§„״£…״±״© ״§„״°‡״¨״©",
    image_url:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    category: "wedding",
    sort_order: 1,
    created_at: now,
  },
  {
    id: "g2",
    title_ar: "״×״§״µ„ ״§„״×״·״±״²",
    image_url:
      "https://images.unsplash.com/photo-1594552072234-2f0a8a4b8c8e?w=600&q=80",
    category: "details",
    sort_order: 2,
    created_at: now,
  },
  {
    id: "g3",
    title_ar: "״¥״·„״§„״© mermaid",
    image_url:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80",
    category: "wedding",
    sort_order: 3,
    created_at: now,
  },
  {
    id: "g4",
    title_ar: "״¨ˆ״×ƒ†״§ ״§„״§״®״±",
    image_url:
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80",
    category: "boutique",
    sort_order: 4,
    created_at: now,
  },
  {
    id: "g5",
    title_ar: "״¨ˆquet ״§„״¹״±ˆ״³",
    image_url:
      "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?w=600&q=80",
    category: "details",
    sort_order: 5,
    created_at: now,
  },
  {
    id: "g6",
    title_ar: "״¹״±״¶ ״§„״£״²״§״¡",
    image_url:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    category: "events",
    sort_order: 6,
    created_at: now,
  },
  {
    id: "g7",
    title_ar: "״×״¬״±״¨״© ״³״×״§†",
    image_url:
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80",
    category: "boutique",
    sort_order: 7,
    created_at: now,
  },
  {
    id: "g8",
    title_ar: "״¥״·„״§„״© ״¨ˆ‡ˆ",
    image_url:
      "https://images.unsplash.com/photo-1522653216850-4f4c69d89f2d?w=600&q=80",
    category: "wedding",
    sort_order: 8,
    created_at: now,
  },
];
