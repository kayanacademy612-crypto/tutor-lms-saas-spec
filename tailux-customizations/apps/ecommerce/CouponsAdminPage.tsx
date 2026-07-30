// CouponsAdminPage — coupon management screen (admin / instructor).
//
// Layout:
//   - Header with title + "New coupon" button (toggles the create form).
//   - Usage-stats row (4 small stat cards): total coupons, active, redemptions
//     this period, total discounted.
//   - Coupon table: code, type, value, uses (count / max), status, expiry,
//     actions (copy code, delete).
//   - Create-coupon form (Card on top of the table when expanded).
//
// Backend: real `useCoupons()` (list), `useCreateCoupon()` (create),
// `useDeleteCoupon()` (delete) hooks from `@/hooks/useEcommerce` (P3-A5).

// Import Dependencies
import { useMemo, useState } from "react";
import {
  TicketIcon,
  PlusIcon,
  TrashIcon,
  ClipboardDocumentIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  GiftIcon,
  CurrencyDollarIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input, Select, Switch } from "@/components/ui";
import {
  StatCard,
  EmptyState,
  LoadingState,
  ErrorState,
  formatPrice,
} from "@/components/lms";
import {
  useCoupons,
  useCreateCoupon,
  useDeleteCoupon,
} from "@/hooks/useEcommerce";
import type { Coupon, CouponCreateInput } from "@/types/lms";

// ----------------------------------------------------------------------

