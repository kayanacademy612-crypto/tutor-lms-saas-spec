// ProfileScreen — instructor profile + payout method settings.
//
// Renders the instructor's avatar, name, headline, bio, expertise areas, and
// social links. A separate "Payout method" card lets the instructor choose a
// payout method (PayPal / Stripe / Bank transfer) and enter the corresponding
// details. The "Edit profile" button toggles an inline editor.

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
  CurrencyDollarIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  StarIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import type { InstructorPayout } from "@/types/lms";
import { EmptyState } from "@/components/lms";
import { Button, Card, Input, Textarea, Badge, Avatar, Switch } from "@/components/ui";

// ----------------------------------------------------------------------

interface InstructorProfile {
  name: string;
  email: string;
  headline: string;
  bio: string;
  location: string;
  website: string;
  twitter: string;
  github: string;
  linkedin: string;
  avatarUrl?: string;
  expertiseAreas: string[];
  memberSince: string; // ISO date
}

const MOCK_PROFILE: InstructorProfile = {
  name: "Sarah Chen",
  email: "sarah.chen@example.com",
  headline: "Senior Frontend Engineer · React & TypeScript educator",
  bio: "I've been building production React apps for 8 years and teaching for 4. My courses focus on the patterns and tooling that scale from a side project to a multi-team codebase. When I'm not coding I'm probably cycling or chasing my dog.",
  location: "San Francisco, CA",
  website: "https://sarahchen.dev",
  twitter: "https://twitter.com/sarahchen",
  github: "https://github.com/sarahchen",
  linkedin: "https://linkedin.com/in/sarahchen",
  expertiseAreas: ["React", "TypeScript", "Performance", "Design Systems", "Tailwind CSS"],
  memberSince: new Date(Date.now() - 540 * 86400000).toISOString(),
};

