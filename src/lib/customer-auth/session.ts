/**
 * Provider-agnostic session / customer services.
 * Auth providers call these; business features (orders, wishlist, account)
 * only see an authenticated customer or guest mode — never a specific provider.
 */
export {
  establishPhoneSession,
  upsertCustomerForAuthUser,
  attachGuestOrdersToCustomer,
  getCustomerByAuthUserId,
  getCustomerByPhoneOrEmail,
  ensureCustomerForCheckout,
  recordLoginHistory,
  recordCustomerSession,
  requireCustomerApi,
} from "@/lib/customer-auth/customer";
