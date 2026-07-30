// ForgotPasswordPage — request a password reset link.
//
// Layout: centered card with the product logo, an email input, and a
// "Send reset link" button. On submit, shows a success state telling the
// user to check their inbox (with a "didn't receive it? resend" affordance).
//
// In dev there's no real backend, so the request is simulated. The page
// deliberately shows the same success message whether or not the email is
// associated with an account — this is the standard anti-enumeration
// posture for password-reset endpoints.

// Import Dependencies
import { useState } from "react";
import { Link } from "react-router";
import {
  EnvelopeIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import Logo from "@/assets/appLogo.svg?react";
import { Button, Card, Input } from "@/components/ui";
import { Page } from "@/components/shared/Page";

// ----------------------------------------------------------------------

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ----------------------------------------------------------------------

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const emailValid = EMAIL_RX.test(email.trim());
  const emailError = touched && !emailValid && email.length > 0
    ? "Enter a valid email address."
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!emailValid) return;

    setSubmitting(true);
    try {
      // DEV: simulate the API round-trip.
      await new Promise((resolve) => setTimeout(resolve, 900));
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────── Success state ───────────────
  if (sent) {
    return (
      <Page title="Check Your Inbox">
        <main className="grid min-h-100vh w-full grow place-items-center bg-gray-50 dark:bg-dark-900">
          <div className="w-full max-w-[26rem] p-4 sm:px-5">
            <div className="text-center">
              <Logo className="mx-auto size-16" />
            </div>

            <Card className="mt-5 rounded-lg p-6 lg:p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-success-500/10">
                  <CheckCircleIcon className="size-9 text-success-500 dark:text-success-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                    Check your inbox
                  </h2>
                  <p className="mt-1.5 text-sm text-gray-500 dark:text-dark-300">
                    If an account exists for{" "}
                    <span className="font-medium text-gray-700 dark:text-dark-100">
                      {email}
                    </span>
                    , you'll receive a reset link within a few minutes.
                  </p>
                </div>

                <div className="mt-2 flex w-full flex-col gap-2">
                  <Button
                    color="primary"
                    variant="outlined"
                    className="w-full gap-2"
                    onClick={handleResend}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <ArrowPathIcon className="size-5 animate-spin" />
                        Resending…
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="size-5" />
                        Resend reset link
                      </>
                    )}
                  </Button>
                  <Button
                    variant="flat"
                    color="neutral"
                    className="w-full gap-2"
                    onClick={() => {
                      setSent(false);
                      setEmail("");
                      setTouched(false);
                    }}
                  >
                    <ArrowLeftIcon className="size-4" />
                    Use a different email
                  </Button>
                </div>

                <p className="mt-2 text-[11px] text-gray-400 dark:text-dark-400">
                  Didn't get the email? Check your spam folder, or{" "}
                  <Link
                    to="/signup"
                    className="font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                  >
                    create an account
                  </Link>
                  .
                </p>
              </div>
            </Card>

            <div className="mt-6 text-center text-xs-plus">
              <Link
                className="text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600"
                to="/login"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </main>
      </Page>
    );
  }

  // ─────────────── Form state ───────────────
  return (
    <Page title="Forgot Password">
      <main className="grid min-h-100vh w-full grow place-items-center bg-gray-50 dark:bg-dark-900">
        <div className="w-full max-w-[26rem] p-4 sm:px-5">
          <div className="text-center">
            <Logo className="mx-auto size-16" />
            <div className="mt-4">
              <h2 className="text-2xl font-semibold text-gray-600 dark:text-dark-100">
                Forgot your password?
              </h2>
              <p className="text-gray-400 dark:text-dark-300">
                No worries — enter your email and we'll send a reset link.
              </p>
            </div>
          </div>

          <Card className="mt-5 rounded-lg p-5 lg:p-7">
            <form onSubmit={handleSubmit} noValidate>
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                prefix={<EnvelopeIcon className="size-5" strokeWidth={1} />}
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                onBlur={() => setTouched(true)}
                error={emailError ?? undefined}
                description="We'll send a one-time reset link to this address."
              />

              <Button
                type="submit"
                color="primary"
                className="mt-4 w-full gap-2"
                disabled={submitting || !emailValid}
              >
                {submitting ? (
                  <>
                    <ArrowPathIcon className="size-5 animate-spin" />
                    Sending link…
                  </>
                ) : (
                  <>
                    <EnvelopeIcon className="size-5" />
                    Send reset link
                  </>
                )}
              </Button>
            </form>

            <div className="my-6 flex items-center space-x-3 text-xs rtl:space-x-reverse">
              <div className="h-px flex-1 bg-gray-200 dark:bg-dark-500" />
              <p>OR</p>
              <div className="h-px flex-1 bg-gray-200 dark:bg-dark-500" />
            </div>

            <div className="text-center text-xs-plus">
              <span>Remembered your password?</span>{" "}
              <Link
                className="text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600"
                to="/login"
              >
                Sign in
              </Link>
            </div>
          </Card>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-dark-300">
            <ShieldCheckIcon className="size-3.5" />
            <span>
              For your security, reset links expire after 30 minutes.
            </span>
          </div>
        </div>
      </main>
    </Page>
  );
}

export { ForgotPasswordPage };
