import takaAsset from "@/assets/taka-symbol.png.asset.json";
import { cn } from "@/lib/utils";

/** The new Bangladeshi taka symbol, rendered as a mask so it inherits currentColor. */
export function TakaSign({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="taka"
      className={cn("inline-block h-[0.85em] w-[0.62em] shrink-0 align-[-0.06em] bg-current", className)}
      style={{
        maskImage: `url(${takaAsset.url})`,
        WebkitMaskImage: `url(${takaAsset.url})`,
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
        maskSize: "contain",
        WebkitMaskSize: "contain",
      }}
    />
  );
}

/** Formatted amount prefixed with the taka symbol. */
export function Taka({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-baseline gap-[0.15em] whitespace-nowrap", className)}>
      <TakaSign />
      {Math.round(value).toLocaleString("en-US")}
    </span>
  );
}
