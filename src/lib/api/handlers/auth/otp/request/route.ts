import { NextRequest } from "next/server";
import { handleWhatsAppSendCode } from "@/lib/customer-auth/otp-service";

/**
 * @deprecated Prefer POST /api/auth/whatsapp/send-code
 * Legacy phone OTP request — now delivers via WhatsApp Business.
 */
export async function POST(request: NextRequest) {
  return handleWhatsAppSendCode(request);
}
