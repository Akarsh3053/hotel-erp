import { Sparkles } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Housekeeping" };

export default function HousekeepingPage() {
  return (
    <>
      <PageHeader
        title="Housekeeping"
        description="Cleaning tasks and the review queue."
      />
      <EmptyState
        icon={Sparkles}
        title="Nothing to clean"
        description="Cleaning tasks and the manager review queue will show here. Coming in the housekeeping phase."
      />
    </>
  );
}
