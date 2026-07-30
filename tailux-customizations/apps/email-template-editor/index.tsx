// Email Template Editor — `apps/email-template-editor` route.
//
// Layout (3-column on desktop, stacked on mobile):
//   ┌─────────────┬──────────────────────┬─────────────────┐
//   │ Template    │ Editor               │ Placeholders    │
//   │ list        │  • Subject input     │ (click to       │
//   │ (grouped    │  • Body HTML textarea│  insert {{key}})│
//   │  by         │  • Body text input   ├─────────────────┤
//   │  category)  │  • Active toggle     │ Live preview    │
//   │             │  • Action buttons    │ (iframe)        │
//   └─────────────┴──────────────────────┴─────────────────┘
//
// Hooks used:
//   - `useEmailTemplates()` — list all templates (one row per trigger).
//   - `useEmailPlaceholders(trigger)` — fetch the placeholder picker
//     options for the selected template's trigger.
//   - `useUpdateEmailTemplate()` — persist subject / body / active.
//   - `useResetEmailTemplate()` — restore default subject/body.
//   - `usePreviewEmailTemplate()` — render the current body with sample
//     data; the returned HTML is fed to <TemplatePreview />.

// Import Dependencies
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Badge,
  Button,
  Card,
  Input,
  ScrollShadow,
  Spinner,
  Switch,
  Textarea,
} from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/lms";
import {
  useEmailPlaceholders,
  useEmailTemplates,
  usePreviewEmailTemplate,
  useResetEmailTemplate,
  useUpdateEmailTemplate,
} from "@/hooks/useProEngagement";
import type {
  EmailPlaceholder,
  EmailTemplate,
  EmailTemplateUpdateInput,
} from "@/types/lms";

import { PlaceholderPicker } from "./PlaceholderPicker";
import { TemplatePreview } from "./TemplatePreview";

// ----------------------------------------------------------------------

/**
 * Static mapping from a template `trigger` (the wire identifier stored on
 * `EmailTemplate.trigger`) to a human-readable category + label. The list
 * endpoint may return templates we don't have catalogue metadata for; in
 * that case we fall back to `category: "Other"` and a title-cased label.
 */
interface TriggerMeta {
  category: TemplateCategory;
  label: string;
}

type TemplateCategory =
  | "Authentication"
  | "Orders"
  | "Enrollments"
  | "Courses"
  | "Certificates"
  | "Subscriptions"
  | "Instructors"
  | "System"
  | "Other";

const TRIGGER_META: Record<string, TriggerMeta> = {
  // Authentication
  welcome_email: { category: "Authentication", label: "Welcome email" },
  email_verification: { category: "Authentication", label: "Email verification" },
  password_reset: { category: "Authentication", label: "Password reset" },
  // Orders
  order_paid: { category: "Orders", label: "Order paid" },
  order_refunded: { category: "Orders", label: "Order refunded" },
  order_failed: { category: "Orders", label: "Order failed" },
  invoice_issued: { category: "Orders", label: "Invoice issued" },
  // Enrollments
  enrollment_created: { category: "Enrollments", label: "Enrollment created" },
  enrollment_cancelled: { category: "Enrollments", label: "Enrollment cancelled" },
  course_invitation: { category: "Enrollments", label: "Course invitation" },
  // Courses
  course_published: { category: "Courses", label: "Course published" },
  lesson_completed: { category: "Courses", label: "Lesson completed" },
  course_completed: { category: "Courses", label: "Course completed" },
  // Certificates
  certificate_earned: { category: "Certificates", label: "Certificate earned" },
  certificate_expiring: { category: "Certificates", label: "Certificate expiring" },
  // Subscriptions
  subscription_renewed: { category: "Subscriptions", label: "Subscription renewed" },
  subscription_cancelled: { category: "Subscriptions", label: "Subscription cancelled" },
  subscription_trial_ending: {
    category: "Subscriptions",
    label: "Subscription trial ending",
  },
  // Instructors
  instructor_payout_processed: {
    category: "Instructors",
    label: "Payout processed",
  },
  instructor_new_review: { category: "Instructors", label: "New review" },
  instructor_new_qa: { category: "Instructors", label: "New Q&A question" },
  instructor_new_enrollment: {
    category: "Instructors",
    label: "New enrollment",
  },
  // System
  announcement_posted: { category: "System", label: "Announcement posted" },
  account_suspended: { category: "System", label: "Account suspended" },
};

