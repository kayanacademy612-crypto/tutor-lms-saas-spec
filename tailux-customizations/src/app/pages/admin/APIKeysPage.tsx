// Platform Admin — API keys + webhooks.
//
// Two sections:
//   1. API Keys table (name, key preview, authority, created, last used, delete)
//      + Create key modal (name, authority)
//   2. Webhooks table (name, URL, events, deliveries, last delivery)
//      + Create webhook modal (name, URL, events)
//
// Uses `useAPIKeys`, `useCreateAPIKey`, `useDeleteAPIKey`,
// `useWebhooks`, `useCreateWebhook`, `useDeleteWebhook`,
// `useWebhookEventTypes`.

// Import Dependencies
import { useEffect, useState } from "react";
import {
  KeyIcon,
  PlusIcon,
  TrashIcon,
  LinkIcon,
  ClipboardDocumentIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { Dialog, DialogPanel, Transition, TransitionChild } from "@headlessui/react";
import { Fragment } from "react";

// Local Imports
import { Button, Card, Badge, Input } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useAPIKeys,
  useCreateAPIKey,
  useDeleteAPIKey,
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useWebhookEventTypes,
} from "@/hooks/useAdmin";
import { downloadBlob, formatDate, formatRelative } from "./utils";

// ----------------------------------------------------------------------

const AUTHORITIES = [
  { value: "read-only", label: "Read-only" },
  { value: "read-write", label: "Read-write" },
  { value: "admin", label: "Admin" },
];

