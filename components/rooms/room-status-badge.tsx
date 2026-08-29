import { Badge } from "@/components/ui/badge";
import { ROOM_STATUS_LABELS, type RoomStatus } from "@/lib/validations/room";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<RoomStatus, string> = {
  available:
    "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
  reserved:
    "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30",
  occupied:
    "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
  housekeeping:
    "bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30",
};

export function RoomStatusBadge({
  status,
  className,
}: {
  status: RoomStatus;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_STYLES[status], className)}
    >
      {ROOM_STATUS_LABELS[status]}
    </Badge>
  );
}
