import { Link, useRouterState } from "@tanstack/react-router";
import {
  CloudUpload,
  LayoutDashboard,
  LogOut,
  Receipt,
  ScanLine,
  Settings as SettingsIcon,
  Shield,
  Smartphone,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/stock", label: "Stock", icon: Smartphone },
  { to: "/suppliers", label: "Suppliers", icon: Truck },
  { to: "/sales", label: "Sales", icon: Receipt },
  { to: "/reports", label: "Profit Reports", icon: LineChart },
  { to: "/evidence", label: "Customer Evidence", icon: ScanLine },
  { to: "/audit", label: "Audit Log", icon: Shield },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-[268px] shrink-0 flex-col border-r border-border bg-background px-5 py-6 lg:flex">
        <div>
          <h1 className="text-2xl leading-tight font-extrabold tracking-tight">Faridpur Mobile Mart</h1>
          <p className="mt-1 text-sm text-muted-foreground">Admin Terminal</p>
        </div>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <item.icon className="size-5" strokeWidth={1.8} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 border-t border-border pt-5">
          <Link
            to="/settings"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <CloudUpload className="size-4" />
            Backup Data
          </Link>
          <Link
            to="/settings"
            className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium hover:bg-secondary"
          >
            <SettingsIcon className="size-5" strokeWidth={1.8} />
            Settings
          </Link>
          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive hover:bg-danger-soft"
          >
            <LogOut className="size-5" strokeWidth={1.8} />
            Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex gap-1 overflow-x-auto border-b border-border px-4 py-2 lg:hidden">
          {nav.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="rounded-lg px-3 py-2 text-xs font-medium whitespace-nowrap hover:bg-secondary"
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              activeOptions={{ exact: item.to === "/" }}
            >
              {item.label}
            </Link>
          ))}
        </div>
        {children}
      </div>
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
