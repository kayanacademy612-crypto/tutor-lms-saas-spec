// Settings Pages — 14 sections matching Tutor LMS Settings.
//
// Renders a self-contained 2-column layout (sidebar + content) and switches
// between the fourteen settings sections via `useState`. The sidebar uses
// tailux `Button`s (no raw `<button>`). Every section is a sub-component in
// this same file so the whole feature ships as one lazy-loaded route.
//
// Uses ONLY tailux components: Button, Card, Badge, Input, Textarea, Switch,
// Checkbox, Select, Avatar, Range, ScrollShadow.

// Import Dependencies
import {
  useState,
  ComponentType,
  ReactNode,
  ChangeEvent,
} from "react";
import clsx from "clsx";
import {
  Cog6ToothIcon,
  AcademicCapIcon,
  CurrencyDollarIcon,
  SwatchIcon,
  CpuChipIcon,
  ScaleIcon,
  ClipboardDocumentCheckIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  BellIcon,
  LockClosedIcon,
  DocumentDuplicateIcon,
  EyeIcon,
  KeyIcon,
  CheckIcon,
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import {
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  Switch,
  Checkbox,
  Select,
  Avatar,
  Range,
  ScrollShadow,
} from "@/components/ui";

// ----------------------------------------------------------------------

type SectionId =
  | "general"
  | "course"
  | "monetization"
  | "design"
  | "advanced"
  | "legal"
  | "gradebook"
  | "email"
  | "email-templates"
  | "notifications"
  | "authentication"
  | "certificate"
  | "accessibility"
  | "license";

interface NavItem {
  id: SectionId;
  label: string;
  icon: ComponentType<{ className?: string }>;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "general", label: "General", icon: Cog6ToothIcon, description: "Site name, language & timezone" },
  { id: "course", label: "Course", icon: AcademicCapIcon, description: "Defaults & upload limits" },
  { id: "monetization", label: "Monetization", icon: CurrencyDollarIcon, description: "Currency, tax & gateways" },
  { id: "design", label: "Design", icon: SwatchIcon, description: "Colors, fonts & layout" },
  { id: "advanced", label: "Advanced", icon: CpuChipIcon, description: "Cache, CDN & maintenance" },
  { id: "legal", label: "Legal", icon: ScaleIcon, description: "GDPR, terms & cookies" },
  { id: "gradebook", label: "Gradebook", icon: ClipboardDocumentCheckIcon, description: "Visibility & grading scale" },
  { id: "email", label: "Email", icon: EnvelopeIcon, description: "SMTP, from & test mail" },
  { id: "email-templates", label: "Email Templates", icon: DocumentTextIcon, description: "54 customizable templates" },
  { id: "notifications", label: "Notifications", icon: BellIcon, description: "Onsite, email & push" },
  { id: "authentication", label: "Authentication", icon: LockClosedIcon, description: "Password, OAuth & MFA" },
  { id: "certificate", label: "Certificate", icon: DocumentDuplicateIcon, description: "Templates & auto-issue" },
  { id: "accessibility", label: "Accessibility", icon: EyeIcon, description: "Contrast, motion & font size" },
  { id: "license", label: "License", icon: KeyIcon, description: "License key & plan" },
];

// ======================================================================
// Shared layout primitives
// ======================================================================

