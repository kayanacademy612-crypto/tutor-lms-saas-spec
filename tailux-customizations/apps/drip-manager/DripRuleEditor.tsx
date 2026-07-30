// DripRuleEditor — modal for creating / editing / deleting a single drip rule.
//
// Backed by `useCreateDripRule`, `useUpdateDripRule`, `useDeleteDripRule` from
// `@/hooks/useProAuthoring`. Form state is managed with `react-hook-form` +
// `yup` (same pattern as `TaxRateModal`).
//
// Layout:
//   - Rule-type selector (Schedule | Prerequisite | Enrollment Days | Sequence)
//     rendered as 4 selectable cards.
//   - Conditional field per rule type:
//       schedule        → datetime-local input for `unlockAt`
//       prerequisite    → Select of lessons in the same course
//       enrollment_days → number input for `daysAfterEnrollment`
//       sequence        → info text (no extra fields needed)
//   - Active toggle.
//   - Save / Delete footer.

// Import Dependencies
import { Fragment, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import clsx from "clsx";
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import {
  XMarkIcon,
  ArrowPathIcon,
  TrashIcon,
  CalendarIcon,
  ListBulletIcon,
  ClockIcon,
  ArrowRightIcon,
  InformationCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Input, Select, Switch } from "@/components/ui";
import {
  useCreateDripRule,
  useUpdateDripRule,
  useDeleteDripRule,
} from "@/hooks/useProAuthoring";
import type {
  DripRule,
  DripRuleCreateInput,
  DripRuleType,
  Lesson,
} from "@/types/lms";

// ----------------------------------------------------------------------

const RULE_TYPES: {
  value: DripRuleType;
  label: string;
  description: string;
  icon: typeof CalendarIcon;
}[] = [
  {
    value: "schedule",
    label: "Schedule",
    description: "Unlock at a fixed date & time.",
    icon: CalendarIcon,
  },
  {
    value: "prerequisite",
    label: "Prerequisite",
    description: "Unlock after a specific lesson is completed.",
    icon: ListBulletIcon,
  },
  {
    value: "enrollment_days",
    label: "Enrollment Days",
    description: "Unlock N days after the student enrolls.",
    icon: ClockIcon,
  },
  {
    value: "sequence",
    label: "Sequence",
    description: "Unlock after the previous lesson is completed.",
    icon: ArrowRightIcon,
  },
];

// ----------------------------------------------------------------------

const schema = Yup.object().shape({
  ruleType: Yup.mixed<DripRuleType>()
    .oneOf(
      ["schedule", "prerequisite", "enrollment_days", "sequence"],
      "Pick a rule type.",
    )
    .required("Pick a rule type."),
  unlockAt: Yup.string().when("ruleType", {
    is: "schedule",
    then: (s) => s.required("Pick an unlock date & time."),
    otherwise: (s) => s.strip(),
  }),
  prerequisiteLessonId: Yup.string().when("ruleType", {
    is: "prerequisite",
    then: (s) => s.required("Pick a prerequisite lesson."),
    otherwise: (s) => s.strip(),
  }),
  daysAfterEnrollment: Yup.number().when("ruleType", {
    is: "enrollment_days",
    then: (s) =>
      s
        .typeError("Enter a number of days.")
        .min(0, "Can't be negative.")
        .integer("Must be a whole number.")
        .required("Enter the number of days."),
    otherwise: (s) => s.strip().nullable(),
  }),
  isActive: Yup.boolean().default(true),
});

type FormValues = Yup.InferType<typeof schema>;

// ----------------------------------------------------------------------

export interface DripRuleEditorProps {
  /** Controls visibility. */
  open: boolean;
  /** The lesson this rule applies to. */
  lesson: Lesson | null;
  /** Existing rule when editing; `null` when creating. */
  rule: DripRule | null;
  /** All lessons in the same course (used for prerequisite dropdown). */
  courseLessons: Lesson[];
  /** Close handler. */
  onClose: () => void;
  /** Called after a successful create / update / delete so the parent can refetch. */
  onSaved?: () => void;
}

// ----------------------------------------------------------------------

/** Convert a Date to the value `<input type="datetime-local">` expects. */
function toDateTimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Convert a datetime-local string back to an ISO string. */
function fromDateTimeLocal(v: string): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toISOString();
}

