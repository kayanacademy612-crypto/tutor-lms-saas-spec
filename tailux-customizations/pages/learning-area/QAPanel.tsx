// QAPanel — Q&A tab for the right sidebar.
//
// Lists course-level questions (each with asker, date, answer count, resolved
// badge), expands a thread of answers when a question is selected, and
// exposes an "ask a question" composer. Mock data lives at the top; the
// parent passes `courseId` so future API wiring is trivial.

// Import Dependencies
import { useState } from "react";
import clsx from "clsx";
import {
  ChatBubbleLeftRightIcon,
  QuestionMarkCircleIcon,
  HandThumbUpIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";

// Local Imports
import { Button, Card, Badge, Avatar, Textarea } from "@/components/ui";
import { EmptyState } from "@/components/lms";
import type { QAQuestion } from "@/types/lms";

// ----------------------------------------------------------------------

export interface QAPanelProps {
  courseId: string;
}

/** Local extension that carries a thread of answers (the backend stores only
 *  a single `answer` on QAQuestion, so the thread is mocked client-side). */
interface QAThread extends QAQuestion {
  askerName: string;
  answers: AnswerPost[];
}

interface AnswerPost {
  id: string;
  authorName: string;
  authorRole: "instructor" | "student";
  body: string;
  createdAt: string;
}

// ---- Mock data --------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const MOCK_THREADS: QAThread[] = [
  {
    id: "qa-1",
    tenantId: "tenant-1",
    courseId: "course-001",
    lessonId: "lesson-2",
    studentId: "student-1",
    question:
      "Do we need to set up pnpm globally, or is the workspace install enough?",
    isResolved: true,
    upvotes: 4,
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-1),
    askerName: "Alex Rivera",
    answers: [
      {
        id: "qa-1-a1",
        authorName: "Maya Chen (Instructor)",
        authorRole: "instructor",
        body: "Workspace install is enough — pnpm is wired into the dev script. You only need a global install if you want to scaffold new projects from the CLI.",
        createdAt: daysFromNow(-1),
      },
      {
        id: "qa-1-a2",
        authorName: "Sam Patel",
        authorRole: "student",
        body: "Thanks — confirming that worked for me too.",
        createdAt: daysFromNow(-1),
      },
    ],
  },
  {
    id: "qa-2",
    tenantId: "tenant-1",
    courseId: "course-001",
    lessonId: "lesson-5",
    studentId: "student-2",
    question:
      "When should I prefer useReducer over useState? The lesson says 'complex state', but that feels vague.",
    isResolved: false,
    upvotes: 7,
    createdAt: daysFromNow(-1),
    updatedAt: daysFromNow(0),
    askerName: "Jordan Kim",
    answers: [
      {
        id: "qa-2-a1",
        authorName: "Maya Chen (Instructor)",
        authorRole: "instructor",
        body: "Rule of thumb: if your next state depends on more than two previous values, or you have 4+ useState calls in one component, reach for useReducer.",
        createdAt: daysFromNow(0),
      },
    ],
  },
  {
    id: "qa-3",
    tenantId: "tenant-1",
    courseId: "course-001",
    studentId: "student-3",
    question: "Will the certificate cover React 19's new compiler features?",
    isResolved: false,
    upvotes: 2,
    createdAt: daysFromNow(0),
    updatedAt: daysFromNow(0),
    askerName: "Priya Singh",
    answers: [],
  },
];

// ---- Helpers ----------------------------------------------------------

