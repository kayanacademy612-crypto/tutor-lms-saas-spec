// Storefront landing page — the tenant's school homepage.
//
// Layout: full-width marketing sections, no sidebar.
//   1. Hero            — `Hero.tsx`
//   2. Stats banner    — inline (mock stats: students / courses / rating)
//   3. Featured courses — `FeaturedCourses.tsx` (uses useCourses)
//   4. Membership preview — `MembershipPreview.tsx` (uses lmsApi.membership.list)
//   5. Bundle offers   — `BundlePreview.tsx` (uses lmsApi.bundle.list)
//   6. Testimonials    — inline (3 mock student quotes)
//   7. CTA footer      — inline "Start Learning Today" banner
//
// All remote sections have graceful empty/loading states so the page is
// always usable even when the API is unreachable.

// Import Dependencies
import { useEffect, useState, ComponentType } from "react";
import { useNavigate } from "react-router";
import {
  UsersIcon,
  AcademicCapIcon,
  StarIcon,
  ArrowRightIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card } from "@/components/ui";
import { useCourses } from "@/hooks/useLms";
import { lmsApi } from "@/services/lms-api";
import type { LmsApiError } from "@/services/lms-api";
import type { CourseBundle, Membership } from "@/types/lms";

import { Hero } from "./Hero";
import { FeaturedCourses } from "./FeaturedCourses";
import { MembershipPreview } from "./MembershipPreview";
import { BundlePreview } from "./BundlePreview";

// ----------------------------------------------------------------------

/** Mock stats shown in the second section (kept inline — there's no API). */
const STATS: Array<{
  icon: ComponentType<{ className?: string }>;
  value: string;
  label: string;
}> = [
  { icon: UsersIcon, value: "500+", label: "Active students" },
  { icon: AcademicCapIcon, value: "50+", label: "Published courses" },
  { icon: StarIcon, value: "4.8", label: "Average rating" },
];

/** Mock student testimonials. */
const TESTIMONIALS: Array<{
  quote: string;
  name: string;
  role: string;
  initials: string;
}> = [
  {
    quote:
      "I went from zero to landing my first dev job in 9 months. The React and TypeScript courses are pure gold.",
    name: "Maya Rodriguez",
    role: "Junior Frontend Engineer",
    initials: "MR",
  },
  {
    quote:
      "The instructors actually care. I asked one question in a Q&A panel and got a 10-minute video reply the next day.",
    name: "Daniel Kim",
    role: "Product Designer",
    initials: "DK",
  },
  {
    quote:
      "The membership pays for itself within a week. New courses every month and the certificate got me a promotion.",
    name: "Priya Sharma",
    role: "Data Analyst",
    initials: "PS",
  },
];

// ----------------------------------------------------------------------

export default function Storefront() {
  const navigate = useNavigate();

  // Featured courses
  const {
    data: coursesData,
    loading: coursesLoading,
    error: coursesError,
  } = useCourses();

  // Bundles
  const [bundles, setBundles] = useState<CourseBundle[]>([]);
  const [bundlesLoading, setBundlesLoading] = useState<boolean>(true);

  // Memberships
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipsLoading, setMembershipsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await lmsApi.bundle.list();
        if (cancelled) return;
        setBundles(Array.isArray(result) ? result : []);
      } catch {
        if (!cancelled) setBundles([]);
      } finally {
        if (!cancelled) setBundlesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await lmsApi.membership.list();
        if (cancelled) return;
        setMemberships(Array.isArray(result) ? result : []);
      } catch {
        if (!cancelled) setMemberships([]);
      } finally {
        if (!cancelled) setMembershipsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Only show published, featured courses first (fallback to all published).
  const publishedCourses = (coursesData ?? []).filter(
    (c) => c.status === "published",
  );
  const featured = [
    ...publishedCourses.filter((c) => c.isFeatured),
    ...publishedCourses.filter((c) => !c.isFeatured),
  ];

  return (
    <Page title="Storefront">
      <div className="min-h-screen bg-white dark:bg-dark-900">
        {/* 1. Hero */}
        <Hero />

        {/* 2. Stats banner */}
        <section className="border-y border-gray-200 bg-gray-50 dark:border-dark-600 dark:bg-dark-800">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-6 py-10 sm:grid-cols-3">
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="flex items-center justify-center gap-3 text-center sm:text-left"
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
                    <Icon className="size-6 stroke-2" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-dark-50">
                      {s.value}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-300">
                      {s.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Featured courses */}
        <FeaturedCourses
          courses={featured}
          loading={coursesLoading}
          error={coursesError as LmsApiError | unknown}
          limit={6}
        />

        {/* 4. Membership preview (collapses if no memberships) */}
        <MembershipPreview
          memberships={memberships}
          loading={membershipsLoading}
        />

        {/* 5. Bundle offers (collapses if no bundles) */}
        <BundlePreview bundles={bundles} loading={bundlesLoading} limit={3} />

        {/* 6. Testimonials */}
        <section className="bg-gray-50 dark:bg-dark-800">
          <div className="mx-auto max-w-7xl px-6 py-16">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-50">
                Loved by learners worldwide
              </h2>
              <p className="mt-2 text-sm text-gray-500 dark:text-dark-300">
                Real stories from students who leveled up their careers.
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <Card key={t.name} className="p-6" skin="bordered">
                  <div className="mb-3 flex items-center gap-1 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <StarIcon
                        key={i}
                        className="size-4 fill-amber-400 stroke-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-gray-700 dark:text-dark-100">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-primary-500/10 text-sm font-bold text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
                      {t.initials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-dark-50">
                        {t.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-300">
                        {t.role}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* 7. CTA footer */}
        <section className="bg-gradient-to-br from-primary-500 to-primary-600 px-6 py-16 dark:from-primary-600 dark:to-primary-700">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center text-white">
            <SparklesIcon className="size-10 stroke-2" />
            <h2 className="mt-4 text-3xl font-extrabold sm:text-4xl">
              Start Learning Today
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/85 sm:text-base">
              Join thousands of students already leveling up. Your first course
              is on us.
            </p>
            <Button
              color="neutral"
              variant="filled"
              className="mt-7 gap-2 bg-white px-6 py-3 text-sm font-semibold text-primary-700 hover:bg-white/90"
              onClick={() => navigate("/apps/catalog")}
            >
              Browse Courses
              <ArrowRightIcon className="size-4 stroke-2" />
            </Button>
          </div>
        </section>
      </div>
    </Page>
  );
}
