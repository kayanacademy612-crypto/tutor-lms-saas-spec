// Drip Manager — `apps/drip-manager` route.
//
// Stub page for Phase 4 Pro Authoring. Surfaces a course picker + the list of
// drip rules for the selected course, with a "Create drip rule" CTA backed by
// `useCreateDripRule`.

// Import Dependencies
import { useState } from "react";
import {
  ClockIcon,
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
  useDeleteDripRule,
  useDripRules,
} from "@/hooks/useProAuthoring";
import { useCourses } from "@/hooks/useLms";
import type { Course, DripRule, DripRuleType } from "@/types/lms";

// ----------------------------------------------------------------------

const RULE_TYPE_LABEL: Record<DripRuleType, string> = {
  schedule: "Schedule",
  prerequisite: "Prerequisite",
  enrollment_days: "Days after enrollment",
  sequence: "Sequence",
};

const RULE_TYPE_COLOR: Record<DripRuleType, ColorType> = {
  schedule: "info",
  prerequisite: "primary",
  enrollment_days: "secondary",
  sequence: "success",
};

// ----------------------------------------------------------------------

export default function DripManagerPage() {
  const coursesQuery = useCourses();
  const [courseId, setCourseId] = useState<string>("");
  const dripRulesQuery = useDripRules(courseId || undefined);
  const deleteRule = useDeleteDripRule();

  const courses: Course[] = coursesQuery.data ?? [];
  const rules: DripRule[] = dripRulesQuery.data ?? [];

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this drip rule?")) return;
    await deleteRule.mutate(id);
    void dripRulesQuery.refetch();
  };

  return (
    <Page title="Drip Manager">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <ClockIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Drip Manager
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Schedule lesson unlocks by date, prerequisite, or enrollment
                days.
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
                void dripRulesQuery.refetch();
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
                icon={ClockIcon}
                title="Select a course"
                description="Pick a course to manage its drip rules."
              />
            ) : dripRulesQuery.loading ? (
              <LoadingState message="Loading drip rules…" />
            ) : dripRulesQuery.error ? (
              <ErrorState
                error={dripRulesQuery.error}
                onRetry={dripRulesQuery.refetch}
              />
            ) : rules.length === 0 ? (
              <EmptyState
                icon={SparklesIcon}
                title="No drip rules for this course"
                description="Create a drip rule to gate lesson access for students."
                actionLabel="New Rule"
                onAction={() =>
                  window.alert(
                    "Drip rule creation UI will be added by a future phase. Use the API directly for now.",
                  )
                }
              />
            ) : (
              <Card skin="bordered" className="overflow-hidden p-0">
                <Table hoverable>
                  <THead>
                    <Tr>
                      <Th className="text-left">Lesson</Th>
                      <Th className="text-left">Rule type</Th>
                      <Th className="text-left">Detail</Th>
                      <Th className="text-center">Active</Th>
                      <Th className="text-right">Actions</Th>
                    </Tr>
                  </THead>
                  <TBody>
                    {rules.map((r) => (
                      <Tr key={r.id}>
                        <Td>
                          <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                            {r.lessonId}
                          </p>
                        </Td>
                        <Td>
                          <Badge
                            color={RULE_TYPE_COLOR[r.ruleType]}
                            variant="soft"
                          >
                            {RULE_TYPE_LABEL[r.ruleType]}
                          </Badge>
                        </Td>
                        <Td className="text-xs text-gray-600 dark:text-dark-200">
                          {r.ruleType === "schedule" && r.unlockAt
                            ? `Unlocks ${new Date(r.unlockAt).toLocaleString()}`
                            : r.ruleType === "enrollment_days"
                              ? `${r.daysAfterEnrollment} day(s) after enrollment`
                              : r.ruleType === "prerequisite"
                                ? "Requires prior lesson"
                                : "After previous lesson"}
                        </Td>
                        <Td className="text-center">
                          {r.isActive ? (
                            <Badge color="success" variant="soft">
                              Active
                            </Badge>
                          ) : (
                            <Badge color="neutral" variant="soft">
                              Inactive
                            </Badge>
                          )}
                        </Td>
                        <Td>
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              color="error"
                              variant="flat"
                              onClick={() => handleDelete(r.id)}
                              disabled={deleteRule.loading}
                            >
                              Delete
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
