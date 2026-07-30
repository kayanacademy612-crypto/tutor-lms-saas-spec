// Barrel export for shared LMS UI components.
//
// Consumers can import everything from `@/components/lms`:
//
//   import { CourseCard, CourseGrid, ProgressBar } from "@/components/lms";

export { ProgressBar } from "./ProgressBar";
export type { ProgressBarProps, ProgressBarColor } from "./ProgressBar";

export { RatingStars } from "./RatingStars";
export type { RatingStarsProps } from "./RatingStars";

export { PriceTag, formatPrice } from "./PriceTag";
export type { PriceTagProps, PriceModel } from "./PriceTag";

export { DifficultyBadge } from "./DifficultyBadge";
export type { DifficultyBadgeProps, DifficultyLevel } from "./DifficultyBadge";

export { InstructorAvatar } from "./InstructorAvatar";
export type { InstructorAvatarProps } from "./InstructorAvatar";

export { CourseThumbnail } from "./CourseThumbnail";
export type { CourseThumbnailProps } from "./CourseThumbnail";

export { EnrollmentButton } from "./EnrollmentButton";
export type { EnrollmentButtonProps } from "./EnrollmentButton";

export { EmptyState, NoDataEmptyState } from "./EmptyState";
export type { EmptyStateProps } from "./EmptyState";

export { LoadingState } from "./LoadingState";
export type { LoadingStateProps } from "./LoadingState";

export { ErrorState } from "./ErrorState";
export type { ErrorStateProps } from "./ErrorState";

export { StatCard } from "./StatCard";
export type { StatCardProps, StatTrend } from "./StatCard";

export { LessonCard, formatDuration } from "./LessonCard";
export type { LessonCardProps } from "./LessonCard";

export { QuizCard, formatTimeLimit } from "./QuizCard";
export type { QuizCardProps } from "./QuizCard";

export { CourseCard } from "./CourseCard";
export type { CourseCardProps } from "./CourseCard";

export { CourseGrid } from "./CourseGrid";
export type { CourseGridProps } from "./CourseGrid";
