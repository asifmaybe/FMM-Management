import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/fmm/AppShell";
import { CustomerIntakeDialog } from "@/components/fmm/CustomerIntakeDialog";

export const Route = createFileRoute("/intake")({
  head: () => ({
    meta: [
      { title: "Buy from Customer — Faridpur Mobile Mart" },
      { name: "description", content: "Three-step used phone intake: customer information, NID identity verification and phone details." },
      { property: "og:title", content: "Buy from Customer — Faridpur Mobile Mart" },
      { property: "og:description", content: "Record used phone purchases with local identity evidence." },
    ],
  }),
  component: IntakePage,
});

function IntakePage() {
  const navigate = useNavigate();
  return (
    <AppShell>
      <CustomerIntakeDialog
        open={true}
        onOpenChange={(open) => {
          if (!open) void navigate({ to: "/stock" });
        }}
      />
    </AppShell>
  );
}