const CATEGORY_ORDER: TemplateCategory[] = [
  "Authentication",
  "Orders",
  "Enrollments",
  "Courses",
  "Certificates",
  "Subscriptions",
  "Instructors",
  "System",
  "Other",
];

function metaForTrigger(trigger: string): TriggerMeta {
  return (
    TRIGGER_META[trigger] ?? {
      category: "Other",
      label: trigger
        .replace(/_/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase()),
    }
  );
}

// ----------------------------------------------------------------------

interface TemplateGroup {
  category: TemplateCategory;
  items: EmailTemplate[];
}

function groupTemplates(templates: EmailTemplate[]): TemplateGroup[] {
  const groups = new Map<TemplateCategory, EmailTemplate[]>();
  for (const t of templates) {
    const cat = metaForTrigger(t.trigger).category;
    const list = groups.get(cat);
    if (list) list.push(t);
    else groups.set(cat, [t]);
  }
  const result: TemplateGroup[] = [];
  for (const cat of CATEGORY_ORDER) {
    const list = groups.get(cat);
    if (list && list.length > 0) {
      list.sort((a, b) =>
        metaForTrigger(a.trigger).label.localeCompare(
          metaForTrigger(b.trigger).label,
        ),
      );
      result.push({ category: cat, items: list });
    }
  }
  return result;
}

// ----------------------------------------------------------------------

interface EditorForm {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  isActive: boolean;
}

const EMPTY_FORM: EditorForm = {
  subject: "",
  bodyHtml: "",
  bodyText: "",
  isActive: true,
};

// ----------------------------------------------------------------------

