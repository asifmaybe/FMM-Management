import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { PeriodPoint } from "@/lib/fmm-analytics";
import { Taka } from "./Taka";

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: PeriodPoint }> }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!.payload;
  const rows = [
    { label: "Revenue", value: p.revenue },
    { label: "Cost", value: p.cost },
    { label: "Profit", value: p.profit },
    { label: "Pending", value: p.pending },
  ];
  return (
    <div className="min-w-[190px] rounded-xl border border-border bg-card p-3 shadow-lg">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{p.label}</p>
      <div className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-6 text-xs">
            <span className="text-muted-foreground">{r.label}</span>
            <span className={r.label === "Profit" ? "font-semibold" : "font-medium"}>
              <Taka value={r.value} />
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between gap-6 border-t border-border pt-1.5 text-xs">
          <span className="text-muted-foreground">Transactions</span>
          <span className="font-medium">{p.units}</span>
        </div>
      </div>
    </div>
  );
}

export function ProfitChart({ data, height = 320 }: { data: PeriodPoint[]; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 8 }}>
          <defs>
            <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="4 6" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} stroke="var(--muted-foreground)" fontSize={12} tickMargin={10} />
          <YAxis
            tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : String(Math.round(v)))}
            tickLine={false}
            axisLine={false}
            stroke="var(--muted-foreground)"
            fontSize={12}
            width={44}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--primary)", strokeDasharray: "4 4" }} />
          <Area
            type="monotone"
            dataKey="profit"
            stroke="var(--primary)"
            strokeWidth={2.5}
            fill="url(#profitFill)"
            dot={{ r: 3, fill: "var(--card)", stroke: "var(--primary)", strokeWidth: 2 }}
            activeDot={{ r: 6, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
