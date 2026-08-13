/**
 * Resolve PayPlus credentials from payment and/or invoice secret scopes.
 * Invoice capability may reuse payment-provider secrets so Admin only enters them once.
 */

import { getSecrets } from "@/lib/commerce/secrets/store";
import { getCommerceSettings, getPaymentRow } from "@/lib/commerce/settings";
import {
  PAYPLUS_PROVIDER_ID,
  type PayPlusAuth,
} from "./client";

export async function resolvePayPlusAuth(params?: {
  invoiceSecrets?: Record<string, string>;
  paymentSecrets?: Record<string, string>;
}): Promise<PayPlusAuth & { paymentPageUid: string; terminalUid: string }> {
  const paymentSecrets =
    params?.paymentSecrets ??
    (await getSecrets("payment_provider", PAYPLUS_PROVIDER_ID));
  const invoiceSecrets =
    params?.invoiceSecrets ??
    (await getSecrets("invoice_provider", PAYPLUS_PROVIDER_ID));
  const commerce = await getCommerceSettings(true);
  const paymentRow = getPaymentRow(commerce, PAYPLUS_PROVIDER_ID);
  const invoiceRow = commerce.invoicing.providers.find(
    (p) => p.id === PAYPLUS_PROVIDER_ID
  );

  return {
    apiKey:
      invoiceSecrets.api_key?.trim() ||
      paymentSecrets.api_key?.trim() ||
      "",
    secretKey:
      invoiceSecrets.secret_key?.trim() ||
      paymentSecrets.secret_key?.trim() ||
      "",
    paymentPageUid:
      paymentRow?.public_config.payment_page_uid?.trim() ||
      invoiceRow?.public_config.payment_page_uid?.trim() ||
      "",
    terminalUid:
      paymentRow?.public_config.terminal_uid?.trim() ||
      invoiceRow?.public_config.terminal_uid?.trim() ||
      "",
  };
}

export function payplusAuthConfigured(auth: PayPlusAuth): boolean {
  return Boolean(auth.apiKey && auth.secretKey);
}
