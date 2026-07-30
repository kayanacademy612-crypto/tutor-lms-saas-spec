// MediaLibrary — logos / signatures / watermarks / stamps.
//
// Tabs switch the active mediaType; each tab fetches its own list via
// `useCertificateMedia(mediaType)` (the hook refetches when the type
// changes). Upload (create) and delete mutate the server then refetch.

// Import Dependencies
import { useState, useCallback } from "react";
import clsx from "clsx";
import {
  PlusIcon,
  TrashIcon,
  PhotoIcon,
  PaintBrushIcon,
  EyeDropperIcon,
  StampIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Select } from "@/components/ui";
import {
  EmptyState,
  LoadingState,
  ErrorState,
} from "@/components/lms";
import {
  useCertificateMedia,
  useCreateCertificateMedia,
  useDeleteCertificateMedia,
} from "@/hooks/useProAuthoring";
import type { CertificateMediaType } from "@/types/lms";

// ----------------------------------------------------------------------

const MEDIA_TABS: {
  id: CertificateMediaType;
  label: string;
  icon: typeof PhotoIcon;
}[] = [
  { id: "logo", label: "Logos", icon: PhotoIcon },
  { id: "signature", label: "Signatures", icon: PaintBrushIcon },
  { id: "watermark", label: "Watermarks", icon: EyeDropperIcon },
  { id: "stamp", label: "Stamps", icon: StampIcon },
];

// ----------------------------------------------------------------------

export default function MediaLibrary() {
  const [activeTab, setActiveTab] = useState<CertificateMediaType>("logo");
  const list = useCertificateMedia(activeTab);
  const createMedia = useCreateCertificateMedia();
  const deleteMedia = useDeleteCertificateMedia();

  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Composer state
  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const resetComposer = useCallback(() => {
    setName("");
    setImageUrl("");
  }, []);

  const handleCreate = useCallback(() => {
    if (!name.trim() || !imageUrl.trim()) return;
    void createMedia
      .mutate({
        name: name.trim(),
        imageUrl: imageUrl.trim(),
        mediaType: activeTab,
      })
      .then((result) => {
        if (result) {
          resetComposer();
          setCreating(false);
          void list.refetch();
        }
      });
  }, [createMedia, name, imageUrl, activeTab, resetComposer, list]);

  const handleDelete = useCallback(
    (id: string) => {
      void deleteMedia.mutate(id).then((result) => {
        if (result) {
          setConfirmDeleteId(null);
          void list.refetch();
        }
      });
    },
    [deleteMedia, list],
  );

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Media Library
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Reusable logos, signatures, watermarks, and stamps.
          </p>
        </div>
        <Button
          color="primary"
          className="gap-1.5"
          onClick={() => setCreating(true)}
        >
          <PlusIcon className="size-4 stroke-2" />
          Add {activeTab}
        </Button>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 dark:border-dark-600 dark:bg-dark-750">
        {MEDIA_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setCreating(false);
              }}
              className={clsx(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-500 text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
              )}
            >
              <Icon className="size-4 stroke-2" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Inline composer */}
      {creating && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold capitalize text-gray-800 dark:text-dark-50">
              Add new {activeTab}
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
              placeholder={`e.g. ${activeTab === "logo" ? "Acme logo" : activeTab === "signature" ? "Sarah Chen signature" : "Confidential watermark"}`}
              value={name}
              onChange={(e) =>
                setName((e.target as HTMLInputElement).value)
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <Select
              label="Type"
              value={activeTab}
              onChange={(e) =>
                setActiveTab(
                  (e.target as HTMLSelectElement)
                    .value as CertificateMediaType,
                )
              }
              data={MEDIA_TABS.map((t) => ({
                value: t.id,
                label: t.label.slice(0, -1),
              }))}
            />
          </div>
          <Input
            label="Image URL"
            placeholder="https://…/asset.png"
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
          {createMedia.error && (
            <p className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
              {createMedia.error.message}
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
              disabled={
                !name.trim() || !imageUrl.trim() || createMedia.loading
              }
              className="gap-1.5"
            >
              <PlusIcon className="size-4 stroke-2" />
              {createMedia.loading ? "Adding…" : `Add ${activeTab}`}
            </Button>
          </div>
        </Card>
      )}

      {/* Grid */}
      {list.loading && !list.data ? (
        <LoadingState message={`Loading ${activeTab}s…`} />
      ) : list.error ? (
        <ErrorState
          error={list.error}
          onRetry={() => void list.refetch()}
          title={`Couldn't load ${activeTab}s`}
        />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState
          icon={MEDIA_TABS.find((t) => t.id === activeTab)?.icon ?? PhotoIcon}
          title={`No ${activeTab}s yet`}
          description={`Upload ${activeTab} assets here so certificate templates can reference them.`}
          actionLabel={`Add ${activeTab}`}
          onAction={() => setCreating(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {(list.data ?? []).map((m) => (
            <Card
              key={m.id}
              skin="shadow"
              className="flex flex-col overflow-hidden p-0"
            >
              <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gray-100 dark:bg-dark-700">
                <img
                  src={m.imageUrl}
                  alt={m.name}
                  className="size-full object-contain p-3"
                />
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                      {m.name}
                    </h3>
                    <p className="text-[11px] capitalize text-gray-500 dark:text-dark-300">
                      {m.mediaType}
                      {m.width && m.height ? ` · ${m.width}×${m.height}` : ""}
                    </p>
                  </div>
                  <Badge color="neutral" variant="soft" className="text-[10px]">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </Badge>
                </div>

                {confirmDeleteId === m.id ? (
                  <div className="space-y-2 border-t border-error-500/30 pt-2">
                    <p className="text-xs text-error-600 dark:text-error-400">
                      Delete this {m.mediaType}?
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="flat"
                        color="neutral"
                        className="h-7 flex-1 text-xs"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={deleteMedia.loading}
                      >
                        Cancel
                      </Button>
                      <Button
                        color="error"
                        className="h-7 flex-1 text-xs"
                        onClick={() => handleDelete(m.id)}
                        disabled={deleteMedia.loading}
                      >
                        {deleteMedia.loading ? "Deleting…" : "Delete"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-auto flex items-center justify-end border-t border-gray-100 pt-2 dark:border-dark-600">
                    <Button
                      variant="flat"
                      color="error"
                      isIcon
                      aria-label={`Delete ${m.mediaType}`}
                      onClick={() => setConfirmDeleteId(m.id)}
                    >
                      <TrashIcon className="size-4 stroke-2" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default MediaLibrary;
