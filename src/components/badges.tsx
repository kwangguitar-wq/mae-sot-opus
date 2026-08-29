import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";

const priorityStyles: Record<string, string> = {
  low: "bg-secondary text-secondary-foreground",
  medium: "border-border text-foreground",
  high: "bg-gold/20 text-gold-foreground border-gold/40",
  urgent: "bg-destructive text-destructive-foreground",
};

const statusStyles: Record<string, string> = {
  pending: "bg-secondary text-secondary-foreground",
  in_progress: "bg-chart-2/15 text-chart-2 border-chart-2/30",
  completed: "bg-chart-5/15 text-chart-5 border-chart-5/30",
  cancelled: "bg-muted text-muted-foreground line-through",
};

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn("border font-medium", priorityStyles[priority], className)}
    >
      {PRIORITY_LABELS[priority] ?? priority}
    </Badge>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("border font-medium", statusStyles[status], className)}>
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

export function CategoryDot({ color }: { color?: string | null }) {
  return (
    <span
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ backgroundColor: color ?? "#94a3b8" }}
    />
  );
}
