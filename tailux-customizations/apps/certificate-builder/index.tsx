// Certificate Builder — `apps/certificate-builder` route.
//
// Stub page for Phase 4 Pro Authoring. The full canvas editor UI is being
// built by a later phase; for now this page surfaces a list of the tenant's
// certificate templates + a "Create template" CTA backed by the
// `useCertificateTemplates` / `useCreateCertificateTemplate` hooks.

// Import Dependencies
import { useState } from "react";
import {
  AcademicCapIcon,
  ArrowPathIcon,
  PlusIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Badge, Button, Card, Input, ScrollShadow } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useCertificateTemplates,
  useCreateCertificateTemplate,
} from "@/hooks/useProAuthoring";
import type { LmsApiError } from "@/services/lms-api";
import type { CertificateTemplate } from "@/types/lms";

// ----------------------------------------------------------------------

export default function CertificateBuilderPage() {
  const templatesQuery = useCertificateTemplates();
  const createTemplate = useCreateCertificateTemplate();

  const [newName, setNewName] = useState<string>("");
  const [showCreate, setShowCreate] = useState<boolean>(false);

  const templates: CertificateTemplate[] = templatesQuery.data ?? [];

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createTemplate.mutate({
        name: newName.trim(),
        orientation: "landscape",
        isActive: false,
      });
      setNewName("");
      setShowCreate(false);
      void templatesQuery.refetch();
    } catch {
      // surfaced via createTemplate.error
    }
  };

  return (
    <Page title="Certificate Builder">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <AcademicCapIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Certificate Builder
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Design reusable certificate templates with the canvas editor.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              isIcon
              variant="flat"
              color="neutral"
              className="size-9"
              onClick={() => void templatesQuery.refetch()}
              aria-label="Refresh"
            >
              <ArrowPathIcon className="size-5 stroke-2" />
            </Button>
            <Button
              color="primary"
              variant="filled"
              className="gap-1.5"
              onClick={() => setShowCreate((s) => !s)}
            >
              <PlusIcon className="size-4 stroke-2" />
              <span className="hidden sm:inline">New Template</span>
            </Button>
          </div>
        </header>

        <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
          <div className="mx-auto max-w-6xl px-6 py-6">
            {showCreate && (
              <Card skin="bordered" className="mb-4 p-4">
                <h2 className="mb-3 text-sm font-semibold text-gray-800 dark:text-dark-50">
                  Create a new template
                </h2>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="grow">
                    <label
                      htmlFor="tpl-name"
                      className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-200"
                    >
                      Template name
                    </label>
                    <Input
                      id="tpl-name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. Course Completion Certificate"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      color="neutral"
                      variant="flat"
                      onClick={() => setShowCreate(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      color="primary"
                      variant="filled"
                      onClick={handleCreate}
                      disabled={createTemplate.loading || !newName.trim()}
                    >
                      {createTemplate.loading ? "Creating…" : "Create"}
                    </Button>
                  </div>
                </div>
                {createTemplate.error && (
                  <p className="mt-2 text-xs text-error-500 dark:text-error-400">
                    {(createTemplate.error as LmsApiError).message ??
                      "Failed to create template."}
                  </p>
                )}
              </Card>
            )}

            {templatesQuery.loading ? (
              <LoadingState message="Loading templates…" />
            ) : templatesQuery.error ? (
              <ErrorState
                error={templatesQuery.error}
                onRetry={templatesQuery.refetch}
              />
            ) : templates.length === 0 ? (
              <EmptyState
                icon={SparklesIcon}
                title="No certificate templates yet"
                description="Create your first template to start designing certificates for your courses."
                actionLabel="New Template"
                onAction={() => setShowCreate(true)}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {templates.map((tpl) => (
                  <Card key={tpl.id} skin="bordered" className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                          {tpl.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-dark-300">
                          {tpl.orientation ?? "landscape"}
                        </p>
                      </div>
                      {tpl.isActive && (
                        <Badge color="success" variant="soft">
                          Active
                        </Badge>
                      )}
                    </div>
                    {tpl.backgroundUrl && (
                      <div className="mt-3 aspect-video w-full overflow-hidden rounded-md bg-gray-100 dark:bg-dark-600">
                        <img
                          src={tpl.backgroundUrl}
                          alt={tpl.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                    <p className="mt-3 text-xs text-gray-500 dark:text-dark-300">
                      Created {new Date(tpl.createdAt).toLocaleDateString()}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollShadow>
      </div>
    </Page>
  );
}
