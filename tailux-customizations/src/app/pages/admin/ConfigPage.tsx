// Platform Admin — System config (placeholder).
//
// Spec lists Config in the sidebar nav but didn't require a full
// implementation. This page renders a "coming soon" placeholder.

// Import Dependencies
import { Cog6ToothIcon } from "@heroicons/react/24/outline";

// Local Imports
import { Card } from "@/components/ui";
import { EmptyState } from "@/components/lms";

// ----------------------------------------------------------------------

export default function ConfigPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-6">
      <Card className="p-4">
        <EmptyState
          icon={Cog6ToothIcon}
          title="System config — coming soon"
          description="This section will surface the runtime configuration variables from /api/admin/config. For now, use the API directly."
        />
      </Card>
    </div>
  );
}
