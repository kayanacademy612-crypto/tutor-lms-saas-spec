// TutorAI Assistant — `apps/tutor-ai` route.
//
// Three-column layout (mirrors the existing `apps/ai-chat` template but
// re-wired to the Phase 6 backend hooks in `useReportsAI`):
//   - Left: ConversationList (`useAIConversations`)
//   - Centre: ChatMessage list (`useAIConversation`) + ChatInput
//     (`useSendAIMessage`)
//   - Right: UsagePanel (`useAIUsage`) + context summary + AI generators
//
// State machine:
//   - "new chat" mode (selectedId === null) → user types the first message,
//     the send hook returns a `conversationId`, and we transition into
//     "active chat" mode by setting `selectedId`.
//   - "active chat" mode → messages come from `useAIConversation(selectedId)`,
//     optimistically appended with the user message + assistant reply on each
//     successful send.

// Import Dependencies
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  SparklesIcon,
  XCircleIcon,
  ArrowPathIcon,
  CubeTransparentIcon,
  CpuChipIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, ScrollShadow } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useAIConversation,
  useAIConversations,
  useDeleteAIConversation,
  useSendAIMessage,
} from "@/hooks/useReportsAI";
import type { AIMessage } from "@/types/lms";

import { ChatInput, type QuickAction } from "./ChatInput";
import { ChatMessage } from "./ChatMessage";
import { ConversationList } from "./ConversationList";
import { UsagePanel } from "./UsagePanel";
import { CourseOutlineGenerator } from "./CourseOutlineGenerator";
import { QuizGenerator } from "./QuizGenerator";

// ----------------------------------------------------------------------

interface ChatContext {
  courseId?: string;
  courseName?: string;
  lessonId?: string;
  lessonName?: string;
}

// ----------------------------------------------------------------------

