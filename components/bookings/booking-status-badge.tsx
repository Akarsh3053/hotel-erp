import { Badge } from "@/components/ui/badge";
import {
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@/lib/validations/booking";
import { cn } from "@/lib/utils";

const STATUS_VARIANTS: Record<BookingStatus, string> = {
  reserved: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
  checked_in:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  checked_out: "border-border bg-muted/60 text-muted-foreground",
  cancelled:
    "border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive",
};

export function BookingStatusBadge({
  status,
  className,
}: {
  status: BookingStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-semibold text-xs tracking-wide capitalize",
        STATUS_VARIANTS[status],
        className,
      )}
    >
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}
