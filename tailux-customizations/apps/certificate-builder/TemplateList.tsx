// TemplateList — grid of certificate templates with create / edit /
// duplicate / delete / preview actions.
//
// Backed by the Phase 4 hooks:
//   - `useCertificateTemplates()`           — list
//   - `useCreateCertificateTemplate()`      — create new template
//   - `useDuplicateCertificateTemplate()`   — clone
//   - `useDeleteCertificateTemplate()`      — remove
//   - `usePreviewCertificateTemplate()`     — render a sample preview URL
//
// Clicking a card opens the visual editor (parent passes `onEdit(id)`).
// "Preview" triggers the server-side preview render and opens the returned
// `previewUrl` in a new tab.

// Import Dependencies
import { useState, useCallback } from "react";
import clsx from "clsx";
import {
  PlusIcon,
  PencilSquareIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  EyeIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon as TemplatesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Textarea, Select, Switch } from "@/components/ui";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/lms";
import {
  useCertificateTemplates,
  useCreateCertificateTemplate,
  useDuplicateCertificateTemplate,
  useDeleteCertificateTemplate,
  usePreviewCertificateTemplate,
} from "@/hooks/useProAuthoring";
import type { CertificateTemplate } from "@/types/lms";

// ----------------------------------------------------------------------

export interface TemplateListProps {
  /** Called with the template id when the user clicks "Edit" or the card. */
  onEdit: (templateId: string) => void;
}

// ----------------------------------------------------------------------

