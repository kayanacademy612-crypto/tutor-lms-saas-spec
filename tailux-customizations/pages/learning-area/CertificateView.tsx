// CertificateView — Certificate tab for the right sidebar.
//
// When the student has earned a certificate, this panel shows a preview of
// the certificate, the issue date, the verification code, and download +
// share buttons. When the certificate is not yet earned, it shows the
// locked-state placeholder with a link to the Gradebook.

// Import Dependencies
import { useState } from "react";
import {
  DocumentCheckIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  LinkIcon,
  TrophyIcon,
  LockClosedIcon,
  CheckBadgeIcon,
  ClipboardIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

// Local Imports
import { Button, Card, Badge } from "@/components/ui";
import type { Certificate } from "@/types/lms";

// ----------------------------------------------------------------------

export interface CertificateViewProps {
  /** Override the mock certificate (pass `null` to force the locked state). */
  certificate?: Certificate | null;
}

// ---- Mock data --------------------------------------------------------

const now = new Date();
const iso = (d: Date) => d.toISOString();
const daysFromNow = (n: number) => {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return iso(d);
};

/** Mock earned certificate. Pass `null` to demo the locked state. */
const MOCK_CERTIFICATE: Certificate | null = {
  id: "cert-1",
  tenantId: "tenant-1",
  courseId: "course-001",
  studentId: "student-1",
  enrollmentId: "enr-1",
  templateId: "tmpl-1",
  certificateNumber: "TUX-2025-001234",
  studentName: "Alex Rivera",
  courseTitle: "Full-Stack React & TypeScript",
  instructorName: "Maya Chen",
  finalScorePct: 92,
  issueDate: daysFromNow(-1),
  verificationCode: "tux-9f3a-c12d-7e45",
  isRevoked: false,
  createdAt: daysFromNow(-1),
  updatedAt: daysFromNow(-1),
};

// ---- Helpers ----------------------------------------------------------

function formatDate(isoDate?: string): string {
  if (!isoDate) return "—";
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ----------------------------------------------------------------------

export default function CertificateView({
  certificate: certProp,
}: CertificateViewProps) {
  // Allow `undefined` (use mock) and `null` (force locked) and a real cert.
  const cert = certProp === undefined ? MOCK_CERTIFICATE : certProp;
  const [copied, setCopied] = useState(false);

  const handleShare = (channel: "link" | "linkedin" | "twitter") => {
    if (channel === "link" && cert) {
      // Mock clipboard copy.
      const url = `https://learn.example.com/cert/${cert.verificationCode}`;
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        void navigator.clipboard.writeText(url);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  // ---- Locked state -------------------------------------------------
  if (!cert) {
    return (
      <div className="space-y-4">
        <header>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
            <DocumentCheckIcon className="size-4 text-primary-500" />
            Certificate
          </h2>
          <p className="text-xs text-gray-500 dark:text-dark-300">
            Earn yours by completing the course.
          </p>
        </header>

        <Card skin="bordered" className="p-6 text-center">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-gray-150 text-gray-400 dark:bg-dark-500 dark:text-dark-300">
            <LockClosedIcon className="size-7 stroke-2" />
          </div>
          <h3 className="mt-3 text-sm font-semibold text-gray-800 dark:text-dark-50">
            Not earned yet
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
            Complete every lesson, pass every quiz, and submit every assignment
            to unlock your certificate.
          </p>
          <Button
            variant="soft"
            color="primary"
            className="mt-4 gap-1.5 text-xs"
          >
            <TrophyIcon className="size-4 stroke-2" />
            Check eligibility
          </Button>
        </Card>
      </div>
    );
  }

  // ---- Earned state -------------------------------------------------
  return (
    <div className="space-y-4">
      <header>
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-dark-50">
          <DocumentCheckIcon className="size-4 text-primary-500" />
          Certificate
        </h2>
        <p className="text-xs text-gray-500 dark:text-dark-300">
          Issued {formatDate(cert.issueDate)}
        </p>
      </header>

      {/* Earned banner */}
      <Card
        skin="bordered"
        className="border-success-300 bg-success-50/50 p-3 dark:border-success-500/30 dark:bg-success-500/5"
      >
        <div className="flex items-center gap-2">
          <CheckBadgeIcon className="size-5 shrink-0 text-success-600 dark:text-success-300" />
          <p className="text-xs font-medium text-success-700 dark:text-success-300">
            Certificate earned — congratulations!
          </p>
        </div>
      </Card>

      {/* Certificate preview */}
      <Card
        skin="bordered"
        className="overflow-hidden p-0"
      >
        <div className="relative aspect-[1.414/1] bg-gradient-to-br from-primary-50 via-white to-amber-50 p-5 dark:from-primary-500/10 dark:via-dark-700 dark:to-amber-500/10">
          {/* Decorative border */}
          <div className="absolute inset-2 rounded-md border-2 border-primary-500/30 dark:border-primary-400/30" />
          <div className="absolute inset-3 rounded-md border border-amber-400/40" />

          {/* Inner content */}
          <div className="relative flex h-full flex-col items-center justify-center text-center">
            {/* Seal */}
            <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-md">
              <StarSolidIcon className="size-6" />
            </div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-600 dark:text-primary-300">
              Certificate of Completion
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-wider text-gray-500 dark:text-dark-300">
              This is to certify that
            </p>
            <p className="mt-1 text-base font-serif font-bold text-gray-800 dark:text-dark-50">
              {cert.studentName}
            </p>
            <p className="mt-0.5 text-[9px] uppercase tracking-wider text-gray-500 dark:text-dark-300">
              has successfully completed
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-800 dark:text-dark-50">
              {cert.courseTitle}
            </p>

            <div className="mt-3 flex w-full items-end justify-between px-2 text-[9px]">
              <div className="text-left">
                <p className="font-medium text-gray-700 dark:text-dark-100">
                  {cert.instructorName ?? "Instructor"}
                </p>
                <p className="text-gray-400 dark:text-dark-400">Instructor</p>
              </div>
              <div className="text-center">
                <p className="font-medium text-gray-700 dark:text-dark-100">
                  {formatDate(cert.issueDate)}
                </p>
                <p className="text-gray-400 dark:text-dark-400">Issue date</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-700 dark:text-dark-100">
                  {cert.finalScorePct ?? "—"}%
                </p>
                <p className="text-gray-400 dark:text-dark-400">Final score</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Verification */}
      <Card skin="bordered" className="p-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
              Certificate no.
            </p>
            <p className="truncate text-xs font-medium text-gray-800 dark:text-dark-100">
              {cert.certificateNumber}
            </p>
          </div>
          <Badge color="success" variant="soft" className="shrink-0 gap-1">
            <CheckBadgeIcon className="size-3.5" />
            Verified
          </Badge>
        </div>
        <div className="mt-2 border-t border-gray-100 pt-2 dark:border-dark-600">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-dark-300">
            Verification code
          </p>
          <div className="mt-1 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-gray-50 px-2 py-1 text-[11px] text-gray-700 dark:bg-dark-600 dark:text-dark-200">
              {cert.verificationCode}
            </code>
            <Button
              variant="flat"
              color="neutral"
              isIcon
              aria-label="Copy verification code"
              className="size-7"
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  void navigator.clipboard.writeText(cert.verificationCode);
                }
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? (
                <CheckBadgeIcon className="size-3.5 text-success-500" />
              ) : (
                <ClipboardIcon className="size-3.5" />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="space-y-2">
        <Button
          variant="filled"
          color="primary"
          className="w-full gap-1.5"
        >
          <ArrowDownTrayIcon className="size-4 stroke-2" />
          Download PDF
        </Button>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant="outlined"
            color="neutral"
            onClick={() => handleShare("link")}
            className="gap-1 text-xs"
          >
            {copied ? (
              <CheckBadgeIcon className="size-3.5 text-success-500" />
            ) : (
              <LinkIcon className="size-3.5" />
            )}
            Link
          </Button>
          <Button
            variant="outlined"
            color="neutral"
            onClick={() => handleShare("linkedin")}
            className="gap-1 text-xs"
          >
            <ShareIcon className="size-3.5" />
            LinkedIn
          </Button>
          <Button
            variant="outlined"
            color="neutral"
            onClick={() => handleShare("twitter")}
            className="gap-1 text-xs"
          >
            <ShareIcon className="size-3.5" />
            Share
          </Button>
        </div>
      </div>

      {cert.expiryDate && (
        <p className="text-center text-[11px] text-gray-500 dark:text-dark-300">
          Valid until {formatDate(cert.expiryDate)}
        </p>
      )}
    </div>
  );
}
