import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  // Inventory & Sales
  Available: "bg-success-soft text-success",
  Paid: "bg-success-soft text-success",
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
