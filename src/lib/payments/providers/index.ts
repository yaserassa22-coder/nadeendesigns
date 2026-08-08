import { registerPaymentProvider } from "../registry";
import { applePayPaymentProvider } from "./apple-pay";
import { bitPaymentProvider } from "./bit";
import { codPaymentProvider } from "./cod";
import { creditCardPaymentProvider } from "./credit-card";
import { googlePayPaymentProvider } from "./google-pay";
import { paypalPaymentProvider } from "./paypal";

let registered = false;

/** Idempotent bootstrap — call before using the payment registry. */
export function ensurePaymentProvidersRegistered(): void {
  if (registered) return;
  registerPaymentProvider(codPaymentProvider);
  registerPaymentProvider(creditCardPaymentProvider);
  registerPaymentProvider(bitPaymentProvider);
  registerPaymentProvider(applePayPaymentProvider);
  registerPaymentProvider(googlePayPaymentProvider);
  registerPaymentProvider(paypalPaymentProvider);
  registered = true;
}
