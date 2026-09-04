import { cn } from "@/lib/utils";

/** The original and official Bangladeshi Taka currency symbol (৳). */
export function TakaSign({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline font-normal select-none mr-0.5 font-['Plus_Jakarta_Sans','Segoe_UI','Noto_Sans_Bengali','Kalpurush','SolaimanLipi',sans-serif]",
        className,
      )}
    >
      ৳
    </span>
  );
}

/** Formatted amount prefixed with the original Bangladeshi Taka currency symbol (৳). */
export function Taka({ value, className }: { value: number; className?: string }) {
  const num = typeof value === "number" && !isNaN(value) ? value : 0;
  return (
    <span className={cn("inline-flex items-baseline whitespace-nowrap", className)}>
      <TakaSign />
      {Math.round(num).toLocaleString("en-US")}
    </span>
  );
}