function SectionHeader({
  title,
  description,
  icon: Icon,
  action,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-gray-200 pb-5 dark:border-dark-600">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-500/15 dark:text-primary-400">
          <Icon className="size-5 stroke-2" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-dark-300">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

/** A labelled row with a trailing control slot. Used for Switch/Checkbox toggles. */
function ToggleRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-dark-100">{title}</p>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Card wrapper for grouped form fields. */
function FieldGroup({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5">
      {(title || description) && (
        <div className="mb-4">
          {title && (
            <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
              {title}
            </h2>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </Card>
  );
}

/** Footer with Cancel + Save buttons. */
function SaveFooter({
  onSave,
  onReset,
}: {
  onSave?: () => void;
  onReset?: () => void;
}) {
  return (
    <div className="mt-6 flex justify-end gap-3">
      <Button
        variant="flat"
        color="neutral"
        className="min-w-[7rem]"
        onClick={onReset}
      >
        Cancel
      </Button>
      <Button
        color="primary"
        className="min-w-[7rem] gap-1.5"
        onClick={onSave}
      >
        <CheckIcon className="size-4 stroke-2" />
        Save Changes
      </Button>
    </div>
  );
}

/** Two-column responsive grid for form fields. */
function FormGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {children}
    </div>
  );
}

// ======================================================================
// 1. General Settings
// ======================================================================

function GeneralSettings() {
  const [siteName, setSiteName] = useState("Tutor LMS");
  const [tagline, setTagline] = useState("Learn anything, from anywhere.");
  const [description, setDescription] = useState(
    "A modern learning platform for students and instructors.",
  );
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [weekStart, setWeekStart] = useState("monday");

  return (
    <div>
      <SectionHeader
        title="General"
        description="Configure site-wide general options."
        icon={Cog6ToothIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Site identity"
          description="Basic information about your LMS site."
        >
          <FormGrid>
            <Input
              label="Site name"
              value={siteName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSiteName(e.target.value)
              }
              placeholder="Your site name"
            />
            <Input
              label="Tagline"
              value={tagline}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setTagline(e.target.value)
              }
              placeholder="Short tagline"
            />
          </FormGrid>
          <div className="mt-4">
            <Textarea
              label="Site description"
              rows={3}
              value={description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              placeholder="Briefly describe your site"
            />
          </div>
        </FieldGroup>

        <FieldGroup
          title="Locale"
          description="Language, timezone, and date formatting used across the site."
        >
          <FormGrid>
            <Select
              label="Default language"
              value={language}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setLanguage(e.target.value)
              }
              data={[
                { label: "English", value: "en" },
                { label: "Español", value: "es" },
                { label: "中文 (简体)", value: "zh_cn" },
                { label: "العربية", value: "ar" },
                { label: "Français", value: "fr" },
                { label: "Deutsch", value: "de" },
              ]}
            />
            <Select
              label="Timezone"
              value={timezone}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setTimezone(e.target.value)
              }
              data={[
                { label: "UTC", value: "UTC" },
                { label: "America/New_York", value: "America/New_York" },
                { label: "America/Los_Angeles", value: "America/Los_Angeles" },
                { label: "Europe/London", value: "Europe/London" },
                { label: "Asia/Dubai", value: "Asia/Dubai" },
                { label: "Asia/Kolkata", value: "Asia/Kolkata" },
                { label: "Asia/Tokyo", value: "Asia/Tokyo" },
              ]}
            />
            <Select
              label="Date format"
              value={dateFormat}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setDateFormat(e.target.value)
              }
              data={[
                { label: "2025-12-31 (YYYY-MM-DD)", value: "YYYY-MM-DD" },
                { label: "31/12/2025 (DD/MM/YYYY)", value: "DD/MM/YYYY" },
                { label: "12/31/2025 (MM/DD/YYYY)", value: "MM/DD/YYYY" },
                { label: "Dec 31, 2025", value: "MMM D, YYYY" },
              ]}
            />
            <Select
              label="Week starts on"
              value={weekStart}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setWeekStart(e.target.value)
              }
              data={[
                { label: "Monday", value: "monday" },
                { label: "Sunday", value: "sunday" },
                { label: "Saturday", value: "saturday" },
              ]}
            />
          </FormGrid>
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 2. Course Settings
// ======================================================================

function CourseSettings() {
  const [maxStudents, setMaxStudents] = useState("50");
  const [previewEnabled, setPreviewEnabled] = useState(true);
  const [videoMaxSize, setVideoMaxSize] = useState("500");
  const [attachmentMaxSize, setAttachmentMaxSize] = useState("50");
  const [autoComplete, setAutoComplete] = useState(false);
  const [difficulties, setDifficulties] = useState<string[]>([
    "Beginner",
    "Intermediate",
    "Advanced",
  ]);
  const [newDifficulty, setNewDifficulty] = useState("");

  const addDifficulty = () => {
    const v = newDifficulty.trim();
    if (v && !difficulties.includes(v)) {
      setDifficulties([...difficulties, v]);
      setNewDifficulty("");
    }
  };

  const removeDifficulty = (d: string) =>
    setDifficulties(difficulties.filter((x) => x !== d));

  return (
    <div>
      <SectionHeader
        title="Course"
        description="Default course options, difficulty levels, and upload limits."
        icon={AcademicCapIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Course defaults"
          description="Defaults applied when instructors create a new course."
        >
          <FormGrid>
            <Input
              label="Default max students"
              type="number"
              value={maxStudents}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setMaxStudents(e.target.value)
              }
              description="0 = unlimited"
            />
            <Input
              label="Video max size (MB)"
              type="number"
              value={videoMaxSize}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setVideoMaxSize(e.target.value)
              }
            />
            <Input
              label="Attachment max size (MB)"
              type="number"
              value={attachmentMaxSize}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setAttachmentMaxSize(e.target.value)
              }
            />
          </FormGrid>
          <div className="mt-4 divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Enable lesson preview"
              description="Allow non-enrolled students to preview lessons marked as preview."
            >
              <Switch
                checked={previewEnabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPreviewEnabled(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Auto-complete course on finish"
              description="Mark courses as complete when all lessons & quizzes are done."
            >
              <Switch
                checked={autoComplete}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setAutoComplete(e.target.checked)
                }
              />
            </ToggleRow>
          </div>
        </FieldGroup>

        <FieldGroup
          title="Difficulty levels"
          description="The difficulty options instructors can pick when creating a course."
        >
          <div className="flex flex-wrap gap-2">
            {difficulties.map((d) => (
              <Badge
                key={d}
                color="primary"
                variant="soft"
                className="gap-1.5 py-1 pl-2.5 pr-1.5 text-xs"
              >
                {d}
                <Button
                  isIcon
                  variant="flat"
                  color="neutral"
                  className="size-5 rounded-full"
                  onClick={() => removeDifficulty(d)}
                  aria-label={`Remove ${d}`}
                >
                  <TrashIcon className="size-3" />
                </Button>
              </Badge>
            ))}
            {difficulties.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-dark-300">
                No difficulty levels defined yet.
              </p>
            )}
          </div>
          <div className="mt-3 flex gap-2">
            <Input
              placeholder="Add a difficulty level…"
              value={newDifficulty}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setNewDifficulty(e.target.value)
              }
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addDifficulty();
                }
              }}
            />
            <Button
              color="primary"
              variant="soft"
              className="gap-1.5 shrink-0"
              onClick={addDifficulty}
            >
              <PlusIcon className="size-4" />
              Add
            </Button>
          </div>
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 3. Monetization Settings
// ======================================================================

function MonetizationSettings() {
  const [currency, setCurrency] = useState("usd");
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState("7.5");
  const [couponEnabled, setCouponEnabled] = useState(true);
  const [gateway, setGateway] = useState("stripe");
  const [multiCurrency, setMultiCurrency] = useState(false);

  return (
    <div>
      <SectionHeader
        title="Monetization"
        description="Currency, taxes, coupons, and payment gateways."
        icon={CurrencyDollarIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Currency"
          description="The currency used for course prices, payouts, and invoices."
        >
          <FormGrid>
            <Select
              label="Default currency"
              value={currency}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setCurrency(e.target.value)
              }
              data={[
                { label: "USD — US Dollar ($)", value: "usd" },
                { label: "EUR — Euro (€)", value: "eur" },
                { label: "GBP — Pound Sterling (£)", value: "gbp" },
                { label: "AED — UAE Dirham (د.إ)", value: "aed" },
                { label: "INR — Indian Rupee (₹)", value: "inr" },
                { label: "JPY — Japanese Yen (¥)", value: "jpy" },
              ]}
            />
            <Select
              label="Default payment gateway"
              value={gateway}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setGateway(e.target.value)
              }
              data={[
                { label: "Stripe", value: "stripe" },
                { label: "PayPal", value: "paypal" },
                { label: "Razorpay", value: "razorpay" },
                { label: "Paymob", value: "paymob" },
                { label: "Bank transfer (manual)", value: "bank" },
              ]}
            />
          </FormGrid>
          <div className="mt-4 divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Enable multi-currency checkout"
              description="Let students pay in their local currency at checkout."
            >
              <Switch
                checked={multiCurrency}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setMultiCurrency(e.target.checked)
                }
              />
            </ToggleRow>
          </div>
        </FieldGroup>

        <FieldGroup
          title="Tax"
          description="Charge tax on course purchases."
        >
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Enable tax"
              description="Apply tax to all eligible course purchases."
            >
              <Switch
                checked={taxEnabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setTaxEnabled(e.target.checked)
                }
              />
            </ToggleRow>
          </div>
          {taxEnabled && (
            <div className="mt-4">
              <Input
                label="Default tax rate (%)"
                type="number"
                value={taxRate}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setTaxRate(e.target.value)
                }
                description="Used when no zone-specific rate applies."
              />
            </div>
          )}
        </FieldGroup>

        <FieldGroup
          title="Coupons"
          description="Allow instructors to create discount coupons."
        >
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Enable coupons"
              description="Instructors can offer percent or fixed-amount discounts."
            >
              <Switch
                checked={couponEnabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setCouponEnabled(e.target.checked)
                }
              />
            </ToggleRow>
          </div>
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 4. Design Settings
// ======================================================================

