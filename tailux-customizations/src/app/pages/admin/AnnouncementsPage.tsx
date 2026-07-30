// Platform Admin — Announcements (placeholder).
//
// Spec lists Announcements in the sidebar nav but didn't require a full
// implementation. This page renders a "coming soon" placeholder that still
// gives the user a destination from the sidebar link (no 404).

// Import Dependencies
import { MegaphoneIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/lms";

// ----------------------------------------------------------------------

export default function AnnouncementsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Card className="p-4">
        <EmptyState
          icon={MegaphoneIcon}
          title="Announcements — coming soon"
          description="This section will host platform-wide announcement broadcasts. For now, use the API directly via POST /api/admin/announcements."
        />
      </Card>
    </div>
  );
}
