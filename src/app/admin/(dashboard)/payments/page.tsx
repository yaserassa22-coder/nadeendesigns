import { PaymentsInvoicingPanel } from "@/components/admin/PaymentsInvoicingPanel";

export default function AdminPaymentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-[family-name:var(--font-cormorant)] text-3xl tracking-wide text-charcoal">
          Payments & Invoicing
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Enable payment gateways, store encrypted credentials, choose the
          invoice provider, and monitor webhooks — without code changes.
        </p>
      </div>
      <PaymentsInvoicingPanel />
    </div>
  );
}