export default function EmailTemplateEditorPage() {
  // ───────── Data ─────────
  const templatesQuery = useEmailTemplates();
  const updateTemplate = useUpdateEmailTemplate();
  const resetTemplate = useResetEmailTemplate();
  const previewTemplate = usePreviewEmailTemplate();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<EditorForm>(EMPTY_FORM);
  const [dirty, setDirty] = useState(false);
  const [testEmailTo, setTestEmailTo] = useState("");
  const [testNotice, setTestNotice] = useState<string | null>(null);

  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  // ───────── Derived ─────────
  const templates = useMemo(
    () => templatesQuery.data ?? [],
    [templatesQuery.data],
  );

  const groups = useMemo(() => {
    const filtered = search.trim()
      ? templates.filter((t) => {
          const meta = metaForTrigger(t.trigger);
          const haystack = `${meta.label} ${t.trigger} ${t.subject}`.toLowerCase();
          return haystack.includes(search.trim().toLowerCase());
        })
      : templates;
    return groupTemplates(filtered);
  }, [templates, search]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? null,
    [templates, selectedId],
  );

  const placeholdersQuery = useEmailPlaceholders(
    selectedTemplate?.trigger,
  );
  const placeholders: EmailPlaceholder[] = useMemo(
    () => placeholdersQuery.data ?? [],
    [placeholdersQuery.data],
  );

  // ───────── Sync selected → form (only when id changes, not on every render) ─────────
  useEffect(() => {
    if (selectedTemplate) {
      setForm({
        subject: selectedTemplate.subject,
        bodyHtml: selectedTemplate.bodyHtml,
        bodyText: selectedTemplate.bodyText ?? "",
        isActive: selectedTemplate.isActive,
      });
      setDirty(false);
      setTestNotice(null);
    }
  }, [selectedTemplate]);

  // Auto-select the first template once the list loads.
  useEffect(() => {
    if (!selectedId && templates.length > 0) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  // ───────── Handlers ─────────
  const patch = useCallback(
    <K extends keyof EditorForm>(key: K, value: EditorForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setDirty(true);
    },
    [],
  );

  const handleInsertPlaceholder = useCallback((key: string) => {
    const token = `{{${key}}}`;
    setForm((prev) => {
      const ta = bodyRef.current;
      if (!ta) {
        return { ...prev, bodyHtml: prev.bodyHtml + token };
      }
      const start = ta.selectionStart ?? prev.bodyHtml.length;
      const end = ta.selectionEnd ?? prev.bodyHtml.length;
      const next =
        prev.bodyHtml.slice(0, start) + token + prev.bodyHtml.slice(end);
      // Restore the cursor right after the inserted token on the next tick.
      queueMicrotask(() => {
        ta.focus();
        const pos = start + token.length;
        ta.setSelectionRange(pos, pos);
      });
      return { ...prev, bodyHtml: next };
    });
    setDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedTemplate) return;
    const input: EmailTemplateUpdateInput = {
      subject: form.subject,
      bodyHtml: form.bodyHtml,
      bodyText: form.bodyText || undefined,
      isActive: form.isActive,
    };
    const result = await updateTemplate.mutate({
      id: selectedTemplate.id,
      input,
    });
    if (result) {
      setDirty(false);
      void templatesQuery.refetch();
    }
  }, [selectedTemplate, form, updateTemplate, templatesQuery]);

  const handleReset = useCallback(async () => {
    if (!selectedTemplate) return;
    const result = await resetTemplate.mutate(selectedTemplate.id);
    if (result) {
      setForm({
        subject: result.subject,
        bodyHtml: result.bodyHtml,
        bodyText: result.bodyText ?? "",
        isActive: result.isActive,
      });
      setDirty(false);
      void templatesQuery.refetch();
    }
  }, [selectedTemplate, resetTemplate, templatesQuery]);

  const handlePreview = useCallback(async () => {
    if (!selectedTemplate) return;
    // Build a sample-data map from the placeholder examples so the preview
    // shows realistic content. The backend will substitute the rest.
    const sampleData: Record<string, string> = {};
    for (const p of placeholders) {
      if (p.example) sampleData[p.key] = p.example;
    }
    // Always include the current (possibly unsaved) body so the preview
    // reflects live edits.
    sampleData.__bodyHtml = form.bodyHtml;
    sampleData.__subject = form.subject;
    await previewTemplate.mutate({
      id: selectedTemplate.id,
      data: sampleData,
    });
  }, [selectedTemplate, placeholders, form, previewTemplate]);

  // Refresh preview automatically when the selected template changes.
  useEffect(() => {
    if (selectedTemplate) {
      void handlePreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.id]);

  const handleSendTest = useCallback(() => {
    setTestNotice(
      `Test email queued to ${testEmailTo || "your account email"} (stub — backend not wired).`,
    );
  }, [testEmailTo]);

  // ───────── Render ─────────
  return (
    <Page title="Email Template Editor">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Header */}
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <EnvelopeIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Email Template Editor
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Customize subject, body, and placeholders for every
                transactional email.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="primary" variant="soft" className="gap-1 text-[10px]">
              <DocumentTextIcon className="size-3.5" />
              {templates.length} templates
            </Badge>
            <Button
              variant="flat"
              color="neutral"
              isIcon
              className="size-9"
              onClick={() => void templatesQuery.refetch()}
              aria-label="Refresh templates"
            >
              <ArrowPathIcon className="size-5 stroke-2" />
            </Button>
          </div>
        </header>

        {/* Body */}
        {templatesQuery.loading ? (
          <LoadingState message="Loading email templates…" />
        ) : templatesQuery.error ? (
          <ErrorState
            error={templatesQuery.error}
            onRetry={templatesQuery.refetch}
          />
        ) : templates.length === 0 ? (
          <EmptyState
            icon={DocumentTextIcon}
            title="No email templates yet"
            description="Templates will appear here once the backend seeds them."
          />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[280px_1fr_340px]">
            {/* Left: template list */}
            <aside className="hidden min-h-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750 lg:flex">
              <div className="shrink-0 border-b border-gray-200 p-3 dark:border-dark-600">
                <Input
                  placeholder="Search templates…"
                  value={search}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSearch(e.target.value)
                  }
                  prefix={<MagnifyingGlassIcon className="size-4" />}
                />
              </div>
              <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
                <nav
                  className="space-y-3 p-2"
                  aria-label="Email templates"
                >
                  {groups.map((g) => (
                    <div key={g.category}>
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-400">
                        {g.category}
                      </p>
                      <ul className="space-y-0.5">
                        {g.items.map((t) => {
                          const meta = metaForTrigger(t.trigger);
                          const active = t.id === selectedId;
                          return (
                            <li key={t.id}>
                              <Button
                                variant="flat"
                                color={active ? "primary" : "neutral"}
                                onClick={() => setSelectedId(t.id)}
                                className={[
                                  "w-full items-start justify-start gap-2 px-2 py-2 text-left",
                                  active
                                    ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                                    : "text-gray-700 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-600",
                                ].join(" ")}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="truncate text-sm font-medium">
                                      {meta.label}
                                    </span>
                                    {!t.isActive && (
                                      <span
                                        title="Disabled"
                                        className="size-1.5 shrink-0 rounded-full bg-gray-300 dark:bg-dark-500"
                                      />
                                    )}
                                  </div>
                                  <p className="truncate text-[11px] text-gray-500 dark:text-dark-300">
                                    {t.subject || "No subject"}
                                  </p>
                                </div>
                                {t.isDefault && (
                                  <Badge
                                    color="neutral"
                                    variant="outlined"
                                    className="shrink-0 px-1.5 py-0 text-[9px]"
                                  >
                                    Default
                                  </Badge>
                                )}
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <p className="px-2 py-4 text-center text-xs text-gray-500 dark:text-dark-300">
                      No templates match “{search}”.
                    </p>
                  )}
                </nav>
              </ScrollShadow>
            </aside>

            {/* Center: editor */}
            <main className="flex min-h-0 flex-col">
              {/* Mobile template selector */}
              <div className="shrink-0 border-b border-gray-200 p-3 dark:border-dark-600 lg:hidden">
                <Input
                  placeholder="Search templates…"
                  value={search}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSearch(e.target.value)
                  }
                  prefix={<MagnifyingGlassIcon className="size-4" />}
                />
                <div className="mt-2 flex flex-wrap gap-1">
                  {templates.slice(0, 8).map((t) => {
                    const meta = metaForTrigger(t.trigger);
                    const active = t.id === selectedId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedId(t.id)}
                        className={[
                          "rounded-full px-2.5 py-1 text-[11px] font-medium",
                          active
                            ? "bg-primary-500 text-white"
                            : "bg-gray-100 text-gray-700 dark:bg-dark-600 dark:text-dark-100",
                        ].join(" ")}
                      >
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {!selectedTemplate ? (
                <EmptyState
                  icon={DocumentTextIcon}
                  title="Select a template"
                  description="Pick a template from the left to edit its subject, body, and placeholders."
                />
              ) : (
                <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
                  <div className="mx-auto max-w-3xl px-6 py-6">
                    <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-4 dark:border-dark-600">
                      <div>
                        <h2 className="text-base font-semibold text-gray-800 dark:text-dark-50">
                          {metaForTrigger(selectedTemplate.trigger).label}
                        </h2>
                        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                          Trigger{" "}
                          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700 dark:bg-dark-700 dark:text-dark-200">
                            {selectedTemplate.trigger}
                          </code>
                          {selectedTemplate.language && (
                            <>
                              {" · "}
                              Language{" "}
                              <span className="font-medium">
                                {selectedTemplate.language}
                              </span>
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          color={selectedTemplate.isActive ? "success" : "neutral"}
                          variant="soft"
                          className="text-[10px]"
                        >
                          {selectedTemplate.isActive ? "Active" : "Disabled"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Subject */}
                      <Input
                        label="Subject"
                        value={form.subject}
                        onChange={(e: ChangeEvent<HTMLInputElement>) =>
                          patch("subject", e.target.value)
                        }
                        placeholder="Email subject line…"
                      />

                      {/* Body HTML */}
                      <Textarea
                        label="Body (HTML)"
                        rows={14}
                        value={form.bodyHtml}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                          patch("bodyHtml", e.target.value)
                        }
                        placeholder="<h1>Hello {{student.first_name}}</h1>…"
                        classNames={{ input: "font-mono text-xs" }}
                        // Forward a ref so the placeholder-insert helper
                        // can read the current selection.
                        ref={bodyRef}
                      />

                      {/* Body text */}
                      <Textarea
                        label="Body (plain text, optional)"
                        rows={4}
                        value={form.bodyText}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                          patch("bodyText", e.target.value)
                        }
                        placeholder="Auto-generated from HTML if left empty."
                        classNames={{ input: "font-mono text-xs" }}
                        description="Leave empty to auto-generate from the HTML body."
                      />

                      {/* Active toggle */}
                      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3 dark:border-dark-600">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                            Active
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                            Disabled templates are skipped when the
                            transactional email is sent.
                          </p>
                        </div>
                        <Switch
                          checked={form.isActive}
                          onChange={(e: ChangeEvent<HTMLInputElement>) =>
                            patch("isActive", e.target.checked)
                          }
                          aria-label="Active"
                        />
                      </div>

                      {/* Mutation errors */}
                      {(updateTemplate.error || resetTemplate.error) && (
                        <div className="flex items-start gap-2 rounded-lg border border-error-300 bg-error-50 p-3 text-xs text-error-700 dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300">
                          <ExclamationTriangleIcon className="size-4 shrink-0 stroke-2" />
                          <span>
                            {updateTemplate.error?.message ??
                              resetTemplate.error?.message ??
                              "Couldn’t save the template."}
                          </span>
                        </div>
                      )}

                      {/* Send test email (stub) */}
                      <Card skin="bordered" className="p-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 dark:text-dark-50">
                              Send test email
                            </p>
                            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-dark-300">
                              Sends the current (unsaved) template body to
                              the address below.
                            </p>
                          </div>
                          <Input
                            type="email"
                            placeholder="you@example.com"
                            value={testEmailTo}
                            onChange={(e: ChangeEvent<HTMLInputElement>) =>
                              setTestEmailTo(e.target.value)
                            }
                            className="min-w-[14rem]"
                          />
                          <Button
                            color="neutral"
                            variant="soft"
                            className="gap-1.5"
                            onClick={handleSendTest}
                          >
                            <PaperAirplaneIcon className="size-4 stroke-2" />
                            Send test
                          </Button>
                        </div>
                        {testNotice && (
                          <p className="mt-2 text-[11px] text-gray-500 dark:text-dark-300">
                            {testNotice}
                          </p>
                        )}
                      </Card>
                    </div>

                    {/* Action footer */}
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-dark-600">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-300">
                        {dirty ? (
                          <>
                            <span className="size-1.5 rounded-full bg-warning-500" />
                            Unsaved changes
                          </>
                        ) : (
                          <>
                            <ShieldCheckIcon className="size-4 stroke-2 text-success-500" />
                            All changes saved
                          </>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="flat"
                          color="neutral"
                          onClick={() => void handlePreview()}
                          disabled={previewTemplate.loading}
                          className="gap-1.5"
                        >
                          {previewTemplate.loading ? (
                            <Spinner className="size-4" />
                          ) : (
                            <ArrowPathIcon className="size-4 stroke-2" />
                          )}
                          Refresh preview
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => void handleReset()}
                          disabled={resetTemplate.loading}
                          className="gap-1.5"
                        >
                          {resetTemplate.loading ? (
                            <Spinner className="size-4" />
                          ) : (
                            <ArrowLeftIcon className="size-4 stroke-2" />
                          )}
                          Reset to Default
                        </Button>
                        <Button
                          color="primary"
                          onClick={() => void handleSave()}
                          disabled={!dirty || updateTemplate.loading}
                          className="min-w-[8rem] gap-1.5"
                        >
                          {updateTemplate.loading ? (
                            <Spinner className="size-4" />
                          ) : (
                            <CheckIcon className="size-4 stroke-2" />
                          )}
                          Save template
                        </Button>
                      </div>
                    </div>
                  </div>
                </ScrollShadow>
              )}
            </main>

            {/* Right: placeholders + preview */}
            <aside className="hidden min-h-0 flex-col border-l border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750 lg:flex">
              <div className="flex min-h-0 flex-1 flex-col border-b border-gray-200 dark:border-dark-600">
                <PlaceholderPicker
                  placeholders={placeholders}
                  loading={placeholdersQuery.loading}
                  error={placeholdersQuery.error}
                  onInsert={handleInsertPlaceholder}
                />
              </div>
              <div className="flex min-h-0 flex-1 flex-col">
                {selectedTemplate ? (
                  <TemplatePreview
                    html={previewTemplate.data?.html ?? form.bodyHtml}
                    loading={previewTemplate.loading}
                    error={previewTemplate.error}
                    onRefresh={() => void handlePreview()}
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-gray-500 dark:text-dark-300">
                    <EyeSlashIcon className="size-6 stroke-2" />
                    <span>Select a template to preview.</span>
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </Page>
  );
}
