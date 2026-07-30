// Platform Admin — User detail page.
//
// Mounted at `/admin/users/:id`. Shows:
//   - User info card (name, email, verified, auth methods, created, last login)
//   - Edit form (displayName, email)
//   - Memberships table (tenant name, role, link to tenant)
//   - Status toggle
//   - Danger zone: Delete account (with preflight check)

// Import Dependencies
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import {
  ArrowLeftIcon,
  CheckIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  TrashIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Card, Badge, Input } from "@/components/ui";
import {
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useAdminUser,
  useUpdateUserStatus,
  usePreflightDeleteUser,
  useDeleteUser,
} from "@/hooks/useAdmin";
import { adminApi, type AdminApiError } from "@/services/admin-api";
import { formatDate, formatDateTime, formatRelative } from "./utils";

// ----------------------------------------------------------------------

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, refetch } = useAdminUser(id);
  const statusMut = useUpdateUserStatus();
  const preflight = usePreflightDeleteUser(id);
  const deleteMut = useDeleteUser();

  // `useUpdateUser` doesn't exist in useAdmin.ts — we call `adminApi.updateUser`
  // directly with local loading/error state.
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<AdminApiError | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [confirmTenantDeletions, setConfirmTenantDeletions] = useState<
    string[]
  >([]);
  const [replacementOwners, setReplacementOwners] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (data?.user) {
      setDisplayName(data.user.displayName);
      setEmail(data.user.email);
    }
  }, [data?.user]);

  const user = data?.user;
  const memberships = data?.memberships ?? [];

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <LoadingState message="Loading user…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Card className="p-4">
          <ErrorState error={error} onRetry={refetch} />
        </Card>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-6">
        <Card className="p-4">
          <ErrorState error="User not found." title="User not found" />
        </Card>
      </div>
    );
  }

  const onSaveProfile = async () => {
    if (!user) return;
    setProfileSaving(true);
    setProfileError(null);
    setProfileSaved(false);
    try {
      await adminApi.updateUser(user.id, { displayName, email });
      setProfileSaved(true);
      void refetch();
    } catch (err) {
      setProfileError(err as AdminApiError);
    } finally {
      setProfileSaving(false);
    }
  };

  const onStatusToggle = async () => {
    await statusMut.mutate({ id: user.id, isActive: !user.isActive });
    void refetch();
  };

  const onConfirmDelete = async () => {
    await deleteMut.mutate({
      id: user.id,
      replacementOwners,
      confirmTenantDeletions,
    });
    if (deleteMut.data !== null) {
      // Navigate back to the users list on success.
      window.location.href = "/admin/users";
    }
  };

  const preflightData = preflight.data;
  const canDelete = preflightData?.canDelete ?? false;

  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-primary-600 dark:text-dark-300 dark:hover:text-primary-400"
      >
        <ArrowLeftIcon className="size-4 stroke-2" />
        Back to users
      </Link>

      {/* User header */}
      <Card className="mt-3 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-info-500/10 text-info-600 dark:bg-info-500/15 dark:text-info-400">
              <span className="text-lg font-semibold">
                {user.displayName.slice(0, 1).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                  {user.displayName}
                </h2>
                {user.isActive ? (
                  <Badge color="success" variant="soft">
                    Active
                  </Badge>
                ) : (
                  <Badge color="error" variant="soft">
                    Inactive
                  </Badge>
                )}
                {user.emailVerified ? (
                  <Badge color="info" variant="soft">
                    Verified
                  </Badge>
                ) : (
                  <Badge color="warning" variant="soft">
                    Unverified
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
                {user.email}
              </p>
              <p className="mt-0.5 text-xs text-gray-400 dark:text-dark-400">
                Created {formatDateTime(user.createdAt)} · ID:{" "}
                <span className="font-mono">{user.id}</span>
              </p>
            </div>
          </div>

          <Button
            variant={user.isActive ? "outlined" : "soft"}
            color={user.isActive ? "error" : "success"}
            onClick={onStatusToggle}
            disabled={statusMut.loading}
            className="gap-1.5 text-sm"
          >
            {user.isActive ? (
              <>
                <XMarkIcon className="size-4" />
                Deactivate
              </>
            ) : (
              <>
                <CheckIcon className="size-4" />
                Activate
              </>
            )}
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 dark:border-dark-600 sm:grid-cols-4">
          <StatTile label="Auth methods" value={user.authMethods.join(", ") || "—"} />
          <StatTile label="Tenants" value={String(user.tenantCount ?? memberships.length)} />
          <StatTile label="Created" value={formatDate(user.createdAt)} />
          <StatTile label="Last login" value={formatRelative(user.lastLoginAt)} />
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Edit form */}
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Edit Profile
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Update the user's display name or email.
          </p>

          <div className="mt-4 space-y-3">
            <Input
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="text-sm"
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-sm"
            />
            <Button
              color="primary"
              variant="filled"
              onClick={onSaveProfile}
              disabled={profileSaving}
              className="gap-1.5 text-sm"
            >
              <CheckIcon className="size-4" />
              {profileSaving ? "Saving…" : "Save changes"}
            </Button>
            {profileError && (
              <p className="text-xs text-error-600 dark:text-error-400">
                {profileError.message}
              </p>
            )}
            {profileSaved && (
              <p className="text-xs text-success-600 dark:text-success-400">
                Profile updated.
              </p>
            )}
          </div>
        </Card>

        {/* Memberships */}
        <Card className="p-5" skin="bordered">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Memberships
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Tenants this user belongs to.
          </p>

          {memberships.length === 0 ? (
            <p className="mt-4 py-6 text-center text-sm text-gray-400 dark:text-dark-400">
              No memberships.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100 dark:divide-dark-600">
              {memberships.map((m) => (
                <li
                  key={m.tenantId}
                  className="flex items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <BuildingLibraryIcon className="size-4 shrink-0 text-gray-400 dark:text-dark-400" />
                    <div className="min-w-0">
                      <Link
                        to={`/admin/tenants/${m.tenantId}`}
                        className="block truncate text-sm font-medium text-gray-800 hover:text-primary-600 dark:text-dark-50 dark:hover:text-primary-400"
                      >
                        {m.tenantName}
                      </Link>
                      <p className="text-xs text-gray-500 dark:text-dark-300">
                        {m.tenantSlug}
                        {m.planName ? ` · ${m.planName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {m.isRoot && (
                      <Badge color="warning" variant="soft">
                        Root
                      </Badge>
                    )}
                    <RoleBadge role={m.role} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Danger zone */}
      <Card className="mt-4 overflow-hidden border-error-200 dark:border-error-500/40" skin="bordered">
        <div className="border-b border-error-200 bg-error-50 px-5 py-3 dark:border-error-500/40 dark:bg-error-500/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-error-700 dark:text-error-300">
            <ExclamationTriangleIcon className="size-4" />
            Danger zone
          </div>
        </div>

        <div className="p-5">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
            Delete account
          </h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
            Permanently delete this user. A preflight check runs first to
            detect tenant ownerships that need to be reassigned.
          </p>

          <Button
            variant="outlined"
            color="error"
            onClick={() => setShowDelete((s) => !s)}
            className="mt-3 gap-1.5 text-sm"
          >
            <TrashIcon className="size-4" />
            {showDelete ? "Hide preflight" : "Run preflight & delete"}
          </Button>

          {showDelete && (
            <div className="mt-4 rounded-md border border-error-200 bg-error-50/60 p-3 dark:border-error-500/40 dark:bg-error-500/5">
              {preflight.loading ? (
                <LoadingState inline message="Running preflight…" />
              ) : preflight.error ? (
                <ErrorState
                  error={preflight.error}
                  onRetry={preflight.refetch}
                />
              ) : preflightData ? (
                <div>
                  {preflightData.reason && (
                    <p className="text-sm text-error-700 dark:text-error-300">
                      {preflightData.reason}
                    </p>
                  )}

                  {preflightData.ownerships &&
                    preflightData.ownerships.length > 0 && (
                      <div className="mt-3 space-y-3">
                        <p className="text-xs font-medium text-error-700 dark:text-error-300">
                          This user owns {preflightData.ownerships.length}{" "}
                          tenant
                          {preflightData.ownerships.length === 1 ? "" : "s"}.
                          Reassign ownership before deleting:
                        </p>
                        {preflightData.ownerships.map((o) => (
                          <div
                            key={o.tenantId}
                            className="rounded-md bg-white p-3 dark:bg-dark-700"
                          >
                            <div className="flex items-center gap-2">
                              <BuildingLibraryIcon className="size-4 text-gray-400 dark:text-dark-400" />
                              <span className="text-sm font-medium text-gray-800 dark:text-dark-50">
                                {o.tenantName}
                              </span>
                              {o.isRoot && (
                                <Badge color="warning" variant="soft">
                                  Root
                                </Badge>
                              )}
                            </div>
                            {o.otherMembers.length === 0 ? (
                              <label className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-dark-200">
                                <input
                                  type="checkbox"
                                  checked={confirmTenantDeletions.includes(
                                    o.tenantId,
                                  )}
                                  onChange={(e) => {
                                    setConfirmTenantDeletions((cur) =>
                                      e.target.checked
                                        ? [...cur, o.tenantId]
                                        : cur.filter((t) => t !== o.tenantId),
                                    );
                                  }}
                                  className="size-4 rounded border-gray-300 text-error-600 focus:ring-error-500 dark:border-dark-450 dark:bg-dark-700"
                                />
                                Confirm deletion of this tenant (no other
                                members)
                              </label>
                            ) : (
                              <label className="mt-2 block text-xs text-gray-600 dark:text-dark-200">
                                New owner:
                                <select
                                  value={replacementOwners[o.tenantId] ?? ""}
                                  onChange={(e) => {
                                    setReplacementOwners((cur) => ({
                                      ...cur,
                                      [o.tenantId]: e.target.value,
                                    }));
                                  }}
                                  className="mt-1 block w-full rounded-md border-gray-300 px-2 py-1 text-xs dark:border-dark-450 dark:bg-dark-700 dark:text-dark-50"
                                >
                                  <option value="">— Select —</option>
                                  {o.otherMembers.map((m) => (
                                    <option key={m.userId} value={m.userId}>
                                      {m.displayName} ({m.email})
                                    </option>
                                  ))}
                                </select>
                              </label>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                  <div className="mt-4 flex items-center gap-2">
                    <Button
                      variant="flat"
                      color="neutral"
                      onClick={() => setShowDelete(false)}
                      className="text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      color="error"
                      variant="filled"
                      onClick={onConfirmDelete}
                      disabled={deleteMut.loading || !canDelete}
                      className="gap-1.5 text-xs"
                    >
                      <TrashIcon className="size-3.5" />
                      {deleteMut.loading
                        ? "Deleting…"
                        : "Permanently delete user"}
                    </Button>
                  </div>
                  {deleteMut.error && (
                    <p className="mt-2 text-xs text-error-600 dark:text-error-400">
                      {deleteMut.error.message}
                    </p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// ----------------------------------------------------------------------

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-400 dark:text-dark-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-gray-800 dark:text-dark-50">
        {value}
      </p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const color =
    role === "owner"
      ? "warning"
      : role === "admin"
        ? "info"
        : role === "instructor"
          ? "primary"
          : "neutral";
  return (
    <Badge color={color as "warning" | "info" | "primary" | "neutral"} variant="soft">
      {role}
    </Badge>
  );
}
