// BadgeManagement — admin CRUD surface for badges.
//
// Lists all tenant badges in a table with name, slug, criteria, points
// reward, active toggle, and edit / delete actions. The "Create Badge"
// button and per-row "Edit" action both open the shared
// `BadgeEditorModal`; row-level delete uses a `window.confirm` (the
// Phase 4 drip-manager + prerequisite-manager pages use the same pattern).
//
// The four mutation hooks (`useCreateBadge`, `useUpdateBadge`,
// `useDeleteBadge`) are mounted here so the modal stays presentational —
// each `mutate(...)` call passes the row id at call time.

// Import Dependencies
import { useState } from "react";
import clsx from "clsx";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowPathIcon,
  TrophyIcon,
  LockOpenIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import {
  Badge as UiBadge,
  Button,
  Card,
  Switch,
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
  useBadges,
  useCreateBadge,
  useDeleteBadge,
  useUpdateBadge,
} from "@/hooks/useProEngagement";
import type {
  Badge,
  BadgeCreateInput,
  BadgeCriteriaType,
} from "@/types/lms";

// Local Imports (component)
import { BadgeEditorModal } from "./BadgeEditorModal";

// ----------------------------------------------------------------------

const CRITERIA_LABELS: Record<BadgeCriteriaType, string> = {
  course_completed: "Course completed",
  lessons_completed: "Lessons completed",
  quiz_passed: "Quiz passed",
  points_earned: "Points earned",
  streak_days: "Streak days",
};

// ----------------------------------------------------------------------

export function BadgeManagement() {
  const badgesQuery = useBadges();
  const createBadge = useCreateBadge();
  const updateBadge = useUpdateBadge();
  const deleteBadge = useDeleteBadge();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Badge | null>(null);

  const badges: Badge[] = badgesQuery.data ?? [];

  // --------------------------------------------------------------------

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (badge: Badge) => {
    setEditing(badge);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
  };

  const handleSaved = () => {
    void badgesQuery.refetch();
    createBadge.reset();
    updateBadge.reset();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Delete the "${name}" badge? This cannot be undone.`))
      return;
    await deleteBadge.mutate(id);
    void badgesQuery.refetch();
  };

  /** Inline toggle of `isActive` for a row, without opening the modal. */
  const toggleActive = async (badge: Badge) => {
    await updateBadge.mutate({
      id: badge.id,
      input: { isActive: !badge.isActive },
    });
    void badgesQuery.refetch();
  };

  const saving = createBadge.loading || updateBadge.loading;
  const saveError = createBadge.error ?? updateBadge.error;

  // --------------------------------------------------------------------

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-dark-50">
            <TrophyIcon className="size-5 text-warning-500 dark:text-warning-400" />
            Badge Management
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Create, edit, and deactivate the badges students can earn.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            isIcon
            variant="flat"
            color="neutral"
            className="size-9"
            onClick={() => void badgesQuery.refetch()}
            aria-label="Refresh badges"
          >
            <ArrowPathIcon className="size-5 stroke-2" />
          </Button>
          <Button
            color="primary"
            variant="filled"
            className="gap-1.5"
            onClick={openCreate}
          >
            <PlusIcon className="size-4 stroke-2" />
            <span className="hidden sm:inline">Create Badge</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </header>

      {/* Table / states */}
      {badgesQuery.loading ? (
        <LoadingState message="Loading badges…" />
      ) : badgesQuery.error ? (
        <ErrorState
          error={badgesQuery.error}
          onRetry={badgesQuery.refetch}
        />
      ) : badges.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={TrophyIcon}
            title="No badges yet"
            description="Create your first badge to start rewarding student progress."
            actionLabel="Create Badge"
            onAction={openCreate}
          />
        </Card>
      ) : (
        <Card skin="bordered" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table hoverable>
              <THead>
                <Tr>
                  <Th className="text-left">Name</Th>
                  <Th className="text-left">Slug</Th>
                  <Th className="text-left">Criteria</Th>
                  <Th className="text-right">Points</Th>
                  <Th className="text-center">Active</Th>
                  <Th className="text-right">Actions</Th>
                </Tr>
              </THead>
              <TBody>
                {badges.map((b) => (
                  <Tr key={b.id}>
                    {/* Name */}
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <div
                          className={clsx(
                            "flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-bold uppercase",
                            "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
                          )}
                        >
                          {b.name.trim().charAt(0) || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                            {b.name}
                          </p>
                          {b.description && (
                            <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                              {b.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </Td>

                    {/* Slug */}
                    <Td>
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-600 dark:bg-dark-600 dark:text-dark-200">
                        {b.slug}
                      </code>
                    </Td>

                    {/* Criteria */}
                    <Td>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-800 dark:text-dark-100">
                          {CRITERIA_LABELS[b.criteria.type] ?? b.criteria.type}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-dark-300">
                          threshold: {b.criteria.threshold}
                          {b.criteria.courseId && (
                            <>
                              {" · course: "}
                              <code className="font-mono text-[10px]">
                                {b.criteria.courseId.slice(-6)}
                              </code>
                            </>
                          )}
                        </span>
                      </div>
                    </Td>

                    {/* Points */}
                    <Td className="text-right">
                      <UiBadge
                        color={
                          (b.pointsReward ?? 0) > 0 ? "primary" : "neutral"
                        }
                        variant="soft"
                        className="gap-1"
                      >
                        +{b.pointsReward ?? 0}
                      </UiBadge>
                    </Td>

                    {/* Active toggle */}
                    <Td className="text-center">
                      <Switch
                        checked={b.isActive}
                        onChange={() => toggleActive(b)}
                        disabled={updateBadge.loading}
                        aria-label={`Toggle ${b.name} active state`}
                      />
                      <span className="mt-1 block text-[11px] text-gray-500 dark:text-dark-300">
                        {b.isActive ? (
                          <span className="inline-flex items-center gap-0.5">
                            <LockOpenIcon className="size-3" />
                            Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-0.5">
                            <LockClosedIcon className="size-3" />
                            Hidden
                          </span>
                        )}
                      </span>
                    </Td>

                    {/* Actions */}
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          isIcon
                          variant="flat"
                          color="primary"
                          className="size-8"
                          onClick={() => openEdit(b)}
                          aria-label={`Edit ${b.name}`}
                        >
                          <PencilSquareIcon className="size-4 stroke-2" />
                        </Button>
                        <Button
                          isIcon
                          variant="flat"
                          color="error"
                          className="size-8"
                          onClick={() => handleDelete(b.id, b.name)}
                          disabled={deleteBadge.loading}
                          aria-label={`Delete ${b.name}`}
                        >
                          <TrashIcon className="size-4 stroke-2" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Create / edit modal */}
      <BadgeEditorModal
        open={modalOpen}
        badge={editing}
        onCreate={(input: BadgeCreateInput) =>
          createBadge.mutate(input).then((r) => r ?? null)
        }
        onUpdate={(id: string, input: Partial<BadgeCreateInput>) =>
          updateBadge.mutate({ id, input }).then((r) => r ?? null)
        }
        saving={saving}
        error={saveError}
        onClose={closeModal}
        onSaved={handleSaved}
      />

      {/* Delete error banner */}
      {deleteBadge.error && (
        <p className="flex items-center gap-1.5 rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
          <TrashIcon className="size-4 shrink-0" />
          {deleteBadge.error.message || "Couldn't delete the badge."}
        </p>
      )}
    </div>
  );
}

export default BadgeManagement;