function DesignSettings() {
  const [primaryColor, setPrimaryColor] = useState("#4f46e5");
  const [fontFamily, setFontFamily] = useState("inter");
  const [layoutMode, setLayoutMode] = useState("boxed");
  const [customCss, setCustomCss] = useState(
    "/* Add your custom CSS here */\n.brand-text {\n  font-weight: 700;\n}",
  );

  return (
    <div>
      <SectionHeader
        title="Design"
        description="Brand color, typography, layout, and custom CSS."
        icon={SwatchIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Branding"
          description="Pick the primary brand color and typography."
        >
          <FormGrid>
            <Input
              label="Primary color"
              type="color"
              value={primaryColor}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPrimaryColor(e.target.value)
              }
              prefix={
                <span
                  className="size-4 rounded border border-gray-300"
                  style={{ backgroundColor: primaryColor }}
                />
              }
              description={`Hex: ${primaryColor}`}
            />
            <Select
              label="Font family"
              value={fontFamily}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setFontFamily(e.target.value)
              }
              data={[
                { label: "Inter", value: "inter" },
                { label: "Poppins", value: "poppins" },
                { label: "Roboto", value: "roboto" },
                { label: "Open Sans", value: "open-sans" },
                { label: "Lato", value: "lato" },
                { label: "Nunito", value: "nunito" },
                { label: "System default", value: "system" },
              ]}
            />
          </FormGrid>
        </FieldGroup>

        <FieldGroup
          title="Layout"
          description="Choose how the site width is constrained."
        >
          <Select
            label="Layout mode"
            value={layoutMode}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setLayoutMode(e.target.value)
            }
            data={[
              { label: "Boxed — centered with max width", value: "boxed" },
              { label: "Wide — full viewport width", value: "wide" },
            ]}
          />
        </FieldGroup>

        <FieldGroup
          title="Custom CSS"
          description="Custom CSS injected into the page <head>. Use with care."
        >
          <Textarea
            rows={10}
            value={customCss}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
              setCustomCss(e.target.value)
            }
            classNames={{
              input: "font-mono text-xs",
            }}
          />
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 5. Advanced Settings
// ======================================================================

