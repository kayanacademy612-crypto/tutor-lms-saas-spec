// Course Catalog — main browse page.
//
// Layout: header (title + count) → toolbar (search + sort) → two-column body
//   1. Left sidebar  — `CategoryFilter` (category / difficulty / price / rating)
//   2. Main area     — `CourseGrid` of courses matching the active filters.
//
// Mock data lives in this file so the catalog is always usable in dev (the
// LMS API is wired up in `services/lms-api.ts` but not every backend field
// is populated yet). Sort modes: popular (enrolledCount), newest (createdAt),
// price (priceCents asc).

// Import Dependencies
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  XMarkIcon,
  AcademicCapIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Input, Select } from "@/components/ui";
import { CourseGrid } from "@/components/lms";
import type { Course } from "@/types/lms";

import {
  CategoryFilter,
  type CatalogFilters,
} from "./CategoryFilter";

// ----------------------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return iso(d);
};

/** Mock categories shown in the sidebar. */
const MOCK_CATEGORIES: {
  id: string;
  name: string;
  courseCount?: number;
}[] = [
  { id: "cat-development", name: "Web Development", courseCount: 4 },
  { id: "cat-design", name: "Design", courseCount: 2 },
  { id: "cat-data", name: "Data Science", courseCount: 2 },
  { id: "cat-marketing", name: "Marketing", courseCount: 2 },
  { id: "cat-business", name: "Business", courseCount: 1 },
  { id: "cat-photography", name: "Photography", courseCount: 1 },
];

