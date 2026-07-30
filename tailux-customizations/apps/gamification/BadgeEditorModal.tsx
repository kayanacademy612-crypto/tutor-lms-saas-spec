// BadgeEditorModal — create or edit a Badge.
//
// Form state is managed with `react-hook-form` + `yup`. When `badge` is
// provided, the modal is in "edit" mode and pre-fills the form with the
// existing values; otherwise it's in "create" mode with sensible defaults.
//
// On submit, the modal calls either `onCreate(input)` or
// `onUpdate(id, input)` (both passed in by the parent) so this component
// stays stateless w.r.t. the mutation lifecycle. A live preview card on the
// right reflects the current form values as the user types.

// Import Dependencies
import { Fragment, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  XMarkIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LockClosedIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Input, Select, Switch, Textarea } from "@/components/ui";
import { useCourses } from "@/hooks/useLms";
import type {
  Badge,
  BadgeCreateInput,
  BadgeCriteriaType,
} from "@/types/lms";

// Local Imports (component)
import { BadgeCard } from "./BadgeCard";

// ----------------------------------------------------------------------

const CRITERIA_OPTIONS: {
  value: BadgeCriteriaType;
  label: string;
  hint: string;
}[] = [
  {
    value: "course_completed",
    label: "Course completed",
    hint: "Awarded when a student completes the specified course.",
  },
  {
    value: "lessons_completed",
    label: "Lessons completed",
    hint: "Awarded when a student completes N lessons (any course).",
  },
  {
    value: "quiz_passed",
    label: "Quizzes passed",
    hint: "Awarded when a student passes N quizzes.",
  },
  {
    value: "points_earned",
    label: "Points earned",
    hint: "Awarded when a student's total points cross the threshold.",
  },
  {
    value: "streak_days",
    label: "Streak (days)",
    hint: "Awarded for an N-day learning streak.",
  },
];

const COLOR_OPTIONS: { value: string; label: string }[] = [
  { value: "primary", label: "Primary (purple)" },
  { value: "success", label: "Green" },
  { value: "info", label: "Blue" },
  { value: "warning", label: "Gold" },
  { value: "neutral", label: "Silver" },
  { value: "bronze", label: "Bronze" },
];

// ----------------------------------------------------------------------

const schema = Yup.object().shape({
  name: Yup.string()
    .required("Name is required")
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be 80 characters or less"),
  slug: Yup.string()
    .required("Slug is required")
    .matches(
      /^[a-z0-9-]+$/,
      "Slug must be lowercase letters, digits, and hyphens only",
    ),
  description: Yup.string()
    .max(280, "Keep the description under 280 characters")
    .notRequired(),
  iconUrl: Yup.string().url("Must be a valid URL").notRequired(),
  color: Yup.string().notRequired(),
  pointsReward: Yup.number()
    .integer("Points must be a whole number")
    .min(0, "Points can't be negative")
    .max(1_000_000, "Points value is too large")
    .notRequired(),
  criteriaType: Yup.string()
    .oneOf(
      [
        "course_completed",
        "lessons_completed",
        "quiz_passed",
        "points_earned",
        "streak_days",
      ],
      "Pick a criteria type",
    )
    .required("Criteria type is required"),
  threshold: Yup.number()
    .integer("Threshold must be a whole number")
    .min(1, "Threshold must be at least 1")
    .max(1_000_000, "Threshold is too large")
    .required("Threshold is required"),
  courseId: Yup.string().notRequired(),
  isActive: Yup.boolean().default(true),
});

type FormValues = Yup.InferType<typeof schema>;

// ----------------------------------------------------------------------

export interface BadgeEditorModalProps {
  open: boolean;
  /** Existing badge when editing; `null` when creating. */
  badge: Badge | null;
  /** Create mutation hook (mounted by parent). */
  onCreate: (input: BadgeCreateInput) => Promise<unknown>;
  /** Update mutation hook (mounted by parent). */
  onUpdate: (id: string, input: Partial<BadgeCreateInput>) => Promise<unknown>;
  /** Whether a save is in flight (drives button label/spinner). */
  saving: boolean;
  /** Mutation error from the parent (if any). */
  error?: { message?: string } | null;
  onClose: () => void;
  /** Called after a successful create or update. */
  onSaved?: () => void;
}

// ----------------------------------------------------------------------

function defaultValues(): FormValues {
  return {
    name: "",
    slug: "",
    description: "",
    iconUrl: "",
    color: "primary",
    pointsReward: 0,
    criteriaType: "lessons_completed",
    threshold: 10,
    courseId: "",
    isActive: true,
  };
}

