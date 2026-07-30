// AssignToCourseModal — bind a certificate template to a course.
//
// Two selects (course, template), an "auto-issue on completion" toggle, and
// an "Assign" button that calls `useAssignCertificateToCourse({ courseId,
// templateId, autoIssue })`. Courses come from the Phase-1 `useCourses()`
// hook; templates from `useCertificateTemplates()`.

// Import Dependencies
import { useEffect, useMemo, useState } from "react";
import {
  AcademicCapIcon,
  XMarkIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Input, Select, Switch } from "@/components/ui";
import { useCourses } from "@/hooks/useLms";
import {
  useCertificateTemplates,
  useAssignCertificateToCourse,
} from "@/hooks/useProAuthoring";

// ----------------------------------------------------------------------

export interface AssignToCourseModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional pre-selected course id (e.g. coming from a course detail page). */
  defaultCourseId?: string;
  /** Optional pre-selected template id. */
  defaultTemplateId?: string;
}

// ----------------------------------------------------------------------

export default function AssignToCourseModal({
  open,
  onClose,
  defaultCourseId,
  defaultTemplateId,
}: AssignToCourseModalProps) {
  const courses = useCourses();
  const templates = useCertificateTemplates();
  const assign = useAssignCertificateToCourse();

  const [courseId, setCourseId] = useState(defaultCourseId ?? "");
  const [templateId, setTemplateId] = useState(defaultTemplateId ?? "");
  const [autoIssue, setAutoIssue] = useState(true);
  const [done, setDone] = useState(false);

  // Reset form whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setCourseId(defaultCourseId ?? "");
      setTemplateId(defaultTemplateId ?? "");
      setAutoIssue(true);
      setDone(false);
      assign.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Filter to active templates only — inactive ones can't be issued.
  const templateOptions = useMemo(
    () =>
      (templates.data ?? [])
        .filter((t) => t.isActive)
        .map((t) => ({
          value: t.id,
          label: `${t.name}${t.orientation ? ` (${t.orientation})` : ""}`,
        })),
    [templates.data],
  );

  const courseOptions = useMemo(
    () =>
      (courses.data ?? []).map((c) => ({
        value: c.id,
        label: c.title,
      })),
    [courses.data],
  );

  if (!open) return null;

  const canSubmit =
    courseId.trim() !== "" &&
    templateId.trim() !== "" &&
    !assign.loading &&
    !done;

  const handleSubmit = () => {
    if (!canSubmit) return;
    void assign
      .mutate({
        courseId,
        templateId,
        autoIssue,
      })
      .then((result) => {
        if (result) setDone(true);
      });
  };

  // ------------------------------------------------------------------
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !assign.loading) onClose();
      }}
    >
      <Card
        skin="bordered"
        className="w-full max-w-lg overflow-hidden bg-white dark:bg-dark-750"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-dark-600">
          <div className="flex items-center gap-2">
            <AcademicCapIcon className="size-5 text-primary-500" />
            <div>
              <h2
                id="assign-modal-title"
                className="text-sm font-semibold text-gray-800 dark:text-dark-50"
              >
                Assign certificate to course
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                Bind a template to a course so completions get a certificate.
              </p>
            </div>
          </div>
          <Button
            isIcon
            variant="flat"
            color="neutral"
            className="size-7"
            onClick={onClose}
            disabled={assign.loading}
            aria-label="Close"
          >
            <XMarkIcon className="size-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {done ? (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-success-500/10 text-success-500 dark:bg-success-500/15 dark:text-success-400">
                <AcademicCapIcon className="size-6 stroke-2" />
              </div>
              <p className="mt-3 text-sm font-semibold text-gray-800 dark:text-dark-100">
                Assigned successfully
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
                {autoIssue
                  ? "Future completions will auto-issue a certificate using this template."
                  : "The template is now bound to the course."}
              </p>
              <Button
                color="primary"
                variant="soft"
                className="mt-4 text-xs"
                onClick={onClose}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              {courses.loading ? (
                <p className="text-xs text-gray-500 dark:text-dark-300">
                  Loading courses…
                </p>
              ) : courses.error ? (
                <p className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
                  {courses.error.message || "Couldn't load courses."}
                </p>
              ) : (
                <Select
                  label="Course"
                  placeholder="Select a course…"
                  value={courseId}
                  onChange={(e) =>
                    setCourseId((e.target as HTMLSelectElement).value)
                  }
                  data={
                    courseOptions.length
                      ? courseOptions
                      : [{ value: "", label: "No courses available" }]
                  }
                />
              )}

              {templates.loading ? (
                <p className="text-xs text-gray-500 dark:text-dark-300">
                  Loading templates…
                </p>
              ) : templates.error ? (
                <p className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
                  {templates.error.message || "Couldn't load templates."}
                </p>
              ) : (
                <Select
                  label="Certificate template"
                  placeholder="Select a template…"
                  value={templateId}
                  onChange={(e) =>
                    setTemplateId((e.target as HTMLSelectElement).value)
                  }
                  data={
                    templateOptions.length
                      ? templateOptions
                      : [
                          {
                            value: "",
                            label: "No active templates — create one first",
                          },
                        ]
                  }
                />
              )}

              {/* Auto-issue toggle */}
              <div className="flex items-start justify-between gap-3 rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500">
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                    Auto-issue on completion
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-300">
                    When a student completes the course, issue their
                    certificate automatically using this template.
                  </p>
                </div>
                <Switch
                  checked={autoIssue}
                  onChange={(e) => setAutoIssue(e.target.checked)}
                />
              </div>

              {/* Filter hint */}
              <Input
                label="Filter hint"
                value={
                  autoIssue
                    ? "Existing completions will NOT be back-filled — only new completions."
                    : "You can still issue certificates manually from the Issued Certificates screen."
                }
                readOnly
                unstyled
                classNames={{ wrapper: "mt-0" }}
                className="text-[11px] italic text-gray-500 dark:text-dark-300"
              />

              {assign.error && (
                <p className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
                  {assign.error.message || "Couldn't assign the template."}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-dark-600">
                <Button
                  variant="flat"
                  color="neutral"
                  onClick={onClose}
                  disabled={assign.loading}
                >
                  Cancel
                </Button>
                <Button
                  color="primary"
                  onClick={handleSubmit}
                  disabled={!canSubmit}
                  className="gap-1.5"
                >
                  {assign.loading ? (
                    <>
                      <ArrowPathIcon className="size-4 animate-spin" />
                      Assigning…
                    </>
                  ) : (
                    <>
                      <AcademicCapIcon className="size-4 stroke-2" />
                      Assign to course
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}

export default AssignToCourseModal;
