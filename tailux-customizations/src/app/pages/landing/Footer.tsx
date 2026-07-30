// Footer.
//
// Logo + tagline, two link columns (Product & Company), a legal row, and
// social media icons. All built from inline SVGs so no extra image
// assets are required.

// Import Dependencies
import { useNavigate } from "react-router";

// Local Imports
import { APP_NAME } from "@/constants/app";

// ----------------------------------------------------------------------

const PRODUCT_LINKS: Array<{ label: string; href: string }> = [
  { label: "Features", href: "#feature-showcase" },
  { label: "Pricing", href: "#pricing" },
  { label: "Demo", href: "#feature-showcase" },
  { label: "Sign Up", href: "/signup" },
  { label: "Log In", href: "/login" },
];

const COMPANY_LINKS: Array<{ label: string; href: string }> = [
  { label: "About", href: "#" },
  { label: "Blog", href: "#" },
  { label: "Contact", href: "mailto:hello@tailux.app" },
  { label: "Privacy Policy", href: "#" },
  { label: "Terms of Service", href: "#" },
];

// ----------------------------------------------------------------------

export function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-800">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-4">
          {/* Brand */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2"
            >
              <span className="flex size-9 items-center justify-center rounded-lg bg-primary-600 text-white shadow-soft dark:bg-primary-500">
                <AcademicCapGlyph />
              </span>
              <span className="text-lg font-extrabold text-gray-900 dark:text-dark-50">
                {APP_NAME}
              </span>
            </button>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-500 dark:text-dark-300">
              The all-in-one LMS platform for schools, instructors, and creators.
              Build courses, accept payments, issue certificates, and grow your
              education business — all in one place.
            </p>

            {/* Social */}
            <div className="mt-6 flex items-center gap-3">
              <SocialButton label="Twitter / X">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </SocialButton>
              <SocialButton label="LinkedIn">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
                </svg>
              </SocialButton>
              <SocialButton label="GitHub">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
              </SocialButton>
              <SocialButton label="YouTube">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-4">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </SocialButton>
            </div>
          </div>

          {/* Product links */}
          <nav>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-dark-50">
              Product
            </h3>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-500 transition-colors hover:text-primary-600 dark:text-dark-300 dark:hover:text-primary-400"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Company links */}
          <nav>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-dark-50">
              Company
            </h3>
            <ul className="mt-4 space-y-2.5">
              {COMPANY_LINKS.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-500 transition-colors hover:text-primary-600 dark:text-dark-300 dark:hover:text-primary-400"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-gray-200 pt-6 dark:border-dark-600 sm:flex-row">
          <p className="text-xs text-gray-500 dark:text-dark-300">
            © {year} {APP_NAME}. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-xs text-gray-500 dark:text-dark-300">
            <a
              href="#"
              className="transition-colors hover:text-primary-600 dark:hover:text-primary-400"
            >
              Privacy Policy
            </a>
            <a
              href="#"
              className="transition-colors hover:text-primary-600 dark:hover:text-primary-400"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ----------------------------------------------------------------------

function AcademicCapGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="size-5">
      <path d="M11.7 2.805a.75.75 0 0 1 .6 0A60.65 60.65 0 0 1 22.83 8.72a.75.75 0 0 1-.231 1.353 46.915 46.915 0 0 0-8.078 2.375.75.75 0 0 1-.532 0 46.915 46.915 0 0 0-8.078-2.375.75.75 0 0 1-.231-1.353A60.65 60.65 0 0 1 11.7 2.805Z" />
      <path d="M13.06 15.476a.75.75 0 0 1-.292-1.014 6.014 6.014 0 0 1 4.515-3.156.75.75 0 0 1 .219 1.484 4.513 4.513 0 0 0-3.388 2.363.75.75 0 0 1-1.053.323Z" />
      <path d="M12 5.875c-2.342 0-4.534.683-6.4 1.854l2.16 1.16a8.95 8.95 0 0 1 8.48 0l2.16-1.16A12.6 12.6 0 0 0 12 5.875Z" />
      <path d="M7.5 14.25v3.375c0 .621.504 1.125 1.125 1.125h6.75c.621 0 1.125-.504 1.125-1.125V14.25L12 16.5l-4.5-2.25Z" />
    </svg>
  );
}

function SocialButton({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href="#"
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-lg border border-gray-200 text-gray-500 transition-all hover:border-primary-300 hover:text-primary-600 dark:border-dark-600 dark:text-dark-300 dark:hover:border-primary-500/40 dark:hover:text-primary-400"
    >
      {children}
    </a>
  );
}

export default Footer;