const MOCK_PAYOUTS: InstructorPayout[] = [
  {
    id: "po-1",
    tenantId: "tenant-1",
    instructorId: "instr-1",
    periodStart: new Date(Date.now() - 60 * 86400000).toISOString(),
    periodEnd: new Date(Date.now() - 30 * 86400000).toISOString(),
    grossCents: 94280,
    commissionCents: 9428,
    netCents: 84852,
    currency: "usd",
    status: "paid",
    paymentMethod: "stripe",
    paidAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
];

type PayoutMethod = "paypal" | "stripe" | "bank";

// ----------------------------------------------------------------------

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const payoutMethodMeta: Record<
  PayoutMethod,
  { label: string; icon: typeof CurrencyDollarIcon; description: string }
> = {
  paypal: {
    label: "PayPal",
    icon: CurrencyDollarIcon,
    description: "Receive payouts to your PayPal balance.",
  },
  stripe: {
    label: "Stripe Connect",
    icon: CreditCardIcon,
    description: "Direct deposit via Stripe (1-2 business days).",
  },
  bank: {
    label: "Bank transfer (ACH)",
    icon: BuildingLibraryIcon,
    description: "Direct ACH deposit to your bank account.",
  },
};

// ----------------------------------------------------------------------

export function ProfileScreen() {
  const [profile, setProfile] = useState<InstructorProfile>(MOCK_PROFILE);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<InstructorProfile>(MOCK_PROFILE);

  // Payout settings
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>("stripe");
  const [paypalEmail, setPaypalEmail] = useState("sarah.chen@example.com");
  const [stripeConnected, setStripeConnected] = useState(true);
  const [bankAccount, setBankAccount] = useState("•••• 4242");
  const [bankRouting, setBankRouting] = useState("•••• 1100");
  const [autoPayout, setAutoPayout] = useState(true);
  const [minPayout, setMinPayout] = useState("100");

  const totalStudents = 2660;
  const totalCourses = 3;
  const avgRating = 4.7;

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

  return (
    <div className="space-y-6">
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
          <div className="mt-6 grid grid-cols-3 gap-3">
            <StatTile
              icon={AcademicCapIcon}
              value={totalCourses}
              label="Courses"
              color="primary"
            />
            <StatTile
              icon={UsersIcon}
              value={totalStudents.toLocaleString()}
              label="Students"
              color="info"
            />
            <StatTile
              icon={StarIcon}
              value={avgRating.toFixed(1)}
              label="Avg rating"
              color="warning"
            />
          </div>
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
              onChange={(e) => setDraft({ ...draft, name: (e.target as HTMLInputElement).value })}
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Email"
              type="email"
              value={draft.email}
              onChange={(e) => setDraft({ ...draft, email: (e.target as HTMLInputElement).value })}
              prefix={<EnvelopeIcon className="size-4 text-gray-400" />}
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Headline"
              value={draft.headline}
              onChange={(e) => setDraft({ ...draft, headline: (e.target as HTMLInputElement).value })}
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Location"
              value={draft.location}
              onChange={(e) => setDraft({ ...draft, location: (e.target as HTMLInputElement).value })}
              classNames={{ wrapper: "mt-0" }}
            />
          </div>

          <Textarea
            label="Bio"
            rows={4}
            value={draft.bio}
            onChange={(e) => setDraft({ ...draft, bio: (e.target as HTMLTextAreaElement).value })}
          />

          <Input
            label="Expertise areas (comma separated)"
            value={draft.expertiseAreas.join(", ")}
            onChange={(e) =>
              setDraft({
                ...draft,
                expertiseAreas: (e.target as HTMLInputElement).value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            classNames={{ wrapper: "mt-0" }}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Website"
              value={draft.website}
              onChange={(e) => setDraft({ ...draft, website: (e.target as HTMLInputElement).value })}
              prefix={<LinkIcon className="size-4 text-gray-400" />}
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="Twitter"
              value={draft.twitter}
              onChange={(e) => setDraft({ ...draft, twitter: (e.target as HTMLInputElement).value })}
              prefix={<LinkIcon className="size-4 text-gray-400" />}
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="GitHub"
              value={draft.github}
              onChange={(e) => setDraft({ ...draft, github: (e.target as HTMLInputElement).value })}
              prefix={<LinkIcon className="size-4 text-gray-400" />}
              classNames={{ wrapper: "mt-0" }}
            />
            <Input
              label="LinkedIn"
              value={draft.linkedin}
              onChange={(e) => setDraft({ ...draft, linkedin: (e.target as HTMLInputElement).value })}
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

          {/* Expertise */}
          <section>
            <h2 className="mb-2 text-sm font-semibold text-gray-800 dark:text-dark-50">
              Expertise
            </h2>
            <div className="flex flex-wrap gap-2">
              {profile.expertiseAreas.map((area) => (
                <Badge key={area} color="primary" variant="soft" className="text-xs">
                  {area}
                </Badge>
              ))}
            </div>
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
              <SocialBadge label="LinkedIn" handle={profile.linkedin} />
              <SocialBadge label="Website" handle={profile.website} />
            </div>
          </section>

          {!profile.bio && (
            <EmptyState
              icon={PencilSquareIcon}
              title="No bio yet"
              description="Tell students a bit about yourself and your teaching style."
              actionLabel="Add a bio"
              onAction={startEdit}
              compact
            />
          )}
        </Card>
      )}

      {/* Payout method settings */}
      <Card className="space-y-5 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BanknotesIcon className="size-5 text-primary-500" />
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              Payout method
            </h2>
          </div>
          <Badge color="success" variant="soft" className="gap-1 text-[10px]">
            <CheckBadgeIcon className="size-3" />
            Verified
          </Badge>
        </div>

        {/* Method picker */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(Object.keys(payoutMethodMeta) as PayoutMethod[]).map((m) => {
            const meta = payoutMethodMeta[m];
            const Icon = meta.icon;
            const active = payoutMethod === m;
            return (
              <button
                key={m}
                onClick={() => setPayoutMethod(m)}
                className={clsx(
                  "flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors",
                  active
                    ? "border-primary-500 bg-primary-500/5 dark:bg-primary-500/10"
                    : "border-gray-200 hover:border-gray-300 dark:border-dark-600 dark:hover:border-dark-500",
                )}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={clsx(
                      "flex size-7 items-center justify-center rounded-md",
                      active
                        ? "bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400"
                        : "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-300",
                    )}
                  >
                    <Icon className="size-4 stroke-2" />
                  </div>
                  <span className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                    {meta.label}
                  </span>
                  {active && (
                    <CheckCircleMini className="ml-auto size-4 text-primary-600 dark:text-primary-400" />
                  )}
                </div>
                <p className="text-[11px] text-gray-500 dark:text-dark-300">
                  {meta.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* Method-specific fields */}
        <div className="rounded-lg border border-gray-200 p-4 dark:border-dark-600">
          {payoutMethod === "paypal" && (
            <Input
              label="PayPal email"
              type="email"
              value={paypalEmail}
              onChange={(e) => setPaypalEmail((e.target as HTMLInputElement).value)}
              prefix={<EnvelopeIcon className="size-4 text-gray-400" />}
              classNames={{ wrapper: "mt-0" }}
            />
          )}
          {payoutMethod === "stripe" && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-md bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400">
                  <CreditCardIcon className="size-5 stroke-2" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                    {stripeConnected ? "Stripe account connected" : "Connect your Stripe account"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-300">
                    {stripeConnected
                      ? "Payouts will be sent via Stripe Connect."
                      : "Click connect to set up Stripe in a new tab."}
                  </p>
                </div>
              </div>
              <Button
                variant={stripeConnected ? "outlined" : "filled"}
                color={stripeConnected ? "neutral" : "primary"}
                className="text-xs"
                onClick={() => setStripeConnected(!stripeConnected)}
              >
                {stripeConnected ? "Disconnect" : "Connect"}
              </Button>
            </div>
          )}
          {payoutMethod === "bank" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Account number"
                value={bankAccount}
                onChange={(e) => setBankAccount((e.target as HTMLInputElement).value)}
                prefix={<CreditCardIcon className="size-4 text-gray-400" />}
                classNames={{ wrapper: "mt-0" }}
              />
              <Input
                label="Routing number"
                value={bankRouting}
                onChange={(e) => setBankRouting((e.target as HTMLInputElement).value)}
                prefix={<BuildingLibraryIcon className="size-4 text-gray-400" />}
                classNames={{ wrapper: "mt-0" }}
              />
            </div>
          )}
        </div>

        {/* Auto payout settings */}
        <div className="space-y-3 rounded-lg border border-gray-100 p-4 dark:border-dark-600">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                Auto-payout
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                Automatically send payouts on the 1st of each month.
              </p>
            </div>
            <Switch checked={autoPayout} onChange={(e) => setAutoPayout(e.target.checked)} />
          </div>

          <div className="h-px bg-gray-100 dark:bg-dark-600" />

          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                Minimum payout threshold
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                Hold payouts until earnings reach this amount.
              </p>
            </div>
            <div className="w-28 shrink-0">
              <Input
                type="number"
                min={0}
                value={minPayout}
                onChange={(e) => setMinPayout((e.target as HTMLInputElement).value)}
                prefix={<CurrencyDollarIcon className="size-4 text-gray-400" />}
                classNames={{ wrapper: "mt-0" }}
              />
            </div>
          </div>
        </div>

        {/* Save bar */}
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4 dark:border-dark-600">
          <Button variant="flat" color="neutral" className="text-sm">
            Cancel
          </Button>
          <Button color="primary" className="gap-1.5 text-sm">
            <CheckIcon className="size-4 stroke-2" />
            Save payout settings
          </Button>
        </div>
      </Card>

      {/* Recent payouts */}
      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Recent payouts
          </h2>
          <Button variant="flat" color="primary" className="text-xs">
            View statements
          </Button>
        </div>
        {MOCK_PAYOUTS.length === 0 ? (
          <EmptyState
            icon={BanknotesIcon}
            title="No payouts yet"
            description="Your first payout will appear here once it's approved."
            compact
          />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            {MOCK_PAYOUTS.map((p) => (
              <div key={p.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success-500/10 text-success-600 dark:bg-success-500/15 dark:text-success-400">
                  <BanknotesIcon className="size-5 stroke-2" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                    Payout · {formatDate(p.periodStart)} → {formatDate(p.periodEnd)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-dark-300">
                    {p.paymentMethod ?? "—"} · paid {p.paidAt ? formatDate(p.paidAt) : "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-success-600 dark:text-success-400">
                    {formatCents(p.netCents)}
                  </p>
                  <Badge color="success" variant="soft" className="mt-0.5 text-[10px]">
                    {p.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------

/** Small check icon used in the payout method picker. */
function CheckCircleMini({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function StatTile({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof AcademicCapIcon;
  value: ReactNode;
  label: string;
  color: "primary" | "success" | "info" | "warning";
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
            color === "warning" && "bg-warning-500/10 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400",
          )}
        >
          <Icon className="size-4 stroke-2" />
        </div>
        <span className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-dark-300">
          {label}
        </span>
      </div>
      <p className="mt-1.5 text-2xl font-semibold text-gray-800 dark:text-dark-50">
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
