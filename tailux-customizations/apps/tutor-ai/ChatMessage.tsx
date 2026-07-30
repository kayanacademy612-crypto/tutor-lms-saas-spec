// ChatMessage — single AI chat message bubble.
//
// Renders one `AIMessage` in the TutorAI conversation panel:
//   - User messages → right-aligned, primary-tinted bubble.
//   - Assistant messages → left-aligned, neutral bubble with a bot avatar.
//   - System messages → centred, muted pill (rare; mostly used by the backend
//     for notices like quota warnings).
//
// The bubble body preserves line breaks and trims trailing whitespace. A
// tiny timestamp is rendered under each bubble.

// Import Dependencies
import clsx from "clsx";
import { UserIcon } from "@heroicons/react/24/outline";
import { RiRobot2Line } from "react-icons/ri";

// Local Imports
import { Avatar } from "@/components/ui";
import type { AIMessage } from "@/types/lms";

// ----------------------------------------------------------------------

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ----------------------------------------------------------------------

export interface ChatMessageProps {
  message: AIMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const time = formatTime(message.createdAt);

  if (message.role === "system") {
    return (
      <div className="flex justify-center py-1.5">
        <span className="rounded-full bg-gray-100 px-3 py-1 text-center text-[11px] text-gray-500 dark:bg-dark-600 dark:text-dark-300">
          {message.content}
        </span>
      </div>
    );
  }

  const isUser = message.role === "user";

  return (
    <div
      className={clsx(
        "flex w-full items-end gap-2.5",
        isUser ? "justify-end" : "justify-start",
      )}
    >
      {!isUser && (
        <Avatar size={9} initialColor="info" className="shrink-0">
          <RiRobot2Line className="size-5" />
        </Avatar>
      )}

      <div
        className={clsx(
          "flex max-w-[78%] flex-col gap-1",
          isUser ? "items-end" : "items-start",
        )}
      >
        <div
          className={clsx(
            "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
            isUser
              ? "rounded-br-md bg-primary-500 text-white dark:bg-primary-600"
              : "rounded-bl-md border border-gray-200 bg-white text-gray-800 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-100",
          )}
        >
          {message.content}
        </div>
        <div
          className={clsx(
            "flex items-center gap-2 px-1 text-[10px] text-gray-400 dark:text-dark-400",
            isUser ? "flex-row-reverse" : "flex-row",
          )}
        >
          <span>{time}</span>
          {typeof message.tokensUsed === "number" && message.tokensUsed > 0 && (
            <span className="opacity-70">{message.tokensUsed} tok</span>
          )}
        </div>
      </div>

      {isUser && (
        <Avatar size={9} initialColor="primary" className="shrink-0">
          <UserIcon className="size-5" />
        </Avatar>
      )}
    </div>
  );
}

export default ChatMessage;