function AdvancedSettings() {
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [cdnUrl, setCdnUrl] = useState("https://cdn.tutorexample.com");
  const [maxUpload, setMaxUpload] = useState("100");
  const [maintenance, setMaintenance] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [gzip, setGzip] = useState(true);

  return (
    <div>
      <SectionHeader
        title="Advanced"
        description="Performance, CDN, uploads, and maintenance."
        icon={CpuChipIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Performance"
          description="Caching and compression options."
        >
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Enable page cache"
              description="Cache rendered pages and API responses for faster loads."
            >
              <Switch
                checked={cacheEnabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setCacheEnabled(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Enable gzip compression"
              description="Compress responses to reduce bandwidth."
            >
              <Switch
                checked={gzip}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setGzip(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Debug mode"
              description="Expose detailed error messages. Disable in production."
            >
              <Switch
                checked={debugMode}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDebugMode(e.target.checked)
                }
                color="warning"
              />
            </ToggleRow>
          </div>
        </FieldGroup>

        <FieldGroup
          title="CDN & uploads"
          description="Serve static assets via CDN and limit upload sizes."
        >
          <FormGrid>
            <Input
              label="CDN URL"
              value={cdnUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCdnUrl(e.target.value)
              }
              placeholder="https://cdn.example.com"
            />
            <Input
              label="Max upload size (MB)"
              type="number"
              value={maxUpload}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setMaxUpload(e.target.value)
              }
              description="Site-wide limit for any uploaded file."
            />
          </FormGrid>
        </FieldGroup>

        <FieldGroup
          title="Maintenance"
          description="Take the site offline for updates."
        >
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Maintenance mode"
              description="Show a maintenance page to non-admins."
            >
              <Switch
                checked={maintenance}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setMaintenance(e.target.checked)
                }
                color="warning"
              />
            </ToggleRow>
          </div>
          {maintenance && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-warning-50 p-3 text-xs text-warning-700 dark:bg-warning-500/10 dark:text-warning-300">
              <ShieldCheckIcon className="size-4 shrink-0" />
              The site is currently in maintenance mode. Admins can still log in.
            </div>
          )}
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 6. Legal Settings
// ======================================================================

function LegalSettings() {
  const [gdpr, setGdpr] = useState(true);
  const [termsUrl, setTermsUrl] = useState("https://example.com/terms");
  const [privacyUrl, setPrivacyUrl] = useState("https://example.com/privacy");
  const [cookieConsent, setCookieConsent] = useState(true);
  const [consentText, setConsentText] = useState(
    "We use cookies to enhance your experience. By continuing to visit this site you agree to our use of cookies.",
  );
  const [refundUrl, setRefundUrl] = useState("https://example.com/refund");

  return (
    <div>
      <SectionHeader
        title="Legal"
        description="GDPR, terms, privacy policy, and cookie consent."
        icon={ScaleIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Privacy & GDPR"
          description="Compliance settings for the EU General Data Protection Regulation."
        >
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Enable GDPR compliance"
              description="Show data-export and data-erasure options to users."
            >
              <Switch
                checked={gdpr}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setGdpr(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Cookie consent banner"
              description="Show a cookie consent banner to new visitors."
            >
              <Switch
                checked={cookieConsent}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setCookieConsent(e.target.checked)
                }
              />
            </ToggleRow>
          </div>
          {cookieConsent && (
            <div className="mt-4">
              <Textarea
                label="Custom consent text"
                rows={3}
                value={consentText}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                  setConsentText(e.target.value)
                }
              />
            </div>
          )}
        </FieldGroup>

        <FieldGroup
          title="Legal URLs"
          description="Links to your legal documents, shown in the footer and emails."
        >
          <FormGrid>
            <Input
              label="Terms of service URL"
              value={termsUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setTermsUrl(e.target.value)
              }
              placeholder="https://example.com/terms"
            />
            <Input
              label="Privacy policy URL"
              value={privacyUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setPrivacyUrl(e.target.value)
              }
              placeholder="https://example.com/privacy"
            />
            <Input
              label="Refund policy URL"
              value={refundUrl}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setRefundUrl(e.target.value)
              }
              placeholder="https://example.com/refund"
            />
          </FormGrid>
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 7. Gradebook Settings
// ======================================================================

type GradeColor =
  | "primary"
  | "success"
  | "info"
  | "warning"
  | "error"
  | "neutral";

interface GradeBand {
  grade: string;
  min: number;
  max: number;
  color: GradeColor;
}

function GradebookSettings() {
  const [visibility, setVisibility] = useState("private");
  const [showWeighted, setShowWeighted] = useState(true);
  const [roundScores, setRoundScores] = useState(true);
  const [bands, setBands] = useState<GradeBand[]>([
    { grade: "A", min: 90, max: 100, color: "success" },
    { grade: "B", min: 80, max: 89, color: "primary" },
    { grade: "C", min: 70, max: 79, color: "info" },
    { grade: "D", min: 60, max: 69, color: "warning" },
    { grade: "F", min: 0, max: 59, color: "error" },
  ]);

  const updateBand = (
    idx: number,
    field: keyof GradeBand,
    value: string,
  ) => {
    setBands((prev) =>
      prev.map((b, i) =>
        i === idx
          ? {
              ...b,
              [field]:
                field === "grade"
                  ? value
                  : field === "color"
                    ? (value as GradeColor)
                    : Number(value),
            }
          : b,
      ),
    );
  };

  return (
    <div>
      <SectionHeader
        title="Gradebook"
        description="Gradebook visibility and grading scale."
        icon={ClipboardDocumentCheckIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Visibility"
          description="Who can see the gradebook."
        >
          <Select
            label="Gradebook visibility"
            value={visibility}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setVisibility(e.target.value)
            }
            data={[
              { label: "Private — only instructors & enrolled students", value: "private" },
              { label: "Public — anyone with the link", value: "public" },
              { label: "Instructors only", value: "instructors" },
            ]}
          />
          <div className="mt-4 divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Show weighted grade"
              description="Display the weighted total alongside the raw score."
            >
              <Switch
                checked={showWeighted}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setShowWeighted(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Round scores to whole numbers"
              description="Avoid decimals in the displayed grade."
            >
              <Switch
                checked={roundScores}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setRoundScores(e.target.checked)
                }
              />
            </ToggleRow>
          </div>
        </FieldGroup>

        <FieldGroup
          title="Grading scale"
          description="Define the percentage bands for each letter grade."
        >
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600">
            <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-dark-600 dark:text-dark-300">
              <div className="col-span-2">Grade</div>
              <div className="col-span-3">Min %</div>
              <div className="col-span-3">Max %</div>
              <div className="col-span-3">Color</div>
              <div className="col-span-1" />
            </div>
            <div className="divide-y divide-gray-100 dark:divide-dark-600">
              {bands.map((b, i) => (
                <div
                  key={b.grade}
                  className="grid grid-cols-12 items-center gap-2 px-3 py-2"
                >
                  <div className="col-span-2">
                    <Badge color={b.color} variant="soft" className="w-full justify-center">
                      {b.grade}
                    </Badge>
                  </div>
                  <Input
                    className="col-span-3"
                    type="number"
                    value={b.min}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateBand(i, "min", e.target.value)
                    }
                  />
                  <Input
                    className="col-span-3"
                    type="number"
                    value={b.max}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateBand(i, "max", e.target.value)
                    }
                  />
                  <Select
                    className="col-span-3"
                    value={b.color}
                    onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                      updateBand(i, "color", e.target.value)
                    }
                    data={[
                      { label: "Primary", value: "primary" },
                      { label: "Success", value: "success" },
                      { label: "Info", value: "info" },
                      { label: "Warning", value: "warning" },
                      { label: "Error", value: "error" },
                    ]}
                  />
                  <div className="col-span-1 flex justify-end">
                    <Button
                      isIcon
                      variant="flat"
                      color="error"
                      className="size-7"
                      onClick={() =>
                        setBands(bands.filter((_, idx) => idx !== i))
                      }
                      aria-label="Remove grade band"
                    >
                      <TrashIcon className="size-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <Button
              color="primary"
              variant="soft"
              className="gap-1.5"
              onClick={() =>
                setBands([
                  ...bands,
                  { grade: "N", min: 0, max: 0, color: "neutral" },
                ])
              }
            >
              <PlusIcon className="size-4" />
              Add band
            </Button>
          </div>
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 8. Email Settings
// ======================================================================

function EmailSettings() {
  const [driver, setDriver] = useState("smtp");
  const [fromEmail, setFromEmail] = useState("no-reply@example.com");
  const [fromName, setFromName] = useState("Tutor LMS");
  const [smtpHost, setSmtpHost] = useState("smtp.mailgun.org");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("postmaster@example.com");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  const sendTest = () => {
    if (!testEmail) return;
    setSending(true);
    setTimeout(() => setSending(false), 1200);
  };

  return (
    <div>
      <SectionHeader
        title="Email"
        description="Configure how transactional email is delivered."
        icon={EnvelopeIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Sender"
          description="The from-name and from-address used on outgoing mail."
        >
          <FormGrid>
            <Input
              label="From name"
              value={fromName}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFromName(e.target.value)
              }
            />
            <Input
              label="From email"
              type="email"
              value={fromEmail}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFromEmail(e.target.value)
              }
            />
          </FormGrid>
        </FieldGroup>

        <FieldGroup
          title="Driver"
          description="Pick the mail transport and configure its credentials."
        >
          <Select
            label="Email driver"
            value={driver}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              setDriver(e.target.value)
            }
            data={[
              { label: "SMTP", value: "smtp" },
              { label: "Resend", value: "resend" },
              { label: "SendGrid", value: "sendgrid" },
              { label: "Amazon SES", value: "ses" },
              { label: "Log (debug)", value: "log" },
            ]}
          />

          {driver === "smtp" && (
            <div className="mt-4 space-y-4">
              <FormGrid>
                <Input
                  label="SMTP host"
                  value={smtpHost}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSmtpHost(e.target.value)
                  }
                />
                <Input
                  label="SMTP port"
                  type="number"
                  value={smtpPort}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSmtpPort(e.target.value)
                  }
                />
                <Input
                  label="SMTP username"
                  value={smtpUser}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSmtpUser(e.target.value)
                  }
                />
                <Input
                  label="SMTP password"
                  type="password"
                  value={smtpPass}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSmtpPass(e.target.value)
                  }
                  placeholder="••••••••"
                />
              </FormGrid>
              <div className="divide-y divide-gray-100 dark:divide-dark-600">
                <ToggleRow
                  title="Use TLS / SSL"
                  description="Encrypt the SMTP connection."
                >
                  <Switch
                    checked={smtpSecure}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setSmtpSecure(e.target.checked)
                    }
                  />
                </ToggleRow>
              </div>
            </div>
          )}

          {driver === "resend" && (
            <div className="mt-4">
              <Input
                label="Resend API key"
                type="password"
                placeholder="re_••••••••••••••"
              />
            </div>
          )}
        </FieldGroup>

        <FieldGroup
          title="Test email"
          description="Send a test message to verify your configuration."
        >
          <div className="flex gap-2">
            <Input
              placeholder="recipient@example.com"
              type="email"
              value={testEmail}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setTestEmail(e.target.value)
              }
            />
            <Button
              color="primary"
              variant="soft"
              className="shrink-0 gap-1.5"
              onClick={sendTest}
              disabled={sending || !testEmail}
            >
              {sending ? (
                <>
                  <SparklesIcon className="size-4 animate-pulse" />
                  Sending…
                </>
              ) : (
                <>
                  <EnvelopeIcon className="size-4" />
                  Send test
                </>
              )}
            </Button>
          </div>
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 9. Email Templates Settings (54 templates)
// ======================================================================

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  subject: string;
  body: string;
  placeholders: string[];
}

