// Gift Course — multi-step purchase wizard.
//
//   Step 1 — Select a course to gift (searchable grid of published courses).
//   Step 2 — Recipient details (email, name, personal message).
//   Step 3 — Review + payment (price summary + payment method selector).
//   Step 4 — Confirmation (redemption code, "Send Another Gift" button).
//
// On confirm we create the gift record (`giftApi.create`) then start a
// checkout session (`checkoutApi.create`) so the buyer pays for the gift.
// The checkout result is shown as the final step (the redemption code is
// generated server-side and returned on the gift payload).

// Import Dependencies
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ClockIcon,
  CreditCardIcon,
  GiftIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Badge, Input, Textarea, Select } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  formatPrice,
} from "@/components/lms";
import { CheckoutStepper } from "@/components/ecommerce/CheckoutStepper";
import { useCourses } from "@/hooks/useLms";
import { lmsApi, type LmsApiError } from "@/services/lms-api";
import type { Course, CourseGift, PaymentGatewayConfig } from "@/types/lms";

// ----------------------------------------------------------------------

const STEPS = ["Course", "Recipient", "Payment", "Done"];

const PAYMENT_METHODS = [
  { value: "stripe", label: "Credit / debit card (Stripe)" },
  { value: "paypal", label: "PayPal" },
  { value: "razorpay", label: "Razorpay" },
  { value: "manual", label: "Manual / invoice" },
];

// ----------------------------------------------------------------------
// Recipient form schema
// ----------------------------------------------------------------------

const recipientSchema = yup.object({
  recipientEmail: yup
    .string()
    .trim()
    .email("Enter a valid email address")
    .required("Recipient email is required"),
  recipientName: yup.string().trim().max(120, "Keep it under 120 characters"),
  message: yup.string().trim().max(500, "Keep it under 500 characters"),
});

type RecipientFormValues = yup.InferType<typeof recipientSchema>;

// ----------------------------------------------------------------------