/** Mock courses for the catalog grid. */
const MOCK_COURSES: Course[] = [
  {
    id: "course-react-fundamentals",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    title: "React 19 Fundamentals: Hooks, Suspense, and Server Components",
    slug: "react-19-fundamentals",
    description:
      "Master modern React from the ground up — hooks, Suspense, server components, and the new use() hook. Built for developers who want to ship production apps.",
    excerpt: "Hooks, Suspense, Server Components, and the new use() hook.",
    featuredImage: "",
    status: "published",
    priceType: "paid",
    priceCents: 8900,
    compareAtCents: 12900,
    currency: "usd",
    difficulty: "beginner",
    categoryId: "cat-development",
    isFeatured: true,
    isPublic: true,
    enrolledCount: 12450,
    ratingAvg: 4.8,
    ratingCount: 1240,
    durationSeconds: 86400,
    language: "English",
    publishedAt: daysAgo(120),
    createdAt: daysAgo(150),
    updatedAt: daysAgo(5),
  },
  {
    id: "course-ts-mastery",
    tenantId: "tenant-1",
    instructorId: "instr-2",
    title: "TypeScript Mastery: From Generics to Advanced Types",
    slug: "typescript-mastery",
    description:
      "Go beyond `any`. Learn conditional types, mapped types, template literal types, and how to design type-safe APIs that your future self will thank you for.",
    excerpt: "Conditional, mapped, and template literal types — deeply.",
    featuredImage: "",
    status: "published",
    priceType: "paid",
    priceCents: 9900,
    currency: "usd",
    difficulty: "advanced",
    categoryId: "cat-development",
    isFeatured: true,
    isPublic: true,
    enrolledCount: 5230,
    ratingAvg: 4.7,
    ratingCount: 612,
    durationSeconds: 72000,
    language: "English",
    publishedAt: daysAgo(80),
    createdAt: daysAgo(110),
    updatedAt: daysAgo(2),
  },
  {
    id: "course-figma-design",
    tenantId: "tenant-1",
    instructorId: "instr-3",
    title: "Figma for Product Designers: Systems, Variants & Auto-Layout",
    slug: "figma-design-systems",
    description:
      "Build a scalable design system in Figma. Variants, auto-layout, components, tokens, and the handoff workflow your engineers will love.",
    excerpt: "Systems, Variants, Auto-Layout, and a clean handoff.",
    featuredImage: "",
    status: "published",
    priceType: "paid",
    priceCents: 6900,
    compareAtCents: 9900,
    currency: "usd",
    difficulty: "intermediate",
    categoryId: "cat-design",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 8900,
    ratingAvg: 4.6,
    ratingCount: 980,
    durationSeconds: 54000,
    language: "English",
    publishedAt: daysAgo(200),
    createdAt: daysAgo(230),
    updatedAt: daysAgo(30),
  },
  {
    id: "course-python-data",
    tenantId: "tenant-1",
    instructorId: "instr-4",
    title: "Python for Data Science: Pandas, NumPy & Visualization",
    slug: "python-data-science",
    description:
      "A hands-on intro to data analysis in Python. Pandas, NumPy, Matplotlib, Seaborn, and a real-world project on a public dataset.",
    excerpt: "Pandas, NumPy, and beautiful visualizations.",
    featuredImage: "",
    status: "published",
    priceType: "free",
    priceCents: 0,
    currency: "usd",
    difficulty: "beginner",
    categoryId: "cat-data",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 21000,
    ratingAvg: 4.5,
    ratingCount: 3200,
    durationSeconds: 90000,
    language: "English",
    publishedAt: daysAgo(360),
    createdAt: daysAgo(400),
    updatedAt: daysAgo(60),
  },
  {
    id: "course-digital-marketing",
    tenantId: "tenant-1",
    instructorId: "instr-5",
    title: "Digital Marketing Bootcamp: SEO, SEM & Social in 2025",
    slug: "digital-marketing-bootcamp",
    description:
      "The complete digital marketing playbook: keyword research, paid search, social funnels, and analytics that actually drive decisions.",
    excerpt: "SEO, SEM, social, and analytics that drive decisions.",
    featuredImage: "",
    status: "published",
    priceType: "paid",
    priceCents: 7500,
    currency: "usd",
    difficulty: "intermediate",
    categoryId: "cat-marketing",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 6700,
    ratingAvg: 4.4,
    ratingCount: 410,
    durationSeconds: 64000,
    language: "English",
    publishedAt: daysAgo(45),
    createdAt: daysAgo(70),
    updatedAt: daysAgo(10),
  },
  {
    id: "course-photography-101",
    tenantId: "tenant-1",
    instructorId: "instr-6",
    title: "Photography 101: From Manual Mode to Composition",
    slug: "photography-101",
    description:
      "Stop using Auto mode. Understand the exposure triangle, master composition, and learn to edit your photos with intent.",
    excerpt: "Exposure triangle, composition, and intentional editing.",
    featuredImage: "",
    status: "published",
    priceType: "free",
    priceCents: 0,
    currency: "usd",
    difficulty: "beginner",
    categoryId: "cat-photography",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 15300,
    ratingAvg: 4.7,
    ratingCount: 2100,
    durationSeconds: 43200,
    language: "English",
    publishedAt: daysAgo(300),
    createdAt: daysAgo(330),
    updatedAt: daysAgo(15),
  },
  {
    id: "course-sql-analytics",
    tenantId: "tenant-1",
    instructorId: "instr-4",
    title: "SQL for Analytics: Window Functions, CTEs & Performance",
    slug: "sql-for-analytics",
    description:
      "Write SQL like an analyst. Window functions, recursive CTEs, query plans, and the patterns you'll use every day.",
    excerpt: "Window functions, CTEs, and query plans that sing.",
    featuredImage: "",
    status: "published",
    priceType: "paid",
    priceCents: 5900,
    currency: "usd",
    difficulty: "intermediate",
    categoryId: "cat-data",
    isFeatured: true,
    isPublic: true,
    enrolledCount: 4200,
    ratingAvg: 4.8,
    ratingCount: 380,
    durationSeconds: 54000,
    language: "English",
    publishedAt: daysAgo(20),
    createdAt: daysAgo(40),
    updatedAt: daysAgo(1),
  },
  {
    id: "course-startup-business",
    tenantId: "tenant-1",
    instructorId: "instr-7",
    title: "From Idea to MVP: A Founder's Practical Playbook",
    slug: "idea-to-mvp",
    description:
      "Validate, prototype, and ship. A no-fluff playbook for first-time founders who want to launch in 90 days.",
    excerpt: "Validate, prototype, and ship in 90 days.",
    featuredImage: "",
    status: "published",
    priceType: "paid",
    priceCents: 11900,
    compareAtCents: 14900,
    currency: "usd",
    difficulty: "intermediate",
    categoryId: "cat-business",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 1800,
    ratingAvg: 4.6,
    ratingCount: 145,
    durationSeconds: 36000,
    language: "English",
    publishedAt: daysAgo(10),
    createdAt: daysAgo(25),
    updatedAt: daysAgo(3),
  },
  {
    id: "course-tailwind-pro",
    tenantId: "tenant-1",
    instructorId: "instr-2",
    title: "Tailwind CSS v4 Pro: Build Beautiful UIs Fast",
    slug: "tailwind-css-pro",
    description:
      "Master Tailwind v4 — the new engine, the @theme directive, and design patterns for production apps. Includes a real portfolio build.",
    excerpt: "The new v4 engine + patterns for production UIs.",
    featuredImage: "",
    status: "published",
    priceType: "paid",
    priceCents: 6900,
    currency: "usd",
    difficulty: "intermediate",
    categoryId: "cat-development",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 3400,
    ratingAvg: 4.9,
    ratingCount: 290,
    durationSeconds: 48000,
    language: "English",
    publishedAt: daysAgo(60),
    createdAt: daysAgo(90),
    updatedAt: daysAgo(7),
  },
  {
    id: "course-content-strategy",
    tenantId: "tenant-1",
    instructorId: "instr-5",
    title: "Content Strategy for SaaS: From Blog to Lifecycle Emails",
    slug: "content-strategy-saas",
    description:
      "Build a content engine that compounds. Editorial calendar, SEO mapping, and lifecycle email sequences that convert.",
    excerpt: "Editorial calendar, SEO mapping, lifecycle emails.",
    featuredImage: "",
    status: "published",
    priceType: "free",
    priceCents: 0,
    currency: "usd",
    difficulty: "beginner",
    categoryId: "cat-marketing",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 2200,
    ratingAvg: 4.3,
    ratingCount: 167,
    durationSeconds: 28800,
    language: "English",
    publishedAt: daysAgo(180),
    createdAt: daysAgo(210),
    updatedAt: daysAgo(40),
  },
  {
    id: "course-ux-research",
    tenantId: "tenant-1",
    instructorId: "instr-3",
    title: "UX Research Methods: Interviews, Surveys & Usability Tests",
    slug: "ux-research-methods",
    description:
      "Turn user insights into product decisions. Learn the methods, when to use each, and how to synthesize findings your team will act on.",
    excerpt: "Interviews, surveys, usability tests, synthesis.",
    featuredImage: "",
    status: "published",
    priceType: "paid",
    priceCents: 7900,
    currency: "usd",
    difficulty: "intermediate",
    categoryId: "cat-design",
    isFeatured: true,
    isPublic: true,
    enrolledCount: 2950,
    ratingAvg: 4.7,
    ratingCount: 220,
    durationSeconds: 50400,
    language: "English",
    publishedAt: daysAgo(35),
    createdAt: daysAgo(55),
    updatedAt: daysAgo(4),
  },
  {
    id: "course-vite-deploy",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    title: "Ship It: Vite, CI/CD & Edge Deploys for React Apps",
    slug: "vite-cicd-deploy",
    description:
      "From `pnpm dev` to a global edge deploy. Set up CI, preview branches, and ship with confidence.",
    excerpt: "Vite, CI/CD, preview branches, edge deploys.",
    featuredImage: "",
    status: "published",
    priceType: "free",
    priceCents: 0,
    currency: "usd",
    difficulty: "advanced",
    categoryId: "cat-development",
    isFeatured: false,
    isPublic: true,
    enrolledCount: 1900,
    ratingAvg: 4.6,
    ratingCount: 142,
    durationSeconds: 21600,
    language: "English",
    publishedAt: daysAgo(5),
    createdAt: daysAgo(15),
    updatedAt: daysAgo(1),
  },
];