export default function CouponsAdminPage() {
  const { data, loading, error, refetch } = useCoupons();
  const createCoupon = useCreateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const [showCreate, setShowCreate] = useState(false);

  const coupons = data ?? [];

  // Stats derived from the loaded list.
  const stats = useMemo(() => {
    if (!coupons) {
      return { total: 0, active: 0, redemptions: 0, discountedCents: 0 };
    }
    const now = new Date();
    return coupons.reduce(
      (acc, c) => {
        acc.total += 1;
        const expired = c.expiresAt && new Date(c.expiresAt) < now;
        if (c.isActive && !expired) acc.active += 1;
        acc.redemptions += c.redemptionCount;
        // Estimate discount given = redemptionCount × discountValue (cents or
        // percent-of-average-order). We use a flat average of $50/order for
        // percent coupons so the number is at least directionally useful.
        const avgOrderCents = 5000;
        acc.discountedCents +=
          c.discountType === "percent"
            ? Math.round((avgOrderCents * c.discountValue) / 100) *
              c.redemptionCount
            : c.discountValue * c.redemptionCount;
        return acc;
      },
      { total: 0, active: 0, redemptions: 0, discountedCents: 0 },
    );
  }, [coupons]);

  const handleDelete = (coupon: Coupon) => {
    if (
      !window.confirm(
        `Delete coupon "${coupon.code}"? This cannot be undone.`,
      )
    ) {
      return;
    }
    void deleteCoupon.mutate(coupon.id).then((result) => {
      if (result) refetch();
    });
  };

  const handleCreate = async (input: CouponCreateInput) => {
    const result = await createCoupon.mutate(input);
    if (result) {
      setShowCreate(false);
      refetch();
    }
  };

  // ───────────────── Loading ─────────────────
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <CouponsHeader onCreate={() => setShowCreate(true)} />
        <Card className="p-4">
          <LoadingState message="Loading coupons…" />
        </Card>
      </div>
    );
  }

  // ───────────────── Error ─────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <CouponsHeader onCreate={() => setShowCreate(true)} />
        <Card className="p-4">
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      </div>
    );
  }

  // ───────────────── Main view ─────────────────
  return (
    <div className="space-y-6">
      <CouponsHeader
        onCreate={() => setShowCreate((v) => !v)}
        createOpen={showCreate}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={TicketIcon}
          value={stats.total}
          label="Total coupons"
          color="primary"
        />
        <StatCard
          icon={CheckCircleIcon}
          value={stats.active}
          label="Active coupons"
          color="success"
        />
        <StatCard
          icon={SparklesIcon}
          value={stats.redemptions}
          label="Total redemptions"
          color="info"
        />
        <StatCard
          icon={CurrencyDollarIcon}
          value={formatPrice(stats.discountedCents, "usd")}
          label="Discount given"
          color="warning"
        />
      </div>

      {/* Create form */}
      {showCreate && (
        <CreateCouponForm
          onCreate={handleCreate}
          onCancel={() => setShowCreate(false)}
          submitting={createCoupon.loading}
          formError={createCoupon.error?.message}
        />
      )}

      {/* Empty */}
      {coupons.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            icon={TicketIcon}
            title="No coupons yet"
            description="Create your first coupon to offer discounts on your courses."
            actionLabel="New coupon"
            onAction={() => setShowCreate(true)}
          />
        </Card>
      ) : (
        <CouponsTable
          coupons={coupons}
          onDelete={handleDelete}
          deleting={deleteCoupon.loading}
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------

function CouponsHeader({
  onCreate,
  createOpen = false,
}: {
  onCreate: () => void;
  createOpen?: boolean;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
          <TicketIcon className="size-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
            Coupons
          </h1>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Create and manage discount codes for your courses.
          </p>
        </div>
      </div>
      <Button
        color="primary"
        variant="filled"
        className="gap-1.5"
        onClick={onCreate}
      >
        {createOpen ? (
          <>
            <XCircleIcon className="size-4" />
            Close
          </>
        ) : (
          <>
            <PlusIcon className="size-4" />
            New coupon
          </>
        )}
      </Button>
    </header>
  );
}

function CouponsTable({
  coupons,
  onDelete,
  deleting,
}: {
  coupons: Coupon[];
  onDelete: (c: Coupon) => void;
  deleting: boolean;
}) {
  return (
    <Card skin="bordered" className="overflow-hidden">
      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-dark-600 dark:text-dark-300">
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Value</th>
              <th className="px-4 py-3 font-semibold">Uses</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Expiry</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-dark-600">
            {coupons.map((c) => (
              <CouponTableRow
                key={c.id}
                coupon={c}
                onDelete={onDelete}
                deleting={deleting}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-gray-100 dark:divide-dark-600 md:hidden">
        {coupons.map((c) => (
          <CouponCardRow key={c.id} coupon={c} onDelete={onDelete} />
        ))}
      </ul>
    </Card>
  );
}

function CouponTableRow({
  coupon,
  onDelete,
  deleting,
}: {
  coupon: Coupon;
  onDelete: (c: Coupon) => void;
  deleting: boolean;
}) {
  const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
  const exhausted =
    coupon.maxRedemptions != null &&
    coupon.redemptionCount >= coupon.maxRedemptions;
  const status = !coupon.isActive
    ? { label: "Disabled", color: "neutral" as const }
    : expired
      ? { label: "Expired", color: "neutral" as const }
      : exhausted
        ? { label: "Exhausted", color: "warning" as const }
        : { label: "Active", color: "success" as const };

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-dark-700">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-800 dark:bg-dark-600 dark:text-dark-100">
            {coupon.code}
          </code>
          <CopyButton text={coupon.code} />
        </div>
        {coupon.description && (
          <p className="mt-1 line-clamp-1 max-w-xs text-xs text-gray-500 dark:text-dark-300">
            {coupon.description}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-gray-700 dark:text-dark-200">
        {coupon.discountType === "percent" ? "Percentage" : "Fixed amount"}
      </td>
      <td className="px-4 py-3 font-medium text-gray-800 dark:text-dark-100">
        {coupon.discountType === "percent"
          ? `${coupon.discountValue}%`
          : formatPrice(coupon.discountValue, "usd")}
      </td>
      <td className="px-4 py-3 text-gray-700 dark:text-dark-200">
        {coupon.redemptionCount}
        {coupon.maxRedemptions != null && (
          <span className="text-gray-400 dark:text-dark-400">
            {" "}
            / {coupon.maxRedemptions}
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge color={status.color} variant="soft" className="text-[10px]">
          {status.label}
        </Badge>
      </td>
      <td className="px-4 py-3 text-xs text-gray-700 dark:text-dark-200">
        {coupon.expiresAt
          ? new Date(coupon.expiresAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          isIcon
          variant="flat"
          color="error"
          className="size-7"
          onClick={() => onDelete(coupon)}
          disabled={deleting}
          aria-label={`Delete coupon ${coupon.code}`}
        >
          <TrashIcon className="size-4" />
        </Button>
      </td>
    </tr>
  );
}

function CouponCardRow({
  coupon,
  onDelete,
}: {
  coupon: Coupon;
  onDelete: (c: Coupon) => void;
}) {
  const expired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
  const exhausted =
    coupon.maxRedemptions != null &&
    coupon.redemptionCount >= coupon.maxRedemptions;
  const status = !coupon.isActive
    ? { label: "Disabled", color: "neutral" as const }
    : expired
      ? { label: "Expired", color: "neutral" as const }
      : exhausted
        ? { label: "Exhausted", color: "warning" as const }
        : { label: "Active", color: "success" as const };

  return (
    <li className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-800 dark:bg-dark-600 dark:text-dark-100">
              {coupon.code}
            </code>
            <Badge color={status.color} variant="soft" className="text-[10px]">
              {status.label}
            </Badge>
          </div>
          {coupon.description && (
            <p className="mt-1.5 line-clamp-2 text-xs text-gray-500 dark:text-dark-300">
              {coupon.description}
            </p>
          )}
        </div>
        <Button
          isIcon
          variant="flat"
          color="error"
          className="size-7 shrink-0"
          onClick={() => onDelete(coupon)}
          aria-label={`Delete coupon ${coupon.code}`}
        >
          <TrashIcon className="size-4" />
        </Button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="text-gray-400 dark:text-dark-400">Type</p>
          <p className="font-medium text-gray-700 dark:text-dark-200">
            {coupon.discountType === "percent" ? "Percent" : "Fixed"}
          </p>
        </div>
        <div>
          <p className="text-gray-400 dark:text-dark-400">Value</p>
          <p className="font-medium text-gray-700 dark:text-dark-200">
            {coupon.discountType === "percent"
              ? `${coupon.discountValue}%`
              : formatPrice(coupon.discountValue, "usd")}
          </p>
        </div>
        <div>
          <p className="text-gray-400 dark:text-dark-400">Uses</p>
          <p className="font-medium text-gray-700 dark:text-dark-200">
            {coupon.redemptionCount}
            {coupon.maxRedemptions != null && ` / ${coupon.maxRedemptions}`}
          </p>
        </div>
      </div>
    </li>
  );
}

function CreateCouponForm({
  onCreate,
  onCancel,
  submitting,
  formError,
}: {
  onCreate: (input: CouponCreateInput) => Promise<void> | void;
  onCancel: () => void;
  submitting: boolean;
  formError?: string;
}) {
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] =
    useState<CouponCreateInput["discountType"]>("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) {
      setLocalError("Coupon code is required.");
      return;
    }
    if (!/^[A-Z0-9_-]{3,32}$/.test(trimmedCode)) {
      setLocalError(
        "Code must be 3–32 chars, letters/numbers/dash/underscore only.",
      );
      return;
    }
    const valueNum = Number(discountValue);
    if (!Number.isFinite(valueNum) || valueNum <= 0) {
      setLocalError("Discount value must be a positive number.");
      return;
    }
    if (discountType === "percent" && valueNum > 100) {
      setLocalError("Percentage discount cannot exceed 100%.");
      return;
    }

    const input: CouponCreateInput = {
      code: trimmedCode,
      description: description.trim() || undefined,
      discountType,
      discountValue:
        discountType === "fixed"
          ? Math.round(valueNum * 100) // convert dollars → cents
          : Math.round(valueNum),
      maxRedemptions: maxRedemptions
        ? Number(maxRedemptions)
        : undefined,
      expiresAt: expiresAt
        ? new Date(expiresAt).toISOString()
        : undefined,
      appliesToAllCourses: true,
      isActive,
    };

    try {
      await onCreate(input);
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : "Failed to create coupon. Please try again.",
      );
    }
  };

  return (
    <Card skin="bordered" className="p-5">
      <div className="mb-4 flex items-center gap-2">
        <GiftIcon className="size-5 text-primary-500" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
          Create a new coupon
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Coupon code"
            placeholder="SUMMER25"
            value={code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCode(e.target.value)
            }
            description="3–32 chars, uppercase letters / numbers."
          />
          <Input
            label="Description"
            placeholder="Summer sale — 25% off"
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDescription(e.target.value)
            }
          />
          <Select
            label="Discount type"
            value={discountType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setDiscountType(
                e.target.value as CouponCreateInput["discountType"],
              )
            }
            data={[
              { value: "percent", label: "Percentage (%)" },
              { value: "fixed", label: "Fixed amount ($)" },
            ]}
          />
          <Input
            label={
              discountType === "percent"
                ? "Discount value (%)"
                : "Discount value ($)"
            }
            type="number"
            placeholder={discountType === "percent" ? "25" : "10"}
            value={discountValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setDiscountValue(e.target.value)
            }
          />
          <Input
            label="Max redemptions (optional)"
            type="number"
            placeholder="100"
            value={maxRedemptions}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMaxRedemptions(e.target.value)
            }
            description="Leave blank for unlimited."
          />
          <Input
            label="Expiry date (optional)"
            type="date"
            value={expiresAt}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setExpiresAt(e.target.value)
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-md border border-gray-200 px-3 py-2 dark:border-dark-500">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
              Active
            </p>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Inactive coupons can't be redeemed but stay in your list.
            </p>
          </div>
          <Switch
            checked={isActive}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setIsActive(e.target.checked)
            }
          />
        </div>

        {(localError || formError) && (
          <p className="rounded-md bg-error-500/10 px-3 py-2 text-xs text-error-600 dark:text-error-400">
            {localError ?? formError}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button
            variant="flat"
            color="neutral"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            color="primary"
            variant="filled"
            disabled={submitting}
            className="gap-1.5"
          >
            {submitting ? (
              <>
                <ArrowPathIcon className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <PlusIcon className="size-4" />
                Create coupon
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Tiny clipboard-copy button with a transient "copied" check state. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      isIcon
      unstyled
      className="size-6 text-gray-400 hover:text-primary-500"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard API can fail in insecure contexts — ignore.
        }
      }}
      aria-label={`Copy code ${text}`}
    >
      {copied ? (
        <CheckCircleIcon className="size-4 text-success-500" />
      ) : (
        <ClipboardDocumentIcon className="size-4" />
      )}
    </Button>
  );
}