function badgeToValues(badge: Badge): FormValues {
  return {
    name: badge.name ?? "",
    slug: badge.slug ?? "",
    description: badge.description ?? "",
    iconUrl: badge.iconUrl ?? "",
    color: badge.color ?? "primary",
    pointsReward: badge.pointsReward ?? 0,
    criteriaType: badge.criteria?.type ?? "lessons_completed",
    threshold: badge.criteria?.threshold ?? 1,
    courseId: badge.criteria?.courseId ?? "",
    isActive: badge.isActive ?? true,
  };
}

/** Convert "Hello World!" → "hello-world". */
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ----------------------------------------------------------------------

export function BadgeEditorModal({
  open,
  badge,
  onCreate,
  onUpdate,
  saving,
  error,
  onClose,
  onSaved,
}: BadgeEditorModalProps) {
  const isEdit = badge != null;

  const coursesQuery = useCourses();
  const courses = coursesQuery.data ?? [];

  // Track whether the user has manually edited the slug so the auto-slug
  // from `name` doesn't clobber their value.
  const [slugTouched, setSlugTouched] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues: defaultValues(),
  });

  // Reset the form whenever the modal opens or the target badge changes.
  useEffect(() => {
    if (open) {
      reset(badge ? badgeToValues(badge) : defaultValues());
      setSlugTouched(false);
    }
  }, [open, badge, reset]);

  // Auto-slug from `name` when the user hasn't manually edited the slug.
  const nameValue = watch("name");
  useEffect(() => {
    if (!slugTouched && nameValue) {
      setValue("slug", slugify(nameValue), { shouldDirty: true });
    }
  }, [nameValue, slugTouched, setValue]);

  const criteriaType = watch("criteriaType") as BadgeCriteriaType;
  const showCoursePicker = criteriaType === "course_completed";

  // Live preview badge — synthesize a Badge object from the form values.
  const formValues = watch();
  const previewBadge: Badge = useMemo(() => {
    const threshold =
      typeof formValues.threshold === "number" ? formValues.threshold : 1;
    const points =
      typeof formValues.pointsReward === "number"
        ? formValues.pointsReward
        : undefined;
    return {
      id: badge?.id ?? "preview",
      tenantId: badge?.tenantId ?? "preview",
      name: formValues.name || "Badge name",
      slug: formValues.slug || "badge-slug",
      description: formValues.description || undefined,
      iconUrl: formValues.iconUrl || undefined,
      color: formValues.color || undefined,
      pointsReward: points,
      criteria: {
        type: criteriaType,
        threshold,
        courseId: showCoursePicker
          ? formValues.courseId || undefined
          : undefined,
      },
      isActive: formValues.isActive ?? true,
      createdAt: badge?.createdAt ?? new Date().toISOString(),
      updatedAt: badge?.updatedAt ?? new Date().toISOString(),
    };
  }, [formValues, badge, criteriaType, showCoursePicker]);

  // --------------------------------------------------------------------

  const onSubmit = (values: FormValues) => {
    const input: BadgeCreateInput = {
      name: values.name,
      slug: values.slug,
      description: values.description || undefined,
      iconUrl: values.iconUrl || undefined,
      color: values.color || undefined,
      pointsReward:
        typeof values.pointsReward === "number" ? values.pointsReward : 0,
      criteria: {
        type: values.criteriaType as BadgeCriteriaType,
        threshold: values.threshold,
        courseId: showCoursePicker
          ? values.courseId || undefined
          : undefined,
      },
      isActive: values.isActive,
    };

    if (isEdit && badge) {
      void onUpdate(badge.id, input).then((result) => {
        if (result) {
          onSaved?.();
          onClose();
        }
      });
    } else {
      void onCreate(input).then((result) => {
        if (result) {
          onSaved?.();
          onClose();
        }
      });
    }
  };

  // --------------------------------------------------------------------

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[100]" onClose={onClose}>
        <TransitionChild
          as="div"
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
        />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <TransitionChild
            as={DialogPanel}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-100"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
            className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-dark-700"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-700">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
                  {isEdit ? "Edit badge" : "Create badge"}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                  {isEdit
                    ? "Update the badge details, criteria, or active state."
                    : "Define a new badge students can earn."}
                </p>
              </div>
              <Button
                isIcon
                variant="flat"
                color="neutral"
                className="size-8"
                onClick={onClose}
                aria-label="Close"
              >
                <XMarkIcon className="size-4" />
              </Button>
            </header>

            {/* Body */}
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex-1 overflow-y-auto"
            >
              <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[1fr_18rem]">
                {/* Form fields */}
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Name"
                      placeholder="e.g. Quiz Master"
                      {...register("name")}
                      error={errors.name?.message}
                    />
                    <Input
                      label="Slug"
                      placeholder="auto-generated"
                      description="Lowercase letters, digits, hyphens."
                      {...register("slug", {
                        onChange: () => setSlugTouched(true),
                      })}
                      error={errors.slug?.message}
                    />
                  </div>

                  <Textarea
                    label="Description"
                    rows={2}
                    placeholder="Short description shown on the badge card."
                    {...register("description")}
                    error={errors.description?.message}
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Icon URL"
                      placeholder="https://…/badge.png"
                      description="Optional. Leave blank to use the first letter."
                      {...register("iconUrl")}
                      error={errors.iconUrl?.message}
                    />
                    <Select
                      label="Color"
                      {...register("color")}
                      data={COLOR_OPTIONS}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Points reward"
                      type="number"
                      min={0}
                      step={1}
                      description="Points granted when this badge is earned."
                      {...register("pointsReward", {
                        setValueAs: (v: string) =>
                          v === "" || v == null ? undefined : Number(v),
                      })}
                      error={errors.pointsReward?.message}
                    />
                    <div className="flex items-end">
                      <label className="flex w-full items-center justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500">
                        <span className="text-sm">
                          <span className="block font-medium text-gray-800 dark:text-dark-100">
                            Active
                          </span>
                          <span className="text-xs text-gray-500 dark:text-dark-300">
                            Inactive badges are hidden from students.
                          </span>
                        </span>
                        <Switch
                          checked={watch("isActive")}
                          onChange={(e) =>
                            setValue("isActive", e.target.checked, {
                              shouldDirty: true,
                            })
                          }
                          aria-label="Toggle badge active state"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Criteria section */}
                  <div className="rounded-lg border border-gray-200 p-3 dark:border-dark-500">
                    <div className="mb-2 flex items-center gap-1.5">
                      <SparklesIcon className="size-4 text-primary-500 dark:text-primary-400" />
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-dark-200">
                        Award criteria
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <Select
                        label="Type"
                        {...register("criteriaType")}
                        data={CRITERIA_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
                      />
                      {criteriaType && (
                        <p className="-mt-1 text-xs text-gray-500 dark:text-dark-300">
                          {CRITERIA_OPTIONS.find(
                            (o) => o.value === criteriaType,
                          )?.hint ?? ""}
                        </p>
                      )}
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="Threshold"
                          type="number"
                          min={1}
                          step={1}
                          {...register("threshold", {
                            setValueAs: (v: string) =>
                              v === "" || v == null ? undefined : Number(v),
                          })}
                          error={errors.threshold?.message}
                        />
                        {showCoursePicker && (
                          <Select
                            label="Course"
                            {...register("courseId")}
                            disabled={coursesQuery.loading}
                          >
                            <option value="">
                              {coursesQuery.loading
                                ? "Loading…"
                                : "Select a course…"}
                            </option>
                            {courses.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                              </option>
                            ))}
                          </Select>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Live preview */}
                <aside className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-dark-200">
                    <CheckCircleIcon className="size-4 text-success-500 dark:text-success-400" />
                    Live preview
                  </div>
                  <BadgeCard badge={previewBadge} earned />
                  <div className="rounded-md border border-dashed border-gray-200 p-3 dark:border-dark-500">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                      <LockClosedIcon className="size-3.5" />
                      Locked appearance
                    </div>
                    <div className="mt-2">
                      <BadgeCard badge={previewBadge} earned={false} />
                    </div>
                  </div>
                </aside>
              </div>

              {error && (
                <p className="mx-5 mb-3 flex items-center gap-1.5 rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
                  <ExclamationTriangleIcon className="size-4 shrink-0" />
                  {error.message ||
                    "Couldn't save the badge. Please try again."}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-dark-600">
                <Button
                  type="button"
                  variant="flat"
                  color="neutral"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  color="primary"
                  variant="filled"
                  className="gap-1.5"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <ArrowPathIcon className="size-4 animate-spin" />
                      {isEdit ? "Saving…" : "Creating…"}
                    </>
                  ) : isEdit ? (
                    "Save changes"
                  ) : (
                    "Create badge"
                  )}
                </Button>
              </div>
            </form>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

// ----------------------------------------------------------------------

export default BadgeEditorModal;
