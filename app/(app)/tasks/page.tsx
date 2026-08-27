import { ClipboardList } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "My Tasks" };

export default function TasksPage() {
  return (
    <>
      <PageHeader
        title="My Tasks"
        description="Rooms assigned to you for cleaning."
      />
      <EmptyState
        icon={ClipboardList}
        title="No tasks assigned"
        description="Rooms assigned to you will show here with their cleaning checklists. Coming in the housekeeping phase."
      />
    </>
  );
}
