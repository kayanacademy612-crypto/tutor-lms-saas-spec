// NotesScreen — student notes grouped by course with create/edit/delete.
//
// Uses `useNotes` to fetch notes from the API; the API only ships `list` and
// `create`, so edit/delete are handled optimistically in local state. The
// editor is an inline `Card` (no modal) to keep the screen lightweight.
//
// Notes are grouped by course and each note shows its lesson title, a body
// preview, and a relative timestamp.

// Import Dependencies
import { useMemo, useState, useEffect } from "react";
import {
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { useNotes } from "@/hooks/useLms";
import type { StudentNote } from "@/types/lms";
import { EmptyState, LoadingState } from "@/components/lms";
import { Button, Card, Textarea, Badge, Select } from "@/components/ui";

// ----------------------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return iso(d);
};

/** Mock course catalog (courseId → title) for grouping + the editor dropdown. */
const COURSE_TITLES: Record<string, string> = {
  "course-001": "Full-Stack React & TypeScript",
  "course-002": "Data Structures & Algorithms",
  "course-003": "UI/UX Design Foundations",
  "course-004": "DevOps with Docker & Kubernetes",
};

/** Mock lesson titles (lessonId → title) so notes can show context. */
const LESSON_TITLES: Record<string, string> = {
  "lesson-101": "Setting up Vite & TypeScript",
  "lesson-102": "Component Composition Patterns",
  "lesson-103": "Forms & Validation with react-hook-form",
  "lesson-201": "Big-O Notation Deep Dive",
  "lesson-202": "Sorting Algorithms: Quicksort & Mergesort",
  "lesson-203": "Graph Traversal: BFS & DFS",
  "lesson-301": "Color Theory for Interfaces",
  "lesson-401": "Docker Images & Layers",
  "lesson-402": "Kubernetes Pods & Services",
};