const TEMPLATES: EmailTemplate[] = Array.from({ length: 54 }, (_, i) => {
  const samples: Array<Omit<EmailTemplate, "id">> = [
    {
      name: "Welcome email",
      description: "Sent when a student registers.",
      subject: "Welcome to {site_name}, {user_name}!",
      body: "Hi {user_name},\n\nWelcome to {site_name}. You can start learning right away at {login_url}.\n\nCheers,\n{site_name} team",
      placeholders: ["{site_name}", "{user_name}", "{login_url}"],
    },
    {
      name: "Enrollment confirmation",
      description: "Sent after a student enrolls in a course.",
      subject: "You're enrolled in {course_name}",
      body: "Hi {user_name},\n\nYou're now enrolled in {course_name}. Start learning here: {course_url}",
      placeholders: ["{user_name}", "{course_name}", "{course_url}"],
    },
    {
      name: "Course completed",
      description: "Sent when a student finishes all lessons.",
      subject: "Congratulations on finishing {course_name}!",
      body: "Well done, {user_name}!\n\nYou completed {course_name}. Your certificate: {certificate_url}",
      placeholders: ["{user_name}", "{course_name}", "{certificate_url}"],
    },
    {
      name: "Quiz graded",
      description: "Sent after a quiz attempt is graded.",
      subject: "Your quiz results: {quiz_title}",
      body: "Hi {user_name},\n\nYou scored {score}% on {quiz_title}.",
      placeholders: ["{user_name}", "{quiz_title}", "{score}"],
    },
    {
      name: "Password reset",
      description: "Sent when a user requests a password reset.",
      subject: "Reset your {site_name} password",
      body: "Hi {user_name},\n\nReset your password: {reset_url}\n\nThis link expires in 60 minutes.",
      placeholders: ["{user_name}", "{reset_url}", "{site_name}"],
    },
    {
      name: "New review",
      description: "Sent to the instructor on a new course review.",
      subject: "{user_name} left a {stars}-star review on {course_name}",
      body: "Hi {instructor_name},\n\n{user_name} rated your course {course_name} {stars} stars.\n\n{review_body}",
      placeholders: ["{instructor_name}", "{user_name}", "{course_name}", "{stars}", "{review_body}"],
    },
    {
      name: "Assignment submitted",
      description: "Sent to instructor when a student submits an assignment.",
      subject: "{user_name} submitted {assignment_title}",
      body: "Hi {instructor_name},\n\n{user_name} submitted {assignment_title}. Review it at {assignment_url}.",
      placeholders: ["{instructor_name}", "{user_name}", "{assignment_title}", "{assignment_url}"],
    },
    {
      name: "Invoice issued",
      description: "Sent after a successful purchase.",
      subject: "Invoice #{order_id} from {site_name}",
      body: "Hi {user_name},\n\nThanks for your purchase. Invoice #{order_id} for {amount} is attached.",
      placeholders: ["{user_name}", "{order_id}", "{amount}", "{site_name}"],
    },
    {
      name: "Refund processed",
      description: "Sent when a refund is issued.",
      subject: "Refund processed for order #{order_id}",
      body: "Hi {user_name},\n\nA refund of {amount} has been processed for order #{order_id}.",
      placeholders: ["{user_name}", "{order_id}", "{amount}"],
    },
    {
      name: "Certificate issued",
      description: "Sent when a certificate is auto-issued.",
      subject: "Your certificate for {course_name} is ready",
      body: "Hi {user_name},\n\nYour certificate is ready: {certificate_url}",
      placeholders: ["{user_name}", "{course_name}", "{certificate_url}"],
    },
  ];
  const base = samples[i % samples.length];
  return {
    id: `tpl-${String(i + 1).padStart(2, "0")}`,
    ...base,
    name: i < samples.length ? base.name : `${base.name} (${Math.floor(i / samples.length) + 1})`,
  };
});

