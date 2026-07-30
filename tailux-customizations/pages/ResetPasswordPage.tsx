// ResetPasswordPage — set a new password using a reset token.
//
// Layout: centered card with the product logo, the new-password form, and a
// "Reset Password" button. Fields:
//   - New password (with show/hide toggle + strength meter)
//   - Confirm password (must match)
//
// On submit, validates that:
//   - Password is at least 8 chars, with an uppercase letter and a number.
//   - Confirm password matches.
// Then simulates an API call and shows a success state with a CTA back to
// login.
//
// In dev there's no real backend; the reset token is read from the URL but
// not validated.

// Import Dependencies
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import Logo from "@/assets/appLogo.svg?react";
import { Button, Card, Input } from "@/components/ui";
import { Page } from "@/components/shared/Page";

// ----------------------------------------------------------------------

const PW_RULES = [
  { rx: /.{8,}/, label: "At least 8 characters" },
  { rx: /[A-Z]/, label: "An uppercase letter" },
  { rx: /[0-9]/, label: "A number" },
  { rx: /[^A-Za-z0-9]/, label: "A symbol (optional but recommended)" },
];

// ----------------------------------------------------------------------

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Token is read but not used in dev — present so the page is realistic.
  const _token = searchParams.get("token") ?? "";
  void _token;

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const passedRules = PW_RULES.map((r) => ({
    ...r,
    passed: r.rx.test(password),
  }));
  const allRequiredPassed = passedRules
    .slice(0, 3)
    .every((r) => r.passed);

  const passwordsMatch = confirm.length > 0 && password === confirm;
  const confirmError =
    confirm.length > 0 && !passwordsMatch
      ? "Passwords do not match."
      : null;

  const canSubmit = allRequiredPassed && passwordsMatch && !submitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    if (!canSubmit) return;

    setSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setDone(true);
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : "Could not reset password.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────── Success state ───────────────
  if (done) {
    return (
      <Page title="Password Reset">
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
                    Your password was reset
                  </h2>
                  <p className="mt-1.5 text-sm text-gray-500 dark:text-dark-300">
                    You can now sign in with your new password.
                  </p>
                </div>

                <Button
                  color="primary"
                  variant="filled"
                  className="mt-2 w-full gap-2"
                  onClick={() => navigate("/login")}
                >
                  <CheckIcon className="size-5" />
                  Continue to sign in
                </Button>
              </div>
            </Card>
          </div>
        </main>
      </Page>
    );
  }

  // ─────────────── Form state ───────────────
  return (
    <Page title="Reset Password">
      <main className="grid min-h-100vh w-full grow place-items-center bg-gray-50 dark:bg-dark-900">
        <div className="w-full max-w-[26rem] p-4 sm:px-5">
          <div className="text-center">
            <Logo className="mx-auto size-16" />
            <div className="mt-4">
              <h2 className="text-2xl font-semibold text-gray-600 dark:text-dark-100">
                Set a new password
              </h2>
              <p className="text-gray-400 dark:text-dark-300">
                Choose a strong password you haven't used before.
              </p>
            </div>
          </div>

          <Card className="mt-5 rounded-lg p-5 lg:p-7">
            <form onSubmit={handleSubmit} noValidate>
              {/* New password */}
              <div>
                <Input
                  label="New password"
                  type={showPw ? "text" : "password"}
                  placeholder="At least 8 characters"
                  prefix={<LockClosedIcon className="size-5" strokeWidth={1} />}
                  suffix={
                    <Button
                      unstyled
                      type="button"
                      aria-label={showPw ? "Hide password" : "Show password"}
                      onClick={() => setShowPw((v) => !v)}
                      className="pointer-events-auto flex h-full w-9 items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-dark-100"
                    >
                      {showPw ? (
                        <EyeSlashIcon className="size-5" />
                      ) : (
                        <EyeIcon className="size-5" />
                      )}
                    </Button>
                  }
                  value={password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(e.target.value)
                  }
                />

                {/* Strength + rules */}
                {password.length > 0 && (
                  <ul className="mt-2.5 space-y-1">
                    {passedRules.map((r) => (
                      <li
                        key={r.label}
                        className={`flex items-center gap-1.5 text-[11px] ${
                          r.passed
                            ? "text-success-600 dark:text-success-400"
                            : "text-gray-400 dark:text-dark-400"
                        }`}
                      >
                        {r.passed ? (
                          <CheckCircleIcon className="size-3.5" />
                        ) : (
                          <span className="size-3.5 rounded-full border border-current opacity-40" />
                        )}
                        {r.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Confirm */}
              <div className="mt-4">
                <Input
                  label="Confirm new password"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Re-enter your new password"
                  prefix={<LockClosedIcon className="size-5" strokeWidth={1} />}
                  suffix={
                    <Button
                      unstyled
                      type="button"
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                      onClick={() => setShowConfirm((v) => !v)}
                      className="pointer-events-auto flex h-full w-9 items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-dark-100"
                    >
                      {showConfirm ? (
                        <EyeSlashIcon className="size-5" />
                      ) : (
                        <EyeIcon className="size-5" />
                      )}
                    </Button>
                  }
                  value={confirm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfirm(e.target.value)
                  }
                  error={confirmError ?? undefined}
                />
                {passwordsMatch && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] text-success-600 dark:text-success-400">
                    <CheckIcon className="size-3.5" />
                    Passwords match.
                  </p>
                )}
              </div>

              {/* Server error */}
              {serverError && (
                <p className="mt-3 text-xs text-error dark:text-error-lighter">
                  {serverError}
                </p>
              )}

              <Button
                type="submit"
                color="primary"
                className="mt-5 w-full gap-2"
                disabled={!canSubmit}
              >
                {submitting ? (
                  <>
                    <ArrowPathIcon className="size-5 animate-spin" />
                    Resetting…
                  </>
                ) : (
                  <>
                    <LockClosedIcon className="size-5" />
                    Reset Password
                  </>
                )}
              </Button>
            </form>

            <div className="mt-5 text-center text-xs-plus">
              <Link
                className="text-primary-600 transition-colors hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600"
                to="/login"
              >
                Back to sign in
              </Link>
            </div>
          </Card>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-dark-300">
            <ShieldCheckIcon className="size-3.5" />
            <span>
              After resetting, you'll be signed out of all other devices.
            </span>
          </div>
        </div>
      </main>
    </Page>
  );
}

export { ResetPasswordPage };
