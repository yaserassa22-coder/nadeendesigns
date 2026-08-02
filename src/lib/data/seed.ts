import type { Dress, GalleryItem } from "@/types";

const now = new Date().toISOString();

export const SEED_DRESSES: Dress[] = [
  {
    id: "1",
    name_ar: "فستان الأميرة الذهبي",
    description_ar:
      "فستان زفاف فاخر بتصميم أميرة مع تطريز ذهبي يدوي وتنورة واسعة من التulle الفاخر. مثالي للعروس التي تحلم بإطلالة ملكية.",
    category: "wedding",
    price: 18500,
    rental_price: null,
    size: "M",
    color: "عاجي",
    style: "أميرة",
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
    name_ar: "فستان مermaid الأناقة",
    description_ar:
      "تصميم mermaid أنيق يلتف حول الجسم بانسيابية مع ذيل درامي. قماش سatin فاخر مع تفاصيل دانتيل رقيقة.",
    category: "wedding",
    price: 15200,
    rental_price: null,
    size: "S",
    color: "أبيض",
    style: "مermaid",
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
    name_ar: "فستان بوهو الرomantic",
    description_ar:
      "فستان بوهو رومانسي بأكمام طويلة شفافة وتطريزات floral delicate. مثالي للأعراس في الهواء الطلق.",
    category: "wedding",
    price: 12800,
    rental_price: null,
    size: "M",
    color: "عاجي",
    style: "بوهو",
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
    name_ar: "فستان كلاسيكي A-Line",
    description_ar:
      "تصميم كلاسيكي A-Line خالد مع خط عنق بسيط وظهر مفتوح. أناقة خالدة تناسب جميع أنواع الجسم.",
    category: "wedding",
    price: 11500,
    rental_price: null,
    size: "L",
    color: "أبيض",
    style: "كلاسيكي",
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
    name_ar: "فستان إيجار — Crystal Dream",
    description_ar:
      "فستان زفاف للإيجار مزين بكristals لامعة. متوفر للإيجار لفترة محدودة مع خدمة تنظيف مجانية.",
    category: "rental",
    price: null,
    rental_price: 3500,
    size: "M",
    color: "أبيض",
    style: "حديث",
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
    name_ar: "فستان إيجار — Vintage Lace",
    description_ar:
      "فستان vintage للإيجار بتصميم دانتيل كلاسيكي مع أكمام طويلة. قطعة نادرة من مجموعتنا الحصرية.",
    category: "rental",
    price: null,
    rental_price: 2800,
    size: "S",
    color: "عاجي",
    style: "فintage",
    is_featured: false,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1591604466107-be97fe5837df?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "7",
    name_ar: "طرحة كathedral فاخرة",
    description_ar:
      "طرحة cathedral طويلة من تulle فاخر مع حافة مطرزة باللؤلؤ. تكمل أي فستان زفاف بأناقة.",
    category: "veils",
    price: 2200,
    rental_price: 800,
    size: null,
    color: "أبيض",
    style: "كلاسيكي",
    is_featured: true,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "8",
    name_ar: "طرحة birdcage أنيقة",
    description_ar:
      "طرحة birdcage قصيرة مع تطريز دانتيل وشبكة vintage. مثالية للأعراس الصغيرة والحميمة.",
    category: "veils",
    price: 950,
    rental_price: 350,
    size: null,
    color: "عاجي",
    style: "فintage",
    is_featured: false,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1465495976277-5537e3f4b7b4?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "9",
    name_ar: "روب عروس سatin فاخر",
    description_ar:
      "روب عروس من سatin فاخر مع تطريز initials مخصص. مثالي لجلسات التحضير والتصوير.",
    category: "robes",
    price: 1800,
    rental_price: null,
    size: "M",
    color: "شampagne",
    style: "حديث",
    is_featured: true,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1515934751635-c81c6bc9a5d8?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
  {
    id: "10",
    name_ar: "روب lace رومانسي",
    description_ar:
      "روب عروس من دانتiel lace مع أربطة حريرية. تصميم رومانسي أنيق للصباح الكبير.",
    category: "robes",
    price: 1450,
    rental_price: null,
    size: "S",
    color: "Blush",
    style: "بوهو",
    is_featured: false,
    is_available: true,
    images: [
      "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?w=800&q=80",
    ],
    created_at: now,
    updated_at: now,
  },
];

export const SEED_GALLERY: GalleryItem[] = [
  {
    id: "g1",
    title_ar: "جلسة تصوير — الأميرة الذهبية",
    image_url:
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80",
    category: "wedding",
    sort_order: 1,
    created_at: now,
  },
  {
    id: "g2",
    title_ar: "تفاصيل التطريز",
    image_url:
      "https://images.unsplash.com/photo-1594552072234-2f0a8a4b8c8e?w=600&q=80",
    category: "details",
    sort_order: 2,
    created_at: now,
  },
  {
    id: "g3",
    title_ar: "إطلالة mermaid",
    image_url:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80",
    category: "wedding",
    sort_order: 3,
    created_at: now,
  },
  {
    id: "g4",
    title_ar: "بوتيكنا الفاخر",
    image_url:
      "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=600&q=80",
    category: "boutique",
    sort_order: 4,
    created_at: now,
  },
  {
    id: "g5",
    title_ar: "بوquet العروس",
    image_url:
      "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?w=600&q=80",
    category: "details",
    sort_order: 5,
    created_at: now,
  },
  {
    id: "g6",
    title_ar: "عرض الأزياء",
    image_url:
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80",
    category: "events",
    sort_order: 6,
    created_at: now,
  },
  {
    id: "g7",
    title_ar: "تجربة فستان",
    image_url:
      "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=600&q=80",
    category: "boutique",
    sort_order: 7,
    created_at: now,
  },
  {
    id: "g8",
    title_ar: "إطلالة بوهو",
    image_url:
      "https://images.unsplash.com/photo-1522653216850-4f4c69d89f2d?w=600&q=80",
    category: "wedding",
    sort_order: 8,
    created_at: now,
  },
];

export const INSTAGRAM_IMAGES = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80",
  "https://images.unsplash.com/photo-1522653216850-4f4c69d89f2d?w=400&q=80",
  "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=400&q=80",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=400&q=80",
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&q=80",
];
