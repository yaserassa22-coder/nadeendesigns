import { NextRequest } from "next/server";
import { handleWhatsAppVerifyCode } from "@/lib/customer-auth/otp-service";

/** POST /api/auth/whatsapp/verify-code — verify OTP, sign in / create customer, session cookie */
export async function POST(request: NextRequest) {
  return handleWhatsAppVerifyCode(request);
}
