// ConversationList — left-sidebar list of AI conversations.
//
// Renders the "New Chat" CTA at the top followed by the list of conversations
// (most-recent-first). Each item shows the conversation title, a relative
// timestamp, and a hover-revealed delete button. The currently-selected
// conversation is highlighted.

// Import Dependencies
import clsx from "clsx";
import {
  PlusIcon,
  TrashIcon,
  ChatBubbleLeftRightIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, ScrollShadow } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import type { AIConversation } from "@/types/lms";

// ----------------------------------------------------------------------

function formatRelative(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return "just now";
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 7) return `${day}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

// ----------------------------------------------------------------------

export interface ConversationListProps {
  conversations: AIConversation[] | null;
  loading: boolean;
  error: unknown;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onRefresh: () => void;
  deletingId?: string | null;
}

export function ConversationList({
  conversations,
  loading,
  error,
  selectedId,
  onSelect,
  onDelete,
  onNewChat,
  onRefresh,
  deletingId,
}: ConversationListProps) {
  const list = conversations ?? [];

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="shrink-0 space-y-2 border-b border-gray-200 p-3 dark:border-dark-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="size-5 text-primary-500" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Conversations
            </h2>
          </div>
          <Button
            isIcon
            variant="flat"
            color="neutral"
            className="size-7"
            onClick={onRefresh}
            aria-label="Refresh conversations"
          >
            <ArrowPathIcon className={clsx("size-4", loading && "animate-spin")} />
          </Button>
        </div>
        <Button
          color="primary"
          variant="soft"
          onClick={onNewChat}
          className="w-full justify-center gap-1.5 text-sm"
        >
          <PlusIcon className="size-4 stroke-2" />
          New Chat
        </Button>
      </div>

      {/* List */}
      <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
        {loading && list.length === 0 ? (
          <LoadingState message="Loading conversations…" inline />
        ) : error ? (
          <ErrorState error={error} onRetry={onRefresh} />
        ) : list.length === 0 ? (
          <EmptyState
            icon={ChatBubbleLeftRightIcon}
            title="No conversations yet"
            description="Start a new chat to begin working with the AI tutor."
            compact
          />
        ) : (
          <ul className="space-y-1 p-2">
            {list.map((c) => {
              const active = c.id === selectedId;
              const isDeleting = deletingId === c.id;
              return (
                <li key={c.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelect(c.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(c.id);
                      }
                    }}
                    className={clsx(
                      "group flex cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                        : "text-gray-700 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-600",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {c.title || "New conversation"}
                      </p>
                      <p
                        className={clsx(
                          "mt-0.5 text-[11px]",
                          active
                            ? "text-primary-600/80 dark:text-primary-400/80"
                            : "text-gray-400 dark:text-dark-400",
                        )}
                      >
                        {formatRelative(c.updatedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(c.id);
                      }}
                      disabled={isDeleting}
                      aria-label="Delete conversation"
                      className={clsx(
                        "shrink-0 rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:bg-error-500/10 hover:text-error-500",
                        "group-hover:opacity-100",
                        "focus:opacity-100",
                        "dark:hover:bg-error-500/15 dark:hover:text-error-400",
                        isDeleting && "animate-pulse opacity-100",
                      )}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </ScrollShadow>
    </div>
  );
}

export default ConversationList;
