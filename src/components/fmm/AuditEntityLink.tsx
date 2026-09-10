import { Link } from "@tanstack/react-router";
import type { AuditEntry } from "@/lib/fmm-types";
import { useFmm } from "@/lib/fmm-store";

/**
 * Shared component that renders a clickable link for an audit log entry based
 * on entity_type and entity_id. Uses existing routes/records only.
 * If no safe navigation target exists, renders plain text.
 */
export function AuditEntityLink({
  entry,
  onTransactionOpen,
  className = "",
}: {
  entry: AuditEntry;
  onTransactionOpen?: (txId: string) => void;
  className?: string;
}) {
  const { state } = useFmm();
  const { entity_type, entity_id } = entry;

  const baseClass =
    "text-primary hover:underline cursor-pointer transition-colors " + className;

  if (entity_type === "transaction") {
    const tx = state.transactions?.find((t) => t.id === entity_id);
    if (!tx) return <span className={className}>{entry.entity_type}</span>;
    if (onTransactionOpen) {
      return (
        <button type="button" onClick={() => onTransactionOpen(entity_id)} className={baseClass}>
          Transaction
        </button>
      );
    }
    return <Link to="/sales" className={baseClass}>Transaction</Link>;
  }

  if (entity_type === "phone") {
    const phone = state.phones?.find((p) => p.id === entity_id);
    if (!phone) return <span className={className}>{entry.entity_type}</span>;
    return <Link to="/stock" className={baseClass}>Phone</Link>;
  }

  if (entity_type === "customer") {
    return <Link to="/customers" className={baseClass}>Customer</Link>;
  }

  if (entity_type === "supplier") {
    const supplier = state.suppliers?.find((s) => s.id === entity_id);
    if (!supplier) return <span className={className}>{entry.entity_type}</span>;
    return (
      <Link to="/suppliers/$supplierId" params={{ supplierId: entity_id }} className={baseClass}>
        Supplier
      </Link>
    );
  }

  if (entity_type === "campaign") {
    const campaign = state.campaigns?.find((c) => c.id === entity_id);
    if (!campaign) return <span className={className}>{entry.entity_type}</span>;
    return (
      <Link to="/campaigns/$campaignId" params={{ campaignId: entity_id }} className={baseClass}>
        Campaign
      </Link>
    );
  }

  if (entity_type === "purchase") {
    return <Link to="/purchases" className={baseClass}>Purchase</Link>;
  }

  if (entity_type === "expense") {
    return <Link to="/expenses" className={baseClass}>Expense</Link>;
  }

  if (entity_type === "customer_purchase") {
    return <Link to="/customers" className={baseClass}>Customer Record</Link>;
  }

  return <span className={className}>{entry.entity_type}</span>;
}
