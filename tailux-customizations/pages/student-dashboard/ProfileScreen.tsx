// ProfileScreen — student profile with inline edit.
//
// Renders the student's avatar, name, email, bio, and social links, plus
// three KPI tiles (enrolled courses, certificates earned, member since).
// The "Edit profile" button toggles an inline editor backed by tailux
// `Input` / `Textarea` controls. Enrolled-course and certificate counts are
// derived from the real `useEnrollments` hook (with mock fallback).

// Import Dependencies
import { useState, ReactNode } from "react";
import clsx from "clsx";
import {
  PencilSquareIcon,
  CheckIcon,
  XMarkIcon,
  EnvelopeIcon,
  LinkIcon,
  CalendarDaysIcon,
  AcademicCapIcon,
  CheckBadgeIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { useEnrollments } from "@/hooks/useLms";
import type { Enrollment } from "@/types/lms";
import { EmptyState, LoadingState } from "@/components/lms";
import { Button, Card, Input, Textarea, Badge, Avatar } from "@/components/ui";

// ----------------------------------------------------------------------

interface StudentProfile {
  name: string;
  email: string;
  headline: string;
  bio: string;
  location: string;
  website: string;
  twitter: string;
  github: string;
  avatarUrl?: string;
  memberSince: string; // ISO date
}

const MOCK_PROFILE: StudentProfile = {
  name: "Alex Morgan",
  email: "alex.morgan@example.com",
  headline: "Frontend engineer in training · React & TypeScript enthusiast",
  bio: "Self-taught developer transitioning into full-stack work. Currently leveling up on data structures, system design, and DevOps. When I'm not coding you'll find me hiking or brewing pour-over coffee.",
  location: "Austin, TX",
  website: "https://alexmorgan.dev",
  twitter: "https://twitter.com/alexmorgan",
  github: "https://github.com/alexmorgan",
  memberSince: new Date(Date.now() - 320 * 86400000).toISOString(),
};

/** Mock enrollments used as a fallback when the API is unavailable. */
const MOCK_ENROLLMENTS: Enrollment[] = [
  {
    id: "enr-1",
    tenantId: "tenant-1",
    courseId: "course-001",
    studentId: "student-1",
    status: "active",
    progressPct: 62,
    createdAt: MOCK_PROFILE.memberSince,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "enr-2",
    tenantId: "tenant-1",
    courseId: "course-002",
    studentId: "student-1",
    status: "active",
    progressPct: 28,
    createdAt: MOCK_PROFILE.memberSince,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "enr-3",
    tenantId: "tenant-1",
    courseId: "course-003",
    studentId: "student-1",
    status: "completed",
    progressPct: 100,
    completedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    createdAt: MOCK_PROFILE.memberSince,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "enr-4",
    tenantId: "tenant-1",
    courseId: "course-004",
    studentId: "student-1",
    status: "active",
    progressPct: 8,
    createdAt: MOCK_PROFILE.memberSince,
    updatedAt: new Date().toISOString(),
  },
  {
    id: "enr-5",
    tenantId: "tenant-1",
    courseId: "course-005",
    studentId: "student-1",
    status: "completed",
    progressPct: 100,
    completedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    createdAt: MOCK_PROFILE.memberSince,
    updatedAt: new Date().toISOString(),
  },
];

// ----------------------------------------------------------------------

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ----------------------------------------------------------------------

export function ProfileScreen() {
  const { data: enrollments, loading, error, refetch } = useEnrollments();

  const [profile, setProfile] = useState<StudentProfile>(MOCK_PROFILE);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<StudentProfile>(MOCK_PROFILE);

  // Fall back to mock enrollments when the API is unavailable.
  const enrList: Enrollment[] =
    enrollments && enrollments.length > 0 ? enrollments : MOCK_ENROLLMENTS;

  const enrolledCount = enrList.length;
  const certificatesEarned = enrList.filter(
    (e) => e.status === "completed" || e.progressPct >= 100,
  ).length;

  function startEdit() {
    setDraft(profile);
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
  }
  function saveEdit() {
    setProfile(draft);
    setEditing(false);
  }

  // ----------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* API health notice */}
      {error && (
        <Card className="flex items-center gap-3 border-warning-300 bg-warning-50 p-3 dark:border-warning-500/30 dark:bg-warning-500/10">
          <ExclamationTriangleIcon className="size-5 shrink-0 text-warning-600 dark:text-warning-400" />
          <p className="flex-1 text-xs text-warning-700 dark:text-warning-300">
            Couldn&apos;t load enrollments — showing sample stats below.
          </p>
          <Button variant="outlined" color="warning" className="text-xs" onClick={refetch}>
            Retry
          </Button>
        </Card>
      )}

      {/* Cover + identity card */}
      <Card className="overflow-hidden p-0">
        {/* Cover banner */}
        <div className="h-28 w-full bg-gradient-to-r from-primary-500 via-primary-600 to-secondary-600" />

        <div className="px-6 pb-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="-mt-12">
                <Avatar
                  name={profile.name}
                  src={profile.avatarUrl}
                  size={24}
                  initialColor="primary"
                  initialVariant="filled"
                  classNames={{
                    root: "ring-4 ring-white dark:ring-dark-750 rounded-full",
                  }}
                />
              </div>
              <div className="pb-1">
                <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
                  {profile.name}
                </h1>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
                  {profile.headline}
                </p>
              </div>
            </div>

            {!editing && (
              <Button
                variant="outlined"
                color="primary"
                className="gap-1.5 text-sm"
                onClick={startEdit}
              >
                <PencilSquareIcon className="size-4 stroke-2" />
                Edit profile
              </Button>
            )}
          </div>

          {/* KPI tiles */}
          {loading ? (
            <LoadingState message="Loading profile stats…" inline className="mt-6" />
          ) : (
            <div className="mt-6 grid grid-cols-3 gap-3">
              <StatTile
                icon={AcademicCapIcon}
                value={enrolledCount}
                label="Enrolled courses"
                color="primary"
              />
              <StatTile
                icon={CheckBadgeIcon}
                value={certificatesEarned}
                label="Certificates"
                color="success"
              />
              <StatTile
                icon={CalendarDaysIcon}
                value={formatDate(profile.memberSince)}
                label="Member since"
                color="info"
                small
              />
            </div>
          )}
        </div>
      </Card>

      {/* Detail / editor */}
      {editing ? (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Edit profile
            </h2>
            <div className="flex items-center gap-2">
              <Button variant="flat" color="neutral" className="gap-1.5 text-sm" onClick={cancelEdit}>
                <XMarkIcon className="size-4 stroke-2" />
                Cancel
              </Button>
              <Button color="primary" className="gap-1.5 text-sm" onClick={saveEdit}>
                <CheckIcon className="size-4 stroke-2" />
                Save changes
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Name"
              value={draft.name}
              onChange={(e) =>
                setDraft({ ...draft, name: (e.target as HTMLInputElement).value })
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Email"
              type="email"
              value={draft.email}
              onChange={(e) =>
                setDraft({ ...draft, email: (e.target as HTMLInputElement).value })
              }
              prefix={<EnvelopeIcon className="size-4 text-gray-400" />}
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Headline"
              value={draft.headline}
              onChange={(e) =>
                setDraft({ ...draft, headline: (e.target as HTMLInputElement).value })
              }
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Location"
              value={draft.location}
              onChange={(e) =>
                setDraft({ ...draft, location: (e.target as HTMLInputElement).value })
              }
              classNames={{ wrapper: "mt-0" }}
            />
          </div>

          <Textarea
            label="Bio"
            rows={4}
            value={draft.bio}
            onChange={(e) =>
              setDraft({ ...draft, bio: (e.target as HTMLTextAreaElement).value })
            }
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="Website"
              value={draft.website}
              onChange={(e) =>
                setDraft({ ...draft, website: (e.target as HTMLInputElement).value })
              }
              prefix={<LinkIcon className="size-4 text-gray-400" />}
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Twitter"
              value={draft.twitter}
              onChange={(e) =>
                setDraft({ ...draft, twitter: (e.target as HTMLInputElement).value })
              }
              prefix={<LinkIcon className="size-4 text-gray-400" />}
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="GitHub"
              value={draft.github}
              onChange={(e) =>
                setDraft({ ...draft, github: (e.target as HTMLInputElement).value })
              }
              prefix={<LinkIcon className="size-4 text-gray-400" />}
              classNames={{ wrapper: "mt-0" }}
            />
          </div>
        </Card>
      ) : (
        <Card className="space-y-5 p-5">
          {/* About */}
          <section>
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              About
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-dark-200">
              {profile.bio}
            </p>
          </section>

          <div className="h-px bg-gray-100 dark:bg-dark-600" />

          {/* Contact + links */}
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <InfoRow icon={EnvelopeIcon} label="Email" value={profile.email} />
            <InfoRow icon={CalendarDaysIcon} label="Member since" value={formatDate(profile.memberSince)} />
            <InfoRow icon={GlobeAltIcon} label="Location" value={profile.location} />
            <InfoRow icon={LinkIcon} label="Website" value={profile.website} link />
          </section>

          <div className="h-px bg-gray-100 dark:bg-dark-600" />

          {/* Social */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-800 dark:text-dark-50">
              Social
            </h2>
            <div className="flex flex-wrap gap-2">
              <SocialBadge label="Twitter" handle={profile.twitter} />
              <SocialBadge label="GitHub" handle={profile.github} />
              <SocialBadge label="Website" handle={profile.website} />
            </div>
          </section>

          {/* Empty state if no bio */}
          {!profile.bio && (
            <EmptyState
              icon={PencilSquareIcon}
              title="No bio yet"
              description="Tell other learners a bit about yourself."
              actionLabel="Add a bio"
              onAction={startEdit}
              compact
            />
          )}
        </Card>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function StatTile({
  icon: Icon,
  value,
  label,
  color,
  small,
}: {
  icon: typeof AcademicCapIcon;
  value: ReactNode;
  label: string;
  color: "primary" | "success" | "info";
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-dark-600 dark:bg-dark-700">
      <div className="flex items-center gap-2">
        <div
          className={clsx(
            "flex size-7 items-center justify-center rounded-md",
            color === "primary" && "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400",
            color === "success" && "bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400",
            color === "info" && "bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400",
          )}
        >
          <Icon className="size-4 stroke-2" />
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
          {label}
        </span>
      </div>
      <p
        className={clsx(
          "mt-1.5 font-semibold text-gray-800 dark:text-dark-50",
          small ? "text-sm" : "text-2xl",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  link,
}: {
  icon: typeof EnvelopeIcon;
  label: string;
  value: string;
  link?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-300">
        <Icon className="size-4 stroke-2" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400 dark:text-dark-400">
          {label}
        </p>
        {link ? (
          <a
            href={value}
            target="_blank"
            rel="noreferrer"
            className="block truncate text-sm text-primary-600 hover:underline dark:text-primary-400"
          >
            {value}
          </a>
        ) : (
          <p className="truncate text-sm text-gray-700 dark:text-dark-200">{value}</p>
        )}
      </div>
    </div>
  );
}

function SocialBadge({ label, handle }: { label: string; handle: string }) {
  return (
    <a href={handle} target="_blank" rel="noreferrer">
      <Badge color="primary" variant="soft" className="gap-1.5 px-2.5 py-1 text-xs">
        <LinkIcon className="size-3.5" />
        {label}
      </Badge>
    </a>
  );
}

export default ProfileScreen;
