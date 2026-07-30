// GiftRedeemPage — recipient-side gift redemption.
//
// Renders a single input for the recipient to paste their redemption code.
// On submit we call `lmsApi.gift.redeem(code)`. On success we show the
// unlocked course + a "Start learning" CTA that routes to the learning area.
//
// Note: this page intentionally has minimal chrome so it works well for
// recipients who follow a gift email link without an existing session.

// Import Dependencies
import { useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import {
  AcademicCapIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  GiftIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Input } from "@/components/ui";
import { lmsApi, type LmsApiError } from "@/services/lms-api";
import type { CourseGift } from "@/types/lms";

// ----------------------------------------------------------------------

type RedeemState = "idle" | "loading" | "success" | "error";

// ----------------------------------------------------------------------

export default function GiftRedeemPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [state, setState] = useState<RedeemState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [gift, setGift] = useState<CourseGift | null>(null);

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Please enter a redemption code.");
      setState("error");
      return;
    }

    setState("loading");
    setError(null);
    setGift(null);

    try {
      const result = await lmsApi.gift.redeem(trimmed);
      setGift(result);
      setState("success");
    } catch (err) {
      const e = err as LmsApiError;
      setError(
        e?.message ??
          "We couldn't redeem that code. Double-check the code and try again.",
      );
      setState("error");
    }
  };

  return (
    <Page title="Redeem a gift">
      <div className="min-h-screen bg-gradient-to-br from-primary-500/10 via-gray-50 to-white dark:from-primary-500/10 dark:via-dark-900 dark:to-dark-900">
        <div className="mx-auto flex max-w-md flex-col px-4 py-12 sm:px-6 lg:py-20">
          {/* Header */}
          <header className="mb-8 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary-500 text-white shadow-soft">
              <GiftIcon className="size-7 stroke-2" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900 dark:text-dark-50">
              Redeem your gift
            </h1>
            <p className="mt-1.5 text-sm text-gray-600 dark:text-dark-300">
              Enter the code from your gift email to unlock the course.
            </p>
          </header>

          {/* Card */}
          <Card skin="bordered" className="p-6">
            {state !== "success" ? (
              <form onSubmit={handleRedeem} className="space-y-4">
                <Input
                  label="Redemption code"
                  placeholder="GIFT-XXXX-XXXX"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value);
                    if (state === "error") setState("idle");
                  }}
                  error={state === "error" ? error ?? true : undefined}
                  prefix={<SparklesIcon className="size-4" />}
                  autoComplete="off"
                  spellCheck={false}
                />

                <Button
                  type="submit"
                  color="primary"
                  variant="filled"
                  className="w-full gap-1.5 text-sm"
                  disabled={state === "loading"}
                >
                  {state === "loading" ? "Redeeming…" : "Redeem gift"}
                  {state !== "loading" && <ArrowRightIcon className="size-4" />}
                </Button>

                {state === "error" && (
                  <div className="flex items-start gap-2 rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-700 dark:bg-error-500/15 dark:text-error-400">
                    <ExclamationCircleIcon className="mt-0.5 size-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
              </form>
            ) : (
              <SuccessView
                gift={gift}
                onStartLearning={() => navigate("/apps/learning-area")}
                onRedeemAnother={() => {
                  setCode("");
                  setGift(null);
                  setState("idle");
                  setError(null);
                }}
              />
            )}
          </Card>

          {/* Footer */}
          <p className="mt-6 text-center text-xs text-gray-400 dark:text-dark-400">
            Having trouble? Contact your school's support with your gift code.
          </p>
        </div>
      </div>
    </Page>
  );
}

// ----------------------------------------------------------------------

function SuccessView({
  gift,
  onStartLearning,
  onRedeemAnother,
}: {
  gift: CourseGift | null;
  onStartLearning: () => void;
  onRedeemAnother: () => void;
}) {
  if (!gift) {
    return (
      <div className="text-center text-sm text-gray-500 dark:text-dark-300">
        Gift redeemed.
      </div>
    );
  }

  return (
    <div className="space-y-4 text-center">
      <div
        className={clsx(
          "mx-auto flex size-12 items-center justify-center rounded-full",
          "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400",
        )}
      >
        <CheckCircleIcon className="size-7 stroke-2" />
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
          Course unlocked! 🎉
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
          Your gift code has been redeemed and the course is now available in
          your library.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 p-3 text-left dark:border-dark-600">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
            <AcademicCapIcon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Course
            </p>
            <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
              {gift.courseTitle ?? `Course ${gift.courseId.slice(-8)}`}
            </p>
            <p className="mt-1 text-xs text-gray-400 dark:text-dark-400">
              Redeemed · {new Date(gift.redeemedAt ?? Date.now()).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          color="primary"
          variant="filled"
          onClick={onStartLearning}
          className="w-full gap-1.5 text-sm"
        >
          Start learning
          <ArrowRightIcon className="size-4" />
        </Button>
        <Button
          variant="flat"
          color="neutral"
          onClick={onRedeemAnother}
          className="text-xs"
        >
          Redeem another code
        </Button>
      </div>
    </div>
  );
}