export default function TemplateList({ onEdit }: TemplateListProps) {
  const list = useCertificateTemplates();
  const createTpl = useCreateCertificateTemplate();
  const duplicateTpl = useDuplicateCertificateTemplate();
  const deleteTpl = useDeleteCertificateTemplate();
  const previewTpl = usePreviewCertificateTemplate();

  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Composer state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(
    "landscape",
  );
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [accentColor, setAccentColor] = useState("#c7d2fe");
  const [fontFamily, setFontFamily] = useState("Inter, sans-serif");
  const [isActive, setIsActive] = useState(true);

  const resetComposer = useCallback(() => {
    setName("");
    setDescription("");
    setOrientation("landscape");
    setPrimaryColor("#4f46e5");
    setAccentColor("#c7d2fe");
    setFontFamily("Inter, sans-serif");
    setIsActive(true);
  }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim()) return;
    void createTpl
      .mutate({
        name: name.trim(),
        orientation,
        primaryColor,
        accentColor,
        fontFamily,
        isActive,
        htmlTemplate: description.trim() || undefined,
      })
      .then((result) => {
        if (result) {
          resetComposer();
          setCreating(false);
          void list.refetch();
        }
      });
  }, [
    name,
    orientation,
    primaryColor,
    accentColor,
    fontFamily,
    isActive,
    description,
    createTpl,
    resetComposer,
    list,
  ]);

  const handleDuplicate = useCallback(
    (tpl: CertificateTemplate) => {
      void duplicateTpl.mutate(tpl.id).then((result) => {
        if (result) void list.refetch();
      });
    },
    [duplicateTpl, list],
  );

  const handleDelete = useCallback(
    (id: string) => {
      void deleteTpl.mutate(id).then((result) => {
        if (result) {
          setConfirmDeleteId(null);
          void list.refetch();
        }
      });
    },
    [deleteTpl, list],
  );

  const handlePreview = useCallback(
    (tpl: CertificateTemplate) => {
      void previewTpl
        .mutate({
          templateId: tpl.id,
          studentName: "Student Name",
          courseTitle: "Sample Course Title",
          instructorName: "Instructor Name",
          score: 95,
        })
        .then((result) => {
          if (result?.previewUrl) {
            window.open(result.previewUrl, "_blank", "noopener,noreferrer");
          }
        });
    },
    [previewTpl],
  );

  // ------------------------------------------------------------------
  // Loading / error / empty states
  // ------------------------------------------------------------------
  if (list.loading && !list.data) {
    return <LoadingState message="Loading certificate templates…" />;
  }
  if (list.error) {
    return (
      <ErrorState
        error={list.error}
        onRetry={() => void list.refetch()}
        title="Couldn't load templates"
      />
    );
  }
  const templates = list.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Certificate Templates
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Design templates that auto-issue when students complete a course.
          </p>
        </div>
        <Button
          color="primary"
          className="gap-1.5"
          onClick={() => setCreating(true)}
        >
          <PlusIcon className="size-4 stroke-2" />
          Create template
        </Button>
      </header>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Templates</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {templates.length}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Active</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {templates.filter((t) => t.isActive).length}
          </p>
        </Card>
        <Card className="p-3.5">
          <p className="text-xs text-gray-500 dark:text-dark-300">Drafts</p>
          <p className="mt-0.5 text-lg font-semibold text-gray-800 dark:text-dark-50">
            {templates.filter((t) => !t.isActive).length}
          </p>
        </Card>
      </div>

      {/* Inline composer */}
      {creating && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Create new template
            </h3>
            <Button
              variant="flat"
              color="neutral"
              isIcon
              onClick={() => setCreating(false)}
              aria-label="Cancel create"
            >
              <PlusIcon className="size-5 rotate-45 stroke-2" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Template name"
              placeholder="e.g. Premium Emerald"
              value={name}
              onChange={(e) =>
                setName((e.target as HTMLInputElement).value)
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <Select
              label="Orientation"
              value={orientation}
              onChange={(e) =>
                setOrientation(
                  (e.target as HTMLSelectElement).value as
                    | "landscape"
                    | "portrait",
                )
              }
              data={[
                { value: "landscape", label: "Landscape (4:3)" },
                { value: "portrait", label: "Portrait (3:4)" },
              ]}
            />
          </div>

          <Textarea
            label="Description"
            rows={2}
            placeholder="Short note about the design / when to use it."
            value={description}
            onChange={(e) =>
              setDescription((e.target as HTMLTextAreaElement).value)
            }
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="Primary color"
              type="color"
              value={primaryColor}
              onChange={(e) =>
                setPrimaryColor((e.target as HTMLInputElement).value)
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Accent color"
              type="color"
              value={accentColor}
              onChange={(e) =>
                setAccentColor((e.target as HTMLInputElement).value)
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <Select
              label="Font family"
              value={fontFamily}
              onChange={(e) =>
                setFontFamily((e.target as HTMLSelectElement).value)
              }
              data={[
                { value: "Inter, sans-serif", label: "Inter (sans)" },
                { value: "Georgia, serif", label: "Georgia (serif)" },
                {
                  value: "Helvetica, sans-serif",
                  label: "Helvetica (sans)",
                },
                {
                  value: "Playfair Display, serif",
                  label: "Playfair (serif)",
                },
              ]}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-dark-700">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                Active
              </p>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Active templates can be linked to courses and issued.
              </p>
            </div>
            <Switch
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
          </div>

          {createTpl.error && (
            <p className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
              {createTpl.error.message || "Couldn't create the template."}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="flat"
              color="neutral"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleCreate}
              disabled={!name.trim() || createTpl.loading}
              className="gap-1.5"
            >
              <PlusIcon className="size-4 stroke-2" />
              {createTpl.loading ? "Creating…" : "Create template"}
            </Button>
          </div>
        </Card>
      )}

      {/* Templates grid */}
      {templates.length === 0 ? (
        <EmptyState
          icon={TemplatesIcon}
          title="No certificate templates yet"
          description="Create your first template to start issuing certificates to students."
          actionLabel="Create template"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              template={tpl}
              onEdit={() => onEdit(tpl.id)}
              onDuplicate={() => handleDuplicate(tpl)}
              onDelete={() => setConfirmDeleteId(tpl.id)}
              onPreview={() => handlePreview(tpl)}
              confirmingDelete={confirmDeleteId === tpl.id}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onConfirmDelete={() => handleDelete(tpl.id)}
              deleting={deleteTpl.loading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

interface TemplateCardProps {
  template: CertificateTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onPreview: () => void;
  confirmingDelete: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  deleting: boolean;
}

function TemplateCard({
  template: tpl,
  onEdit,
  onDuplicate,
  onDelete,
  onPreview,
  confirmingDelete,
  onCancelDelete,
  onConfirmDelete,
  deleting,
}: TemplateCardProps) {
  const orientation = tpl.orientation === "portrait" ? "portrait" : "landscape";
  const primary = tpl.primaryColor ?? "#4f46e5";
  const accent = tpl.accentColor ?? "#c7d2fe";
  const font = tpl.fontFamily ?? "Inter, sans-serif";

  return (
    <Card skin="shadow" className="flex flex-col overflow-hidden p-0">
      {/* Thumbnail */}
      <button
        type="button"
        onClick={onEdit}
        className={clsx(
          "relative flex w-full items-center justify-center border-b border-gray-100 p-6 dark:border-dark-600",
          orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]",
        )}
        style={{ background: accent }}
        aria-label={`Edit ${tpl.name}`}
      >
        {tpl.backgroundUrl ? (
          <img
            src={tpl.backgroundUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-3 rounded-md border-4"
            style={{ borderColor: primary }}
          />
        )}
        <div
          className="relative z-10 text-center"
          style={{ fontFamily: font }}
        >
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.3em]"
            style={{ color: primary }}
          >
            Certificate of Completion
          </p>
          <p
            className="mt-2 text-sm font-bold"
            style={{ color: primary }}
          >
            {tpl.name}
          </p>
          <div
            className="mx-auto mt-2 h-px w-12"
            style={{ background: primary }}
          />
          <p className="mt-2 text-[10px]" style={{ color: primary }}>
            This is to certify that
          </p>
          <p
            className="mt-1 text-xs font-semibold"
            style={{ color: primary }}
          >
            Student Name
          </p>
        </div>
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
              {tpl.name}
            </h3>
            <p className="text-[11px] capitalize text-gray-500 dark:text-dark-300">
              {orientation}
            </p>
          </div>
          {tpl.isActive ? (
            <Badge color="success" variant="soft" className="gap-1 text-[10px]">
              <CheckCircleIcon className="size-3" />
              Active
            </Badge>
          ) : (
            <Badge color="neutral" variant="soft" className="text-[10px]">
              Inactive
            </Badge>
          )}
        </div>

        {tpl.htmlTemplate && (
          <p className="line-clamp-2 text-xs text-gray-600 dark:text-dark-200">
            {tpl.htmlTemplate}
          </p>
        )}

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-dark-300">
            <span
              className="size-3 rounded-full ring-1 ring-gray-200 dark:ring-dark-500"
              style={{ background: primary }}
            />
            {primary}
          </span>
          <span className="text-[11px] text-gray-400 dark:text-dark-400">·</span>
          <span className="text-[11px] text-gray-500 dark:text-dark-300">
            {font.split(",")[0]}
          </span>
        </div>

        {/* Delete-confirm overlay vs. normal actions */}
        {confirmingDelete ? (
          <div className="mt-auto space-y-2 border-t border-error-500/30 pt-3">
            <p className="text-xs text-error-600 dark:text-error-400">
              Delete this template? This cannot be undone.
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="flat"
                color="neutral"
                className="h-7 flex-1 text-xs"
                onClick={onCancelDelete}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                color="error"
                className="h-7 flex-1 text-xs"
                onClick={onConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Delete"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-3 dark:border-dark-600">
            <Button
              variant="soft"
              color="primary"
              className="gap-1.5 text-xs"
              onClick={onEdit}
            >
              <PencilSquareIcon className="size-3.5 stroke-2" />
              Edit
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="flat"
                color="neutral"
                isIcon
                aria-label="Preview template"
                onClick={onPreview}
              >
                <EyeIcon className="size-4 stroke-2" />
              </Button>
              <Button
                variant="flat"
                color="neutral"
                isIcon
                aria-label="Duplicate template"
                onClick={onDuplicate}
              >
                <DocumentDuplicateIcon className="size-4 stroke-2" />
              </Button>
              <Button
                variant="flat"
                color="error"
                isIcon
                aria-label="Delete template"
                onClick={onDelete}
              >
                <TrashIcon className="size-4 stroke-2" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default TemplateList;