// ----------------------------------------------------------------------

export function DripRuleEditor({
  open,
  lesson,
  rule,
  courseLessons,
  onClose,
  onSaved,
}: DripRuleEditorProps) {
  const createDripRule = useCreateDripRule();
  const updateDripRule = useUpdateDripRule();
  const deleteDripRule = useDeleteDripRule();

  const isEditing = !!rule;

  const defaultValues: FormValues = useMemo(() => {
    const type: DripRuleType = rule?.ruleType ?? "schedule";
    return {
      ruleType: type,
      unlockAt: rule?.unlockAt
        ? toDateTimeLocal(new Date(rule.unlockAt))
        : toDateTimeLocal(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      prerequisiteLessonId: rule?.prerequisiteLessonId ?? "",
      daysAfterEnrollment: rule?.daysAfterEnrollment ?? 0,
      isActive: rule?.isActive ?? true,
    };
  }, [rule]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues,
  });

  // Reset whenever the modal opens or the rule prop changes.
  useEffect(() => {
    if (open) reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, rule?.id]);

  const ruleType = watch("ruleType");
  const isActive = watch("isActive");

  // Lessons that can be picked as a prerequisite — exclude the current lesson.
  const prerequisiteOptions = useMemo(
    () =>
      courseLessons
        .filter((l) => l.id !== lesson?.id)
        .map((l) => ({
          value: l.id,
          label: l.title,
        })),
    [courseLessons, lesson?.id],
  );

  // --------------------------------------------------------------------

  const onSubmit = (values: FormValues) => {
    if (!lesson) return;

    const input: DripRuleCreateInput = {
      courseId: lesson.courseId,
      lessonId: lesson.id,
      ruleType: values.ruleType,
      isActive: values.isActive,
    };

    if (values.ruleType === "schedule") {
      input.unlockAt = fromDateTimeLocal(values.unlockAt);
    } else if (values.ruleType === "prerequisite") {
      input.prerequisiteLessonId = values.prerequisiteLessonId;
    } else if (values.ruleType === "enrollment_days") {
      input.daysAfterEnrollment = values.daysAfterEnrollment ?? 0;
    }

    if (isEditing && rule) {
      void updateDripRule
        .mutate({ id: rule.id, input })
        .then((result) => {
          if (result) {
            onSaved?.();
            onClose();
          }
        });
    } else {
      void createDripRule.mutate(input).then((result) => {
        if (result) {
          onSaved?.();
          onClose();
        }
      });
    }
  };

  const onDelete = () => {
    if (!rule) return;
    void deleteDripRule.mutate(rule.id).then((result) => {
      if (result) {
        onSaved?.();
        onClose();
      }
    });
  };

  const isSubmitting = createDripRule.loading || updateDripRule.loading;
  const isDeleting = deleteDripRule.loading;
  const mutationError =
    createDripRule.error || updateDripRule.error || deleteDripRule.error;

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
            className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-dark-700"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-700">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
                  {isEditing ? "Edit drip rule" : "Add drip rule"}
                </h2>
                {lesson && (
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-dark-300">
                    Lesson · {lesson.title}
                  </p>
                )}
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
              className="flex-1 space-y-5 overflow-y-auto p-5"
            >
              {/* Rule type selector */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-dark-100">
                  Rule type
                </label>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {RULE_TYPES.map((rt) => {
                    const Icon = rt.icon;
                    const selected = ruleType === rt.value;
                    return (
                      <button
                        key={rt.value}
                        type="button"
                        onClick={() =>
                          setValue("ruleType", rt.value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        className={clsx(
                          "flex items-start gap-2.5 rounded-lg border p-3 text-left transition-colors",
                          selected
                            ? "border-primary-500 bg-primary-500/5 dark:border-primary-400 dark:bg-primary-500/10"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-500 dark:hover:border-dark-400 dark:hover:bg-dark-800",
                        )}
                      >
                        <Icon
                          className={clsx(
                            "mt-0.5 size-5 shrink-0 stroke-2",
                            selected
                              ? "text-primary-600 dark:text-primary-400"
                              : "text-gray-400 dark:text-dark-400",
                          )}
                        />
                        <div className="min-w-0">
                          <p
                            className={clsx(
                              "text-sm font-medium",
                              selected
                                ? "text-primary-700 dark:text-primary-300"
                                : "text-gray-800 dark:text-dark-100",
                            )}
                          >
                            {rt.label}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                            {rt.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {errors.ruleType && (
                  <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                    {errors.ruleType.message}
                  </p>
                )}
              </div>

              {/* Conditional fields per rule type */}
              {ruleType === "schedule" && (
                <Input
                  label="Unlock at"
                  type="datetime-local"
                  description="The lesson becomes available at this date & time (in the school's timezone)."
                  error={errors.unlockAt?.message}
                  {...register("unlockAt")}
                />
              )}

              {ruleType === "prerequisite" && (
                <Select
                  label="Required lesson"
                  description="The student must complete this lesson before the current one unlocks."
                  data={
                    prerequisiteOptions.length > 0
                      ? prerequisiteOptions
                      : [{ value: "", label: "No other lessons available" }]
                  }
                  error={errors.prerequisiteLessonId?.message}
                  {...register("prerequisiteLessonId")}
                />
              )}

              {ruleType === "enrollment_days" && (
                <Input
                  label="Days after enrollment"
                  type="number"
                  min="0"
                  step="1"
                  placeholder="0"
                  description="The lesson unlocks N days after the student enrolls in the course."
                  error={errors.daysAfterEnrollment?.message}
                  {...register("daysAfterEnrollment")}
                />
              )}

              {ruleType === "sequence" && (
                <div className="flex items-start gap-2 rounded-lg border border-info-500/30 bg-info-500/5 p-3 dark:border-info-400/30 dark:bg-info-500/10">
                  <InformationCircleIcon className="mt-0.5 size-5 shrink-0 text-info-600 dark:text-info-400" />
                  <div className="text-xs leading-relaxed text-gray-700 dark:text-dark-200">
                    <p className="font-medium text-info-700 dark:text-info-300">
                      Sequential unlock
                    </p>
                    <p className="mt-0.5">
                      The lesson unlocks automatically once the previous lesson
                      in the course is marked complete. No extra fields needed —
                      the order is taken from the course curriculum.
                    </p>
                  </div>
                </div>
              )}

              {/* Active toggle */}
              <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                    Active
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-300">
                    Inactive rules are kept but never enforced.
                  </p>
                </div>
                <Switch
                  checked={isActive}
                  onChange={(e) =>
                    setValue("isActive", e.target.checked, {
                      shouldDirty: true,
                    })
                  }
                  aria-label="Toggle active"
                />
              </div>

              {mutationError && (
                <p className="flex items-center gap-1.5 rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
                  <ExclamationTriangleIcon className="size-4 shrink-0" />
                  {mutationError.message ||
                    "Couldn't save the drip rule. Please try again."}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-4 dark:border-dark-600">
                <div>
                  {isEditing && (
                    <Button
                      type="button"
                      color="error"
                      variant="soft"
                      className="gap-1.5"
                      onClick={onDelete}
                      disabled={isDeleting || isSubmitting}
                    >
                      {isDeleting ? (
                        <ArrowPathIcon className="size-4 animate-spin" />
                      ) : (
                        <TrashIcon className="size-4" />
                      )}
                      Delete
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="flat"
                    color="neutral"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    color="primary"
                    variant="filled"
                    className="gap-1.5"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <ArrowPathIcon className="size-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      <>{isEditing ? "Save changes" : "Add rule"}</>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}

export default DripRuleEditor;
