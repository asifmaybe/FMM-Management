import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  Available: "bg-success-soft text-success",
  Paid: "bg-success-soft text-success",
  Sold: "bg-muted text-muted-foreground",
  Exchange: "bg-info-soft text-info-soft-foreground",
  Sale: "bg-info-soft text-info-soft-foreground",
  Added: "bg-info-soft text-info-soft-foreground",
  "Bought from Customer": "bg-info-soft text-info-soft-foreground",
  "Payment Collected": "bg-success-soft text-success",
  Backup: "bg-muted text-muted-foreground",
  Restore: "bg-muted text-muted-foreground",
  "Payment Pending": "bg-danger-soft text-destructive",
  Pending: "bg-danger-soft text-destructive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        styles[status] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      {status}
    </span>
  );
}
