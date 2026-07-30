// AddPrerequisiteModal — modal for adding a prerequisite course to a course.
//
// Backed by `useCreatePrerequisite` from `@/hooks/useProAuthoring`.
// Form state is managed with `react-hook-form` + `yup`.
//
// Layout:
//   - Search input (filters the course dropdown by title).
//   - Course dropdown (already excludes the current course and any course
//     that's already a prerequisite).
//   - Required / Recommended toggle.
//   - Add button (disabled until a course is picked).

// Import Dependencies
import { Fragment, useEffect, useMemo, useState } from "react";
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
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  ShieldCheckIcon,
  BookmarkIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Input, Switch } from "@/components/ui";
import { useCreatePrerequisite } from "@/hooks/useProAuthoring";
import type { Course, PrerequisiteChain } from "@/types/lms";

// ----------------------------------------------------------------------

const schema = Yup.object().shape({
  prerequisiteCourseId: Yup.string().required("Pick a prerequisite course."),
  isRequired: Yup.boolean().default(true),
});

type FormValues = Yup.InferType<typeof schema>;

// ----------------------------------------------------------------------

export interface AddPrerequisiteModalProps {
  open: boolean;
  /** The course we're adding a prerequisite TO. */
  course: Course | null;
  /** All courses available to pick from (the parent already loaded them). */
  allCourses: Course[];
  /** Prerequisites already on the course (so we can hide them from the picker). */
  existingPrereqs: PrerequisiteChain[];
  onClose: () => void;
  onSaved?: () => void;
}

// ----------------------------------------------------------------------

export function AddPrerequisiteModal({
  open,
  course,
  allCourses,
  existingPrereqs,
  onClose,
  onSaved,
}: AddPrerequisiteModalProps) {
  const createPrerequisite = useCreatePrerequisite();

  const [search, setSearch] = useState("");

  const defaultValues: FormValues = useMemo(
    () => ({
      prerequisiteCourseId: "",
      isRequired: true,
    }),
    [],
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
        prerequisiteCourseId: "",
        isRequired: true,
      });
      setSearch("");
    }
  }, [open, reset]);

  // Existing prerequisite course ids — exclude from picker.
  const existingIds = useMemo(
    () => new Set(existingPrereqs.map((p) => p.prerequisiteCourseId)),
    [existingPrereqs],
  );

  // Candidate courses: exclude the current course + already-added prereqs.
  const candidates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allCourses.filter((c) => {
      if (!course) return true;
      if (c.id === course.id) return false;
      if (existingIds.has(c.id)) return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q);
    });
  }, [allCourses, course, existingIds, search]);

  const isRequired = watch("isRequired");

  // --------------------------------------------------------------------

  const onSubmit = (values: FormValues) => {
    if (!course) return;
    if (values.prerequisiteCourseId === course.id) return;
    void createPrerequisite
      .mutate({
        courseId: course.id,
        prerequisiteCourseId: values.prerequisiteCourseId,
        isRequired: values.isRequired,
      })
      .then((result) => {
        if (result) {
          onSaved?.();
          onClose();
        }
      });
  };

  const isSubmitting = createPrerequisite.loading;

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
            className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl dark:bg-dark-700"
          >
            {/* Header */}
            <header className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-700">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-dark-50">
                  Add prerequisite
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
              className="flex-1 space-y-4 overflow-y-auto p-5"
            >
              {/* Search */}
              <Input
                label="Search courses"
                placeholder="Type a course title…"
                prefix={<MagnifyingGlassIcon className="size-4" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                description="Excludes the current course and any course already added."
              />

              {/* Course dropdown */}
              <div>
                <label className="text-xs font-semibold text-gray-700 dark:text-dark-100">
                  Prerequisite course
                </label>
                <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-md border border-gray-200 p-1 dark:border-dark-500">
                  {candidates.length === 0 && (
                    <p className="px-3 py-6 text-center text-xs text-gray-500 dark:text-dark-300">
                      No courses available. Try a different search.
                    </p>
                  )}
                  {candidates.map((c) => (
                    <label
                      key={c.id}
                      className={clsx(
                        "flex cursor-pointer items-center gap-2.5 rounded px-2 py-2 text-sm transition-colors",
                        "hover:bg-gray-100 dark:hover:bg-dark-800",
                      )}
                    >
                      <input
                        type="radio"
                        value={c.id}
                        {...register("prerequisiteCourseId")}
                        className="size-4 text-primary-600 focus:ring-primary-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
                          {c.title}
                        </p>
                        {c.excerpt && (
                          <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                            {c.excerpt}
                          </p>
                        )}
                      </div>
                      {c.status === "published" ? (
                        <span className="rounded bg-success-500/10 px-1.5 py-0.5 text-[10px] font-medium text-success-700 dark:text-success-300">
                          Published
                        </span>
                      ) : (
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-500 dark:text-dark-200">
                          {c.status}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
                {errors.prerequisiteCourseId && (
                  <p className="mt-1 text-xs text-error-600 dark:text-error-400">
                    {errors.prerequisiteCourseId.message}
                  </p>
                )}
              </div>

              {/* Required / Recommended toggle */}
              <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500">
                <div className="flex items-start gap-2">
                  {isRequired ? (
                    <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-error-600 dark:text-error-400" />
                  ) : (
                    <BookmarkIcon className="mt-0.5 size-5 shrink-0 text-info-600 dark:text-info-400" />
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                      {isRequired ? "Required" : "Recommended"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-dark-300">
                      {isRequired
                        ? "Students cannot enroll until they complete this course."
                        : "Students are nudged to complete this course, but enrollment isn't blocked."}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isRequired}
                  onChange={(e) =>
                    setValue("isRequired", e.target.checked, {
                      shouldDirty: true,
                    })
                  }
                  aria-label="Toggle required"
                />
              </div>

              {createPrerequisite.error && (
                <p className="flex items-center gap-1.5 rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
                  <ExclamationTriangleIcon className="size-4 shrink-0" />
                  {createPrerequisite.error.message ||
                    "Couldn't add the prerequisite. Please try again."}
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
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <ArrowPathIcon className="size-4 animate-spin" />
                      Adding…
                    </>
                  ) : (
                    "Add prerequisite"
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

export default AddPrerequisiteModal;

// ----------------------------------------------------------------------

// (PrereqCourseOption helper removed — radio rows are now inlined where the
// `register` function from `useForm` is in scope, which avoids a complex
// `ReturnType<ReturnType<typeof useForm>>["register"]` prop type.)
