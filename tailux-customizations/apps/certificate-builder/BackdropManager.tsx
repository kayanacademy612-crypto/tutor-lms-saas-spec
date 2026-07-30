// BackdropManager — library of certificate backdrop images.
//
// Grid of backdrop cards (thumbnail, name, orientation, default badge) with
// create (URL input — file upload is a TODO pending a backend upload
// endpoint) + delete actions. "Set as default" is a server-side toggle that
// marks the backdrop as the tenant's default for new templates.
//
// Backed by Phase 4 hooks:
//   - useCertificateBackdrops()
//   - useCreateCertificateBackdrop({ name, imageUrl, orientation })
//   - useDeleteCertificateBackdrop(id)
//
// NOTE: the current API surface doesn't expose a `setDefault` mutation, so
// the "Set as default" action is a no-op stub that surfaces a friendly
// notice. When the backend ships that endpoint, swap in the corresponding
// hook here.

// Import Dependencies
import { useState, useCallback } from "react";
import clsx from "clsx";
import {
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  CheckCircleIcon,
  StarIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Select } from "@/components/ui";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/lms";
import {
  useCertificateBackdrops,
  useCreateCertificateBackdrop,
  useDeleteCertificateBackdrop,
} from "@/hooks/useProAuthoring";
import type { CertificateBackdrop } from "@/types/lms";

// ----------------------------------------------------------------------

