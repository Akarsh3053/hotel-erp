import { CalendarDays } from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Bookings" };

export default function BookingsPage() {
  return (
    <>
      <PageHeader
        title="Bookings"
        description="Reservations, check-ins, and check-outs."
      />
      <EmptyState
        icon={CalendarDays}
        title="No bookings yet"
        description="Reservations and walk-in check-ins will show here. Coming in the reservations phase."
      />
    </>
  );
}