function EmailTemplatesSettings() {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(TEMPLATES[0].id);
  const [edited, setEdited] = useState<Record<string, EmailTemplate>>({});

  const filtered = TEMPLATES.filter((t) =>
    `${t.name} ${t.description}`.toLowerCase().includes(query.toLowerCase()),
  );
  const selected =
    edited[selectedId] ??
    TEMPLATES.find((t) => t.id === selectedId) ??
    TEMPLATES[0];

  const update = (patch: Partial<EmailTemplate>) =>
    setEdited((prev) => ({
      ...prev,
      [selectedId]: { ...selected, ...patch },
    }));

  return (
    <div>
      <SectionHeader
        title="Email Templates"
        description="Customize the subject and body of every transactional email."
        icon={DocumentTextIcon}
        action={
          <Badge color="primary" variant="soft" className="gap-1.5">
            <DocumentTextIcon className="size-3.5" />
            {TEMPLATES.length} templates
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_1fr]">
        {/* Template list */}
        <Card className="flex max-h-[600px] flex-col p-0">
          <div className="border-b border-gray-200 p-3 dark:border-dark-600">
            <Input
              placeholder="Search templates…"
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setQuery(e.target.value)
              }
              prefix={<MagnifyingGlassIcon className="size-4" />}
            />
          </div>
          <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
            <ul className="divide-y divide-gray-100 dark:divide-dark-600">
              {filtered.map((t) => {
                const isEdited = !!edited[t.id];
                const isSelected = t.id === selectedId;
                return (
                  <li key={t.id}>
                    <Button
                      variant="flat"
                      color={isSelected ? "primary" : "neutral"}
                      onClick={() => setSelectedId(t.id)}
                      className={clsx(
                        "w-full justify-start gap-2 px-3 py-2.5 text-left",
                        isSelected
                          ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                          : "text-gray-700 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-600",
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">
                            {t.name}
                          </span>
                          {isEdited && (
                            <span className="size-1.5 shrink-0 rounded-full bg-primary-500" />
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                          {t.description}
                        </p>
                      </div>
                    </Button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-gray-500 dark:text-dark-300">
                  No templates match “{query}”.
                </li>
              )}
            </ul>
          </ScrollShadow>
        </Card>

        {/* Template editor */}
        <Card className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                {selected.name}
              </h2>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                {selected.description}
              </p>
            </div>
            <Badge color="neutral" variant="soft" className="shrink-0 text-[10px]">
              {selected.id}
            </Badge>
          </div>

          <div className="space-y-4">
            <Input
              label="Subject"
              value={selected.subject}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                update({ subject: e.target.value })
              }
            />
            <Textarea
              label="Body"
              rows={10}
              value={selected.body}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                update({ body: e.target.value })
              }
              classNames={{ input: "font-mono text-xs" }}
            />
            <div>
              <p className="mb-2 text-xs font-medium text-gray-700 dark:text-dark-200">
                Available placeholders
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selected.placeholders.map((p) => (
                  <Badge
                    key={p}
                    color="primary"
                    variant="outlined"
                    className="font-mono text-[11px]"
                  >
                    {p}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-dark-600">
            <Button
              variant="flat"
              color="neutral"
              onClick={() =>
                setEdited((prev) => {
                  const next = { ...prev };
                  delete next[selectedId];
                  return next;
                })
              }
            >
              Reset
            </Button>
            <Button color="primary" className="gap-1.5">
              <CheckIcon className="size-4 stroke-2" />
              Save template
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ======================================================================
// 10. Notifications Settings
// ======================================================================

interface EventToggle {
  id: string;
  label: string;
  description: string;
  onsite: boolean;
  email: boolean;
  push: boolean;
}

function NotificationsSettings() {
  const [onsite, setOnsite] = useState(true);
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(false);
  const [digest, setDigest] = useState(true);

  const [events, setEvents] = useState<EventToggle[]>([
    { id: "enrollment", label: "New enrollment", description: "A student enrolls in a course.", onsite: true, email: true, push: false },
    { id: "review", label: "New review", description: "A student leaves a review.", onsite: true, email: true, push: false },
    { id: "qa", label: "New Q&A question", description: "A student asks a question in a course.", onsite: true, email: false, push: false },
    { id: "assignment", label: "Assignment submitted", description: "A student submits an assignment.", onsite: true, email: true, push: true },
    { id: "certificate", label: "Certificate issued", description: "A certificate is auto-issued.", onsite: true, email: true, push: false },
    { id: "payout", label: "Payout approved", description: "An instructor payout is approved.", onsite: true, email: true, push: true },
    { id: "announcement", label: "Course announcement", description: "An instructor posts an announcement.", onsite: true, email: true, push: false },
    { id: "refund", label: "Refund processed", description: "A student refund is processed.", onsite: true, email: true, push: false },
  ]);

  const toggle = (id: string, channel: "onsite" | "email" | "push") =>
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [channel]: !e[channel] } : e)),
    );

  return (
    <div>
      <SectionHeader
        title="Notifications"
        description="Channels and per-event notification preferences."
        icon={BellIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Channels"
          description="Enable or disable each notification channel globally."
        >
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Onsite notifications"
              description="Show notifications in the in-app bell menu."
            >
              <Switch
                checked={onsite}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setOnsite(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Email notifications"
              description="Send notifications by email."
            >
              <Switch
                checked={email}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Push notifications"
              description="Send web/mobile push notifications."
            >
              <Switch
                checked={push}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setPush(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Daily digest"
              description="Bundle low-priority notifications into a single daily email."
            >
              <Switch
                checked={digest}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setDigest(e.target.checked)
                }
              />
            </ToggleRow>
          </div>
        </FieldGroup>

        <FieldGroup
          title="Per-event preferences"
          description="Choose which channels each event type can use."
        >
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600">
            <div className="grid grid-cols-12 gap-2 bg-gray-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-dark-600 dark:text-dark-300">
              <div className="col-span-6">Event</div>
              <div className="col-span-2 text-center">Onsite</div>
              <div className="col-span-2 text-center">Email</div>
              <div className="col-span-2 text-center">Push</div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-dark-600">
              {events.map((e) => (
                <div
                  key={e.id}
                  className="grid grid-cols-12 items-center gap-2 px-3 py-2.5"
                >
                  <div className="col-span-6 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-dark-100">
                      {e.label}
                    </p>
                    <p className="truncate text-xs text-gray-500 dark:text-dark-300">
                      {e.description}
                    </p>
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <Checkbox
                      checked={e.onsite}
                      onChange={() => toggle(e.id, "onsite")}
                      aria-label={`Onsite for ${e.label}`}
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <Checkbox
                      checked={e.email}
                      onChange={() => toggle(e.id, "email")}
                      aria-label={`Email for ${e.label}`}
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <Checkbox
                      checked={e.push}
                      onChange={() => toggle(e.id, "push")}
                      aria-label={`Push for ${e.label}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 11. Authentication Settings
// ======================================================================

interface OAuthProvider {
  id: "google" | "facebook" | "twitter";
  label: string;
  enabled: boolean;
  clientId: string;
  clientSecret: string;
}

function AuthenticationSettings() {
  const [minLength, setMinLength] = useState("8");
  const [requireSpecial, setRequireSpecial] = useState(true);
  const [requireNumber, setRequireNumber] = useState(true);
  const [requireUpper, setRequireUpper] = useState(true);
  const [mfa, setMfa] = useState(false);
  const [recaptcha, setRecaptcha] = useState(true);
  const [recaptchaSiteKey, setRecaptchaSiteKey] = useState("6LcXXXXXXXX");
  const [recaptchaSecret, setRecaptchaSecret] = useState("");
  const [providers, setProviders] = useState<OAuthProvider[]>([
    { id: "google", label: "Google", enabled: true, clientId: "1234567890-abc.apps.googleusercontent.com", clientSecret: "" },
    { id: "facebook", label: "Facebook", enabled: false, clientId: "", clientSecret: "" },
    { id: "twitter", label: "Twitter / X", enabled: false, clientId: "", clientSecret: "" },
  ]);

  const updateProvider = (id: string, patch: Partial<OAuthProvider>) =>
    setProviders((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );

  return (
    <div>
      <SectionHeader
        title="Authentication"
        description="Password policy, social login, MFA, and bot protection."
        icon={LockClosedIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Password policy"
          description="Rules enforced when users set or reset their password."
        >
          <Input
            label="Minimum password length"
            type="number"
            value={minLength}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setMinLength(e.target.value)
            }
            className="max-w-xs"
          />
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Checkbox
              checked={requireSpecial}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setRequireSpecial(e.target.checked)
              }
              label="Require special character"
            />
            <Checkbox
              checked={requireNumber}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setRequireNumber(e.target.checked)
              }
              label="Require a number"
            />
            <Checkbox
              checked={requireUpper}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setRequireUpper(e.target.checked)
              }
              label="Require uppercase letter"
            />
          </div>
        </FieldGroup>

        <FieldGroup
          title="OAuth providers"
          description="Let users sign in with their existing social accounts."
        >
          <div className="space-y-4">
            {providers.map((p) => (
              <div
                key={p.id}
                className={clsx(
                  "rounded-lg border p-4 transition-colors",
                  p.enabled
                    ? "border-primary-300 bg-primary-50/40 dark:border-primary-500/30 dark:bg-primary-500/5"
                    : "border-gray-200 dark:border-dark-600",
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar
                      name={p.label}
                      size={9}
                      initialColor="primary"
                      initialVariant="soft"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                        {p.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-dark-300">
                        {p.enabled ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={p.enabled}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      updateProvider(p.id, { enabled: e.target.checked })
                    }
                  />
                </div>
                {p.enabled && (
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input
                      label="Client ID"
                      value={p.clientId}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateProvider(p.id, { clientId: e.target.value })
                      }
                      placeholder={`${p.label} client ID`}
                    />
                    <Input
                      label="Client secret"
                      type="password"
                      value={p.clientSecret}
                      onChange={(e: ChangeEvent<HTMLInputElement>) =>
                        updateProvider(p.id, { clientSecret: e.target.value })
                      }
                      placeholder="••••••••"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup
          title="Security"
          description="Multi-factor authentication and bot protection."
        >
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Multi-factor authentication (MFA)"
              description="Require a one-time code from an authenticator app at login."
            >
              <Switch
                checked={mfa}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setMfa(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="reCAPTCHA on login & signup"
              description="Protect forms from bots with Google reCAPTCHA v3."
            >
              <Switch
                checked={recaptcha}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setRecaptcha(e.target.checked)
                }
              />
            </ToggleRow>
          </div>
          {recaptcha && (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                label="Site key"
                value={recaptchaSiteKey}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setRecaptchaSiteKey(e.target.value)
                }
              />
              <Input
                label="Secret key"
                type="password"
                value={recaptchaSecret}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setRecaptchaSecret(e.target.value)
                }
                placeholder="••••••••"
              />
            </div>
          )}
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 12. Certificate Settings
// ======================================================================

function CertificateSettings() {
  const [enabled, setEnabled] = useState(true);
  const [template, setTemplate] = useState("modern");
  const [pdfFormat, setPdfFormat] = useState("a4");
  const [autoIssue, setAutoIssue] = useState(true);
  const [verifyUrl, setVerifyUrl] = useState("https://example.com/verify");
  const [signature, setSignature] = useState("Sarah Mitchell, Academic Director");

  return (
    <div>
      <SectionHeader
        title="Certificate"
        description="Enable certificates, pick a template, and auto-issue on completion."
        icon={DocumentDuplicateIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Certificates"
          description="Issue completion certificates to students."
        >
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Enable certificates"
              description="Allow certificates to be issued for completed courses."
            >
              <Switch
                checked={enabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setEnabled(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Auto-issue on completion"
              description="Generate a certificate as soon as a student finishes a course."
            >
              <Switch
                checked={autoIssue}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setAutoIssue(e.target.checked)
                }
              />
            </ToggleRow>
          </div>
        </FieldGroup>

        {enabled && (
          <>
            <FieldGroup
              title="Template & format"
              description="Choose the visual template and PDF page size."
            >
              <FormGrid>
                <Select
                  label="Default template"
                  value={template}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setTemplate(e.target.value)
                  }
                  data={[
                    { label: "Modern", value: "modern" },
                    { label: "Classic", value: "classic" },
                    { label: "Minimal", value: "minimal" },
                    { label: "Elegant", value: "elegant" },
                    { label: "Bold", value: "bold" },
                  ]}
                />
                <Select
                  label="PDF format"
                  value={pdfFormat}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    setPdfFormat(e.target.value)
                  }
                  data={[
                    { label: "A4 (210 × 297 mm)", value: "a4" },
                    { label: "Letter (8.5 × 11 in)", value: "letter" },
                    { label: "Legal (8.5 × 14 in)", value: "legal" },
                    { label: "A3 landscape (420 × 297 mm)", value: "a3-landscape" },
                  ]}
                />
              </FormGrid>
            </FieldGroup>

            <FieldGroup
              title="Verification & signature"
              description="Customize the verification URL and the signature line."
            >
              <FormGrid>
                <Input
                  label="Public verification URL"
                  value={verifyUrl}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setVerifyUrl(e.target.value)
                  }
                  placeholder="https://example.com/verify"
                />
                <Input
                  label="Signature line"
                  value={signature}
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    setSignature(e.target.value)
                  }
                  placeholder="Name, Title"
                />
              </FormGrid>
            </FieldGroup>
          </>
        )}
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 13. Accessibility Settings
// ======================================================================

function AccessibilitySettings() {
  const [fontSize, setFontSize] = useState(16);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReader, setScreenReader] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [largeCursor, setLargeCursor] = useState(false);
  const [underlineLinks, setUnderlineLinks] = useState(true);

  return (
    <div>
      <SectionHeader
        title="Accessibility"
        description="Adjust the UI for better readability and motor accessibility."
        icon={EyeIcon}
      />

      <div className="space-y-5">
        <FieldGroup
          title="Typography"
          description="Adjust the default body font size."
        >
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800 dark:text-dark-100">
                Font size
              </span>
              <Badge color="primary" variant="soft" className="font-mono text-xs">
                {fontSize}px
              </Badge>
            </div>
            <Range
              min={12}
              max={24}
              step={1}
              value={fontSize}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setFontSize(Number(e.target.value))
              }
              color="primary"
              className="w-full"
            />
            <p
              className="mt-3 text-gray-600 dark:text-dark-200"
              style={{ fontSize: `${fontSize}px` }}
            >
              The quick brown fox jumps over the lazy dog.
            </p>
          </div>
        </FieldGroup>

        <FieldGroup
          title="Visual aids"
          description="Improve contrast and reduce distractions."
        >
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="High contrast mode"
              description="Boost text/background contrast for low-vision users."
            >
              <Switch
                checked={highContrast}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setHighContrast(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Underline links"
              description="Always underline hyperlinks so they're easier to spot."
            >
              <Switch
                checked={underlineLinks}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setUnderlineLinks(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Large cursor"
              description="Render a larger-than-default cursor."
            >
              <Switch
                checked={largeCursor}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setLargeCursor(e.target.checked)
                }
              />
            </ToggleRow>
          </div>
        </FieldGroup>

        <FieldGroup
          title="Motion & assistive tech"
          description="Reduce motion and improve screen reader compatibility."
        >
          <div className="divide-y divide-gray-100 dark:divide-dark-600">
            <ToggleRow
              title="Reduced motion"
              description="Disable non-essential animations and transitions."
            >
              <Switch
                checked={reducedMotion}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setReducedMotion(e.target.checked)
                }
              />
            </ToggleRow>
            <ToggleRow
              title="Screen reader support"
              description="Emit additional ARIA labels and live regions."
            >
              <Switch
                checked={screenReader}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  setScreenReader(e.target.checked)
                }
              />
            </ToggleRow>
          </div>
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// 14. License Settings
// ======================================================================

function LicenseSettings() {
  const [licenseKey, setLicenseKey] = useState("TUTPRO-XXXX-XXXX-XXXX-XXXX");
  const [plan, setPlan] = useState("Pro");
  const [status, setStatus] = useState<"active" | "expired">("active");
  const [expires, setExpires] = useState("2026-12-31");
  const [activations, setActivations] = useState("1");
  const [maxActivations] = useState("3");

  return (
    <div>
      <SectionHeader
        title="License"
        description="Manage your Tutor LMS license key and plan."
        icon={KeyIcon}
        action={
          <Badge
            color={status === "active" ? "success" : "error"}
            variant="soft"
            className="gap-1.5 capitalize"
          >
            <span
              className={clsx(
                "size-1.5 rounded-full",
                status === "active" ? "bg-success-500" : "bg-error-500",
              )}
            />
            {status}
          </Badge>
        }
      />

      <div className="space-y-5">
        <FieldGroup
          title="License key"
          description="Enter the license key you received after purchase."
        >
          <Input
            label="License key"
            value={licenseKey}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setLicenseKey(e.target.value)
            }
            placeholder="TUTPRO-XXXX-XXXX-XXXX-XXXX"
            classNames={{ input: "font-mono" }}
          />
          <div className="mt-3 flex gap-2">
            <Button color="primary" variant="soft" className="gap-1.5">
              <ShieldCheckIcon className="size-4" />
              Activate license
            </Button>
            <Button variant="outlined" color="neutral">
              Deactivate
            </Button>
          </div>
        </FieldGroup>

        <FieldGroup
          title="Plan & subscription"
          description="Your current plan and renewal details."
        >
          <FormGrid>
            <Select
              label="Plan"
              value={plan}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setPlan(e.target.value)
              }
              data={[
                { label: "Free", value: "Free" },
                { label: "Pro", value: "Pro" },
                { label: "Business", value: "Business" },
                { label: "Enterprise", value: "Enterprise" },
              ]}
            />
            <Select
              label="Status"
              value={status}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setStatus(e.target.value as "active" | "expired")
              }
              data={[
                { label: "Active", value: "active" },
                { label: "Expired", value: "expired" },
              ]}
            />
            <Input
              label="Expires on"
              type="date"
              value={expires}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setExpires(e.target.value)
              }
            />
            <Input
              label="Activations"
              type="number"
              value={activations}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setActivations(e.target.value)
              }
              description={`of ${maxActivations} allowed`}
            />
          </FormGrid>
        </FieldGroup>

        <FieldGroup
          title="Renewal"
          description="Renew or extend your license."
        >
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-primary-50 p-4 dark:bg-primary-500/10">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-dark-50">
                Renew your {plan} plan
              </p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-dark-300">
                Extend your license for another year and keep receiving updates.
              </p>
            </div>
            <Button color="primary" className="gap-1.5">
              <CurrencyDollarIcon className="size-4" />
              Renew now
            </Button>
          </div>
        </FieldGroup>
      </div>

      <SaveFooter />
    </div>
  );
}

// ======================================================================
// Section registry
// ======================================================================

const SECTIONS: Record<SectionId, ComponentType> = {
  general: GeneralSettings,
  course: CourseSettings,
  monetization: MonetizationSettings,
  design: DesignSettings,
  advanced: AdvancedSettings,
  legal: LegalSettings,
  gradebook: GradebookSettings,
  email: EmailSettings,
  "email-templates": EmailTemplatesSettings,
  notifications: NotificationsSettings,
  authentication: AuthenticationSettings,
  certificate: CertificateSettings,
  accessibility: AccessibilitySettings,
  license: LicenseSettings,
};

// ======================================================================
// Default export — top-level layout
// ======================================================================

export default function SettingsPages() {
  const [active, setActive] = useState<SectionId>("general");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeItem =
    NAV_ITEMS.find((n) => n.id === active) ?? NAV_ITEMS[0];
  const ActiveSection = SECTIONS[active];

  return (
    <Page title="Settings">
      <div className="flex h-screen min-h-0 flex-col bg-gray-50 dark:bg-dark-900 supports-[height:1dvh]:h-dvh">
        {/* Top bar */}
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-200 bg-white px-5 py-3 dark:border-dark-600 dark:bg-dark-750">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary-500 text-white">
              <Cog6ToothIcon className="size-5 stroke-2" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-gray-800 dark:text-dark-50">
                Settings
              </h1>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Configure your LMS site, courses, and integrations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge color="success" variant="soft" className="gap-1">
              <span className="size-1.5 rounded-full bg-success-500" />
              All systems operational
            </Badge>
            {/* Mobile sidebar toggle */}
            <Button
              variant="outlined"
              color="neutral"
              isIcon
              className="lg:hidden"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              <Cog6ToothIcon className="size-5" />
            </Button>
          </div>
        </header>

        {/* 2-column body: sidebar + content */}
        <div className="flex min-h-0 flex-1">
          {/* Sidebar */}
          <aside
            className={clsx(
              "absolute inset-y-0 left-0 z-30 w-64 shrink-0 flex-col border-r border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-750 lg:static lg:flex",
              mobileNavOpen ? "flex" : "hidden lg:flex",
            )}
          >
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <nav
                className="space-y-1 p-3"
                aria-label="Settings navigation"
              >
                {NAV_ITEMS.map((item) => {
                  const isActive = item.id === active;
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      variant="flat"
                      color={isActive ? "primary" : "neutral"}
                      onClick={() => {
                        setActive(item.id);
                        setMobileNavOpen(false);
                      }}
                      className={clsx(
                        "group w-full justify-start gap-2.5 px-3 py-2 text-sm font-medium",
                        isActive
                          ? "bg-primary-500/10 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-dark-200 dark:hover:bg-dark-600 dark:hover:text-dark-50",
                      )}
                    >
                      <Icon
                        className={clsx(
                          "size-5 shrink-0 stroke-2 transition-colors",
                          isActive
                            ? "text-primary-600 dark:text-primary-400"
                            : "text-gray-400 group-hover:text-gray-600 dark:text-dark-400 dark:group-hover:text-dark-200",
                        )}
                      />
                      <span className="flex-1 text-left">{item.label}</span>
                    </Button>
                  );
                })}
              </nav>
            </ScrollShadow>

            {/* Sidebar footer — help nudge */}
            <div className="shrink-0 border-t border-gray-200 p-3 dark:border-dark-600">
              <Card
                className="bg-gradient-to-br from-primary-500 to-primary-600 p-3 text-white dark:from-primary-600 dark:to-primary-700"
                skin="none"
              >
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-5" />
                  <p className="text-xs font-semibold">Need help?</p>
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/80">
                  Read the docs or contact support for any setting you're not
                  sure about.
                </p>
                <Button
                  color="neutral"
                  variant="filled"
                  className="mt-2.5 w-full bg-white/95 text-primary-700 text-xs hover:bg-white"
                >
                  View docs
                </Button>
              </Card>
            </div>
          </aside>

          {/* Mobile overlay */}
          {mobileNavOpen && (
            <div
              className="absolute inset-0 z-20 bg-black/40 lg:hidden"
              onClick={() => setMobileNavOpen(false)}
            />
          )}

          {/* Content area */}
          <main className="flex min-w-0 flex-1 flex-col">
            {/* Breadcrumb / title strip */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-dark-600 dark:bg-dark-750">
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-dark-300">
                <span>Settings</span>
                <span className="text-gray-300 dark:text-dark-500">/</span>
                <span className="font-medium text-gray-800 dark:text-dark-50">
                  {activeItem.label}
                </span>
              </div>
              <div className="hidden items-center gap-1.5 text-xs text-gray-400 dark:text-dark-400 sm:flex">
                <ArrowLeftIcon className="size-3.5" />
                <span>{activeItem.description}</span>
              </div>
            </div>

            {/* Active section */}
            <ScrollShadow className="hide-scrollbar grow overflow-y-auto">
              <div className="mx-auto max-w-5xl px-6 py-6">
                <ActiveSection />
              </div>
            </ScrollShadow>
          </main>
        </div>
      </div>
    </Page>
  );
}
