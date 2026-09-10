import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  // Inventory & Sales
  Available: "bg-success-soft text-success",
  Paid: "bg-success-soft text-success",
  Partial: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
  Due: "bg-warning-soft text-warning",
  "Not Paid": "bg-danger-soft text-destructive",
  Sold: "bg-muted text-muted-foreground",
  Exchange: "bg-info-soft text-info-soft-foreground",
  Sale: "bg-info-soft text-info-soft-foreground",
  Added: "bg-info-soft text-info-soft-foreground",
  "Bought from Customer": "bg-info-soft text-info-soft-foreground",
  "Payment Collected": "bg-success-soft text-success",
  "Supplier Payment": "bg-info-soft text-info-soft-foreground",
  "Payment Pending": "bg-danger-soft text-destructive",
  Pending: "bg-danger-soft text-destructive",
  "In Inspection": "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
  Returned: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
  "Returned to Supplier": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20",
  "Rejected / Do Not Stock": "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20",
  Restocked: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  "Refund Only": "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20",

  // Campaigns
  Active: "bg-success-soft text-success font-semibold",
  Planned: "bg-info-soft text-info-soft-foreground",
  Completed: "bg-muted text-muted-foreground",
  Cancelled: "bg-danger-soft text-destructive",

  // Accessories
  Discontinued: "bg-muted text-muted-foreground",

  // Warranty
  "Pending Inspection": "bg-warning-soft text-warning",
  "In Repair": "bg-info-soft text-info-soft-foreground",
  Repaired: "bg-success-soft text-success",
  Replaced: "bg-success-soft text-success",
  Resolved: "bg-success-soft text-success",
  Rejected: "bg-danger-soft text-destructive",
  Refund: "bg-danger-soft text-destructive",

  // Suppliers & System
  "Active Partner": "bg-success-soft text-success",
  "Pending Review": "bg-warning-soft text-warning",
  Backup: "bg-muted text-muted-foreground",
  Restore: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        styles[status] ?? "bg-secondary text-foreground",
        className,
      )}
    >
      {status}
    </span>
  );
}
