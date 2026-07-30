// AddInstructorModal — modal for adding an instructor to a course.
//
// Backed by `useAddCourseInstructor` from `@/hooks/useProAuthoring`.
// Form state is managed with `react-hook-form` + `yup`.
//
// Layout:
//   - Search by email/name OR instructor ID input (no user-search API in
//     Phase 4 — the instructor ID is typed in directly).
//   - Role select: Primary | Co-Instructor | Assistant.
//   - Revenue share % input (0-100).
//   - "Is primary" star toggle (sets isPrimary on the join record).
//   - Warning if total revenue share (existing + new) would exceed 100%.
//   - Live preview of the new revenue split using `RevenueShareBar`.

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
  UserPlusIcon,
  ExclamationTriangleIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Input, Switch } from "@/components/ui";
import { useAddCourseInstructor } from "@/hooks/useProAuthoring";
import type {
  Course,
  CourseInstructor,
  CourseInstructorCreateInput,
  CourseInstructorRole,
} from "@/types/lms";

// Local page imports
import { RevenueShareBar } from "./RevenueShareBar";

// ----------------------------------------------------------------------

const ROLES: { value: CourseInstructorRole; label: string; description: string }[] = [
  {
    value: "primary",
    label: "Primary",
    description: "Owns the course, can edit everything, appears as the main author.",
  },
  {
    value: "co_instructor",
    label: "Co-Instructor",
    description: "Can edit content, appear in the instructor list.",
  },
  {
    value: "assistant",
    label: "Assistant",
    description: "Helps with grading & Q&A but can't publish changes.",
  },
];

const schema = Yup.object().shape({
  instructorIdentifier: Yup.string()
    .trim()
    .min(2, "Enter a valid email or instructor ID.")
    .required("Enter an email or instructor ID."),
  role: Yup.mixed<CourseInstructorRole>()
    .oneOf(["primary", "co_instructor", "assistant"], "Pick a role.")
    .required("Pick a role."),
  revenueSharePercent: Yup.number()
    .typeError("Enter a number.")
    .min(0, "Can't be negative.")
    .max(100, "Can't exceed 100%.")
    .required("Revenue share is required."),
  isPrimary: Yup.boolean().default(false),
});

type FormValues = Yup.InferType<typeof schema>;

// ----------------------------------------------------------------------

export interface AddInstructorModalProps {
  open: boolean;
  /** The course we're adding an instructor TO. */
  course: Course | null;
  /** Instructors already on the course (for the revenue-share preview). */
  existingInstructors: CourseInstructor[];
  onClose: () => void;
  onSaved?: () => void;
}

// ----------------------------------------------------------------------

