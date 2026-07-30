// Shared mock data + fetch-with-fallback helpers for the Ecommerce app.
//
// The backend ships `GET /api/lms/orders`, `GET /api/lms/coupons`, and
// `GET /api/lms/instructor/payouts`, but the `cart` and `instructor/earnings`
// summary endpoints aren't wired into `lms-api.ts` yet. To keep the UI usable
// in dev (and resilient when the backend is offline), every fetch below tries
// the real API first and transparently falls back to mock data on any error.
//
// Mock shapes mirror the real `Order` / `Coupon` / `InstructorPayout` types
// from `@/types/lms` so the components can treat them identically.

// Import Dependencies
import { lmsAxios } from "@/services/lms-api";
import type {
  Coupon,
  Course,
  InstructorPayout,
  Order,
} from "@/types/lms";

// ----------------------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return iso(d);
};
const daysAhead = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};

// ----------------------------------------------------------------------
// Local cart shape (the backend `GET /api/lms/cart` payload isn't typed yet).
// ----------------------------------------------------------------------

export interface CartItem {
  id: string;
  courseId: string;
  title: string;
  excerpt?: string;
  featuredImage?: string;
  instructorName: string;
  priceCents: number;
  compareAtCents?: number;
  currency?: string;
  quantity: number;
  addedAt: string;
}

export interface Cart {
  items: CartItem[];
  currency: string;
  /** Coupon code currently applied to the cart (empty when none). */
  couponCode?: string;
  /** Discount in cents resolved from the applied coupon. */
  discountCents?: number;
}

// ----------------------------------------------------------------------
// Instructor earnings summary (returned by `GET /api/lms/instructor/earnings`
// — not yet in `lms-api.ts`, so we fetch via the raw axios instance).
// ----------------------------------------------------------------------

export interface CourseEarning {
  courseId: string;
  courseTitle: string;
  enrollments: number;
  grossCents: number;
  /** Instructor share after platform commission, in cents. */
  netCents: number;
  commissionPct: number;
}

export interface MonthlyRevenuePoint {
  /** "YYYY-MM" label. */
  month: string;
  /** Net revenue in cents. */
  revenueCents: number;
}

export interface EarningsSummary {
  totalCents: number;
  availableCents: number;
  pendingCents: number;
  paidOutCents: number;
  currency: string;
  byCourse: CourseEarning[];
  monthly: MonthlyRevenuePoint[];
}

// ----------------------------------------------------------------------
// Mock data
// ----------------------------------------------------------------------

export const MOCK_CART_ITEMS: CartItem[] = [
  {
    id: "cart-1",
    courseId: "course-react-fundamentals",
    title: "React 19 Fundamentals: Hooks, Suspense, and Server Components",
    excerpt: "Hooks, Suspense, Server Components, and the new use() hook.",
    featuredImage: "",
    instructorName: "Sarah Chen",
    priceCents: 8900,
    compareAtCents: 12900,
    currency: "usd",
    quantity: 1,
    addedAt: daysAgo(1),
  },
  {
    id: "cart-2",
    courseId: "course-tailwind-design",
    title: "Building Design Systems with Tailwind CSS v4",
    excerpt: "Tokens, themes, and component-driven workflow.",
    featuredImage: "",
    instructorName: "Marcus Lee",
    priceCents: 6900,
    compareAtCents: 9900,
    currency: "usd",
    quantity: 1,
    addedAt: daysAgo(2),
  },
  {
    id: "cart-3",
    courseId: "course-react-perf",
    title: "Advanced React Performance",
    excerpt: "Memoization, virtualization, and profiling at scale.",
    featuredImage: "",
    instructorName: "Sarah Chen",
    priceCents: 7900,
    currency: "usd",
    quantity: 1,
    addedAt: daysAgo(0),
  },
];

export const MOCK_CART: Cart = {
  items: MOCK_CART_ITEMS,
  currency: "usd",
};

