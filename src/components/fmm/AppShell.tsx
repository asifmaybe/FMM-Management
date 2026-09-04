import { Link, useRouterState } from "@tanstack/react-router";
import {
  CloudUpload,
  CreditCard,
  DollarSign,
  LayoutDashboard,
  Layers,
  LineChart,
  Megaphone,
  Receipt,
  ScanLine,
  Search,
  Settings as SettingsIcon,
  Shield,
  ShoppingCart,
  Smartphone,
  Truck,
  Users,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GlobalSearchDialog } from "./GlobalSearchDialog";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/stock", label: "Phone Stock", icon: Smartphone },
  { to: "/accessories", label: "Accessories", icon: Layers },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/sales", label: "Sales & Orders", icon: Receipt },
  { to: "/purchases", label: "Purchases", icon: ShoppingCart },
  { to: "/expenses", label: "Expenses", icon: DollarSign },
  { to: "/reports", label: "Profit Reports", icon: LineChart },
  { to: "/campaigns", label: "Campaigns", icon: Megaphone },
  { to: "/audit", label: "Audit Log", icon: Shield },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K or Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[236px] shrink-0 flex-col border-r border-border bg-background px-3 py-4 lg:flex overflow-y-auto">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-1.5 py-1">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-sm shadow-xs">
            F
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-foreground truncate">Faridpur Mobile Mart</h1>
            <p className="text-[11px] text-muted-foreground truncate">Admin Business Terminal</p>
          </div>
        </div>

        {/* Global Search Trigger */}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mt-3.5 mb-2 flex h-9.5 w-full items-center justify-between rounded-xl border border-border bg-card px-3 text-xs text-muted-foreground shadow-2xs hover:border-primary/40 hover:bg-secondary/40 hover:text-foreground transition-all duration-150 whitespace-nowrap select-none"
        >
          <div className="flex items-center gap-2">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-xs font-normal">Search…</span>
          </div>
          <kbd className="pointer-events-none inline-flex h-5 shrink-0 items-center rounded border border-border/80 bg-secondary/80 px-1.5 font-mono text-[10px] font-medium text-muted-foreground whitespace-nowrap">
            Ctrl K
          </kbd>
        </button>

        {/* Navigation */}
        <nav className="mt-3.5 flex flex-1 flex-col gap-0.5">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                  active
                    ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/70",
                )}
              >
                <item.icon className="size-4 shrink-0" strokeWidth={active ? 2 : 1.8} />
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="mt-3 border-t border-border pt-3 space-y-1">
          <Link
            to="/settings"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 shadow-xs"
          >
            <CloudUpload className="size-3.5 shrink-0" />
            Backup Data
          </Link>
          <Link
            to="/settings"
            className="flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary/70 transition-colors"
          >
            <SettingsIcon className="size-3.5 shrink-0" strokeWidth={1.8} />
            Settings & Backup
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1 flex flex-col">
        {/* Mobile Navbar */}
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5 lg:hidden bg-card">
          <span className="font-bold text-sm">Faridpur Mobile Mart</span>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="rounded-lg border border-border p-1.5 text-muted-foreground"
            aria-label="Search"
          >
            <Search className="size-4" />
          </button>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 lg:hidden bg-background">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap hover:bg-secondary"
              activeProps={{ className: "bg-primary text-primary-foreground font-semibold" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <main className="flex-1">{children}</main>
      </div>

      <GlobalSearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
