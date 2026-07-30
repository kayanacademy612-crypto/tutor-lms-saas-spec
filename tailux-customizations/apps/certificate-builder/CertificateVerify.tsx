// Certificate Verify — `apps/certificate-builder/verify` route.
//
// Public certificate verification page. Surfaces a search input that calls
// `useVerifyCertificate(code)` and renders the result (valid + the
// certificate payload, or "invalid").

// Import Dependencies
import { useState } from "react";
import {
  CheckCircleIcon,
  XCircleIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Page } from "@/components/shared/Page";
import { Button, Card, Input } from "@/components/ui";
import { LoadingState } from "@/components/lms";
import { useVerifyCertificate } from "@/hooks/useProAuthoring";
import type { Certificate } from "@/types/lms";

// ----------------------------------------------------------------------

export default function CertificateVerifyPage() {
  const [code, setCode] = useState<string>("");
  const [submittedCode, setSubmittedCode] = useState<string>("");

  const verifyQuery = useVerifyCertificate(submittedCode || undefined);
  const cert: Certificate | undefined = verifyQuery.data?.certificate;
  const valid: boolean = verifyQuery.data?.valid ?? false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedCode(code.trim());
  };

  return (
    <Page title="Verify Certificate">
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary-500/10 text-primary-500 dark:bg-primary-500/15 dark:text-primary-400">
              <ShieldCheckIcon className="size-6 stroke-2" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-800 dark:text-dark-50">
                Verify a certificate
              </h1>
              <p className="text-sm text-gray-500 dark:text-dark-300">
                Enter the verification code printed on the certificate to
                confirm its authenticity.
              </p>
            </div>
          </div>

          <Card skin="bordered" className="p-5">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. ABCD-1234-EFGH"
                className="grow font-mono"
                aria-label="Verification code"
              />
              <Button
                type="submit"
                color="primary"
                variant="filled"
                disabled={!code.trim() || verifyQuery.loading}
              >
                {verifyQuery.loading ? "Verifying…" : "Verify"}
              </Button>
            </form>

            {submittedCode && verifyQuery.loading && (
              <LoadingState inline message="Looking up certificate…" />
            )}

            {submittedCode && !verifyQuery.loading && verifyQuery.data && (
              <div className="mt-5">
                {valid && cert ? (
                  <div className="rounded-lg border border-success-500/30 bg-success-500/5 p-4">
                    <div className="mb-2 flex items-center gap-2 text-success-600 dark:text-success-400">
                      <CheckCircleIcon className="size-5 stroke-2" />
                      <p className="text-sm font-semibold">
                        Certificate is valid
                      </p>
                    </div>
                    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <dt className="text-gray-500 dark:text-dark-400">
                        Recipient
                      </dt>
                      <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                        {cert.studentName}
                      </dd>
                      <dt className="text-gray-500 dark:text-dark-400">
                        Course
                      </dt>
                      <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                        {cert.courseTitle}
                      </dd>
                      <dt className="text-gray-500 dark:text-dark-400">
                        Issued
                      </dt>
                      <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                        {new Date(cert.issueDate).toLocaleDateString()}
                      </dd>
                      <dt className="text-gray-500 dark:text-dark-400">
                        Certificate #
                      </dt>
                      <dd className="text-right font-medium text-gray-800 dark:text-dark-50">
                        {cert.certificateNumber}
                      </dd>
                    </dl>
                  </div>
                ) : (
                  <div className="rounded-lg border border-error-500/30 bg-error-500/5 p-4">
                    <div className="flex items-center gap-2 text-error-600 dark:text-error-400">
                      <XCircleIcon className="size-5 stroke-2" />
                      <p className="text-sm font-semibold">
                        Certificate not found or has been revoked
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Page>
  );
}
