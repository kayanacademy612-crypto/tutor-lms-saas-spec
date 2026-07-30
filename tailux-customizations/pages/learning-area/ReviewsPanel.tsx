// ReviewsPanel — Reviews tab for the right sidebar.
//
// Shows the rating distribution (5★ → 1★), a list of recent reviews
// (student name, rating, review text, date), and a submit-review form with
// an interactive star rating + textarea. Mock data lives at the top; the
// parent passes `courseId` for future API wiring.

// Import Dependencies
import { useMemo, useState } from "react";
import { StarIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

// Local Imports
import { Button, Card, Badge, Avatar, Textarea, Input } from "@/components/ui";
import { EmptyState, RatingStars } from "@/components/lms";
import type { CourseReview } from "@/types/lms";

// ----------------------------------------------------------------------

export interface ReviewsPanelProps {
  courseId: string;
}

/** Extended review with student name (the API returns only `studentId`). */
interface DisplayReview extends CourseReview {
  studentName: string;
}

// ---- Mock data --------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};

const MOCK_REVIEWS: DisplayReview[] = [
  {
    id: "rev-1",
    tenantId: "tenant-1",
    courseId: "course-001",
    studentId: "student-2",
    rating: 5,
    title: "Exactly what I needed",
    body: "Maya's explanations are crystal-clear and the projects map directly to what I do at work. Highly recommend.",
    isApproved: true,
    isFeatured: true,
    createdAt: daysFromNow(-2),
    updatedAt: daysFromNow(-2),
    studentName: "Jordan Kim",
  },
  {
    id: "rev-2",
    tenantId: "tenant-1",
    courseId: "course-001",
    studentId: "student-3",
    rating: 5,
    title: "Best React course I've taken",
    body: "The hooks deep-dive alone is worth the price. The custom-hook lesson finally made the abstraction click for me.",
    isApproved: true,
    isFeatured: false,
    createdAt: daysFromNow(-5),
    updatedAt: daysFromNow(-5),
    studentName: "Priya Singh",
  },
  {
    id: "rev-3",
    tenantId: "tenant-1",
    courseId: "course-001",
    studentId: "student-4",
    rating: 4,
    title: "Great, but pacing is fast",
    body: "Loved the content. Some lessons moved quickly through advanced hooks — re-watching helped.",
    isApproved: true,
    isFeatured: false,
    createdAt: daysFromNow(-8),
    updatedAt: daysFromNow(-8),
    studentName: "Sam Patel",
  },
  {
    id: "rev-4",
    tenantId: "tenant-1",
    courseId: "course-001",
    studentId: "student-5",
    rating: 5,
    title: "Worth every penny",
    body: "Came in knowing only basic JS. Left shipping a real app. The assignments force you to actually practice.",
    isApproved: true,
    isFeatured: false,
    createdAt: daysFromNow(-12),
    updatedAt: daysFromNow(-12),
    studentName: "Lena Müller",
  },
  {
    id: "rev-5",
    tenantId: "tenant-1",
    courseId: "course-001",
    studentId: "student-6",
    rating: 3,
    title: "Good but could use more depth on data fetching",
    body: "Solid fundamentals, but I was hoping for more on React Query and SWR. Otherwise well-structured.",
    isApproved: true,
    isFeatured: false,
    createdAt: daysFromNow(-15),
    updatedAt: daysFromNow(-15),
    studentName: "Marcus Brown",
  },
];

const COURSE_AVG = 4.7;
const COURSE_COUNT = 312;

// ---- Helpers ----------------------------------------------------------

function timeAgo(isoDate: string): string {
  const diff = now.getTime() - new Date(isoDate).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

// ----------------------------------------------------------------------

export default function ReviewsPanel({ courseId }: ReviewsPanelProps) {
  void courseId;

  const [reviews, setReviews] = useState<DisplayReview[]>(MOCK_REVIEWS);
  const [composerOpen, setComposerOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  // Rating distribution.
  const distribution = useMemo(() => {
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      dist[r.rating] = (dist[r.rating] ?? 0) + 1;
    });
    return dist;
  }, [reviews]);

  const handleSubmit = () => {
    if (!rating || !body.trim()) return;
    const newReview: DisplayReview = {
      id: `rev-${Date.now()}`,
      tenantId: "tenant-1",
      courseId: "course-001",
      studentId: "student-1",
      rating,
      title: title.trim() || undefined,
      body: body.trim(),
      isApproved: false,
      isFeatured: false,
      createdAt: iso(new Date()),
      updatedAt: iso(new Date()),
      studentName: "You",
    };
    setReviews((prev) => [newReview, ...prev]);
    setRating(0);
    setTitle("");
    setBody("");
    setComposerOpen(false);
  };

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
            <StarIcon className="size-4 text-amber-400" />
            Reviews
          </h2>
          <p className="text-xs text-gray-500 dark:text-dark-300">
            {COURSE_COUNT} ratings · {reviews.length} written
          </p>
        </div>
        <Button
          variant="soft"
          color="primary"
          onClick={() => setComposerOpen((v) => !v)}
          className="text-xs"
        >
          {composerOpen ? "Cancel" : "Write a review"}
        </Button>
      </header>

      {/* Rating distribution */}
      <Card skin="bordered" className="p-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-800 dark:text-dark-50">
              {COURSE_AVG.toFixed(1)}
            </p>
            <RatingStars value={COURSE_AVG} size="size-3.5" />
            <p className="mt-1 text-[11px] text-gray-500 dark:text-dark-300">
              {COURSE_COUNT} ratings
            </p>
          </div>
          <div className="flex-1 space-y-1">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribution[star] ?? 0;
              const pct = reviews.length
                ? Math.round((count / reviews.length) * 100)
                : 0;
              return (
                <div key={star} className="flex items-center gap-2">
                  <span className="flex w-6 items-center gap-0.5 text-[11px] font-medium text-gray-600 dark:text-dark-200">
                    {star}
                    <StarSolidIcon className="size-2.5 text-amber-400" />
                  </span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-150 dark:bg-dark-500">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right text-[11px] tabular-nums text-gray-500 dark:text-dark-300">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* Submit review form */}
      {composerOpen && (
        <Card skin="bordered" className="p-4">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Share your experience
          </h3>

          {/* Interactive star rating */}
          <div className="mt-3">
            <p className="mb-1.5 text-xs font-medium text-gray-700 dark:text-dark-200">
              Your rating
            </p>
            <div
              className="inline-flex items-center gap-1"
              onMouseLeave={() => setHover(null)}
            >
              {[1, 2, 3, 4, 5].map((star) => {
                const filled = (hover ?? rating) >= star;
                return (
                  <Button
                    key={star}
                    unstyled
                    isIcon
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHover(star)}
                    aria-label={`${star} star${star > 1 ? "s" : ""}`}
                    className="size-7"
                  >
                    {filled ? (
                      <StarSolidIcon className="size-5 text-amber-400" />
                    ) : (
                      <StarIcon className="size-5 text-gray-300 dark:text-dark-400" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 space-y-2">
            <Input
              placeholder="Title (optional)"
              value={title}
              onChange={(e) => setTitle((e.target as HTMLInputElement).value)}
              classNames={{ wrapper: "mt-0" }}
            />
            <Textarea
              rows={3}
              placeholder="What did you like? What could be better?"
              value={body}
              onChange={(e) => setBody((e.target as HTMLTextAreaElement).value)}
              classNames={{ wrapper: "mt-0" }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-gray-500 dark:text-dark-300">
              Reviews are visible after instructor approval.
            </p>
            <Button
              variant="filled"
              color="primary"
              onClick={handleSubmit}
              disabled={!rating || !body.trim()}
              className="text-xs"
            >
              Submit review
            </Button>
          </div>
        </Card>
      )}

      {/* Reviews list */}
      {reviews.length === 0 ? (
        <EmptyState
          icon={StarIcon}
          title="No reviews yet"
          description="Be the first to review this course."
          compact
        />
      ) : (
        <div className="space-y-2.5">
          {reviews.map((rev) => (
            <Card key={rev.id} skin="bordered" className="p-3.5">
              <div className="flex items-start gap-2.5">
                <Avatar name={rev.studentName} size={8} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-xs font-medium text-gray-800 dark:text-dark-100">
                      {rev.studentName}
                    </p>
                    <RatingStars value={rev.rating} size="size-3" />
                    {rev.isFeatured && (
                      <Badge color="warning" variant="soft" className="shrink-0">
                        Featured
                      </Badge>
                    )}
                    {!rev.isApproved && (
                      <Badge color="neutral" variant="soft" className="shrink-0">
                        Pending
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500 dark:text-dark-300">
                    {timeAgo(rev.createdAt)}
                  </p>
                </div>
              </div>
              {rev.title && (
                <h4 className="mt-2 text-xs font-semibold text-gray-800 dark:text-dark-100">
                  {rev.title}
                </h4>
              )}
              {rev.body && (
                <p className="mt-1 text-xs text-gray-600 dark:text-dark-200">
                  {rev.body}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
