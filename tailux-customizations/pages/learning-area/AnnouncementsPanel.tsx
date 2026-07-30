// AnnouncementsPanel — News tab for the right sidebar.
//
// Lists course announcements with date, author, and content preview. Mock
// data lives at the top; the parent passes `courseId` for future API wiring.

// Import Dependencies
import { useState } from "react";
import clsx from "clsx";
import {
  MegaphoneIcon,
  CalendarDaysIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Card, Badge, Avatar, Button } from "@/components/ui";
import { EmptyState } from "@/components/lms";

// ----------------------------------------------------------------------

export interface AnnouncementsPanelProps {
  courseId: string;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  authorName: string;
  authorRole: "instructor" | "ta" | "admin";
  createdAt: string;
  pinned?: boolean;
}

// ---- Mock data --------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-1",
    title: "Week 3 live class moved to Thursday",
    body: "Hi everyone — due to a scheduling conflict, this week's live Q&A is moving from Wednesday 6pm to Thursday 6pm (same Zoom link). Apologies for the late notice!",
    authorName: "Maya Chen",
    authorRole: "instructor",
    createdAt: daysFromNow(0),
    pinned: true,
  },
  {
    id: "ann-2",
    title: "Module 2 quiz is live",
    body: "The Hooks Mastery Quiz is now open. You have until Sunday 11:59pm to attempt it (max 2 attempts). Reach out on the Q&A board if anything's unclear.",
    authorName: "Maya Chen",
    authorRole: "instructor",
    createdAt: daysFromNow(-2),
  },
  {
    id: "ann-3",
    title: "Assignment 1 brief posted",
    body: "Build a debounced search widget against the public OpenLibrary API. Submissions due in 5 days — see the assignment page for full instructions.",
    authorName: "Maya Chen",
    authorRole: "instructor",
    createdAt: daysFromNow(-3),
  },
  {
    id: "ann-4",
    title: "Welcome to the course! 👋",
    body: "Welcome aboard! Take a moment to introduce yourself in the Q&A board, then dive into Lesson 1. We'll have a kick-off live class this Friday.",
    authorName: "Maya Chen",
    authorRole: "instructor",
    createdAt: daysFromNow(-7),
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

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const ROLE_LABEL: Record<Announcement["authorRole"], string> = {
  instructor: "Instructor",
  ta: "Teaching Assistant",
  admin: "Admin",
};

// ----------------------------------------------------------------------

export default function AnnouncementsPanel({
  courseId,
}: AnnouncementsPanelProps) {
  void courseId; // Reserved for future API wiring.

  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(MOCK_ANNOUNCEMENTS.slice(0, 1).map((a) => a.id)),
  );

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sorted = [...MOCK_ANNOUNCEMENTS].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="space-y-4">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
          <MegaphoneIcon className="size-4 text-primary-500" />
          Announcements
        </h2>
        <p className="text-xs text-gray-500 dark:text-dark-300">
          {MOCK_ANNOUNCEMENTS.length} updates from your instructor
        </p>
      </header>

      {sorted.length === 0 ? (
        <EmptyState
          icon={MegaphoneIcon}
          title="No announcements"
          description="Your instructor hasn't posted any updates yet."
          compact
        />
      ) : (
        <div className="space-y-2.5">
          {sorted.map((ann) => {
            const isExpanded = expanded.has(ann.id);
            return (
              <Card key={ann.id} skin="bordered" className="p-3.5">
                <div className="flex items-start gap-2.5">
                  <Avatar name={ann.authorName} size={8} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-medium text-gray-800 dark:text-dark-100">
                        {ann.authorName}
                      </p>
                      <Badge color="primary" variant="soft" className="shrink-0">
                        {ROLE_LABEL[ann.authorRole]}
                      </Badge>
                      {ann.pinned && (
                        <Badge color="warning" variant="soft" className="shrink-0">
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500 dark:text-dark-300">
                      <CalendarDaysIcon className="size-3" />
                      {formatDate(ann.createdAt)} · {timeAgo(ann.createdAt)}
                    </p>
                  </div>
                </div>

                <h3 className="mt-2 text-sm font-semibold text-gray-800 dark:text-dark-50">
                  {ann.title}
                </h3>
                <p
                  className={clsx(
                    "mt-1 text-xs text-gray-600 dark:text-dark-200",
                    !isExpanded && "line-clamp-2",
                  )}
                >
                  {ann.body}
                </p>

                {ann.body.length > 120 && (
                  <Button
                    variant="flat"
                    color="primary"
                    onClick={() => toggle(ann.id)}
                    className="mt-1.5 p-0 text-[11px] font-semibold"
                  >
                    {isExpanded ? "Show less" : "Read more"}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
