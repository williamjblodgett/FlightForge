import { authReturnPath } from "@/modules/auth/continuation";
import { brand } from "@/config/brand";

export type VerificationDeliveryEnvironment={EMAIL_DELIVERY_MODE?:string;EMAIL_VERIFICATION_WEBHOOK_URL?:string;EMAIL_VERIFICATION_WEBHOOK_SECRET?:string};

export function isEmailVerificationDeliveryConfigured(): boolean {
  return process.env.EMAIL_DELIVERY_MODE === "test"
    || Boolean(process.env.EMAIL_VERIFICATION_WEBHOOK_URL && process.env.EMAIL_VERIFICATION_WEBHOOK_SECRET);
}

export async function sendEmailVerification(input: {
  email: string;
  displayName: string;
  token: string;
  origin: string;
  returnTo?: string;
},env:VerificationDeliveryEnvironment={EMAIL_DELIVERY_MODE:process.env.EMAIL_DELIVERY_MODE,EMAIL_VERIFICATION_WEBHOOK_URL:process.env.EMAIL_VERIFICATION_WEBHOOK_URL,EMAIL_VERIFICATION_WEBHOOK_SECRET:process.env.EMAIL_VERIFICATION_WEBHOOK_SECRET}): Promise<void> {
  if (env.EMAIL_DELIVERY_MODE === "test") return;
  const endpoint = env.EMAIL_VERIFICATION_WEBHOOK_URL;
  const secret = env.EMAIL_VERIFICATION_WEBHOOK_SECRET;
  if (!endpoint || !secret) throw new Error("Email verification delivery is not configured.");
  const verifyUrl = new URL(`/verify-email?token=${encodeURIComponent(input.token)}`, input.origin);
  verifyUrl.searchParams.set("return_to",authReturnPath(input.returnTo));
  const response = await fetch(endpoint, {
    method: "POST",
    signal: AbortSignal.timeout(15_000),
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({
      template: "flightforge-email-verification-v1",
      to: input.email,
      subject: `Verify your ${brand.productName} account`,
      variables: { displayName: input.displayName, verifyUrl:verifyUrl.toString(), expiresMinutes: 30 },
    }),
  });
  if (!response.ok) throw new Error("Email verification delivery failed.");
}