export function AddInstructorModal({
  open,
  course,
  existingInstructors,
  onClose,
  onSaved,
}: AddInstructorModalProps) {
  const addInstructor = useAddCourseInstructor();

  const existingTotal = useMemo(
    () =>
      existingInstructors.reduce(
        (sum, i) => sum + (i.revenueSharePercent ?? 0),
        0,
      ),
    [existingInstructors],
  );

  const defaultValues: FormValues = useMemo(
    () => ({
      instructorIdentifier: "",
      role: "co_instructor" as CourseInstructorRole,
      revenueSharePercent: Math.max(0, 100 - existingTotal),
      isPrimary: false,
    }),
    [existingTotal],
  );

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

  // Reset whenever the modal opens.
  useEffect(() => {
    if (open) {
      reset({
        instructorIdentifier: "",
        role: "co_instructor",
        revenueSharePercent: Math.max(0, 100 - existingTotal),
        isPrimary: false,
      });
    }
  }, [open, existingTotal, reset]);

  const role = watch("role");
  const revenueSharePercent = watch("revenueSharePercent");
  const isPrimary = watch("isPrimary");

  // --------------------------------------------------------------------

  // Preview list — existing instructors + a synthetic "new instructor" row.
  const previewInstructors: CourseInstructor[] = useMemo(() => {
    const placeholderId = "__new__";
    const synthetic: CourseInstructor = {
      id: placeholderId,
      tenantId: course?.tenantId ?? "",
      courseId: course?.id ?? "",
      instructorId: placeholderId,
      instructorName: "New instructor",
      role,
      revenueSharePercent: revenueSharePercent ?? 0,
      isPrimary,
      addedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return [...existingInstructors, synthetic];
  }, [
    course?.tenantId,
    course?.id,
    existingInstructors,
    role,
    revenueSharePercent,
    isPrimary,
  ]);

  const newTotal = existingTotal + (revenueSharePercent ?? 0);
  const wouldOverflow = newTotal > 100.01;

  // --------------------------------------------------------------------

  const onSubmit = (values: FormValues) => {
    if (!course) return;

    const input: CourseInstructorCreateInput = {
      courseId: course.id,
      // The backend accepts an instructor ID — we pass the typed-in
      // identifier as-is. In production, a user-search API would resolve
      // email → userId before this point.
      instructorId: values.instructorIdentifier.trim(),
      role: values.role,
      revenueSharePercent: values.revenueSharePercent,
      isPrimary: values.isPrimary,
    };

    void addInstructor.mutate(input).then((result) => {
      if (result) {
        onSaved?.();
        onClose();
      }
    });
  };

  const isSubmitting = addInstructor.loading;

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
                  Add instructor
                </h2>
                {course && (
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-dark-300">
                    For · {course.title}
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
              {/* Identifier */}
              <Input
                label="Email or instructor ID"
                placeholder="instructor@example.com  ·  or  ·  usr_abc123"
                prefix={<UserPlusIcon className="size-4" />}
                description="In Phase 4 we pass the typed identifier straight to the backend — a future user-search API will resolve emails to user IDs."
                error={errors.instructorIdentifier?.message}
                {...register("instructorIdentifier")}
              />

              {/* Role */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-dark-100">
                  Role
                </label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {ROLES.map((r) => {
                    const selected = role === r.value;
                    return (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() =>
                          setValue("role", r.value, {
                            shouldValidate: true,
                            shouldDirty: true,
                          })
                        }
                        className={clsx(
                          "rounded-lg border p-2.5 text-left transition-colors",
                          selected
                            ? "border-primary-500 bg-primary-500/5 dark:border-primary-400 dark:bg-primary-500/10"
                            : "border-gray-200 hover:border-gray-300 dark:border-dark-500 dark:hover:border-dark-400",
                        )}
                      >
                        <p
                          className={clsx(
                            "text-sm font-medium",
                            selected
                              ? "text-primary-700 dark:text-primary-300"
                              : "text-gray-800 dark:text-dark-100",
                          )}
                        >
                          {r.label}
                        </p>
                        <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-dark-300">
                          {r.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
                {errors.role && (
                  <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                    {errors.role.message}
                  </p>
                )}
              </div>

              {/* Revenue share + isPrimary */}
              <div className="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Revenue share (%)"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  placeholder="0"
                  description={`Existing total: ${existingTotal.toFixed(0)}%`}
                  error={errors.revenueSharePercent?.message}
                  {...register("revenueSharePercent")}
                />
                <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500">
                  <div>
                    <p className="flex items-center gap-1.5 text-sm font-medium text-gray-800 dark:text-dark-100">
                      <StarIcon className="size-4 text-warning-500" />
                      Primary instructor
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-300">
                      Mark this instructor as the main face of the course.
                    </p>
                  </div>
                  <Switch
                    checked={isPrimary}
                    onChange={(e) =>
                      setValue("isPrimary", e.target.checked, {
                        shouldDirty: true,
                      })
                    }
                    aria-label="Toggle primary instructor"
                  />
                </div>
              </div>

              {/* Overflow warning */}
              {wouldOverflow && (
                <div className="flex items-start gap-2 rounded-md bg-error-500/10 p-3 text-xs text-error-700 dark:text-error-300">
                  <ExclamationTriangleIcon className="mt-0.5 size-4 shrink-0" />
                  <div>
                    <p className="font-semibold">
                      Total would reach {newTotal.toFixed(0)}%
                    </p>
                    <p className="mt-0.5">
                      The revenue split must sum to 100%. Lower the new share
                      or edit an existing instructor.
                    </p>
                  </div>
                </div>
              )}

              {/* Live preview */}
              <Card className="p-4" skin="bordered">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Revenue split preview
                </p>
                <RevenueShareBar instructors={previewInstructors} preview />
              </Card>

              {addInstructor.error && (
                <p className="flex items-center gap-1.5 rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
                  <ExclamationTriangleIcon className="size-4 shrink-0" />
                  {addInstructor.error.message ||
                    "Couldn't add the instructor. Please try again."}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-dark-600">
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
                  disabled={isSubmitting || wouldOverflow}
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="size-4 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    <>
                      <UserPlusIcon className="size-4" />
                      Add instructor
                    </>
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

export default AddInstructorModal;
