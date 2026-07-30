// Prerequisite Manager — `apps/prerequisite-manager` route.
//
// Stub page for Phase 4 Pro Authoring. Surfaces a course picker + the list of
// course-level prerequisite chains, with create/delete actions.

// Import Dependencies
import { useState } from "react";
import {
  ArrowsRightLeftIcon,
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
import {
  useDeletePrerequisite,
  usePrerequisites,
} from "@/hooks/useProAuthoring";
import { useCourses } from "@/hooks/useLms";
import type { Course, PrerequisiteChain } from "@/types/lms";

// ----------------------------------------------------------------------

export default function PrerequisiteManagerPage() {
  const coursesQuery = useCourses();
  const [courseId, setCourseId] = useState<string>("");
  const prereqsQuery = usePrerequisites(courseId || undefined);
  const deletePrereq = useDeletePrerequisite();

  const courses: Course[] = coursesQuery.data ?? [];
  const chains: PrerequisiteChain[] = prereqsQuery.data ?? [];

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this prerequisite chain?")) return;
    await deletePrereq.mutate(id);
    void prereqsQuery.refetch();
  };

  return (
    <Page title="Prerequisite Manager">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <ArrowsRightLeftIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Prerequisite Manager
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Configure course-level prerequisites that gate enrolment.
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
                void prereqsQuery.refetch();
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
                icon={ArrowsRightLeftIcon}
                title="Select a course"
                description="Pick a course to view and manage its prerequisites."
              />
            ) : prereqsQuery.loading ? (
              <LoadingState message="Loading prerequisites…" />
            ) : prereqsQuery.error ? (
              <ErrorState
                error={prereqsQuery.error}
                onRetry={prereqsQuery.refetch}
              />
            ) : chains.length === 0 ? (
              <EmptyState
                icon={SparklesIcon}
                title="No prerequisites for this course"
                description="Add a prerequisite chain to require students to complete another course first."
                actionLabel="Add Prerequisite"
                onAction={() =>
                  window.alert(
                    "Prerequisite creation UI will be added by a future phase. Use the API directly for now.",
                  )
                }
              />
            ) : (
              <Card skin="bordered" className="overflow-hidden p-0">
                <Table hoverable>
                  <THead>
                    <Tr>
                      <Th className="text-left">Prerequisite course</Th>
                      <Th className="text-center">Type</Th>
                      <Th className="text-right">Actions</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {chains.map((c) => (
                      <Tr key={c.id}>
                        <Td>
                          <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                            {c.prerequisiteCourseId}
                          </p>
                        </Td>
                        <Td className="text-center">
                          {c.isRequired ? (
                            <Badge color="error" variant="soft">
                              Required
                            </Badge>
                          ) : (
                            <Badge color="info" variant="soft">
                              Recommended
                            </Badge>
                          )}
                        </Td>
                        <Td>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              color="error"
                              variant="flat"
                              onClick={() => handleDelete(c.id)}
                              disabled={deletePrereq.loading}
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