export default function TutorAIAssistant() {
  const navigate = useNavigate();

  const conversationsQuery = useAIConversations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const conversationQuery = useAIConversation(selectedId ?? undefined);
  const sendMessage = useSendAIMessage();
  const deleteConversation = useDeleteAIConversation();

  // Local optimistic message list — mirrors the server-side messages but
  // appends the user's outbound message + the assistant's reply immediately
  // so the chat feels responsive while the request is in-flight.
  const [optimisticMessages, setOptimisticMessages] = useState<AIMessage[]>(
    [],
  );

  // Context (course/lesson the user is currently asking about).
  const [context, setContext] = useState<ChatContext>({});
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset optimistic overlay whenever the active conversation changes.
  useEffect(() => {
    setOptimisticMessages([]);
  }, [selectedId]);

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [optimisticMessages.length, conversationQuery.data?.messages?.length]);

  const messages: AIMessage[] = useMemo(() => {
    const server = conversationQuery.data?.messages ?? [];
    if (optimisticMessages.length === 0) return server;
    // Merge: server first, then any optimistic messages whose ids aren't yet
    // echoed back by the server.
    const serverIds = new Set(server.map((m) => m.id));
    return [...server, ...optimisticMessages.filter((m) => !serverIds.has(m.id))];
  }, [conversationQuery.data?.messages, optimisticMessages]);

  const handleSend = async (text: string) => {
    const tempUserId = `pending-user-${Date.now()}`;
    const userMessage: AIMessage = {
      id: tempUserId,
      tenantId: "",
      conversationId: selectedId ?? "",
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    // Optimistic placeholder for the assistant's reply.
    const tempAssistantId = `pending-assistant-${Date.now()}`;
    const assistantPlaceholder: AIMessage = {
      id: tempAssistantId,
      tenantId: "",
      conversationId: selectedId ?? "",
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
    };

    setOptimisticMessages((prev) => [...prev, userMessage, assistantPlaceholder]);

    const result = await sendMessage.mutate({
      conversationId: selectedId ?? undefined,
      message: text,
      context: {
        courseId: context.courseId,
        lessonId: context.lessonId,
        action: "chat",
      },
    });

    if (!result) {
      // Replace the assistant placeholder with an error notice; keep the user
      // message so the user can re-send / edit.
      setOptimisticMessages((prev) =>
        prev.map((m) =>
          m.id === tempAssistantId
            ? {
                ...m,
                role: "system",
                content: "Failed to reach the AI service. Please try again.",
              }
            : m,
        ),
      );
      return;
    }

    // First message in a new conversation → switch to that conversation.
    if (!selectedId && result.conversationId) {
      setSelectedId(result.conversationId);
    }

    // Replace placeholders with the real assistant reply (and drop the local
    // user message — the server-side history will echo it back on refetch).
    setOptimisticMessages((prev) =>
      prev
        .filter((m) => m.id !== tempUserId)
        .map((m) =>
          m.id === tempAssistantId ? result.message : m,
        ),
    );

    // Refresh the conversation list so the new/updated chat bubbles to the top.
    void conversationsQuery.refetch();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this conversation? This cannot be undone.")) {
      return;
    }
    await deleteConversation.mutate(id);
    if (selectedId === id) setSelectedId(null);
    void conversationsQuery.refetch();
  };

  const handleNewChat = () => {
    setSelectedId(null);
    setOptimisticMessages([]);
  };

  const handleQuickAction = (action: QuickAction) => {
    if (action === "generate_outline") setOutlineOpen(true);
    else if (action === "generate_quiz") setQuizOpen(true);
    // improve_content + summarize just pre-fill the textarea (handled in
    // ChatInput itself when onQuickAction isn't overridden).
  };

  const handleClearContext = () => {
    setContext({});
  };

  const remainingTokens = sendMessage.data?.usage?.remainingTokens;

  return (
    <Page title="TutorAI Assistant">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 text-white dark:from-primary-600 dark:to-primary-700">
              <SparklesIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                TutorAI Assistant
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Your AI tutor — generate courses, draft quizzes, and refine
                content.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outlined"
              color="primary"
              className="gap-1.5 text-sm"
              onClick={() => setOutlineOpen(true)}
            >
              <CubeTransparentIcon className="size-4 stroke-2" />
              <span className="hidden sm:inline">Course outline</span>
            </Button>
            <Button
              variant="outlined"
              color="primary"
              className="gap-1.5 text-sm"
              onClick={() => setQuizOpen(true)}
            >
              <CpuChipIcon className="size-4 stroke-2" />
              <span className="hidden sm:inline">Quiz</span>
            </Button>
          </div>
        </header>

        {/* 3-column body */}
        <div className="flex min-h-0 flex-1">
          {/* Left sidebar */}
          <aside className="hidden w-72 shrink-0 border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750 md:flex md:flex-col">
            <ConversationList
              conversations={conversationsQuery.data}
              loading={conversationsQuery.loading}
              error={conversationsQuery.error}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onDelete={handleDelete}
              onNewChat={handleNewChat}
              onRefresh={conversationsQuery.refetch}
              deletingId={deleteConversation.loading ? selectedId : null}
            />
          </aside>

          {/* Centre — chat */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Chat header */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 py-2.5 dark:border-dark-600 dark:bg-dark-750">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                  {selectedId
                    ? (conversationQuery.data?.conversation.title ??
                      "New conversation")
                    : "New conversation"}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-dark-300">
                  {selectedId
                    ? "Continue the conversation"
                    : "Send a message to start"}
                </p>
              </div>
              {selectedId && (
                <Button
                  isIcon
                  variant="flat"
                  color="neutral"
                  className="size-8"
                  onClick={() => conversationQuery.refetch()}
                  aria-label="Refresh messages"
                >
                  <ArrowPathIcon
                    className={`size-4 ${conversationQuery.loading ? "animate-spin" : ""}`}
                  />
                </Button>
              )}
            </div>

            {/* Messages */}
            <ScrollShadow
              ref={scrollRef}
              className="hide-scrollbar grow overflow-y-auto px-4 py-6"
            >
              <div className="mx-auto max-w-3xl space-y-5">
                {!selectedId && optimisticMessages.length === 0 ? (
                  <EmptyState
                    icon={SparklesIcon}
                    title="How can I help you today?"
                    description="Ask anything, or use the quick-action chips below to generate a course outline, draft a quiz, improve lesson content, or summarise material."
                  />
                ) : conversationQuery.loading && messages.length === 0 ? (
                  <LoadingState message="Loading messages…" />
                ) : conversationQuery.error && messages.length === 0 ? (
                  <ErrorState
                    error={conversationQuery.error}
                    onRetry={conversationQuery.refetch}
                  />
                ) : messages.length === 0 ? (
                  <EmptyState
                    icon={SparklesIcon}
                    title="No messages yet"
                    description="Send the first message to start this conversation."
                  />
                ) : (
                  messages.map((m) => (
                    <ChatMessage key={m.id} message={m} />
                  ))
                )}

                {/* Typing indicator while the assistant reply is empty */}
                {optimisticMessages.some(
                  (m) => m.role === "assistant" && m.content === "",
                ) && <TypingDots />}
              </div>
            </ScrollShadow>

            {/* Composer */}
            <ChatInput
              onSend={handleSend}
              disabled={sendMessage.loading}
              onQuickAction={handleQuickAction}
            />
          </main>

          {/* Right sidebar */}
          <aside className="hidden w-72 shrink-0 border-l border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750 lg:flex lg:flex-col">
            <UsagePanel remainingTokens={remainingTokens} />

            {/* Context panel */}
            <div className="shrink-0 border-t border-gray-200 p-4 dark:border-dark-600">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
                  Context
                </p>
                {(context.courseId || context.lessonId) && (
                  <button
                    type="button"
                    onClick={handleClearContext}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-error-500 dark:text-dark-300 dark:hover:text-error-400"
                  >
                    <XCircleIcon className="size-3.5" />
                    Clear
                  </button>
                )}
              </div>
              {context.courseId || context.lessonId ? (
                <dl className="space-y-1.5 text-xs">
                  {context.courseName && (
                    <div>
                      <dt className="text-gray-400 dark:text-dark-400">
                        Course
                      </dt>
                      <dd className="font-medium text-gray-800 dark:text-dark-100">
                        {context.courseName}
                      </dd>
                    </div>
                  )}
                  {context.lessonName && (
                    <div>
                      <dt className="text-gray-400 dark:text-dark-400">
                        Lesson
                      </dt>
                      <dd className="font-medium text-gray-800 dark:text-dark-100">
                        {context.lessonName}
                      </dd>
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-xs text-gray-400 dark:text-dark-400">
                  No course or lesson context set. Open a lesson from the
                  learning area to focus the AI on its content.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>

      <CourseOutlineGenerator
        open={outlineOpen}
        onClose={() => setOutlineOpen(false)}
        onCreated={(outline) => {
          // Hand the outline to the course-builder via router state.
          navigate("/apps/course-builder", { state: { aiOutline: outline } });
        }}
      />
      <QuizGenerator
        open={quizOpen}
        onClose={() => setQuizOpen(false)}
        onCreated={(quiz) => {
          navigate("/apps/quiz-builder", { state: { aiQuiz: quiz } });
        }}
      />
    </Page>
  );
}

// ----------------------------------------------------------------------

/** Three bouncing dots — shown while waiting for the assistant's first token. */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-2 animate-bounce rounded-full bg-gray-400 dark:bg-dark-400"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}