export default function BackdropManager() {
  const list = useCertificateBackdrops();
  const createBackdrop = useCreateCertificateBackdrop();
  const deleteBackdrop = useDeleteCertificateBackdrop();

  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Composer state
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(
    "landscape",
  );

  const handleCreate = useCallback(() => {
    if (!name.trim() || !imageUrl.trim()) return;
    void createBackdrop
      .mutate({
        name: name.trim(),
        imageUrl: imageUrl.trim(),
        orientation,
      })
      .then((result) => {
        if (result) {
          setName("");
          setImageUrl("");
          setOrientation("landscape");
          setCreating(false);
          void list.refetch();
        }
      });
  }, [createBackdrop, name, imageUrl, orientation, list]);

  const handleDelete = useCallback(
    (id: string) => {
      void deleteBackdrop.mutate(id).then((result) => {
        if (result) {
          setConfirmDeleteId(null);
          void list.refetch();
        }
      });
    },
    [deleteBackdrop, list],
  );

  const handleSetDefault = useCallback((b: CertificateBackdrop) => {
    // Backend endpoint pending — surface a notice so users know it's a known
    // limitation. Replace with a real mutation when the API ships.
    setNotice(
      `“${b.name}” will be used as the default once the server-side set-default endpoint ships.`,
    );
    window.setTimeout(() => setNotice(null), 4000);
  }, []);

  // ------------------------------------------------------------------
  if (list.loading && !list.data) {
    return <LoadingState message="Loading backdrops…" />;
  }
  if (list.error) {
    return (
      <ErrorState
        error={list.error}
        onRetry={() => void list.refetch()}
        title="Couldn't load backdrops"
      />
    );
  }
  const backdrops = list.data ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Backdrops
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Background images templates can use as their canvas.
          </p>
        </div>
        <Button
          color="primary"
          className="gap-1.5"
          onClick={() => setCreating(true)}
        >
          <PlusIcon className="size-4 stroke-2" />
          Add backdrop
        </Button>
      </header>

      {notice && (
        <div className="rounded-md border border-info-500/30 bg-info-500/10 px-3 py-2 text-xs text-info-700 dark:text-info-300">
          {notice}
        </div>
      )}

      {/* Inline composer */}
      {creating && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Add new backdrop
            </h3>
            <Button
              variant="flat"
              color="neutral"
              isIcon
              onClick={() => setCreating(false)}
              aria-label="Cancel"
            >
              <PlusIcon className="size-5 rotate-45 stroke-2" />
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Name"
              placeholder="e.g. Classic Gold"
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
          <Input
            label="Image URL"
            placeholder="https://…/backdrop.png"
            description="File upload is coming soon — paste a hosted URL for now."
            value={imageUrl}
            onChange={(e) =>
              setImageUrl((e.target as HTMLInputElement).value)
            }
            classNames={{ wrapper: "mt-0" }}
          />
          {imageUrl && (
            <div className="overflow-hidden rounded-md border border-gray-200 dark:border-dark-500">
              <img
                src={imageUrl}
                alt=""
                className="h-40 w-full bg-gray-50 object-contain dark:bg-dark-700"
              />
            </div>
          )}
          {createBackdrop.error && (
            <p className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
              {createBackdrop.error.message}
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
              disabled={!name.trim() || !imageUrl.trim() || createBackdrop.loading}
              className="gap-1.5"
            >
              <PlusIcon className="size-4 stroke-2" />
              {createBackdrop.loading ? "Adding…" : "Add backdrop"}
            </Button>
          </div>
        </Card>
      )}

      {/* Grid */}
      {backdrops.length === 0 ? (
        <EmptyState
          icon={PhotoIcon}
          title="No backdrops yet"
          description="Add a backdrop image so certificate templates can use it as their canvas."
          actionLabel="Add backdrop"
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {backdrops.map((b) => (
            <BackdropCard
              key={b.id}
              backdrop={b}
              onDelete={() => setConfirmDeleteId(b.id)}
              onSetDefault={() => handleSetDefault(b)}
              confirmingDelete={confirmDeleteId === b.id}
              onCancelDelete={() => setConfirmDeleteId(null)}
              onConfirmDelete={() => handleDelete(b.id)}
              deleting={deleteBackdrop.loading}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

interface BackdropCardProps {
  backdrop: CertificateBackdrop;
  onDelete: () => void;
  onSetDefault: () => void;
  confirmingDelete: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  deleting: boolean;
}

function BackdropCard({
  backdrop: b,
  onDelete,
  onSetDefault,
  confirmingDelete,
  onCancelDelete,
  onConfirmDelete,
  deleting,
}: BackdropCardProps) {
  const orientation =
    b.orientation === "portrait" ? "portrait" : "landscape";
  return (
    <Card skin="shadow" className="flex flex-col overflow-hidden p-0">
      <div
        className={clsx(
          "relative w-full overflow-hidden bg-gray-100 dark:bg-dark-700",
          orientation === "landscape" ? "aspect-[4/3]" : "aspect-[3/4]",
        )}
      >
        <img
          src={b.imageUrl}
          alt={b.name}
          className="size-full object-cover"
        />
        {b.isDefault && (
          <div className="absolute right-2 top-2">
            <Badge color="primary" variant="filled" className="gap-1 text-[10px]">
              <StarIcon className="size-3" />
              Default
            </Badge>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
              {b.name}
            </h3>
            <p className="text-[11px] capitalize text-gray-500 dark:text-dark-300">
              {orientation}
              {b.width && b.height ? ` · ${b.width}×${b.height}` : ""}
            </p>
          </div>
        </div>

        {confirmingDelete ? (
          <div className="space-y-2 border-t border-error-500/30 pt-2">
            <p className="text-xs text-error-600 dark:text-error-400">
              Delete this backdrop? Templates using it will fall back to a
              blank canvas.
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
          <div className="mt-auto flex items-center justify-between gap-2 border-t border-gray-100 pt-2 dark:border-dark-600">
            <Button
              variant="flat"
              color={b.isDefault ? "primary" : "neutral"}
              className="gap-1.5 text-xs"
              onClick={onSetDefault}
              disabled={b.isDefault}
            >
              {b.isDefault ? (
                <>
                  <CheckCircleIcon className="size-3.5" />
                  Default
                </>
              ) : (
                <>
                  <StarIcon className="size-3.5" />
                  Set default
                </>
              )}
            </Button>
            <Button
              variant="flat"
              color="error"
              isIcon
              aria-label="Delete backdrop"
              onClick={onDelete}
            >
              <TrashIcon className="size-4 stroke-2" />
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export default BackdropManager;
