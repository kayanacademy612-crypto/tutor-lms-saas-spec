// Multi-Instructor Manager — `apps/multi-instructor` route.
//
// Stub page for Phase 4 Pro Authoring. Surfaces a course picker + the list of
// instructor assignments for the selected course, with add/remove/role-change
// actions.

// Import Dependencies
import { useState } from "react";
import {
  UserGroupIcon,
  ArrowPathIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Badge,
  Button,
  Card,
  ScrollShadow,
  Select,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import type { ColorType } from "@/constants/app";
import {
  useCourseInstructors,
  useRemoveCourseInstructor,
} from "@/hooks/useProAuthoring";
import { useCourses } from "@/hooks/useLms";
import type { Course, CourseInstructor } from "@/types/lms";

// ----------------------------------------------------------------------

const ROLE_COLOR: Record<string, ColorType> = {
  primary: "primary",
  co_instructor: "info",
  assistant: "secondary",
};

// ----------------------------------------------------------------------

export default function MultiInstructorPage() {
  const coursesQuery = useCourses();
  const [courseId, setCourseId] = useState<string>("");
  const instructorsQuery = useCourseInstructors(courseId || undefined);
  const removeInstructor = useRemoveCourseInstructor();

  const courses: Course[] = coursesQuery.data ?? [];
  const instructors: CourseInstructor[] = instructorsQuery.data ?? [];

  const handleRemove = async (id: string) => {
    if (!window.confirm("Remove this instructor from the course?")) return;
    await removeInstructor.mutate(id);
    void instructorsQuery.refetch();
  };

  return (
    <Page title="Multi-Instructor">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <UserGroupIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Multi-Instructor
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Assign co-instructors and assistants with revenue-share splits.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="min-w-[14rem] text-sm"
            >
              <option value="">Select a course…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </Select>
            <Button
              isIcon
              variant="flat"
              color="neutral"
              className="size-9"
              onClick={() => {
                void coursesQuery.refetch();
                void instructorsQuery.refetch();
              }}
              aria-label="Refresh"
            >
              <ArrowPathIcon className="size-5 stroke-2" />
            </Button>
          </div>
        </header>

        <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-6">
            {!courseId ? (
              <EmptyState
                icon={UserGroupIcon}
                title="Select a course"
                description="Pick a course to view and manage its instructors."
              />
            ) : instructorsQuery.loading ? (
              <LoadingState message="Loading instructors…" />
            ) : instructorsQuery.error ? (
              <ErrorState
                error={instructorsQuery.error}
                onRetry={instructorsQuery.refetch}
              />
            ) : instructors.length === 0 ? (
              <EmptyState
                icon={SparklesIcon}
                title="No instructors assigned"
                description="Add a primary instructor or co-instructor to start sharing revenue."
                actionLabel="Add Instructor"
                onAction={() =>
                  window.alert(
                    "Add-instructor UI will be added by a future phase. Use the API directly for now.",
                  )
                }
              />
            ) : (
              <Card skin="bordered" className="overflow-hidden p-0">
                <Table hoverable>
                  <THead>
                    <Tr>
                      <Th className="text-left">Instructor</Th>
                      <Th className="text-left">Role</Th>
                      <Th className="text-right">Revenue share</Th>
                      <Th className="text-center">Primary</Th>
                      <Th className="text-right">Actions</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {instructors.map((ci) => (
                      <Tr key={ci.id}>
                        <Td>
                          <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                            {ci.instructorId}
                          </p>
                        </Td>
                        <Td>
                          <Badge
                            color={ROLE_COLOR[ci.role ?? "co_instructor"]}
                            variant="soft"
                          >
                            {ci.role || "co_instructor"}
                          </Badge>
                        </Td>
                        <Td className="text-right text-sm font-semibold text-gray-800 dark:text-dark-50">
                          {ci.revenueSharePercent}%
                        </Td>
                        <Td className="text-center">
                          {ci.isPrimary && (
                            <Badge color="primary" variant="soft">
                              Primary
                            </Badge>
                          )}
                        </Td>
                        <Td>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              color="error"
                              variant="flat"
                              onClick={() => handleRemove(ci.id)}
                              disabled={removeInstructor.loading}
                            >
                              Remove
                            </Button>
                          </div>
                        </Td>
                      </Tr>
                    ))}
                  </TBody>
                </Table>
              </Card>
            )}
          </div>
        </ScrollShadow>
      </div>
    </Page>
  );
}
