import { BedDouble } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Rooms" };

export default function RoomsPage() {
  return (
    <>
      <PageHeader title="Rooms" description="Room inventory and live status." />
      <EmptyState
        icon={BedDouble}
        title="No rooms yet"
        description="Room types and rooms will show here. Coming in the inventory phase."
      />
    </>
  );
}
