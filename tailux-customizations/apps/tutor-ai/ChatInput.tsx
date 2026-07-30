// ChatInput — message composer for the TutorAI chat panel.
//
// Features:
//   - Auto-resizing textarea (clamped at ~8 lines).
//   - Enter sends, Shift+Enter inserts a newline.
//   - Quick-action chips above the input that pre-fill a context-aware prompt
//     (Generate Course Outline / Generate Quiz / Improve Content / Summarize).
//   - Send button disabled while the input is empty or while the parent is
//     waiting for an assistant reply.

// Import Dependencies
import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import clsx from "clsx";
import {
  PaperAirplaneIcon,
  SparklesIcon,
  CubeTransparentIcon,
  PencilSquareIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button } from "@/components/ui";

// ----------------------------------------------------------------------

export type QuickAction =
  | "generate_outline"
  | "generate_quiz"
  | "improve_content"
  | "summarize";

export interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  /** Slot for an optional quick-action launcher (e.g. opening the outline modal). */
  onQuickAction?: (action: QuickAction) => void;
}

const QUICK_ACTIONS: {
  id: QuickAction;
  label: string;
  Icon: typeof SparklesIcon;
  prompt: string;
}[] = [
  {
    id: "generate_outline",
    label: "Generate Course Outline",
    Icon: CubeTransparentIcon,
    prompt:
      "Generate a structured course outline for: ",
  },
  {
    id: "generate_quiz",
    label: "Generate Quiz",
    Icon: SparklesIcon,
    prompt: "Generate a quiz with 5 questions about: ",
  },
  {
    id: "improve_content",
    label: "Improve Content",
    Icon: PencilSquareIcon,
    prompt: "Improve the following lesson content for clarity and engagement:\n\n",
  },
  {
    id: "summarize",
    label: "Summarize",
    Icon: DocumentTextIcon,
    prompt: "Summarize the following content into key takeaways:\n\n",
  },
];

// ----------------------------------------------------------------------

export function ChatInput({ onSend, disabled, onQuickAction }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleQuickAction = (action: QuickAction, prompt: string) => {
    if (onQuickAction) {
      onQuickAction(action);
      return;
    }
    // Default behaviour: drop the prompt into the textarea and focus.
    setValue((prev) => (prev ? `${prev}\n${prompt}` : prompt));
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 dark:border-dark-600 dark:bg-dark-750">
      {/* Quick-action chips */}
      <div className="mb-2 flex flex-wrap gap-1.5">
        {QUICK_ACTIONS.map(({ id, label, Icon, prompt }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleQuickAction(id, prompt)}
            disabled={disabled}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
              "border-gray-200 bg-gray-50 text-gray-700 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700",
              "dark:border-dark-500 dark:bg-dark-600 dark:text-dark-200 dark:hover:border-primary-500/40 dark:hover:bg-primary-500/10 dark:hover:text-primary-300",
              disabled && "cursor-not-allowed opacity-60 hover:bg-gray-50 dark:hover:bg-dark-600",
            )}
          >
            <Icon className="size-3.5 stroke-2" />
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your AI tutor anything…  (Enter to send, Shift+Enter for newline)"
          disabled={disabled}
          className={clsx(
            "max-h-[200px] min-h-[44px] flex-1 resize-none rounded-xl border px-3.5 py-2.5 text-sm leading-relaxed",
            "border-gray-300 bg-white text-gray-800 placeholder:text-gray-400",
            "focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20",
            "dark:border-dark-500 dark:bg-dark-700 dark:text-dark-100 dark:placeholder:text-dark-400 dark:focus:border-primary-500",
            disabled && "cursor-not-allowed opacity-70",
          )}
        />
        <Button
          type="submit"
          color="primary"
          variant="filled"
          isIcon
          disabled={disabled || value.trim().length === 0}
          className="size-10 shrink-0 rounded-xl"
          aria-label="Send message"
        >
          <PaperAirplaneIcon className="size-5 stroke-2" />
        </Button>
      </form>
    </div>
  );
}

export default ChatInput;