export const MOCK_ORDERS: Order[] = [
  {
    id: "order-1",
    tenantId: "tenant-1",
    userId: "user-1",
    orderNumber: "RC-100245",
    items: [
      {
        id: "oi-1",
        itemType: "course",
        referenceId: "course-react-fundamentals",
        title: "React 19 Fundamentals: Hooks, Suspense, and Server Components",
        unitPriceCents: 8900,
        quantity: 1,
        subtotalCents: 8900,
      },
    ],
    subtotalCents: 8900,
    discountCents: 890,
    taxCents: 641,
    totalCents: 8651,
    currency: "usd",
    status: "paid",
    couponCode: "REACT10",
    paymentMethod: "card",
    paidAt: daysAgo(14),
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
  },
  {
    id: "order-2",
    tenantId: "tenant-1",
    userId: "user-1",
    orderNumber: "RC-100244",
    items: [
      {
        id: "oi-2",
        itemType: "course",
        referenceId: "course-tailwind-design",
        title: "Building Design Systems with Tailwind CSS v4",
        unitPriceCents: 6900,
        quantity: 1,
        subtotalCents: 6900,
      },
      {
        id: "oi-3",
        itemType: "course",
        referenceId: "course-react-perf",
        title: "Advanced React Performance",
        unitPriceCents: 7900,
        quantity: 1,
        subtotalCents: 7900,
      },
    ],
    subtotalCents: 14800,
    discountCents: 1480,
    taxCents: 1066,
    totalCents: 14386,
    currency: "usd",
    status: "paid",
    couponCode: "FRIENDS",
    paymentMethod: "card",
    paidAt: daysAgo(28),
    createdAt: daysAgo(28),
    updatedAt: daysAgo(28),
  },
  {
    id: "order-3",
    tenantId: "tenant-1",
    userId: "user-1",
    orderNumber: "RC-100243",
    items: [
      {
        id: "oi-4",
        itemType: "course",
        referenceId: "course-graphql",
        title: "GraphQL APIs with Apollo and React",
        unitPriceCents: 9900,
        quantity: 1,
        subtotalCents: 9900,
      },
    ],
    subtotalCents: 9900,
    discountCents: 0,
    taxCents: 792,
    totalCents: 10692,
    currency: "usd",
    status: "pending",
    paymentMethod: "card",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(3),
  },
  {
    id: "order-4",
    tenantId: "tenant-1",
    userId: "user-1",
    orderNumber: "RC-100242",
    items: [
      {
        id: "oi-5",
        itemType: "course",
        referenceId: "course-vue3",
        title: "Vue 3 Mastery: Composition API and Pinia",
        unitPriceCents: 5900,
        quantity: 1,
        subtotalCents: 5900,
      },
    ],
    subtotalCents: 5900,
    discountCents: 0,
    taxCents: 472,
    totalCents: 6372,
    currency: "usd",
    status: "refunded",
    refundedAt: daysAgo(40),
    paidAt: daysAgo(45),
    paymentMethod: "card",
    createdAt: daysAgo(45),
    updatedAt: daysAgo(40),
  },
  {
    id: "order-5",
    tenantId: "tenant-1",
    userId: "user-1",
    orderNumber: "RC-100241",
    items: [
      {
        id: "oi-6",
        itemType: "course",
        referenceId: "course-svelte",
        title: "SvelteKit: From Zero to Production",
        unitPriceCents: 7900,
        quantity: 1,
        subtotalCents: 7900,
      },
    ],
    subtotalCents: 7900,
    discountCents: 1580,
    taxCents: 506,
    totalCents: 6826,
    currency: "usd",
    status: "paid",
    couponCode: "LAUNCH20",
    paymentMethod: "card",
    paidAt: daysAgo(60),
    createdAt: daysAgo(60),
    updatedAt: daysAgo(60),
  },
];

