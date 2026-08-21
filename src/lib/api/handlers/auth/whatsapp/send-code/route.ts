import { NextRequest } from "next/server";
import { handleWhatsAppSendCode } from "@/lib/customer-auth/otp-service";

/** POST /api/auth/whatsapp/send-code — generate hashed OTP + send via WhatsApp Business */
export async function POST(request: NextRequest) {
  return handleWhatsAppSendCode(request);
}