// ----------------------------------------------------------------------

type SortMode = "popular" | "newest" | "price";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "popular", label: "Most Popular" },
  { value: "newest", label: "Newest" },
  { value: "price", label: "Price (Low to High)" },
];

const DEFAULT_FILTERS: CatalogFilters = {
  categories: [],
  difficulty: "all",
  price: "all",
  rating: "all",
};

// ----------------------------------------------------------------------

export default function CourseCatalogPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortMode>("popular");
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  /** Apply search + filters to the mock course list. */
  const filtered = useMemo(() => {
    let out = MOCK_COURSES.slice();

    // Search
    const q = search.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.excerpt ?? "").toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      );
    }

    // Categories
    if (filters.categories.length > 0) {
      out = out.filter(
        (c) => c.categoryId && filters.categories.includes(c.categoryId),
      );
    }

    // Difficulty
    if (filters.difficulty !== "all") {
      out = out.filter((c) => c.difficulty === filters.difficulty);
    }

    // Price
    if (filters.price === "free") {
      out = out.filter(
        (c) => c.priceType === "free" || c.priceCents === 0,
      );
    } else if (filters.price === "paid") {
      out = out.filter(
        (c) => c.priceType !== "free" && c.priceCents > 0,
      );
    }

    // Rating
    if (filters.rating === "4+") {
      out = out.filter((c) => c.ratingAvg >= 4);
    } else if (filters.rating === "4.5+") {
      out = out.filter((c) => c.ratingAvg >= 4.5);
    }

    // Sort
    if (sort === "popular") {
      out.sort((a, b) => b.enrolledCount - a.enrolledCount);
    } else if (sort === "newest") {
      out.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else if (sort === "price") {
      out.sort((a, b) => a.priceCents - b.priceCents);
    }

    return out;
  }, [search, sort, filters]);

  const handleFilterChange = (next: Partial<CatalogFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  };

  const handleReset = () => setFilters(DEFAULT_FILTERS);

  const handleCourseClick = (course: Course) => {
    // Encode the course id in the query string so CourseDetailPage can read it.
    void course;
    navigate("/apps/course-detail");
  };

  return (
    <Page title="Course Catalog">
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        {/* Top bar */}
        <header className="border-b border-gray-200 bg-white px-5 py-4 dark:border-dark-600 dark:bg-dark-750">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary-500 text-white">
                <AcademicCapIcon className="size-6 stroke-2" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                  Course Catalog
                </h1>
                <p className="text-xs text-gray-500 dark:text-dark-300">
                  {filtered.length} of {MOCK_COURSES.length} courses available
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outlined"
                color="primary"
                className="gap-1.5 lg:hidden"
                onClick={() => setMobileFiltersOpen((v) => !v)}
              >
                <AdjustmentsHorizontalIcon className="size-4" />
                Filters
              </Button>
            </div>
          </div>
        </header>

        {/* Toolbar: search + sort */}
        <div className="border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Search courses by title, topic, or description…"
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setSearch(e.target.value)
              }
              prefix={<MagnifyingGlassIcon className="size-5" />}
              suffix={
                search ? (
                  <Button
                    unstyled
                    type="button"
                    aria-label="Clear search"
                    onClick={() => setSearch("")}
                    className="pointer-events-auto flex h-full w-9 items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-dark-100"
                  >
                    <XMarkIcon className="size-4" />
                  </Button>
                ) : undefined
              }
              classNames={{
                root: "flex-1",
                wrapper: "h-10",
              }}
            />
            <div className="flex items-center gap-2">
              <span className="hidden text-xs font-medium text-gray-500 dark:text-dark-300 sm:inline">
                Sort by
              </span>
              <Select
                value={sort}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSort(e.target.value as SortMode)
                }
                data={SORT_OPTIONS.map((o) => ({
                  label: o.label,
                  value: o.value,
                }))}
                classNames={{ root: "sm:w-56", wrapper: "h-10" }}
              />
            </div>
          </div>
        </div>

        {/* Body: sidebar + grid */}
        <div className="mx-auto max-w-7xl px-5 py-6">
          <div className="flex gap-6">
            {/* Sidebar — desktop */}
            <aside className="hidden w-72 shrink-0 lg:block">
              <CategoryFilter
                categories={MOCK_CATEGORIES}
                filters={filters}
                onChange={handleFilterChange}
                onReset={handleReset}
                className="sticky top-6 max-h-[calc(100vh-3rem)]"
              />
            </aside>

            {/* Sidebar — mobile drawer (inline collapse) */}
            {mobileFiltersOpen && (
              <div className="fixed inset-0 z-40 lg:hidden">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setMobileFiltersOpen(false)}
                />
                <div className="absolute left-0 top-0 h-full w-80 max-w-[85vw] bg-white p-3 dark:bg-dark-750">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700 dark:text-dark-100">
                      Filters
                    </span>
                    <Button
                      isIcon
                      variant="flat"
                      color="neutral"
                      onClick={() => setMobileFiltersOpen(false)}
                      className="size-8"
                    >
                      <XMarkIcon className="size-4" />
                    </Button>
                  </div>
                  <CategoryFilter
                    categories={MOCK_CATEGORIES}
                    filters={filters}
                    onChange={handleFilterChange}
                    onReset={handleReset}
                    className="h-[calc(100%-2.5rem)]"
                  />
                </div>
              </div>
            )}

            {/* Grid */}
            <main className="min-w-0 flex-1">
              {filtered.length === 0 ? (
                <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center" skin="bordered">
                  <div className="flex size-12 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-600">
                    <MagnifyingGlassIcon className="size-6 text-gray-400 dark:text-dark-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-100">
                    No courses match your filters
                  </h3>
                  <p className="max-w-sm text-xs text-gray-500 dark:text-dark-300">
                    Try removing a filter or clearing your search to see more
                    courses.
                  </p>
                  <Button
                    color="primary"
                    variant="soft"
                    className="mt-1 gap-1.5"
                    onClick={() => {
                      setSearch("");
                      handleReset();
                    }}
                  >
                    <ArrowPathMiniIcon />
                    Reset all
                  </Button>
                </Card>
              ) : (
                <CourseGrid
                  courses={filtered}
                  onCourseClick={handleCourseClick}
                  columns={3}
                  getInstructorName={() => undefined}
                  emptyTitle="No courses found"
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </Page>
  );
}

/** Small refresh icon used by the "Reset all" button (avoids prop drilling). */
function ArrowPathMiniIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={clsx("size-4")}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992V4.356M19.66 9.348A8.25 8.25 0 0 0 5.077 7.5m-1.1 7.152H0v4.992m1.1-4.992a8.25 8.25 0 0 0 14.583 1.848"
      />
    </svg>
  );
}

export { CourseCatalogPage };
