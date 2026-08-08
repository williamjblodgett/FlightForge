import { brand } from "@/config/brand";

export function isEmailVerificationDeliveryConfigured(): boolean {
  return process.env.EMAIL_DELIVERY_MODE === "test"
    || Boolean(process.env.EMAIL_VERIFICATION_WEBHOOK_URL && process.env.EMAIL_VERIFICATION_WEBHOOK_SECRET);
}

export async function sendEmailVerification(input: {
  email: string;
  displayName: string;
  token: string;
  origin: string;
}): Promise<void> {
  if (process.env.EMAIL_DELIVERY_MODE === "test") return;
  const endpoint = process.env.EMAIL_VERIFICATION_WEBHOOK_URL;
  const secret = process.env.EMAIL_VERIFICATION_WEBHOOK_SECRET;
  if (!endpoint || !secret) throw new Error("Email verification delivery is not configured.");
  const verifyUrl = new URL(`/verify-email?token=${encodeURIComponent(input.token)}`, input.origin).toString();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({
      template: "flightforge-email-verification-v1",
      to: input.email,
      subject: `Verify your ${brand.productName} account`,
      variables: { displayName: input.displayName, verifyUrl, expiresMinutes: 30 },
    }),
  });
  if (!response.ok) throw new Error("Email verification delivery failed.");
}
