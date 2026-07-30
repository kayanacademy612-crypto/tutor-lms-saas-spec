// FAQ section.
//
// Accordion of common pre-sales questions. Uses the project's Accordion
// primitive so keyboard navigation, animation, and accessibility are
// handled for free.

// Import Dependencies
import { useState } from "react";
import clsx from "clsx";
import { ChevronDownIcon } from "@heroicons/react/24/outline";

// Local Imports
import {
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
} from "@/components/ui";

// ----------------------------------------------------------------------

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: "free-trial",
    question: "How does the free trial work?",
    answer:
      "Sign up with your email — no credit card required. You get full access to every feature for 14 days. At the end of the trial, pick a plan that fits your academy or let it expire. We'll never charge you automatically.",
  },
  {
    id: "migration",
    question: "Can I migrate from another LMS?",
    answer:
      "Yes. Our migration wizard imports courses, students, and progress from Moodle, Teachable, Thinkific, and Canvas. CSV import is also available for everything else. White-glove migration is included on Enterprise plans.",
  },
  {
    id: "multi-instructor",
    question: "Do you support multiple instructors?",
    answer:
      "Absolutely. Professional and Enterprise plans include multiple instructor seats with role-based permissions, revenue sharing, and per-instructor analytics. Each instructor gets their own dashboard and payout statements.",
  },
  {
    id: "payments",
    question: "What payment methods are supported?",
    answer:
      "We integrate with Stripe and PayPal out of the box — accept credit cards, Apple Pay, Google Pay, and PayPal balances. Subscriptions, one-time purchases, bundles, coupons, and gift cards are all built in.",
  },
  {
    id: "security",
    question: "Is my data secure?",
    answer:
      "Yes. All traffic is encrypted in transit (TLS 1.3) and at rest (AES-256). We're SOC 2 Type II compliant, run nightly backups, and isolate every tenant's data. SSO with SAML is available on Enterprise plans.",
  },
  {
    id: "branding",
    question: "Can I customize the branding?",
    answer:
      "Yes. Upload your logo, set brand colors, and use a custom subdomain (yourschool.tailux.app) on every plan. Enterprise customers get a fully white-labeled experience on their own domain with no Tailux branding.",
  },
];

// ----------------------------------------------------------------------

export function FAQ() {
  const [value, setValue] = useState<string>("free-trial");

  return (
    <section className="bg-white dark:bg-dark-900">
      <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
        {/* Heading */}
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            FAQ
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900 dark:text-dark-50 sm:text-4xl">
            Frequently asked questions
          </h2>
          <p className="mt-4 text-base text-gray-600 dark:text-dark-200 sm:text-lg">
            Have something else on your mind?{" "}
            <a
              href="mailto:hello@tailux.app"
              className="font-semibold text-primary-600 underline-offset-2 hover:underline dark:text-primary-400"
            >
              Reach out to our team
            </a>
            .
          </p>
        </div>

        {/* Accordion */}
        <Accordion
          value={value}
          onChange={setValue}
          className="mt-10 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white px-2 dark:divide-dark-600 dark:border-dark-600 dark:bg-dark-750"
        >
          {FAQS.map((item) => (
            <AccordionItem key={item.id} value={item.id} className="px-4">
              <AccordionButton className="flex w-full items-center justify-between gap-3 py-5 text-left">
                {({ open }: { open: boolean }) => (
                  <>
                    <span
                      className={clsx(
                        "text-sm font-semibold transition-colors sm:text-base",
                        open
                          ? "text-primary-600 dark:text-primary-400"
                          : "text-gray-900 dark:text-dark-50",
                      )}
                    >
                      {item.question}
                    </span>
                    <ChevronDownIcon
                      className={clsx(
                        "size-5 shrink-0 stroke-2 text-gray-400 transition-transform duration-200 dark:text-dark-300",
                        open && "rotate-180 text-primary-600 dark:text-primary-400",
                      )}
                    />
                  </>
                )}
              </AccordionButton>
              <AccordionPanel className="pb-5">
                <p className="text-sm leading-relaxed text-gray-600 dark:text-dark-200">
                  {item.answer}
                </p>
              </AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

export default FAQ;