export default function GiftCourse() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // Step 1 — selected course
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Step 2 — recipient details
  const [recipient, setRecipient] = useState<RecipientFormValues>({
    recipientEmail: "",
    recipientName: "",
    message: "",
  });

  // Step 3 — payment + submission
  const [paymentMethod, setPaymentMethod] = useState<string>("stripe");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<LmsApiError | null>(null);
  const [createdGift, setCreatedGift] = useState<CourseGift | null>(null);

  const courseQuery = useCourses();

  const selectedCourse = useMemo(
    () =>
      (courseQuery.data ?? []).find((c) => c.id === selectedCourseId) ?? null,
    [courseQuery.data, selectedCourseId],
  );

  // ───────────────── Submit (creates gift + checkout) ─────────────────
  const handleSubmit = async () => {
    if (!selectedCourse) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const gift = await lmsApi.gift.create({
        courseId: selectedCourse.id,
        recipientEmail: recipient.recipientEmail,
        recipientName: recipient.recipientName || undefined,
        message: recipient.message || undefined,
        priceCents: selectedCourse.priceCents,
        currency: selectedCourse.currency ?? "usd",
      });

      // Kick off checkout (best-effort — non-fatal if it fails, the gift
      // record is already created and can be paid via the order screen).
      try {
        await lmsApi.checkout.create({
          paymentGateway: paymentMethod,
          billingEmail: recipient.recipientEmail,
          billingName: recipient.recipientName || undefined,
        });
      } catch {
        // Surface as a soft warning but don't block the confirmation step.
        // eslint-disable-next-line no-console
        console.warn("Gift checkout failed — gift record was still created.");
      }

      setCreatedGift(gift);
      setStep(4);
    } catch (err) {
      setSubmitError(err as LmsApiError);
    } finally {
      setSubmitting(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedCourseId(null);
    setRecipient({ recipientEmail: "", recipientName: "", message: "" });
    setPaymentMethod("stripe");
    setSubmitError(null);
    setCreatedGift(null);
  };

  // ───────────────── Render ─────────────────
  return (
    <Page title="Gift a course">
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Header */}
          <header className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-500 text-white">
              <GiftIcon className="size-6 stroke-2" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                Gift a course
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Send a course to a friend with a personal redemption code.
              </p>
            </div>
          </header>

          {/* Stepper */}
          <Card skin="bordered" className="mb-6 p-4">
            <CheckoutStepper currentStep={step} steps={STEPS} />
          </Card>

          {/* Step body */}
          <Card skin="bordered" className="p-5">
            {step === 1 && (
              <Step1SelectCourse
                courses={courseQuery.data ?? []}
                loading={courseQuery.loading}
                error={courseQuery.error}
                onRetry={courseQuery.refetch}
                selectedId={selectedCourseId}
                onSelect={(id) => setSelectedCourseId(id)}
                onNext={() => setStep(2)}
                onBack={() => navigate("/apps/catalog")}
              />
            )}

            {step === 2 && (
              <Step2Recipient
                initialValues={recipient}
                onChange={setRecipient}
                onNext={() => setStep(3)}
                onBack={() => setStep(1)}
              />
            )}

            {step === 3 && (
              <Step3Review
                course={selectedCourse}
                recipient={recipient}
                paymentMethod={paymentMethod}
                onPaymentMethodChange={setPaymentMethod}
                onSubmit={handleSubmit}
                onBack={() => setStep(2)}
                submitting={submitting}
                submitError={submitError}
              />
            )}

            {step === 4 && createdGift && (
              <Step4Confirmation
                gift={createdGift}
                course={selectedCourse}
                onReset={resetWizard}
                onNavigateToSent={() =>
                  navigate("/apps/gift-course/sent", {
                    state: { gift: createdGift },
                  })
                }
              />
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}

// ===========================================================================
// Step 1 — Course picker
// ===========================================================================

function Step1SelectCourse({
  courses,
  loading,
  error,
  onRetry,
  selectedId,
  onSelect,
  onNext,
  onBack,
}: {
  courses: Course[];
  loading: boolean;
  error: LmsApiError | null;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.excerpt ?? "").toLowerCase().includes(q),
    );
  }, [courses, query]);

  if (loading) {
    return <LoadingState message="Loading courses…" />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={GiftIcon}
        title="No courses available"
        description="Your school hasn't published any courses you can gift yet."
        actionLabel="Browse catalog"
        onAction={onBack}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
          Pick a course to gift
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
          Search and select the course your recipient will get access to.
        </p>
      </div>

      <Input
        placeholder="Search courses…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        prefix={<MagnifyingGlassIcon className="size-4" />}
      />

      <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {filtered.map((c) => {
          const selected = c.id === selectedId;
          const currency = (c.currency ?? "usd").toUpperCase();
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={clsx(
                "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                selected
                  ? "border-primary-500 bg-primary-500/5 dark:border-primary-400 dark:bg-primary-500/10"
                  : "border-gray-200 hover:border-gray-300 dark:border-dark-600 dark:hover:border-dark-500",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                  {c.title}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-dark-300">
                  {c.excerpt ?? c.description}
                </p>
                <p className="mt-1.5 text-sm font-medium text-primary-600 dark:text-primary-400">
                  {formatPrice(c.priceCents, currency)}
                </p>
              </div>
              {selected && (
                <CheckIcon className="size-5 shrink-0 text-primary-500" />
              )}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-gray-500 dark:text-dark-300">
            No courses match "{query}".
          </p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-dark-600">
        <Button variant="flat" color="neutral" onClick={onBack} className="text-sm">
          <ArrowLeftIcon className="size-4" />
          Cancel
        </Button>
        <Button
          color="primary"
          variant="filled"
          disabled={!selectedId}
          onClick={onNext}
          className="gap-1.5 text-sm"
        >
          Continue
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}

// ===========================================================================
// Step 2 — Recipient details
// ===========================================================================

function Step2Recipient({
  initialValues,
  onChange,
  onNext,
  onBack,
}: {
  initialValues: RecipientFormValues;
  onChange: (values: RecipientFormValues) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RecipientFormValues>({
    resolver: yupResolver(recipientSchema),
    defaultValues: initialValues,
    mode: "onTouched",
  });

  const onSubmit = (values: RecipientFormValues) => {
    onChange(values);
    onNext();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
          Recipient details
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
          The gift code will be emailed to the recipient.
        </p>
      </div>

      <Input
        label="Recipient email"
        type="email"
        placeholder="friend@example.com"
        {...register("recipientEmail")}
        error={errors.recipientEmail?.message}
      />

      <Input
        label="Recipient name (optional)"
        placeholder="Jane Doe"
        {...register("recipientName")}
        error={errors.recipientName?.message}
      />

      <Textarea
        label="Personal message (optional)"
        rows={4}
        placeholder="Happy learning! Hope you enjoy this course 🎁"
        {...register("message")}
        error={errors.message?.message}
      />

      <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-dark-600">
        <Button
          type="button"
          variant="flat"
          color="neutral"
          onClick={onBack}
          className="gap-1.5 text-sm"
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
        <Button color="primary" variant="filled" type="submit" className="gap-1.5 text-sm">
          Continue
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>
    </form>
  );
}

// ===========================================================================
// Step 3 — Review + payment
// ===========================================================================

function Step3Review({
  course,
  recipient,
  paymentMethod,
  onPaymentMethodChange,
  onSubmit,
  onBack,
  submitting,
  submitError,
}: {
  course: Course | null;
  recipient: RecipientFormValues;
  paymentMethod: string;
  onPaymentMethodChange: (m: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  submitting: boolean;
  submitError: LmsApiError | null;
}) {
  if (!course) {
    return (
      <EmptyState
        icon={GiftIcon}
        title="No course selected"
        description="Go back and pick a course to gift."
        actionLabel="Back"
        onAction={onBack}
      />
    );
  }

  const currency = (course.currency ?? "usd").toUpperCase();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
          Review & pay
        </h2>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
          Confirm the details and choose a payment method.
        </p>
      </div>

      {/* Order summary */}
      <div className="rounded-lg border border-gray-200 p-4 dark:border-dark-600">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
          Order summary
        </h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="min-w-0 text-gray-500 dark:text-dark-300">Course</dt>
            <dd className="truncate font-medium text-gray-800 dark:text-dark-100">
              {course.title}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-gray-500 dark:text-dark-300">Recipient</dt>
            <dd className="font-medium text-gray-800 dark:text-dark-100">
              {recipient.recipientName
                ? `${recipient.recipientName} <${recipient.recipientEmail}>`
                : recipient.recipientEmail}
            </dd>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 dark:border-dark-600">
            <dt className="font-medium text-gray-700 dark:text-dark-200">Total</dt>
            <dd className="text-base font-bold text-gray-900 dark:text-dark-50">
              {formatPrice(course.priceCents, currency)}
            </dd>
          </div>
        </dl>
      </div>

      {/* Payment method */}
      <div>
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
          Payment method
        </label>
        <Select
          className="mt-1.5"
          value={paymentMethod}
          onChange={(e) => onPaymentMethodChange(e.target.value)}
          data={PAYMENT_METHODS}
        />
      </div>

      {recipient.message && (
        <div className="rounded-lg bg-gray-50 p-3 text-xs dark:bg-dark-600">
          <p className="font-semibold text-gray-600 dark:text-dark-200">
            Personal message
          </p>
          <p className="mt-1 italic text-gray-600 dark:text-dark-300">
            "{recipient.message}"
          </p>
        </div>
      )}

      {submitError && (
        <div className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-700 dark:bg-error-500/15 dark:text-error-400">
          {submitError.message ?? "Failed to create gift. Please try again."}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-dark-600">
        <Button
          type="button"
          variant="flat"
          color="neutral"
          onClick={onBack}
          disabled={submitting}
          className="gap-1.5 text-sm"
        >
          <ArrowLeftIcon className="size-4" />
          Back
        </Button>
        <Button
          color="primary"
          variant="filled"
          onClick={onSubmit}
          disabled={submitting}
          className="gap-1.5 text-sm"
        >
          {submitting ? (
            <>
              <ClockIcon className="size-4 animate-pulse" />
              Processing…
            </>
          ) : (
            <>
              <CreditCardIcon className="size-4" />
              Pay & send gift
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ===========================================================================
// Step 4 — Confirmation
// ===========================================================================

function Step4Confirmation({
  gift,
  course,
  onReset,
  onNavigateToSent,
}: {
  gift: CourseGift;
  course: Course | null;
  onReset: () => void;
  onNavigateToSent: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400">
        <SparklesIcon className="size-7 stroke-2" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
          Gift sent! 🎁
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
          Your gift code is below. The recipient will receive an email with
          instructions on how to redeem it.
        </p>
      </div>

      {/* Gift code */}
      <div className="rounded-lg border-2 border-dashed border-primary-300 bg-primary-500/5 p-4 dark:border-primary-400/40 dark:bg-primary-500/10">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 dark:text-primary-400">
          Redemption code
        </p>
        <p className="mt-1 font-mono text-2xl font-bold tracking-wider text-gray-900 dark:text-dark-50">
          {gift.code}
        </p>
      </div>

      {/* Summary */}
      <dl className="mx-auto max-w-sm space-y-1.5 text-left text-sm">
        <div className="flex justify-between">
          <dt className="text-gray-500 dark:text-dark-300">Course</dt>
          <dd className="font-medium text-gray-800 dark:text-dark-100">
            {course?.title ?? gift.courseTitle ?? "—"}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-gray-500 dark:text-dark-300">Recipient</dt>
          <dd className="font-medium text-gray-800 dark:text-dark-100">
            {gift.recipientEmail}
          </dd>
        </div>
        {gift.expiresAt && (
          <div className="flex justify-between">
            <dt className="text-gray-500 dark:text-dark-300">Expires</dt>
            <dd className="font-medium text-gray-800 dark:text-dark-100">
              {new Date(gift.expiresAt).toLocaleDateString()}
            </dd>
          </div>
        )}
      </dl>

      <div className="flex flex-col items-center gap-2 border-t border-gray-100 pt-4 dark:border-dark-600 sm:flex-row sm:justify-center">
        <Button
          color="primary"
          variant="filled"
          onClick={onNavigateToSent}
          className="gap-1.5 text-sm"
        >
          <PaperAirplaneIcon className="size-4" />
          View sent details
        </Button>
        <Button
          variant="outlined"
          color="neutral"
          onClick={onReset}
          className="gap-1.5 text-sm"
        >
          <GiftIcon className="size-4" />
          Send another gift
        </Button>
      </div>
    </div>
  );
}