const MOCK_NOTES: StudentNote[] = [
  {
    id: "note-1",
    tenantId: "tenant-1",
    courseId: "course-001",
    lessonId: "lesson-102",
    studentId: "student-1",
    body: "Composition over inheritance — favor small components that take render props. The compound component pattern is great for tabs and accordions. See the tailux Accordion for a real example.",
    positionSeconds: 312,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "note-2",
    tenantId: "tenant-1",
    courseId: "course-001",
    lessonId: "lesson-103",
    studentId: "student-1",
    body: "react-hook-form + yup: register inputs by name, then `resolver={yupResolver(schema)}`. Use `watch()` for dependent fields. Don't forget `mode: 'onChange'` for instant feedback.",
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
  },
  {
    id: "note-3",
    tenantId: "tenant-1",
    courseId: "course-002",
    lessonId: "lesson-201",
    studentId: "student-1",
    body: "Big-O: drop constants and lower-order terms. O(2n) → O(n). O(n² + n) → O(n²). Logarithmic time usually comes from halving the input each step (binary search).",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(5),
  },
  {
    id: "note-4",
    tenantId: "tenant-1",
    courseId: "course-002",
    lessonId: "lesson-202",
    studentId: "student-1",
    body: "Quicksort: pick a pivot, partition around it, recurse. Average O(n log n), worst O(n²) when pivot is bad. Mergesort is stable and always O(n log n) but needs O(n) extra space.",
    positionSeconds: 845,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(6),
  },
  {
    id: "note-5",
    tenantId: "tenant-1",
    courseId: "course-004",
    lessonId: "lesson-401",
    studentId: "student-1",
    body: "Docker images are layered — each instruction in the Dockerfile creates a new layer. Order matters: copy dependency manifests first so the install layer is cached when source changes.",
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
];

// ----------------------------------------------------------------------

interface EditorState {
  mode: "create" | "edit";
  id?: string;
  courseId: string;
  lessonId: string;
  body: string;
}

const EMPTY_EDITOR: EditorState = {
  mode: "create",
  courseId: "course-001",
  lessonId: "",
  body: "",
};

function relativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const diff = now.getTime() - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

// ----------------------------------------------------------------------

export function NotesScreen() {
  const { data, loading, error, refetch } = useNotes();

  // Local working copy of notes. Initialized from the hook (or mock on
  // error/empty) and updated optimistically on create/edit/delete.
  const [notes, setNotes] = useState<StudentNote[]>(MOCK_NOTES);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync local notes whenever the API returns fresh data.
  useEffect(() => {
    if (data && data.length > 0) {
      setNotes(data);
    } else if (data && data.length === 0 && !error) {
      // Real API returned an empty list — reflect it.
      setNotes([]);
    }
  }, [data, error]);

  const grouped = useMemo(() => {
    const map = new Map<string, StudentNote[]>();
    [...notes]
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
      .forEach((n) => {
        const arr = map.get(n.courseId) ?? [];
        arr.push(n);
        map.set(n.courseId, arr);
      });
    return Array.from(map.entries());
  }, [notes]);

  function startCreate() {
    setEditor({ ...EMPTY_EDITOR, lessonId: "lesson-101" });
  }

  function startEdit(note: StudentNote) {
    setEditor({
      mode: "edit",
      id: note.id,
      courseId: note.courseId,
      lessonId: note.lessonId,
      body: note.body,
    });
  }

  function cancelEditor() {
    setEditor(null);
  }

  function saveEditor() {
    if (!editor) return;
    if (!editor.body.trim()) return;
    setSaving(true);
    // Simulate async save; in a real app this would call noteApi.create /
    // a PATCH endpoint (which the backend doesn't expose yet).
    setTimeout(() => {
      if (editor.mode === "create") {
        const newNote: StudentNote = {
          id: `note-local-${Date.now()}`,
          tenantId: "tenant-1",
          courseId: editor.courseId,
          lessonId: editor.lessonId || "lesson-101",
          studentId: "student-1",
          body: editor.body.trim(),
          createdAt: iso(new Date()),
          updatedAt: iso(new Date()),
        };
        setNotes((prev) => [newNote, ...prev]);
      } else if (editor.id) {
        setNotes((prev) =>
          prev.map((n) =>
            n.id === editor.id
              ? {
                  ...n,
                  courseId: editor.courseId,
                  lessonId: editor.lessonId || n.lessonId,
                  body: editor.body.trim(),
                  updatedAt: iso(new Date()),
                }
              : n,
          ),
        );
      }
      setSaving(false);
      setEditor(null);
    }, 250);
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  // ----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            My Notes
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
            Capture key takeaways from lessons — grouped by course.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <Button variant="flat" color="neutral" className="gap-1 text-xs" onClick={refetch}>
              <ArrowPathIcon className="size-3.5 text-warning-500" />
              Retry
            </Button>
          )}
          <Button color="primary" className="gap-1.5" onClick={startCreate}>
            <PlusIcon className="size-4 stroke-2" />
            New note
          </Button>
        </div>
      </header>

      {/* API health notice */}
      {error && (
        <Card className="flex items-center gap-3 border-warning-300 bg-warning-50 p-3 dark:border-warning-500/30 dark:bg-warning-500/10">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-warning-600 dark:text-warning-400" />
          <p className="flex-1 text-xs text-warning-700 dark:text-warning-300">
            Couldn&apos;t reach the notes API — showing sample notes. New notes
            are saved locally for this session.
          </p>
        </Card>
      )}

      {/* Inline editor */}
      {editor && (
        <NoteEditor
          state={editor}
          onChange={setEditor}
          onSave={saveEditor}
          onCancel={cancelEditor}
          saving={saving}
        />
      )}

      {/* Body */}
      {loading ? (
        <LoadingState message="Loading your notes…" />
      ) : notes.length === 0 ? (
        <EmptyState
          icon={DocumentTextIcon}
          title="No notes yet"
          description="Jot down a key insight from a lesson to revisit later."
          actionLabel="Create your first note"
          onAction={startCreate}
        />
      ) : (
        <div className="space-y-6">
          {grouped.map(([courseId, courseNotes]) => (
            <section key={courseId} className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                  {COURSE_TITLES[courseId] ?? "Untitled course"}
                </h2>
                <Badge color="neutral" variant="soft" className="text-[10px]">
                  {courseNotes.length}{" "}
                  {courseNotes.length === 1 ? "note" : "notes"}
                </Badge>
              </div>
              <div className="space-y-2.5">
                {courseNotes.map((note) => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    onEdit={() => startEdit(note)}
                    onDelete={() => deleteNote(note.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function NoteEditor({
  state,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  state: EditorState;
  onChange: (next: EditorState) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const isCreate = state.mode === "create";

  return (
    <Card className="space-y-4 border-primary-300 p-4 dark:border-primary-500/30">
      <div className="flex items-center gap-2">
        <PencilSquareIcon className="size-5 text-primary-500" />
        <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          {isCreate ? "New note" : "Edit note"}
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Select
          label="Course"
          value={state.courseId}
          onChange={(e) =>
            onChange({
              ...state,
              courseId: (e.target as HTMLSelectElement).value,
              lessonId: "",
            })
          }
          data={Object.entries(COURSE_TITLES).map(([id, title]) => ({
            label: title,
            value: id,
          }))}
          classNames={{ root: "mt-0" }}
        />
        <Select
          label="Lesson"
          value={state.lessonId}
          onChange={(e) =>
            onChange({
              ...state,
              lessonId: (e.target as HTMLSelectElement).value,
            })
          }
          data={[
            { label: "— Select a lesson —", value: "" },
            ...Object.entries(LESSON_TITLES).map(([id, title]) => ({
              label: title,
              value: id,
            })),
          ]}
          classNames={{ root: "mt-0" }}
        />
      </div>

      <Textarea
        label="Note"
        rows={4}
        placeholder="Write your note…"
        value={state.body}
        onChange={(e) =>
          onChange({ ...state, body: (e.target as HTMLTextAreaElement).value })
        }
        classNames={{ wrapper: "mt-0" }}
      />

      <div className="flex items-center justify-end gap-2">
        <Button variant="flat" color="neutral" className="gap-1.5 text-sm" onClick={onCancel}>
          <XMarkIcon className="size-4 stroke-2" />
          Cancel
        </Button>
        <Button
          color="primary"
          className="gap-1.5 text-sm"
          onClick={onSave}
          disabled={saving || !state.body.trim()}
        >
          <CheckIcon className="size-4 stroke-2" />
          {saving ? "Saving…" : isCreate ? "Save note" : "Update note"}
        </Button>
      </div>
    </Card>
  );
}

function NoteRow({
  note,
  onEdit,
  onDelete,
}: {
  note: StudentNote;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card skin="bordered" className="p-3.5 transition-shadow hover:shadow-soft">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
          <DocumentTextIcon className="size-4 stroke-2" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-gray-800 dark:text-dark-100">
              {LESSON_TITLES[note.lessonId] ?? "Untitled lesson"}
            </p>
            <span className="shrink-0 text-[11px] text-gray-400 dark:text-dark-400">
              {relativeTime(note.updatedAt)}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-dark-200">
            {note.body}
          </p>
          <div className="mt-2 flex items-center gap-1.5">
            <Button
              variant="flat"
              color="neutral"
              isIcon
              className="size-7 text-gray-500 hover:text-primary-600 dark:text-dark-300 dark:hover:text-primary-400"
              onClick={onEdit}
              aria-label="Edit note"
            >
              <PencilSquareIcon className="size-4 stroke-2" />
            </Button>
            <Button
              variant="flat"
              color="neutral"
              isIcon
              className="size-7 text-gray-500 hover:text-error-600 dark:text-dark-300 dark:hover:text-error-400"
              onClick={onDelete}
              aria-label="Delete note"
            >
              <TrashIcon className="size-4 stroke-2" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default NotesScreen;