export default function APIKeysPage() {
  const keysQ = useAPIKeys();
  const webhooksQ = useWebhooks();
  const eventTypesQ = useWebhookEventTypes();
  const createKey = useCreateAPIKey();
  const deleteKey = useDeleteAPIKey();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();

  const [keyModal, setKeyModal] = useState(false);
  const [keyDraft, setKeyDraft] = useState({ name: "", authority: "read-only" });
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [webhookModal, setWebhookModal] = useState(false);
  const [webhookDraft, setWebhookDraft] = useState({
    name: "",
    url: "",
    events: [] as string[],
  });
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);

  // Reset secret when the modal closes.
  useEffect(() => {
    if (!webhookModal) setWebhookSecret(null);
  }, [webhookModal]);
  useEffect(() => {
    if (!keyModal) {
      setRawKey(null);
      setCopied(false);
    }
  }, [keyModal]);

  const onCreateKey = async () => {
    const res = await createKey.mutate(keyDraft);
    if (res?.rawKey) setRawKey(res.rawKey);
    void keysQ.refetch();
  };

  const onDeleteKey = async (id: string, name: string) => {
    if (!window.confirm(`Delete API key "${name}"?`)) return;
    await deleteKey.mutate(id);
    void keysQ.refetch();
  };

  const onCreateWebhook = async () => {
    const res = await createWebhook.mutate({
      name: webhookDraft.name,
      url: webhookDraft.url,
      events: webhookDraft.events,
    });
    if (res?.secret) setWebhookSecret(res.secret);
    void webhooksQ.refetch();
  };

  const onDeleteWebhook = async (id: string, name: string) => {
    if (!window.confirm(`Delete webhook "${name}"?`)) return;
    await deleteWebhook.mutate(id);
    void webhooksQ.refetch();
  };

  const toggleEvent = (eventType: string) => {
    setWebhookDraft((d) => ({
      ...d,
      events: d.events.includes(eventType)
        ? d.events.filter((e) => e !== eventType)
        : [...d.events, eventType],
    }));
  };

  const onCopyRawKey = async () => {
    if (!rawKey) return;
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopied(true);
    } catch {
      // Fallback: trigger a download of the raw key.
      downloadBlob(new Blob([rawKey], { type: "text/plain" }), "api-key.txt");
    }
  };

  const keys = keysQ.data?.apiKeys ?? [];
  const webhooks = webhooksQ.data?.webhooks ?? [];
  const eventTypes = eventTypesQ.data?.eventTypes ?? [];

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      {/* API Keys */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-dark-50">
            <KeyIcon className="size-5 text-primary-500" />
            API Keys
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
            Server-to-server keys for programmatic access to the admin API.
          </p>
        </div>
        <Button
          color="primary"
          variant="filled"
          onClick={() => {
            setKeyDraft({ name: "", authority: "read-only" });
            setKeyModal(true);
          }}
          className="gap-1.5 text-sm"
        >
          <PlusIcon className="size-4" />
          New key
        </Button>
      </div>

      <Card skin="bordered" className="mt-4 overflow-hidden">
        {keysQ.loading ? (
          <LoadingState message="Loading API keys…" />
        ) : keysQ.error ? (
          <ErrorState error={keysQ.error} onRetry={keysQ.refetch} />
        ) : keys.length === 0 ? (
          <EmptyState
            icon={KeyIcon}
            title="No API keys"
            description="Create an API key to enable programmatic access."
            actionLabel="New key"
            onAction={() => {
              setKeyDraft({ name: "", authority: "read-only" });
              setKeyModal(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
              <thead className="bg-gray-50 dark:bg-dark-750">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Key preview
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Authority
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Created
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Last used
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-dark-600 dark:bg-dark-700">
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-dark-50">
                      {k.name}
                      {k.isActive === false && (
                        <Badge color="neutral" variant="soft">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-600 dark:bg-dark-600 dark:text-dark-200">
                        {k.keyPreview}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        color={
                          k.authority === "admin"
                            ? "error"
                            : k.authority === "read-write"
                              ? "warning"
                              : "info"
                        }
                        variant="soft"
                      >
                        {k.authority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-dark-300">
                      {formatDate(k.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-dark-300">
                      {formatRelative(k.lastUsedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          isIcon
                          variant="flat"
                          color="error"
                          className="size-7"
                          onClick={() => onDeleteKey(k.id, k.name)}
                          aria-label="Delete API key"
                          disabled={deleteKey.loading}
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Webhooks */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 dark:text-dark-50">
            <LinkIcon className="size-5 text-primary-500" />
            Webhooks
          </h2>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
            Outbound webhook endpoints that receive platform event payloads.
          </p>
        </div>
        <Button
          color="primary"
          variant="filled"
          onClick={() => {
            setWebhookDraft({ name: "", url: "", events: [] });
            setWebhookModal(true);
          }}
          className="gap-1.5 text-sm"
        >
          <PlusIcon className="size-4" />
          New webhook
        </Button>
      </div>

      <Card skin="bordered" className="mt-4 overflow-hidden">
        {webhooksQ.loading ? (
          <LoadingState message="Loading webhooks…" />
        ) : webhooksQ.error ? (
          <ErrorState error={webhooksQ.error} onRetry={webhooksQ.refetch} />
        ) : webhooks.length === 0 ? (
          <EmptyState
            icon={LinkIcon}
            title="No webhooks"
            description="Create a webhook to receive platform event payloads."
            actionLabel="New webhook"
            onAction={() => {
              setWebhookDraft({ name: "", url: "", events: [] });
              setWebhookModal(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-600">
              <thead className="bg-gray-50 dark:bg-dark-750">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Name
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    URL
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Events
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Deliveries (24h)
                  </th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Last delivery
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-dark-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white dark:divide-dark-600 dark:bg-dark-700">
                {webhooks.map((w) => (
                  <tr key={w.id}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-800 dark:text-dark-50">
                      {w.name}
                      {!w.isActive && (
                        <Badge color="neutral" variant="soft">
                          Paused
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <code className="block max-w-[200px] truncate font-mono text-xs text-gray-600 dark:text-dark-200">
                        {w.url}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex max-w-[260px] flex-wrap gap-1">
                        {w.events.slice(0, 3).map((e) => (
                          <span
                            key={e}
                            className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-dark-600 dark:text-dark-200"
                          >
                            {e}
                          </span>
                        ))}
                        {w.events.length > 3 && (
                          <span className="text-xs text-gray-400 dark:text-dark-400">
                            +{w.events.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-dark-200">
                      {w.deliveries24h ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-dark-300">
                      {formatRelative(w.lastDeliveryAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          isIcon
                          variant="flat"
                          color="error"
                          className="size-7"
                          onClick={() => onDeleteWebhook(w.id, w.name)}
                          aria-label="Delete webhook"
                          disabled={deleteWebhook.loading}
                        >
                          <TrashIcon className="size-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* API key modal */}
      <Transition
        appear
        show={keyModal}
        as={Dialog}
        onClose={() => setKeyModal(false)}
        className="fixed inset-0 z-100 flex flex-col items-center justify-center overflow-hidden px-4 py-6"
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 bg-gray-900/50 transition-opacity dark:bg-black/40" />
        </TransitionChild>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <DialogPanel className="relative w-full max-w-md rounded-lg bg-white p-5 shadow-soft dark:bg-dark-700">
            <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              {rawKey ? "API key created" : "New API key"}
            </h3>

            {rawKey ? (
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-dark-200">
                  Copy the key now — it won't be shown again.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-md bg-gray-100 p-3 dark:bg-dark-600">
                  <code className="flex-1 break-all font-mono text-xs text-gray-700 dark:text-dark-100">
                    {rawKey}
                  </code>
                  <Button
                    isIcon
                    variant="flat"
                    color="primary"
                    className="size-7"
                    onClick={onCopyRawKey}
                    aria-label="Copy key"
                  >
                    {copied ? (
                      <CheckIcon className="size-4" />
                    ) : (
                      <ClipboardDocumentIcon className="size-4" />
                    )}
                  </Button>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    color="primary"
                    variant="filled"
                    onClick={() => setKeyModal(false)}
                    className="text-sm"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  <Input
                    label="Name"
                    value={keyDraft.name}
                    onChange={(e) =>
                      setKeyDraft((d) => ({ ...d, name: e.target.value }))
                    }
                    placeholder="e.g. CI pipeline key"
                    className="text-sm"
                  />
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-200">
                      Authority
                    </label>
                    <select
                      value={keyDraft.authority}
                      onChange={(e) =>
                        setKeyDraft((d) => ({ ...d, authority: e.target.value }))
                      }
                      className="form-input h-9 w-full rounded-md border-gray-300 px-2 text-sm text-gray-800 dark:border-dark-450 dark:bg-dark-700 dark:text-dark-50"
                    >
                      {AUTHORITIES.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    variant="outlined"
                    color="neutral"
                    onClick={() => setKeyModal(false)}
                    className="text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    variant="filled"
                    onClick={onCreateKey}
                    disabled={createKey.loading || !keyDraft.name.trim()}
                    className="text-sm"
                  >
                    {createKey.loading ? "Creating…" : "Create key"}
                  </Button>
                </div>
                {createKey.error && (
                  <p className="mt-2 text-right text-xs text-error-600 dark:text-error-400">
                    {createKey.error.message}
                  </p>
                )}
              </>
            )}
          </DialogPanel>
        </TransitionChild>
      </Transition>

      {/* Webhook modal */}
      <Transition
        appear
        show={webhookModal}
        as={Dialog}
        onClose={() => setWebhookModal(false)}
        className="fixed inset-0 z-100 flex flex-col items-center justify-center overflow-hidden px-4 py-6"
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="absolute inset-0 bg-gray-900/50 transition-opacity dark:bg-black/40" />
        </TransitionChild>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0 scale-95"
          enterTo="opacity-100 scale-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100 scale-100"
          leaveTo="opacity-0 scale-95"
        >
          <DialogPanel className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-soft dark:bg-dark-700">
            <h3 className="text-base font-semibold text-gray-800 dark:text-dark-50">
              {webhookSecret ? "Webhook created" : "New webhook"}
            </h3>

            {webhookSecret ? (
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-dark-200">
                  Copy the signing secret now — it won't be shown again.
                </p>
                <div className="mt-3 flex items-center gap-2 rounded-md bg-gray-100 p-3 dark:bg-dark-600">
                  <code className="flex-1 break-all font-mono text-xs text-gray-700 dark:text-dark-100">
                    {webhookSecret}
                  </code>
                  <Button
                    isIcon
                    variant="flat"
                    color="primary"
                    className="size-7"
                    onClick={() => {
                      void navigator.clipboard.writeText(webhookSecret);
                    }}
                    aria-label="Copy secret"
                  >
                    <ClipboardDocumentIcon className="size-4" />
                  </Button>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    color="primary"
                    variant="filled"
                    onClick={() => setWebhookModal(false)}
                    className="text-sm"
                  >
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 space-y-3">
                  <Input
                    label="Name"
                    value={webhookDraft.name}
                    onChange={(e) =>
                      setWebhookDraft((d) => ({ ...d, name: e.target.value }))
                    }
                    placeholder="e.g. Slack notifications"
                    className="text-sm"
                  />
                  <Input
                    label="URL"
                    type="url"
                    value={webhookDraft.url}
                    onChange={(e) =>
                      setWebhookDraft((d) => ({ ...d, url: e.target.value }))
                    }
                    placeholder="https://…"
                    className="text-sm"
                  />
                  <div>
                    <p className="mb-1.5 text-sm font-medium text-gray-700 dark:text-dark-200">
                      Events
                    </p>
                    {eventTypesQ.loading ? (
                      <LoadingState inline message="Loading event types…" />
                    ) : eventTypesQ.error ? (
                      <p className="text-xs text-error-600 dark:text-error-400">
                        {eventTypesQ.error.message}
                      </p>
                    ) : eventTypes.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-dark-400">
                        No event types available. The backend may not expose
                        `/admin/webhooks/event-types`.
                      </p>
                    ) : (
                      <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 p-2 dark:border-dark-600">
                        <div className="flex flex-wrap gap-1.5">
                          {eventTypes.map((e) => {
                            const active = webhookDraft.events.includes(e.type);
                            return (
                              <button
                                key={e.type}
                                type="button"
                                onClick={() => toggleEvent(e.type)}
                                className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                                  active
                                    ? "bg-primary-500 text-white"
                                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-200"
                                }`}
                                title={e.description}
                              >
                                {e.type}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {webhookDraft.events.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
                        {webhookDraft.events.length} event
                        {webhookDraft.events.length === 1 ? "" : "s"} selected
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-2">
                  <Button
                    variant="outlined"
                    color="neutral"
                    onClick={() => setWebhookModal(false)}
                    className="text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    color="primary"
                    variant="filled"
                    onClick={onCreateWebhook}
                    disabled={
                      createWebhook.loading ||
                      !webhookDraft.name.trim() ||
                      !webhookDraft.url.trim()
                    }
                    className="text-sm"
                  >
                    {createWebhook.loading ? "Creating…" : "Create webhook"}
                  </Button>
                </div>
                {createWebhook.error && (
                  <p className="mt-2 text-right text-xs text-error-600 dark:text-error-400">
                    {createWebhook.error.message}
                  </p>
                )}
              </>
            )}
          </DialogPanel>
        </TransitionChild>
      </Transition>
    </div>
  );
}
