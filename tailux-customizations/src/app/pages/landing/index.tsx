// Tailux SaaS landing page — the marketing homepage at `/`.
//
// This page is the first thing a visitor sees. It's a full-width,
// no-sidebar marketing page composed of ten sections:
//   1. Hero              — `Hero.tsx`
//   2. StatsBar          — `StatsBar.tsx`
//   3. FeaturesGrid      — `FeaturesGrid.tsx`
//   4. HowItWorks        — `HowItWorks.tsx`
//   5. FeatureShowcase   — `FeatureShowcase.tsx` (id="feature-showcase")
//   6. Pricing           — `Pricing.tsx`
//   7. Testimonials      — `Testimonials.tsx`
//   8. FAQ               — `FAQ.tsx`
//   9. FinalCTA          — `FinalCTA.tsx`
//  10. Footer            — `Footer.tsx`
//
// Auth-aware: when the user is already authenticated, this route
// redirects to / (the protected root's RoleHomeRedirect bounces them to
// their role-specific dashboard). (See LandingRoute.tsx for the guard.)
//
// The page is intentionally NOT wrapped in the app's sidebar layout —
// it renders directly inside Root so it has the full viewport width.

// Import Dependencies
import { useEffect } from "react";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Hero } from "./Hero";
import { StatsBar } from "./StatsBar";
import { FeaturesGrid } from "./FeaturesGrid";
import { HowItWorks } from "./HowItWorks";
import { FeatureShowcase } from "./FeatureShowcase";
import { Pricing } from "./Pricing";
import { Testimonials } from "./Testimonials";
import { FAQ } from "./FAQ";
import { FinalCTA } from "./FinalCTA";
import { Footer } from "./Footer";

// ----------------------------------------------------------------------

export default function LandingPage() {
  // Smooth-scroll behaviour for in-page anchors (Hero "Watch Demo",
  // footer links to #pricing / #feature-showcase). Native CSS
  // `scroll-behavior: smooth` is enough for most browsers, but we set
  // it explicitly here so it applies even when the page is loaded
  // inside an iframe / Next.js reverse proxy.
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  return (
    <Page title="Launch Your Online Academy">
      <div className="min-h-screen bg-white dark:bg-dark-900">
        <Hero />
        <StatsBar />
        <FeaturesGrid />
        <HowItWorks />
        <FeatureShowcase />
        <Pricing />
        <Testimonials />
        <FAQ />
        <FinalCTA />
        <Footer />
      </div>
    </Page>
  );
}