function timeAgo(isoDate: string): string {
  const diff = now.getTime() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ----------------------------------------------------------------------

export default function QAPanel({ courseId }: QAPanelProps) {
  void courseId; // Reserved for future API wiring.

  const [threads, setThreads] = useState<QAThread[]>(MOCK_THREADS);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_THREADS[0]?.id ?? null);
  const [askingOpen, setAskingOpen] = useState(false);
  const [draftQuestion, setDraftQuestion] = useState("");
  const [answerDraft, setAnswerDraft] = useState<Record<string, string>>({});

  const selected = threads.find((t) => t.id === selectedId);

  const handleAsk = () => {
    const q = draftQuestion.trim();
    if (!q) return;
    const newThread: QAThread = {
      id: `qa-${Date.now()}`,
      tenantId: "tenant-1",
      courseId: "course-001",
      studentId: "student-1",
      question: q,
      isResolved: false,
      upvotes: 0,
      createdAt: iso(new Date()),
      updatedAt: iso(new Date()),
      askerName: "You",
      answers: [],
    };
    setThreads((prev) => [newThread, ...prev]);
    setDraftQuestion("");
    setAskingOpen(false);
    setSelectedId(newThread.id);
  };

  const handleAnswer = (threadId: string) => {
    const body = (answerDraft[threadId] ?? "").trim();
    if (!body) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === threadId
          ? {
              ...t,
              answers: [
                ...t.answers,
                {
                  id: `ans-${Date.now()}`,
                  authorName: "You",
                  authorRole: "student",
                  body,
                  createdAt: iso(new Date()),
                },
              ],
            }
          : t,
      ),
    );
    setAnswerDraft((prev) => ({ ...prev, [threadId]: "" }));
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
            <ChatBubbleLeftRightIcon className="size-4 text-primary-500" />
            Course Q&A
          </h2>
          <p className="text-xs text-gray-500 dark:text-dark-300">
            {threads.length} questions ·{" "}
            {threads.filter((t) => t.isResolved).length} resolved
          </p>
        </div>
        <Button
          variant="soft"
          color="primary"
          isIcon
          aria-label="Ask a question"
          onClick={() => setAskingOpen((v) => !v)}
        >
          <PlusIcon className="size-4 stroke-2" />
        </Button>
      </header>

      {/* Ask form */}
      {askingOpen && (
        <Card skin="bordered" className="p-3">
          <Textarea
            label="Your question"
            rows={3}
            placeholder="What's confusing you?"
            value={draftQuestion}
            onChange={(e) =>
              setDraftQuestion((e.target as HTMLTextAreaElement).value)
            }
          />
          <div className="mt-2 flex items-center justify-end gap-2">
            <Button
              variant="flat"
              color="neutral"
              onClick={() => {
                setAskingOpen(false);
                setDraftQuestion("");
              }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="filled"
              color="primary"
              onClick={handleAsk}
              disabled={!draftQuestion.trim()}
              className="text-xs"
            >
              Post question
            </Button>
          </div>
        </Card>
      )}

      {/* Question list */}
      <div className="space-y-2">
        {threads.length === 0 ? (
          <EmptyState
            icon={QuestionMarkCircleIcon}
            title="No questions yet"
            description="Be the first to ask."
            compact
          />
        ) : (
          threads.map((t) => {
            const isSel = t.id === selectedId;
            return (
              <Button
                key={t.id}
                unstyled
                onClick={() => setSelectedId(isSel ? null : t.id)}
                className={clsx(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  isSel
                    ? "border-primary-300 bg-primary-50 dark:border-primary-500/40 dark:bg-primary-500/10"
                    : "border-gray-200 hover:bg-gray-50 dark:border-dark-600 dark:hover:bg-dark-600/50",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <Avatar name={t.askerName} size={8} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 dark:text-dark-100">
                      {t.askerName}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-dark-300">
                      {timeAgo(t.createdAt)}
                    </p>
                  </div>
                  {t.isResolved && (
                    <Badge color="success" variant="soft" className="shrink-0 gap-1">
                      <CheckCircleSolidIcon className="size-3" />
                      Resolved
                    </Badge>
                  )}
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-gray-700 dark:text-dark-200">
                  {t.question}
                </p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-gray-500 dark:text-dark-300">
                  <span className="inline-flex items-center gap-1">
                    <ChatBubbleLeftRightIcon className="size-3.5" />
                    {t.answers.length} answer{t.answers.length === 1 ? "" : "s"}
                  </span>
                  {typeof t.upvotes === "number" && (
                    <span className="inline-flex items-center gap-1">
                      <HandThumbUpIcon className="size-3.5" />
                      {t.upvotes}
                    </span>
                  )}
                </div>
              </Button>
            );
          })
        )}
      </div>

      {/* Thread detail */}
      {selected && (
        <Card skin="bordered" className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Thread
            </h3>
            <Button
              variant="flat"
              color="neutral"
              isIcon
              aria-label="Close thread"
              onClick={() => setSelectedId(null)}
              className="size-6"
            >
              <ArrowPathIcon className="size-3.5" />
            </Button>
          </div>

          <p className="mt-2 text-sm text-gray-700 dark:text-dark-200">
            {selected.question}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Avatar name={selected.askerName} size={6} />
            <span className="text-xs text-gray-500 dark:text-dark-300">
              {selected.askerName} · {timeAgo(selected.createdAt)}
            </span>
          </div>

          {/* Answers */}
          <div className="mt-3 space-y-3 border-t border-gray-100 pt-3 dark:border-dark-600">
            {selected.answers.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-dark-400">
                No answers yet. Be the first to help!
              </p>
            ) : (
              selected.answers.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md bg-gray-50 p-2.5 dark:bg-dark-600"
                >
                  <div className="flex items-center gap-2">
                    <Avatar name={a.authorName} size={6} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-gray-800 dark:text-dark-100">
                        {a.authorName}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-dark-300">
                        {timeAgo(a.createdAt)}
                      </p>
                    </div>
                    {a.authorRole === "instructor" && (
                      <Badge color="primary" variant="soft" className="shrink-0">
                        Instructor
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-gray-700 dark:text-dark-200">
                    {a.body}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          <div className="mt-3 border-t border-gray-100 pt-3 dark:border-dark-600">
            <Textarea
              rows={2}
              placeholder="Add your answer…"
              value={answerDraft[selected.id] ?? ""}
              onChange={(e) =>
                setAnswerDraft((prev) => ({
                  ...prev,
                  [selected.id]: (e.target as HTMLTextAreaElement).value,
                }))
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <div className="mt-2 flex items-center justify-between">
              <Button variant="flat" color="neutral" className="gap-1 text-xs">
                <CheckCircleIcon className="size-3.5" />
                Mark as resolved
              </Button>
              <Button
                variant="filled"
                color="primary"
                onClick={() => handleAnswer(selected.id)}
                disabled={!(answerDraft[selected.id] ?? "").trim()}
                className="text-xs"
              >
                Reply
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
