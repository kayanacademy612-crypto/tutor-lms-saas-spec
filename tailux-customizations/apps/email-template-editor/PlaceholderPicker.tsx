// PlaceholderPicker — right-sidebar list of available `{{placeholder}}`
// tokens for the currently-selected email template's trigger.
//
// Props:
//   - placeholders: EmailPlaceholder[] — the API response.
//   - loading: boolean — show spinner.
//   - error: unknown — show error block.
//   - onInsert: (key: string) => void — called when the user clicks a
//     placeholder (or presses Enter while focused). The parent inserts
//     `{{key}}` into the active editor at the cursor position.
//
// The list is grouped by the placeholder key prefix (the part before the
// first dot, e.g. `student.first_name` → "student"). When there's no dot
// the placeholder falls into "General".

// Import Dependencies
import { useMemo } from "react";
import {
  ClipboardDocumentListIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, ScrollShadow, Spinner } from "@/components/ui";
import type { EmailPlaceholder } from "@/types/lms";

// ----------------------------------------------------------------------

export interface PlaceholderPickerProps {
  placeholders: EmailPlaceholder[];
  loading?: boolean;
  error?: unknown;
  onInsert: (key: string) => void;
}

interface PlaceholderGroup {
  name: string;
  items: EmailPlaceholder[];
}

/**
 * Group placeholders by their key prefix (the segment before the first
 * dot). Sort groups alphabetically with `General` always last.
 */
function groupPlaceholders(
  placeholders: EmailPlaceholder[],
): PlaceholderGroup[] {
  const groups = new Map<string, EmailPlaceholder[]>();
  for (const p of placeholders) {
    const dot = p.key.indexOf(".");
    const name = dot === -1 ? "General" : p.key.slice(0, dot);
    const list = groups.get(name);
    if (list) {
      list.push(p);
    } else {
      groups.set(name, [p]);
    }
  }
  const result: PlaceholderGroup[] = [];
  for (const [name, items] of groups) {
    result.push({ name, items: items.slice().sort((a, b) => a.key.localeCompare(b.key)) });
  }
  result.sort((a, b) => {
    if (a.name === "General") return 1;
    if (b.name === "General") return -1;
    return a.name.localeCompare(b.name);
  });
  return result;
}

// ----------------------------------------------------------------------

export function PlaceholderPicker({
  placeholders,
  loading = false,
  error,
  onInsert,
}: PlaceholderPickerProps) {
  const groups = useMemo(
    () => groupPlaceholders(placeholders),
    [placeholders],
  );

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-dark-600">
        <ClipboardDocumentListIcon className="size-4 stroke-2 text-primary-500 dark:text-primary-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-dark-200">
          Placeholders
        </h3>
        {!loading && !error && placeholders.length > 0 && (
          <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-600 dark:text-dark-200">
            {placeholders.length}
          </span>
        )}
      </div>

      <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center gap-2 px-4 py-6 text-xs text-gray-500 dark:text-dark-300">
            <Spinner className="size-4" />
            Loading placeholders…
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 px-4 py-4 text-xs text-error-600 dark:text-error-400">
            <ExclamationCircleIcon className="size-4 shrink-0 stroke-2" />
            <span>Couldn’t load placeholders for this template.</span>
          </div>
        ) : groups.length === 0 ? (
          <p className="px-4 py-6 text-xs text-gray-500 dark:text-dark-300">
            No placeholders available for this trigger.
          </p>
        ) : (
          <div className="space-y-4 p-3">
            {groups.map((g) => (
              <div key={g.name}>
                <p className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">
                  {g.name}
                </p>
                <ul className="space-y-1">
                  {g.items.map((p) => (
                    <li key={p.id}>
                      <Button
                        variant="flat"
                        color="neutral"
                        onClick={() => onInsert(p.key)}
                        className="group w-full items-start gap-2 px-2 py-1.5 text-left"
                      >
                        <code className="shrink-0 rounded bg-primary-500/10 px-1.5 py-0.5 font-mono text-[11px] text-primary-700 dark:bg-primary-500/15 dark:text-primary-300">
                          {`{{${p.key}}}`}
                        </code>
                        <span className="min-w-0 flex-1 text-xs text-gray-600 dark:text-dark-300">
                          {p.description ?? p.key}
                          {p.example && (
                            <span className="mt-0.5 block truncate text-[10px] text-gray-400 dark:text-dark-400">
                              e.g. {p.example}
                            </span>
                          )}
                        </span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </ScrollShadow>
    </div>
  );
}

export default PlaceholderPicker;