export const MOCK_COUPONS: Coupon[] = [
  {
    id: "coupon-1",
    tenantId: "tenant-1",
    code: "REACT10",
    description: "10% off any React course — launch promo.",
    discountType: "percent",
    discountValue: 10,
    maxRedemptions: 500,
    redemptionCount: 142,
    maxRedemptionsPerUser: 1,
    minOrderCents: 1000,
    appliesToAllCourses: true,
    startsAt: daysAgo(30),
    expiresAt: daysAhead(30),
    isActive: true,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  },
  {
    id: "coupon-2",
    tenantId: "tenant-1",
    code: "LAUNCH20",
    description: "20% off — site-wide launch discount.",
    discountType: "percent",
    discountValue: 20,
    maxRedemptions: 1000,
    redemptionCount: 1000,
    maxRedemptionsPerUser: 1,
    appliesToAllCourses: true,
    startsAt: daysAgo(60),
    expiresAt: daysAgo(10),
    isActive: false,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(10),
  },
  {
    id: "coupon-3",
    tenantId: "tenant-1",
    code: "FRIENDS",
    description: "15% off for community referrals.",
    discountType: "percent",
    discountValue: 15,
    maxRedemptions: 200,
    redemptionCount: 38,
    appliesToAllCourses: true,
    expiresAt: daysAhead(90),
    isActive: true,
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1),
  },
  {
    id: "coupon-4",
    tenantId: "tenant-1",
    code: "FLAT25",
    description: "$25 off orders over $100.",
    discountType: "fixed",
    discountValue: 2500,
    minOrderCents: 10000,
    maxRedemptions: 100,
    redemptionCount: 12,
    appliesToAllCourses: true,
    expiresAt: daysAhead(45),
    isActive: true,
    createdAt: daysAgo(8),
    updatedAt: daysAgo(8),
  },
  {
    id: "coupon-5",
    tenantId: "tenant-1",
    code: "WELCOME5",
    description: "$5 off your first order.",
    discountType: "fixed",
    discountValue: 500,
    maxRedemptions: 1000,
    redemptionCount: 421,
    appliesToAllCourses: true,
    expiresAt: daysAhead(180),
    isActive: true,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(3),
  },
];

export const MOCK_EARNINGS: EarningsSummary = {
  totalCents: 482_300,
  availableCents: 128_450,
  pendingCents: 18_900,
  paidOutCents: 334_950,
  currency: "usd",
  byCourse: [
    {
      courseId: "course-react-fundamentals",
      courseTitle: "React 19 Fundamentals",
      enrollments: 312,
      grossCents: 248_400,
      netCents: 223_560,
      commissionPct: 10,
    },
    {
      courseId: "course-react-perf",
      courseTitle: "Advanced React Performance",
      enrollments: 184,
      grossCents: 145_360,
      netCents: 130_824,
      commissionPct: 10,
    },
    {
      courseId: "course-tailwind-design",
      courseTitle: "Building Design Systems with Tailwind v4",
      enrollments: 96,
      grossCents: 66_240,
      netCents: 59_616,
      commissionPct: 10,
    },
    {
      courseId: "course-graphql",
      courseTitle: "GraphQL APIs with Apollo and React",
      enrollments: 23,
      grossCents: 22_770,
      netCents: 20_493,
      commissionPct: 10,
    },
  ],
  monthly: [
    { month: "Jan", revenueCents: 18_400 },
    { month: "Feb", revenueCents: 22_100 },
    { month: "Mar", revenueCents: 31_500 },
    { month: "Apr", revenueCents: 28_900 },
    { month: "May", revenueCents: 41_200 },
    { month: "Jun", revenueCents: 38_600 },
    { month: "Jul", revenueCents: 52_300 },
    { month: "Aug", revenueCents: 47_800 },
    { month: "Sep", revenueCents: 61_200 },
    { month: "Oct", revenueCents: 58_400 },
    { month: "Nov", revenueCents: 72_900 },
    { month: "Dec", revenueCents: 68_100 },
  ],
};

