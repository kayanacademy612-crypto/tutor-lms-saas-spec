// MFAVerifyPage — multi-factor authentication code entry.
//
// Layout: centered card with the product logo, a "we sent a code" header,
// a 6-cell OTP input, a Verify button, and a "use recovery code" link.
//
// Behavior:
//   - One digit per cell. Auto-advance to the next cell on input.
//   - Backspace in an empty cell jumps back to the previous cell.
//   - Paste a 6-digit code fills all cells.
//   - Verify is enabled once 6 digits are entered.
//   - "Resend code" is throttled (30s countdown).
//   - "Use recovery code" toggles a single-line recovery-code input.
//
// All controls are tailux components (Input, Button, Card) — the per-cell
// input is `Input` with `unstyled` + a custom class.

// Import Dependencies
import { useEffect, useMemo, useRef, useState, KeyboardEvent, ClipboardEvent } from "react";
import { Link, useNavigate } from "react-router";
import {
  ShieldCheckIcon,
  ArrowPathIcon,
  KeyIcon,
  LockClosedIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import Logo from "@/assets/appLogo.svg?react";
import { Button, Card, Input, InputErrorMsg } from "@/components/ui";
import { Page } from "@/components/shared/Page";

// ----------------------------------------------------------------------

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

// ----------------------------------------------------------------------

export default function MFAVerifyPage() {
  const navigate = useNavigate();

  // Per-cell digit values (length === CODE_LENGTH).
  const [cells, setCells] = useState<string[]>(
    Array.from({ length: CODE_LENGTH }, () => ""),
  );
  // Per-cell refs so we can programmatically focus.
  const cellRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  // Resend-code countdown.
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // "Use recovery code" toggle.
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  const code = cells.join("");
  const codeComplete = code.length === CODE_LENGTH && /^\d{6}$/.test(code);
  const recoveryReady = recoveryCode.trim().length >= 8;

  const setCell = (i: number, v: string) => {
    // Accept only digits, max 1 char.
    const digit = v.replace(/\D/g, "").slice(-1);
    setCells((prev) => {
      const next = prev.slice();
      next[i] = digit;
      return next;
    });
    // Auto-advance.
    if (digit && i < CODE_LENGTH - 1) {
      cellRefs.current[i + 1]?.focus();
    }
  };

  const onKeyDown = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (cells[i]) {
        // Clear current cell — let the input handle it via onChange.
        return;
      }
      // Empty cell → jump back.
      if (i > 0) {
        e.preventDefault();
        cellRefs.current[i - 1]?.focus();
        setCells((prev) => {
          const next = prev.slice();
          next[i - 1] = "";
          return next;
        });
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      cellRefs.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < CODE_LENGTH - 1) {
      e.preventDefault();
      cellRefs.current[i + 1]?.focus();
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const next = Array.from({ length: CODE_LENGTH }, (_, idx) =>
      pasted[idx] ?? "",
    );
    setCells(next);
    // Focus the last filled cell (or the next empty one).
    const focusIdx = Math.min(pasted.length, CODE_LENGTH - 1);
    cellRefs.current[focusIdx]?.focus();
  };

  const handleVerify = async () => {
    setError(null);
    setVerifying(true);
    try {
      // DEV: accept "123456" as the canonical code, or any recovery code.
      if (recoveryMode) {
        if (!recoveryReady) {
          setError("Enter a valid recovery code (at least 8 characters).");
          return;
        }
      } else if (!codeComplete) {
        setError("Enter all 6 digits.");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 900));

      if (!recoveryMode && code !== "123456") {
        setError("Incorrect code. Try again or use a recovery code.");
        return;
      }

      setVerified(true);
      // Bounce to the home dashboard after a brief success state.
      setTimeout(() => navigate("/"), 1200);
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = () => {
    if (resendIn > 0) return;
    setResendIn(RESEND_SECONDS);
    setError(null);
    setCells(Array.from({ length: CODE_LENGTH }, () => ""));
    cellRefs.current[0]?.focus();
  };

  const maskedEmail = useMemo(
    () => "j•••@example.com",
    [],
  );

  return (
    <Page title="Verify Your Identity">
      <main className="grid min-h-100vh w-full grow place-items-center bg-gray-50 dark:bg-dark-900">
        <div className="w-full max-w-[26rem] p-4 sm:px-5">
          <div className="text-center">
            <Logo className="mx-auto size-16" />
            <div className="mt-4">
              <h2 className="text-2xl font-semibold text-gray-600 dark:text-dark-100">
                Verify your identity
              </h2>
              <p className="text-gray-400 dark:text-dark-300">
                Enter the 6-digit code we sent to{" "}
                <span className="font-medium text-gray-600 dark:text-dark-100">
                  {maskedEmail}
                </span>
              </p>
            </div>
          </div>

          <Card className="mt-5 rounded-lg p-5 lg:p-7">
            {verified ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex size-14 items-center justify-center rounded-full bg-success-500/10">
                  <CheckCircleIcon className="size-9 text-success-500 dark:text-success-400" />
                </div>
                <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">
                  Verified!
                </h3>
                <p className="text-xs text-gray-500 dark:text-dark-300">
                  Taking you to your dashboard…
                </p>
              </div>
            ) : recoveryMode ? (
              <RecoveryCodeView
                value={recoveryCode}
                onChange={setRecoveryCode}
                onVerify={handleVerify}
                verifying={verifying}
                onBack={() => {
                  setRecoveryMode(false);
                  setError(null);
                }}
              />
            ) : (
              <>
                {/* 6-cell OTP input */}
                <div
                  className="flex items-center justify-between gap-2"
                  onPaste={onPaste}
                >
                  {cells.map((v, i) => (
                    <Input
                      key={i}
                      unstyled
                      inputMode="numeric"
                      autoComplete={i === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      value={v}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setCell(i, e.target.value)
                      }
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) =>
                        onKeyDown(i, e)
                      }
                      ref={(el: HTMLInputElement | null) => {
                        cellRefs.current[i] = el;
                      }}
                      className="form-input h-14 w-12 rounded-lg border border-gray-300 text-center text-2xl font-semibold text-gray-800 focus:border-primary-600 focus:outline-none dark:border-dark-450 dark:bg-dark-700 dark:text-dark-50"
                    />
                  ))}
                </div>

                <div className="mt-3">
                  <InputErrorMsg when={!!(error && error !== "")}>
                    {error}
                  </InputErrorMsg>
                </div>

                <Button
                  color="primary"
                  className="mt-5 w-full gap-2"
                  onClick={handleVerify}
                  disabled={verifying || !codeComplete}
                >
                  {verifying ? (
                    <>
                      <ArrowPathIcon className="size-5 animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    <>
                      <ShieldCheckIcon className="size-5" />
                      Verify
                    </>
                  )}
                </Button>

                {/* Resend + recovery */}
                <div className="mt-4 flex items-center justify-between text-xs">
                  <Button
                    variant="flat"
                    color="primary"
                    onClick={handleResend}
                    disabled={resendIn > 0}
                    className="gap-1.5 px-2 py-1"
                  >
                    <ArrowPathIcon className="size-3.5" />
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </Button>
                  <Button
                    variant="flat"
                    color="neutral"
                    onClick={() => {
                      setRecoveryMode(true);
                      setError(null);
                    }}
                    className="gap-1.5 px-2 py-1"
                  >
                    <KeyIcon className="size-3.5" />
                    Use recovery code
                  </Button>
                </div>
              </>
            )}
          </Card>

          {/* Footer */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400 dark:text-dark-300">
            <LockClosedIcon className="size-3.5" />
            <span>
              Never share your code. We will never ask for it by phone or email.
            </span>
          </div>
          <div className="mt-3 text-center text-xs-plus">
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

// ----------------------------------------------------------------------

/** Recovery-code input view, toggled from the main MFA view. */
function RecoveryCodeView({
  value,
  onChange,
  onVerify,
  verifying,
  onBack,
}: {
  value: string;
  onChange: (v: string) => void;
  onVerify: () => void;
  verifying: boolean;
  onBack: () => void;
}) {
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-400">
          <KeyIcon className="size-5" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Use a recovery code
          </h3>
          <p className="text-xs text-gray-500 dark:text-dark-300">
            Enter one of the 10 single-use recovery codes you saved.
          </p>
        </div>
      </div>

      <Input
        label="Recovery code"
        placeholder="e.g. a1b2c3d4e5"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        prefix={<ExclamationTriangleIcon className="size-5" />}
        description="Recovery codes are case-insensitive."
      />

      <Button
        color="primary"
        className="mt-5 w-full gap-2"
        onClick={onVerify}
        disabled={verifying || value.trim().length < 8}
      >
        {verifying ? (
          <>
            <ArrowPathIcon className="size-5 animate-spin" />
            Verifying…
          </>
        ) : (
          <>
            <ShieldCheckIcon className="size-5" />
            Verify recovery code
          </>
        )}
      </Button>

      <div className="mt-3 text-center text-xs-plus">
        <Button
          variant="flat"
          color="neutral"
          onClick={onBack}
          className="text-xs"
        >
          ← Back to code entry
        </Button>
      </div>
    </div>
  );
}

export { MFAVerifyPage };
