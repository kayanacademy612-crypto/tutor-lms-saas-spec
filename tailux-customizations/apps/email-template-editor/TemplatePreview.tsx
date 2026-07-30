// TemplatePreview — renders a live HTML preview of the selected email
// template body inside an isolated <iframe>.
//
// Why iframe?
//   - The template body may include arbitrary HTML / inline CSS that
//     could leak into the surrounding dashboard if rendered with
//     `dangerouslySetInnerHTML`. An iframe with `srcDoc` provides a
//     clean CSS / DOM sandbox so the preview reflects what an email
//     client would actually render.
//
// Props:
//   - html: string — the HTML to render (already substituted with
//     sample data by the parent via `usePreviewEmailTemplate`).
//   - loading: boolean — overlay a spinner while the preview is being
//     re-rendered.
//   - error: unknown — show an error block instead of the iframe.
//   - onRefresh: () => void — called when the user clicks the
//     "Refresh preview" button.

// Import Dependencies
import {
  ArrowPathIcon,
  ExclamationCircleIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Button, Spinner } from "@/components/ui";

// ----------------------------------------------------------------------

export interface TemplatePreviewProps {
  html: string;
  loading?: boolean;
  error?: unknown;
  onRefresh?: () => void;
}

const IFRAME_STYLE = `
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
      "Helvetica Neue", Arial, sans-serif;
    color: #1f2937;
    background: #ffffff;
    margin: 0;
    padding: 16px;
    line-height: 1.55;
  }
  a { color: #2563eb; }
  h1, h2, h3 { color: #111827; }
  table { border-collapse: collapse; }
  img { max-width: 100%; height: auto; }
`;

const TemplatePreview = function TemplatePreview({
  html,
  loading = false,
  error,
  onRefresh,
}: TemplatePreviewProps) {
  const doc = `<!doctype html><html><head><meta charset="utf-8" /><style>${IFRAME_STYLE}</style></head><body>${html}</body></html>`;
  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-gray-200 px-4 py-3 dark:border-dark-600">
        <EyeIcon className="size-4 stroke-2 text-primary-500 dark:text-primary-400" />
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-dark-200">
          Live preview
        </h3>
        {onRefresh && (
          <Button
            variant="flat"
            color="neutral"
            size="sm"
            isIcon
            className="ml-auto size-7"
            onClick={onRefresh}
            aria-label="Refresh preview"
            disabled={loading}
          >
            {loading ? (
              <Spinner className="size-3.5" />
            ) : (
              <ArrowPathIcon className="size-3.5 stroke-2" />
            )}
          </Button>
        )}
      </div>
      <div className="relative grow overflow-hidden bg-gray-50 dark:bg-dark-700">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs text-error-600 dark:text-error-400">
            <ExclamationCircleIcon className="size-6 stroke-2" />
            <span>Couldn’t render preview.</span>
          </div>
        ) : (
          <>
            <iframe
              title="Email preview"
              srcDoc={doc}
              sandbox="allow-same-origin"
              className="size-full border-0 bg-white"
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm dark:bg-dark-700/60">
                <Spinner className="size-5" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TemplatePreview;
