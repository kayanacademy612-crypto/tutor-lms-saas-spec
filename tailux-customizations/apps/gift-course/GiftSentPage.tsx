// GiftSentPage — confirmation page after a gift has been sent.
//
// Reached either:
//   - via `useNavigate('/apps/gift-course/sent', { state: { gift } })` from
//     the wizard's confirmation step, or
//   - directly via URL (in which case we render an empty state that links
//     back to the wizard).
//
// Shows the gift code (copyable), recipient email, course title, expiry
// date, and offers a "Share via Email" mailto button + a "Send another gift"
// CTA.

// Import Dependencies
import { useLocation, useNavigate } from "react-router";
import clsx from "clsx";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EnvelopeIcon,
  GiftIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, CopyButton } from "@/components/ui";
import { EmptyState, formatPrice } from "@/components/lms";
import type { CourseGift } from "@/types/lms";

// ----------------------------------------------------------------------

interface GiftSentLocationState {
  gift?: CourseGift;
}

// ----------------------------------------------------------------------

export default function GiftSentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const gift = (location.state as GiftSentLocationState | null)?.gift ?? null;

  if (!gift) {
    return (
      <Page title="Gift sent">
        <div className="mx-auto max-w-2xl px-4 py-12">
          <Card className="p-6">
            <EmptyState
              icon={GiftIcon}
              title="No gift to show"
              description="This page is shown after you send a gift. Start the gift wizard to send one."
              actionLabel="Send a gift"
              onAction={() => navigate("/apps/gift-course")}
            />
          </Card>
        </div>
      </Page>
    );
  }

  const currency = (gift.currency ?? "usd").toUpperCase();
  const expiresAt = gift.expiresAt
    ? new Date(gift.expiresAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  const mailtoSubject = encodeURIComponent(
    `You've received a course gift: ${gift.courseTitle ?? "A course"}`,
  );
  const mailtoBody = encodeURIComponent(
    [
      `Hi ${gift.recipientName ?? ""},`,
      "",
      `I've gifted you a course${gift.courseTitle ? ` — "${gift.courseTitle}"` : ""}!`,
      "",
      "Use the redemption code below to unlock it:",
      "",
      `    ${gift.code}`,
      "",
      "Head to the school site, paste the code on the gift redemption page, and start learning.",
      "",
      gift.message ? `Personal message: ${gift.message}` : "",
      "",
      "Enjoy!",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  const mailtoHref = `mailto:${gift.recipientEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;

  return (
    <Page title="Gift sent">
      <div className="min-h-screen bg-gradient-to-br from-primary-500/10 via-gray-50 to-white dark:from-primary-500/10 dark:via-dark-900 dark:to-dark-900">
        <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
          {/* Header */}
          <header className="mb-6 flex items-center gap-3">
            <Button
              isIcon
              variant="flat"
              color="neutral"
              className="size-8"
              onClick={() => navigate("/apps/gift-course")}
              aria-label="Back to gift wizard"
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                Gift sent
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Your gift has been created and is ready to share.
              </p>
            </div>
          </header>

          <Card skin="bordered" className="overflow-hidden">
            {/* Success banner */}
            <div className="bg-success-500/10 px-6 py-5 dark:bg-success-500/15">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-success-500 text-white">
                  <CheckCircleIcon className="size-6 stroke-2" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-success-700 dark:text-success-400">
                    Gift created successfully
                  </p>
                  <p className="text-xs text-success-700/80 dark:text-success-400/80">
                    Send the redemption code below to your recipient.
                  </p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-5 p-6">
              {/* Gift code (copyable) */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Redemption code
                </p>
                <div
                  className={clsx(
                    "mt-1.5 flex items-center justify-between gap-3 rounded-lg border-2 border-dashed",
                    "border-primary-300 bg-primary-500/5 px-4 py-3 dark:border-primary-400/40 dark:bg-primary-500/10",
                  )}
                >
                  <p className="font-mono text-xl font-bold tracking-wider text-gray-900 dark:text-dark-50">
                    {gift.code}
                  </p>
                  <CopyButton value={gift.code} timeout={2000}>
                    {({ copy, copied }) => (
                      <Button
                        isIcon
                        variant="soft"
                        color={copied ? "success" : "primary"}
                        className="size-8"
                        onClick={copy}
                        aria-label="Copy gift code"
                      >
                        {copied ? (
                          <CheckCircleIcon className="size-4" />
                        ) : (
                          <EnvelopeIcon className="size-4" />
                        )}
                      </Button>
                    )}
                  </CopyButton>
                </div>
              </div>

              {/* Details grid */}
              <dl className="grid gap-3 sm:grid-cols-2">
                <DetailItem
                  label="Recipient"
                  value={
                    gift.recipientName
                      ? `${gift.recipientName}\n${gift.recipientEmail}`
                      : gift.recipientEmail
                  }
                />
                <DetailItem
                  label="Course"
                  value={gift.courseTitle ?? `Course ${gift.courseId.slice(-8)}`}
                />
                <DetailItem
                  label="Amount paid"
                  value={formatPrice(gift.priceCents, currency)}
                />
                {expiresAt && (
                  <DetailItem label="Expires on" value={expiresAt} />
                )}
              </dl>

              {/* Personal message */}
              {gift.message && (
                <div className="rounded-lg bg-gray-50 p-3 text-sm dark:bg-dark-600">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                    Personal message
                  </p>
                  <p className="mt-1 italic text-gray-700 dark:text-dark-200">
                    "{gift.message}"
                  </p>
                </div>
              )}

              {/* CTAs */}
              <div className="flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-dark-600 sm:flex-row sm:justify-between">
                <Button
                  color="primary"
                  variant="filled"
                  className="gap-1.5 text-sm"
                  onClick={() => {
                    window.location.href = mailtoHref;
                  }}
                >
                  <EnvelopeIcon className="size-4" />
                  Share via email
                </Button>
                <Button
                  variant="outlined"
                  color="neutral"
                  className="gap-1.5 text-sm"
                  onClick={() => navigate("/apps/gift-course")}
                >
                  <GiftIcon className="size-4" />
                  Send another gift
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------------

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-gray-200 px-3 py-2 dark:border-dark-600">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
        {label}
      </dt>
      <dd className="mt-0.5 whitespace-pre-line text-sm font-medium text-gray-800 dark:text-dark-100">
        {value}
      </dd>
    </div>
  );
}
