import { NextRequest } from "next/server";
import { handleWhatsAppVerifyCode } from "@/lib/customer-auth/otp-service";

/**
 * @deprecated Prefer POST /api/auth/whatsapp/verify-code
 * Legacy phone OTP verify — same WhatsApp OTP session flow.
 */
export async function POST(request: NextRequest) {
  return handleWhatsAppVerifyCode(request);
}