export const MOCK_PAYOUTS: InstructorPayout[] = [
  {
    id: "payout-1",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    periodStart: daysAgo(60),
    periodEnd: daysAgo(31),
    orderIds: ["order-5", "order-2"],
    grossCents: 128_450,
    commissionPct: 10,
    commissionCents: 12_845,
    feeCents: 0,
    netCents: 128_450,
    currency: "usd",
    status: "paid",
    paymentMethod: "bank_transfer",
    paymentRef: "ba_txn_84201",
    paidAt: daysAgo(30),
    createdAt: daysAgo(35),
    updatedAt: daysAgo(30),
  },
  {
    id: "payout-2",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    periodStart: daysAgo(90),
    periodEnd: daysAgo(61),
    orderIds: ["order-1"],
    grossCents: 94_280,
    commissionPct: 10,
    commissionCents: 9_428,
    feeCents: 0,
    netCents: 94_280,
    currency: "usd",
    status: "paid",
    paymentMethod: "bank_transfer",
    paymentRef: "ba_txn_81342",
    paidAt: daysAgo(60),
    createdAt: daysAgo(65),
    updatedAt: daysAgo(60),
  },
  {
    id: "payout-3",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    periodStart: daysAgo(30),
    periodEnd: daysAgo(1),
    orderIds: ["order-3"],
    grossCents: 18_900,
    commissionPct: 10,
    commissionCents: 1_890,
    feeCents: 0,
    netCents: 18_900,
    currency: "usd",
    status: "pending",
    paymentMethod: "bank_transfer",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
];

// ----------------------------------------------------------------------
// Fetch-with-fallback helpers
// ----------------------------------------------------------------------

/**
 * Try a real API call; on any failure (network / 4xx / 5xx / parse), resolve
 * with the supplied mock payload instead. The component never sees an error
 * from these read paths — it just gets data, real or mock.
 */
async function withFallback<T>(
  call: () => Promise<T>,
  mock: T,
): Promise<T> {
  try {
    const result = await call();
    // Some endpoints return null/empty when nothing exists yet — keep mock in
    // that case so the dev UI is still demonstrable.
    if (result == null) return mock;
    if (Array.isArray(result) && result.length === 0) return mock;
    return result;
  } catch {
    return mock;
  }
}

/** `GET /api/lms/cart` — fetch the current user's cart. */
export function fetchCart(): Promise<Cart> {
  return withFallback<Cart>(
    async () => (await lmsAxios.get<Cart>("/cart")).data,
    MOCK_CART,
  );
}

/** `GET /api/lms/orders` — list the current user's order history. */
export function fetchOrders(): Promise<Order[]> {
  return withFallback<Order[]>(
    async () => {
      const res = await lmsAxios.get<Order[] | { data?: Order[] }>("/orders");
      const data = res.data;
      return Array.isArray(data) ? data : (data?.data ?? MOCK_ORDERS);
    },
    MOCK_ORDERS,
  );
}

/** `GET /api/lms/coupons` — list all coupons (admin/instructor view). */
export function fetchCoupons(): Promise<Coupon[]> {
  return withFallback<Coupon[]>(
    async () => {
      const res = await lmsAxios.get<Coupon[] | { data?: Coupon[] }>(
        "/coupons",
      );
      const data = res.data;
      return Array.isArray(data) ? data : (data?.data ?? MOCK_COUPONS);
    },
    MOCK_COUPONS,
  );
}

/** `GET /api/lms/instructor/earnings` — instructor earnings summary. */
export function fetchEarnings(): Promise<EarningsSummary> {
  return withFallback<EarningsSummary>(
    async () =>
      (await lmsAxios.get<EarningsSummary>("/instructor/earnings")).data,
    MOCK_EARNINGS,
  );
}

/** `GET /api/lms/instructor/payouts` — instructor payout history. */
export function fetchPayouts(): Promise<InstructorPayout[]> {
  return withFallback<InstructorPayout[]>(
    async () => {
      const res = await lmsAxios.get<
        InstructorPayout[] | { data?: InstructorPayout[] }
      >("/instructor/payouts");
      const data = res.data;
      return Array.isArray(data) ? data : (data?.data ?? MOCK_PAYOUTS);
    },
    MOCK_PAYOUTS,
  );
}

// ----------------------------------------------------------------------
// Pure helpers shared across screens
// ----------------------------------------------------------------------

/**
 * Maps an `Order.status` literal to a tailux Badge color + display label.
 * Used by both the order list and the order detail view.
 */
export function orderStatusMeta(
  status: Order["status"],
): { color: "success" | "warning" | "error" | "neutral"; label: string } {
  switch (status) {
    case "paid":
      return { color: "success", label: "Paid" };
    case "pending":
      return { color: "warning", label: "Pending" };
    case "failed":
      return { color: "error", label: "Failed" };
    case "refunded":
      return { color: "neutral", label: "Refunded" };
    case "canceled":
      return { color: "neutral", label: "Canceled" };
    default:
      return { color: "neutral", label: status };
  }
}

/**
 * Maps an `InstructorPayout.status` literal to a Badge color + label.
 */
export function payoutStatusMeta(
  status: InstructorPayout["status"],
): { color: "success" | "warning" | "error" | "neutral" | "info"; label: string } {
  switch (status) {
    case "paid":
      return { color: "success", label: "Paid" };
    case "pending":
      return { color: "warning", label: "Pending" };
    case "approved":
      return { color: "info", label: "Approved" };
    case "failed":
      return { color: "error", label: "Failed" };
    case "canceled":
      return { color: "neutral", label: "Canceled" };
    default:
      return { color: "neutral", label: status };
  }
}

/**
 * Compute the discount (in cents) a coupon applies to a given subtotal.
 * Returns 0 for invalid / expired / below-minimum coupons.
 */
export function computeDiscount(
  coupon: Coupon | undefined,
  subtotalCents: number,
): number {
  if (!coupon || !coupon.isActive) return 0;
  if (coupon.expiresAt && new Date(coupon.expiresAt) < now) return 0;
  if (coupon.startsAt && new Date(coupon.startsAt) > now) return 0;
  if (coupon.minOrderCents && subtotalCents < coupon.minOrderCents) return 0;

  let discount = 0;
  if (coupon.discountType === "percent") {
    discount = Math.round((subtotalCents * coupon.discountValue) / 100);
  } else {
    discount = coupon.discountValue;
  }
  if (coupon.maxDiscountCents && discount > coupon.maxDiscountCents) {
    discount = coupon.maxDiscountCents;
  }
  if (discount > subtotalCents) discount = subtotalCents;
  return discount;
}

/** Lookup a coupon by code from a list (used by cart / checkout). */
export function findCouponByCode(
  coupons: Coupon[],
  code: string,
): Coupon | undefined {
  const normalized = code.trim().toUpperCase();
  return coupons.find((c) => c.code.toUpperCase() === normalized);
}

/** Build a `Course`-shaped stub from a `CartItem` (for `CourseThumbnail`). */
export function cartItemToCourse(item: CartItem): Course {
  return {
    id: item.courseId,
    tenantId: "tenant-1",
    instructorId: "instr-1",
    title: item.title,
    slug: item.courseId,
    description: item.excerpt ?? "",
    excerpt: item.excerpt,
    featuredImage: item.featuredImage,
    status: "published",
    priceType: "paid",
    priceCents: item.priceCents,
    compareAtCents: item.compareAtCents,
    currency: item.currency ?? "usd",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 0,
    ratingAvg: 0,
    ratingCount: 0,
    createdAt: item.addedAt,
    updatedAt: item.addedAt,
  };
}
