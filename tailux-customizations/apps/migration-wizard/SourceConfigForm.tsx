// SourceConfigForm — dynamic form whose fields depend on the selected
// platform's `kind` (mysql / api / csv). The parent owns the config state
// and gets a callback on every change.
//
// Layout per kind:
//   - mysql (LearnDash / LifterLMS / LearnPress / WooCommerce): host, port,
//     db name, user, password (+ WordPress URL for woocommerce).
//   - api (Tutor LMS): api URL + api key.
//   - csv (CSV Import): file upload (file input) or remote URL input.

// Import Dependencies
import clsx from "clsx";
import { useRef } from "react";
import { ArrowUpTrayIcon, DocumentTextIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Input } from "@/components/ui";
import type { CreateMigrationInput, MigrationPlatform } from "@/types/lms";
import { getPlatformKind } from "./PlatformSelector";

// ----------------------------------------------------------------------

export type SourceConfig = CreateMigrationInput["sourceConfig"] & {
  /** Port kept separate so the input can use `type="number"`. */
  dbPort?: string | number;
  /** WordPress URL — woocommerce only. */
  wpUrl?: string;
};

export interface SourceConfigFormProps {
  platform: MigrationPlatform;
  config: SourceConfig;
  onConfigChange: (next: SourceConfig) => void;
  /** Show form-level validation errors (e.g. when the user tried to advance). */
  showErrors?: boolean;
}

// ----------------------------------------------------------------------

export function SourceConfigForm({
  platform,
  config,
  onConfigChange,
  showErrors,
}: SourceConfigFormProps) {
  const kind = getPlatformKind(platform);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const update = (patch: Partial<SourceConfig>) =>
    onConfigChange({ ...config, ...patch });

  const isMysql = kind === "mysql";
  const isApi = kind === "api";
  const isCsv = kind === "csv";

  return (
    <div className="space-y-4">
      {isMysql && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input
              label="Database host"
              placeholder="localhost"
              value={config.dbHost ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                update({ dbHost: e.target.value })
              }
              error={
                showErrors && !config.dbHost ? "Host is required" : undefined
              }
              className="sm:col-span-2"
            />
            <Input
              label="Port"
              type="number"
              placeholder="3306"
              value={config.dbPort ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                update({ dbPort: e.target.value })
              }
            />
          </div>
          <Input
            label="Database name"
            placeholder="wordpress_db"
            value={config.dbName ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              update({ dbName: e.target.value })
            }
            error={
              showErrors && !config.dbName ? "Database name is required" : undefined
            }
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Database user"
              placeholder="wp_user"
              value={config.dbUser ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                update({ dbUser: e.target.value })
              }
              error={
                showErrors && !config.dbUser ? "User is required" : undefined
              }
            />
            <Input
              label="Database password"
              type="password"
              placeholder="••••••••"
              value={config.dbPassword ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                update({ dbPassword: e.target.value })
              }
            />
          </div>
          {platform === "woocommerce" && (
            <Input
              label="WordPress site URL"
              placeholder="https://example.com"
              value={config.wpUrl ?? ""}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                update({ wpUrl: e.target.value })
              }
              error={
                showErrors && !config.wpUrl ? "Site URL is required" : undefined
              }
            />
          )}
        </>
      )}

      {isApi && (
        <>
          <Input
            label="API URL"
            placeholder="https://your-tutor-lms-site.com/wp-json"
            value={config.apiUrl ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              update({ apiUrl: e.target.value })
            }
            error={
              showErrors && !config.apiUrl ? "API URL is required" : undefined
            }
          />
          <Input
            label="API key"
            type="password"
            placeholder="••••••••"
            value={config.apiKey ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              update({ apiKey: e.target.value })
            }
            error={
              showErrors && !config.apiKey ? "API key is required" : undefined
            }
            description="Find this in Tutor LMS → Settings → Advanced → API Keys."
          />
        </>
      )}

      {isCsv && (
        <>
          <div>
            <p className="input-label text-sm font-medium text-gray-700 dark:text-dark-200">
              CSV file
            </p>
            <div
              className={clsx(
                "mt-1.5 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors",
                "border-gray-300 hover:border-primary-400 dark:border-dark-500 dark:hover:border-primary-500/40",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) update({ filePath: f.name });
              }}
            >
              <ArrowUpTrayIcon className="size-7 text-gray-400 dark:text-dark-400" />
              <p className="text-sm text-gray-600 dark:text-dark-200">
                Drop a CSV file here, or
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                browse from your computer
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) update({ filePath: f.name });
                }}
              />
              {config.filePath && (
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-md bg-success-500/10 px-2 py-0.5 text-xs font-medium text-success-700 dark:text-success-400">
                  <DocumentTextIcon className="size-3.5" />
                  {config.filePath}
                </p>
              )}
            </div>
          </div>
          <Input
            label="…or remote CSV URL"
            placeholder="https://example.com/courses.csv"
            value={config.apiUrl ?? ""}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              update({ apiUrl: e.target.value })
            }
            description="If you supply a URL the backend will fetch the CSV during the migration run."
          />
        </>
      )}
    </div>
  );
}

export default SourceConfigForm;

// ----------------------------------------------------------------------

/**
 * Validate the form. Returns `null` when valid, or a friendly error string.
 * Used by the wizard's "Start Migration" step before calling
 * `useCreateMigration`.
 */
export function validateSourceConfig(
  platform: MigrationPlatform,
  config: SourceConfig,
): string | null {
  const kind = getPlatformKind(platform);
  if (kind === "mysql") {
    if (!config.dbHost) return "Database host is required.";
    if (!config.dbName) return "Database name is required.";
    if (!config.dbUser) return "Database user is required.";
    if (platform === "woocommerce" && !config.wpUrl)
      return "WordPress site URL is required for WooCommerce migrations.";
    return null;
  }
  if (kind === "api") {
    if (!config.apiUrl) return "API URL is required.";
    if (!config.apiKey) return "API key is required.";
    return null;
  }
  // csv
  if (!config.filePath && !config.apiUrl) {
    return "Upload a CSV file or supply a remote URL.";
  }
  return null;
}

/**
 * Strip the form-only fields (`dbPort`, `wpUrl`) and shape the config for the
 * `CreateMigrationInput.sourceConfig` payload.
 */
export function toCreateSourceConfig(
  config: SourceConfig,
): CreateMigrationInput["sourceConfig"] {
  return {
    dbHost: config.dbHost,
    dbName: config.dbName,
    dbUser: config.dbUser,
    dbPassword: config.dbPassword,
    apiKey: config.apiKey,
    apiUrl: config.apiUrl,
    filePath: config.filePath,
  };
}
