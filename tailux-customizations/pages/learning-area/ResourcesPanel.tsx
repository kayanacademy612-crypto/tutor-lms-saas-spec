// ResourcesPanel — Files tab for the right sidebar.
//
// Lists downloadable files organised by lesson. Each file shows a type icon,
// size, and a download button. Mock data lives at the top; the parent passes
// `courseId` for future API wiring.

// Import Dependencies
import { useState } from "react";
import clsx from "clsx";
import {
  PaperClipIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input } from "@/components/ui";
import { EmptyState } from "@/components/lms";

// ----------------------------------------------------------------------

export interface ResourcesPanelProps {
  courseId: string;
}

interface ResourceFile {
  id: string;
  name: string;
  sizeBytes: number;
  mime: string;
}

interface LessonGroup {
  lessonId: string;
  lessonTitle: string;
  files: ResourceFile[];
}

// ---- Mock data --------------------------------------------------------

const MOCK_GROUPS: LessonGroup[] = [
  {
    lessonId: "lesson-1",
    lessonTitle: "Welcome & Course Roadmap",
    files: [
      {
        id: "r-1",
        name: "course-roadmap.pdf",
        sizeBytes: 540_000,
        mime: "application/pdf",
      },
      {
        id: "r-2",
        name: "intro-slides.pdf",
        sizeBytes: 1_900_000,
        mime: "application/pdf",
      },
    ],
  },
  {
    lessonId: "lesson-3",
    lessonTitle: "Reading: React Mental Model",
    files: [
      {
        id: "r-3",
        name: "react-cheatsheet.pdf",
        sizeBytes: 1_240_000,
        mime: "application/pdf",
      },
      {
        id: "r-4",
        name: "starter-repo.zip",
        sizeBytes: 84_000,
        mime: "application/zip",
      },
    ],
  },
  {
    lessonId: "lesson-7",
    lessonTitle: "Building a Custom Hook",
    files: [
      {
        id: "r-5",
        name: "use-debounce.ts",
        sizeBytes: 2_400,
        mime: "text/typescript",
      },
      {
        id: "r-6",
        name: "use-debounce.spec.ts",
        sizeBytes: 1_800,
        mime: "text/typescript",
      },
    ],
  },
  {
    lessonId: "lesson-8",
    lessonTitle: "Fetch, Cache, Mutate",
    files: [
      {
        id: "r-7",
        name: "fetch-patterns.pdf",
        sizeBytes: 760_000,
        mime: "application/pdf",
      },
    ],
  },
];

// ---- Helpers ----------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1000));
  return `${(bytes / Math.pow(1000, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function fileTag(mime: string): { tag: string; tone: string } {
  if (mime.includes("pdf"))
    return { tag: "PDF", tone: "bg-error-500/10 text-error-600 dark:bg-error-500/15 dark:text-error-400" };
  if (mime.includes("zip"))
    return { tag: "ZIP", tone: "bg-warning-500/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400" };
  if (mime.includes("typescript"))
    return { tag: "TS", tone: "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400" };
  if (mime.includes("javascript"))
    return { tag: "JS", tone: "bg-warning-500/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400" };
  if (mime.includes("image"))
    return { tag: "IMG", tone: "bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400" };
  return { tag: "FILE", tone: "bg-gray-150 text-gray-600 dark:bg-dark-500 dark:text-dark-200" };
}

// ----------------------------------------------------------------------

export default function ResourcesPanel({ courseId }: ResourcesPanelProps) {
  void courseId;

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const filtered = MOCK_GROUPS.map((g) => ({
    ...g,
    files: g.files.filter((f) =>
      f.name.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  })).filter((g) => g.files.length > 0);

  const totalFiles = MOCK_GROUPS.reduce((n, g) => n + g.files.length, 0);
  const totalSize = MOCK_GROUPS.reduce(
    (n, g) => n + g.files.reduce((s, f) => s + f.sizeBytes, 0),
    0,
  );

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
          <PaperClipIcon className="size-4 text-primary-500" />
          Resources
        </h2>
        <p className="text-xs text-gray-500 dark:text-dark-300">
          {totalFiles} files · {formatBytes(totalSize)} total
        </p>
      </header>

      <Input
        placeholder="Search files…"
        value={query}
        onChange={(e) => setQuery((e.target as HTMLInputElement).value)}
        prefix={<MagnifyingGlassIcon className="size-4" />}
        classNames={{ wrapper: "mt-0" }}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={DocumentTextIcon}
          title="No files match"
          description="Try a different search term."
          compact
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((group) => {
            const isCollapsed = collapsed.has(group.lessonId);
            return (
              <div key={group.lessonId}>
                <Button
                  unstyled
                  onClick={() => toggle(group.lessonId)}
                  className="flex w-full items-center gap-1.5 px-1 py-1 text-left text-xs font-semibold text-gray-700 dark:text-dark-100"
                >
                  {isCollapsed ? (
                    <ChevronRightIcon className="size-3.5" />
                  ) : (
                    <ChevronDownIcon className="size-3.5" />
                  )}
                  <span className="flex-1 truncate">{group.lessonTitle}</span>
                  <Badge color="neutral" variant="soft" className="shrink-0">
                    {group.files.length}
                  </Badge>
                </Button>

                {!isCollapsed && (
                  <ul className="mt-1.5 space-y-1.5">
                    {group.files.map((file) => {
                      const { tag, tone } = fileTag(file.mime);
                      return (
                        <li key={file.id}>
                          <Card skin="bordered" className="p-2.5">
                            <div className="flex items-center gap-2.5">
                              <div
                                className={clsx(
                                  "flex size-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold uppercase",
                                  tone,
                                )}
                              >
                                {tag}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-gray-800 dark:text-dark-100">
                                  {file.name}
                                </p>
                                <p className="text-[11px] text-gray-500 dark:text-dark-300">
                                  {formatBytes(file.sizeBytes)}
                                </p>
                              </div>
                              <Button
                                variant="soft"
                                color="primary"
                                isIcon
                                aria-label={`Download ${file.name}`}
                                className="size-7"
                              >
                                <ArrowDownTrayIcon className="size-3.5 stroke-2" />
                              </Button>
                            </div>
                          </Card>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
