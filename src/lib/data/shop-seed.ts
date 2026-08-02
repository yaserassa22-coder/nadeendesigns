import type { BridalRobe, Veil } from "@/types/shop";

const now = new Date().toISOString();

export const SEED_VEILS: Veil[] = [
  {
    id: "veil-1",
    name_ar: "طرحة كاتدرائية فاخرة",
    description_ar:
      "طرحة كاتدرائية طويلة من تول فاخر مع حافة مطرزة باللؤلؤ. تكمل أي فستان زفاف بأناقة.",
    price: 2200,
    images: [
      "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&q=80",
    ],
    category: "كاتدرائية",
    color: "أبيض",
    material: "تول",
    stock_quantity: 8,
    is_available: true,
    is_featured: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "veil-2",
    name_ar: "طرحة birdcage أنيقة",
    description_ar:
      "طرحة birdcage قصيرة مع تطريز دانتيل وشبكة كلاسيكية. مثالية للأعراس الحميمة.",
    price: 950,
    images: [
      "https://images.unsplash.com/photo-1465495976277-5537e3f4b7b4?w=800&q=80",
    ],
    category: "birdcage",
    color: "عاجي",
    material: "دانتيل",
    stock_quantity: 12,
    is_available: true,
    is_featured: false,
    created_at: now,
    updated_at: now,
  },
];

export const SEED_BRIDAL_ROBES: BridalRobe[] = [
  {
    id: "robe-1",
    name_ar: "برنص عروس ساتان فاخر",
    description_ar:
      "برنص عروس من ساتان فاخر مع إمكانية تطريز مخصص. مثالي لجلسات التحضير والتصوير.",
    price: 1800,
    images: [
      "https://images.unsplash.com/photo-1515934751635-c81c6bc9a5d8?w=800&q=80",
    ],
    color: "شامبين",
    size: "M",
    material: "ساتان",
    stock_quantity: 6,
    is_featured: true,
    is_available: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "robe-2",
    name_ar: "برنص دانتيل رومانسي",
    description_ar:
      "برنص عروس من دانتيل مع أربطة حريرية. تصميم رومانسي أنيق للصباح الكبير.",
    price: 1450,
    images: [
      "https://images.unsplash.com/photo-1525253086316-d0c936c814f8?w=800&q=80",
    ],
    color: "وردي فاتح",
    size: "S",
    material: "دانتيل",
    stock_quantity: 4,
    is_featured: false,
    is_available: true,
    created_at: now,
    updated_at: now,
  },
];
